// صفحة الطالب: موقع + دخول + لوحة مقسّمة إلى أقسام + أداء الاختبار + النتيجة
(function () {
  const { $, esc, L, fmtDT, mmss, digits, toast, openSheet, closeSheet, confirmSheet, rpcFetch, initSkin, skinPicker, spin, greet, firstName, ago } = U;
  const KIND0 = { quiz: "كويز", first_written: "الاختبار الأول", final_written: "الاختبار النهائي", practice: "تدريبي" };
  const KIND = new Proxy({}, { get: (_, k) => KIND0[k] || "" });
  const kindOf = (x) => (x.cat === "worksheet" ? "ورقة عمل" : KIND0[x.kind] || "") + (x.paper ? " · ورقية (في الصف)" : "");
  const MONTHS = ["كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران", "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول"];
  const LV = { 1: "مبتدئ", 2: "نامٍ", 3: "متمكّن", 4: "متميّز" };

  initSkin("student", "olive");
  let TOKEN = null;
  try { TOKEN = sessionStorage.getItem("sahm_st_token"); } catch (e) {}
  const X = { a: null, i: 0, ans: {}, flags: {}, offset: 0, timer: null, saveT: null, dirty: false, fsExits: 0, submitting: false };
  const D = { home: null, prof: null, cdT: null };

  function show(v) { ["vLogin", "vHome", "vExam", "vResult"].forEach((k) => $(k).classList.toggle("hide", k !== v)); window.scrollTo(0, 0); }
  function setToken(t) { TOKEN = t; try { t ? sessionStorage.setItem("sahm_st_token", t) : sessionStorage.removeItem("sahm_st_token"); } catch (e) {} }
  async function call(fn, args) {
    const r = await rpcFetch(fn, Object.assign({ p_token: TOKEN }, args || {}));
    if (r && r.ok === false && r.code === "SESSION") { setToken(null); stopExam(); showSite(); throw new Error(r.error); }
    return r;
  }

  // ===================== الموقع =====================
  $("yr").textContent = new Date().getFullYear();
  window.addEventListener("scroll", () => $("siteNav").classList.toggle("scrolled", window.scrollY > 8), { passive: true });
  const io = "IntersectionObserver" in window ? new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: .12 }) : null;
  document.querySelectorAll(".reveal").forEach((el) => io ? io.observe(el) : el.classList.add("in"));
  $("skinBtnL").onclick = skinPicker; $("skinBtn").onclick = skinPicker;
  function showSite() {
    show("vLogin"); $("loginBox").classList.remove("hide"); $("welcomeBox").classList.add("hide");
    document.querySelectorAll(".reveal").forEach((el) => el.classList.add("in"));
  }

  // ===================== الدخول =====================
  (function fillDob() {
    $("dobD").innerHTML = '<option value="">اليوم</option>' + Array.from({ length: 31 }, (_, i) => `<option>${i + 1}</option>`).join("");
    $("dobM").innerHTML = '<option value="">الشهر</option>' + MONTHS.map((m, i) => `<option value="${i + 1}">${i + 1} · ${m}</option>`).join("");
    const y = new Date().getFullYear();
    let ys = ""; for (let k = y - 14; k >= y - 24; k--) ys += `<option>${k}</option>`;
    $("dobY").innerHTML = '<option value="">السنة</option>' + ys;
  })();
  function nidUi() {
    const v = $("nid").value; $("nidCount").textContent = v.length + "/10";
    $("nidWrap").classList.toggle("full", v.length === 10); $("nid").classList.remove("bad");
  }
  $("nid").addEventListener("input", (e) => {
    const v = digits(e.target.value).replace(/\D/g, "").slice(0, 10);
    if (v !== e.target.value) e.target.value = v;
    nidUi(); if (v.length === 10 && !$("dobD").value) $("dobD").focus();
  });
  try { const r = localStorage.getItem("sahm_st_nid"); if (r) { $("nid").value = r; $("remember").checked = true; nidUi(); } } catch (e) {}

  function loginErr(msg) {
    const err = $("loginErr"); err.innerHTML = ic("alert", "sm") + "<span>" + esc(msg) + "</span>"; err.classList.remove("hide");
    $("portal").classList.remove("shake"); void $("portal").offsetWidth; $("portal").classList.add("shake");
  }
  $("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault(); $("loginErr").classList.add("hide");
    const nid = $("nid").value, d = $("dobD").value, m = $("dobM").value, y = $("dobY").value;
    if (nid.length !== 10) { $("nid").classList.add("bad"); $("nid").focus(); return loginErr("الرقم الوطني يتكوّن من ١٠ أرقام."); }
    if (!d || !m || !y) return loginErr("اختر يوم ميلادك وشهره وسنته.");
    const b = $("loginBtn"); spin(b, true, "جارٍ التحقق…");
    try {
      const dob = y + "-" + String(m).padStart(2, "0") + "-" + String(d).padStart(2, "0");
      const r = await rpcFetch("student_login", { p_nid: nid, p_dob: dob });
      if (!r.ok) throw new Error(r.error);
      try { $("remember").checked ? localStorage.setItem("sahm_st_nid", nid) : localStorage.removeItem("sahm_st_nid"); } catch (x) {}
      setToken(r.token);
      $("wName").textContent = "أهلًا، " + firstName(r.name);
      $("loginBox").classList.add("hide"); $("welcomeBox").classList.remove("hide");
      await Promise.all([loadDash(true), new Promise((ok) => setTimeout(ok, 900))]);
      show("vHome");
    } catch (ex) { loginErr(ex.message); }
    finally { spin(b, false); }
  });

  $("logoutBtn").onclick = async () => {
    try { await rpcFetch("student_logout", { p_token: TOKEN }); } catch (e) {}
    setToken(null); clearInterval(D.cdT); history.replaceState(null, "", location.pathname); showSite();
  };
  $("refreshBtn").onclick = () => loadDash().then(() => toast("تم التحديث"));
  $("homeLink").onclick = (e) => { e.preventDefault(); location.hash = ""; };

  // ===================== اللوحة =====================
  async function loadDash(silent) {
    let h, p;
    let rc;
    try { [h, p, rc] = await Promise.all([call("student_home"), call("student_profile"), call("student_records").catch(() => null)]); }
    catch (e) { if (!silent) toast(e.message, true); throw e; }
    if (!h.ok) { toast(h.error, true); return; }
    D.home = h; D.prof = p && p.ok ? p : { me: {}, history: [], stats: {}, upcoming: [], units: [] }; D.rec = rc && rc.ok ? rc : { ok: false };
    $("hName").textContent = h.name || ""; $("hAv").textContent = firstName(h.name).slice(0, 1) || "؟";
    route();
    if (!silent) show("vHome");
  }
  window.addEventListener("hashchange", () => { if (D.home && !X.a) { route(); window.scrollTo(0, 0); } });
  function route() {
    const k = (location.hash || "").replace("#/", "");
    const fn = { exams: pExams, upcoming: pUpcoming, results: pResults, outcomes: pOutcomes, behavior: pBehavior, tips: pTips, me: pMe }[k];
    $("dash").innerHTML = fn ? fn() : dashHome();
    wire(); if (k === "results") wireResults(); if (k === "behavior") wireBehavior(); if (k === "tips" || !k) wireTips(); clearInterval(D.cdT); D.cdT = setInterval(tickCountdowns, 30000);
  }
  function wire() {
    const box = $("dash");
    box.querySelectorAll("[data-start]").forEach((b) => (b.onclick = () => startExam(b.dataset.start, b.dataset.mode, b.dataset.running === "1")));
    box.querySelectorAll("[data-res]").forEach((b) => (b.onclick = () => openResult(b.dataset.res)));
    box.querySelectorAll("[data-go]").forEach((b) => (b.onclick = () => { location.hash = b.dataset.go ? "#/" + b.dataset.go : ""; }));
    box.querySelectorAll("[data-skin-open]").forEach((b) => (b.onclick = skinPicker));
  }
  function tickCountdowns() { document.querySelectorAll("[data-cd]").forEach((el) => (el.textContent = ago(el.dataset.cd))); }

  function allOutcomes() { return (D.prof.units || []).flatMap((u) => (u.outcomes || []).map((o) => Object.assign({ unit: u.seq }, o))); }
  function pct(s, t) { return t ? Math.round((s / t) * 100) : null; }

  function marksHero() {
    const R = D.rec || {}, m = R.marks || {}, c = R.caps || {};
    if (!R.ok) return "";
    const k = (t, v, cap, sub) => `<button class="kpi mkpi" data-go="results"><span>${t}</span><b class="num">${v}</b><small>من ${nf(cap)}${sub ? " · " + sub : ""}</small></button>`;
    return `<div class="kpis">${k("الاختبار الكتابي الأول", m.first_absent ? "0" : nf(m.first), c.cap1)}${k("التقويم الثاني (الأداء)", nf(m.second), c.cap2, m.measured ? m.measured + " نتاجًا" : "")}
      ${k("الاختبار الكتابي النهائي", m.final_absent ? "0" : nf(m.final), c.cap3)}${k("المجموع", nf(m.total), c.max, m.verbal || "")}</div>`;
  }
  function dashHome() {
    const h = D.home, p = D.prof, me = p.me || {}, st = p.stats || {};
    const open = h.exams.filter((x) => x.is_open), up = p.upcoming || [];
    const outs = allOutcomes(), measured = outs.filter((o) => o.level), mastered = measured.filter((o) => o.level >= 3).length;
    let out = `<section class="greet"><div style="position:relative;z-index:1">
      <h1>${greet()}، ${esc(firstName(h.name))}</h1>
      <div class="sub">${esc([me.section && "شعبة " + me.section, me.subject, me.grade].filter(Boolean).join(" · "))}</div></div>
      ${marksHero()}
      <div class="kpis sm">
        <div class="kpi"><b class="num">${st.done || 0}</b><span>أداة أنجزتها</span></div>
        <div class="kpi"><b class="num">${st.avg != null ? Math.round(st.avg) + "٪" : "—"}</b><span>معدل علاماتك</span></div>
        <div class="kpi"><b class="num">${st.best != null ? Math.round(st.best) + "٪" : "—"}</b><span>أفضل نتيجة</span></div>
        <div class="kpi"><b class="num">${measured.length ? mastered + "/" + measured.length : "—"}</b><span>نتاجات أتقنتها</span></div>
      </div></section>`;

    // اختبار مفتوح الآن: في الواجهة مباشرة
    open.forEach((x) => {
      const left = x.max_attempts - x.used;
      const can = x.running || left > 0;
      out += `<div class="spot"><div class="ibox">${ic("play", "lg")}</div>
        <div><span class="pill open">مفتوح الآن</span><h3 style="margin-top:6px">${esc(x.title)}</h3>
          <div class="meta"><span>${esc(kindOf(x))}</span><span>${x.n_questions} سؤالًا</span><span>${x.duration_min} دقيقة</span>
          ${x.mode === "lab" ? "<span>داخل المختبر</span>" : ""}<span>يُغلق <b class="cd" data-cd="${x.ends_at}">${ago(x.ends_at)}</b></span></div></div>
        <div>${can ? `<button class="btn primary lg" data-start="${x.id}" data-mode="${x.mode}" data-running="${x.running ? 1 : 0}">${x.running ? "متابعة الاختبار" : "ابدأ الاختبار"}${ic("left", "sm")}</button>`
                   : '<span class="pill ended">سُلِّم</span>'}</div></div>`;
    });

    out += smartBox();

    const lastRes = (p.history || []).find((x) => x.visible && x.total);
    const tiles = [
      ["exams", "file", "اختباراتي", open.length ? "اختبار مفتوح الآن — ادخل وابدأ" : "الاختبارات المفتوحة والسابقة", open.length, !!open.length],
      ["upcoming", "cal", "المواعيد القادمة", up.length ? "أقرب اختبار " + ago(up[0].starts_at) : "لا مواعيد مجدولة الآن", up.length],
      ["results", "award", "نتائجي", D.rec && D.rec.marks && D.rec.marks.total != null ? "مجموعك حتى الآن " + nf(D.rec.marks.total) + " · وكل سجلاتك" : lastRes ? "آخر نتيجة: " + lastRes.score + "/" + lastRes.total : "علاماتك وكل سجلات التقويم", ((D.rec && D.rec.results) || p.history || []).length],
      ["behavior", "flag", "سلوكي وحضوري", "الحضور والمشاركة والسلوك ببطاقات تفصيلية", D.rec && D.rec.events ? D.rec.events.length : null],
      ["outcomes", "target", "خريطة نتاجاتي", measured.length ? "مستواك في " + measured.length + " نتاجًا من " + outs.length : "مستواك في كل نتاج من الكتاب", null],
      ["me", "user", "ملفّي", "بياناتك وشعبتك ومعلّمك", null],
      ["", "palette", "المظهر", "اختر السمة التي تريح عينيك", null, false, true]
    ];
    out += '<div class="tiles">' + tiles.map(([k, i, t, s, c, hot, skin]) =>
      `<button class="tile" ${skin ? "data-skin-open" : `data-go="${k}"`}><div class="ibox ${k === "outcomes" ? "gold" : ""}">${ic(i)}</div>
        ${c != null ? `<span class="cnt ${hot ? "hot" : ""} num">${c}</span>` : ""}<div><h3>${t}</h3><p>${esc(s)}</p></div><span class="go">${ic("left", "sm")}</span></button>`).join("") + "</div>";
    return out;
  }

  // ===================== التوصيات الذكية: كاملة، مفصّلة، موجّهة =====================
  // صفحات كل درس في كتاب الثقافة المالية (الثاني عشر، ف1) — وآخرها صفحة «أُقيّم تعلّمي»
  const BOOK = { "1.1": [8, 12], "1.2": [13, 19], "1.3": [20, 28], "1.4": [29, 34], "1.5": [35, 45], "1.6": [46, 55],
    "2.1": [60, 72], "2.2": [73, 79], "2.3": [80, 83], "2.4": [84, 95], "3.1": [104, 110], "3.2": [111, 117], "3.3": [118, 123], "3.4": [124, 128] };
  const verbTip = (t) => {
    t = (t || "").trim();
    if (/^(تسجيل|إعداد|اعداد|تطبيق|استخراج|إيجاد|ايجاد|كتابة)/.test(t)) return "أعد حلّ الأمثلة المحلولة في الدرس بنفسك دون النظر إلى الحل، ثم قارن حلّك خطوة بخطوة، وحدّد أين أخطأت.";
    if (/^(تمييز|التمييز|تحديد)/.test(t)) return "اصنع جدول مقارنة (النوع ← تعريفه ← مثال من الكتاب) واحفظ الفرق الجوهري بين كل نوعين.";
    if (/^(تحليل|استنتاج|استكشاف)/.test(t)) return "خذ ثلاثة أمثلة من الكتاب وحلّل كلًّا منها خطوة خطوة، واكتب سبب كل خطوة بكلماتك.";
    if (/^(تعرف|تعرّف|توضيح|بيان|التعريف|تعرُّف)/.test(t)) return "اكتب المفهوم بكلماتك، ثم قارنه بتعريف الكتاب كلمة بكلمة، وأعطِ مثالًا واقعيًّا عليه.";
    return "راجع فقرة هذا النتاج في الكتاب، ولخّصها في ثلاثة أسطر، وحلّ ما يتعلّق بها من أسئلة.";
  };
  function buildTips() {
    const R = D.rec || {}, h = D.home || {}, P = D.prof || {}, tips = [];
    const add = (o) => tips.push(o);
    // ١) عاجل: اختبارات مفتوحة أو غير مكتملة
    (h.exams || []).filter((x) => x.is_open).forEach((x) => {
      if (x.running) add({ pri: 0, g: "urgent", icon: "play", title: `أكمل «${x.title}» الآن`, why: "بدأت هذه الأداة ولم تسلّمها بعد، وستُسلَّم تلقائيًّا عند انتهاء الوقت بما حفظته فقط.",
        steps: ["افتح الاختبار من الزر أدناه وتابع من حيث توقفت.", "راجع الأسئلة التي تركتها فارغة قبل التسليم."], btn: ["متابعة الاختبار", `start:${x.id}:${x.mode}:1`] });
      else if (x.max_attempts - x.used > 0) add({ pri: 0, g: "urgent", icon: "play", title: `ابدأ «${x.title}» قبل أن يُغلق`, why: `مفتوح الآن ويُغلق ${ago(x.ends_at)}.`,
        steps: ["اختر مكانًا هادئًا واتصالًا جيدًا.", "اقرأ تعليمات الحماية قبل البدء؛ الخروج من الصفحة يُسجَّل مخالفة."], btn: ["ابدأ الآن", `start:${x.id}:${x.mode}:0`] });
    });
    (P.upcoming || []).filter((x) => new Date(x.starts_at) - Date.now() < 7 * 864e5).forEach((x) => add({ pri: 1, g: "urgent", icon: "cal",
      title: `استعد لـ «${x.title}»`, why: `موعده ${fmtDT(x.starts_at)} (${ago(x.starts_at)})، ${x.n} سؤالًا في ${x.duration} دقيقة.`,
      steps: ["ابدأ بالنتاجات الضعيفة المذكورة في هذه الصفحة.", "حلّ أسئلة «أُقيّم تعلّمي» في آخر كل درس مقرّر."], btn: ["المواعيد القادمة", "go:upcoming"] }));
    // ٢) نتاجات تحتاج مراجعة — مجمّعة حسب الدرس، مع الصفحات وما يجب فعله لكل نتاج
    const outs = R.outcomes || [], weak = outs.filter((o) => o.level && o.level <= 2);
    const byL = {}; weak.forEach((o) => { const k = o.unit + "." + o.lesson; (byL[k] = byL[k] || []).push(o); });
    Object.entries(byL).sort((a, b) => Math.min(...a[1].map((o) => o.level)) - Math.min(...b[1].map((o) => o.level)) || a[0].localeCompare(b[0])).forEach(([k, os]) => {
      const pg = BOOK[k], o0 = os[0], worst = Math.min(...os.map((o) => o.level));
      add({ pri: worst === 1 ? 2 : 3, g: "study", icon: "book", title: `راجع الدرس ${o0.lesson}: ${o0.lesson_title}${pg ? ` (ص ${pg[0]}–${pg[1]})` : ""}`,
        why: `${os.length === 1 ? "نتاج واحد" : os.length + " نتاجات"} من هذا الدرس ${worst === 1 ? "ما زال في مستوى «مبتدئ»" : "في مستوى «نامٍ»"}، والمطلوب «متمكّن» (٣ من ٤) على الأقل.`,
        list: os.map((o) => ({ h: `${o.label} — ${o.text}`, lv: o.level, src: o.source, tip: verbTip(o.text) })),
        steps: [pg ? `اقرأ الدرس كاملًا من ص ${pg[0]} إلى ص ${pg[1]}، مع الأمثلة المحلولة.` : "اقرأ الدرس كاملًا مع الأمثلة المحلولة.",
          pg ? `حلّ أسئلة «أُقيّم تعلّمي» في ص ${pg[1]} دون النظر إلى الكتاب، ثم صحّحها.` : "حلّ أسئلة «أُقيّم تعلّمي» في آخر الدرس.",
          "اسأل معلّمك عمّا لم تفهمه، واطلب ورقة عمل على هذا الدرس؛ ستأتيك بمستوى يناسبك وتُرفع علامتك إن أتقنتها."], btn: ["خريطة نتاجاتي", "go:outcomes"] });
    });
    // ٣) أثر المراجعة على علامتك (رقم دقيق يحفّز)
    const m = R.marks || {}, c = R.caps || {}, measured = outs.filter((o) => o.level);
    if (weak.length && measured.length) {
      const nowAvg = measured.reduce((a, o) => a + o.level, 0) / measured.length, newAvg = measured.reduce((a, o) => a + Math.max(o.level, 3), 0) / measured.length;
      add({ pri: 3, g: "study", icon: "chart", title: `يمكنك رفع علامة التقويم الثاني من ${nf(nowAvg / 4 * c.cap2)} إلى ${nf(newAvg / 4 * c.cap2)} من ${nf(c.cap2)}`,
        why: `هذا ما يحدث لو رفعت النتاجات الضعيفة (${weak.length}) إلى «متمكّن» فقط. كل نتاج يرتفع درجة يضيف لك ${nf(c.cap2 / 4 / measured.length)} علامة.`,
        steps: ["ابدأ بالنتاجات ذات المستوى «مبتدئ» فهي الأكبر أثرًا.", "قاعدة الاحتساب «" + (c.rule === "latest" ? "الأحدث" : "الأعلى") + "»: " + (c.rule === "latest" ? "آخر قياس هو الذي يُعتمد، فاستعد جيدًا لكل أداة." : "يُعتمد أعلى مستوى حصلت عليه، فكل محاولة جديدة فرصة لا تخسر بها شيئًا.")], btn: ["كيف تُحسب علامتي؟", "go:results"] });
    }
    // ٤) نتائج: صفر أو انخفاض أو تحسّن — بأسماء الأدوات ونسبها
    const rs = (R.results || []).filter((x) => x.total);
    rs.filter((x) => x.score === 0).slice(0, 3).forEach((x) => add({ pri: 2, g: "study", icon: "alert", title: `علامتك صفر في «${x.title}»`,
      why: "قد يكون السبب غيابًا أو عدم تسليم. هذه العلامة تُخفض مستواك في نتاجات الدرس كلها.",
      steps: ["إن كنت غائبًا بعذر فأخبر معلّمك ليُعيد تقييمك.", "راجع الدرس نفسه وحلّ أسئلة «أُقيّم تعلّمي» لتكون جاهزًا لأي إعادة."], btn: ["نتائجي", "go:results"] }));
    if (rs.length >= 2) {
      const a = rs[0], b = rs[1], pa = pct(a.score, a.total), pb = pct(b.score, b.total), d = pa - pb;
      if (d <= -10) add({ pri: 2, g: "study", icon: "chart", title: `انخفضت نتيجتك ${-d} نقطة مئوية`,
        why: `في «${a.label || a.title}» حصلت على ${a.score}/${a.total} (${pa}٪)، بينما في «${b.label || b.title}» حصلت على ${b.score}/${b.total} (${pb}٪).`,
        steps: [`افتح تفاصيل «${a.label || a.title}» وحدّد النتاجات التي أخطأت فيها.`, "راجع درس هذه الأداة تحديدًا قبل الأداة القادمة."], btn: ["نتائجي", "go:results"] });
      else if (d >= 10) add({ pri: 5, g: "keep", icon: "award", title: `أحسنت! تحسّنت ${d} نقطة مئوية`,
        why: `من ${pb}٪ في «${b.label || b.title}» إلى ${pa}٪ في «${a.label || a.title}».`, steps: ["حافظ على طريقة مراجعتك نفسها؛ إنها تنجح."] });
    }
    // ٥) فرص للتميّز
    const good = outs.filter((o) => o.level === 3);
    if (good.length) add({ pri: 4, g: "improve", icon: "spark", title: `${good.length === 1 ? "نتاج واحد" : good.length + " نتاجات"} بينك وبين «متميّز» خطوة واحدة`,
      why: "أنت متمكّن فيها. التميّز يحتاج إتقان الأسئلة التطبيقية والصعبة.",
      list: good.map((o) => ({ h: `${o.label} — ${o.text}`, lv: o.level, src: o.source, tip: "حلّ مسائل تطبيقية جديدة بأرقام مختلفة عن أمثلة الكتاب، وفسّر سبب كل خطوة." })),
      steps: ["اطلب من معلّمك أسئلة إثرائية على هذه النتاجات.", "اشرح النتاج لزميل؛ الشرح أقوى طريقة للإتقان."], btn: ["خريطة نتاجاتي", "go:outcomes"] });
    const top = outs.filter((o) => o.level === 4);
    if (top.length >= 3) add({ pri: 6, g: "keep", icon: "award", title: `متميّز في ${top.length} نتاجات`, why: "استمر؛ هذه نقاط قوتك.", steps: ["راجعها مراجعة سريعة قبل الاختبار النهائي حتى لا تُنسى."] });
    // ٦) السلوك والحضور
    const at = R.attendance || [], ev = R.events || [];
    const abs = at.filter((x) => x.status === "absent").length, late = at.filter((x) => x.status === "late").length, neg = ev.filter((e) => e.dir < 0), pos = ev.filter((e) => e.dir > 0);
    if (abs >= 2) add({ pri: 2, g: "behavior", icon: "cal", title: `غبت ${abs} أيام`, why: "كل غياب يعني درسًا فاتك وقد يفوتك قياس نتاجاته.",
      steps: ["اطلب من زميل ملخّص ما فاتك، وراجعه من الكتاب.", "إن كان غيابك بعذر فأبلغ معلّمك ليُسجّله «بعذر»."], btn: ["سلوكي وحضوري", "go:behavior"] });
    if (late >= 2) add({ pri: 4, g: "behavior", icon: "clock", title: `تأخرت ${late} مرات`, why: "التأخر يفوّتك بداية الحصة وفيها شرح الفكرة الأساسية.", steps: ["احضر قبل بدء الحصة بخمس دقائق."], btn: ["سلوكي وحضوري", "go:behavior"] });
    if (neg.length) { const cnt = {}; neg.forEach((e) => (cnt[e.label] = (cnt[e.label] || 0) + 1));
      add({ pri: 3, g: "behavior", icon: "alert", title: "ملاحظات سلوكية تحتاج انتباهك", why: Object.entries(cnt).map(([k, n]) => `${k} × ${n}`).join("، ") + ".",
        steps: ["راجع تفاصيل كل ملاحظة في «سلوكي وحضوري».", "حدّد ملاحظة واحدة وتخلّص منها هذا الأسبوع."], btn: ["سلوكي وحضوري", "go:behavior"] }); }
    if (pos.length >= 3) add({ pri: 6, g: "keep", icon: "award", title: `${pos.length} مشاركات وسلوكيات إيجابية`, why: "معلّمك يلاحظ مشاركتك. استمر.", steps: [] });
    if (!outs.some((o) => o.level)) add({ pri: 5, g: "keep", icon: "target", title: "لم تُقَس نتاجاتك بعد", why: "ستظهر هنا توصيات مخصّصة لك بعد أول أداة تقويم.", steps: ["تابع دروسك أولًا بأول."] });
    return tips.sort((a, b) => a.pri - b.pri);
  }
  const TG = { urgent: "عاجل الآن", study: "مراجعة مطلوبة", improve: "فرص للتميّز", behavior: "السلوك والحضور", keep: "نقاط قوتك" };
  function tipCard(t, i) {
    return `<div class="card pad tip ${t.g}"><div class="row" style="gap:12px;align-items:flex-start"><div class="ibox">${ic(t.icon || "spark")}</div><div class="grow">
      <h3 style="font-size:16px">${esc(t.title)}</h3><div class="tiny" style="margin-top:4px;line-height:1.9">${esc(t.why || "")}</div>
      ${t.list ? `<div class="stack" style="margin-top:10px">${t.list.map((o) => `<div class="tipo"><div class="row sp wrap" style="gap:6px"><b style="font-size:13.5px">${esc(o.h)}</b>
          <span class="lv lv${o.lv}">${o.lv} · ${LV[o.lv]}</span></div>${o.src ? `<div class="tiny">المصدر: ${esc(o.src)}</div>` : ""}<div class="tiny" style="margin-top:4px">✦ ${esc(o.tip)}</div></div>`).join("")}</div>` : ""}
      ${t.steps && t.steps.length ? `<div class="lbl" style="margin:10px 0 4px">ماذا تفعل؟</div><ol class="tsteps">${t.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>` : ""}
      ${t.btn ? `<button class="btn sm outline" data-tipact="${i}" style="margin-top:8px">${esc(t.btn[0])}</button>` : ""}</div></div></div>`;
  }
  function pTips() {
    const tips = (D.tips = buildTips());
    let h = crumb("كل التوصيات", `${tips.length} توصية مبنية على علاماتك ومستواك في كل نتاج وحضورك — مرتّبة من الأهم`);
    Object.keys(TG).forEach((g) => { const l = tips.map((t, i) => [t, i]).filter(([t]) => t.g === g); if (!l.length) return;
      h += `<div class="lbl" style="margin:18px 0 10px">${TG[g]} <span class="tiny">(${l.length})</span></div><div class="stack">` + l.map(([t, i]) => tipCard(t, i)).join("") + "</div>"; });
    return h;
  }
  function wireTips() {
    document.querySelectorAll("[data-tipact]").forEach((b) => (b.onclick = () => {
      const a = D.tips[+b.dataset.tipact].btn[1].split(":");
      if (a[0] === "go") location.hash = "#/" + a[1]; else if (a[0] === "start") startExam(a[1], a[2], a[3] === "1");
    }));
  }

  function smartBox() {
    const tips = (D.tips = buildTips()), top = tips.slice(0, 3);
    return `<div class="smart">${ic("spark")}<div class="grow"><b>توصيات لك</b>
      <ul class="tshort">${top.map((t) => `<li><b>${esc(t.title)}</b><span class="tiny"> — ${esc(t.why || "")}</span></li>`).join("")}</ul>
      ${tips.length ? `<button class="btn sm primary" data-go="tips" style="margin-top:8px">${tips.length > 3 ? "عرض كل التوصيات (" + tips.length + ") بالتفصيل" : "التفاصيل وما يجب أن تفعله"}</button>` : ""}</div></div>`;
  }

  function crumb(title, sub) {
    return `<div class="crumb"><button class="iconbtn" data-go="" aria-label="العودة إلى لوحتي">${ic("right")}</button>
      <div><h2>${title}</h2>${sub ? `<div class="tiny">${sub}</div>` : ""}</div></div>`;
  }
  function emptyBox(i, t, s) { return `<div class="card empty"><div class="ibox">${ic(i)}</div><b>${t}</b><div class="tiny" style="margin-top:4px">${s || ""}</div></div>`; }

  function pExams() {
    const ex = D.home.exams, open = ex.filter((x) => x.is_open), past = ex.filter((x) => !x.is_open);
    let h = crumb("اختباراتي", "يظهر الاختبار هنا في موعده فقط");
    h += '<div class="lbl" style="margin:4px 0 10px">مفتوحة الآن</div>';
    h += open.length ? '<div class="panel-grid">' + open.map(examCard).join("") + "</div>" : emptyBox("cal", "لا يوجد اختبار مفتوح الآن", "راجع «المواعيد القادمة» لمعرفة الموعد التالي.");
    if (past.length) h += '<div class="lbl" style="margin:22px 0 10px">سابقة</div><div class="panel-grid">' + past.map(examCard).join("") + "</div>";
    return h;
  }
  function examCard(x) {
    const left = x.max_attempts - x.used;
    let act = "";
    if (x.is_open && x.running) act = `<button class="btn primary block" data-start="${x.id}" data-mode="${x.mode}" data-running="1">متابعة الاختبار</button>`;
    else if (x.is_open && left > 0) act = `<button class="btn primary block" data-start="${x.id}" data-mode="${x.mode}">ابدأ الاختبار</button>`;
    let res = "";
    if (x.result && x.result.total) {
      const p = pct(x.result.score, x.result.total);
      res = `<div class="row sp"><span>علامتك <b class="score num">${x.result.score}/${x.result.total}</b> <span class="tiny">(${p}٪)</span></span>` +
            (x.best_attempt ? `<button class="btn sm outline" data-res="${x.best_attempt}">التفاصيل</button>` : "") + "</div>";
    } else if (x.used > 0 && !x.running) res = '<div class="tiny">' + ic("checkc", "sm") + " سُلِّمت إجاباتك. " + (x.result_visible ? "" : "تظهر النتيجة عندما يسمح المعلّم.") + "</div>";
    return `<div class="card xcard">
      <div class="row sp"><div class="ttl">${esc(x.title)}</div><span class="pill ${x.is_open ? "open" : "ended"}">${x.is_open ? "مفتوح" : "انتهى"}</span></div>
      <div class="meta"><span>${esc(kindOf(x))}</span><span>${ic("clock", "sm")}${x.duration_min} دقيقة</span><span>${ic("list", "sm")}${x.n_questions} سؤالًا</span>
        ${x.mode === "lab" ? `<span>${ic("lock", "sm")}داخل المختبر</span>` : ""}${x.max_attempts > 1 ? `<span>المحاولات: ${x.used} من ${x.max_attempts}</span>` : ""}</div>
      ${x.is_open ? `<div class="tiny">يُغلق ${esc(fmtDT(x.ends_at))}</div>` : ""}${res}${act}</div>`;
  }

  function pUpcoming() {
    const up = D.prof.upcoming || [];
    let h = crumb("المواعيد القادمة", "اختبارات نشرها معلّمك ولم يحن موعدها");
    if (!up.length) return h + emptyBox("cal", "لا توجد اختبارات مجدولة", "عندما يجدول معلّمك اختبارًا يظهر هنا مع عدّ تنازلي.");
    return h + '<div class="card pad"><div class="timeline">' + up.map((x) =>
      `<div class="ev"><div class="row sp wrap"><b style="font-family:var(--f-disp)">${esc(x.title)}</b><span class="pill soon" data-cd="${x.starts_at}">${ago(x.starts_at)}</span></div>
       <div class="tiny" style="margin-top:4px">${esc(fmtDT(x.starts_at))} · ${esc(kindOf(x))} · ${x.duration} دقيقة · ${x.n} سؤالًا${x.mode === "lab" ? " · داخل المختبر" : ""}</div></div>`).join("") + "</div></div>";
  }

  // ===================== نتائجي: كل سجلاتي كما عند المعلم =====================
  const nf = (v, d = 2) => (v == null || isNaN(v) ? "—" : String(Math.round(v * Math.pow(10, d)) / Math.pow(10, d)));
  const fmtD = (s) => { if (!s) return "—"; const d = new Date(String(s).slice(0, 10) + "T00:00:00"); return d.toLocaleDateString("ar-JO", { day: "numeric", month: "long", year: "numeric" }); };
  function pResults() {
    const R = D.rec || {}, m = R.marks || {}, c = R.caps || {};
    let h = crumb("نتائجي", "علاماتك وكل أدوات التقويم التي سُجّلت لك — نفس سجلات معلّمك");
    if (!R.ok) return h + emptyBox("award", "تعذّر تحميل سجلاتك", "حدّث الصفحة.");
    const box = (v, cap, t, sub) => `<div class="mk"><span>${t}</span><b class="num">${v}</b><small>${cap}</small>${sub ? `<em>${sub}</em>` : ""}</div>`;
    h += `<div class="card pad"><div class="mks">
      ${box(m.first_absent ? "0" : nf(m.first), "من " + nf(c.cap1), "الاختبار الأول", m.first_absent ? "غائب بلا عذر" : "")}
      ${box(nf(m.second), "من " + nf(c.cap2), "التقويم الثاني", m.measured ? "من " + m.measured + " نتاجًا مقيسًا" : "لم يُقَس بعد")}
      ${box(m.final_absent ? "0" : nf(m.final), "من " + nf(c.cap3), "الاختبار النهائي", "")}
      ${box(nf(m.total), "من " + nf(c.max), "المجموع", m.verbal ? "التقدير: " + m.verbal : "يكتمل بعد كل العلامات")}</div>
      <button class="btn outline sm" id="whyBtn" style="margin-top:12px">${ic("target", "sm")}كيف حُسبت علامة التقويم الثاني؟</button></div>`;
    const rs = R.results || [];
    h += '<div class="lbl" style="margin:22px 0 10px">الكويزات والاختبارات وأوراق العمل</div>';
    h += rs.length ? '<div class="card list">' + rs.map((x) => { const p = x.total ? pct(x.score, x.total) : null;
      return `<div class="li"><div><b>${esc(x.title)}</b><div class="tiny">${esc(kindOf(x))} · ${esc(fmtDT(x.at))}${x.weighted ? " · علامة موزونة" : ""}</div>
          ${p != null ? `<div class="bar" style="margin-top:8px;max-width:340px"><i style="width:${p}%"></i></div>` : ""}</div>
        <div style="text-align:end">${p != null ? `<div class="score num">${x.score}/${x.total}</div>` : "—"}${x.details ? `<button class="btn sm ghost" data-res="${x.id}">التفاصيل</button>` : ""}</div></div>`; }).join("") + "</div>"
      : emptyBox("file", "لا نتائج بعد", "تظهر هنا كل أداة بعد انتهائها.");
    const ts = R.tools || [];
    h += '<div class="lbl" style="margin:22px 0 10px">سجل أدوات التقويم على النتاجات</div>';
    h += ts.length ? '<div class="panel-grid">' + ts.map((t, i) => { const avg = t.items.reduce((a, o) => a + o.level, 0) / t.items.length;
      return `<button class="card pad tcard" data-tool="${i}"><div class="row sp"><b>${esc(t.label)}</b><span class="tiny">${esc(fmtD(t.date))}</span></div>
        <div class="tiny" style="margin:4px 0 8px">${esc(t.tool || "")} · ${t.items.length} نتاج</div>
        <div class="row wrap" style="gap:6px">${t.items.map((o) => `<span class="lv lv${o.level}" title="${esc(o.text)}">${esc(o.label)} · ${o.level}</span>`).join("")}</div>
        <div class="bar" style="margin-top:10px"><i style="width:${(avg / 4) * 100}%"></i></div></button>`; }).join("") + "</div>"
      : emptyBox("target", "لم تُسجَّل أدوات بعد", "");
    return h;
  }
  function wireResults() {
    const R = D.rec || {}, b = $("whyBtn");
    if (b) b.onclick = () => { const m = R.marks || {}, c = R.caps || {}, os = (R.outcomes || []).filter((o) => o.level);
      openSheet(`<h3>كيف حُسبت علامة التقويم الثاني؟</h3>
        <div class="note">كل أداة (كويز، ورقة عمل، ملاحظة صفية…) تعطيك <b>مستوى</b> في كل نتاج تقيسه: ١ مبتدئ، ٢ نامٍ، ٣ متمكّن، ٤ متميّز.
          يُعتمد لكل نتاج ${c.rule === "latest" ? "أحدث" : "أعلى"} مستوى حصلت عليه، ثم: <b>متوسط المستويات ÷ ٤ × ${nf(c.cap2)}</b>.<br>
          متوسطك <b>${nf(m.avg_level)}</b> من ٤ في ${m.measured || 0} نتاجًا ← <b>${nf(m.second)}</b> من ${nf(c.cap2)}.</div>
        ${os.length ? `<div class="tw" style="margin-top:12px"><table class="t"><thead><tr><th>النتاج</th><th>مستواك</th><th class="num">حصّته</th><th>من أين</th></tr></thead><tbody>` +
          os.map((o) => `<tr><td><span class="lbl-chip">${esc(o.label)}</span> <span class="tiny">${esc(o.text)}</span></td><td><span class="lv lv${o.level}">${o.level} · ${LV[o.level]}</span></td>
            <td class="num">${nf(o.share)}</td><td class="tiny">${esc(o.source || "")}</td></tr>`).join("") + "</tbody></table></div>" : ""}`, true); };
    document.querySelectorAll("[data-tool]").forEach((el) => (el.onclick = () => { const t = R.tools[+el.dataset.tool];
      openSheet(`<h3>${esc(t.label)}</h3><div class="tiny" style="margin-bottom:10px">${esc(t.tool || "")} · ${esc(fmtD(t.date))}${t.note && t.note !== t.label ? " · " + esc(t.note) : ""}</div>
        <div class="stack">${t.items.map((o) => `<div class="oc"><span class="lbl-chip">${esc(o.label)}</span><span>${esc(o.text)}</span><span class="lv lv${o.level}">${o.level} · ${LV[o.level]}</span></div>`).join("")}</div>`); }));
  }

  // ===================== سلوكي: بطاقات إحصائية بالتفصيل =====================
  const ATT = { present: "حاضر", absent: "غائب", late: "متأخر", excused: "غائب بعذر" };
  function behCards() {
    const R = D.rec || {}, at = R.attendance || [], ev = R.events || [];
    const n = (s) => at.filter((a) => a.status === s);
    const pos = ev.filter((e) => e.dir > 0), neg = ev.filter((e) => e.dir < 0);
    const net = ev.reduce((a, e) => a + e.dir * (+e.weight || 1), 0);
    return [
      { k: "present", t: "أيام الحضور", v: n("present").length, i: "checkc", cls: "ok", rows: n("present"), att: true },
      { k: "absent", t: "أيام الغياب", v: n("absent").length, i: "x", cls: n("absent").length ? "bad" : "", rows: n("absent"), att: true },
      { k: "late", t: "مرات التأخر", v: n("late").length, i: "clock", cls: n("late").length ? "warn" : "", rows: n("late"), att: true },
      { k: "excused", t: "غياب بعذر", v: n("excused").length, i: "cal", cls: "", rows: n("excused"), att: true },
      { k: "part", t: "مشاركات إيجابية", v: pos.filter((e) => e.bucket === "participation").length, i: "spark", cls: "ok", rows: pos.filter((e) => e.bucket === "participation") },
      { k: "beh", t: "سلوك إيجابي", v: pos.filter((e) => e.bucket !== "participation").length, i: "award", cls: "ok", rows: pos.filter((e) => e.bucket !== "participation") },
      { k: "neg", t: "ملاحظات للتحسين", v: neg.length, i: "alert", cls: neg.length ? "bad" : "", rows: neg },
      { k: "net", t: "صافي النقاط", v: (net > 0 ? "+" : "") + nf(net, 1), i: "chart", cls: net >= 0 ? "ok" : "bad", rows: ev }
    ];
  }
  function pBehavior() {
    const R = D.rec || {}, ev = R.events || [], at = R.attendance || [];
    let h = crumb("سلوكي وحضوري", "كل ما سجّله معلّمك من حضور ومشاركة وسلوك — انقر أي بطاقة لترى التفاصيل");
    if (!R.ok) return h + emptyBox("flag", "تعذّر تحميل السجل", "حدّث الصفحة.");
    const days = at.length, pres = at.filter((a) => a.status === "present" || a.status === "late").length;
    h += `<div class="card pad row sp wrap" style="margin-bottom:14px"><div><b>نسبة الحضور</b><div class="tiny">${days ? pres + " من " + days + " يومًا مسجّلًا" : "لم يُسجَّل حضور بعد"}</div></div>
      <b class="score num">${days ? Math.round((pres / days) * 100) + "٪" : "—"}</b></div>`;
    h += '<div class="bgrid">' + behCards().map((c) => `<button class="bcard ${c.cls}" data-beh="${c.k}"><div class="ibox">${ic(c.i)}</div><b class="num">${c.v}</b><span>${c.t}</span></button>`).join("") + "</div>";
    h += '<div class="lbl" style="margin:22px 0 10px">آخر ما سُجّل</div>';
    const mix = ev.map((e) => ({ d: e.date, t: (e.icon ? e.icon + " " : "") + e.label, s: e.note, cls: e.dir > 0 ? "open" : "bad", p: e.period }))
      .concat(at.filter((a) => a.status !== "present").map((a) => ({ d: a.date, t: ATT[a.status], s: a.note, cls: a.status === "excused" ? "" : "bad" })))
      .sort((a, b) => String(b.d).localeCompare(String(a.d))).slice(0, 15);
    h += mix.length ? '<div class="card list">' + mix.map((x) => `<div class="li"><div><b>${esc(x.t)}</b>${x.s ? `<div class="tiny">${esc(x.s)}</div>` : ""}</div>
        <span class="pill ${x.cls}">${esc(fmtD(x.d))}${x.p ? " · الحصة " + x.p : ""}</span></div>`).join("") + "</div>" : emptyBox("flag", "لا ملاحظات مسجّلة", "سجلّك نظيف حتى الآن.");
    return h;
  }
  function wireBehavior() {
    document.querySelectorAll("[data-beh]").forEach((el) => (el.onclick = () => {
      const c = behCards().find((z) => z.k === el.dataset.beh);
      const rows = c.att ? c.rows.map((a) => `<div class="li"><div><b>${esc(ATT[a.status])}</b>${a.note ? `<div class="tiny">${esc(a.note)}</div>` : ""}</div><span class="pill">${esc(fmtD(a.date))}</span></div>`)
        : c.rows.map((e) => `<div class="li"><div><b>${esc((e.icon ? e.icon + " " : "") + e.label)}</b><div class="tiny">${e.dir > 0 ? "+" : "−"}${nf(+e.weight || 1, 1)} نقطة${e.note ? " · " + esc(e.note) : ""}</div></div>
            <span class="pill ${e.dir > 0 ? "open" : "bad"}">${esc(fmtD(e.date))}${e.period ? " · الحصة " + e.period : ""}</span></div>`);
      openSheet(`<h3>${esc(c.t)} <span class="tiny">(${c.rows.length})</span></h3>` + (rows.length ? '<div class="card list">' + rows.join("") + "</div>" : '<div class="empty tiny">لا يوجد شيء هنا.</div>'));
    }));
  }

  function pOutcomes() {
    const units = D.prof.units || [];
    let h = crumb("خريطة نتاجاتي", "مستواك في كل نتاج كما سجّله معلّمك من الاختبارات والملاحظة الصفية");
    if (!units.length) return h + emptyBox("target", "لا توجد نتاجات بعد", "");
    h += '<div class="card pad row wrap" style="gap:10px 18px;margin-bottom:14px">' +
      [1, 2, 3, 4].map((k) => `<span class="lv lv${k}">${k} · ${LV[k]}</span>`).join("") + '<span class="lv lv0">لم يُقَس بعد</span></div>';
    return h + units.map((u, i) => {
      const os = u.outcomes || [], cnt = [0, 0, 0, 0, 0];
      os.forEach((o) => cnt[o.level || 0]++);
      const n = os.length || 1;
      return `<details class="unit" ${i === 0 ? "open" : ""}><summary><div class="ibox">${ic("layers")}</div>
          <div class="grow"><h3>الوحدة ${u.seq}: ${esc(u.title)}</h3><div class="tiny">${os.length} نتاجًا · قيس منها ${os.length - cnt[0]}</div></div>
          <div class="dist" title="توزيع المستويات">${[1, 2, 3, 4].map((k) => `<i class="d${k}" style="width:${(cnt[k] / n) * 100}%"></i>`).join("")}</div></summary>
        ${os.map((o) => `<div class="oc"><span class="lbl-chip">${esc(o.label)}</span><span>${esc(o.text)}<span class="tiny" style="display:block">${esc(o.lesson || "")}</span></span>
          <span class="lv lv${o.level || 0}">${o.level ? o.level + " · " + LV[o.level] : "لم يُقَس"}</span></div>`).join("")}</details>`;
    }).join("");
  }

  function pMe() {
    const me = D.prof.me || {};
    return crumb("ملفّي") + `<div class="card pad"><div class="row" style="margin-bottom:18px"><span class="avatar" style="width:56px;height:56px;font-size:22px">${esc(firstName(me.name).slice(0, 1))}</span>
      <div><h3 style="font-size:19px">${esc(me.name || D.home.name)}</h3><div class="tiny">الرقم التسلسلي ${esc(me.serial || "—")}</div></div></div>
      <dl class="kv"><dt>الشعبة</dt><dd>${esc(me.section || "—")}</dd><dt>المبحث</dt><dd>${esc(me.subject || "—")}</dd>
      <dt>الصف</dt><dd>${esc(me.grade || "—")}</dd><dt>العام الدراسي</dt><dd>${esc(me.year || "—")} · الفصل ${esc(me.semester || "—")}</dd>
      <dt>المعلّم</dt><dd>${esc(me.teacher || "—")}</dd><dt>المدرسة</dt><dd>${esc(me.school || "—")}</dd></dl></div>
      <p class="tiny" style="margin-top:12px">إذا كان في بياناتك خطأ فأبلغ معلّمك ليصحّحه.</p>`;
  }

  // ===================== بدء الاختبار =====================
  async function startExam(id, mode, running) {
    let code = null;
    if (mode === "lab" && !running) { code = await askCode(); if (code === null) return; }
    toast("جارٍ تحميل الاختبار…");
    let r;
    try { r = await call("student_start", { p_exam: id, p_code: code }); } catch (e) { toast(e.message, true); return; }
    if (!r.ok) { toast(r.error, true); if (r.code === "BAD_CODE") startExam(id, mode, running); return; }
    beginExam(r);
  }
  function askCode() {
    return new Promise((res) => {
      const b = openSheet('<h3>رمز الجلسة</h3><p class="muted">اكتب الرمز المكوَّن من ٤ أرقام الذي يعرضه المعلّم في المختبر.</p>' +
        '<input class="input mono" id="labCode" inputmode="numeric" maxlength="4" style="font-size:30px;text-align:center;letter-spacing:.4em;margin-top:14px" dir="ltr">' +
        '<div class="row" style="margin-top:14px"><button class="btn primary grow" id="lcOk">ابدأ</button><button class="btn ghost" id="lcNo">إلغاء</button></div>');
      const inp = b.querySelector("#labCode"); setTimeout(() => inp.focus(), 250);
      inp.oninput = () => { inp.value = digits(inp.value).replace(/\D/g, "").slice(0, 4); };
      b.querySelector("#lcOk").onclick = () => { closeSheet(); res(inp.value); };
      b.querySelector("#lcNo").onclick = () => { closeSheet(); res(null); };
      inp.onkeydown = (e) => { if (e.key === "Enter") b.querySelector("#lcOk").click(); };
    });
  }

  function lsKey() { return "sahm_ans_" + X.a.attempt; }
  function beginExam(a) {
    X.a = a; X.i = 0; X.flags = {}; X.fsExits = 0; X.submitting = false;
    X.offset = new Date(a.now).getTime() - Date.now();
    X.ans = Object.assign({}, a.answers || {});
    try { const loc = JSON.parse(localStorage.getItem(lsKey()) || "null"); if (loc) Object.assign(X.ans, loc); } catch (e) {}
    $("xTitle").textContent = a.title;
    $("xPrev").classList.toggle("hide", !a.allow_back);
    clearInterval(D.cdT); show("vExam"); render(); tick();
    clearInterval(X.timer); X.timer = setInterval(tick, 500);
    if (a.fullscreen) enterFs();
    $("xSaved").textContent = "محفوظ";
    armGuard(a);
  }
  function stopExam() { clearInterval(X.timer); clearTimeout(X.saveT); X.a = null; disarmGuard(); }
  function remaining() { return new Date(X.a.deadline).getTime() - (Date.now() + X.offset); }
  function tick() {
    if (!X.a) return;
    const ms = remaining();
    $("xTimer").textContent = mmss(ms);
    $("xTimer").classList.toggle("low", ms < 120000);
    if (ms <= 0 && !X.submitting) { toast("انتهى الوقت — تُسلَّم إجاباتك الآن"); submit(true); }
  }
  function render() {
    const qs = X.a.questions, q = qs[X.i], n = qs.length;
    const answered = qs.filter((x) => X.ans[x.id] !== undefined && X.ans[x.id] !== null).length;
    $("xProg").textContent = "السؤال " + (X.i + 1) + " من " + n + " · أجبت " + answered;
    $("xBar").style.width = Math.round((answered / n) * 100) + "%";
    $("xCard").innerHTML = `<div class="qnum">السؤال ${X.i + 1} من ${n}</div><div class="stem">${esc(q.stem)}</div>` +
      (q.img ? `<img class="qimg" src="${esc(q.img)}" alt="صورة السؤال">` : "") +
      '<div class="opts" role="radiogroup">' + q.opts.map((o, j) =>
        `<button class="opt" role="radio" data-k="${o.k}" aria-checked="${X.ans[q.id] === o.k}"><span class="L">${L[j]}</span><span>${esc(o.t)}</span></button>`).join("") + "</div>";
    $("xCard").querySelectorAll(".opt").forEach((b) => (b.onclick = () => choose(q.id, +b.dataset.k)));
    $("xPrev").disabled = X.i === 0;
    $("xNext").innerHTML = X.i === n - 1 ? "المراجعة والتسليم" + ic("left", "sm") : "التالي" + ic("left", "sm");
    $("xFlag").innerHTML = ic("flag", "sm") + (X.flags[q.id] ? "إلغاء التعليم" : "علّم للمراجعة");
    $("xNav").innerHTML = qs.map((x, k) => {
      const c = [X.ans[x.id] !== undefined && X.ans[x.id] !== null ? "done" : "", k === X.i ? "cur" : "", X.flags[x.id] ? "flag" : ""].join(" ");
      const dis = !X.a.allow_back && k < X.i ? "disabled" : "";
      return `<button class="${c}" data-q="${k}" ${dis} aria-label="السؤال ${k + 1}">${k + 1}</button>`;
    }).join("");
    $("xNav").querySelectorAll("[data-q]").forEach((b) => (b.onclick = () => go(+b.dataset.q)));
  }
  function go(k) {
    if (!X.a.allow_back && k < X.i) return;
    X.i = Math.max(0, Math.min(X.a.questions.length - 1, k)); render(); window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function choose(qid, k) {
    X.ans[qid] = k; X.dirty = true; render();
    try { localStorage.setItem(lsKey(), JSON.stringify(X.ans)); } catch (e) {}
    $("xSaved").textContent = "يُحفظ…";
    clearTimeout(X.saveT); X.saveT = setTimeout(save, 1200);
  }
  async function save() {
    if (!X.a || !X.dirty) return;
    X.dirty = false;
    try {
      const r = await call("student_save", { p_attempt: X.a.attempt, p_answers: X.ans });
      if (r.ok) { $("xSaved").textContent = "✓ حُفظ"; X.offset = new Date(r.now).getTime() - Date.now(); }
      else if (r.code === "CLOSED") submit(true);
    } catch (e) { X.dirty = true; $("xSaved").textContent = "بلا اتصال — إجاباتك محفوظة على الجهاز"; clearTimeout(X.saveT); X.saveT = setTimeout(save, 5000); }
  }
  $("xPrev").onclick = () => go(X.i - 1);
  $("xNext").onclick = () => { if (X.i === X.a.questions.length - 1) $("xSubmit").scrollIntoView({ behavior: "smooth" }); else go(X.i + 1); };
  $("xFlag").onclick = () => { const q = X.a.questions[X.i]; X.flags[q.id] = !X.flags[q.id]; render(); };
  $("xSubmit").onclick = async () => {
    const qs = X.a.questions, miss = qs.filter((x) => X.ans[x.id] === undefined || X.ans[x.id] === null).length;
    const fl = qs.filter((x) => X.flags[x.id]).length;
    const ok = await confirmSheet("تسليم الإجابات؟",
      (miss ? `<b style="color:var(--danger)">لم تُجب عن ${miss} سؤالًا.</b><br>` : "أجبت عن جميع الأسئلة.<br>") +
      (fl ? `علّمت ${fl} سؤالًا للمراجعة.<br>` : "") + "لا يمكن التعديل بعد التسليم.", "نعم، سلّم");
    if (ok) submit(false);
  };
  async function submit(auto) {
    if (!X.a || X.submitting) return;
    X.submitting = true; clearTimeout(X.saveT);
    spin($("xSubmit"), true, "جارٍ التسليم…");
    let r, tries = 0;
    while (true) {
      try { r = await call("student_submit", { p_attempt: X.a.attempt, p_answers: X.ans, p_fs_exits: X.fsExits }); break; }
      catch (e) {
        if (!TOKEN) return;
        tries++; toast("تعذّر التسليم — إعادة المحاولة (" + tries + ")", true);
        await new Promise((ok) => setTimeout(ok, Math.min(8000, 1500 * tries)));
      }
    }
    try { localStorage.removeItem(lsKey()); } catch (e) {}
    const title = X.a.title; stopExam(); exitFs(); spin($("xSubmit"), false);
    showResult(r, title, auto);
  }

  // ===================== الحماية من الغش =====================
  const GD = { on: false, meta: null, last: {}, hiddenAt: 0, warnT: null, w0: 0 };
  const GMSG = { blur: "غادرت نافذة الاختبار", hidden: "خرجت إلى تطبيق أو تبويب آخر", fs_exit: "خرجت من وضع ملء الشاشة", copy: "النسخ ممنوع أثناء الاختبار",
    paste: "اللصق ممنوع أثناء الاختبار", print: "الطباعة ممنوعة أثناء الاختبار", screenshot: "رُصد زر لقطة الشاشة", devtools: "رُصد فتح أدوات المطوّر", context: "القائمة ممنوعة", shortcut: "هذا الاختصار ممنوع" };
  async function armGuard(a) {
    GD.on = false; GD.meta = null; GD.last = {}; GD.w0 = window.innerWidth;
    let m; try { m = await call("student_exam_meta", { p_attempt: a.attempt }); } catch (e) { return; }
    if (!m || !m.ok || !X.a) return;
    GD.meta = m; GD.on = !!m.strict;
    const wm = $("wmark");
    if (GD.on) {
      const txt = esc(m.name + " · " + (m.nid_tail ? "****" + m.nid_tail : "") + " · " + new Date().toLocaleDateString("ar-JO-u-nu-latn"));
      wm.innerHTML = Array.from({ length: 36 }, () => `<span>${txt}</span>`).join(""); wm.classList.remove("hide");
      document.body.classList.add("guarded");
      $("gBar").classList.remove("hide"); gBar();
      if (!a.answers || !Object.keys(a.answers).length) showRules(m);
    }
  }
  function disarmGuard() { GD.on = false; $("wmark").classList.add("hide"); $("wmark").innerHTML = ""; $("gBar").classList.add("hide"); document.body.classList.remove("guarded", "veiled"); }
  function gBar() {
    const m = GD.meta; if (!m) return;
    $("gBar").innerHTML = `${ic("shield", "sm")}<span>اختبار محمي — كل خروج أو نسخ أو لقطة شاشة يُسجَّل للمعلّم${m.max ? ` · المخالفات <b>${m.violations || 0}/${m.max}</b> (عند ${m.max} يُسلَّم تلقائيًّا)` : m.violations ? ` · مخالفات مسجّلة: <b>${m.violations}</b>` : ""}</span>`;
  }
  function showRules(m) {
    openSheet(`<h3>${ic("shield")} قبل أن تبدأ</h3><ul style="margin:0 0 14px;padding-inline-start:20px;line-height:2;font-size:14.5px">
      <li>ابقَ في صفحة الاختبار؛ الخروج إلى أي تطبيق أو تبويب يُسجَّل مخالفة.</li><li>النسخ واللصق والطباعة والقائمة اليمنى معطّلة.</li>
      <li>زر لقطة الشاشة يُرصد، واسمك مطبوع على الأسئلة؛ أي صورة مسرّبة تُكشف.</li><li>الوقت يحسبه الخادم، ويُسلَّم اختبارك تلقائيًّا عند انتهائه.</li>
      ${m.max ? `<li><b>عند ${m.max} مخالفات يُغلق اختبارك ويُسلَّم كما هو.</b></li>` : ""}<li>إجاباتك تُحفظ تلقائيًّا حتى لو انقطع الإنترنت.</li></ul>
      <button class="btn primary block lg" id="ruOk">فهمت، ابدأ</button>`);
    const b = document.getElementById("ruOk"); if (b) b.onclick = () => { closeSheet(); if (X.a && X.a.fullscreen) enterFs(); };
  }
  async function flag(kind, detail) {
    if (!X.a || X.submitting) return;
    if (!GD.on && kind !== "fs_exit") return;
    const now = Date.now(); if (GD.last[kind] && now - GD.last[kind] < 2500) return; GD.last[kind] = now;
    warn(GMSG[kind] || "مخالفة");
    let r; try { r = await call("student_flag", { p_attempt: X.a.attempt, p_kind: kind, p_detail: detail || null }); } catch (e) { return; }
    if (!r) return;
    if (GD.meta && r.violations != null) { GD.meta.violations = r.violations; gBar(); }
    if (r.closed && X.a && !X.submitting) {
      const title = X.a.title; try { localStorage.removeItem(lsKey()); } catch (e) {}
      X.submitting = true; stopExam(); exitFs(); closeSheet();
      showResult({ ok: false, error: "أُغلق اختبارك وسُلِّمت إجاباتك تلقائيًّا لتجاوز حد المخالفات المسموح به. أُبلغ المعلّم." }, title, true);
    }
  }
  function warn(msg) {
    const w = $("gWarn"); w.innerHTML = ic("alert") + "<b>" + esc(msg) + "</b><span>سُجّلت للمعلّم</span>"; w.classList.add("on");
    clearTimeout(GD.warnT); GD.warnT = setTimeout(() => w.classList.remove("on"), 3200);
  }
  // ملء الشاشة
  function enterFs() { const el = document.documentElement; if (el.requestFullscreen) el.requestFullscreen().catch(() => {}); }
  function exitFs() { $("fsLock").classList.add("hide"); if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {}); }
  document.addEventListener("fullscreenchange", () => {
    if (X.a && X.a.fullscreen && !document.fullscreenElement && !X.submitting) { X.fsExits++; $("fsLock").classList.remove("hide"); flag("fs_exit"); }
  });
  $("fsBack").onclick = () => { enterFs(); $("fsLock").classList.add("hide"); };
  // الخروج من الصفحة/التطبيق
  document.addEventListener("visibilitychange", () => {
    if (!X.a) return;
    if (document.hidden) { GD.hiddenAt = Date.now(); if (X.a.fullscreen) X.fsExits++; document.body.classList.add("veiled"); }
    else { document.body.classList.remove("veiled"); if (GD.hiddenAt) { const sec = Math.round((Date.now() - GD.hiddenAt) / 1000); GD.hiddenAt = 0; flag("hidden", "مدة الغياب " + sec + " ثانية"); } save(); }
  });
  window.addEventListener("blur", () => { if (!X.a || !GD.on) return; document.body.classList.add("veiled");
    setTimeout(() => { if (X.a && !document.hidden && !document.hasFocus()) flag("blur"); }, 400); });
  window.addEventListener("focus", () => document.body.classList.remove("veiled"));
  // النسخ واللصق والقائمة والسحب والطباعة
  ["copy", "cut"].forEach((ev) => document.addEventListener(ev, (e) => { if (X.a) { e.preventDefault(); flag("copy"); } }));
  document.addEventListener("paste", (e) => { if (X.a) { e.preventDefault(); flag("paste"); } });
  document.addEventListener("contextmenu", (e) => { if (X.a) { e.preventDefault(); flag("context"); } });
  document.addEventListener("dragstart", (e) => { if (X.a) e.preventDefault(); });
  document.addEventListener("selectstart", (e) => { if (X.a && GD.on) e.preventDefault(); });
  window.addEventListener("beforeprint", () => { if (X.a) flag("print"); });
  // اختصارات لوحة المفاتيح ولقطة الشاشة وأدوات المطوّر
  document.addEventListener("keydown", (e) => {
    if (!X.a || !GD.on) return;
    const k = (e.key || "").toLowerCase(), mod = e.ctrlKey || e.metaKey;
    if (k === "printscreen") { flag("screenshot"); return; }
    if (k === "f12" || (mod && e.shiftKey && ["i", "j", "c", "s"].includes(k))) { e.preventDefault(); flag("devtools"); return; }
    if (mod && ["c", "x", "v", "a", "p", "s", "u"].includes(k)) { e.preventDefault(); flag(k === "p" ? "print" : k === "v" ? "paste" : k === "c" || k === "x" ? "copy" : "shortcut"); }
    if (e.metaKey && e.shiftKey && ["3", "4", "5"].includes(k)) flag("screenshot");
  }, true);
  document.addEventListener("keyup", (e) => {
    if (!X.a || !GD.on) return;
    if ((e.key || "").toLowerCase() === "printscreen") { try { navigator.clipboard.writeText(" "); } catch (x) {} document.body.classList.add("veiled"); setTimeout(() => document.body.classList.remove("veiled"), 1200); flag("screenshot"); }
  }, true);
  window.addEventListener("resize", () => {
    if (!X.a || !GD.on) return;
    if (window.outerWidth - window.innerWidth > 200 || window.outerHeight - window.innerHeight > 260) flag("devtools", "فرق أبعاد النافذة");
    else if (GD.w0 && window.innerWidth < GD.w0 * 0.7) flag("resize", "عرض " + window.innerWidth + " من " + GD.w0);
  });
  window.addEventListener("offline", () => { if (X.a) warn("انقطع الإنترنت — إجاباتك محفوظة على الجهاز"); });
  window.addEventListener("beforeunload", (e) => { if (X.a && !X.submitting) { save(); e.preventDefault(); e.returnValue = ""; } });

  // ===================== النتيجة =====================
  async function openResult(att) {
    try { const r = await call("student_result", { p_attempt: att }); if (!r.ok) { toast(r.error, true); return; } showResult(r, r.title); }
    catch (e) { toast(e.message, true); }
  }
  function showResult(r, title, auto) {
    $("rTitle").textContent = title || "النتيجة";
    let h = "";
    if (!r || r.hidden || r.ok === false) {
      h = `<div class="card pad" style="text-align:center"><div class="welcome" style="padding:10px"><div class="ok">${ic("check", "lg")}</div></div>
           <h2 style="margin:0 0 6px">${auto ? "انتهى الوقت وسُلِّمت إجاباتك" : "سُلِّمت إجاباتك"}</h2>
           <p class="muted">${esc((r && (r.message || r.error)) || "")}</p></div>`;
    } else {
      const p = pct(r.score, r.total) || 0;
      h = `<div class="card pad" style="text-align:center"><div class="score-ring" style="--p:${p}"><div><div><b class="num">${r.score}/${r.total}</b><span class="tiny">${p}٪</span></div></div></div>
           <p class="muted">${p >= 85 ? "أداء متميّز، أحسنت." : p >= 50 ? "أحسنت، واصل التقدّم." : "راجع النتاجات أدناه وحاول تحسينها."}</p></div>`;
      if (r.outcomes && r.outcomes.length) {
        h += '<div class="lbl" style="margin:18px 0 10px">أداؤك في كل نتاج</div><div class="card pad stack">' + r.outcomes.map((o) => {
          const q = pct(o.correct, o.total) || 0;
          return `<div><div class="row sp" style="font-size:14px;align-items:flex-start"><span><span class="lbl-chip">${esc(o.label)}</span> ${esc(o.text)}</span><b class="num">${o.correct}/${o.total}</b></div>
                  <div class="bar" style="margin-top:7px"><i style="width:${q}%;background:${q >= 75 ? "var(--l4)" : q >= 50 ? "var(--l3)" : q >= 25 ? "var(--l2)" : "var(--l1)"}"></i></div></div>`;
        }).join("") + "</div>";
      }
    }
    $("rBody").innerHTML = h; show("vResult");
  }
  $("rBack").onclick = () => { location.hash = "#/results"; loadDash(); };

  // ===================== التشغيل =====================
  if (TOKEN) loadDash().catch(() => showSite()); else showSite();
})();
