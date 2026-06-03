import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JwtPayload } from '@/types/jwt-payload.type';
import { BoardAccessService } from '@modules/boards/board-access.service';
import { IssueTypesService } from '@modules/issue-types/issue-types.service';
import { VersionsService } from '@modules/versions/versions.service';
import {
  CreateCardDto,
  ListBoardCardsQueryDto,
  MoveCardDto,
  UpdateCardDto,
} from './dto/card.dto';
import {
  BoardCardsResponseDto,
  CardColumnResponseDto,
  CardIssueTypeResponseDto,
  CardResponseDto,
  CardUserResponseDto,
  CardVersionResponseDto,
  MoveCardResponseDto,
} from './dto/card-response.dto';
import { CardsRepository } from './repositories/cards.repository';

type CardRecord = NonNullable<
  Awaited<ReturnType<CardsRepository['findActiveById']>>
>;

@Injectable()
export class CardsService {
  constructor(
    private readonly cardsRepository: CardsRepository,
    private readonly boardAccessService: BoardAccessService,
    private readonly issueTypesService: IssueTypesService,
    private readonly versionsService: VersionsService,
  ) {}

  async create(user: JwtPayload, dto: CreateCardDto): Promise<CardResponseDto> {
    await this.boardAccessService.ensureMember(dto.boardId, user.userId);
    await this.ensureColumnBelongsToBoard(dto.boardId, dto.columnId);
    this.ensureDateRangeValid(dto.startDate, dto.dueDate);

    if (dto.assigneeUserId !== undefined && dto.assigneeUserId !== null) {
      await this.ensureAssigneeBelongsToBoard(dto.boardId, dto.assigneeUserId);
    }

    if (dto.issueTypeId !== undefined && dto.issueTypeId !== null) {
      await this.issueTypesService.ensureBelongsToBoard(
        dto.boardId,
        dto.issueTypeId,
      );
    }

    if (dto.versionId !== undefined && dto.versionId !== null) {
      await this.versionsService.ensureBelongsToBoard(
        dto.boardId,
        dto.versionId,
      );
    }

    const card = await this.cardsRepository.create(dto, user.userId);
    return this.toCardResponse(card);
  }

  async findOne(user: JwtPayload, id: number): Promise<CardResponseDto> {
    const card = await this.ensureCardVisibleToUser(user, id);
    return this.toCardResponse(card);
  }

  async update(
    user: JwtPayload,
    id: number,
    dto: UpdateCardDto,
  ): Promise<CardResponseDto> {
    const card = await this.ensureCardVisibleToUser(user, id);
    const nextColumnId = dto.columnId ?? card.columnId;
    await this.ensureColumnBelongsToBoard(card.boardId, nextColumnId);
    this.ensureDateRangeValid(
      dto.startDate ?? this.toDateInput(card.startDate),
      dto.dueDate ?? this.toDateInput(card.dueDate),
    );

    if (dto.assigneeUserId !== undefined && dto.assigneeUserId !== null) {
      await this.ensureAssigneeBelongsToBoard(card.boardId, dto.assigneeUserId);
    }

    if (dto.issueTypeId !== undefined && dto.issueTypeId !== null) {
      await this.issueTypesService.ensureBelongsToBoard(
        card.boardId,
        dto.issueTypeId,
      );
    }

    if (dto.versionId !== undefined && dto.versionId !== null) {
      await this.versionsService.ensureBelongsToBoard(
        card.boardId,
        dto.versionId,
      );
    }

    const updated = await this.cardsRepository.update(
      id,
      dto,
      nextColumnId !== card.columnId,
    );

    return this.toCardResponse(updated);
  }

  async findByBoard(
    user: JwtPayload,
    boardId: number,
    query: ListBoardCardsQueryDto,
  ): Promise<BoardCardsResponseDto> {
    await this.boardAccessService.ensureMember(boardId, user.userId);
    const result = await this.cardsRepository.findByBoard(boardId, query);

    return {
      total: result.total,
      items: result.items.map((card) => this.toCardResponse(card)),
    };
  }

  async move(user: JwtPayload, dto: MoveCardDto): Promise<MoveCardResponseDto> {
    const card = await this.ensureCardVisibleToUser(user, dto.currentCardId);
    const [prevColumn, nextColumn] = await Promise.all([
      this.cardsRepository.findActiveColumnWithBoard(dto.prevColumnId),
      this.cardsRepository.findActiveColumnWithBoard(dto.nextColumnId),
    ]);

    if (!prevColumn || prevColumn.boardId !== card.boardId) {
      throw new NotFoundException('Previous column not found');
    }

    if (!nextColumn || nextColumn.boardId !== card.boardId) {
      throw new NotFoundException('Next column not found');
    }

    if (card.columnId !== dto.prevColumnId) {
      throw new BadRequestException('Current card is not in previous column');
    }

    await this.ensureMoveCardsBelongToColumns(card.boardId, dto);
    await this.cardsRepository.move(dto);

    return { updateResult: 'Successfully!' };
  }

