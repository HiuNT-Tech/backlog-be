import { StatusColor } from '@prisma/client';

export type IssueTypeRecordFactory = {
  id: number;
  boardId: number;
  name: string;
  statusColor: StatusColor;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  issueCount?: number;
};

export const makeIssueTypeRecord = (
  over: Partial<IssueTypeRecordFactory> = {},
): IssueTypeRecordFactory => ({
  id: 1,
  boardId: 1,
  name: 'Bug',
  statusColor: StatusColor.RED,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  deletedAt: null,
  ...over,
});
