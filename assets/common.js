// أدوات مشتركة بين صفحة الطالب وصفحة المعلم
(function () {
  const C = window.APP_CONFIG;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const L = ["أ", "ب", "ج", "د", "هـ"];
  const TZ = "Asia/Amman";
  const LOC = "ar-JO-u-nu-latn";

  function fmtDT(iso, withDay = true) {
    if (!iso) return "—";
    const o = { timeZone: TZ, day: "numeric", month: "long", hour: "numeric", minute: "2-digit" };
    if (withDay) o.weekday = "long";
    return new Intl.DateTimeFormat(LOC, o).format(new Date(iso));
  }
  function fmtTime(iso) {
    return iso ? new Intl.DateTimeFormat(LOC, { timeZone: TZ, hour: "numeric", minute: "2-digit" }).format(new Date(iso)) : "—";
  }
  // قيمة حقل datetime-local ⇄ ISO (بتوقيت الجهاز، والمفترض أنه الأردن)
  function toLocalInput(iso) {
    const d = iso ? new Date(iso) : new Date();
    const p = (n) => String(n).padStart(2, "0");
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + "T" + p(d.getHours()) + ":" + p(d.getMinutes());
  }
  function fromLocalInput(v) { return v ? new Date(v).toISOString() : null; }
  function mmss(ms) {
    ms = Math.max(0, ms); const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
    const p = (n) => String(n).padStart(2, "0");
    return (h ? h + ":" + p(m) : p(m)) + ":" + p(ss);
  }
  function digits(s) { return String(s || "").replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)); }

  let toastT;
  function toast(msg, isErr) {
    let t = $("toast");
    if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.textContent = msg; t.classList.toggle("err", !!isErr); t.classList.add("on");
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), isErr ? 4200 : 2400);
  }

  // لوحة منبثقة واحدة لكل الصفحة
  function ensureSheet() {
    if ($("sheet")) return;
    const s = document.createElement("div"); s.id = "scrim"; s.className = "scrim"; document.body.appendChild(s);
    const d = document.createElement("div"); d.id = "sheet"; d.className = "sheet"; d.setAttribute("role", "dialog"); d.setAttribute("aria-modal", "true");
    d.innerHTML = '<button class="close" id="sheetX" aria-label="إغلاق">✕</button><div id="sheetBody"></div>';
    document.body.appendChild(d);
    s.onclick = closeSheet; $("sheetX").onclick = closeSheet;
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSheet(); });
  }
  function openSheet(html, wide) {
    ensureSheet(); $("sheetBody").innerHTML = html;
    $("sheet").classList.toggle("wide", !!wide);
    $("sheet").classList.add("on"); $("scrim").classList.add("on"); $("sheet").scrollTop = 0;
    return $("sheetBody");
  }
  function closeSheet() { if ($("sheet")) { $("sheet").classList.remove("on"); $("scrim").classList.remove("on"); } }
  function confirmSheet(title, body, okText, danger) {
    return new Promise((res) => {
      const b = openSheet('<h3>' + esc(title) + '</h3><div class="muted" style="margin-bottom:16px">' + body + '</div>' +
        '<div class="row"><button class="btn ' + (danger ? "danger" : "primary") + ' grow" id="cfOk">' + esc(okText || "تأكيد") + '</button>' +
        '<button class="btn ghost" id="cfNo">إلغاء</button></div>');
      b.querySelector("#cfOk").onclick = () => { closeSheet(); res(true); };
      b.querySelector("#cfNo").onclick = () => { closeSheet(); res(false); };
    });
  }

  // استدعاء دالة في قاعدة البيانات مباشرة (للطالب — بلا مكتبة، أسرع تحميل)
  async function rpcFetch(fn, args, tries = 2) {
    let lastErr;
    for (let i = 0; i <= tries; i++) {
      try {
        const r = await fetch(C.SUPABASE_URL + "/rest/v1/rpc/" + fn, {
          method: "POST",
          headers: { apikey: C.SUPABASE_KEY, "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(args || {})
        });
        const txt = await r.text();
        const data = txt ? JSON.parse(txt) : null;
        if (!r.ok) throw new Error((data && data.message) || ("خطأ " + r.status));
        return data;
      } catch (e) {
        lastErr = e;
        if (!(e instanceof TypeError)) break; // خطأ شبكة فقط يُعاد
        await new Promise((ok) => setTimeout(ok, 700 * (i + 1)));
      }
    }
    throw lastErr instanceof TypeError ? new Error("تعذّر الاتصال بالإنترنت. تحقّق من الشبكة وحاول مجددًا.") : lastErr;
  }

  function setTheme(t) {
    if (t) document.documentElement.setAttribute("data-theme", t); else document.documentElement.removeAttribute("data-theme");
    try { localStorage.setItem("sahm_theme", t || ""); } catch (e) {}
  }
  try { const t0 = localStorage.getItem("sahm_theme"); if (t0) setTheme(t0); } catch (e) {}
  function cycleTheme() {
    const c = document.documentElement.getAttribute("data-theme");
    setTheme(c === "dark" ? "light" : c === "light" ? "" : "dark");
  }

  function download(name, text, type) {
    const blob = new Blob([text], { type: type || "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function csv(rows) {
    return "﻿" + rows.map((r) => r.map((c) => {
      const s = c == null ? "" : String(c);
      return /[",\n\t]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(",")).join("\r\n");
  }

  // ---------- السمات (لكل دور سمته المحفوظة على الجهاز) ----------
  const SKINS = {
    white: { n: "أبيض رسمي", c: ["#ffffff", "#16325a", "#a3742a"], m: "#16325a" },
    navy:  { n: "كحلي ملكي", c: ["#fffdf8", "#0d2340", "#b3842f"], m: "#0d2340" },
    olive: { n: "زيتي", c: ["#fffdf6", "#4b5a2a", "#a57a2b"], m: "#3d4a22" },
    night: { n: "ليلي", c: ["#171b1e", "#b9c37f", "#d2a95b"], m: "#0e1113" }
  };
  let ROLE = "student";
  function applySkin(s) {
    if (!SKINS[s]) s = "white";
    document.documentElement.setAttribute("data-skin", s);
    document.documentElement.setAttribute("data-theme", s === "night" ? "dark" : "light");
    let m = document.querySelector('meta[name="theme-color"]');
    if (!m) { m = document.createElement("meta"); m.name = "theme-color"; document.head.appendChild(m); }
    m.content = SKINS[s].m;
  }
  function initSkin(role, def) {
    ROLE = role; let s = null;
    try { s = localStorage.getItem("sahm_skin_" + role); } catch (e) {}
    applySkin(s || def); return s || def;
  }
  function skinPicker() {
    const cur = document.documentElement.getAttribute("data-skin");
    const b = openSheet('<h3>مظهر المنصة</h3><p class="muted" style="margin-bottom:16px">اختر السمة التي تريحك؛ تُحفظ على هذا الجهاز.</p><div class="skins">' +
      Object.keys(SKINS).map((k) => `<button class="skin ${k === cur ? "on" : ""}" data-skin="${k}"><span class="sw">${SKINS[k].c.map((c) => `<i style="background:${c}"></i>`).join("")}</span><b>${SKINS[k].n}</b></button>`).join("") +
      "</div>");
    b.querySelectorAll("[data-skin]").forEach((x) => (x.onclick = () => {
      applySkin(x.dataset.skin); try { localStorage.setItem("sahm_skin_" + ROLE, x.dataset.skin); } catch (e) {}
      b.querySelectorAll(".skin").forEach((y) => y.classList.toggle("on", y === x));
    }));
  }
  function spin(btn, on, label) {
    if (on) { btn.dataset.l = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spin"></span>' + (label ? esc(label) : ""); }
    else { btn.disabled = false; if (btn.dataset.l) btn.innerHTML = btn.dataset.l; }
  }
  function greet() {
    const h = Number(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "numeric", hour12: false }).format(new Date()));
    return h < 12 ? "صباح الخير" : "مساء الخير";
  }
  function firstName(n) { return String(n || "").trim().split(/\s+/)[0] || ""; }
  function ago(iso) {
    const d = (new Date(iso).getTime() - Date.now()) / 1000, a = Math.abs(d);
    const f = (n, one, two, many) => n === 1 ? one : n === 2 ? two : n + " " + many;
    let s;
    if (a < 3600) s = f(Math.max(1, Math.round(a / 60)), "دقيقة", "دقيقتين", "دقيقة");
    else if (a < 86400) s = f(Math.round(a / 3600), "ساعة", "ساعتين", "ساعات");
    else s = f(Math.round(a / 86400), "يوم", "يومين", "أيام");
    return (d > 0 ? "بعد " : "قبل ") + s;
  }

  window.U = { $, esc, L, fmtDT, fmtTime, toLocalInput, fromLocalInput, mmss, digits, toast, openSheet, closeSheet,
               confirmSheet, rpcFetch, cycleTheme, download, csv, SKINS, applySkin, initSkin, skinPicker, spin, greet, firstName, ago, TZ };
})();