  private async ensureCardVisibleToUser(
    user: JwtPayload,
    cardId: number,
  ): Promise<CardRecord> {
    const card = await this.cardsRepository.findActiveById(cardId);

    if (!card) {
      throw new NotFoundException('Card not found');
    }

    await this.boardAccessService.ensureMember(card.boardId, user.userId);

    return card;
  }

  private async ensureColumnBelongsToBoard(
    boardId: number,
    columnId: number,
  ): Promise<void> {
    const column = await this.cardsRepository.findActiveColumnByBoard(
      boardId,
      columnId,
    );

    if (!column) {
      throw new NotFoundException('Column not found');
    }
  }

  private async ensureAssigneeBelongsToBoard(
    boardId: number,
    userId: number,
  ): Promise<void> {
    const memberCount = await this.cardsRepository.countActiveBoardMember(
      boardId,
      userId,
    );

    if (memberCount === 0) {
      throw new ForbiddenException('Assignee is not a board member');
    }
  }

  private ensureDateRangeValid(
    startDate: string | undefined,
    dueDate: string | undefined,
  ): void {
    if (!startDate || !dueDate) {
      return;
    }

    if (new Date(startDate).getTime() > new Date(dueDate).getTime()) {
      throw new BadRequestException(
        'startDate must be before or equal dueDate',
      );
    }
  }

  private async ensureMoveCardsBelongToColumns(
    boardId: number,
    dto: MoveCardDto,
  ): Promise<void> {
    const prevCardIds = dto.prevCards.map((card) => card.id);
    const nextCardIds = dto.nextCards.map((card) => card.id);

    if (!nextCardIds.includes(dto.currentCardId)) {
      throw new BadRequestException('nextCards must include currentCardId');
    }

    if (prevCardIds.includes(dto.currentCardId)) {
      throw new BadRequestException('prevCards must not include currentCardId');
    }

    const uniquePrevCardIds = [...new Set(prevCardIds)];
    const uniqueNextCardIds = [...new Set(nextCardIds)];

    if (
      uniquePrevCardIds.length !== prevCardIds.length ||
      uniqueNextCardIds.length !== nextCardIds.length
    ) {
      throw new BadRequestException('Move card payload contains duplicate ids');
    }

    const [prevCount, nextCount] = await Promise.all([
      this.cardsRepository.countCardsInColumn(dto.prevColumnId, prevCardIds),
      this.cardsRepository.countNextColumnCardsForMove(
        boardId,
        dto.currentCardId,
        dto.nextColumnId,
        nextCardIds,
      ),
    ]);

    if (prevCount !== prevCardIds.length) {
      throw new BadRequestException(
        'All previous cards must belong to previous column',
      );
    }

    if (nextCount !== nextCardIds.length) {
      throw new BadRequestException(
        'All next cards must belong to next column or be the current card',
      );
    }
  }

  private toDateInput(date: Date | null | undefined): string | undefined {
    return date === null || date === undefined
      ? undefined
      : date.toISOString().slice(0, 10);
  }

  private toCardResponse(card: CardRecord): CardResponseDto {
    return {
      id: card.id,
      boardId: card.boardId,
      columnId: card.columnId,
      cardNumber: card.cardNumber,
      cardCode: card.cardCode,
      title: card.title,
      description: card.description,
      priorityId: card.priorityId,
      assigneeUserId: card.assigneeUserId,
      assignee: this.toUserResponse(card.assignee),
      issueType: this.toIssueTypeResponse(card.issueType),
      column: this.toColumnResponse(card.column),
      version: this.toVersionResponse(card.version),
      startDate: card.startDate,
      dueDate: card.dueDate,
      estimatedHours: card.estimatedHours,
      actualHours: card.actualHours,
      registeredByUserId: card.registeredByUserId,
      registeredBy: this.toUserResponse(card.registeredBy),
      createdBy: this.toUserResponse(card.createdBy),
      position: card.position,
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
    };
  }

  private toUserResponse(
    user: CardRecord['assignee'],
  ): CardUserResponseDto | null {
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatar: user.avatar,
    };
  }

  private toIssueTypeResponse(
    issueType: CardRecord['issueType'],
  ): CardIssueTypeResponseDto | null {
    if (!issueType) {
      return null;
    }

    return {
      id: issueType.id,
      boardId: issueType.boardId,
      name: issueType.name,
      statusColor: issueType.statusColor,
    };
  }

  private toColumnResponse(
    column: CardRecord['column'],
  ): CardColumnResponseDto {
    return {
      id: column.id,
      boardId: column.boardId,
      title: column.title,
      statusColor: column.statusColor,
      position: column.position,
    };
  }

  private toVersionResponse(
    version: CardRecord['version'],
  ): CardVersionResponseDto | null {
    if (!version) {
      return null;
    }

    return {
      id: version.id,
      boardId: version.boardId,
      name: version.name,
    };
  }
}
