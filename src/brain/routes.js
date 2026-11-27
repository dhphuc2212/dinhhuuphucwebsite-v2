import { corsPreflight, jsonRes } from "../shared/http.js";
import { resolveUserEmail } from "../shared/session.js";
import { getBrainIndex, saveBrainIndex, saveMemoryEntry } from "./storage.js";

export async function handleSecondBrainRoutes(pathname, request, env) {
  if (!pathname.startsWith("/api/brain")) return null;
  if (request.method === "OPTIONS") return corsPreflight();

  const email = await resolveUserEmail(request, env);
  if (!email) {
    return jsonRes(
      { authenticated: false, items: [], error: "Vui lòng đăng nhập Google để dùng Bộ não thứ 2." },
      200
    );
  }

  if (pathname === "/api/brain" && request.method === "GET") {
    const items = await getBrainIndex(email, env);
    return jsonRes({ authenticated: true, email, count: items.length, items });
  }

  const itemMatch = pathname.match(/^\/api\/brain\/item\/([^/]+)$/);
  if (itemMatch && request.method === "GET") {
    const id = decodeURIComponent(itemMatch[1]);
    const raw = await env.AUTH_SESSIONS.get(`brain_item:${email}:${id}`);
    if (!raw) return jsonRes({ error: "Không tìm thấy ghi nhớ." }, 404);
    return jsonRes({ ok: true, item: JSON.parse(raw) });
  }

  if (pathname === "/api/brain" && request.method === "POST") {
    try {
      const body = await request.json();
      const content = String(body.summary || body.content || "").trim();
      if (!content && !body.sourceUrl) {
        return jsonRes({ error: "Vui lòng nhập nội dung hoặc đường dẫn cần lưu." }, 400);
      }
      const saved = await saveMemoryEntry(email, body, env);
      return jsonRes({ ok: true, item: saved });
    } catch {
      return jsonRes({ error: "Không thể lưu vào Bộ não thứ 2." }, 500);
    }
  }

  if (itemMatch && request.method === "DELETE") {
    const id = decodeURIComponent(itemMatch[1]);
    await env.AUTH_SESSIONS.delete(`brain_item:${email}:${id}`);
    const indexList = await getBrainIndex(email, env);
    const nextList = indexList.filter((it) => it.id !== id);
    await saveBrainIndex(email, nextList, env);
    return jsonRes({ ok: true, id, count: nextList.length });
  }

  return jsonRes({ error: "Method Not Allowed" }, 405);
}
