(function () {
  const History = window.ChatHistoryManager;
  const esc = (s) => window.DhpUtils.escapeHtml(s);
  const fmtDmy = (s) => window.DhpUtils.formatIsoToDmy(s);

  let isSidebarCollapsed = false;
  let isMobileDrawerOpen = false;
  let openMenuThreadId = "";
  let menuCoords = { top: 0, left: 0 };
  let renamingThreadId = "";

  function getChatElements() {
    const card = document.querySelector(".ai-hub-card") || document;
    const form = card.querySelector("#chatForm, #aiChatForm, form");
    const input = card.querySelector("#chatInput, #aiInput, .chat-input");
    const sendBtn = card.querySelector("#chatSendBtn, #sendChatBtn, .chat-input-bar button");
    const messagesBox = card.querySelector("#chatMessages, #aiMessages, .chat-messages");
    return { card, form, input, sendBtn, messagesBox };
  }

  function ensureWorkspaceLayout() {
    const { card, form, messagesBox } = getChatElements();
    if (!card || !messagesBox || !form) return null;

    // Xóa thanh bar cũ nếu còn sót
    card.querySelector("#aiHistoryBar")?.remove();

    let workspace = card.querySelector("#aiChatWorkspace");
    if (!workspace) {
      workspace = document.createElement("div");
      workspace.id = "aiChatWorkspace";
      workspace.className = "ai-chat-workspace";

      const sidebar = document.createElement("aside");
      sidebar.id = "aiChatSidebar";
      sidebar.className = "ai-chat-sidebar";

      const mainPane = document.createElement("div");
      mainPane.id = "aiChatMainPane";
      mainPane.className = "ai-chat-main-pane";

      const topBar = document.createElement("div");
      topBar.id = "aiChatMainTopbar";
      topBar.className = "ai-chat-main-topbar";

      messagesBox.parentNode.insertBefore(workspace, messagesBox);
      mainPane.appendChild(topBar);
      mainPane.appendChild(messagesBox);
      mainPane.appendChild(form);

      workspace.appendChild(sidebar);
      workspace.appendChild(mainPane);
    }

    return {
      workspace,
      sidebar: workspace.querySelector("#aiChatSidebar"),
      topBar: workspace.querySelector("#aiChatMainTopbar"),
      messagesBox
    };
  }

  function renderFloatingContextMenu(threads) {
    document.getElementById("aiFloatingCtxMenu")?.remove();
    if (!openMenuThreadId) return;

    const t = threads.find((item) => item.id === openMenuThreadId);
    if (!t) return;

    const menu = document.createElement("div");
    menu.id = "aiFloatingCtxMenu";
    menu.className = "ai-floating-ctx-menu";
    menu.style.top = `${menuCoords.top}px`;
    menu.style.left = `${menuCoords.left}px`;

    menu.innerHTML = `
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
    `;

    document.body.appendChild(menu);

    // Tự điều chỉnh nếu menu tràn mép phải hoặc mép dưới màn hình
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth - 12) {
      menu.style.left = `${Math.max(12, window.innerWidth - rect.width - 12)}px`;
    }
    if (rect.bottom > window.innerHeight - 12) {
      menu.style.top = `${Math.max(12, menuCoords.top - rect.height - 34)}px`;
    }
  }

  function ensureHistoryToolbar() {
    const layout = ensureWorkspaceLayout();
    if (!layout || !History) return;

    const { workspace, sidebar, topBar } = layout;
    const { threads, visibleThreads, activeThread, filterMode, isCloudMode } = History.getState();
    const unreadTotal = threads.filter((t) => t.unread).length;

    workspace.classList.toggle("sidebar-collapsed", isSidebarCollapsed);
    sidebar.classList.toggle("mobile-open", isMobileDrawerOpen);

    const listItemsHtml =
      visibleThreads.length === 0
        ? `<div class="ai-thread-empty">Chưa có cuộc trò chuyện nào được ghim.</div>`
        : visibleThreads
            .map((t) => {
              const isActive = t.id === activeThread.id;
              const isRenaming = renamingThreadId === t.id;

              const titleBlock = isRenaming
                ? `<input type="text" class="ai-rename-input" data-rename-id="${esc(t.id)}" value="${esc(t.title)}" />`
                : `<div class="ai-thread-item-title">
                    ${t.pinned ? `<span class="ai-pin-badge" title="Đã ghim">📌</span>` : ""}
                    <span class="ai-title-text">${esc(t.title)}</span>
                    ${t.unread ? `<span class="ai-unread-dot" title="Chưa đọc"></span>` : ""}
                  </div>`;

              return `
                <div class="ai-thread-row ${isActive ? "active" : ""} ${openMenuThreadId === t.id ? "menu-open" : ""}" data-thread-id="${esc(t.id)}">
                  <div class="ai-thread-select-area" data-switch-id="${esc(t.id)}">
                    ${titleBlock}
                  </div>
                  <button type="button" class="ai-thread-dots-btn" data-dots-id="${esc(t.id)}" title="Tùy chọn">⋮</button>
                </div>
              `;
            })
            .join("");

    sidebar.innerHTML = `
      <div class="ai-sidebar-top">
        <button type="button" id="aiNewChatBtn" class="btn btn-primary btn-sm ai-new-chat-full">
          <span>+ Cuộc trò chuyện mới</span>
        </button>
        <button type="button" id="aiCloseMobileDrawerBtn" class="ai-sidebar-close-mobile" title="Đóng">✕</button>
      </div>

      <div class="ai-sidebar-filter-bar">
        <span class="ai-popover-title">${filterMode === "pinned" ? "Đã ghim" : "Tất cả"} (${visibleThreads.length})</span>
        <button type="button" id="aiFilterToggleBtn" class="ai-filter-btn ${filterMode === "pinned" ? "active" : ""}">
          ${filterMode === "pinned" ? "📌 Đã ghim" : "▽ Lọc ghim"}
        </button>
      </div>

      <div class="ai-thread-list" id="aiSidebarThreadList">${listItemsHtml}</div>
    `;

    topBar.innerHTML = `
      <div class="ai-topbar-left">
        <button type="button" id="aiToggleSidebarBtn" class="btn btn-outline btn-sm ai-toggle-sidebar-btn" title="Ẩn/hiện danh sách trò chuyện">
          <span>☰</span>
          <span class="ai-toggle-label">Lịch sử (${threads.length})</span>
          ${unreadTotal > 0 ? `<span class="ai-unread-count">${unreadTotal}</span>` : ""}
        </button>
        <div class="ai-active-thread-heading" title="${esc(activeThread.title)}">
          ${activeThread.pinned ? "📌 " : ""}${esc(activeThread.title)}
        </div>
      </div>

      <div class="ai-topbar-right">
        <span class="ai-sync-tag ${isCloudMode ? "cloud" : ""}">
          ${isCloudMode ? "☁️ Đồng bộ Google" : "💾 Lưu trên máy"}
        </span>
      </div>
    `;

    renderFloatingContextMenu(threads);

    if (renamingThreadId) {
      const inp = sidebar.querySelector(`.ai-rename-input[data-rename-id="${renamingThreadId}"]`);
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
      isMobileDrawerOpen = false;
      openMenuThreadId = "";
      renamingThreadId = "";
      History.startNewThread();
      return;
    }

    if (e.target.closest("#aiToggleSidebarBtn")) {
      e.preventDefault();
      openMenuThreadId = "";
      if (window.innerWidth <= 820) {
        isMobileDrawerOpen = !isMobileDrawerOpen;
      } else {
        isSidebarCollapsed = !isSidebarCollapsed;
      }
      ensureHistoryToolbar();
      return;
    }

    if (e.target.closest("#aiCloseMobileDrawerBtn")) {
      e.preventDefault();
      isMobileDrawerOpen = false;
      openMenuThreadId = "";
      ensureHistoryToolbar();
      return;
    }

    if (e.target.closest("#aiFilterToggleBtn") && History) {
      e.preventDefault();
      e.stopPropagation();
      openMenuThreadId = "";
      const { filterMode } = History.getState();
      History.setFilterMode(filterMode === "pinned" ? "all" : "pinned");
      return;
    }

    const dotsBtn = e.target.closest(".ai-thread-dots-btn");
    if (dotsBtn) {
      e.preventDefault();
      e.stopPropagation();
      const id = dotsBtn.dataset.dotsId;
      if (openMenuThreadId === id) {
        openMenuThreadId = "";
      } else {
        const rect = dotsBtn.getBoundingClientRect();
        openMenuThreadId = id;
        menuCoords = { top: rect.bottom + 6, left: rect.left };
      }
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
        isMobileDrawerOpen = false;
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
      isMobileDrawerOpen = false;
      openMenuThreadId = "";
      History.switchThread(switchArea.dataset.switchId);
      return;
    }

    // Đóng menu 3 chấm nếu bấm ra ngoài
    if (openMenuThreadId && !e.target.closest("#aiFloatingCtxMenu")) {
      openMenuThreadId = "";
      ensureHistoryToolbar();
    }
  });

  window.addEventListener(
    "scroll",
    () => {
      if (openMenuThreadId) {
        openMenuThreadId = "";
        document.getElementById("aiFloatingCtxMenu")?.remove();
      }
    },
    true
  );

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
        if (document.querySelector(".ai-hub-card") && !document.getElementById("aiChatWorkspace")) {
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
