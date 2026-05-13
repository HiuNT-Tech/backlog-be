# NestJS Production Base

Base code backend NestJS cho dự án production: TypeScript, PostgreSQL, MongoDB, Prisma, Docker, JWT auth, ConfigModule, Joi env validation và cấu trúc tách controller/service/repository rõ ràng.

## Cài dependency

```bash
npm install
```

## Tạo env

```bash
cp .env.example .env
```

Sửa các biến quan trọng trong `.env`: `DATABASE_URL`, `MONGODB_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`.

PostgreSQL dùng qua Prisma cho dữ liệu quan hệ. MongoDB chỉ lưu collection `users` cho auth/user profile.

## Chạy Docker dev

```bash
docker compose -f docker-compose.dev.yml up --build
```

API mặc định chạy ở:

```text
http://localhost:3000/api/v1
```

## Chạy database riêng

```bash
docker compose -f docker-compose.dev.yml up postgres mongo redis
```

## Prisma

Generate client:

```bash
npm run prisma:generate
```

Tạo migration dev:

```bash
npm run prisma:migrate -- --name init
```

Deploy migration production:

```bash
npm run prisma:deploy
```

Seed admin mẫu:

```bash
npm run db:seed
```

Admin mặc định:

```text
email: admin@example.com
password: Admin@123456
```

## Start dev local

```bash
npm run start:dev
```

## API mẫu

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `GET /api/v1/users`
- `GET /api/v1/users/:id`
- `POST /api/v1/users`
- `PATCH /api/v1/users/:id`
- `DELETE /api/v1/users/:id`
- `GET /api/v1/products?page=1&limit=10&sortBy=createdAt&sortOrder=desc`
- `GET /api/v1/products/:id`
- `POST /api/v1/products`
- `PATCH /api/v1/products/:id`
- `DELETE /api/v1/products/:id`
- `GET /api/v1/health`

Response success được wrap dạng:

```json
{
  "success": true,
  "data": {},
  "timestamp": "2026-05-13T00:00:00.000Z"
}
```

Response error được format dạng:

```json
{
  "success": false,
  "statusCode": 400,
  "path": "/api/v1/example",
  "method": "POST",
  "message": "Validation failed",
  "timestamp": "2026-05-13T00:00:00.000Z"
}
```

## Structure

```text
src/
  config/      ConfigModule config + Joi validation
  common/      decorator, guard, filter, interceptor, pipe, util, enum, constant
  database/    Prisma PostgreSQL + MongoDB connection module
  modules/     business domain modules
  shared/      infrastructure services: mail, redis, storage, queue
  types/       shared TypeScript types
```

Quy tắc chính:

- Controller chỉ nhận request và gọi service.
- Service chứa business logic.
- Repository là nơi query database.
- DTO validate input bằng `class-validator`.
- Không trả password ra API.
- Không đọc `process.env` trực tiếp trong service.
- Config mới đặt trong `src/config`.
- Common không chứa business logic.
- Shared chỉ chứa service hạ tầng.

Repository PostgreSQL/Prisma có thể kế thừa `BasePrismaRepository`:

```ts
export class ProductsRepository extends BasePrismaRepository<
  PrismaService['product']
> {
  constructor(prisma: PrismaService) {
    super(prisma.product);
  }
}
```

Query phân trang dùng `paginate`:

```ts
return this.paginate({
  page: query.page,
  limit: query.limit,
  args: {
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  },
});
```

## Tạo module mới

1. Tạo folder trong `src/modules/<domain>`.
2. Tạo `<domain>.controller.ts`, `<domain>.service.ts`, `<domain>.module.ts`.
3. Nếu cần database, tạo `repositories/<domain>.repository.ts`.
4. DTO đặt trong `dto/`, entity/view model đặt trong `entities/` nếu cần.
5. Import module mới vào `AppModule`.
6. Controller không gọi Prisma trực tiếp.
7. Service không trả field nhạy cảm ra response.
