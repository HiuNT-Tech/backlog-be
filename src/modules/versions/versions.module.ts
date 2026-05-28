import { Module } from '@nestjs/common';
import { BoardsModule } from '@modules/boards/boards.module';
import { VersionsController } from './versions.controller';
import { VersionsService } from './versions.service';
import { VersionsRepository } from './repositories/versions.repository';

@Module({
  imports: [BoardsModule],
  controllers: [VersionsController],
  providers: [VersionsService, VersionsRepository],
  exports: [VersionsService],
})
export class VersionsModule {}
