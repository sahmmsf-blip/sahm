// مركز السجلات الرسمية والطباعة: سبعة سجلات بفلاتر ذكية، معاينة، طباعة A4 إجبارية (عمودي/أفقي تلقائي)، وExcel منسّق
(function () {
  const { esc, toast } = U, S = T.S, B = () => T.brain;
  const DARK = { name: "1F2937", first: "1E3A8A", second: "0F5F58", final: "9A3412", total: "713F12", verbal: "334155", info: "16325A",
    u: ["065F46", "7C2D12", "581C87", "155E75", "9D174D", "3F6212"] };
  const LIGHT = { name: "FFFFFF", first: "E8EFFF", second: "E0F5F2", final: "FFF1E6", total: "FDF6D8", verbal: "F1F5F9", info: "F4F6FA",
    u: ["E9F7EF", "FDF1E7", "F3EBFB", "E6F6FA", "FCE7F3", "F1F8E4"] };
  const LVF = ["", "FFE4D6", "FDEFC8", "DDE7FD", "D9F2E1"], LVC = ["", "9A3412", "854D0E", "1E40AF", "166534"];
  const KINDS = [
    ["sum", "السجل التجميعي", "الأول + مجموع كل وحدة + الثاني + النهائي + المجموع"],
    ["det", "السجل التفصيلي", "كل نتاج عمود بنص عمودي"],
    ["checklist", "قائمة الشطب", "إتقان نتاجات دروس محددة"],
    ["evidence", "سجل القياس بالأدوات", "كل قياس بأداته وتاريخه (دليل المشرف)"],
    ["verbal", "التقدير اللفظي والعددي", "وفق المادة (١٨) من أسس النجاح"],
    ["attendance", "كشف الحضور والغياب", "مصفوفة الأيام ومجاميعها"],
    ["daily", "كشف الرصد اليومي", "المشاركة والسلوك (سجل تربوي منفصل)"],
    ["marks", "كشف العلامات المختصر", "الأول والثاني والنهائي والمجموع فقط"]
  ];
  const F = { kind: "sum", secs: "cur", lessons: [], range: "all", from: "", to: "", show: "level", sort: "serial", only: "all", orient: "auto" };

  // ---------- أنماط الورقة (للمعاينة والطباعة معًا) ----------
  const PCSS = `
  .paper{background:#fff;color:#111827;font-family:"IBM Plex Sans Arabic",Arial,sans-serif;direction:rtl}
  .paper .doc{padding:14px 16px;min-width:max-content}
  .paper .doc+.doc{border-top:2px dashed #cbd5e1}
  .rh{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:16px;margin-bottom:10px;border-bottom:2px solid #16325a;padding-bottom:8px}
  .rh .side{font-family:Amiri,serif;font-size:14.5px;font-weight:700;line-height:1.6;color:#1f2937}
  .rh .l{text-align:left}
  .rh .t{text-align:center;font-family:Amiri,serif;font-size:25px;font-weight:700;color:#16325a;line-height:1.25}
  .rh .t span{display:block;font-size:16px;color:#7c2d12}
  table.r{border-collapse:collapse;font-size:12px;margin-inline:auto}
  table.r th,table.r td{border:1px solid #94a3b8;padding:3px 6px;text-align:center;vertical-align:middle}
  table.r th{font-family:Amiri,serif;font-weight:700;font-size:13.5px;color:#fff;line-height:1.3}
  table.r th small{display:block;font-size:11px;font-weight:400;opacity:.92}
  table.r th.vt{padding:6px 1px;width:24px;max-width:28px;vertical-align:bottom}
  table.r th.vt div{writing-mode:vertical-rl;transform:rotate(180deg);font-family:"IBM Plex Sans Arabic",Arial,sans-serif;font-size:10.5px;font-weight:500;line-height:1.3;max-height:190px;text-align:start;white-space:normal;margin:0 auto}
  table.r td.nm{text-align:right;white-space:nowrap;min-width:170px}
  table.r td.wrap{text-align:right;white-space:normal;max-width:420px;font-size:11.5px}
  table.r td.b{font-weight:700}
  table.r td.dim{color:#9ca3af}
  table.r td.wd{font-size:10.5px;padding:3px 3px;white-space:nowrap}
  table.r thead{display:table-header-group}
  table.r tr{break-inside:avoid}
  .rn{font-size:11px;color:#374151;margin-top:8px;line-height:1.7;max-width:1100px}
  .rs{display:flex;justify-content:space-around;margin-top:20px;font-family:Amiri,serif;font-size:14.5px;font-weight:700;color:#1f2937;gap:20px}
  .sr .blk{border:1px solid #cbd5e1;border-radius:8px;padding:8px 10px;margin-top:10px;break-inside:avoid}
  .sr h4{font-family:Amiri,serif;font-size:16px;margin:0 0 6px;color:#16325a}
  .sr .kv{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;font-size:12px}
  .sr .kv div{background:#f4f6fa;border-radius:6px;padding:6px;text-align:center}
  .sr .kv b{display:block;font-size:16px}
  `;
  const hex = (c) => "#" + c;

  // ---------- محرك الطباعة الموحّد (A4 إجباري) ----------
  function printDoc(title, html, orient, extraCss) {
    const w = window.open("", "_blank");
    if (!w) { toast("اسمح للمتصفح بفتح نافذة جديدة للطباعة", true); return; }
    const land = orient === "landscape";
    w.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;700&family=Amiri:wght@400;700&display=swap" rel="stylesheet">
      <style>${PCSS}${extraCss || ""}
      @page{size:A4 ${land ? "landscape" : "portrait"};margin:8mm}
      html,body{margin:0;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .paper .doc{min-width:0;padding:0}.paper .doc+.doc{border:0;break-before:page;page-break-before:always}
      .bar{position:sticky;top:0;background:#16325a;color:#fff;padding:10px 14px;font:14px Arial;display:flex;gap:10px;align-items:center;justify-content:space-between}
      .bar button{background:#fff;color:#16325a;border:0;border-radius:8px;padding:8px 14px;font-weight:700;font-size:14px}
      @media print{.bar{display:none}}</style></head>
      <body><div class="bar"><span>${esc(title)} — A4 ${land ? "أفقي" : "عمودي"}</span><button onclick="window.print()">طباعة / حفظ PDF</button></div>
      <div class="paper" id="pp">${html}</div></body></html>`);
    w.document.close();
    const fit = () => {
      const target = land ? 1060 : 735; // عرض A4 الصافي بالبكسل
      w.document.querySelectorAll(".doc").forEach((d) => { const wd = Math.max(d.scrollWidth, 1); d.style.zoom = Math.min(1, target / wd).toFixed(3); });
      setTimeout(() => { w.focus(); w.print(); }, 350);
    };
    const go = () => (w.document.fonts && w.document.fonts.ready ? w.document.fonts.ready.then(fit) : fit());
    if (w.document.readyState === "complete") go(); else w.addEventListener("load", go);
  }
  T.printDoc = printDoc;

  // ---------- أدوات النطاق والفترة ----------
  const inRange = (d) => {
    if (!d) return false; d = String(d).slice(0, 10);
    if (F.range === "all") return true;
    const now = new Date(), ym = (x) => x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0");
    if (F.range === "month") return d.startsWith(ym(now));
    if (F.range === "last") { const p = new Date(now.getFullYear(), now.getMonth() - 1, 1); return d.startsWith(ym(p)); }
    return (!F.from || d >= F.from) && (!F.to || d <= F.to);
  };
  const rangeLabel = () => ({ all: "كل التواريخ", month: "الشهر الحالي", last: "الشهر الماضي" }[F.range] || ("من " + (F.from ? T.fmtD(F.from) : "البداية") + " إلى " + (F.to ? T.fmtD(F.to) : "اليوم")));
  function scopedUnits(secId) {
    const units = T.semUnits(secId);
    if (!F.lessons.length) return units;
    return units.map((u) => Object.assign({}, u, { lessons: u.lessons.filter((l) => F.lessons.includes(l.id)) })).filter((u) => u.lessons.length);
  }
  const scopeLabel = (secId) => !F.lessons.length ? "كامل الفصل" : scopedUnits(secId).map((u) => "الوحدة " + u.seq + (u.lessons.length === S.U[u.id].lessons.length ? " كاملة" : ": الدروس " + u.lessons.map((l) => l.seq).join("، "))).join(" + ");
  function sortStuds(list, rows) {
    if (F.sort === "alpha") return list.slice().sort((a, b) => a.full_name.localeCompare(b.full_name, "ar"));
    if (F.sort === "total" && rows) return list.slice().sort((a, b) => ((rows.get(b.id) || {}).total || -1) - ((rows.get(a.id) || {}).total || -1));
    return list;
  }

  // ---------- بناء النموذج (مشترك بين HTML وExcel) ----------
  function header(secId, title, sub) {
    const sec = S.sections.find((s) => s.id === secId) || {}, me = S.me, sj = S.subject;
    return { title, sub, right: [me.directorate, me.school].filter(Boolean),
      left: ["المبحث: " + (sj.name || ""), "الصف: " + (sj.grade_label || ""), "الشعبة: " + (sec.name || ""), "العام " + (sec.academic_year || "") + " — الفصل " + ((sec.semester || 1) === 1 ? "الأول" : "الثاني")] };
  }
  function model(kind, secId) {
    const c = B().caps(), units = scopedUnits(secId);
    let studs = T.studentsOf(secId);
    const filt = F.range === "all" ? null : (m) => inRange(m.assessed_on);
    const calcRows = new Map(); studs.forEach((s) => calcRows.set(s.id, B().calc(s, filt || F.lessons.length ? { units, filter: filt } : null)));
    if (F.only === "risk") studs = studs.filter((s) => B().risk(s).score >= 35);
    studs = sortStuds(studs, calcRows);
    const base = [{ h: "م", w: 5, dark: DARK.name }, { h: "اسم الطالب", w: 30, dark: DARK.name, nm: true }];
    const outs = units.flatMap((u, ui) => u.lessons.flatMap((l) => l.outcomes.map((o) => Object.assign({ ui }, o))));
    const M = { cols: [], rows: [], note: "", sign: true };
    const cell = (v, fill, extra) => Object.assign({ v: v == null || v === "" ? "" : v, fill }, extra || {});
    const num = (v) => (v == null || isNaN(v) ? "" : Math.round(v * 100) / 100);
    const lvCell = (L, ui) => (L ? cell(L, LVF[L], { color: LVC[L], b: true }) : cell("·", LIGHT.u[ui % 6], { dim: true }));

    if (kind === "sum" || kind === "det" || kind === "marks") {
      Object.assign(M, header(secId, "سجل العلامات الجانبي", kind === "sum" ? "السجل التجميعي" : kind === "det" ? "السجل التفصيلي — النتاجات" : "كشف العلامات المختصر"));
      M.cols = base.concat([{ h: "التقويم الأول", s: T.nf(c.cap1), w: 10, dark: DARK.first, light: LIGHT.first }]);
      if (kind === "det") {
        outs.forEach((o) => M.cols.push({ h: "ن" + o.seq + " (د" + o.lesson.seq + "): " + o.text, vt: true, w: 4.5, dark: DARK.u[o.ui % 6], light: LIGHT.u[o.ui % 6],
          g: "u" + o.unit.id, gt: (units.find((u) => u.id === o.unit.id) || {}).lessons.flatMap((l) => l.outcomes).length < 4 ? "و" + o.unit.seq : "الوحدة " + o.unit.seq + ": " + o.unit.title }));
        M.cols.push({ h: "مجموع التقويم الثاني", s: T.nf(c.cap2), w: 11, dark: DARK.second, light: LIGHT.second, b: true });
      } else if (kind === "sum") {
        units.forEach((u, ui) => M.cols.push({ h: "الوحدة " + u.seq, s: u.title, w: 12, dark: DARK.u[ui % 6], light: LIGHT.u[ui % 6], g: "sec2", gt: "التقويم الثاني — النتاجات", gdark: DARK.second }));
        M.cols.push({ h: "المجموع", s: T.nf(c.cap2), w: 11, dark: DARK.second, light: LIGHT.second, b: true, g: "sec2", gt: "التقويم الثاني — النتاجات", gdark: DARK.second });
      } else M.cols.push({ h: "التقويم الثاني", s: T.nf(c.cap2), w: 11, dark: DARK.second, light: LIGHT.second, b: true });
      M.cols.push({ h: "الاختبار النهائي", s: T.nf(c.cap3), w: 10, dark: DARK.final, light: LIGHT.final }, { h: "المجموع", s: T.nf(c.max), w: 10, dark: DARK.total, light: LIGHT.total, b: true },
        { h: "التقدير", w: 11, dark: DARK.verbal, light: LIGHT.verbal });
      studs.forEach((s) => {
        const r = calcRows.get(s.id), row = [cell(s.serial_no), cell(s.full_name), cell(num(r.first), LIGHT.first)];
        if (kind === "det") { outs.forEach((o) => { const L = r.lv[o.id]; row.push(F.show === "level" ? lvCell(L, o.ui) : L ? cell(num(r.w[o.id]), LIGHT.u[o.ui % 6]) : cell("·", LIGHT.u[o.ui % 6], { dim: true })); }); row.push(cell(num(r.second), LIGHT.second, { b: true })); }
        else if (kind === "sum") { r.units.forEach((v, ui) => row.push(cell(num(v), LIGHT.u[ui % 6]))); row.push(cell(num(r.second), LIGHT.second, { b: true })); }
        else row.push(cell(num(r.second), LIGHT.second, { b: true }));
        row.push(cell(num(r.fin), LIGHT.final), cell(r.total == null ? "" : num(r.total) + (r.complete ? "" : "*"), LIGHT.total, { b: true }), cell(r.verbal, LIGHT.verbal));
        M.rows.push(row);
      });
      M.note = `علامة التقويم الثاني = متوسط مستويات إتقان النتاجات المقيسة ÷ ٤ × ${T.nf(c.cap2)}، ويُعتمد لكل نتاج ${c.rule === "latest" ? "أحدث" : "أعلى"} مستوى قيس به.` +
        (kind === "det" ? (F.show === "level" ? " المستويات: ١ مبتدئ · ٢ نامٍ · ٣ متمكّن · ٤ متميّز. (·) لم يُقَس." : " خلية النتاج = نصيبه من علامة التقويم الثاني، ومجموع الخلايا = علامة التقويم الثاني.") :
          kind === "sum" ? " عمود الوحدة = مجموع نصيب نتاجاتها، ومجموع الوحدات = علامة التقويم الثاني." : "") +
        " (*) مجموع جزئي لنقص إحدى العلامات. التقدير وفق المادة (١٨) من أسس النجاح والرسوب.";
    } else if (kind === "checklist") {
      Object.assign(M, header(secId, "قائمة الشطب", "إتقان النتاجات — " + scopeLabel(secId)));
      M.cols = base.slice();
      outs.forEach((o) => M.cols.push({ h: "ن" + o.seq + ": " + o.text, vt: true, w: 8, dark: DARK.u[o.ui % 6], light: LIGHT.u[o.ui % 6], g: "l" + o.lesson.id, gt: "الدرس " + o.lesson.seq }));
      M.cols.push({ h: "المتقن", s: "متمكّن فأعلى", w: 10, dark: DARK.total, light: LIGHT.total, b: true });
      studs.forEach((s) => { const r = calcRows.get(s.id); let ok = 0; const row = [cell(s.serial_no), cell(s.full_name)];
        outs.forEach((o) => { const L = r.lv[o.id]; if (L >= 3) ok++; row.push(L ? cell(T.LV[L], LVF[L], { color: LVC[L], b: true, word: true }) : cell("·", LIGHT.u[o.ui % 6], { dim: true })); }); row.push(cell(ok + " / " + outs.length, LIGHT.total, { b: true })); M.rows.push(row); });
      M.note = "المستويات من الأدنى: مبتدئ · نامٍ · متمكّن · متميّز. (·) لم يُقَس بعد. «المتقن» = متمكّن فأعلى. الفترة: " + rangeLabel() + ".";
    } else if (kind === "evidence") {
      Object.assign(M, header(secId, "سجل قياس النتاجات بأدوات التقويم", scopeLabel(secId) + " · " + rangeLabel()));
      M.cols = base.concat([{ h: "النتاج", w: 46, dark: DARK.info, light: LIGHT.info, wrap: true }, { h: "الأداة", w: 16, dark: DARK.first, light: LIGHT.first },
        { h: "الاستراتيجية", w: 18, dark: DARK.first, light: LIGHT.first }, { h: "المستوى", w: 8, dark: DARK.second }, { h: "الوصف", w: 10, dark: DARK.second }, { h: "التاريخ", w: 14, dark: DARK.final, light: LIGHT.final }, { h: "المصدر", w: 10, dark: DARK.verbal, light: LIGHT.verbal }]);
      const oset = new Set(outs.map((o) => o.id));
      studs.forEach((s) => S.mastery.filter((m) => m.student_id === s.id && oset.has(m.outcome_id) && inRange(m.assessed_on)).sort((a, b) => a.assessed_on.localeCompare(b.assessed_on)).forEach((m) => {
        const o = S.O[m.outcome_id], t = S.tools.find((x) => x.code === m.tool_code) || {};
        M.rows.push([cell(s.serial_no), cell(s.full_name), cell(o.label + " — " + o.text, LIGHT.info, { wrap: true }), cell(T.mLabel(m, secId) + (T.mLabel(m, secId).startsWith(t.name || "#") ? "" : " (" + (t.name || "") + ")"), LIGHT.first), cell(t.strategy || "", LIGHT.first),
          cell(m.level, LVF[m.level], { color: LVC[m.level], b: true }), cell(T.LV[m.level], LVF[m.level]), cell(T.fmtD(m.assessed_on), LIGHT.final), cell(m.source === "exam" ? "من المنصة" : "يدوي", LIGHT.verbal)]);
      }));
      M.note = "يبيّن هذا السجل النتاج المقيس، والأداة، والاستراتيجية، وتاريخ القياس — تنفيذًا للمادة (4)-ب من أسس النجاح والرسوب: «يحتفظ المعلم بسجل خاص تُدوَّن فيه ملحوظاته وتقويمات أداء الطالب… ويُعدّ هذا السجل سجلًا رسميًا يتابعه مدير المدرسة والمشرف التربوي».";
    } else if (kind === "verbal") {
      Object.assign(M, header(secId, "سجل التقدير اللفظي والعددي", scopeLabel(secId) + " · " + rangeLabel()));
      M.cols = base.concat([{ h: "علامة النتاجات", s: "من " + T.nf(c.cap2), w: 11, dark: DARK.second, light: LIGHT.second }, { h: "النسبة", s: "%", w: 8, dark: DARK.second, light: LIGHT.second },
        { h: "التقدير", w: 10, dark: DARK.total, light: LIGHT.total, b: true }, { h: "التقدير اللفظي — المادة (١٨)", w: 60, dark: DARK.verbal, light: LIGHT.verbal, wrap: true }]);
      studs.forEach((s) => { const r = calcRows.get(s.id), p = r.secondPct, v = B().verbal(p);
        M.rows.push([cell(s.serial_no), cell(s.full_name), cell(num(r.second), LIGHT.second), cell(p == null ? "" : T.nf(p, 1), LIGHT.second), cell(v, LIGHT.total, { b: true }), cell(B().VTXT[v], LIGHT.verbal, { wrap: true })]); });
      M.note = "سلّم التقدير من المادة (18): ممتاز 90–100% · جيد جدًا 80–89.9% · جيد 70–79.9% · متوسط 60–69.9% · مقبول 50–59.9% · راسب أقل من 50%.";
    } else if (kind === "daily") {
      Object.assign(M, header(secId, "كشف الرصد اليومي", "سجل تربوي منفصل · " + rangeLabel()));
      const evs = S.events.filter((e) => inRange(e.on_date)), days = new Set(evs.map((e) => e.on_date)).size || 1;
      M.cols = base.concat([["مشاركة +", DARK.u[0], LIGHT.u[0]], ["مشاركة −", DARK.u[1], LIGHT.u[1]], ["سلوك +", DARK.u[3], LIGHT.u[3]], ["سلوك −", DARK.u[4], LIGHT.u[4]],
        ["المشاركة", DARK.second, LIGHT.second, "من ٥٠"], ["السلوك", DARK.first, LIGHT.first, "من ٥٠"], ["المجموع", DARK.total, LIGHT.total, "من ١٠٠"]].map(([h, d, l, s]) => ({ h, s, w: 9, dark: d, light: l })));
      studs.forEach((s) => {
        const mine = evs.filter((e) => e.student_id === s.id);
        const g = (bk, dir) => mine.reduce((a, e) => { const t = S.eventTypes.find((x) => x.id === e.event_type_id); return t && t.bucket === bk && t.direction === dir ? a + Number(t.weight) : a; }, 0);
        const pp = g("participation", 1), pm = g("participation", -1), bp = g("behavior", 1), bm = g("behavior", -1);
        const part = Math.min(50, Math.round((pp * 50 / Math.max(1, days * 2)) * 100) / 100), beh = Math.max(0, Math.min(50, 50 - Math.max(0, bm - bp)));
        M.rows.push([cell(s.serial_no), cell(s.full_name), cell(pp, LIGHT.u[0]), cell(pm, LIGHT.u[1]), cell(bp, LIGHT.u[3]), cell(bm, LIGHT.u[4]), cell(num(part), LIGHT.second), cell(num(beh), LIGHT.first), cell(num(part + beh), LIGHT.total, { b: true })]);
      });
      M.note = "لا يدخل هذا الكشف في علامة الطالب الرسمية. المشاركة تُكتسب من الصفر بهدف نقطتين لكل يوم نشِط، والسلوك يبدأ كاملًا ويُنقص منه، والحسنات تُقاصّ السيئات.";
    } else if (kind === "attendance") {
      Object.assign(M, header(secId, "كشف الحضور والغياب", rangeLabel()));
      const ids = new Set(studs.map((s) => s.id)), rows = S.att.filter((a) => ids.has(a.student_id) && inRange(a.on_date));
      const dates = [...new Set(rows.map((a) => a.on_date))].sort(), showDates = dates.length <= 31;
      const SYM = { present: "✓", absent: "غ", late: "ت", excused: "ع" }, FILL = { present: "E5F0E6", absent: "F8E6E4", late: "F7EEDB", excused: "E7ECF4" };
      M.cols = base.slice();
      if (showDates) dates.forEach((d) => M.cols.push({ h: T.fmtD(d), vt: true, w: 4, dark: DARK.info, light: LIGHT.info }));
      M.cols.push(...[["حضور", DARK.u[0], LIGHT.u[0]], ["غياب", DARK.final, LIGHT.final], ["تأخر", DARK.total, LIGHT.total], ["بعذر", DARK.first, LIGHT.first]].map(([h, d, l]) => ({ h, w: 7, dark: d, light: l, b: true })));
      studs.forEach((s) => { const mine = rows.filter((a) => a.student_id === s.id), row = [cell(s.serial_no), cell(s.full_name)], k = { present: 0, absent: 0, late: 0, excused: 0 };
        mine.forEach((a) => k[a.status]++);
        if (showDates) dates.forEach((d) => { const a = mine.find((x) => x.on_date === d); row.push(a ? cell(SYM[a.status], FILL[a.status], { b: true }) : cell("", LIGHT.info)); });
        row.push(cell(k.present, LIGHT.u[0], { b: true }), cell(k.absent, LIGHT.final, { b: true }), cell(k.late, LIGHT.total, { b: true }), cell(k.excused, LIGHT.first, { b: true })); M.rows.push(row); });
      M.note = "الرموز: ✓ حاضر · غ غائب · ت متأخر · ع غائب بعذر." + (showDates ? "" : " (أكثر من ٣١ يومًا: يُعرض الملخص فقط؛ ضيّق الفترة لعرض الأيام.)") + " عدد أيام التسجيل: " + dates.length + ".";
    }
    const vt = M.cols.filter((x) => x.vt).length;
    M.orient = F.orient !== "auto" ? F.orient : (M.cols.length > 9 || vt > 4 || kind === "evidence" || kind === "verbal") ? "landscape" : "portrait";
    return M;
  }

  function modelHtml(M) {
    let h = `<div class="doc"><div class="rh"><div class="side">${M.right.map(esc).join("<br>")}</div><div class="t">${esc(M.title)}<span>${esc(M.sub)}</span></div><div class="side l">${M.left.map(esc).join("<br>")}</div></div>`;
    const hasG = M.cols.some((x) => x.g);
    h += '<table class="r"><thead><tr>';
    for (let i = 0; i < M.cols.length;) {
      const c = M.cols[i];
      if (hasG && c.g) { let j = i; while (j < M.cols.length && M.cols[j].g === c.g) j++; h += `<th colspan="${j - i}" style="background:${hex(c.gdark || c.dark)}">${esc(c.gt)}</th>`; i = j; }
      else { h += `<th ${hasG ? 'rowspan="2"' : ""} class="${c.vt ? "vt" : ""}" style="background:${hex(c.dark)}">${c.vt ? `<div>${esc(c.h)}</div>` : esc(c.h)}${c.s ? `<small>${esc(c.s)}</small>` : ""}</th>`; i++; }
    }
    h += "</tr>";
    if (hasG) h += "<tr>" + M.cols.filter((c) => c.g).map((c) => `<th class="${c.vt ? "vt" : ""}" style="background:${hex(c.dark)}">${c.vt ? `<div>${esc(c.h)}</div>` : esc(c.h)}${c.s ? `<small>${esc(c.s)}</small>` : ""}</th>`).join("") + "</tr>";
    h += "</thead><tbody>";
    M.rows.forEach((r, ri) => { h += "<tr>" + r.map((x, i) => { const c = M.cols[i] || {}, cls = [c.nm ? "nm" : "", x.wrap || c.wrap ? "wrap" : "", x.b || c.b ? "b" : "", x.dim ? "dim" : "", x.word ? "wd" : ""].join(" ");
      const bg = x.fill || c.light || (ri % 2 ? "F8FAFC" : "FFFFFF");
      return `<td class="${cls}" style="background:${hex(bg)}${x.color ? ";color:" + hex(x.color) : ""}">${esc(x.v)}</td>`; }).join("") + "</tr>"; });
    if (!M.rows.length) h += `<tr><td colspan="${M.cols.length}" style="padding:18px;color:#6b7280">لا بيانات ضمن هذه الفلاتر.</td></tr>`;
    h += `</tbody></table><div class="rn">${esc(M.note)}</div>`;
    if (M.sign) h += `<div class="rs"><span>معلم المبحث: ${esc(S.me.full_name || "")} ..........</span><span>مدير المدرسة: ....................</span><span>المشرف التربوي: ....................</span></div>`;
    return h + "</div>";
  }

  async function modelsXlsx(models, name) {
    await T.loadScript(T.XLSX_URL); const X = window.XLSX;
    const border = { top: { style: "thin", color: { rgb: "94A3B8" } }, bottom: { style: "thin", color: { rgb: "94A3B8" } }, left: { style: "thin", color: { rgb: "94A3B8" } }, right: { style: "thin", color: { rgb: "94A3B8" } } };
    const hs = (fill, rot) => ({ font: { name: "Amiri", bold: true, sz: rot ? 9 : 12, color: { rgb: "FFFFFF" } }, fill: { patternType: "solid", fgColor: { rgb: fill } }, border,
      alignment: { horizontal: "center", vertical: "center", wrapText: true, readingOrder: 2, textRotation: rot ? 90 : 0 } });
    const ds = (x, c) => ({ font: { name: "Arial", sz: 11, bold: !!(x.b || c.b), color: { rgb: x.color || (x.dim ? "9CA3AF" : "111827") } }, fill: { patternType: "solid", fgColor: { rgb: x.fill || c.light || "FFFFFF" } }, border,
      alignment: { horizontal: c.nm || x.wrap || c.wrap ? "right" : "center", vertical: "center", wrapText: !!(x.wrap || c.wrap), readingOrder: 2 } });
    const wb = X.utils.book_new(); wb.Workbook = { Views: [{ RTL: true }] };
    models.forEach((M, mi) => {
      const aoa = [], st = [], merges = [], n = M.cols.length, hasG = M.cols.some((x) => x.g);
      const put = (r, c, v, s) => { aoa[r] = aoa[r] || []; aoa[r][c] = v; st.push([r, c, s]); };
      put(0, 0, M.title + " — " + M.sub, { font: { name: "Amiri", bold: true, sz: 18, color: { rgb: "16325A" } }, alignment: { horizontal: "center", readingOrder: 2 } }); merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: n - 1 } });
      put(1, 0, M.right.concat(M.left).join("   |   "), { font: { name: "Amiri", sz: 12, color: { rgb: "374151" } }, alignment: { horizontal: "center", readingOrder: 2, wrapText: true } }); merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: n - 1 } });
      const r1 = 3, r2 = hasG ? 4 : 3;
      for (let i = 0; i < n;) {
        const c = M.cols[i];
        if (hasG && c.g) { let j = i; while (j < n && M.cols[j].g === c.g) j++;
          for (let k = i; k < j; k++) { put(r1, k, k === i ? c.gt : "", hs(c.gdark || c.dark)); put(r2, k, M.cols[k].h + (M.cols[k].s ? " (" + M.cols[k].s + ")" : ""), hs(M.cols[k].dark, M.cols[k].vt)); }
          merges.push({ s: { r: r1, c: i }, e: { r: r1, c: j - 1 } }); i = j; }
        else { put(r1, i, c.h + (c.s ? " (" + c.s + ")" : ""), hs(c.dark, c.vt)); if (hasG) { put(r2, i, "", hs(c.dark)); merges.push({ s: { r: r1, c: i }, e: { r: r2, c: i } }); } i++; }
      }
      M.rows.forEach((row, ri) => row.forEach((x, ci) => put(r2 + 1 + ri, ci, typeof x.v === "number" ? x.v : String(x.v), ds(x, M.cols[ci]))));
      const last = r2 + M.rows.length + 2;
      put(last, 0, M.note, { font: { name: "Arial", sz: 10, color: { rgb: "374151" } }, alignment: { horizontal: "right", wrapText: true, readingOrder: 2 } }); merges.push({ s: { r: last, c: 0 }, e: { r: last, c: n - 1 } });
      put(last + 2, 0, "معلم المبحث: " + (S.me.full_name || "") + "        مدير المدرسة: ..................        المشرف التربوي: ..................", { font: { name: "Amiri", sz: 12 }, alignment: { horizontal: "center", readingOrder: 2 } });
      merges.push({ s: { r: last + 2, c: 0 }, e: { r: last + 2, c: n - 1 } });
      for (let r = 0; r <= last + 2; r++) { aoa[r] = aoa[r] || []; for (let k = 0; k < n; k++) if (aoa[r][k] === undefined) aoa[r][k] = ""; }
      const ws = X.utils.aoa_to_sheet(aoa);
      st.forEach(([r, c, s]) => { const a = X.utils.encode_cell({ r, c }); if (ws[a]) ws[a].s = s; });
      ws["!merges"] = merges; ws["!cols"] = M.cols.map((c) => ({ wch: c.w || 10 }));
      ws["!rows"] = []; ws["!rows"][0] = { hpt: 30 }; ws["!rows"][1] = { hpt: 24 }; ws["!rows"][r2] = { hpt: M.cols.some((c) => c.vt) ? 170 : 40 }; ws["!rows"][last] = { hpt: 46 };
      ws["!views"] = [{ RTL: true }];
      ws["!pageSetup"] = { paperSize: 9, orientation: M.orient === "landscape" ? "landscape" : "portrait", fitToWidth: 1, fitToHeight: 0 };
      const sname = (M.sub.split("—").pop().trim() + " " + (mi + 1)).replace(/[\\/:*?"<>|[\]]/g, "-").slice(0, 30);
      X.utils.book_append_sheet(wb, ws, sname);
    });
    X.writeFile(wb, name.replace(/[\\/:*?"<>|]/g, "-") + ".xlsx"); toast("نُزّل ملف Excel");
  }

  // ---------- الصفحة ----------
  T.view("records", {
    title: "السجلات والطباعة", secAware: true, sub: () => "سجلات رسمية جاهزة — كلها تُطبع على A4 من الهاتف أو الحاسوب",
    render(el) {
      if (!T.sec()) { el.innerHTML = T.empty("printer", "لا توجد شعب بعد"); return; }
      if (!document.getElementById("pcss")) { const s = document.createElement("style"); s.id = "pcss"; s.textContent = PCSS; document.head.appendChild(s); }
      const units = T.semUnits(S.sec), lessonKinds = ["checklist", "evidence", "verbal", "det", "sum", "marks"].includes(F.kind);
      const dateKinds = !["marks"].includes(F.kind);
      el.innerHTML = `<div class="card pad filters">
          <div><span class="lbl">السجل</span><div class="kinds">${KINDS.map(([k, t, d]) => `<button class="kind" data-k="${k}" aria-pressed="${F.kind === k}"><b>${t}</b><span>${d}</span></button>`).join("")}</div></div>
          <div><span class="lbl">نماذج فارغة للرصد داخل الحصة</span><div class="kinds"><button class="kind" id="fmDay"><b>ورقة الرصد اليومي للحصة</b><span>ليوم محدد أو لشهر/فترة كاملة — صفحة لكل يوم</span></button>
            <button class="kind" id="fmOut"><b>ورقة رصد النتاجات</b><span>ملاحظة صفية أو أسئلة شفوية — حسب النتاج أو الدرس أو الوحدة</span></button></div></div>
          <div class="fields four">
            <label class="field"><span>الشعب</span><select class="input" id="fSecs">${T.opt(F.secs, [["cur", "الشعبة الحالية: " + T.sec().name], ["all", "كل الشعب (كل شعبة في صفحة)"]])}</select></label>
            <label class="field"><span>الفترة</span><select class="input" id="fRange" ${dateKinds ? "" : "disabled"}>${T.opt(F.range, [["all", "كل التواريخ"], ["month", "الشهر الحالي"], ["last", "الشهر الماضي"], ["custom", "من — إلى"]])}</select></label>
            <label class="field"><span>الطلبة</span><select class="input" id="fOnly">${T.opt(F.only, [["all", "كل الطلبة"], ["risk", "المحتاجون دعمًا فقط"]])}</select></label>
            <label class="field"><span>الترتيب</span><select class="input" id="fSort">${T.opt(F.sort, [["serial", "الرقم التسلسلي"], ["alpha", "أبجديًّا"], ["total", "بالمجموع (الأعلى أولًا)"]])}</select></label></div>
          <div class="fields two ${F.range === "custom" && dateKinds ? "" : "hide"}" id="fCustom"><label class="field"><span>من</span><input type="date" class="input" id="fFrom" value="${F.from}"></label><label class="field"><span>إلى</span><input type="date" class="input" id="fTo" value="${F.to}"></label></div>
          <div class="${lessonKinds ? "" : "hide"}"><span class="lbl">النطاق — علّم الدروس (بلا تعليم = كامل الفصل)</span><div class="tree">${units.map((u) => `<div class="tu"><label class="check tu-h"><input type="checkbox" class="fU" data-u="${u.id}" ${u.lessons.length && u.lessons.every((l) => F.lessons.includes(l.id)) ? "checked" : ""}><b>الوحدة ${u.seq}</b> <span class="tiny">${esc(u.title)}</span></label>
            <div class="chips">${u.lessons.map((l) => `<label class="chip lchip"><input type="checkbox" class="fL" data-l="${l.id}" ${F.lessons.includes(l.id) ? "checked" : ""}>الدرس ${l.seq}</label>`).join("")}</div></div>`).join("")}</div></div>
          <div class="row wrap"><div class="seg ${F.kind === "det" ? "" : "hide"}" id="fShow"><button data-s="level" aria-pressed="${F.show === "level"}">الخلايا: المستوى ١–٤</button><button data-s="mark" aria-pressed="${F.show === "mark"}">الخلايا: العلامة</button></div>
            <div class="seg" id="fOrient"><button data-o="auto" aria-pressed="${F.orient === "auto"}">A4 تلقائي</button><button data-o="portrait" aria-pressed="${F.orient === "portrait"}">A4 عمودي</button><button data-o="landscape" aria-pressed="${F.orient === "landscape"}">A4 أفقي</button></div>
            <span class="grow"></span><button class="btn primary" id="fPrint">${ic("printer", "sm")}طباعة / PDF</button><button class="btn outline" id="fXlsx">Excel منسّق</button></div></div>
        <div class="rec-scroll" style="margin-top:14px"><div class="paper" id="recPaper"></div></div>`;
      const re = () => T.route();
      el.querySelectorAll(".kind").forEach((b) => (b.onclick = () => { F.kind = b.dataset.k; re(); }));
      el.querySelector("#fSecs").onchange = (e) => { F.secs = e.target.value; preview(el); };
      el.querySelector("#fRange").onchange = (e) => { F.range = e.target.value; re(); };
      el.querySelector("#fOnly").onchange = (e) => { F.only = e.target.value; preview(el); };
      el.querySelector("#fSort").onchange = (e) => { F.sort = e.target.value; preview(el); };
      const fr = el.querySelector("#fFrom"), to = el.querySelector("#fTo");
      fr.onchange = () => { F.from = fr.value; preview(el); }; to.onchange = () => { F.to = to.value; preview(el); };
      el.querySelectorAll(".fU").forEach((cb) => (cb.onchange = () => { const ids = S.U[cb.dataset.u].lessons.map((l) => l.id); F.lessons = F.lessons.filter((x) => !ids.includes(x)); if (cb.checked) F.lessons.push(...ids); re(); }));
      el.querySelectorAll(".fL").forEach((cb) => (cb.onchange = () => { F.lessons = F.lessons.filter((x) => x !== cb.dataset.l); if (cb.checked) F.lessons.push(cb.dataset.l); re(); }));
      el.querySelectorAll("#fShow button").forEach((b) => (b.onclick = () => { F.show = b.dataset.s; re(); }));
      el.querySelectorAll("#fOrient button").forEach((b) => (b.onclick = () => { F.orient = b.dataset.o; re(); }));
      el.querySelector("#fmDay").onclick = () => T.forms.dailyDialog(); el.querySelector("#fmOut").onclick = () => T.forms.outcomeDialog();
      el.querySelector("#fPrint").onclick = () => { const ms = models(); printDoc(ms[0].title + " — " + ms[0].sub, ms.map(modelHtml).join(""), ms[0].orient); };
      el.querySelector("#fXlsx").onclick = () => { const ms = models(); modelsXlsx(ms, ms[0].title + " - " + ms[0].sub + (F.secs === "all" ? " - كل الشعب" : " - " + T.sec().name)).catch((e) => toast(e.message, true)); };
      preview(el);
    }
  });
  const models = () => (F.secs === "all" ? S.sections.map((s) => s.id) : [S.sec]).map((id) => model(F.kind, id));
  function preview(el) { const box = el.querySelector("#recPaper"); if (box) box.innerHTML = models().map(modelHtml).join(""); }

  // ---------- تقرير الطالب (A4 عمودي) ----------
  async function studentReport(st) {
    const r = B().calc(st), c = B().caps(), h = header(st.section_id, "تقرير أداء الطالب", st.full_name), rk = B().risk(st);
    let at = []; try { at = await T.q(T.sb.from("attempts").select("exam_id,score,total,status,submitted_at").eq("student_id", st.id).neq("status", "in_progress")); } catch (e) {}
    const att = S.att.filter((a) => a.student_id === st.id), k = { present: 0, absent: 0, late: 0, excused: 0 }; att.forEach((a) => k[a.status]++);
    let html = `<div class="doc sr"><div class="rh"><div class="side">${h.right.map(esc).join("<br>")}</div><div class="t">${esc(h.title)}<span>${esc(st.full_name)}</span></div><div class="side l">${h.left.map(esc).join("<br>")}</div></div>
      <div class="blk"><h4>العلامات</h4><div class="kv"><div>الاختبار الأول<b>${T.nf(r.first)}</b>من ${T.nf(c.cap1)}</div><div>التقويم الثاني<b>${T.nf(r.second)}</b>من ${T.nf(c.cap2)}</div>
        <div>الاختبار النهائي<b>${T.nf(r.fin)}</b>من ${T.nf(c.cap3)}</div><div>المجموع<b>${T.nf(r.total)}</b>${esc(r.verbal)}</div></div></div>
      <div class="blk"><h4>إتقان النتاجات (قيس ${r.N} من ${r.nOut})</h4><table class="r" style="width:100%"><thead><tr><th style="background:#16325a">النتاج</th><th style="background:#16325a;width:90px">المستوى</th></tr></thead><tbody>` +
      r.outs.map((o) => { const L = r.lv[o.id]; return `<tr><td class="wrap" style="max-width:none">${esc(o.label + " — " + o.text)}</td><td style="background:${L ? hex(LVF[L]) : "#fff"};color:${L ? hex(LVC[L]) : "#9ca3af"};font-weight:700">${L ? L + " · " + T.LV[L] : "—"}</td></tr>`; }).join("") +
      `</tbody></table></div>
      <div class="blk"><h4>الحضور والانضباط</h4><div class="kv"><div>حاضر<b>${k.present}</b></div><div>غائب<b>${k.absent}</b></div><div>متأخر<b>${k.late}</b></div><div>بعذر<b>${k.excused}</b></div></div></div>
      ${at.length ? `<div class="blk"><h4>الكويزات والاختبارات وأوراق العمل</h4>${at.map((a) => { const e = S.exams.find((x) => x.id === a.exam_id) || {}; return `<div style="font-size:12px;display:flex;justify-content:space-between;border-bottom:1px solid #e5e7eb;padding:3px 0"><span>${esc(T.exTitle(e))}</span><b>${a.score != null ? a.score + "/" + a.total : "—"}</b></div>`; }).join("")}</div>` : ""}
      ${rk.why.length ? `<div class="blk"><h4>ملاحظات للمتابعة</h4><ul style="margin:0;font-size:12px">${rk.why.map((w) => `<li>${esc(w)}</li>`).join("")}</ul></div>` : ""}
      <div class="blk"><h4>ملاحظات المعلّم</h4><div style="height:60px;border-bottom:1px dotted #94a3b8"></div><div style="height:30px;border-bottom:1px dotted #94a3b8"></div></div>
      <div class="rs"><span>معلم المبحث: ${esc(S.me.full_name || "")}</span><span>مدير المدرسة: ..........</span><span>وليّ الأمر: ..........</span></div></div>`;
    printDoc("تقرير " + st.full_name, html, "portrait");
  }

  T.records = { printDoc, studentReport, model, modelHtml, PCSS };
})();
