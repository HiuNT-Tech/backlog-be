# Phase 2 — Vòng lặp function-calling + tools read-only

**Mục tiêu:** Thêm vòng lặp function-calling vào `GeminiProvider`, và 3 công cụ CHỈ ĐỌC:
tìm kiếm card, lấy context board, thống kê. An toàn tuyệt đối (không sửa data).

**Phụ thuộc:** Phase 1. **Ước tính:** vừa.

---

## 2.0 Vòng lặp function-calling trong GeminiProvider
Gemini KHÔNG có "Tool Runner" tự động như Claude → phải tự viết vòng lặp trong `GeminiProvider.streamChat`.
Dựa trên SDK `@google/genai` (đã verify qua context7):

```ts
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey });
// Dịch LlmTool[] (trung lập) → định dạng Gemini
const functionDeclarations = opts.tools.map(t => ({
  name: t.name,
  description: t.description,
  parametersJsonSchema: t.schema,          // JSON schema params
}));

const contents = mapMessages(opts.messages);   // {role:'user'|'model', parts:[{text}]}[]

for (let step = 0; step < MAX_STEPS; step++) {   // MAX_STEPS ~ 8, chống loop
  const stream = await ai.models.generateContentStream({
    model, contents,
    config: {
      systemInstruction: opts.system,
      tools: [{ functionDeclarations }],
    },
  });

  const calls: any[] = [];
  for await (const chunk of stream) {
    if (chunk.text) opts.onToken(chunk.text);            // stream text ra SSE
    if (chunk.functionCalls?.length) calls.push(...chunk.functionCalls);
  }
  if (!calls.length) break;                              // không còn tool → xong

  // Chạy từng tool, gom functionResponse
  const responseParts = [];
  for (const call of calls) {
    const tool = opts.tools.find(t => t.name === call.name);
    let result; let error;
    try { result = await tool.run(call.args); }
    catch (e) { error = String(e?.message ?? e); }       // 403/validation → trả cho model tự sửa
    responseParts.push({
      functionResponse: { name: call.name, response: error ? { error } : { result } },
    });
  }
  // Append lượt model (functionCall) + lượt user (functionResponse) rồi lặp
  contents.push({ role: 'model', parts: calls.map(c => ({ functionCall: c })) });
  contents.push({ role: 'user', parts: responseParts });
}
```
> Điểm quan trọng: mỗi `tool.run` là hàm trung lập đã bind sẵn `user.userId` + `boardId`
> (đóng gói ở `AiChatService` khi tạo `LlmTool[]`), nên provider không cần biết gì về phân quyền.

---

## Các tool (LlmTool trung lập, build ở AiChatService)

### 2.1 `search_cards`
- `run` → `CardsService.findByBoard(user, boardId, query)` (đã tồn tại).
- `schema` khớp `ListBoardCardsQueryDto` (`src/modules/cards/dto/card.dto.ts:200`):
  `search?`, `columnId?: number[]`, `assigneeUserId?: number[]`, `priority?: number[]` (1/2/3),
  `versionId?: number[]`, `issueTypeId?: number[]`, `registeredByUserId?: number[]`,
  `startDate?`, `dueDate?`, `skip?`, `limit?`.
- Quyền: `ensureMember` (đã có trong findByBoard).
- Rút gọn field trước khi trả cho model (id, cardCode, title, column.title, assignee.displayName,
  priority, dueDate) để tiết kiệm token/quota Gemini.

### 2.2 `get_board_context`
- `run` → gọi Columns/Versions/IssueTypes/members services.
- Mục đích: dịch NL → id. "chuyển sang Done" → columnId của "Done"; "giao cho Hiếu" → assigneeUserId.
- Trả gọn: `{id,title}` columns; `{id,name}` versions/issueTypes; `{userId,displayName}` members.

### 2.3 `get_statistics` (cần code mới ở repo)
- `run` → method MỚI trong `CardsRepository` (Prisma `groupBy`/`count`).
- Tối thiểu: count theo column/assignee/priority; đếm **quá hạn** (`dueDate < now` và không ở cột done);
  sum `estimatedHours` vs `actualHours` (**parse string → số**, bỏ null).
- Precedent aggregation: `src/modules/boards/boards.service.ts` (`countCards`...).
- Quyền: `ensureMember`.

---

## System prompt (bổ sung cho phase này)
- "Trạng thái" của ticket = cột (column), KHÔNG phải field. Muốn lọc/thống kê theo trạng thái phải
  gọi `get_board_context` để map tên → columnId trước.
- priority: 1=Thấp, 2=Trung bình, 3=Cao.
- Luôn gọi `get_board_context` trước khi lọc/thống kê theo tên (status/assignee/version).
- Trả lời tiếng Việt, dùng markdown (bảng cho thống kê).

---

## Files đụng tới
- `backlog-be/src/modules/ai-assistant/llm/gemini.provider.ts` (thêm vòng lặp function-calling)
- `backlog-be/src/modules/ai-assistant/ai-chat.service.ts` (build LlmTool[] read-only)
- `backlog-be/src/modules/ai-assistant/tools/` (mới: mỗi tool 1 file, gọn)
- `backlog-be/src/modules/cards/repositories/*.repository.ts` (thêm groupBy/count)
- `backlog-be/src/modules/cards/cards.service.ts` (thêm `getStatistics`)

## Acceptance criteria
- [ ] "Có bao nhiêu ticket ở mỗi trạng thái?" → gọi `get_board_context` + `get_statistics`, trả bảng đúng.
- [ ] "Tìm ticket có chữ login" → `search_cards` với `search=login`.
- [ ] "Ai gánh nhiều task nhất?" → thống kê theo assignee đúng.
- [ ] "Ticket nào quá hạn?" → lọc đúng, không tính card done.
- [ ] Tool lỗi (vd 403) → model nhận `{error}`, tự điều chỉnh, không crash stream.
- [ ] GUEST vẫn dùng được (read-only).

## Rủi ro
- Token/quota Gemini free tier → rút gọn field + `limit` mặc định hợp lý.
- "Done column" là quy ước lỏng — thống nhất cách nhận biết (title match) và ghi rõ trong system prompt.
- Gemini Flash đôi khi map tên→id sai → buộc gọi `get_board_context` trước + validate ở service.
