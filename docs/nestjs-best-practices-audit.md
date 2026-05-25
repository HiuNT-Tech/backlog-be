# Báo Cáo Sửa Lỗi NestJS Best Practices

Ngày cập nhật: 2026-05-24

Phạm vi: thư mục `be_02`, tức backend NestJS hiện tại. Thư mục `BE` là backend Express/MongoDB cũ nên không nằm trong phạm vi sửa lỗi NestJS này.

Cơ sở đánh giá: checklist từ `.codex/skills/nestjs-best-practices`, bao gồm kiến trúc, dependency injection, xử lý lỗi, bảo mật, hiệu năng, testing, database/ORM, thiết kế API, microservices, và DevOps.

## Tóm Tắt

Các lỗi đã ghi trong bản audit trước đã được xử lý trong code:

- Đã khóa các endpoint quản lý user bằng role admin.
- Đã bỏ quyền mutate `role` khỏi DTO tạo/sửa user.
- Đã bỏ verification token khỏi response DTO.
- Đã bỏ việc copy verification token sang `userCode`.
- Đã xác nhận FE hiện tại không consume `verifyToken` trong response.
- Đã đổi register thành luồng pending verification: register gửi verification email và không cấp access/refresh token.
- Đã cấu hình gửi verification email bằng Brevo Transactional Email API qua `BREVO_API_KEY`.
- Đã thêm refresh token session lưu bằng hash trong DB.
- Đã rotate refresh token khi refresh và revoke token khi logout.
- Đã thêm rate limiting bằng `@nestjs/throttler`.
- Đã bật shutdown hooks.
- Đã sửa các lỗi ESLint/Prettier.
- Đã thêm unit test và e2e test baseline.
- Đã bỏ `--passWithNoTests` khỏi scripts test.

## Các Thay Đổi Chính

### 1. Phân quyền user management

File liên quan:

- `be_02/src/modules/users/users.controller.ts`
- `be_02/src/modules/users/dto/create-user.dto.ts`
- `be_02/src/modules/users/dto/update-user.dto.ts`

Đã làm:

- Thêm `@Roles(Role.ADMIN)` ở `UsersController`.
- Xóa trường `role` khỏi `CreateUserDto`.
- Xóa trường `role` khỏi `UpdateUserDto`.
- `UsersService.create()` luôn tạo user thường với `Role.USER`.

Ghi chú thiết kế:

- Không nên dùng `users.role` cho role nghiệp vụ theo board/project như `ADMIN`, `PM`, `MEMBER`, `GUEST`.
- Với backlog/task app, role nghiệp vụ nên nằm ở bảng membership, ví dụ `board_members(boardId, userId, role)`.
- `users` chỉ nên lưu thông tin identity/account như email, password, display name, trạng thái active, verification token.
- Nếu cần super admin toàn hệ thống, dùng field riêng như `systemRole` hoặc `accountRole`, không dùng thay cho role trong board/project.
- Với scope hiện tại, role cố định theo board có thể dùng enum `BoardMemberRole`; chưa cần tách bảng `roles` riêng cho tới khi cần dynamic permissions.

### 2. Không leak verification token

File liên quan:

- `be_02/src/modules/users/dto/user-response.dto.ts`
- `be_02/src/modules/users/repositories/users.repository.ts`
- `be_02/test/unit/users/user-response.dto.spec.ts`

Đã làm:

- Xóa `verifyToken` khỏi `UserResponseDto`.
- Không còn set `userCode = verifyToken` khi tạo user.
- Thêm unit test đảm bảo response DTO không expose `password` hoặc `verifyToken`.

Ghi chú tương thích FE/legacy API:

- `verifyToken` vẫn là dữ liệu nội bộ trong DB để verify email. Thay đổi này chỉ bỏ token khỏi JSON response trả về client.
- FE hiện tại ở `/home/hiunt/Documents/Backlog/FE` không đọc `verifyToken` từ response.
- Trang register của FE chỉ dùng `response.email` sau `POST /v1/users/register` để redirect sang login với `registeredEmail`.
- Trang verify account của FE lấy `email` và `token` từ query string trong verification link, sau đó gọi `POST /v1/users/verify-account` với body `{ email, token }`.
- Register không cấp `accessToken` hoặc `refreshToken`. User phải verify account thành công trước, sau đó login mới được cấp token.
- Verification email được gửi trực tiếp từ `AuthService` qua Brevo Transactional Email API. Env cần có `BREVO_API_KEY`; sender lấy từ `MAIL_SENDER_EMAIL`/`MAIL_SENDER_NAME` hoặc fallback `ADMIN_EMAIL_ADDRESS`/`ADMIN_EMAIL_NAME`; link verify lấy từ `FRONTEND_URL` hoặc `WEBSITE_DOMAIN`.
- Vì vậy contract cần giữ cho legacy FE là:
  - `POST /v1/users/register` trả về user legacy có tối thiểu `_id`, `email`, `displayName`, `avatar`, `role`, `isActive`, `createdAt`, `updatedAt`, không trả `password` hoặc `verifyToken`.
  - Verification email link vẫn phải có dạng `/account/verification?email=<email>&token=<token>`.
  - `POST /v1/users/verify-account` vẫn nhận `{ email, token }` và trả về user legacy đã active, không trả `verifyToken`.
