import { Module } from '@nestjs/common';
import { BoardMembersModule } from '@modules/board-members/board-members.module';
import { BoardAccessService } from './board-access.service';
import { BoardsController } from './boards.controller';
import { BoardsService } from './boards.service';
import { BoardsRepository } from './repositories/boards.repository';

@Module({
  imports: [BoardMembersModule],
  controllers: [BoardsController],
  providers: [BoardsService, BoardsRepository, BoardAccessService],
  exports: [BoardsService, BoardAccessService],
})
export class BoardsModule {}
