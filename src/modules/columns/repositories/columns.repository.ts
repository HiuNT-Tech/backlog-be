import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma/prisma.service';
import { CreateColumnDto, UpdateColumnDto } from '../dto/column.dto';

const columnSelect = {
  id: true,
  boardId: true,
  title: true,
  statusColor: true,
  position: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ColumnSelect;

const columnWithCountSelect = {
  ...columnSelect,
  _count: {
    select: {
      cards: true,
    },
  },
} satisfies Prisma.ColumnSelect;

@Injectable()
export class ColumnsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActiveById(id: number) {
    return this.prisma.column.findFirst({
      where: { id, deletedAt: null },
      select: columnSelect,
    });
  }

  findByBoardId(boardId: number) {
    return this.prisma.column.findMany({
      where: { boardId, deletedAt: null },
      orderBy: { position: 'asc' },
      select: columnWithCountSelect,
    });
  }

  async create(dto: CreateColumnDto) {
    const lastColumn = await this.prisma.column.findFirst({
      where: { boardId: dto.boardId, deletedAt: null },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const position = lastColumn ? lastColumn.position + 1 : 0;

    return this.prisma.column.create({
      data: {
        boardId: dto.boardId,
        title: dto.title,
        statusColor: dto.statusColor,
        position,
      },
      select: columnSelect,
    });
  }

  async update(columnId: number, dto: UpdateColumnDto) {
    await this.prisma.$transaction(async (tx) => {
      if (dto.title !== undefined || dto.statusColor !== undefined) {
        await tx.column.update({
          where: { id: columnId },
          data: {
            ...(dto.title !== undefined ? { title: dto.title } : {}),
            ...(dto.statusColor !== undefined
              ? { statusColor: dto.statusColor }
              : {}),
          },
        });
      }

      if (dto.cards) {
        for (const card of dto.cards) {
          await tx.card.update({
            where: { id: card.id },
            data: { position: card.position },
          });
        }
      }
    });

    return this.findActiveById(columnId);
  }

  countMatchingCards(columnId: number, cardIds: number[]) {
    return this.prisma.card.count({
      where: {
        id: { in: cardIds },
        columnId,
        deletedAt: null,
      },
    });
  }

  async softDeleteWithCards(columnId: number, boardId: number) {
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.card.updateMany({
        where: { columnId, deletedAt: null },
        data: { deletedAt: now },
      });

      await tx.column.update({
        where: { id: columnId },
        data: { deletedAt: now },
      });

      const remainingColumns = await tx.column.findMany({
        where: { boardId, deletedAt: null },
        orderBy: [{ position: 'asc' }, { id: 'asc' }],
        select: { id: true },
      });

      for (const [position, column] of remainingColumns.entries()) {
        await tx.column.update({
          where: { id: column.id },
          data: { position },
        });
      }
    });
  }
}
