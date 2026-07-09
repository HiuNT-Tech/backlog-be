import { CardUserFactory, makeCardUser } from './card.factory';

export type AttachmentRecordFactory = {
  id: number;
  fileName: string;
  mimeType: string;
  fileSize: number;
};

export type CommentRecordFactory = {
  id: number;
  cardId: number;
  userId: number;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  user: CardUserFactory;
  attachments: AttachmentRecordFactory[];
};

export const makeCommentRecord = (
  over: Partial<CommentRecordFactory> = {},
): CommentRecordFactory => ({
  id: 1,
  cardId: 1,
  userId: 1,
  content: 'A comment',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  user: makeCardUser(),
  attachments: [],
  ...over,
});
