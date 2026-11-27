export async function fetchUrlMetadata(rawUrl) {
  if (!rawUrl || !/^https?:\/\//i.test(rawUrl)) return null;
  try {
    if (/youtube\.com|youtu\.be/i.test(rawUrl)) {
      const oembed = `https://www.youtube.com/oembed?url=${encodeURIComponent(rawUrl)}&format=json`;
      const res = await fetch(oembed, { cf: { cacheTtl: 3600 } });
      if (res.ok) {
        const data = await res.json();
        return {
          title: data.title || "",
          snippet: data.author_name ? `Video YouTube từ kênh: ${data.author_name}` : "Video YouTube"
        };
      }
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(rawUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; DHPSecondBrain/1.0)" }
    });
    clearTimeout(timer);
    if (!res.ok) return null;

    const html = (await res.text()).slice(0, 45000);
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const descMatch =
      html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);

    const title = titleMatch ? titleMatch[1].replace(/\s+/g, " ").trim() : "";
    const snippet = descMatch ? descMatch[1].replace(/\s+/g, " ").trim() : "";
    return title || snippet ? { title, snippet } : null;
  } catch {
    return null;
  }
}
