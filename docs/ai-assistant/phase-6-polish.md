# Phase 6 — Hoàn thiện (history, lỗi, prompt, test)

**Mục tiêu:** Đưa từ "chạy được" lên "dùng tốt": lịch sử hội thoại bền, xử lý lỗi/refusal,
tinh chỉnh system prompt, và test đạt coverage gate.

**Phụ thuộc:** Phase 2–5. **Ước tính:** vừa.

---

## Việc cần làm

### 6.1 Lịch sử hội thoại (multi-turn)
- Tối thiểu (MVP): giữ history trong state FE, gửi full mỗi lượt (đã có ở Phase 5).
- Nâng cao (tuỳ chọn): lưu hội thoại vào DB (model `AiConversation` + `AiMessage`, scope theo user+board)
  để mở lại. Chỉ làm nếu chủ dự án cần — không bắt buộc cho MVP.
- Cắt bớt history khi dài (Haiku context 200K) — giữ N lượt gần nhất hoặc tóm tắt.

### 6.2 Xử lý lỗi
- BE: bắt lỗi Gemini (rate limit 429, lỗi mạng, safety block) trong `GeminiProvider`,
  stream một event lỗi thân thiện ra FE thay vì đứt kết nối thô.
- Gemini có thể chặn nội dung (safety) → thông báo lịch sự, không retry cùng prompt.
- Tool lỗi (403/validation) → trả `{error}` trong functionResponse để agent điều chỉnh; FE hiển thị rõ.
- Giới hạn `MAX_STEPS` cho vòng lặp function-calling (Phase 2) tránh loop vô hạn.

### 6.3 Tinh chỉnh system prompt
Gom toàn bộ domain rule vào một system prompt mạch lạc:
- Vai trò: trợ lý quản lý ticket cho board hiện tại; trả lời tiếng Việt, dùng markdown.
- "Trạng thái" = column; luôn `get_board_context` trước khi lọc/đổi theo tên (status/assignee/version).
- priority 1=Thấp/2=TB/3=Cao; ngày ISO; title 3–50 ký tự.
- Không bịa: chỉ khẳng định đã làm khi tool trả thành công.
- Xoá & bulk: bắt buộc hỏi xác nhận; không tự đặt `confirmed:true`.
- Nếu thiếu thông tin bắt buộc → hỏi lại, không đoán.
- Tôn trọng quyền: nếu tool trả 403, giải thích user không đủ quyền, không thử lách.

### 6.4 Test (BE có gate coverage 80% statements)
- Unit test: `CardsService.remove` (Phase 4), các method thống kê repo (Phase 2).
- Unit test AiChatService: mock Anthropic client, verify tool `run` gọi đúng service với `userId`/`boardId`,
  verify guardrail (delete chưa confirm không gọi remove).
- Integration: `DELETE cards/:id` với các role (contributor OK, guest 403).

### 6.5 Quan sát & chi phí
- Log token usage mỗi request (`response.usageMetadata` của Gemini) để theo dõi quota free tier.
- (Tuỳ chọn) rate-limit route `/ai/chat` per-user (ThrottlerModule đã có global 100/60s — cân nhắc siết riêng).

### 6.6 Đổi provider sang Claude (khi có điều kiện)
Nhờ interface `LlmProvider` (Phase 1), việc đổi rất gọn:
1. `npm install @anthropic-ai/sdk`.
2. Viết `src/modules/ai-assistant/llm/claude.provider.ts` implement `LlmProvider`, dùng
   **Tool Runner** (`client.beta.messages.toolRunner`) — Claude tự lo vòng lặp gọi tool, gọn hơn Gemini.
   Map `LlmTool[]` (trung lập) → `betaTool({ name, description, inputSchema, run })`.
3. Thêm case `'claude'` vào `llm.factory.ts`.
4. Đổi env: `AI_PROVIDER=claude`, `ANTHROPIC_API_KEY=sk-ant-...`, `AI_MODEL=claude-haiku-4-5` (hoặc sonnet-5/opus-4-8).
5. **KHÔNG đụng** tools, service, phân quyền, statistics, FE, system prompt — tất cả trung lập với provider.
⚠️ Claude Haiku 4.5: không dùng `output_config.effort` (lỗi 400); thinking dùng `budget_tokens`, không adaptive.
   Nếu dùng Sonnet 5 / Opus 4.8 thì có adaptive thinking + effort.

---

## Files đụng tới
- `backlog-be/src/modules/ai-assistant/*` (prompt, error handling, iterations)
- `backlog-be/src/modules/ai-assistant/*.spec.ts`, `backlog-be/src/modules/cards/*.spec.ts` (test)
- (Nếu làm history DB) `prisma/schema.prisma` + migration + service

## Acceptance criteria
- [ ] Rate limit / lỗi Anthropic → FE nhận thông báo thân thiện, không treo.
- [ ] Hội thoại nhiều lượt giữ ngữ cảnh (hỏi tiếp "còn cái nào cao hơn không?" hiểu đúng).
- [ ] Coverage BE ≥ 80% statements (gate `package.json`).
- [ ] System prompt khiến agent luôn map tên→id đúng và xác nhận trước khi xoá.
- [ ] Log token usage xuất hiện.

## Rủi ro / theo dõi
- Chất lượng gọi tool của Gemini Flash: nếu test cho thấy map tên→id sai/nhầm nhiều → cân nhắc đổi sớm
  sang Claude (mục 6.6) hoặc dùng `gemini-2.5-pro` (chậm/tốn quota hơn nhưng khá hơn).
- Quota free tier Gemini: theo dõi log usage; nếu chạm trần khi demo → đổi sang Claude credit hoặc tier trả phí.
- Nếu bật history DB: chú ý dung lượng và quyền truy cập hội thoại (scope user).
