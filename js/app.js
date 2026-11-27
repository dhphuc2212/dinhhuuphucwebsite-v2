(function () {
  const THEME_STORAGE_KEY = "dhp_theme_mode";
  const VALID_THEMES = ["night", "day"];
  const THEME_ICONS = { night: "🌙", day: "☀️" };

  const FLAG_VI_SRC =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 30 20'%3E%3Crect width='30' height='20' fill='%23da251d'/%3E%3Cpolygon points='15,4 16.8,9.6 22.7,9.6 17.9,13 19.7,18.6 15,15.2 10.3,18.6 12.1,13 7.3,9.6 13.2,9.6' fill='%23ff0'/%3E%3C/svg%3E";
  const FLAG_EN_SRC =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 30'%3E%3Crect width='60' height='30' fill='%23012169'/%3E%3Cpath d='M0,0 L60,30 M60,0 L0,30' stroke='%23fff' stroke-width='6'/%3E%3Cpath d='M0,0 L60,30 M60,0 L0,30' stroke='%23c8102e' stroke-width='3'/%3E%3Cpath d='M30,0 V30 M0,15 H60' stroke='%23fff' stroke-width='10'/%3E%3Cpath d='M30,0 V30 M0,15 H60' stroke='%23c8102e' stroke-width='6'/%3E%3C/svg%3E";

  const LANG_META = {
    vi: { flagSrc: FLAG_VI_SRC, code: "VI" },
    en: { flagSrc: FLAG_EN_SRC, code: "EN" }
  };

  function getSavedTheme() {
    try {
      const val = localStorage.getItem(THEME_STORAGE_KEY) || "night";
      return VALID_THEMES.includes(val) ? val : "night";
    } catch {
      return "night";
    }
  }

  function closeThemeMenu() {
    document.getElementById("dhpThemeMenu")?.classList.add("hidden");
    document.getElementById("dhpThemeTrigger")?.setAttribute("aria-expanded", "false");
  }

  function closeLangMenu() {
    document.getElementById("dhpLangMenu")?.classList.add("hidden");
    document.getElementById("dhpLangTrigger")?.setAttribute("aria-expanded", "false");
  }

  function syncThemeControls(theme) {
    const iconEl = document.getElementById("dhpThemeCurrentIcon");
    if (iconEl) iconEl.textContent = THEME_ICONS[theme] || "🌙";

    document.querySelectorAll("[data-theme-value]").forEach((opt) => {
      const active = opt.dataset.themeValue === theme;
      opt.classList.toggle("is-active", active);
      opt.setAttribute("aria-selected", active ? "true" : "false");
    });
  }

  function syncLangControls(lang) {
    const active = lang === "en" ? "en" : "vi";
    const meta = LANG_META[active] || LANG_META.vi;

    const flagEl = document.getElementById("dhpLangCurrentFlag");
    const codeEl = document.getElementById("dhpLangCurrentCode");
    if (flagEl) {
      flagEl.src = meta.flagSrc;
      flagEl.alt = meta.code;
    }
    if (codeEl) codeEl.textContent = meta.code;

    document.querySelectorAll("[data-lang-value]").forEach((opt) => {
      const isSelected = opt.dataset.langValue === active;
      opt.classList.toggle("is-active", isSelected);
      opt.classList.toggle("active", isSelected);
      opt.setAttribute("aria-selected", isSelected ? "true" : "false");
    });
  }

  function ensureMobileLangRow(nav) {
    if (!nav || nav.querySelector("#mobileDrawerLangRow")) return;
    const row = document.createElement("div");
    row.id = "mobileDrawerLangRow";
    row.className = "mobile-drawer-lang-row";
    row.innerHTML = `
      <span class="mobile-drawer-lang-label">Ngôn ngữ</span>
      <div class="mobile-drawer-lang-btns">
        <button type="button" class="mobile-lang-choice" data-lang-value="vi" aria-label="Tiếng Việt">
          <img class="dhp-lang-flag-img" src="${FLAG_VI_SRC}" alt="VI" />
          <span>VI</span>
        </button>
        <button type="button" class="mobile-lang-choice" data-lang-value="en" aria-label="English">
          <img class="dhp-lang-flag-img" src="${FLAG_EN_SRC}" alt="EN" />
          <span>EN</span>
        </button>
      </div>`;
    nav.appendChild(row);
    syncLangControls(window.DhpI18n?.getLang?.() || "vi");
  }

  function ensureMobileThemeRow(nav) {
    if (!nav || nav.querySelector("#mobileDrawerThemeRow")) return;
    const row = document.createElement("div");
    row.id = "mobileDrawerThemeRow";
    row.className = "mobile-drawer-theme-row";
    row.innerHTML = `
      <span class="mobile-drawer-theme-label">Giao diện</span>
      <div class="mobile-drawer-theme-icons">
        <button type="button" class="dhp-theme-option" data-theme-value="day" aria-label="Day">☀️</button>
        <button type="button" class="dhp-theme-option" data-theme-value="night" aria-label="Night">🌙</button>
      </div>`;
    nav.appendChild(row);
    syncThemeControls(getSavedTheme());
  }

  function applyTheme(mode, showNotice = true) {
    const theme = VALID_THEMES.includes(mode) ? mode : "night";
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {}
    syncThemeControls(theme);
    closeThemeMenu();
    if (showNotice && typeof window.showToast === "function") {
      window.showToast(`Giao diện: ${THEME_ICONS[theme]}`);
    }
  }

  const mountEl = document.getElementById("sectionMount");
  const validTabs = ["about", "work", "minigame", "brain"];
  const tabCache = {};
  let currentTab = "about";
  const initializedSubGames = new Set();

  const scrollProgressEl = document.getElementById("scrollProgress");
  window.addEventListener(
    "scroll",
    () => {
      if (!scrollProgressEl) return;
      const h = document.documentElement.scrollHeight - window.innerHeight;
      scrollProgressEl.style.width = `${h > 0 ? Math.min(100, (window.scrollY / h) * 100) : 0}%`;
    },
    { passive: true }
  );

  function showToast(msg) {
    const el = document.getElementById("toastNotice");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => el.classList.remove("show"), 2600);
  }
  window.showToast = showToast;

  function isMobileViewport() {
    return window.innerWidth <= 768;
  }

  function setMobileMenuState(open) {
    const nav = document.querySelector(".site-header .main-nav");
    const backdrop = document.getElementById("mobileNavBackdrop");
    const toggleBtn = document.getElementById("mobileMenuToggleBtn");
    if (!nav) return;

    if (open && isMobileViewport()) {
      ensureMobileThemeRow(nav);
      ensureMobileLangRow(nav);
      if (window.GoogleCalendarManager?.syncUI) window.GoogleCalendarManager.syncUI();
      syncThemeControls(getSavedTheme());
      syncLangControls(window.DhpI18n?.getLang?.() || "vi");
      window.DhpI18n?.applyToDom?.(nav);
      nav.classList.add("is-mobile-open");
      backdrop?.classList.add("show");
      toggleBtn?.classList.add("is-active");
      toggleBtn?.setAttribute("aria-expanded", "true");
      document.body.classList.add("mobile-menu-locked");
    } else {
      nav.classList.remove("is-mobile-open");
      backdrop?.classList.remove("show");
      toggleBtn?.classList.remove("is-active");
      toggleBtn?.setAttribute("aria-expanded", "false");
      document.body.classList.remove("mobile-menu-locked");
    }
  }

  function initMobileMenu() {
    const headerInner = document.querySelector(".site-header .header-inner");
    const nav = document.querySelector(".site-header .main-nav");
    if (!headerInner || !nav) return;

    let toggleBtn = document.getElementById("mobileMenuToggleBtn");
    if (!toggleBtn) {
      toggleBtn = document.createElement("button");
      toggleBtn.type = "button";
      toggleBtn.id = "mobileMenuToggleBtn";
      toggleBtn.className = "mobile-menu-toggle-btn";
      toggleBtn.setAttribute("aria-label", "Mở menu điều hướng");
      toggleBtn.setAttribute("aria-expanded", "false");
      toggleBtn.innerHTML = "<span></span><span></span><span></span>";
      headerInner.appendChild(toggleBtn);
    }

    let backdrop = document.getElementById("mobileNavBackdrop");
    if (!backdrop) {
      backdrop = document.createElement("div");
      backdrop.id = "mobileNavBackdrop";
      backdrop.className = "mobile-nav-backdrop";
      document.body.appendChild(backdrop);
    }

    ensureMobileThemeRow(nav);
    ensureMobileLangRow(nav);

    toggleBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const willOpen = !nav.classList.contains("is-mobile-open");
      setMobileMenuState(willOpen);
    });

    backdrop.addEventListener("click", () => setMobileMenuState(false));

    window.addEventListener("resize", () => {
      if (!isMobileViewport()) {
        setMobileMenuState(false);
      }
      if (window.GoogleCalendarManager?.syncUI) {
        window.GoogleCalendarManager.syncUI();
      }
      syncThemeControls(getSavedTheme());
      syncLangControls(window.DhpI18n?.getLang?.() || "vi");
    });
  }

  function startTypewriter() {
    const el = document.getElementById("typewriterText");
    if (!el) return;
    const phrases = ["Thương mại & Phân phối", "Tối ưu vận hành", "Trợ lý AI & Lịch trình"];
    let pIdx = 0;
    let cIdx = 0;
    let deleting = false;
    clearTimeout(startTypewriter._timer);

    function tick() {
      const current = phrases[pIdx];
      if (!deleting) {
        cIdx++;
        el.textContent = current.slice(0, cIdx);
        if (cIdx === current.length) {
          deleting = true;
          startTypewriter._timer = setTimeout(tick, 1700);
          return;
        }
        startTypewriter._timer = setTimeout(tick, 75);
      } else {
        cIdx--;
        el.textContent = current.slice(0, cIdx);
        if (cIdx === 0) {
          deleting = false;
          pIdx = (pIdx + 1) % phrases.length;
          startTypewriter._timer = setTimeout(tick, 350);
          return;
        }
        startTypewriter._timer = setTimeout(tick, 40);
      }
    }
    tick();
  }

  function initSubGame(gameKey, force = false) {
    if (!gameKey) return;
    if (!force && initializedSubGames.has(gameKey)) return;

    if (gameKey === "caro") {
      if (typeof window.initCaroGame === "function") {
        window.initCaroGame();
        initializedSubGames.add("caro");
      } else if (window.CaroGameManager?.init) {
        window.CaroGameManager.init();
        initializedSubGames.add("caro");
      }
    } else if (gameKey === "chess") {
      if (typeof window.initChessGame === "function") {
        window.initChessGame();
        initializedSubGames.add("chess");
      }
    } else if (gameKey === "snake") {
      if (typeof window.initSnakeGame === "function") {
        window.initSnakeGame();
        initializedSubGames.add("snake");
      }
    } else if (gameKey === "sudoku") {
      if (typeof window.initSudokuGame === "function") {
        window.initSudokuGame();
        initializedSubGames.add("sudoku");
      }
    }
  }

  function switchMiniGameTab(gameKey, forceInit = false) {
    const panels = document.querySelectorAll(".game-panel");
    if (!panels.length) return;

    document.querySelectorAll(".game-tab-btn").forEach((btn) => {
      const active = btn.dataset.game === gameKey;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
    });

    const targetId = `gamePanel${gameKey.charAt(0).toUpperCase()}${gameKey.slice(1)}`;
    panels.forEach((panel) => {
      const isTarget = panel.id === targetId;
      panel.classList.toggle("hidden", !isTarget);
      panel.classList.toggle("active", isTarget);
    });

    initSubGame(gameKey, forceInit);
  }

  function setActiveNav(tabName) {
    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === tabName);
    });
  }

  async function loadTab(tabName, pushHash = true) {
    const targetTab = validTabs.includes(tabName) ? tabName : "about";
    currentTab = targetTab;
    setActiveNav(targetTab);
    setMobileMenuState(false);

    if (pushHash && location.hash !== `#${targetTab}`) {
      history.replaceState(null, "", `#${targetTab}`);
    }

    if (!mountEl) return;

    if (!tabCache[targetTab]) {
      mountEl.innerHTML = `<div class="skeleton-loader">Đang tải nội dung ${targetTab}...</div>`;
      try {
        const res = await fetch(`/sections/${targetTab}.html`, { cache: "no-store" });
        if (!res.ok) throw new Error("HTTP " + res.status);
        tabCache[targetTab] = await res.text();
      } catch {
        mountEl.innerHTML = `<div class="card"><p>Không tải được nội dung tab <strong>${targetTab}</strong>.</p></div>`;
        return;
      }
    }

    mountEl.innerHTML = tabCache[targetTab];
    window.scrollTo({ top: 0, behavior: "instant" });

    if (targetTab === "about") {
      startTypewriter();
      window.AiChatManager?.bindSectionEvents?.();
      window.GoogleCalendarManager?.bindSectionEvents?.();
    } else if (targetTab === "work") {
      window.initWorkSection?.();
    } else if (targetTab === "minigame") {
      initializedSubGames.clear();
      const activeBtn = document.querySelector(".game-tab-btn.active");
      const defaultGame = activeBtn?.dataset.game || "caro";
      switchMiniGameTab(defaultGame, true);
    } else if (targetTab === "brain") {
      window.SecondBrainManager?.bindSectionEvents?.();
    }

    window.DhpI18n?.applyToDom?.(mountEl);
  }

  document.addEventListener("click", (e) => {
    const langTrigger = e.target.closest("#dhpLangTrigger");
    if (langTrigger) {
      e.preventDefault();
      e.stopPropagation();
      closeThemeMenu();
      const menu = document.getElementById("dhpLangMenu");
      if (menu) {
        const willOpen = menu.classList.contains("hidden");
        menu.classList.toggle("hidden", !willOpen);
        langTrigger.setAttribute("aria-expanded", willOpen ? "true" : "false");
      }
      return;
    }

    const langOpt = e.target.closest("[data-lang-value]");
    if (langOpt) {
      e.preventDefault();
      const chosenLang = langOpt.dataset.langValue === "en" ? "en" : "vi";
      window.DhpI18n?.setLanguage?.(chosenLang, true);
      window.DhpI18n?.applyToDom?.(document.body);
      syncLangControls(chosenLang);
      closeLangMenu();
      setMobileMenuState(false);
      return;
    }

    if (!e.target.closest("#dhpLangMenuWrap")) {
      closeLangMenu();
    }

    const gameTabBtn = e.target.closest(".game-tab-btn[data-game]");
    if (gameTabBtn) {
      e.preventDefault();
      switchMiniGameTab(gameTabBtn.dataset.game, false);
      return;
    }

    const themeTrigger = e.target.closest("#dhpThemeTrigger");
    if (themeTrigger) {
      e.preventDefault();
      e.stopPropagation();
      closeLangMenu();
      const menu = document.getElementById("dhpThemeMenu");
      if (menu) {
        const willOpen = menu.classList.contains("hidden");
        menu.classList.toggle("hidden", !willOpen);
        themeTrigger.setAttribute("aria-expanded", willOpen ? "true" : "false");
      }
      return;
    }

    const themeOpt = e.target.closest("[data-theme-value]");
    if (themeOpt) {
      e.preventDefault();
      applyTheme(themeOpt.dataset.themeValue, true);
      return;
    }

    if (!e.target.closest("#dhpThemeMenuWrap")) {
      closeThemeMenu();
    }

    const tabTrigger = e.target.closest("[data-tab]");
    if (tabTrigger) {
      e.preventDefault();
      loadTab(tabTrigger.dataset.tab, true);
      return;
    }

    if (e.target.closest("#copyEmailBtn")) {
      navigator.clipboard?.writeText("dhphuc2212@dinhhuuphuc.com").catch(() => {});
      showToast("Đã sao chép email: dhphuc2212@dinhhuuphuc.com");
      return;
    }

    const trollModal = document.getElementById("trollModal");
    if (e.target.closest("#trollBtn, #footerTrollBtn")) {
      e.preventDefault();
      setMobileMenuState(false);
      trollModal?.classList.remove("hidden");
      return;
    }
    if (e.target.closest("#closeTrollBtn") || e.target === trollModal) {
      trollModal?.classList.add("hidden");
    }
  });

  window.addEventListener("hashchange", () => {
    const hashTab = location.hash.replace("#", "").trim();
    if (validTabs.includes(hashTab) && hashTab !== currentTab) {
      loadTab(hashTab, false);
    }
  });

  applyTheme(getSavedTheme(), false);
  syncLangControls(window.DhpI18n?.getLang?.() || "vi");
  initMobileMenu();
  const initialHash = location.hash.replace("#", "").trim();
  loadTab(validTabs.includes(initialHash) ? initialHash : "about", false);
})();
