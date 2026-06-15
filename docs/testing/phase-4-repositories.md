# Phase 4 — Repository Tests

> **Mục tiêu:** Phủ phần **logic thật** trong repository (sinh mã, tính vị trí, transaction, mapping entity, where-builder). Mock `PrismaService` (kể cả `$transaction`).
> **Phụ thuộc:** Phase 0.
> **Ưu tiên:** Trung bình. Repository thuần "passthrough" (chỉ gọi 1 lệnh Prisma) **không cần** unit test — đã được phủ ở e2e (Phase 5).

---

## Cách mock PrismaService

```ts
import { mock, MockProxy } from 'jest-mock-extended';
import { PrismaService } from '@database/prisma/prisma.service';

let prisma: MockProxy<PrismaService>;

beforeEach(() => {
  prisma = mock<PrismaService>();
});
```

### Mock `$transaction` (2 dạng)

```ts
// Dạng callback: prisma.$transaction(async (tx) => {...})
prisma.$transaction.mockImplementation(async (cb: any) => cb(prisma));
// → tx chính là prisma mock, stub các bảng bình thường

// Dạng array: prisma.$transaction([p1, p2])
prisma.$transaction.mockImplementation(async (ops: any) => Promise.all(ops));
```

> Vì `tx` và `prisma` dùng chung mock, ta stub `prisma.card.update`, `prisma.board.update`... và assert lời gọi bên trong transaction.

---

## Repository cần test (có logic)

### 1. `cards.repository.spec.ts` ⭐ (logic nhiều nhất)

| Method | Case | Khẳng định |
|--------|------|-----------|
| `create` | board.update increment | gọi `board.update` với `nextCardNumber: { increment: 1 }` |
| `create` | tính cardNumber | `cardNumber = board.nextCardNumber - 1` |
| `create` | cardCode | `=` `${boardCode}-${cardNumber}` |
| `create` | position khi column rỗng | `lastCard=null` → position 0 |
| `create` | position khi có card | `lastCard.position + 1` |
| `create` | registeredBy/createdBy | `= userId` |
| `update` | columnChanged=true | gọi `getNextPosition` → set position |
| `update` | columnChanged=false | không set position |
| `update` | chỉ field có trong dto được set | spread conditional đúng |
| `move` | transaction | update card sang nextColumnId; cập nhật vị trí prev + next |
| `buildBoardCardsWhere` | search | `OR` title/cardCode `contains insensitive` |
| `buildBoardCardsWhere` | cardCode | `startsWith insensitive` |
| `inFilter` | mảng rỗng → bỏ; có giá trị → `{ in: [...] }` |
| `countCardsInColumn` | cardIds rỗng → trả 0 (không query) |
| `toDate` | undefined → undefined; string → Date |

```ts
it('builds cardCode and cardNumber from board sequence', async () => {
  prisma.$transaction.mockImplementation(async (cb: any) => cb(prisma));
  prisma.board.update.mockResolvedValue({ boardCode: 'PIPC', nextCardNumber: 5 } as any);
  prisma.card.findFirst.mockResolvedValue({ position: 2 } as any);
  prisma.card.create.mockResolvedValue({ id: 1 } as any);

  await repo.create({ boardId: 1, columnId: 1, title: 'X' } as any, 9);

  expect(prisma.card.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({ cardNumber: 4, cardCode: 'PIPC-4', position: 3 }),
    }),
  );
});
```

### 2. `boards.repository.spec.ts`

| Method | Case |
|--------|------|
| `createBoardWithDefaults` | transaction tạo board → tạo `boardMember` role ADMIN cho userId → `createMany` columns từ `DEFAULT_COLUMNS`; trả `findBoardDetail` |
| `updateBoard` | data rỗng → **không** gọi `board.update`; có data → gọi update |
| `updateBoard` | có `columns` → loop `column.update` theo position |
| `findBoardUsers` | where build với `role`/`search` (OR email/displayName/userCode); transaction count+findMany |

### 3. `users.repository.spec.ts`

| Method | Case |
|--------|------|
| `toEntity` (gián tiếp) | map đủ field, ép `role` |
| `omitUndefined` | loại bỏ key undefined, giữ key có giá trị (kể cả `false`/`null`) |
| `findById` | null → null; có → entity |
| `verifyAccount` | không tìm thấy (id+token) → null; thành công → update `isActive:true, verifyToken:null` |
| `softDelete` | không active → null; thành công → `isActive:false, deletedAt` |
| `updateUser` | không active → null; thành công → update với data đã omitUndefined |
| `findPaginatedUsers` | gọi `paginate` (kế thừa BasePrismaRepository) đúng args |

> **Lưu ý:** `UsersRepository` kế thừa `BasePrismaRepository`. Có thể test thêm `base-prisma.repository.spec.ts` cho `paginate` (gọi findMany+count song song, tính skip/take, trả `{items,total}`) — tạo một subclass test bọc một delegate mock.

### 4–6. `columns` / `issue-types` / `versions` repository
Chỉ test method có nhánh:
- where-builder với filter động.
- soft delete kèm cards (columns: `softDeleteWithCards` transaction cập nhật cả card).
- count/findActiveByName, findActiveByBoandAndId trả đúng điều kiện `deletedAt: null`.

---

## Khi nào KHÔNG cần test ở Phase 4
- Method chỉ gọi đúng 1 lệnh Prisma không biến đổi (vd `findBoardById`, `countCards`). → để e2e (Phase 5) phủ.

---

## Definition of Done — Phase 4
- [ ] `cards.repository.spec.ts` phủ đủ cardNumber/cardCode/position/move.
- [ ] `boards.repository.spec.ts` phủ transaction tạo board mặc định.
- [ ] `users.repository.spec.ts` + `base-prisma.repository.spec.ts` phủ mapping & paginate.
- [ ] Các where-builder động được khẳng định đúng cấu trúc `where`.

➡️ Tiếp theo: [Phase 5 — E2E](./phase-5-e2e.md)
