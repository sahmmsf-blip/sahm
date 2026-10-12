// نماذج ورقية للرصد داخل الحصة: ورقة الرصد اليومي (ليوم أو لفترة كاملة) وورقة رصد النتاجات (ملاحظة صفية / أسئلة شفوية)
(function () {
  const { esc, toast, openSheet, closeSheet } = U, S = T.S;
  const DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  const ymd = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const dateTxt = (s) => { const d = new Date(s + "T00:00:00"); return DAYS[d.getDay()] + " " + d.getDate() + " / " + (d.getMonth() + 1) + " / " + d.getFullYear(); };
  // أيام الدوام (الأحد–الخميس) بين تاريخين
  function schoolDays(from, to) {
    const out = [], a = new Date(from + "T00:00:00"), b = new Date(to + "T00:00:00");
    for (let d = a; d <= b && out.length < 200; d = new Date(d.getTime() + 864e5)) if (d.getDay() <= 4) out.push(ymd(d));
    return out;
  }
  const yearTxt = () => { const s = T.sec() || {}; return s.academic_year || (() => { const y = new Date().getFullYear(), m = new Date().getMonth(); return m >= 7 ? y + " / " + (y + 1) : y - 1 + " / " + y; })(); };
  const PCSS = `
    .fm{width:1060px;min-width:0;font-family:'IBM Plex Sans Arabic',Arial,sans-serif;color:#111;box-sizing:border-box}
    .fm .ttl{background:#16325a;color:#fff;text-align:center;font:700 19px Amiri,serif;padding:5px;border-radius:4px 4px 0 0}
    .fm .inf{display:flex;flex-wrap:wrap;gap:4px 26px;border:1px solid #64748b;border-top:0;padding:5px 10px;font-size:12.5px;background:#fff8e6}
    .fm .inf b{font-weight:700}
    .fm table{border-collapse:collapse;width:100%;margin-top:6px;table-layout:fixed}
    .fm th,.fm td{border:1px solid #475569;font-size:11px;text-align:center;padding:0}
    .fm thead{display:table-header-group}.fm tr{break-inside:avoid}
    .fm td.nm{text-align:right;padding:0 5px;font-weight:600;white-space:nowrap;overflow:hidden;font-size:11.5px}
    .fm tbody td{height:22px}
    .fm th.v{height:132px;vertical-align:bottom;padding:4px 0}
    .fm th.v div{writing-mode:vertical-rl;transform:rotate(180deg);margin:0 auto;font-size:11px;font-weight:700;line-height:1.15;max-height:126px;white-space:normal}
    .fm .g1{background:#e3f1e6}.fm .g2{background:#fbe3e3}.fm .g3{background:#dfeaf7}.fm .g4{background:#f1f1f1}
    .fm .h1{background:#2e7d4f;color:#fff}.fm .h2{background:#b03a3a;color:#fff}.fm .h3{background:#3d6fa8;color:#fff}.fm .h4{background:#64748b;color:#fff}
    .fm .ft{display:flex;justify-content:space-between;font-size:10.5px;color:#475569;margin-top:5px}
    .fm .lg{display:flex;flex-wrap:wrap;gap:4px 16px;font-size:11px;margin-top:6px}
    .fm .ol{border:1px solid #94a3b8;border-radius:4px;padding:4px 8px;margin-top:6px;font-size:11.5px;line-height:1.7}
    .fm .bx{display:flex;justify-content:space-around;align-items:center;height:22px}
    .fm .bx span{display:inline-block;width:15px;height:15px;border:1px solid #64748b;border-radius:3px;font-size:9px;line-height:15px;color:#94a3b8}`;

  // ================= ورقة الرصد اليومي للحصة =================
  function dailyDialog() {
    if (!S.sections.length) return toast("لا توجد شعب", true);
    const b = openSheet(`<h3>طباعة ورقة الرصد اليومي للحصة</h3>
      <p class="tiny">نموذج فارغ تطبعه وترصد عليه داخل الحصة بالقلم: المشاركة والتفاعل، والمخالفات السلوكية، والسلوك الإيجابي (أعمدته هي أحداث الرصد اليومي في المنصة)، مع أسماء طلبة الشعبة. A4 أفقي.</p>
      <div class="field"><span>الشعب</span><div class="row wrap">${S.sections.map((s) => `<label class="check"><input type="checkbox" class="fSec" value="${s.id}" ${s.id === S.sec ? "checked" : ""}> ${esc(s.name)}</label>`).join("")}</div></div>
      <div class="seg" id="fMode" style="margin:12px 0"><button data-m="blank" aria-pressed="false">فارغ (بلا تاريخ)</button><button data-m="day" aria-pressed="true">يوم محدد</button><button data-m="range" aria-pressed="false">فترة (شهر أو أكثر)</button></div>
      <div class="fields three"><label class="field"><span id="fFromL">التاريخ</span><input type="date" class="input" id="fFrom" value="${T.today()}"></label>
        <label class="field" id="fToW" style="display:none"><span>إلى</span><input type="date" class="input" id="fTo" value="${ymd(new Date(Date.now() + 30 * 864e5))}"></label>
        <label class="field"><span>رقم الحصة</span><select class="input" id="fPer">${T.opt("", [1, 2, 3, 4, 5, 6, 7].map((n) => [n, "الحصة " + n]), "يُكتب باليد")}</select></label></div>
      <label class="check" style="margin-top:8px"><input type="checkbox" id="fNote" checked> عمود «ملاحظات»</label>
      <p class="tiny" id="fInfo"></p>
      <div class="foot"><button class="btn primary grow" id="fGo">${ic("printer", "sm")}طباعة / PDF</button><button class="btn ghost" id="fNo">إلغاء</button></div>`, true);
    let mode = "day";
    const info = () => { const n = mode === "range" ? schoolDays(b.querySelector("#fFrom").value, b.querySelector("#fTo").value).length : 1;
      b.querySelector("#fInfo").textContent = mode === "range" ? `${n} يوم دوام (الأحد–الخميس) × ${b.querySelectorAll(".fSec:checked").length} شعبة — كل يوم في صفحة مستقلة.` : ""; };
    b.querySelectorAll("#fMode button").forEach((x) => (x.onclick = () => { mode = x.dataset.m; b.querySelectorAll("#fMode button").forEach((z) => z.setAttribute("aria-pressed", z === x));
      b.querySelector("#fToW").style.display = mode === "range" ? "" : "none"; b.querySelector("#fFrom").closest(".field").style.display = mode === "blank" ? "none" : "";
      b.querySelector("#fFromL").textContent = mode === "range" ? "من" : "التاريخ"; info(); }));
    b.querySelectorAll("#fFrom,#fTo,.fSec").forEach((x) => (x.onchange = info));
    b.querySelector("#fNo").onclick = closeSheet;
    b.querySelector("#fGo").onclick = () => {
      const secs = [...b.querySelectorAll(".fSec:checked")].map((x) => x.value); if (!secs.length) return toast("اختر شعبة", true);
      const days = mode === "blank" ? [null] : mode === "day" ? [b.querySelector("#fFrom").value] : schoolDays(b.querySelector("#fFrom").value, b.querySelector("#fTo").value);
      if (!days.length) return toast("لا أيام دوام في هذه الفترة", true);
      if (days.length * secs.length > 120) return toast("الفترة طويلة جدًا؛ اختر حتى ١٢٠ صفحة في المرة", true);
      const per = b.querySelector("#fPer").value, note = b.querySelector("#fNote").checked;
      const html = days.flatMap((d) => secs.map((sid) => dailyDoc(sid, d, per, note))).join("");
      closeSheet(); T.printDoc("ورقة الرصد اليومي" + (days[0] ? " — " + days[0] + (days.length > 1 ? " إلى " + days[days.length - 1] : "") : ""), html, "landscape", PCSS);
    };
    info();
  }
  function dailyDoc(secId, day, per, note) {
    const sec = S.sections.find((s) => s.id === secId) || {}, studs = T.studentsOf(secId), sub = S.subject || {};
    const ev = S.eventTypes.filter((e) => e.is_active !== false);
    const G = [
      { t: "المشاركة والتفاعل", c: 1, cols: ev.filter((e) => e.direction > 0 && e.bucket === "participation").map((e) => e.label) },
      { t: "المخالفات السلوكية", c: 2, cols: ev.filter((e) => e.direction < 0).map((e) => e.label).concat(["غياب عن الحصة"]) },
      { t: "سلوك إيجابي", c: 3, cols: ev.filter((e) => e.direction > 0 && e.bucket !== "participation").map((e) => e.label) }
    ].filter((g) => g.cols.length);
    const ncols = G.reduce((a, g) => a + g.cols.length, 0), noteW = note ? 90 : 0, nameW = 190, numW = 26;
    const cw = Math.max(16, Math.floor((1060 - nameW - numW - noteW) / ncols));
    return `<div class="doc fm"><div class="ttl">ورقة الرصد اليومي للحصة</div>
      <div class="inf"><span>المادة: <b>${esc(sub.name || "")}</b></span><span>الصف: <b>${esc(sub.grade_label || "")}</b></span><span>المعلّم: <b>${esc(S.me.full_name || "")}</b></span>
        <span>المدرسة: <b>${esc(S.me.school || "")}</b></span><span>العام الدراسي: <b>${esc(yearTxt())}</b></span></div>
      <div class="inf"><span>الشعبة: <b>${esc(sec.name || "")}</b></span><span>اليوم والتاريخ: <b>${day ? dateTxt(day) : "……………  ……/……/20……"}</b></span>
        <span>رقم الحصة: <b>${per || "……"}</b></span><span>موضوع الحصة: ……………………………………</span><span>الطالب المساعد: ……………………</span></div>
      <table><colgroup><col style="width:${numW}px"><col style="width:${nameW}px">${G.map((g) => g.cols.map(() => `<col style="width:${cw}px">`).join("")).join("")}${note ? `<col style="width:${noteW}px">` : ""}</colgroup>
        <thead><tr><th rowspan="2" class="h4">م</th><th rowspan="2" class="h4">اسم الطالب</th>${G.map((g) => `<th colspan="${g.cols.length}" class="h${g.c}">${g.t}</th>`).join("")}${note ? '<th rowspan="2" class="h4">ملاحظات</th>' : ""}</tr>
          <tr>${G.map((g) => g.cols.map((c) => `<th class="v g${g.c}"><div>${esc(c)}</div></th>`).join("")).join("")}</tr></thead>
        <tbody>${studs.map((s) => `<tr><td>${s.serial_no}</td><td class="nm">${esc(s.full_name)}</td>${G.map((g) => g.cols.map(() => `<td class="g${g.c}" style="background:none"></td>`).join("")).join("")}${note ? "<td></td>" : ""}</tr>`).join("")}</tbody></table>
      <div class="ft"><span>طريقة الرصد: علامة (✓) أو عدد المرات في الخانة · يُنقل الرصد إلى المنصة من «الحصة الآن ← الرصد اليومي»</span><span>توقيع المعلّم: ……………………</span></div></div>`;
  }

  // ================= ورقة رصد النتاجات (ملاحظة صفية / أسئلة شفوية) =================
  function outcomeDialog(preLesson) {
    const units = T.semUnits(S.sec), sel = new Set(preLesson && S.L[preLesson] ? S.L[preLesson].outcomes.map((o) => o.id) : []);
    const manual = S.tools.filter((t) => !["formative", "summative"].includes(t.code));
    const b = openSheet(`<h3>طباعة ورقة رصد النتاجات</h3>
      <p class="tiny">ترصد عليها مستوى كل طالب في كل نتاج (١ مبتدئ … ٤ متميّز) أثناء الحصة، ثم تُدخلها في «رصد النتاجات». A4 أفقي، وكل ٦ نتاجات في صفحة.</p>
      <div class="fields three"><label class="field"><span>الأداة</span><select class="input" id="oTool">${T.opt("observation", manual.map((t) => [t.code, t.name]))}</select></label>
        <label class="field"><span>الشعبة</span><select class="input" id="oSec">${T.opt(S.sec, S.sections.map((s) => [s.id, s.name]))}</select></label>
        <label class="field"><span>التاريخ</span><input type="date" class="input" id="oDate" value="${T.today()}"></label></div>
      <label class="check" style="margin:8px 0"><input type="checkbox" id="oBlank"> بلا تاريخ (أكتبه باليد)</label>
      <div class="lbl" style="margin:8px 0 6px">النطاق: علّم وحدة أو درسًا أو نتاجات بعينها</div>
      <div class="tree" id="oTree">${units.map((u) => `<div class="tu"><label class="check tu-h"><input type="checkbox" class="oU" data-u="${u.id}"><b>الوحدة ${u.seq}</b> <span class="tiny">${esc(u.title)}</span></label>
        ${u.lessons.map((l) => `<div style="margin:4px 18px 6px 0"><label class="check"><input type="checkbox" class="oL" data-l="${l.id}"> <b>الدرس ${l.seq}</b> <span class="tiny">${esc(l.title)}</span></label>
          <div class="chips" style="margin-top:4px">${l.outcomes.map((o) => `<label class="chip lchip" title="${esc(o.text)}"><input type="checkbox" class="oO" data-o="${o.id}" ${sel.has(o.id) ? "checked" : ""}>${esc(o.short)}</label>`).join("")}</div></div>`).join("")}</div>`).join("")}</div>
      <p class="tiny" id="oInfo"></p>
      <div class="foot"><button class="btn primary grow" id="oGo">${ic("printer", "sm")}طباعة / PDF</button><button class="btn ghost" id="oNo">إلغاء</button></div>`, true);
    const picked = () => [...b.querySelectorAll(".oO:checked")].map((x) => x.dataset.o);
    const info = () => { const n = picked().length; b.querySelector("#oInfo").textContent = n ? `${n} نتاجًا — ${Math.ceil(n / 6)} صفحة لكل مجموعة طلبة.` : "لم تختر نتاجات."; };
    b.querySelectorAll(".oU").forEach((cb) => (cb.onchange = () => { S.U[cb.dataset.u].lessons.forEach((l) => l.outcomes.forEach((o) => { const x = b.querySelector(`.oO[data-o="${o.id}"]`); if (x) x.checked = cb.checked; }));
      S.U[cb.dataset.u].lessons.forEach((l) => { const x = b.querySelector(`.oL[data-l="${l.id}"]`); if (x) x.checked = cb.checked; }); info(); }));
    b.querySelectorAll(".oL").forEach((cb) => (cb.onchange = () => { S.L[cb.dataset.l].outcomes.forEach((o) => { const x = b.querySelector(`.oO[data-o="${o.id}"]`); if (x) x.checked = cb.checked; }); info(); }));
    b.querySelectorAll(".oO").forEach((cb) => (cb.onchange = info));
    if (preLesson) { const x = b.querySelector(`.oL[data-l="${preLesson}"]`); if (x) x.checked = true; }
    b.querySelector("#oNo").onclick = closeSheet;
    b.querySelector("#oGo").onclick = () => {
      const os = picked().map((id) => S.O[id]).filter(Boolean); if (!os.length) return toast("اختر نتاجًا واحدًا على الأقل", true);
      const tool = b.querySelector("#oTool").value, secId = b.querySelector("#oSec").value, day = b.querySelector("#oBlank").checked ? null : b.querySelector("#oDate").value;
      const chunks = []; for (let i = 0; i < os.length; i += 6) chunks.push(os.slice(i, i + 6));
      const html = chunks.map((ch, i) => outcomeDoc(secId, tool, day, ch, i + 1, chunks.length)).join("");
      closeSheet(); T.printDoc("ورقة رصد النتاجات — " + T.toolName(tool), html, "landscape", PCSS);
    };
    info();
  }
  function outcomeDoc(secId, tool, day, os, page, pages) {
    const sec = S.sections.find((s) => s.id === secId) || {}, studs = T.studentsOf(secId), sub = S.subject || {}, t = S.tools.find((x) => x.code === tool) || {};
    const lessons = [...new Set(os.map((o) => "الدرس " + o.lesson.seq + ": " + o.lesson.title))];
    const nameW = 190, numW = 26, noteW = 80, ow = Math.floor((1060 - nameW - numW - noteW) / os.length);
    return `<div class="doc fm"><div class="ttl">ورقة رصد النتاجات — ${esc(t.name || "")}${pages > 1 ? ` (${page}/${pages})` : ""}</div>
      <div class="inf"><span>المادة: <b>${esc(sub.name || "")}</b></span><span>الصف: <b>${esc(sub.grade_label || "")}</b></span><span>الشعبة: <b>${esc(sec.name || "")}</b></span>
        <span>المعلّم: <b>${esc(S.me.full_name || "")}</b></span><span>العام الدراسي: <b>${esc(yearTxt())}</b></span></div>
      <div class="inf"><span>الأداة: <b>${esc(t.name || "")}</b></span><span>الاستراتيجية: <b>${esc(t.strategy || "")}</b></span>
        <span>اليوم والتاريخ: <b>${day ? dateTxt(day) : "……………  ……/……/20……"}</b></span><span>${esc(lessons.join(" · "))}</span></div>
      <div class="ol">${os.map((o) => `<b>${esc(o.label)}</b>: ${esc(o.text)}`).join(" &nbsp;|&nbsp; ")}</div>
      <div class="lg">${[1, 2, 3, 4].map((k) => `<span><b>${k}</b> ${T.LV[k]}: ${esc(T.LVD[k])}</span>`).join("")}</div>
      <table><colgroup><col style="width:${numW}px"><col style="width:${nameW}px">${os.map(() => `<col style="width:${ow}px">`).join("")}<col style="width:${noteW}px"></colgroup>
        <thead><tr><th class="h4">م</th><th class="h4">اسم الطالب</th>${os.map((o) => `<th class="h1" title="${esc(o.text)}">${esc(o.label)}<div style="font-weight:400;font-size:9.5px;line-height:1.2;padding:2px">${esc(o.text.length > 60 ? o.text.slice(0, 58) + "…" : o.text)}</div></th>`).join("")}<th class="h4">ملاحظات</th></tr></thead>
        <tbody>${studs.map((s) => `<tr><td>${s.serial_no}</td><td class="nm">${esc(s.full_name)}</td>${os.map(() => `<td><div class="bx"><span>1</span><span>2</span><span>3</span><span>4</span></div></td>`).join("")}<td></td></tr>`).join("")}</tbody></table>
      <div class="ft"><span>ضع (✓) في مربع المستوى، ثم أدخله في المنصة: «رصد النتاجات» ← الأداة «${esc(t.name || "")}» ← التاريخ</span><span>توقيع المعلّم: ……………………</span></div></div>`;
  }

  T.forms = { dailyDialog, outcomeDialog };
})();
