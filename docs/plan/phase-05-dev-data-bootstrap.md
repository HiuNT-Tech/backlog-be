# Phase 05 - Reset dữ liệu dev và seed tối thiểu

## Mục tiêu

Phase này không chuyển dữ liệu từ backend cũ. Dự án đang trong giai đoạn phát triển và chưa có dữ liệu thật cần giữ, nên ưu tiên DB sạch, schema đúng, seed tối thiểu để FE có dữ liệu kiểm thử.

## Nguyên tắc

1. Không viết script chuyển dữ liệu MongoDB sang PostgreSQL.
2. Không thêm field đối soát dữ liệu cũ chỉ để phục vụ dữ liệu không dùng tới.
3. Có thể reset database dev khi schema thay đổi lớn.
4. Seed chỉ tạo dữ liệu tối thiểu để smoke test FE, không giả lập dữ liệu production.
5. Dữ liệu seed phải chạy lại được nhiều lần hoặc có hướng dẫn reset rõ ràng.
6. Không hardcode password/token thật trong seed.
7. Seed phải tạo dữ liệu theo contract mới: `id`, `position`, enum string.
8. Seed phải tạo `boardCode`, `nextCardNumber`, `cardNumber`, `cardCode` đúng quy tắc ticket key.

## Việc cần làm

### [x] 1. Chuẩn hóa database dev

Chọn một cách chạy nhất quán cho môi trường dev:

```bash
npx prisma migrate dev
npm run prisma:generate
```

Nếu schema đang thay đổi nhiều và không cần giữ dữ liệu:

```bash
npx prisma migrate reset
```

Chỉ dùng reset cho database local/dev. Không dùng cho môi trường có dữ liệu thật.

### [x] 2. Tạo seed tối thiểu

Seed đề xuất:

- 1 user admin/dev đã verify.
- 1 board mẫu type `PUBLIC`.
- Board mẫu có `boardCode`, ví dụ `PIPC`, và `nextCardNumber` khớp với số card đã seed.
- Board member cho user dev với role `ADMIN`.
- 4 columns mặc định: To Do, In Progress, Resolved, Closed, position 0..3.
- 2 issue types mẫu: Task, Bug.
- 1 version mẫu nếu FE cần dropdown version có dữ liệu.
- 2 cards mẫu để kiểm tra board detail, issue list và drag/drop, có position rõ ràng.
- Card mẫu có `cardNumber` và `cardCode`, ví dụ `PIPC-1`, `PIPC-2`.

Vị trí đề xuất:

```txt
src/database/seed/seed.ts
```

Script hiện có:

```json
{
  "db:seed": "ts-node -r tsconfig-paths/register src/database/seed/seed.ts"
}
```

Chạy seed bằng:

```bash
npm run db:seed
```

### [x] 3. Dữ liệu mặc định khi tạo board

Ngay cả khi không chạy seed, API `POST /v1/boards` vẫn phải tự tạo 4 columns mặc định:

```txt
To Do       statusColor 7 position 0
In Progress statusColor 5 position 1
Resolved    statusColor 6 position 2
Closed      statusColor 4 position 3
```

Đây là behavior runtime, không phụ thuộc seed.

### [x] 4. Smoke test dữ liệu dev

Sau khi chạy Prisma migration/reset/seed, kiểm tra:

```txt
GET /v1/status
POST /v1/auth/login
GET /v1/boards
GET /v1/boards/:id
GET /v1/boards/:id/cards
GET /v1/boards/:id/issue-types
GET /v1/boards/:id/versions
```

Kỳ vọng:

- Login bằng user dev được.
- Board list có board mẫu nếu đã chạy seed.
- Board detail có `boardCode`, `columns`, `columns[].position`, `columns[].cards`, `cards[].cardCode`, `cards[].position`.
- Issue list trả `{ total, items }`.
- Issue type/version list trả `{ items, count }`.

### [x] 5. Tài liệu hóa cách reset

README hoặc docs vận hành dev cần ghi:

```bash
npx prisma migrate reset
npm run prisma:generate
npm run build
```

Nếu có seed:

```bash
npm run db:seed
```

## Reset trong dev

Vì không có dữ liệu thật, không cần script khôi phục dữ liệu riêng. Khi schema hoặc seed sai:

1. Sửa schema/seed/API liên quan.
2. Chạy lại `npx prisma migrate reset`.
3. Chạy lại seed.
4. Smoke test lại FE.

## Tiêu chí hoàn tất

- Không còn yêu cầu chuyển dữ liệu MongoDB.
- Schema PostgreSQL tạo được từ đầu trên database sạch.
- Seed dev chạy được hoặc có hướng dẫn tạo dữ liệu thủ công rõ ràng.
- FE có đủ dữ liệu để test dashboard, board, issue list, settings.
- `npx prisma validate`, `npm run prisma:generate`, `npm run build` pass.

## Progress Summary

- **Tasks Completed:** 5/5
- **Status:** Completed
