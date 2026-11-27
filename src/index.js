import { handleAuthRoutes } from "./auth/auth.js";
import { handleChatRoutes } from "./ai/chat.js";
import { handleChatHistoryRoutes } from "./history/chat-history.js";
import { handleSecondBrainRoutes } from "./brain/routes.js";
import { handleNotepadRoutes } from "./notepad/notepad.js";
import { handleStaticPages } from "./pages/pages.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\/+$/, "") || "/";

    const handlers = [
      () => handleAuthRoutes(pathname, request, env, url),
      () => handleSecondBrainRoutes(pathname, request, env),
      () => handleChatHistoryRoutes(pathname, request, env),
      () => handleChatRoutes(pathname, request, env),
      () => handleNotepadRoutes(pathname, request, env)
    ];

    for (const run of handlers) {
      const res = await run();
      if (res) return res;
    }

    if (pathname === "/notepad" || pathname.startsWith("/notepad/")) {
      const htmlRes = await env.ASSETS.fetch(new Request(new URL("/index.html", request.url)));
      return new Response(htmlRes.body, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-cache"
        }
      });
    }

    const pageResponse = handleStaticPages(pathname);
    if (pageResponse) return pageResponse;

    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status !== 404) return assetResponse;
    return env.ASSETS.fetch(new Request(new URL("/index.html", request.url), request));
  }
};
