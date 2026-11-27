import { fetchUrlMetadata } from "./metadata.js";

function normalizeText(str = "") {
  return String(str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(str = "") {
  const stopWords = new Set([
    "la", "va", "cua", "cho", "ve", "nhung", "cac", "mot", "co", "khong",
    "toi", "minh", "ban", "ay", "nay", "do", "khi", "nao", "gi", "sao",
    "nhu", "the", "trong", "ngoai", "tren", "duoi", "voi", "tu", "den",
    "da", "dang", "se", "duoc", "bi", "hay", "hoac"
  ]);
  return normalizeText(str)
    .split(" ")
    .filter((w) => w.length >= 2 && !stopWords.has(w));
}

export async function getBrainIndex(email, env) {
  if (!email || !env.AUTH_SESSIONS) return [];
  try {
    const raw = await env.AUTH_SESSIONS.get(`brain_index:${email}`);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveBrainIndex(email, indexList, env) {
  await env.AUTH_SESSIONS.put(`brain_index:${email}`, JSON.stringify(indexList));
}

export async function saveMemoryEntry(email, payload, env) {
  if (!email || !env.AUTH_SESSIONS) return null;

  const id = "mem_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6);
  const sourceUrl = String(payload.sourceUrl || "").trim().slice(0, 500);
  let title = String(payload.title || "").trim().slice(0, 180);
  let summary = String(payload.summary || payload.content || "").trim().slice(0, 6000);
  const tags = Array.isArray(payload.tags)
    ? payload.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 12)
    : [];

  if (sourceUrl && (!title || summary.length < 40)) {
    const meta = await fetchUrlMetadata(sourceUrl);
    if (meta) {
      if (!title && meta.title) title = meta.title.slice(0, 180);
      if (meta.snippet && !summary.includes(meta.snippet)) {
        summary = summary ? `${summary}\n(${meta.snippet})` : meta.snippet;
      }
    }
  }

  if (!title) {
    title = summary.slice(0, 65) + (summary.length > 65 ? "..." : "");
  }

  const createdAt = new Date().toISOString();
  const fullItem = { id, title, summary, tags, sourceUrl, createdAt };

  await env.AUTH_SESSIONS.put(`brain_item:${email}:${id}`, JSON.stringify(fullItem));

  const indexList = await getBrainIndex(email, env);
  const indexEntry = {
    id,
    title,
    tags,
    sourceUrl,
    preview: summary.slice(0, 160),
    createdAt
  };
  await saveBrainIndex(email, [indexEntry, ...indexList], env);

  return fullItem;
}

export async function searchRelevantMemories(email, query, env, limit = 5) {
  if (!email || !env.AUTH_SESSIONS) return [];
  const indexList = await getBrainIndex(email, env);
  if (indexList.length === 0) return [];

  const qNorm = normalizeText(query);
  const qTokens = tokenize(query);
  const isGeneralRecall =
    /da luu|da day|bo nao|ghi nho gi|tat ca|danh sach|hom truoc|nhung gi/i.test(qNorm) && qTokens.length <= 3;

  const scored = indexList.map((item, idx) => {
    const hay = normalizeText(`${item.title} ${(item.tags || []).join(" ")} ${item.preview || ""}`);
    let score = 0;

    if (qNorm && hay.includes(qNorm)) score += 10;
    for (const tk of qTokens) {
      if (hay.includes(tk)) score += 3;
    }
    if (isGeneralRecall) score += Math.max(1, 6 - idx);
    return { item, score };
  });

  const topMatches = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  if (topMatches.length === 0) return [];

  const detailed = await Promise.all(
    topMatches.map(async ({ item }) => {
      try {
        const raw = await env.AUTH_SESSIONS.get(`brain_item:${email}:${item.id}`);
        return raw ? JSON.parse(raw) : item;
      } catch {
        return item;
      }
    })
  );

  return detailed.filter(Boolean);
}
