import { Module } from '@nestjs/common';
import { BoardAccessService } from './board-access.service';
import { BoardsController } from './boards.controller';
import { BoardsService } from './boards.service';
import { BoardsRepository } from './repositories/boards.repository';

@Module({
  controllers: [BoardsController],
  providers: [BoardsService, BoardsRepository, BoardAccessService],
  exports: [BoardsService, BoardAccessService],
})
export class BoardsModule {}
