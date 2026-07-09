import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma/prisma.service';
import {
  attachmentSelect,
  UploadedAttachmentData,
} from '@modules/attachments/repositories/attachments.repository';
import {
  CreateCardDto,
  ListBoardCardsQueryDto,
  MoveCardDto,
  MoveCardItemDto,
  UpdateCardDto,
} from '../dto/card.dto';

export const cardUserSelect = {
  id: true,
  email: true,
  displayName: true,
  avatar: true,
} satisfies Prisma.UserSelect;

export const cardColumnSelect = {
  id: true,
  boardId: true,
  title: true,
  statusColor: true,
  position: true,
} satisfies Prisma.ColumnSelect;

export const cardIssueTypeSelect = {
  id: true,
  boardId: true,
  name: true,
  statusColor: true,
} satisfies Prisma.IssueTypeSelect;

export const cardVersionSelect = {
  id: true,
  boardId: true,
  name: true,
} satisfies Prisma.VersionSelect;

export const cardDetailSelect = {
  id: true,
  boardId: true,
  columnId: true,
  cardNumber: true,
  cardCode: true,
  title: true,
  description: true,
  priority: true,
  assigneeUserId: true,
  assignee: { select: cardUserSelect },
  issueTypeId: true,
  issueType: { select: cardIssueTypeSelect },
  column: { select: cardColumnSelect },
  versionId: true,
  version: { select: cardVersionSelect },
  startDate: true,
  dueDate: true,
  estimatedHours: true,
  actualHours: true,
  registeredByUserId: true,
  registeredBy: { select: cardUserSelect },
  createdBy: { select: cardUserSelect },
  position: true,
  createdAt: true,
  updatedAt: true,
  attachments: {
    where: { deletedAt: null },
    orderBy: { createdAt: 'asc' },
    select: attachmentSelect,
  },
} satisfies Prisma.CardSelect;

@Injectable()
export class CardsRepository {
  constructor(private readonly prisma: PrismaService) {}

  countActiveBoardMember(boardId: number, userId: number) {
    return this.prisma.boardMember.count({
      where: {
        boardId,
        userId,
        deletedAt: null,
      },
    });
  }

  findActiveColumnByBoard(boardId: number, columnId: number) {
    return this.prisma.column.findFirst({
      where: { id: columnId, boardId, deletedAt: null },
      select: { id: true },
    });
  }

  findActiveColumnWithBoard(columnId: number) {
    return this.prisma.column.findFirst({
      where: { id: columnId, deletedAt: null },
      select: { id: true, boardId: true },
    });
  }

  findActiveById(id: number) {
    return this.prisma.card.findFirst({
      where: { id, deletedAt: null },
      select: cardDetailSelect,
    });
  }

  findActiveBoardId(id: number) {
    return this.prisma.card.findFirst({
      where: { id, deletedAt: null },
      select: { boardId: true },
    });
  }

