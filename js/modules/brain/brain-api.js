window.SecondBrainApi = (function () {
  async function listItems() {
    return window.DhpApi.request("/api/brain");
  }

  async function saveManual(payload) {
    return window.DhpApi.request("/api/brain", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }

  async function deleteItem(id) {
    return window.DhpApi.request(`/api/brain/item/${encodeURIComponent(id)}`, {
      method: "DELETE"
    });
  }

  async function chatOrIngest(message, mode, history = []) {
    return window.DhpApi.request("/api/chat", {
      method: "POST",
      body: JSON.stringify({
        message,
        today: window.DhpUtils.getTodayIso(),
        timezone: window.DhpUtils.getTimezone(),
        history,
        mode
      })
    });
  }

  return { listItems, saveManual, deleteItem, chatOrIngest };
})();
