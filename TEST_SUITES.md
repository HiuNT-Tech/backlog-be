# Backlog BE — Tài liệu Unit Test Suites

> Cập nhật: 2026-07-08 · Tổng: **39 suite / 486 test** (chạy `npx jest`, tất cả pass)
> Framework: Jest + ts-jest · Mock: `jest-mock-extended` (`mock` / `mockDeep`)

Tài liệu này giải thích **mỗi file `.spec.ts` test cái gì và để làm gì**. Tất cả đều là **unit test** (mock toàn bộ dependency, không đụng DB thật). Hạ tầng e2e (`test/e2e`, `test/factories`) đã có sẵn nhưng **chưa có file `*.e2e-spec.ts` nào**.

---

## Cách chạy

```bash
npx jest                          # chạy toàn bộ
npx jest src/modules/cards        # chạy theo path
npx jest --coverage               # kèm coverage
npx jest -t "should create"       # lọc theo tên test
```

> ⚠️ Nếu vừa đổi `schema.prisma` (ví dụ kiểu field), phải chạy `npx prisma generate` trước, nếu không ts-jest sẽ báo lỗi type do Prisma Client cũ. Khi nghi ngờ cache bẩn: `npx jest --clearCache`.

---

## Phân tầng test

| Tầng | Mock gì | Mục đích |
|------|---------|----------|
| **DTO** | không (chạy `class-validator`) | Kiểm tra rule validate của request body/query |
| **Repository** | `PrismaService` (`mockDeep`) | Kiểm tra đúng câu query Prisma (where/select/data) và mapping row → entity |
| **Service** | các repository + service khác | Kiểm tra business logic, nhánh lỗi, mapping sang response DTO |
| **Common (infra)** | tùy | Guard, interceptor, filter, util, exception dùng chung |

---

## 1. Common — Hạ tầng dùng chung

| File | Đối tượng | Test gì | Số test |
|------|-----------|---------|:---:|
| `common/dto/pagination-query.dto.spec.ts` | `PaginationQueryDto` | Validate & transform `page`/`limit`, giá trị mặc định, chặn giá trị âm/quá lớn | 9 |
| `common/exceptions/business.exception.spec.ts` | `BusinessException` | Exception nghiệp vụ gói đúng `errorCode` + HTTP status trong response | 4 |
| `common/filters/http-exception.filter.spec.ts` | `HttpExceptionFilter` | Bắt exception và chuẩn hóa body lỗi trả về client | 7 |
| `common/guards/jwt-auth.guard.spec.ts` | `JwtAuthGuard` | `canActivate` cho qua/chặn, `handleRequest` xử lý user hợp lệ / token lỗi | 7 |
| `common/guards/roles.guard.spec.ts` | `RolesGuard` | Cho qua/chặn theo role hệ thống (metadata `@Roles`) | 5 |
| `common/interceptors/response.interceptor.spec.ts` | `ResponseInterceptor` | Bọc response theo format thống nhất | 8 |
| `common/interceptors/timeout.interceptor.spec.ts` | `TimeoutInterceptor` | Ném timeout khi request quá hạn | 3 |
| `common/utils/crypto.util.spec.ts` | `crypto.util` | `hashPassword`/`comparePassword` (bcrypt), `generateRandomToken` | 5 |
| `common/utils/date.util.spec.ts` | `date.util` | `toIsoString` chuẩn hóa ngày | 2 |
| `common/utils/pagination.util.spec.ts` | `pagination.util` | `normalizeLimit`, `getPagePagination`, `getOffsetPagination`, `toPaginatedResponse` (clamp skip/limit) | 10 |
| `common/utils/string.util.spec.ts` | `string.util` | `normalizeString`, `normalizeEmail` (trim + lowercase) | 3 |
| `common/utils/url.util.spec.ts` | `url.util` | Build URL frontend: accept/register invitation, verify account, reset password | 7 |

---

## 2. Auth — Đăng nhập / Token

| File | Đối tượng | Test gì | Số test |
|------|-----------|---------|:---:|
| `auth/dto/login.dto.spec.ts` | `LoginDto` | Bắt buộc email hợp lệ + password | 5 |
| `auth/dto/register.dto.spec.ts` | `RegisterDto` | Validate đăng ký (email, password mạnh, các field) | 9 |
| `auth/dto/forgot-password.dto.spec.ts` | `ForgotPasswordDto` | Validate email quên mật khẩu | 5 |
| `auth/dto/reset-password.dto.spec.ts` | `ResetPasswordDto` | Validate token + password mới | 7 |
| `auth/repositories/refresh-token.repository.spec.ts` | `RefreshTokenRepository` | `create`, `findActiveByHash`, `rotate`, `revokeByHash`, `revokeAllForUser` — đúng query Prisma cho refresh token | 6 |
| `auth/token.service.spec.ts` | `TokenService` | Ký access/refresh token, `verifyRefreshToken`, `hashToken`, tính `getTokenExpiresAt` | 11 |
| `auth/auth.service.spec.ts` | `AuthService` | `register` (chặn email trùng, default displayName từ email, gửi verify email, chặn khi thiếu verifyToken), `login` (sai email/password/inactive, tạo phiên refresh-token), `verifyAccount` (not found/đã verify/sai token, bind pending invitation), `forgotPassword`/`resetPassword` (token hết hạn, revoke session), `refreshToken` (verify JWT, tìm session theo hash, rotate token mới), `logout`, `me` | 29 |

