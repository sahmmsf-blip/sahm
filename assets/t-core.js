// منظومة المعلّم — النواة: الاتصال، الحالة الموحّدة، التحميل، الهيكل، التوجيه، البحث، الدخول
(function () {
  const { $, esc, toast, openSheet, closeSheet, confirmSheet, digits } = U;
  const C = window.APP_CONFIG;
  const sb = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true } });

  const LV = ["", "مبتدئ", "نامٍ", "متمكّن", "متميّز"];
  const LVD = ["", "لم يُظهر إتقانًا بعد؛ يحتاج دعمًا مباشرًا", "يقترب من الإتقان بمساعدة", "أتقن النتاج وفق المستوى المطلوب", "أتقن النتاج بمستوى يفوق المطلوب"];
  const KIND = { quiz: "كويز", worksheet: "ورقة عمل", first_written: "الاختبار الأول (كتابي)", final_written: "الاختبار النهائي", practice: "تدريبي (لا يُرحَّل)" };
  // مستويات التعليم المتمايز (تُحسب في الخادم من آخر التقييمات) — رموز محايدة على الورق لا تُشعر الطالب بتصنيف
  const TIER = { S: { n: "دعم", sym: "◆", cls: "bad", d: "أسئلة أسهل أكثر مع سقف عادل (حتى متمكّن)" },
                 C: { n: "أساسي", sym: "●", cls: "", d: "توزيع الصعوبة كما حدّده المعلم" },
                 E: { n: "إثراء", sym: "▲", cls: "open", d: "أسئلة أصعب أكثر بعلامة موزونة لا تظلمه" } };
  const STATE = { draft: "مسودة", scheduled: "مجدول", open: "مفتوح الآن", ended: "منتهٍ" };
  const ATT = { present: "حاضر", absent: "غائب", late: "متأخر", excused: "غائب بعذر" };
  const AR_M = ["كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران", "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول"];

  const S = { ready: false, sec: null, qs: null, views: {}, cur: null, timers: [] };

  // ---------- أدوات ----------
  async function rpc(fn, args) {
    const { data, error } = await sb.rpc(fn, args || {});
    if (error) throw new Error(error.message || "حدث خطأ");
    return data;
  }
  async function q(p) { const r = await p; if (r.error) throw new Error(r.error.message); return r.data; }
  async function all(table, select, order) {
    let out = [], from = 0;
    for (;;) {
      let qq = sb.from(table).select(select || "*").range(from, from + 999);
      if (order) qq = qq.order(order);
      const rows = await q(qq); out = out.concat(rows);
      if (rows.length < 1000) return out;
      from += 1000;
    }
  }
  async function guard(p, okMsg) { try { const r = await p; if (okMsg) toast(okMsg); return r; } catch (e) { toast(e.message, true); throw e; } }
  const today = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  const fmtD = (s) => { if (!s) return "—"; const d = new Date(String(s).slice(0, 10) + "T00:00:00"); return d.getDate() + " " + AR_M[d.getMonth()] + " " + d.getFullYear(); };
  const nf = (v, d = 2) => (v == null || isNaN(v) ? "—" : String(Math.round(v * Math.pow(10, d)) / Math.pow(10, d)));
  const opt = (sel, list, all) => (all ? `<option value="">${esc(all)}</option>` : "") +
    list.map((x) => `<option value="${esc(x[0])}" ${String(x[0]) === String(sel) ? "selected" : ""}>${esc(x[1])}</option>`).join("");
  const empty = (icon, title, sub, btn) => `<div class="card empty"><div class="ibox" style="margin:0 auto 12px">${ic(icon)}</div><b>${esc(title)}</b>` +
    (sub ? `<div class="tiny" style="margin-top:4px">${sub}</div>` : "") + (btn || "") + "</div>";
  function parseTSV(text) {
    const rows = []; let row = [], cell = "", qd = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (qd) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else qd = false; } else cell += c; }
      else if (c === '"' && cell === "") qd = true;
      else if (c === "\t" || (c === "," && !text.includes("\t"))) { row.push(cell); cell = ""; }
      else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
      else cell += c;
    }
    if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
    return rows.filter((r) => r.some((x) => x.trim() !== ""));
  }
  function parseDate(s) {
    s = digits(s || "").trim(); if (!s) return null;
    let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/); if (m) return m[1] + "-" + m[2].padStart(2, "0") + "-" + m[3].padStart(2, "0");
    m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/); if (m) return m[3] + "-" + m[2].padStart(2, "0") + "-" + m[1].padStart(2, "0");
    if (/^\d{5}$/.test(s)) return new Date(Date.UTC(1899, 11, 30) + +s * 86400000).toISOString().slice(0, 10);
    return null;
  }
  function loadScript(src) {
    return new Promise((ok, bad) => {
      if (document.querySelector(`script[data-src="${src}"]`)) return ok();
      const s = document.createElement("script"); s.src = src; s.dataset.src = src;
      s.onload = () => ok(); s.onerror = () => bad(new Error("تعذّر تحميل مكتبة. تحقّق من الاتصال."));
      document.head.appendChild(s);
    });
  }
  const XLSX_URL = "https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js";

  // ---------- تحميل البيانات الموحّد ----------
  async function loadAll() {
    const uid = ((await sb.auth.getSession()).data.session || {}).user ? (await sb.auth.getSession()).data.session.user.id : null;
    const [boot, me, sections, students, units, lessons, outcomes, tools, ets, mastery, marks, events, att, exx] = await Promise.all([
      rpc("t_bootstrap"), q(uid ? sb.from("teachers").select("*").eq("id", uid).single() : sb.from("teachers").select("*").limit(1).single()),
      q(sb.from("sections").select("*").order("name")),
      all("students", "id,section_id,serial_no,full_name,is_active,national_id,birth_date", "serial_no"),
      q(sb.from("units").select("*").order("seq")), q(sb.from("lessons").select("*").order("seq")), all("outcomes", "*", "seq"),
      q(sb.from("tools").select("*").order("sort")), q(sb.from("event_types").select("*").order("sort")),
      all("mastery", "*", "created_at"), all("exam_marks", "*"), all("daily_events", "*", "created_at"), all("attendance", "*"),
      q(sb.from("exams").select("id,secure_mode,max_violations,mailed_at,tool,paper,differentiated,created_at"))
    ]);
    S.me = me; S.subject = boot.subject || {}; S.tools = tools; S.eventTypes = ets.filter((e) => e.is_active !== false);
    S.mastery = mastery; S.marks = marks; S.events = events; S.att = att;
    const extra = {}; exx.forEach((x) => (extra[x.id] = x));
    S.exams = boot.exams.map((e) => Object.assign({}, e, extra[e.id] || {})); numberExams();
    S.alertsSrv = boot.alerts || []; S.nq = boot.n_questions;
    const counts = {}; boot.sections.forEach((s) => (counts[s.id] = s));
    S.sections = sections.map((s) => Object.assign({}, s, { n: (counts[s.id] || {}).n || 0, n_cred: (counts[s.id] || {}).n_cred || 0 }));
    S.students = students;
    const nqMap = {}; boot.units.forEach((u) => u.lessons.forEach((l) => l.outcomes.forEach((o) => (nqMap[o.id] = o.nq))));
    S.U = {}; S.L = {}; S.O = {};
    S.units = units.map((u) => Object.assign({}, u, { lessons: [] }));
    S.units.forEach((u) => (S.U[u.id] = u));
    lessons.forEach((l) => { const u = S.U[l.unit_id]; if (!u) return; const L = Object.assign({}, l, { unit: u, outcomes: [] }); u.lessons.push(L); S.L[l.id] = L; });
    outcomes.filter((o) => o.is_active !== false).forEach((o) => {
      const l = S.L[o.lesson_id]; if (!l) return;
      const O = Object.assign({}, o, { lesson: l, unit: l.unit, nq: nqMap[o.id] || 0, label: "و" + l.unit.seq + "/د" + l.seq + "/ن" + o.seq, short: "د" + l.seq + "/ن" + o.seq });
      l.outcomes.push(O); S.O[o.id] = O;
    });
    S.units.forEach((u) => { u.lessons.sort((a, b) => a.seq - b.seq); u.lessons.forEach((l) => l.outcomes.sort((a, b) => a.seq - b.seq)); });
    S.units.sort((a, b) => (a.semester - b.semester) || (a.seq - b.seq));
    S.stu = {}; S.students.forEach((s) => (S.stu[s.id] = s));
    let saved = null; try { saved = localStorage.getItem("sahm_t_sec"); } catch (e) {}
    if (!S.sections.find((s) => s.id === S.sec)) S.sec = (S.sections.find((s) => s.id === saved) || S.sections[0] || {}).id || null;
    S.ready = true;
    if (T.brain) T.brain.invalidate();
  }
  async function loadQuestions(force) {
    if (S.qs && !force) return S.qs;
    S.qs = (await rpc("t_questions")) || [];
    return S.qs;
  }
  async function refreshExams() {
    const [boot, exx] = await Promise.all([rpc("t_bootstrap"), q(sb.from("exams").select("id,secure_mode,max_violations,mailed_at,tool,paper,differentiated,created_at"))]);
    const extra = {}; exx.forEach((x) => (extra[x.id] = x));
    S.exams = boot.exams.map((e) => Object.assign({}, e, extra[e.id] || {})); numberExams();
    S.alertsSrv = boot.alerts || []; S.nq = boot.n_questions;
    boot.units.forEach((u) => u.lessons.forEach((l) => l.outcomes.forEach((o) => { if (S.O[o.id]) S.O[o.id].nq = o.nq; })));
  }

  // ---------- ترقيم الأدوات تلقائيًّا ----------
  const CATN = { worksheet: "ورقة العمل", quiz: "الكويز", exam: "الاختبار", practice: "التدريب" };
  const exCat = (e) => e.cat || (e.tool === "worksheet" ? "worksheet" : e.kind === "quiz" ? "quiz" : /written/.test(e.kind || "") ? "exam" : "practice");
  function numberExams() {
    const by = {};
    S.exams.filter((e) => e.status !== "draft").slice().sort((a, b) => (a.starts_at < b.starts_at ? -1 : a.starts_at > b.starts_at ? 1 : (a.created_at || "") < (b.created_at || "") ? -1 : 1))
      .forEach((e) => { const c = exCat(e); by[c] = (by[c] || 0) + 1; if (e.no == null) e.no = by[c]; });
    S.exams.forEach((e) => { e.cat = exCat(e); if (!e.label) e.label = CATN[e.cat] + (e.status === "draft" ? " (مسودة)" : " " + e.no); });
  }
  const exTitle = (e) => (e ? (e.label ? e.label + " — " : "") + e.title : "");
  const exKind = (e) => (e.tool === "worksheet" ? KIND.worksheet : KIND[e.kind] || "") + (e.paper ? " · ورقي" : "") + (e.differentiated ? " · متمايز" : "");
  // مستويات التمايز لكل شعبة (من الخادم)، تُحدَّث عند الطلب
  async function loadTiers(secId, force) {
    S.tiers = S.tiers || {};
    if (!secId) return {};
    if (!S.tiers[secId] || force) { try { S.tiers[secId] = (await rpc("t_tiers", { p_section: secId })) || {}; } catch (e) { S.tiers[secId] = {}; } }
    return S.tiers[secId];
  }
  const tierOf = (sid) => { const st = S.stu[sid]; const m = st && S.tiers && S.tiers[st.section_id]; return (m && m[sid]) || null; };
  // رقم تلقائي لكل استخدام يدوي للأداة في الشعبة (بحسب تواريخ استخدامها): «الملاحظة الصفية (3)»
  function toolSeq(secId, tool, date) {
    const ids = new Set(studentsOf(secId, true).map((s) => s.id));
    const ds = [...new Set(S.mastery.filter((m) => m.tool_code === tool && !m.exam_id && ids.has(m.student_id)).map((m) => m.assessed_on))].sort();
    const i = ds.indexOf(date); return i < 0 ? null : i + 1;
  }

  // ---------- استعلامات مساعدة ----------
  const sec = () => S.sections.find((s) => s.id === S.sec) || null;
  const secName = (id) => (S.sections.find((s) => s.id === id) || {}).name || "";
  const studentsOf = (secId, withArchived) => S.students.filter((s) => s.section_id === secId && (withArchived || s.is_active)).sort((a, b) => a.serial_no - b.serial_no);
  const semUnits = (secId) => { const s = S.sections.find((x) => x.id === secId) || {}; const sem = s.semester || 1; const us = S.units.filter((u) => (u.semester || 1) === sem); return us.length ? us : S.units; };
  const outcomesOfUnits = (units) => units.flatMap((u) => u.lessons.flatMap((l) => l.outcomes));
  const toolName = (code) => (S.tools.find((t) => t.code === code) || {}).name || code;

  // ---------- عمليات الكتابة (مباشرة على الجداول بحماية RLS) ----------
  const W = {
    async addMastery(rows) {
      rows = rows.map((r) => Object.assign({ teacher_id: S.me.id, source: "manual" }, r));
      const data = await q(sb.from("mastery").insert(rows).select());
      S.mastery = S.mastery.concat(data); T.brain.invalidate(); return data;
    },
    async delMastery(id) {
      await q(sb.from("mastery").delete().eq("id", id));
      S.mastery = S.mastery.filter((m) => m.id !== id); T.brain.invalidate();
    },
    async addEvents(rows) {
      rows = rows.map((r) => Object.assign({ teacher_id: S.me.id }, r));
      const data = await q(sb.from("daily_events").insert(rows).select());
      S.events = S.events.concat(data); return data;
    },
    async delEvent(id) { await q(sb.from("daily_events").delete().eq("id", id)); S.events = S.events.filter((e) => e.id !== id); },
    async setAttendance(rows) {
      const put = rows.filter((r) => r.status), del = rows.filter((r) => !r.status);
      if (put.length) {
        const data = await q(sb.from("attendance").upsert(put.map((r) => ({ teacher_id: S.me.id, student_id: r.student_id, on_date: r.on_date, status: r.status, note: r.note || null })),
          { onConflict: "student_id,on_date" }).select());
        data.forEach((d) => { S.att = S.att.filter((a) => !(a.student_id === d.student_id && a.on_date === d.on_date)); S.att.push(d); });
      }
      for (const r of del) {
        await q(sb.from("attendance").delete().eq("student_id", r.student_id).eq("on_date", r.on_date));
        S.att = S.att.filter((a) => !(a.student_id === r.student_id && a.on_date === r.on_date));
      }
    },
    async saveMarks(rows) {
      const put = rows.filter((r) => r.mark != null || r.absent_no_excuse), del = rows.filter((r) => r.mark == null && !r.absent_no_excuse);
      if (put.length) {
        const data = await q(sb.from("exam_marks").upsert(put.map((r) => ({ teacher_id: S.me.id, student_id: r.student_id, slot: r.slot, mark: r.mark, absent_no_excuse: !!r.absent_no_excuse, recorded_on: today() })),
          { onConflict: "student_id,slot" }).select());
        data.forEach((d) => { S.marks = S.marks.filter((m) => !(m.student_id === d.student_id && m.slot === d.slot)); S.marks.push(d); });
      }
      for (const r of del) {
        if (!S.marks.find((m) => m.student_id === r.student_id && m.slot === r.slot)) continue;
        await q(sb.from("exam_marks").delete().eq("student_id", r.student_id).eq("slot", r.slot));
        S.marks = S.marks.filter((m) => !(m.student_id === r.student_id && m.slot === r.slot));
      }
      T.brain.invalidate();
    }
  };

  // ---------- الهيكل والتنقّل ----------
  const NAV = [
    { g: "القيادة" }, { v: "dash", t: "لوحة القيادة", ic: "home" },
    { g: "داخل الصف" }, { v: "class", t: "الحصة الآن", ic: "bolt" }, { v: "grid", t: "رصد النتاجات", ic: "target" }, { v: "marks", t: "العلامات", ic: "award" },
    { g: "أدوات التقويم" }, { v: "bank", t: "بنك الأسئلة", ic: "layers" }, { v: "exams", t: "الاختبارات والكويزات", ic: "file" }, { v: "sheets", t: "أوراق العمل", ic: "book" },
    { g: "الإدارة" }, { v: "people", t: "الطلبة والشعب", ic: "users" }, { v: "records", t: "السجلات والطباعة", ic: "printer" }, { v: "settings", t: "الإعدادات", ic: "key" }
  ];
  const BNAV = [["dash", "home", "القيادة"], ["class", "bolt", "الحصة"], ["grid", "target", "النتاجات"], ["exams", "file", "الاختبارات"], ["_more", "list", "المزيد"]];
  const ALIAS = { exam: "exams", student: "people" };
  const aliasOf = (v, arg) => (v === "exam" && arg && (S.exams.find((e) => e.id === arg) || {}).cat === "worksheet" ? "sheets" : ALIAS[v] || v);

  function buildShell() {
    $("sideNav").innerHTML = NAV.map((n) => n.g ? `<div class="grp">${esc(n.g)}</div>` :
      `<a href="#${n.v}" data-v="${n.v}">${ic(n.ic)}<span>${esc(n.t)}</span><span class="badge hide" data-badge="${n.v}"></span></a>`).join("");
    $("bNav").innerHTML = BNAV.map(([v, i, t]) => `<a href="${v === "_more" ? "#" : "#" + v}" data-v="${v}">${ic(i)}<span>${t}</span></a>`).join("");
    $("bNav").querySelector('[data-v="_more"]').onclick = (e) => { e.preventDefault(); toggleSide(true); };
    $("menuBtn").onclick = () => toggleSide(true);
    $("sideScrim").onclick = () => toggleSide(false);
    $("sideNav").addEventListener("click", (e) => { if (e.target.closest("a")) toggleSide(false); });
    $("skinBtn").onclick = U.skinPicker;
    $("outBtn").onclick = async () => { await sb.auth.signOut(); location.hash = ""; location.reload(); };
    $("searchBtn").onclick = openSearch;
    document.addEventListener("keydown", (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openSearch(); } });
    $("secPick").onchange = (e) => { S.sec = e.target.value; try { localStorage.setItem("sahm_t_sec", S.sec); } catch (x) {} route(); };
  }
  function toggleSide(on) { $("side").classList.toggle("on", on); $("sideScrim").classList.toggle("on", on); }
  function fillShell() {
    $("meName").textContent = S.me.full_name || "—"; $("meSchool").textContent = S.me.school || "";
    $("meAv").textContent = U.firstName(S.me.full_name).slice(0, 1) || "س";
    $("secPick").innerHTML = S.sections.map((s) => `<option value="${s.id}" ${s.id === S.sec ? "selected" : ""}>${esc(s.name)}</option>`).join("");
    const b = T.brain ? T.brain.badges() : {};
    document.querySelectorAll("[data-badge]").forEach((el) => { const v = b[el.dataset.badge]; el.classList.toggle("hide", !v); if (v) { el.textContent = v.n; el.classList.toggle("soft", !!v.soft); } });
  }
  function view(name, def) { S.views[name] = def; }
  function route() {
    if (!S.ready) return;
    S.timers.forEach(clearInterval); S.timers = [];
    let [v, arg] = (location.hash || "#dash").slice(1).split("/");
    if (!S.views[v]) v = "dash";
    const def = S.views[v], navKey = aliasOf(v, arg);
    S.cur = v;
    document.querySelectorAll(".side-nav a").forEach((a) => a.classList.toggle("on", a.dataset.v === navKey));
    document.querySelectorAll(".bnav a").forEach((a) => a.classList.toggle("on", a.dataset.v === navKey));
    $("pgTitle").textContent = def.title;
    $("pgSub").textContent = def.sub ? def.sub(arg) : (S.subject.name ? S.subject.name + " — " + (S.subject.grade_label || "") : "");
    $("secPickWrap").classList.toggle("hide", !def.secAware || !S.sections.length);
    fillShell();
    const el = $("view");
    try { const r = def.render(el, arg ? decodeURIComponent(arg) : null); if (r && r.catch) r.catch((e) => { el.innerHTML = empty("alert", "حدث خطأ", esc(e.message)); }); }
    catch (e) { console.error(e); el.innerHTML = empty("alert", "حدث خطأ أثناء عرض الصفحة", esc(e.message)); }
    window.scrollTo(0, 0);
  }
  function go(h) { if (location.hash === h) route(); else location.hash = h; }
  function every(ms, fn) { S.timers.push(setInterval(fn, ms)); }

  // ---------- البحث الشامل ----------
  function openSearch() {
    if (!S.ready) return;
    const box = document.createElement("div"); box.className = "cmdk";
    box.innerHTML = `<div><input id="ckq" placeholder="اكتب اسم طالب، رقمًا وطنيًّا، نتاجًا، اختبارًا أو صفحة…" autocomplete="off"><div class="res" id="ckr"></div></div>`;
    document.body.appendChild(box);
    const inp = box.querySelector("#ckq"), res = box.querySelector("#ckr"); let items = [], idx = 0;
    const close = () => box.remove();
    box.onclick = (e) => { if (e.target === box) close(); };
    const norm = (t) => String(t || "").replace(/[ًٌٍَُِّْـ]/g, "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").toLowerCase();
    const draw = () => {
      const s = norm(digits(inp.value.trim()));
      const pages = NAV.filter((n) => n.v && (!s || norm(n.t).includes(s))).map((n) => ({ g: "الصفحات", t: n.t, k: "", ic: n.ic, h: "#" + n.v }));
      let st = [], oc = [], ex = [];
      if (s) {
        st = S.students.filter((x) => norm(x.full_name).includes(s) || (x.national_id || "").includes(s) || String(x.serial_no) === s).slice(0, 8)
          .map((x) => ({ g: "الطلبة", t: x.full_name, k: secName(x.section_id) + (x.is_active ? "" : " · مؤرشف"), ic: "user", h: "#student/" + x.id }));
        oc = Object.values(S.O).filter((o) => norm(o.text).includes(s) || norm(o.label).includes(s)).slice(0, 6)
          .map((o) => ({ g: "النتاجات", t: o.label + " — " + o.text, k: "رصد", ic: "target", h: "#grid/" + o.lesson.id }));
        ex = S.exams.filter((e) => norm(exTitle(e)).includes(s)).slice(0, 5).map((e) => ({ g: "أدوات التقويم", t: exTitle(e), k: STATE[e.state], ic: "file", h: "#exam/" + e.id }));
      }
      items = st.concat(oc, ex, pages.slice(0, s ? 4 : 11)); idx = 0;
      let g = "";
      res.innerHTML = items.length ? items.map((it, i) => (it.g !== g ? `<div class="grp">${(g = it.g)}</div>` : "") +
        `<button class="it ${i === idx ? "on" : ""}" data-i="${i}">${ic(it.ic, "sm")}<span>${esc(it.t)}</span><span class="k">${esc(it.k)}</span></button>`).join("")
        : '<div class="empty tiny">لا نتائج.</div>';
      res.querySelectorAll("[data-i]").forEach((b) => (b.onclick = () => { close(); go(items[+b.dataset.i].h); }));
    };
    inp.oninput = draw;
    inp.onkeydown = (e) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); idx = (idx + (e.key === "ArrowDown" ? 1 : -1) + items.length) % Math.max(1, items.length);
        res.querySelectorAll(".it").forEach((b, i) => b.classList.toggle("on", i === idx)); const on = res.querySelector(".it.on"); if (on) on.scrollIntoView({ block: "nearest" }); }
      if (e.key === "Enter" && items[idx]) { close(); go(items[idx].h); }
    };
    draw(); setTimeout(() => inp.focus(), 30);
  }

  // ---------- الدخول ----------
  const LG = { nid: "" };
  function lErr(msg) {
    const e = $("loginErr");
    if (!msg) { e.classList.add("hide"); return; }
    e.innerHTML = ic("alert", "sm") + "<span>" + esc(msg) + "</span>"; e.classList.remove("hide");
    $("portal").classList.remove("shake"); void $("portal").offsetWidth; $("portal").classList.add("shake");
  }
  function lShow(which) {
    ["tStep1", "tStep2", "loginForm"].forEach((k) => $(k).classList.toggle("hide", k !== which)); lErr("");
    setTimeout(() => { const f = { tStep1: "tNid", tStep2: "tPass", loginForm: "email" }[which]; if ($(f)) $(f).focus(); }, 60);
  }
  function wireLogin(onIn) {
    const nidUi = () => { const v = $("tNid").value; $("tNidCount").textContent = v.length + "/10"; $("tNidWrap").classList.toggle("full", v.length === 10); };
    $("tNid").addEventListener("input", (e) => { const v = digits(e.target.value).replace(/\D/g, "").slice(0, 10); if (v !== e.target.value) e.target.value = v; nidUi(); });
    try { const r = localStorage.getItem("sahm_t_nid"); if (r) { $("tNid").value = r; nidUi(); } } catch (e) {}
    $("toEmail").onclick = (e) => { e.preventDefault(); lShow("loginForm"); };
    $("toNid").onclick = (e) => { e.preventDefault(); lShow("tStep1"); };
    $("tBack").onclick = () => lShow("tStep1");
    $("tEye").onclick = () => { const p = $("tPass"); p.type = p.type === "password" ? "text" : "password"; $("tEye").innerHTML = ic(p.type === "password" ? "eye" : "eyeoff"); };
    $("skinBtnL").onclick = U.skinPicker;
    $("tStep1").addEventListener("submit", async (e) => {
      e.preventDefault(); lErr("");
      const nid = $("tNid").value;
      if (nid.length !== 10) return lErr("الرقم الوطني يتكوّن من ١٠ أرقام.");
      const b = $("tNext"); U.spin(b, true, "جارٍ التعرّف…");
      try {
        const r = await U.rpcFetch("teacher_hello", { p_nid: nid });
        if (!r.ok) return lErr(r.code === "NOT_FOUND" ? r.error + " ادخل بالبريد مرة واحدة، ثم اربط رقمك الوطني من الإعدادات." : r.error);
        LG.nid = nid; $("tUser").value = nid;
        $("tHello").textContent = "أهلًا، الأستاذ " + U.firstName(r.name);
        $("tSchool").textContent = r.school || r.name || "";
        $("tAv").textContent = U.firstName(r.name).slice(0, 1);
        lShow("tStep2");
      } catch (ex) { lErr(ex.message); } finally { U.spin(b, false); }
    });
    $("tStep2").addEventListener("submit", async (e) => {
      e.preventDefault(); lErr("");
      if (!$("tPass").value) return lErr("اكتب كلمة السر.");
      const b = $("tGo"); U.spin(b, true, "جارٍ الدخول…");
      try {
        const res = await fetch(C.SUPABASE_URL + "/functions/v1/teacher-login", {
          method: "POST", headers: { apikey: C.SUPABASE_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({ nid: LG.nid, password: $("tPass").value })
        });
        const r = await res.json().catch(() => ({ ok: false, error: "تعذّر الاتصال بالخادم." }));
        if (!r.ok) { $("tPass").select(); return lErr(r.error || "تعذّر الدخول."); }
        const { error } = await sb.auth.setSession({ access_token: r.access_token, refresh_token: r.refresh_token });
        if (error) return lErr("تعذّر بدء الجلسة: " + error.message);
        try { localStorage.setItem("sahm_t_nid", LG.nid); } catch (x) {}
        onIn();
      } catch (ex) { lErr("تعذّر الاتصال بالخادم. تحقّق من الإنترنت."); } finally { U.spin(b, false); }
    });
    $("loginForm").addEventListener("submit", async (e) => {
      e.preventDefault(); lErr("");
      const b = $("loginBtn"); U.spin(b, true, "جارٍ الدخول…");
      const r = await sb.auth.signInWithPassword({ email: $("email").value.trim(), password: $("pass").value });
      U.spin(b, false);
      if (r.error) return lErr("تعذّر الدخول — تأكد من البريد وكلمة السر.");
      onIn();
    });
  }

  window.T = { sb, S, LV, LVD, KIND, TIER, CATN, exTitle, exKind, numberExams, loadTiers, tierOf, toolSeq, STATE, ATT, AR_M, rpc, q, all, guard, today, fmtD, nf, opt, empty, parseTSV, parseDate, loadScript, XLSX_URL,
    loadAll, loadQuestions, refreshExams, sec, secName, studentsOf, semUnits, outcomesOfUnits, toolName, W,
    buildShell, fillShell, view, route, go, every, wireLogin, openSearch, NAV };
})();
