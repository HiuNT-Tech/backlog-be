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

const firstNonEmpty = (
  ...values: Array<string | undefined>
): string | undefined => {
  return values.map((value) => value?.trim()).find(Boolean);
};

export const appConfig = registerAs('app', () => ({
  name: process.env.APP_NAME ?? 'nestjs-production-base',
  nodeEnv: process.env.NODE_ENV ?? AppEnv.Development,
  port: Number(process.env.PORT ?? 3000),
  apiPrefix: process.env.API_PREFIX ?? 'api/v1',
  frontendUrl:
    firstNonEmpty(process.env.FRONTEND_URL, process.env.WEBSITE_DOMAIN) ??
    'http://localhost:3000',
  brevoApiKey: firstNonEmpty(process.env.BREVO_API_KEY),
  mailSenderEmail:
    firstNonEmpty(
      process.env.MAIL_SENDER_EMAIL,
      process.env.ADMIN_EMAIL_ADDRESS,
    ) ?? 'no-reply@example.com',
  mailSenderName:
    firstNonEmpty(process.env.MAIL_SENDER_NAME, process.env.ADMIN_EMAIL_NAME) ??
    'Backlog App',
  corsOrigins: parseCsv(process.env.CORS_ORIGINS),
  logDirectory: process.env.LOG_DIR ?? 'logs',
  logMaxFileSizeBytes: Number(
    process.env.LOG_MAX_FILE_SIZE_BYTES ?? 10_485_760,
  ),
  // Base URL công khai của chính BE (dùng để build link tuyệt đối, ví dụ
  // link download attachment). Khác với `frontendUrl` (origin của FE).
  publicUrl:
    firstNonEmpty(process.env.APP_PUBLIC_URL) ??
    `http://localhost:${Number(process.env.PORT ?? 3000)}`,
}));
