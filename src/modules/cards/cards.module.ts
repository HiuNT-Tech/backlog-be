import { Module } from '@nestjs/common';
import { BoardsModule } from '@modules/boards/boards.module';
import { IssueTypesModule } from '@modules/issue-types/issue-types.module';
import { VersionsModule } from '@modules/versions/versions.module';
import { AttachmentsModule } from '@modules/attachments/attachments.module';
import { CommentsRepository } from '@modules/comments/repositories/comments.repository';
import { CardsController } from './cards.controller';
import { CardsService } from './cards.service';
import { CardHistoryService } from './card-history.service';
import { CardsRepository } from './repositories/cards.repository';

@Module({
  imports: [BoardsModule, IssueTypesModule, VersionsModule, AttachmentsModule],
  controllers: [CardsController],
  // CommentsRepository được đăng ký lại ở đây (stateless, chỉ cần
  // PrismaService global) thay vì import CommentsModule — CommentsModule
  // đang import CardsModule nên import ngược lại sẽ tạo circular dependency.
  providers: [
    CardsService,
    CardsRepository,
    CardHistoryService,
    CommentsRepository,
  ],
  exports: [CardsService],
})
export class CardsModule {}
