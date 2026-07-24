# Phase 3 — Tools ghi (create + update)

**Mục tiêu:** Cho agent tạo và sửa ticket. Tận dụng `CardsService.create`/`update` sẵn có —
không cần endpoint mới. Audit trail đã tự động ghi khi update.

**Phụ thuộc:** Phase 2. **Ước tính:** vừa.

> Các tool dưới đây là `LlmTool` trung lập (định nghĩa ở `AiChatService`), không phụ thuộc provider —
> đổi Gemini↔Claude sau này không phải sửa gì ở đây.

---

## Các tool

### 3.1 `create_card`
- Map: `CardsService.create(user, dto, files=[])` — đã tồn tại (`src/modules/cards/cards.service.ts`).
- Input schema (khớp `CreateCardDto`, `card.dto.ts:35`):
  - Bắt buộc: `boardId` (int), `columnId` (int), `title` (string 3–50 ký tự).
  - Tuỳ chọn: `description?`, `priority?` (1/2/3), `assigneeUserId?`, `issueTypeId?`, `versionId?`,
    `startDate?` (ISO), `dueDate?` (ISO), `estimatedHours?` (string), `actualHours?` (string).
- Quyền: `create` đã tự `ensureRole(dto.boardId, user.userId, BOARD_CONTRIBUTOR_ROLES)`
  (`cards.service.ts:52`) — GUEST bị chặn.
- Validation service-layer (agent phải tuân theo, service tự kiểm): column thuộc board, assignee là member,
  issueType/version thuộc board, date range hợp lệ. Nếu sai → tool trả lỗi rõ để agent sửa và thử lại.
- Không nhận attachment qua AI (bỏ files).

### 3.2 `update_card`
- Map: `CardsService.update(user, id, dto, files=[])`.
- Input schema (khớp `UpdateCardDto`, `card.dto.ts:114`):
  `title?`, `description?`, `columnId?`, `priority?`, `assigneeUserId?`, `issueTypeId?`, `versionId?`,
  `startDate?`, `dueDate?`, `estimatedHours?`, `actualHours?`. (KHÔNG có `boardId` — suy từ card.)
- Quyền: update tự `ensureCardVisibleToUser(..., BOARD_CONTRIBUTOR_ROLES)`.
- Audit trail: `CardHistoryService.recordCardUpdate` chạy tự động — không cần làm gì thêm.
- "Chuyển trạng thái" = đổi `columnId` → agent map tên trạng thái qua `get_board_context` (Phase 2).

---

## Guardrail cho hành động ghi
- **Bulk update** (sửa nhiều card cùng lúc): agent phải liệt kê danh sách card sẽ đổi và **hỏi xác nhận**
  trước khi gọi tool hàng loạt. (Delete có confirm riêng ở Phase 4.)
- Với create/update đơn lẻ: không bắt buộc confirm, nhưng system prompt yêu cầu agent tóm tắt lại
  thay đổi đã thực hiện (dựa trên kết quả tool, không bịa).
- Tool trả về card sau khi tạo/sửa (id, cardCode, title, column.title) để agent phản hồi chính xác.

## System prompt (bổ sung)
- Trước khi tạo card: nếu thiếu thông tin bắt buộc (title, columnId), hỏi lại người dùng — không tự bịa.
- title phải 3–50 ký tự; priority chỉ 1/2/3; ngày định dạng ISO.
- Sau khi ghi thành công, xác nhận lại cardCode/title thật (từ kết quả tool), không phỏng đoán.
- Chỉ báo cáo việc đã làm khi tool trả về thành công; nếu tool lỗi, nói rõ lỗi và không khẳng định đã xong.

---

## Files đụng tới
- `backlog-be/src/modules/ai-assistant/tools/` (thêm create_card, update_card)
- `backlog-be/src/modules/ai-assistant/ai-chat.service.ts` (đăng ký thêm tool + guardrail bulk)

## Acceptance criteria
- [ ] "Tạo ticket 'Fix login bug' ở cột To Do, ưu tiên cao" → tạo đúng card, trả cardCode.
- [ ] "Chuyển ticket BUG-12 sang Done" → agent map Done → columnId, update đúng.
- [ ] "Gán ticket X cho Hiếu" → map displayName → assigneeUserId, update đúng.
- [ ] GUEST yêu cầu tạo/sửa → bị 403 (từ ensureRole), agent báo không đủ quyền.
- [ ] Sửa nhiều ticket cùng lúc → agent hỏi xác nhận trước.
- [ ] update ghi audit trail (kiểm tra comment SYSTEM sinh ra).

## Rủi ro
- Agent Haiku có thể map sai tên→id → luôn buộc gọi `get_board_context` trước, và validate ở service.
- Tránh tạo trùng: system prompt nhắc kiểm tra bằng `search_cards` nếu nghi ngờ trùng title.
