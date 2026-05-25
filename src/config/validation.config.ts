import Joi from 'joi';
import { AppEnv } from '@common/enums/app-env.enum';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid(AppEnv.Development, AppEnv.Production, AppEnv.Test)
    .default(AppEnv.Development),
  APP_NAME: Joi.string().default('nestjs-production-base'),
  PORT: Joi.number().port().default(3000),
  API_PREFIX: Joi.string().default('api/v1'),
  FRONTEND_URL: Joi.string().uri().default('http://localhost:3000'),
  WEBSITE_DOMAIN: Joi.string().uri().optional(),
  BREVO_API_KEY: Joi.string().allow('').optional(),
  MAIL_SENDER_EMAIL: Joi.string().email().default('no-reply@example.com'),
  MAIL_SENDER_NAME: Joi.string().default('Backlog App'),
  ADMIN_EMAIL_ADDRESS: Joi.string().email().optional(),
  ADMIN_EMAIL_NAME: Joi.string().optional(),
  CORS_ORIGINS: Joi.string().allow('').default(''),
  LOG_DIR: Joi.string().default('logs'),
  LOG_MAX_FILE_SIZE_BYTES: Joi.number().integer().min(1024).default(10_485_760),
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgresql', 'postgres'] })
    .optional(),
  POSTGRES_HOST: Joi.string().hostname().default('localhost'),
  POSTGRES_PORT: Joi.number().port().default(5432),
  POSTGRES_USER: Joi.string().default('postgres'),
  POSTGRES_PASSWORD: Joi.string().allow('').default('postgres'),
  POSTGRES_DB: Joi.string().default('be_02'),
  POSTGRES_SCHEMA: Joi.string().default('public'),
  JWT_ACCESS_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().port().default(6379),
});
