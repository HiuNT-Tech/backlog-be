import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma/prisma.service';
import { CreateCardDto } from '../dto/card.dto';

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
  priorityId: true,
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

  findActiveById(id: number) {
    return this.prisma.card.findFirst({
      where: { id, deletedAt: null },
      select: cardDetailSelect,
    });
  }

  async create(dto: CreateCardDto, userId: number) {
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
          priorityId: dto.priorityId,
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
        },
        select: cardDetailSelect,
      });
    });

    return card;
  }

  private toDate(value: string | undefined): Date | undefined {
    return value === undefined ? undefined : new Date(value);
  }
}
