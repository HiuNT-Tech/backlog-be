import { Injectable } from '@nestjs/common';
import { BoardInvitationStatus, BoardMemberRole, Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma/prisma.service';

const invitationUserSelect = {
  id: true,
  email: true,
  displayName: true,
  avatar: true,
} satisfies Prisma.UserSelect;

const invitationBoardSelect = {
  id: true,
  title: true,
  boardCode: true,
} satisfies Prisma.BoardSelect;

export const invitationSelect = {
  id: true,
  boardId: true,
  email: true,
  inviteeUserId: true,
  invitedByUserId: true,
  role: true,
  status: true,
  token: true,
  expiresAt: true,
  respondedAt: true,
  createdAt: true,
  updatedAt: true,
  board: {
    select: invitationBoardSelect,
  },
  invitee: {
    select: invitationUserSelect,
  },
  invitedBy: {
    select: invitationUserSelect,
  },
} satisfies Prisma.BoardInvitationSelect;

export type InvitationRecord = Prisma.BoardInvitationGetPayload<{
  select: typeof invitationSelect;
}>;

type CreateInvitationData = {
  boardId: number;
  email: string;
  inviteeUserId: number | null;
  invitedByUserId: number;
  role: BoardMemberRole;
  token: string;
  expiresAt: Date;
};

@Injectable()
export class InvitationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateInvitationData): Promise<InvitationRecord> {
    return this.prisma.boardInvitation.create({
      data,
      select: invitationSelect,
    });
  }

  update(
    invitationId: number,
    data: Partial<
      Omit<
        CreateInvitationData,
        'id' | 'boardId' | 'invitedByUserId' | 'createdAt' | 'updatedAt'
      >
    >,
  ): Promise<InvitationRecord | null> {
    return this.prisma.boardInvitation.update({
      where: { id: invitationId },
      data,
      select: invitationSelect,
    });
  }

  findByBoard(
    boardId: number,
    status?: BoardInvitationStatus,
  ): Promise<InvitationRecord[]> {
    return this.prisma.boardInvitation.findMany({
      where: {
        boardId,
        deletedAt: null,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: invitationSelect,
    });
  }

  findByIdForBoard(
    boardId: number,
    invitationId: number,
  ): Promise<InvitationRecord | null> {
    return this.prisma.boardInvitation.findFirst({
      where: {
        id: invitationId,
        boardId,
        deletedAt: null,
      },
      select: invitationSelect,
    });
  }

  findById(invitationId: number): Promise<InvitationRecord | null> {
    return this.prisma.boardInvitation.findUnique({
      where: { id: invitationId },
      select: invitationSelect,
    });
  }

  findByToken(token: string): Promise<InvitationRecord | null> {
    return this.prisma.boardInvitation.findFirst({
      where: {
        token,
        deletedAt: null,
      },
      select: invitationSelect,
    });
  }

  findPendingForUser(
    userId: number,
    email: string,
  ): Promise<InvitationRecord[]> {
    return this.prisma.boardInvitation.findMany({
      where: {
        deletedAt: null,
        status: BoardInvitationStatus.PENDING,
        expiresAt: { gt: new Date() },
        OR: [{ inviteeUserId: userId }, { email }],
      },
      orderBy: { createdAt: 'desc' },
      select: invitationSelect,
    });
  }

  async bindPendingByEmail(email: string, userId: number): Promise<number> {
    const result = await this.prisma.boardInvitation.updateMany({
      where: {
        email,
        inviteeUserId: null,
        status: BoardInvitationStatus.PENDING,
        expiresAt: { gt: new Date() },
        deletedAt: null,
      },
      data: {
        inviteeUserId: userId,
      },
    });

    return result.count;
  }

  async expirePendingForBoard(boardId: number): Promise<number> {
    const result = await this.prisma.boardInvitation.updateMany({
      where: {
        boardId,
        status: BoardInvitationStatus.PENDING,
        expiresAt: { lt: new Date() },
        deletedAt: null,
      },
      data: {
        status: BoardInvitationStatus.EXPIRED,
      },
    });

    return result.count;
  }

  async expirePendingForUser(userId: number, email: string): Promise<number> {
    const result = await this.prisma.boardInvitation.updateMany({
      where: {
        status: BoardInvitationStatus.PENDING,
        expiresAt: { lt: new Date() },
        deletedAt: null,
        OR: [{ inviteeUserId: userId }, { email }],
      },
      data: {
        status: BoardInvitationStatus.EXPIRED,
      },
    });

    return result.count;
  }

  async markExpired(invitationId: number): Promise<InvitationRecord> {
    return this.prisma.boardInvitation.update({
      where: { id: invitationId },
      data: {
        status: BoardInvitationStatus.EXPIRED,
      },
      select: invitationSelect,
    });
  }

  async revoke(invitationId: number): Promise<InvitationRecord | null> {
    return this.updatePendingStatus(
      invitationId,
      BoardInvitationStatus.REVOKED,
      true,
    );
  }

  async resend(
    invitationId: number,
    data: { token: string; expiresAt: Date },
  ): Promise<InvitationRecord | null> {
    const updateResult = await this.prisma.boardInvitation.updateMany({
      where: {
        id: invitationId,
        deletedAt: null,
        status: {
          in: [BoardInvitationStatus.PENDING, BoardInvitationStatus.EXPIRED],
        },
      },
      data: {
        token: data.token,
        expiresAt: data.expiresAt,
        status: BoardInvitationStatus.PENDING,
        respondedAt: null,
      },
    });

    if (updateResult.count === 0) {
      return null;
    }

    return this.prisma.boardInvitation.findUnique({
      where: { id: invitationId },
      select: invitationSelect,
    });
  }

  async decline(invitationId: number): Promise<InvitationRecord | null> {
    return this.updatePendingStatus(
      invitationId,
      BoardInvitationStatus.DECLINED,
      true,
    );
  }

  async accept(
    invitation: InvitationRecord,
    userId: number,
  ): Promise<InvitationRecord | null> {
    return this.prisma.$transaction(async (tx) => {
      const updateResult = await tx.boardInvitation.updateMany({
        where: {
          id: invitation.id,
          status: BoardInvitationStatus.PENDING,
          deletedAt: null,
        },
        data: {
          inviteeUserId: userId,
          status: BoardInvitationStatus.ACCEPTED,
          respondedAt: new Date(),
        },
      });

      if (updateResult.count === 0) {
        return null;
      }

      await tx.boardMember.upsert({
        where: {
          boardId_userId: {
            boardId: invitation.boardId,
            userId,
          },
        },
        create: {
          boardId: invitation.boardId,
          userId,
          role: invitation.role,
        },
        update: {
          role: invitation.role,
          deletedAt: null,
        },
      });

      return tx.boardInvitation.findUnique({
        where: { id: invitation.id },
        select: invitationSelect,
      });
    });
  }

  private async updatePendingStatus(
    invitationId: number,
    status: BoardInvitationStatus,
    setRespondedAt: boolean,
  ): Promise<InvitationRecord | null> {
    const updateResult = await this.prisma.boardInvitation.updateMany({
      where: {
        id: invitationId,
        status: BoardInvitationStatus.PENDING,
        deletedAt: null,
      },
      data: {
        status,
        ...(setRespondedAt ? { respondedAt: new Date() } : {}),
      },
    });

    if (updateResult.count === 0) {
      return null;
    }

    return this.prisma.boardInvitation.findUnique({
      where: { id: invitationId },
      select: invitationSelect,
    });
  }
}
