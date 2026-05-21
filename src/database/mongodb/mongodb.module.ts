import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.getOrThrow<string>('mongodb.uri'),
        dbName: configService.get<string>('mongodb.databaseName'),
      }),
    }),
  ],
})
export class MongoDbModule {}
