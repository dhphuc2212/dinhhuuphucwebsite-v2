window.SecondBrainManager = (function () {
  let itemsCache = [];
  let sbHistory = [];
  let isAuthenticated = false;
  let isSending = false;
  let isIngesting = false;

  const esc = (s) =>
    window.DhpUtils?.escapeHtml
      ? window.DhpUtils.escapeHtml(s)
      : String(s || "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");

  function setFeedback(msg, type = "info") {
    if (msg) {
      if (window.DhpUtils?.showToast) {
        window.DhpUtils.showToast(msg);
      } else if (typeof window.showToast === "function") {
        window.showToast(msg);
      }
    }

    const form = document.getElementById("sbQuickIngestForm");
    if (!form) return;

    let fb = document.getElementById("sbIngestFeedback");
    if (!fb) {
      fb = document.createElement("div");
      fb.id = "sbIngestFeedback";
      fb.style.cssText =
        "margin-top:8px;padding:8px 11px;border-radius:8px;font-size:0.82rem;font-weight:600;display:none;";
      form.appendChild(fb);
    }

    if (!msg) {
      fb.style.display = "none";
      fb.textContent = "";
      return;
    }

    fb.style.display = "block";
    fb.textContent = msg;
    if (type === "error") {
      fb.style.background = "rgba(244, 63, 94, 0.14)";
      fb.style.color = "#e11d48";
      fb.style.border = "1px solid rgba(244, 63, 94, 0.35)";
    } else if (type === "success") {
      fb.style.background = "rgba(16, 185, 129, 0.14)";
      fb.style.color = "#059669";
      fb.style.border = "1px solid rgba(16, 185, 129, 0.35)";
    } else {
      fb.style.background = "rgba(56, 189, 248, 0.12)";
      fb.style.color = "#0284c7";
      fb.style.border = "1px solid rgba(56, 189, 248, 0.3)";
    }
  }

  function getSessionHeader() {
    try {
      const sid =
        window.DhpApi?.getSessionId?.() ||
        localStorage.getItem("dhp_gcal_sid") ||
        "";
      return sid ? { "X-Session-Id": sid } : {};
    } catch {
      return {};
    }
  }

  async function apiCall(path, options = {}) {
    if (window.DhpApi?.request) {
      return await window.DhpApi.request(path, options);
    }
    const headers = {
      "Content-Type": "application/json",
      ...getSessionHeader(),
      ...(options.headers || {})
    };
    const res = await fetch(path, {
      ...options,
      headers,
      credentials: "include",
      cache: "no-store"
    });
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return { ok: false, error: text || `HTTP ${res.status}` };
    }
  }

  function setAccountStatusText(text) {
    const statusEl = document.getElementById("sbAccountStatus");
    if (statusEl) {
      statusEl.textContent = text;
    }
  }

  async function fetchBrainList() {
    setAccountStatusText("Đang kiểm tra tài khoản...");
    try {
      const data = window.SecondBrainApi?.listItems
        ? await window.SecondBrainApi.listItems()
        : await apiCall("/api/brain");

      isAuthenticated = Boolean(data && data.authenticated);
      itemsCache = Array.isArray(data && data.items) ? data.items : [];

      if (isAuthenticated) {
        setAccountStatusText(`☁️ Đồng bộ: ${data.email || "Google"}`);
      } else {
        setAccountStatusText("Chưa đăng nhập Google");
      }

      const countEl = document.getElementById("sbTotalCount");
      if (countEl) countEl.textContent = String(itemsCache.length);
      return data || { authenticated: false, items: [] };
    } catch {
      isAuthenticated = false;
      itemsCache = [];
      setAccountStatusText("Chưa đăng nhập Google");
      const countEl = document.getElementById("sbTotalCount");
      if (countEl) countEl.textContent = "0";
      return { authenticated: false, items: [] };
    }
  }

  function renderList(keyword = "") {
    const box = document.getElementById("dhpBrainListContainer");
    if (!box) return;

    if (!isAuthenticated) {
      box.innerHTML = `<div class="calendar-empty-state">Hãy nhấn <strong>Đăng nhập Google</strong> ở góc trên để lưu và đồng bộ Bộ Não Thứ 2 của riêng bạn.</div>`;
      return;
    }

    const kw = keyword.toLowerCase().trim();
    const filtered = kw
      ? itemsCache.filter((it) =>
          `${it.title || ""} ${it.preview || ""} ${(it.tags || []).join(" ")}`
            .toLowerCase()
            .includes(kw)
        )
      : itemsCache;

    if (filtered.length === 0) {
      box.innerHTML = `<div class="calendar-empty-state">Kho tri thức đang trống. Hãy dán link YouTube/Facebook hoặc nội dung vào khung phía trên để lưu thông tin nhé!</div>`;
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
              <div class="dhp-brain-item-title">${esc(it.title || "Ghi nhớ")} <span style="font-weight:400;font-size:0.76rem;color:#71717a;">• ${dateStr}</span></div>
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
        const data = window.SecondBrainApi?.deleteItem
          ? await window.SecondBrainApi.deleteItem(btn.dataset.brainId)
          : await apiCall(`/api/brain/item/${encodeURIComponent(btn.dataset.brainId)}`, {
              method: "DELETE"
            });
        if (data && data.ok) {
          setFeedback("Đã xóa khỏi Bộ não thứ 2.", "success");
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

  async function saveDirectToBrain(rawText) {
    const urlMatch = rawText.match(/https?:\/\/[^\s)]+/i);
    const payload = {
      title: "",
      sourceUrl: urlMatch ? urlMatch[0] : "",
      summary: rawText,
      tags: []
    };
    if (window.SecondBrainApi?.saveManual) {
      return await window.SecondBrainApi.saveManual(payload);
    }
    return await apiCall("/api/brain", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }

  async function handleQuickIngestSubmit(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isIngesting) return;

    const input = document.getElementById("sbQuickIngestInput");
    const btn = document.getElementById("sbQuickIngestBtn");
    const rawText = input ? input.value.trim() : "";

    if (!rawText) {
      setFeedback("Vui lòng dán link hoặc nội dung cần lưu.", "error");
      input?.focus();
      return;
    }

    isIngesting = true;
    const oldBtnText = btn ? btn.textContent : "⚡ Gửi AI nạp ngay";
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Đang nạp...";
    }
    setFeedback("Đang gửi nội dung tới AI để tóm tắt & lưu...", "info");

    try {
      const today = window.DhpUtils?.getTodayIso
        ? window.DhpUtils.getTodayIso()
        : new Date().toISOString().slice(0, 10);
      const timezone = window.DhpUtils?.getTimezone
        ? window.DhpUtils.getTimezone()
        : "Asia/Ho_Chi_Minh";
      const prompt = `Ghi nhớ và lưu nội dung sau vào Bộ não thứ 2 giúp tôi:\n${rawText}`;

      const data = window.SecondBrainApi?.chatOrIngest
        ? await window.SecondBrainApi.chatOrIngest(prompt, "second_brain_ingest", [])
        : await apiCall("/api/chat", {
            method: "POST",
            body: JSON.stringify({
              message: prompt,
              today,
              timezone,
              history: [],
              mode: "second_brain_ingest"
            })
          });

      if (data && data.savedMemory) {
        if (input) input.value = "";
        await fetchBrainList();
        renderList(document.getElementById("dhpBrainSearchInput")?.value || "");
        setFeedback(`🧠 Đã lưu thông tin: ${data.savedMemory.title}`, "success");
        return;
      }

      const replyStr = String((data && data.reply) || "");
      if (replyStr.toLowerCase().includes("đăng nhập google")) {
        isAuthenticated = false;
        setAccountStatusText("Chưa đăng nhập Google");
        renderList("");
        setFeedback("Vui lòng đăng nhập Google ở góc trên để lưu thông tin vào Bộ não thứ 2.", "error");
        return;
      }

      const directSave = await saveDirectToBrain(rawText);
      if (directSave && directSave.ok) {
        if (input) input.value = "";
        await fetchBrainList();
        renderList(document.getElementById("dhpBrainSearchInput")?.value || "");
        setFeedback("🧠 Đã lưu thông tin vào Bộ não thứ 2!", "success");
        return;
      }

      if (directSave && directSave.error) {
        setFeedback(directSave.error, "error");
        return;
      }

      setFeedback(replyStr || "Chưa thể lưu thông tin lúc này. Vui lòng kiểm tra đăng nhập Google.", "error");
    } catch (err) {
      console.error("Quick ingest error:", err);
      setFeedback("Lỗi kết nối khi nạp thông tin. Vui lòng thử lại.", "error");
    } finally {
      isIngesting = false;
      if (btn) {
        btn.disabled = false;
        btn.textContent = oldBtnText || "⚡ Gửi AI nạp ngay";
      }
    }
  }

  async function handleBrainChatSubmit(e) {
    if (e) e.preventDefault();
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
      const data = window.SecondBrainApi?.chatOrIngest
        ? await window.SecondBrainApi.chatOrIngest(message, "second_brain", recent)
        : await apiCall("/api/chat", {
            method: "POST",
            body: JSON.stringify({
              message,
              today: window.DhpUtils?.getTodayIso ? window.DhpUtils.getTodayIso() : new Date().toISOString().slice(0, 10),
              timezone: window.DhpUtils?.getTimezone ? window.DhpUtils.getTimezone() : "Asia/Ho_Chi_Minh",
              history: recent,
              mode: "second_brain"
            })
          });

      const reply =
        (data && data.reply) || "Tôi chưa tìm thấy thông tin phù hợp trong Bộ não thứ 2.";
      sbHistory.push({ role: "bot", text: reply });
      appendChatBubble("bot", reply);

      if (data && data.savedMemory) {
        setFeedback(`Đã lưu: ${data.savedMemory.title}`, "success");
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

  function bindControls() {
    document.querySelectorAll("[data-ingest-mode]").forEach((btn) => {
      btn.onclick = () => {
        const mode = btn.dataset.ingestMode;
        document
          .querySelectorAll("[data-ingest-mode]")
          .forEach((b) => b.classList.toggle("active", b === btn));
        document.getElementById("sbQuickIngestForm")?.classList.toggle("hidden", mode !== "quick");
        document.getElementById("sbManualIngestBox")?.classList.toggle("hidden", mode !== "manual");
      };
    });

    const quickForm = document.getElementById("sbQuickIngestForm");
    if (quickForm) quickForm.onsubmit = handleQuickIngestSubmit;

    const quickBtn = document.getElementById("sbQuickIngestBtn");
    if (quickBtn) {
      quickBtn.onclick = (e) => {
        e.preventDefault();
        handleQuickIngestSubmit(e);
      };
    }

    const quickInput = document.getElementById("sbQuickIngestInput");
    if (quickInput) {
      quickInput.onkeydown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          handleQuickIngestSubmit(e);
        }
      };
    }

    const searchInput = document.getElementById("dhpBrainSearchInput");
    if (searchInput) {
      searchInput.oninput = (e) => renderList(e.target.value);
    }

    const manualBtn = document.getElementById("dhpBrainSaveManualBtn");
    if (manualBtn) {
      manualBtn.onclick = async () => {
        const title = document.getElementById("dhpBrainNewTitle")?.value.trim() || "";
        const sourceUrl = document.getElementById("dhpBrainNewUrl")?.value.trim() || "";
        const summary = document.getElementById("dhpBrainNewContent")?.value.trim() || "";
        const tags = (document.getElementById("dhpBrainNewTags")?.value || "")
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);

        if (!summary && !sourceUrl) {
          setFeedback("Vui lòng nhập nội dung hoặc đường dẫn cần lưu.", "error");
          return;
        }

        manualBtn.disabled = true;
        manualBtn.textContent = "Đang lưu...";

        try {
          const data = window.SecondBrainApi?.saveManual
            ? await window.SecondBrainApi.saveManual({ title, sourceUrl, summary, tags })
            : await apiCall("/api/brain", {
                method: "POST",
                body: JSON.stringify({ title, sourceUrl, summary, tags })
              });

          if (data && data.ok) {
            ["dhpBrainNewTitle", "dhpBrainNewUrl", "dhpBrainNewContent", "dhpBrainNewTags"].forEach(
              (id) => {
                const el = document.getElementById(id);
                if (el) el.value = "";
              }
            );
            setFeedback("Đã lưu thông tin vào Bộ não thứ 2!", "success");
            await fetchBrainList();
            renderList("");
          } else {
            setFeedback((data && data.error) || "Không thể lưu (hãy kiểm tra đăng nhập Google).", "error");
          }
        } finally {
          manualBtn.disabled = false;
          manualBtn.textContent = "+ Lưu kiến thức";
        }
      };
    }

    const chatForm = document.getElementById("sbChatForm");
    if (chatForm) chatForm.onsubmit = handleBrainChatSubmit;

    const clearBtn = document.getElementById("sbClearChatBtn");
    if (clearBtn) {
      clearBtn.onclick = () => {
        sbHistory = [];
        const box = document.getElementById("sbChatMessages");
        if (box) {
          box.innerHTML = `<div class="chat-row bot"><span class="chat-sender">Second Brain AI</span><div class="chat-bubble bot">Đã làm mới phiên hỏi-đáp. Bạn muốn tra cứu thông tin nào trong kho đã lưu?</div></div>`;
        }
      };
    }
  }

  async function initTab() {
    bindControls();
    await fetchBrainList();
    renderList("");
  }

  return { initTab, bindSectionEvents: initTab, fetchBrainList };
})();
