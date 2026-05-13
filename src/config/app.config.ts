import { registerAs } from '@nestjs/config';
import { AppEnv } from '@common/enums/app-env.enum';

export const appConfig = registerAs('app', () => ({
  name: process.env.APP_NAME ?? 'nestjs-production-base',
  nodeEnv: process.env.NODE_ENV ?? AppEnv.Development,
  port: Number(process.env.PORT ?? 3000),
  apiPrefix: process.env.API_PREFIX ?? 'api/v1',
}));
