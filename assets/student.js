// صفحة الطالب: موقع + دخول + لوحة مقسّمة إلى أقسام + أداء الاختبار + النتيجة
(function () {
  const { $, esc, L, fmtDT, mmss, digits, toast, openSheet, closeSheet, confirmSheet, rpcFetch, initSkin, skinPicker, spin, greet, firstName, ago } = U;
  const KIND = { quiz: "كويز", first_written: "الاختبار الأول", final_written: "الاختبار النهائي", practice: "تدريبي" };
  const MONTHS = ["كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران", "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول"];
  const LV = { 1: "بحاجة إلى دعم", 2: "قيد التقدّم", 3: "جيد", 4: "متقن" };

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
    try { [h, p] = await Promise.all([call("student_home"), call("student_profile")]); }
    catch (e) { if (!silent) toast(e.message, true); throw e; }
    if (!h.ok) { toast(h.error, true); return; }
    D.home = h; D.prof = p && p.ok ? p : { me: {}, history: [], stats: {}, upcoming: [], units: [] };
    $("hName").textContent = h.name || ""; $("hAv").textContent = firstName(h.name).slice(0, 1) || "؟";
    route();
    if (!silent) show("vHome");
  }
  window.addEventListener("hashchange", () => { if (D.home && !X.a) { route(); window.scrollTo(0, 0); } });
  function route() {
    const k = (location.hash || "").replace("#/", "");
    const fn = { exams: pExams, upcoming: pUpcoming, results: pResults, outcomes: pOutcomes, me: pMe }[k];
    $("dash").innerHTML = fn ? fn() : dashHome();
    wire(); clearInterval(D.cdT); D.cdT = setInterval(tickCountdowns, 30000);
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

  function dashHome() {
    const h = D.home, p = D.prof, me = p.me || {}, st = p.stats || {};
    const open = h.exams.filter((x) => x.is_open), up = p.upcoming || [];
    const outs = allOutcomes(), measured = outs.filter((o) => o.level), mastered = measured.filter((o) => o.level >= 3).length;
    let out = `<section class="greet"><div style="position:relative;z-index:1">
      <h1>${greet()}، ${esc(firstName(h.name))}</h1>
      <div class="sub">${esc([me.section && "شعبة " + me.section, me.subject, me.grade].filter(Boolean).join(" · "))}</div></div>
      <div class="kpis">
        <div class="kpi"><b class="num">${st.done || 0}</b><span>اختبار أنجزته</span></div>
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
          <div class="meta"><span>${esc(KIND[x.kind] || "")}</span><span>${x.n_questions} سؤالًا</span><span>${x.duration_min} دقيقة</span>
          ${x.mode === "lab" ? "<span>داخل المختبر</span>" : ""}<span>يُغلق <b class="cd" data-cd="${x.ends_at}">${ago(x.ends_at)}</b></span></div></div>
        <div>${can ? `<button class="btn primary lg" data-start="${x.id}" data-mode="${x.mode}" data-running="${x.running ? 1 : 0}">${x.running ? "متابعة الاختبار" : "ابدأ الاختبار"}${ic("left", "sm")}</button>`
                   : '<span class="pill ended">سُلِّم</span>'}</div></div>`;
    });

    out += smartBox(open, up, outs, measured);

    const lastRes = (p.history || []).find((x) => x.visible && x.total);
    const tiles = [
      ["exams", "file", "اختباراتي", open.length ? "اختبار مفتوح الآن — ادخل وابدأ" : "الاختبارات المفتوحة والسابقة", open.length, !!open.length],
      ["upcoming", "cal", "المواعيد القادمة", up.length ? "أقرب اختبار " + ago(up[0].starts_at) : "لا مواعيد مجدولة الآن", up.length],
      ["results", "award", "نتائجي", lastRes ? "آخر نتيجة: " + lastRes.score + "/" + lastRes.total : "تظهر هنا علاماتك وتفاصيلها", (p.history || []).length],
      ["outcomes", "target", "خريطة نتاجاتي", measured.length ? "مستواك في " + measured.length + " نتاجًا من " + outs.length : "مستواك في كل نتاج من الكتاب", null],
      ["me", "user", "ملفّي", "بياناتك وشعبتك ومعلّمك", null],
      ["", "palette", "المظهر", "اختر السمة التي تريح عينيك", null, false, true]
    ];
    out += '<div class="tiles">' + tiles.map(([k, i, t, s, c, hot, skin]) =>
      `<button class="tile" ${skin ? "data-skin-open" : `data-go="${k}"`}><div class="ibox ${k === "outcomes" ? "gold" : ""}">${ic(i)}</div>
        ${c != null ? `<span class="cnt ${hot ? "hot" : ""} num">${c}</span>` : ""}<div><h3>${t}</h3><p>${esc(s)}</p></div><span class="go">${ic("left", "sm")}</span></button>`).join("") + "</div>";
    return out;
  }

  function smartBox(open, up, outs, measured) {
    const tips = [];
    const run = D.home.exams.find((x) => x.running);
    if (run) tips.push(`لديك اختبار لم تُكمله: <b>${esc(run.title)}</b>. أكمله قبل أن ينتهي وقته.`);
    if (up.length) tips.push(`أقرب اختبار: <b>${esc(up[0].title)}</b> <span data-cd="${up[0].starts_at}">${ago(up[0].starts_at)}</span>.`);
    const weak = measured.filter((o) => o.level <= 2).sort((a, b) => a.level - b.level);
    if (weak.length) tips.push(`ركّز مراجعتك على: ${weak.slice(0, 2).map((o) => `<b>${esc(o.text.replace(/\.$/, ""))}</b>`).join("، ")}${weak.length > 2 ? ` و${weak.length - 2} غيرها` : ""}.`);
    else if (measured.length >= 3) tips.push("مستواك في النتاجات المقيسة جيد أو متقن. حافظ عليه بمراجعة سريعة قبل كل اختبار.");
    const g = (D.prof.history || []).filter((x) => x.visible && x.total);
    if (g.length >= 2) {
      const d = pct(g[0].score, g[0].total) - pct(g[1].score, g[1].total);
      if (d >= 5) tips.push(`تحسّنت ${d} نقطة مئوية عن اختبارك السابق. استمر.`);
      else if (d <= -5) tips.push(`نتيجتك الأخيرة أقل بـ ${-d} نقطة من سابقتها؛ راجع تفاصيلها في «نتائجي».`);
    }
    if (!tips.length) tips.push(outs.length ? "لم تُقَس نتاجاتك بعد. ستظهر هنا توصيات مخصّصة لك بعد أول اختبار." : "مرحبًا بك في صفحتك. ستظهر هنا اختباراتك ونتائجك فور نشرها.");
    return `<div class="smart">${ic("spark")}<div><b>توصية لك</b><div style="margin-top:4px">${tips.slice(0, 3).join("<br>")}</div></div></div>`;
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
      <div class="meta"><span>${esc(KIND[x.kind] || "")}</span><span>${ic("clock", "sm")}${x.duration_min} دقيقة</span><span>${ic("list", "sm")}${x.n_questions} سؤالًا</span>
        ${x.mode === "lab" ? `<span>${ic("lock", "sm")}داخل المختبر</span>` : ""}${x.max_attempts > 1 ? `<span>المحاولات: ${x.used} من ${x.max_attempts}</span>` : ""}</div>
      ${x.is_open ? `<div class="tiny">يُغلق ${esc(fmtDT(x.ends_at))}</div>` : ""}${res}${act}</div>`;
  }

  function pUpcoming() {
    const up = D.prof.upcoming || [];
    let h = crumb("المواعيد القادمة", "اختبارات نشرها معلّمك ولم يحن موعدها");
    if (!up.length) return h + emptyBox("cal", "لا توجد اختبارات مجدولة", "عندما يجدول معلّمك اختبارًا يظهر هنا مع عدّ تنازلي.");
    return h + '<div class="card pad"><div class="timeline">' + up.map((x) =>
      `<div class="ev"><div class="row sp wrap"><b style="font-family:var(--f-disp)">${esc(x.title)}</b><span class="pill soon" data-cd="${x.starts_at}">${ago(x.starts_at)}</span></div>
       <div class="tiny" style="margin-top:4px">${esc(fmtDT(x.starts_at))} · ${esc(KIND[x.kind] || "")} · ${x.duration} دقيقة · ${x.n} سؤالًا${x.mode === "lab" ? " · داخل المختبر" : ""}</div></div>`).join("") + "</div></div>";
  }

  function pResults() {
    const hs = D.prof.history || [], st = D.prof.stats || {};
    let h = crumb("نتائجي", st.graded ? `المعدل ${Math.round(st.avg)}٪ · أفضل نتيجة ${Math.round(st.best)}٪` : "");
    if (!hs.length) return h + emptyBox("award", "لا توجد نتائج بعد", "بعد أول اختبار تظهر هنا علاماتك وتفاصيلها على النتاجات.");
    return h + '<div class="card list">' + hs.map((x) => {
      const p = x.visible && x.total ? pct(x.score, x.total) : null;
      return `<div class="li"><div><b>${esc(x.title)}</b><div class="tiny">${esc(KIND[x.kind] || "")} · ${esc(fmtDT(x.at))}${x.status === "expired" ? " · سُلِّم تلقائيًّا عند انتهاء الوقت" : ""}</div>
          ${p != null ? `<div class="bar" style="margin-top:8px;max-width:340px"><i style="width:${p}%"></i></div>` : ""}</div>
        <div style="text-align:end">${p != null ? `<div class="score num">${x.score}/${x.total}</div><button class="btn sm ghost" data-res="${x.id}">التفاصيل</button>`
                                               : '<span class="pill ended">النتيجة لم تُعلَن</span>'}</div></div>`;
    }).join("") + "</div>";
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
  }
  function stopExam() { clearInterval(X.timer); clearTimeout(X.saveT); X.a = null; }
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

  // ===================== ملء الشاشة =====================
  function enterFs() { const el = document.documentElement; if (el.requestFullscreen) el.requestFullscreen().catch(() => {}); }
  function exitFs() { $("fsLock").classList.add("hide"); if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {}); }
  document.addEventListener("fullscreenchange", () => {
    if (X.a && X.a.fullscreen && !document.fullscreenElement && !X.submitting) { X.fsExits++; $("fsLock").classList.remove("hide"); }
  });
  document.addEventListener("visibilitychange", () => {
    if (X.a && X.a.fullscreen && document.hidden && !X.submitting) X.fsExits++;
    if (X.a && !document.hidden) save();
  });
  $("fsBack").onclick = () => { enterFs(); $("fsLock").classList.add("hide"); };
  document.addEventListener("contextmenu", (e) => { if (X.a) e.preventDefault(); });
  document.addEventListener("copy", (e) => { if (X.a) e.preventDefault(); });
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
