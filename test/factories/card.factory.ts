export type CardUserFactory = {
  id: number;
  email: string;
  displayName: string;
  avatar: string | null;
};

export type CardColumnFactory = {
  id: number;
  boardId: number;
  title: string;
  statusColor: string;
  position: number;
};

export type CardIssueTypeFactory = {
  id: number;
  boardId: number;
  name: string;
  statusColor: string;
};

export type CardVersionFactory = {
  id: number;
  boardId: number;
  name: string;
};

export type CardRecordFactory = {
  id: number;
  boardId: number;
  columnId: number;
  cardNumber: number;
  cardCode: string;
  title: string;
  description: string | null;
  priority: number | null;
  assigneeUserId: number | null;
  assignee: CardUserFactory | null;
  issueTypeId: number | null;
  issueType: CardIssueTypeFactory | null;
  column: CardColumnFactory;
  versionId: number | null;
  version: CardVersionFactory | null;
  startDate: Date | null;
  dueDate: Date | null;
  estimatedHours: string | null;
  actualHours: string | null;
  registeredByUserId: number | null;
  registeredBy: CardUserFactory | null;
  createdBy: CardUserFactory | null;
  position: number;
  createdAt: Date;
  updatedAt: Date;
};

export const makeCardUser = (
  over: Partial<CardUserFactory> = {},
): CardUserFactory => ({
  id: 1,
  email: 'user@example.com',
  displayName: 'User',
  avatar: null,
  ...over,
});

export const makeCardColumn = (
  over: Partial<CardColumnFactory> = {},
): CardColumnFactory => ({
  id: 1,
  boardId: 1,
  title: 'To Do',
  statusColor: 'BLUE',
  position: 0,
  ...over,
});

export const makeCardRecord = (
  over: Partial<CardRecordFactory> = {},
): CardRecordFactory => ({
  id: 1,
  boardId: 1,
  columnId: 1,
  cardNumber: 1,
  cardCode: 'BLB-1',
  title: 'Sample card',
  description: null,
  priority: null,
  assigneeUserId: null,
  assignee: null,
  issueTypeId: null,
  issueType: null,
  column: makeCardColumn(),
  versionId: null,
  version: null,
  startDate: null,
  dueDate: null,
  estimatedHours: null,
  actualHours: null,
  registeredByUserId: null,
  registeredBy: null,
  createdBy: null,
  position: 0,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  ...over,
});
