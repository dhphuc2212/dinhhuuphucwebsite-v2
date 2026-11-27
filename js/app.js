(function () {
  const sectionMount = document.getElementById("sectionMount");
  const scrollProgress = document.getElementById("scrollProgress");
  const trollModal = document.getElementById("trollModal");

  window.addEventListener("scroll", () => {
    if (!scrollProgress) return;
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    scrollProgress.style.width = `${scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0}%`;
  });

  function openTrollModal() {
    trollModal?.classList.remove("hidden");
  }

  function closeTrollModal() {
    trollModal?.classList.add("hidden");
  }

  function startTypewriter() {
    const el = document.getElementById("typewriterText");
    if (!el) return;
    const roles = [
      "Thương mại & Phân phối",
      "Tối ưu Vận hành & Logistics",
      "Kết nối & Công nghệ"
    ];
    let roleIdx = 0;
    let charIdx = roles[0].length;
    let deleting = true;

    clearInterval(window._typewriterTimer);
    window._typewriterTimer = setInterval(() => {
      const target = document.getElementById("typewriterText");
      if (!target) return clearInterval(window._typewriterTimer);

      const current = roles[roleIdx];
      if (deleting) {
        charIdx--;
        target.textContent = current.slice(0, charIdx);
        if (charIdx <= 0) {
          deleting = false;
          roleIdx = (roleIdx + 1) % roles.length;
        }
      } else {
        charIdx++;
        target.textContent = current.slice(0, charIdx);
        if (charIdx >= current.length) deleting = true;
      }
    }, 110);
  }

  async function loadTab(tabName) {
    const validTabs = ["about", "work", "minigame", "brain"];
    const tab = validTabs.includes(tabName) ? tabName : "about";

    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === tab);
    });

    try {
      const res = await fetch(`/sections/${tab}.html`);
      sectionMount.innerHTML = await res.text();

      sectionMount.querySelectorAll("[data-tab]").forEach((el) => {
        el.addEventListener("click", (e) => {
          e.preventDefault();
          loadTab(el.dataset.tab);
        });
      });

      if (tab === "about") {
        startTypewriter();
        document.getElementById("downloadVcardBtn")?.addEventListener("click", window.DhpUtils.downloadVCard);
        document.getElementById("trollBtn")?.addEventListener("click", openTrollModal);
        document.getElementById("copyEmailBtn")?.addEventListener("click", () => {
          navigator.clipboard?.writeText("dhphuc2212@dinhhuuphuc.com");
          window.DhpUtils.showToast("Đã sao chép email: dhphuc2212@dinhhuuphuc.com");
        });
        window.initChatAssistant?.();
        window.GoogleCalendarManager?.bindSectionEvents();
      } else if (tab === "work") {
        window.initWorkSection?.();
      } else if (tab === "minigame") {
        initMiniGameSwitcher();
      } else if (tab === "brain") {
        window.SecondBrainManager?.initTab();
      }

      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      sectionMount.innerHTML = `<div class="skeleton-loader">Không tải được mục ${tab}. Vui lòng tải lại trang.</div>`;
    }
  }

  function initMiniGameSwitcher() {
    const gameBtns = document.querySelectorAll(".game-tab-btn");
    const panels = {
      caro: document.getElementById("gamePanelCaro"),
      snake: document.getElementById("gamePanelSnake"),
      sudoku: document.getElementById("gamePanelSudoku")
    };

    gameBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = btn.dataset.game;
        gameBtns.forEach((b) => b.classList.toggle("active", b === btn));
        Object.entries(panels).forEach(([key, panel]) => {
          panel?.classList.toggle("hidden", key !== target);
        });
      });
    });

    window.initCaroGame?.();
    window.initSnakeGame?.();
    window.initSudokuGame?.();
  }

  document.addEventListener("click", (e) => {
    if (e.target.closest(".dhp-open-brain-btn, #dhpOpenBrainBtn")) {
      e.preventDefault();
      loadTab("brain");
    }
  });

  document.querySelectorAll("[data-tab]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      loadTab(el.dataset.tab);
    });
  });

  document.getElementById("footerVcardBtn")?.addEventListener("click", window.DhpUtils.downloadVCard);
  document.getElementById("footerTrollBtn")?.addEventListener("click", openTrollModal);
  document.getElementById("closeTrollBtn")?.addEventListener("click", closeTrollModal);
  trollModal?.addEventListener("click", (e) => {
    if (e.target === trollModal) closeTrollModal();
  });

  /* =========================================================
     MOBILE HAMBURGER MENU (3 GẠCH GỌN GÀNG CHO ĐIỆN THOẠI)
     ========================================================= */
  (function initMobileHamburgerMenu() {
    const headerInner = document.querySelector(".site-header .header-inner");
    const mainNav = document.querySelector(".site-header .main-nav");
    const headerActions = document.querySelector(".site-header .header-actions");
    if (!headerInner || !mainNav || !headerActions) return;

    let toggleBtn = document.getElementById("mobileMenuToggleBtn");
    if (!toggleBtn) {
      toggleBtn = document.createElement("button");
      toggleBtn.type = "button";
      toggleBtn.id = "mobileMenuToggleBtn";
      toggleBtn.className = "mobile-menu-toggle-btn";
      toggleBtn.setAttribute("aria-label", "Mở menu điều hướng");
      toggleBtn.setAttribute("aria-expanded", "false");
      toggleBtn.innerHTML = `<span></span><span></span><span></span>`;
      headerActions.appendChild(toggleBtn);
    }

    let backdrop = document.getElementById("mobileNavBackdrop");
    if (!backdrop) {
      backdrop = document.createElement("div");
      backdrop.id = "mobileNavBackdrop";
      backdrop.className = "mobile-nav-backdrop";
      document.body.appendChild(backdrop);
    }

    function setMenuOpen(open) {
      mainNav.classList.toggle("is-mobile-open", open);
      backdrop.classList.toggle("show", open);
      toggleBtn.classList.toggle("is-active", open);
      toggleBtn.setAttribute("aria-expanded", open ? "true" : "false");
      document.body.classList.toggle("mobile-menu-locked", open);
    }

    toggleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const nextState = !mainNav.classList.contains("is-mobile-open");
      setMenuOpen(nextState);
    });

    backdrop.addEventListener("click", () => setMenuOpen(false));

    mainNav.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.addEventListener("click", () => setMenuOpen(false));
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 768) setMenuOpen(false);
    });
  })();

  loadTab("about");
})();
