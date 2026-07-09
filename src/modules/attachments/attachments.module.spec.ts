import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { mockDeep } from 'jest-mock-extended';
import { PrismaModule } from '@database/prisma/prisma.module';
import { PrismaService } from '@database/prisma/prisma.service';
import { AttachmentsService } from './attachments.service';
import { AttachmentsModule } from './attachments.module';

/**
 * Smoke test cho DI graph — `nest build`/`tsc` chỉ compile TypeScript,
 * KHÔNG phát hiện lỗi wiring module (thiếu provider, circular dependency…).
 * Test này thực sự dựng NestJS testing module để đảm bảo
 * AttachmentsModule + BoardsModule (mới thêm) resolve được khi app khởi động.
 */
describe('AttachmentsModule (wiring)', () => {
  it('should resolve the full DI graph', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        AttachmentsModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(mockDeep<PrismaService>())
      .compile();

    expect(moduleRef.get(AttachmentsService)).toBeInstanceOf(
      AttachmentsService,
    );
  });
});
