import { parseCookies } from "./http.js";

export const SESSION_COOKIE_NAME = "dhp_gcal_sid";

export function extractSessionId(request) {
  const cookies = parseCookies(request.headers.get("Cookie") || "");
  if (cookies[SESSION_COOKIE_NAME]) return cookies[SESSION_COOKIE_NAME].trim();

  const headerSid = request.headers.get("X-Session-Id");
  return headerSid ? headerSid.trim() : "";
}

export async function resolveUserSession(request, env) {
  const sid = extractSessionId(request);
  if (!sid || !env.AUTH_SESSIONS) return { sid: "", email: "", sess: null };

  try {
    const raw = await env.AUTH_SESSIONS.get(`sess:${sid}`);
    if (!raw) return { sid, email: "", sess: null };

    const sess = JSON.parse(raw);
    if (sess.expiresAtMs && Date.now() > sess.expiresAtMs) {
      await env.AUTH_SESSIONS.delete(`sess:${sid}`);
      return { sid, email: "", sess: null };
    }

    const email = (sess.email || "").toLowerCase().trim();
    return { sid, email, sess };
  } catch {
    return { sid, email: "", sess: null };
  }
}

export async function resolveUserEmail(request, env) {
  const { email } = await resolveUserSession(request, env);
  return email;
}
