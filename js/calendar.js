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

  function getInitials(name, email) {
    const src = (name || email || "U").trim();
    const parts = src.split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return src.slice(0, 2).toUpperCase();
  }

  function renderAvatarHtml(picture, name, email, size = 24) {
    if (picture) {
      return `<img src="${H.escapeHtml(picture)}" alt="${H.escapeHtml(name || "Avatar")}" class="dhp-user-avatar" style="width:${size}px;height:${size}px;" referrerpolicy="no-referrer" />`;
    }
    return `<span class="dhp-user-avatar-fallback" style="width:${size}px;height:${size}px;">${H.escapeHtml(
      getInitials(name, email)
    )}</span>`;
  }

  function openAccountModal() {
    const { isLoggedIn, userEmail, userName, userPicture, userProfile, expiresAtMs } = Api.getAuthState();
    if (!isLoggedIn) {
      login();
      return;
    }

    document.getElementById("dhpAccountModal")?.remove();

    const displayName = userName || (userEmail ? userEmail.split("@")[0] : "Tài khoản Google");
    const expDate = expiresAtMs ? new Date(expiresAtMs).toLocaleDateString("vi-VN") : "60 ngày";
    const p = userProfile || {};

    const modal = document.createElement("div");
    modal.id = "dhpAccountModal";
    modal.className = "modal-backdrop";
    modal.innerHTML = `
      <div class="modal-card dhp-account-modal-card" role="dialog" aria-modal="true" style="max-width:460px;text-align:left;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
          <span class="modal-badge" style="background:rgba(16,185,129,0.12);color:#10b981;border:1px solid rgba(16,185,129,0.28);">GOOGLE ACCOUNT</span>
          <button type="button" id="closeAccountModalTop" class="btn btn-outline btn-sm">✕</button>
        </div>

        <div style="display:flex;align-items:center;gap:14px;padding:14px;border-radius:14px;background:#18181b;border:1px solid #27272a;margin-bottom:16px;">
          ${renderAvatarHtml(userPicture, displayName, userEmail, 58)}
          <div style="min-width:0;flex:1;">
            <div style="font-size:1.08rem;font-weight:800;color:#fafafa;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
              ${H.escapeHtml(displayName)}
            </div>
            <div style="font-size:0.84rem;color:#10b981;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
              ${H.escapeHtml(userEmail)}
            </div>
            <div style="font-size:0.75rem;color:#a1a1aa;margin-top:3px;">
              Duy trì đăng nhập tới: ${H.escapeHtml(expDate)}
            </div>
          </div>
        </div>

        <form id="dhpAccountProfileForm" style="display:flex;flex-direction:column;gap:10px;">
          <div style="font-size:0.78rem;font-weight:700;color:#a1a1aa;letter-spacing:0.04em;">THÔNG TIN CÁ NHÂN BỔ SUNG</div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <div>
              <label style="display:block;font-size:0.76rem;color:#a1a1aa;margin-bottom:4px;">Ngày sinh</label>
              <input type="date" id="accBirthdayInput" value="${H.escapeHtml(p.birthday || "")}" style="width:100%;padding:8px 10px;border-radius:10px;" />
            </div>
            <div>
              <label style="display:block;font-size:0.76rem;color:#a1a1aa;margin-bottom:4px;">Giới tính</label>
              <select id="accGenderInput" style="width:100%;padding:8px 10px;border-radius:10px;">
                <option value="" ${!p.gender ? "selected" : ""}>Chưa chọn</option>
                <option value="Nam" ${p.gender === "Nam" ? "selected" : ""}>Nam</option>
                <option value="Nữ" ${p.gender === "Nữ" ? "selected" : ""}>Nữ</option>
                <option value="Khác" ${p.gender === "Khác" ? "selected" : ""}>Khác</option>
              </select>
            </div>
          </div>

          <div>
            <label style="display:block;font-size:0.76rem;color:#a1a1aa;margin-bottom:4px;">Số điện thoại</label>
            <input type="tel" id="accPhoneInput" placeholder="Ví dụ: 09xx xxx xxx" value="${H.escapeHtml(p.phone || "")}" style="width:100%;padding:8px 10px;border-radius:10px;" />
          </div>

          <div>
            <label style="display:block;font-size:0.76rem;color:#a1a1aa;margin-bottom:4px;">Ghi chú / Giới thiệu ngắn</label>
            <textarea id="accBioInput" rows="2" placeholder="Nhập ghi chú cá nhân..." style="width:100%;padding:8px 10px;border-radius:10px;">${H.escapeHtml(p.bio || "")}</textarea>
          </div>

          <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:8px;">
            <button type="button" id="closeAccountModalBottom" class="btn btn-outline btn-sm">Đóng</button>
            <button type="submit" id="saveAccountProfileBtn" class="btn btn-primary btn-sm">Lưu thông tin</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    const closeModal = () => modal.remove();
    modal.querySelector("#closeAccountModalTop")?.addEventListener("click", closeModal);
    modal.querySelector("#closeAccountModalBottom")?.addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });

    modal.querySelector("#dhpAccountProfileForm")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const saveBtn = modal.querySelector("#saveAccountProfileBtn");
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = "Đang lưu...";
      }
      try {
        const payload = {
          birthday: modal.querySelector("#accBirthdayInput")?.value || "",
          gender: modal.querySelector("#accGenderInput")?.value || "",
          phone: modal.querySelector("#accPhoneInput")?.value || "",
          bio: modal.querySelector("#accBioInput")?.value || ""
        };
        const res = await window.DhpApi.request("/api/auth/profile", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          Api.setUserProfile(res.profile || payload);
          notify("✓ Đã lưu thông tin tài khoản!");
          closeModal();
        } else {
          notify(res.error || "Không thể lưu thông tin.");
        }
      } catch {
        notify("Lỗi kết nối máy chủ.");
      } finally {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.textContent = "Lưu thông tin";
        }
      }
    });
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
    const { isLoggedIn, userEmail, userName, userPicture, expiresAtMs } = Api.getAuthState();
    const headerArea = document.getElementById("headerAuthArea");
    const mainNav = document.querySelector(".site-header .main-nav");
    const cardControls = document.getElementById("calendarAuthControls");
    const userBar = document.getElementById("calendarUserBar");
    const emailLabel = document.getElementById("loggedUserEmail");
    const container = document.getElementById("calendarEventsContainer");

    const displayName = userName || (userEmail ? userEmail.split("@")[0] : "Tài khoản Google");

    if (isLoggedIn) {
      if (headerArea) {
        headerArea.innerHTML = `
          <button type="button" class="dhp-header-user-pill" data-open-account-modal="1" title="Xem thông tin tài khoản Google">
            ${renderAvatarHtml(userPicture, displayName, userEmail, 24)}
            <span class="dhp-header-user-name">${H.escapeHtml(displayName)}</span>
          </button>
          <button type="button" id="headerLogoutBtn" class="btn btn-outline btn-sm">Đăng xuất</button>`;
      }
      if (cardControls) cardControls.classList.add("hidden");
      if (userBar) userBar.classList.remove("hidden");
      if (emailLabel) {
        const expSuffix = expiresAtMs ? ` • Duy trì tới ${new Date(expiresAtMs).toLocaleDateString("vi-VN")}` : "";
        emailLabel.innerHTML = `${H.escapeHtml(displayName)} (${H.escapeHtml(userEmail)})${H.escapeHtml(expSuffix)}`;
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

    // Thẻ tài khoản ở đầu ngăn kéo Menu 3 gạch (CSS ẩn hoàn toàn trên Desktop > 768px)
    if (mainNav) {
      mainNav.querySelector("#mobileDrawerAccountCard")?.remove();
      const card = document.createElement("div");
      card.id = "mobileDrawerAccountCard";
      card.className = "mobile-drawer-account-card";
      card.innerHTML = isLoggedIn
        ? `<button type="button" class="mobile-acc-info-btn" data-open-account-modal="1">
             ${renderAvatarHtml(userPicture, displayName, userEmail, 40)}
             <div class="mobile-acc-meta">
               <div class="mobile-acc-name">${H.escapeHtml(displayName)}</div>
               <div class="mobile-acc-email">${H.escapeHtml(userEmail)}</div>
             </div>
             <span class="mobile-acc-arrow">Hồ sơ →</span>
           </button>`
        : `<button type="button" id="googleLoginDrawerBtn" class="btn btn-primary btn-sm" style="width:100%;justify-content:center;">
             Đăng nhập Google để đồng bộ
           </button>`;
      mainNav.insertBefore(card, mainNav.firstChild);
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
    if (e.target.closest("#googleLoginHeaderBtn, #googleLoginCardBtn, #googleLoginDrawerBtn")) {
      e.preventDefault();
      login();
      return;
    }
    if (e.target.closest("[data-open-account-modal]")) {
      e.preventDefault();
      document.querySelector(".site-header .main-nav")?.classList.remove("is-mobile-open");
      document.getElementById("mobileNavBackdrop")?.classList.remove("show");
      document.getElementById("mobileMenuToggleBtn")?.classList.remove("is-active");
      document.body.classList.remove("mobile-menu-locked");
      openAccountModal();
      return;
    }
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
    openAccountModal,
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
