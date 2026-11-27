(function () {
  const STORAGE_KEY = "dhp_lang_mode";

  // Bảng dịch tập trung tại 1 file duy nhất: [Tiếng Việt gốc, Bản dịch tiếng Anh]
  // Muốn thêm hoặc sửa câu nào trên toàn web, chỉ cần sửa tại đây.
  const PHRASE_PAIRS = [
    // Header & Điều hướng
    ["Cá nhân", "Profile"],
    ["Công việc", "Work"],
    ["Mini Game", "Mini Game"],
    ["Second Brain", "Second Brain"],
    ["Giao diện", "Theme"],
    ["Đăng nhập Google", "Sign in with Google"],
    ["Liên hệ Zalo", "Contact Zalo"],
    ["Nhắn tin qua Zalo", "Message on Zalo"],
    ["Điều hướng", "Navigation"],
    ["Kết nối nhanh", "Quick Links"],
    ["01 / Thông tin cá nhân", "01 / Personal Profile"],
    ["02 / Công việc hiện tại", "02 / Current Work"],
    ["03 / Mini Game giải trí", "03 / Mini Game Playground"],
    ["04 / Second Brain (Kho tri thức AI)", "04 / Second Brain (AI Knowledge Base)"],
    ["Góc thư giãn bất ngờ", "Surprise Break"],
    ["Tích hợp trợ lý AI sắp xếp lịch làm việc theo tài khoản Google.", "Integrated AI assistant for scheduling work with your Google account."],
    ["Đang tải không gian cá nhân...", "Loading personal workspace..."],

    // Modal & Thông báo chung
    ["CẢNH BÁO TÒ MÒ", "CURIOSITY ALERT"],
    ["Bị bắt quả tang rồi nhé!", "Caught you!"],
    ["Làm gì có ảnh nóng nào ở đây đâu! Quay lại trò chuyện với AI hoặc chơi thử ván Cờ Caro, Rắn săn mồi nhé.", "There are no spicy photos here! Head back to chat with AI or play a round of Caro or Snake."],
    ["Đã hiểu, quay lại", "Got it, go back"],
    ["Mở menu điều hướng", "Open navigation menu"],

    // Mini Game & Cờ Caro / Cờ Vua / Rắn săn mồi / Sudoku
    ["03 / GÓC GIẢI TRÍ", "03 / PLAYGROUND"],
    ["Mini Game thư giãn", "Relaxing Mini Game"],
    ["Cờ Caro", "Caro"],
    ["Cờ Vua", "Chess"],
    ["Rắn săn mồi", "Snake"],
    ["Sudoku 9x9", "Sudoku 9x9"],
    ["Đấu với Máy (AI)", "Play vs AI"],
    ["2 Người chơi cùng máy", "2 Players (Local)"],
    ["Dễ", "Easy"],
    ["Trung bình", "Medium"],
    ["Khó", "Hard"],
    ["Siêu khó", "Extreme"],
    ["Đi lại", "Undo"],
    ["Ván mới", "New Game"],
    ["Lượt của bạn (X)", "Your Turn (X)"],
    ["Lượt của bạn (Trắng)", "Your Turn (White)"],
    ["Lượt của X", "X's Turn"],
    ["Lượt của O", "O's Turn"],
    ["Lượt bên Trắng", "White's Turn"],
    ["Lượt bên Đen", "Black's Turn"],
    ["⚠️ Đang bị chiếu! ", "⚠️ In Check! "],
    ["🤝 Hòa cờ (Hết nước đi hợp lệ).", "🤝 Stalemate (No legal moves left)."],
    ["Phong cấp Tốt thành quân gì? Nhập q (Hậu), r (Xe), b (Tượng) hoặc n (Mã):", "Promote Pawn to? Enter q (Queen), r (Rook), b (Bishop), or n (Knight):"],

    // Giới thiệu / AI / Lịch / Công việc
    ["01 / GIỚI THIỆU CÁ NHÂN", "01 / PERSONAL INTRO"],
    ["Xin chào, tôi là Đinh Hữu Phúc.", "Hi, I'm Dinh Huu Phuc."],
    ["Đơn giản, thực tế và tối ưu hiệu suất.", "Simple, practical, and built for high performance."],
    ["Khu vực", "Location"],
    ["Email liên hệ", "Contact Email"],
    ["Công việc hiện tại", "Current Role"],
    ["Xem tại Tab Công việc →", "View in Work Tab →"],
    ["Sẵn sàng kết nối", "Open to Connect"],
    ["Thương mại & Phân phối", "Commerce & Distribution"],
    ["Tối ưu vận hành", "Operations Optimization"],
    ["Trợ lý AI & Lịch trình", "AI Assistant & Schedule"],
    ["02 / TRỢ LÝ AI GEMINI & ĐẶT LỊCH NHANH", "02 / GEMINI AI ASSISTANT & QUICK SCHEDULER"],
    ["Trò chuyện & Sắp xếp lịch làm việc", "Chat & Work Scheduling"],
    ["+ Cuộc trò chuyện mới", "+ New Chat"],
    ["Tất cả", "All"],
    ["Lọc ghim", "Pinned"],
    ["Lịch sử", "History"],
    ["Đặt lịch", "Schedule"],
    ["Đồng bộ Google", "Google Sync"]
  ];

  const viToEn = new Map();
  const enToVi = new Map();
  const originalTextMap = new WeakMap();
  const originalAttrMap = new WeakMap();

  for (const [vi, en] of PHRASE_PAIRS) {
    if (!viToEn.has(vi)) viToEn.set(vi, en);
    if (!enToVi.has(en)) enToVi.set(en, vi);
  }

  function getLang() {
    try {
      const val = localStorage.getItem(STORAGE_KEY) || "vi";
      return val === "en" ? "en" : "vi";
    } catch {
      return "vi";
    }
  }

  function translateDynamicText(text, targetLang) {
    if (targetLang === "vi") return text;

    // Dịch các mẫu trạng thái động của Cờ Caro & Cờ Vua
    let m;
    if ((m = text.match(/^Lượt của bạn \(X\) • Máy: (.+)$/))) {
      return `Your Turn (X) • AI: ${translateDynamicText(m[1], "en")}`;
    }
    if ((m = text.match(/^Máy \((.+)\) đang tính nước \(O\)\.\.\.$/))) {
      return `AI (${translateDynamicText(m[1], "en")}) is thinking (O)...`;
    }
    if ((m = text.match(/^🎉 Bạn \(X\) đã thắng Máy \((.+)\)!\s*$/))) {
      return `🎉 You (X) beat AI (${translateDynamicText(m[1], "en")})!`;
    }
    if ((m = text.match(/^🤖 Máy \((.+)\) đã thắng \(O\)!\s*$/))) {
      return `🤖 AI (${translateDynamicText(m[1], "en")}) won (O)!`;
    }
    if ((m = text.match(/^🎉 Người chơi (.+) chiến thắng!\s*$/))) {
      return `🎉 Player ${m[1]} wins!`;
    }
    if ((m = text.match(/^(⚠️ Đang bị chiếu! )?Lượt của bạn \(Trắng\) • Máy: (.+)$/))) {
      return `${m[1] ? "⚠️ In Check! " : ""}Your Turn (White) • AI: ${translateDynamicText(m[2], "en")}`;
    }
    if ((m = text.match(/^(⚠️ Đang bị chiếu! )?Máy \((.+)\) đang tính nước \(Đen\)\.\.\.$/))) {
      return `${m[1] ? "⚠️ In Check! " : ""}AI (${translateDynamicText(m[2], "en")}) is thinking (Black)...`;
    }
    if ((m = text.match(/^🎉 Chiếu hết! Bạn \(Trắng\) thắng Máy \((.+)\)!\s*$/))) {
      return `🎉 Checkmate! You (White) beat AI (${translateDynamicText(m[1], "en")})!`;
    }
    if ((m = text.match(/^♚ Chiếu hết! Máy \((.+)\) thắng \(Đen\)!\s*$/))) {
      return `♚ Checkmate! AI (${translateDynamicText(m[1], "en")}) wins (Black)!`;
    }
    if ((m = text.match(/^🎉 Chiếu hết! Bên (.+) chiến thắng!\s*$/))) {
      const side = m[1] === "Trắng" ? "White" : m[1] === "Đen" ? "Black" : m[1];
      return `🎉 Checkmate! ${side} wins!`;
    }

    return null;
  }

  function translateString(raw, targetLang) {
    if (typeof raw !== "string") return raw;
    const trimmed = raw.trim();
    if (!trimmed) return raw;

    if (targetLang === "en") {
      if (viToEn.has(trimmed)) {
        return raw.replace(trimmed, viToEn.get(trimmed));
      }
      const dyn = translateDynamicText(trimmed, "en");
      if (dyn) return raw.replace(trimmed, dyn);

      let out = raw;
      for (const [vi, en] of PHRASE_PAIRS) {
        if (vi.length >= 4 && out.includes(vi)) {
          out = out.split(vi).join(en);
        }
      }
      return out;
    } else {
      if (enToVi.has(trimmed)) {
        return raw.replace(trimmed, enToVi.get(trimmed));
      }
      return raw;
    }
  }

  let isApplying = false;

  function applyToDom(root = document.body) {
    if (!root || isApplying) return;
    isApplying = true;

    try {
      const lang = getLang();
      document.documentElement.setAttribute("lang", lang);

      if (lang === "en") {
        if (!document.title.includes("— Profile")) {
          // giữ nguyên title nếu đã đúng
        }
      }

      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          const tag = parent.tagName;
          if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT" || tag === "TEXTAREA") {
            return NodeFilter.FILTER_REJECT;
          }
          if (!node.nodeValue || !node.nodeValue.trim()) {
            return NodeFilter.FILTER_SKIP;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      });

      const textNodes = [];
      let cur;
      while ((cur = walker.nextNode())) {
        textNodes.push(cur);
      }

      for (const node of textNodes) {
        if (!originalTextMap.has(node)) {
          originalTextMap.set(node, node.nodeValue);
        }
        const baseText = originalTextMap.get(node);
        const nextText = lang === "en" ? translateString(baseText, "en") : baseText;
        if (node.nodeValue !== nextText) {
          node.nodeValue = nextText;
        }
      }

      const attrTargets = root.querySelectorAll("[placeholder], [title], [aria-label]");
      for (const el of attrTargets) {
        for (const attr of ["placeholder", "title", "aria-label"]) {
          if (!el.hasAttribute(attr)) continue;
          let mapForEl = originalAttrMap.get(el);
          if (!mapForEl) {
            mapForEl = {};
            originalAttrMap.set(el, mapForEl);
          }
          if (!(attr in mapForEl)) {
            mapForEl[attr] = el.getAttribute(attr);
          }
          const baseVal = mapForEl[attr];
          const nextVal = lang === "en" ? translateString(baseVal, "en") : baseVal;
          if (el.getAttribute(attr) !== nextVal) {
            el.setAttribute(attr, nextVal);
          }
        }
      }

      document.querySelectorAll("[data-lang-value]").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.langValue === lang);
      });
    } finally {
      isApplying = false;
    }
  }

  function setLanguage(lang, showNotice = false) {
    const normalized = lang === "en" ? "en" : "vi";
    try {
      localStorage.setItem(STORAGE_KEY, normalized);
    } catch {}
    applyToDom(document.body);
    if (showNotice && typeof window.showToast === "function") {
      window.showToast(normalized === "en" ? "Language: EN" : "Ngôn ngữ: VI");
    }
  }

  // Tự động dịch mọi nội dung mới render vào DOM (tab mới, thông báo game, chat...)
  const observer = new MutationObserver((mutations) => {
    if (isApplying || getLang() !== "en") return;
    for (const m of mutations) {
      if (m.type === "childList" && m.addedNodes.length > 0) {
        for (const added of m.addedNodes) {
          if (added.nodeType === Node.ELEMENT_NODE) {
            applyToDom(added);
          } else if (added.nodeType === Node.TEXT_NODE && added.parentElement) {
            applyToDom(added.parentElement);
          }
        }
      } else if (m.type === "characterData" && m.target?.parentElement) {
        applyToDom(m.target.parentElement);
      }
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
      });
      applyToDom(document.body);
    });
  } else {
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
    applyToDom(document.body);
  }

  window.DhpI18n = {
    PHRASE_PAIRS,
    getLang,
    setLanguage,
    applyToDom
  };
})();