---

## 3. Boards — Bảng & phân quyền theo bảng

| File | Đối tượng | Test gì | Số test |
|------|-----------|---------|:---:|
| `boards/board-access.service.spec.ts` | `BoardAccessService` | `ensureMember` (phải là thành viên bảng), `ensureRole` (phải đúng role ADMIN/PM/…) — lõi phân quyền theo bảng | 7 |
| `boards/repositories/boards.repository.spec.ts` | `BoardsRepository` | Toàn bộ query: tìm bảng theo id/code, list theo user, chi tiết bảng, list card, tạo bảng kèm mặc định, cập nhật, đếm card/column, tìm user trong bảng, đếm admin, đổi role thành viên, xóa mềm thành viên | 23 |

> Ghi chú phân quyền: từ bản refactor mới, **service của versions/columns/issue-types không tự check membership nữa** — việc đó chuyển lên controller qua `BoardRolesGuard` + decorator `@BoardMember()` / `@BoardRoles(...)`. Riêng `CardsService` vẫn tự gọi `boardAccessService.ensureRole(...)` bên trong service.

---

## 4. Cards — Thẻ công việc

| File | Đối tượng | Test gì | Số test |
|------|-----------|---------|:---:|
| `cards/cards.service.spec.ts` | `CardsService` | `create` (check role contributor, column thuộc board, khoảng ngày hợp lệ, assignee/issueType/version thuộc board), `findOne`, `update`, `findByBoard`, `move` (+ validate card thuộc column), `ensureCardAccessible` (dùng bởi comments) | 41 |

> Là suite lớn nhất. `priority` giờ là **số** (`1=LOW, 2=MEDIUM, 3=HIGH`) — dùng enum local `@common/enums/priority.enum`, **không** phải enum của Prisma.

---

## 5. Columns — Cột (trạng thái)

| File | Đối tượng | Test gì | Số test |
|------|-----------|---------|:---:|
| `columns/columns.service.spec.ts` | `ColumnsService` | `findAll` (map + `_count.cards`), `create` (gắn `cards: []`), `update` (column thuộc board, validate card thuộc column, xử lý update trả null), `remove` (xóa mềm kèm card) | 13 |

---

## 6. Comments — Bình luận

| File | Đối tượng | Test gì | Số test |
|------|-----------|---------|:---:|
| `comments/dto/comment.dto.spec.ts` | `CreateCommentDto`, `UpdateCommentDto`, `ListCommentsQueryDto` | Validate nội dung comment và query phân trang | 19 |
| `comments/repositories/comments.repository.spec.ts` | `CommentsRepository` | `findActiveById`, `findActiveOwnershipById` (check chủ sở hữu), `findByCard`, `create`, `update`, `softDelete` | 17 |
| `comments/comments.service.spec.ts` | `CommentsService` | `create` (check quyền truy cập card qua `ensureCardAccessible` với `BOARD_CONTRIBUTOR_ROLES`), `findByCard`, `update`, `remove` (chỉ chủ comment) | 11 |

---

## 7. Invitations — Lời mời vào bảng

| File | Đối tượng | Test gì | Số test |
|------|-----------|---------|:---:|
| `invitations/invitations.service.spec.ts` | `InvitationsService` | `createForBoard` (board/inviter tồn tại, normalize email, chặn nếu đã là thành viên qua `boardMembersService.getActiveMemberByEmail`, chọn URL accept/register theo user active hay chưa, gửi email, map P2002 → `INVITATION_ALREADY_PENDING`), `listForBoard` (expire pending trước, lọc theo status), `revoke` (board/invitation not found, xóa + trả record trước khi xóa), `findByToken` (invitation/board not found), `accept`/`decline` (khớp user qua id hoặc email, status không PENDING, hết hạn → `markExpired`, race condition khi repository trả null), `listMine` (expire rồi list theo user), `bindPendingByEmail` (skip khi user inactive) | 41 |

---

## 8. Issue Types — Loại issue

