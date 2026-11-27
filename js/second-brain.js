window.SecondBrainManager = (function () {
  let itemsCache = [];
  let sbHistory = [];
  let isSending = false;

  const esc = (s) => window.DhpUtils.escapeHtml(s);
  const notify = (m) => window.DhpUtils.showToast(m);

  async function fetchBrainList() {
    const statusEl = document.getElementById("sbAccountStatus");
    try {
      const data = await window.SecondBrainApi.listItems();
      itemsCache = Array.isArray(data.items) ? data.items : [];
      if (statusEl) {
        statusEl.textContent = data.authenticated
          ? `☁️ Đồng bộ: ${data.email}`
          : "Chưa đăng nhập Google";
      }
      const countEl = document.getElementById("sbTotalCount");
      if (countEl) countEl.textContent = String(itemsCache.length);
      return data;
    } catch {
      return { authenticated: false, items: [] };
    }
  }

  function renderList(keyword = "") {
    const box = document.getElementById("dhpBrainListContainer");
    if (!box) return;

    const statusText = document.getElementById("sbAccountStatus")?.textContent || "";
    if (!window.DhpApi.getSessionId() && statusText.includes("Chưa đăng nhập")) {
      box.innerHTML = `<div class="calendar-empty-state">Hãy nhấn <strong>Đăng nhập Google</strong> ở góc trên để lưu và đồng bộ Bộ Não Thứ 2 của riêng bạn.</div>`;
      return;
    }

    const kw = keyword.toLowerCase().trim();
    const filtered = kw
      ? itemsCache.filter((it) =>
          `${it.title} ${it.preview} ${(it.tags || []).join(" ")}`.toLowerCase().includes(kw)
        )
      : itemsCache;

    if (filtered.length === 0) {
      box.innerHTML = `<div class="calendar-empty-state">Kho tri thức đang trống. Hãy dán link YouTube/Facebook hoặc nội dung vào khung phía trên để AI học nhé!</div>`;
      return;
    }

    box.innerHTML = filtered
      .map((it) => {
        const dateStr = it.createdAt ? new Date(it.createdAt).toLocaleDateString("vi-VN") : "";
        const tagsHtml = (it.tags || [])
          .map((t) => `<span class="dhp-brain-tag">#${esc(t)}</span>`)
          .join("");
        const linkHtml = it.sourceUrl
          ? `<a href="${esc(it.sourceUrl)}" target="_blank" rel="noopener noreferrer" style="font-size:0.78rem;color:var(--accent);font-weight:600;display:inline-block;margin-top:4px;">🔗 Xem nguồn gốc</a>`
          : "";

        return `
          <div class="dhp-brain-item">
            <div style="flex:1;min-width:0;">
              <div class="dhp-brain-item-title">${esc(it.title)} <span style="font-weight:400;font-size:0.76rem;color:#71717a;">• ${dateStr}</span></div>
              <div class="dhp-brain-item-preview">${esc(it.preview || "")}</div>
              ${linkHtml}
              ${tagsHtml ? `<div class="dhp-brain-tags">${tagsHtml}</div>` : ""}
            </div>
            <button type="button" class="btn btn-outline btn-sm dhp-brain-del-btn" data-brain-id="${esc(it.id)}">Xóa</button>
          </div>
        `;
      })
      .join("");

    box.querySelectorAll(".dhp-brain-del-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!window.confirm("Xóa kiến thức này khỏi Bộ não thứ 2?")) return;
        const data = await window.SecondBrainApi.deleteItem(btn.dataset.brainId);
        if (data.ok) {
          notify("Đã xóa khỏi Bộ não thứ 2.");
          await fetchBrainList();
          renderList(document.getElementById("dhpBrainSearchInput")?.value || "");
        }
      });
    });
  }

  function appendChatBubble(role, text) {
    const box = document.getElementById("sbChatMessages");
    if (!box) return;
    const isUser = role === "user";
    const row = document.createElement("div");
    row.className = isUser ? "chat-row user" : "chat-row bot";
    row.innerHTML = `
      <span class="chat-sender">${isUser ? "Bạn" : "Second Brain AI"}</span>
      <div class="chat-bubble ${isUser ? "user" : "bot"}">${esc(text)}</div>
    `;
    box.appendChild(row);
    box.scrollTop = box.scrollHeight;
  }

  async function handleQuickIngestSubmit(e) {
    e.preventDefault();
    const input = document.getElementById("sbQuickIngestInput");
    const btn = document.getElementById("sbQuickIngestBtn");
    const rawText = input?.value.trim() || "";
    if (!rawText) return notify("Vui lòng dán link hoặc nội dung cần AI học.");

    if (btn) {
      btn.disabled = true;
      btn.textContent = "AI đang học...";
    }

    try {
      const prompt = `Ghi nhớ và lưu nội dung sau vào Bộ não thứ 2 giúp tôi:\n${rawText}`;
      const data = await window.SecondBrainApi.chatOrIngest(prompt, "second_brain_ingest");
      if (data.savedMemory) {
        input.value = "";
        notify(`🧠 Đã nạp kiến thức: ${data.savedMemory.title}`);
        await fetchBrainList();
        renderList(document.getElementById("dhpBrainSearchInput")?.value || "");
      } else {
        notify(data.reply || "Vui lòng đăng nhập Google để lưu kiến thức.");
      }
    } catch {
      notify("Lỗi kết nối khi nạp kiến thức.");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = "⚡ Gửi AI nạp ngay";
      }
    }
  }

  async function handleBrainChatSubmit(e) {
    e.preventDefault();
    if (isSending) return;
    const input = document.getElementById("sbChatInput");
    const sendBtn = document.getElementById("sbChatSendBtn");
    const message = input?.value.trim() || "";
    if (!message) return;

    isSending = true;
    input.value = "";
    if (sendBtn) {
      sendBtn.disabled = true;
      sendBtn.textContent = "Đang tìm...";
    }

    appendChatBubble("user", message);
    const recent = sbHistory.slice(-8);
    sbHistory.push({ role: "user", text: message });

    try {
      const data = await window.SecondBrainApi.chatOrIngest(message, "second_brain", recent);
      const reply = data.reply || "Tôi chưa tìm thấy thông tin phù hợp trong Bộ não thứ 2.";
      sbHistory.push({ role: "bot", text: reply });
      appendChatBubble("bot", reply);

      if (data.savedMemory) {
        notify(`Đã học: ${data.savedMemory.title}`);
        await fetchBrainList();
        renderList(document.getElementById("dhpBrainSearchInput")?.value || "");
      }
    } catch {
      appendChatBubble("bot", "Lỗi kết nối máy chủ AI. Bạn thử lại nhé!");
    } finally {
      isSending = false;
      if (sendBtn) {
        sendBtn.disabled = false;
        sendBtn.textContent = "Hỏi AI →";
      }
      input.focus();
    }
  }

  async function initTab() {
    await fetchBrainList();
    renderList("");

    document.querySelectorAll("[data-ingest-mode]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const mode = btn.dataset.ingestMode;
        document.querySelectorAll("[data-ingest-mode]").forEach((b) => b.classList.toggle("active", b === btn));
        document.getElementById("sbQuickIngestForm")?.classList.toggle("hidden", mode !== "quick");
        document.getElementById("sbManualIngestBox")?.classList.toggle("hidden", mode !== "manual");
      });
    });

    document.getElementById("sbQuickIngestForm")?.addEventListener("submit", handleQuickIngestSubmit);
    document.getElementById("sbQuickIngestInput")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleQuickIngestSubmit(e);
      }
    });

    document.getElementById("dhpBrainSearchInput")?.addEventListener("input", (e) => renderList(e.target.value));

    document.getElementById("dhpBrainSaveManualBtn")?.addEventListener("click", async () => {
      const title = document.getElementById("dhpBrainNewTitle").value.trim();
      const sourceUrl = document.getElementById("dhpBrainNewUrl").value.trim();
      const summary = document.getElementById("dhpBrainNewContent").value.trim();
      const tags = document.getElementById("dhpBrainNewTags").value.split(",").map((t) => t.trim()).filter(Boolean);

      if (!summary && !sourceUrl) return notify("Vui lòng nhập nội dung hoặc đường dẫn cần lưu.");

      const btn = document.getElementById("dhpBrainSaveManualBtn");
      btn.disabled = true;
      btn.textContent = "Đang lưu...";

      try {
        const data = await window.SecondBrainApi.saveManual({ title, sourceUrl, summary, tags });
        if (data.ok) {
          ["dhpBrainNewTitle", "dhpBrainNewUrl", "dhpBrainNewContent", "dhpBrainNewTags"].forEach(
            (id) => (document.getElementById(id).value = "")
          );
          notify("Đã nạp kiến thức vào Bộ não thứ 2!");
          await fetchBrainList();
          renderList("");
        } else {
          notify(data.error || "Không thể lưu.");
        }
      } finally {
        btn.disabled = false;
        btn.textContent = "+ Lưu kiến thức";
      }
    });

    document.getElementById("sbChatForm")?.addEventListener("submit", handleBrainChatSubmit);
    document.getElementById("sbClearChatBtn")?.addEventListener("click", () => {
      sbHistory = [];
      const box = document.getElementById("sbChatMessages");
      if (box) {
        box.innerHTML = `<div class="chat-row bot"><span class="chat-sender">Second Brain AI</span><div class="chat-bubble bot">Đã làm mới phiên hỏi-đáp. Bạn muốn tra cứu kiến thức nào trong kho đã lưu?</div></div>`;
      }
    });
  }

  return { initTab, fetchBrainList };
})();
