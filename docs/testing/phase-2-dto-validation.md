# Phase 2 — DTO Validation

> **Mục tiêu:** Đảm bảo các ràng buộc `class-validator` + biến đổi `class-transformer` trên DTO hoạt động đúng (chặn input bẩn, chuẩn hóa dữ liệu).
> **Phụ thuộc:** Phase 0.
> **Ưu tiên:** Trung bình.

---

## Cách test DTO

Dùng `plainToInstance` + `validate` (giống pipeline thật của Nest với `whitelist/transform`):

```ts
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

async function validateDto<T extends object>(cls: new () => T, payload: object) {
  const instance = plainToInstance(cls, payload);
  const errors = await validate(instance, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return { instance, errors };
}

const expectValid = async (cls, payload) => {
  const { errors } = await validateDto(cls, payload);
  expect(errors).toHaveLength(0);
};
const expectInvalid = async (cls, payload, field?) => {
  const { errors } = await validateDto(cls, payload);
  expect(errors.length).toBeGreaterThan(0);
  if (field) expect(errors.some((e) => e.property === field)).toBe(true);
};
```

> Lưu ý: với DTO có `@Transform`, test cả phần **chuẩn hóa giá trị** (vd email lowercase, boardCode uppercase) qua `instance` trả về.

---

## Danh sách file spec & case

### 1. `register.dto.spec.ts`
| Case | Kết quả |
|------|---------|
| payload hợp lệ đầy đủ | valid |
| email sai định dạng | invalid (`email`) |
| email có hoa + khoảng trắng | valid + `instance.email` đã lowercase/trim |
| password < 8 ký tự | invalid (`password`) |
| thiếu password | invalid |
| displayName < 2 ký tự | invalid (`displayName`) |
| không có displayName/phone (optional) | valid |
| field thừa (vd `role`) | invalid (forbidNonWhitelisted) |

### 2. `login.dto.spec.ts`
| Case | Kết quả |
|------|---------|
| hợp lệ | valid |
| email sai | invalid |
| email hoa→ chuẩn hóa lowercase | valid + transform |
| password < 8 | invalid |

### 3. `verify-account.dto.spec.ts`
- hợp lệ; thiếu `email`/`token`; email sai định dạng. *(đọc DTO để xác nhận field).*

### 4. `board.dto.spec.ts` (CreateBoardDto / UpdateBoardDto / ReorderColumnDto)
| Case | Kết quả |
|------|---------|
| Create hợp lệ | valid |
| title < 3 / > 50 | invalid |
| boardCode thường→ uppercase | valid + `instance.boardCode` viết hoa |
| boardCode chứa ký tự lạ (`pi pc!`) | invalid (regex `^[A-Z0-9_-]+$`) |
| boardCode < 2 / > 16 | invalid |
| type không thuộc enum | invalid |
| description > 255 | invalid |
| Update với `columns` nested sai (`position < 0`) | invalid |
| Update rỗng `{}` (PartialType) | valid |

### 5. `card.dto.spec.ts` (CreateCardDto / UpdateCardDto / MoveCardDto / ListBoardCardsQueryDto)
| DTO | Case | Kết quả |
|-----|------|---------|
| Create | hợp lệ tối thiểu (boardId, columnId, title) | valid |
| Create | title < 3 / > 50 | invalid |
| Create | boardId/columnId < 1 | invalid |
| Create | priorityId ngoài [1,3] | invalid |
| Create | startDate không phải ISO date | invalid |
| Create | estimatedHours `'abc'` | invalid (regex) |
| Create | estimatedHours `'4.5'` | valid |
| Update | rỗng `{}` | valid |
| Move | hợp lệ (prevCards/nextCards) | valid |
| Move | thiếu `currentCardId` | invalid |
| Move | item trong nextCards có `position < 0` | invalid (nested) |
| List | `priorityId='1,2'` → transform thành `[1,2]` | valid + array số |
| List | `priorityId='1,abc'` | invalid (`@IsInt each`) |

### 6. `pagination-query.dto.spec.ts`
| Case | Kết quả |
|------|---------|
| default | page=1, limit=10, sortBy='createdAt', sortOrder='desc' |
| limit > 100 | invalid |
| page < 1 | invalid |
| sortOrder ngoài `['asc','desc']` | invalid |
| string số `'2'` → transform number | valid |

### 7. `version.dto.spec.ts` & 8. `issue-type.dto.spec.ts` & 9. `column.dto.spec.ts`
- Đọc DTO tương ứng, áp cùng khuôn: 1 case hợp lệ + thiếu field bắt buộc + vượt độ dài + enum sai (statusColor) + nested reorder (nếu có).

---

## Definition of Done — Phase 2
- [ ] 9 file spec DTO xanh.
- [ ] Mỗi DTO có ≥ 1 case valid + các case invalid cho mọi rule chính.
- [ ] Test khẳng định **giá trị sau transform** cho email (lowercase) và boardCode (uppercase).

➡️ Tiếp theo: [Phase 3 — Services](./phase-3-services.md)
