import { Injectable } from '@nestjs/common';
import { RefreshTokenSession } from '@prisma/client';
import { PrismaService } from '@database/prisma/prisma.service';

type CreateRefreshTokenSessionInput = {
  userId: number;
  tokenHash: string;
  expiresAt: Date;
};

@Injectable()
export class RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateRefreshTokenSessionInput): Promise<void> {
    await this.prisma.refreshTokenSession.create({
      data: input,
    });
  }

  findActiveByHash(
    userId: number,
    tokenHash: string,
  ): Promise<RefreshTokenSession | null> {
    return this.prisma.refreshTokenSession.findFirst({
      where: {
        userId,
        tokenHash,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    });
  }

  async rotate(input: {
    sessionId: string;
    userId: number;
    newTokenHash: string;
    newExpiresAt: Date;
  }): Promise<void> {
    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.refreshTokenSession.update({
        where: { id: input.sessionId },
        data: {
          revokedAt: now,
          replacedByTokenHash: input.newTokenHash,
        },
      }),
      this.prisma.refreshTokenSession.create({
        data: {
          userId: input.userId,
          tokenHash: input.newTokenHash,
          expiresAt: input.newExpiresAt,
        },
      }),
    ]);
  }

  async revokeByHash(tokenHash: string): Promise<void> {
    await this.prisma.refreshTokenSession.updateMany({
      where: {
        tokenHash,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }
}
