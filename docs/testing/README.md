# 🧪 Kế hoạch Test Backend — Tổng quan

Tài liệu này là **mục lục trung tâm** cho toàn bộ chiến lược test của backend (NestJS + Prisma + PostgreSQL). Mỗi phase được tách thành một file riêng để team theo dõi và thực hiện độc lập.

> Phạm vi đã chốt: **Service + Util/Common + DTO validation + Repository + E2E (Postgres thật)**.
> Công cụ mock: **`jest-mock-extended`**.

---

## 📂 Cấu trúc tài liệu

| File | Nội dung | Ưu tiên |
|------|----------|---------|
| [phase-0-setup.md](./phase-0-setup.md) | Hạ tầng test: deps, jest config, factory, helper dùng chung | ⭐ Bắt buộc làm trước |
| [phase-1-utils-common.md](./phase-1-utils-common.md) | Pure utils, interceptor, filter, guard, exception | ⭐ Cao |
| [phase-2-dto-validation.md](./phase-2-dto-validation.md) | Validation DTO bằng class-validator | Trung bình |
| [phase-3-services.md](./phase-3-services.md) | Unit test toàn bộ service (mock repository) | ⭐⭐ Cao nhất |
| [phase-4-repositories.md](./phase-4-repositories.md) | Test repository (mock PrismaService) | Trung bình |
| [phase-5-e2e.md](./phase-5-e2e.md) | E2E HTTP đầu-cuối trên Postgres thật | Trung bình |

---

## 🎯 Mục tiêu tổng

- Phủ **toàn bộ business logic** và các nhánh điều kiện (happy path + alternative).
- Bảo vệ các luồng nhạy cảm: auth/refresh token rotation, phân quyền board, sinh `cardNumber`, kéo-thả card (move).
- Đảm bảo ràng buộc DB (unique, FK, soft-delete, transaction) qua e2e.

## 📊 Coverage mục tiêu

| Lớp | Statements | Branches |
|-----|-----------|----------|
| `common/utils`, `common/*` | ≥ 90% | ≥ 85% |
| `modules/**/services` | ≥ 85% | ≥ 80% |
| Global | ≥ 80% | ≥ 75% |

## 🔢 Quy mô ước lượng

- **~30 file** spec + e2e.
- **~250–300 test case**.
- **~6–7.5 ngày công**.

---

## 🗺️ Thứ tự thực hiện đề xuất

```
Phase 0  →  Phase 1  →  Phase 3  →  Phase 2  →  Phase 4  →  Phase 5
(setup)     (nền tảng)   (core)      (dto)       (repo)      (e2e)
```

Lý do: Phase 3 (service) cho giá trị cao nhất nên làm sớm ngay sau khi có hạ tầng (Phase 0) và các khối nền tảng (Phase 1).

---

## ✅ Quy ước chung khi viết test

1. **Vị trí file:**
   - Unit/integration: đặt `*.spec.ts` **cạnh file nguồn** (vd `auth.service.spec.ts` cạnh `auth.service.ts`).
   - E2E: đặt trong `test/e2e/*.e2e-spec.ts`.
2. **Cấu trúc test:** theo **AAA** (Arrange → Act → Assert). Mỗi test khẳng định **một hành vi**.
3. **Đặt tên:** `describe('<Class>')` → `describe('<method>')` → `it('should <behavior> when <condition>')`.
4. **Mock:** dùng `mock<T>()` của `jest-mock-extended`; reset bằng `mockReset()` trong `beforeEach`.
5. **Không test code chết:** `prisma.middleware.ts`, `shared/queue`, `shared/storage`, `common/upload` — đề xuất xóa trước (xem ghi chú từng phase).
6. **Chạy test:**
   ```bash
   npm test                 # unit + integration
   npm run test:watch       # watch mode
   npm run test:cov         # kèm coverage
   npm run test:e2e         # e2e (cần Docker/Postgres)
   ```

---

## ⚠️ Điểm cần xử lý song song khi viết test

| Vấn đề | File | Hành động |
|--------|------|-----------|
| `console.log('cards', cards)` sót lại | `boards.service.ts:85` | Xóa |
| Board `PUBLIC` chưa cho non-member xem | `boards.service.findOne` | **Chốt spec** trước khi viết test khẳng định hành vi |
| Code chết (queue/storage/upload/middleware) | nhiều file | Xóa, không viết test |
| `BasePrismaRepository` chỉ dùng ở Users | `users.repository.ts` | Quyết định dùng hết hay bỏ (không chặn test) |
