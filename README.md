# NestJS Production Base

Base code backend NestJS cho dự án production: TypeScript, PostgreSQL, Prisma, Docker, JWT auth, ConfigModule, Joi env validation và cấu trúc tách controller/service/repository rõ ràng.

## Yêu cầu

- Node.js + npm
- Docker + Docker Compose

## Hướng dẫn chạy nhanh

Chạy trong thư mục dự án:

```bash
cd /home/hiunt/Documents/Backlog/be_02
npm install
```

Tạo file môi trường nếu chưa có:

```bash
cp .env.example .env
```

Kiểm tra các biến quan trọng trong `.env`:

```env
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=be_02
POSTGRES_SCHEMA=public
DOCKER_POSTGRES_HOST=postgres
JWT_ACCESS_SECRET=change-me-access-secret
JWT_REFRESH_SECRET=change-me-refresh-secret
REDIS_HOST=localhost
DOCKER_REDIS_HOST=redis
REDIS_PORT=6379
```

`JWT_ACCESS_SECRET` và `JWT_REFRESH_SECRET` cần tối thiểu 16 ký tự.

PostgreSQL dùng qua Prisma cho dữ liệu quan hệ và user/auth.

## Cách khuyên dùng khi dev/debug

Trong lúc code nhanh, chỉ chạy database/service phụ bằng Docker. NestJS chạy local bằng terminal để xem `console.log`, đặt breakpoint và reload nhanh hơn.

```bash
npm run dev:infra
```

Lệnh này chạy:

```text
postgres
redis
```

Generate Prisma client và apply migration:

```bash
npm run prisma:generate
npm run prisma:deploy
```

Seed admin mẫu nếu database mới:

```bash
npm run db:seed
```

Chạy NestJS local:

```bash
npm run start:dev
```

Hoặc chạy kèm debugger:

```bash
npm run start:debug
```

Có thể dùng lệnh gộp cho local dev:

```bash
npm run dev:local
```

Hoặc lệnh gộp cho debug:

```bash
npm run dev:debug
```

API mặc định chạy ở:

```text
http://localhost:3000/api/v1
```

Kiểm tra API:

```bash
curl http://localhost:3000/api/v1/health
```

Xem log service phụ:

```bash
npm run dev:infra:logs
```

Tắt service phụ:

```bash
npm run dev:infra:down
```

## Chạy full bằng Docker

Khi muốn test gần giống production hoặc chạy theo team/CI, dùng Docker Compose full:

```bash
docker compose up --build
```

API mặc định chạy ở:

```text
http://localhost:3000/api/v1
```

## Start dev local

```bash
npm run dev:infra
npm run start:dev
```

## Debug local

Debug nhanh bằng log:

```ts
console.log('LOGIN DTO:', dto);
console.dir(user, { depth: null });
```

Nếu muốn dừng request giống `dd()` trong Laravel:

```ts
console.dir(user, { depth: null });
throw new Error('DEBUG STOP');
```

Debug bằng breakpoint:

```bash
npm run dev:debug
```

Sau đó attach debugger từ VS Code/WebStorm vào Node port `9229`.

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

Seed dữ liệu mẫu:

```bash
npm run db:seed
```

Seed tạo dữ liệu sau:

| Entity | Chi tiết |
|---|---|
| User | `admin@example.com` / `Admin@123456` (ADMIN, đã verify) |
| Board | `PIPC Board`, boardCode `PIPC`, type PUBLIC |
| BoardMember | Admin → board PIPC (role ADMIN) |
| Columns | To Do, In Progress, Resolved, Closed (position 0-3) |
| IssueTypes | Task, Bug |
| Version | v1.0.0 |
| Cards | PIPC-1 (To Do), PIPC-2 (In Progress) |

Seed dùng `upsert` nên chạy lại nhiều lần không lỗi.

## Reset database dev

Khi schema thay đổi lớn hoặc dữ liệu dev bị sai:

```bash
# 1. Dừng NestJS server
# 2. Reset database (xoá toàn bộ data + apply lại migration)
npx prisma migrate reset --force

# 3. Seed lại dữ liệu
npm run db:seed

# 4. Build để verify
npm run build
```

> **Lưu ý:** Chỉ dùng cho database local/dev. Không dùng cho database production.

## Smoke test

Chạy smoke test tất cả API endpoints:

```bash
bash scripts/smoke-test.sh
```

Script sẽ login bằng user dev, gọi các endpoint chính và in kết quả pass/fail.


## Logging

Dự án dùng custom logger dựa trên NestJS `ConsoleLogger`.

Khi chạy local bằng terminal, `console.log` và Nest logger hiện trực tiếp trong terminal đang chạy:

```bash
npm run start:dev
```

Khi chạy full Docker, xem log API bằng:

```bash
docker compose logs -f api
```

Đồng thời log app được ghi vào file:

```text
logs/app.log
logs/error.log
```

- `logs/app.log`: ghi tất cả level log/warn/error/debug/verbose/fatal.
- `logs/error.log`: chỉ ghi lỗi `error` và `fatal`.

Khi API lỗi, response sẽ có thêm `requestId` để đối chiếu với file log:

```json
{
  "statusCode": 500,
  "requestId": "d5d19d7f-cc4f-42cf-9183-2d83f5d0cf49",
  "path": "/api/v1/users",
  "method": "POST",
  "message": "Internal server error"
}
```

Trong file log, tìm theo `requestId` để xem stack trace và thông tin chi tiết.

## API mẫu

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `GET /api/v1/users`
- `GET /api/v1/users/:id`
- `POST /api/v1/users`
- `PATCH /api/v1/users/:id`
- `DELETE /api/v1/users/:id`
- `GET /api/v1/health`

Response success không phân trang:

```json
{
  "item": {}
}
```

Response success có phân trang:

```json
{
  "items": [],
  "total": 0
}
```

Response error được format dạng:

```json
{
  "statusCode": 400,
  "requestId": "d5d19d7f-cc4f-42cf-9183-2d83f5d0cf49",
  "path": "/api/v1/example",
  "method": "POST",
  "message": "Validation failed"
}
```

## Structure

```text
src/
  config/      ConfigModule config + Joi validation
  common/      decorator, guard, filter, interceptor, pipe, util, enum, constant
  database/    Prisma PostgreSQL connection module
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

## Tạo module mới

1. Tạo folder trong `src/modules/<domain>`.
2. Tạo `<domain>.controller.ts`, `<domain>.service.ts`, `<domain>.module.ts`.
3. Nếu cần database, tạo `repositories/<domain>.repository.ts`.
4. DTO đặt trong `dto/`, entity/view model đặt trong `entities/` nếu cần.
5. Import module mới vào `AppModule`.
6. Controller không gọi Prisma trực tiếp.
7. Service không trả field nhạy cảm ra response.
