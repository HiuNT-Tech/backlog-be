import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BoardMemberRole } from '@prisma/client';
import { PrismaService } from '@database/prisma/prisma.service';

@Injectable()
export class BoardAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureMember(boardId: number, userId: number) {
    const board = await this.prisma.board.findFirst({
      where: { id: boardId, deletedAt: null },
      select: { id: true },
    });

    if (!board) {
      throw new NotFoundException('Board not found');
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
      throw new ForbiddenException('Current user is not a board member');
    }

    return member;
  }

  async ensureRole(boardId: number, userId: number, roles: BoardMemberRole[]) {
    const member = await this.ensureMember(boardId, userId);

    if (!roles.includes(member.role)) {
      throw new ForbiddenException('Current user does not have permission');
    }

    return member;
  }
}
