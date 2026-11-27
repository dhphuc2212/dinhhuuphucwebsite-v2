import { corsPreflight, jsonRes } from "../shared/http.js";
import { resolveUserEmail } from "../shared/session.js";
import { saveMemoryEntry, searchRelevantMemories } from "../brain/storage.js";
import { buildSystemPrompt } from "./prompts.js";
import { extractAiPayload, formatIsoToDmy } from "./parser.js";

const MODELS = [
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  "@cf/google/gemma-3-12b-it"
];

export async function handleChatRoutes(pathname, request, env) {
  if (pathname === "/api/models") {
    return jsonRes({
      provider: "Cloudflare Workers AI",
      ready: Boolean(env.AI),
      models: MODELS
    });
  }

  if (pathname !== "/api/chat") return null;
  if (request.method === "OPTIONS") return corsPreflight();
  if (request.method !== "POST") return jsonRes({ error: "Method Not Allowed" }, 405);

  try {
    const body = await request.json();
    const message = (body.message || "").toString().trim();
    const todayIso = (body.today || new Date().toISOString().slice(0, 10)).toString();
    const todayDmy = formatIsoToDmy(todayIso);
    const timezone = (body.timezone || "Asia/Ho_Chi_Minh").toString();

    if (!message) return jsonRes({ error: "Vui lòng nhập nội dung." }, 400);
    if (!env.AI) {
      return jsonRes({
        reply: "Chưa bật binding AI trong wrangler.jsonc. Bạn kiểm tra lại cấu hình nhé!",
        schedule: null
      });
    }

    const userEmail = await resolveUserEmail(request, env);
    const relevantMemories = userEmail
      ? await searchRelevantMemories(userEmail, message, env, 5)
      : [];

    const systemPrompt = buildSystemPrompt(todayIso, todayDmy, timezone, relevantMemories);
    const history = Array.isArray(body.history) ? body.history.slice(-8) : [];
    const conversationMsgs = [{ role: "system", content: systemPrompt }];

    for (const h of history) {
      if (h && typeof h.text === "string" && h.text.trim()) {
        conversationMsgs.push({
          role: h.role === "user" ? "user" : "assistant",
          content: h.text.slice(0, 1500)
        });
      }
    }
    conversationMsgs.push({ role: "user", content: message });

    let lastError = "";
    for (const modelName of MODELS) {
      try {
        const result = await env.AI.run(modelName, {
          messages: conversationMsgs,
          temperature: 0.3,
          max_tokens: 1200
        });

        const parsed = extractAiPayload(result);
        let replyStr = typeof parsed.reply === "string" ? parsed.reply : String(parsed.reply || "Đã ghi nhận!");
        replyStr = replyStr.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, "$3-$2-$1");

        let savedMemory = null;
        if (parsed.memoryToSave && typeof parsed.memoryToSave === "object") {
          if (userEmail) {
            const urlInMsg = message.match(/https?:\/\/[^\s)]+/i);
            if (!parsed.memoryToSave.sourceUrl && urlInMsg) {
              parsed.memoryToSave.sourceUrl = urlInMsg[0];
            }
            savedMemory = await saveMemoryEntry(userEmail, parsed.memoryToSave, env);
          } else {
            replyStr += "\n\n(Lưu ý: Bạn hãy đăng nhập Google ở góc trên để tôi lưu kiến thức này vĩnh viễn vào Bộ não thứ 2 nhé!)";
          }
        }

        return jsonRes({
          reply: replyStr,
          schedule: parsed.schedule || null,
          savedMemory,
          usedMemoriesCount: relevantMemories.length,
          model: modelName
        });
      } catch (e) {
        lastError = e?.message || "Lỗi Workers AI";
      }
    }

    return jsonRes({
      reply: `Hệ thống AI đang bận (${lastError}). Bạn thử lại nhé!`,
      schedule: null
    });
  } catch {
    return jsonRes({ reply: "Có lỗi kết nối tới hệ thống AI.", schedule: null });
  }
}
