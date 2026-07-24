# Phase 4 — Xoá ticket (endpoint MỚI + tool + confirm)

**Mục tiêu:** Cho agent xoá ticket. **BE hiện CHƯA có endpoint xoá card** → phải build trước.
Vì xoá là hành động khó đảo ngược, **confirm là bắt buộc**.

**Phụ thuộc:** Phase 3. **Ước tính:** vừa.

> `delete_card` cũng là `LlmTool` trung lập — không phụ thuộc provider. Endpoint BE và confirm flow
> hoàn toàn độc lập với việc dùng Gemini hay Claude.

---

## ⚠️ Bối cảnh
Schema `Card` (`prisma/schema.prisma`) có cột `deletedAt (Date?)` và mọi query đã filter `deletedAt: null`,
NHƯNG không có controller route hay service method nào set nó. Column/version/issue-type/comment/board-member
đều có delete — chỉ card thiếu. Đây là lý do "xoá ticket" hiện chưa làm được.

---

## Việc cần làm

### 4.1 Endpoint soft-delete card (BE)
- `CardsController` (`src/modules/cards/cards.controller.ts`): thêm
  ```ts
  @Delete('cards/:id')
  remove(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.cardsService.remove(user, id);
  }
  ```
- `CardsService.remove(user, id)` (`cards.service.ts`):
  - `await this.ensureCardAccessible(user, id, BOARD_CONTRIBUTOR_ROLES);`  // đã export sẵn, line ~212
  - gọi repo softDelete.
  - (Tuỳ chọn nhưng nên) ghi audit qua `CardHistoryService` rằng card bị xoá.
- `CardsRepository.softDelete(id)`: `update({ where:{id}, data:{ deletedAt: new Date() } })`.
- Trả về `{ item: ... }` hoặc 204 (thống nhất với convention hiện tại — column/version delete trả gì thì theo đó).

### 4.2 Tool `delete_card`
- Map: `CardsService.remove(user, cardId)`.
- Input: `cardId` (int).
- Quyền: qua `ensureCardAccessible(..., BOARD_CONTRIBUTOR_ROLES)` — GUEST bị chặn.

### 4.3 Confirm flow (bắt buộc)
Vì Haiku có thể gọi tool thiếu chính xác, dùng cơ chế 2 bước không phụ thuộc vào "trí nhớ" model:
- **Cách khuyến nghị:** tool `delete_card` nhận thêm `confirmed: boolean`.
  - Lần đầu (`confirmed` false/absent): tool KHÔNG xoá, trả về thông tin card (cardCode, title) +
    thông báo "cần xác nhận". Agent hiển thị và hỏi người dùng.
  - Người dùng đồng ý → agent gọi lại với `confirmed: true` → mới thực sự xoá.
- System prompt: tuyệt đối không tự đặt `confirmed: true` khi người dùng chưa xác nhận rõ ràng.
- FE (Phase 5) nên hiển thị nút "Xác nhận xoá" rõ ràng thay vì để user gõ tay (an toàn hơn).

---

## Files đụng tới
- `backlog-be/src/modules/cards/cards.controller.ts` (thêm DELETE)
- `backlog-be/src/modules/cards/cards.service.ts` (thêm `remove`)
- `backlog-be/src/modules/cards/repositories/*.repository.ts` (thêm `softDelete`)
- `backlog-be/src/modules/ai-assistant/tools/` (thêm delete_card)
- Swagger decorator tương ứng (`src/modules/cards/decorators/*-swagger.decorator.ts`) — theo pattern hiện có.

## Acceptance criteria
- [ ] `DELETE /v1/cards/:id` với contributor → set `deletedAt`, card biến mất khỏi list.
- [ ] GUEST gọi delete → 403.
- [ ] Xoá card không thuộc board user → 403/404.
- [ ] Agent: "Xoá ticket BUG-12" → lần đầu chỉ hỏi xác nhận (không xoá); sau khi user đồng ý mới xoá.
- [ ] Card đã xoá không xuất hiện ở `search_cards`/`findByBoard` (do filter `deletedAt: null`).
- [ ] Test cho endpoint mới (coverage gate BE 80%).

## Rủi ro
- Đây là điểm rủi ro cao nhất của cả dự án (xoá + model rẻ). Confirm 2 bước + gate role là bắt buộc.
- Cân nhắc chỉ cho `BOARD_MANAGER_ROLES` (ADMIN/PM) được xoá thay vì tất cả contributor —
  hỏi lại chủ dự án nếu muốn siết chặt hơn.
