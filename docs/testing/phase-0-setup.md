# Phase 0 — Hạ tầng Test (Setup)

> **Mục tiêu:** Dựng nền tảng để mọi phase sau viết test nhanh, nhất quán, ít boilerplate.
> **Output:** dependencies, jest config bổ sung, thư mục `test/` với factory + helper dùng chung.
> **Ưu tiên:** ⭐ Bắt buộc làm trước tất cả các phase khác.

---

## 1. Cài đặt dependencies

```bash
npm i -D jest-mock-extended
# Cho e2e (Phase 5) — chọn 1:
npm i -D @testcontainers/postgresql   # khuyến nghị (DB tự spin trong Docker)
# hoặc dùng Postgres service container trong CI (không cần lib này)
```

- `jest-mock-extended`: tạo mock **type-safe** cho repository/dependency: `mock<BoardsRepository>()`.
- `@testcontainers/postgresql`: spin Postgres tạm cho e2e (Phase 5).

---

## 2. Bổ sung Jest config

Jest đã cấu hình sẵn trong `package.json` (`ts-jest`, `testRegex: .*\.spec\.ts$`, `moduleNameMapper` đủ alias). Chỉ cần thêm **coverage threshold** và **setup file**.

```jsonc
// package.json → "jest"
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testRegex": ".*\\.spec\\.ts$",
  "transform": { "^.+\\.(t|j)s$": "ts-jest" },
  "moduleNameMapper": {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@common/(.*)$": "<rootDir>/src/common/$1",
    "^@config/(.*)$": "<rootDir>/src/config/$1",
    "^@database/(.*)$": "<rootDir>/src/database/$1",
    "^@modules/(.*)$": "<rootDir>/src/modules/$1",
    "^@shared/(.*)$": "<rootDir>/src/shared/$1"
  },
  "collectCoverageFrom": [
    "src/**/*.(t|j)s",
    "!src/**/*.module.ts",
    "!src/**/*.dto.ts",
    "!src/main.ts",
    "!src/database/seed/**",
    "!src/**/decorators/*-swagger.decorator.ts"
  ],
  "coverageDirectory": "coverage",
  "testEnvironment": "node",
  "coverageThreshold": {
    "global": { "statements": 80, "branches": 75, "functions": 80, "lines": 80 },
    "src/common/": { "statements": 90, "branches": 85 }
  }
}
```

> `!` để loại module/dto/seed/swagger-decorator khỏi coverage (không chứa logic cần test).

---

## 3. Cấu trúc thư mục test dùng chung

```
test/
├── factories/
│   ├── jwt-payload.factory.ts
│   ├── user.factory.ts
│   ├── board.factory.ts
│   ├── card.factory.ts
│   ├── column.factory.ts
│   ├── version.factory.ts
│   └── issue-type.factory.ts
├── helpers/
│   ├── create-testing-module.ts
│   └── prisma-test.helper.ts      # dùng cho Phase 4 & 5
└── e2e/                            # Phase 5
    └── setup-e2e.ts
```

---

## 4. Factory — dữ liệu mẫu

Factory trả về object hợp lệ, cho phép override từng field. Giảm lặp và tránh "magic object" rải rác.

```ts
// test/factories/jwt-payload.factory.ts
import { JwtPayload } from '@/types/jwt-payload.type';
import { Role } from '@common/enums/role.enum';

export const makeJwtPayload = (over: Partial<JwtPayload> = {}): JwtPayload => ({
  userId: 1,
  email: 'user@example.com',
  role: Role.USER,
  ...over,
});
```

```ts
// test/factories/user.factory.ts
import { UserEntity } from '@modules/users/entities/user.entity';
import { Role } from '@common/enums/role.enum';

export const makeUserEntity = (over: Partial<UserEntity> = {}): UserEntity => ({
  id: 1,
  email: 'user@example.com',
  displayName: 'User',
  avatar: null,
  userCode: null,
  password: '$2b$10$hashedpassword',
  phone: null,
  role: Role.USER,
  verifyToken: null,
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  deletedAt: null,
  ...over,
});
```

> Viết tương tự cho `board.factory.ts`, `card.factory.ts`, `column.factory.ts`, `version.factory.ts`, `issue-type.factory.ts` — bám theo các `type ...Record`/`Select` trong service tương ứng.

---

## 5. Helper dựng TestingModule

Gói logic tạo service + auto-mock provider để mỗi spec gọn nhất có thể.

```ts
// test/helpers/create-testing-module.ts
import { Test } from '@nestjs/testing';
import { Type, Provider } from '@nestjs/common';
import { mock, MockProxy } from 'jest-mock-extended';

/**
 * Tạo instance của `target` với mọi dependency được mock bằng jest-mock-extended.
 * Trả về service thật + map các mock để assert/stub.
 */
export async function createServiceWithMocks<T>(
  target: Type<T>,
  deps: Type<unknown>[],
): Promise<{ service: T; mocks: Map<Type<unknown>, MockProxy<unknown>> }> {
  const mocks = new Map<Type<unknown>, MockProxy<unknown>>();
  const providers: Provider[] = deps.map((dep) => {
    const mocked = mock();
    mocks.set(dep, mocked);
    return { provide: dep, useValue: mocked };
  });

  const moduleRef = await Test.createTestingModule({
    providers: [target, ...providers],
  }).compile();

  return { service: moduleRef.get(target), mocks };
}
```

Ví dụ dùng trong spec:

```ts
const { service, mocks } = await createServiceWithMocks(BoardsService, [
  BoardsRepository,
  BoardAccessService,
]);
const repo = mocks.get(BoardsRepository) as MockProxy<BoardsRepository>;
```

> Với provider dùng **token** (vd `EMAIL_PROVIDER`), khai báo provider thủ công trong spec đó thay vì qua helper.

---

## 6. Definition of Done — Phase 0

- [ ] Cài `jest-mock-extended` (+ `@testcontainers/postgresql` nếu làm e2e).
- [ ] Thêm `coverageThreshold` + `collectCoverageFrom` lọc file không cần test.
- [ ] Tạo đủ factory trong `test/factories/`.
- [ ] Tạo `create-testing-module.ts`.
- [ ] Viết 1 spec "smoke" (vd `string.util.spec.ts`) và chạy `npm test` xanh để xác nhận pipeline hoạt động.

---

## 7. Dọn code chết trước khi viết test (khuyến nghị)

Các file không được dùng → **không cần test**, nên xóa để coverage phản ánh đúng:

- `src/database/prisma/prisma.middleware.ts`
- `src/shared/queue/**`
- `src/shared/storage/**`
- `src/common/upload/**`
- `console.log('cards', cards)` ở `boards.service.ts:85`

➡️ Tiếp theo: [Phase 1 — Utils & Common](./phase-1-utils-common.md)
