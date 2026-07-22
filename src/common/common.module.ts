import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ResponseInterceptor } from './interceptors/response.interceptor';
import { TimeoutInterceptor } from './interceptors/timeout.interceptor';
import { FileLogger } from './logger';

@Module({
  providers: [
    FileLogger,
    HttpExceptionFilter,
    ResponseInterceptor,
    TimeoutInterceptor,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
  exports: [
    FileLogger,
    HttpExceptionFilter,
    ResponseInterceptor,
    TimeoutInterceptor,
  ],
})
export class CommonModule {}
