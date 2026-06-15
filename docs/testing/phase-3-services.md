# Phase 3 — Service Unit Tests (TRỌNG TÂM)

> **Mục tiêu:** Phủ toàn bộ business logic ở tầng service. Repository và mọi dependency được **mock** bằng `jest-mock-extended` → test nhanh, độc lập DB, phủ hết nhánh điều kiện.
> **Phụ thuộc:** Phase 0 (factory + `createServiceWithMocks`).
> **Ưu tiên:** ⭐⭐ Cao nhất — phần giá trị lớn nhất của cả kế hoạch.

---

## Khuôn mẫu chung cho 1 service spec

```ts
import { mock, MockProxy } from 'jest-mock-extended';
import { BoardsService } from './boards.service';
import { BoardsRepository } from './repositories/boards.repository';
import { BoardAccessService } from './board-access.service';
import { makeJwtPayload } from '../../../test/factories/jwt-payload.factory';

describe('BoardsService', () => {
  let service: BoardsService;
  let repo: MockProxy<BoardsRepository>;
  let access: MockProxy<BoardAccessService>;

  beforeEach(() => {
    repo = mock<BoardsRepository>();
    access = mock<BoardAccessService>();
    service = new BoardsService(repo, access); // hoặc qua createServiceWithMocks
  });

  // ...describe theo từng method
});
```

> Có thể `new Service(...mocks)` trực tiếp (đơn giản nhất) hoặc dùng `createServiceWithMocks`. Với service dùng **token provider** (AuthService có `EMAIL_PROVIDER`) thì khai báo provider thủ công.

---

## 1. `auth.service.spec.ts` ⭐ (quan trọng nhất)

Deps mock: `UsersService`, `TokenService`, `RefreshTokenRepository`, `ConfigService`, `EMAIL_PROVIDER`.

### `register`
| Case | Stub | Khẳng định |
|------|------|-----------|
| email đã tồn tại | `usersService.findByEmail` → user | ném `BusinessException` USER_EMAIL_EXISTS (409) |
| thành công | findByEmail→null; `createForRegistration`→user (có verifyToken) | gọi `sendVerificationEmail`; trả UserResponse; **không** chứa password |
| displayName mặc định | dto không có displayName | `createForRegistration` nhận `displayName = email.split('@')[0]` |
| gửi mail | — | `emailProvider.sendEmail` được gọi với URL chứa email+token |

### `login`
| Case | Khẳng định |
|------|-----------|
| user không tồn tại | INVALID_CREDENTIALS (401) |
| user `isActive=false` | INVALID_CREDENTIALS (401) |
| sai password (`comparePassword`→false) | INVALID_CREDENTIALS (401) |
| thành công | trả `accessToken`+`refreshToken`; gọi `refreshTokenRepository.create` với tokenHash + expiresAt |

> `comparePassword` là util import — mock bằng `jest.mock('@common/utils/crypto.util')` hoặc seed hash thật. Khuyến nghị `jest.spyOn` module.

### `verifyAccount`
| Case | Khẳng định |
|------|-----------|
| user không tồn tại | USER_NOT_FOUND (404) |
| đã `isActive` | USER_ALREADY_VERIFIED (406) |
| token sai (`dto.token !== user.verifyToken`) | INVALID_VERIFICATION_TOKEN (406) |
| thành công | gọi `usersService.verifyAccount(id, token)`; trả response |

### `refreshToken`
| Case | Khẳng định |
|------|-----------|
| token undefined | INVALID_TOKEN (401) |
| `verifyRefreshToken` throw | INVALID_TOKEN (401) |
| không có session active (`findActiveByHash`→null) | INVALID_TOKEN (401) |
| user null hoặc inactive | INVALID_TOKEN (401) |
| thành công | sign cả 2 token mới; gọi `refreshTokenRepository.rotate` với sessionId + newTokenHash; trả token mới |

### `logout`
| Case | Khẳng định |
|------|-----------|
| token undefined | không gọi repo (noop) |
| có token | gọi `revokeByHash(hash)` |

### `me`
| Case | Khẳng định |
|------|-----------|
| user null | INVALID_TOKEN (401) |
| inactive | USER_INACTIVE (401) |
| thành công | trả UserResponse |

