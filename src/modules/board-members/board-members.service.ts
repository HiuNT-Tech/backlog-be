import { Injectable } from '@nestjs/common';
import { BoardMemberRole, Prisma } from '@prisma/client';
import {
  BoardMemberRecord,
  BoardMembersRepository,
  UpsertBoardMemberData,
} from './repositories/board-members.repository';

@Injectable()
export class BoardMembersService {
  constructor(
    private readonly boardMembersRepository: BoardMembersRepository,
  ) {}

  getActiveMember(
    boardId: number,
    userId: number,
  ): Promise<BoardMemberRecord | null> {
    return this.boardMembersRepository.findActiveMember(boardId, userId);
  }

  getActiveMemberByEmail(
    boardId: number,
    email: string,
  ): Promise<BoardMemberRecord | null> {
    return this.boardMembersRepository.findActiveMemberByEmail(boardId, email);
  }

  countActiveAdmins(boardId: number): Promise<number> {
    return this.boardMembersRepository.countActiveAdmins(boardId);
  }

  // Add a member to a board, or restore a previously removed one and refresh
  // its role. Used when a user accepts a board invitation. Pass `tx` to run
  // inside a caller-owned transaction (e.g. alongside the invitation update).
  addOrRestoreMember(
    data: UpsertBoardMemberData,
    tx?: Prisma.TransactionClient,
  ): Promise<BoardMemberRecord> {
    return this.boardMembersRepository.upsert(data, tx);
  }

  updateRole(
    memberId: number,
    role: BoardMemberRole,
    tx?: Prisma.TransactionClient,
  ): Promise<BoardMemberRecord> {
    return this.boardMembersRepository.updateRole(memberId, role, tx);
  }

  removeMember(memberId: number, tx?: Prisma.TransactionClient): Promise<void> {
    return this.boardMembersRepository.softDelete(memberId, tx);
  }
}
