import { INestApplication } from '@nestjs/common';
import { PrismaService } from '@database/prisma/prisma.service';

const TABLES = [
  'comments',
  'cards',
  'board_invitations',
  'versions',
  'issue_types',
  'columns',
  'board_members',
  'boards',
  'refresh_token_sessions',
  'users',
];

export async function resetDatabase(app: INestApplication): Promise<void> {
  const prisma = app.get(PrismaService);
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${TABLES.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE`,
  );
}
