// UI — shared helpers: icons, toast, modal, escape, formatting.
const UI = {};

UI.icon = function (name, size = 18) {
  const paths = {
    dashboard: "<path d='M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z'/>",
    library: "<path d='M4 5a2 2 0 0 1 2-2h6v18H6a2 2 0 0 1-2-2zM14 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4z'/>",
    plans: "<path d='M4 4h16v4H4zM4 10h16v4H4zM4 16h10v4H4z'/>",
    tasks: "<path d='M9 11l3 3 7-7M5 4h14v16H5z'/>",
    calendar: "<path d='M3 6h18v15H3zM3 10h18M8 3v4M16 3v4'/>",
    routine: "<circle cx='12' cy='12' r='9'/><path d='M12 7v5l3 2'/>",
    statistics: "<path d='M4 20V10M10 20V4M16 20v-7M22 20H2'/>",
    notifications: "<path d='M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0'/>",
    profile: "<circle cx='12' cy='8' r='4'/><path d='M4 21v-1a8 8 0 0 1 16 0v1'/>",
    settings: "<circle cx='12' cy='12' r='3'/><path d='M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 2.9-1.2V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-1.2 2.9H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z'/>",
    subscription: "<rect x='2' y='5' width='20' height='14' rx='2'/><path d='M2 10h20'/>",
    overview: "<path d='M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z'/>",
    students: "<path d='M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11'/>",
    codes: "<path d='M21 2l-2 2m-7.6 7.6a5 5 0 1 1-7-7 5 5 0 0 1 7 7zm0 0L15 8m0 0l3 3 3-3-3-3'/>",
    devices: "<rect x='5' y='2' width='14' height='20' rx='2'/><path d='M12 18h.01'/>",
    files: "<path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6'/>",
    logs: "<path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5'/>",
    adminSettings: "<circle cx='12' cy='12' r='3'/><path d='M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1'/>",
    logout: "<path d='M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9'/>",
    menu: "<path d='M3 6h18M3 12h18M3 18h18'/>",
    close: "<path d='M18 6L6 18M6 6l12 12'/>",
    theme: "<path d='M12 3l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3z'/>",
    plus: "<path d='M12 5v14M5 12h14'/>",
    copy: "<rect x='9' y='9' width='13' height='13' rx='2'/><path d='M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1'/>",
    download: "<path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3'/>",
    check: "<path d='M20 6L9 17l-5-5'/>",
    refresh: "<path d='M21 2v6h-6M3 22v-6h6M3.5 9a9 9 0 0 1 14.8-3.4L21 8M20.5 15a9 9 0 0 1-14.8 3.4L3 16'/>",
    trash: "<path d='M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6'/>",
    key: "<path d='M21 2l-2 2m-7.6 7.6a5 5 0 1 1-7-7 5 5 0 0 1 7 7zm0 0L15 8m0 0l3 3 3-3-3-3'/>",
    book: "<path d='M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z'/>",
    clock: "<circle cx='12' cy='12' r='9'/><path d='M12 7v5l3 2'/>",
    alert: "<path d='M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h16.9a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01'/>",
    shield: "<path d='M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z'/>",
    phone: "<path d='M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z'/>",
    play: "<path d='M5 3l14 9-14 9z'/>",
    pause: "<rect x='6' y='4' width='4' height='16'/><rect x='14' y='4' width='4' height='16'/>",
    edit: "<path d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z'/>",
    arrowLeft: "<path d='M19 12H5M12 19l-7-7 7-7'/>",
    arrowRight: "<path d='M5 12h14M12 5l7 7-7 7'/>",
    info: "<circle cx='12' cy='12' r='9'/><path d='M12 8h.01M11 12h1v4h1'/>",
    lock: "<rect x='4' y='11' width='16' height='10' rx='2'/><path d='M8 11V7a4 4 0 0 1 8 0v4'/>",
    upload: "<path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12'/>",
    sparkles: "<path d='M12 3l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3z'/>",
    sun: "<circle cx='12' cy='12' r='4'/><path d='M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4'/>",
    moon: "<path d='M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z'/>",
  };
  const inner = paths[name] || "";
  return `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
};

UI.escape = function (s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
};

UI.toast = function (message, type = "info") {
  let wrap = document.querySelector(".toast-wrap");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.className = "toast-wrap";
    document.body.appendChild(wrap);
  }
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  const icon = type === "success" ? "check" : type === "error" ? "alert" : "info";
  el.innerHTML = `${UI.icon(icon, 16)}<span>${UI.escape(message)}</span>`;
  wrap.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transition = "opacity 0.3s";
    setTimeout(() => el.remove(), 300);
  }, 3200);
};

UI.modal = function ({ title, body, actions = [] }) {
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <div class="modal">
      <div class="row between mb-4">
        <h2>${UI.escape(title)}</h2>
        <button class="icon-btn" data-close>${UI.icon("close", 18)}</button>
      </div>
      <div class="modal-body"></div>
      <div class="row gap-3 mt-4" style="justify-content:flex-end"></div>
    </div>`;
  const bodyEl = backdrop.querySelector(".modal-body");
  if (typeof body === "string") bodyEl.innerHTML = body;
  else if (body instanceof Node) bodyEl.appendChild(body);
  const actionEl = backdrop.querySelector(".modal-body + .row, .row:last-child");
  const actionsEl = backdrop.querySelectorAll(".row")[1];
  actions.forEach((a) => {
    const btn = document.createElement("button");
    btn.className = `btn ${a.variant || "outline"}`;
    btn.textContent = a.label;
    btn.onclick = async () => {
      if (a.onClick) await a.onClick(backdrop);
      if (a.close !== false) backdrop.remove();
    };
    actionsEl.appendChild(btn);
  });
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop || e.target.hasAttribute("data-close")) backdrop.remove();
  });
  document.body.appendChild(backdrop);
  return backdrop;
};

UI.confirm = function (message, onConfirm, opts = {}) {
  UI.modal({
    title: opts.title || t("common.confirm"),
    body: `<p style="margin:0">${UI.escape(message)}</p>`,
    actions: [
      { label: t("common.cancel"), variant: "outline" },
      { label: opts.confirmLabel || t("common.confirm"), variant: opts.variant || "danger", onClick: onConfirm },
    ],
  });
};

UI.spinner = function () {
  return `<div class="loader"><div class="spinner"></div></div>`;
};

UI.badge = function (status) {
  const cls = `badge badge-${status}`;
  return `<span class="${cls}">${UI.escape(t(`status.${status}`))}</span>`;
};

UI.formatDate = function (iso, lang) {
  try {
    return new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : "en-GB", { dateStyle: "medium" }).format(new Date(iso));
  } catch {
    return iso;
  }
};
UI.formatDateTime = function (iso, lang) {
  try {
    return new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : "en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
  } catch {
    return iso;
  }
};
UI.formatMinutes = function (total, lang) {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (lang === "ar") {
    if (hours && minutes) return `${hours} س ${minutes} د`;
    if (hours) return `${hours} ساعة`;
    return `${minutes} دقيقة`;
  }
  if (hours && minutes) return `${hours}h ${minutes}m`;
  if (hours) return `${hours}h`;
  return `${minutes}m`;
};
UI.formatBytes = function (bytes, lang = "en") {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} ${lang === "ar" ? "ك.ب" : "KB"}`;
  return `${(kb / 1024).toFixed(1)} ${lang === "ar" ? "م.ب" : "MB"}`;
};
UI.initials = function (name) {
  return String(name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
};

window.UI = UI;
