import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { HttpStatus } from '@nestjs/common';
import { BoardMemberRole } from '@prisma/client';
import { PrismaService } from '@database/prisma/prisma.service';
import { ErrorCode } from '@common/exceptions/error-code';
import { BoardAccessService } from './board-access.service';

describe('BoardAccessService', () => {
  let service: BoardAccessService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(() => {
    prisma = mockDeep<PrismaService>();
    service = new BoardAccessService(prisma);
  });

  describe('ensureMember', () => {
    it('should throw BOARD_NOT_FOUND 404 when the board does not exist', async () => {
      prisma.board.findFirst.mockResolvedValue(null);

      await expect(service.ensureMember(1, 1)).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        response: { errorCode: ErrorCode.BOARD_NOT_FOUND },
      });
      expect(prisma.boardMember.findFirst).not.toHaveBeenCalled();
    });

    it('should throw NOT_BOARD_MEMBER 403 when the board exists but the user is not a member', async () => {
      prisma.board.findFirst.mockResolvedValue({ id: 1 } as never);
      prisma.boardMember.findFirst.mockResolvedValue(null);

      await expect(service.ensureMember(1, 2)).rejects.toMatchObject({
        status: HttpStatus.FORBIDDEN,
        response: { errorCode: ErrorCode.NOT_BOARD_MEMBER },
      });
    });

    it('should return the member when the board exists and the user is an active member', async () => {
      prisma.board.findFirst.mockResolvedValue({ id: 1 } as never);
      prisma.boardMember.findFirst.mockResolvedValue({
        userId: 2,
        role: BoardMemberRole.MEMBER,
      } as never);

      const result = await service.ensureMember(1, 2);

      expect(prisma.board.findFirst).toHaveBeenCalledWith({
        where: { id: 1, deletedAt: null },
        select: { id: true },
      });
      expect(prisma.boardMember.findFirst).toHaveBeenCalledWith({
        where: { boardId: 1, userId: 2, deletedAt: null },
        select: { userId: true, role: true },
      });
      expect(result).toEqual({ userId: 2, role: BoardMemberRole.MEMBER });
    });
  });

  describe('ensureRole', () => {
    it('should throw BOARD_NOT_FOUND 404 when the board does not exist', async () => {
      prisma.board.findFirst.mockResolvedValue(null);

      await expect(
        service.ensureRole(1, 1, [BoardMemberRole.ADMIN]),
      ).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        response: { errorCode: ErrorCode.BOARD_NOT_FOUND },
      });
    });

    it('should throw NOT_BOARD_MEMBER 403 when the user is not a board member', async () => {
      prisma.board.findFirst.mockResolvedValue({ id: 1 } as never);
      prisma.boardMember.findFirst.mockResolvedValue(null);

      await expect(
        service.ensureRole(1, 1, [BoardMemberRole.ADMIN]),
      ).rejects.toMatchObject({
        status: HttpStatus.FORBIDDEN,
        response: { errorCode: ErrorCode.NOT_BOARD_MEMBER },
      });
    });

    it('should throw INSUFFICIENT_BOARD_PERMISSION 403 when the member role is not allowed', async () => {
      prisma.board.findFirst.mockResolvedValue({ id: 1 } as never);
      prisma.boardMember.findFirst.mockResolvedValue({
        userId: 1,
        role: BoardMemberRole.MEMBER,
      } as never);

      await expect(
        service.ensureRole(1, 1, [BoardMemberRole.ADMIN, BoardMemberRole.PM]),
      ).rejects.toMatchObject({
        status: HttpStatus.FORBIDDEN,
        response: { errorCode: ErrorCode.INSUFFICIENT_BOARD_PERMISSION },
      });
    });

    it('should return the member when the member role is allowed', async () => {
      prisma.board.findFirst.mockResolvedValue({ id: 1 } as never);
      prisma.boardMember.findFirst.mockResolvedValue({
        userId: 1,
        role: BoardMemberRole.ADMIN,
      } as never);

      const result = await service.ensureRole(1, 1, [BoardMemberRole.ADMIN]);

      expect(result).toEqual({ userId: 1, role: BoardMemberRole.ADMIN });
    });
  });
});
