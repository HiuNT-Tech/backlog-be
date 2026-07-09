import { BoardMemberRole, BoardType, StatusColor } from '@prisma/client';

export type BoardMemberFactory = {
  userId: number;
  role: BoardMemberRole;
};

export type BoardColumnFactory = {
  id: number;
  boardId: number;
  title: string;
  statusColor: StatusColor;
  position: number;
  createdAt: Date;
  updatedAt: Date;
};

export type BoardRecordFactory = {
  id: number;
  title: string;
  boardCode: string;
  description: string | null;
  type: BoardType;
  createdAt: Date;
  updatedAt: Date;
  members: BoardMemberFactory[];
  columns: BoardColumnFactory[];
};

export const makeBoardMember = (
  over: Partial<BoardMemberFactory> = {},
): BoardMemberFactory => ({
  userId: 1,
  role: BoardMemberRole.ADMIN,
  ...over,
});

export const makeBoardColumn = (
  over: Partial<BoardColumnFactory> = {},
): BoardColumnFactory => ({
  id: 1,
  boardId: 1,
  title: 'To Do',
  statusColor: StatusColor.BLUE,
  position: 0,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  ...over,
});

export const makeBoardRecord = (
  over: Partial<BoardRecordFactory> = {},
): BoardRecordFactory => ({
  id: 1,
  title: 'Backlog Board',
  boardCode: 'BLB',
  description: null,
  type: BoardType.PRIVATE,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  members: [makeBoardMember()],
  columns: [makeBoardColumn()],
  ...over,
});
