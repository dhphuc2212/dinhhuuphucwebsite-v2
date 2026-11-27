window.DhpApi = (function () {
  function getSessionId() {
    return localStorage.getItem("dhp_gcal_sid") || "";
  }

  function getAuthHeaders(extra = {}) {
    const sid = getSessionId();
    return sid ? { ...extra, "X-Session-Id": sid } : { ...extra };
  }

  async function request(url, options = {}) {
    const headers = getAuthHeaders(options.headers || {});
    if (options.body && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }
    const res = await fetch(url, {
      credentials: "include",
      cache: "no-store",
      ...options,
      headers
    });
    return res.json();
  }

  return { getSessionId, getAuthHeaders, request };
})();
