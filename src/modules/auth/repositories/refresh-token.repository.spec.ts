import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { PrismaService } from '@database/prisma/prisma.service';
import { RefreshTokenRepository } from './refresh-token.repository';

describe('RefreshTokenRepository', () => {
  let prisma: DeepMockProxy<PrismaService>;
  let repository: RefreshTokenRepository;

  beforeEach(() => {
    prisma = mockDeep<PrismaService>();
    repository = new RefreshTokenRepository(prisma);
  });

  describe('create', () => {
    it('should create a refresh token session with the given data', async () => {
      const input = {
        userId: 1,
        tokenHash: 'hash-1',
        expiresAt: new Date('2026-02-01T00:00:00Z'),
      };

      await repository.create(input);

      expect(prisma.refreshTokenSession.create).toHaveBeenCalledWith({
        data: input,
      });
    });
  });

  describe('findActiveByHash', () => {
    it('should query with userId, tokenHash, revokedAt null and expiresAt gt now', async () => {
      const before = Date.now();

      await repository.findActiveByHash(1, 'hash-1');

      const call = prisma.refreshTokenSession.findFirst.mock.calls[0][0];
      expect(call?.where?.userId).toBe(1);
      expect(call?.where?.tokenHash).toBe('hash-1');
      expect(call?.where?.revokedAt).toBeNull();
      const gt = (call?.where?.expiresAt as { gt: Date })?.gt;
      expect(gt).toBeInstanceOf(Date);
      expect(gt.getTime()).toBeGreaterThanOrEqual(before);
    });

    it('should return the session found by prisma', async () => {
      const session = { id: 1, userId: 1 } as never;
      prisma.refreshTokenSession.findFirst.mockResolvedValue(session);

      const result = await repository.findActiveByHash(1, 'hash-1');

      expect(result).toBe(session);
    });
  });

  describe('rotate', () => {
    it('should revoke the old session and create a new one within a transaction', async () => {
      prisma.$transaction.mockImplementation(
        async (ops: unknown) => Promise.all(ops as Promise<unknown>[]) as never,
      );

      await repository.rotate({
        sessionId: 10,
        userId: 1,
        newTokenHash: 'new-hash',
        newExpiresAt: new Date('2026-03-01T00:00:00Z'),
      });

      expect(prisma.refreshTokenSession.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: {
          revokedAt: expect.any(Date),
          replacedByTokenHash: 'new-hash',
        },
      });
      expect(prisma.refreshTokenSession.create).toHaveBeenCalledWith({
        data: {
          userId: 1,
          tokenHash: 'new-hash',
          expiresAt: new Date('2026-03-01T00:00:00Z'),
        },
      });
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      const opsArg = prisma.$transaction.mock.calls[0][0];
      expect(Array.isArray(opsArg)).toBe(true);
      expect(opsArg).toHaveLength(2);
    });
  });

  describe('revokeByHash', () => {
    it('should update all matching non-revoked sessions with the given hash', async () => {
      await repository.revokeByHash('hash-1');

      expect(prisma.refreshTokenSession.updateMany).toHaveBeenCalledWith({
        where: {
          tokenHash: 'hash-1',
          revokedAt: null,
        },
        data: {
          revokedAt: expect.any(Date),
        },
      });
    });
  });

  describe('revokeAllForUser', () => {
    it('should update all non-revoked sessions for the given user', async () => {
      await repository.revokeAllForUser(1);

      expect(prisma.refreshTokenSession.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 1,
          revokedAt: null,
        },
        data: {
          revokedAt: expect.any(Date),
        },
      });
    });
  });
});
