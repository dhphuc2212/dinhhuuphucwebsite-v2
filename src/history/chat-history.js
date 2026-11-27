import { corsPreflight, jsonRes, randomId } from "../shared/http.js";
import { resolveUserEmail } from "../shared/session.js";

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderSharedChatHtml(record) {
  const title = escapeHtml(record.title || "Cuộc trò chuyện được chia sẻ");
  const createdStr = record.createdAt
    ? new Date(record.createdAt).toLocaleString("vi-VN")
    : "";

  const msgsHtml = (record.messages || [])
    .map((m) => {
      const isUser = m.role === "user";
      return `
        <div class="msg-row ${isUser ? "user" : "bot"}">
          <div class="msg-sender">${isUser ? "Người dùng" : "Trợ lý AI • dinhhuuphuc.com"}</div>
          <div class="msg-bubble">${escapeHtml(m.text || "")}</div>
        </div>
      `;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} — Chia sẻ hội thoại AI</title>
  <style>
    body { margin: 0; padding: 24px 16px; background: #09090b; color: #fafafa; font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; }
    .wrap { max-width: 780px; margin: 0 auto; background: #111114; border: 1px solid #27272a; border-radius: 18px; padding: 24px; }
    .top { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; padding-bottom: 16px; border-bottom: 1px solid #27272a; margin-bottom: 20px; }
    .badge { font-size: 0.75rem; font-weight: 700; color: #10b981; background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.25); padding: 3px 10px; border-radius: 999px; }
    h1 { font-size: 1.35rem; margin: 8px 0 4px; }
    .meta { font-size: 0.82rem; color: #a1a1aa; }
    .btn { display: inline-block; padding: 8px 14px; border-radius: 10px; background: #fafafa; color: #09090b; text-decoration: none; font-weight: 700; font-size: 0.85rem; }
    .list { display: flex; flex-direction: column; gap: 14px; }
    .msg-row { display: flex; flex-direction: column; max-width: 86%; }
    .msg-row.user { align-self: flex-end; align-items: flex-end; }
    .msg-row.bot { align-self: flex-start; align-items: flex-start; }
    .msg-sender { font-size: 0.74rem; color: #71717a; margin-bottom: 4px; }
    .msg-bubble { padding: 11px 15px; border-radius: 14px; white-space: pre-wrap; word-break: break-word; font-size: 0.94rem; }
    .msg-row.user .msg-bubble { background: #fafafa; color: #09090b; font-weight: 500; }
    .msg-row.bot .msg-bubble { background: #18181b; border: 1px solid #27272a; color: #e4e4e7; }
  </style>
</head>
<body>
  <main class="wrap">
    <div class="top">
      <div>
        <span class="badge">SHARED CONVERSATION</span>
        <h1>${title}</h1>
        <div class="meta">Chia sẻ từ Trợ lý AI • ${createdStr}</div>
      </div>
      <a href="/" class="btn">Mở dinhhuuphuc.com →</a>
    </div>
    <div class="list">${msgsHtml}</div>
  </main>
</body>
</html>`;
}

export async function handleChatHistoryRoutes(pathname, request, env, url) {
  // 1. Tạo liên kết chia sẻ cuộc trò chuyện
  if (pathname === "/api/chat/share") {
    if (request.method === "OPTIONS") return corsPreflight();
    if (request.method !== "POST") return jsonRes({ error: "Method Not Allowed" }, 405);
    if (!env.AUTH_SESSIONS) return jsonRes({ error: "KV storage chưa sẵn sàng." }, 500);

    try {
      const body = await request.json();
      const title = String(body.title || "Cuộc trò chuyện AI").slice(0, 140);
      const messages = Array.isArray(body.messages)
        ? body.messages.slice(-80).map((m) => ({
            role: m.role === "user" ? "user" : "bot",
            text: String(m.text || "").slice(0, 12000),
            ts: m.ts || new Date().toISOString()
          }))
        : [];

      if (messages.length === 0) {
        return jsonRes({ error: "Cuộc trò chuyện trống." }, 400);
      }

      const shareId = randomId(10);
      const createdAt = new Date().toISOString();
      await env.AUTH_SESSIONS.put(
        `chat_share:${shareId}`,
        JSON.stringify({ shareId, title, createdAt, messages })
      );

      const origin = url ? url.origin : "https://dinhhuuphuc.com";
      return jsonRes({
        ok: true,
        shareId,
        shareUrl: `${origin}/share/${shareId}`
      });
    } catch {
      return jsonRes({ error: "Không thể tạo liên kết chia sẻ." }, 500);
    }
  }

  // 2. Xem trang cuộc trò chuyện đã chia sẻ (/share/:id)
  const shareMatch = pathname.match(/^\/share\/([a-zA-Z0-9_-]{6,32})$/);
  if (shareMatch && request.method === "GET") {
    const shareId = shareMatch[1];
    if (!env.AUTH_SESSIONS) {
      return new Response("Hệ thống lưu trữ chưa sẵn sàng.", { status: 500 });
    }
    const raw = await env.AUTH_SESSIONS.get(`chat_share:${shareId}`);
    if (!raw) {
      return new Response("Liên kết chia sẻ không tồn tại hoặc đã bị thu hồi.", {
        status: 404,
        headers: { "Content-Type": "text/plain; charset=UTF-8" }
      });
    }
    return new Response(renderSharedChatHtml(JSON.parse(raw)), {
      status: 200,
      headers: { "Content-Type": "text/html; charset=UTF-8" }
    });
  }

  // 3. Đồng bộ danh sách các luồng trò chuyện theo tài khoản Google
  if (pathname !== "/api/chat/history") return null;
  if (request.method === "OPTIONS") return corsPreflight();

  const email = await resolveUserEmail(request, env);
  if (!email) {
    return jsonRes({ authenticated: false, threads: [] }, 200);
  }

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
        pinned: Boolean(t.pinned),
        unread: Boolean(t.unread),
        shareId: t.shareId ? String(t.shareId).slice(0, 32) : "",
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
