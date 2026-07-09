import { Module } from '@nestjs/common';
import { CardsModule } from '@modules/cards/cards.module';
import { AttachmentsModule } from '@modules/attachments/attachments.module';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { CommentsRepository } from './repositories/comments.repository';

@Module({
  imports: [CardsModule, AttachmentsModule],
  controllers: [CommentsController],
  providers: [CommentsService, CommentsRepository],
})
export class CommentsModule {}
