// صفحة الطالب: دخول، قائمة اختبارات، أداء الاختبار، النتيجة
(function () {
  const { $, esc, L, fmtDT, mmss, digits, toast, openSheet, closeSheet, confirmSheet, rpcFetch, cycleTheme } = U;
  const KIND = { quiz: "كويز", first_written: "الاختبار الأول", final_written: "الاختبار النهائي", practice: "تدريبي" };
  const MONTHS = ["كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران", "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول"];

  let TOKEN = null;
  try { TOKEN = sessionStorage.getItem("sahm_st_token"); } catch (e) {}
  const X = { a: null, i: 0, ans: {}, flags: {}, offset: 0, timer: null, saveT: null, dirty: false, fsExits: 0, submitting: false };

  function show(v) { ["vLogin", "vHome", "vExam", "vResult"].forEach((k) => $(k).classList.toggle("hide", k !== v)); window.scrollTo(0, 0); }
  function setToken(t) { TOKEN = t; try { t ? sessionStorage.setItem("sahm_st_token", t) : sessionStorage.removeItem("sahm_st_token"); } catch (e) {} }

  async function call(fn, args) {
    const r = await rpcFetch(fn, Object.assign({ p_token: TOKEN }, args || {}));
    if (r && r.ok === false && r.code === "SESSION") { setToken(null); stopExam(); show("vLogin"); throw new Error(r.error); }
    return r;
  }

  // ---------- الدخول ----------
  (function fillDob() {
    $("dobD").innerHTML = '<option value="">اليوم</option>' + Array.from({ length: 31 }, (_, i) => `<option>${i + 1}</option>`).join("");
    $("dobM").innerHTML = '<option value="">الشهر</option>' + MONTHS.map((m, i) => `<option value="${i + 1}">${i + 1} · ${m}</option>`).join("");
    const y = new Date().getFullYear();
    let ys = ""; for (let k = y - 12; k >= y - 24; k--) ys += `<option>${k}</option>`;
    $("dobY").innerHTML = '<option value="">السنة</option>' + ys;
  })();
  $("nid").addEventListener("input", (e) => { const v = digits(e.target.value).replace(/\D/g, ""); if (v !== e.target.value) e.target.value = v; });

  $("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const d = $("dobD").value, m = $("dobM").value, y = $("dobY").value;
    const err = $("loginErr"); err.classList.add("hide");
    if (!d || !m || !y) { err.textContent = "اختر يوم ميلادك وشهره وسنته."; err.classList.remove("hide"); return; }
    const b = $("loginBtn"); b.disabled = true; b.textContent = "جارٍ الدخول…";
    try {
      const dob = y + "-" + String(m).padStart(2, "0") + "-" + String(d).padStart(2, "0");
      const r = await rpcFetch("student_login", { p_nid: $("nid").value, p_dob: dob });
      if (!r.ok) throw new Error(r.error);
      setToken(r.token); await loadHome();
    } catch (ex) { err.textContent = ex.message; err.classList.remove("hide"); }
    finally { b.disabled = false; b.textContent = "دخول"; }
  });

  $("logoutBtn").onclick = async () => { try { await rpcFetch("student_logout", { p_token: TOKEN }); } catch (e) {} setToken(null); show("vLogin"); };
  $("themeBtn").onclick = cycleTheme;
  $("refreshBtn").onclick = () => loadHome();

  // ---------- الرئيسية ----------
  async function loadHome() {
    let r;
    try { r = await call("student_home"); } catch (e) { toast(e.message, true); return; }
    if (!r.ok) { toast(r.error, true); return; }
    $("hName").textContent = r.name || "";
    $("hSec").textContent = r.section ? "الشعبة: " + r.section : "";
    const open = r.exams.filter((x) => x.is_open), past = r.exams.filter((x) => !x.is_open);
    let h = '<div class="sect-title">الاختبارات المتاحة الآن</div>';
    h += open.length ? '<div class="grid two">' + open.map(examCard).join("") + "</div>"
      : '<div class="card empty"><span class="e">🗓️</span>لا يوجد اختبار مفتوح الآن.<br><span class="tiny">يظهر الاختبار هنا عند موعده فقط.</span></div>';
    if (past.length) h += '<div class="sect-title">اختبارات سابقة</div><div class="grid two">' + past.map(examCard).join("") + "</div>";
    $("homeBody").innerHTML = h;
    $("homeBody").querySelectorAll("[data-start]").forEach((b) => (b.onclick = () => startExam(b.dataset.start, b.dataset.mode, b.dataset.running === "1")));
    $("homeBody").querySelectorAll("[data-res]").forEach((b) => (b.onclick = () => openResult(b.dataset.res)));
    show("vHome");
  }

  function examCard(x) {
    const left = x.max_attempts - x.used;
    let act = "";
    if (x.is_open && x.running) act = `<button class="btn primary block" data-start="${x.id}" data-mode="${x.mode}" data-running="1">متابعة الاختبار</button>`;
    else if (x.is_open && left > 0) act = `<button class="btn primary block" data-start="${x.id}" data-mode="${x.mode}">ابدأ الاختبار</button>`;
    let res = "";
    if (x.result && x.result.total) {
      const p = Math.round((x.result.score / x.result.total) * 100);
      res = `<div class="row sp"><span>علامتك: <b class="mono">${x.result.score} / ${x.result.total}</b> (${p}٪)</span>` +
            (x.best_attempt ? `<button class="btn sm ghost" data-res="${x.best_attempt}">التفاصيل</button>` : "") + "</div>";
    } else if (x.used > 0 && !x.running) res = '<div class="tiny">✓ سُلِّمت إجاباتك. ' + (x.result_visible ? "" : "تظهر النتيجة عندما يسمح المعلم.") + "</div>";
    return `<div class="card exam-card">
      <div class="row sp"><div class="ttl">${esc(x.title)}</div><span class="pill ${x.is_open ? "open" : "ended"}">${x.is_open ? "مفتوح" : "انتهى"}</span></div>
      <div class="meta"><span>${esc(KIND[x.kind] || "")}</span><span>⏱ ${x.duration_min} دقيقة</span><span>📝 ${x.n_questions} سؤالًا</span>
        ${x.mode === "lab" ? "<span>🔒 داخل المختبر</span>" : ""}${x.max_attempts > 1 ? `<span>المحاولات: ${x.used} من ${x.max_attempts}</span>` : ""}</div>
      ${x.is_open ? `<div class="tiny">يُغلق ${esc(fmtDT(x.ends_at))}</div>` : ""}
      ${res}${act}</div>`;
  }

  // ---------- بدء الاختبار ----------
  async function startExam(id, mode, running) {
    let code = null;
    if (mode === "lab" && !running) {
      code = await askCode(); if (code === null) return;
    }
    toast("جارٍ تحميل الاختبار…");
    let r;
    try { r = await call("student_start", { p_exam: id, p_code: code }); } catch (e) { toast(e.message, true); return; }
    if (!r.ok) { toast(r.error, true); if (r.code === "BAD_CODE") startExam(id, mode, running); return; }
    beginExam(r);
  }
  function askCode() {
    return new Promise((res) => {
      const b = openSheet('<h3>رمز الجلسة</h3><p class="muted">اكتب الرمز المكوَّن من ٤ أرقام الذي يعرضه المعلم في المختبر.</p>' +
        '<input class="input mono" id="labCode" inputmode="numeric" maxlength="4" style="font-size:28px;text-align:center;letter-spacing:.3em" dir="ltr">' +
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
    show("vExam"); render(); tick();
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
    $("xCard").innerHTML = `<div class="qnum">السؤال ${X.i + 1}</div><div class="stem">${esc(q.stem)}</div>` +
      (q.img ? `<img class="qimg" src="${esc(q.img)}" alt="صورة السؤال">` : "") +
      '<div class="opts" role="radiogroup">' + q.opts.map((o, j) =>
        `<button class="opt" role="radio" data-k="${o.k}" aria-pressed="${X.ans[q.id] === o.k}" aria-checked="${X.ans[q.id] === o.k}"><span class="L">${L[j]}</span><span>${esc(o.t)}</span></button>`).join("") + "</div>";
    $("xCard").querySelectorAll(".opt").forEach((b) => (b.onclick = () => choose(q.id, +b.dataset.k)));
    $("xPrev").disabled = X.i === 0;
    $("xNext").textContent = X.i === n - 1 ? "المراجعة ↓" : "التالي ←";
    $("xFlag").textContent = X.flags[q.id] ? "⚑ إلغاء التعليم" : "⚑ علّم للمراجعة";
    $("xNav").innerHTML = qs.map((x, k) => {
      const c = [X.ans[x.id] !== undefined && X.ans[x.id] !== null ? "done" : "", k === X.i ? "cur" : "", X.flags[x.id] ? "flag" : ""].join(" ");
      const dis = !X.a.allow_back && k < X.i ? "disabled" : "";
      return `<button class="${c}" data-go="${k}" ${dis} aria-label="السؤال ${k + 1}">${k + 1}</button>`;
    }).join("");
    $("xNav").querySelectorAll("[data-go]").forEach((b) => (b.onclick = () => go(+b.dataset.go)));
  }
  function go(k) {
    if (!X.a.allow_back && k < X.i) return;
    X.i = Math.max(0, Math.min(X.a.questions.length - 1, k)); render(); window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function choose(qid, k) {
    X.ans[qid] = k; X.dirty = true; render();
    try { localStorage.setItem(lsKey(), JSON.stringify(X.ans)); } catch (e) {}
    $("xSaved").textContent = "لم يُحفظ بعد…";
    clearTimeout(X.saveT); X.saveT = setTimeout(save, 1200);
  }
  async function save() {
    if (!X.a || !X.dirty) return;
    X.dirty = false;
    try {
      const r = await call("student_save", { p_attempt: X.a.attempt, p_answers: X.ans });
      if (r.ok) { $("xSaved").textContent = "✓ حُفظ"; X.offset = new Date(r.now).getTime() - Date.now(); }
      else if (r.code === "CLOSED") submit(true);
    } catch (e) { X.dirty = true; $("xSaved").textContent = "⚠ بلا اتصال — إجاباتك محفوظة على الجهاز"; clearTimeout(X.saveT); X.saveT = setTimeout(save, 5000); }
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
    $("xSubmit").disabled = true; $("xSubmit").textContent = "جارٍ التسليم…";
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
    const title = X.a.title; stopExam(); exitFs();
    $("xSubmit").disabled = false; $("xSubmit").textContent = "تسليم الإجابات";
    showResult(r, title, auto);
  }

  // ---------- ملء الشاشة ----------
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

  // ---------- النتيجة ----------
  async function openResult(att) {
    try { const r = await call("student_result", { p_attempt: att }); if (!r.ok) { toast(r.error, true); return; } showResult(r, r.title); }
    catch (e) { toast(e.message, true); }
  }
  function showResult(r, title, auto) {
    $("rTitle").textContent = title || "النتيجة";
    let h = "";
    if (!r || r.hidden || r.ok === false) {
      h = `<div class="card pad" style="text-align:center"><div style="font-size:44px">✅</div><h2 style="margin:6px 0">${auto ? "انتهى الوقت وسُلِّمت إجاباتك" : "سُلِّمت إجاباتك"}</h2>
           <p class="muted">${esc((r && (r.message || r.error)) || "")}</p></div>`;
    } else {
      const p = r.total ? Math.round((r.score / r.total) * 100) : 0;
      h = `<div class="card pad" style="text-align:center"><div class="score-ring" style="--p:${p}"><div><div><b class="mono">${r.score}/${r.total}</b><span class="tiny">${p}٪</span></div></div></div>
           <p class="muted" style="margin:0">${p >= 50 ? "أحسنت، واصل التقدّم." : "راجع النتاجات أدناه وحاول تحسينها."}</p></div>`;
      if (r.outcomes && r.outcomes.length) {
        h += '<div class="sect-title">أداؤك في كل نتاج</div><div class="card pad stack">' + r.outcomes.map((o) => {
          const q = o.total ? Math.round((o.correct / o.total) * 100) : 0;
          return `<div><div class="row sp" style="font-size:13.5px"><span><b>${esc(o.label)}</b> ${esc(o.text)}</span><span class="mono">${o.correct}/${o.total}</span></div>
                  <div class="bar" style="margin-top:6px"><i style="width:${q}%"></i></div></div>`;
        }).join("") + "</div>";
      }
    }
    $("rBody").innerHTML = h; show("vResult");
  }
  $("rBack").onclick = () => loadHome();

  // ---------- بدء التشغيل ----------
  if (TOKEN) loadHome().catch(() => show("vLogin")); else show("vLogin");
})();
