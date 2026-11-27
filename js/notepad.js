window.NotepadManager = (function () {
  let currentCode = "";
  let saveTimer = null;
  let isLoaded = false;

  function notify(msg) {
    if (typeof window.showToast === "function") window.showToast(msg);
  }

  function sanitizeCode(raw = "") {
    return String(raw || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, "")
      .slice(0, 48);
  }

  function generateRandomCode(len = 6) {
    const chars = "abcdefghijkmnpqrstuvwxyz23456789";
    let out = "";
    for (let i = 0; i < len; i++) {
      out += chars[Math.floor(Math.random() * chars.length)];
    }
    return out;
  }

  function getCodeFromUrl() {
    const m = window.location.pathname.match(/^\/notepad\/([^/]+)\/?$/i);
    return m ? sanitizeCode(decodeURIComponent(m[1])) : "";
  }

  function setStatus(text, cls = "") {
    const el = document.getElementById("dhpNpStatus");
    if (!el) return;
    el.textContent = text;
    el.className = `dhp-np-status ${cls}`.trim();
  }

  function updateCounter() {
    const ta = document.getElementById("dhpNpContent");
    const counter = document.getElementById("dhpNpCounter");
    if (!ta || !counter) return;
    const text = ta.value || "";
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    counter.textContent = `${text.length} ký tự • ${words} từ`;
  }

  function ensureShell() {
    if (document.getElementById("dhpNotepadOverlay")) return;

    const fab = document.createElement("button");
    fab.type = "button";
    fab.id = "dhpNotepadFab";
    fab.className = "dhp-notepad-fab";
    fab.innerHTML = `<span>📝 Notepad Online</span>`;
    fab.addEventListener("click", () => {
      const lastCode = localStorage.getItem("dhp_last_notepad") || generateRandomCode();
      openNotepad(lastCode, { pushUrl: true });
    });
    document.body.appendChild(fab);

    const overlay = document.createElement("section");
    overlay.id = "dhpNotepadOverlay";
    overlay.className = "dhp-notepad-overlay hidden";
    overlay.innerHTML = `
      <header class="dhp-np-topbar">
        <div class="dhp-np-brand">
          <button type="button" id="dhpNpBackBtn" class="btn btn-outline btn-sm">← Trang chủ</button>
          <div class="dhp-np-slug-box" title="Nhập mã ghi chú bất kỳ rồi nhấn Enter để mở">
            <span class="dhp-np-slug-prefix">dinhhuuphuc.com/notepad/</span>
            <input type="text" id="dhpNpSlugInput" class="dhp-np-slug-input" placeholder="nhap-ma" />
          </div>
          <button type="button" id="dhpNpGoSlugBtn" class="btn btn-outline btn-sm">Mở mã</button>
        </div>
        <div class="dhp-np-actions">
          <span id="dhpNpStatus" class="dhp-np-status">Sẵn sàng</span>
          <button type="button" id="dhpNpRefreshBtn" class="btn btn-outline btn-sm" title="Tải lại nội dung mới nhất từ máy khác">Làm mới</button>
          <button type="button" id="dhpNpCopyLinkBtn" class="btn btn-outline btn-sm">Sao chép link</button>
          <button type="button" id="dhpNpNewBtn" class="btn btn-primary btn-sm">+ Mã mới</button>
        </div>
      </header>
      <div class="dhp-np-editor-wrap">
        <input type="text" id="dhpNpTitle" class="dhp-np-title-input" placeholder="Tiêu đề ghi chú (tùy chọn)..." />
        <textarea id="dhpNpContent" class="dhp-np-textarea" placeholder="Nhập nội dung ghi chú tại đây... Mọi thay đổi được tự động lưu và đồng bộ ngay lập tức qua đường dẫn phía trên."></textarea>
        <div class="dhp-np-footer">
          <span>Tự động lưu & đồng bộ qua link • Tự xóa nếu không sử dụng sau 45 ngày.</span>
          <span id="dhpNpCounter">0 ký tự • 0 từ</span>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const slugInput = document.getElementById("dhpNpSlugInput");
    const titleInput = document.getElementById("dhpNpTitle");
    const contentInput = document.getElementById("dhpNpContent");

    document.getElementById("dhpNpBackBtn").addEventListener("click", closeNotepad);

    const switchSlug = () => {
      const next = sanitizeCode(slugInput.value);
      if (!next) {
        notify("Vui lòng nhập mã notepad hợp lệ (chữ cái, số, dấu - hoặc _).");
        return;
      }
      openNotepad(next, { pushUrl: true });
    };

    document.getElementById("dhpNpGoSlugBtn").addEventListener("click", switchSlug);
    slugInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        switchSlug();
      }
    });

    document.getElementById("dhpNpRefreshBtn").addEventListener("click", () => {
      if (currentCode) loadNote(currentCode);
    });

    document.getElementById("dhpNpCopyLinkBtn").addEventListener("click", async () => {
      const fullUrl = `${window.location.origin}/notepad/${currentCode}`;
      try {
        await navigator.clipboard.writeText(fullUrl);
        notify(`Đã sao chép: ${fullUrl}`);
      } catch {
        notify(fullUrl);
      }
    });

    document.getElementById("dhpNpNewBtn").addEventListener("click", () => {
      openNotepad(generateRandomCode(), { pushUrl: true });
    });

    const onEdit = () => {
      updateCounter();
      if (!isLoaded || !currentCode) return;
      setStatus("Đang lưu...", "saving");
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(() => saveNote(), 600);
    };

    titleInput.addEventListener("input", onEdit);
    contentInput.addEventListener("input", onEdit);
  }

  async function loadNote(code) {
    isLoaded = false;
    setStatus("Đang tải...", "saving");
    try {
      const res = await fetch(`/api/notepad/${encodeURIComponent(code)}`, { cache: "no-store" });
      const data = await res.json();
      document.getElementById("dhpNpTitle").value = data.title || "";
      document.getElementById("dhpNpContent").value = data.content || "";
      updateCounter();

      if (data.updatedAt) {
        const t = new Date(data.updatedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
        setStatus(`Đã đồng bộ lúc ${t}`, "saved");
      } else {
        setStatus("Ghi chú mới", "");
      }
    } catch {
      setStatus("Lỗi kết nối", "");
    } finally {
      isLoaded = true;
    }
  }

  async function saveNote() {
    if (!currentCode) return;
    const title = document.getElementById("dhpNpTitle")?.value || "";
    const content = document.getElementById("dhpNpContent")?.value || "";
    try {
      const res = await fetch(`/api/notepad/${encodeURIComponent(currentCode)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content })
      });
      const data = await res.json();
      if (data.ok) {
        const t = new Date(data.updatedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
        setStatus(`Đã lưu lúc ${t}`, "saved");
      } else {
        setStatus("Lưu thất bại", "");
      }
    } catch {
      setStatus("Mất kết nối", "");
    }
  }

  function openNotepad(code, { pushUrl = true } = {}) {
    ensureShell();
    const clean = sanitizeCode(code) || generateRandomCode();
    currentCode = clean;
    localStorage.setItem("dhp_last_notepad", clean);

    const slugInput = document.getElementById("dhpNpSlugInput");
    if (slugInput) slugInput.value = clean;

    document.getElementById("dhpNotepadOverlay").classList.remove("hidden");
    document.body.style.overflow = "hidden";

    if (pushUrl && window.location.pathname !== `/notepad/${clean}`) {
      window.history.pushState({ notepadCode: clean }, "", `/notepad/${clean}`);
    }

    loadNote(clean);
  }

  function closeNotepad() {
    const overlay = document.getElementById("dhpNotepadOverlay");
    if (overlay) overlay.classList.add("hidden");
    document.body.style.overflow = "";
    if (window.location.pathname.startsWith("/notepad")) {
      window.history.pushState({}, "", "/");
    }
  }

  function init() {
    ensureShell();
    const urlCode = getCodeFromUrl();
    if (urlCode) {
      openNotepad(urlCode, { pushUrl: false });
    } else if (window.location.pathname === "/notepad") {
      openNotepad(generateRandomCode(), { pushUrl: true });
    }
  }

  window.addEventListener("popstate", () => {
    const code = getCodeFromUrl();
    if (code) openNotepad(code, { pushUrl: false });
    else {
      const overlay = document.getElementById("dhpNotepadOverlay");
      if (overlay && !overlay.classList.contains("hidden")) {
        overlay.classList.add("hidden");
        document.body.style.overflow = "";
      }
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  return { openNotepad, closeNotepad };
})();
