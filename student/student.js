"use strict";
const $ = (s) => document.querySelector(s),
  esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
let account;
try {
  account = JSON.parse(sessionStorage.getItem("oufu-demo-session") || "null");
} catch {}
if (!account || account.role !== "student") {
  location.replace("../index.html");
  throw new Error("Student demo session required");
}
const key = "oufu-student-v1:" + encodeURIComponent(account.username);
let records = {},
  view = "home",
  recordIndex = 0,
  query = "",
  dirty = false,
  blocked = false;
try {
  const stored = localStorage.getItem(key);
  if (stored) {
    const parsed = JSON.parse(stored);
    if (!parsed || parsed.version !== 1 || typeof parsed.records !== "object")
      throw Error();
    records = parsed.records;
  }
} catch {
  blocked = true;
}
for (const m of SCHEMA) {
  if (!Array.isArray(records[m.id]) || !records[m.id].length)
    records[m.id] = [{ values: {} }];
}
const stages = [
  "资料准备中",
  "申请中",
  "行前培训中",
  "留学第一年",
  "留学第二年",
];
$("#account-name").textContent = account.username;
$("#avatar").textContent = account.username.slice(0, 1).toUpperCase();
function notify(text) {
  $("#notice").textContent = text;
  $("#notice").hidden = false;
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => ($("#notice").hidden = true), 4000);
}
let saveTimer = null;
let lastStored;
try { lastStored = localStorage.getItem(key); } catch { blocked = true; }
let saveStatusText="自动保存到本机", saveStatusKind="idle";
function stamp(date=new Date()) {
 const parts=new Intl.DateTimeFormat("zh-CN",{timeZone:"Asia/Shanghai",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(date);
 const v=Object.fromEntries(parts.map(p=>[p.type,p.value]));
 return v.year+"."+v.month+"."+v.day+" "+v.hour+":"+v.minute;
}
function setSaveStatus(text,kind="idle") {
 saveStatusText=text; saveStatusKind=kind;
 const el=$("#save-state");
 if(el){el.className="save-state "+kind;el.innerHTML=(kind==="saved"?'<i class="ti ti-circle-check" aria-hidden="true"></i> ':"")+esc(text)}
}
function scheduleSave(composing = false) {
  clearTimeout(saveTimer);
  setSaveStatus("自动保存中...", "saving");
  if (!composing) saveTimer = setTimeout(() => save(), 800);
}
function flushSave() { clearTimeout(saveTimer); return !dirty || save(); }
// This synchronous local adapter is the future server persistence boundary.
// Server version should serialize requests and use revision/ETag conflict checks.
function save() {
  clearTimeout(saveTimer);
  if (blocked) {
    setSaveStatus("自动保存已暂停，请保留当前页面");
    notify("本地资料冲突或读取异常，未覆盖。请保留当前页面并联系管理员。");
    return false;
  }
  try {
    if (localStorage.getItem(key) !== lastStored) {
      blocked = true;
      setSaveStatus("其他窗口已修改资料，保存已暂停");
      notify("其他窗口已修改资料。为避免覆盖，请保留当前页面，不要刷新或关闭。");
      return false;
    }
    localStorage.setItem(
      key,
      JSON.stringify({
        version: 1,
        records,
        updatedAt: new Date().toISOString(),
      }),
    );
    lastStored = localStorage.getItem(key);
    dirty = false;
    setSaveStatus("已自动保存 "+stamp(), "saved");
    notify("✓ "+saveStatusText);
    return true;
  } catch {
    setSaveStatus("自动保存失败，请保留当前页面");
    notify("保存失败，输入仍保留在页面，请保留当前页面。");
    return false;
  }
}
function allowsNA(m,f) {
  return f.allowNA === true || (m.id === "m0" && ["中间名","曾用名／其他姓名","曾用名","姓名变更日期","姓名后缀"].includes(f.label));
}
function stats(moduleId) {
  let total=0,filled=0;
  for(const m of SCHEMA) {
    if(moduleId && m.id!==moduleId) continue;
    for(const f of m.fields) {
      total++;
      const v=records[m.id][0].values?.[f.id];
      if(v && (String(v.value??"").trim() || (allowsNA(m,f) && v.na===true))) filled++;
    }
  }
  return {total,filled,pending:total-filled,percent:total?Math.round(filled/total*100):0};
}
const moduleIcons = [
  "id",
  "map-pin",
  "shield-check",
  "school",
  "books",
  "certificate",
  "briefcase",
  "flask",
  "file-text",
  "award",
  "users",
  "pencil",
  "building",
  "forms",
  "history",
  "wallet",
  "folders",
  "list-check",
  "send",
  "clipboard-check",
];
function menu() {
  const allowed = account.role === "student" ? SCHEMA : [];
  $("#modules").innerHTML = allowed
    .map(
      (m, i) =>
        '<li class="side-nav-item"><button data-view="' +
        m.id +
        '" class="side-nav-link ' +
        (view === m.id ? "active" : "") +
        '" ' +
        (view === m.id ? 'aria-current="page"' : "") +
        '><span class="menu-icon"><i class="ti ti-' +
        moduleIcons[i] +
        '" aria-hidden="true"></i></span><span class="menu-text">' +
        esc(m.title) +
        '</span><span class="pending-badge" title="未填写数量">'+stats(m.id).pending+'</span></button></li>',
    )
    .join("");
  $(".nav-home").classList.toggle("active", view === "home");
}
function heading(title, sub) {
  return (
    '<div class="page-heading"><div><span class="eyebrow">OUFU / STUDENT SPACE</span><h1>' +
    esc(title) +
    '</h1><span class="muted">' +
    esc(sub) +
    '</span></div></div>'
  );
}
function home() {
  const s = stats();
  return (
    heading("我的个人中心", "你的留学旅程，从这里展开。") +
    '<div class="card welcome"><div class="card-body"><span class="eyebrow">YOUR NEXT CHAPTER</span><h2>Welcome, ' +
    esc(account.username) +
    '.</h2><p>把资料准备好，把未来交给每一个认真选择的自己。</p><span class="welcome-label">目前进度 · 资料准备中</span></div></div><div class="dashboard-grid"><div class="card"><div class="card-body"><div class="metric-label">申请资料完成度</div><div class="metric">' +
    s.percent +
    '<small>%</small></div><div class="progress"><div class="progress-bar" style="width:' +
    s.percent +
    '%"></div></div></div></div><div class="card"><div class="card-body"><div class="metric-label">已填写字段</div><div class="metric">' +
    s.filled +
    ' <small class="muted">/ ' +
    s.total +
    '</small></div></div></div><div class="card"><div class="card-body"><div class="metric-label">尚未填写</div><div class="metric">' +
    s.pending +
    '</div><small class="muted">填写或勾选不适用即可完成</small></div></div></div><div class="card"><div class="card-body"><h2 class="section-title">我的留学进度</h2><ol class="stage-list">' +
    stages
      .map(
        (s, i) =>
          '<li class="' +
          (!i ? "active" : "") +
          '"><b>' +
          String(i + 1).padStart(2, "0") +
          "</b>" +
          s +
          "</li>",
      )
      .join("") +
    '</ol><small class="muted">演示进度，后续由公司工作人员更新。</small></div></div><div class="card"><div class="card-body"><h2 class="section-title">从这些资料开始</h2><div class="quick-links">' +
    ["m0", "m3", "m16"]
      .map(
        (id) =>
          '<button data-view="' +
          id +
          '">' +
          esc(SCHEMA.find((m) => m.id === id).title) +
          "<span>查看并完善资料 ＋</span></button>",
      )
      .join("") +
    "</div></div></div>"
  );
}
function fields() {
 const m=SCHEMA.find(m=>m.id===view),record=records[view][0];
 return m.fields.filter(f=>(f.label+" "+f.english+" "+f.hint).toLowerCase().includes(query.toLowerCase())).map(f=>{
  const v=record.values?.[f.id]||{},id="field-"+f.id,na=allowsNA(m,f)&&v.na===true;
  const long=/说明|描述|素材|答案|职责|成果|计划/.test(f.label);
  return '<div class="field"><div class="field-heading"><label for="'+id+'">'+esc(f.label)+'<span class="required-mark" aria-label="必填"> *</span></label>'+
   (allowsNA(m,f)?'<label class="na-toggle"><input type="checkbox" data-field="'+f.id+'" data-prop="na" '+(na?'checked':'')+'> 不适用</label>':'')+
   '</div><span class="english">'+esc(f.english)+'</span>'+
   (long?'<textarea':'<input type="text"')+' class="form-control" id="'+id+'" data-field="'+f.id+'" data-prop="value" '+(na?'disabled':'required')+
   (!long?' value="'+esc(v.value)+'"':'')+' placeholder="'+(na?'不适用':f.type==='date'?'YYYY-MM-DD 或 YYYY-MM':f.type==='num'?'填写数值':'填写申请用信息')+'"'+
   (long?'>'+esc(v.value)+'</textarea>':'>')+
   '<div class="hint">'+esc(f.hint)+'</div><div class="field-extras"><details'+(v.raw?.trim()?' open':'')+'><summary>特殊情况请备注</summary><textarea class="form-control" aria-label="'+esc(f.label)+'特殊情况备注" data-field="'+f.id+'" data-prop="raw" placeholder="如有特殊情况，请补充说明">'+esc(v.raw)+'</textarea></details></div></div>';
 }).join('') || '<p class="empty">没有匹配的字段。</p>';
}
function modulePage() {
  const m = SCHEMA.find(m => m.id === view);
  return heading(m.title, m.description) +
    '<div class="form-toolbar"><input class="form-control" id="search" placeholder="搜索当前分类的字段" aria-label="搜索字段"><span id="save-state" class="save-state" role="status">' +
    (dirty ? '正在等待自动保存…' : '自动保存到本机') +
    '</span></div><div class="card"><div class="card-body"><div class="field-grid" id="fields">' +
    fields() + '</div></div></div>';
}
function render() {
  menu();
  $("#breadcrumb").textContent =
    view === "home" ? "首页" : SCHEMA.find((m) => m.id === view).title;
  $("#content").innerHTML = view === "home" ? home() : modulePage();
  setSaveStatus(saveStatusText,saveStatusKind);
}
function go(id) {
  if (
    dirty &&
    !save() &&
    !confirm("本地保存未完成，仍切换页面？输入将保留在本次会话中。")
  )
    return;
  view = id;
  recordIndex = 0;
  query = "";
  render();
  closeMenu();
  window.scrollTo(0, 0);
}
function closeMenu() {
  document.body.classList.remove("menu-open");
  $("#shade").hidden = true;
  $("#menu").setAttribute("aria-expanded", "false");
}
document.addEventListener("click", (e) => {
  const nav = e.target.closest("[data-view]");
  if (nav) {
    go(nav.dataset.view);
    return;
  }

});
$("#content").addEventListener("input", (e) => {
  if (e.target.id === "search") {
    query = e.target.value;
    $("#fields").innerHTML = fields();
    return;
  }
  const f = e.target.dataset.field;
  if (!f) return;
  const r = records[view][recordIndex];
  r.values ??= {};
  r.values[f] ??= { value: "", raw: "" };
  const prop=e.target.dataset.prop;
  r.values[f][prop] = prop==="na" ? e.target.checked : e.target.value;
  if(prop==="na"){
    const input=document.getElementById("field-"+f);
    if(input){input.disabled=e.target.checked;input.required=!e.target.checked;}
  }
  menu();
  dirty = true;
  scheduleSave(e.isComposing);
});
$("#menu").onclick = () => {
  const open = document.body.classList.toggle("menu-open");
  $("#shade").hidden = !open;
  $("#menu").setAttribute("aria-expanded", String(open));
};
$("#shade").onclick = closeMenu;
$("#logout").onclick = () => {
  if (
    dirty &&
    !save() &&
    !confirm("保存未完成，确定退出并放弃本次未保存修改？")
  )
    return;
  sessionStorage.removeItem("oufu-demo-session");
  location.href = "../index.html";
};
addEventListener("beforeunload", (e) => {
  if (!flushSave()) {
    e.preventDefault();
    e.returnValue = "";
  }
});
$("#content").addEventListener("focusout", e => {
  if (e.target.dataset.field) flushSave();
});
$("#content").addEventListener("compositionend", e => {
  if (e.target.dataset.field) scheduleSave();
});
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") flushSave();
});
addEventListener("pagehide", flushSave);
render();
if (blocked) notify("本地存储读取失败，保存已暂停。当前修改仅暂存内存，请勿关闭页面。");

$("#top-search").onclick = () => {
  const term = prompt("搜索申请分类，例如：教育、考试、推荐人");
  if (!term?.trim()) return;
  const match = SCHEMA.find((m) => m.title.includes(term.trim()));
  if (match) go(match.id);
  else notify("没有匹配的申请分类");
};
$("#fullscreen").onclick = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    notify("当前浏览器不支持全屏，请使用浏览器的全屏快捷键");
  }
};