- `LegacyUsersController` đang dùng `@Res().json(...)` để trả response trực tiếp cho các endpoint `/users/*`, nên không bị bọc trong `{ item: ... }` bởi global `ResponseInterceptor`. Đây là điều kiện quan trọng để FE cũ không cần đổi parser response.

### 3. Refresh token rotation và revoke

File liên quan:

- `be_02/prisma/schema.prisma`
- `be_02/prisma/migrations/20260524000000_add_refresh_token_sessions/migration.sql`
- `be_02/src/modules/auth/repositories/refresh-token.repository.ts`
- `be_02/src/modules/auth/auth.service.ts`
- `be_02/src/modules/auth/token.service.ts`
- `be_02/src/modules/auth/legacy-users.controller.ts`

Đã làm:

- Thêm model `RefreshTokenSession`.
- Lưu refresh token bằng SHA-256 hash, không lưu raw token.
- Khi login thành công, tạo refresh token session mới.
- Khi register, chỉ tạo user pending verification và gửi verification email; không tạo refresh token session.
- Khi refresh, verify token, kiểm tra session còn active, tạo refresh token mới, revoke session cũ.
- Khi logout, revoke refresh token session hiện tại rồi clear cookie.
- Endpoint refresh hiện set lại cả `accessToken` và `refreshToken` cookie.

### 4. Rate limiting

File liên quan:

- `be_02/package.json`
- `be_02/src/app.module.ts`
- `be_02/src/common/common.module.ts`
- `be_02/src/modules/auth/auth.controller.ts`
- `be_02/src/modules/auth/legacy-users.controller.ts`

Đã làm:

- Cài `@nestjs/throttler`.
- Đăng ký `ThrottlerModule`.
- Đăng ký `ThrottlerGuard` bằng `APP_GUARD`.
- Thêm `@Throttle(...)` cho các endpoint public nhạy cảm như register, login, verify-account, refresh token.

### 5. Graceful shutdown

File liên quan:

- `be_02/src/main.ts`
- `be_02/src/database/prisma/prisma.service.ts`
- `be_02/src/shared/redis/redis.service.ts`

Đã làm:

- Thêm `app.enableShutdownHooks()` trong bootstrap.
- `PrismaService` và `RedisService` đã có lifecycle cleanup nên SIGTERM/SIGINT có thể kích hoạt teardown sạch hơn.

### 6. Lint và format

File liên quan:

- `be_02/src/database/seed/seed.ts`
- `be_02/src/modules/users/repositories/users.repository.ts`
- `be_02/src/modules/users/users.controller.ts`

Đã làm:

- Sửa catch handler trong seed để không còn `async` không có `await`.
- Bọc seed Prisma/Pool trong `try/finally` để disconnect sạch.
- Format lại các file bị Prettier báo lỗi.
- Đổi `uuid` sang `node:crypto.randomUUID()` để tránh lỗi Jest với ESM package và giảm dependency không cần thiết.

### 7. Test baseline

File liên quan:

- `be_02/package.json`
- `be_02/test/unit/users/user-response.dto.spec.ts`
- `be_02/test/unit/users/users.controller.spec.ts`
- `be_02/test/e2e/auth.e2e-spec.ts`

Đã làm:

- Bỏ `--passWithNoTests` khỏi `test` và `test:e2e`.
- Thêm unit test cho `UserResponseDto`.
- Thêm unit test kiểm tra `UsersController` yêu cầu `Role.ADMIN`.
- Thêm e2e test cho `POST /auth/login` qua Supertest.

## Kết Quả Verification

Các lệnh đã chạy từ thư mục `be_02`:

```bash
npm run build
npx prisma validate
npx eslint "{src,apps,libs,test}/**/*.ts"
npm test -- --runInBand
npm run test:e2e -- --runInBand
npm audit --audit-level=moderate
```

Kết quả:

- Build: pass.
- Prisma schema validation: pass.
- ESLint: pass.
- Unit tests: pass, 3 test suites, 4 tests.
- E2E tests: pass, 1 test suite, 1 test.
- NPM audit: pass, found 0 vulnerabilities.

Verification bổ sung cho tương thích FE:

```bash
rg -n 'verifyToken|verify_token|verificationToken' /home/hiunt/Documents/Backlog/FE
rg -n 'AuthService\.|verifyUser\(|verify-account|register' /home/hiunt/Documents/Backlog/FE
```

Kết quả kiểm tra FE:

- Không có usage `verifyToken` trong FE.
- FE register chỉ consume `response.email`.
- FE verify account dùng `email` và `token` từ query string trong verification link.

## Việc Còn Lại Cho Các Phase Sau

Những việc dưới đây không phải lỗi hiện tại trong `be_02`, nhưng nên làm khi migrate board/card modules:

1. Thêm bảng `boards`.
2. Thêm bảng `board_members` với enum `BoardMemberRole = ADMIN | PM | MEMBER | GUEST`.
3. Check permission theo board trước các thao tác board/column/card/version/issue-type.
4. Tách rõ role toàn hệ thống nếu cần super admin, và role theo board/project cho nghiệp vụ backlog.
