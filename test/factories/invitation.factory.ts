import { BoardInvitationStatus, BoardMemberRole } from '@prisma/client';
import { CardUserFactory, makeCardUser } from './card.factory';

export type InvitationBoardFactory = {
  id: number;
  title: string;
  boardCode: string;
};

export type InvitationRecordFactory = {
  id: number;
  boardId: number;
  email: string;
  inviteeUserId: number | null;
  invitedByUserId: number | null;
  role: BoardMemberRole;
  status: BoardInvitationStatus;
  token: string;
  expiresAt: Date;
  respondedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  board: InvitationBoardFactory;
  invitee: CardUserFactory | null;
  invitedBy: CardUserFactory | null;
};

export const makeInvitationRecord = (
  over: Partial<InvitationRecordFactory> = {},
): InvitationRecordFactory => ({
  id: 1,
  boardId: 1,
  email: 'invitee@example.com',
  inviteeUserId: null,
  invitedByUserId: 1,
  role: BoardMemberRole.MEMBER,
  status: BoardInvitationStatus.PENDING,
  token: 'invitation-token',
  expiresAt: new Date('2026-01-08T00:00:00Z'),
  respondedAt: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  board: { id: 1, title: 'Backlog Board', boardCode: 'BLB' },
  invitee: null,
  invitedBy: makeCardUser({ id: 1 }),
  ...over,
});
