import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
import { HealthModule } from '@modules/health/health.module';
import { UsersModule } from '@modules/users/users.module';
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
    CommonModule,
    DatabaseModule,
    AuthModule,
    UsersModule,
    HealthModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
