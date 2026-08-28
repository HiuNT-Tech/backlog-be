import { Module } from '@nestjs/common';
import { StorageModule } from '@shared/storage/storage.module';
import { UsersModule } from '@modules/users/users.module';
import { MeController } from './me.controller';
import { MeService } from './me.service';

@Module({
  imports: [UsersModule, StorageModule],
  controllers: [MeController],
  providers: [MeService],
})
export class MeModule {}
