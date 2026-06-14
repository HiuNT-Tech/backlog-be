import { HttpStatus, Injectable } from '@nestjs/common';
import { BoardMemberRole } from '@prisma/client';
import { PrismaService } from '@database/prisma/prisma.service';
import { BusinessException } from '@common/exceptions/business.exception';
import { ErrorCode } from '@common/exceptions/error-code';

@Injectable()
export class BoardAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureMember(boardId: number, userId: number) {
    const board = await this.prisma.board.findFirst({
      where: { id: boardId, deletedAt: null },
      select: { id: true },
    });

    if (!board) {
      throw new BusinessException(
        ErrorCode.BOARD_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    const member = await this.prisma.boardMember.findFirst({
      where: {
        boardId,
        userId,
        deletedAt: null,
      },
      select: {
        userId: true,
        role: true,
      },
    });

    if (!member) {
      throw new BusinessException(
        ErrorCode.NOT_BOARD_MEMBER,
        HttpStatus.FORBIDDEN,
      );
    }

    return member;
  }

  async ensureRole(boardId: number, userId: number, roles: BoardMemberRole[]) {
    const member = await this.ensureMember(boardId, userId);

    if (!roles.includes(member.role)) {
      throw new BusinessException(
        ErrorCode.INSUFFICIENT_BOARD_PERMISSION,
        HttpStatus.FORBIDDEN,
      );
    }

    return member;
  }
}
