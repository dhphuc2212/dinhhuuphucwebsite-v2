window.CalendarHelpers = (function () {
  let weatherCache = null;

  function escapeHtml(str = "") {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function getTodayStr() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function shiftDateStr(baseStr, deltaDays) {
    const [y, m, d] = baseStr.split("-").map(Number);
    const dt = new Date(y, m - 1, d + deltaDays);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
  }

  function formatDisplayDate(dateStr) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    const today = getTodayStr();
    const yesterday = shiftDateStr(today, -1);
    const tomorrow = shiftDateStr(today, 1);

    const weekdays = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
    const wName = weekdays[dt.getDay()];
    const shortDate = `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;

    let prefix = "";
    if (dateStr === today) prefix = "Hôm nay, ";
    else if (dateStr === yesterday) prefix = "Hôm qua, ";
    else if (dateStr === tomorrow) prefix = "Ngày mai, ";

    return `${prefix}${wName} - ${shortDate}`;
  }

  function formatDuration(mins) {
    if (mins <= 0) return "";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}g ${m}p`;
    if (h > 0) return `${h} giờ`;
    return `${m} phút`;
  }

  function normalizeTime(t, fallback) {
    if (!t || typeof t !== "string") return fallback;
    const m = t.trim().match(/^(\d{1,2}):(\d{2})/);
    if (!m) return fallback;
    return `${m[1].padStart(2, "0")}:${m[2]}`;
  }

  // Chỉnh sửa danh sách từ khóa phân loại nhãn màu tại đây
  function classifyEvent(summary = "", description = "") {
    const text = `${summary} ${description}`.toLowerCase();
    if (/gấp|khẩn|hợp đồng|chốt|deadline|hạn chót|quan trọng|thanh toán/.test(text)) {
      return { cls: "dhp-tag-urgent", badgeCls: "dhp-badge-cat-urgent", label: "Ưu tiên" };
    }
    if (/gạo|ông du|st25|lứt|nếp|lài|kho|giao hàng|logistics|đơn hàng|nhập|xuất|khách|đại lý|lotte|aeon/.test(text)) {
      return { cls: "dhp-tag-business", badgeCls: "dhp-badge-cat-business", label: "Gạo Ông Du" };
    }
    if (/họp|call|trao đổi|gặp|báo cáo|làm việc|meeting/.test(text)) {
      return { cls: "dhp-tag-meeting", badgeCls: "dhp-badge-cat-meeting", label: "Lịch hẹn" };
    }
    return { cls: "dhp-tag-personal", badgeCls: "dhp-badge-cat-personal", label: "Cá nhân" };
  }

  async function fetchWeatherForDate(dateStr) {
    try {
      // Tọa độ TP.HCM (10.8231, 106.6297) — Open-Meteo miễn phí không cần API Key
      if (!weatherCache || Date.now() - weatherCache.fetchedAt > 30 * 60 * 1000) {
        const res = await fetch(
          "https://api.open-meteo.com/v1/forecast?latitude=10.8231&longitude=106.6297&hourly=temperature_2m,precipitation_probability,weathercode&timezone=Asia%2FHo_Chi_Minh&forecast_days=7"
        );
        if (res.ok) {
          weatherCache = { fetchedAt: Date.now(), data: await res.json() };
        }
      }
      const hourly = weatherCache?.data?.hourly;
      if (!hourly?.time) return null;

      const dayIndices = [];
      hourly.time.forEach((t, idx) => {
        if (t.startsWith(dateStr)) dayIndices.push(idx);
      });
      if (!dayIndices.length) return null;

      let maxTemp = -99;
      const rainyHours = [];
      dayIndices.forEach((idx) => {
        const temp = hourly.temperature_2m[idx];
        const prob = hourly.precipitation_probability[idx] || 0;
        const code = hourly.weathercode[idx] || 0;
        const hourNum = Number(hourly.time[idx].slice(11, 13));
        if (temp > maxTemp) maxTemp = temp;
        if ((prob >= 50 || code >= 51) && hourNum >= 6 && hourNum <= 21) {
          rainyHours.push(hourNum);
        }
      });

      const summary =
        rainyHours.length > 0
          ? `🌧️ Có khả năng mưa lúc ${String(rainyHours[0]).padStart(2, "0")}:00–${String(
              rainyHours[rainyHours.length - 1] + 1
            ).padStart(2, "0")}:00 • ${Math.round(maxTemp)}°C`
          : `☀️ Thời tiết thuận lợi, ít mưa • ${Math.round(maxTemp)}°C`;

      return { summary, rainyHours, maxTemp };
    } catch {
      return null;
    }
  }

  return {
    escapeHtml,
    getTodayStr,
    shiftDateStr,
    formatDisplayDate,
    formatDuration,
    normalizeTime,
    classifyEvent,
    fetchWeatherForDate
  };
})();
