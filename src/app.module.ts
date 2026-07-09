import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import {
  appConfig,
  databaseConfig,
  jwtConfig,
  redisConfig,
  storageConfig,
  validationSchema,
} from '@config/index';
import { CommonModule } from '@common/common.module';
import { DatabaseModule } from '@database/database.module';
import { AuthModule } from '@modules/auth/auth.module';
import { AttachmentsModule } from '@modules/attachments/attachments.module';
import { BoardsModule } from '@modules/boards/boards.module';
import { CardsModule } from '@modules/cards/cards.module';
import { ColumnsModule } from '@modules/columns/columns.module';
import { CommentsModule } from '@modules/comments/comments.module';
import { HealthModule } from '@modules/health/health.module';
import { InvitationsModule } from '@modules/invitations/invitations.module';
import { IssueTypesModule } from '@modules/issue-types/issue-types.module';
import { MeModule } from '@modules/me/me.module';
import { UsersModule } from '@modules/users/users.module';
import { VersionsModule } from '@modules/versions/versions.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env'],
      load: [appConfig, databaseConfig, jwtConfig, redisConfig, storageConfig],
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
    AttachmentsModule,
    BoardsModule,
    CardsModule,
    ColumnsModule,
    InvitationsModule,
    CommentsModule,
    IssueTypesModule,
    MeModule,
    UsersModule,
    VersionsModule,
    HealthModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
