import { Module } from '@nestjs/common';
import { MongoDbModule } from './mongodb/mongodb.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule, MongoDbModule],
  exports: [PrismaModule, MongoDbModule],
})
export class DatabaseModule {}
