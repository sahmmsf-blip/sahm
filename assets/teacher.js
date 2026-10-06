// لوحة المعلم: الرئيسية والتنبيهات، بنك الأسئلة، الاختبارات، النتائج والتحليل، بيانات دخول الطلبة
(function () {
  const { $, esc, L, fmtDT, toLocalInput, fromLocalInput, digits, toast, openSheet, closeSheet, confirmSheet, cycleTheme, download, csv } = U;
  const C = window.APP_CONFIG;
  const sb = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true } });

  const KIND = { quiz: "كويز", first_written: "الاختبار الأول (كتابي)", final_written: "الاختبار النهائي", practice: "تدريبي (لا يُرحَّل)" };
  const STATE = { draft: "مسودة", scheduled: "مجدول", open: "مفتوح الآن", ended: "منتهٍ" };
  const BLOOM = ["تذكّر", "فهم", "تطبيق", "تحليل", "تقويم", "إبداع"];
  const DIFF = ["سهل", "متوسط", "صعب"];
  const LEVEL = ["", "مبتدئ", "نامٍ", "متمكّن", "متميّز"];

  const S = { d: null, qs: [], out: {}, lessons: {}, units: {}, rep: null, repTab: "students", liveT: null, bankLimit: 60,
              bank: { unit: "", lesson: "", outcome: "", bloom: "", q: "", archived: false } };

  async function rpc(fn, args) {
    const { data, error } = await sb.rpc(fn, args || {});
    if (error) throw new Error(error.message || "حدث خطأ");
    return data;
  }
  async function guard(p, okMsg) {
    try { const r = await p; if (okMsg) toast(okMsg); return r; } catch (e) { toast(e.message, true); throw e; }
  }

  // ================= الدخول =================
  U.initSkin("teacher", "white");
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
  function nidUi() { const v = $("tNid").value; $("tNidCount").textContent = v.length + "/10"; $("tNidWrap").classList.toggle("full", v.length === 10); }
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
      if (!r.ok) return lErr(r.code === "NOT_FOUND" ? r.error + " ادخل بالبريد مرة واحدة، ثم اربط رقمك الوطني من داخل اللوحة." : r.error);
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
      boot();
    } catch (ex) { lErr("تعذّر الاتصال بالخادم. تحقّق من الإنترنت."); } finally { U.spin(b, false); }
  });
  $("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault(); lErr("");
    const b = $("loginBtn"); U.spin(b, true, "جارٍ الدخول…");
    const r = await sb.auth.signInWithPassword({ email: $("email").value.trim(), password: $("pass").value });
    U.spin(b, false);
    if (r.error) return lErr("تعذّر الدخول — تأكد من البريد وكلمة السر.");
    boot();
  });
  $("outBtn").onclick = async () => { await sb.auth.signOut(); location.reload(); };
  $("themeBtn").onclick = U.skinPicker;

  // ربط الرقم الوطني بالحساب (يظهر مرة واحدة إن لم يُربط)
  async function askNid(force) {
    let me; try { me = await rpc("t_me"); } catch (e) { return; }
    if (!me || (me.nid && !force)) return;
    const b = openSheet(`<h3>${ic("id")} اربط رقمك الوطني بحسابك</h3>
      <p class="muted" style="margin-bottom:14px">بعدها تدخل إلى المنصة برقمك الوطني وكلمة السر نفسها، دون كتابة البريد.</p>
      <input class="input mono" id="mNid" inputmode="numeric" maxlength="10" dir="ltr" style="font-size:22px;text-align:center;letter-spacing:.14em" value="${esc(me.nid || "")}" placeholder="٠٠٠٠٠٠٠٠٠٠">
      <div class="row" style="margin-top:14px"><button class="btn primary grow" id="mNidOk">ربط الرقم</button><button class="btn ghost" id="mNidNo">لاحقًا</button></div>`);
    const inp = b.querySelector("#mNid");
    inp.oninput = () => { inp.value = digits(inp.value).replace(/\D/g, "").slice(0, 10); };
    b.querySelector("#mNidNo").onclick = () => { closeSheet(); try { sessionStorage.setItem("sahm_nid_later", "1"); } catch (e) {} };
    b.querySelector("#mNidOk").onclick = async () => {
      try { await guard(rpc("t_set_my_nid", { p_nid: inp.value }), "رُبط رقمك الوطني. ادخل به من الآن."); closeSheet();
            try { localStorage.setItem("sahm_t_nid", inp.value); } catch (e) {} } catch (e) {}
    };
  }

  async function boot() {
    $("vLogin").classList.add("hide"); $("app").classList.remove("hide");
    try { await reload(); } catch (e) { toast(e.message, true); return; }
    if (!location.hash) location.hash = "#home";
    route();
    let later = false; try { later = sessionStorage.getItem("sahm_nid_later") === "1"; } catch (e) {}
    if (!later) setTimeout(() => askNid(false), 600);
  }
  async function reload(withQuestions = true) {
    const [d, qs] = await Promise.all([rpc("t_bootstrap"), withQuestions ? rpc("t_questions") : Promise.resolve(S.qs)]);
    S.d = d; S.qs = qs || [];
    S.out = {}; S.lessons = {}; S.units = {};
    d.units.forEach((u) => {
      S.units[u.id] = u;
      u.lessons.forEach((l) => {
        S.lessons[l.id] = Object.assign({ unit: u }, l);
        l.outcomes.forEach((o) => { S.out[o.id] = Object.assign({ lesson: l, unit: u, label: "و" + u.seq + "/د" + l.seq + "/ن" + o.seq }, o); });
      });
    });
  }
  const secName = (id) => (S.d.sections.find((s) => s.id === id) || {}).name || "";
  const outLabel = (id) => (S.out[id] ? S.out[id].label : "—");

  // ================= التوجيه =================
  const TITLES = { home: "الرئيسية", bank: "بنك الأسئلة", exams: "الاختبارات", results: "النتائج والتحليل", students: "الطلبة والشعب", records: "سجلات العلامات" };
  function route() {
    const [v, arg] = (location.hash || "#home").slice(1).split("/");
    const view = TITLES[v] ? v : "home";
    Object.keys(TITLES).forEach((k) => $("v-" + k).classList.toggle("hide", k !== view));
    document.querySelectorAll(".tabbar button").forEach((b) => { if (b.dataset.v === view) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
    $("pgTitle").textContent = TITLES[view];
    $("pgSub").textContent = S.d && S.d.subject ? S.d.subject.name + " — " + S.d.subject.grade_label : "";
    clearInterval(S.liveT);
    if (view === "home") renderHome();
    if (view === "bank") renderBank();
    if (view === "exams") renderExams(arg);
    if (view === "results") renderResults(arg);
    if (view === "students") renderStudents(arg);
    if (view === "records") renderRecords(arg);
    window.scrollTo(0, 0);
  }
  document.querySelectorAll(".tabbar button").forEach((b) => (b.onclick = () => (location.hash = "#" + b.dataset.v)));
  window.addEventListener("hashchange", route);

  // ================= الرئيسية =================
  function renderHome() {
    const d = S.d, ex = d.exams;
    const n = d.sections.reduce((a, s) => a + s.n, 0), nc = d.sections.reduce((a, s) => a + s.n_cred, 0);
    const stats = [[d.n_questions, "سؤالًا في البنك"], [ex.length, "اختبارًا"], [ex.filter((x) => x.state === "open").length, "مفتوح الآن"],
                   [nc + " من " + n, "طالبًا جاهزًا للدخول"]];
    let h = '<div class="stats">' + stats.map((s) => `<div class="stat"><b class="mono">${s[0]}</b><span>${s[1]}</span></div>`).join("") + "</div>";
    h += '<div class="sect-title">التنبيهات</div>';
    const icon = { warn: "⚠️", todo: "📌", info: "🟢" };
    h += d.alerts.length ? '<div class="stack">' + d.alerts.map((a) =>
      `<button class="alert ${a.level}" data-go="${esc(a.go)}"><span class="ic">${icon[a.level] || "•"}</span><span class="grow">${esc(a.msg)}</span><span>‹</span></button>`).join("") + "</div>"
      : '<div class="card empty"><span class="e">✨</span>لا تنبيهات الآن.</div>';
    const soon = ex.filter((x) => x.state === "open" || x.state === "scheduled").slice(0, 6);
    if (soon.length) h += '<div class="sect-title">مفتوحة ومجدولة</div><div class="grid two">' + soon.map(examCard).join("") + "</div>";
    h += '<div class="sect-title">تغطية بنك الأسئلة للنتاجات</div><div class="card pad stack">' + d.units.map((u) =>
      u.lessons.map((l) => `<div><div class="tiny" style="font-weight:700;margin-bottom:6px">الوحدة ${u.seq} · الدرس ${l.seq}: ${esc(l.title)}</div><div class="chips">` +
        l.outcomes.map((o) => `<button class="chip ${o.nq ? "" : "zero"}" data-bank-out="${o.id}" title="${esc(o.text)}">ن${o.seq}<span class="n">${o.nq}</span></button>`).join("") + "</div></div>").join("")).join("") + "</div>";
    $("v-home").innerHTML = h;
    bindExamCards($("v-home"));
    $("v-home").querySelectorAll("[data-go]").forEach((b) => (b.onclick = () => {
      const g = b.dataset.go;
      if (g === "credentials") location.hash = "#students";
      else if (g.startsWith("report:")) location.hash = "#results/" + g.slice(7);
      else if (g.startsWith("exam:")) { location.hash = "#exams"; setTimeout(() => editExam(g.slice(5)), 50); }
    }));
    $("v-home").querySelectorAll("[data-bank-out]").forEach((b) => (b.onclick = () => {
      const o = S.out[b.dataset.bankOut]; Object.assign(S.bank, { unit: o.unit.id, lesson: o.lesson.id, outcome: o.id });
      location.hash = "#bank";
    }));
  }

  // ================= بنك الأسئلة =================
  function optionsHtml(sel, list, all) {
    return (all ? `<option value="">${all}</option>` : "") + list.map((x) => `<option value="${esc(x[0])}" ${x[0] === sel ? "selected" : ""}>${esc(x[1])}</option>`).join("");
  }
  function lessonsOf(unitId) { return unitId ? S.units[unitId].lessons : S.d.units.flatMap((u) => u.lessons); }
  function outcomesOf(lessonId, unitId) {
    if (lessonId) return S.lessons[lessonId].outcomes;
    return lessonsOf(unitId).flatMap((l) => l.outcomes);
  }
  function filteredQs() {
    const f = S.bank, q = f.q.trim();
    return S.qs.filter((x) => {
      if (!f.archived && !x.active) return false;
      const o = S.out[x.outcome_id]; if (!o) return !f.unit && !f.lesson && !f.outcome;
      if (f.unit && o.unit.id !== f.unit) return false;
      if (f.lesson && o.lesson.id !== f.lesson) return false;
      if (f.outcome && x.outcome_id !== f.outcome) return false;
      if (f.bloom && x.bloom !== f.bloom) return false;
      if (q && !(x.stem + " " + x.options.join(" ") + " " + (x.tag || "")).includes(q) && String(x.num) !== q) return false;
      return true;
    });
  }
  function renderBank() {
    const f = S.bank;
    const h = `<div class="card pad">
      <div class="fields three">
        <label class="field"><span>الوحدة</span><select class="input" id="bUnit">${optionsHtml(f.unit, S.d.units.map((u) => [u.id, "الوحدة " + u.seq + " · " + u.title]), "كل الوحدات")}</select></label>
        <label class="field"><span>الدرس</span><select class="input" id="bLesson">${optionsHtml(f.lesson, lessonsOf(f.unit).map((l) => [l.id, "الدرس " + l.seq + " · " + l.title]), "كل الدروس")}</select></label>
        <label class="field"><span>النتاج</span><select class="input" id="bOut">${optionsHtml(f.outcome, outcomesOf(f.lesson, f.unit).map((o) => [o.id, S.out[o.id].label + " — " + o.text]), "كل النتاجات")}</select></label>
      </div>
      <div class="row wrap">
        <input class="input grow" id="bQ" placeholder="بحث في النص أو رقم السؤال…" value="${esc(f.q)}" style="min-width:180px">
        <select class="input" id="bBloom" style="width:auto">${optionsHtml(f.bloom, BLOOM.map((b) => [b, b]), "كل مستويات بلوم")}</select>
        <label class="check"><input type="checkbox" id="bArch" ${f.archived ? "checked" : ""}> المؤرشفة</label>
      </div>
      <div class="row wrap" style="margin-top:6px">
        <button class="btn primary" id="bNew">＋ سؤال جديد</button>
        <button class="btn" id="bPaste">📋 لصق من إكسل</button>
        <button class="btn ghost sm" id="bTpl">⬇ قالب الاستيراد</button>
        <button class="btn ghost sm" id="bExport">⬇ تصدير البنك</button>
      </div></div>
      <div id="bList"></div>`;
    $("v-bank").innerHTML = h;
    const re = () => { S.bankLimit = 60; renderBank(); };
    $("bUnit").onchange = (e) => { f.unit = e.target.value; f.lesson = ""; f.outcome = ""; re(); };
    $("bLesson").onchange = (e) => { f.lesson = e.target.value; f.outcome = ""; re(); };
    $("bOut").onchange = (e) => { f.outcome = e.target.value; re(); };
    $("bBloom").onchange = (e) => { f.bloom = e.target.value; re(); };
    $("bArch").onchange = (e) => { f.archived = e.target.checked; re(); };
    let qt; $("bQ").oninput = (e) => { clearTimeout(qt); qt = setTimeout(() => { f.q = e.target.value; renderBankList(); }, 250); };
    $("bNew").onclick = () => editQuestion(null);
    $("bPaste").onclick = importSheet;
    $("bTpl").onclick = downloadTemplate;
    $("bExport").onclick = exportBank;
    renderBankList();
  }
  function renderBankList() {
    const list = filteredQs();
    let h = `<div class="sect-title">${list.length} سؤالًا</div>`;
    if (!list.length) h += '<div class="card empty"><span class="e">🗂️</span>لا أسئلة هنا بعد. أضف سؤالًا أو الصق مجموعة من إكسل.</div>';
    h += '<div class="grid two">' + list.slice(0, S.bankLimit).map((x) => `
      <div class="card qitem" style="${x.active ? "" : "opacity:.6"}">
        <div class="row wrap" style="gap:6px;margin-bottom:6px">
          <span class="pill brand mono">#${x.num}</span><span class="pill" title="${esc((S.out[x.outcome_id] || {}).text || "")}">${esc(outLabel(x.outcome_id))}</span>
          <span class="pill">${esc(x.bloom)}</span><span class="pill">${esc(x.difficulty)}</span>
          ${x.p != null ? `<span class="pill ${x.p < 0.2 ? "bad" : ""}" title="نسبة من أجابوا صحيحًا">✓ ${Math.round(x.p * 100)}٪ من ${x.n_answers}</span>` : ""}
          ${x.used ? `<span class="pill">في ${x.used} اختبار</span>` : ""}${x.active ? "" : '<span class="pill draft">مؤرشف</span>'}
        </div>
        <div class="stem">${esc(x.stem)}</div>
        ${x.img ? `<img class="qimg" src="${esc(x.img)}" alt="" style="max-height:140px">` : ""}
        <ol>${x.options.map((o, i) => `<li class="${i === x.correct ? "ok" : ""}">${L[i]}) ${esc(o)}</li>`).join("")}</ol>
        <div class="row" style="margin-top:10px"><button class="btn sm" data-edit="${x.id}">تعديل</button>
          <button class="btn sm ghost" data-arch="${x.id}">${x.active ? "أرشفة" : "استرجاع"}</button></div>
      </div>`).join("") + "</div>";
    if (list.length > S.bankLimit) h += `<button class="btn block" id="bMore" style="margin-top:12px">عرض المزيد (${list.length - S.bankLimit})</button>`;
    $("bList").innerHTML = h;
    $("bList").querySelectorAll("[data-edit]").forEach((b) => (b.onclick = () => editQuestion(b.dataset.edit)));
    $("bList").querySelectorAll("[data-arch]").forEach((b) => (b.onclick = async () => {
      const q = S.qs.find((x) => x.id === b.dataset.arch);
      await guard(rpc("t_set_question_active", { p_id: q.id, p_active: !q.active }), q.active ? "أُرشف السؤال" : "استُرجع السؤال");
      q.active = !q.active; renderBankList();
    }));
    const more = $("bMore"); if (more) more.onclick = () => { S.bankLimit += 60; renderBankList(); };
  }

  function outcomePicker(prefix, outId) {
    const o = outId && S.out[outId];
    const u = o ? o.unit.id : (S.bank.unit || S.d.units[0].id);
    const l = o ? o.lesson.id : (S.bank.lesson || S.units[u].lessons[0].id);
    return `<div class="fields three">
      <label class="field"><span>الوحدة</span><select class="input" id="${prefix}U">${optionsHtml(u, S.d.units.map((x) => [x.id, "الوحدة " + x.seq + " · " + x.title]))}</select></label>
      <label class="field"><span>الدرس</span><select class="input" id="${prefix}L">${optionsHtml(l, S.units[u].lessons.map((x) => [x.id, "الدرس " + x.seq + " · " + x.title]))}</select></label>
      <label class="field"><span>النتاج</span><select class="input" id="${prefix}O">${optionsHtml(outId || S.bank.outcome, S.lessons[l].outcomes.map((x) => [x.id, "ن" + x.seq + " — " + x.text]))}</select></label>
    </div>`;
  }
  function wireOutcomePicker(root, prefix) {
    const U_ = root.querySelector("#" + prefix + "U"), L_ = root.querySelector("#" + prefix + "L"), O_ = root.querySelector("#" + prefix + "O");
    U_.onchange = () => { L_.innerHTML = optionsHtml("", S.units[U_.value].lessons.map((x) => [x.id, "الدرس " + x.seq + " · " + x.title])); L_.onchange(); };
    L_.onchange = () => { O_.innerHTML = optionsHtml("", S.lessons[L_.value].outcomes.map((x) => [x.id, "ن" + x.seq + " — " + x.text])); };
    return () => O_.value;
  }

  function editQuestion(id) {
    const q = id ? S.qs.find((x) => x.id === id) : { options: ["", "", "", ""], correct: 0, bloom: "فهم", difficulty: "متوسط", stem: "", tag: "", img: "" };
    const opts = q.options.concat(["", "", "", ""]).slice(0, 4);
    const b = openSheet(`<h3>${id ? "تعديل السؤال #" + q.num : "سؤال جديد"}</h3>
      ${outcomePicker("qe", q.outcome_id)}
      <div class="fields two">
        <label class="field"><span>مستوى بلوم</span><select class="input" id="qeB">${optionsHtml(q.bloom, BLOOM.map((x) => [x, x]))}</select></label>
        <label class="field"><span>الصعوبة</span><select class="input" id="qeD">${optionsHtml(q.difficulty, DIFF.map((x) => [x, x]))}</select></label>
      </div>
      <label class="field"><span>نص السؤال</span><textarea class="input" id="qeS" rows="3">${esc(q.stem)}</textarea></label>
      <div class="field"><span>الخيارات (اختر الإجابة الصحيحة بالدائرة؛ يمكن ترك الخيارين الأخيرين فارغين)</span>
        ${opts.map((o, i) => `<div class="row" style="margin-bottom:8px"><input type="radio" name="qeC" value="${i}" ${i === q.correct ? "checked" : ""} style="width:20px;height:20px;accent-color:var(--brand)" aria-label="الإجابة الصحيحة ${L[i]}">
          <b style="width:18px">${L[i]}</b><input class="input grow" id="qeO${i}" value="${esc(o)}"></div>`).join("")}</div>
      <div class="fields two">
        <label class="field"><span>رابط صورة (اختياري)</span><input class="input" id="qeI" dir="ltr" value="${esc(q.img || "")}"></label>
        <label class="field"><span>وسم (اختياري، مثل: كويز ٣)</span><input class="input" id="qeT" value="${esc(q.tag || "")}"></label>
      </div>
      <button class="btn primary block lg" id="qeSave">حفظ السؤال</button>`, true);
    const getOut = wireOutcomePicker(b, "qe");
    b.querySelector("#qeSave").onclick = async () => {
      const raw = [0, 1, 2, 3].map((i) => b.querySelector("#qeO" + i).value.trim());
      let last = 3; while (last >= 0 && !raw[last]) last--;
      const opt = raw.slice(0, last + 1);
      const cor = +(b.querySelector('input[name="qeC"]:checked') || { value: 0 }).value;
      if (!b.querySelector("#qeS").value.trim()) return toast("اكتب نص السؤال", true);
      if (opt.length < 2 || opt.some((x) => !x)) return toast("اكتب خيارين على الأقل دون فراغ بينهما", true);
      if (cor >= opt.length) return toast("الإجابة الصحيحة يجب أن تكون أحد الخيارات المكتوبة", true);
      const p = { id: id || null, outcome_id: getOut(), bloom: b.querySelector("#qeB").value, difficulty: b.querySelector("#qeD").value,
                  stem: b.querySelector("#qeS").value, options: opt, correct: cor, img: b.querySelector("#qeI").value, tag: b.querySelector("#qeT").value };
      const btn = b.querySelector("#qeSave"); btn.disabled = true;
      try {
        const r = await rpc("t_save_question", { p });
        closeSheet(); toast("حُفظ السؤال");
        if (r.regrade_needed) toast("غيّرت مفتاح سؤال مُجاب عنه — أعد تصحيح الاختبار من صفحة النتائج", false);
        await reload(); renderBank();
      } catch (e) { toast(e.message, true); btn.disabled = false; }
    };
  }

  // ---------- الاستيراد بالنسخ واللصق ----------
  const TPL_HEAD = ["الوحدة", "الدرس", "النتاج", "نص السؤال", "أ", "ب", "ج", "د", "الإجابة", "بلوم", "الصعوبة"];
  function downloadTemplate() {
    download("قالب استيراد الأسئلة.csv", csv([TPL_HEAD,
      [1, 2, 3, "اشترت المؤسسة أثاثًا بمبلغ 5000 دينار نقدًا. الحساب الدائن:", "الأثاث", "الصندوق", "البنك", "الدائنون", "ب", "تطبيق", "سهل"],
      [1, 2, 2, "حساب طبيعته دائنة:", "الصندوق", "رأس المال", "", "", "ب", "تذكّر", "سهل"]]));
  }
  function parseTSV(text) {
    const rows = []; let row = [], cell = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
      else if (c === '"' && cell === "") q = true;
      else if (c === "\t" || (c === "," && !text.includes("\t"))) { row.push(cell); cell = ""; }
      else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
      else cell += c;
    }
    if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
    return rows.filter((r) => r.some((x) => x.trim() !== ""));
  }
  const ANS = { "أ": 0, "ا": 0, "a": 0, "1": 0, "ب": 1, "b": 1, "2": 1, "ج": 2, "c": 2, "3": 2, "د": 3, "d": 3, "4": 3 };
  const normBloom = (s) => { s = (s || "").trim().replace(/ّ/g, ""); const m = { "تذكر": "تذكّر", "فهم": "فهم", "تطبيق": "تطبيق", "تحليل": "تحليل", "تقويم": "تقويم", "ابداع": "إبداع", "إبداع": "إبداع" }; return s ? m[s] : "فهم"; };
  function parseImport(text) {
    const rows = parseTSV(text);
    if (rows.length && /الوحدة|نص السؤال/.test(rows[0].join(" "))) rows.shift();
    return rows.map((r, i) => {
      const n = (x) => parseInt(digits(x).replace(/\D/g, ""), 10);
      const out = { row: i + 1, err: null };
      const u = S.d.units.find((x) => x.seq === n(r[0])), l = u && u.lessons.find((x) => x.seq === n(r[1])), o = l && l.outcomes.find((x) => x.seq === n(r[2]));
      const opts = [r[4], r[5], r[6], r[7]].map((x) => (x || "").trim());
      let last = 3; while (last >= 0 && !opts[last]) last--;
      const options = opts.slice(0, last + 1);
      const cor = ANS[digits((r[8] || "").trim()).toLowerCase().replace(/[()]/g, "")];
      const bloom = normBloom(r[9]); const diff = (r[10] || "").trim() || "متوسط";
      Object.assign(out, { outcome_id: o && o.id, label: o ? S.out[o.id].label : "—", stem: (r[3] || "").trim(), options, correct: cor, bloom, difficulty: diff });
      if (!o) out.err = "النتاج غير موجود (تحقّق من أرقام الوحدة والدرس والنتاج)";
      else if (!out.stem) out.err = "نص السؤال فارغ";
      else if (options.length < 2 || options.some((x) => !x)) out.err = "خياران على الأقل دون فراغ بينهما";
      else if (cor === undefined || cor >= options.length) out.err = "الإجابة يجب أن تكون أ أو ب أو ج أو د ومن الخيارات المكتوبة";
      else if (!bloom) out.err = "مستوى بلوم غير معروف";
      else if (!DIFF.includes(diff)) out.err = "الصعوبة: سهل أو متوسط أو صعب";
      return out;
    });
  }
  function importSheet() {
    const b = openSheet(`<h3>لصق أسئلة من إكسل</h3>
      <p class="tiny">انسخ الصفوف من إكسل أو جوجل شيت والصقها هنا. ترتيب الأعمدة:<br><b>${TPL_HEAD.join(" | ")}</b><br>
      الوحدة والدرس والنتاج أرقام (مثل 1 | 2 | 3). الإجابة: أ أو ب أو ج أو د. بلوم والصعوبة اختياريان.</p>
      <textarea class="input mono" id="imT" rows="8" placeholder="الصق هنا…" dir="auto"></textarea>
      <div class="row" style="margin-top:10px"><button class="btn primary" id="imP">معاينة</button><button class="btn ghost sm" id="imTpl">⬇ القالب</button></div>
      <div id="imR" style="margin-top:14px"></div>`, true);
    b.querySelector("#imTpl").onclick = downloadTemplate;
    b.querySelector("#imP").onclick = () => {
      const rows = parseImport(b.querySelector("#imT").value), good = rows.filter((x) => !x.err);
      b.querySelector("#imR").innerHTML = `<div class="row sp" style="margin-bottom:8px"><b>${good.length} صالح · ${rows.length - good.length} فيه خطأ</b>
          <button class="btn primary" id="imGo" ${good.length ? "" : "disabled"}>استيراد ${good.length} سؤالًا</button></div>
        <div class="tablewrap" style="max-height:340px"><table class="t"><tr><th>#</th><th>الحالة</th><th>النتاج</th><th>السؤال</th><th>الإجابة</th></tr>` +
        rows.map((x) => `<tr><td class="num">${x.row}</td><td>${x.err ? `<span class="pill bad">${esc(x.err)}</span>` : '<span class="pill open">✓</span>'}</td>
          <td class="mono">${esc(x.label)}</td><td>${esc(x.stem.slice(0, 80))}</td><td>${x.correct !== undefined && x.options[x.correct] ? L[x.correct] + ") " + esc(x.options[x.correct]) : "—"}</td></tr>`).join("") + "</table></div>";
      const go = b.querySelector("#imGo");
      if (go) go.onclick = async () => {
        go.disabled = true; go.textContent = "جارٍ الاستيراد…";
        try {
          const r = await rpc("t_import_questions", { p_rows: good.map((x) => ({ outcome_id: x.outcome_id, stem: x.stem, options: x.options, correct: x.correct, bloom: x.bloom, difficulty: x.difficulty })) });
          closeSheet(); toast("استُورد " + r.inserted + " سؤالًا"); await reload(); renderBank();
        } catch (e) { toast(e.message, true); go.disabled = false; go.textContent = "استيراد"; }
      };
    };
  }
  function exportBank() {
    const rows = [TPL_HEAD.concat(["رقم السؤال", "الحالة"])];
    S.qs.forEach((x) => { const o = S.out[x.outcome_id]; if (!o) return;
      rows.push([o.unit.seq, o.lesson.seq, o.seq, x.stem].concat(x.options.concat(["", "", "", ""]).slice(0, 4), [L[x.correct], x.bloom, x.difficulty, x.num, x.active ? "فعّال" : "مؤرشف"])); });
    download("بنك الأسئلة.csv", csv(rows));
  }

  // ================= الاختبارات =================
  function examCard(x) {
    const secs = x.section_ids.map(secName).join("، ");
    return `<div class="card pad stack">
      <div class="row sp"><b style="font-size:15.5px">${esc(x.title)}</b><span class="pill ${x.state}">${STATE[x.state]}</span></div>
      <div class="tiny">${esc(KIND[x.kind])} · ${x.n_q} سؤالًا${x.selection === "random" ? " (سحب عشوائي)" : ""} · ${x.duration_min} دقيقة · ${x.mode === "lab" ? "🔒 مختبر" : "🌐 عن بعد"}${secs ? " · " + esc(secs) : ""}</div>
      <div class="tiny">من ${esc(fmtDT(x.starts_at))}<br>إلى ${esc(fmtDT(x.ends_at))}</div>
      ${x.mode === "lab" && x.lab_code && x.state !== "ended" ? `<div class="row sp"><span class="tiny">رمز الجلسة</span><span class="big-code">${esc(x.lab_code)}</span></div>` : ""}
      ${x.state !== "draft" ? `<div class="row sp tiny"><span>سلّم ${x.n_done} من ${x.n_students}${x.n_running ? " · يحلّ الآن " + x.n_running : ""}</span>
        <span>${x.booked_at ? "✓ اعتُمد في الدفتر" : ""}</span></div><div class="bar"><i style="width:${x.n_students ? Math.round((x.n_done / x.n_students) * 100) : 0}%"></i></div>` : ""}
      <div class="row wrap">${examButtons(x)}</div></div>`;
  }
  function examButtons(x) {
    const b = (act, label, cls) => `<button class="btn sm ${cls || ""}" data-ex="${x.id}" data-act="${act}">${label}</button>`;
    let h = b("edit", "تعديل");
    if (x.state === "draft") h += b("publish", "نشر", "primary") + b("open_now", "افتح الآن");
    if (x.state === "scheduled") h += b("open_now", "افتح الآن", "primary") + b("draft", "إرجاع مسودة");
    if (x.state === "open") h += b("close_now", "أغلق الآن", "danger");
    if (x.state === "ended") h += b("reopen", "إعادة فتح");
    if (x.mode === "lab" && x.state !== "ended") h += b("new_code", "رمز جديد");
    if (x.state !== "draft") h += b("report", "النتائج", x.state === "ended" ? "primary" : "");
    h += b("duplicate", "نسخ", "ghost");
    if (!x.n_started) h += b("delete", "حذف", "ghost");
    return h;
  }
  function bindExamCards(root) {
    root.querySelectorAll("[data-act]").forEach((btn) => (btn.onclick = () => examAction(btn.dataset.ex, btn.dataset.act)));
  }
  async function examAction(id, act) {
    if (act === "edit") return editExam(id);
    if (act === "report") { location.hash = "#results/" + id; return; }
    if (act === "delete" && !(await confirmSheet("حذف الاختبار؟", "لا يمكن التراجع.", "احذف", true))) return;
    if (act === "close_now" && !(await confirmSheet("إغلاق الاختبار الآن؟", "من يحلّ الآن تُسلَّم إجاباته المحفوظة تلقائيًّا.", "أغلق", true))) return;
    try {
      const r = await rpc("t_exam_action", { p_id: id, p_action: act });
      toast({ publish: "نُشر الاختبار", open_now: "فُتح الاختبار", close_now: "أُغلق الاختبار", reopen: "أُعيد فتح الاختبار", new_code: "رمز جديد: " + (r.lab_code || ""),
              duplicate: "أُنشئت نسخة (مسودة)", delete: "حُذف", draft: "صار مسودة" }[act] || "تم");
      await reload(false); route();
    } catch (e) { toast(e.message, true); }
  }
  function renderExams() {
    const ex = S.d.exams, groups = [["open", "مفتوحة الآن"], ["scheduled", "مجدولة"], ["draft", "مسودات"], ["ended", "منتهية"]];
    let h = '<div class="row sp"><button class="btn primary" id="exNew">＋ اختبار جديد</button>' +
      `<button class="btn ghost sm" id="exLink">🔗 نسخ رابط الطلبة</button></div>`;
    groups.forEach(([k, t]) => { const l = ex.filter((x) => x.state === k); if (l.length) h += `<div class="sect-title">${t}</div><div class="grid two">` + l.map(examCard).join("") + "</div>"; });
    if (!ex.length) h += '<div class="card empty" style="margin-top:14px"><span class="e">📝</span>لا اختبارات بعد.</div>';
    $("v-exams").innerHTML = h;
    $("exNew").onclick = () => editExam(null);
    $("exLink").onclick = () => { const u = new URL("index.html", location.href).href; navigator.clipboard.writeText(u).then(() => toast("نُسخ: " + u), () => toast(u)); };
    bindExamCards($("v-exams"));
  }

  function editExam(id) {
    const x = id ? S.d.exams.find((e) => e.id === id) : null;
    const start = new Date(Math.ceil(Date.now() / 300000) * 300000 + 3600000);
    const e = x || { title: "", kind: "quiz", mode: "remote", starts_at: start.toISOString(), ends_at: new Date(start.getTime() + 3600000).toISOString(),
                     duration_min: 20, shuffle_questions: true, shuffle_options: true, allow_back: true, require_fullscreen: false,
                     show_result: "after_close", max_attempts: 1, section_ids: S.d.sections.map((s) => s.id), question_ids: [], n_started: 0,
                     selection: "random", draw_rules: [] };
    const sel = e.question_ids.slice(); const locked = e.n_started > 0;
    const pf = { lesson: "", outcome: "", bloom: "" };
    let selMode = x ? x.selection || "fixed" : "random";
    const blankRule = () => ({ lesson_ids: [], easy: 0, medium: 0, hard: 0 });
    const toLessons = (r) => (r.lesson_ids && r.lesson_ids.length) ? r.lesson_ids.slice()
      : r.lesson_id ? [r.lesson_id] : r.outcome_id && S.out[r.outcome_id] ? [S.out[r.outcome_id].lesson.id]
      : r.unit_id && S.units[r.unit_id] ? S.units[r.unit_id].lessons.map((l) => l.id) : [];
    const rules = (x && x.draw_rules && x.draw_rules.length ? x.draw_rules : [blankRule()])
      .map((r) => ({ lesson_ids: toLessons(r), easy: +r.easy || 0, medium: +r.medium || 0, hard: +r.hard || 0 }));
    const b = openSheet(`<h3>${x ? "تعديل: " + esc(x.title) : "اختبار جديد"}</h3>
      <div class="fields two">
        <label class="field"><span>العنوان</span><input class="input" id="eT" value="${esc(e.title)}" placeholder="مثال: كويز ٣ — تحليل العمليات"></label>
        <label class="field"><span>النوع</span><select class="input" id="eK">${optionsHtml(e.kind, Object.entries(KIND))}</select></label>
      </div>
      <div class="field"><span>مكان التقديم</span><div class="seg" id="eM">
        <button type="button" data-m="remote" aria-pressed="${e.mode === "remote"}">🌐 عن بعد</button>
        <button type="button" data-m="lab" aria-pressed="${e.mode === "lab"}">🔒 مختبر الحاسوب (برمز جلسة)</button></div>
        <div class="tiny" style="margin-top:6px">في المختبر: يظهر لك رمز من ٤ أرقام تكتبه على اللوح، ولا يبدأ أحد بدونه.</div></div>
      <div class="fields three">
        <label class="field"><span>يفتح في</span><input class="input" type="datetime-local" id="eS" value="${toLocalInput(e.starts_at)}"></label>
        <label class="field"><span>يُغلق في</span><input class="input" type="datetime-local" id="eE" value="${toLocalInput(e.ends_at)}"></label>
        <label class="field"><span>مدة الطالب (دقيقة)</span><input class="input mono" type="number" min="1" max="300" id="eD" value="${e.duration_min}"></label>
      </div>
      <div class="field"><span>الشعب</span><div class="row wrap">${S.d.sections.map((s) =>
        `<label class="check"><input type="checkbox" class="eSec" value="${s.id}" ${e.section_ids.includes(s.id) ? "checked" : ""}> ${esc(s.name)} <span class="tiny">(${s.n_cred}/${s.n} جاهز)</span></label>`).join("")}</div></div>
      <div class="fields two">
        <label class="field"><span>عرض النتيجة للطالب</span><select class="input" id="eR">${optionsHtml(e.show_result, [["immediate", "فور التسليم"], ["after_close", "بعد إغلاق الاختبار"], ["never", "لا تُعرض"]])}</select></label>
        <label class="field"><span>عدد المحاولات (تُحتسب الأعلى)</span><select class="input" id="eA">${optionsHtml(String(e.max_attempts), [1, 2, 3].map((n) => [String(n), String(n)]))}</select></label>
      </div>
      <div class="row wrap">
        <label class="check"><input type="checkbox" id="eQS" ${e.shuffle_questions ? "checked" : ""}> خلط ترتيب الأسئلة</label>
        <label class="check"><input type="checkbox" id="eOS" ${e.shuffle_options ? "checked" : ""}> خلط الخيارات</label>
        <label class="check"><input type="checkbox" id="eB" ${e.allow_back ? "checked" : ""}> السماح بالرجوع</label>
        <label class="check"><input type="checkbox" id="eF" ${e.require_fullscreen ? "checked" : ""}> ملء الشاشة إجباري</label>
      </div>
      <div class="sect-title">الأسئلة ${locked ? '<span class="pill draft">مقفلة: بدأ طلاب الحل</span>' : ""}</div>
      <div class="seg" id="eSel" style="margin-bottom:12px">
        <button type="button" data-s="random" aria-pressed="${selMode === "random"}">🎲 سحب عشوائي لكل طالب</button>
        <button type="button" data-s="fixed" aria-pressed="${selMode === "fixed"}">📌 أسئلة محددة للجميع</button></div>
      <div id="randPanel">
        <p class="tiny" style="margin-top:0">حدّد من أين تُسحب الأسئلة وكم سؤالًا من كل مستوى صعوبة. يأخذ كل طالب مجموعة مختلفة من البنك بالتوزيع نفسه، فلا يتطابق اختبار طالبين متجاورين.</p>
        <div id="rRules" class="stack"></div>
        ${locked ? "" : `<div class="row wrap" style="margin-top:10px"><button class="btn sm" id="rAdd">＋ قاعدة</button>
          <span class="tiny">أو</span><select class="input" id="rUnitAll" style="width:auto">${optionsHtml("", S.d.units.map((u) => [u.id, "الوحدة " + u.seq + " · " + u.title]))}</select>
          <button class="btn sm" id="rPerLesson">＋ قاعدة لكل درس فيها</button></div>`}
        <div id="rSum" class="card pad" style="margin-top:10px"></div>
      </div>
      <div id="fixPanel">
      <div id="eSum" class="card pad" style="margin-bottom:10px"></div>
      ${locked ? "" : `<div class="fields three">
        <label class="field"><span>الدرس</span><select class="input" id="pL">${optionsHtml("", lessonsOf("").map((l) => [l.id, "و" + S.lessons[l.id].unit.seq + " · الدرس " + l.seq + " · " + l.title]), "كل الدروس")}</select></label>
        <label class="field"><span>النتاج</span><select class="input" id="pO"><option value="">كل النتاجات</option></select></label>
        <label class="field"><span>بلوم</span><select class="input" id="pB">${optionsHtml("", BLOOM.map((x) => [x, x]), "الكل")}</select></label></div>
        <div class="row wrap" style="margin-bottom:8px"><button class="btn sm" id="pAll">تحديد كل الظاهر</button><button class="btn sm" id="pNone">إلغاء الظاهر</button>
          <input class="input mono" id="pN" type="number" min="1" value="5" style="width:80px"><button class="btn sm" id="pRand">🎲 عشوائي من الظاهر</button></div>
        <div id="pList" class="tablewrap" style="max-height:320px"></div>`}
      </div>
      <div class="row" style="margin-top:16px;position:sticky;bottom:-18px;background:var(--surface);padding:10px 0">
        <button class="btn primary grow" id="eSaveP">حفظ ونشر</button><button class="btn grow" id="eSaveD">حفظ كمسودة</button></div>`, true);

    let mode = e.mode;
    // ---------- السحب العشوائي ----------
    const DK = [["easy", "سهل"], ["medium", "متوسط"], ["hard", "صعب"]];
    const poolN = (r, d) => { const set = new Set(r.lesson_ids); return S.qs.filter((q) => q.active && q.difficulty === d && S.out[q.outcome_id] &&
      (!set.size || set.has(S.out[q.outcome_id].lesson.id))).length; };
    const scopeName = (r) => {
      if (!r.lesson_ids.length) return "كل الكتاب";
      return S.d.units.map((u) => { const ls = u.lessons.filter((l) => r.lesson_ids.includes(l.id)); if (!ls.length) return "";
        return ls.length === u.lessons.length ? "الوحدة " + u.seq + " كاملة" : "الوحدة " + u.seq + ": الدروس " + ls.map((l) => l.seq).join("، "); })
        .filter(Boolean).join(" + ");
    };
    const rulesSum = () => {
      const t = { easy: 0, medium: 0, hard: 0 }; const warn = [];
      rules.forEach((r, i) => DK.forEach(([k, d]) => { const n = +r[k] || 0; t[k] += n; const have = poolN(r, d);
        if (n > have) warn.push(`القاعدة ${i + 1} (${esc(scopeName(r))}): مطلوب ${n} ${d} والمتاح ${have}`); }));
      const tot = t.easy + t.medium + t.hard;
      b.querySelector("#rSum").innerHTML = `<b>كل طالب يأخذ ${tot} سؤالًا</b> <span class="tiny">— سهل ${t.easy} · متوسط ${t.medium} · صعب ${t.hard}</span>` +
        (warn.length ? `<div class="alert warn" style="margin-top:8px"><span class="ic">⚠️</span><span>${warn.join("<br>")}</span></div>` : "");
      b.querySelectorAll(".rule").forEach((row, i) => {
        row.querySelector(".r-scope").textContent = scopeName(rules[i]);
        DK.forEach(([k, d]) => {
          const have = poolN(rules[i], d), inp = row.querySelector(".r-" + k);
          row.querySelector(".h-" + k).textContent = "من " + have;
          inp.style.borderColor = (+rules[i][k] || 0) > have ? "var(--danger)" : "";
        });
      });
      return tot;
    };
    const drawRules = () => {
      const box = b.querySelector("#rRules"), dis = locked ? "disabled" : "";
      box.innerHTML = rules.map((r, i) => `<div class="card pad rule" data-i="${i}">
          <div class="row sp" style="margin-bottom:6px"><b style="font-size:13.5px">القاعدة ${i + 1}: <span class="r-scope" style="color:var(--brand)"></span></b>
            ${locked || rules.length < 2 ? "" : `<button type="button" class="btn sm ghost r-del">✕ حذف</button>`}</div>
          <div class="tiny" style="margin-bottom:6px">علّم الدروس التي تُسحب منها الأسئلة (من وحدة أو أكثر). بلا تعليم = الكتاب كله.</div>
          <div class="tree">${S.d.units.map((u) => {
            const n = u.lessons.filter((l) => r.lesson_ids.includes(l.id)).length;
            return `<div class="tu"><label class="check tu-h"><input type="checkbox" class="t-unit" data-u="${u.id}" ${n && n === u.lessons.length ? "checked" : ""} ${dis}>
                <b>الوحدة ${u.seq}</b> <span class="tiny">${esc(u.title)}</span></label>
              <div class="chips">${u.lessons.map((l) => `<label class="chip lchip" title="${esc(l.title)}"><input type="checkbox" class="t-les" data-l="${l.id}" ${r.lesson_ids.includes(l.id) ? "checked" : ""} ${dis}>
                الدرس ${l.seq} <span class="tiny">${esc(l.title.length > 26 ? l.title.slice(0, 25) + "…" : l.title)}</span></label>`).join("")}</div></div>`;
          }).join("")}</div>
          <div class="row wrap" style="gap:14px;margin-top:10px">${DK.map(([k, d]) => `<label class="row" style="gap:6px"><span style="font-weight:600;font-size:13.5px">${d}</span>
            <input type="number" min="0" class="input mono r-${k}" value="${+r[k] || 0}" style="width:74px" ${dis}><span class="tiny h-${k}"></span></label>`).join("")}</div></div>`).join("");
      box.querySelectorAll(".rule").forEach((row) => {
        const i = +row.dataset.i, r = rules[i];
        row.querySelectorAll(".t-unit").forEach((cb) => {
          const u = S.units[cb.dataset.u], n = u.lessons.filter((l) => r.lesson_ids.includes(l.id)).length;
          cb.indeterminate = n > 0 && n < u.lessons.length;
          cb.onchange = () => { const ids = u.lessons.map((l) => l.id);
            r.lesson_ids = r.lesson_ids.filter((x) => !ids.includes(x)); if (cb.checked) r.lesson_ids.push(...ids); drawRules(); };
        });
        row.querySelectorAll(".t-les").forEach((cb) => (cb.onchange = () => {
          r.lesson_ids = r.lesson_ids.filter((x) => x !== cb.dataset.l); if (cb.checked) r.lesson_ids.push(cb.dataset.l); drawRules(); }));
        DK.forEach(([k]) => (row.querySelector(".r-" + k).oninput = (ev) => { r[k] = Math.max(0, parseInt(ev.target.value, 10) || 0); rulesSum(); }));
        const del = row.querySelector(".r-del"); if (del) del.onclick = () => { rules.splice(i, 1); drawRules(); };
      });
      rulesSum();
    };
    const setSel = (m) => {
      selMode = m;
      b.querySelectorAll("#eSel button").forEach((z) => z.setAttribute("aria-pressed", z.dataset.s === m));
      b.querySelector("#randPanel").classList.toggle("hide", m !== "random");
      b.querySelector("#fixPanel").classList.toggle("hide", m !== "fixed");
    };
    b.querySelectorAll("#eSel button").forEach((z) => (z.onclick = () => { if (!locked) setSel(z.dataset.s); }));
    drawRules(); setSel(selMode);
    if (!locked) {
      b.querySelector("#rAdd").onclick = () => { rules.push(blankRule()); drawRules(); };
      b.querySelector("#rPerLesson").onclick = () => {
        const u = S.units[b.querySelector("#rUnitAll").value];
        if (rules.length === 1 && !rules[0].lesson_ids.length && !(rules[0].easy + rules[0].medium + rules[0].hard)) rules.pop();
        u.lessons.forEach((l) => rules.push(Object.assign(blankRule(), { lesson_ids: [l.id] })));
        drawRules(); toast("أُضيفت " + u.lessons.length + " قواعد — حدّد أعدادها");
      };
    }
    b.querySelectorAll("#eM button").forEach((btn) => (btn.onclick = () => { mode = btn.dataset.m; b.querySelectorAll("#eM button").forEach((z) => z.setAttribute("aria-pressed", z === btn)); }));
    const summary = () => {
      const byO = {}, byB = {};
      sel.forEach((qid) => { const q = S.qs.find((z) => z.id === qid); if (!q) return; byO[q.outcome_id] = (byO[q.outcome_id] || 0) + 1; byB[q.bloom] = (byB[q.bloom] || 0) + 1; });
      b.querySelector("#eSum").innerHTML = `<b>${sel.length} سؤالًا مختارًا</b>` + (sel.length ? `<div class="chips" style="margin-top:8px">` +
        Object.entries(byO).map(([o, n]) => `<span class="chip" title="${esc((S.out[o] || {}).text || "")}">${esc(outLabel(o))}<span class="n">${n}</span></span>`).join("") + "</div>" +
        `<div class="tiny" style="margin-top:6px">بلوم: ${BLOOM.filter((z) => byB[z]).map((z) => z + " " + byB[z]).join(" · ")}</div>` : "");
    };
    const visible = () => S.qs.filter((q) => q.active && S.out[q.outcome_id] &&
      (!pf.lesson || S.out[q.outcome_id].lesson.id === pf.lesson) && (!pf.outcome || q.outcome_id === pf.outcome) && (!pf.bloom || q.bloom === pf.bloom));
    const list = () => {
      const v = visible();
      b.querySelector("#pList").innerHTML = v.length ? '<table class="t">' + v.map((q) => `<tr><td style="width:34px"><input type="checkbox" data-q="${q.id}" ${sel.includes(q.id) ? "checked" : ""} style="width:18px;height:18px;accent-color:var(--brand)"></td>
        <td class="mono tiny">#${q.num}</td><td class="mono tiny">${esc(outLabel(q.outcome_id))}</td><td class="tiny">${esc(q.bloom)}</td><td>${esc(q.stem.slice(0, 110))}</td></tr>`).join("") + "</table>"
        : '<div class="empty">لا أسئلة بهذا التصفية.</div>';
      b.querySelectorAll("[data-q]").forEach((c) => (c.onchange = () => { const i = sel.indexOf(c.dataset.q); if (c.checked && i < 0) sel.push(c.dataset.q); if (!c.checked && i >= 0) sel.splice(i, 1); summary(); }));
    };
    summary();
    if (!locked) {
      b.querySelector("#pL").onchange = (ev) => { pf.lesson = ev.target.value; pf.outcome = "";
        b.querySelector("#pO").innerHTML = optionsHtml("", pf.lesson ? S.lessons[pf.lesson].outcomes.map((o) => [o.id, "ن" + o.seq + " — " + o.text]) : [], "كل النتاجات"); list(); };
      b.querySelector("#pO").onchange = (ev) => { pf.outcome = ev.target.value; list(); };
      b.querySelector("#pB").onchange = (ev) => { pf.bloom = ev.target.value; list(); };
      b.querySelector("#pAll").onclick = () => { visible().forEach((q) => { if (!sel.includes(q.id)) sel.push(q.id); }); list(); summary(); };
      b.querySelector("#pNone").onclick = () => { const v = new Set(visible().map((q) => q.id)); for (let i = sel.length - 1; i >= 0; i--) if (v.has(sel[i])) sel.splice(i, 1); list(); summary(); };
      b.querySelector("#pRand").onclick = () => {
        const n = +b.querySelector("#pN").value || 0, pool = visible().filter((q) => !sel.includes(q.id));
        for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
        pool.slice(0, n).forEach((q) => sel.push(q.id)); list(); summary();
        if (pool.length < n) toast("المتاح " + pool.length + " فقط", true);
      };
      list();
    }
    const save = async (publish) => {
      const p = { id: id || null, title: b.querySelector("#eT").value.trim(), kind: b.querySelector("#eK").value, mode,
        starts_at: fromLocalInput(b.querySelector("#eS").value), ends_at: fromLocalInput(b.querySelector("#eE").value),
        duration_min: +b.querySelector("#eD").value, show_result: b.querySelector("#eR").value, max_attempts: +b.querySelector("#eA").value,
        shuffle_questions: b.querySelector("#eQS").checked, shuffle_options: b.querySelector("#eOS").checked,
        allow_back: b.querySelector("#eB").checked, require_fullscreen: b.querySelector("#eF").checked,
        section_ids: [...b.querySelectorAll(".eSec:checked")].map((c) => c.value), question_ids: selMode === "fixed" ? sel : [],
        selection: selMode, draw_rules: selMode === "random" ? rules : [], publish };
      if (!p.title) return toast("اكتب عنوان الاختبار", true);
      if (!p.starts_at || !p.ends_at || p.ends_at <= p.starts_at) return toast("وقت الإغلاق يجب أن يكون بعد وقت الفتح", true);
      if (publish && selMode === "fixed" && !sel.length) return toast("اختر أسئلة قبل النشر", true);
      if (publish && selMode === "random" && !rulesSum()) return toast("حدّد عدد الأسئلة في قاعدة واحدة على الأقل", true);
      if (publish && !p.section_ids.length) return toast("اختر شعبة واحدة على الأقل", true);
      try {
        const r = await rpc("t_save_exam", { p });
        closeSheet(); toast(publish ? "نُشر الاختبار" + (r.lab_code ? " — رمز الجلسة " + r.lab_code : "") : "حُفظ كمسودة");
        await reload(false); location.hash = "#exams"; route();
      } catch (err) { toast(err.message, true); }
    };
    b.querySelector("#eSaveP").onclick = () => save(true);
    b.querySelector("#eSaveD").onclick = () => save(false);
  }

  // ================= النتائج والتحليل =================
  async function renderResults(id) {
    const ex = S.d.exams.filter((x) => x.state !== "draft");
    if (!ex.length) { $("v-results").innerHTML = '<div class="card empty"><span class="e">📊</span>لا نتائج بعد؛ انشر اختبارًا أولًا.</div>'; return; }
    id = id || (ex.find((x) => x.n_done) || ex[0]).id;
    $("v-results").innerHTML = `<div class="card pad"><div class="row wrap">
        <select class="input grow" id="rEx" style="min-width:220px">${optionsHtml(id, ex.map((x) => [x.id, x.title + " — " + STATE[x.state]]))}</select>
        <button class="btn" id="rRef">↻ تحديث</button></div>
        <div class="row wrap" style="margin-top:10px"><button class="btn primary" id="rBook">📗 اعتماد في الدفتر</button>
        <button class="btn ghost sm" id="rCsv">⬇ CSV</button><button class="btn ghost sm" id="rRegrade">إعادة التصحيح</button>
        <button class="btn ghost sm" id="rPrint">🖨 طباعة</button></div></div>
      <div id="rBody"><div class="empty">جارٍ التحميل…</div></div>`;
    $("rEx").onchange = (e) => (location.hash = "#results/" + e.target.value);
    $("rRef").onclick = () => loadReport(id);
    $("rBook").onclick = () => bookFlow(id);
    $("rCsv").onclick = exportReport;
    $("rPrint").onclick = () => window.print();
    $("rRegrade").onclick = async () => { if (!(await confirmSheet("إعادة التصحيح؟", "يُعاد حساب علامات كل الطلبة وفق المفاتيح الحالية للأسئلة.", "أعد التصحيح"))) return;
      await guard(rpc("t_regrade", { p_exam: id }), "أُعيد التصحيح"); loadReport(id); };
    await loadReport(id);
    const x = S.d.exams.find((z) => z.id === id);
    if (x && x.state === "open") S.liveT = setInterval(() => { if (location.hash.startsWith("#results")) loadReport(id, true); }, 20000);
  }
  async function loadReport(id, quiet) {
    try { S.rep = await rpc("t_exam_report", { p_id: id }); } catch (e) { if (!quiet) toast(e.message, true); return; }
    drawReport();
  }
  function drawReport() {
    const r = S.rep, st = r.students, done = st.filter((s) => s.score != null);
    const avg = done.length ? done.reduce((a, s) => a + s.score / s.total, 0) / done.length : 0;
    const passN = done.filter((s) => s.score / s.total >= 0.5).length;
    const tiles = [[st.length, "الطلبة"], [done.length, "سلّموا"], [st.filter((s) => s.status === "in_progress").length, "يحلّون الآن"],
                   [st.filter((s) => s.status === "absent").length, "لم يدخلوا"], [Math.round(avg * 100) + "٪", "المتوسط"], [done.length ? Math.round((passN / done.length) * 100) + "٪" : "—", "نسبة ≥ ٥٠٪"]];
    let h = `<div class="stats" style="margin-top:12px">` + tiles.map((t) => `<div class="stat"><b class="mono">${t[0]}</b><span>${t[1]}</span></div>`).join("") + "</div>";
    h += `<div class="row sp wrap" style="margin:14px 0 10px"><div class="seg" id="rTabs">` +
      [["students", "الطلبة"], ["items", "الفقرات"], ["outcomes", "النتاجات"], ["matrix", "طالب × نتاج"]].map(([k, t]) => `<button data-t="${k}" aria-pressed="${S.repTab === k}">${t}</button>`).join("") +
      `</div><span class="tiny">${r.exam.booked_at ? "✓ اعتُمد في الدفتر " + esc(fmtDT(r.exam.booked_at, false)) : "لم يُعتمد في الدفتر بعد"}</span></div><div id="rTab"></div>`;
    $("rBody").innerHTML = h;
    $("rBody").querySelectorAll("#rTabs button").forEach((b) => (b.onclick = () => { S.repTab = b.dataset.t; drawReport(); }));
    ({ students: tabStudents, items: tabItems, outcomes: tabOutcomes, matrix: tabMatrix })[S.repTab]();
  }
  const STAT = { submitted: ["سلّم", "open"], expired: ["انتهى وقته", "draft"], in_progress: ["يحلّ الآن", "scheduled"], absent: ["لم يدخل", "bad"] };
  function tabStudents() {
    const st = S.rep.students;
    $("rTab").innerHTML = `<div class="tablewrap"><table class="t"><tr><th>#</th><th>الطالب</th><th>الشعبة</th><th class="num">العلامة</th><th class="num">٪</th><th>الحالة</th><th class="num">المدة</th><th class="num">خروج من الشاشة</th><th></th></tr>` +
      st.map((s) => { const p = s.total ? Math.round((s.score / s.total) * 100) : null; const dur = s.submitted_at && s.started_at ? Math.round((new Date(s.submitted_at) - new Date(s.started_at)) / 60000) : null;
        const [lbl, cls] = STAT[s.status] || [s.status, ""];
        return `<tr><td class="num">${s.serial}</td><td>${esc(s.name)}</td><td class="tiny">${esc(s.section)}</td><td class="num">${s.score != null ? s.score + "/" + s.total : "—"}</td>
          <td class="num"><span class="pill ${p == null ? "" : p >= 50 ? "open" : "bad"}">${p == null ? "—" : p + "٪"}</span></td><td><span class="pill ${cls}">${lbl}</span></td>
          <td class="num">${dur != null ? dur + " د" : "—"}</td><td class="num">${s.fs_exits ? `<span class="pill draft">${s.fs_exits}</span>` : "—"}</td>
          <td>${s.n_attempts ? `<button class="btn sm ghost" data-reset="${s.id}">إعادة</button>` : ""}</td></tr>`; }).join("") + "</table></div>" +
      '<p class="tiny">«إعادة» تحذف محاولة الطالب ليبدأ من جديد (مثلًا بعد انقطاع الكهرباء).</p>';
    $("rTab").querySelectorAll("[data-reset]").forEach((b) => (b.onclick = async () => {
      const s = S.rep.students.find((z) => z.id === b.dataset.reset);
      if (!(await confirmSheet("إعادة محاولة " + s.name + "؟", "تُحذف محاولته وإجاباته، ويستطيع البدء من جديد ما دام الاختبار مفتوحًا.", "احذف المحاولة", true))) return;
      await guard(rpc("t_reset_student", { p_exam: S.rep.exam.id, p_student: s.id }), "حُذفت المحاولة").catch(() => {});
      loadReport(S.rep.exam.id);
    }));
  }
  function tabItems() {
    const its = S.rep.items;
    $("rTab").innerHTML = '<div class="grid two">' + its.map((it) => {
      const total = it.n || 0, flags = [];
      if (total >= 5 && it.p < 0.2) flags.push('<span class="pill bad">صعبة جدًا — راجع المفتاح</span>');
      if (total >= 5 && it.p > 0.9) flags.push('<span class="pill">سهلة جدًا</span>');
      if (it.d != null && it.d < 0) flags.push('<span class="pill bad">تمييز سالب</span>');
      if (it.d != null && it.d >= 0.3) flags.push('<span class="pill open">مميِّزة</span>');
      const mx = Math.max(1, ...it.dist.map((x) => x.n), it.blank || 0);
      return `<div class="card qitem"><div class="row wrap" style="gap:6px;margin-bottom:6px"><span class="pill brand">س${it.seq}</span><span class="pill mono">#${it.num}</span>
        <span class="pill">${esc(it.outcome)}</span><span class="pill">${esc(it.bloom)}</span>${flags.join("")}</div>
        <div class="stem">${esc(it.stem)}</div>
        <div class="row sp tiny" style="margin:8px 0"><span>الصعوبة p = <b class="mono">${it.p == null ? "—" : Math.round(it.p * 100) + "٪"}</b></span>
          <span>التمييز D = <b class="mono">${it.d == null ? "—" : it.d.toFixed(2)}</b></span><span>بلا إجابة: ${it.blank || 0}</span></div>
        <div class="dist" style="margin-bottom:20px">${it.dist.map((x) => `<i class="${x.k === it.correct ? "ok" : ""}" style="height:${Math.max(4, (x.n / mx) * 100)}%" title="${L[x.k]}: ${x.n}"><span>${L[x.k]} ${x.n}</span></i>`).join("")}</div>
        <ol>${it.options.map((o, i) => `<li class="${i === it.correct ? "ok" : ""}">${L[i]}) ${esc(o)}</li>`).join("")}</ol></div>`;
    }).join("") + '</div><p class="tiny">p: نسبة من أجابوا صحيحًا. D: الفرق بين أعلى ٢٧٪ وأدنى ٢٧٪ من الطلبة (يُحسب من ٤ طلاب فأكثر). العمود الأخضر هو الإجابة الصحيحة.</p>';
  }
  function tabOutcomes() {
    const os = S.rep.outcomes;
    $("rTab").innerHTML = '<div class="card pad stack">' + os.map((o) => {
      const tot = o.levels.reduce((a, b) => a + b, 0) || 1, pc = Math.round((o.avg || 0) * 100);
      return `<div><div class="row sp" style="font-size:14px"><span><b class="mono">${esc(o.label)}</b> ${esc(o.text)}</span><span class="pill ${pc < 50 ? "bad" : "open"}">${pc}٪</span></div>
        <div class="tiny" style="margin:4px 0">${o.items} فقرة · المستويات: ${o.levels.map((n, i) => LEVEL[i + 1] + " " + n).join(" · ")}</div>
        <div class="levels">${["a", "b", "c", "d"].map((c, i) => `<i class="${c}" style="width:${(o.levels[i] / tot) * 100}%"></i>`).join("")}</div></div>`;
    }).join("") + '</div><p class="tiny">مستوى الطالب في النتاج من نسبة إجاباته الصحيحة عليه: أقل من ٣٧٫٥٪ مبتدئ، حتى ٦٢٫٥٪ نامٍ، حتى ٨٧٫٥٪ متمكّن، وما فوقها متميّز. هذا ما يُرحَّل إلى الدفتر عند الاعتماد.</p>';
  }
  const lvlOf = (c, n) => Math.max(1, Math.min(4, Math.round((c / n) * 4)));
  function tabMatrix() {
    const os = S.rep.outcomes, st = S.rep.students.filter((s) => s.outcomes);
    $("rTab").innerHTML = st.length ? `<div class="tablewrap"><table class="t mx"><tr><th>الطالب</th>${os.map((o) => `<th class="num" title="${esc(o.text)}">${esc(o.label)}</th>`).join("")}</tr>` +
      st.map((s) => `<tr><td>${esc(s.name)}</td>` + os.map((o) => { const v = s.outcomes[o.id]; if (!v) return '<td class="c">—</td>';
        const l = lvlOf(v[0], v[1]); return `<td class="c lv${l}" title="${LEVEL[l]}">${v[0]}/${v[1]}</td>`; }).join("") + "</tr>").join("") + "</table></div>"
      : '<div class="card empty">لا تسليمات بعد.</div>';
  }
  function exportReport() {
    const r = S.rep; if (!r) return;
    const rows = [["الرقم", "الطالب", "الشعبة", "العلامة", "من", "النسبة", "الحالة", "خروج من الشاشة"].concat(r.outcomes.map((o) => o.label))];
    r.students.forEach((s) => rows.push([s.serial, s.name, s.section, s.score, s.total, s.total ? Math.round((s.score / s.total) * 100) : "", (STAT[s.status] || [s.status])[0], s.fs_exits || 0]
      .concat(r.outcomes.map((o) => (s.outcomes && s.outcomes[o.id] ? s.outcomes[o.id][0] + "/" + s.outcomes[o.id][1] : "")))));
    download(r.exam.title + " — النتائج.csv", csv(rows));
  }
  async function bookFlow(id) {
    let pv;
    try { pv = await rpc("t_book", { p_exam: id, p_commit: false }); } catch (e) { return toast(e.message, true); }
    const rule = pv.rule === "highest" ? "الأعلى" : "الأحدث";
    let body = `<div class="stack"><div>سيُسجَّل <b>${pv.rows}</b> قياسًا لـ <b>${pv.students}</b> طالبًا في «رصد النتاجات» بالدفتر (الأداة: ${S.rep && S.rep.exam.kind === "quiz" ? "الاختبار التكويني" : "التقويم الختامي"}).</div>
      <div>قاعدة الاحتساب في دفترك: <b>${rule}</b>. ستتغيّر العلامة المعتمدة في <b>${pv.changed}</b> خانة${pv.manual_changed ? `، منها <b style="color:var(--warn)">${pv.manual_changed}</b> خانة فيها إدخال يدوي منك (يبقى إدخالك محفوظًا كدليل)` : ""}.</div>`;
    if (pv.slot) body += `<div>وستُكتب علامة ${pv.slot === "first_written" ? "الاختبار الأول" : "الاختبار النهائي"} من <b>${pv.cap}</b>.</div>` +
      (pv.mark_conflicts ? `<div class="alert warn"><span class="ic">⚠️</span><span>${pv.mark_conflicts} طالبًا لهم علامة مسجّلة سابقًا في هذه الخانة:<br>` +
        pv.conflicts.slice(0, 8).map((c) => esc(c.name) + ": " + c.old + " ← " + c.new).join("<br>") + `</span></div>
        <label class="check"><input type="checkbox" id="bkOver"> استبدل العلامات المسجّلة سابقًا</label>` : "");
    if (pv.booked_at) body += `<div class="tiny">سبق اعتماده ${esc(fmtDT(pv.booked_at, false))}؛ الاعتماد الجديد يستبدل قياسات هذا الاختبار فقط.</div>`;
    body += "</div>";
    const b = openSheet(`<h3>اعتماد النتائج في الدفتر</h3>${body}<div class="row" style="margin-top:16px"><button class="btn primary grow" id="bkGo">اعتمد</button><button class="btn ghost" id="bkNo">إلغاء</button></div>`);
    b.querySelector("#bkNo").onclick = closeSheet;
    b.querySelector("#bkGo").onclick = async () => {
      const over = !!(b.querySelector("#bkOver") && b.querySelector("#bkOver").checked);
      try { await rpc("t_book", { p_exam: id, p_commit: true, p_overwrite: over }); closeSheet(); toast("اعتُمدت النتائج في الدفتر ✓"); await reload(false); loadReport(id); }
      catch (e) { toast(e.message, true); }
    };
  }

  // ================= بيانات دخول الطلبة =================
  async function renderStudents(secId) {
    secId = secId || (S.d.sections[0] || {}).id;
    const secOpts = (sel) => optionsHtml(sel, S.d.sections.map((s) => [s.id, s.name]));
    $("v-students").innerHTML = `<div class="card pad"><div class="row wrap">
      <select class="input grow" id="cSec" style="min-width:200px">${S.d.sections.length ? optionsHtml(secId, S.d.sections.map((s) => [s.id, s.name + " (" + s.n_cred + "/" + s.n + " جاهز للدخول)"])) : ""}</select>
      <button class="btn ghost sm" id="cSecNew">＋ شعبة</button>${secId ? '<button class="btn ghost sm" id="cSecRen">✎ تسمية الشعبة</button>' : ""}</div>
      ${secId ? `<div class="row wrap" style="margin-top:10px">
        <button class="btn" id="cAdd">＋ طالب</button><button class="btn" id="cPaste">📋 لصق من إكسل</button>
        <button class="btn primary" id="cSave">💾 حفظ التعديلات</button><span class="tiny" id="cDirty"></span></div>
      <p class="tiny" style="margin:10px 0 0">عدّل الأسماء والأرقام مباشرة في الجدول ثم اضغط «حفظ». يدخل الطالب إلى <a href="index.html" target="_blank">صفحة الطلبة</a> برقمه الوطني وتاريخ ميلاده.</p>` : ""}</div>
      <div id="cBody" style="margin-top:12px">${secId ? '<div class="empty">جارٍ التحميل…</div>' : '<div class="card empty">لا شعب بعد. أضف شعبة من الزر أعلاه.</div>'}</div>`;
    $("cSecNew").onclick = () => sectionSheet(null);
    if (!secId) return;
    $("cSecRen").onclick = () => sectionSheet(S.d.sections.find((s) => s.id === secId));
    $("cSec").onchange = (e) => (location.hash = "#students/" + e.target.value);
    let rows;
    try { rows = await rpc("t_students", { p_section: secId }); } catch (e) { return toast(e.message, true); }
    const active = rows.filter((r) => r.active), archived = rows.filter((r) => !r.active);
    const rowHtml = (r) => `<tr ${r.id ? `data-id="${r.id}"` : 'data-new="1"'}>
        <td><input class="input mono cS" inputmode="numeric" value="${r.serial == null ? "" : r.serial}" style="width:62px;min-width:0"></td>
        <td><input class="input cName" value="${esc(r.name || "")}" placeholder="اسم الطالب الرباعي" style="min-width:200px"></td>
        <td><input class="input mono cN" inputmode="numeric" dir="ltr" value="${esc(r.nid || "")}"></td>
        <td><input class="input cD" type="date" value="${esc(r.dob || "")}"></td>
        <td><select class="input cSecMove" style="min-width:130px">${secOpts(secId)}</select></td>
        <td>${r.id ? `<button class="btn sm ghost cDel" title="حذف">🗑</button>` : `<button class="btn sm ghost cRm" title="إزالة السطر">✕</button>`}</td></tr>`;
    $("cBody").innerHTML = `<div class="tablewrap"><table class="t" id="cTable"><thead><tr><th>#</th><th>اسم الطالب</th><th>الرقم الوطني</th><th>تاريخ الميلاد</th><th>الشعبة</th><th></th></tr></thead>
      <tbody>${active.map(rowHtml).join("")}</tbody></table></div>` +
      (archived.length ? `<details class="card pad" style="margin-top:12px"><summary style="cursor:pointer;font-weight:700">الطلبة المؤرشفون (${archived.length})</summary>
        <p class="tiny">طلبة حُذفوا ولهم سجلات (علامات أو أحداث)، فحُفظت سجلاتهم كدليل ولا يظهرون في الكشوف.</p>
        ${archived.map((r) => `<div class="row sp" style="padding:6px 0;border-bottom:1px solid var(--line)"><span>${r.serial} · ${esc(r.name)}</span>
          <button class="btn sm" data-restore="${r.id}">استرجاع</button></div>`).join("")}</details>` : "");
    const markDirty = () => { $("cDirty").textContent = "• توجد تعديلات غير محفوظة"; };
    const wire = (root) => {
      root.querySelectorAll(".cN").forEach((i) => (i.oninput = () => { i.value = digits(i.value).replace(/\D/g, ""); markDirty(); }));
      root.querySelectorAll(".cS").forEach((i) => (i.oninput = () => { i.value = digits(i.value).replace(/\D/g, ""); markDirty(); }));
      root.querySelectorAll(".cName,.cD,.cSecMove").forEach((i) => (i.addEventListener("input", markDirty), i.addEventListener("change", markDirty)));
      root.querySelectorAll(".cRm").forEach((btn) => (btn.onclick = () => btn.closest("tr").remove()));
      root.querySelectorAll(".cDel").forEach((btn) => (btn.onclick = async () => {
        const tr = btn.closest("tr"), name = tr.querySelector(".cName").value;
        if (!(await confirmSheet("حذف " + name + "؟", "إن كانت له علامات أو أحداث يُؤرشف بدل الحذف، فتبقى سجلاته محفوظة ويمكن استرجاعه.", "احذف", true))) return;
        try { const r = await rpc("t_delete_student", { p_id: tr.dataset.id }); toast(r.archived ? "أُرشف الطالب (له سجلات محفوظة)" : "حُذف الطالب"); await reload(false); renderStudents(secId); }
        catch (e) { toast(e.message, true); }
      }));
    };
    wire($("cBody"));
    $("cBody").querySelectorAll("[data-restore]").forEach((btn) => (btn.onclick = async () => {
      try { await rpc("t_restore_student", { p_id: btn.dataset.restore }); toast("استُرجع الطالب"); await reload(false); renderStudents(secId); } catch (e) { toast(e.message, true); }
    }));
    const addRow = (r) => {
      const tb = $("cTable").querySelector("tbody"); tb.insertAdjacentHTML("beforeend", rowHtml(r || {}));
      const tr = tb.lastElementChild; wire(tr); markDirty(); return tr;
    };
    $("cAdd").onclick = () => { const tr = addRow(); tr.querySelector(".cName").focus(); tr.scrollIntoView({ behavior: "smooth", block: "center" }); };
    $("cSave").onclick = async () => {
      const p = [...$("cTable").querySelectorAll("tbody tr")].map((tr) => ({
        id: tr.dataset.id || null, serial: tr.querySelector(".cS").value || null, name: tr.querySelector(".cName").value.trim(),
        nid: tr.querySelector(".cN").value, dob: tr.querySelector(".cD").value || null, section_id: tr.querySelector(".cSecMove").value }));
      try {
        const r = await rpc("t_save_students", { p_section: secId, p_rows: p });
        toast("حُفظ — عُدّل " + r.updated + (r.added ? " وأُضيف " + r.added : "") + " · جاهز للدخول " + p.filter((x) => x.nid && x.dob).length);
        await reload(false); renderStudents(secId);
      } catch (e) { toast(e.message, true); }
    };
    $("cPaste").onclick = () => {
      const b = openSheet(`<h3>لصق الطلبة من إكسل</h3>
        <p class="tiny">أربعة أعمدة بهذا الترتيب: <b>الرقم التسلسلي | اسم الطالب | الرقم الوطني | تاريخ الميلاد</b>.<br>
        إن وُجد الرقم التسلسلي في الشعبة تُحدَّث بيانات الطالب، وإلا يُضاف طالبًا جديدًا. التاريخ بصيغة 15/3/2008 أو 2008-03-15.<br>
        (يُقبل أيضًا ثلاثة أعمدة: الرقم التسلسلي | الرقم الوطني | تاريخ الميلاد.)</p>
        <textarea class="input mono" id="cpT" rows="8" dir="auto"></textarea><button class="btn primary block" id="cpGo" style="margin-top:10px">تعبئة الجدول</button>`);
      b.querySelector("#cpGo").onclick = () => {
        let upd = 0, add = 0, bad = 0;
        parseTSV(b.querySelector("#cpT").value).forEach((r) => {
          const serial = parseInt(digits(r[0] || "").replace(/\D/g, ""), 10); if (!serial) return;
          const threeCols = !/[\u0621-\u064A\u0671-\u06D3a-zA-Z]/.test(r[1] || "");
          const name = threeCols ? "" : (r[1] || "").trim(), nid = threeCols ? r[1] : r[2], dob = threeCols ? r[2] : r[3];
          let tr = [...$("cTable").querySelectorAll("tbody tr")].find((t) => +t.querySelector(".cS").value === serial);
          if (!tr) { if (!name) { bad++; return; } tr = addRow({ serial }); add++; } else upd++;
          if (name) tr.querySelector(".cName").value = name;
          if (nid) tr.querySelector(".cN").value = digits(nid).replace(/\D/g, "");
          const d = parseDate(dob); if (d) tr.querySelector(".cD").value = d; else if ((dob || "").trim()) bad++;
        });
        markDirty(); closeSheet();
        toast("حُدّث " + upd + " وأُضيف " + add + (bad ? " — تعذّر " + bad + " صفًّا" : "") + ". راجع ثم اضغط «حفظ».", !!bad);
      };
    };
  }
  function sectionSheet(sec) {
    const b = openSheet(`<h3>${sec ? "تسمية الشعبة" : "شعبة جديدة"}</h3>
      <label class="field"><span>اسم الشعبة</span><input class="input" id="snName" value="${esc(sec ? sec.name : "")}" placeholder="مثال: أعمال / ب"></label>
      <button class="btn primary block" id="snGo">حفظ</button>`);
    b.querySelector("#snGo").onclick = async () => {
      try { const r = await rpc("t_save_section", { p: { id: sec ? sec.id : null, name: b.querySelector("#snName").value } });
        closeSheet(); toast("حُفظت الشعبة"); await reload(false); location.hash = "#students/" + r.id; route(); }
      catch (e) { toast(e.message, true); }
    };
  }
  function parseDate(s) {
    s = digits(s || "").trim(); if (!s) return null;
    let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/); if (m) return m[1] + "-" + m[2].padStart(2, "0") + "-" + m[3].padStart(2, "0");
    m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/); if (m) return m[3] + "-" + m[2].padStart(2, "0") + "-" + m[1].padStart(2, "0");
    if (/^\d{5}$/.test(s)) { const d = new Date(Date.UTC(1899, 11, 30) + +s * 86400000); return d.toISOString().slice(0, 10); } // رقم تاريخ إكسل
    return null;
  }

  // ================= سجلات العلامات (تجميعي + تفصيلي) =================
  const REC = { kind: "sum", show: "level", data: null, sec: null };
  const UNIT_CLS = ["u0", "u1", "u2", "u3", "u4", "u5"];
  const VERBAL = [[90, "ممتاز"], [80, "جيد جدًا"], [70, "جيد"], [60, "متوسط"], [50, "مقبول"], [0, "راسب"]];
  const verbalOf = (pct) => { for (const v of VERBAL) if (pct >= v[0]) return v[1]; return "—"; };
  const nf = (v) => (v == null || isNaN(v) ? "—" : String(Math.round(v * 100) / 100));

  async function renderRecords(secId) {
    secId = secId || REC.sec || (S.d.sections[0] || {}).id; REC.sec = secId;
    if (!secId) { $("v-records").innerHTML = '<div class="card empty">لا شعب بعد.</div>'; return; }
    $("v-records").innerHTML = `<div class="card pad noprint"><div class="row wrap">
        <select class="input grow" id="rcSec" style="min-width:200px">${optionsHtml(secId, S.d.sections.map((s) => [s.id, s.name]))}</select>
        <div class="seg" id="rcKind"><button data-k="sum" aria-pressed="${REC.kind === "sum"}">السجل التجميعي</button><button data-k="det" aria-pressed="${REC.kind === "det"}">السجل التفصيلي</button></div></div>
      <div class="row wrap" style="margin-top:10px">
        <div class="seg ${REC.kind === "det" ? "" : "hide"}" id="rcShow"><button data-s="level" aria-pressed="${REC.show === "level"}">خلايا النتاجات: المستوى ١–٤</button><button data-s="mark" aria-pressed="${REC.show === "mark"}">خلايا النتاجات: العلامة</button></div>
        <span class="grow"></span><button class="btn primary" id="rcPrint">🖨 طباعة / PDF</button><button class="btn" id="rcXlsx">⬇ Excel منسّق</button></div></div>
      <div class="rec-scroll"><div id="recPaper" class="paper"><div class="empty">جارٍ التحميل…</div></div></div>`;
    $("rcSec").onchange = (e) => (location.hash = "#records/" + e.target.value);
    $("rcKind").querySelectorAll("button").forEach((b) => (b.onclick = () => { REC.kind = b.dataset.k; renderRecords(secId); }));
    $("rcShow").querySelectorAll("button").forEach((b) => (b.onclick = () => { REC.show = b.dataset.s; renderRecords(secId); }));
    $("rcPrint").onclick = printRecord;
    $("rcXlsx").onclick = () => exportRecordXlsx().catch((e) => toast(e.message, true));
    try { REC.data = await rpc("t_records", { p_section: secId }); } catch (e) { return toast(e.message, true); }
    $("recPaper").innerHTML = recordHtml();
  }

  function recCalc(R) {
    const c = R.subject, all = R.units.flatMap((u) => u.outcomes);
    return R.students.map((st) => {
      const lv = st.levels || {}, assessed = all.filter((o) => lv[o.id]), N = assessed.length, w = {};
      assessed.forEach((o) => (w[o.id] = (lv[o.id] / 4) * c.cap2 / N));
      const units = R.units.map((u) => { const os = u.outcomes.filter((o) => lv[o.id]); return os.length ? os.reduce((a, o) => a + w[o.id], 0) : null; });
      const second = N ? assessed.reduce((a, o) => a + w[o.id], 0) : null;
      const first = st.first ? (st.first.absent ? 0 : st.first.mark) : null;
      const fin = st.final ? (st.final.absent ? 0 : st.final.mark) : null;
      const parts = [first, second, fin].filter((v) => v != null).map(Number);
      const total = parts.length ? parts.reduce((a, b) => a + b, 0) : null;
      const complete = first != null && second != null && fin != null;
      return Object.assign({}, st, { lv, w, units, second, first: first == null ? null : +first, fin: fin == null ? null : +fin, total, N, complete,
        verbal: complete ? verbalOf((total / c.max) * 100) : "—" });
    });
  }

  function recHeaderInfo(R) {
    const sem = R.section.semester === 1 ? "الأول" : "الثاني";
    return {
      right: [R.teacher.directorate, R.teacher.school].filter(Boolean),
      left: ["المبحث: " + R.subject.name, "الصف: " + R.subject.grade, "الشعبة: " + R.section.name, "العام الدراسي " + R.section.year + " — الفصل " + sem],
      title: "سجل العلامات الجانبي", sub: REC.kind === "sum" ? "السجل التجميعي" : "السجل التفصيلي — النتاجات"
    };
  }

  function recordHtml() {
    const R = REC.data, rows = recCalc(R), c = R.subject, H = recHeaderInfo(R), det = REC.kind === "det";
    const units = R.units, outs = units.flatMap((u, ui) => u.outcomes.map((o) => Object.assign({ ui, useq: u.seq }, o)));
    let h = `<div class="rec-head"><div class="rh-side">${H.right.map(esc).join("<br>")}</div>
      <div class="rh-title">${esc(H.title)}<span>${esc(H.sub)}</span></div>
      <div class="rh-side rh-left">${H.left.map(esc).join("<br>")}</div></div>`;
    h += '<table class="rec"><thead><tr>';
    h += `<th rowspan="2" class="g-name n-col">م</th><th rowspan="2" class="g-name name-col">اسم الطالب</th><th rowspan="2" class="g-first">التقويم الأول<small>${nf(c.cap1)}</small></th>`;
    if (det) {
      units.forEach((u, ui) => { if (u.outcomes.length) h += `<th colspan="${u.outcomes.length}" class="g-${UNIT_CLS[ui % 6]}" title="${esc(u.title)}">${u.outcomes.length < 4 ? "و" + u.seq : "الوحدة " + u.seq + ": " + esc(u.title)}</th>`; });
      h += `<th rowspan="2" class="g-second">مجموع التقويم الثاني<small>${nf(c.cap2)}</small></th>`;
    } else {
      h += `<th colspan="${units.length + 1}" class="g-second">التقويم الثاني — النتاجات</th>`;
    }
    h += `<th rowspan="2" class="g-final">الاختبار النهائي<small>${nf(c.cap3)}</small></th><th rowspan="2" class="g-total">المجموع<small>${nf(c.max)}</small></th><th rowspan="2" class="g-verbal">التقدير</th></tr><tr>`;
    if (det) outs.forEach((o) => { h += `<th class="vt g-${UNIT_CLS[o.ui % 6]}"><div>ن${o.seq} (د${o.lesson}): ${esc(o.text)}</div></th>`; });
    else { units.forEach((u, ui) => { h += `<th class="g-${UNIT_CLS[ui % 6]} unit-col">الوحدة ${u.seq}<small>${esc(u.title)}</small></th>`; }); h += `<th class="g-second">المجموع<small>${nf(c.cap2)}</small></th>`; }
    h += "</tr></thead><tbody>";
    rows.forEach((r) => {
      h += `<tr><td class="c-name num">${r.serial}</td><td class="c-name name-col">${esc(r.name)}</td><td class="c-first num">${nf(r.first)}</td>`;
      if (det) {
        outs.forEach((o) => { const L = r.lv[o.id];
          h += L ? (REC.show === "level" ? `<td class="num lvc lv${L}">${L}</td>` : `<td class="num c-${UNIT_CLS[o.ui % 6]}">${nf(r.w[o.id])}</td>`) : `<td class="num c-${UNIT_CLS[o.ui % 6]} dim">·</td>`; });
        h += `<td class="c-second num b">${nf(r.second)}</td>`;
      } else {
        r.units.forEach((v, ui) => { h += `<td class="c-${UNIT_CLS[ui % 6]} num">${nf(v)}</td>`; });
        h += `<td class="c-second num b">${nf(r.second)}</td>`;
      }
      h += `<td class="c-final num">${nf(r.fin)}</td><td class="c-total num b">${nf(r.total)}${r.complete || r.total == null ? "" : "<sup>*</sup>"}</td><td class="c-verbal">${esc(r.verbal)}</td></tr>`;
    });
    h += "</tbody></table>";
    h += `<div class="rec-note">علامة التقويم الثاني = متوسط مستويات إتقان النتاجات المقيسة ÷ ٤ × ${nf(c.cap2)}؛ ويُعتمد لكل نتاج ${c.rule === "latest" ? "أحدث" : "أعلى"} مستوى قيس به.
      ${det ? (REC.show === "level" ? "المستويات: ١ مبتدئ · ٢ نامٍ · ٣ متمكّن · ٤ متميّز. (·) لم يُقَس بعد." : "خلية النتاج = نصيبه من علامة التقويم الثاني، ومجموع الخلايا = علامة التقويم الثاني. (·) لم يُقَس بعد.")
            : "عمود الوحدة = مجموع نصيب نتاجاتها من علامة التقويم الثاني، ومجموع الوحدات = علامة التقويم الثاني."}
      (*) المجموع جزئي لنقص إحدى العلامات. التقدير وفق المادة (١٨) من أسس النجاح.</div>
      <div class="rec-sign"><span>معلم المبحث: ${esc(R.teacher.name || "")} ............</span><span>مدير المدرسة: ....................</span><span>المشرف التربوي: ....................</span></div>`;
    return h;
  }

  function printRecord() {
    if (!REC.data) return;
    const H = recHeaderInfo(REC.data);
    const w = window.open("", "_blank");
    if (!w) { toast("اسمح للمتصفح بفتح نافذة جديدة لطباعة السجل", true); return; }
    let css = "";
    for (const ss of document.styleSheets) { try { css += [...ss.cssRules].map((r) => r.cssText).join("\n"); } catch (e) { /* خطوط Google */ } }
    w.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
      <title>${esc(H.title + " — " + H.sub + " — " + REC.data.section.name)}</title>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;700&family=Amiri:wght@400;700&display=swap" rel="stylesheet">
      <style>${css}</style>
      <style>@page{size:A4 landscape;margin:7mm} html,body{background:#fff;margin:0} .paper{padding:0;min-width:0}</style></head>
      <body><div class="paper" id="p">${recordHtml()}</div></body></html>`);
    w.document.close();
    const fit = () => {
      const t = w.document.querySelector("table.rec"), p = w.document.getElementById("p");
      if (t && p) p.style.zoom = Math.min(1, 1040 / Math.max(t.scrollWidth, 1)).toFixed(3);
      setTimeout(() => { w.focus(); w.print(); }, 250);
    };
    const go = () => (w.document.fonts && w.document.fonts.ready ? w.document.fonts.ready.then(fit) : fit());
    if (w.document.readyState === "complete") go(); else w.addEventListener("load", go);
  }

  function loadScript(src) {
    return new Promise((ok, bad) => { if (window.XLSX && window.XLSX.utils && window.XLSX.__styled) return ok();
      const s = document.createElement("script"); s.src = src; s.onload = () => { window.XLSX.__styled = true; ok(); };
      s.onerror = () => bad(new Error("تعذّر تحميل مكتبة Excel. تحقّق من الاتصال.")); document.head.appendChild(s); });
  }
  async function exportRecordXlsx() {
    if (!REC.data) return;
    await loadScript("https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js");
    const X = window.XLSX, R = REC.data, rows = recCalc(R), c = R.subject, H = recHeaderInfo(R), det = REC.kind === "det";
    const units = R.units, outs = units.flatMap((u, ui) => u.outcomes.map((o) => Object.assign({ ui, useq: u.seq }, o)));
    const DARK = { name: "1F2937", first: "1E3A8A", second: "0F766E", final: "9A3412", total: "713F12", verbal: "334155", u: ["065F46", "7C2D12", "581C87", "155E75", "9D174D", "3F6212"] };
    const LIGHT = { name: "FFFFFF", first: "E8EFFF", second: "E0F5F2", final: "FFF1E6", total: "FDF6D8", verbal: "F1F5F9", u: ["E9F7EF", "FDF1E7", "F3EBFB", "E6F6FA", "FCE7F3", "F1F8E4"] };
    const LV = ["", "FFE4D6", "FDEFC8", "DDE7FD", "D9F2E1"];
    const border = { top: { style: "thin", color: { rgb: "9CA3AF" } }, bottom: { style: "thin", color: { rgb: "9CA3AF" } }, left: { style: "thin", color: { rgb: "9CA3AF" } }, right: { style: "thin", color: { rgb: "9CA3AF" } } };
    const hs = (fill, rot) => ({ font: { name: "Amiri", bold: true, sz: rot ? 9 : 12, color: { rgb: "FFFFFF" } }, fill: { patternType: "solid", fgColor: { rgb: fill } }, border,
      alignment: { horizontal: "center", vertical: "center", wrapText: true, readingOrder: 2, textRotation: rot ? 90 : 0 } });
    const ds = (fill, bold) => ({ font: { name: "Arial", sz: 11, bold: !!bold, color: { rgb: "111827" } }, fill: { patternType: "solid", fgColor: { rgb: fill } }, border,
      alignment: { horizontal: "center", vertical: "center", readingOrder: 2 } });
    const aoa = [], S2 = [], merges = [];
    const put = (r, col, v, style) => { aoa[r] = aoa[r] || []; aoa[r][col] = v; S2.push([r, col, style]); };
    const ncols = det ? 3 + outs.length + 4 : 3 + units.length + 1 + 3;
    put(0, 0, H.title + " — " + H.sub, { font: { name: "Amiri", bold: true, sz: 18, color: { rgb: "0F3D3A" } }, alignment: { horizontal: "center", readingOrder: 2 } });
    merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: ncols - 1 } });
    put(1, 0, H.right.concat(H.left).join("   |   "), { font: { name: "Amiri", sz: 12, color: { rgb: "374151" } }, alignment: { horizontal: "center", readingOrder: 2, wrapText: true } });
    merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: ncols - 1 } });
    const r1 = 3, r2 = 4; let col = 0;
    const span2 = (text, dark) => { put(r1, col, text, hs(dark)); put(r2, col, "", hs(dark)); merges.push({ s: { r: r1, c: col }, e: { r: r2, c: col } }); col++; };
    span2("م", DARK.name); span2("اسم الطالب", DARK.name); span2("التقويم الأول (" + nf(c.cap1) + ")", DARK.first);
    if (det) {
      units.forEach((u, ui) => { if (!u.outcomes.length) return; const start = col;
        u.outcomes.forEach((o) => { put(r1, col, col === start ? "الوحدة " + u.seq + ": " + u.title : "", hs(DARK.u[ui % 6]));
          put(r2, col, "ن" + o.seq + " (د" + o.lesson + "): " + o.text, hs(DARK.u[ui % 6], true)); col++; });
        merges.push({ s: { r: r1, c: start }, e: { r: r1, c: col - 1 } }); });
      span2("مجموع التقويم الثاني (" + nf(c.cap2) + ")", DARK.second);
    } else {
      const start = col;
      units.forEach((u, ui) => { put(r1, col, col === start ? "التقويم الثاني — النتاجات" : "", hs(DARK.second)); put(r2, col, "الوحدة " + u.seq + ": " + u.title, hs(DARK.u[ui % 6])); col++; });
      put(r1, col, "", hs(DARK.second)); put(r2, col, "المجموع (" + nf(c.cap2) + ")", hs(DARK.second)); col++;
      merges.push({ s: { r: r1, c: start }, e: { r: r1, c: col - 1 } });
    }
    span2("الاختبار النهائي (" + nf(c.cap3) + ")", DARK.final); span2("المجموع (" + nf(c.max) + ")", DARK.total); span2("التقدير", DARK.verbal);
    const num = (v) => (v == null || isNaN(v) ? "" : Math.round(v * 100) / 100);
    rows.forEach((r, i) => {
      const rr = r2 + 1 + i; let k = 0;
      put(rr, k++, r.serial, ds(LIGHT.name)); put(rr, k++, r.name, Object.assign(ds(LIGHT.name), { alignment: { horizontal: "right", vertical: "center", readingOrder: 2 } }));
      put(rr, k++, num(r.first), ds(LIGHT.first));
      if (det) {
        outs.forEach((o) => { const L = r.lv[o.id];
          put(rr, k++, L ? (REC.show === "level" ? L : num(r.w[o.id])) : "", ds(L && REC.show === "level" ? LV[L] : LIGHT.u[o.ui % 6])); });
      } else r.units.forEach((v, ui) => put(rr, k++, num(v), ds(LIGHT.u[ui % 6])));
      put(rr, k++, num(r.second), ds(LIGHT.second, true)); put(rr, k++, num(r.fin), ds(LIGHT.final));
      put(rr, k++, num(r.total), ds(LIGHT.total, true)); put(rr, k++, r.verbal, ds(LIGHT.verbal));
    });
    const last = r2 + rows.length + 2;
    put(last, 0, "معلم المبحث: " + (R.teacher.name || "") + "        مدير المدرسة: ..................        المشرف التربوي: ..................",
      { font: { name: "Amiri", sz: 12 }, alignment: { horizontal: "center", readingOrder: 2 } });
    merges.push({ s: { r: last, c: 0 }, e: { r: last, c: ncols - 1 } });
    for (let r = 0; r <= last; r++) { aoa[r] = aoa[r] || []; for (let k = 0; k < ncols; k++) if (aoa[r][k] === undefined) aoa[r][k] = ""; }
    const ws = X.utils.aoa_to_sheet(aoa);
    S2.forEach(([r, k, st]) => { const a = X.utils.encode_cell({ r, c: k }); if (ws[a]) ws[a].s = st; });
    ws["!merges"] = merges;
    ws["!cols"] = Array.from({ length: ncols }, (_, k) => ({ wch: k === 0 ? 5 : k === 1 ? 30 : det && k >= 3 && k < 3 + outs.length ? 4.5 : 12 }));
    ws["!rows"] = []; ws["!rows"][0] = { hpt: 30 }; ws["!rows"][1] = { hpt: 22 }; ws["!rows"][r1] = { hpt: 36 }; ws["!rows"][r2] = { hpt: det ? 190 : 42 };
    const wb = X.utils.book_new(); wb.Workbook = { Views: [{ RTL: true }] };
    X.utils.book_append_sheet(wb, ws, det ? "تفصيلي" : "تجميعي");
    X.writeFile(wb, H.title + " - " + H.sub + " - " + R.section.name.replace(/[\\/:*?"<>|]/g, "-") + ".xlsx");
    toast("نُزّل ملف Excel");
  }

  // ================= التشغيل =================
  sb.auth.getSession().then(({ data }) => { if (data.session) boot(); else $("vLogin").classList.remove("hide"); });
})();
