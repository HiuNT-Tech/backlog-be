# Phase 1 — Utils & Common Building Blocks

> **Mục tiêu:** Phủ các khối nền tảng dùng lại khắp nơi: pure utils, interceptor, exception filter, guard, exception. Đây là phần dễ test, chạy nhanh, độ ổn định cao.
> **Phụ thuộc:** Phase 0 (factory + helper).
> **Ưu tiên:** ⭐ Cao — làm ngay sau Phase 0.

---

## Danh sách file spec

| # | File spec | Đối tượng | Loại |
|---|-----------|-----------|------|
| 1 | `src/common/utils/crypto.util.spec.ts` | hash/compare/token | pure |
| 2 | `src/common/utils/string.util.spec.ts` | normalize string/email | pure |
| 3 | `src/common/utils/date.util.spec.ts` | toIsoString | pure |
| 4 | `src/common/utils/pagination.util.spec.ts` | phân trang | pure |
| 5 | `src/common/interceptors/response.interceptor.spec.ts` | ResponseInterceptor | rxjs |
| 6 | `src/common/filters/http-exception.filter.spec.ts` | HttpExceptionFilter | mock req/res/logger |
| 7 | `src/common/guards/roles.guard.spec.ts` | RolesGuard | mock context |
| 8 | `src/common/guards/jwt-auth.guard.spec.ts` | JwtAuthGuard | mock reflector |
| 9 | `src/common/exceptions/business.exception.spec.ts` | BusinessException | pure |

---

## 1. `crypto.util.spec.ts`

| Case | Khẳng định |
|------|-----------|
| `hashPassword` | kết quả ≠ plaintext, là chuỗi bcrypt (`$2b$`) |
| `comparePassword` đúng | `hashPassword(p)` rồi compare → `true` |
| `comparePassword` sai | compare với mật khẩu khác → `false` |
| `generateRandomToken` | đúng định dạng UUID v4; 2 lần gọi khác nhau |

```ts
import { hashPassword, comparePassword, generateRandomToken } from './crypto.util';

describe('crypto.util', () => {
  it('should hash and verify the same password', async () => {
    const hash = await hashPassword('secret123');
    expect(hash).not.toBe('secret123');
    expect(await comparePassword('secret123', hash)).toBe(true);
  });

  it('should reject a wrong password', async () => {
    const hash = await hashPassword('secret123');
    expect(await comparePassword('wrong', hash)).toBe(false);
  });

  it('should generate unique UUID tokens', () => {
    const a = generateRandomToken();
    const b = generateRandomToken();
    expect(a).toMatch(/^[0-9a-f-]{36}$/);
    expect(a).not.toBe(b);
  });
});
```

## 2. `string.util.spec.ts`

| Case | Input → Output |
|------|----------------|
| normalizeString trim | `'  a  b  '` → `'a b'` |
| normalizeString gộp khoảng trắng | `'a\t\nb'` → `'a b'` |
| normalizeEmail | `'  Foo@Bar.COM '` → `'foo@bar.com'` |

## 3. `date.util.spec.ts`

| Case | Khẳng định |
|------|-----------|
| với Date cụ thể | trả đúng ISO string |
| không truyền | dùng now (so khớp regex ISO) |

## 4. `pagination.util.spec.ts`

| Hàm | Case |
|-----|------|
| `normalizeLimit` | undefined→10; 0→1 (clamp min); 999→100 (clamp max); custom maxLimit |
| `getPagePagination` | page mặc định 1; page 0→1; tính `skip=(page-1)*limit`, `take=limit` |
| `getOffsetPagination` | skip âm→0; limit clamp |
| `toPaginatedResponse` | trả `{items, total}` đúng |

## 5. `response.interceptor.spec.ts`

ResponseInterceptor chuẩn hóa output. Test bằng cách giả `CallHandler` trả `of(data)`.

