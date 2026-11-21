// Study — vanilla HTML/CSS/JS application
(function () {
  "use strict";

  const state = {
    user: null,
    profile: null,
    subscription: null,
    device: null,
  };

  const studentNav = [
    { href: "/dashboard", key: "nav.dashboard", icon: "dashboard" },
    { href: "/library", key: "nav.library", icon: "library" },
    { href: "/plans", key: "nav.plans", icon: "plans" },
    { href: "/tasks", key: "nav.tasks", icon: "tasks" },
    { href: "/calendar", key: "nav.calendar", icon: "calendar" },
    { href: "/routine", key: "nav.routine", icon: "routine" },
    { href: "/statistics", key: "nav.statistics", icon: "statistics" },
    { href: "/notifications", key: "nav.notifications", icon: "notifications" },
    { href: "/profile", key: "nav.profile", icon: "profile" },
    { href: "/settings", key: "nav.settings", icon: "settings" },
    { href: "/subscription", key: "nav.subscription", icon: "subscription" },
  ];
  const adminNav = [
    { href: "/admin", key: "nav.overview", icon: "overview" },
    { href: "/admin/students", key: "nav.students", icon: "students" },
    { href: "/admin/codes", key: "nav.codes", icon: "codes" },
    { href: "/admin/subscriptions", key: "nav.subscriptions", icon: "subscription" },
    { href: "/admin/devices", key: "nav.devices", icon: "devices" },
    { href: "/admin/files", key: "nav.files", icon: "files" },
    { href: "/admin/logs", key: "nav.logs", icon: "logs" },
    { href: "/admin/settings", key: "nav.adminSettings", icon: "adminSettings" },
  ];

  function qs(sel, root = document) { return root.querySelector(sel); }
  function qsa(sel, root = document) { return [...root.querySelectorAll(sel)]; }
  function el(html) {
    const t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }
  function h(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") node.className = v;
      else if (k === "html") node.innerHTML = v;
      else if (k === "text") node.textContent = v;
      else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
      else if (v !== null && v !== undefined) node.setAttribute(k, v);
    }
    (Array.isArray(children) ? children : [children]).forEach((c) => {
      if (c == null) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  }

  // Inline <script> tags inserted via innerHTML are NOT executed by browsers,
  // so page handlers would never attach. Re-create each script node so it runs.
  function execScripts(root) {
    if (!root) return;
    Array.from(root.querySelectorAll("script")).forEach((old) => {
      const s = document.createElement("script");
      if (old.src) s.src = old.src;
      else s.text = old.text;
      if (old.type) s.type = old.type;
      old.parentNode.replaceChild(s, old);
    });
  }

  async function loadSession() {
    try {
      const data = await api("/api/auth/me");
      state.user = data.user;
      state.profile = data.profile;
      state.subscription = data.subscription;
      state.device = data.device;
    } catch {
      state.user = null;
    }
    return state.user;
  }

  function applyTheme(theme) {
    const effective = theme === "system"
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : theme;
    document.documentElement.setAttribute("data-theme", effective);
    return effective;
  }

  function activeNav() {
    const path = location.pathname;
    if (state.user && state.user.role === "admin") {
      const item = adminNav.find((n) => path === n.href || (n.href !== "/admin" && path.startsWith(n.href)));
      return item || adminNav[0];
    }
    const item = studentNav.find((n) => path === n.href || path.startsWith(n.href + "/") || (n.href !== "/dashboard" && path.startsWith(n.href)));
    return item || studentNav[0];
  }

  function renderShell(contentNode) {
    const isAdmin = state.user && state.user.role === "admin";
    const nav = isAdmin ? adminNav : studentNav;
    const current = activeNav();
    const lang = I18N.lang;

    const navLinks = nav
      .map((item) => {
        const active = (item === current) || (current && item.href === current.href);
        const badge = item.href === "/notifications" && state.unread
          ? `<span class="nav-badge">${state.unread}</span>`
          : "";
        return `<a href="${item.href}" class="${active ? "active" : ""}" data-nav>${UI.icon(item.icon, 18)}<span>${t(item.key)}</span>${badge}</a>`;
      })
      .join("");

    const themeIcon = document.documentElement.getAttribute("data-theme") === "dark" ? "sun" : "moon";
    const shell = el(`
      <div class="app">
        <aside class="sidebar" id="sidebar">
          <div class="sidebar-inner">
            <div class="sidebar-brand">
              <a href="/${isAdmin ? "admin" : "dashboard"}" class="brand-mark">
                <span class="brand-logo"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M2 7l10-4 10 4-10 4z"/><path d="M6 10v5c0 1.5 8 1.5 8 0v-5"/><path d="M22 7v5"/><circle cx="22" cy="13" r="1.4" fill="currentColor" stroke="none"/></svg></span><span>${t("brand.name")}</span>
              </a>
              <button class="icon-btn" id="closeSidebar" style="display:none">${UI.icon("close", 18)}</button>
            </div>
            <nav class="nav">${navLinks}</nav>
            <div class="sidebar-foot">
              <div class="user-chip">
                <div class="avatar">${UI.initials(state.user.fullName)}</div>
                <div class="meta">
                  <div class="name">${UI.escape(state.user.fullName)}</div>
                  <div class="sub">${state.user.role === "admin" ? "Super Admin" : UI.escape(state.user.phoneNumber)}</div>
                </div>
              </div>
              <button class="btn btn-outline btn-block" id="logoutBtn">${UI.icon("logout", 16)} ${t("nav.logout")}</button>
            </div>
          </div>
        </aside>
        <div class="scrim" id="scrim"></div>
        <div class="main">
          <header class="topbar">
            <button class="menu-btn" id="menuBtn">${UI.icon("menu", 20)}</button>
            <div class="spacer"></div>
            <button class="btn btn-ghost btn-sm" id="langBtn">${lang === "ar" ? "EN" : "ع"}</button>
            <button class="icon-btn" id="themeBtn">${UI.icon(themeIcon, 18)}</button>
          </header>
          <div class="content" id="content"></div>
        </div>
        ${!isAdmin ? `
        <nav class="mobile-nav">
          ${studentNav.slice(0, 5).map((item) => {
            const active = location.pathname === item.href || location.pathname.startsWith(item.href + "/");
            return `<a href="${item.href}" class="${active ? "active" : ""}">${UI.icon(item.icon, 20)}<span>${t(item.key)}</span></a>`;
          }).join("")}
        </nav>` : ""}
      </div>
    `);
    document.body.innerHTML = "";
    document.body.appendChild(shell);
    const content = qs("#content", shell);
    if (contentNode) content.appendChild(contentNode);
    execScripts(content);

    qs("#logoutBtn", shell).addEventListener("click", async () => {
      await api("/api/auth/logout", { method: "POST" }).catch(() => null);
      state.user = null;
      location.href = "/login";
    });
    qs("#menuBtn", shell).addEventListener("click", () => {
      qs("#sidebar", shell).classList.add("open");
      qs("#scrim", shell).classList.add("show");
      qs("#closeSidebar", shell).style.display = "grid";
    });
    qs("#scrim", shell).addEventListener("click", () => {
      qs("#sidebar", shell).classList.remove("open");
      qs("#scrim", shell).classList.remove("show");
      qs("#closeSidebar", shell).style.display = "none";
    });
    qs("#closeSidebar", shell).addEventListener("click", () => {
      qs("#sidebar", shell).classList.remove("open");
      qs("#scrim", shell).classList.remove("show");
      qs("#closeSidebar", shell).style.display = "none";
    });
    qs("#langBtn", shell).addEventListener("click", async () => {
      const next = I18N.lang === "ar" ? "en" : "ar";
      await api("/api/profile", { method: "PATCH", body: { preferredLanguage: next } }).catch(() => null);
      switchLang(next);
      render();
    });
    qs("#themeBtn", shell).addEventListener("click", async () => {
      const cur = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
      const next = cur === "dark" ? "light" : "dark";
      const theme = next === "light" ? "light" : "dark";
      applyTheme(theme);
      await api("/api/profile", { method: "PATCH", body: { theme } }).catch(() => null);
      qs("#themeBtn", shell).innerHTML = UI.icon(next === "dark" ? "sun" : "moon", 18);
    });
    qsa("[data-nav]", shell).forEach((a) => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        history.pushState({}, "", a.getAttribute("href"));
        render();
        qs("#sidebar", shell).classList.remove("open");
        qs("#scrim", shell).classList.remove("show");
      });
    });
  }

  function pageHeader(title, subtitle) {
    return `<div class="page-head"><h1>${UI.escape(title)}</h1>${subtitle ? `<p>${UI.escape(subtitle)}</p>` : ""}</div>`;
  }

  // ===== Pages =====
  async function pageDashboard() {
    const data = await api("/api/dashboard");
    const lang = I18N.lang;
    const s = data.stats;
    const stats = [
      { label: t("dashboard.completion"), value: `${s.today.completionPercent}%` },
      { label: t("dashboard.weekly"), value: UI.formatMinutes(s.week.studyMinutes, lang) },
      { label: t("dashboard.pages"), value: s.today.pagesCompleted },
      { label: t("dashboard.remaining"), value: s.today.remainingTasks },
      { label: t("dashboard.overdue"), value: s.overall.delayedTasks },
    ];
    const tasksHtml = data.todayTasks.length === 0
      ? `<div class="empty">${t("dashboard.noTasks")}</div>`
      : `<ul class="list">${data.todayTasks.map((task) => `
        <li class="list-item">
          <div><div class="title">${UI.escape(task.title)}</div>
          <div class="sub">${t("tasks.pages", { start: task.pageStart, end: task.pageEnd })} · ${UI.formatMinutes(task.estimatedDuration, lang)}</div></div>
          ${UI.badge(task.status)}
        </li>`).join("")}</ul>`;
    const plansHtml = data.plans.length === 0
      ? `<p class="text-muted text-sm">${t("plans.noPlans")}</p>`
      : `<ul class="list">${data.plans.map((p) => `
        <li><a href="/plans/${p.id}" class="list-item" style="color:inherit;text-decoration:none">
          <span class="title">${UI.escape(p.title)}</span>
          <span class="text-muted text-sm">${p.completedTasks}/${p.totalTasks}</span>
        </a></li>`).join("")}</ul>`;
    const notifHtml = data.notifications.length === 0
      ? `<p class="text-muted text-sm">${t("notifications.empty")}</p>`
      : `<ul class="list">${data.notifications.slice(0, 5).map((n) => `
        <li class="list-item"><div><div class="title">${UI.escape(n.title)}</div><div class="sub">${UI.escape(n.body)}</div></div></li>`).join("")}</ul>`;
    return `
      ${pageHeader(t("dashboard.welcome", { name: (data.profile.fullName || "").split(" ")[0] }), t("brand.subtitle"))}
      <div class="grid cols-5 mb-6">
        ${stats.map((st) => `<div class="card stat-card"><div class="label">${UI.escape(st.label)}</div><div class="value">${UI.escape(String(st.value))}</div></div>`).join("")}
      </div>
      <div class="grid cols-3 mb-6">
        <div class="card" style="grid-column:span 2"><h2>${t("dashboard.todayTasks")}</h2>${tasksHtml}</div>
        <div>
          <div class="card mb-4"><h2>${t("dashboard.quick")}</h2>
            <div class="grid gap-2">
              <a href="/library" class="btn btn-outline btn-block">${UI.icon("upload", 16)} ${t("dashboard.upload")}</a>
              <a href="/plans/new" class="btn btn-primary btn-block">${UI.icon("plus", 16)} ${t("dashboard.newPlan")}</a>
              <a href="/routine" class="btn btn-outline btn-block">${UI.icon("plus", 16)} ${t("dashboard.addRoutine")}</a>
            </div>
          </div>
          <div class="card"><h2>${t("dashboard.subscription")}</h2>
            ${data.subscription
              ? `${UI.badge(data.subscription.status)}<p class="text-sm text-muted mt-2">${t("dashboard.expiresOn", { date: UI.formatDate(data.subscription.expiresAt, lang) })}</p>`
              : `<p class="text-sm text-muted">—</p>`}
          </div>
        </div>
      </div>
      <div class="grid cols-2">
        <div class="card"><h2>${t("dashboard.activePlans")}</h2>${plansHtml}</div>
        <div class="card"><h2>${t("dashboard.recent")}</h2>${notifHtml}</div>
      </div>
    `;
  }

  async function pageLibrary() {
    const data = await api("/api/files");
    const lang = I18N.lang;
    const items = data.items;
    const listHtml = items.length === 0
      ? `<div class="empty">${t("library.noFiles")}</div>`
      : `<ul class="list">${items.map((f) => `
        <li class="list-item">
          <div style="min-width:0">
            <div class="title">${UI.escape(f.originalName)}</div>
            <div class="sub">${UI.formatBytes(f.fileSize, lang)} · ${f.totalPages || 0} ${t("library.chapters")}</div>
          </div>
          <div class="flex gap-2" style="display:flex;gap:8px">${UI.badge(f.processingStatus)}
            ${f.processingStatus === "failed" ? `<button class="btn btn-outline btn-sm" data-retry="${f.id}">${t("library.retry")}</button>` : ""}
            <button class="btn btn-ghost btn-sm" data-del="${f.id}">${UI.icon("trash", 14)}</button>
          </div>
        </li>`).join("")}</ul>`;
    return `
      ${pageHeader(t("library.title"), t("library.subtitle"))}
      <div class="card mb-6">
        <label class="dropzone" id="dropzone" for="fileInput" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:36px;border:2px dashed var(--border);border-radius:16px;cursor:pointer;text-align:center">
          ${UI.icon("upload", 28)}
          <strong>${t("library.drop")}</strong>
          <span class="hint">${t("library.types")}</span>
        </label>
        <input type="file" id="fileInput" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp" style="display:none" multiple>
        <div id="uploadStatus" class="mt-3"></div>
      </div>
      <div class="card">${listHtml}</div>
      <script>
        (function(){
          var dz=document.getElementById("dropzone"), inp=document.getElementById("fileInput"), st=document.getElementById("uploadStatus");
          async function upload(files){
            for(const file of files){
              st.innerHTML="<div class='loader'><div class='spinner'></div></div>";
              try{
                await fetch("/api/files",{method:"POST",credentials:"same-origin",body:file,headers:{"X-Filename":encodeURIComponent(file.name)}});
                UI.toast("Uploaded","success");
              }catch(e){ UI.toast("Upload failed","error"); }
            }
            st.innerHTML=""; render();
          }
          inp.addEventListener("change",function(){ upload(this.files); this.value=""; });
          dz.addEventListener("dragover",function(e){e.preventDefault();this.style.borderColor="var(--primary)";});
          dz.addEventListener("dragleave",function(){this.style.borderColor="var(--border)";});
          dz.addEventListener("drop",function(e){e.preventDefault();this.style.borderColor="var(--border)";upload(e.dataTransfer.files);});
          document.addEventListener("click",function(e){
            if(e.target.matches("[data-retry]")){ api("/api/files/"+e.target.dataset.retry,{method:"POST",body:{}}).then(function(){UI.toast("Retrying","success");render();}).catch(function(err){UI.toast(err.message,"error");}); }
            if(e.target.matches("[data-del]")){ var id=e.target.dataset.del; UI.confirm(t("library.deleteConfirm"),function(){ api("/api/files/"+id,{method:"DELETE"}).then(function(){UI.toast("Deleted","success");render();}).catch(function(err){UI.toast(err.message,"error");}); }); }
          },{once:true});
        })();
      <\/script>
    `;
  }

  async function pagePlans() {
    const data = await api("/api/plans");
    const lang = I18N.lang;
    const items = data.items;
    const listHtml = items.length === 0
      ? `<div class="empty">${t("plans.noPlans")}</div>`
      : `<ul class="list">${items.map((p) => `
        <li class="list-item">
          <div><div class="title">${UI.escape(p.title)}</div>
          <div class="sub">${UI.formatDate(p.startDate, lang)} – ${UI.formatDate(p.endDate, lang)} · ${p.completedTasks}/${p.totalTasks} ${t("common.tasks")}</div></div>
          <div class="flex gap-2" style="display:flex;gap:8px">${UI.badge(p.status)}
            <a class="btn btn-outline btn-sm" href="/plans/${p.id}">${t("common.view")}</a>
          </div>
        </li>`).join("")}</ul>`;
    return `
      ${pageHeader(t("plans.title"), t("plans.subtitle"))}
      <div class="grid cols-2">
        <div class="card"><h2>${t("plans.create")}</h2>
          <div class="field"><label>${t("plans.file")}</label><select class="select" id="planFile">
            <option value="">—</option>
            ${items.length ? "" : ""}
          </select></div>
          <p class="hint mb-2">Upload a file in the Library first.</p>
          <a href="/library" class="btn btn-outline btn-sm">${t("nav.library")}</a>
        </div>
        <div class="card"><h2>${t("plans.title")}</h2>${listHtml}</div>
      </div>
    `;
  }

  async function pagePlanDetail(id) {
    const data = await api("/api/plans/" + id);
    const plan = data.plan;
    const tasks = data.tasks;
    const lang = I18N.lang;
    const taskRows = tasks.map((task) => `
      <tr>
        <td>${UI.escape(task.title)}</td>
        <td class="text-sm text-muted">${UI.formatDate(task.scheduledDate, lang)}</td>
        <td class="text-sm">${UI.formatMinutes(task.estimatedDuration, lang)}</td>
        <td>${UI.badge(task.status)}</td>
        <td>
          <div class="flex gap-2" style="display:flex;gap:6px">
            ${task.status !== "completed" ? `<button class="btn btn-sm btn-primary" data-start="${task.id}">${UI.icon("play", 13)}</button>` : ""}
            ${task.status === "in_progress" ? `<button class="btn btn-sm btn-outline" data-stop="${task.id}" data-complete="1">${UI.icon("check", 13)}</button>` : ""}
            <button class="btn btn-sm btn-ghost" data-status="${task.id}" data-val="completed">${t("tasks.complete")}</button>
            <button class="btn btn-sm btn-ghost" data-status="${task.id}" data-val="delayed">${t("tasks.delay")}</button>
          </div>
        </td>
      </tr>`).join("");
    return `
      ${pageHeader(plan.title, `${UI.formatDate(plan.startDate, lang)} – ${UI.formatDate(plan.endDate, lang)}`)}
      <div class="card mb-4">
        <div class="row wrap gap-3">
          <div><div class="text-xs text-muted">${t("plans.active")}</div>${UI.badge(plan.status)}</div>
          <div class="spacer"></div>
          <button class="btn btn-outline btn-sm" id="rescheduleBtn">${UI.icon("refresh", 14)} ${t("plans.reschedule")}</button>
        </div>
        <p class="text-sm mt-3">${UI.escape(plan.explanation || "")}</p>
      </div>
      <div class="card">
        <h2>${t("tasks.title")} (${tasks.length})</h2>
        ${tasks.length === 0 ? `<div class="empty">${t("common.empty")}</div>` : `
        <div class="table-wrap"><table>
          <thead><tr><th>${t("common.tasks")}</th><th>${t("common.date")}</th><th>${t("tasks.estimated")}</th><th>${t("common.status")}</th><th>${t("common.actions")}</th></tr></thead>
          <tbody>${taskRows}</tbody>
        </table></div>`}
      </div>
      <script>
        (function(){
          var session={};
          document.addEventListener("click",function(e){
            var b=e.target.closest("button"); if(!b) return;
            if(b.dataset.start){ api("/api/tasks/"+b.dataset.start+"/session",{method:"POST",body:{}}).then(function(r){session[b.dataset.start]=r.sessionId;UI.toast("Started","success");render();}).catch(function(err){UI.toast(err.message,"error");}); }
            if(b.dataset.stop){ api("/api/sessions/"+session[b.dataset.stop],{method:"POST",body:{complete:true}}).then(function(){UI.toast("Completed","success");render();}).catch(function(err){UI.toast(err.message,"error");}); }
            if(b.dataset.status){ api("/api/tasks/"+b.dataset.status,{method:"PATCH",body:{status:b.dataset.val}}).then(function(){render();}).catch(function(err){UI.toast(err.message,"error");}); }
            if(b.id==="rescheduleBtn"){ api("/api/plans/"+ID+"?action=reschedule",{method:"POST",body:{}}).then(function(r){ UI.modal({title:t("plans.reschedule"),body:"<p>"+r.proposal.explanation+"</p><p class='text-sm'>"+t("plans.keepCompleted")+"</p>",actions:[{label:t("plans.apply"),variant:"primary",onClick:function(m){ api("/api/plans/"+ID+"?action=apply",{method:"POST",body:{preview:r.proposal.plan}}).then(function(){UI.toast("Applied","success");m.remove();render();}); }},{label:t("common.cancel"),variant:"outline"}]}); }).catch(function(err){UI.toast(err.message,"error");}); }
          });
        })();
      <\/script>
    `.replace(/ID/g, id);
  }

  async function pagePlanNew() {
    const files = await api("/api/files");
    const options = files.items.map((f) => `<option value="${f.id}">${UI.escape(f.originalName)}</option>`).join("");
    const lang = I18N.lang;
    const today = new Date().toISOString().slice(0, 10);
    const end = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
    return `
      ${pageHeader(t("plans.create"), t("plans.subtitle"))}
      <div class="card" style="max-width:640px">
        <div class="field"><label>${t("plans.file")}</label><select class="select" id="f-file">${options || `<option value="">${t("common.empty")}</option>`}</select></div>
        <div class="field"><label>${t("plans.title")}</label><input class="input" id="f-title"></div>
        <div class="grid cols-2">
          <div class="field"><label>${t("plans.start")}</label><input type="date" class="input" id="f-start" value="${today}"></div>
          <div class="field"><label>${t("plans.end")}</label><input type="date" class="input" id="f-end" value="${end}"></div>
        </div>
        <div class="grid cols-2">
          <div class="field"><label>${t("plans.hours")} (min)</label><input type="number" class="input" id="f-daily" value="120" min="30" max="720"></div>
          <div class="field"><label>${t("plans.session")} (min)</label><input type="number" class="input" id="f-session" value="45" min="15" max="180"></div>
        </div>
        <div class="field"><label>${t("plans.rest")}</label>
          <select class="select" id="f-rest" multiple style="min-height:90px">
            ${["sunday","monday","tuesday","wednesday","thursday","friday","saturday"].map((d,i)=>`<option value="${i}">${t("weekdays."+d)}</option>`).join("")}
          </select>
          <span class="hint">${t("plans.rest")}</span>
        </div>
        <div class="field"><label>${t("plans.difficulty")}</label>
          <select class="select" id="f-diff">
            <option value="balanced">${t("plans.balanced")}</option>
            <option value="easy_first">${t("plans.easyFirst")}</option>
            <option value="hard_first">${t("plans.hardFirst")}</option>
          </select>
        </div>
        <button class="btn btn-primary btn-block" id="previewBtn">${t("plans.preview")}</button>
      </div>
      <div id="previewArea" class="mt-4"></div>
      <script>
        (function(){
          function restDays(){ return [...document.getElementById("f-rest").selectedOptions].map(function(o){return Number(o.value);}); }
          document.getElementById("previewBtn").addEventListener("click",function(){
            var body={fileId:document.getElementById("f-file").value,title:document.getElementById("f-title").value,startDate:document.getElementById("f-start").value,endDate:document.getElementById("f-end").value,dailyStudyMinutes:Number(document.getElementById("f-daily").value),sessionMinutes:Number(document.getElementById("f-session").value),restDays:restDays(),difficultyPreference:document.getElementById("f-diff").value};
            api("/api/plans?preview=1",{method:"POST",body:body}).then(function(r){
              var p=r.preview; var html="<div class='card'><h2>"+t("plans.preview")+"</h2>";
              html+="<p class='text-sm'>"+UI.escape(p.explanation)+"</p>";
              if(p.warnings.length) html+="<div class='mt-3'>"+p.warnings.map(function(w){return "<div class='text-sm' style='color:var(--warning)'>"+UI.escape(w)+"</div>";}).join("")+"</div>";
              html+="<div class='mt-3'><strong>"+t("plans.explanation")+"</strong><ul>";
              p.days.forEach(function(d){ if(d.tasks.length) html+="<li>"+UI.escape(d.date)+": "+d.tasks.map(function(x){return UI.escape(x.title);}).join(", ")+"</li>"; });
              html+="</ul></div>";
              html+="<button class='btn btn-primary mt-4' id='activateBtn'>"+t("plans.confirm")+"</button>";
              document.getElementById("previewArea").innerHTML=html;
              document.getElementById("activateBtn").addEventListener("click",function(){
                api("/api/plans",{method:"POST",body:{preview:p,fileId:body.fileId}}).then(function(res){UI.toast("Plan created","success");location.href="/plans/"+res.planId;}).catch(function(e){UI.toast(e.message,"error");});
              });
            }).catch(function(e){UI.toast(e.message,"error");});
          });
        })();
      <\/script>
    `;
  }

  async function pageTasks() {
    const data = await api("/api/tasks");
    const lang = I18N.lang;
    const items = data.items;
    const rows = items.map((task) => `
      <tr>
        <td>${UI.escape(task.title)}<div class="text-xs text-muted">${t("tasks.pages", { start: task.pageStart, end: task.pageEnd })}</div></td>
        <td class="text-sm">${UI.formatDate(task.scheduledDate, lang)}</td>
        <td class="text-sm">${UI.formatMinutes(task.estimatedDuration, lang)} / ${UI.formatMinutes(task.actualDuration, lang)}</td>
        <td>${UI.badge(task.status)}</td>
        <td><div class="flex gap-2" style="display:flex;gap:6px">
          ${task.status !== "completed" ? `<button class="btn btn-sm btn-primary" data-start="${task.id}">${UI.icon("play", 13)}</button>` : ""}
          <button class="btn btn-sm btn-outline" data-status="${task.id}" data-val="completed">${t("tasks.complete")}</button>
        </div></td>
      </tr>`).join("");
    return `
      ${pageHeader(t("tasks.title"))}
      <div class="card">
        ${items.length === 0 ? `<div class="empty">${t("tasks.empty")}</div>` : `
        <div class="table-wrap"><table>
          <thead><tr><th>${t("common.tasks")}</th><th>${t("common.date")}</th><th>${t("tasks.estimated")}/${t("tasks.actual")}</th><th>${t("common.status")}</th><th>${t("common.actions")}</th></tr></thead>
          <tbody>${rows}</tbody>
        </table></div>`}
      </div>
      <script>
        (function(){ var session={};
          document.addEventListener("click",function(e){ var b=e.target.closest("button"); if(!b) return;
            if(b.dataset.start){ api("/api/tasks/"+b.dataset.start+"/session",{method:"POST",body:{}}).then(function(r){session[b.dataset.start]=r.sessionId;UI.toast("Started","success");render();}).catch(function(err){UI.toast(err.message,"error");}); }
            if(b.dataset.status){ api("/api/tasks/"+b.dataset.status,{method:"PATCH",body:{status:b.dataset.val}}).then(function(){render();}).catch(function(err){UI.toast(err.message,"error");}); }
          });
        })();
      <\/script>
    `;
  }

  async function pageCalendar() {
    const data = await api("/api/tasks");
    const lang = I18N.lang;
    const byDate = {};
    data.items.forEach((t) => { (byDate[t.scheduledDate] = byDate[t.scheduledDate] || []).push(t); });
    const days = [];
    for (let i = -6; i <= 13; i++) {
      const d = new Date(Date.now() + i * 86400000);
      const ymd = d.toISOString().slice(0, 10);
      days.push({ ymd, label: d.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB", { weekday: "short", day: "numeric", month: "short" }), tasks: byDate[ymd] || [] });
    }
    return `
      ${pageHeader(t("calendar.title"), t("calendar.subtitle"))}
      <div class="grid cols-3">
        ${days.map((d) => `
          <div class="card" style="padding:14px">
            <div class="row between mb-2"><strong>${UI.escape(d.label)}</strong>${d.tasks.length ? `<span class="badge badge-queued">${d.tasks.length}</span>` : ""}</div>
            ${d.tasks.length === 0 ? `<div class="text-xs text-muted">${t("calendar.restDay")}</div>` : `<ul class="list" style="gap:6px">${d.tasks.map((t) => `<li class="text-sm">${UI.escape(t.title)}</li>`).join("")}</ul>`}
          </div>`).join("")}
      </div>
    `;
  }

  async function pageRoutine() {
    const data = await api("/api/routines");
    const lang = I18N.lang;
    const items = data.items;
    const listHtml = items.length === 0
      ? `<div class="empty">${t("routine.empty")}</div>`
      : `<ul class="list">${items.map((r) => `
        <li class="list-item"><div><div class="title">${UI.escape(r.title)}</div>
        <div class="sub">${UI.escape(r.startTime)} – ${UI.escape(r.endTime)} · ${t("routine." + r.repeatType)}</div></div>
        <button class="btn btn-ghost btn-sm" data-del="${r.id}">${UI.icon("trash", 14)}</button></li>`).join("")}</ul>`;
    return `
      ${pageHeader(t("routine.title"), t("routine.subtitle"))}
      <div class="grid cols-2">
        <div class="card"><h2>${t("routine.title")}</h2>${listHtml}</div>
        <div class="card"><h2>${t("routine.activity")}</h2>
          <div class="field"><label>${t("routine.activity")}</label><input class="input" id="r-title"></div>
          <div class="grid cols-2">
            <div class="field"><label>${t("routine.start")}</label><input type="time" class="input" id="r-start" value="08:00"></div>
            <div class="field"><label>${t("routine.end")}</label><input type="time" class="input" id="r-end" value="09:00"></div>
          </div>
          <div class="field"><label>${t("routine.repeat")}</label>
            <select class="select" id="r-repeat">
              <option value="daily">${t("routine.daily")}</option>
              <option value="weekdays">${t("routine.weekdays")}</option>
              <option value="once">${t("routine.once")}</option>
            </select></div>
          <div class="field"><label>${t("routine.description")}</label><input class="input" id="r-desc"></div>
          <button class="btn btn-primary btn-block" id="r-save">${t("common.add")}</button>
        </div>
      </div>
      <script>
        (function(){
          document.getElementById("r-save").addEventListener("click",function(){
            var body={title:document.getElementById("r-title").value,startTime:document.getElementById("r-start").value,endTime:document.getElementById("r-end").value,repeatType:document.getElementById("r-repeat").value,description:document.getElementById("r-desc").value,repeatDays:[],customDates:[]};
            api("/api/routines",{method:"POST",body:body}).then(function(){UI.toast("Saved","success");render();}).catch(function(e){UI.toast(e.message,"error");});
          });
          document.addEventListener("click",function(e){ if(e.target.matches("[data-del]")){ var id=e.target.dataset.del; api("/api/routines/"+id,{method:"DELETE"}).then(function(){UI.toast("Deleted","success");render();}).catch(function(e){UI.toast(e.message,"error");}); } });
        })();
      <\/script>
    `;
  }

  async function pageStatistics() {
    const s = await api("/api/stats");
    const lang = I18N.lang;
    const bars = s.bySubject.map((b) => `
      <div class="card" style="padding:14px">
        <div class="row between mb-2"><strong>${UI.escape(b.subject)}</strong><span class="text-sm text-muted">${b.completed}/${b.total} · ${b.percent}%</span></div>
        <div style="height:8px;background:var(--surface-muted);border-radius:999px;overflow:hidden"><div style="width:${b.percent}%;height:100%;background:var(--primary)"></div></div>
      </div>`).join("");
    return `
      ${pageHeader(t("stats.title"))}
      <div class="grid cols-4 mb-6">
        <div class="card stat-card"><div class="label">${t("stats.hours")}</div><div class="value">${UI.formatMinutes(s.overall.totalStudyMinutes, lang)}</div></div>
        <div class="card stat-card"><div class="label">${t("stats.pages")}</div><div class="value">${s.overall.totalPagesStudied}</div></div>
        <div class="card stat-card"><div class="label">${t("stats.overall")}</div><div class="value">${s.overall.overallProgress}%</div></div>
        <div class="card stat-card"><div class="label">${t("dashboard.remaining")}</div><div class="value">${s.overall.remainingTasks}</div></div>
      </div>
      <div class="grid cols-3 mb-6">
        ${s.daily.map((d) => `
          <div class="card" style="padding:14px"><div class="text-xs text-muted">${UI.escape(d.date)}</div>
          <div class="value" style="font-size:1.2rem;font-weight:700;margin-top:4px">${d.completionPercent}%</div>
          <div class="text-xs text-muted">${d.completedTasks}/${d.completedTasks + d.remainingTasks} ${t("common.tasks")}</div></div>`).join("")}
      </div>
      <div class="card"><h2>${t("stats.bySubject")}</h2>${bars || `<div class="empty">${t("common.empty")}</div>`}</div>
    `;
  }

  async function pageNotifications() {
    const data = await api("/api/notifications");
    const items = data.items;
    const listHtml = items.length === 0
      ? `<div class="empty">${t("notifications.empty")}</div>`
      : `<ul class="list">${items.map((n) => `
        <li class="list-item"><div><div class="title ${n.read ? "text-muted" : ""}">${UI.escape(n.title)}</div>
        <div class="sub">${UI.escape(n.body)}</div></div>${!n.read ? `<button class="btn btn-ghost btn-sm" data-read="${n.id}">${UI.icon("check", 14)}</button>` : ""}</li>`).join("")}</ul>`;
    return `
      ${pageHeader(t("notifications.title"))}
      <div class="card">
        <div class="row mb-4"><div class="spacer"></div><button class="btn btn-outline btn-sm" id="markAll">${t("notifications.markAll")}</button></div>
        ${listHtml}
      </div>
      <script>
        (function(){
          document.getElementById("markAll").addEventListener("click",function(){ api("/api/notifications",{method:"POST",body:{all:true}}).then(function(){render();}).catch(function(e){UI.toast(e.message,"error");}); });
          document.addEventListener("click",function(e){ if(e.target.matches("[data-read]")){ api("/api/notifications",{method:"POST",body:{id:e.target.dataset.read}}).then(function(){render();}); } });
        })();
      <\/script>
    `;
  }

  async function pageProfile() {
    const p = state.profile;
    return `
      ${pageHeader(t("profile.title"), t("profile.subtitle"))}
      <div class="card" style="max-width:640px">
        <div class="field"><label>${t("auth.fullName")}</label><input class="input h-lg" id="p-name" value="${UI.escape(p.fullName)}"></div>
        <div class="field"><label>${t("auth.phone")}</label><input class="input h-lg" value="${UI.escape(p.phoneNumber)}" disabled></div>
        <button class="btn btn-primary" id="p-save">${t("common.save")}</button>
      </div>
      <script>
        (function(){ document.getElementById("p-save").addEventListener("click",function(){ api("/api/profile",{method:"PATCH",body:{fullName:document.getElementById("p-name").value}}).then(function(){UI.toast("Saved","success");}).catch(function(e){UI.toast(e.message,"error");}); }); })();
      <\/script>
    `;
  }

  async function pageSettings() {
    const p = state.profile;
    const lang = I18N.lang;
    return `
      ${pageHeader(t("settings.title"))}
      <div class="card" style="max-width:640px">
        <div class="field"><label>${t("settings.language")}</label>
          <select class="select" id="s-lang">
            <option value="ar" ${p.preferredLanguage === "ar" ? "selected" : ""}>${t("common.arabic")}</option>
            <option value="en" ${p.preferredLanguage === "en" ? "selected" : ""}>${t("common.english")}</option>
          </select></div>
        <div class="field"><label>${t("settings.theme")}</label>
          <select class="select" id="s-theme">
            <option value="system" ${p.theme === "system" ? "selected" : ""}>${t("common.system")}</option>
            <option value="light" ${p.theme === "light" ? "selected" : ""}>${t("common.light")}</option>
            <option value="dark" ${p.theme === "dark" ? "selected" : ""}>${t("common.dark")}</option>
          </select></div>
        <div class="field"><label>${t("settings.session")} (min)</label><input type="number" class="input" id="s-session" value="${p.preferredSessionMinutes}"></div>
        <div class="field"><label>${t("settings.daily")} (min)</label><input type="number" class="input" id="s-daily" value="${p.dailyStudyMinutes}"></div>
        <div class="field"><label>${t("settings.restDays")}</label>
          <select class="select" id="s-rest" multiple style="min-height:90px">
            ${["sunday","monday","tuesday","wednesday","thursday","friday","saturday"].map((d,i)=>`<option value="${i}" ${(p.restDays||[]).includes(i)?"selected":""}>${t("weekdays."+d)}</option>`).join("")}
          </select></div>
        <button class="btn btn-primary" id="s-save">${t("common.save")}</button>
      </div>
      <script>
        (function(){ document.getElementById("s-save").addEventListener("click",function(){
          var body={preferredLanguage:document.getElementById("s-lang").value,theme:document.getElementById("s-theme").value,preferredSessionMinutes:Number(document.getElementById("s-session").value),dailyStudyMinutes:Number(document.getElementById("s-daily").value),restDays:[...document.getElementById("s-rest").selectedOptions].map(function(o){return Number(o.value);})};
          api("/api/profile",{method:"PATCH",body:body}).then(function(d){ UI.toast("Saved","success"); switchLang(body.preferredLanguage); applyTheme(body.theme); render(); }).catch(function(e){UI.toast(e.message,"error");});
        }); })();
      <\/script>
    `;
  }

  async function pageSubscription() {
    const s = await api("/api/subscription");
    const lang = I18N.lang;
    const sub = s.subscription;
    if (!sub) return `${pageHeader(t("subscription.title"))}<div class="card" style="max-width:560px"><div class="empty">${t("common.empty")}</div></div>`;
    return `
      ${pageHeader(t("subscription.title"))}
      <div class="card" style="max-width:560px">
        <div class="row py-3" style="border-bottom:1px solid var(--border)"><span class="text-sm text-muted">${t("subscription.plan")}</span><strong>${t("subscription."+sub.planType)}</strong></div>
        <div class="row py-3" style="border-bottom:1px solid var(--border)"><span class="text-sm text-muted">${t("subscription.status")}</span>${UI.badge(sub.status)}</div>
        <div class="row py-3" style="border-bottom:1px solid var(--border)"><span class="text-sm text-muted">${t("subscription.started")}</span><span class="text-sm">${UI.formatDateTime(sub.startedAt, lang)}</span></div>
        <div class="row py-3"><span class="text-sm text-muted">${t("subscription.expires")}</span><span class="text-sm">${UI.formatDateTime(sub.expiresAt, lang)}</span></div>
        ${sub.status !== "active" ? `<p class="text-sm text-muted mt-3">${t("subscription.expiredHint")}</p>` : ""}
      </div>
    `;
  }

  // ===== Admin pages =====
  async function pageAdminOverview() {
    const d = await api("/api/admin/overview");
    const cards = [
      { label: t("nav.students"), value: d.totalStudents },
      { label: t("nav.subscriptions"), value: d.activeSubscriptions },
      { label: t("subscription.expired"), value: d.expiredSubscriptions },
      { label: t("nav.codes"), value: d.availableCodes },
      { label: t("nav.devices"), value: d.pendingDeviceRequests },
      { label: t("nav.logs"), value: d.recentActivities.length },
    ];
    return `
      ${pageHeader(t("admin.overview"))}
      <div class="grid cols-3 mb-6">${cards.map((c) => `<div class="card stat-card"><div class="label">${UI.escape(c.label)}</div><div class="value">${UI.escape(String(c.value))}</div></div>`).join("")}</div>
      <div class="card"><h2>${t("nav.logs")}</h2>
        <ul class="list">${d.recentActivities.map((l) => `<li class="list-item"><div><div class="title">${UI.escape(l.actorName)}</div><div class="sub">${UI.escape(l.action)}</div></div><span class="text-xs text-muted">${UI.formatDateTime(l.timestamp, I18N.lang)}</span></li>`).join("") || `<div class="empty">${t("common.empty")}</div>`}</ul>
      </div>
    `;
  }

  async function pageAdminStudents() {
    const data = await api("/api/admin/students");
    const lang = I18N.lang;
    const rows = data.items.map((s) => `
      <tr>
        <td><a href="/admin/students/${s.id}">${UI.escape(s.fullName)}</a></td>
        <td class="text-sm">${UI.escape(s.phoneNumber)}</td>
        <td class="text-sm">${UI.formatDate(s.createdAt, lang)}</td>
        <td>${UI.badge(s.accountStatus)}</td>
        <td><button class="btn btn-sm btn-outline" data-toggle="${s.id}" data-status="${s.accountStatus}">${s.accountStatus === "suspended" ? t("common.restore") : t("common.suspend")}</button></td>
      </tr>`).join("");
    return `
      ${pageHeader(t("nav.students"))}
      <div class="card">
        <div class="field"><label>${t("common.search")}</label><input class="input" id="q" placeholder="${t("common.search")}"></div>
        ${data.items.length === 0 ? `<div class="empty">${t("common.empty")}</div>` : `
        <div class="table-wrap"><table>
          <thead><tr><th>${t("auth.fullName")}</th><th>${t("auth.phone")}</th><th>${t("common.created")}</th><th>${t("common.status")}</th><th>${t("common.actions")}</th></tr></thead>
          <tbody id="tbody">${rows}</tbody>
        </table></div>`}
      </div>
      <script>
        (function(){
          document.getElementById("q").addEventListener("input",function(){ var v=this.value.toLowerCase(); document.querySelectorAll("#tbody tr").forEach(function(tr){ tr.style.display=tr.textContent.toLowerCase().includes(v)?"":"none"; }); });
          document.addEventListener("click",function(e){ var b=e.target.closest("[data-toggle]"); if(!b) return;
            var next=b.dataset.status==="suspended"?"active":"suspended";
            api("/api/admin/students/"+b.dataset.toggle,{method:"PATCH",body:{accountStatus:next}}).then(function(){UI.toast("Updated","success");render();}).catch(function(err){UI.toast(err.message,"error");});
          });
        })();
      <\/script>
    `;
  }

  async function pageAdminStudent(id) {
    const d = await api("/api/admin/students/" + id);
    const s = d.student;
    const lang = I18N.lang;
    return `
      ${pageHeader(s.fullName, s.phoneNumber)}
      <div class="grid cols-2">
        <div class="card"><h2>${t("admin.studentDetails")}</h2>
          <div class="row py-2" style="border-bottom:1px solid var(--border)"><span class="text-sm text-muted">${t("auth.phone")}</span><span>${UI.escape(s.phoneNumber)}</span></div>
          <div class="row py-2" style="border-bottom:1px solid var(--border)"><span class="text-sm text-muted">${t("common.created")}</span><span class="text-sm">${UI.formatDate(s.createdAt, lang)}</span></div>
          <div class="row py-2"><span class="text-sm text-muted">${t("common.status")}</span>${UI.badge(s.accountStatus)}</div>
        </div>
        <div class="card"><h2>${t("dashboard.subscription")}</h2>
          ${d.subscription ? `
            <div class="row py-2" style="border-bottom:1px solid var(--border)"><span class="text-sm text-muted">${t("subscription.plan")}</span><span>${t("subscription."+d.subscription.planType)}</span></div>
            <div class="row py-2"><span class="text-sm text-muted">${t("subscription.expires")}</span><span class="text-sm">${UI.formatDateTime(d.subscription.expiresAt, lang)}</span></div>` : `<div class="empty">${t("common.empty")}</div>`}
        </div>
      </div>
    `;
  }

  async function pageAdminCodes() {
    const data = await api("/api/admin/codes");
    const lang = I18N.lang;
    const filters = ["", "available", "active", "revoked", "suspended"];
    const rows = data.items.map((c) => `
      <tr>
        <td class="font-mono tracking-wider">${UI.escape(c.codePrefix)}••••</td>
        <td class="text-sm">${t("subscription."+c.planType)}</td>
        <td class="text-sm text-muted">${UI.formatDate(c.createdAt, lang)}</td>
        <td>${UI.badge(c.status)}</td>
        <td><div class="flex gap-2" style="display:flex;gap:6px">
          ${c.status === "available" ? `<button class="btn btn-sm btn-outline" data-code="${c.id}" data-status="suspended">${t("common.suspend")}</button><button class="btn btn-sm btn-danger" data-code="${c.id}" data-status="revoked">${t("common.revoke")}</button>` : ""}
        </div></td>
      </tr>`).join("");
    return `
      ${pageHeader(t("nav.codes"), t("admin.codesHint"))}
      <div class="card mb-4">
        <h3>${t("admin.generateCodes")}</h3>
        <div class="grid cols-3">
          <div class="field"><label>${t("admin.planType")}</label>
            <select class="select" id="g-plan">
              <option value="weekly">${t("subscription.weekly")}</option>
              <option value="monthly">${t("subscription.monthly")}</option>
              <option value="quarterly">${t("subscription.quarterly")}</option>
              <option value="yearly">${t("subscription.yearly")}</option>
            </select></div>
          <div class="field"><label>${t("admin.quantity")}</label><input type="number" class="input" id="g-qty" value="1" min="1" max="100"></div>
          <div class="field"><label>${t("common.notes")}</label><input class="input" id="g-notes"></div>
        </div>
        <button class="btn btn-primary" id="g-gen">${UI.icon("plus", 16)} ${t("common.generate")}</button>
        <div id="genResult" class="mt-3"></div>
      </div>
      <div class="flex gap-2 mb-3" id="filters">${filters.map((f) => `<button class="btn btn-sm btn-outline" data-filter="${f}">${f ? t("status."+f) : t("common.all")}</button>`).join("")}</div>
      <div class="card">
        ${data.items.length === 0 ? `<div class="empty">${t("common.empty")}</div>` : `
        <div class="table-wrap"><table>
          <thead><tr><th>${t("admin.code")}</th><th>${t("admin.planType")}</th><th>${t("common.created")}</th><th>${t("common.status")}</th><th>${t("common.actions")}</th></tr></thead>
          <tbody id="cbody">${rows}</tbody>
        </table></div>`}
      </div>
      <script>
        (function(){
          document.getElementById("g-gen").addEventListener("click",function(){
            api("/api/admin/codes",{method:"POST",body:{planType:document.getElementById("g-plan").value,quantity:Number(document.getElementById("g-qty").value),notes:document.getElementById("g-notes").value}}).then(function(r){
              var html="<div class='card' style='background:var(--surface-muted)'><div class='row between mb-2'><strong>"+r.codes.length+" "+t("admin.codes")+"</strong>"+
                "<button class='btn btn-sm btn-outline' id='copyBatch'>"+t("admin.copyBatch")+"</button></div><ul>"+
                r.codes.map(function(c){return "<li class='font-mono text-sm'>"+UI.escape(c.plaintext)+"</li>";}).join("")+"</ul></div>";
              var box=document.getElementById("genResult"); box.innerHTML=html;
              document.getElementById("copyBatch").addEventListener("click",function(){ navigator.clipboard.writeText(r.codes.map(function(c){return c.plaintext;}).join("\n")); UI.toast(t("common.copied"),"success"); });
              render();
            }).catch(function(e){UI.toast(e.message,"error");});
          });
          document.addEventListener("click",function(e){ var b=e.target.closest("button"); if(!b) return;
            if(b.dataset.filter!==undefined){ var f=b.dataset.filter; history.pushState({}, "", "/admin/codes"+(f?"?status="+f:"")); render(); return; }
            if(b.dataset.code){ api("/api/admin/codes/"+b.dataset.code,{method:"PATCH",body:{status:b.dataset.status}}).then(function(){UI.toast("Updated","success");render();}).catch(function(err){UI.toast(err.message,"error");}); }
          });
        })();
      <\/script>
    `;
  }

  async function pageAdminSubscriptions() {
    const data = await api("/api/admin/subscriptions");
    const lang = I18N.lang;
    const rows = data.items.map((s) => `
      <tr>
        <td>${UI.escape(s.studentName || s.studentId)}</td>
        <td class="text-sm">${UI.escape(s.studentPhone || "")}</td>
        <td class="text-sm">${t("subscription."+s.planType)}</td>
        <td class="text-sm text-muted">${UI.formatDate(s.expiresAt, lang)}</td>
        <td>${UI.badge(s.status)}</td>
        <td><div class="flex gap-2" style="display:flex;gap:6px">
          <button class="btn btn-sm btn-outline" data-sub="${s.id}" data-action="renew">${t("common.renew")}</button>
          ${s.status === "active" ? `<button class="btn btn-sm btn-outline" data-sub="${s.id}" data-action="suspend">${t("common.suspend")}</button>` : ""}
          ${s.status !== "revoked" ? `<button class="btn btn-sm btn-danger" data-sub="${s.id}" data-action="revoke">${t("common.revoke")}</button>` : ""}
        </div></td>
      </tr>`).join("");
    return `
      ${pageHeader(t("nav.subscriptions"))}
      <div class="card">
        ${data.items.length === 0 ? `<div class="empty">${t("common.empty")}</div>` : `
        <div class="table-wrap"><table>
          <thead><tr><th>${t("auth.fullName")}</th><th>${t("auth.phone")}</th><th>${t("subscription.plan")}</th><th>${t("subscription.expires")}</th><th>${t("common.status")}</th><th>${t("common.actions")}</th></tr></thead>
          <tbody>${rows}</tbody>
        </table></div>`}
      </div>
      <script>
        (function(){ document.addEventListener("click",function(e){ var b=e.target.closest("[data-sub]"); if(!b) return;
          api("/api/admin/subscriptions",{method:"POST",body:{subscriptionId:b.dataset.sub,action:b.dataset.action}}).then(function(){UI.toast("Updated","success");render();}).catch(function(err){UI.toast(err.message,"error");});
        }); })();
      <\/script>
    `;
  }

  async function pageAdminDevices() {
    const data = await api("/api/admin/devices");
    const lang = I18N.lang;
    const rows = data.items.map((r) => `
      <tr>
        <td>${UI.escape(r.studentName)}</td>
        <td class="text-sm">${UI.escape(r.currentDeviceName || "—")}</td>
        <td class="text-sm">${UI.escape(r.requestedDeviceName)}</td>
        <td class="text-sm text-muted">${UI.formatDate(r.createdAt, lang)}</td>
        <td>${UI.badge(r.status)}</td>
        <td><div class="flex gap-2" style="display:flex;gap:6px">
          <button class="btn btn-sm btn-success" data-dev="${r.id}" data-approve="1">${t("common.approve")}</button>
          <button class="btn btn-sm btn-danger" data-dev="${r.id}" data-approve="0">${t("common.reject")}</button>
        </div></td>
      </tr>`).join("");
    return `
      ${pageHeader(t("nav.devices"))}
      <div class="card">
        ${data.items.length === 0 ? `<div class="empty">${t("common.empty")}</div>` : `
        <div class="table-wrap"><table>
          <thead><tr><th>${t("auth.fullName")}</th><th>${t("admin.oldDevice")}</th><th>${t("admin.newDevice")}</th><th>${t("common.created")}</th><th>${t("common.status")}</th><th>${t("common.actions")}</th></tr></thead>
          <tbody>${rows}</tbody>
        </table></div>`}
      </div>
      <script>
        (function(){ document.addEventListener("click",function(e){ var b=e.target.closest("[data-dev]"); if(!b) return;
          api("/api/admin/devices",{method:"POST",body:{requestId:b.dataset.dev,approve:b.dataset.approve==="1"}}).then(function(){UI.toast("Updated","success");render();}).catch(function(err){UI.toast(err.message,"error");});
        }); })();
      <\/script>
    `;
  }

  async function pageAdminFiles() {
    const data = await api("/api/admin/files");
    const lang = I18N.lang;
    const rows = data.items.map((j) => `
      <tr>
        <td>${UI.escape(j.originalName)}</td>
        <td class="text-sm">${UI.escape(j.studentId)}</td>
        <td class="text-sm text-muted">${UI.formatDateTime(j.createdAt, lang)}</td>
        <td>${UI.badge(j.status)}</td>
      </tr>`).join("");
    return `
      ${pageHeader(t("nav.files"), t("admin.noAccessFiles"))}
      <div class="card">
        ${data.items.length === 0 ? `<div class="empty">${t("common.empty")}</div>` : `
        <div class="table-wrap"><table>
          <thead><tr><th>${t("common.notes")}</th><th>Student</th><th>${t("common.created")}</th><th>${t("common.status")}</th></tr></thead>
          <tbody>${rows}</tbody>
        </table></div>`}
      </div>
    `;
  }

  async function pageAdminLogs() {
    const data = await api("/api/admin/logs");
    const lang = I18N.lang;
    const rows = data.items.map((l) => `
      <tr>
        <td class="text-sm">${UI.escape(l.actorName)}</td>
        <td class="text-sm">${UI.escape(l.action)}</td>
        <td class="text-sm text-muted">${UI.formatDateTime(l.timestamp, lang)}</td>
      </tr>`).join("");
    return `
      ${pageHeader(t("nav.logs"))}
      <div class="card">
        ${data.items.length === 0 ? `<div class="empty">${t("common.empty")}</div>` : `
        <div class="table-wrap"><table>
          <thead><tr><th>${t("admin.students")}</th><th>${t("common.actions")}</th><th>${t("common.date")}</th></tr></thead>
          <tbody>${rows}</tbody>
        </table></div>`}
      </div>
    `;
  }

  async function pageAdminSettings() {
    const data = await api("/api/admin/settings");
    const s = data.settings;
    return `
      ${pageHeader(t("nav.adminSettings"))}
      <div class="card" style="max-width:560px">
        <div class="field"><label>${t("settings.adminOnly") || "Access mode"}</label>
          <label class="flex gap-2" style="display:flex;align-items:center;gap:8px"><input type="checkbox" id="set-adminonly" ${s.adminOnly ? "checked" : ""}> ${t("settings.adminOnlyHint") || "Admin only — access restricted to the manager"}</label>
          <span class="hint">${t("settings.adminOnlyDesc") || "When on, only admins can sign in or register. Regular students are blocked."}</span>
        </div>
        <div class="field"><label>${t("subscription.maxFileSizeMb", { maxFileSizeMb: s.maxFileSizeMb }) || "Max file size (MB)"}</label><input type="number" class="input" id="set-max" value="${s.maxFileSizeMb}"></div>
        <div class="field"><label>Subscription reminder (days)</label><input type="number" class="input" id="set-reminder" value="${s.subscriptionReminderDays}"></div>
        <div class="field"><label>${t("common.confirm")}</label>
          <label class="flex gap-2" style="display:flex;align-items:center;gap:8px"><input type="checkbox" id="set-reg" ${s.allowRegistrations ? "checked" : ""}> ${t("common.all")}</label>
        </div>
        <button class="btn btn-primary" id="set-save">${t("common.save")}</button>
      </div>
      <script>
        (function(){ document.getElementById("set-save").addEventListener("click",function(){ api("/api/admin/settings",{method:"PATCH",body:{adminOnly:document.getElementById("set-adminonly").checked,maxFileSizeMb:Number(document.getElementById("set-max").value),subscriptionReminderDays:Number(document.getElementById("set-reminder").value),allowRegistrations:document.getElementById("set-reg").checked}}).then(function(){UI.toast("Saved","success");}).catch(function(e){UI.toast(e.message,"error");}); }); })();
      <\/script>
    `;
  }

  // ===== Auth pages =====
  function authShell(inner) {
    return `
      <div class="auth">
        <aside class="auth-aside">
          <div class="brand-mark"><span class="brand-logo"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M2 7l10-4 10 4-10 4z"/><path d="M6 10v5c0 1.5 8 1.5 8 0v-5"/><path d="M22 7v5"/><circle cx="22" cy="13" r="1.4" fill="currentColor" stroke="none"/></svg></span><span>${t("brand.name")}</span></div>
          <div>
            <div class="tagline">${t("brand.tagline")}</div>
            <h1>${t("brand.subtitle")}</h1>
            <p>${t("brand.tagline")}.</p>
          </div>
          <div class="glow-1"></div><div class="glow-2"></div>
        </aside>
        <main class="auth-main"><div class="auth-card">${inner}</div></main>
      </div>
    `;
  }

  async function pageLogin() {
    if (state.user) { location.href = state.user.role === "admin" ? "/admin" : "/dashboard"; return ""; }
    return authShell(`
      <h1>${t("auth.loginTitle")}</h1>
      <p class="sub mb-4">${t("auth.loginHint")}</p>
      <form id="loginForm">
        <div class="field"><label>${t("auth.phone")}</label><input class="input h-lg" id="phone" required></div>
        <div class="field"><label>${t("auth.password")}</label><input class="input h-lg" type="password" id="password" required></div>
        <button class="btn btn-primary btn-block btn-lg" type="submit" id="loginBtn">${t("auth.signIn")}</button>
      </form>
      <div class="hint" style="margin-top:14px">${t("auth.managerHint")}</div>
      <div class="row mt-4 text-sm">
        <a href="/forgot-password">${t("auth.forgot")}</a>
        <div class="spacer"></div>
        <span class="text-muted">${t("auth.noAccount")} <a href="/activate">${t("auth.activateLink")}</a></span>
      </div>
      <script>
        (function(){
          document.getElementById("loginForm").addEventListener("submit",function(e){ e.preventDefault();
            api("/api/auth/login",{method:"POST",body:{phoneNumber:document.getElementById("phone").value,password:document.getElementById("password").value}}).then(function(r){
              if(r.deviceMismatch){ UI.modal({title:t("auth.deviceTitle"),body:"<p class='text-sm'>"+UI.escape(r.currentDeviceName||"")+"</p>",actions:[{label:t("auth.requestChange"),variant:"primary",onClick:function(){ api("/api/auth/device-change",{method:"POST",body:{phoneNumber:document.getElementById("phone").value,password:document.getElementById("password").value}}).then(function(){UI.toast(t("auth.requestSent"),"success");}); }},{label:t("common.cancel"),variant:"outline"}]}); return; }
              location.href = r.user.role==="admin" ? "/admin" : "/dashboard";
            }).catch(function(err){ UI.toast(err.message,"error"); });
          });
        })();
      <\/script>
    `);
  }

  async function pageRegister() {
    return authShell(`
      <h1>${t("auth.registerTitle")}</h1>
      <p class="sub mb-4">${t("auth.registerHint")}</p>
      <form id="regForm">
        <div class="field"><label>${t("auth.fullName")}</label><input class="input h-lg" id="name" required></div>
        <div class="field"><label>${t("auth.phone")}</label><input class="input h-lg" id="phone" required></div>
        <div class="field"><label>${t("auth.password")}</label><input class="input h-lg" type="password" id="password" required><span class="hint">${t("auth.passwordRule")}</span></div>
        <button class="btn btn-primary btn-block btn-lg" type="submit">${t("auth.createAccount")}</button>
      </form>
      <p class="text-sm mt-4 text-muted">${t("auth.haveAccount")} <a href="/login">${t("auth.signIn")}</a></p>
      <script>
        (function(){ document.getElementById("regForm").addEventListener("submit",function(e){ e.preventDefault();
          api("/api/auth/register",{method:"POST",body:{fullName:document.getElementById("name").value,phoneNumber:document.getElementById("phone").value,password:document.getElementById("password").value}}).then(function(r){ location.href=(r.user&&r.user.role==="admin")?"/admin":"/dashboard"; }).catch(function(err){ if(err.code==="NO_CODE"){ location.href="/activate"; return; } UI.toast(err.message,"error"); });
        }); })();
      <\/script>
    `);
  }

  async function pageActivate() {
    return authShell(`
      <h1>${t("auth.activateTitle")}</h1>
      <p class="sub mb-4">${t("auth.activateHint")}</p>
      <form id="actForm">
        <div class="field"><label>${t("auth.code")}</label><input class="input h-lg font-mono tracking-wider" id="code" placeholder="STUFY-XXXX-XXXX-XXXX" required></div>
        <button class="btn btn-primary btn-block btn-lg" type="submit">${t("auth.continue")}</button>
      </form>
      <p class="text-sm mt-4 text-muted">${t("auth.haveAccount")} <a href="/login">${t("auth.signIn")}</a></p>
      <script>
        (function(){ document.getElementById("actForm").addEventListener("submit",function(e){ e.preventDefault();
          api("/api/auth/validate-code",{method:"POST",body:{code:document.getElementById("code").value.toUpperCase()}}).then(function(){ location.href="/register"; }).catch(function(err){ UI.toast(err.message,"error"); });
        }); })();
      <\/script>
    `);
  }

  async function pageForgot() {
    return authShell(`
      <h1>${t("auth.forgotTitle")}</h1>
      <p class="sub mb-4">${t("auth.forgotHint")}</p>
      <form id="forgotForm">
        <div class="field"><label>${t("auth.phone")}</label><input class="input h-lg" id="phone" required></div>
        <button class="btn btn-primary btn-block btn-lg" type="submit">${t("auth.sendRequest")}</button>
      </form>
      <a href="/login" class="text-sm mt-4" style="display:inline-block">${t("common.back")}</a>
      <script>
        (function(){ document.getElementById("forgotForm").addEventListener("submit",function(e){ e.preventDefault();
          api("/api/auth/forgot-password",{method:"POST",body:{phoneNumber:document.getElementById("phone").value}}).then(function(){ UI.toast(t("auth.requestSent"),"success"); document.getElementById("forgotForm").innerHTML="<p class='text-sm' style='color:var(--success)'>"+t("auth.requestSent")+"</p>"; }).catch(function(err){ UI.toast(err.message,"error"); });
        }); })();
      <\/script>
    `);
  }

  // ===== Router =====
  const routes = [
    ["/login", pageLogin, true],
    ["/register", pageRegister, true],
    ["/activate", pageActivate, true],
    ["/forgot-password", pageForgot, true],
    ["/", pageDashboard],
    ["/dashboard", pageDashboard],
    ["/library", pageLibrary],
    ["/plans", pagePlans],
    ["/plans/new", pagePlanNew],
    ["/plans/:id", pagePlanDetail],
    ["/tasks", pageTasks],
    ["/calendar", pageCalendar],
    ["/routine", pageRoutine],
    ["/statistics", pageStatistics],
    ["/notifications", pageNotifications],
    ["/profile", pageProfile],
    ["/settings", pageSettings],
    ["/subscription", pageSubscription],
    ["/admin", pageAdminOverview],
    ["/admin/students", pageAdminStudents],
    ["/admin/students/:id", pageAdminStudent],
    ["/admin/codes", pageAdminCodes],
    ["/admin/subscriptions", pageAdminSubscriptions],
    ["/admin/devices", pageAdminDevices],
    ["/admin/files", pageAdminFiles],
    ["/admin/logs", pageAdminLogs],
    ["/admin/settings", pageAdminSettings],
  ];

  function matchRoute(path) {
    for (const [pattern, handler, isAuth] of routes) {
      const pp = pattern.split("/").filter(Boolean);
      const ap = path.split("/").filter(Boolean);
      if (pp.length !== ap.length) continue;
      const params = {};
      let ok = true;
      for (let i = 0; i < pp.length; i++) {
        if (pp[i].startsWith(":")) params[pp[i].slice(1)] = ap[i];
        else if (pp[i] !== ap[i]) { ok = false; break; }
      }
      if (ok) return { handler, params, isAuth };
    }
    return null;
  }

  async function render() {
    const path = location.pathname.replace(/\/+$/, "") || "/";
    const match = matchRoute(path);
    if (!match) {
      document.body.innerHTML = `<div class="auth"><main class="auth-main"><div class="auth-card"><h1>404</h1><p class="sub">Not found</p><a href="/">${t("common.back")}</a></div></main></div>`;
      return;
    }

    const isAuth = match.isAuth;
    if (!state.user && !isAuth) {
      location.href = "/login";
      return;
    }
    if (state.user && isAuth) {
      location.href = state.user.role === "admin" ? "/admin" : "/dashboard";
      return;
    }
    // Admin guard
    if (state.user && state.user.role !== "admin" && path.startsWith("/admin")) {
      location.href = "/dashboard";
      return;
    }
    if (state.user && state.user.role === "admin" && !path.startsWith("/admin")) {
      location.href = "/admin";
      return;
    }

    try {
      let html;
      if (isAuth) {
        document.body.innerHTML = UI.spinner();
        html = await match.handler();
        document.body.innerHTML = html;
        execScripts(document.body);
      } else {
        // load notifications count for badge
        try {
          const n = await api("/api/notifications");
          state.unread = n.unread || 0;
        } catch { state.unread = 0; }
        let node = document.createElement("div");
        html = await match.handler(match.params.id, match.params);
        node.innerHTML = html;
        renderShell(node);
      }
      window.scrollTo(0, 0);
    } catch (err) {
      UI.toast(err.message || t("common.error"), "error");
    }
  }

  window.addEventListener("popstate", () => render());
  window.addEventListener("study:render", () => render());

  window.render = render;
  window.applyTheme = applyTheme;
  window.state = state;

  async function boot() {
    await loadI18n();
    applyTheme((state.profile && state.profile.theme) || "system");
    const user = await loadSession();
    if (user && state.profile) applyTheme(state.profile.theme || "system");
    await render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