| File | Đối tượng | Test gì | Số test |
|------|-----------|---------|:---:|
| `issue-types/issue-types.service.spec.ts` | `IssueTypesService` | `findAll` (map + `issueCount`), `create`/`update` (check trùng tên, map P2002 → `ISSUE_TYPE_NAME_EXISTS`), `remove`, `ensureBelongsToBoard` | 18 |

---

## 9. Me — Hồ sơ người dùng hiện tại

| File | Đối tượng | Test gì | Số test |
|------|-----------|---------|:---:|
| `me/dto/update-profile.dto.spec.ts` | `UpdateProfileDto` | Validate cập nhật hồ sơ (displayName, avatar, phone) | 8 |
| `me/dto/change-password.dto.spec.ts` | `ChangePasswordDto` | Validate mật khẩu cũ/mới | 7 |
| `me/me.service.spec.ts` | `MeService` | `getProfile`, `updateProfile`, `changePassword` | 3 |

---

## 10. Users — Người dùng (quản trị)

| File | Đối tượng | Test gì | Số test |
|------|-----------|---------|:---:|
| `users/dto/create-user.dto.spec.ts` | `CreateUserDto` | Validate tạo user | 12 |
| `users/dto/update-user.dto.spec.ts` | `UpdateUserDto` | Validate cập nhật user | 9 |
| `users/dto/verify-account.dto.spec.ts` | `VerifyAccountDto` | Validate id + token xác thực tài khoản | 7 |
| `users/repositories/users.repository.spec.ts` | `UsersRepository` | Query có filter active/không, `createUser` (trim displayName, default từ email), update/updateProfile (bỏ field `undefined`, giữ `false`/`null`), verify/reset password, `softDelete` | 23 |
| `users/users.service.spec.ts` | `UsersService` | Luồng nghiệp vụ đầy đủ: create, createForRegistration, findAll/findOne, findByEmail, findByIdForAuth, verifyAccount, update/remove, updateProfile, changePassword, set/reset password | 25 |

---

## 11. Versions — Phiên bản

| File | Đối tượng | Test gì | Số test |
|------|-----------|---------|:---:|
| `versions/dto/version.dto.spec.ts` | `CreateVersionDto`, `UpdateVersionDto`, `ListVersionsQueryDto` | Validate tên, ngày, mô tả, query | 27 |
| `versions/repositories/versions.repository.spec.ts` | `VersionsRepository` | `findActiveByBoardAndId`, `findByBoard` (filter keyword, phân trang, clamp), `create`/`update` (parse ngày, chỉ set field có mặt), `delete` | 14 |
| `versions/versions.service.spec.ts` | `VersionsService` | `findAll`, `create`/`update` (validate khoảng ngày, fallback ngày cũ khi dto thiếu), `findOne`/`remove` (not found → 404), `ensureBelongsToBoard` | 19 |

---

## Coverage (số liệu thực tế)

Chạy `npx jest --coverage` (hoặc `npm run test:cov`). Số liệu ngày 2026-07-08:

> 📊 **Dashboard trực quan tự cập nhật:** mỗi lần chạy `npm run test:cov`, file **`coverage/dashboard.html`** tự động được sinh lại (xem `test/generate-coverage-dashboard.js`, chạy như Jest `globalTeardown`). Mở file này bằng trình duyệt để xem % coverage theo module/file dạng biểu đồ thanh, màu theo mức độ (đỏ/cam/vàng/xanh), không cần publish hay upload đi đâu. Thư mục `coverage/` đã được gitignore nên file này không bị commit. Chạy `npm test` (không `--coverage`) thì dashboard **không** được cập nhật (không có dữ liệu coverage).
> Jest cũng có sẵn báo cáo tương tác từng dòng code tại `coverage/index.html`.

### Tổng quan — `All files`

| Metric | Hiện tại | Ngưỡng (`coverageThreshold.global`) | Đạt? |
|--------|:---:|:---:|:---:|
| Statements | **54.18%** (↑ từ 47.22%) | 80% | ❌ |
| Branches | **54.14%** (↑ từ 40.5%) | 75% | ❌ |
| Functions | **47.5%** (↑ từ 42.51%) | 80% | ❌ |
| Lines | **54.16%** (↑ từ 46.69%) | 80% | ❌ |

> ⚠️ **Đang KHÔNG đạt ngưỡng** đã cấu hình trong `package.json` → nếu bật enforce trong CI thì `test:cov` sẽ **fail**. Con số tổng bị kéo xuống chủ yếu vì controller / provider / config / shared / strategy **chưa có test nào** (0%), chứ không phải phần business logic. Riêng `src/common/` cũng chưa đạt ngưỡng 90/85 do các thư mục `logger`, `upload`, `decorators` còn 0%.

### Phần đã test kỹ (≈100% statements)

Đây là các file business logic được unit test bao phủ gần như trọn vẹn:

