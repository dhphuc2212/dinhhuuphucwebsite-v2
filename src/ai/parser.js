export function formatIsoToDmy(isoStr = "") {
  const m = String(isoStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : isoStr;
}

export function extractAiPayload(result) {
  const raw = result?.response ?? result;

  if (raw && typeof raw === "object") {
    if (typeof raw.reply === "string") {
      return {
        reply: raw.reply,
        schedule: raw.schedule || null,
        memoryToSave: raw.memoryToSave || null
      };
    }
    if (typeof raw.response === "string") {
      return extractAiPayload({ response: raw.response });
    }
    return { reply: JSON.stringify(raw), schedule: null, memoryToSave: null };
  }

  const rawText = String(raw || "").trim();
  if (!rawText) {
    return { reply: "Xin lỗi, tôi chưa nhận được phản hồi từ AI.", schedule: null, memoryToSave: null };
  }

  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const obj = JSON.parse(jsonMatch[0]);
      if (obj && typeof obj.reply === "string") {
        return {
          reply: obj.reply,
          schedule: obj.schedule || null,
          memoryToSave: obj.memoryToSave || null
        };
      }
    } catch {}
  }

  return { reply: rawText, schedule: null, memoryToSave: null };
}