### `sendVerificationEmail` (private — test gián tiếp qua register)
| Case | Khẳng định |
|------|-----------|
| user thiếu verifyToken | VERIFICATION_TOKEN_MISSING (500) |
| frontendUrl có dấu `/` cuối | URL được trim đúng |

---

## 2. `token.service.spec.ts`

Deps mock: `JwtService`, `ConfigService`.

| Method | Case |
|--------|------|
| `signAccessToken` | gọi `jwtService.signAsync` với secret/expiresIn của access |
| `signRefreshToken` | tương tự với cấu hình refresh |
| `verifyRefreshToken` | gọi `verifyAsync` với `jwt.refreshSecret` |
| `hashToken` | deterministic: cùng input → cùng hash; khác input → khác hash; là sha256 hex (64 ký tự) |
| `getTokenExpiresAt` | decode có `exp` → `Date(exp*1000)`; decode thiếu `exp` → ném `UnauthorizedException` |

---

## 3. `users.service.spec.ts`

Deps mock: `UsersRepository`.

| Method | Case |
|--------|------|
| `createForRegistration` | password được hash (≠ plaintext); role=USER; có verifyToken; gọi `createUser` |
| `findAll` | `normalizeSortBy` field hợp lệ giữ nguyên; field lạ → `'createdAt'`; map sang response; trả total |
| `findOne` | found → response; not found → USER_NOT_FOUND (404) |
| `findByEmail` | email được `normalizeEmail` trước khi query |
| `verifyAccount` | repo trả null → USER_NOT_FOUND; thành công → response |
| `update` | `findExistingById` null → USER_NOT_FOUND; repo update null → USER_NOT_FOUND; thành công → response |
| `remove` | not found → USER_NOT_FOUND; thành công → gọi `softDelete` |
| `toResponse` | response **không** chứa `password` |

---

## 4. `board-access.service.spec.ts`

Deps mock: `PrismaService` (mock `board.findFirst`, `boardMember.findFirst`).

| Method | Case | Kết quả |
|--------|------|---------|
| `ensureMember` | board null | `NotFoundException('Board not found')` |
| `ensureMember` | board ok, member null | `ForbiddenException` (not a member) |
| `ensureMember` | board ok, member ok | trả `{userId, role}` |
| `ensureRole` | role không nằm trong danh sách | `ForbiddenException` (no permission) |
| `ensureRole` | role hợp lệ | trả member |

---

## 5. `boards.service.spec.ts`

Deps mock: `BoardsRepository`, `BoardAccessService`.

### `create`
| Case | Khẳng định |
|------|-----------|
| boardCode đã tồn tại (`findByCode`→board) | `ConflictException` |
| repo ném `P2002` | `handleUniqueConflict` → `ConflictException` |
| repo trả null sau create | `NotFoundException('Board not found after creation')` |
| thành công | trả `BoardResponseDto` với `cards: []` |

### `findOne`
| Case | Khẳng định |
|------|-----------|
| ensureMember fail | lỗi propagate (Forbidden/NotFound) |
| board null | `NotFoundException` |
| thành công | gọi `findBoardCards`; gom card theo columnId đúng |

### `update`
| Case | Khẳng định |
|------|-----------|
| ensureRole fail (không ADMIN/PM) | Forbidden |
| board null | NotFound |
| đổi `boardCode` khi đã có card (`countCards>0`) | `BadRequestException` |
| đổi `boardCode` trùng board khác | `ConflictException` |
| `columns` không thuộc board | `BadRequestException` (ensureColumnsBelongToBoard) |
| chỉ đổi title | data chỉ chứa title; gọi `updateBoard` |
| không đổi gì (giá trị trùng cũ) | data rỗng, vẫn trả board |

### `findUsers`
| Case | Khẳng định |
|------|-----------|
| ensureMember | được gọi |
| map | `username` = phần trước `@` của email |

### Helpers
- `groupCardsByColumnId`: nhiều card cùng column gom đúng list; column không card → `[]`.

---

## 6. `cards.service.spec.ts` ⭐ (nhiều nhánh)

Deps mock: `CardsRepository`, `BoardAccessService`, `IssueTypesService`, `VersionsService`.

