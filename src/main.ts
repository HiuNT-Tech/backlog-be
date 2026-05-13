import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from '@common/filters/http-exception.filter';
import { ResponseInterceptor } from '@common/interceptors/response.interceptor';
import { TimeoutInterceptor } from '@common/interceptors/timeout.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port', 3000);
  const apiPrefix = configService.get<string>('app.apiPrefix', 'api/v1');
  const normalizedPrefix = apiPrefix.replace(/^\/+|\/+$/g, '');

  app.setGlobalPrefix(normalizedPrefix);
  app.enableVersioning({
    type: VersioningType.URI,
  });
  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.use(helmet());
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
    app.get(ResponseInterceptor),
  );

  await app.listen(port);
  const url = await app.getUrl();
  console.log(`Server is running at ${url}/${normalizedPrefix}`);
}
void bootstrap();
