(function () {
  const History = window.ChatHistoryManager;
  const esc = (s) => window.DhpUtils.escapeHtml(s);
  const fmtDmy = (s) => window.DhpUtils.formatIsoToDmy(s);

  let isDrawerOpen = false;
  let openMenuThreadId = "";
  let renamingThreadId = "";

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

    const { threads, visibleThreads, activeThread, filterMode, isCloudMode } = History.getState();
    const unreadTotal = threads.filter((t) => t.unread).length;

    const listItemsHtml =
      visibleThreads.length === 0
        ? `<div class="ai-thread-empty">Chưa có cuộc trò chuyện nào được ghim.</div>`
        : visibleThreads
            .map((t) => {
              const isActive = t.id === activeThread.id;
              const isMenuOpen = openMenuThreadId === t.id;
              const isRenaming = renamingThreadId === t.id;

              const titleBlock = isRenaming
                ? `<input type="text" class="ai-rename-input" data-rename-id="${esc(t.id)}" value="${esc(t.title)}" />`
                : `<div class="ai-thread-item-title">
                    ${t.pinned ? `<span class="ai-pin-badge" title="Đã ghim">📌</span>` : ""}
                    <span class="ai-title-text">${esc(t.title)}</span>
                    ${t.unread ? `<span class="ai-unread-dot" title="Chưa đọc"></span>` : ""}
                  </div>`;

              const menuHtml = isMenuOpen
                ? `
                  <div class="ai-thread-context-menu" data-menu-for="${esc(t.id)}">
                    <button type="button" class="ai-ctx-item" data-action="share" data-id="${esc(t.id)}">
                      <span>🔗</span><span>Chia sẻ cuộc trò chuyện</span>
                    </button>
                    <button type="button" class="ai-ctx-item" data-action="pin" data-id="${esc(t.id)}">
                      <span>📌</span><span>${t.pinned ? "Bỏ ghim" : "Ghim"}</span>
                    </button>
                    <button type="button" class="ai-ctx-item" data-action="rename" data-id="${esc(t.id)}">
                      <span>✏️</span><span>Đổi tên</span>
                    </button>
                    <button type="button" class="ai-ctx-item" data-action="unread" data-id="${esc(t.id)}">
                      <span>💬</span><span>${t.unread ? "Đánh dấu đã đọc" : "Mark as unread"}</span>
                    </button>
                    <button type="button" class="ai-ctx-item" data-action="notepad" data-id="${esc(t.id)}">
                      <span>📒</span><span>Thêm vào sổ ghi chú</span>
                    </button>
                    <div class="ai-ctx-divider"></div>
                    <button type="button" class="ai-ctx-item danger" data-action="delete" data-id="${esc(t.id)}">
                      <span>🗑️</span><span>Xoá</span>
                    </button>
                  </div>
                `
                : "";

              return `
                <div class="ai-thread-row ${isActive ? "active" : ""}" data-thread-id="${esc(t.id)}">
                  <div class="ai-thread-select-area" data-switch-id="${esc(t.id)}">
                    ${titleBlock}
                  </div>
                  <button type="button" class="ai-thread-dots-btn" data-dots-id="${esc(t.id)}" title="Tùy chọn">⋮</button>
                  ${menuHtml}
                </div>
              `;
            })
            .join("");

    bar.innerHTML = `
      <div class="ai-history-left">
        <button type="button" id="aiNewChatBtn" class="btn btn-primary btn-sm">+ Chat mới</button>

        <div class="ai-thread-picker-wrap">
          <button type="button" id="aiThreadPickerBtn" class="ai-thread-picker-btn" aria-expanded="${isDrawerOpen}">
            <span class="ai-picker-label">
              ${activeThread.pinned ? "📌 " : ""}${esc(activeThread.title)}
            </span>
            ${unreadTotal > 0 ? `<span class="ai-unread-count">${unreadTotal}</span>` : ""}
            <span class="ai-picker-caret">▾</span>
          </button>

          ${
            isDrawerOpen
              ? `<div class="ai-thread-popover" id="aiThreadPopover">
                  <div class="ai-popover-head">
                    <span class="ai-popover-title">${filterMode === "pinned" ? "Đã ghim" : "Tất cả"} (${visibleThreads.length})</span>
                    <button type="button" id="aiFilterToggleBtn" class="ai-filter-btn ${filterMode === "pinned" ? "active" : ""}" title="Lọc cuộc trò chuyện đã ghim">
                      ${filterMode === "pinned" ? "📌 Đã ghim" : "▽ Lọc ghim"}
                    </button>
                  </div>
                  <div class="ai-thread-list">${listItemsHtml}</div>
                </div>`
              : ""
          }
        </div>
      </div>

      <div class="ai-history-right">
        <span class="ai-sync-tag ${isCloudMode ? "cloud" : ""}">
          ${isCloudMode ? "☁️ Đồng bộ Google" : "💾 Lưu trên máy"}
        </span>
      </div>
    `;

    if (renamingThreadId) {
      const inp = bar.querySelector(`.ai-rename-input[data-rename-id="${renamingThreadId}"]`);
      if (inp) {
        inp.focus();
        inp.select();
      }
    }

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

  document.addEventListener("click", async (e) => {
    if (e.target.closest("#chatSendBtn, #sendChatBtn, .chat-input-bar button")) {
      e.preventDefault();
      handleSendMessage(e);
      return;
    }

    if (e.target.closest("#aiNewChatBtn") && History) {
      e.preventDefault();
      isDrawerOpen = false;
      openMenuThreadId = "";
      renamingThreadId = "";
      History.startNewThread();
      return;
    }

    if (e.target.closest("#aiThreadPickerBtn")) {
      e.preventDefault();
      e.stopPropagation();
      isDrawerOpen = !isDrawerOpen;
      if (!isDrawerOpen) {
        openMenuThreadId = "";
        renamingThreadId = "";
      }
      ensureHistoryToolbar();
      return;
    }

    if (e.target.closest("#aiFilterToggleBtn") && History) {
      e.preventDefault();
      e.stopPropagation();
      const { filterMode } = History.getState();
      History.setFilterMode(filterMode === "pinned" ? "all" : "pinned");
      return;
    }

    const dotsBtn = e.target.closest(".ai-thread-dots-btn");
    if (dotsBtn) {
      e.preventDefault();
      e.stopPropagation();
      const id = dotsBtn.dataset.dotsId;
      openMenuThreadId = openMenuThreadId === id ? "" : id;
      renamingThreadId = "";
      ensureHistoryToolbar();
      return;
    }

    const ctxBtn = e.target.closest(".ai-ctx-item");
    if (ctxBtn && History) {
      e.preventDefault();
      e.stopPropagation();
      const { action, id } = ctxBtn.dataset;
      openMenuThreadId = "";

      if (action === "share") {
        isDrawerOpen = false;
        ensureHistoryToolbar();
        await History.shareThread(id);
      } else if (action === "pin") {
        History.togglePinThread(id);
      } else if (action === "rename") {
        renamingThreadId = id;
        ensureHistoryToolbar();
      } else if (action === "unread") {
        History.toggleUnreadThread(id);
      } else if (action === "notepad") {
        isDrawerOpen = false;
        ensureHistoryToolbar();
        await History.exportThreadToNotepad(id);
      } else if (action === "delete") {
        if (window.confirm("Xoá cuộc trò chuyện này?")) {
          History.deleteThreadById(id);
        } else {
          ensureHistoryToolbar();
        }
      }
      return;
    }

    if (e.target.closest(".ai-rename-input")) {
      e.stopPropagation();
      return;
    }

    const switchArea = e.target.closest(".ai-thread-select-area");
    if (switchArea && History) {
      e.preventDefault();
      e.stopPropagation();
      if (renamingThreadId) return;
      isDrawerOpen = false;
      openMenuThreadId = "";
      History.switchThread(switchArea.dataset.switchId);
      return;
    }

    // Đóng popover khi bấm ra ngoài
    if (isDrawerOpen && !e.target.closest(".ai-thread-picker-wrap")) {
      isDrawerOpen = false;
      openMenuThreadId = "";
      renamingThreadId = "";
      ensureHistoryToolbar();
    }
  });

  document.addEventListener("keydown", (e) => {
    const renameInp = e.target.closest(".ai-rename-input");
    if (renameInp && History) {
      if (e.key === "Enter") {
        e.preventDefault();
        const id = renameInp.dataset.renameId;
        const val = renameInp.value;
        renamingThreadId = "";
        History.renameThread(id, val);
      } else if (e.key === "Escape") {
        e.preventDefault();
        renamingThreadId = "";
        ensureHistoryToolbar();
      }
      return;
    }

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
