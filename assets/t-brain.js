// العقل التحليلي: احتساب العلامات وفق أسس النجاح، ومستوى كل نتاج، والطلبة المحتاجون للدعم، والتنبيهات الذكية
(function () {
  const S = T.S;
  const VERBAL = [[90, "ممتاز"], [80, "جيد جدًا"], [70, "جيد"], [60, "متوسط"], [50, "مقبول"], [0, "راسب"]];
  const VTXT = {
    "ممتاز": "يُظهر الطالب امتلاكًا للمعارف والمهارات المطلوبة، ويُحقق النتاجات التعلُّمية بشكل يفوق معايير المستوى التعليمي المحدَّد.",
    "جيد جدًا": "يُظهر الطالب امتلاكًا للمعارف والمهارات المطلوبة، ويُحقق النتاجات التعلُّمية وفقًا لمعايير المستوى التعليمي المحدَّد.",
    "جيد": "يُظهر الطالب امتلاكًا لمعظم المعارف والمهارات المطلوبة، ويُحقق النتاجات التعلُّمية وفقًا لمعايير المستوى التعليمي المحدَّد.",
    "متوسط": "يُظهر الطالب امتلاكًا للحد المقبول من المعارف والمهارات المطلوبة، ويقترب من تحقيق النتاجات التعلُّمية وفقًا لمعايير المستوى التعليمي المحدَّد.",
    "مقبول": "يُظهر الطالب امتلاكًا للحد الأدنى من المعارف والمهارات المطلوبة بمستوى محدود، ويُحقق الحد الأدنى المطلوب من النتاجات التعلُّمية وفقًا لمعايير المستوى التعليمي المحدَّد.",
    "راسب": "لم يُظهر الطالب امتلاكًا للحد الأدنى من المعارف والمهارات المطلوبة، ويتطلَّب خطة علاجية لإعادة توجيه تعلُّمه في المسار الصحيح.",
    "—": "لم يُقَس بعد."
  };
  const verbal = (pct) => { if (pct == null || isNaN(pct)) return "—"; for (const v of VERBAL) if (pct >= v[0]) return v[1]; return "—"; };
  let C = null;
  const invalidate = () => { C = null; };

  function caps() {
    const s = S.subject || {}, max = +s.max_mark || 100;
    return { max, cap1: max * (+s.first_eval_pct || 30) / 100, cap2: max * (+s.second_eval_pct || 30) / 100, cap3: max * (+s.final_eval_pct || 40) / 100, rule: s.outcome_rule || "highest" };
  }
  const better = (r, p, rule) => {
    if (rule !== "latest" && r.level !== p.level) return r.level > p.level;
    return r.assessed_on > p.assessed_on || (r.assessed_on === p.assessed_on && (r.created_at || "") > (p.created_at || ""));
  };
  function build(filter) {
    const rule = caps().rule, m = new Map(), cnt = new Map();
    for (const r of S.mastery) {
      if (filter && !filter(r)) continue;
      const k = r.student_id + "|" + r.outcome_id, p = m.get(k);
      cnt.set(k, (cnt.get(k) || 0) + 1);
      if (!p || better(r, p, rule)) m.set(k, r);
    }
    return { m, cnt };
  }
  function cache() {
    if (C) return C;
    const b = build(); C = { eff: b.m, cnt: b.cnt, calc: new Map(), sec: new Map() };
    return C;
  }
  const effOf = (sid, oid) => cache().eff.get(sid + "|" + oid) || null;
  const countOf = (sid, oid) => cache().cnt.get(sid + "|" + oid) || 0;
  const markOf = (sid, slot) => S.marks.find((x) => x.student_id === sid && x.slot === slot) || null;

  // احتساب علامة طالب: التقويم الثاني = متوسط المستويات المقيسة ÷ ٤ × السقف، ونصيب كل نتاج يُجمع ليساوي العلامة
  function calc(st, opts) {
    const key = st.id + (opts ? JSON.stringify(opts) : "");
    const cc = cache(); if (!opts && cc.calc.has(key)) return cc.calc.get(key);
    const c = caps(), units = (opts && opts.units) || T.semUnits(st.section_id);
    const effMap = opts && opts.filter ? build(opts.filter).m : cc.eff;
    const outs = T.outcomesOfUnits(units), lv = {}, src = {};
    outs.forEach((o) => { const r = effMap.get(st.id + "|" + o.id); if (r) { lv[o.id] = r.level; src[o.id] = r.source; } });
    const assessed = outs.filter((o) => lv[o.id]), N = assessed.length, w = {};
    assessed.forEach((o) => (w[o.id] = (lv[o.id] / 4) * c.cap2 / N));
    const unitMarks = units.map((u) => { const os = T.outcomesOfUnits([u]).filter((o) => lv[o.id]); return os.length ? os.reduce((a, o) => a + w[o.id], 0) : null; });
    const second = N ? assessed.reduce((a, o) => a + w[o.id], 0) : null;
    const avgLv = N ? assessed.reduce((a, o) => a + lv[o.id], 0) / N : null;
    const f = markOf(st.id, "first_written"), z = markOf(st.id, "final_written");
    const first = f ? (f.absent_no_excuse ? 0 : f.mark != null ? +f.mark : null) : null;
    const fin = z ? (z.absent_no_excuse ? 0 : z.mark != null ? +z.mark : null) : null;
    const parts = [first, second, fin].filter((v) => v != null);
    const total = parts.length ? parts.reduce((a, b) => a + b, 0) : null;
    const complete = first != null && second != null && fin != null;
    const r = { st, lv, src, w, units: unitMarks, unitList: units, outs, N, nOut: outs.length, coverage: outs.length ? N / outs.length : 0,
      avgLv, second, first, fin, total, complete, verbal: complete ? verbal((total / c.max) * 100) : "—",
      secondPct: second != null ? (second / c.cap2) * 100 : null };
    if (!opts) cc.calc.set(key, r);
    return r;
  }

  // مؤشر الحاجة إلى دعم (٠–١٠٠) مع الأسباب
  function risk(st) {
    const r = calc(st), why = []; let score = 0;
    if (r.N >= 3 && r.avgLv < 2) { score += 40; why.push("متوسط إتقانه " + T.nf(r.avgLv, 1) + " من ٤"); }
    else if (r.N >= 3 && r.avgLv < 2.5) { score += 20; why.push("إتقان دون المتوقع (" + T.nf(r.avgLv, 1) + ")"); }
    const ones = Object.values(r.lv).filter((x) => x === 1).length;
    if (ones >= 3) { score += 15; why.push(ones + " نتاجات بمستوى مبتدئ"); }
    const since = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
    const abs = S.att.filter((a) => a.student_id === st.id && a.on_date >= since && (a.status === "absent")).length;
    if (abs >= 3) { score += Math.min(25, abs * 6); why.push(abs + " أيام غياب في آخر شهر"); }
    const ev = S.events.filter((e) => e.student_id === st.id && e.on_date >= since);
    let neg = 0, pos = 0; ev.forEach((e) => { const t = S.eventTypes.find((x) => x.id === e.event_type_id); if (!t) return; if (t.direction < 0) neg += +t.weight; else pos += +t.weight; });
    if (neg - pos >= 4) { score += 15; why.push("سلوك/مشاركة سلبية متكررة"); }
    if (r.first != null && r.first < caps().cap1 / 2) { score += 15; why.push("علامة الأول " + T.nf(r.first) + " من " + T.nf(caps().cap1)); }
    return { score: Math.min(100, score), why, calc: r };
  }

  function secSummary(secId) {
    const cc = cache(); if (cc.sec.has(secId)) return cc.sec.get(secId);
    const studs = T.studentsOf(secId), rows = studs.map(calc), units = T.semUnits(secId), outs = T.outcomesOfUnits(units);
    const measured = rows.reduce((a, r) => a + r.N, 0), cells = studs.length * outs.length;
    const sec2 = rows.filter((r) => r.second != null);
    const risks = studs.map((s) => Object.assign({ st: s }, risk(s))).filter((x) => x.score >= 35).sort((a, b) => b.score - a.score);
    const perOut = outs.map((o) => {
      const lv = studs.map((s) => (effOf(s.id, o.id) || {}).level).filter(Boolean);
      return { o, n: lv.length, avg: lv.length ? lv.reduce((a, b) => a + b, 0) / lv.length : null, dist: [1, 2, 3, 4].map((k) => lv.filter((x) => x === k).length) };
    });
    const r = { studs, rows, outs, units, coverage: cells ? measured / cells : 0, avgSecond: sec2.length ? sec2.reduce((a, r) => a + r.second, 0) / sec2.length : null,
      risks, perOut, weak: perOut.filter((p) => p.n >= Math.max(3, studs.length * 0.4) && p.avg < 2.2).sort((a, b) => a.avg - b.avg) };
    cc.sec.set(secId, r);
    return r;
  }

  const isSchoolDay = () => { const d = new Date().getDay(); return d >= 0 && d <= 4; }; // الأحد–الخميس
  function attTaken(secId, date) {
    const ids = new Set(T.studentsOf(secId).map((s) => s.id));
    return S.att.some((a) => a.on_date === date && ids.has(a.student_id));
  }

  // التنبيهات الموحّدة (الخادم + التحليل المحلي) مرتبة بالأولوية
  function alerts() {
    const out = [], secId = S.sec, sec = T.sec();
    const map = { warn: 1, todo: 2, info: 3, tip: 4 };
    (S.alertsSrv || []).forEach((a) => {
      let go = "#dash", act = "عرض";
      if (a.go === "credentials") { go = "#people"; act = "أكمل البيانات"; }
      else if (a.go.startsWith("report:")) { go = "#exam/" + a.go.slice(7); act = "النتائج"; }
      else if (a.go.startsWith("exam:")) { go = "#exam/" + a.go.slice(5); act = "فتح"; }
      out.push({ lvl: a.level, msg: a.msg, go, act, ic: a.level === "warn" ? "alert" : a.level === "info" ? "play" : "flag" });
    });
    if (sec) {
      const sm = secSummary(secId), now = new Date();
      if (isSchoolDay() && now.getHours() >= 8 && now.getHours() < 15 && !attTaken(secId, T.today()) && sm.studs.length)
        out.push({ lvl: "todo", msg: "لم يُسجَّل حضور شعبة «" + sec.name + "» اليوم.", go: "#class", act: "سجّل الحضور", ic: "users" });
      if (sm.risks.length) out.push({ lvl: "warn", msg: sm.risks.length + " طالبًا في «" + sec.name + "» يحتاجون دعمًا (إتقان منخفض أو غياب أو سلوك).", sub: sm.risks.slice(0, 3).map((x) => x.st.full_name).join("، "), go: "#people", act: "عرض", ic: "user" });
      sm.weak.slice(0, 2).forEach((p) => out.push({ lvl: "tip", msg: "النتاج " + p.o.label + " متوسطه " + T.nf(p.avg, 1) + " من ٤ في «" + sec.name + "» — يحتاج إعادة تدريس.", sub: p.o.text, go: "#grid/" + p.o.lesson.id, act: "رصد", ic: "target" }));
      const withFirst = sm.studs.filter((s) => markOf(s.id, "first_written")).length;
      if (withFirst && withFirst < sm.studs.length) out.push({ lvl: "todo", msg: (sm.studs.length - withFirst) + " طالبًا في «" + sec.name + "» بلا علامة الاختبار الأول.", go: "#marks", act: "أدخل العلامات", ic: "award" });
      // درس رُصد جزئيًّا: طلبة بلا قياس في درس بدأ رصده
      sm.units.forEach((u) => u.lessons.forEach((l) => {
        if (!l.outcomes.length || !sm.studs.length) return;
        const cells = l.outcomes.length * sm.studs.length; let n = 0;
        l.outcomes.forEach((o) => sm.studs.forEach((s) => { if (effOf(s.id, o.id)) n++; }));
        if (n > 0 && n < cells * 0.6) out.push({ lvl: "todo", msg: "رصد الدرس " + l.seq + " «" + l.title + "» غير مكتمل (" + Math.round((n / cells) * 100) + "٪) في «" + sec.name + "».", go: "#grid/" + l.id, act: "أكمل الرصد", ic: "target" });
      }));
    }
    if (S.me && !S.me.national_id) out.push({ lvl: "tip", msg: "اربط رقمك الوطني بحسابك لتدخل به بدل البريد.", go: "#settings", act: "اربط الآن", ic: "id" });
    const zeroQ = Object.values(S.O).filter((o) => !o.nq).length;
    if (zeroQ) out.push({ lvl: "tip", msg: zeroQ + " نتاجًا بلا أي سؤال في بنك الأسئلة؛ لن يُقاس إلكترونيًّا.", go: "#bank", act: "البنك", ic: "layers" });
    return out.sort((a, b) => map[a.lvl] - map[b.lvl]);
  }
  function badges() {
    const b = {};
    if (!S.ready) return b;
    const open = S.exams.filter((e) => e.state === "open").length; if (open) b.exams = { n: open, soft: true };
    const noCred = S.students.filter((s) => s.is_active && (!s.national_id || !s.birth_date)).length; if (noCred) b.people = { n: noCred };
    if (T.sec() && isSchoolDay() && new Date().getHours() >= 8 && new Date().getHours() < 15 && !attTaken(S.sec, T.today()) && T.studentsOf(S.sec).length) b.class = { n: "!" };
    return b;
  }

  T.brain = { VERBAL, VTXT, verbal, caps, invalidate, effOf, countOf, markOf, calc, risk, secSummary, alerts, badges, attTaken, build, isSchoolDay };
})();
