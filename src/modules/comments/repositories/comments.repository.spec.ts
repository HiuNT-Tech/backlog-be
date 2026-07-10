import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { CommentType } from '@prisma/client';
import { PrismaService } from '@database/prisma/prisma.service';
import {
  CommentsRepository,
  commentSelect,
} from './comments.repository';
import { makeCommentRecord } from '../../../../test/factories/comment.factory';

describe('CommentsRepository', () => {
  let prisma: DeepMockProxy<PrismaService>;
  let repository: CommentsRepository;

  beforeEach(() => {
    prisma = mockDeep<PrismaService>();
    repository = new CommentsRepository(prisma);
  });

  describe('findActiveById', () => {
    it('should query by id with deletedAt null and the comment select', async () => {
      await repository.findActiveById(5);

      expect(prisma.comment.findFirst).toHaveBeenCalledWith({
        where: { id: 5, deletedAt: null },
        select: commentSelect,
      });
    });

    it('should return the record found by prisma', async () => {
      const record = makeCommentRecord({ id: 5 });
      prisma.comment.findFirst.mockResolvedValue(record as never);

      const result = await repository.findActiveById(5);

      expect(result).toBe(record);
    });
  });

  describe('findActiveOwnershipById', () => {
    it('should query by id with deletedAt null and a minimal select', async () => {
      await repository.findActiveOwnershipById(5);

      expect(prisma.comment.findFirst).toHaveBeenCalledWith({
        where: { id: 5, deletedAt: null },
        select: { id: true, userId: true },
      });
    });

    it('should return null when no active comment is found', async () => {
      prisma.comment.findFirst.mockResolvedValue(null);

      const result = await repository.findActiveOwnershipById(5);

      expect(result).toBeNull();
    });
  });

  describe('findByCard', () => {
    it('should use skip=0 and limit=20 defaults when query values are absent', async () => {
      prisma.$transaction.mockImplementation(
        async (ops: unknown) => Promise.all(ops as Promise<unknown>[]) as never,
      );
      prisma.comment.count.mockResolvedValue(0);
      prisma.comment.findMany.mockResolvedValue([]);

      await repository.findByCard(1, {} as never);

      expect(prisma.comment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
    });

    it('should pass through provided skip and limit', async () => {
      prisma.$transaction.mockImplementation(
        async (ops: unknown) => Promise.all(ops as Promise<unknown>[]) as never,
      );
      prisma.comment.count.mockResolvedValue(0);
      prisma.comment.findMany.mockResolvedValue([]);

      await repository.findByCard(1, { skip: 10, limit: 5 } as never);

      expect(prisma.comment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 5 }),
      );
    });

    it('should filter by cardId, deletedAt null, order by createdAt asc and use the comment select', async () => {
      prisma.$transaction.mockImplementation(
        async (ops: unknown) => Promise.all(ops as Promise<unknown>[]) as never,
      );
      prisma.comment.count.mockResolvedValue(0);
      prisma.comment.findMany.mockResolvedValue([]);

      await repository.findByCard(7, { skip: 0, limit: 20 } as never);

      expect(prisma.comment.count).toHaveBeenCalledWith({
        where: { cardId: 7, deletedAt: null },
      });
      expect(prisma.comment.findMany).toHaveBeenCalledWith({
        where: { cardId: 7, deletedAt: null },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'asc' },
        select: commentSelect,
      });
    });

    it('should run count and findMany inside a single transaction call', async () => {
      prisma.$transaction.mockImplementation(
        async (ops: unknown) => Promise.all(ops as Promise<unknown>[]) as never,
      );
      prisma.comment.count.mockResolvedValue(0);
      prisma.comment.findMany.mockResolvedValue([]);

      await repository.findByCard(1, { skip: 0, limit: 20 } as never);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      const opsArg = prisma.$transaction.mock.calls[0][0];
      expect(Array.isArray(opsArg)).toBe(true);
      expect(opsArg).toHaveLength(2);
    });

    it('should return the total and items resolved from the transaction', async () => {
      const record = makeCommentRecord();
      prisma.$transaction.mockImplementation(
        async (ops: unknown) => Promise.all(ops as Promise<unknown>[]) as never,
      );
      prisma.comment.count.mockResolvedValue(3);
      prisma.comment.findMany.mockResolvedValue([record] as never);

      const result = await repository.findByCard(1, {
        skip: 0,
        limit: 20,
      } as never);

      expect(result).toEqual({ total: 3, items: [record] });
    });

    it('should clamp a negative skip to 0', async () => {
      prisma.$transaction.mockImplementation(
        async (ops: unknown) => Promise.all(ops as Promise<unknown>[]) as never,
      );
      prisma.comment.count.mockResolvedValue(0);
      prisma.comment.findMany.mockResolvedValue([]);

      await repository.findByCard(1, { skip: -5, limit: 20 } as never);

      expect(prisma.comment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0 }),
      );
    });

    it('should clamp a limit below 1 to 1', async () => {
      prisma.$transaction.mockImplementation(
        async (ops: unknown) => Promise.all(ops as Promise<unknown>[]) as never,
      );
      prisma.comment.count.mockResolvedValue(0);
      prisma.comment.findMany.mockResolvedValue([]);

      await repository.findByCard(1, { skip: 0, limit: 0 } as never);

      expect(prisma.comment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 1 }),
      );
    });
  });

  describe('create', () => {
    it('should create a comment with cardId, userId and content, using the comment select', async () => {
      await repository.create(1, 9, 'Hello');

      expect(prisma.comment.create).toHaveBeenCalledWith({
        data: {
          cardId: 1,
          userId: 9,
          content: 'Hello',
          type: CommentType.USER,
          attachments: { create: [] },
        },
        select: commentSelect,
      });
    });

    it('should create a SYSTEM comment when the type is passed explicitly', async () => {
      await repository.create(1, 9, '{"delta":true}', [], CommentType.SYSTEM);

      expect(prisma.comment.create).toHaveBeenCalledWith({
        data: {
          cardId: 1,
          userId: 9,
          content: '{"delta":true}',
          type: CommentType.SYSTEM,
          attachments: { create: [] },
        },
        select: commentSelect,
      });
    });

    it('should nest-create attachments together with the comment', async () => {
      const attachments = [
        {
          fileName: 'a.png',
          fileKey: 'key-a',
          fileUrl: 'http://x/key-a',
          mimeType: 'image/png',
          fileSize: 10,
          uploadedByUserId: 9,
        },
      ];

      await repository.create(1, 9, 'Hello', attachments);

      expect(prisma.comment.create).toHaveBeenCalledWith({
        data: {
          cardId: 1,
          userId: 9,
          content: 'Hello',
          type: CommentType.USER,
          attachments: { create: attachments },
        },
        select: commentSelect,
      });
    });

    it('should return the created comment', async () => {
      const record = makeCommentRecord();
      prisma.comment.create.mockResolvedValue(record as never);

      const result = await repository.create(1, 9, 'Hello');

      expect(result).toBe(record);
    });
  });

  describe('update', () => {
    it('should update the comment content by id, using the comment select', async () => {
      await repository.update(5, 'Updated');

      expect(prisma.comment.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { content: 'Updated' },
        select: commentSelect,
      });
    });

    it('should return the updated comment', async () => {
      const record = makeCommentRecord({ content: 'Updated' });
      prisma.comment.update.mockResolvedValue(record as never);

      const result = await repository.update(5, 'Updated');

      expect(result).toBe(record);
    });
  });

  describe('softDelete', () => {
    it('should set deletedAt to a Date and select only the id', async () => {
      await repository.softDelete(5);

      expect(prisma.comment.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { deletedAt: expect.any(Date) },
        select: { id: true },
      });
    });

    it('should return only the id from the select', async () => {
      prisma.comment.update.mockResolvedValue({ id: 5 } as never);

      const result = await repository.softDelete(5);

      expect(result).toEqual({ id: 5 });
    });
  });
});
