// الاختبارات الإلكترونية: الإنشاء بالسحب الذكي، الحماية من الغش، النتائج والتحليل، الاعتماد في السجلات، والتقارير
(function () {
  const { esc, toast, openSheet, closeSheet, confirmSheet, fmtDT, toLocalInput, fromLocalInput, download, csv, L } = U, S = T.S;
  const KINDS = { blur: "مغادرة نافذة الاختبار", hidden: "الخروج إلى تطبيق/تبويب آخر", fs_exit: "الخروج من ملء الشاشة", copy: "محاولة نسخ", paste: "محاولة لصق",
    context: "القائمة اليمنى", print: "محاولة طباعة", screenshot: "زر لقطة الشاشة", devtools: "أدوات المطوّر", resize: "تصغير/تقسيم الشاشة", shortcut: "اختصار لوحة مفاتيح محظور",
    offline: "انقطاع الاتصال", multi: "فتح الاختبار من جهاز/جلسة أخرى" };
  const STAT = { submitted: ["سلّم", "open"], expired: ["انتهى وقته", "draft"], in_progress: ["يحلّ الآن", "scheduled"], absent: ["لم يدخل", "bad"] };
  const lvlOf = (c, n) => Math.max(1, Math.min(4, Math.round((c / n) * 4)));

  // ================= القائمة =================
  T.view("exams", {
    title: "الاختبارات", sub: () => "إنشاء ونشر ومتابعة لحظية — والنتائج تذهب إلى رصد النتاجات بضغطة",
    async render(el) {
      const ex = S.exams, groups = [["open", "مفتوحة الآن"], ["scheduled", "مجدولة"], ["draft", "مسودات"], ["ended", "منتهية"]];
      let h = `<div class="vhead"><div><h2>${ex.length} اختبارًا</h2><p>رابط الطلبة: <a href="index.html" target="_blank">${esc(new URL("index.html", location.href).href)}</a></p></div>
        <div class="toolbar"><button class="btn primary" id="exNew">${ic("file", "sm")}اختبار جديد</button><button class="btn outline sm" id="exLink">نسخ رابط الطلبة</button></div></div>`;
      groups.forEach(([k, t]) => { const l = ex.filter((x) => x.state === k); if (l.length) h += `<div class="sect"><h3>${t} <span class="tiny">${l.length}</span></h3><div class="g2">` + l.map(card).join("") + "</div></div>"; });
      if (!ex.length) h += T.empty("file", "لا اختبارات بعد", "أنشئ اختبارًا يسحب من بنك الأسئلة لكل طالب مجموعة مختلفة.");
      el.innerHTML = h;
      el.querySelector("#exNew").onclick = () => editExam(null);
      el.querySelector("#exLink").onclick = () => { const u = new URL("index.html", location.href).href; navigator.clipboard.writeText(u).then(() => toast("نُسخ: " + u), () => toast(u)); };
      bind(el);
      if (ex.some((x) => x.state === "open")) T.every(30000, async () => { await T.refreshExams(); if (S.cur === "exams") T.route(); });
    }
  });
  function card(x) {
    const secs = (x.section_ids || []).map(T.secName).join("، ");
    return `<div class="card pad stack">
      <div class="row sp"><a href="#exam/${x.id}" style="color:inherit;font-weight:700;font-family:var(--f-disp);font-size:15.5px">${esc(x.title)}</a><span class="pill ${x.state}">${T.STATE[x.state]}</span></div>
      <div class="tiny">${esc(T.KIND[x.kind])} · ${x.n_q} سؤالًا${x.selection === "random" ? " (سحب عشوائي)" : ""} · ${x.duration_min} دقيقة · ${x.mode === "lab" ? "مختبر برمز" : "عن بعد"}${secs ? " · " + esc(secs) : ""}
        ${x.secure_mode !== false ? ' · <span class="pill gold">محمي</span>' : ""}</div>
      <div class="tiny">من ${esc(fmtDT(x.starts_at))} إلى ${esc(fmtDT(x.ends_at))}</div>
      ${x.mode === "lab" && x.lab_code && x.state !== "ended" ? `<div class="row sp"><span class="tiny">رمز الجلسة</span><span class="big-code">${esc(x.lab_code)}</span></div>` : ""}
      ${x.state !== "draft" ? `<div class="row sp tiny"><span>سلّم ${x.n_done} من ${x.n_students}${x.n_running ? " · يحلّ الآن " + x.n_running : ""}</span><span>${x.booked_at ? "✓ اعتُمد في السجلات" : ""}</span></div>
        <div class="meter"><i style="width:${x.n_students ? Math.round((x.n_done / x.n_students) * 100) : 0}%"></i></div>` : ""}
      <div class="row wrap">${buttons(x)}</div></div>`;
  }
  function buttons(x) {
    const b = (act, label, cls) => `<button class="btn sm ${cls || "outline"}" data-ex="${x.id}" data-act="${act}">${label}</button>`;
    let h = "";
    if (x.state !== "draft") h += b("report", "النتائج", x.state === "ended" ? "primary" : "soft");
    h += b("edit", "تعديل");
    if (x.state === "draft") h += b("publish", "نشر", "primary") + b("open_now", "افتح الآن");
    if (x.state === "scheduled") h += b("open_now", "افتح الآن", "primary") + b("draft", "إرجاع مسودة");
    if (x.state === "open") h += b("close_now", "أغلق الآن", "danger");
    if (x.state === "ended") h += b("reopen", "إعادة فتح");
    if (x.mode === "lab" && x.state !== "ended") h += b("new_code", "رمز جديد");
    h += b("duplicate", "نسخ", "ghost");
    if (!x.n_started) h += b("delete", "حذف", "ghost");
    return h;
  }
  function bind(root) { root.querySelectorAll("[data-act]").forEach((btn) => (btn.onclick = () => action(btn.dataset.ex, btn.dataset.act))); }
  async function action(id, act) {
    if (act === "edit") return editExam(id);
    if (act === "report") return T.go("#exam/" + id);
    if (act === "delete" && !(await confirmSheet("حذف الاختبار؟", "لا يمكن التراجع.", "احذف", true))) return;
    if (act === "close_now" && !(await confirmSheet("إغلاق الاختبار الآن؟", "من يحلّ الآن تُسلَّم إجاباته المحفوظة تلقائيًّا.", "أغلق", true))) return;
    try {
      const r = await T.rpc("t_exam_action", { p_id: id, p_action: act });
      toast({ publish: "نُشر الاختبار", open_now: "فُتح الاختبار", close_now: "أُغلق الاختبار", reopen: "أُعيد فتح الاختبار", new_code: "رمز جديد: " + ((r && r.lab_code) || ""),
        duplicate: "أُنشئت نسخة (مسودة)", delete: "حُذف", draft: "صار مسودة" }[act] || "تم");
      await T.refreshExams(); if (act === "delete" && S.cur === "exam") T.go("#exams"); else T.route();
    } catch (e) { toast(e.message, true); }
  }

  // ================= المحرّر =================
  async function editExam(id) {
    await T.loadQuestions();
    const x = id ? S.exams.find((e) => e.id === id) : null;
    const start = new Date(Math.ceil(Date.now() / 300000) * 300000 + 3600000);
    const e = x || { title: "", kind: "quiz", mode: "remote", starts_at: start.toISOString(), ends_at: new Date(start.getTime() + 3600000).toISOString(),
      duration_min: 20, shuffle_questions: true, shuffle_options: true, allow_back: true, require_fullscreen: false, show_result: "after_close", max_attempts: 1,
      section_ids: S.sec ? [S.sec] : S.sections.map((s) => s.id), question_ids: [], n_started: 0, selection: "random", draw_rules: [], secure_mode: true, max_violations: 5 };
    const sel = (e.question_ids || []).slice(), locked = e.n_started > 0, pf = { lesson: "", outcome: "", bloom: "" };
    let selMode = x ? x.selection || "fixed" : "random", mode = e.mode;
    const blank = () => ({ lesson_ids: [], easy: 0, medium: 0, hard: 0 });
    const toLessons = (r) => (r.lesson_ids && r.lesson_ids.length) ? r.lesson_ids.slice() : r.lesson_id ? [r.lesson_id]
      : r.outcome_id && S.O[r.outcome_id] ? [S.O[r.outcome_id].lesson.id] : r.unit_id && S.U[r.unit_id] ? S.U[r.unit_id].lessons.map((l) => l.id) : [];
    const rules = (x && x.draw_rules && x.draw_rules.length ? x.draw_rules : [blank()]).map((r) => ({ lesson_ids: toLessons(r), easy: +r.easy || 0, medium: +r.medium || 0, hard: +r.hard || 0 }));
    const b = openSheet(`<h3>${x ? "تعديل: " + esc(x.title) : "اختبار جديد"}</h3>
      <div class="fields two"><label class="field"><span>العنوان</span><input class="input" id="eT" value="${esc(e.title)}" placeholder="مثال: كويز الدرس الرابع — دفتر اليومية"></label>
        <label class="field"><span>النوع</span><select class="input" id="eK">${T.opt(e.kind, Object.entries(T.KIND))}</select></label></div>
      <div class="field" style="margin-top:12px"><span>مكان التقديم</span><div class="seg" id="eM"><button type="button" data-m="remote" aria-pressed="${e.mode === "remote"}">عن بعد</button>
        <button type="button" data-m="lab" aria-pressed="${e.mode === "lab"}">مختبر الحاسوب (برمز جلسة)</button></div></div>
      <div class="fields three" style="margin-top:12px"><label class="field"><span>يفتح في</span><input class="input" type="datetime-local" id="eS" value="${toLocalInput(e.starts_at)}"></label>
        <label class="field"><span>يُغلق في</span><input class="input" type="datetime-local" id="eE" value="${toLocalInput(e.ends_at)}"></label>
        <label class="field"><span>مدة الطالب (دقيقة)</span><input class="input mono" type="number" min="1" max="300" id="eD" value="${e.duration_min}"></label></div>
      <div class="field" style="margin-top:12px"><span>الشعب</span><div class="row wrap">${S.sections.map((s) =>
        `<label class="check"><input type="checkbox" class="eSec" value="${s.id}" ${(e.section_ids || []).includes(s.id) ? "checked" : ""}> ${esc(s.name)} <span class="tiny">(${s.n_cred}/${s.n} جاهز)</span></label>`).join("")}</div></div>
      <div class="fields two" style="margin-top:12px"><label class="field"><span>عرض النتيجة للطالب</span><select class="input" id="eR">${T.opt(e.show_result, [["immediate", "فور التسليم"], ["after_close", "بعد إغلاق الاختبار"], ["never", "لا تُعرض"]])}</select></label>
        <label class="field"><span>عدد المحاولات (تُحتسب الأعلى)</span><select class="input" id="eA">${T.opt(String(e.max_attempts), [1, 2, 3, 4, 5].map((n) => [String(n), String(n)]))}</select></label></div>
      <div class="row wrap" style="margin-top:10px;gap:14px"><label class="check"><input type="checkbox" id="eQS" ${e.shuffle_questions ? "checked" : ""}> خلط ترتيب الأسئلة</label>
        <label class="check"><input type="checkbox" id="eOS" ${e.shuffle_options ? "checked" : ""}> خلط الخيارات</label><label class="check"><input type="checkbox" id="eB" ${e.allow_back ? "checked" : ""}> السماح بالرجوع</label></div>
      <div class="card pad" style="margin-top:14px;background:var(--gold-soft);border-color:transparent"><b>${ic("shield", "sm")} الحماية من الغش</b>
        <div class="row wrap" style="margin-top:10px;gap:14px"><label class="check"><input type="checkbox" id="eSec" ${e.secure_mode !== false ? "checked" : ""}> وضع الحماية (علامة مائية باسم الطالب، منع النسخ واللصق والطباعة، رصد الخروج ولقطة الشاشة)</label>
          <label class="check"><input type="checkbox" id="eF" ${e.require_fullscreen ? "checked" : ""}> ملء الشاشة إجباري</label></div>
        <label class="row" style="margin-top:10px;gap:8px"><span class="tiny" style="font-weight:700">إغلاق المحاولة تلقائيًّا بعد</span><input class="input mono sm" type="number" min="0" max="50" id="eMV" value="${e.max_violations || 0}" style="width:80px"><span class="tiny">مخالفات (٠ = بلا إغلاق، تُسجَّل فقط)</span></label></div>
      <div class="sect"><h3>الأسئلة ${locked ? '<span class="pill draft">مقفلة: بدأ طلاب الحل</span>' : ""}</h3>
      <div class="seg" id="eSel" style="margin-bottom:12px"><button type="button" data-s="random" aria-pressed="${selMode === "random"}">سحب عشوائي لكل طالب</button>
        <button type="button" data-s="fixed" aria-pressed="${selMode === "fixed"}">أسئلة محددة للجميع</button></div>
      <div id="randPanel"><p class="tiny" style="margin-top:0">علّم الدروس (من وحدة أو أكثر)، وحدّد كم سؤالًا من كل صعوبة. يأخذ كل طالب مجموعة مختلفة بالتوزيع نفسه.</p>
        <div id="rRules" class="stack"></div>
        ${locked ? "" : `<div class="row wrap" style="margin-top:10px"><button class="btn sm outline" id="rAdd">＋ قاعدة</button><span class="tiny">أو</span>
          <select class="input sm" id="rUnitAll" style="width:auto">${T.opt("", S.units.map((u) => [u.id, "الوحدة " + u.seq + " · " + u.title]))}</select><button class="btn sm outline" id="rPerLesson">قاعدة لكل درس فيها</button></div>`}
        <div id="rSum" class="card pad" style="margin-top:10px"></div></div>
      <div id="fixPanel"><div id="eSum" class="card pad" style="margin-bottom:10px"></div>
        ${locked ? "" : `<div class="fields three"><label class="field"><span>الدرس</span><select class="input" id="pL">${T.opt("", S.units.flatMap((u) => u.lessons).map((l) => [l.id, "و" + l.unit.seq + " · الدرس " + l.seq + " · " + l.title]), "كل الدروس")}</select></label>
          <label class="field"><span>النتاج</span><select class="input" id="pO"><option value="">كل النتاجات</option></select></label>
          <label class="field"><span>بلوم</span><select class="input" id="pB">${T.opt("", T.bank.BLOOM.map((z) => [z, z]), "الكل")}</select></label></div>
          <div class="row wrap" style="margin:10px 0"><button class="btn sm outline" id="pAll">تحديد كل الظاهر</button><button class="btn sm outline" id="pNone">إلغاء الظاهر</button>
            <input class="input mono sm" id="pN" type="number" min="1" value="5" style="width:80px"><button class="btn sm outline" id="pRand">عشوائي من الظاهر</button></div>
          <div id="pList" class="tw" style="max-height:320px"></div>`}</div></div>
      <div class="foot"><button class="btn primary grow" id="eSaveP">حفظ ونشر</button><button class="btn outline grow" id="eSaveD">حفظ كمسودة</button></div>`, true);

    const DK = [["easy", "سهل"], ["medium", "متوسط"], ["hard", "صعب"]];
    const poolN = (r, d) => { const set = new Set(r.lesson_ids); return S.qs.filter((qq) => qq.active && qq.difficulty === d && S.O[qq.outcome_id] && (!set.size || set.has(S.O[qq.outcome_id].lesson.id))).length; };
    const scopeName = (r) => !r.lesson_ids.length ? "كل الكتاب" : S.units.map((u) => { const ls = u.lessons.filter((l) => r.lesson_ids.includes(l.id)); if (!ls.length) return "";
      return ls.length === u.lessons.length ? "الوحدة " + u.seq + " كاملة" : "الوحدة " + u.seq + ": الدروس " + ls.map((l) => l.seq).join("، "); }).filter(Boolean).join(" + ");
    const rulesSum = () => {
      const t = { easy: 0, medium: 0, hard: 0 }, warn = [];
      rules.forEach((r, i) => DK.forEach(([k, d]) => { const n = +r[k] || 0; t[k] += n; const have = poolN(r, d); if (n > have) warn.push(`القاعدة ${i + 1} (${esc(scopeName(r))}): مطلوب ${n} ${d} والمتاح ${have}`); }));
      const tot = t.easy + t.medium + t.hard;
      b.querySelector("#rSum").innerHTML = `<b>كل طالب يأخذ ${tot} سؤالًا</b> <span class="tiny">— سهل ${t.easy} · متوسط ${t.medium} · صعب ${t.hard}</span>` +
        (warn.length ? `<div class="note warn" style="margin-top:8px">${warn.join("<br>")}</div>` : "");
      b.querySelectorAll(".rule").forEach((row, i) => { row.querySelector(".r-scope").textContent = scopeName(rules[i]);
        DK.forEach(([k, d]) => { const have = poolN(rules[i], d), inp = row.querySelector(".r-" + k); row.querySelector(".h-" + k).textContent = "من " + have; inp.style.borderColor = (+rules[i][k] || 0) > have ? "var(--danger)" : ""; }); });
      return tot;
    };
    const drawRules = () => {
      const box = b.querySelector("#rRules"), dis = locked ? "disabled" : "";
      box.innerHTML = rules.map((r, i) => `<div class="card pad rule" data-i="${i}">
          <div class="row sp" style="margin-bottom:6px"><b style="font-size:13.5px">القاعدة ${i + 1}: <span class="r-scope" style="color:var(--accent)"></span></b>${locked || rules.length < 2 ? "" : '<button type="button" class="btn sm ghost r-del">حذف</button>'}</div>
          <div class="tree">${S.units.map((u) => { const n = u.lessons.filter((l) => r.lesson_ids.includes(l.id)).length;
            return `<div class="tu"><label class="check tu-h"><input type="checkbox" class="t-unit" data-u="${u.id}" ${n && n === u.lessons.length ? "checked" : ""} ${dis}><b>الوحدة ${u.seq}</b> <span class="tiny">${esc(u.title)}</span></label>
              <div class="chips">${u.lessons.map((l) => `<label class="chip lchip" title="${esc(l.title)}"><input type="checkbox" class="t-les" data-l="${l.id}" ${r.lesson_ids.includes(l.id) ? "checked" : ""} ${dis}>الدرس ${l.seq} <span class="tiny">${esc(l.title.length > 24 ? l.title.slice(0, 23) + "…" : l.title)}</span></label>`).join("")}</div></div>`; }).join("")}</div>
          <div class="row wrap" style="gap:14px;margin-top:10px">${DK.map(([k, d]) => `<label class="row" style="gap:6px"><span style="font-weight:600;font-size:13.5px">${d}</span>
            <input type="number" min="0" class="input mono sm r-${k}" value="${+r[k] || 0}" style="width:74px" ${dis}><span class="tiny h-${k}"></span></label>`).join("")}</div></div>`).join("");
      box.querySelectorAll(".rule").forEach((row) => {
        const i = +row.dataset.i, r = rules[i];
        row.querySelectorAll(".t-unit").forEach((cb) => { const u = S.U[cb.dataset.u], n = u.lessons.filter((l) => r.lesson_ids.includes(l.id)).length;
          cb.indeterminate = n > 0 && n < u.lessons.length;
          cb.onchange = () => { const ids = u.lessons.map((l) => l.id); r.lesson_ids = r.lesson_ids.filter((z) => !ids.includes(z)); if (cb.checked) r.lesson_ids.push(...ids); drawRules(); }; });
        row.querySelectorAll(".t-les").forEach((cb) => (cb.onchange = () => { r.lesson_ids = r.lesson_ids.filter((z) => z !== cb.dataset.l); if (cb.checked) r.lesson_ids.push(cb.dataset.l); drawRules(); }));
        DK.forEach(([k]) => (row.querySelector(".r-" + k).oninput = (ev) => { r[k] = Math.max(0, parseInt(ev.target.value, 10) || 0); rulesSum(); }));
        const del = row.querySelector(".r-del"); if (del) del.onclick = () => { rules.splice(i, 1); drawRules(); };
      });
      rulesSum();
    };
    const setSel = (m) => { selMode = m; b.querySelectorAll("#eSel button").forEach((z) => z.setAttribute("aria-pressed", z.dataset.s === m));
      b.querySelector("#randPanel").classList.toggle("hide", m !== "random"); b.querySelector("#fixPanel").classList.toggle("hide", m !== "fixed"); };
    b.querySelectorAll("#eSel button").forEach((z) => (z.onclick = () => { if (!locked) setSel(z.dataset.s); }));
    drawRules(); setSel(selMode);
    if (!locked) {
      b.querySelector("#rAdd").onclick = () => { rules.push(blank()); drawRules(); };
      b.querySelector("#rPerLesson").onclick = () => { const u = S.U[b.querySelector("#rUnitAll").value]; if (!u) return;
        if (rules.length === 1 && !rules[0].lesson_ids.length && !(rules[0].easy + rules[0].medium + rules[0].hard)) rules.pop();
        u.lessons.forEach((l) => rules.push(Object.assign(blank(), { lesson_ids: [l.id] }))); drawRules(); toast("أُضيفت " + u.lessons.length + " قواعد — حدّد أعدادها"); };
    }
    b.querySelectorAll("#eM button").forEach((btn) => (btn.onclick = () => { mode = btn.dataset.m; b.querySelectorAll("#eM button").forEach((z) => z.setAttribute("aria-pressed", z === btn)); }));
    const summary = () => {
      const byO = {}; sel.forEach((qid) => { const qq = S.qs.find((z) => z.id === qid); if (qq) byO[qq.outcome_id] = (byO[qq.outcome_id] || 0) + 1; });
      b.querySelector("#eSum").innerHTML = `<b>${sel.length} سؤالًا مختارًا</b>` + (sel.length ? `<div class="chips" style="margin-top:8px">` +
        Object.entries(byO).map(([o, n]) => `<span class="chip">${esc(T.bank.label(o))}<span class="n">${n}</span></span>`).join("") + "</div>" : "");
    };
    const visible = () => S.qs.filter((qq) => qq.active && S.O[qq.outcome_id] && (!pf.lesson || S.O[qq.outcome_id].lesson.id === pf.lesson) && (!pf.outcome || qq.outcome_id === pf.outcome) && (!pf.bloom || qq.bloom === pf.bloom));
    const list = () => {
      const v = visible();
      b.querySelector("#pList").innerHTML = v.length ? '<table class="t"><tbody>' + v.map((qq) => `<tr><td style="width:34px"><input type="checkbox" data-q="${qq.id}" ${sel.includes(qq.id) ? "checked" : ""} style="width:18px;height:18px;accent-color:var(--accent)"></td>
        <td class="tiny num">#${qq.num}</td><td class="tiny">${esc(T.bank.label(qq.outcome_id))}</td><td class="tiny">${esc(qq.difficulty)}</td><td>${esc(qq.stem.slice(0, 110))}</td></tr>`).join("") + "</tbody></table>"
        : '<div class="empty">لا أسئلة بهذه التصفية.</div>';
      b.querySelectorAll("[data-q]").forEach((c) => (c.onchange = () => { const i = sel.indexOf(c.dataset.q); if (c.checked && i < 0) sel.push(c.dataset.q); if (!c.checked && i >= 0) sel.splice(i, 1); summary(); }));
    };
    summary();
    if (!locked) {
      b.querySelector("#pL").onchange = (ev) => { pf.lesson = ev.target.value; pf.outcome = ""; b.querySelector("#pO").innerHTML = T.opt("", pf.lesson ? S.L[pf.lesson].outcomes.map((o) => [o.id, "ن" + o.seq + " — " + o.text]) : [], "كل النتاجات"); list(); };
      b.querySelector("#pO").onchange = (ev) => { pf.outcome = ev.target.value; list(); };
      b.querySelector("#pB").onchange = (ev) => { pf.bloom = ev.target.value; list(); };
      b.querySelector("#pAll").onclick = () => { visible().forEach((qq) => { if (!sel.includes(qq.id)) sel.push(qq.id); }); list(); summary(); };
      b.querySelector("#pNone").onclick = () => { const v = new Set(visible().map((qq) => qq.id)); for (let i = sel.length - 1; i >= 0; i--) if (v.has(sel[i])) sel.splice(i, 1); list(); summary(); };
      b.querySelector("#pRand").onclick = () => { const n = +b.querySelector("#pN").value || 0, pool = visible().filter((qq) => !sel.includes(qq.id));
        for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
        pool.slice(0, n).forEach((qq) => sel.push(qq.id)); list(); summary(); if (pool.length < n) toast("المتاح " + pool.length + " فقط", true); };
      list();
    }
    const save = async (publish) => {
      const p = { id: id || null, title: b.querySelector("#eT").value.trim(), kind: b.querySelector("#eK").value, mode,
        starts_at: fromLocalInput(b.querySelector("#eS").value), ends_at: fromLocalInput(b.querySelector("#eE").value), duration_min: +b.querySelector("#eD").value,
        show_result: b.querySelector("#eR").value, max_attempts: +b.querySelector("#eA").value, shuffle_questions: b.querySelector("#eQS").checked, shuffle_options: b.querySelector("#eOS").checked,
        allow_back: b.querySelector("#eB").checked, require_fullscreen: b.querySelector("#eF").checked, section_ids: [...b.querySelectorAll(".eSec:checked")].map((c) => c.value),
        question_ids: selMode === "fixed" ? sel : [], selection: selMode, draw_rules: selMode === "random" ? rules : [], publish };
      if (!p.title) return toast("اكتب عنوان الاختبار", true);
      if (!p.starts_at || !p.ends_at || p.ends_at <= p.starts_at) return toast("وقت الإغلاق يجب أن يكون بعد وقت الفتح", true);
      if (publish && selMode === "fixed" && !sel.length) return toast("اختر أسئلة قبل النشر", true);
      if (publish && selMode === "random" && !rulesSum()) return toast("حدّد عدد الأسئلة في قاعدة واحدة على الأقل", true);
      if (publish && !p.section_ids.length) return toast("اختر شعبة واحدة على الأقل", true);
      const btn = b.querySelector(publish ? "#eSaveP" : "#eSaveD"); U.spin(btn, true, "جارٍ الحفظ…");
      try {
        const r = await T.rpc("t_save_exam", { p });
        const eid = (r && r.id) || id;
        if (eid) await T.q(T.sb.from("exams").update({ secure_mode: b.querySelector("#eSec").checked, max_violations: Math.max(0, +b.querySelector("#eMV").value || 0) }).eq("id", eid));
        closeSheet(); toast(publish ? "نُشر الاختبار" + (r && r.lab_code ? " — رمز الجلسة " + r.lab_code : "") : "حُفظ كمسودة");
        await T.refreshExams(); T.route();
      } catch (err) { toast(err.message, true); U.spin(btn, false); }
    };
    b.querySelector("#eSaveP").onclick = () => save(true);
    b.querySelector("#eSaveD").onclick = () => save(false);
  }

  // ================= صفحة الاختبار: النتائج والتحليل =================
  const R = { rep: null, ev: [], tab: "students" };
  T.view("exam", {
    title: "نتائج الاختبار", sub: () => { const x = R.rep && R.rep.exam; return x ? x.title : ""; },
    async render(el, id) {
      const x = S.exams.find((e) => e.id === id);
      if (!x) { el.innerHTML = T.empty("file", "الاختبار غير موجود", "", '<a class="btn outline" href="#exams" style="margin-top:12px">كل الاختبارات</a>'); return; }
      el.innerHTML = `<div class="vhead"><div><a href="#exams" class="tiny">${ic("right", "sm")} كل الاختبارات</a><h2 style="margin-top:4px">${esc(x.title)}</h2>
          <p>${esc(T.KIND[x.kind])} · <span class="pill ${x.state}">${T.STATE[x.state]}</span> · ${esc(fmtDT(x.starts_at))} — ${esc(fmtDT(x.ends_at))}</p></div>
        <div class="toolbar">${x.kind !== "practice" && x.state !== "draft" ? `<button class="btn primary" id="rBook">${ic("check", "sm")}اعتماد في السجلات</button>` : ""}
          <button class="btn outline sm" id="rXlsx">Excel النتائج</button><button class="btn outline sm" id="rMail">${ic("mail", "sm")}أرسله لبريدي</button>
          <button class="btn ghost sm" id="rRegrade">إعادة التصحيح</button><button class="btn ghost sm" id="rRef">${ic("refresh", "sm")}</button></div></div>
        <div class="row wrap" style="margin-bottom:6px">${buttons(x)}</div><div id="rBody"><div class="loading"><span class="spin"></span></div></div>`;
      bind(el);
      el.querySelector("#rRef").onclick = () => load(id);
      const bk = el.querySelector("#rBook"); if (bk) bk.onclick = () => bookFlow(id);
      el.querySelector("#rXlsx").onclick = () => exportXlsx().catch((e) => toast(e.message, true));
      el.querySelector("#rMail").onclick = () => mailNow(id);
      el.querySelector("#rRegrade").onclick = async () => { if (!(await confirmSheet("إعادة التصحيح؟", "يُعاد حساب علامات كل الطلبة وفق المفاتيح الحالية للأسئلة.", "أعد التصحيح"))) return;
        await T.guard(T.rpc("t_regrade", { p_exam: id }), "أُعيد التصحيح"); load(id); };
      await load(id);
      if (x.state === "open") T.every(20000, () => { if (S.cur === "exam") load(id, true); });
    }
  });
  async function load(id, quiet) {
    try {
      const [rep, ev] = await Promise.all([T.rpc("t_exam_report", { p_id: id }), T.q(T.sb.from("attempt_events").select("*").eq("exam_id", id).order("at"))]);
      R.rep = rep; R.ev = ev;
    } catch (e) { if (!quiet) toast(e.message, true); return; }
    draw();
  }
  function draw() {
    const r = R.rep, st = r.students, done = st.filter((s) => s.score != null), box = document.getElementById("rBody"); if (!box) return;
    const avg = done.length ? done.reduce((a, s) => a + s.score / s.total, 0) / done.length : 0, passN = done.filter((s) => s.score / s.total >= 0.5).length;
    const viol = new Set(R.ev.map((e) => e.student_id)).size;
    const tiles = [[st.length, "الطلبة"], [done.length, "سلّموا"], [st.filter((s) => s.status === "in_progress").length, "يحلّون الآن"], [st.filter((s) => s.status === "absent").length, "لم يدخلوا"],
      [Math.round(avg * 100) + "٪", "المتوسط"], [done.length ? Math.round((passN / done.length) * 100) + "٪" : "—", "نسبة ≥ ٥٠٪"], [viol, "لهم مخالفات"]];
    box.innerHTML = `<div class="kpi-row" style="grid-template-columns:repeat(auto-fit,minmax(130px,1fr))">` + tiles.map((t, i) => `<div class="kp ${i === 6 && t[0] ? "warn" : ""}"><b class="num">${t[0]}</b><span>${t[1]}</span></div>`).join("") + `</div>
      <div class="row sp wrap" style="margin:16px 0 10px"><div class="seg" id="rTabs">` +
      [["students", "الطلبة"], ["violations", "المخالفات" + (R.ev.length ? " (" + R.ev.length + ")" : "")], ["items", "الفقرات"], ["outcomes", "النتاجات"], ["matrix", "طالب × نتاج"]]
        .map(([k, t]) => `<button data-t="${k}" aria-pressed="${R.tab === k}">${t}</button>`).join("") +
      `</div><span class="tiny">${r.exam.booked_at ? "✓ اعتُمد في السجلات " + esc(fmtDT(r.exam.booked_at, false)) : r.exam.kind === "practice" ? "تدريبي: لا يُعتمد" : "لم يُعتمد في السجلات بعد"}</span></div><div id="rTab"></div>`;
    box.querySelectorAll("#rTabs button").forEach((b) => (b.onclick = () => { R.tab = b.dataset.t; draw(); }));
    ({ students: tabStudents, violations: tabViol, items: tabItems, outcomes: tabOutcomes, matrix: tabMatrix })[R.tab]();
  }
  const vCount = (sid) => R.ev.filter((e) => e.student_id === sid).length;
  function tabStudents() {
    const st = R.rep.students;
    document.getElementById("rTab").innerHTML = `<div class="tw"><table class="t"><thead><tr><th class="num">م</th><th>الطالب</th><th>الشعبة</th><th class="num">العلامة</th><th class="num">٪</th><th>الحالة</th><th class="num">المدة</th><th class="num">المخالفات</th><th></th></tr></thead><tbody>` +
      st.map((s) => { const p = s.total ? Math.round((s.score / s.total) * 100) : null, dur = s.submitted_at && s.started_at ? Math.round((new Date(s.submitted_at) - new Date(s.started_at)) / 60000) : null;
        const [lbl, cls] = STAT[s.status] || [s.status, ""], v = vCount(s.id);
        return `<tr><td class="num">${s.serial}</td><td><a href="#student/${s.id}" style="color:inherit;font-weight:600">${esc(s.name)}</a></td><td class="tiny">${esc(s.section)}</td>
          <td class="num">${s.score != null ? s.score + "/" + s.total : "—"}</td><td class="num"><span class="pill ${p == null ? "" : p >= 50 ? "open" : "bad"}">${p == null ? "—" : p + "٪"}</span></td>
          <td><span class="pill ${cls}">${lbl}</span></td><td class="num">${dur != null ? dur + " د" : "—"}</td><td class="num">${v ? `<span class="pill bad">${v}</span>` : "—"}</td>
          <td>${s.n_attempts ? `<button class="btn sm ghost" data-reset="${s.id}">إعادة</button>` : ""}</td></tr>`; }).join("") + "</tbody></table></div>" +
      '<p class="tiny">«إعادة» تحذف محاولة الطالب ليبدأ من جديد (مثلًا بعد انقطاع الكهرباء).</p>';
    document.querySelectorAll("[data-reset]").forEach((b) => (b.onclick = async () => {
      const s = R.rep.students.find((z) => z.id === b.dataset.reset);
      if (!(await confirmSheet("إعادة محاولة " + s.name + "؟", "تُحذف محاولته وإجاباته، ويستطيع البدء من جديد ما دام الاختبار مفتوحًا.", "احذف المحاولة", true))) return;
      await T.guard(T.rpc("t_reset_student", { p_exam: R.rep.exam.id, p_student: s.id }), "حُذفت المحاولة").catch(() => {}); load(R.rep.exam.id);
    }));
  }
  function tabViol() {
    const by = {}; R.ev.forEach((e) => { (by[e.student_id] = by[e.student_id] || []).push(e); });
    const ids = Object.keys(by).sort((a, b) => by[b].length - by[a].length), stMap = {}; R.rep.students.forEach((s) => (stMap[s.id] = s));
    document.getElementById("rTab").innerHTML = ids.length ? '<div class="stack">' + ids.map((sid) => { const s = stMap[sid] || S.stu[sid] || {}, evs = by[sid], kinds = {};
        evs.forEach((e) => (kinds[e.kind] = (kinds[e.kind] || 0) + 1));
        return `<details class="card pad"><summary style="cursor:pointer;list-style:none"><div class="row sp wrap"><b>${esc(s.name || s.full_name || "")}</b>
            <span class="row wrap" style="gap:6px">${Object.entries(kinds).map(([k, n]) => `<span class="pill bad">${esc(KINDS[k] || k)} × ${n}</span>`).join("")}</span></div></summary>
          <div class="log" style="margin-top:10px">${evs.map((e) => `<div class="lr"><span class="tiny num" style="min-width:64px">${esc(U.fmtTime(e.at))}</span><span class="grow">${esc(KINDS[e.kind] || e.kind)}${e.detail ? " — " + esc(e.detail) : ""}</span></div>`).join("")}</div></details>`; }).join("") +
      `</div><p class="tiny" style="margin-top:10px">تُرصد المخالفات تلقائيًّا في وضع الحماية. لقطة الشاشة على الهاتف لا يمكن لأي موقع منعها، لكن العلامة المائية باسم الطالب تكشف أي صورة مسرّبة.</p>`
      : T.empty("shield", "لا مخالفات مسجّلة", "لم يرصد النظام أي محاولة خروج أو نسخ أو لقطة شاشة في هذا الاختبار.");
  }
  function tabItems() {
    const its = R.rep.items;
    document.getElementById("rTab").innerHTML = its.length ? '<div class="g2">' + its.map((it) => {
      const total = it.n || 0, flags = [];
      if (total >= 5 && it.p < 0.2) flags.push('<span class="pill bad">صعبة جدًا — راجع المفتاح</span>');
      if (total >= 5 && it.p > 0.9) flags.push('<span class="pill">سهلة جدًا</span>');
      if (it.d != null && it.d < 0) flags.push('<span class="pill bad">تمييز سالب</span>');
      if (it.d != null && it.d >= 0.3) flags.push('<span class="pill open">مميِّزة</span>');
      const mx = Math.max(1, ...it.dist.map((x) => x.n), it.blank || 0);
      return `<div class="card qitem"><div class="row wrap" style="gap:6px"><span class="pill brand">س${it.seq}</span><span class="pill num">#${it.num}</span><span class="pill">${esc(it.outcome)}</span><span class="pill">${esc(it.bloom)}</span>${flags.join("")}</div>
        <div class="stem">${esc(it.stem)}</div><div class="row sp tiny"><span>الصعوبة p = <b class="num">${it.p == null ? "—" : Math.round(it.p * 100) + "٪"}</b></span>
          <span>التمييز D = <b class="num">${it.d == null ? "—" : it.d.toFixed(2)}</b></span><span>بلا إجابة: ${it.blank || 0}</span></div>
        <div class="distbar">${it.dist.map((x) => `<i class="${x.k === it.correct ? "ok" : ""}" style="height:${Math.max(4, (x.n / mx) * 100)}%"><span>${L[x.k]} ${x.n}</span></i>`).join("")}</div>
        <ol>${it.options.map((o, i) => `<li class="${i === it.correct ? "ok" : ""}">${L[i]}) ${esc(o)}</li>`).join("")}</ol></div>`; }).join("") +
      '</div><p class="tiny">p: نسبة من أجابوا صحيحًا. D: الفرق بين أعلى ٢٧٪ وأدنى ٢٧٪ (من ٤ طلاب فأكثر). العمود الأخضر هو الإجابة الصحيحة.</p>' : T.empty("list", "لا فقرات بعد");
  }
  function tabOutcomes() {
    const os = R.rep.outcomes;
    document.getElementById("rTab").innerHTML = os.length ? '<div class="card pad stack">' + os.map((o) => { const tot = o.levels.reduce((a, b) => a + b, 0) || 1, pc = Math.round((o.avg || 0) * 100);
      return `<div><div class="row sp" style="font-size:14px"><span><span class="lbl-chip">${esc(o.label)}</span> ${esc(o.text)}</span><span class="pill ${pc < 50 ? "bad" : "open"}">${pc}٪</span></div>
        <div class="tiny" style="margin:4px 0">${o.items} فقرة · ${o.levels.map((n, i) => T.LV[i + 1] + " " + n).join(" · ")}</div>
        <div class="lvstack">${o.levels.map((n) => `<i style="width:${(n / tot) * 100}%"></i>`).join("")}</div></div>`; }).join("") +
      '</div><p class="tiny">مستوى الطالب في النتاج من نسبة إجاباته الصحيحة: حتى ٣٧٫٥٪ مبتدئ، حتى ٦٢٫٥٪ نامٍ، حتى ٨٧٫٥٪ متمكّن، وما فوقها متميّز. هذا ما يُرحَّل إلى رصد النتاجات عند الاعتماد.</p>' : T.empty("target", "لا نتاجات مقيسة بعد");
  }
  function tabMatrix() {
    const os = R.rep.outcomes, st = R.rep.students.filter((s) => s.outcomes);
    document.getElementById("rTab").innerHTML = st.length ? `<div class="tw"><table class="t"><thead><tr><th>الطالب</th>${os.map((o) => `<th class="num" title="${esc(o.text)}">${esc(o.label)}</th>`).join("")}</tr></thead><tbody>` +
      st.map((s) => `<tr><td>${esc(s.name)}</td>` + os.map((o) => { const v = s.outcomes[o.id]; if (!v) return '<td class="num">—</td>'; const l = lvlOf(v[0], v[1]); return `<td class="num lv${l}" title="${T.LV[l]}">${v[0]}/${v[1]}</td>`; }).join("") + "</tr>").join("") + "</tbody></table></div>"
      : T.empty("grid", "لا تسليمات بعد");
  }
  async function exportXlsx() {
    const r = R.rep; if (!r) return;
    await T.loadScript(T.XLSX_URL); const X = window.XLSX;
    const wb = X.utils.book_new(); wb.Workbook = { Views: [{ RTL: true }] };
    const head = { font: { name: "Arial", bold: true, color: { rgb: "FFFFFF" } }, fill: { patternType: "solid", fgColor: { rgb: "16325A" } }, alignment: { horizontal: "center", vertical: "center", wrapText: true, readingOrder: 2 } };
    const sheet = (rows, widths) => { const ws = X.utils.aoa_to_sheet(rows); rows[0].forEach((_, c) => { const a = X.utils.encode_cell({ r: 0, c }); if (ws[a]) ws[a].s = head; }); ws["!cols"] = widths.map((w) => ({ wch: w })); ws["!views"] = [{ RTL: true }]; return ws; };
    const rows = [["الرقم", "الطالب", "الشعبة", "العلامة", "من", "النسبة", "الحالة", "المخالفات"].concat(r.outcomes.map((o) => o.label))];
    r.students.forEach((s) => rows.push([s.serial, s.name, s.section, s.score, s.total, s.total ? Math.round((s.score / s.total) * 100) : "", (STAT[s.status] || [s.status])[0], vCount(s.id)]
      .concat(r.outcomes.map((o) => (s.outcomes && s.outcomes[o.id] ? s.outcomes[o.id][0] + "/" + s.outcomes[o.id][1] : "")))));
    X.utils.book_append_sheet(wb, sheet(rows, [6, 30, 16, 8, 6, 8, 12, 10].concat(r.outcomes.map(() => 10))), "العلامات");
    const stMap = {}; r.students.forEach((s) => (stMap[s.id] = s));
    const vr = [["الرقم", "الطالب", "الشعبة", "الوقت", "المخالفة", "تفاصيل"]];
    R.ev.forEach((e) => { const s = stMap[e.student_id] || {}; vr.push([s.serial, s.name, s.section, fmtDT(e.at, false), KINDS[e.kind] || e.kind, e.detail || ""]); });
    X.utils.book_append_sheet(wb, sheet(vr, [6, 30, 16, 22, 30, 30]), "حالات الغش");
    X.writeFile(wb, r.exam.title.replace(/[\\/:*?"<>|]/g, "-") + " — النتائج.xlsx"); toast("نُزّل ملف Excel");
  }
  async function mailNow(id) {
    try {
      const { data: { session } } = await T.sb.auth.getSession();
      const res = await fetch(window.APP_CONFIG.SUPABASE_URL + "/functions/v1/exam-mailer", { method: "POST",
        headers: { apikey: window.APP_CONFIG.SUPABASE_KEY, Authorization: "Bearer " + session.access_token, "Content-Type": "application/json" }, body: JSON.stringify({ exam_id: id }) });
      const r = await res.json().catch(() => ({ ok: false, error: "تعذّر الاتصال" }));
      if (!r.ok) return toast(r.error || "تعذّر الإرسال", true);
      toast("أُرسل التقرير إلى " + (r.to || "بريدك"));
    } catch (e) { toast(e.message, true); }
  }
  async function bookFlow(id) {
    let pv;
    try { pv = await T.rpc("t_book", { p_exam: id, p_commit: false }); } catch (e) { return toast(e.message, true); }
    const rule = pv.rule === "highest" ? "الأعلى" : "الأحدث";
    let body = `<div class="stack"><div>سيُسجَّل <b>${pv.rows}</b> قياسًا لـ <b>${pv.students}</b> طالبًا في «رصد النتاجات» (الأداة: ${R.rep && R.rep.exam.kind === "quiz" ? "الاختبار التكويني" : "التقويم الختامي"}).</div>
      <div>قاعدة الاحتساب: <b>${rule}</b>. ستتغيّر العلامة المعتمدة في <b>${pv.changed}</b> خانة${pv.manual_changed ? `، منها <b style="color:var(--warn)">${pv.manual_changed}</b> فيها إدخال يدوي (يبقى محفوظًا دليلًا)` : ""}.</div>`;
    if (pv.slot) body += `<div>وستُكتب علامة ${pv.slot === "first_written" ? "الاختبار الأول" : "الاختبار النهائي"} من <b>${pv.cap}</b>.</div>` +
      (pv.mark_conflicts ? `<div class="note warn">${pv.mark_conflicts} طالبًا لهم علامة مسجّلة سابقًا:<br>${pv.conflicts.slice(0, 8).map((c) => esc(c.name) + ": " + c.old + " ← " + c.new).join("<br>")}</div>
        <label class="check"><input type="checkbox" id="bkOver"> استبدل العلامات المسجّلة سابقًا</label>` : "");
    if (pv.booked_at) body += `<div class="tiny">سبق اعتماده ${esc(fmtDT(pv.booked_at, false))}؛ الاعتماد الجديد يستبدل قياسات هذا الاختبار فقط.</div>`;
    const b = openSheet(`<h3>اعتماد النتائج في السجلات</h3>${body}</div><div class="foot"><button class="btn primary grow" id="bkGo">اعتمد</button><button class="btn ghost" id="bkNo">إلغاء</button></div>`);
    b.querySelector("#bkNo").onclick = closeSheet;
    b.querySelector("#bkGo").onclick = async () => {
      const over = !!(b.querySelector("#bkOver") && b.querySelector("#bkOver").checked);
      try {
        await T.rpc("t_book", { p_exam: id, p_commit: true, p_overwrite: over });
        closeSheet(); toast("اعتُمدت النتائج في رصد النتاجات والعلامات");
        const [m, mk] = await Promise.all([T.all("mastery", "*", "created_at"), T.all("exam_marks", "*")]); S.mastery = m; S.marks = mk; T.brain.invalidate();
        await T.refreshExams(); load(id);
      } catch (e) { toast(e.message, true); }
    };
  }
  T.exams = { KINDS, editExam };
})();
