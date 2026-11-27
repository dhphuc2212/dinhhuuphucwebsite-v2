window.initWorkSection = function () {
  const tbody = document.getElementById("pricingTableBody");
  const searchInput = document.getElementById("productSearchInput");
  if (!tbody) return;

  const esc = window.DhpUtils?.escapeHtml || ((s) => s);

  function renderRows(keyword = "") {
    const q = keyword.trim().toLowerCase();
    const filtered = (window.GaoOngDuData || []).filter((item) =>
      item.name.toLowerCase().includes(q)
    );

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center">Không tìm thấy sản phẩm phù hợp.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered
      .map(
        (item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td><strong>${esc(item.name)}</strong></td>
          <td class="text-center">${esc(item.weight)}</td>
          <td class="text-right"><span class="price-badge">${esc(item.price)}</span></td>
          <td class="text-right">
            <a href="https://zalo.me/0983533945" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm hover-arrow">
              <span>Đặt qua Zalo</span>
              <span class="arrow">→</span>
            </a>
          </td>
        </tr>
      `
      )
      .join("");
  }

  renderRows();
  searchInput?.addEventListener("input", (e) => renderRows(e.target.value));
};
