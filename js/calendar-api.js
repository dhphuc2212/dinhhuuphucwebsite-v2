window.CalendarApi = (function () {
  const GOOGLE_CLIENT_ID = "645926964017-6hqgk9jf1umh6qu1tc6vu0ec5c233pta.apps.googleusercontent.com";
  const SCOPES = "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email";

  let sessionId = localStorage.getItem("dhp_gcal_sid") || "";
  let accessToken = "";
  let userEmail = localStorage.getItem("dhp_gcal_email") || "";
  let expiresAtMs = Number(localStorage.getItem("dhp_gcal_exp") || "0") || 0;
  let refreshTimer = null;
  let ongoingRefreshPromise = null;

  function persistCache() {
    try {
      if (sessionId) localStorage.setItem("dhp_gcal_sid", sessionId);
      else localStorage.removeItem("dhp_gcal_sid");

      if (userEmail) localStorage.setItem("dhp_gcal_email", userEmail);
      else localStorage.removeItem("dhp_gcal_email");

      if (expiresAtMs) localStorage.setItem("dhp_gcal_exp", String(expiresAtMs));
      else localStorage.removeItem("dhp_gcal_exp");
    } catch {}
  }

  function getAuthState() {
    return {
      sessionId,
      accessToken,
      userEmail,
      expiresAtMs,
      isLoggedIn: Boolean(accessToken || (sessionId && expiresAtMs > Date.now()))
    };
  }

  function scheduleAutoRefresh(expiresInSec = 3500, onStateChange) {
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }
    const delayMs = Math.max(15000, (Number(expiresInSec) - 120) * 1000);
    refreshTimer = setTimeout(() => {
      refreshSession({ onStateChange });
    }, delayMs);
  }

  async function refreshSession({ onStateChange, retryCount = 0 } = {}) {
    if (ongoingRefreshPromise) return ongoingRefreshPromise;

    ongoingRefreshPromise = (async () => {
      try {
        sessionId = localStorage.getItem("dhp_gcal_sid") || sessionId;
        const headers = {};
        if (sessionId) headers["X-Session-Id"] = sessionId;

        const res = await fetch("/api/auth/refresh", {
          credentials: "include",
          cache: "no-store",
          headers
        });
        if (!res.ok) return null;
        const data = await res.json();

        if (data.authenticated && data.accessToken) {
          accessToken = data.accessToken;
          userEmail = data.email || userEmail || "Tài khoản Google";
          expiresAtMs = Number(data.expiresAtMs) || 0;
          persistCache();
          if (typeof onStateChange === "function") onStateChange(true);
          scheduleAutoRefresh(data.expiresIn || 3600, onStateChange);
          return accessToken;
        }

        if (sessionId && data.reason === "session_not_found" && retryCount < 2) {
          ongoingRefreshPromise = null;
          await new Promise((r) => setTimeout(r, 1200));
          return refreshSession({ onStateChange, retryCount: retryCount + 1 });
        }

        if (data.reason === "expired" || data.reason === "revoked") {
          clearAuth();
          if (typeof onStateChange === "function") onStateChange(false);
        }
      } catch {}
      return null;
    })();

    try {
      return await ongoingRefreshPromise;
    } finally {
      ongoingRefreshPromise = null;
    }
  }

  function clearAuth() {
    if (refreshTimer) clearTimeout(refreshTimer);
    sessionId = "";
    accessToken = "";
    userEmail = "";
    expiresAtMs = 0;
    persistCache();
  }

  function login(remember60 = true) {
    window.location.assign(`/api/auth/google/start?remember60=${remember60 ? "1" : "0"}`);
  }

  async function logout() {
    const oldSid = sessionId;
    clearAuth();
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: oldSid ? { "X-Session-Id": oldSid } : {}
      });
    } catch {}
  }

  function handleRedirectParams(notify) {
    if (window.location.hash && window.location.hash.includes("gcal_sid=")) {
      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const newSid = hashParams.get("gcal_sid");
      if (newSid) {
        sessionId = newSid;
        userEmail = hashParams.get("gcal_email") || "";
        expiresAtMs = Number(hashParams.get("gcal_exp") || "0") || 0;
        persistCache();
      }
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get("gcal_ok") === "1") {
      window.history.replaceState({}, "", window.location.pathname);
      if (notify) notify("Đã kết nối Google Calendar (duy trì 60 ngày)!");
    } else if (params.get("gcal_error")) {
      window.history.replaceState({}, "", window.location.pathname);
      if (notify) notify("Đăng nhập Google không thành công: " + params.get("gcal_error"));
    }
  }

  async function gcalFetch(url, options = {}) {
    if (!accessToken) await refreshSession();
    if (!accessToken) return { status: 401, ok: false, json: async () => ({}) };

    const makeReq = (token) =>
      fetch(url, {
        ...options,
        headers: {
          ...(options.headers || {}),
          Authorization: `Bearer ${token}`
        }
      });

    let res = await makeReq(accessToken);
    if (res.status === 401) {
      const refreshed = await refreshSession();
      if (refreshed) res = await makeReq(refreshed);
    }
    return res;
  }

  async function fetchEventsForDate(dateStr) {
    const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
    url.searchParams.set("timeMin", `${dateStr}T00:00:00+07:00`);
    url.searchParams.set("timeMax", `${dateStr}T23:59:59+07:00`);
    url.searchParams.set("maxResults", "50");
    url.searchParams.set("singleEvents", "true");
    url.searchParams.set("orderBy", "startTime");

    const res = await gcalFetch(url.toString());
    if (!res.ok) return { ok: false, status: res.status, items: [] };
    const data = await res.json();
    return { ok: true, items: data.items || [] };
  }

  async function insertEvent(payload) {
    const res = await gcalFetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { ok: false, error: err?.error?.message || `HTTP ${res.status}` };
    }
    return { ok: true, data: await res.json() };
  }

  async function patchEvent(eventId, payload) {
    const endpoint = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`;
    const res = await gcalFetch(endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) return null;
    return await res.json();
  }

  async function removeEvent(eventId) {
    const endpoint = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`;
    const res = await gcalFetch(endpoint, { method: "DELETE" });
    if (res.status === 204 || res.ok) return { ok: true };
    const err = await res.json().catch(() => ({}));
    return { ok: false, status: res.status, error: err?.error?.message || "" };
  }

  return {
    GOOGLE_CLIENT_ID,
    SCOPES,
    getAuthState,
    refreshSession,
    login,
    logout,
    handleRedirectParams,
    fetchEventsForDate,
    insertEvent,
    patchEvent,
    removeEvent
  };
})();
