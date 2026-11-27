import { corsPreflight, jsonRes, parseCookies, randomId } from "../shared/http.js";
import { SESSION_COOKIE_NAME, extractSessionId, resolveUserSession } from "../shared/session.js";

const GOOGLE_CLIENT_ID = "645926964017-6hqgk9jf1umh6qu1tc6vu0ec5c233pta.apps.googleusercontent.com";
const CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile"
].join(" ");
const SIXTY_DAYS_SEC = 60 * 24 * 60 * 60;

function buildSessionCookie(sid, maxAgeSec, remember60, isProdDomain) {
  const expiresDate = new Date(Date.now() + maxAgeSec * 1000).toUTCString();
  return [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(sid)}`,
    "Path=/",
    ...(isProdDomain ? ["Domain=.dinhhuuphuc.com"] : []),
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    ...(remember60 ? [`Max-Age=${maxAgeSec}`, `Expires=${expiresDate}`] : [])
  ].join("; ");
}

async function fetchGoogleUserInfo(accessToken) {
  try {
    const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!res.ok) return null;
    const u = await res.json();
    return {
      email: u.email || "",
      name: u.name || "",
      picture: u.picture || ""
    };
  } catch {
    return null;
  }
}

export async function handleAuthRoutes(pathname, request, env, url) {
  if (!pathname.startsWith("/api/auth/")) return null;
  if (request.method === "OPTIONS") return corsPreflight();

  const redirectUri = `${url.origin}/api/auth/google/callback`;
  const isProdDomain = url.hostname.endsWith("dinhhuuphuc.com");

  if (pathname === "/api/auth/google/start") {
    const remember60 = url.searchParams.get("remember60") !== "0";
    const statePayload = btoa(
      JSON.stringify({ nonce: randomId(12), remember60, ts: Date.now() })
    );

    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", CALENDAR_SCOPES);
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");
    authUrl.searchParams.set("include_granted_scopes", "true");
    authUrl.searchParams.set("state", statePayload);

    return Response.redirect(authUrl.toString(), 302);
  }

  if (pathname === "/api/auth/google/callback") {
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");
    const stateRaw = url.searchParams.get("state") || "";

    if (error || !code) {
      return Response.redirect(`${url.origin}/?gcal_error=${encodeURIComponent(error || "missing_code")}`, 302);
    }

    let remember60 = true;
    try {
      const parsedState = JSON.parse(atob(stateRaw));
      remember60 = Boolean(parsedState?.remember60);
    } catch {}

    if (!env.GOOGLE_CLIENT_SECRET) {
      return new Response("Thiếu biến bí mật GOOGLE_CLIENT_SECRET trên Cloudflare Worker.", { status: 500 });
    }

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code"
      })
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      return new Response(
        `<!doctype html><html lang="vi"><body style="font-family:sans-serif;padding:24px;">
          <h3>Lỗi đổi token Google (${tokenRes.status})</h3>
          <pre>${JSON.stringify(tokenData, null, 2)}</pre>
          <p>redirect_uri đang gửi: <b>${redirectUri}</b></p>
          <a href="/">Quay lại trang chủ</a>
        </body></html>`,
        { status: 400, headers: { "Content-Type": "text/html; charset=UTF-8" } }
      );
    }

    const profile = (await fetchGoogleUserInfo(tokenData.access_token)) || {
      email: "",
      name: "",
      picture: ""
    };

    const maxAgeSec = remember60 ? SIXTY_DAYS_SEC : 24 * 60 * 60;
    const expiresAtMs = Date.now() + maxAgeSec * 1000;
    const expiresIn = Number(tokenData.expires_in) || 3600;
    const sessionId = randomId(24);

    const sessionRecord = {
      refreshToken: tokenData.refresh_token || null,
      accessToken: tokenData.access_token,
      accessExpiresAt: Date.now() + expiresIn * 1000,
      email: profile.email,
      name: profile.name,
      picture: profile.picture,
      remember60,
      expiresAtMs
    };

    if (env.AUTH_SESSIONS) {
      await env.AUTH_SESSIONS.put(`sess:${sessionId}`, JSON.stringify(sessionRecord), {
        expirationTtl: maxAgeSec
      });
    }

    const hashParams = new URLSearchParams({
      gcal_sid: sessionId,
      gcal_email: profile.email,
      gcal_name: profile.name,
      gcal_pic: profile.picture,
      gcal_exp: String(expiresAtMs)
    });

    return new Response(null, {
      status: 302,
      headers: {
        Location: `${url.origin}/?gcal_ok=1#${hashParams.toString()}`,
        "Cache-Control": "no-store",
        "Set-Cookie": buildSessionCookie(sessionId, maxAgeSec, remember60, isProdDomain)
      }
    });
  }

  if (pathname === "/api/auth/refresh") {
    const cookies = parseCookies(request.headers.get("Cookie") || "");
    const headerSid = (request.headers.get("X-Session-Id") || "").trim();
    const sid = cookies[SESSION_COOKIE_NAME] || headerSid;

    if (!sid || !env.AUTH_SESSIONS) {
      return jsonRes({ authenticated: false, reason: "no_cookie_or_kv" }, 200);
    }

    const rawSess = await env.AUTH_SESSIONS.get(`sess:${sid}`);
    if (!rawSess) {
      return jsonRes({ authenticated: false, reason: "session_not_found" }, 200);
    }

    const sess = JSON.parse(rawSess);
    if (sess.expiresAtMs && Date.now() > sess.expiresAtMs) {
      await env.AUTH_SESSIONS.delete(`sess:${sid}`);
      return jsonRes({ authenticated: false, reason: "session_expired" }, 200);
    }

    const remainingTtl = Math.max(60, Math.floor((sess.expiresAtMs - Date.now()) / 1000));
    const setCookieHeader =
      !cookies[SESSION_COOKIE_NAME] && headerSid
        ? { "Set-Cookie": buildSessionCookie(sid, remainingTtl, Boolean(sess.remember60), isProdDomain) }
        : {};

    let needSaveSession = false;

    if (!sess.accessToken || !sess.accessExpiresAt || Date.now() >= sess.accessExpiresAt - 60000) {
      if (!sess.refreshToken || !env.GOOGLE_CLIENT_SECRET) {
        return jsonRes({ authenticated: false, reason: "missing_refresh_token" }, 200);
      }

      const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: env.GOOGLE_CLIENT_SECRET,
          refresh_token: sess.refreshToken,
          grant_type: "refresh_token"
        })
      });

      const refreshed = await refreshRes.json();
      if (!refreshRes.ok || !refreshed.access_token) {
        return jsonRes({ authenticated: false, reason: refreshed.error || "refresh_failed" }, 200);
      }

      const newExpiresIn = Number(refreshed.expires_in) || 3600;
      sess.accessToken = refreshed.access_token;
      sess.accessExpiresAt = Date.now() + newExpiresIn * 1000;
      if (refreshed.refresh_token) sess.refreshToken = refreshed.refresh_token;
      needSaveSession = true;
    }

    // Tự động bổ sung name & picture từ Google nếu phiên đăng nhập cũ chưa lưu
    if ((!sess.name || !sess.picture) && sess.accessToken) {
      const info = await fetchGoogleUserInfo(sess.accessToken);
      if (info) {
        sess.email = info.email || sess.email;
        sess.name = info.name || sess.name;
        sess.picture = info.picture || sess.picture;
        needSaveSession = true;
      }
    }

    if (needSaveSession) {
      await env.AUTH_SESSIONS.put(`sess:${sid}`, JSON.stringify(sess), {
        expirationTtl: remainingTtl
      });
    }

    let extraProfile = { birthday: "", phone: "", gender: "", bio: "" };
    if (sess.email) {
      try {
        const pRaw = await env.AUTH_SESSIONS.get(`user_profile:${sess.email.toLowerCase()}`);
        if (pRaw) extraProfile = { ...extraProfile, ...JSON.parse(pRaw) };
      } catch {}
    }

    return jsonRes(
      {
        authenticated: true,
        accessToken: sess.accessToken,
        expiresIn: Math.max(60, Math.floor((sess.accessExpiresAt - Date.now()) / 1000)),
        email: sess.email || "",
        name: sess.name || "",
        picture: sess.picture || "",
        remember60: Boolean(sess.remember60),
        expiresAtMs: sess.expiresAtMs,
        profile: extraProfile
      },
      200,
      setCookieHeader
    );
  }

  if (pathname === "/api/auth/profile" && request.method === "POST") {
    const { email } = await resolveUserSession(request, env);
    if (!email) {
      return jsonRes({ error: "Vui lòng đăng nhập Google để lưu hồ sơ." }, 401);
    }

    try {
      const body = await request.json();
      const profileData = {
        birthday: String(body.birthday || "").slice(0, 32),
        phone: String(body.phone || "").slice(0, 32),
        gender: String(body.gender || "").slice(0, 32),
        bio: String(body.bio || "").slice(0, 300),
        updatedAt: new Date().toISOString()
      };
      await env.AUTH_SESSIONS.put(`user_profile:${email}`, JSON.stringify(profileData));
      return jsonRes({ ok: true, profile: profileData });
    } catch {
      return jsonRes({ error: "Không thể lưu thông tin tài khoản." }, 500);
    }
  }

  if (pathname === "/api/auth/logout") {
    const sid = extractSessionId(request);
    if (sid && env.AUTH_SESSIONS) {
      await env.AUTH_SESSIONS.delete(`sess:${sid}`);
    }
    const clearCookie = [
      `${SESSION_COOKIE_NAME}=`,
      "Path=/",
      ...(isProdDomain ? ["Domain=.dinhhuuphuc.com"] : []),
      "HttpOnly",
      "Secure",
      "SameSite=Lax",
      "Max-Age=0",
      "Expires=Thu, 01 Jan 1970 00:00:00 GMT"
    ].join("; ");
    return jsonRes({ ok: true }, 200, { "Set-Cookie": clearCookie });
  }

  return null;
}
