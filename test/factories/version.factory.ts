export type VersionRecordFactory = {
  id: number;
  boardId: number;
  name: string;
  startDate: Date | null;
  endDate: Date | null;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export const makeVersionRecord = (
  over: Partial<VersionRecordFactory> = {},
): VersionRecordFactory => ({
  id: 1,
  boardId: 1,
  name: 'v1.0',
  startDate: null,
  endDate: null,
  description: '',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  deletedAt: null,
  ...over,
});