| File | Stmts | Branch | Ghi chú |
|------|:---:|:---:|------|
| `common/exceptions/*`, `common/guards/*`, `common/interceptors/*` | 100% | 100% | Hạ tầng dùng chung |
| `common/utils/*` | 100% | 90% | `pagination.util` sót 1 nhánh (dòng 57) |
| `common/filters/http-exception.filter.ts` | 93.87% | 77.27% | Sót vài nhánh 82/130/138 |
| `auth/auth.service.ts` | 100% | 100% | Thêm 2026-07-08, phủ toàn bộ 8 method public (register/login/verifyAccount/forgotPassword/resetPassword/refreshToken/logout/me) |
| `auth/token.service.ts` | 100% | 100% | |
| `auth/repositories/refresh-token.repository.ts` | 100% | 100% | |
| `boards/board-access.service.ts` | 100% | 100% | |
| `boards/repositories/boards.repository.ts` | 100% | 100% | |
| `cards/cards.service.ts` | 98.11% | 97.43% | Sót dòng 397, 424 |
| `columns/columns.service.ts` | 100% | 100% | |
| `comments/comments.service.ts` | 100% | 100% | |
| `comments/repositories/comments.repository.ts` | 100% | 100% | |
| `issue-types/issue-types.service.ts` | 100% | 100% | |
| `me/me.service.ts` | 100% | 100% | |
| `users/users.service.ts` | 100% | 100% | |
| `users/repositories/users.repository.ts` | 100% | 100% | |
| `versions/versions.service.ts` | 100% | 100% | |
| `versions/repositories/versions.repository.ts` | 100% | 100% | |
| `invitations/invitations.service.ts` | 100% | 100% | Thêm 2026-07-08, phủ toàn bộ 8 method public (createForBoard/listForBoard/revoke/findByToken/accept/decline/listMine/bindPendingByEmail) |

### Phần test một phần (cần bổ sung)

| File | Stmts | Thiếu gì |
|------|:---:|------|
| `board-members/repositories/board-members.repository.ts` | **43.75%** | Chỉ được chạm gián tiếp; `findActiveMember` / `findActiveMemberByEmail` / `upsert` / `updateRole` / `softDelete` chưa có test riêng (dòng 28-108) |
| `database/prisma/repositories/base-prisma.repository.ts` | 41.93% | Base class dùng chung, phần `paginate`/helper chưa test hết (dòng 75-95, 158-223) |
| `providers/brevo.provider.ts` | 32.14% | Chỉ chạm khi mock; logic gửi email thật chưa test (17-73) |

### Phần chưa test (0% — khoảng trống lớn nhất)

- **Controller (0/11)**: `app`, `auth`, `boards`, `cards`, `columns`, `comments`, `invitations`, `issue-types`, `me`, `versions`, `health` — toàn bộ 0%. Guard/pipe/DTO wiring ở tầng HTTP không được verify.
- **Service 0% / rất thấp**:
  - `boards/boards.service.ts` — **9.34%**.
  - `health/health.service.ts` — **0%**.
  - `board-members/board-members.service.ts` — chưa có spec riêng.
- **Repository chưa test**: `cards.repository` (20.4%), `columns.repository` (25%), `issue-types.repository` (26.92%), `invitations.repository` (24.32%), `board-members.repository` (43.75%).
  - ⚠️ `board-members.repository` giữ `findActiveMember` / `findActiveMemberByEmail` (đã chuyển ra khỏi `BoardsRepository`) nhưng chưa có test bù lại.
- **Guard/decorator phân quyền bảng**: `boards/guards/board-roles.guard.ts` (0%), `boards/decorators/board-roles.decorator.ts` (0%) — lõi kiểm soát quyền HTTP nhưng chưa test.
- **Shared/infra**: `shared/queue`, `shared/redis`, `shared/storage`, `common/logger`, `common/upload`, `common/decorators`, `config/*`, `auth/strategies` — hầu hết 0%.
- **E2E**: hạ tầng `test/e2e` + `test/factories` (9 factory) đã dựng sẵn nhưng chưa có file `*.e2e-spec.ts` nào.

### Ưu tiên đề xuất để nâng coverage

1. ~~**`auth.service.ts`**~~ ✅ Đã xong 2026-07-08 — 100% statements/branches/functions/lines (29 test).
2. ~~**`invitations.service.ts`**~~ ✅ Đã xong 2026-07-08 — 100% statements/branches/functions/lines (41 test, bù accept/decline/revoke/findByToken/listMine/bindPendingByEmail).
3. **`boards.service.ts`** (9%) và các repository chưa test (cards/columns/issue-types/invitations/board-members).
4. **Controller + `board-roles.guard`** — hoặc bằng unit test controller, hoặc bằng **e2e** (đã có sẵn factory) để phủ luôn tầng HTTP + guard.
