import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { BoardMemberRole, BoardType } from '@prisma/client';
import { PrismaService } from '@database/prisma/prisma.service';
import { BoardsRepository } from './boards.repository';
import { DEFAULT_COLUMNS } from '../constants';
import { CreateBoardDto, GetBoardUsersQueryDto } from '../dto/board.dto';
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
});
