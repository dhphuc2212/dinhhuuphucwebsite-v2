window.CalendarAiBridge = (function () {
  const R = window.CalendarRenderer;

  function findBestMatch(events, targetTitle) {
    const candidates = (events || []).filter((ev) => ev.eventType !== "birthday");
    if (candidates.length === 0) return null;

    const kw = (targetTitle || "").toLowerCase().replace(/^✅\s*/, "").trim();
    if (!kw) return candidates[0];

    const exact = candidates.find((ev) =>
      (ev.summary || "").toLowerCase().replace(/^✅\s*/, "").includes(kw)
    );
    if (exact) return exact;

    const words = kw.split(/\s+/).filter((w) => w.length > 1);
    return (
      candidates.find((ev) => {
        const s = (ev.summary || "").toLowerCase();
        return words.some((w) => s.includes(w));
      }) || null
    );
  }

  async function executeAiAction(schedule, ctx) {
    if (!schedule || typeof schedule !== "object") {
      return { ok: false, message: "Dữ liệu lịch không hợp lệ." };
    }
    const action = (schedule.action || "create").toLowerCase();

    if (action === "create") {
      const ok = await ctx.createEvent(schedule);
      return { ok, message: ok ? "Đã thêm vào Google Calendar" : "Không thể thêm lịch" };
    }

    const searchDate = schedule.targetDate || schedule.date || ctx.getSelectedDate();
    if (ctx.getSelectedDate() !== searchDate) {
      await ctx.selectAndLoadDate(searchDate);
    } else if (ctx.getCachedEvents().length === 0) {
      await ctx.loadEvents();
    }

    const matched = findBestMatch(ctx.getCachedEvents(), schedule.targetTitle || schedule.title);
    if (!matched) {
      ctx.notify("Không tìm thấy sự kiện phù hợp trong ngày để thực hiện thao tác.");
      return { ok: false, message: "Không tìm thấy sự kiện khớp tên" };
    }

    if (action === "delete") {
      const ok = await ctx.deleteEventSilent(matched.id, matched.summary);
      return { ok, message: ok ? "Đã xóa khỏi Google Calendar" : "Lỗi khi xóa sự kiện" };
    }

    if (action === "complete") {
      const targetDone = typeof schedule.done === "boolean" ? schedule.done : true;
      await ctx.toggleEventDone(matched.id, targetDone);
      return {
        ok: true,
        message: targetDone ? "Đã đánh dấu hoàn thành" : "Đã mở lại công việc"
      };
    }

    if (action === "update") {
      const oldStart = new Date(matched.start.dateTime);
      const oldEnd = new Date(matched.end.dateTime);
      const cleanOldTitle = (matched.summary || "").replace(/^✅\s*/, "");
      const ok = await ctx.updateEvent(matched.id, {
        title: schedule.title || cleanOldTitle,
        date: schedule.date || R.toInputDate(oldStart),
        startTime: schedule.startTime || R.toInputTime(oldStart),
        endTime: schedule.endTime || R.toInputTime(oldEnd),
        description: schedule.description !== undefined ? schedule.description : matched.description || ""
      });
      return { ok, message: ok ? "Đã cập nhật trên Google Calendar" : "Lỗi cập nhật lịch" };
    }

    return { ok: false, message: "Hành động không hỗ trợ" };
  }

  return { executeAiAction };
})();
