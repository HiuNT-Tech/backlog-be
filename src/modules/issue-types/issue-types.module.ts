import { Module } from '@nestjs/common';
import { BoardsModule } from '@modules/boards/boards.module';
import { IssueTypesController } from './issue-types.controller';
import { IssueTypesService } from './issue-types.service';
import { IssueTypesRepository } from './repositories/issue-types.repository';

@Module({
  imports: [BoardsModule],
  controllers: [IssueTypesController],
  providers: [IssueTypesService, IssueTypesRepository],
  exports: [IssueTypesService],
})
export class IssueTypesModule {}
