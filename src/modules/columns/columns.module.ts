import { Module } from '@nestjs/common';
import { BoardsModule } from '@modules/boards/boards.module';
import { ColumnsController } from './columns.controller';
import { ColumnsService } from './columns.service';
import { ColumnsRepository } from './repositories/columns.repository';

@Module({
  imports: [BoardsModule],
  controllers: [ColumnsController],
  providers: [ColumnsService, ColumnsRepository],
})
export class ColumnsModule {}
