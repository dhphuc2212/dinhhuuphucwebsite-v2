import { corsPreflight, jsonRes, randomId } from "../shared/http.js";
import { getSessionIdFromRequest } from "../shared/session.js";

const SESSION_TTL = 60 * 60 * 24 * 60; // 60 ngày

export async function handleAuthRoutes(pathname, request, env, url) {
  if (pathname === "/auth/google") {
    const clientId = env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return new Response("Thiếu biến môi trường GOOGLE_CLIENT_ID trên Cloudflare.", { status: 500 });
    }

    const redirectUri = `${url.origin}/auth/google/callback`;
    const state = randomId(16);

    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set(
      "scope",
      "openid email profile https://www.googleapis.com/auth/calendar.events"
    );
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");
    authUrl.searchParams.set("state", state);

    return Response.redirect(authUrl.toString(), 302);
  }

  if (pathname === "/auth/google/callback") {
    const code = url.searchParams.get("code");
    const err = url.searchParams.get("error");
    if (err || !code) {
      return Response.redirect(`${url.origin}/?auth=cancelled`, 302);
    }

    const clientId = env.GOOGLE_CLIENT_ID;
    const clientSecret = env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${url.origin}/auth/google/callback`;

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code"
      })
    });

    const tokens = await tokenRes.json();
    if (!tokenRes.ok || !tokens.access_token) {
      return Response.redirect(`${url.origin}/?auth=failed`, 302);
    }

    let email = "";
    let name = "";
    let picture = "";
    try {
      const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${tokens.access_token}` }
      });
      if (userRes.ok) {
        const u = await userRes.json();
        email = u.email || "";
        name = u.name || "";
        picture = u.picture || "";
      }
    } catch {}

    const sessionId = randomId(24);
    const sessionRecord = {
      email,
      name,
      picture,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || "",
      expiresAt: Date.now() + (Number(tokens.expires_in || 3600) - 60) * 1000,
      createdAt: new Date().toISOString()
    };

    if (env.AUTH_SESSIONS) {
      await env.AUTH_SESSIONS.put(`session:${sessionId}`, JSON.stringify(sessionRecord), {
        expirationTtl: SESSION_TTL
      });
      if (email) {
        await env.AUTH_SESSIONS.put(`email_map:${sessionId}`, email, {
          expirationTtl: SESSION_TTL
        });
      }
    }

    const backUrl = new URL(url.origin);
    backUrl.searchParams.set("sid", sessionId);
    backUrl.searchParams.set("auth", "success");

    return new Response(null, {
      status: 302,
      headers: {
        Location: backUrl.toString(),
        "Set-Cookie": `dhp_sid=${sessionId}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL}`
      }
    });
  }

  if (pathname === "/api/auth/session") {
    if (request.method === "OPTIONS") return corsPreflight();
    const sid = getSessionIdFromRequest(request);
    if (!sid || !env.AUTH_SESSIONS) {
      return jsonRes({ authenticated: false });
    }

    const raw = await env.AUTH_SESSIONS.get(`session:${sid}`);
    if (!raw) return jsonRes({ authenticated: false });

    const sess = JSON.parse(raw);

    if ((!sess.accessToken || Date.now() >= (sess.expiresAt || 0)) && sess.refreshToken) {
      try {
        const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: env.GOOGLE_CLIENT_ID,
            client_secret: env.GOOGLE_CLIENT_SECRET,
            refresh_token: sess.refreshToken,
            grant_type: "refresh_token"
          })
        });
        const refreshed = await refreshRes.json();
        if (refreshRes.ok && refreshed.access_token) {
          sess.accessToken = refreshed.access_token;
          sess.expiresAt = Date.now() + (Number(refreshed.expires_in || 3600) - 60) * 1000;
        }
      } catch {}
    }

    if ((!sess.name || !sess.picture) && sess.accessToken) {
      try {
        const uRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${sess.accessToken}` }
        });
        if (uRes.ok) {
          const u = await uRes.json();
          sess.email = u.email || sess.email;
          sess.name = u.name || sess.name;
          sess.picture = u.picture || sess.picture;
          await env.AUTH_SESSIONS.put(`session:${sid}`, JSON.stringify(sess), {
            expirationTtl: SESSION_TTL
          });
        }
      } catch {}
    }

    let extraProfile = { birthday: "", phone: "", gender: "", bio: "" };
    if (sess.email) {
      try {
        const pRaw = await env.AUTH_SESSIONS.get(`user_profile:${sess.email}`);
        if (pRaw) extraProfile = { ...extraProfile, ...JSON.parse(pRaw) };
      } catch {}
    }

    return jsonRes({
      authenticated: true,
      email: sess.email || "",
      name: sess.name || "",
      picture: sess.picture || "",
      createdAt: sess.createdAt || "",
      accessToken: sess.accessToken || "",
      profile: extraProfile
    });
  }

  if (pathname === "/api/auth/profile") {
    if (request.method === "OPTIONS") return corsPreflight();
    if (request.method !== "POST") return jsonRes({ error: "Method Not Allowed" }, 405);

    const sid = getSessionIdFromRequest(request);
    if (!sid || !env.AUTH_SESSIONS) return jsonRes({ error: "Chưa đăng nhập." }, 401);

    const raw = await env.AUTH_SESSIONS.get(`session:${sid}`);
    if (!raw) return jsonRes({ error: "Phiên đăng nhập không hợp lệ." }, 401);

    const sess = JSON.parse(raw);
    if (!sess.email) return jsonRes({ error: "Không xác định được email." }, 400);

    try {
      const body = await request.json();
      const profileData = {
        birthday: String(body.birthday || "").slice(0, 32),
        phone: String(body.phone || "").slice(0, 32),
        gender: String(body.gender || "").slice(0, 32),
        bio: String(body.bio || "").slice(0, 300),
        updatedAt: new Date().toISOString()
      };
      await env.AUTH_SESSIONS.put(`user_profile:${sess.email}`, JSON.stringify(profileData));
      return jsonRes({ ok: true, profile: profileData });
    } catch {
      return jsonRes({ error: "Không thể lưu thông tin tài khoản." }, 500);
    }
  }

  if (pathname === "/api/auth/logout") {
    if (request.method === "OPTIONS") return corsPreflight();
    const sid = getSessionIdFromRequest(request);
    if (sid && env.AUTH_SESSIONS) {
      await env.AUTH_SESSIONS.delete(`session:${sid}`);
      await env.AUTH_SESSIONS.delete(`email_map:${sid}`);
    }
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": "dhp_sid=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"
      }
    });
  }

  return null;
}
