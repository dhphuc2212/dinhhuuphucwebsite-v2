window.DhpUtils = (function () {
  function escapeHtml(str = "") {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatIsoToDmy(isoStr = "") {
    const m = String(isoStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : isoStr;
  }

  function getTodayIso() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }

  function getTimezone() {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Ho_Chi_Minh";
  }

  function showToast(message) {
    const toastEl = document.getElementById("toastNotice");
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add("show");
    clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(() => {
      toastEl.classList.remove("show");
    }, 3000);
  }

  function downloadVCard() {
    const vcard = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      "N:Đinh;Hữu Phúc;;;",
      "FN:Đinh Hữu Phúc",
      "EMAIL;TYPE=INTERNET:dhphuc2212@dinhhuuphuc.com",
      "URL:https://zalo.me/0983533945",
      "ADR;TYPE=HOME:;;Hòa Bình;TP. Hồ Chí Minh;;;Việt Nam",
      "END:VCARD"
    ].join("\r\n");

    const blob = new Blob([vcard], { type: "text/vcard;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Dinh_Huu_Phuc.vcf";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast("Đã tải danh bạ Đinh Hữu Phúc (.vcf)!");
  }

  return { escapeHtml, formatIsoToDmy, getTodayIso, getTimezone, showToast, downloadVCard };
})();

window.showToast = window.DhpUtils.showToast;
