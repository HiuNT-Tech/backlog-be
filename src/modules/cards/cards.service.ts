import { HttpStatus, Injectable } from '@nestjs/common';
import { BoardMemberRole } from '@prisma/client';
import { BusinessException } from '@common/exceptions/business.exception';
import { ErrorCode } from '@common/exceptions/error-code';
import { JwtPayload } from '@/types/jwt-payload.type';
import {
  BOARD_CONTRIBUTOR_ROLES,
  BoardAccessService,
} from '@modules/boards/board-access.service';
import { IssueTypesService } from '@modules/issue-types/issue-types.service';
import { VersionsService } from '@modules/versions/versions.service';
import { AttachmentsService } from '@modules/attachments/attachments.service';
import { UploadedFile } from '@common/upload';
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
import { CardHistoryService } from './card-history.service';
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
    private readonly attachmentsService: AttachmentsService,
    private readonly cardHistoryService: CardHistoryService,
  ) {}

  async create(
    user: JwtPayload,
    dto: CreateCardDto,
    files?: UploadedFile[],
  ): Promise<CardResponseDto> {
    await this.boardAccessService.ensureRole(
      dto.boardId,
      user.userId,
      BOARD_CONTRIBUTOR_ROLES,
    );
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

    // Upload trước, tạo card + attachment cùng lúc (nested write) — nếu
    // upload lỗi thì chưa có gì được ghi vào DB.
    const prepared = await this.attachmentsService.uploadFiles(
      files,
      user.userId,
    );
    const card = await this.cardsRepository.create(dto, user.userId, prepared);
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
    files?: UploadedFile[],
  ): Promise<CardResponseDto> {
    const card = await this.ensureCardVisibleToUser(
      user,
      id,
      BOARD_CONTRIBUTOR_ROLES,
    );
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

    await this.cardsRepository.update(
      id,
      dto,
      nextColumnId !== card.columnId,
    );
    await this.attachmentsService.removeFromCard(id, dto.removeAttachmentIds);
    await this.attachmentsService.addFilesToCard(id, files, user.userId);

    const updated = await this.cardsRepository.findActiveById(id);
    if (!updated) {
      throw new BusinessException(ErrorCode.CARD_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    await this.cardHistoryService.recordCardUpdate(
      id,
      user.userId,
      card,
      updated,
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
    const card = await this.ensureCardVisibleToUser(
      user,
      dto.currentCardId,
      BOARD_CONTRIBUTOR_ROLES,
    );
    const [prevColumn, nextColumn] = await Promise.all([
      this.cardsRepository.findActiveColumnWithBoard(dto.prevColumnId),
      this.cardsRepository.findActiveColumnWithBoard(dto.nextColumnId),
    ]);

    if (!prevColumn || prevColumn.boardId !== card.boardId) {
      throw new BusinessException(
        ErrorCode.COLUMN_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    if (!nextColumn || nextColumn.boardId !== card.boardId) {
      throw new BusinessException(
        ErrorCode.COLUMN_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    if (card.columnId !== dto.prevColumnId) {
      throw new BusinessException(
        ErrorCode.MOVE_CARD_WRONG_COLUMN,
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.ensureMoveCardsBelongToColumns(card.boardId, dto);
    await this.cardsRepository.move(dto);

    return { updateResult: 'Successfully!' };
  }

  /**
   * Ensure the card exists and the user can access its board.
   * Returns the card's boardId. Exposed for other modules (e.g. comments)
   * that operate on card sub-resources.
   *
   * Pass `roles` to require a specific board role (e.g. for write operations
   * that GUEST must not perform); omit it for read access (any member).
   */
  async ensureCardAccessible(
    user: JwtPayload,
    cardId: number,
    roles?: BoardMemberRole[],
  ): Promise<number> {
    const card = await this.cardsRepository.findActiveBoardId(cardId);

    if (!card) {
      throw new BusinessException(
        ErrorCode.CARD_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    await this.ensureBoardAccess(card.boardId, user.userId, roles);

    return card.boardId;
  }

  private async ensureCardVisibleToUser(
    user: JwtPayload,
    cardId: number,
    roles?: BoardMemberRole[],
  ): Promise<CardRecord> {
    const card = await this.cardsRepository.findActiveById(cardId);

    if (!card) {
      throw new BusinessException(
        ErrorCode.CARD_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    await this.ensureBoardAccess(card.boardId, user.userId, roles);

    return card;
  }

  private async ensureBoardAccess(
    boardId: number,
    userId: number,
    roles?: BoardMemberRole[],
  ): Promise<void> {
    if (roles) {
      await this.boardAccessService.ensureRole(boardId, userId, roles);
    } else {
      await this.boardAccessService.ensureMember(boardId, userId);
    }
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
      throw new BusinessException(
        ErrorCode.COLUMN_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
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
      throw new BusinessException(
        ErrorCode.ASSIGNEE_NOT_BOARD_MEMBER,
        HttpStatus.FORBIDDEN,
      );
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
      throw new BusinessException(
        ErrorCode.INVALID_DATE_RANGE,
        HttpStatus.BAD_REQUEST,
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
      throw new BusinessException(
        ErrorCode.MOVE_CARD_MISSING_CURRENT,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (prevCardIds.includes(dto.currentCardId)) {
      throw new BusinessException(
        ErrorCode.MOVE_CARD_INVALID_PREV,
        HttpStatus.BAD_REQUEST,
      );
    }

    const uniquePrevCardIds = [...new Set(prevCardIds)];
    const uniqueNextCardIds = [...new Set(nextCardIds)];

    if (
      uniquePrevCardIds.length !== prevCardIds.length ||
      uniqueNextCardIds.length !== nextCardIds.length
    ) {
      throw new BusinessException(
        ErrorCode.MOVE_CARD_DUPLICATE_IDS,
        HttpStatus.BAD_REQUEST,
      );
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
      throw new BusinessException(
        ErrorCode.MOVE_CARD_PREV_MISMATCH,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (nextCount !== nextCardIds.length) {
      throw new BusinessException(
        ErrorCode.MOVE_CARD_NEXT_MISMATCH,
        HttpStatus.BAD_REQUEST,
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
      priority: card.priority,
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
      attachments: card.attachments.map((attachment) =>
        this.attachmentsService.toResponse(attachment),
      ),
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
