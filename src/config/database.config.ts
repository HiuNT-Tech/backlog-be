import { registerAs } from '@nestjs/config';
import { buildPostgresUrl } from './database-url.util';

export const databaseConfig = registerAs('database', () => ({
  url: buildPostgresUrl(),
  host: process.env.POSTGRES_HOST ?? 'localhost',
  port: Number(process.env.POSTGRES_PORT ?? 5432),
  user: process.env.POSTGRES_USER ?? 'postgres',
  password: process.env.POSTGRES_PASSWORD ?? 'postgres',
  name: process.env.POSTGRES_DB ?? 'be_02',
  schema: process.env.POSTGRES_SCHEMA ?? 'public',
}));
