(function () {
  const History = window.ChatHistoryManager;
  const esc = (s) => window.DhpUtils.escapeHtml(s);
  const fmtDmy = (s) => window.DhpUtils.formatIsoToDmy(s);

  function getChatElements() {
    const card = document.querySelector(".ai-hub-card") || document;
    const form = card.querySelector("#chatForm, #aiChatForm, form");
    const input = card.querySelector("#chatInput, #aiInput, .chat-input");
    const sendBtn = card.querySelector("#chatSendBtn, #sendChatBtn, .chat-input-bar button");
    const messagesBox = card.querySelector("#chatMessages, #aiMessages, .chat-messages");
    return { card, form, input, sendBtn, messagesBox };
  }

  function ensureHistoryToolbar() {
    const { card, messagesBox } = getChatElements();
    if (!card || !messagesBox || !History) return;

    let bar = card.querySelector("#aiHistoryBar");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "aiHistoryBar";
      bar.className = "ai-history-bar";
      messagesBox.parentNode.insertBefore(bar, messagesBox);
    }

    const { threads, activeThread, isCloudMode } = History.getState();
    const optionsHtml = threads
      .map(
        (t) =>
          `<option value="${esc(t.id)}" ${t.id === activeThread.id ? "selected" : ""}>${esc(t.title)}</option>`
      )
      .join("");

    bar.innerHTML = `
      <div class="ai-history-left">
        <button type="button" id="aiNewChatBtn" class="btn btn-primary btn-sm">+ Chat mới</button>
        <select id="aiThreadSelect" class="ai-thread-select" title="Chọn đoạn hội thoại cũ">
          ${optionsHtml}
        </select>
      </div>
      <div class="ai-history-right">
        <span class="ai-sync-tag ${isCloudMode ? "cloud" : ""}">
          ${isCloudMode ? "☁️ Đồng bộ Google" : "💾 Lưu trên máy"}
        </span>
        <button type="button" id="aiDeleteChatBtn" class="btn btn-outline btn-sm" title="Xóa đoạn chat hiện tại">Xóa</button>
      </div>
    `;

    window.SecondBrainManager?.fetchBrainList?.();
  }

  function renderCurrentThread() {
    const { messagesBox } = getChatElements();
    if (!messagesBox || !History) return;

    ensureHistoryToolbar();
    const { activeThread } = History.getState();
    messagesBox.innerHTML = "";

    activeThread.messages.forEach((msg) => {
      renderBubbleOnly(messagesBox, msg.role, msg.text, msg.schedule, {
        autoSyncCalendar: false,
        savedMemory: msg.savedMemory || null
      });
    });
    messagesBox.scrollTop = messagesBox.scrollHeight;
  }

  async function syncScheduleToCalendar(schedule) {
    const mgr = window.GoogleCalendarManager;
    if (!mgr) return { ok: false, message: "Chưa sẵn sàng" };
    if (typeof mgr.executeAiAction === "function") {
      return await mgr.executeAiAction(schedule);
    }
    if (typeof mgr.createEvent === "function") {
      const ok = await mgr.createEvent(schedule);
      return { ok, message: ok ? "Đã lưu vào Google Calendar" : "Chưa thể lưu" };
    }
    return { ok: false, message: "Chưa sẵn sàng" };
  }

  async function renderBubbleOnly(
    messagesBox,
    role,
    text,
    schedule = null,
    { autoSyncCalendar = true, savedMemory = null } = {}
  ) {
    if (!messagesBox) return;

    const isUser = role === "user";
    const row = document.createElement("div");
    row.className = isUser ? "chat-row user" : "chat-row bot";

    let html = `
      <span class="chat-sender">${isUser ? "Bạn" : "Trợ lý AI"}</span>
      <div class="chat-bubble ${isUser ? "user" : "bot"}">${esc(text)}</div>
    `;

    if (savedMemory && savedMemory.title) {
      html += `
        <div class="dhp-brain-saved-pill" style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 12px;border-radius:10px;margin-top:6px;">
          <span>🧠 Đã lưu vào Bộ não thứ 2: <strong>${esc(savedMemory.title)}</strong></span>
          <button type="button" class="btn btn-outline btn-sm dhp-open-brain-btn">Xem kho</button>
        </div>
      `;
    }

    const hasSchedule = Boolean(schedule && (schedule.title || schedule.targetTitle));
    if (hasSchedule) {
      const displayTitle = schedule.title || schedule.targetTitle || "Lịch làm việc";
      const displayDate = fmtDmy(schedule.date || schedule.targetDate || "");
      const timeRange =
        schedule.startTime && schedule.endTime ? ` • ⏰ ${schedule.startTime} - ${schedule.endTime}` : "";
      html += `
        <div class="schedule-draft">
          <div>
            <strong>📅 ${esc(displayTitle)}</strong>
            <div class="draft-details">${displayDate ? `🗓 ${esc(displayDate)}` : ""}${esc(timeRange)}</div>
          </div>
          <div class="draft-actions">
            <button type="button" class="btn btn-primary btn-sm save-gcal-btn" ${
              autoSyncCalendar ? "disabled" : ""
            }>${autoSyncCalendar ? "Đang đồng bộ..." : "+ Đồng bộ lại"}</button>
          </div>
        </div>
      `;
    }

    row.innerHTML = html;
    messagesBox.appendChild(row);
    messagesBox.scrollTop = messagesBox.scrollHeight;

    if (hasSchedule) {
      const saveBtn = row.querySelector(".save-gcal-btn");
      if (autoSyncCalendar) {
        const result = await syncScheduleToCalendar(schedule);
        if (saveBtn) {
          saveBtn.textContent = result.ok ? `✓ ${result.message}` : result.message || "+ Thử đồng bộ lại";
          saveBtn.disabled = result.ok;
        }
      }
      if (saveBtn && !saveBtn.disabled) {
        saveBtn.addEventListener("click", async () => {
          saveBtn.disabled = true;
          saveBtn.textContent = "Đang xử lý...";
          const retry = await syncScheduleToCalendar(schedule);
          saveBtn.textContent = retry.ok ? `✓ ${retry.message}` : retry.message;
          saveBtn.disabled = retry.ok;
        });
      }
    }
  }

  let isSending = false;

  async function handleSendMessage(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isSending) return;

    const { input, sendBtn, messagesBox } = getChatElements();
    if (!input) return;

    const message = input.value.trim();
    if (!message) return;

    isSending = true;
    input.value = "";
    const oldBtnHtml = sendBtn ? sendBtn.innerHTML : "";
    if (sendBtn) {
      sendBtn.disabled = true;
      sendBtn.textContent = "Đang...";
    }

    const recentHistory = History ? History.getActiveThread().messages.slice(-8) : [];
    if (History) {
      History.appendMessageToActive("user", message, null);
      ensureHistoryToolbar();
    }
    await renderBubbleOnly(messagesBox, "user", message, null, { autoSyncCalendar: false });

    try {
      const data = await window.DhpApi.request("/api/chat", {
        method: "POST",
        body: JSON.stringify({
          message,
          today: window.DhpUtils.getTodayIso(),
          timezone: window.DhpUtils.getTimezone(),
          history: recentHistory
        })
      });

      const replyText = data.reply || "Xin lỗi, trợ lý AI chưa thể phản hồi lúc này.";
      const scheduleObj = data.schedule || null;
      const savedMemory = data.savedMemory || null;

      if (History) {
        History.appendMessageToActive("bot", replyText, scheduleObj);
        ensureHistoryToolbar();
      }
      if (savedMemory && window.SecondBrainManager?.fetchBrainList) {
        window.SecondBrainManager.fetchBrainList();
      }

      await renderBubbleOnly(messagesBox, "bot", replyText, scheduleObj, {
        autoSyncCalendar: true,
        savedMemory
      });
    } catch {
      const errText = "Không thể kết nối tới máy chủ AI. Bạn thử lại nhé!";
      if (History) History.appendMessageToActive("bot", errText, null);
      await renderBubbleOnly(messagesBox, "bot", errText, null, { autoSyncCalendar: false });
    } finally {
      isSending = false;
      if (sendBtn) {
        sendBtn.disabled = false;
        sendBtn.innerHTML = oldBtnHtml || "Gửi →";
      }
      input.focus();
    }
  }

  document.addEventListener(
    "submit",
    (e) => {
      if (e.target.closest(".ai-hub-card")) {
        e.preventDefault();
        e.stopPropagation();
        handleSendMessage(e);
      }
    },
    true
  );

  document.addEventListener("click", (e) => {
    if (e.target.closest("#chatSendBtn, #sendChatBtn, .chat-input-bar button")) {
      e.preventDefault();
      handleSendMessage(e);
      return;
    }
    if (e.target.closest("#aiNewChatBtn") && History) {
      e.preventDefault();
      History.startNewThread();
      return;
    }
    if (e.target.closest("#aiDeleteChatBtn") && History) {
      e.preventDefault();
      if (window.confirm("Xóa đoạn hội thoại hiện tại?")) {
        History.deleteActiveThread();
      }
    }
  });

  document.addEventListener("change", (e) => {
    if (e.target.id === "aiThreadSelect" && History) {
      History.switchThread(e.target.value);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      const input = e.target.closest("#chatInput, #aiInput, .chat-input");
      if (input) {
        e.preventDefault();
        handleSendMessage(e);
      }
    }
  });

  function bootChatHistory() {
    if (!History) return;
    History.init(renderCurrentThread);
    const mount = document.getElementById("sectionMount");
    if (mount) {
      const obs = new MutationObserver(() => {
        if (document.querySelector(".ai-hub-card") && !document.getElementById("aiHistoryBar")) {
          renderCurrentThread();
        }
      });
      obs.observe(mount, { childList: true, subtree: true });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootChatHistory);
  } else {
    bootChatHistory();
  }
})();
