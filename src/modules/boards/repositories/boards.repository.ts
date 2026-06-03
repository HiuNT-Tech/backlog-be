import { Injectable } from '@nestjs/common';
import { BoardMemberRole, Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma/prisma.service';
import {
  getOffsetPagination,
  toPaginatedResponse,
} from '@common/utils/pagination.util';
import { CreateBoardDto, GetBoardUsersQueryDto } from '../dto/board.dto';
import { DEFAULT_COLUMNS } from '../constants';

const boardBaseSelect = {
  id: true,
  title: true,
  boardCode: true,
  description: true,
  type: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.BoardSelect;

const memberSelect = {
  userId: true,
  role: true,
} satisfies Prisma.BoardMemberSelect;

const columnSelect = {
  id: true,
  boardId: true,
  title: true,
  statusColor: true,
  position: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ColumnSelect;

export const boardListSelect = {
  ...boardBaseSelect,
  members: {
    where: { deletedAt: null },
    select: memberSelect,
  },
  columns: {
    where: { deletedAt: null },
    orderBy: { position: 'asc' as const },
    select: columnSelect,
  },
} satisfies Prisma.BoardSelect;

export const boardDetailSelect = {
  ...boardBaseSelect,
  members: {
    where: { deletedAt: null },
    select: memberSelect,
  },
  columns: {
    where: { deletedAt: null },
    orderBy: { position: 'asc' as const },
    select: columnSelect,
  },
} satisfies Prisma.BoardSelect;

export const boardCardSelect = {
  id: true,
  boardId: true,
  columnId: true,
  cardNumber: true,
  cardCode: true,
  title: true,
  description: true,
  priorityId: true,
  assigneeUserId: true,
  position: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CardSelect;

type CreateBoardWithDefaultsParams = {
  dto: CreateBoardDto;
  userId: number;
};



@Injectable()
export class BoardsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findBoardById(id: number) {
    return this.prisma.board.findFirst({
      where: { id, deletedAt: null },
      select: boardBaseSelect,
    });
  }

  findBoardIdByCode(boardCode: string) {
    return this.prisma.board.findFirst({
      where: { boardCode, deletedAt: null },
      select: { id: true },
    });
  }

  findByCode(boardCode: string) {
    return this.prisma.board.findUnique({
      where: { boardCode },
      select: { id: true },
    });
  }

  findBoardsByUser(userId: number) {
    return this.prisma.board.findMany({
      where: {
        deletedAt: null,
        members: {
          some: {
            userId,
            deletedAt: null,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      select: boardListSelect,
    });
  }

  findBoardDetail(boardId: number) {
    return this.prisma.board.findFirst({
      where: { id: boardId, deletedAt: null },
      select: boardDetailSelect,
    });
  }

  findBoardDetailByCode(boardCode: string) {
    return this.prisma.board.findFirst({
      where: { boardCode, deletedAt: null },
      select: boardDetailSelect,
    });
  }



  findBoardCards(boardId: number, assigneeUserId?: number) {
    return this.prisma.card.findMany({
      where: {
        boardId,
        deletedAt: null,
        ...(assigneeUserId ? { assigneeUserId } : {}),
      },
      orderBy: [{ columnId: 'asc' }, { position: 'asc' }],
      select: boardCardSelect,
    });
  }

  async createBoardWithDefaults(params: CreateBoardWithDefaultsParams) {
    const { dto, userId } = params;

    const board = await this.prisma.$transaction(async (tx) => {
      const createdBoard = await tx.board.create({
        data: {
          title: dto.title,
          boardCode: dto.boardCode,
          description: dto.description ?? '',
          type: dto.type,
          nextCardNumber: 1,
        },
      });

      await tx.boardMember.create({
        data: {
          boardId: createdBoard.id,
          userId,
          role: BoardMemberRole.ADMIN,
        },
      });

      await tx.column.createMany({
        data: DEFAULT_COLUMNS.map((column) => ({
          boardId: createdBoard.id,
          ...column,
        })),
      });

      return createdBoard;
    });

    return this.findBoardDetail(board.id);
  }

  async updateBoard(
    boardId: number,
    data: Prisma.BoardUpdateInput,
    columns?: { id: number; position: number }[],
  ) {
    await this.prisma.$transaction(async (tx) => {
      if (Object.keys(data).length > 0) {
        await tx.board.update({
          where: { id: boardId },
          data,
        });
      }

      if (columns) {
        for (const column of columns) {
          await tx.column.update({
            where: { id: column.id },
            data: { position: column.position },
          });
        }
      }
    });

    return this.findBoardDetail(boardId);
  }

  countCards(boardId: number) {
    return this.prisma.card.count({
      where: { boardId, deletedAt: null },
    });
  }

  countMatchingColumns(boardId: number, columnIds: number[]) {
    return this.prisma.column.count({
      where: {
        id: { in: columnIds },
        boardId,
        deletedAt: null,
      },
    });
  }

  async findBoardUsers(boardId: number, query: GetBoardUsersQueryDto) {
    const where: Prisma.BoardMemberWhereInput = {
      boardId,
      deletedAt: null,
      ...(query.role ? { role: query.role } : {}),
      ...(query.search
        ? {
            user: {
              deletedAt: null,
              OR: [
                { email: { contains: query.search, mode: 'insensitive' } },
                {
                  displayName: {
                    contains: query.search,
                    mode: 'insensitive',
                  },
                },
                { userCode: { contains: query.search, mode: 'insensitive' } },
              ],
            },
          }
        : { user: { deletedAt: null } }),
    };

    const { skip, take } = getOffsetPagination(query);
    const [total, items] = await this.prisma.$transaction([
      this.prisma.boardMember.count({ where }),
      this.prisma.boardMember.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'asc' },
        select: {
          role: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              email: true,
              displayName: true,
              avatar: true,
            },
          },
        },
      }),
    ]);

    return toPaginatedResponse(items, total);
  }
}
