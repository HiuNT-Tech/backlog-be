import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma/prisma.service';
import { RedisService } from '@shared/redis/redis.service';

type DependencyStatus = 'up' | 'down';

export type HealthStatus = {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  services: {
    postgres: DependencyStatus;
    redis: DependencyStatus;
  };
};

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async check(): Promise<HealthStatus> {
    const [postgres, redis] = await Promise.all([
      this.checkPostgres(),
      this.checkRedis(),
    ]);
    const status = postgres === 'up' && redis === 'up' ? 'ok' : 'error';

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        postgres,
        redis,
      },
    };
  }

  private async checkPostgres(): Promise<DependencyStatus> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return 'up';
    } catch {
      return 'down';
    }
  }

  private async checkRedis(): Promise<DependencyStatus> {
    try {
      await this.redisService.ping();
      return 'up';
    } catch {
      return 'down';
    }
  }
}
