import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import {
  appConfig,
  databaseConfig,
  jwtConfig,
  redisConfig,
  validationSchema,
} from '@config/index';
import { CommonModule } from '@common/common.module';
import { DatabaseModule } from '@database/database.module';
import { AuthModule } from '@modules/auth/auth.module';
import { BoardsModule } from '@modules/boards/boards.module';
import { CardsModule } from '@modules/cards/cards.module';
import { ColumnsModule } from '@modules/columns/columns.module';
import { HealthModule } from '@modules/health/health.module';
import { IssueTypesModule } from '@modules/issue-types/issue-types.module';
import { UsersModule } from '@modules/users/users.module';
import { VersionsModule } from '@modules/versions/versions.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env'],
      load: [appConfig, databaseConfig, jwtConfig, redisConfig],
      validationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
    CommonModule,
    DatabaseModule,
    AuthModule,
    BoardsModule,
    CardsModule,
    ColumnsModule,
    IssueTypesModule,
    UsersModule,
    VersionsModule,
    HealthModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
