import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, BoardType, BoardMemberRole, StatusColor } from '@prisma/client';
import { hashPassword } from '@common/utils/crypto.util';
import { buildPostgresUrl } from '@config/database-url.util';

// ── Seed constants ────────────────────────────────────────────────

const DEV_USER = {
  email: 'admin@example.com',
  displayName: 'Admin',
  password: 'Admin@123456',
} as const;

const BOARD = {
  title: 'PIPC Board',
  boardCode: 'PIPC',
  description: 'Sample board for development testing',
  type: BoardType.PUBLIC,
} as const;

const DEFAULT_COLUMNS = [
  { title: 'To Do', statusColor: StatusColor.BLUE, position: 0 },
  { title: 'In Progress', statusColor: StatusColor.GREEN, position: 1 },
  { title: 'Resolved', statusColor: StatusColor.TEAL, position: 2 },
  { title: 'Closed', statusColor: StatusColor.BLACK, position: 3 },
] as const;

const ISSUE_TYPES = [
  { name: 'Task', statusColor: StatusColor.BLUE },
  { name: 'Bug', statusColor: StatusColor.RED },
] as const;

const VERSION = {
  name: 'v1.0.0',
  description: 'First release',
} as const;

// ── Main seed function ────────────────────────────────────────────

async function main(): Promise<void> {
  const connectionString = buildPostgresUrl();
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    // 1. Seed dev user
    const hashedPassword = await hashPassword(DEV_USER.password);
    const user = await prisma.user.upsert({
      where: { email: DEV_USER.email },
      update: {},
      create: {
        email: DEV_USER.email,
        displayName: DEV_USER.displayName,
        password: hashedPassword,
        isActive: true,
      },
    });
    console.log(`✓ User: ${user.email} (id: ${user.id})`);

    // 2. Seed board
    const board = await prisma.board.upsert({
      where: { boardCode: BOARD.boardCode },
      update: {},
      create: {
        title: BOARD.title,
        boardCode: BOARD.boardCode,
        description: BOARD.description,
        type: BOARD.type,
        nextCardNumber: 1, // Will be updated after cards are created
      },
    });
    console.log(`✓ Board: ${board.title} (id: ${board.id}, code: ${board.boardCode})`);

    // 3. Seed board member
    await prisma.boardMember.upsert({
      where: {
        boardId_userId: { boardId: board.id, userId: user.id },
      },
      update: {},
      create: {
        boardId: board.id,
        userId: user.id,
        role: BoardMemberRole.ADMIN,
      },
    });
    console.log(`✓ BoardMember: user ${user.id} → board ${board.id} (ADMIN)`);

    // 4. Seed columns
    const columns: Record<string, { id: number }> = {};
    for (const col of DEFAULT_COLUMNS) {
      const column = await prisma.column.upsert({
        where: {
          boardId_title: { boardId: board.id, title: col.title },
        },
        update: {},
        create: {
          boardId: board.id,
          title: col.title,
          statusColor: col.statusColor,
          position: col.position,
        },
      });
      columns[col.title] = { id: column.id };
      console.log(`✓ Column: ${col.title} (id: ${column.id}, pos: ${col.position})`);
    }

    // 5. Seed issue types
    const issueTypes: Record<string, { id: number }> = {};
    for (const it of ISSUE_TYPES) {
      const issueType = await prisma.issueType.upsert({
        where: {
          boardId_name: { boardId: board.id, name: it.name },
        },
        update: {},
        create: {
          boardId: board.id,
          name: it.name,
          statusColor: it.statusColor,
        },
      });
      issueTypes[it.name] = { id: issueType.id };
      console.log(`✓ IssueType: ${it.name} (id: ${issueType.id})`);
    }

    // 6. Seed version
    const version = await prisma.version.upsert({
      where: {
        boardId_name: { boardId: board.id, name: VERSION.name },
      },
      update: {},
      create: {
        boardId: board.id,
        name: VERSION.name,
        description: VERSION.description,
      },
    });
    console.log(`✓ Version: ${version.name} (id: ${version.id})`);

    // 7. Seed cards
    const cardsData = [
      {
        cardNumber: 1,
        cardCode: `${BOARD.boardCode}-1`,
        title: 'Setup project structure',
        description: 'Initialize the project with NestJS and configure the basic folder structure.',
        columnTitle: 'To Do',
        issueTypeName: 'Task',
        versionId: version.id,
        position: 0,
      },
      {
        cardNumber: 2,
        cardCode: `${BOARD.boardCode}-2`,
        title: 'Fix login redirect bug',
        description: 'After login, user is not redirected to the dashboard correctly.',
        columnTitle: 'In Progress',
        issueTypeName: 'Bug',
        versionId: null,
        position: 0,
      },
    ] as const;

    for (const cardData of cardsData) {
      const columnId = columns[cardData.columnTitle]?.id;
      const issueTypeId = issueTypes[cardData.issueTypeName]?.id;

      if (!columnId) {
        throw new Error(`Column "${cardData.columnTitle}" not found`);
      }

      const card = await prisma.card.upsert({
        where: {
          boardId_cardNumber: {
            boardId: board.id,
            cardNumber: cardData.cardNumber,
          },
        },
        update: {},
        create: {
          boardId: board.id,
          columnId,
          cardNumber: cardData.cardNumber,
          cardCode: cardData.cardCode,
          title: cardData.title,
          description: cardData.description,
          issueTypeId: issueTypeId ?? null,
          versionId: cardData.versionId,
          assigneeUserId: user.id,
          registeredByUserId: user.id,
          createdByUserId: user.id,
          position: cardData.position,
        },
      });
      console.log(`✓ Card: ${card.cardCode} - ${card.title} (id: ${card.id})`);
    }

    // 8. Update board nextCardNumber to match seeded cards
    await prisma.board.update({
      where: { id: board.id },
      data: { nextCardNumber: cardsData.length + 1 },
    });
    console.log(`✓ Board nextCardNumber updated to ${cardsData.length + 1}`);

    console.log('\n🌱 Seed completed successfully!');
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
