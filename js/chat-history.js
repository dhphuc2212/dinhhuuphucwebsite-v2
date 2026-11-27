window.ChatHistoryManager = (function () {
  const LOCAL_KEY = "dhp_guest_chat_threads_v1";
  let threads = [];
  let activeThreadId = "";
  let filterMode = "all"; // "all" | "pinned"
  let isCloudMode = false;
  let cloudEmail = "";
  let syncTimer = null;
  let onRenderCallback = null;

  function makeId() {
    return "chat_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6);
  }

  function createEmptyThread() {
    return {
      id: makeId(),
      title: "Cuộc trò chuyện mới",
      pinned: false,
      unread: false,
      shareId: "",
      updatedAt: new Date().toISOString(),
      messages: [
        {
          role: "bot",
          text: "Tôi là trợ lý AI. Bạn có thể hỏi thông tin hoặc nhắn trực tiếp để thêm, sửa, xóa và hoàn thành lịch làm việc trên Google Calendar.",
          schedule: null,
          ts: new Date().toISOString()
        }
      ]
    };
  }

  function sortThreadsList(list) {
    return [...list].sort((a, b) => {
      if (Boolean(a.pinned) !== Boolean(b.pinned)) {
        return a.pinned ? -1 : 1;
      }
      return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
    });
  }

  function loadLocalThreads() {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) && parsed.length > 0 ? sortThreadsList(parsed) : [createEmptyThread()];
    } catch {
      return [createEmptyThread()];
    }
  }

  function saveLocalThreads() {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(threads.slice(0, 30)));
    } catch {}
  }

  async function pushToCloud() {
    if (!window.DhpApi.getSessionId()) return;
    try {
      await window.DhpApi.request("/api/chat/history", {
        method: "POST",
        body: JSON.stringify({ threads })
      });
    } catch {}
  }

  function schedulePersist() {
    threads = sortThreadsList(threads);
    if (isCloudMode) {
      if (syncTimer) clearTimeout(syncTimer);
      syncTimer = setTimeout(pushToCloud, 400);
    } else {
      saveLocalThreads();
    }
  }

  async function init(renderFn) {
    if (typeof renderFn === "function") onRenderCallback = renderFn;

    if (window.DhpApi.getSessionId()) {
      try {
        const data = await window.DhpApi.request("/api/chat/history");
        if (data.authenticated) {
          isCloudMode = true;
          cloudEmail = data.email || "";
          threads =
            Array.isArray(data.threads) && data.threads.length > 0
              ? sortThreadsList(data.threads)
              : [createEmptyThread()];
          if (!threads.some((t) => t.id === activeThreadId)) {
            activeThreadId = threads[0].id;
          }
          if (onRenderCallback) onRenderCallback();
          return;
        }
      } catch {}
    }

    isCloudMode = false;
    cloudEmail = "";
    threads = loadLocalThreads();
    if (!threads.some((t) => t.id === activeThreadId)) {
      activeThreadId = threads[0].id;
    }
    if (onRenderCallback) onRenderCallback();
  }

  function getActiveThread() {
    let found = threads.find((t) => t.id === activeThreadId);
    if (!found) {
      if (threads.length === 0) threads.push(createEmptyThread());
      found = threads[0];
      activeThreadId = found.id;
    }
    return found;
  }

  function appendMessageToActive(role, text, schedule = null) {
    const thread = getActiveThread();
    thread.messages.push({
      role,
      text,
      schedule: schedule || null,
      ts: new Date().toISOString()
    });
    thread.updatedAt = new Date().toISOString();
    thread.unread = false;

    if (
      role === "user" &&
      (thread.title === "Cuộc trò chuyện mới" || thread.messages.filter((m) => m.role === "user").length === 1)
    ) {
      thread.title = text.slice(0, 46) + (text.length > 46 ? "..." : "");
    }

    schedulePersist();
  }

  function startNewThread() {
    const fresh = createEmptyThread();
    threads = [fresh, ...threads];
    activeThreadId = fresh.id;
    filterMode = "all";
    schedulePersist();
    if (onRenderCallback) onRenderCallback();
  }

  function switchThread(threadId) {
    const target = threads.find((t) => t.id === threadId);
    if (target) {
      activeThreadId = threadId;
      if (target.unread) {
        target.unread = false;
        schedulePersist();
      }
      if (onRenderCallback) onRenderCallback();
    }
  }

  function togglePinThread(threadId) {
    const target = threads.find((t) => t.id === threadId);
    if (!target) return;
    target.pinned = !target.pinned;
    schedulePersist();
    window.DhpUtils?.showToast(target.pinned ? "📌 Đã ghim cuộc trò chuyện" : "Đã bỏ ghim cuộc trò chuyện");
    if (onRenderCallback) onRenderCallback();
  }

  function renameThread(threadId, newTitle) {
    const target = threads.find((t) => t.id === threadId);
    const clean = String(newTitle || "").trim();
    if (!target || !clean) return;
    target.title = clean.slice(0, 120);
    schedulePersist();
    window.DhpUtils?.showToast("Đã đổi tên cuộc trò chuyện");
    if (onRenderCallback) onRenderCallback();
  }

  function toggleUnreadThread(threadId) {
    const target = threads.find((t) => t.id === threadId);
    if (!target) return;
    target.unread = !target.unread;
    schedulePersist();
    window.DhpUtils?.showToast(target.unread ? "Đã đánh dấu chưa đọc" : "Đã đánh dấu đã đọc");
    if (onRenderCallback) onRenderCallback();
  }

  async function shareThread(threadId) {
    const target = threads.find((t) => t.id === threadId);
    if (!target) return;
    try {
      const data = await window.DhpApi.request("/api/chat/share", {
        method: "POST",
        body: JSON.stringify({ title: target.title, messages: target.messages })
      });
      if (data.ok && data.shareUrl) {
        target.shareId = data.shareId;
        schedulePersist();
        try {
          await navigator.clipboard.writeText(data.shareUrl);
          window.DhpUtils?.showToast(`🔗 Đã sao chép link chia sẻ: ${data.shareUrl}`);
        } catch {
          window.DhpUtils?.showToast(`Link chia sẻ: ${data.shareUrl}`);
        }
      } else {
        window.DhpUtils?.showToast(data.error || "Không thể tạo link chia sẻ.");
      }
    } catch {
      window.DhpUtils?.showToast("Lỗi kết nối khi chia sẻ cuộc trò chuyện.");
    }
  }

  async function exportThreadToNotepad(threadId) {
    const target = threads.find((t) => t.id === threadId);
    if (!target) return;

    const code = target.id.replace(/[^a-z0-9-_]/gi, "").toLowerCase().slice(0, 24) || "chatnote";
    const content = (target.messages || [])
      .map((m) => `${m.role === "user" ? "Bạn" : "Trợ lý AI"}:\n${m.text || ""}`)
      .join("\n\n---\n\n");

    try {
      await window.DhpApi.request(`/api/notepad/${encodeURIComponent(code)}`, {
        method: "POST",
        body: JSON.stringify({ title: target.title, content })
      });
      if (window.NotepadManager?.openNotepad) {
        window.NotepadManager.openNotepad(code, { pushUrl: true });
        window.DhpUtils?.showToast("📒 Đã lưu và mở trong Sổ ghi chú (Notepad Online)!");
      }
    } catch {
      window.DhpUtils?.showToast("Không thể lưu sang Sổ ghi chú lúc này.");
    }
  }

  function deleteThreadById(threadId) {
    threads = threads.filter((t) => t.id !== threadId);
    if (threads.length === 0) threads.push(createEmptyThread());
    if (!threads.some((t) => t.id === activeThreadId)) {
      activeThreadId = threads[0].id;
    }
    schedulePersist();
    window.DhpUtils?.showToast("Đã xóa cuộc trò chuyện");
    if (onRenderCallback) onRenderCallback();
  }

  function deleteActiveThread() {
    deleteThreadById(activeThreadId);
  }

  function setFilterMode(mode) {
    filterMode = mode === "pinned" ? "pinned" : "all";
    if (onRenderCallback) onRenderCallback();
  }

  function getState() {
    const visibleThreads =
      filterMode === "pinned" ? threads.filter((t) => t.pinned) : threads;
    return {
      threads,
      visibleThreads,
      activeThread: getActiveThread(),
      filterMode,
      isCloudMode,
      cloudEmail
    };
  }

  return {
    init,
    getState,
    getActiveThread,
    appendMessageToActive,
    startNewThread,
    switchThread,
    togglePinThread,
    renameThread,
    toggleUnreadThread,
    shareThread,
    exportThreadToNotepad,
    deleteThreadById,
    deleteActiveThread,
    setFilterMode
  };
})();
