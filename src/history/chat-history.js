import { corsPreflight, jsonRes } from "../shared/http.js";
import { resolveUserEmail } from "../shared/session.js";

export async function handleChatHistoryRoutes(pathname, request, env) {
  if (pathname !== "/api/chat/history") return null;
  if (request.method === "OPTIONS") return corsPreflight();

  const email = await resolveUserEmail(request, env);
  if (!email) {
    return jsonRes({ authenticated: false, threads: [] }, 200);
  }

  // Giữ nguyên chính xác key KV chat_history:${email} đang hoạt động
  const kvKey = `chat_history:${email}`;

  if (request.method === "GET") {
    try {
      const raw = await env.AUTH_SESSIONS.get(kvKey);
      const data = raw ? JSON.parse(raw) : { threads: [] };
      return jsonRes({
        authenticated: true,
        email,
        threads: Array.isArray(data.threads) ? data.threads : []
      });
    } catch {
      return jsonRes({ authenticated: true, email, threads: [] });
    }
  }

  if (request.method === "POST") {
    try {
      const body = await request.json();
      const threads = Array.isArray(body.threads) ? body.threads.slice(0, 40) : [];
      const sanitized = threads.map((t) => ({
        id: String(t.id || ""),
        title: String(t.title || "Cuộc trò chuyện mới").slice(0, 120),
        updatedAt: t.updatedAt || new Date().toISOString(),
        messages: Array.isArray(t.messages)
          ? t.messages.slice(-80).map((m) => ({
              role: m.role === "user" ? "user" : "bot",
              text: String(m.text || "").slice(0, 12000),
              schedule: m.schedule || null,
              ts: m.ts || new Date().toISOString()
            }))
          : []
      }));

      await env.AUTH_SESSIONS.put(
        kvKey,
        JSON.stringify({ email, updatedAt: new Date().toISOString(), threads: sanitized })
      );

      return jsonRes({ ok: true, email, count: sanitized.length });
    } catch {
      return jsonRes({ error: "Không thể đồng bộ lịch sử trò chuyện." }, 500);
    }
  }

  return jsonRes({ error: "Method Not Allowed" }, 405);
}
