import Joi from 'joi';
import { AppEnv } from '@common/enums/app-env.enum';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid(AppEnv.Development, AppEnv.Production, AppEnv.Test)
    .default(AppEnv.Development),
  APP_NAME: Joi.string().default('nestjs-production-base'),
  PORT: Joi.number().port().default(3000),
  API_PREFIX: Joi.string().default('api/v1'),
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgresql', 'postgres'] })
    .required(),
  MONGODB_URI: Joi.string()
    .uri({ scheme: ['mongodb', 'mongodb+srv'] })
    .required(),
  JWT_ACCESS_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().port().default(6379),
});
