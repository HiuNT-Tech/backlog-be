import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotImplementedException,
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

    if (dto.assigneeUserId !== undefined) {
      await this.ensureAssigneeBelongsToBoard(dto.boardId, dto.assigneeUserId);
    }

    if (dto.issueTypeId !== undefined) {
      await this.issueTypesService.ensureBelongsToBoard(
        dto.boardId,
        dto.issueTypeId,
      );
    }

    if (dto.versionId !== undefined) {
      await this.versionsService.ensureBelongsToBoard(
        dto.boardId,
        dto.versionId,
      );
    }

    const card = await this.cardsRepository.create(dto, user.userId);
    return this.toCardResponse(card);
  }

  findOne(user: JwtPayload, id: number): Promise<CardResponseDto> {
    void user;
    void id;
    throw new NotImplementedException(
      'GET /v1/cards/:id is not implemented yet',
    );
  }

  update(
    user: JwtPayload,
    id: number,
    dto: UpdateCardDto,
  ): Promise<CardResponseDto> {
    void user;
    void id;
    void dto;
    throw new NotImplementedException(
      'PUT /v1/cards/:id is not implemented yet',
    );
  }

  findByBoard(
    user: JwtPayload,
    boardId: number,
    query: ListBoardCardsQueryDto,
  ): Promise<BoardCardsResponseDto> {
    void user;
    void boardId;
    void query;
    throw new NotImplementedException(
      'GET /v1/boards/:id/cards is not implemented yet',
    );
  }

  move(user: JwtPayload, dto: MoveCardDto): Promise<CardResponseDto> {
    void user;
    void dto;
    throw new NotImplementedException(
      'PUT /v1/boards/supports/moving_card is not implemented yet',
    );
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
      issueTypeId: card.issueTypeId,
      issueType: this.toIssueTypeResponse(card.issueType),
      column: this.toColumnResponse(card.column),
      versionId: card.versionId,
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
