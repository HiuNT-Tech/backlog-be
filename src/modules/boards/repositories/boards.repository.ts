import { Injectable } from '@nestjs/common';
import { BoardMemberRole, BoardType, Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma/prisma.service';
import {
  getOffsetPagination,
  toPaginatedResponse,
} from '@common/utils/pagination.util';
import { addDaysToToday } from '@common/utils/date.util';
import {
  CreateBoardDto,
  CreateSampleBoardDto,
  DuplicateBoardDto,
  GetBoardUsersQueryDto,
} from '../dto/board.dto';
import {
  DEFAULT_COLUMNS,
  SAMPLE_BOARD_CARDS,
  SAMPLE_BOARD_DESCRIPTION,
  SAMPLE_BOARD_ISSUE_TYPES,
  SAMPLE_BOARD_VERSIONS,
  type SampleBoardLocale,
} from '../constants';

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
  priority: true,
  assigneeUserId: true,
  position: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CardSelect;

type CreateBoardWithDefaultsParams = {
  dto: CreateBoardDto;
  userId: number;
};

type DuplicateBoardParams = {
  sourceBoardId: number;
  dto: DuplicateBoardDto;
  userId: number;
};

type CreateSampleBoardParams = {
  dto: CreateSampleBoardDto;
  userId: number;
  locale: SampleBoardLocale;
};

const duplicationSourceSelect = {
  description: true,
  type: true,
  columns: {
    where: { deletedAt: null },
    orderBy: { position: 'asc' as const },
    select: { id: true, title: true, statusColor: true, position: true },
  },
  issueTypes: {
    where: { deletedAt: null },
    select: { id: true, name: true, statusColor: true },
  },
  versions: {
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      description: true,
    },
  },
  cards: {
    where: { deletedAt: null },
    orderBy: [{ columnId: 'asc' as const }, { position: 'asc' as const }],
    select: {
      columnId: true,
      issueTypeId: true,
      versionId: true,
      title: true,
      description: true,
      priority: true,
      assigneeUserId: true,
      startDate: true,
      dueDate: true,
      estimatedHours: true,
      actualHours: true,
      position: true,
    },
  },
} satisfies Prisma.BoardSelect;

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

  /**
   * Nhân bản cột, loại issue, milestone và card của board nguồn sang board
   * mới. KHÔNG copy comment/attachment/lịch sử chỉnh sửa — đó là dữ liệu
   * hoạt động thực tế, không thuộc về "cấu trúc + nội dung ticket" mà việc
   * nhân bản board hướng tới.
   *
   * Trả về null nếu board nguồn không tồn tại/đã bị xoá — service quyết
   * định throw lỗi gì.
   */
  async duplicateBoard(params: DuplicateBoardParams) {
    const { sourceBoardId, dto, userId } = params;

    const newBoardId = await this.prisma.$transaction(async (tx) => {
      const source = await tx.board.findFirst({
        where: { id: sourceBoardId, deletedAt: null },
        select: duplicationSourceSelect,
      });

      if (!source) {
        return null;
      }

      const newBoard = await tx.board.create({
        data: {
          title: dto.title,
          boardCode: dto.boardCode,
          description: dto.description ?? source.description ?? '',
          type: dto.type ?? source.type,
          nextCardNumber: source.cards.length + 1,
        },
      });

      await tx.boardMember.create({
        data: {
          boardId: newBoard.id,
          userId,
          role: BoardMemberRole.ADMIN,
        },
      });

      const columnIdMap = new Map<number, number>();
      for (const column of source.columns) {
        const created = await tx.column.create({
          data: {
            boardId: newBoard.id,
            title: column.title,
            statusColor: column.statusColor,
            position: column.position,
          },
        });
        columnIdMap.set(column.id, created.id);
      }

      const issueTypeIdMap = new Map<number, number>();
      for (const issueType of source.issueTypes) {
        const created = await tx.issueType.create({
          data: {
            boardId: newBoard.id,
            name: issueType.name,
            statusColor: issueType.statusColor,
          },
        });
        issueTypeIdMap.set(issueType.id, created.id);
      }

      const versionIdMap = new Map<number, number>();
      for (const version of source.versions) {
        const created = await tx.version.create({
          data: {
            boardId: newBoard.id,
            name: version.name,
            startDate: version.startDate,
            endDate: version.endDate,
            description: version.description,
          },
        });
        versionIdMap.set(version.id, created.id);
      }

      // Card không có ai khác tham chiếu ngược tới id của nó trong phạm vi
      // nhân bản (comment/attachment không được copy) -> dùng createMany,
      // không cần biết id mới sau khi tạo.
      const cardsData = source.cards
        .map((card, index) => {
          const columnId = columnIdMap.get(card.columnId);
          // Card mồ côi (column bị xoá nhưng card active) không nên xảy ra
          // với dữ liệu hợp lệ, nhưng bỏ qua để không làm hỏng cả transaction.
          if (columnId === undefined) {
            return null;
          }

          const cardNumber = index + 1;

          return {
            boardId: newBoard.id,
            columnId,
            cardNumber,
            cardCode: `${newBoard.boardCode}-${cardNumber}`,
            title: card.title,
            description: card.description,
            priority: card.priority,
            assigneeUserId: card.assigneeUserId,
            issueTypeId: card.issueTypeId
              ? (issueTypeIdMap.get(card.issueTypeId) ?? null)
              : null,
            versionId: card.versionId
              ? (versionIdMap.get(card.versionId) ?? null)
              : null,
            startDate: card.startDate,
            dueDate: card.dueDate,
            estimatedHours: card.estimatedHours,
            actualHours: card.actualHours,
            registeredByUserId: userId,
            createdByUserId: userId,
            position: card.position,
          };
        })
        .filter((data): data is NonNullable<typeof data> => data !== null);

      if (cardsData.length > 0) {
        await tx.card.createMany({ data: cardsData });
      }

      return newBoard.id;
    });

    if (newBoardId === null) {
      return null;
    }

    return this.findBoardDetail(newBoardId);
  }

  /**
   * Tạo "project mẫu": board có sẵn cột mặc định, loại issue, milestone và các
   * ticket demo (nội dung ở `sample-board.constant.ts`), để người dùng chưa
   * quen tool thấy ngay một dự án thật được tổ chức như thế nào.
   *
   * Khác `duplicateBoard`: không đọc board nguồn nào trong DB — dữ liệu mẫu
   * nằm trong code nên không phụ thuộc vào một board template có thể bị xoá,
   * và card mẫu được gán cho chính người tạo (board nguồn thì giữ assignee cũ).
   */
  async createSampleBoard(params: CreateSampleBoardParams) {
    const { dto, userId, locale } = params;

    const newBoardId = await this.prisma.$transaction(async (tx) => {
      const board = await tx.board.create({
        data: {
          title: dto.title,
          boardCode: dto.boardCode,
          description: SAMPLE_BOARD_DESCRIPTION[locale],
          type: BoardType.PUBLIC,
          nextCardNumber: SAMPLE_BOARD_CARDS.length + 1,
        },
      });

      await tx.boardMember.create({
        data: {
          boardId: board.id,
          userId,
          role: BoardMemberRole.ADMIN,
        },
      });

      const columnIds: number[] = [];
      for (const column of DEFAULT_COLUMNS) {
        const created = await tx.column.create({
          data: {
            boardId: board.id,
            title: column.title,
            statusColor: column.statusColor,
            position: column.position,
          },
        });
        columnIds.push(created.id);
      }

      const issueTypeIds: number[] = [];
      for (const issueType of SAMPLE_BOARD_ISSUE_TYPES) {
        const created = await tx.issueType.create({
          data: {
            boardId: board.id,
            name: issueType.name,
            statusColor: issueType.statusColor,
          },
        });
        issueTypeIds.push(created.id);
      }

      const versionIds: number[] = [];
      for (const version of SAMPLE_BOARD_VERSIONS) {
        const created = await tx.version.create({
          data: {
            boardId: board.id,
            name: version.name,
            startDate: addDaysToToday(version.startsInDays),
            endDate: addDaysToToday(version.endsInDays),
            description: version.description[locale],
          },
        });
        versionIds.push(created.id);
      }

      // `position` đánh số riêng trong từng cột — thứ tự card trên board là
      // thứ tự trong cột đó, không phải thứ tự toàn board.
      const nextPositionByColumn = new Map<number, number>();

      const cardsData = SAMPLE_BOARD_CARDS.map((card, index) => {
        const cardNumber = index + 1;
        const position = nextPositionByColumn.get(card.columnIndex) ?? 0;
        nextPositionByColumn.set(card.columnIndex, position + 1);

        return {
          boardId: board.id,
          columnId: columnIds[card.columnIndex],
          cardNumber,
          cardCode: `${board.boardCode}-${cardNumber}`,
          title: card.title[locale],
          description: card.description[locale],
          priority: card.priority,
          assigneeUserId: card.assignToCreator ? userId : null,
          issueTypeId: issueTypeIds[card.issueTypeIndex],
          versionId: versionIds[card.versionIndex],
          dueDate:
            card.dueInDays === undefined
              ? null
              : addDaysToToday(card.dueInDays),
          estimatedHours: card.estimatedHours ?? null,
          actualHours: card.actualHours ?? null,
          registeredByUserId: userId,
          createdByUserId: userId,
          position,
        };
      });

      await tx.card.createMany({ data: cardsData });

      return board.id;
    });

    return this.findBoardDetail(newBoardId);
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
              userCode: true,
            },
          },
        },
      }),
    ]);

    return toPaginatedResponse(items, total);
  }

  countActiveAdmins(boardId: number) {
    return this.prisma.boardMember.count({
      where: { boardId, role: BoardMemberRole.ADMIN, deletedAt: null },
    });
  }

  updateMemberRole(memberId: number, role: BoardMemberRole) {
    return this.prisma.boardMember.update({
      where: { id: memberId },
      data: { role },
      select: { userId: true, role: true },
    });
  }

  async softDeleteMember(memberId: number): Promise<void> {
    await this.prisma.boardMember.update({
      where: { id: memberId },
      data: { deletedAt: new Date() },
    });
  }
}
