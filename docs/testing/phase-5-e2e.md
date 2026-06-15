# Phase 5 — E2E Tests (Postgres thật)

> **Mục tiêu:** Kiểm thử luồng HTTP đầu-cuối qua `supertest`, chạy trên **Postgres thật**, để bao phủ những thứ unit test không thể: guard/interceptor/filter thật, ràng buộc DB (unique, FK, soft-delete), transaction, cookie auth, throttler.
> **Phụ thuộc:** Phase 0. Cần **Docker** (Testcontainers) hoặc Postgres service trong CI.
> **Ưu tiên:** Trung bình.

---

## 1. Hạ tầng e2e

`test/jest-e2e.json` đã có sẵn. Bổ sung `moduleNameMapper` (giống jest unit) + `setupFilesAfterEnv` nếu cần.

### Spin Postgres bằng Testcontainers

```ts
// test/e2e/setup-e2e.ts
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { execSync } from 'node:child_process';

export async function startTestDb(): Promise<StartedPostgreSqlContainer> {
  const container = await new PostgreSqlContainer('postgres:16-alpine').start();
  process.env.DATABASE_URL = container.getConnectionUri();
  // Áp schema vào DB tạm
  execSync('npx prisma migrate deploy', {
    env: { ...process.env },
    stdio: 'inherit',
  });
  return container;
}
```

### Bootstrap app trong test (đồng bộ với `main.ts`)

```ts
// test/e2e/create-app.ts
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { AppModule } from '@/app.module';

export async function createE2EApp() {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.enableVersioning({ type: VersioningType.URI });
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  // Lưu ý: HttpExceptionFilter & guards đăng ký qua CommonModule (APP_GUARD) nên tự áp dụng.
  await app.init();
  return app;
}
```

> **Email/Brevo:** override `EMAIL_PROVIDER` bằng mock trong `Test.createTestingModule(...).overrideProvider(EMAIL_PROVIDER).useValue({ sendEmail: jest.fn() })` để không gửi mail thật.
> **Redis (health):** override `RedisService` hoặc spin Redis container; hoặc bỏ qua health e2e.

### Reset dữ liệu giữa các test
`TRUNCATE ... RESTART IDENTITY CASCADE` ở `beforeEach`, hoặc tạo board/user mới mỗi test với mã ngẫu nhiên.

---

## 2. Danh sách suite e2e

| File | Phủ |
|------|-----|
| `test/e2e/auth.e2e-spec.ts` | đăng ký → verify → login → me → refresh → logout |
| `test/e2e/boards.e2e-spec.ts` | tạo/list/detail/update + phân quyền |
| `test/e2e/cards.e2e-spec.ts` | tạo/list/filter/update/move |
| `test/e2e/columns.e2e-spec.ts` | CRUD + unique title |
| `test/e2e/issue-types.e2e-spec.ts` | CRUD + unique name + count |
| `test/e2e/versions.e2e-spec.ts` | CRUD + date range + unique name |
| `test/e2e/health.e2e-spec.ts` | (tùy chọn) ping |

---

## 3. Case chính từng suite

### `auth.e2e-spec.ts`
| Flow | Khẳng định |
|------|-----------|
| `POST /auth/register` | 201; user trả về không có password; (mock) sendEmail được gọi |
| register trùng email | 409 + errorCode USER_EMAIL_EXISTS |
| login khi chưa verify | 401 (user inactive) |
| verify-account token sai | 406 |
| verify-account hợp lệ | 200; user `isActive=true` |
| `POST /auth/login` | 200; **Set-Cookie** accessToken + refreshToken (httpOnly) |
| `GET /auth/me` không cookie/token | 401 |
| `GET /auth/me` có token | 200; đúng user |
| `GET /auth/refresh_token` | 200; cookie mới; session cũ bị revoke (refresh lại bằng token cũ → 401) |
| `DELETE /auth/logout` | 200; cookie bị clear; refresh sau đó → 401 |
| throttle | gọi `login` quá `@RateLimit(5)` → 429 |

> Lấy token để gọi API có auth: dùng `agent = request.agent(app.getHttpServer())` để giữ cookie, hoặc đọc `Set-Cookie` rồi gắn thủ công.

### `boards.e2e-spec.ts`
| Case | Khẳng định |
|------|-----------|
| `POST /boards` | 201; tự tạo creator là member **ADMIN** + columns mặc định (`DEFAULT_COLUMNS`) |
| boardCode trùng | 409 |
| `GET /boards` | chỉ trả board user là member |
| `GET /boards/:id` bởi non-member | 403 |
| `PUT /boards/:id` bởi MEMBER (không ADMIN/PM) | 403 |
| đổi boardCode khi đã có card | 400 |
| board không tồn tại | 404 |

### `cards.e2e-spec.ts`
| Case | Khẳng định |
|------|-----------|
| `POST /cards` | 201; cardNumber tăng dần; cardCode `=` `${boardCode}-${n}` |
| tạo card thứ 2 | cardNumber +1 (kiểm tra `nextCardNumber` atomic) |
| startDate > dueDate | 400 |
| assignee không phải member | 403 |
| `GET` list filter theo `assigneeUserId`/`priorityId` (CSV) | trả đúng tập |
| `move` đổi column + vị trí | 200; vị trí prev/next cập nhật đúng trong DB |
| move với payload sai (nextCards thiếu currentCard) | 400 |

### `columns / issue-types / versions .e2e-spec.ts`
| Case | Khẳng định |
|------|-----------|
| CRUD cơ bản | 201/200/200 |
| tạo trùng `title`/`name` trong board | 409 (unique `[boardId, title/name]`) |
| xóa (soft delete) | record không còn trong list; `deletedAt` được set |
| columns: xóa column | card thuộc column cũng bị soft delete |
| versions: startDate > endDate | 400 |
| thao tác ghi bởi MEMBER | 403 (chỉ ADMIN/PM) |

---

## 4. Lưu ý & rủi ro

- **Cần Docker** cho Testcontainers. Nếu CI không có Docker-in-Docker → dùng `services: postgres` của GitHub Actions/GitLab và set `DATABASE_URL` env, bỏ phần spin container.
- **Tốc độ:** e2e chậm hơn unit nhiều → chạy riêng (`npm run test:e2e`), không gộp vào `npm test`.
- **Cô lập:** mỗi test nên độc lập dữ liệu (truncate hoặc random mã) để tránh phụ thuộc thứ tự.
- **Override external:** luôn mock `EMAIL_PROVIDER`; cân nhắc mock `RedisService` nếu không spin Redis.
- **Throttler:** test 429 có thể gây nhiễu các test khác → đặt riêng hoặc reset throttler storage.

---

## Definition of Done — Phase 5
- [ ] Hạ tầng e2e chạy được local (`npm run test:e2e` xanh) với Postgres thật.
- [ ] 6 suite e2e (auth/boards/cards/columns/issue-types/versions) xanh.
- [ ] Khẳng định ràng buộc DB: unique, soft-delete cascade column→card, phân quyền 403, cookie auth, cardNumber atomic.
- [ ] (CI) job e2e cấu hình Postgres service và chạy được trên pipeline.

⬅️ Quay lại: [README — Tổng quan](./README.md)
