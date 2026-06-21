import { Module } from '@nestjs/common';
import { BoardMembersModule } from '@modules/board-members/board-members.module';
import { BoardAccessService } from './board-access.service';
import { BoardsController } from './boards.controller';
import { BoardsService } from './boards.service';
import { BoardRolesGuard } from './guards/board-roles.guard';
import { BoardsRepository } from './repositories/boards.repository';

@Module({
  imports: [BoardMembersModule],
  controllers: [BoardsController],
  providers: [
    BoardsService,
    BoardsRepository,
    BoardAccessService,
    BoardRolesGuard,
  ],
  exports: [BoardsService, BoardAccessService, BoardRolesGuard],
})
export class BoardsModule {}
