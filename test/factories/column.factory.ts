import { StatusColor } from '@prisma/client';

export type ColumnRecordFactory = {
  id: number;
  boardId: number;
  title: string;
  statusColor: StatusColor;
  position: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  _count?: { cards: number };
};

export const makeColumnRecord = (
  over: Partial<ColumnRecordFactory> = {},
): ColumnRecordFactory => ({
  id: 1,
  boardId: 1,
  title: 'To Do',
  statusColor: StatusColor.BLUE,
  position: 0,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  deletedAt: null,
  ...over,
});
