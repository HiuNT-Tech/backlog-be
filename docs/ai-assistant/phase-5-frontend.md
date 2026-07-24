# Phase 5 — Frontend (trang /assistant + SSE)

**Mục tiêu:** Trang chat `/assistant` per-board, gọi `POST /v1/ai/chat`, nhận SSE, render markdown,
gate theo role. FE dùng **pnpm**.

**Phụ thuộc:** Phase 1 (endpoint tồn tại). Có thể làm song song Phase 2–4.

---

## Việc cần làm

### 5.1 Trang `/assistant`
- `FE/app/(main)/project/[projectId]/assistant/page.tsx` + client component
  (mô phỏng pattern `FE/app/(main)/project/[projectId]/chat/project-chat-client.tsx` — 1067 dòng,
  đã có message list bubble + composer Enter-to-send, tái dùng tốt về UI).
- Lấy `boardId` từ `params.projectId` (giống các trang khác: `toEntityIdOrUndefined(params.projectId)`).
- Thêm mục "AI Assistant" vào sidebar: `FE/components/layout/sidebar.tsx`, hàm `getMenuItems(boardId)`
  (đã có sẵn entry "Chat" trỏ `/project/{boardId}/chat` — thêm entry tương tự trỏ `/assistant`).

### 5.2 Hook `use-ai-chat`
- Đặt tại `FE/hooks/use-ai-chat.ts`.
- **KHÔNG dùng** axios helper trong `utils/authorizeAxios.ts` (không stream được). Dùng `fetch` + `ReadableStream`:
  ```ts
  const res = await fetch(`${API_ROOT}/v1/ai/chat`, {           // API_ROOT: utils/constants.ts
    method: 'POST',
    credentials: 'include',                                      // gửi cookie accessToken
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ boardId, messages }),
  });
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  // đọc từng chunk, parse dòng `data: {...}` / `data: [DONE]`, append vào message assistant hiện tại
  ```
- Quản lý mảng message local (useState), gửi full history mỗi lượt (API stateless).
- Xử lý 401 (chưa login) → redirect như interceptor axios đang làm (`/login?redirect=...`).

### 5.3 Render markdown
- Dùng `react-markdown` (đã dùng ở `FE/app/(main)/project/[projectId]/issues/[id]/comment-section.tsx:194`
  và `description-card.tsx:99`). Câu trả lời agent (bảng thống kê, danh sách) render đẹp.

### 5.4 Gate theo role
- `useBoardRole(boardId)` (`FE/hooks/use-board-role.ts`) → `{ isContributor, isManager, isGuest, isReady }`.
- Gợi ý/nút tạo-sửa-xoá chỉ hiện khi `isContributor`. GUEST vẫn chat được (chỉ hỏi/thống kê).
- BE vẫn là hàng rào thật; FE gate chỉ để UX (defence in depth).

### 5.5 Confirm xoá (UI)
- Khi agent trả về "cần xác nhận xoá" (Phase 4), hiển thị nút **"Xác nhận xoá"** / "Huỷ" rõ ràng
  (dùng `components/ui/dialog.tsx` hoặc button), thay vì bắt user gõ "đồng ý" — an toàn & rõ ràng hơn.

### 5.6 i18n
- Thêm namespace `aiChat.*` vào `FE/i18n/locales/en.ts` và `vi.ts` (react-i18next; pattern `t('aiChat.title')`).

---

## Files đụng tới
- `FE/app/(main)/project/[projectId]/assistant/` (mới: page + client component)
- `FE/hooks/use-ai-chat.ts` (mới)
- `FE/components/layout/sidebar.tsx` (thêm menu item)
- `FE/i18n/locales/en.ts`, `vi.ts` (thêm keys)
- (Tái dùng) `components/ui/*`, `react-markdown`, `useBoardRole`, `selectCurrentUser`

## Acceptance criteria
- [ ] Vào `/project/{id}/assistant`, gõ câu hỏi → thấy token trả về stream mượt (không đợi trọn câu).
- [ ] Bảng thống kê / danh sách render markdown đẹp.
- [ ] GUEST: chat + thống kê được; không thấy hành động ghi.
- [ ] Contributor: tạo/sửa/xoá được; xoá hiện nút xác nhận.
- [ ] Chưa đăng nhập / hết hạn → redirect login đúng.
- [ ] Cookie được gửi (credentials: 'include') → BE nhận đúng user.

## Rủi ro
- SSE + cookie cross-origin (dev FE:3000 ↔ BE:8017): kiểm tra CORS `withCredentials`/origin khớp.
- `fetch` streaming trên trình duyệt cũ — dự án target hiện đại (Next 16/React 19) nên ổn.
