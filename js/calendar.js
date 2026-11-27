window.GoogleCalendarManager = (function () {
  const H = window.CalendarHelpers;
  const Api = window.CalendarApi;
  const Renderer = window.CalendarRenderer;
  const AiBridge = window.CalendarAiBridge;

  let selectedDateStr = H.getTodayStr();
  let hideBirthdays = true;
  let cachedEvents = [];
  let editingEventId = null;
  let manualCreateDraft = null;
  let liveTickTimer = null;

  let checklistState = JSON.parse(localStorage.getItem("dhp_gcal_tasks") || "{}");
  let eventDoneState = JSON.parse(localStorage.getItem("dhp_gcal_done") || "{}");

  function notify(msg) {
    if (typeof window.showToast === "function") window.showToast(msg);
  }

  function saveChecklist() {
    try { localStorage.setItem("dhp_gcal_tasks", JSON.stringify(checklistState)); } catch {}
  }

  function saveDoneState() {
    try { localStorage.setItem("dhp_gcal_done", JSON.stringify(eventDoneState)); } catch {}
  }

  function addOneHour(timeStr = "09:00") {
    const [hStr, mStr] = String(timeStr).split(":");
    const h = Math.min(23, (Number(hStr) || 9) + 1);
    return `${String(h).padStart(2, "0")}:${String(Number(mStr) || 0).padStart(2, "0")}`;
  }

  function openManualCreate(customStartTime = "") {
    editingEventId = null;
    if (customStartTime) {
      const normStart = H.normalizeTime(customStartTime, "09:00");
      manualCreateDraft = { date: selectedDateStr, startTime: normStart, endTime: addOneHour(normStart) };
    } else if (selectedDateStr === H.getTodayStr()) {
      const nextHour = Math.min(22, new Date().getHours() + 1);
      const start = `${String(nextHour).padStart(2, "0")}:00`;
      manualCreateDraft = { date: selectedDateStr, startTime: start, endTime: addOneHour(start) };
    } else {
      manualCreateDraft = { date: selectedDateStr, startTime: "09:00", endTime: "10:00" };
    }
    refreshView().then(() => {
      const titleInput = document.querySelector(".manual-title-input");
      if (titleInput) {
        titleInput.focus();
        titleInput.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  }

  function isEventCompleted(ev) {
    if (typeof eventDoneState[ev.id] === "boolean") return eventDoneState[ev.id];
    if (ev.extendedProperties?.private?.dhpDone === "1") return true;
    return (ev.summary || "").startsWith("✅ ");
  }

  function syncUI() {
    const { isLoggedIn, userEmail, expiresAtMs } = Api.getAuthState();
    const headerArea = document.getElementById("headerAuthArea");
    const cardControls = document.getElementById("calendarAuthControls");
    const userBar = document.getElementById("calendarUserBar");
    const emailLabel = document.getElementById("loggedUserEmail");
    const container = document.getElementById("calendarEventsContainer");

    if (isLoggedIn) {
      if (headerArea) {
        headerArea.innerHTML = `
          <span class="status-pill">${H.escapeHtml(userEmail || "Đã đăng nhập")}</span>
          <button type="button" id="headerLogoutBtn" class="btn btn-outline btn-sm">Đăng xuất</button>`;
      }
      if (cardControls) cardControls.classList.add("hidden");
      if (userBar) userBar.classList.remove("hidden");
      if (emailLabel) {
        const expSuffix = expiresAtMs ? ` • Duy trì tới ${new Date(expiresAtMs).toLocaleDateString("vi-VN")}` : "";
        emailLabel.textContent = (userEmail || "Tài khoản Google") + expSuffix;
      }
    } else {
      if (headerArea) {
        headerArea.innerHTML = `
          <button type="button" id="googleLoginHeaderBtn" class="btn btn-outline btn-sm hover-arrow">
            <span>Đăng nhập Google</span><span class="arrow">→</span>
          </button>`;
      }
      if (cardControls) cardControls.classList.remove("hidden");
      if (userBar) userBar.classList.add("hidden");
      if (container) {
        container.innerHTML = `
          <div class="calendar-empty-state">
            Chưa đăng nhập tài khoản Google. Bấm <strong>"Đăng nhập với Google để xem lịch"</strong> để kết nối và hiển thị lịch làm việc của riêng bạn.
          </div>`;
      }
    }
  }

  async function refreshView() {
    await Renderer.renderAgenda({
      selectedDateStr,
      hideBirthdays,
      cachedEvents,
      editingEventId,
      manualCreateDraft,
      checklistState,
      isEventCompleted
    });
  }

  function startLiveClock() {
    if (liveTickTimer) clearInterval(liveTickTimer);
    liveTickTimer = setInterval(() => {
      if (selectedDateStr === H.getTodayStr() && cachedEvents.length > 0 && !editingEventId && !manualCreateDraft) {
        refreshView();
      }
    }, 60000);
  }

  async function loadEvents({ skipRefresh = false } = {}) {
    const container = document.getElementById("calendarEventsContainer");
    if (!container) return;

    if (!Api.getAuthState().accessToken && !skipRefresh) {
      await Api.refreshSession({ onStateChange: () => syncUI() });
    }
    if (!Api.getAuthState().accessToken) return;

    container.innerHTML = `<div class="calendar-empty-state">Đang tải lịch trình ngày ${H.escapeHtml(
      H.formatDisplayDate(selectedDateStr)
    )}...</div>`;

    try {
      const res = await Api.fetchEventsForDate(selectedDateStr);
      if (!res.ok && res.status === 401) {
        await logout();
        notify("Phiên đăng nhập Google đã hết hạn, vui lòng đăng nhập lại.");
        return;
      }
      cachedEvents = res.items;
      await refreshView();
      startLiveClock();
    } catch {
      container.innerHTML = `<div class="calendar-empty-state">Không thể tải sự kiện lúc này. Bạn thử bấm Làm mới lịch nhé.</div>`;
    }
  }

  async function createEvent(scheduleOrTitle, dateArg, startTimeArg, endTimeArg, descArg) {
    const schedule =
      typeof scheduleOrTitle === "object" && scheduleOrTitle !== null
        ? scheduleOrTitle
        : { title: scheduleOrTitle, date: dateArg, startTime: startTimeArg, endTime: endTimeArg, description: descArg };

    const startDate = schedule.date || selectedDateStr || H.getTodayStr();
    const endDate = schedule.endDate || startDate;
    const startTime = H.normalizeTime(schedule.startTime, "09:00");
    const endTime = H.normalizeTime(schedule.endTime, "10:00");

    const res = await Api.insertEvent({
      summary: schedule.title || "Lịch làm việc",
      description: schedule.description || "",
      start: { dateTime: `${startDate}T${startTime}:00+07:00`, timeZone: "Asia/Ho_Chi_Minh" },
      end: { dateTime: `${endDate}T${endTime}:00+07:00`, timeZone: "Asia/Ho_Chi_Minh" }
    });

    if (!res.ok) {
      notify(`Lỗi Google Calendar: ${res.error}`);
      return false;
    }

    manualCreateDraft = null;
    selectedDateStr = startDate;
    notify("Đã thêm lịch làm việc vào Google Calendar!");
    await loadEvents({ skipRefresh: true });
    return true;
  }

  async function updateEvent(eventId, { title, date, startTime, endTime, description }) {
    const startDate = date || selectedDateStr;
    const sTime = H.normalizeTime(startTime, "09:00");
    const eTime = H.normalizeTime(endTime, "10:00");

    const updated = await Api.patchEvent(eventId, {
      summary: title || "Lịch làm việc",
      description: description ?? "",
      start: { dateTime: `${startDate}T${sTime}:00+07:00`, timeZone: "Asia/Ho_Chi_Minh" },
      end: { dateTime: `${startDate}T${eTime}:00+07:00`, timeZone: "Asia/Ho_Chi_Minh" }
    });

    if (!updated) {
      notify("Không thể cập nhật sự kiện trên Google Calendar.");
      return false;
    }

    editingEventId = null;
    selectedDateStr = startDate;
    notify("Đã lưu thay đổi lên Google Calendar!");
    await loadEvents({ skipRefresh: true });
    return true;
  }

  async function toggleEventDone(eventId, isDone) {
    eventDoneState[eventId] = isDone;
    saveDoneState();

    const ev = cachedEvents.find((item) => item.id === eventId);
    if (ev) {
      const cleanSummary = (ev.summary || "").replace(/^✅\s*/, "");
      ev.summary = isDone ? `✅ ${cleanSummary}` : cleanSummary;
      await Api.patchEvent(eventId, {
        summary: ev.summary,
        extendedProperties: { private: { dhpDone: isDone ? "1" : "0" } }
      });
    }

    notify(isDone ? "Đã đánh dấu hoàn thành công việc." : "Đã chuyển về chưa hoàn thành.");
    await refreshView();
  }

  async function deleteEventSilent(eventId, title = "") {
    if (!eventId) return false;
    const res = await Api.removeEvent(eventId);
    if (res.ok) {
      delete checklistState[eventId];
      delete eventDoneState[eventId];
      saveChecklist();
      saveDoneState();
      if (editingEventId === eventId) editingEventId = null;
      notify(`Đã xóa "${title || "lịch trình"}" khỏi Google Calendar.`);
      await loadEvents({ skipRefresh: true });
      return true;
    }
    notify(
      res.error.toLowerCase().includes("birthday") || res.status === 403
        ? "Không thể xóa sự kiện sinh nhật đồng bộ tự động từ Danh bạ Google."
        : `Không thể xóa lịch trình (${res.status}).`
    );
    return false;
  }

  async function deleteEvent(eventId, title = "") {
    if (!window.confirm(`Xóa lịch trình "${title || "này"}" khỏi Google Calendar?`)) return false;
    return deleteEventSilent(eventId, title);
  }

  async function logout() {
    if (liveTickTimer) clearInterval(liveTickTimer);
    cachedEvents = [];
    editingEventId = null;
    manualCreateDraft = null;
    await Api.logout();
    syncUI();
    notify("Đã đăng xuất Google Calendar.");
  }

  function login() {
    const cb = document.getElementById("remember60DaysCheckbox");
    Api.login(cb ? Boolean(cb.checked) : true);
  }

  document.addEventListener("click", (e) => {
    if (e.target.closest("#googleLoginHeaderBtn, #googleLoginCardBtn")) { e.preventDefault(); login(); return; }
    if (e.target.closest("#headerLogoutBtn, #googleLogoutBtn")) { e.preventDefault(); logout(); return; }
    if (e.target.closest("#refreshCalendarBtn")) { e.preventDefault(); loadEvents(); return; }

    if (e.target.closest("#calPrevDayBtn")) { editingEventId = null; manualCreateDraft = null; selectedDateStr = H.shiftDateStr(selectedDateStr, -1); loadEvents(); return; }
    if (e.target.closest("#calNextDayBtn")) { editingEventId = null; manualCreateDraft = null; selectedDateStr = H.shiftDateStr(selectedDateStr, 1); loadEvents(); return; }
    if (e.target.closest("#calTodayBtn")) { editingEventId = null; manualCreateDraft = null; selectedDateStr = H.getTodayStr(); loadEvents(); return; }

    if (e.target.closest("#calOpenManualCreateBtn")) {
      e.preventDefault();
      if (manualCreateDraft) { manualCreateDraft = null; refreshView(); }
      else openManualCreate();
      return;
    }
    if (e.target.closest(".dhp-manual-empty-btn")) { e.preventDefault(); openManualCreate(); return; }
    if (e.target.closest(".cancel-manual-create-btn")) { e.preventDefault(); manualCreateDraft = null; refreshView(); return; }

    const saveManualBtn = e.target.closest(".save-manual-create-btn");
    if (saveManualBtn) {
      e.preventDefault();
      const box = saveManualBtn.closest("#manualCreateBox");
      const titleVal = box?.querySelector(".manual-title-input")?.value.trim();
      if (!titleVal) { notify("Vui lòng nhập tên công việc / sự kiện."); box?.querySelector(".manual-title-input")?.focus(); return; }
      saveManualBtn.disabled = true;
      saveManualBtn.textContent = "Đang lưu...";
      createEvent({
        title: titleVal,
        date: box.querySelector(".manual-date-input")?.value || selectedDateStr,
        startTime: box.querySelector(".manual-start-input")?.value || "09:00",
        endTime: box.querySelector(".manual-end-input")?.value || "10:00",
        description: box.querySelector(".manual-desc-input")?.value.trim() || ""
      }).then((ok) => { if (!ok) { saveManualBtn.disabled = false; saveManualBtn.textContent = "Lưu vào Google Calendar"; } });
      return;
    }

    const editBtn = e.target.closest(".edit-event-btn");
    if (editBtn) { e.preventDefault(); manualCreateDraft = null; editingEventId = editingEventId === editBtn.dataset.eventId ? null : editBtn.dataset.eventId; refreshView(); return; }
    if (e.target.closest(".cancel-edit-btn")) { e.preventDefault(); editingEventId = null; refreshView(); return; }

    const saveEditBtn = e.target.closest(".save-edit-btn");
    if (saveEditBtn) {
      e.preventDefault();
      const box = saveEditBtn.closest(".dhp-edit-box");
      if (box) {
        saveEditBtn.disabled = true;
        saveEditBtn.textContent = "Đang lưu...";
        updateEvent(saveEditBtn.dataset.eventId, {
          title: box.querySelector(".edit-title-input")?.value.trim(),
          date: box.querySelector(".edit-date-input")?.value,
          startTime: box.querySelector(".edit-start-input")?.value,
          endTime: box.querySelector(".edit-end-input")?.value,
          description: box.querySelector(".edit-desc-input")?.value.trim()
        });
      }
      return;
    }

    const delBtn = e.target.closest(".delete-event-btn");
    if (delBtn) { e.preventDefault(); deleteEvent(delBtn.dataset.eventId, delBtn.dataset.eventTitle); return; }

    const quickAddBtn = e.target.closest(".dhp-quick-add-btn");
    if (quickAddBtn) {
      e.preventDefault();
      if (quickAddBtn.dataset.aiPrompt === "1") {
        const chatInput = document.querySelector("#chatInput, #aiChatInput, .chat-input");
        if (chatInput) { chatInput.value = `Đặt lịch ${Renderer.formatIsoToDmy(selectedDateStr)} lúc 09:00: `; chatInput.focus(); chatInput.scrollIntoView({ behavior: "smooth", block: "center" }); }
      } else {
        openManualCreate(quickAddBtn.dataset.quickTime || "09:00");
      }
      return;
    }

    const addSubtaskBtn = e.target.closest(".dhp-add-subtask");
    if (addSubtaskBtn) {
      const evId = addSubtaskBtn.dataset.eventId;
      const text = window.prompt("Nhập đầu việc nhỏ cần chuẩn bị cho lịch này:");
      if (text && text.trim()) {
        if (!checklistState[evId]) checklistState[evId] = [];
        checklistState[evId].push({ text: text.trim(), done: false });
        saveChecklist();
        refreshView();
      }
    }
  });

  document.addEventListener("change", (e) => {
    if (e.target.id === "calDatePickerInput" && e.target.value) { editingEventId = null; manualCreateDraft = null; selectedDateStr = e.target.value; loadEvents(); return; }
    if (e.target.id === "calHideBirthdayToggle") { hideBirthdays = Boolean(e.target.checked); refreshView(); return; }
    if (e.target.classList.contains("dhp-event-done-cb")) { toggleEventDone(e.target.dataset.eventId, Boolean(e.target.checked)); return; }
    if (e.target.classList.contains("dhp-task-checkbox")) {
      const evId = e.target.dataset.eventId;
      const idx = Number(e.target.dataset.taskIdx);
      if (checklistState[evId]?.[idx]) { checklistState[evId][idx].done = Boolean(e.target.checked); saveChecklist(); refreshView(); }
    }
  });

  function bindSectionEvents() {
    syncUI();
    if (Api.getAuthState().accessToken) loadEvents({ skipRefresh: true });
    Api.refreshSession({ onStateChange: (loggedIn) => { syncUI(); if (loggedIn) loadEvents({ skipRefresh: true }); } });
  }

  Api.handleRedirectParams(notify);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => { syncUI(); Api.refreshSession({ onStateChange: () => syncUI() }); });
  } else {
    syncUI();
    Api.refreshSession({ onStateChange: () => syncUI() });
  }

  return {
    GOOGLE_CLIENT_ID: Api.GOOGLE_CLIENT_ID,
    SCOPES: Api.SCOPES,
    login,
    logout,
    loadEvents,
    createEvent,
    updateEvent,
    toggleEventDone,
    deleteEvent,
    executeAiAction: (schedule) =>
      AiBridge.executeAiAction(schedule, {
        createEvent,
        updateEvent,
        toggleEventDone,
        deleteEventSilent,
        loadEvents,
        notify,
        getSelectedDate: () => selectedDateStr,
        getCachedEvents: () => cachedEvents,
        selectAndLoadDate: async (d) => { selectedDateStr = d; await loadEvents(); }
      }),
    bindSectionEvents
  };
})();
