window.CalendarRenderer = (function () {
  const H = window.CalendarHelpers;

  function toInputTime(dateObj) {
    return `${String(dateObj.getHours()).padStart(2, "0")}:${String(dateObj.getMinutes()).padStart(2, "0")}`;
  }

  function toInputDate(dateObj) {
    return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(
      dateObj.getDate()
    ).padStart(2, "0")}`;
  }

  function formatIsoToDmy(isoStr = "") {
    const m = String(isoStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : isoStr;
  }

  function renderManualCreateBox(manualCreateDraft, selectedDateStr) {
    if (!manualCreateDraft) return "";
    const draftDate = manualCreateDraft.date || selectedDateStr;
    return `
      <div class="dhp-manual-create-box" id="manualCreateBox">
        <div class="dhp-manual-create-header">
          <span>➕ Thêm lịch làm việc mới</span>
          <span class="dhp-date-hint">Ngày: ${H.escapeHtml(formatIsoToDmy(draftDate))}</span>
        </div>
        <input type="text" class="dhp-edit-input manual-title-input" placeholder="Nhập tên công việc / sự kiện (VD: Họp kế hoạch Gạo Ông Du)" />
        <div class="dhp-edit-grid">
          <input type="date" class="dhp-edit-input manual-date-input" value="${H.escapeHtml(draftDate)}" />
          <input type="time" class="dhp-edit-input manual-start-input" value="${H.escapeHtml(
            manualCreateDraft.startTime || "09:00"
          )}" />
          <input type="time" class="dhp-edit-input manual-end-input" value="${H.escapeHtml(
            manualCreateDraft.endTime || "10:00"
          )}" />
        </div>
        <input type="text" class="dhp-edit-input manual-desc-input" placeholder="Ghi chú chi tiết hoặc địa điểm (tùy chọn)" />
        <div class="dhp-edit-actions">
          <button type="button" class="btn btn-outline btn-sm cancel-manual-create-btn">Hủy</button>
          <button type="button" class="btn btn-primary btn-sm save-manual-create-btn">Lưu vào Google Calendar</button>
        </div>
      </div>
    `;
  }

  async function renderAgenda({
    selectedDateStr,
    hideBirthdays,
    cachedEvents,
    editingEventId,
    manualCreateDraft,
    checklistState,
    isEventCompleted
  }) {
    const container = document.getElementById("calendarEventsContainer");
    if (!container) return;

    const weatherInfo = await H.fetchWeatherForDate(selectedDateStr);
    const isToday = selectedDateStr === H.getTodayStr();
    const nowMs = Date.now();

    const allDayItems = [];
    const timedItems = [];

    cachedEvents.forEach((ev) => {
      const isBirthday =
        ev.eventType === "birthday" ||
        /birthday|sinh nhật|chúc mừng sinh nhật/i.test(ev.summary || "");
      if (hideBirthdays && isBirthday) return;

      if (ev.start?.date && !ev.start?.dateTime) {
        allDayItems.push({ ...ev, isBirthday });
      } else if (ev.start?.dateTime) {
        const startDt = new Date(ev.start.dateTime);
        const endDt = ev.end?.dateTime ? new Date(ev.end.dateTime) : new Date(startDt.getTime() + 3600000);
        timedItems.push({ ...ev, startDt, endDt, isBirthday });
      }
    });

    timedItems.sort((a, b) => a.startDt - b.startDt);

    const completedCount = timedItems.filter((item) => isEventCompleted(item)).length;
    const summaryText = `Hoàn thành: ${completedCount}/${timedItems.length} đầu việc`;

    let html = `
      <div class="dhp-agenda-wrap">
        <div class="dhp-day-toolbar">
          <div class="dhp-nav-group">
            <button type="button" class="btn btn-outline btn-sm" id="calPrevDayBtn">← Hôm qua</button>
            <div class="dhp-date-title-box">
              <span>${H.escapeHtml(H.formatDisplayDate(selectedDateStr))}</span>
              <input type="date" id="calDatePickerInput" class="dhp-date-picker" value="${selectedDateStr}" title="Chọn ngày bất kỳ" />
            </div>
            ${!isToday ? `<button type="button" class="btn btn-outline btn-sm" id="calTodayBtn">Về hôm nay</button>` : ""}
          </div>
          <div class="dhp-nav-right">
            <button type="button" class="btn btn-primary btn-sm" id="calOpenManualCreateBtn">+ Thêm lịch</button>
            <button type="button" class="btn btn-outline btn-sm" id="calNextDayBtn">Ngày mai →</button>
          </div>
        </div>

        <div class="dhp-sub-toolbar">
          <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
            <label class="dhp-toggle-label">
              <input type="checkbox" id="calHideBirthdayToggle" ${hideBirthdays ? "checked" : ""} />
              <span>Ẩn ngày lễ & sinh nhật</span>
            </label>
            <span>• <strong>${H.escapeHtml(summaryText)}</strong></span>
          </div>
          ${weatherInfo ? `<div class="dhp-weather-pill">${H.escapeHtml(weatherInfo.summary)}</div>` : ""}
        </div>

        ${renderManualCreateBox(manualCreateDraft, selectedDateStr)}
    `;

    if (allDayItems.length > 0) {
      html += `<div class="dhp-allday-strip"><span style="font-weight:600;color:#475569;">Cả ngày:</span>`;
      allDayItems.forEach((ev) => {
        const icon = ev.isBirthday ? "🎂" : "📌";
        html += `<span class="dhp-allday-pill">${icon} ${H.escapeHtml(ev.summary || "Sự kiện cả ngày")}</span>`;
      });
      html += `</div>`;
    }

    if (timedItems.length === 0) {
      html += `
        <div class="calendar-empty-state" style="margin-top:4px;">
          Không có lịch làm việc theo khung giờ trong ngày <strong>${H.escapeHtml(
            H.formatDisplayDate(selectedDateStr)
          )}</strong>.
          <div class="dhp-empty-actions">
            <button type="button" class="btn btn-primary btn-sm dhp-manual-empty-btn">+ Thêm lịch thủ công</button>
            <button type="button" class="dhp-quick-add-btn" data-ai-prompt="1">+ Nhắn AI để lên lịch</button>
          </div>
        </div>
      </div>`;
      container.innerHTML = html;
      return;
    }

    html += `<div class="dhp-timeline-list">`;
    let nowDividerInserted = false;

    timedItems.forEach((ev, idx) => {
      const startMs = ev.startDt.getTime();
      const endMs = ev.endDt.getTime();
      const done = isEventCompleted(ev);

      if (isToday && !nowDividerInserted && nowMs < startMs) {
        const nowStr = new Date(nowMs).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
        html += `
          <div class="dhp-now-divider">
            <div class="dhp-now-label">Bây giờ ${nowStr}</div>
            <div style="display:flex;justify-content:center;"><span style="width:8px;height:8px;border-radius:50%;background:#dc2626;"></span></div>
            <div class="dhp-now-line"></div>
          </div>`;
        nowDividerInserted = true;
      }

      let stateClass = "is-upcoming";
      if (done) {
        stateClass = "is-past is-done";
      } else if (isToday) {
        if (nowMs >= endMs) stateClass = "is-past";
        else if (nowMs >= startMs && nowMs < endMs) {
          stateClass = "is-now";
          nowDividerInserted = true;
        }
      } else if (selectedDateStr < H.getTodayStr()) {
        stateClass = "is-past";
      }

      const startStr = ev.startDt.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
      const endStr = ev.endDt.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
      const durationStr = H.formatDuration(Math.round((endMs - startMs) / 60000));
      const cleanTitle = (ev.summary || "(Không có tiêu đề)").replace(/^✅\s*/, "");
      const cat = H.classifyEvent(cleanTitle, ev.description);
      const safeTitle = H.escapeHtml(cleanTitle);
      const safeId = H.escapeHtml(ev.id || "");
      const canModify = ev.eventType !== "birthday";
      const isEditing = editingEventId === ev.id;

      let statusBadge = "";
      if (done) {
        statusBadge = `<span class="dhp-badge dhp-badge-done">✓ Đã hoàn thành</span>`;
      } else if (stateClass === "is-now") {
        const minsLeft = Math.max(1, Math.round((endMs - nowMs) / 60000));
        statusBadge = `<span class="dhp-badge dhp-badge-now">🔥 ĐANG DIỄN RA • Còn ${minsLeft}p</span>`;
      } else if (isToday && stateClass === "is-upcoming") {
        const minsToStart = Math.round((startMs - nowMs) / 60000);
        if (minsToStart > 0 && minsToStart <= 120) {
          statusBadge = `<span class="dhp-badge dhp-badge-countdown">🔔 Diễn ra sau ${H.formatDuration(minsToStart)}</span>`;
        }
      }

      let rainWarning = "";
      if (!done && weatherInfo?.rainyHours?.length && /giao|kho|gặp|khách|đi|chuyển|xe|ngoài/i.test(cleanTitle)) {
        const sH = ev.startDt.getHours();
        const eH = ev.endDt.getHours();
        const hitRain = weatherInfo.rainyHours.some((h) => h >= sH && h <= eH);
        if (hitRain) {
          rainWarning = `<div class="dhp-rain-warn">⚠️ Dự báo có mưa vào khung giờ này, lưu ý kiểm tra lộ trình giao nhận.</div>`;
        }
      }

      const tasks = checklistState[ev.id] || [];
      const tasksHtml = tasks
        .map(
          (t, tIdx) => `
          <label class="dhp-subtask-item ${t.done ? "done" : ""}">
            <input type="checkbox" class="dhp-task-checkbox" data-event-id="${safeId}" data-task-idx="${tIdx}" ${
              t.done ? "checked" : ""
            } />
            <span>${H.escapeHtml(t.text)}</span>
          </label>`
        )
        .join("");

      const editFormHtml = isEditing
        ? `
          <div class="dhp-edit-box" data-edit-event-id="${safeId}">
            <input type="text" class="dhp-edit-input edit-title-input" value="${safeTitle}" placeholder="Tên công việc / sự kiện" />
            <div class="dhp-edit-grid">
              <input type="date" class="dhp-edit-input edit-date-input" value="${toInputDate(ev.startDt)}" />
              <input type="time" class="dhp-edit-input edit-start-input" value="${toInputTime(ev.startDt)}" />
              <input type="time" class="dhp-edit-input edit-end-input" value="${toInputTime(ev.endDt)}" />
            </div>
            <input type="text" class="dhp-edit-input edit-desc-input" value="${H.escapeHtml(
              ev.description || ""
            )}" placeholder="Ghi chú chi tiết (tùy chọn)" />
            <div class="dhp-edit-actions">
              <button type="button" class="btn btn-outline btn-sm cancel-edit-btn">Hủy</button>
              <button type="button" class="btn btn-primary btn-sm save-edit-btn" data-event-id="${safeId}">Lưu thay đổi</button>
            </div>
          </div>
        `
        : "";

      html += `
        <div class="dhp-tl-row ${stateClass}">
          <div class="dhp-tl-time">
            <div>${startStr} – ${endStr}</div>
            <span class="dhp-tl-dur">${done ? "Đã hoàn thành" : durationStr}</span>
          </div>
          <div class="dhp-tl-axis">
            <div class="dhp-tl-dot"></div>
            <div class="dhp-tl-line"></div>
          </div>
          <article class="dhp-tl-card ${cat.cls}">
            <div class="dhp-card-top">
              <div>
                <div class="dhp-badges">
                  <span class="dhp-badge ${cat.badgeCls}">${cat.label}</span>
                  ${statusBadge}
                </div>
                <div class="dhp-event-title-row">
                  ${
                    canModify
                      ? `<input type="checkbox" class="dhp-event-done-cb" data-event-id="${safeId}" title="Đánh dấu hoàn thành công việc" ${
                          done ? "checked" : ""
                        } />`
                      : ""
                  }
                  <div class="dhp-card-title">${safeTitle}</div>
                </div>
              </div>
              ${
                canModify
                  ? `<div class="dhp-card-actions">
                      <button type="button" class="btn btn-outline btn-sm edit-event-btn" data-event-id="${safeId}" style="padding:2px 9px;font-size:0.75rem;">Sửa</button>
                      <button type="button" class="btn btn-outline btn-sm delete-event-btn" data-event-id="${safeId}" data-event-title="${safeTitle}" style="padding:2px 9px;font-size:0.75rem;">Xóa</button>
                    </div>`
                  : ""
              }
            </div>
            ${editFormHtml}
            ${!isEditing && ev.description ? `<div class="dhp-card-desc">${H.escapeHtml(ev.description)}</div>` : ""}
            ${rainWarning}
            <div class="dhp-subtasks">
              ${tasksHtml}
              <button type="button" class="dhp-add-subtask" data-event-id="${safeId}">+ Thêm đầu việc chuẩn bị</button>
            </div>
          </article>
        </div>
      `;

      const nextEv = timedItems[idx + 1];
      if (nextEv) {
        const gapMins = Math.round((nextEv.startDt.getTime() - endMs) / 60000);
        if (gapMins >= 45) {
          const nextStartStr = nextEv.startDt.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
          html += `
            <div class="dhp-free-slot">
              <div></div>
              <div class="dhp-tl-axis"><div class="dhp-tl-line"></div></div>
              <div class="dhp-free-banner">
                <span>Trống ${H.formatDuration(gapMins)} (${endStr} – ${nextStartStr})</span>
                <button type="button" class="dhp-quick-add-btn" data-quick-time="${endStr}">+ Thêm việc nhanh</button>
              </div>
            </div>
          `;
        }
      }
    });

    html += `</div></div>`;
    container.innerHTML = html;
  }

  return {
    toInputTime,
    toInputDate,
    formatIsoToDmy,
    renderAgenda
  };
})();