### `create`
| Case | Khẳng định |
|------|-----------|
| ensureMember fail | Forbidden |
| column không thuộc board | `NotFoundException('Column not found')` |
| startDate > dueDate | `BadRequestException` (date range) |
| assigneeUserId không phải member | `ForbiddenException` (assignee) |
| issueTypeId không thuộc board | NotFound (qua `issueTypesService.ensureBelongsToBoard`) |
| versionId không thuộc board | NotFound (qua `versionsService.ensureBelongsToBoard`) |
| `assigneeUserId = null` | bỏ qua check assignee |
| thành công | gọi `repo.create(dto, userId)`; trả response |

### `update`
| Case | Khẳng định |
|------|-----------|
| card not found | NotFound |
| đổi column (`dto.columnId !== card.columnId`) | `repo.update` nhận `columnChanged=true` |
| date range dùng fallback giá trị cũ của card | validate đúng |
| các validation assignee/issueType/version | giống create |

### `move`
| Case | Khẳng định |
|------|-----------|
| card not found | NotFound |
| prevColumn null hoặc khác board | `NotFoundException('Previous column not found')` |
| nextColumn null hoặc khác board | `NotFoundException('Next column not found')` |
| `card.columnId !== prevColumnId` | `BadRequestException` (not in previous column) |
| nextCards **không** chứa currentCardId | BadRequest |
| prevCards **chứa** currentCardId | BadRequest |
| trùng id trong prev/next | BadRequest (duplicate) |
| count prev không khớp | BadRequest (belong previous column) |
| count next không khớp | BadRequest (belong next column) |
| thành công | gọi `repo.move(dto)`; trả `{updateResult:'Successfully!'}` |

### Helpers
- `ensureDateRangeValid`: thiếu 1 trong 2 ngày → bỏ qua; start==due → hợp lệ; start>due → throw.
- `toDateInput`: null/undefined → undefined; Date → `'YYYY-MM-DD'`.

---

## 7. `columns.service.spec.ts`

Deps mock: `ColumnsRepository`, `BoardAccessService`.

| Method | Case |
|--------|------|
| `findAll` | ensureMember gọi; map response |
| `create` | ensureRole (ADMIN/PM) gọi; trả response có `cards: []` |
| `update` | column không thuộc board → NotFound; ensureRole; `cards` không thuộc column → BadRequest; repo null → NotFound; thành công |
| `remove` | column không thuộc board → NotFound; ensureRole; gọi `softDeleteWithCards`; trả message |
| `ensureCardsBelongToColumn` | count khớp → ok; lệch → BadRequest |
| `toColumnResponse` | có `_count` thì kèm, không thì bỏ |

---

## 8. `issue-types.service.spec.ts`

Deps mock: `IssueTypesRepository`, `BoardAccessService`.

| Method | Case |
|--------|------|
| `findAll` | ensureMember; trả `{items, count}` |
| `create` | ensureRole; tên đã tồn tại → `ConflictException`; repo P2002 → Conflict; thành công → `issueCount:0` |
| `update` | không thuộc board → NotFound; ensureRole; đổi tên trùng → Conflict; P2002 → Conflict; thành công |
| `remove` | không thuộc board → NotFound; ensureRole; gọi `delete`; message |
| `ensureBelongsToBoard` | null → NotFound; ok → record |
| `ensureNameAvailable` | existing khác id → Conflict; existing cùng id → bỏ qua |

---

## 9. `versions.service.spec.ts`

Deps mock: `VersionsRepository`, `BoardAccessService`.

| Method | Case |
|--------|------|
| `findAll` | ensureMember; `{items, count}` |
| `create` | ensureRole; startDate > endDate → BadRequest; thành công |
| `findOne` | ensureMember; không thuộc board → NotFound |
| `update` | không thuộc board → NotFound; ensureRole; date range dùng **fallback giá trị cũ** khi dto thiếu; thành công |
| `remove` | không thuộc board → NotFound; ensureRole; gọi `delete` |
| `ensureBelongsToBoard` | null → NotFound |
| `ensureDateRangeValid` | nhận cả `string | Date | null` |

---

## Definition of Done — Phase 3
- [ ] 9 file service spec xanh.
- [ ] Mọi nhánh ném exception đều có test khẳng định đúng **loại exception + errorCode/message**.
- [ ] Khẳng định response **không rò rỉ** `password`/field nhạy cảm.
- [ ] Coverage `modules/**/services` ≥ 85% statements, ≥ 80% branches.

➡️ Tiếp theo: [Phase 4 — Repositories](./phase-4-repositories.md)
