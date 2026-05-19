import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, STATES } from 'mongoose';
import { PrismaService } from '@database/prisma/prisma.service';
import { RedisService } from '@shared/redis/redis.service';

type DependencyStatus = 'up' | 'down';

export type HealthStatus = {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  services: {
    postgres: DependencyStatus;
    mongodb: DependencyStatus;
    redis: DependencyStatus;
  };
};

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectConnection() private readonly mongoConnection: Connection,
    private readonly redisService: RedisService,
  ) {}

  async check(): Promise<HealthStatus> {
    const mongodb = this.checkMongoDb();
    const [postgres, redis] = await Promise.all([
      this.checkPostgres(),
      this.checkRedis(),
    ]);
    const status =
      postgres === 'up' && mongodb === 'up' && redis === 'up' ? 'ok' : 'error';

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        postgres,
        mongodb,
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

  private checkMongoDb(): DependencyStatus {
    return this.mongoConnection.readyState === STATES.connected ? 'up' : 'down';
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
