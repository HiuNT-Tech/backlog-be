import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { AppModule } from '@/app.module';
import { EMAIL_PROVIDER, EmailProvider } from '@/providers/brevo.provider';
import { RedisService } from '@shared/redis/redis.service';

export const mockEmailProvider: EmailProvider = {
  sendEmail: jest.fn().mockResolvedValue(undefined),
};

const mockRedisService: Partial<RedisService> = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
  ping: jest.fn().mockResolvedValue('PONG'),
};

export async function createE2EApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(EMAIL_PROVIDER)
    .useValue(mockEmailProvider)
    .overrideProvider(RedisService)
    .useValue(mockRedisService)
    .compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.enableVersioning({ type: VersioningType.URI });
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();

  return app;
}
