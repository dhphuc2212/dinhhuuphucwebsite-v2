(function () {
  const THEME_STORAGE_KEY = "dhp_theme_mode";
  const VALID_THEMES = ["night", "day"];

  function getSavedTheme() {
    try {
      const val = localStorage.getItem(THEME_STORAGE_KEY) || "night";
      return VALID_THEMES.includes(val) ? val : "night";
    } catch {
      return "night";
    }
  }

  function syncThemeSelects(theme) {
    document.querySelectorAll("select.dhp-theme-select, select.mobile-drawer-mobile-select").forEach((sel) => {
      sel.value = theme;
    });
  }

  function ensureMobileThemeRow(nav) {
    if (!nav || nav.querySelector("#mobileDrawerThemeRow")) return;
    const row = document.createElement("div");
    row.id = "mobileDrawerThemeRow";
    row.className = "mobile-drawer-theme-row";
    row.innerHTML = `
      <label for="mobileThemeSelect" class="mobile-drawer-theme-label">Giao diện</label>
      <select id="mobileThemeSelect" class="mobile-drawer-mobile-select" aria-label="Chọn giao diện">
        <option value="night">night</option>
        <option value="day">day</option>
      </select>`;
    nav.appendChild(row);
    syncThemeSelects(getSavedTheme());
  }

  function applyTheme(mode, showNotice = true) {
    const theme = VALID_THEMES.includes(mode) ? mode : "night";
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {}
    syncThemeSelects(theme);
    if (showNotice && typeof window.showToast === "function") {
      window.showToast(`Giao diện: ${theme}`);
    }
  }

  const mountEl = document.getElementById("sectionMount");
  const validTabs = ["about", "work", "minigame", "brain"];
  const tabCache = {};
  let currentTab = "about";

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
      if (window.GoogleCalendarManager?.syncUI) window.GoogleCalendarManager.syncUI();
      syncThemeSelects(getSavedTheme());
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
      syncThemeSelects(getSavedTheme());
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
      window.WorkSectionManager?.bindSectionEvents?.();
    } else if (targetTab === "minigame") {
      window.CaroGameManager?.init?.();
    } else if (targetTab === "brain") {
      window.SecondBrainManager?.bindSectionEvents?.();
    }
  }

  document.addEventListener("change", (e) => {
    if (e.target.matches("select.dhp-theme-select, select.mobile-drawer-mobile-select")) {
      applyTheme(e.target.value, true);
    }
  });

  document.addEventListener("click", (e) => {
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
  initMobileMenu();
  const initialHash = location.hash.replace("#", "").trim();
  loadTab(validTabs.includes(initialHash) ? initialHash : "about", false);
})();
