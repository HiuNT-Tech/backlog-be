import { Module } from '@nestjs/common';
import { RedisModule } from '@shared/redis/redis.module';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  imports: [RedisModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
