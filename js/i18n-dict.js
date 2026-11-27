(function () {
  const STORAGE_KEY = "dhp_lang_mode";

  const PHRASE_PAIRS = [
    // Header & Footer
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
    ["CẢNH BÁO TÒ MÒ", "CURIOSITY ALERT"],
    ["Bị bắt quả tang rồi nhé!", "Caught you!"],
    ["Làm gì có ảnh nóng nào ở đây đâu! Quay lại trò chuyện với AI hoặc chơi thử ván Cờ Caro, Rắn săn mồi nhé.", "There are no spicy photos here! Head back to chat with AI or play a round of Caro or Snake."],
    ["Đã hiểu, quay lại", "Got it, go back"],
    ["Mở menu điều hướng", "Open navigation menu"],

    // Tab 01: Cá nhân, Chat AI & Google Calendar
    ["01 / GIỚI THIỆU CÁ NHÂN", "01 / PERSONAL INTRO"],
    ["Xin chào, tôi là Đinh Hữu Phúc.", "Hi, I'm Dinh Huu Phuc."],
    ["Đơn giản, thực tế và tối ưu hiệu suất.", "Simple, practical, and built for high performance."],
    ["Chào mừng bạn ghé thăm góc cá nhân của tôi tại dinhhuuphuc.com. Đây là nơi lưu giữ thông tin liên hệ trực tiếp, trợ lý AI hỗ trợ sắp xếp lịch trình hằng ngày và một vài trò chơi nhỏ để thư giãn sau giờ làm việc.", "Welcome to my personal corner at dinhhuuphuc.com. Here you can find direct contact info, an AI assistant for daily scheduling, and a few mini games to unwind after work."],
    ["Khu vực", "Location"],
    ["Email liên hệ", "Contact Email"],
    ["Công việc hiện tại", "Current Role"],
    ["Xem tại Tab Công việc →", "View in Work Tab →"],
    ["Sẵn sàng kết nối", "Open to Connect"],
    ["Thương mại & Phân phối", "Commerce & Distribution"],
    ["Tối ưu vận hành", "Operations Optimization"],
    ["Trợ lý AI & Lịch trình", "AI Assistant & Schedule"],
    ["Bấm vào để xem ảnh nóng", "Click for spicy photos"],
    ["02 / TRỢ LÝ AI GEMINI & ĐẶT LỊCH NHANH", "02 / GEMINI AI ASSISTANT & QUICK SCHEDULER"],
    ["Trò chuyện & Sắp xếp lịch làm việc", "Chat & Work Scheduling"],
    ["Gõ tự nhiên lịch trình của bạn (ví dụ: \"Hôm nay 19:00 họp kế hoạch, 21:00 kiểm tra công việc\") — AI sẽ tự bóc tách giờ để bạn lưu thẳng vào Google Calendar.", "Type your schedule naturally (e.g., \"Today 19:00 planning meeting, 21:00 work review\") — AI will extract the time so you can save directly to Google Calendar."],
    ["+ Cuộc trò chuyện mới", "+ New Chat"],
    ["Tất cả", "All"],
    ["Lọc ghim", "Pinned"],
    ["Lịch sử", "History"],
    ["Đặt lịch", "Schedule"],
    ["Đồng bộ Google", "Google Sync"],
    ["+ Đồng bộ lại", "+ Re-sync"],
    ["Trợ lý AI", "AI Assistant"],
    ["Bạn", "You"],
    ["Gửi →", "Send →"],
    ["03 / LỊCH LÀM VIỆC GOOGLE CALENDAR", "03 / GOOGLE CALENDAR SCHEDULE"],
    ["Lịch trình cá nhân hóa theo tài khoản đăng nhập", "Personalized schedule by signed-in account"],
    ["Mỗi tài khoản Google đăng nhập sẽ hiển thị đúng dữ liệu lịch làm việc riêng của tài khoản đó.", "Each signed-in Google account displays its own schedule data."],
    ["Làm mới lịch", "Refresh"],
    ["Đăng xuất", "Sign out"],
    ["← Hôm qua", "← Yesterday"],
    ["Ngày mai →", "Tomorrow →"],
    ["Ẩn ngày lễ & sinh nhật", "Hide holidays & birthdays"],
    ["+ Thêm lịch", "+ Add Event"],
    ["+ Thêm lịch thủ công", "+ Add Manual Event"],
    ["+ Nhắn AI để lên lịch", "+ Ask AI to Schedule"],
    ["Tôi là trợ lý AI. Bạn có thể hỏi thông tin hoặc nhắn trực tiếp để thêm, sửa, xóa và hoàn thành lịch làm việc trên Google Calendar.", "I am your AI assistant. Ask questions or message directly to add, edit, delete, and complete Google Calendar events."],

    // Tab 02: Công việc (Gạo Ông Du)
    ["02 / CÔNG VIỆC HIỆN TẠI", "02 / CURRENT WORK"],
    ["Thương hiệu Gạo Ông Du", "Gạo Ông Du Brand"],
    ["Đơn vị chủ quản: Công ty CP Nông nghiệp Gạo Hữu cơ TD Sóc Trăng", "Operated by TD Soc Trang Organic Rice Agriculture JSC"],
    ["Phụ trách phát triển mảng thương mại, mở rộng hệ thống phân phối, đại lý và điều phối chuỗi cung ứng cho các dòng sản phẩm gạo đặc sản Sóc Trăng mang thương hiệu Gạo Ông Du.", "Responsible for commercial growth, expanding distribution channels and dealers, and coordinating supply chain operations for Soc Trang specialty rice under the Gạo Ông Du brand."],
    ["Truy cập gaoongdu.vn →", "Visit gaoongdu.vn →"],
    ["Liên hệ hợp tác qua Zalo →", "Partner via Zalo →"],
    ["Kênh Phân Phối & Đại Lý", "Distribution & Dealers"],
    ["Xây dựng mạng lưới điểm bán, nhà phân phối và đối tác bán lẻ trên toàn quốc.", "Building a nationwide network of retail points, distributors, and retail partners."],
    ["Kho Vận & Logistics", "Warehouse & Logistics"],
    ["Điều phối hàng hóa liên vùng từ vùng nguyên liệu Sóc Trăng đến TP.HCM và Hà Nội.", "Coordinating inter-regional shipments from Soc Trang raw material zones to HCMC and Hanoi."],
    ["Chuẩn Hóa Quy Trình", "Process Standardization"],
    ["Ứng dụng công cụ số trong quản lý đơn hàng, tồn kho và chăm sóc khách hàng.", "Applying digital tools in order management, inventory control, and customer care."],
    ["VIDEO GIỚI THIỆU", "INTRO VIDEO"],
    ["Câu chuyện & Vùng nguyên liệu Gạo Ông Du", "Gạo Ông Du Story & Sourcing"],
    ["Mở trên YouTube →", "Open on YouTube →"],
    ["Xem trên YouTube", "Watch on YouTube"],
    ["BẢNG GIÁ SẢN PHẨM", "PRODUCT PRICE LIST"],
    ["Danh mục & Đơn giá bán người tiêu dùng (NTD)", "Product Catalog & Retail Price List (VND)"],
    ["STT", "#"],
    ["Tên Sản Phẩm", "Product Name"],
    ["Trọng lượng đóng gói (KG)", "Pack Weight (KG)"],
    ["Đơn giá (giá bán NTD)", "Unit Price (Retail VND)"],
    ["Đặt hàng", "Order"],

    // Tab 03: Mini Game (Caro, Chess, Snake, Sudoku)
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
    ["Điền số 1–9 không trùng hàng, cột, ô 3x3", "Fill 1–9 without duplicates in row, column, or 3x3 box"],
    ["Gợi ý 1 ô", "Hint 1 Cell"],
    ["Kiểm tra", "Check"],
    ["Xóa", "Clear"],
    ["Lượt của bạn (X)", "Your Turn (X)"],
    ["Lượt của bạn (Trắng)", "Your Turn (White)"],
    ["Lượt của X", "X's Turn"],
    ["Lượt của O", "O's Turn"],
    ["Lượt bên Trắng", "White's Turn"],
    ["Lượt bên Đen", "Black's Turn"],
    ["⚠️ Đang bị chiếu! ", "⚠️ In Check! "],
    ["🤝 Hòa cờ (Hết nước đi hợp lệ).", "🤝 Stalemate (No legal moves left)."],
    ["Phong cấp Tốt thành quân gì? Nhập q (Hậu), r (Xe), b (Tượng) hoặc n (Mã):", "Promote Pawn to? Enter q (Queen), r (Rook), b (Bishop), or n (Knight):"],

    // Tab 04: Second Brain
    ["PERSONAL KNOWLEDGE BASE", "PERSONAL KNOWLEDGE BASE"],
    ["Quăng link YouTube/Facebook, bài viết hay ghi chú để AI tự tóm tắt & lưu riêng theo tài khoản Google của bạn.", "Drop YouTube/Facebook links, articles, or notes so AI can summarize and save them privately under your Google account."],
    ["Đang kiểm tra tài khoản...", "Checking account..."],
    ["1. Nạp kiến thức mới (Training)", "1. Add New Knowledge (Training)"],
    ["Chat / Quăng link", "Chat / Drop Link"],
    ["Form chi tiết", "Detailed Form"],
    ["AI tự bóc tiêu đề, tóm tắt ý chính & gắn từ khóa.", "AI auto-extracts titles, summarizes key points, and tags keywords."],
    ["Gửi AI nạp ngay", "Send to AI Now"],
    ["2. Hỏi đáp từ Bộ Não Thứ 2", "2. Ask Your Second Brain"],
    ["Hỏi lại bất cứ kiến thức, video hay bài viết nào đã nạp bên trái.", "Ask about any knowledge, video, or article added on the left."],
    ["Làm mới chat", "Reset Chat"],
    ["Chào bạn! Bạn có thể quăng link hoặc nội dung ở khung bên trái để tôi học, sau đó hỏi tôi bất kỳ điều gì từ kho tri thức của bạn tại đây.", "Hi! Drop a link or content in the left panel for me to learn, then ask me anything from your knowledge base here."],
    ["Hỏi AI →", "Ask AI →"]
  ];

  const DIFF_EN = {
    "Dễ": "Easy",
    "Trung bình": "Medium",
    "Khó": "Hard",
    "Siêu khó": "Extreme",
    "Easy": "Easy",
    "Medium": "Medium",
    "Hard": "Hard",
    "Extreme": "Extreme"
  };

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

  function mapDifficultyToEn(rawDiff) {
    const clean = String(rawDiff || "").trim();
    if (!clean || clean.toLowerCase() === "null" || clean.toLowerCase() === "undefined") {
      return "Medium";
    }
    return DIFF_EN[clean] || viToEn.get(clean) || clean;
  }

  function translateDynamicText(text) {
    let m;
    if ((m = text.match(/^Kho đã lưu\s*\((\d+)\)$/i))) {
      return `Saved Library (${m[1]})`;
    }
    if ((m = text.match(/^Lượt của bạn \(X\)\s*[•·-]\s*Máy:\s*(.+)$/i))) {
      return `Your Turn (X) • AI: ${mapDifficultyToEn(m[1])}`;
    }
    if ((m = text.match(/^Your Turn \(X\)\s*[•·-]\s*AI:\s*(.+)$/i))) {
      return `Your Turn (X) • AI: ${mapDifficultyToEn(m[1])}`;
    }
    if ((m = text.match(/^Máy\s*\((.+)\)\s*đang tính nước\s*\(O\)\.\.\.$/i))) {
      return `AI (${mapDifficultyToEn(m[1])}) is thinking (O)...`;
    }
    if ((m = text.match(/^🎉\s*Bạn\s*\(X\)\s*đã thắng Máy\s*\((.+)\)!\s*$/i))) {
      return `🎉 You (X) beat AI (${mapDifficultyToEn(m[1])})!`;
    }
    if ((m = text.match(/^🤖\s*Máy\s*\((.+)\)\s*đã thắng\s*\(O\)!\s*$/i))) {
      return `🤖 AI (${mapDifficultyToEn(m[1])}) won (O)!`;
    }
    if ((m = text.match(/^🎉\s*Người chơi\s*(.+)\s*chiến thắng!\s*$/i))) {
      return `🎉 Player ${m[1].trim()} wins!`;
    }
    if ((m = text.match(/^(⚠️\s*Đang bị chiếu!\s*)?Lượt của bạn\s*\(Trắng\)\s*[•·-]\s*Máy:\s*(.+)$/i))) {
      return `${m[1] ? "⚠️ In Check! " : ""}Your Turn (White) • AI: ${mapDifficultyToEn(m[2])}`;
    }
    if ((m = text.match(/^(⚠️\s*Đang bị chiếu!\s*)?Máy\s*\((.+)\)\s*đang tính nước\s*\(Đen\)\.\.\.$/i))) {
      return `${m[1] ? "⚠️ In Check! " : ""}AI (${mapDifficultyToEn(m[2])}) is thinking (Black)...`;
    }
    if ((m = text.match(/^🎉\s*Chiếu hết!\s*Bạn\s*\(Trắng\)\s*thắng Máy\s*\((.+)\)!\s*$/i))) {
      return `🎉 Checkmate! You (White) beat AI (${mapDifficultyToEn(m[1])})!`;
    }
    if ((m = text.match(/^♚\s*Chiếu hết!\s*Máy\s*\((.+)\)\s*thắng\s*\(Đen\)!\s*$/i))) {
      return `♚ Checkmate! AI (${mapDifficultyToEn(m[1])}) wins (Black)!`;
    }
    if ((m = text.match(/^🎉\s*Chiếu hết!\s*Bên\s*(.+)\s*chiến thắng!\s*$/i))) {
      const sideRaw = m[1].trim();
      const side = sideRaw === "Trắng" ? "White" : sideRaw === "Đen" ? "Black" : sideRaw;
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
      const dyn = translateDynamicText(trimmed);
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
        const active = btn.dataset.langValue === lang;
        btn.classList.toggle("active", active);
        btn.classList.toggle("is-active", active);
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
