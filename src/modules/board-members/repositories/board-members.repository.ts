import { Injectable } from '@nestjs/common';
import { BoardMemberRole, Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma/prisma.service';

const boardMemberSelect = {
  id: true,
  boardId: true,
  userId: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.BoardMemberSelect;

export type BoardMemberRecord = Prisma.BoardMemberGetPayload<{
  select: typeof boardMemberSelect;
}>;

export type UpsertBoardMemberData = {
  boardId: number;
  userId: number;
  role: BoardMemberRole;
};

type PrismaClientOrTx = PrismaService | Prisma.TransactionClient;

@Injectable()
export class BoardMembersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActiveMember(
    boardId: number,
    userId: number,
  ): Promise<BoardMemberRecord | null> {
    return this.prisma.boardMember.findFirst({
      where: { boardId, userId, deletedAt: null },
      select: boardMemberSelect,
    });
  }

  findActiveMemberByEmail(
    boardId: number,
    email: string,
  ): Promise<BoardMemberRecord | null> {
    return this.prisma.boardMember.findFirst({
      where: {
        boardId,
        deletedAt: null,
        user: { email, deletedAt: null },
      },
      select: boardMemberSelect,
    });
  }

  countActiveAdmins(boardId: number): Promise<number> {
    return this.prisma.boardMember.count({
      where: { boardId, role: BoardMemberRole.ADMIN, deletedAt: null },
    });
  }

  create(
    data: UpsertBoardMemberData,
    tx?: Prisma.TransactionClient,
  ): Promise<BoardMemberRecord> {
    return this.client(tx).boardMember.create({
      data,
      select: boardMemberSelect,
    });
  }

  // Create a new membership, or restore/refresh a soft-deleted one in place.
  upsert(
    data: UpsertBoardMemberData,
    tx?: Prisma.TransactionClient,
  ): Promise<BoardMemberRecord> {
    return this.client(tx).boardMember.upsert({
      where: {
        boardId_userId: { boardId: data.boardId, userId: data.userId },
      },
      create: data,
      update: { role: data.role, deletedAt: null },
      select: boardMemberSelect,
    });
  }

  updateRole(
    memberId: number,
    role: BoardMemberRole,
    tx?: Prisma.TransactionClient,
  ): Promise<BoardMemberRecord> {
    return this.client(tx).boardMember.update({
      where: { id: memberId },
      data: { role },
      select: boardMemberSelect,
    });
  }

  async softDelete(
    memberId: number,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    await this.client(tx).boardMember.update({
      where: { id: memberId },
      data: { deletedAt: new Date() },
    });
  }

  private client(tx?: Prisma.TransactionClient): PrismaClientOrTx {
    return tx ?? this.prisma;
  }
}
