import 'dotenv/config';
import { defineConfig } from 'prisma/config';
import { buildPostgresUrl } from './src/config/database-url.util';

process.env.DATABASE_URL = buildPostgresUrl();

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL,
  },
  migrations: {
    seed: 'ts-node -r tsconfig-paths/register src/database/seed/seed.ts',
  },
});
