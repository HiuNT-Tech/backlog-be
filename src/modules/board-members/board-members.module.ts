import { Module } from '@nestjs/common';
import { BoardMembersService } from './board-members.service';
import { BoardMembersRepository } from './repositories/board-members.repository';

@Module({
  providers: [BoardMembersService, BoardMembersRepository],
  exports: [BoardMembersService, BoardMembersRepository],
})
export class BoardMembersModule {}
