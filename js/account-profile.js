window.DhpAccountProfile = (function () {
  const esc = (s) => window.DhpUtils.escapeHtml(s);

  let account = {
    authenticated: false,
    email: "",
    name: "",
    picture: "",
    createdAt: "",
    profile: { birthday: "", phone: "", gender: "", bio: "" }
  };

  function getInitials(name, email) {
    const src = (name || email || "U").trim();
    const parts = src.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return src.slice(0, 2).toUpperCase();
  }

  function renderAvatarHtml(size = 24) {
    if (account.picture) {
      return `<img src="${esc(account.picture)}" alt="${esc(account.name || "Avatar")}" class="dhp-user-avatar" style="width:${size}px;height:${size}px;" referrerpolicy="no-referrer" />`;
    }
    return `<span class="dhp-user-avatar-fallback" style="width:${size}px;height:${size}px;">${esc(
      getInitials(account.name, account.email)
    )}</span>`;
  }

  function syncUI() {
    const headerAuthArea = document.getElementById("headerAuthArea");
    const mainNav = document.querySelector(".site-header .main-nav");
    const displayName = account.name || (account.email ? account.email.split("@")[0] : "Tài khoản");

    // 1. Nâng cấp nút trên Header (#headerAuthArea) thành Avatar + Tên Google
    if (headerAuthArea && account.authenticated) {
      let pill = headerAuthArea.querySelector("#dhpHeaderUserPill");
      if (!pill) {
        pill = document.createElement("button");
        pill.type = "button";
        pill.id = "dhpHeaderUserPill";
        pill.className = "dhp-header-user-pill";
        pill.title = "Xem thông tin tài khoản Google";
        headerAuthArea.insertBefore(pill, headerAuthArea.firstChild);
      }
      pill.innerHTML = `${renderAvatarHtml(24)}<span class="dhp-header-user-name">${esc(displayName)}</span>`;

      // Ẩn pill text email cũ nếu calendar-render tạo ra để tránh trùng
      headerAuthArea.querySelectorAll(".status-pill").forEach((el) => {
        el.style.display = "none";
      });
    } else if (headerAuthArea && !account.authenticated) {
      headerAuthArea.querySelector("#dhpHeaderUserPill")?.remove();
    }

    // 2. Chèn thẻ Avatar + Tên + Email lên đầu ngăn kéo Menu 3 gạch trên Mobile
    if (mainNav) {
      mainNav.querySelector("#mobileDrawerAccountCard")?.remove();
      const card = document.createElement("div");
      card.id = "mobileDrawerAccountCard";
      card.className = "mobile-drawer-account-card";

      if (account.authenticated) {
        card.innerHTML = `
          <button type="button" class="mobile-acc-info-btn" data-open-account-modal="1">
            ${renderAvatarHtml(40)}
            <div class="mobile-acc-meta">
              <div class="mobile-acc-name">${esc(displayName)}</div>
              <div class="mobile-acc-email">${esc(account.email)}</div>
            </div>
            <span class="mobile-acc-arrow">Hồ sơ →</span>
          </button>
        `;
      } else {
        card.innerHTML = `
          <a href="/auth/google" class="btn btn-primary btn-sm" style="width:100%;justify-content:center;">
            Đăng nhập Google để đồng bộ
          </a>
        `;
      }
      mainNav.insertBefore(card, mainNav.firstChild);
    }
  }

  function openModal() {
    if (!account.authenticated) {
      window.location.href = "/auth/google";
      return;
    }

    document.getElementById("dhpAccountModal")?.remove();

    const displayName = account.name || account.email.split("@")[0];
    const joinedDate = account.createdAt
      ? new Date(account.createdAt).toLocaleDateString("vi-VN")
      : "Đang hoạt động";
    const p = account.profile || {};

    const modal = document.createElement("div");
    modal.id = "dhpAccountModal";
    modal.className = "modal-backdrop";
    modal.innerHTML = `
      <div class="modal-card dhp-account-modal-card" role="dialog" aria-modal="true" style="max-width:460px;text-align:left;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
          <span class="modal-badge">GOOGLE ACCOUNT</span>
          <button type="button" id="closeAccountModalTop" class="btn btn-outline btn-sm">✕</button>
        </div>

        <div style="display:flex;align-items:center;gap:14px;padding:14px;border-radius:14px;background:#18181b;border:1px solid #27272a;margin-bottom:16px;">
          ${renderAvatarHtml(58)}
          <div style="min-width:0;flex:1;">
            <div style="font-size:1.1rem;font-weight:800;color:#fafafa;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
              ${esc(displayName)}
            </div>
            <div style="font-size:0.84rem;color:#10b981;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
              ${esc(account.email)}
            </div>
            <div style="font-size:0.75rem;color:#a1a1aa;margin-top:3px;">
              Phiên đăng nhập: ${esc(joinedDate)} (Duy trì 60 ngày)
            </div>
          </div>
        </div>

        <form id="dhpAccountProfileForm" style="display:flex;flex-direction:column;gap:10px;">
          <div style="font-size:0.8rem;font-weight:700;color:#a1a1aa;">THÔNG TIN CÁ NHÂN BỔ SUNG</div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <div>
              <label style="display:block;font-size:0.76rem;color:#a1a1aa;margin-bottom:4px;">Ngày sinh</label>
              <input type="date" id="accBirthdayInput" value="${esc(p.birthday || "")}" style="width:100%;padding:8px 10px;border-radius:10px;" />
            </div>
            <div>
              <label style="display:block;font-size:0.76rem;color:#a1a1aa;margin-bottom:4px;">Giới tính</label>
              <select id="accGenderInput" style="width:100%;padding:8px 10px;border-radius:10px;">
                <option value="" ${!p.gender ? "selected" : ""}>Chưa chọn</option>
                <option value="Nam" ${p.gender === "Nam" ? "selected" : ""}>Nam</option>
                <option value="Nữ" ${p.gender === "Nữ" ? "selected" : ""}>Nữ</option>
                <option value="Khác" ${p.gender === "Khác" ? "selected" : ""}>Khác</option>
              </select>
            </div>
          </div>

          <div>
            <label style="display:block;font-size:0.76rem;color:#a1a1aa;margin-bottom:4px;">Số điện thoại</label>
            <input type="tel" id="accPhoneInput" placeholder="Ví dụ: 09xx xxx xxx" value="${esc(p.phone || "")}" style="width:100%;padding:8px 10px;border-radius:10px;" />
          </div>

          <div>
            <label style="display:block;font-size:0.76rem;color:#a1a1aa;margin-bottom:4px;">Ghi chú / Giới thiệu ngắn</label>
            <textarea id="accBioInput" rows="2" placeholder="Nhập ghi chú cá nhân..." style="width:100%;padding:8px 10px;border-radius:10px;">${esc(p.bio || "")}</textarea>
          </div>

          <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:8px;">
            <button type="button" id="closeAccountModalBottom" class="btn btn-outline btn-sm">Đóng</button>
            <button type="submit" id="saveAccountProfileBtn" class="btn btn-primary btn-sm">Lưu thông tin</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    const closeModal = () => modal.remove();
    modal.querySelector("#closeAccountModalTop")?.addEventListener("click", closeModal);
    modal.querySelector("#closeAccountModalBottom")?.addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });

    modal.querySelector("#dhpAccountProfileForm")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const saveBtn = modal.querySelector("#saveAccountProfileBtn");
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = "Đang lưu...";
      }
      try {
        const payload = {
          birthday: modal.querySelector("#accBirthdayInput")?.value || "",
          gender: modal.querySelector("#accGenderInput")?.value || "",
          phone: modal.querySelector("#accPhoneInput")?.value || "",
          bio: modal.querySelector("#accBioInput")?.value || ""
        };
        const res = await window.DhpApi.request("/api/auth/profile", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          account.profile = res.profile || payload;
          window.DhpUtils.showToast("✓ Đã lưu thông tin tài khoản!");
          closeModal();
        } else {
          window.DhpUtils.showToast(res.error || "Không thể lưu thông tin.");
        }
      } catch {
        window.DhpUtils.showToast("Lỗi kết nối máy chủ.");
      } finally {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.textContent = "Lưu thông tin";
        }
      }
    });
  }

  async function refresh() {
    try {
      const data = await window.DhpApi.request("/api/auth/session");
      if (data && data.authenticated) {
        account = {
          authenticated: true,
          email: data.email || "",
          name: data.name || "",
          picture: data.picture || "",
          createdAt: data.createdAt || "",
          profile: data.profile || { birthday: "", phone: "", gender: "", bio: "" }
        };
      } else {
        account = {
          authenticated: false,
          email: "",
          name: "",
          picture: "",
          createdAt: "",
          profile: { birthday: "", phone: "", gender: "", bio: "" }
        };
      }
    } catch {}
    syncUI();
  }

  document.addEventListener("click", (e) => {
    if (e.target.closest("#dhpHeaderUserPill, [data-open-account-modal]")) {
      e.preventDefault();
      document.querySelector(".site-header .main-nav")?.classList.remove("is-mobile-open");
      document.getElementById("mobileNavBackdrop")?.classList.remove("show");
      document.getElementById("mobileMenuToggleBtn")?.classList.remove("is-active");
      document.body.classList.remove("mobile-menu-locked");
      openModal();
    }
  });

  function boot() {
    refresh();
    // Theo dõi khi calendar-render cập nhật lại #headerAuthArea để gắn lại Avatar + Tên
    const area = document.getElementById("headerAuthArea");
    if (area) {
      const obs = new MutationObserver(() => {
        if (account.authenticated && !document.getElementById("dhpHeaderUserPill")) {
          syncUI();
        }
      });
      obs.observe(area, { childList: true });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  return { refresh, openModal, getAccount: () => account };
})();
