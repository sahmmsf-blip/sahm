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
  $("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const b = $("loginBtn"); b.disabled = true; b.textContent = "جارٍ الدخول…"; $("loginErr").classList.add("hide");
    const r = await sb.auth.signInWithPassword({ email: $("email").value.trim(), password: $("pass").value });
    b.disabled = false; b.textContent = "دخول";
    if (r.error) { $("loginErr").textContent = "تعذّر الدخول — تأكد من البريد وكلمة السر."; $("loginErr").classList.remove("hide"); return; }
    boot();
  });
  $("outBtn").onclick = async () => { await sb.auth.signOut(); location.reload(); };
  $("themeBtn").onclick = cycleTheme;

  async function boot() {
    $("vLogin").classList.add("hide"); $("app").classList.remove("hide");
    try { await reload(); } catch (e) { toast(e.message, true); return; }
    if (!location.hash) location.hash = "#home";
    route();
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
  const TITLES = { home: "الرئيسية", bank: "بنك الأسئلة", exams: "الاختبارات", results: "النتائج والتحليل", students: "بيانات دخول الطلبة" };
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
    const blankRule = () => ({ unit_id: null, lesson_id: null, outcome_id: null, easy: 0, medium: 0, hard: 0 });
    const rules = (x && x.draw_rules && x.draw_rules.length ? x.draw_rules : [blankRule()]).map((r) => Object.assign(blankRule(), r));
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
    const poolN = (r, d) => S.qs.filter((q) => q.active && q.difficulty === d && S.out[q.outcome_id] &&
      (!r.outcome_id || q.outcome_id === r.outcome_id) && (!r.lesson_id || S.out[q.outcome_id].lesson.id === r.lesson_id) &&
      (!r.unit_id || S.out[q.outcome_id].unit.id === r.unit_id)).length;
    const scopeName = (r) => r.outcome_id ? outLabel(r.outcome_id) : r.lesson_id ? "الوحدة " + S.lessons[r.lesson_id].unit.seq + " · الدرس " + S.lessons[r.lesson_id].seq
      : r.unit_id ? "الوحدة " + S.units[r.unit_id].seq : "كل الكتاب";
    const rulesSum = () => {
      const t = { easy: 0, medium: 0, hard: 0 }; const warn = [];
      rules.forEach((r, i) => DK.forEach(([k, d]) => { const n = +r[k] || 0; t[k] += n; const have = poolN(r, d);
        if (n > have) warn.push(`القاعدة ${i + 1} (${esc(scopeName(r))}): مطلوب ${n} ${d} والمتاح ${have}`); }));
      const tot = t.easy + t.medium + t.hard;
      b.querySelector("#rSum").innerHTML = `<b>كل طالب يأخذ ${tot} سؤالًا</b> <span class="tiny">— سهل ${t.easy} · متوسط ${t.medium} · صعب ${t.hard}</span>` +
        (warn.length ? `<div class="alert warn" style="margin-top:8px"><span class="ic">⚠️</span><span>${warn.join("<br>")}</span></div>` : "");
      b.querySelectorAll(".rule").forEach((row, i) => DK.forEach(([k, d]) => {
        const have = poolN(rules[i], d), inp = row.querySelector(".r-" + k);
        row.querySelector(".h-" + k).textContent = "من " + have;
        inp.style.borderColor = (+rules[i][k] || 0) > have ? "var(--danger)" : "";
      }));
      return tot;
    };
    const drawRules = () => {
      const box = b.querySelector("#rRules");
      box.innerHTML = rules.map((r, i) => {
        const lessons = r.unit_id ? S.units[r.unit_id].lessons : lessonsOf("");
        const outs = r.lesson_id ? S.lessons[r.lesson_id].outcomes : [];
        const dis = locked ? "disabled" : "";
        return `<div class="card pad rule" data-i="${i}">
          <div class="row sp" style="margin-bottom:6px"><b style="font-size:13.5px">القاعدة ${i + 1}</b>${locked || rules.length < 2 ? "" : `<button type="button" class="btn sm ghost r-del">✕ حذف</button>`}</div>
          <div class="fields three">
            <label class="field"><span>الوحدة</span><select class="input r-u" ${dis}>${optionsHtml(r.unit_id || "", S.d.units.map((u) => [u.id, "الوحدة " + u.seq + " · " + u.title]), "كل الوحدات")}</select></label>
            <label class="field"><span>الدرس</span><select class="input r-l" ${dis}>${optionsHtml(r.lesson_id || "", lessons.map((l) => [l.id, (r.unit_id ? "" : "و" + S.lessons[l.id].unit.seq + " · ") + "الدرس " + l.seq + " · " + l.title]), "كل الدروس")}</select></label>
            <label class="field"><span>النتاج</span><select class="input r-o" ${dis}>${optionsHtml(r.outcome_id || "", outs.map((o) => [o.id, "ن" + o.seq + " — " + o.text]), "كل النتاجات")}</select></label>
          </div>
          <div class="row wrap" style="gap:14px">${DK.map(([k, d]) => `<label class="row" style="gap:6px"><span style="font-weight:600;font-size:13.5px">${d}</span>
            <input type="number" min="0" class="input mono r-${k}" value="${+r[k] || 0}" style="width:74px" ${dis}><span class="tiny h-${k}"></span></label>`).join("")}</div></div>`;
      }).join("");
      box.querySelectorAll(".rule").forEach((row) => {
        const i = +row.dataset.i, r = rules[i];
        row.querySelector(".r-u").onchange = (ev) => { r.unit_id = ev.target.value || null; r.lesson_id = null; r.outcome_id = null; drawRules(); };
        row.querySelector(".r-l").onchange = (ev) => { r.lesson_id = ev.target.value || null; r.outcome_id = null;
          if (r.lesson_id) r.unit_id = S.lessons[r.lesson_id].unit.id; drawRules(); };
        row.querySelector(".r-o").onchange = (ev) => { r.outcome_id = ev.target.value || null; drawRules(); };
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
        if (rules.length === 1 && !rules[0].unit_id && !rules[0].lesson_id && !(rules[0].easy + rules[0].medium + rules[0].hard)) rules.pop();
        u.lessons.forEach((l) => rules.push(Object.assign(blankRule(), { unit_id: u.id, lesson_id: l.id })));
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
    if (!secId) { $("v-students").innerHTML = '<div class="card empty">لا شعب بعد. أضفها من الدفتر الجانبي.</div>'; return; }
    $("v-students").innerHTML = `<div class="card pad"><div class="row wrap">
      <select class="input grow" id="cSec">${optionsHtml(secId, S.d.sections.map((s) => [s.id, s.name + " (" + s.n_cred + "/" + s.n + " جاهز)"]))}</select>
      <button class="btn" id="cPaste">📋 لصق من إكسل</button><button class="btn primary" id="cSave">حفظ</button></div>
      <p class="tiny" style="margin:10px 0 0">يدخل الطالب إلى <a href="index.html" target="_blank">صفحة الطلبة</a> برقمه الوطني وتاريخ ميلاده. أكمل البيانات هنا أو الصقها من كشف إكسل.</p></div>
      <div id="cBody" style="margin-top:12px"><div class="empty">جارٍ التحميل…</div></div>`;
    $("cSec").onchange = (e) => (location.hash = "#students/" + e.target.value);
    let rows;
    try { rows = await rpc("t_students", { p_section: secId }); } catch (e) { return toast(e.message, true); }
    $("cBody").innerHTML = `<div class="tablewrap"><table class="t"><tr><th class="num">#</th><th>الطالب</th><th>الرقم الوطني</th><th>تاريخ الميلاد</th></tr>` +
      rows.map((r) => `<tr data-id="${r.id}"><td class="num">${r.serial}</td><td>${esc(r.name)}</td>
        <td><input class="input mono cN" inputmode="numeric" dir="ltr" value="${esc(r.nid || "")}"></td>
        <td><input class="input cD" type="date" value="${esc(r.dob || "")}"></td></tr>`).join("") + "</table></div>";
    $("cBody").querySelectorAll(".cN").forEach((i) => (i.oninput = () => { i.value = digits(i.value).replace(/\D/g, ""); }));
    $("cSave").onclick = async () => {
      const p = [...$("cBody").querySelectorAll("tr[data-id]")].map((tr) => ({ id: tr.dataset.id, nid: tr.querySelector(".cN").value, dob: tr.querySelector(".cD").value || null }));
      try { await rpc("t_save_credentials", { p_rows: p }); toast("حُفظ — " + p.filter((x) => x.nid && x.dob).length + " طالبًا جاهزون للدخول"); await reload(false); renderStudents(secId); } catch (e) { toast(e.message, true); }
    };
    $("cPaste").onclick = () => {
      const b = openSheet(`<h3>لصق الأرقام الوطنية وتواريخ الميلاد</h3>
        <p class="tiny">ثلاثة أعمدة بهذا الترتيب: <b>الرقم التسلسلي | الرقم الوطني | تاريخ الميلاد</b>. التاريخ بصيغة يوم/شهر/سنة (15/3/2008) أو 2008-03-15.</p>
        <textarea class="input mono" id="cpT" rows="8" dir="auto"></textarea><button class="btn primary block" id="cpGo" style="margin-top:10px">تعبئة الجدول</button>`);
      b.querySelector("#cpGo").onclick = () => {
        let n = 0, bad = 0;
        parseTSV(b.querySelector("#cpT").value).forEach((r) => {
          const serial = parseInt(digits(r[0] || "").replace(/\D/g, ""), 10); if (!serial) return;
          const tr = [...$("cBody").querySelectorAll("tr[data-id]")].find((t) => +t.children[0].textContent === serial);
          if (!tr) { bad++; return; }
          tr.querySelector(".cN").value = digits(r[1] || "").replace(/\D/g, "");
          const d = parseDate(r[2]); if (d) tr.querySelector(".cD").value = d; else if ((r[2] || "").trim()) bad++;
          n++;
        });
        closeSheet(); toast("عُبّئ " + n + " طالبًا" + (bad ? " — تعذّر " + bad + " صفًّا" : "") + ". راجع ثم اضغط «حفظ».", !!bad);
      };
    };
  }
  function parseDate(s) {
    s = digits(s || "").trim(); if (!s) return null;
    let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/); if (m) return m[1] + "-" + m[2].padStart(2, "0") + "-" + m[3].padStart(2, "0");
    m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/); if (m) return m[3] + "-" + m[2].padStart(2, "0") + "-" + m[1].padStart(2, "0");
    if (/^\d{5}$/.test(s)) { const d = new Date(Date.UTC(1899, 11, 30) + +s * 86400000); return d.toISOString().slice(0, 10); } // رقم تاريخ إكسل
    return null;
  }

  // ================= التشغيل =================
  sb.auth.getSession().then(({ data }) => { if (data.session) boot(); else $("vLogin").classList.remove("hide"); });
})();
