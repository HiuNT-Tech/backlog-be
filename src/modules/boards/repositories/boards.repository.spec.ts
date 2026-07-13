import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { BoardMemberRole, BoardType, StatusColor } from '@prisma/client';
import { PrismaService } from '@database/prisma/prisma.service';
import { BoardsRepository } from './boards.repository';
import { DEFAULT_COLUMNS } from '../constants';
import {
  CreateBoardDto,
  DuplicateBoardDto,
  GetBoardUsersQueryDto,
} from '../dto/board.dto';
import { makeBoardRecord } from '../../../../test/factories/board.factory';

describe('BoardsRepository', () => {
  let prisma: DeepMockProxy<PrismaService>;
  let repository: BoardsRepository;

  beforeEach(() => {
    prisma = mockDeep<PrismaService>();
    repository = new BoardsRepository(prisma);
  });

  describe('findBoardById', () => {
    it('should query the board by id excluding soft-deleted boards', async () => {
      const board = makeBoardRecord();
      prisma.board.findFirst.mockResolvedValue(board as never);

      const result = await repository.findBoardById(1);

      expect(prisma.board.findFirst).toHaveBeenCalledWith({
        where: { id: 1, deletedAt: null },
        select: {
          id: true,
          title: true,
          boardCode: true,
          description: true,
          type: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      expect(result).toBe(board);
    });
  });

  describe('findBoardIdByCode', () => {
    it('should query the board id by boardCode excluding soft-deleted boards', async () => {
      prisma.board.findFirst.mockResolvedValue({ id: 5 } as never);

      const result = await repository.findBoardIdByCode('PIPC');

      expect(prisma.board.findFirst).toHaveBeenCalledWith({
        where: { boardCode: 'PIPC', deletedAt: null },
        select: { id: true },
      });
      expect(result).toEqual({ id: 5 });
    });
  });

  describe('findByCode', () => {
    it('should query the board by unique boardCode', async () => {
      prisma.board.findUnique.mockResolvedValue({ id: 5 } as never);

      const result = await repository.findByCode('PIPC');

      expect(prisma.board.findUnique).toHaveBeenCalledWith({
        where: { boardCode: 'PIPC' },
        select: { id: true },
      });
      expect(result).toEqual({ id: 5 });
    });

    it('should return null when no board matches the code', async () => {
      prisma.board.findUnique.mockResolvedValue(null);

      const result = await repository.findByCode('MISSING');

      expect(result).toBeNull();
    });
  });

  describe('findBoardsByUser', () => {
    it('should query boards where the user is an active member, ordered by updatedAt desc', async () => {
      const boards = [makeBoardRecord()];
      prisma.board.findMany.mockResolvedValue(boards as never);

      const result = await repository.findBoardsByUser(1);

      expect(prisma.board.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            deletedAt: null,
            members: { some: { userId: 1, deletedAt: null } },
          },
          orderBy: { updatedAt: 'desc' },
        }),
      );
      expect(result).toBe(boards);
    });
  });

  describe('findBoardDetail', () => {
    it('should query the board detail by id excluding soft-deleted boards', async () => {
      const board = makeBoardRecord();
      prisma.board.findFirst.mockResolvedValue(board as never);

      const result = await repository.findBoardDetail(1);

      expect(prisma.board.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1, deletedAt: null } }),
      );
      expect(result).toBe(board);
    });
  });

  describe('findBoardDetailByCode', () => {
    it('should query the board detail by boardCode excluding soft-deleted boards', async () => {
      const board = makeBoardRecord();
      prisma.board.findFirst.mockResolvedValue(board as never);

      const result = await repository.findBoardDetailByCode('PIPC');

      expect(prisma.board.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { boardCode: 'PIPC', deletedAt: null } }),
      );
      expect(result).toBe(board);
    });
  });

  describe('findBoardCards', () => {
    it('should query cards for the board ordered by columnId then position, without assignee filter', async () => {
      prisma.card.findMany.mockResolvedValue([] as never);

      await repository.findBoardCards(1);

      expect(prisma.card.findMany).toHaveBeenCalledWith({
        where: { boardId: 1, deletedAt: null },
        orderBy: [{ columnId: 'asc' }, { position: 'asc' }],
        select: expect.any(Object),
      });
    });

    it('should include the assigneeUserId filter when provided', async () => {
      prisma.card.findMany.mockResolvedValue([] as never);

      await repository.findBoardCards(1, 42);

      expect(prisma.card.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { boardId: 1, deletedAt: null, assigneeUserId: 42 },
        }),
      );
    });
  });

  describe('createBoardWithDefaults', () => {
    it('should create the board, an ADMIN member, and default columns inside a transaction, then return the board detail', async () => {
      const dto: CreateBoardDto = {
        title: 'New Board',
        boardCode: 'NB',
        description: 'desc',
        type: BoardType.PUBLIC,
      };
      const createdBoard = { id: 10 };
      const boardDetail = makeBoardRecord({ id: 10 });

      prisma.$transaction.mockImplementation(
        (async (cb: any) => cb(prisma)) as never,
      );
      prisma.board.create.mockResolvedValue(createdBoard as never);
      prisma.boardMember.create.mockResolvedValue({} as never);
      prisma.column.createMany.mockResolvedValue({ count: 4 } as never);
      const findDetailSpy = jest
        .spyOn(repository, 'findBoardDetail')
        .mockResolvedValue(boardDetail as never);

      const result = await repository.createBoardWithDefaults({
        dto,
        userId: 1,
      });

      expect(prisma.board.create).toHaveBeenCalledWith({
        data: {
          title: dto.title,
          boardCode: dto.boardCode,
          description: dto.description,
          type: dto.type,
          nextCardNumber: 1,
        },
      });
      expect(prisma.boardMember.create).toHaveBeenCalledWith({
        data: {
          boardId: createdBoard.id,
          userId: 1,
          role: BoardMemberRole.ADMIN,
        },
      });
      expect(prisma.column.createMany).toHaveBeenCalledWith({
        data: DEFAULT_COLUMNS.map((column) => ({
          boardId: createdBoard.id,
          ...column,
        })),
      });
      expect(findDetailSpy).toHaveBeenCalledWith(createdBoard.id);
      expect(result).toBe(boardDetail);
    });

    it('should default description to an empty string when not provided', async () => {
      const dto: CreateBoardDto = {
        title: 'New Board',
        boardCode: 'NB',
        type: BoardType.PUBLIC,
      };
      const createdBoard = { id: 11 };

      prisma.$transaction.mockImplementation(
        (async (cb: any) => cb(prisma)) as never,
      );
      prisma.board.create.mockResolvedValue(createdBoard as never);
      prisma.boardMember.create.mockResolvedValue({} as never);
      prisma.column.createMany.mockResolvedValue({ count: 4 } as never);
      jest
        .spyOn(repository, 'findBoardDetail')
        .mockResolvedValue(makeBoardRecord({ id: 11 }) as never);

      await repository.createBoardWithDefaults({ dto, userId: 1 });

      expect(prisma.board.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ description: '' }) }),
      );
    });
  });

  describe('updateBoard', () => {
    it('should skip calling board.update when data is an empty object', async () => {
      prisma.$transaction.mockImplementation(
        (async (cb: any) => cb(prisma)) as never,
      );
      const boardDetail = makeBoardRecord();
      jest
        .spyOn(repository, 'findBoardDetail')
        .mockResolvedValue(boardDetail as never);

      const result = await repository.updateBoard(1, {});

      expect(prisma.board.update).not.toHaveBeenCalled();
      expect(result).toBe(boardDetail);
    });

    it('should call board.update with the given data when data is non-empty', async () => {
      prisma.$transaction.mockImplementation(
        (async (cb: any) => cb(prisma)) as never,
      );
      jest
        .spyOn(repository, 'findBoardDetail')
        .mockResolvedValue(makeBoardRecord() as never);

      await repository.updateBoard(1, { title: 'Updated' });

      expect(prisma.board.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { title: 'Updated' },
      });
    });

    it('should update each column position once per column when columns are given', async () => {
      prisma.$transaction.mockImplementation(
        (async (cb: any) => cb(prisma)) as never,
      );
      jest
        .spyOn(repository, 'findBoardDetail')
        .mockResolvedValue(makeBoardRecord() as never);

      await repository.updateBoard(1, {}, [
        { id: 1, position: 2 },
        { id: 2, position: 0 },
      ]);

      expect(prisma.column.update).toHaveBeenCalledTimes(2);
      expect(prisma.column.update).toHaveBeenNthCalledWith(1, {
        where: { id: 1 },
        data: { position: 2 },
      });
      expect(prisma.column.update).toHaveBeenNthCalledWith(2, {
        where: { id: 2 },
        data: { position: 0 },
      });
    });

    it('should not call column.update when columns is undefined', async () => {
      prisma.$transaction.mockImplementation(
        (async (cb: any) => cb(prisma)) as never,
      );
      jest
        .spyOn(repository, 'findBoardDetail')
        .mockResolvedValue(makeBoardRecord() as never);

      await repository.updateBoard(1, { title: 'Updated' });

      expect(prisma.column.update).not.toHaveBeenCalled();
    });
  });

  describe('countCards', () => {
    it('should count non-deleted cards for the board', async () => {
      prisma.card.count.mockResolvedValue(3);

      const result = await repository.countCards(1);

      expect(prisma.card.count).toHaveBeenCalledWith({
        where: { boardId: 1, deletedAt: null },
      });
      expect(result).toBe(3);
    });
  });

  describe('countMatchingColumns', () => {
    it('should count columns matching the given ids that belong to the board', async () => {
      prisma.column.count.mockResolvedValue(2);

      const result = await repository.countMatchingColumns(1, [1, 2]);

      expect(prisma.column.count).toHaveBeenCalledWith({
        where: { id: { in: [1, 2] }, boardId: 1, deletedAt: null },
      });
      expect(result).toBe(2);
    });
  });

  describe('findBoardUsers', () => {
    it('should build a where filter with role, run count + findMany in a transaction, and return a paginated response', async () => {
      const query: GetBoardUsersQueryDto = { skip: 0, limit: 10 };
      const items = [
        {
          role: BoardMemberRole.ADMIN,
          createdAt: new Date('2026-01-01T00:00:00Z'),
          updatedAt: null,
          user: {
            id: 1,
            email: 'user@example.com',
            displayName: 'User',
            avatar: null,
          },
        },
      ];
      prisma.$transaction.mockImplementation(
        (async (ops: any) => Promise.all(ops)) as never,
      );
      prisma.boardMember.count.mockResolvedValue(1);
      prisma.boardMember.findMany.mockResolvedValue(items as never);

      const result = await repository.findBoardUsers(1, query);

      expect(prisma.boardMember.count).toHaveBeenCalledWith({
        where: { boardId: 1, deletedAt: null, user: { deletedAt: null } },
      });
      expect(prisma.boardMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { boardId: 1, deletedAt: null, user: { deletedAt: null } },
          skip: 0,
          take: 10,
          orderBy: { createdAt: 'asc' },
        }),
      );
      expect(result).toEqual({ items, total: 1 });
    });

    it('should filter by role when a role query is given', async () => {
      const query: GetBoardUsersQueryDto = {
        role: BoardMemberRole.PM,
        skip: 0,
        limit: 10,
      };
      prisma.$transaction.mockImplementation(
        (async (ops: any) => Promise.all(ops)) as never,
      );
      prisma.boardMember.count.mockResolvedValue(0);
      prisma.boardMember.findMany.mockResolvedValue([] as never);

      await repository.findBoardUsers(1, query);

      expect(prisma.boardMember.count).toHaveBeenCalledWith({
        where: {
          boardId: 1,
          deletedAt: null,
          role: BoardMemberRole.PM,
          user: { deletedAt: null },
        },
      });
    });

    it('should build an OR search filter across email, displayName and userCode when search is given', async () => {
      const query: GetBoardUsersQueryDto = {
        search: 'john',
        skip: 0,
        limit: 10,
      };
      prisma.$transaction.mockImplementation(
        (async (ops: any) => Promise.all(ops)) as never,
      );
      prisma.boardMember.count.mockResolvedValue(0);
      prisma.boardMember.findMany.mockResolvedValue([] as never);

      await repository.findBoardUsers(1, query);

      expect(prisma.boardMember.count).toHaveBeenCalledWith({
        where: {
          boardId: 1,
          deletedAt: null,
          user: {
            deletedAt: null,
            OR: [
              { email: { contains: 'john', mode: 'insensitive' } },
              { displayName: { contains: 'john', mode: 'insensitive' } },
              { userCode: { contains: 'john', mode: 'insensitive' } },
            ],
          },
        },
      });
    });
  });

  describe('countActiveAdmins', () => {
    it('should count active ADMIN members for the board', async () => {
      prisma.boardMember.count.mockResolvedValue(1);

      const result = await repository.countActiveAdmins(1);

      expect(prisma.boardMember.count).toHaveBeenCalledWith({
        where: { boardId: 1, role: BoardMemberRole.ADMIN, deletedAt: null },
      });
      expect(result).toBe(1);
    });
  });

  describe('updateMemberRole', () => {
    it('should update the member role and select userId + role', async () => {
      prisma.boardMember.update.mockResolvedValue({
        userId: 2,
        role: BoardMemberRole.PM,
      } as never);

      const result = await repository.updateMemberRole(5, BoardMemberRole.PM);

      expect(prisma.boardMember.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { role: BoardMemberRole.PM },
        select: { userId: true, role: true },
      });
      expect(result).toEqual({ userId: 2, role: BoardMemberRole.PM });
    });
  });

  describe('softDeleteMember', () => {
    it('should set deletedAt to a date on the member', async () => {
      prisma.boardMember.update.mockResolvedValue({} as never);

      await repository.softDeleteMember(5);

      expect(prisma.boardMember.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });

  describe('duplicateBoard', () => {
    const dto: DuplicateBoardDto = {
      title: 'Copy of Board',
      boardCode: 'COPY',
    };

    const makeSource = (over: Record<string, unknown> = {}) => ({
      description: 'Original description',
      type: BoardType.PRIVATE,
      columns: [
        { id: 1, title: 'To Do', statusColor: StatusColor.BLUE, position: 0 },
        { id: 2, title: 'Done', statusColor: StatusColor.GREEN, position: 1 },
      ],
      issueTypes: [{ id: 10, name: 'Bug', statusColor: StatusColor.RED }],
      versions: [
        {
          id: 20,
          name: 'v1.0',
          startDate: null,
          endDate: null,
          description: '',
        },
      ],
      cards: [],
      ...over,
    });

    beforeEach(() => {
      prisma.$transaction.mockImplementation(
        (async (cb: any) => cb(prisma)) as never,
      );
      // Default id cho các create() bên trong vòng lặp cột/loại issue/version
      // khi test không quan tâm tới giá trị id cụ thể.
      prisma.column.create.mockResolvedValue({ id: 1 } as never);
      prisma.issueType.create.mockResolvedValue({ id: 1 } as never);
      prisma.version.create.mockResolvedValue({ id: 1 } as never);
    });

    it('should return null without creating anything when the source board does not exist', async () => {
      prisma.board.findFirst.mockResolvedValue(null);

      const result = await repository.duplicateBoard({
        sourceBoardId: 999,
        dto,
        userId: 1,
      });

      expect(result).toBeNull();
      expect(prisma.board.create).not.toHaveBeenCalled();
    });

    it('should create the new board using dto values, falling back to source description/type', async () => {
      prisma.board.findFirst.mockResolvedValue(makeSource() as never);
      prisma.board.create.mockResolvedValue({
        id: 99,
        boardCode: dto.boardCode,
      } as never);
      jest
        .spyOn(repository, 'findBoardDetail')
        .mockResolvedValue(makeBoardRecord({ id: 99 }) as never);

      await repository.duplicateBoard({ sourceBoardId: 1, dto, userId: 7 });

      expect(prisma.board.create).toHaveBeenCalledWith({
        data: {
          title: dto.title,
          boardCode: dto.boardCode,
          description: 'Original description',
          type: BoardType.PRIVATE,
          nextCardNumber: 1,
        },
      });
    });

    it('should prefer dto description/type over the source when provided', async () => {
      prisma.board.findFirst.mockResolvedValue(makeSource() as never);
      prisma.board.create.mockResolvedValue({
        id: 99,
        boardCode: 'COPY',
      } as never);
      jest
        .spyOn(repository, 'findBoardDetail')
        .mockResolvedValue(makeBoardRecord({ id: 99 }) as never);

      await repository.duplicateBoard({
        sourceBoardId: 1,
        dto: { ...dto, description: 'New desc', type: BoardType.PUBLIC },
        userId: 7,
      });

      expect(prisma.board.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          description: 'New desc',
          type: BoardType.PUBLIC,
        }),
      });
    });

    it('should make the actor the sole ADMIN of the new board', async () => {
      prisma.board.findFirst.mockResolvedValue(makeSource() as never);
      prisma.board.create.mockResolvedValue({
        id: 99,
        boardCode: 'COPY',
      } as never);
      jest
        .spyOn(repository, 'findBoardDetail')
        .mockResolvedValue(makeBoardRecord({ id: 99 }) as never);

      await repository.duplicateBoard({ sourceBoardId: 1, dto, userId: 7 });

      expect(prisma.boardMember.create).toHaveBeenCalledWith({
        data: { boardId: 99, userId: 7, role: BoardMemberRole.ADMIN },
      });
    });

    it('should recreate every active column, issue type and version under the new board', async () => {
      prisma.board.findFirst.mockResolvedValue(makeSource() as never);
      prisma.board.create.mockResolvedValue({
        id: 99,
        boardCode: 'COPY',
      } as never);
      prisma.column.create
        .mockResolvedValueOnce({ id: 101 } as never)
        .mockResolvedValueOnce({ id: 102 } as never);
      prisma.issueType.create.mockResolvedValueOnce({ id: 201 } as never);
      prisma.version.create.mockResolvedValueOnce({ id: 301 } as never);
      jest
        .spyOn(repository, 'findBoardDetail')
        .mockResolvedValue(makeBoardRecord({ id: 99 }) as never);

      await repository.duplicateBoard({ sourceBoardId: 1, dto, userId: 7 });

      expect(prisma.column.create).toHaveBeenNthCalledWith(1, {
        data: {
          boardId: 99,
          title: 'To Do',
          statusColor: StatusColor.BLUE,
          position: 0,
        },
      });
      expect(prisma.column.create).toHaveBeenNthCalledWith(2, {
        data: {
          boardId: 99,
          title: 'Done',
          statusColor: StatusColor.GREEN,
          position: 1,
        },
      });
      expect(prisma.issueType.create).toHaveBeenCalledWith({
        data: { boardId: 99, name: 'Bug', statusColor: StatusColor.RED },
      });
      expect(prisma.version.create).toHaveBeenCalledWith({
        data: {
          boardId: 99,
          name: 'v1.0',
          startDate: null,
          endDate: null,
          description: '',
        },
      });
    });

    it('should copy cards with remapped columnId/issueTypeId/versionId and sequential cardCode', async () => {
      const source = makeSource({
        cards: [
          {
            columnId: 1,
            issueTypeId: 10,
            versionId: 20,
            title: 'Card A',
            description: 'desc A',
            priority: 2,
            assigneeUserId: 5,
            startDate: null,
            dueDate: null,
            estimatedHours: '4',
            actualHours: null,
            position: 0,
          },
          {
            columnId: 2,
            issueTypeId: null,
            versionId: null,
            title: 'Card B',
            description: null,
            priority: null,
            assigneeUserId: null,
            startDate: null,
            dueDate: null,
            estimatedHours: null,
            actualHours: null,
            position: 0,
          },
        ],
      });
      prisma.board.findFirst.mockResolvedValue(source as never);
      prisma.board.create.mockResolvedValue({
        id: 99,
        boardCode: 'COPY',
      } as never);
      prisma.column.create
        .mockResolvedValueOnce({ id: 101 } as never)
        .mockResolvedValueOnce({ id: 102 } as never);
      prisma.issueType.create.mockResolvedValueOnce({ id: 201 } as never);
      prisma.version.create.mockResolvedValueOnce({ id: 301 } as never);
      jest
        .spyOn(repository, 'findBoardDetail')
        .mockResolvedValue(makeBoardRecord({ id: 99 }) as never);

      await repository.duplicateBoard({ sourceBoardId: 1, dto, userId: 7 });

      expect(prisma.card.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            boardId: 99,
            columnId: 101,
            cardNumber: 1,
            cardCode: 'COPY-1',
            title: 'Card A',
            issueTypeId: 201,
            versionId: 301,
            assigneeUserId: 5,
            registeredByUserId: 7,
            createdByUserId: 7,
          }),
          expect.objectContaining({
            boardId: 99,
            columnId: 102,
            cardNumber: 2,
            cardCode: 'COPY-2',
            title: 'Card B',
            issueTypeId: null,
            versionId: null,
          }),
        ],
      });
      expect(prisma.board.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ nextCardNumber: 3 }) }),
      );
    });

    it('should skip card.createMany when the source board has no active cards', async () => {
      prisma.board.findFirst.mockResolvedValue(makeSource() as never);
      prisma.board.create.mockResolvedValue({
        id: 99,
        boardCode: 'COPY',
      } as never);
      prisma.column.create
        .mockResolvedValueOnce({ id: 101 } as never)
        .mockResolvedValueOnce({ id: 102 } as never);
      prisma.issueType.create.mockResolvedValueOnce({ id: 201 } as never);
      prisma.version.create.mockResolvedValueOnce({ id: 301 } as never);
      jest
        .spyOn(repository, 'findBoardDetail')
        .mockResolvedValue(makeBoardRecord({ id: 99 }) as never);

      await repository.duplicateBoard({ sourceBoardId: 1, dto, userId: 7 });

      expect(prisma.card.createMany).not.toHaveBeenCalled();
    });

    it('should drop a card whose column has no mapped id instead of failing the whole duplication', async () => {
      const source = makeSource({
        columns: [
          { id: 1, title: 'To Do', statusColor: StatusColor.BLUE, position: 0 },
        ],
        cards: [
          {
            columnId: 999, // không khớp bất kỳ column nào vừa tạo
            issueTypeId: null,
            versionId: null,
            title: 'Orphan card',
            description: null,
            priority: null,
            assigneeUserId: null,
            startDate: null,
            dueDate: null,
            estimatedHours: null,
            actualHours: null,
            position: 0,
          },
        ],
      });
      prisma.board.findFirst.mockResolvedValue(source as never);
      prisma.board.create.mockResolvedValue({
        id: 99,
        boardCode: 'COPY',
      } as never);
      prisma.column.create.mockResolvedValueOnce({ id: 101 } as never);
      jest
        .spyOn(repository, 'findBoardDetail')
        .mockResolvedValue(makeBoardRecord({ id: 99 }) as never);

      await repository.duplicateBoard({ sourceBoardId: 1, dto, userId: 7 });

      expect(prisma.card.createMany).not.toHaveBeenCalled();
    });

    it('should return the new board detail on success', async () => {
      prisma.board.findFirst.mockResolvedValue(makeSource() as never);
      prisma.board.create.mockResolvedValue({
        id: 99,
        boardCode: 'COPY',
      } as never);
      const newBoardDetail = makeBoardRecord({ id: 99 });
      const findDetailSpy = jest
        .spyOn(repository, 'findBoardDetail')
        .mockResolvedValue(newBoardDetail as never);

      const result = await repository.duplicateBoard({
        sourceBoardId: 1,
        dto,
        userId: 7,
      });

      expect(findDetailSpy).toHaveBeenCalledWith(99);
      expect(result).toBe(newBoardDetail);
    });
  });
});
