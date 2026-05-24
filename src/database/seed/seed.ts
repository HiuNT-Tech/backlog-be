import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role } from '@prisma/client';
import { hashPassword } from '@common/utils/crypto.util';
import { buildPostgresUrl } from '@config/database-url.util';

async function main(): Promise<void> {
  const connectionString = buildPostgresUrl();

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const email = 'admin@example.com';
  const password = await hashPassword('Admin@123456');

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: 'Admin',
      username: 'admin',
      displayName: 'Admin',
      password,
      role: Role.ADMIN,
      isActive: true,
    },
  });

  await prisma.$disconnect();
  await pool.end();
}

main().catch(async (error: unknown) => {
  console.error(error);
  process.exit(1);
});
