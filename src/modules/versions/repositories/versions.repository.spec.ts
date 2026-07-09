import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaService } from '@database/prisma/prisma.service';
import { makeVersionRecord } from '../../../../test/factories/version.factory';
import { VersionsRepository } from './versions.repository';
import {
  CreateVersionDto,
  ListVersionsQueryDto,
  UpdateVersionDto,
} from '../dto/version.dto';

describe('VersionsRepository', () => {
  let repository: VersionsRepository;
  let prisma: DeepMockProxy<PrismaService>;

  const versionSelect = {
    id: true,
    boardId: true,
    name: true,
    startDate: true,
    endDate: true,
    description: true,
    createdAt: true,
    updatedAt: true,
  };

  beforeEach(() => {
    prisma = mockDeep<PrismaService>();
    repository = new VersionsRepository(prisma);
  });

  describe('findActiveByBoardAndId', () => {
    it('should query for a non-deleted version scoped to the board', async () => {
      const version = makeVersionRecord({ id: 5, boardId: 10 });
      (prisma.version.findFirst as jest.Mock).mockResolvedValue(version);

      const result = await repository.findActiveByBoardAndId(10, 5);

      expect(prisma.version.findFirst).toHaveBeenCalledWith({
        where: { id: 5, boardId: 10, deletedAt: null },
        select: versionSelect,
      });
      expect(result).toEqual(version);
    });

    it('should return null when no matching version is found', async () => {
      (prisma.version.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await repository.findActiveByBoardAndId(10, 999);

      expect(result).toBeNull();
    });
  });

  describe('findByBoard', () => {
    it('should build a where clause without a name filter when keyword is absent', async () => {
      const query: ListVersionsQueryDto = { skip: 0, limit: 10 } as any;
      const versions = [makeVersionRecord({ boardId: 10 })];
      (prisma.$transaction as jest.Mock).mockResolvedValue([1, versions]);

      const result = await repository.findByBoard(10, query);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.version.count).toHaveBeenCalledWith({
        where: { boardId: 10, deletedAt: null },
      });
      expect(prisma.version.findMany).toHaveBeenCalledWith({
        where: { boardId: 10, deletedAt: null },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: versionSelect,
      });
      expect(result).toEqual({ items: versions, count: 1 });
    });

    it('should add a case-insensitive name filter when keyword is provided', async () => {
      const query: ListVersionsQueryDto = {
        keyword: 'v1',
        skip: 0,
        limit: 10,
      } as any;
      (prisma.$transaction as jest.Mock).mockResolvedValue([0, []]);

      await repository.findByBoard(10, query);

      const expectedWhere = {
        boardId: 10,
        deletedAt: null,
        name: { contains: 'v1', mode: 'insensitive' },
      };
      expect(prisma.version.count).toHaveBeenCalledWith({
        where: expectedWhere,
      });
      expect(prisma.version.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expectedWhere }),
      );
    });

    it('should apply skip/take derived from the query pagination', async () => {
      const query: ListVersionsQueryDto = { skip: 20, limit: 5 } as any;
      (prisma.$transaction as jest.Mock).mockResolvedValue([0, []]);

      await repository.findByBoard(10, query);

      expect(prisma.version.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 5 }),
      );
    });

    it('should clamp negative skip to 0 and over-limit to the max via getOffsetPagination', async () => {
      const query: ListVersionsQueryDto = { skip: -5, limit: 999 } as any;
      (prisma.$transaction as jest.Mock).mockResolvedValue([0, []]);

      await repository.findByBoard(10, query);

      expect(prisma.version.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 100 }),
      );
    });
  });

  describe('create', () => {
    it('should create a version with parsed dates and default empty description', async () => {
      const dto: CreateVersionDto = {
        name: 'v1.0',
        startDate: '2026-05-25',
        endDate: '2026-05-30',
      };
      const created = makeVersionRecord({ boardId: 10, name: 'v1.0' });
      (prisma.version.create as jest.Mock).mockResolvedValue(created);

      const result = await repository.create(10, dto);

      expect(prisma.version.create).toHaveBeenCalledWith({
        data: {
          boardId: 10,
          name: 'v1.0',
          startDate: new Date('2026-05-25'),
          endDate: new Date('2026-05-30'),
          description: '',
        },
        select: versionSelect,
      });
      expect(result).toEqual(created);
    });

    it('should keep dates undefined when not provided', async () => {
      const dto: CreateVersionDto = { name: 'v1.0' };
      (prisma.version.create as jest.Mock).mockResolvedValue(
        makeVersionRecord({ boardId: 10 }),
      );

      await repository.create(10, dto);

      expect(prisma.version.create).toHaveBeenCalledWith({
        data: {
          boardId: 10,
          name: 'v1.0',
          startDate: undefined,
          endDate: undefined,
          description: '',
        },
        select: versionSelect,
      });
    });

    it('should use the provided description when present', async () => {
      const dto: CreateVersionDto = { name: 'v1.0', description: 'notes' };
      (prisma.version.create as jest.Mock).mockResolvedValue(
        makeVersionRecord({ boardId: 10 }),
      );

      await repository.create(10, dto);

      expect(prisma.version.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ description: 'notes' }),
        }),
      );
    });
  });

  describe('update', () => {
    it('should only include fields present in the dto', async () => {
      const dto: UpdateVersionDto = { name: 'v2.0' };
      const updated = makeVersionRecord({ id: 5, name: 'v2.0' });
      (prisma.version.update as jest.Mock).mockResolvedValue(updated);

      const result = await repository.update(5, dto);

      expect(prisma.version.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { name: 'v2.0' },
        select: versionSelect,
      });
      expect(result).toEqual(updated);
    });

    it('should convert startDate and endDate strings to Date when present', async () => {
      const dto: UpdateVersionDto = {
        startDate: '2026-06-01',
        endDate: '2026-06-30',
      };
      (prisma.version.update as jest.Mock).mockResolvedValue(
        makeVersionRecord({ id: 5 }),
      );

      await repository.update(5, dto);

      expect(prisma.version.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: {
          startDate: new Date('2026-06-01'),
          endDate: new Date('2026-06-30'),
        },
        select: versionSelect,
      });
    });

    it('should include description only when provided', async () => {
      const dto: UpdateVersionDto = { description: 'updated' };
      (prisma.version.update as jest.Mock).mockResolvedValue(
        makeVersionRecord({ id: 5 }),
      );

      await repository.update(5, dto);

      expect(prisma.version.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { description: 'updated' },
        select: versionSelect,
      });
    });

    it('should produce an empty data object when the dto has no fields', async () => {
      const dto: UpdateVersionDto = {};
      (prisma.version.update as jest.Mock).mockResolvedValue(
        makeVersionRecord({ id: 5 }),
      );

      await repository.update(5, dto);

      expect(prisma.version.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: {},
        select: versionSelect,
      });
    });
  });

  describe('delete', () => {
    it('should delete the version by id', async () => {
      (prisma.version.delete as jest.Mock).mockResolvedValue(
        makeVersionRecord({ id: 5 }),
      );

      await repository.delete(5);

      expect(prisma.version.delete).toHaveBeenCalledWith({
        where: { id: 5 },
      });
    });
  });
});
