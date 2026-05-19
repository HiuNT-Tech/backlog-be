import { registerAs } from '@nestjs/config';
import { AppEnv } from '@common/enums/app-env.enum';

const parseCsv = (value: string | undefined): string[] => {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

export const appConfig = registerAs('app', () => ({
  name: process.env.APP_NAME ?? 'nestjs-production-base',
  nodeEnv: process.env.NODE_ENV ?? AppEnv.Development,
  port: Number(process.env.PORT ?? 3000),
  apiPrefix: process.env.API_PREFIX ?? 'api/v1',
  corsOrigins: parseCsv(process.env.CORS_ORIGINS),
  logDirectory: process.env.LOG_DIR ?? 'logs',
  logMaxFileSizeBytes: Number(
    process.env.LOG_MAX_FILE_SIZE_BYTES ?? 10_485_760,
  ),
}));