  async findByBoard(boardId: number, query: ListBoardCardsQueryDto) {
    const where = this.buildBoardCardsWhere(boardId, query);
    const skip = Math.max(query.skip ?? 0, 0);
    const take = Math.max(query.limit ?? 10, 1);

    const [total, items] = await this.prisma.$transaction([
      this.prisma.card.count({ where }),
      this.prisma.card.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: cardDetailSelect,
      }),
    ]);

    return { total, items };
  }

  /**
   * Tạo card kèm attachment trong CÙNG transaction (đã có $transaction cho
   * số thứ tự card). Nested-write của attachment nằm trong khối này nên
   * nếu tạo attachment lỗi, cả card cũng rollback — tránh card "mồ côi"
   * không có file khi upload thất bại giữa đường.
   */
  async create(
    dto: CreateCardDto,
    userId: number,
    attachments: UploadedAttachmentData[] = [],
  ) {
    const card = await this.prisma.$transaction(async (tx) => {
      const board = await tx.board.update({
        where: { id: dto.boardId },
        data: { nextCardNumber: { increment: 1 } },
        select: {
          boardCode: true,
          nextCardNumber: true,
        },
      });
      const cardNumber = board.nextCardNumber - 1;
      const lastCard = await tx.card.findFirst({
        where: {
          columnId: dto.columnId,
          deletedAt: null,
        },
        orderBy: { position: 'desc' },
        select: { position: true },
      });
      const position = lastCard ? lastCard.position + 1 : 0;

      return tx.card.create({
        data: {
          boardId: dto.boardId,
          columnId: dto.columnId,
          cardNumber,
          cardCode: `${board.boardCode}-${cardNumber}`,
          title: dto.title,
          description: dto.description,
          priority: dto.priority,
          assigneeUserId: dto.assigneeUserId,
          issueTypeId: dto.issueTypeId,
          versionId: dto.versionId,
          startDate: this.toDate(dto.startDate),
          dueDate: this.toDate(dto.dueDate),
          estimatedHours: dto.estimatedHours,
          actualHours: dto.actualHours,
          registeredByUserId: userId,
          createdByUserId: userId,
          position,
          attachments: { create: attachments },
        },
        select: cardDetailSelect,
      });
    });

    return card;
  }

  async update(cardId: number, dto: UpdateCardDto, columnChanged: boolean) {
    const card = await this.prisma.$transaction(async (tx) => {
      const nextPosition =
        columnChanged && dto.columnId !== undefined
          ? await this.getNextPosition(tx, dto.columnId)
          : undefined;

      return tx.card.update({
        where: { id: cardId },
        data: {
          ...(dto.title !== undefined ? { title: dto.title } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description }
            : {}),
          ...(dto.columnId !== undefined ? { columnId: dto.columnId } : {}),
          ...(nextPosition !== undefined ? { position: nextPosition } : {}),
          ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
          ...(dto.assigneeUserId !== undefined
            ? { assigneeUserId: dto.assigneeUserId }
            : {}),
          ...(dto.issueTypeId !== undefined
            ? { issueTypeId: dto.issueTypeId }
            : {}),
          ...(dto.versionId !== undefined ? { versionId: dto.versionId } : {}),
          ...(dto.startDate !== undefined
            ? { startDate: this.toDate(dto.startDate) }
            : {}),
          ...(dto.dueDate !== undefined
            ? { dueDate: this.toDate(dto.dueDate) }
            : {}),
          ...(dto.estimatedHours !== undefined
            ? { estimatedHours: dto.estimatedHours }
            : {}),
          ...(dto.actualHours !== undefined
            ? { actualHours: dto.actualHours }
            : {}),
        },
        select: cardDetailSelect,
      });
    });

    return card;
  }

  countCardsInColumn(columnId: number, cardIds: number[]) {
    if (cardIds.length === 0) {
      return 0;
    }

    return this.prisma.card.count({
      where: {
        id: { in: cardIds },
        columnId,
        deletedAt: null,
      },
    });
  }

  countNextColumnCardsForMove(
    boardId: number,
    currentCardId: number,
    nextColumnId: number,
    cardIds: number[],
  ) {
    if (cardIds.length === 0) {
      return 0;
    }

    return this.prisma.card.count({
      where: {
        id: { in: cardIds },
        boardId,
        deletedAt: null,
        OR: [{ columnId: nextColumnId }, { id: currentCardId }],
      },
    });
  }

  async move(dto: MoveCardDto) {
    await this.prisma.$transaction(async (tx) => {
      await tx.card.update({
        where: { id: dto.currentCardId },
        data: { columnId: dto.nextColumnId },
      });

      await this.updateCardPositions(tx, dto.prevCards, dto.prevColumnId);
      await this.updateCardPositions(tx, dto.nextCards, dto.nextColumnId);
    });
  }

  private buildBoardCardsWhere(
    boardId: number,
    query: ListBoardCardsQueryDto,
  ): Prisma.CardWhereInput {
    return {
      boardId,
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { cardCode: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.cardCode
        ? { cardCode: { startsWith: query.cardCode, mode: 'insensitive' } }
        : {}),
      ...(query.priority && query.priority.length > 0
        ? { priority: { in: query.priority } }
        : {}),
      ...this.inFilter('issueTypeId', query.issueTypeId),
      ...this.inFilter('columnId', query.columnId),
      ...this.inFilter('assigneeUserId', query.assigneeUserId),
      ...this.inFilter('registeredByUserId', query.registeredByUserId),
      ...this.inFilter('versionId', query.versionId),
      ...(query.startDate
        ? { startDate: { gte: this.toDate(query.startDate) } }
        : {}),
      ...(query.dueDate
        ? { dueDate: { lte: this.toDate(query.dueDate) } }
        : {}),
    };
  }

  private inFilter<TField extends keyof Prisma.CardWhereInput>(
    field: TField,
    values: number[] | undefined,
  ): Prisma.CardWhereInput {
    return values && values.length > 0 ? { [field]: { in: values } } : {};
  }

  private async getNextPosition(
    tx: Prisma.TransactionClient,
    columnId: number,
  ): Promise<number> {
    const lastCard = await tx.card.findFirst({
      where: {
        columnId,
        deletedAt: null,
      },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    return lastCard ? lastCard.position + 1 : 0;
  }

  private async updateCardPositions(
    tx: Prisma.TransactionClient,
    cards: MoveCardItemDto[],
    columnId: number,
  ): Promise<void> {
    for (const card of cards) {
      await tx.card.update({
        where: { id: card.id },
        data: {
          columnId,
          position: card.position,
        },
      });
    }
  }

  private toDate(value: string | undefined): Date | undefined {
    return value === undefined ? undefined : new Date(value);
  }
}
