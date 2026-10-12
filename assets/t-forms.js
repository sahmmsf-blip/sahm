// نماذج ورقية للرصد داخل الحصة: ورقة الرصد اليومي (ليوم أو لفترة كاملة) وورقة رصد النتاجات (ملاحظة صفية / أسئلة شفوية)
// — اتجاه عمودي/أفقي، وكل الطلاب في صفحة واحدة، واختيار أعمدة الورقة، والاسم المختصر.
(function () {
  const { esc, toast, openSheet, closeSheet } = U, S = T.S;
  const DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  const ymd = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const dateTxt = (s) => { const d = new Date(s + "T00:00:00"); return DAYS[d.getDay()] + " " + d.getDate() + " / " + (d.getMonth() + 1) + " / " + d.getFullYear(); };
  const ls = { get: (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  function schoolDays(from, to) {   // أيام الدوام: الأحد–الخميس
    const out = [], a = new Date(from + "T00:00:00"), b = new Date(to + "T00:00:00");
    for (let d = a; d <= b && out.length < 200; d = new Date(d.getTime() + 864e5)) if (d.getDay() <= 4) out.push(ymd(d));
    return out;
  }
  const yearTxt = () => { const s = T.sec() || {}; if (s.academic_year) return s.academic_year; const y = new Date().getFullYear(), m = new Date().getMonth(); return m >= 7 ? y + " / " + (y + 1) : y - 1 + " / " + y; };

  // الاسم المختصر: الأول + الأب + العائلة، مع دمج المركّبات (عبد الله، أبو خالد، نور الدين، بن طريف…)
  function shortName(full) {
    const w = String(full || "").trim().split(/\s+/), t = [];
    for (let i = 0; i < w.length; i++) {
      const x = w[i];
      if (/^(عبد|ابو|أبو|بن|ابن|بني|آل)$/.test(x) && i + 1 < w.length) { t.push(x + " " + w[++i]); continue; }
      if (/^(الدين|الله)$/.test(x) && t.length) { t[t.length - 1] += " " + x; continue; }
      t.push(x);
    }
    return t.length <= 3 ? t.join(" ") : [t[0], t[1], t[t.length - 1]].join(" ");
  }

  // ---------- الهندسة: صفحة A4 بالبكسل بعد الهوامش (8 مم) ----------
  const PAGE = { portrait: { W: 735, H: 1046 }, landscape: { W: 1060, H: 722 } };
  function geom(orient, n, extraTop, fit, head) {
    const P = PAGE[orient], headH = head || (orient === "portrait" ? 112 : 120), top = 30 + 50 + 12 + extraTop, foot = 22;
    if (!fit) return { P, headH, rowH: 24, ok: true };
    const rowH = Math.min(26, Math.floor((P.H - top - headH - foot - 8) / Math.max(1, n)));
    return { P, headH, rowH, ok: rowH >= 15 };
  }
  const PCSS = `
    .fm{min-width:0;font-family:'IBM Plex Sans Arabic',Arial,sans-serif;color:#111;box-sizing:border-box;overflow:hidden}
    .fm .ttl{background:#16325a;color:#fff;text-align:center;font:700 18px Amiri,serif;padding:3px;border-radius:4px 4px 0 0;height:24px;line-height:24px}
    .fm .inf{display:flex;flex-wrap:wrap;gap:2px 18px;border:1px solid #64748b;border-top:0;padding:3px 8px;font-size:11.5px;background:#fff8e6;line-height:1.55}
    .fm table{border-collapse:collapse;width:100%;margin-top:5px;table-layout:fixed}
    .fm th,.fm td{border:1px solid #475569;text-align:center;padding:0;overflow:hidden}
    .fm thead{display:table-header-group}.fm tr{break-inside:avoid}
    .fm td.nm{text-align:right;padding:0 4px;font-weight:600;white-space:nowrap;text-overflow:ellipsis}
    .fm th.v{vertical-align:bottom;padding:3px 0}
    .fm th.v div{writing-mode:vertical-rl;transform:rotate(180deg);margin:0 auto;font-weight:700;line-height:1.12;white-space:normal}
    .fm th.gh{font-size:11px;height:18px}
    .fm .g1{background:#e3f1e6}.fm .g2{background:#fbe3e3}.fm .g3{background:#dfeaf7}
    .fm .h1{background:#2e7d4f;color:#fff}.fm .h2{background:#b03a3a;color:#fff}.fm .h3{background:#3d6fa8;color:#fff}.fm .h4{background:#64748b;color:#fff;font-size:11px}
    .fm tbody tr:nth-child(even) td{background-color:rgba(100,116,139,.06)}
    .fm .ft{display:flex;justify-content:space-between;font-size:9.5px;color:#475569;margin-top:3px}
    .fm .lg{display:flex;flex-wrap:wrap;gap:2px 12px;font-size:10px;margin-top:4px}
    .fm .ol{border:1px solid #94a3b8;border-radius:4px;padding:3px 6px;margin-top:4px;font-size:10.5px;line-height:1.55}
    .fm .bx{display:flex;justify-content:space-around;align-items:center;height:100%}
    .fm .bx span{display:inline-block;border:1px solid #64748b;border-radius:2px;color:#94a3b8;text-align:center}`;

  // ================= ورقة الرصد اليومي =================
  // القالب الافتراضي: أعمدة نموذج الأستاذ (20 عمودًا) بترتيبه وصياغته، وكل عمود مربوط بأحداث المنصة
  const DEF = [
    ["answer", "إجابة صحيحة", 1, ["answer"]], ["q", "سؤال أو استفسار جيد", 1, ["good_question"]], ["board", "مشاركة على اللوح", 1, ["board"]],
    ["hwp", "حلّ الواجب أمام الصف", 1, ["hw_present"]], ["help", "ساعد زميلًا أو قاد مجموعة", 1, ["helped_peer", "group_lead"]],
    ["acc", "تطبيق محاسبي صحيح", 1, ["accounting_ok"]], ["eng", "تفاعل ومتابعة طوال الحصة", 1, ["engaged"]],
    ["talk", "حديث جانبي", 2, ["talking"]], ["book", "لم يُحضر الكتاب", 2, ["no_book"]], ["nb", "لم يُحضر الدفتر أو الآلة الحاسبية", 2, ["no_notebook"]],
    ["hw", "لم يُنجز الواجب", 2, ["no_homework"]], ["sleep", "نوم في الحصة", 2, ["sleep"]], ["dis", "مشاغبة وإزعاج", 2, ["disrupt"]],
    ["late", "تأخّر عن الحصة", 2, ["late"]], ["phone", "استخدام الجوال", 2, ["phone"]], ["exit", "خروج متكرر من الصف", 2, ["frequent_exit"]],
    ["resp", "عدم احترام المعلم أو زميل", 2, ["disrespect_t", "disrespect"]], ["abs", "غياب عن الحصة", 2, ["@absent"]],
    ["imp", "التزام ملحوظ أو تحسّن", 3, ["improved"]], ["org", "ساعد في تنظيم الصف", 3, ["class_org"]]
  ];
  const GT = { 1: "المشاركة والتفاعل", 2: "المخالفات السلوكية", 3: "سلوك إيجابي" };
  function colOptions() {
    const used = new Set(DEF.flatMap((d) => d[3]));
    const ev = S.eventTypes.filter((e) => e.is_active !== false);
    const extra = ev.filter((e) => !used.has(e.code)).map((e) => ["ev:" + e.code, e.label, e.direction < 0 ? 2 : e.bucket === "participation" ? 1 : 3, [e.code]]);
    return DEF.concat(extra).map(([id, t, g, codes]) => ({ id, t, g, codes, def: !id.startsWith("ev:") }));
  }
  function dailyDialog() {
    if (!S.sections.length) return toast("لا توجد شعب", true);
    const opts = colOptions(), saved = ls.get("sahm_daily_cols", null), on = new Set(saved || opts.filter((o) => o.def).map((o) => o.id));
    const pref = ls.get("sahm_daily_pref", { orient: "auto", fit: true, short: true, note: false });
    const b = openSheet(`<h3>طباعة ورقة الرصد اليومي للحصة</h3>
      <div class="field"><span>الشعب</span><div class="row wrap">${S.sections.map((s) => `<label class="check"><input type="checkbox" class="fSec" value="${s.id}" ${s.id === S.sec ? "checked" : ""}> ${esc(s.name)}</label>`).join("")}</div></div>
      <div class="seg" id="fMode" style="margin:10px 0"><button data-m="blank" aria-pressed="false">فارغ (بلا تاريخ)</button><button data-m="day" aria-pressed="true">يوم محدد</button><button data-m="range" aria-pressed="false">فترة (شهر أو أكثر)</button></div>
      <div class="fields three"><label class="field" id="fFromW"><span id="fFromL">التاريخ</span><input type="date" class="input" id="fFrom" value="${T.today()}"></label>
        <label class="field" id="fToW" style="display:none"><span>إلى</span><input type="date" class="input" id="fTo" value="${ymd(new Date(Date.now() + 30 * 864e5))}"></label>
        <label class="field"><span>رقم الحصة</span><select class="input" id="fPer">${T.opt("", [1, 2, 3, 4, 5, 6, 7].map((n) => [n, "الحصة " + n]), "يُكتب باليد")}</select></label></div>
      <div class="fields three" style="margin-top:8px"><label class="field"><span>الاتجاه</span><select class="input" id="fOr">${T.opt(pref.orient, [["auto", "تلقائي (الأنسب)"], ["portrait", "عمودي"], ["landscape", "أفقي"]])}</select></label>
        <label class="check" style="align-self:end"><input type="checkbox" id="fFit" ${pref.fit ? "checked" : ""}> كل الطلاب في صفحة واحدة</label>
        <label class="check" style="align-self:end"><input type="checkbox" id="fShort" ${pref.short ? "checked" : ""}> الاسم المختصر (الأول والأب والعائلة)</label></div>
      <label class="check" style="margin-top:6px"><input type="checkbox" id="fNote" ${pref.note ? "checked" : ""}> عمود «ملاحظات»</label>
      <details class="card pad" style="margin-top:10px"><summary style="cursor:pointer;font-weight:700">أعمدة الورقة (<span id="fCnt"></span>) — اختر ما يُطبع</summary>
        <div class="row wrap" style="margin:8px 0;gap:8px"><button class="btn sm ghost" id="fDef">القالب الافتراضي (نموذجي)</button><button class="btn sm ghost" id="fAll">الكل</button></div>
        ${[1, 2, 3].map((g) => `<div class="lbl" style="margin:8px 0 4px">${GT[g]}</div><div class="chips">${opts.filter((o) => o.g === g).map((o) =>
          `<label class="chip lchip"><input type="checkbox" class="fCol" value="${o.id}" ${on.has(o.id) ? "checked" : ""}>${esc(o.t)}</label>`).join("")}</div>`).join("")}
        <p class="tiny" style="margin-top:8px">يُحفظ اختيارك ويتكرر في كل مرة. السلوكيات غير المطبوعة تبقى في المنصة كما هي.</p></details>
      <div class="note" id="fInfo" style="margin-top:10px"></div>
      <div class="foot"><button class="btn primary grow" id="fGo">${ic("printer", "sm")}طباعة / PDF</button><button class="btn ghost" id="fNo">إلغاء</button></div>`, true);
    let mode = "day";
    const read = () => {
      const secs = [...b.querySelectorAll(".fSec:checked")].map((x) => x.value), cols = opts.filter((o) => b.querySelector(`.fCol[value="${o.id}"]`).checked);
      const fit = b.querySelector("#fFit").checked, orSel = b.querySelector("#fOr").value, orient = orSel === "auto" ? (fit ? "portrait" : "landscape") : orSel;
      const n = Math.max(1, ...secs.map((s) => T.studentsOf(s).length)), g = geom(orient, n, 0, fit);
      const note = b.querySelector("#fNote").checked, nameW = b.querySelector("#fShort").checked ? (orient === "portrait" ? 118 : 150) : (orient === "portrait" ? 168 : 200);
      const cw = cols.length ? Math.floor((g.P.W - 22 - nameW - (note ? 60 : 0)) / cols.length) : 0;
      const days = mode === "blank" ? [null] : mode === "day" ? [b.querySelector("#fFrom").value] : schoolDays(b.querySelector("#fFrom").value, b.querySelector("#fTo").value);
      return { secs, cols, fit, orient, n, g, note, nameW, cw, days, short: b.querySelector("#fShort").checked, per: b.querySelector("#fPer").value, orSel };
    };
    const info = () => {
      const r = read(); b.querySelector("#fCnt").textContent = r.cols.length + " عمودًا";
      const mm = (px) => (px / 3.78).toFixed(1);
      let t = `${r.orient === "portrait" ? "عمودي" : "أفقي"} · ${r.n} طالبًا · ${r.cols.length} عمودًا بعرض ${mm(r.cw)} مم`;
      t += r.fit ? ` · ارتفاع السطر ${mm(r.g.rowH)} مم — ${r.g.ok ? "صفحة واحدة لكل الطلاب ✓" : "صغير جدًا للكتابة؛ قلّل الأعمدة أو اختر العمودي أو ألغِ «صفحة واحدة»"}` : " · السطر 6.3 مم والورقة على أكثر من صفحة";
      if (r.cw && r.cw < 20) t += " · الأعمدة ضيّقة جدًا؛ قلّل عددها";
      if (mode === "range") t += ` · ${r.days.length} يوم دوام × ${r.secs.length} شعبة = ${r.days.length * r.secs.length} صفحة${r.fit ? "" : " (أو أكثر)"}`;
      b.querySelector("#fInfo").textContent = t;
    };
    b.querySelectorAll("#fMode button").forEach((x) => (x.onclick = () => { mode = x.dataset.m; b.querySelectorAll("#fMode button").forEach((z) => z.setAttribute("aria-pressed", z === x));
      b.querySelector("#fToW").style.display = mode === "range" ? "" : "none"; b.querySelector("#fFromW").style.display = mode === "blank" ? "none" : "";
      b.querySelector("#fFromL").textContent = mode === "range" ? "من" : "التاريخ"; info(); }));
    b.querySelectorAll("input,select").forEach((x) => x.addEventListener("change", info));
    b.querySelector("#fDef").onclick = () => { b.querySelectorAll(".fCol").forEach((c) => (c.checked = !c.value.startsWith("ev:"))); info(); };
    b.querySelector("#fAll").onclick = () => { b.querySelectorAll(".fCol").forEach((c) => (c.checked = true)); info(); };
    b.querySelector("#fNo").onclick = closeSheet;
    b.querySelector("#fGo").onclick = () => {
      const r = read();
      if (!r.secs.length) return toast("اختر شعبة", true);
      if (!r.cols.length) return toast("اختر عمودًا واحدًا على الأقل", true);
      if (!r.days.length) return toast("لا أيام دوام في هذه الفترة", true);
      if (r.days.length * r.secs.length > 150) return toast("الفترة طويلة جدًا؛ حتى ١٥٠ صفحة في المرة", true);
      ls.set("sahm_daily_cols", r.cols.map((c) => c.id)); ls.set("sahm_daily_pref", { orient: r.orSel, fit: r.fit, short: r.short, note: r.note });
      const html = r.days.flatMap((d) => r.secs.map((sid) => dailyDoc(sid, d, r))).join("");
      closeSheet(); T.printDoc("ورقة الرصد اليومي" + (r.days[0] ? " — " + r.days[0] + (r.days.length > 1 ? " إلى " + r.days[r.days.length - 1] : "") : ""), html, r.orient, PCSS);
    };
    info();
  }
  function dailyDoc(secId, day, r) {
    const sec = S.sections.find((s) => s.id === secId) || {}, studs = T.studentsOf(secId), sub = S.subject || {};
    const g = geom(r.orient, studs.length, 0, r.fit), fs = Math.max(8.5, Math.min(11.5, g.rowH * 0.6)), hf = r.cw < 26 ? 9 : 10.5;
    const G = [1, 2, 3].map((k) => ({ k, cols: r.cols.filter((c) => c.g === k) })).filter((x) => x.cols.length);
    return `<div class="doc fm" style="width:${g.P.W}px"><div class="ttl">ورقة الرصد اليومي للحصة</div>
      <div class="inf"><span>المادة: <b>${esc(sub.name || "")}</b></span><span>الصف: <b>${esc(sub.grade_label || "")}</b></span><span>المعلّم: <b>${esc(S.me.full_name || "")}</b></span>
        <span>العام الدراسي: <b>${esc(yearTxt())}</b></span><span>الشعبة: <b>${esc(sec.name || "")}</b></span></div>
      <div class="inf"><span>اليوم والتاريخ: <b>${day ? dateTxt(day) : "………… ……/……/20……"}</b></span><span>رقم الحصة: <b>${r.per || "……"}</b></span>
        <span>موضوع الحصة: ……………………………</span><span>الطالب المساعد: ………………</span></div>
      <table><colgroup><col style="width:22px"><col style="width:${r.nameW}px">${r.cols.map(() => `<col style="width:${r.cw}px">`).join("")}${r.note ? '<col style="width:60px">' : ""}</colgroup>
        <thead><tr><th rowspan="2" class="h4">م</th><th rowspan="2" class="h4">اسم الطالب</th>${G.map((x) => `<th colspan="${x.cols.length}" class="gh h${x.k}">${GT[x.k]}</th>`).join("")}${r.note ? '<th rowspan="2" class="h4">ملاحظات</th>' : ""}</tr>
          <tr>${G.map((x) => x.cols.map((c) => `<th class="v g${x.k}" style="height:${g.headH - 18}px"><div style="font-size:${hf}px;max-height:${g.headH - 26}px">${esc(c.t)}</div></th>`).join("")).join("")}</tr></thead>
        <tbody>${studs.map((s) => `<tr style="height:${g.rowH}px"><td style="font-size:${fs - 1}px">${s.serial_no}</td><td class="nm" style="font-size:${fs}px">${esc(r.short ? shortName(s.full_name) : s.full_name)}</td>${r.cols.map(() => "<td></td>").join("")}${r.note ? "<td></td>" : ""}</tr>`).join("")}</tbody></table>
      <div class="ft"><span>الرصد: (✓) أو عدد المرات · يُنقل إلى المنصة من «الحصة الآن ← الرصد اليومي»</span><span>توقيع المعلّم: ………………</span></div></div>`;
  }

  // ================= ورقة رصد النتاجات =================
  function outcomeDialog(preLesson) {
    const units = T.semUnits(S.sec), sel = new Set(preLesson && S.L[preLesson] ? S.L[preLesson].outcomes.map((o) => o.id) : []);
    const manual = S.tools.filter((t) => !["formative", "summative"].includes(t.code));
    const pref = ls.get("sahm_out_pref", { orient: "auto", fit: true, short: true });
    const b = openSheet(`<h3>طباعة ورقة رصد النتاجات</h3>
      <div class="fields three"><label class="field"><span>الأداة</span><select class="input" id="oTool">${T.opt("observation", manual.map((t) => [t.code, t.name]))}</select></label>
        <label class="field"><span>الشعبة</span><select class="input" id="oSec">${T.opt(S.sec, S.sections.map((s) => [s.id, s.name]))}</select></label>
        <label class="field"><span>التاريخ</span><input type="date" class="input" id="oDate" value="${T.today()}"></label></div>
      <div class="fields three" style="margin-top:8px"><label class="field"><span>الاتجاه</span><select class="input" id="oOr">${T.opt(pref.orient, [["auto", "تلقائي (الأنسب)"], ["portrait", "عمودي"], ["landscape", "أفقي"]])}</select></label>
        <label class="check" style="align-self:end"><input type="checkbox" id="oFit" ${pref.fit ? "checked" : ""}> كل الطلاب في صفحة واحدة</label>
        <label class="check" style="align-self:end"><input type="checkbox" id="oShort" ${pref.short ? "checked" : ""}> الاسم المختصر</label></div>
      <label class="check" style="margin:8px 0"><input type="checkbox" id="oBlank"> بلا تاريخ (أكتبه باليد)</label>
      <div class="lbl" style="margin:8px 0 6px">النطاق: علّم وحدة أو درسًا أو نتاجات بعينها</div>
      <div class="tree" id="oTree">${units.map((u) => `<div class="tu"><label class="check tu-h"><input type="checkbox" class="oU" data-u="${u.id}"><b>الوحدة ${u.seq}</b> <span class="tiny">${esc(u.title)}</span></label>
        ${u.lessons.map((l) => `<div style="margin:4px 18px 6px 0"><label class="check"><input type="checkbox" class="oL" data-l="${l.id}"> <b>الدرس ${l.seq}</b> <span class="tiny">${esc(l.title)}</span></label>
          <div class="chips" style="margin-top:4px">${l.outcomes.map((o) => `<label class="chip lchip" title="${esc(o.text)}"><input type="checkbox" class="oO" data-o="${o.id}" ${sel.has(o.id) ? "checked" : ""}>${esc(o.short)}</label>`).join("")}</div></div>`).join("")}</div>`).join("")}</div>
      <div class="note" id="oInfo" style="margin-top:10px"></div>
      <div class="foot"><button class="btn primary grow" id="oGo">${ic("printer", "sm")}طباعة / PDF</button><button class="btn ghost" id="oNo">إلغاء</button></div>`, true);
    const picked = () => [...b.querySelectorAll(".oO:checked")].map((x) => x.dataset.o);
    const read = () => { const fit = b.querySelector("#oFit").checked, o = b.querySelector("#oOr").value, orient = o === "auto" ? (fit ? "portrait" : "landscape") : o;
      const per = orient === "portrait" ? 5 : 7, n = T.studentsOf(b.querySelector("#oSec").value).length;
      return { fit, orient, orSel: o, per, n, short: b.querySelector("#oShort").checked, g: geom(orient, n, 66, fit, 26) }; };
    const info = () => { const r = read(), k = picked().length;
      b.querySelector("#oInfo").textContent = !k ? "لم تختر نتاجات." : `${r.orient === "portrait" ? "عمودي" : "أفقي"} · ${k} نتاجًا (${r.per} في الصفحة) = ${Math.ceil(k / r.per)} صفحة · ` +
        (r.fit ? (r.g.ok ? `كل الطلاب (${r.n}) في الصفحة، السطر ${(r.g.rowH / 3.78).toFixed(1)} مم ✓` : "السطر صغير جدًا؛ اختر العمودي أو ألغِ «صفحة واحدة»") : "قد تمتد الصفحة إلى صفحتين"); };
    b.querySelectorAll(".oU").forEach((cb) => (cb.onchange = () => { S.U[cb.dataset.u].lessons.forEach((l) => { const y = b.querySelector(`.oL[data-l="${l.id}"]`); if (y) y.checked = cb.checked;
      l.outcomes.forEach((o) => { const x = b.querySelector(`.oO[data-o="${o.id}"]`); if (x) x.checked = cb.checked; }); }); info(); }));
    b.querySelectorAll(".oL").forEach((cb) => (cb.onchange = () => { S.L[cb.dataset.l].outcomes.forEach((o) => { const x = b.querySelector(`.oO[data-o="${o.id}"]`); if (x) x.checked = cb.checked; }); info(); }));
    b.querySelectorAll(".oO,#oOr,#oFit,#oShort,#oSec").forEach((cb) => cb.addEventListener("change", info));
    if (preLesson) { const x = b.querySelector(`.oL[data-l="${preLesson}"]`); if (x) x.checked = true; }
    b.querySelector("#oNo").onclick = closeSheet;
    b.querySelector("#oGo").onclick = () => {
      const os = picked().map((id) => S.O[id]).filter(Boolean); if (!os.length) return toast("اختر نتاجًا واحدًا على الأقل", true);
      const r = read(), tool = b.querySelector("#oTool").value, secId = b.querySelector("#oSec").value, day = b.querySelector("#oBlank").checked ? null : b.querySelector("#oDate").value;
      ls.set("sahm_out_pref", { orient: r.orSel, fit: r.fit, short: r.short });
      const chunks = []; for (let i = 0; i < os.length; i += r.per) chunks.push(os.slice(i, i + r.per));
      const html = chunks.map((ch, i) => outcomeDoc(secId, tool, day, ch, i + 1, chunks.length, r)).join("");
      closeSheet(); T.printDoc("ورقة رصد النتاجات — " + T.toolName(tool), html, r.orient, PCSS);
    };
    info();
  }
  function outcomeDoc(secId, tool, day, os, page, pages, r) {
    const sec = S.sections.find((s) => s.id === secId) || {}, studs = T.studentsOf(secId), sub = S.subject || {}, t = S.tools.find((x) => x.code === tool) || {};
    const g = geom(r.orient, studs.length, 66, r.fit, 26), fs = Math.max(8.5, Math.min(11.5, g.rowH * 0.6));
    const lessons = [...new Set(os.map((o) => "الدرس " + o.lesson.seq + ": " + o.lesson.title))];
    const nameW = r.short ? (r.orient === "portrait" ? 118 : 150) : (r.orient === "portrait" ? 168 : 200), noteW = r.orient === "portrait" ? 46 : 70;
    const ow = Math.floor((g.P.W - 22 - nameW - noteW) / os.length), box = Math.max(10, Math.min(16, Math.floor(ow / 5) - 2, g.rowH - 5));
    return `<div class="doc fm" style="width:${g.P.W}px"><div class="ttl">ورقة رصد النتاجات — ${esc(t.name || "")}${pages > 1 ? ` (${page}/${pages})` : ""}</div>
      <div class="inf"><span>المادة: <b>${esc(sub.name || "")}</b></span><span>الصف: <b>${esc(sub.grade_label || "")}</b></span><span>الشعبة: <b>${esc(sec.name || "")}</b></span>
        <span>المعلّم: <b>${esc(S.me.full_name || "")}</b></span><span>العام الدراسي: <b>${esc(yearTxt())}</b></span></div>
      <div class="inf"><span>الأداة: <b>${esc(t.name || "")}</b> (${esc(t.strategy || "")})</span><span>اليوم والتاريخ: <b>${day ? dateTxt(day) : "………… ……/……/20……"}</b></span><span>${esc(lessons.join(" · "))}</span></div>
      <div class="ol">${os.map((o) => `<b>${esc(o.label)}</b>: ${esc(o.text)}`).join(" &nbsp;|&nbsp; ")}</div>
      <div class="lg">${[1, 2, 3, 4].map((k) => `<span><b>${k}</b> ${T.LV[k]}</span>`).join("")}<span>— ضع (✓) في مربع المستوى</span></div>
      <table><colgroup><col style="width:22px"><col style="width:${nameW}px">${os.map(() => `<col style="width:${ow}px">`).join("")}<col style="width:${noteW}px"></colgroup>
        <thead><tr><th class="h4">م</th><th class="h4">اسم الطالب</th>${os.map((o) => `<th class="h1" style="font-size:10.5px;padding:2px">${esc(o.label)}</th>`).join("")}<th class="h4">ملاحظات</th></tr></thead>
        <tbody>${studs.map((s) => `<tr style="height:${g.rowH}px"><td style="font-size:${fs - 1}px">${s.serial_no}</td><td class="nm" style="font-size:${fs}px">${esc(r.short ? shortName(s.full_name) : s.full_name)}</td>${os.map(() =>
          `<td><div class="bx">${[1, 2, 3, 4].map((k) => `<span style="width:${box}px;height:${box}px;line-height:${box}px;font-size:${Math.max(7, box - 6)}px">${k}</span>`).join("")}</div></td>`).join("")}<td></td></tr>`).join("")}</tbody></table>
      <div class="ft"><span>يُدخل في المنصة: «رصد النتاجات» ← الأداة «${esc(t.name || "")}» ← التاريخ</span><span>توقيع المعلّم: ………………</span></div></div>`;
  }

  T.forms = { dailyDialog, outcomeDialog, shortName };
})();