| Input từ handler | Output mong đợi |
|------------------|-----------------|
| object thường `{id:1}` | `{ item: {id:1} }` |
| paginated `{items:[], total:0}` | passthrough nguyên vẹn |
| counted `{items:[], count:0}` | passthrough nguyên vẹn |
| `null` | `{ item: null }` |

```ts
import { of, lastValueFrom } from 'rxjs';
import { ResponseInterceptor } from './response.interceptor';

const run = async (data: unknown) => {
  const interceptor = new ResponseInterceptor();
  const next = { handle: () => of(data) };
  return lastValueFrom(interceptor.intercept({} as any, next as any));
};

it('wraps plain object into { item }', async () => {
  expect(await run({ id: 1 })).toEqual({ item: { id: 1 } });
});
it('passes paginated response through', async () => {
  const paginated = { items: [1], total: 1 };
  expect(await run(paginated)).toBe(paginated);
});
```

## 6. `http-exception.filter.spec.ts`

Mock `Request`, `Response` (`status().json()`), `FileLogger`. Kiểm cả nhánh log.

| Case | Khẳng định |
|------|-----------|
| `HttpException(400)` | response.status(400); body có statusCode/path/method/message/timestamp |
| `BusinessException` | body có `errorCode` đúng |
| lỗi lạ (`new Error()`) | status 500; message `'Internal server error'`; `logger.error` được gọi |
| 4xx | `logger.warn` được gọi (không error) |
| requestId từ header `x-request-id` | dùng lại header |
| không header | sinh UUID |

```ts
const makeHost = (req, res) => ({
  switchToHttp: () => ({ getResponse: () => res, getRequest: () => req }),
} as any);

it('maps BusinessException with errorCode', () => {
  const logger = { error: jest.fn(), warn: jest.fn() } as any;
  const filter = new HttpExceptionFilter(logger);
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const req = { url: '/x', method: 'POST', headers: {} };
  filter.catch(new BusinessException(ErrorCode.INVALID_CREDENTIALS, 401), makeHost(req, res));
  expect(res.status).toHaveBeenCalledWith(401);
  expect(res.json.mock.calls[0][0]).toMatchObject({ errorCode: 'INVALID_CREDENTIALS' });
});
```

## 7. `roles.guard.spec.ts`

Mock `Reflector.getAllAndOverride` + `ExecutionContext` chứa `request.user`.

| Case | Kết quả |
|------|---------|
| không có required roles | `true` |
| user.role nằm trong roles | `true` |
| user.role không khớp | ném `ForbiddenException` |
| không có user | ném `ForbiddenException` |

## 8. `jwt-auth.guard.spec.ts`

| Method | Case | Kết quả |
|--------|------|---------|
| `canActivate` | route `@Public` (reflector trả true) | `true` (không gọi super) |
| `handleRequest` | `info.name = 'TokenExpiredError'` | ném `HttpException` 410 GONE |
| `handleRequest` | có `err` hoặc không `user` | ném `UnauthorizedException` |
| `handleRequest` | có `user` | trả về `user` |

> `canActivate` cho route không public sẽ gọi `super.canActivate` (Passport) — có thể chỉ test nhánh `@Public`, hoặc spy `AuthGuard.prototype.canActivate`.

## 9. `business.exception.spec.ts`

| Case | Khẳng định |
|------|-----------|
| khởi tạo với errorCode | `getResponse()` chứa `errorCode` + `message` mặc định từ `ERROR_MESSAGES` |
| custom status | `getStatus()` trả đúng |
| custom message | override message |

---

## Definition of Done — Phase 1

- [ ] 9 file spec ở trên xanh.
- [ ] Coverage `src/common/utils` & `src/common` đạt ≥ 90% / ≥ 85% branch.
- [ ] Không còn nhánh log (4xx/5xx) nào của filter bị bỏ sót.

➡️ Tiếp theo: [Phase 2 — DTO Validation](./phase-2-dto-validation.md)
