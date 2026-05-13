import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { ResponseInterceptor } from './interceptors/response.interceptor';
import { TimeoutInterceptor } from './interceptors/timeout.interceptor';

@Module({
  providers: [
    HttpExceptionFilter,
    ResponseInterceptor,
    TimeoutInterceptor,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
  exports: [HttpExceptionFilter, ResponseInterceptor, TimeoutInterceptor],
})
export class CommonModule {}
