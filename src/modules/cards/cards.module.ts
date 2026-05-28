import { Module } from '@nestjs/common';
import { BoardsModule } from '@modules/boards/boards.module';
import { IssueTypesModule } from '@modules/issue-types/issue-types.module';
import { VersionsModule } from '@modules/versions/versions.module';
import { CardsController } from './cards.controller';
import { CardsService } from './cards.service';
import { CardsRepository } from './repositories/cards.repository';

@Module({
  imports: [BoardsModule, IssueTypesModule, VersionsModule],
  controllers: [CardsController],
  providers: [CardsService, CardsRepository],
})
export class CardsModule {}
