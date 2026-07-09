import { Module } from '@nestjs/common';
import { StorageModule } from '@shared/storage/storage.module';
import { BoardsModule } from '@modules/boards/boards.module';
import { AttachmentsController } from './attachments.controller';
import { AttachmentsService } from './attachments.service';
import { AttachmentsRepository } from './repositories/attachments.repository';

@Module({
  imports: [StorageModule, BoardsModule],
  controllers: [AttachmentsController],
  providers: [AttachmentsService, AttachmentsRepository],
  exports: [AttachmentsService],
})
export class AttachmentsModule {}
