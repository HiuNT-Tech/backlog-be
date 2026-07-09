import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { setupSwagger } from './config/swagger.config';
import { HttpExceptionFilter } from '@common/filters/http-exception.filter';
import { TimeoutInterceptor } from '@common/interceptors/timeout.interceptor';
import { ResponseInterceptor } from '@common/interceptors/response.interceptor';
import { FileLogger } from '@common/logger';
import { AppEnv } from '@common/enums/app-env.enum';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  const logger = app.get(FileLogger);
  app.useLogger(logger);
  app.enableShutdownHooks();

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port', 3000);
  const apiPrefix = configService.get<string>('app.apiPrefix', 'api/v1');
  const nodeEnv = configService.get<AppEnv>('app.nodeEnv', AppEnv.Development);
  const corsOrigins = configService.get<string[]>('app.corsOrigins', []);
  const uploadDir = configService.get<string>('storage.uploadDir', 'uploads');
  const normalizedPrefix = apiPrefix.replace(/^\/+|\/+$/g, '');
  const corsOrigin =
    nodeEnv === AppEnv.Production
      ? corsOrigins
      : corsOrigins.length > 0
        ? corsOrigins
        : true;

  // Serve uploaded files (attachments) at /uploads — outside the API prefix.
  app.useStaticAssets(join(process.cwd(), uploadDir), {
    prefix: '/uploads/',
  });

  app.setGlobalPrefix(normalizedPrefix);
  app.enableVersioning({
    type: VersioningType.URI,
  });
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  app.use(
    helmet({
      contentSecurityPolicy: nodeEnv === AppEnv.Production ? undefined : false,
    }),
  );
  app.use(compression());
  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(app.get(HttpExceptionFilter));
  app.useGlobalInterceptors(
    app.get(TimeoutInterceptor),
    new ResponseInterceptor(),
  );
  setupSwagger(app, {
    enabled: nodeEnv !== AppEnv.Production,
  });

  await app.listen(port);
  const url = await app.getUrl();
  logger.log(`Server is running at ${url}/${normalizedPrefix}`, 'Bootstrap');
}
void bootstrap();
