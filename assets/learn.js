// الموقع التجاري «منصة السهم العلمي» — الثقافة المالية للصفوف 7–12: قسم المعلّم وقسم الطالب
// المحتوى ملفات ثابتة (pub/g<الصف>/...) منفصلة تمامًا عن بنك المعلّم الخاص، والتقدّم يُحفظ على جهاز الزائر.
(function () {
  const { $, esc, L, toast, rpcFetch, initSkin, skinPicker, spin, firstName } = U;
  const C = window.APP_CONFIG || {};
  initSkin("learn", "olive");
  $("lnYr").textContent = new Date().getFullYear();
  $("lnSkin").onclick = skinPicker;

  // ---------- ثوابت ----------
  const GRADES = [["7", "السابع"], ["8", "الثامن"], ["9", "التاسع"], ["10", "العاشر"], ["11", "الحادي عشر"], ["12", "الثاني عشر"]];
  const GN = (g) => "الصف " + ((GRADES.find((x) => x[0] === String(g)) || [])[1] || g);
  // الأسعار (تطابق _sub_price في قاعدة البيانات)
  const PR = { rec1: 0.5, recAll: 1, ws: 1, wl: 0.5, book: 1, capGrade: 2, capAll: 5 };
  const ITEMS = { ws: "أوراق العمل والاختبارات الاحترافية", wl: "الاختبارات بترويستك الخاصة", book: "ملزمة الدروس للطباعة" };
  const LR = window.LearnRecords;

  // ---------- تخزين محلي آمن ----------
  const ls = { get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  const rid = () => { const a = new Uint8Array(18); (window.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : a.forEach((_, i) => (a[i] = Math.random() * 256)); return "v" + Array.from(a, (x) => "abcdefghijklmnopqrstuvwxyz0123456789"[x % 36]).join(""); };
  let VID = ls.get("sahm_pub_vid", null); if (!VID) { VID = rid(); ls.set("sahm_pub_vid", VID); }
  let ME = ls.get("sahm_pub_me", null);
  let G = String(ls.get("sahm_hub_g", (ME && ME.grade) || "12"));
  const pkey = () => (G === "12" ? "sahm_pub_prog" : "sahm_pub_prog_g" + G);
  let P = ls.get(pkey(), { q: {}, days: [], diag: {} });
  const save = () => ls.set(pkey(), P);
  function setGrade(g) { G = String(g); ls.set("sahm_hub_g", G); P = ls.get(pkey(), { q: {}, days: [], diag: {} }); if (BD.g !== G) resetBD(); }
  const today = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  const ping = (kind, n) => rpcFetch("public_ping", { p_vid: VID, p_kind: kind, p_n: n || 1 }).catch(() => {});
  const isT = () => ME && ME.role === "teacher";

  // ---------- البيانات ----------
  const D = {};
  const cur = () => D[G] || (D[G] = { idx: null, bank: {}, bk: {} });
  const lessonOf = (code) => cur().idx.lessons.find((l) => l.code === code);
  async function loadIdx() { const c = cur(); if (!c.idx) c.idx = await (await fetch("pub/g" + G + "/index.json?v=4", { cache: "no-cache" })).json(); return c.idx; }
  async function bank(code) { const c = cur(); if (!c.bank[code]) c.bank[code] = await (await fetch("pub/g" + G + "/" + code + ".json?v=4")).json(); return c.bank[code]; }
  async function bkData(code) { const c = cur(); if (!c.bk[code]) c.bk[code] = await (await fetch("pub/g" + G + "/B" + code + ".json?v=4")).json(); return c.bk[code]; }
  let RES = null;
  async function res() { if (!RES) { try { RES = await rpcFetch("public_lessons", {}); } catch (e) { RES = []; } } return RES; }
  const resOf = (l) => (G === "12" && RES ? RES.find((r) => r.u === l.u && r.l === l.l) : null) || {};
  const ytId = (u) => { const m = String(u || "").match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/))([\w-]{11})/); return m ? m[1] : null; };

  // ---------- الاشتراكات ----------
  const has = (g, item) => LR.O.list.some((o) => o.status === "active" && (o.kind === "sub" || o.kind === "book") && (o.grades || []).includes(String(g)) && (o.items || []).includes(item)) ||
    (item === "wl" && LR.wlUnlocked());
  const subGrades = () => [...new Set(LR.O.list.filter((o) => o.status === "active" && (o.kind === "sub" || o.kind === "book")).flatMap((o) => o.grades || []))];
  const until = () => { const a = LR.O.list.filter((o) => o.status === "active" && o.until).map((o) => o.until).sort(); return a[a.length - 1] || ""; };
  function price(grades, items) {
    const recs = items.filter((i) => i.startsWith("rec:")).length;
    const per = Math.min(PR.capGrade, (recs === 0 ? 0 : recs === 1 ? PR.rec1 : PR.recAll) + (items.includes("ws") ? PR.ws : 0) + (items.includes("wl") ? PR.wl : 0) + (items.includes("book") ? PR.book : 0));
    const raw = ((recs === 0 ? 0 : recs === 1 ? PR.rec1 : PR.recAll) + (items.includes("ws") ? PR.ws : 0) + (items.includes("wl") ? PR.wl : 0) + (items.includes("book") ? PR.book : 0)) * grades.length;
    return { total: Math.min(PR.capAll, per * grades.length), raw, per };
  }
  const jd = (v) => (v === 0.5 ? "½" : String(+(+v).toFixed(2)).replace(/\.5$/, "½").replace(/^0½$/, "½"));

  // ---------- التقدّم المحلي ----------
  const qs = (id) => P.q[id] || (P.q[id] = { n: 0, ok: 0, w: 0, fix: 0, last: 0 });
  function record(id, good) {
    const s = qs(id); s.n++; if (good) { s.ok++; if (s.w) s.fix++; } else { s.w = Date.now(); s.fix = 0; } s.last = Date.now();
    const d = today(); if (!P.days.includes(d)) P.days.push(d); P.days = P.days.slice(-120); save();
  }
  const isMistake = (id) => { const s = P.q[id]; return s && s.w && s.fix < 2; };
  function streak() { const set = new Set(P.days); let n = 0, d = new Date(); if (!set.has(today())) d.setDate(d.getDate() - 1);
    for (;;) { const k = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); if (!set.has(k)) break; n++; d.setDate(d.getDate() - 1); } return n; }
  function lessonStat(code) { let n = 0, ok = 0, mk = 0; Object.keys(P.q).forEach((id) => { if (id.startsWith(code + "-")) { n += P.q[id].n; ok += P.q[id].ok; if (isMistake(id)) mk++; } }); return { n, ok, acc: n ? Math.round((ok / n) * 100) : null, mk }; }
  const mistakesAll = () => Object.keys(P.q).filter(isMistake);

  // ---------- مساعدات العرض ----------
  const crumb = (t, s) => `<div class="crumb"><button class="iconbtn" data-go="" aria-label="الرئيسية">${ic("right")}</button><div><h2>${t}</h2>${s ? `<div class="tiny">${s}</div>` : ""}</div></div>`;
  const tbl = (t) => t && t.head ? `<div class="qtb"><table><thead><tr>${t.head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${t.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>` : "";
  const gradeChips = () => `<div class="g-chips" role="tablist" aria-label="الصف">${GRADES.map(([g, n]) => `<button class="g-chip ${g === G ? "on" : ""}" data-grade="${g}" role="tab" aria-selected="${g === G}"><b>${g}</b><span>${n}</span>${isT() && subGrades().includes(g) ? '<i title="مشترك">✓</i>' : ""}</button>`).join("")}</div>`;
  function wire() {
    document.querySelectorAll("[data-go]").forEach((b) => (b.onclick = () => { location.hash = b.dataset.go ? "#/" + b.dataset.go : ""; }));
    document.querySelectorAll("[data-pr]").forEach((b) => (b.onclick = () => practice(b.dataset.pr)));
    document.querySelectorAll("[data-dg]").forEach((b) => (b.onclick = () => diagnostic(+b.dataset.dg)));
    document.querySelectorAll("[data-ws]").forEach((b) => (b.onclick = () => { location.hash = "#/build/" + b.dataset.ws; }));
    document.querySelectorAll("[data-grade]").forEach((b) => (b.onclick = () => { setGrade(b.dataset.grade); route(); }));
  }
  function header() {
    const w = $("lnWho"); if (!ME) { w.classList.add("hide"); $("lnG").classList.add("hide"); return; }
    w.classList.remove("hide"); $("lnName").textContent = firstName(ME.name); $("lnRole").textContent = isT() ? "معلّم" : "طالب";
    $("lnG").classList.remove("hide"); $("lnG").innerHTML = `${ic("layers", "sm")}${GN(G)}`;
  }

  // ===================== الدخول: معلّم أم طالب =====================
  function regScreen() {
    header();
    let role = ME && ME.role === "teacher" ? "teacher" : ME ? "student" : "";
    const draw = () => {
      $("ln").innerHTML = `<section class="hub-hero"><div class="hh-t"><span class="pill gold">الثقافة المالية · الصفوف 7–12 · مناهج المركز الوطني</span>
          <h1>منصة <em>السهم العلمي</em><br>للمعلّم والطالب</h1>
          <p>كل ما يحتاجه معلّم الثقافة المالية في مكان واحد: أوراق عمل واختبارات احترافية بنماذج متعددة، وسجلات رسمية بنتاجات الكتاب، وملزمة لكل درس — ولطالبه: شرح مصمّم، وتدريب ذكي، وتشخيص يخبره من أين يبدأ.</p>
          <div class="hh-stats"><div><b class="num">6</b><span>صفوف</span></div><div><b class="num">63</b><span>درسًا</span></div><div><b class="num">+3100</b><span>سؤال بشرح</span></div><div><b class="num">8</b><span>سجلات رسمية</span></div></div></div>
        <div class="hh-roles"><button class="role-card ${role === "teacher" ? "on" : ""}" data-r="teacher"><span class="rc-i">${ic("key", "lg")}</span><b>أنا معلّم</b><span>أوراق عمل واختبارات وسجلات وملزمة لصفّك</span></button>
          <button class="role-card ${role === "student" ? "on" : ""}" data-r="student"><span class="rc-i">${ic("user", "lg")}</span><b>أنا طالب</b><span>دروسي وتدريب وتشخيص — مجانًا</span></button></div></section>
        ${role ? `<form class="card pad ln-reg" id="rg" novalidate><h3>${role === "teacher" ? "حساب المعلّم" : "حساب الطالب"} — مرة واحدة على هذا الجهاز</h3>
          <div class="fields two"><label class="field"><span>الاسم</span><input class="input" id="rgN" maxlength="60" autocomplete="name" value="${esc((ME && ME.name) || "")}" required></label>
          <label class="field"><span>رقم الهاتف</span><input class="input" id="rgP" inputmode="tel" dir="ltr" maxlength="16" placeholder="07XXXXXXXX" autocomplete="tel" value="${esc((ME && ME.phone) || "")}" required></label></div>
          <div class="fields two"><label class="field"><span>اسم المدرسة</span><input class="input" id="rgS" maxlength="80" value="${esc((ME && ME.school) || "")}" required></label>
          <label class="field"><span>${role === "teacher" ? "الصف الذي تبدأ به" : "صفّك"}</span><select class="input" id="rgG">${GRADES.map(([g, n]) => `<option value="${g}" ${g === G ? "selected" : ""}>الصف ${n}</option>`).join("")}</select></label></div>
          <label class="check" style="margin-top:10px;align-items:flex-start"><input type="checkbox" id="rgC" ${ME ? "checked" : ""}> <span class="tiny">أوافق على حفظ بياناتي لدى «منصة السهم العلمي» واستخدامها للتواصل معي بخصوص خدماتها التعليمية، ولا تُعطى لأي جهة أخرى.</span></label>
          <div id="rgE" class="err hide" role="alert"></div>
          <button class="btn primary block lg" id="rgGo" type="submit">ادخل ${ic("left", "sm")}</button>
          ${role === "teacher" ? `<p class="tiny" style="text-align:center;margin-top:8px">${GRADES.length} صفوف مفتوحة لك للتصفّح والتجربة مجانًا · الاشتراك اختياري ويبدأ من ½ دينار</p>` : ""}</form>` : ""}`;
      document.querySelectorAll(".role-card").forEach((b) => (b.onclick = () => { role = b.dataset.r; draw(); setTimeout(() => $("rgN") && $("rgN").focus(), 50); }));
      if (!$("rg")) return;
      $("rg").onsubmit = async (e) => {
        e.preventDefault(); const err = (m) => { $("rgE").textContent = m; $("rgE").classList.remove("hide"); };
        $("rgE").classList.add("hide");
        const name = $("rgN").value.trim(), phone = $("rgP").value.trim(), school = $("rgS").value.trim(), grade = $("rgG").value;
        if (name.length < 3) return err("اكتب اسمك."); if (school.length < 2) return err("اكتب اسم مدرستك."); if (!$("rgC").checked) return err("يلزم الموافقة للمتابعة.");
        const b = $("rgGo"); spin(b, true, "لحظة…");
        try { const r = await rpcFetch("public_register", { p_vid: VID, p_name: name, p_phone: phone, p_school: school, p_role: role, p_consent: true });
          if (!r.ok) throw new Error(r.error); ME = { name, phone, school, role, grade }; ls.set("sahm_pub_me", ME); ls.set("sahm_pub_open", today()); setGrade(grade); location.hash = ""; route(); }
        catch (x) { spin(b, false); err(x.message); }
      };
    };
    draw();
  }

  // ===================== الرئيسية =====================
  const tile = (go, icon, t, s, badge, cls) => `<button class="tile ${cls || ""}" data-go="${go}"><span class="tl-i">${ic(icon, "lg")}</span><span class="tl-t"><b>${t}</b><span>${s}</span></span>${badge ? `<span class="tl-b">${badge}</span>` : ""}</button>`;
  async function home() {
    await loadIdx(); LR.loadOrders(VID).then(() => {});
    const idx = cur().idx, t = isT();
    let h = `<section class="greet"><div style="position:relative;z-index:1"><h1>أهلًا ${t ? "أستاذ/ة " : ""}${esc(firstName(ME.name))}</h1><div class="sub">${esc(idx.subject)} · ${esc(idx.grade)}</div></div>
      ${t ? "" : (() => { const stk = streak(), mk = mistakesAll().length; return `<div class="kpis sm"><div class="kpi"><b class="num">${stk}</b><span>${stk === 1 ? "يوم" : "أيام"} متتالية</span></div><div class="kpi"><b class="num">${Object.values(P.q).reduce((a, s) => a + s.n, 0)}</b><span>سؤالًا حللته</span></div>
        <div class="kpi"><b class="num">${mk}</b><span>في دفتر أخطائي</span></div><div class="kpi"><b class="num">${Object.keys(P.diag).length}/${idx.units.length}</b><span>تشخيص الوحدات</span></div></div>`; })()}</section>`;
    h += gradeChips();
    if (t) {
      const sg = subGrades(), full = sg.length === 6;
      h += sg.length ? `<div class="sub-ok">${ic("check", "sm")}<span><b>اشتراكك فعّال${until() ? " حتى " + esc(until()) : ""}</b> · الصفوف: ${sg.sort((a, b) => a - b).map((g) => GN(g).replace("الصف ", "")).join("، ")}</span>${full ? "" : `<button class="btn outline sm" data-go="plans">وسّع اشتراكك</button>`}</div>`
        : `<div class="sub-cta"><div class="sc-t"><span class="pill gold">عرض الفصل</span><h3>كل شيء لكل الصفوف بـ <b class="num">5</b> دنانير فقط</h3><p>سجلاتك الثمانية، وأوراق عمل بنماذج متعددة ولكل طالب، واختباراتك بترويستك، وملزمة كل صف — طوال الفصل. أي أقل من 30 قرشًا في الأسبوع.</p></div>
          <div class="sc-b"><button class="btn gold lg" data-go="plans">اشترك الآن</button><span class="tiny">أو اختر ما تحتاجه فقط — يبدأ من ½ دينار</span></div></div>`;
      h += `<div class="tiles">${tile("build", "file", "أوراق العمل والاختبارات", "اسحب أو اختر الأسئلة · مفتاح وجدول مواصفات · نماذج متعددة ولكل طالب · متمايزة", "الأكثر استخدامًا", "hot")}
        ${tile("records", "award", "السجلات الرسمية", "8 سجلات بأسماء طلابك ونتاجات الكتاب حرفيًّا — جاهزة على A4", "")}
        ${tile("lessons", "book", "ملزمة الدروس", "تلخيص بصري لكل درس: مفاهيم ومخططات وخرائط ذهنية — للعرض والطباعة", "")}
        ${tile("diag", "target", "الاختبارات التشخيصية", "اختبار لكل وحدة للطباعة أو لتجربته إلكترونيًّا", "")}
        ${tile("plans", "key", "الاشتراك والأسعار", "اختر الصفوف والخدمات بنفسك · أو كل شيء بـ5 دنانير", sg.length ? "مشترك" : "من ½ دينار", "gold")}
        ${tile("saas", "users", "منصة كاملة لطلابك", "اختبارات إلكترونية محمية ورصد تلقائي للنتاجات وتقارير لكل طالب", "")}</div>`;
      if (!sg.length) h += whyBlock();
      h += unitsBlock(true);
    } else {
      const mk = mistakesAll().length;
      h += `<div class="tiles">${tile("lessons", "book", "دروسي", "شرح مصمّم لكل درس: المفاهيم والمخططات وأهم ما تعلّمته", "")}
        ${tile("smart", "spark", "تدرّب", "10 أسئلة ذكية من الدروس التي تحتاجها أكثر — بشرح فوري", "", "hot")}
        ${tile("diag", "target", "اختبر نفسك", "تشخيص لكل وحدة يرتّب لك خطة المراجعة", "")}
        ${tile("mistakes", "flag", "دفتر أخطائي", mk ? mk + " سؤالًا تحتاج إتقانه" : "فارغ — أحسنت", mk ? String(mk) : "")}
        ${tile("progress", "chart", "تقدّمي", "دقّتك في كل درس وسلسلة أيامك", "")}
        ${tile("plans", "printer", "ملزمتي للطباعة", "ملزمة الصف كاملة بدينار واحد طوال الفصل", has(G, "book") ? "مفعّلة" : "1 دينار", "gold")}</div>`;
      h += unitsBlock(false);
    }
    $("ln").innerHTML = h; wire();
    document.querySelectorAll('.tile[data-go="smart"]').forEach((b) => (b.onclick = () => practice("smart")));
    document.querySelectorAll('.tile[data-go="mistakes"]').forEach((b) => (b.onclick = () => practice("mistakes")));
    document.querySelectorAll('.tile[data-go="saas"]').forEach((b) => (b.onclick = () => window.open(C.WHATSAPP || "#", "_blank", "noopener")));
  }
  function whyBlock() {
    return `<section class="why"><h2>${ic("spark")} ماذا تكسب عندما تشترك؟</h2>
      <div class="why-g">
        <div><span>${ic("clock")}</span><b>ساعات إعداد أقل كل أسبوع</b><p>ورقة عمل أو اختبار بمفتاحه وجدول مواصفاته وربط كل سؤال بنتاجه — في دقيقة، من بنك مبني على الكتاب سؤالًا سؤالًا.</p></div>
        <div><span>${ic("shield")}</span><b>نموذج لكل طالب</b><p>أسئلة وترتيب مختلفان لكل طالب يحدّان من النقل، ومفتاح مجمّع يصحّح به الصفّ كلّه بسرعة.</p></div>
        <div><span>${ic("layers")}</span><b>تعليم متمايز بضغطة</b><p>ثلاث أوراق للنتاج نفسه: داعمة وأساسية ومتقدّمة — تثبت بها التمايز أمام المشرف.</p></div>
        <div><span>${ic("award")}</span><b>سجلاتك الرسمية جاهزة</b><p>التجميعي والتفصيلي وقائمة الشطب والقياس بالأدوات والتقدير اللفظي والحضور والرصد اليومي — بأسماء طلابك وترويسة مدرستك ونتاجات الكتاب حرفيًّا.</p></div>
        <div><span>${ic("file")}</span><b>اختباراتك بترويستك</b><p>الأول والنهائي باسمك ومدرستك والتاريخ الذي تريده، دون اسم المنصة، وبألوان تبقى واضحة بالأبيض والأسود.</p></div>
        <div><span>${ic("book")}</span><b>ملزمة لطلابك</b><p>تلخيص كامل لكل درس بالمخططات والخرائط الذهنية والأمثلة ومسرد المصطلحات — تطبعها وتوزّعها.</p></div></div>
      <table class="cmp-t"><thead><tr><th></th><th>مجانًا</th><th class="pro">مشترك</th></tr></thead><tbody>
        <tr><td>تصفّح كل الصفوف والدروس والملزمة على الشاشة</td><td>✓</td><td class="pro">✓</td></tr>
        <tr><td>ورقة عمل أو اختبار بنموذج واحد (حتى 20 سؤالًا) باسم المنصة</td><td>✓</td><td class="pro">✓</td></tr>
        <tr><td>نماذج متعددة (2–4) أو نموذج لكل طالب بمفتاح مجمّع</td><td>—</td><td class="pro">✓</td></tr>
        <tr><td>أوراق متمايزة بثلاثة مستويات وأكثر من 20 سؤالًا</td><td>—</td><td class="pro">✓</td></tr>
        <tr><td>الاختبار الأول والنهائي بترويستك دون اسم المنصة</td><td>معاينة</td><td class="pro">✓</td></tr>
        <tr><td>السجلات الرسمية الثمانية بأسماء طلابك</td><td>معاينة</td><td class="pro">✓</td></tr>
        <tr><td>طباعة ملزمة الصف كاملة</td><td>معاينة</td><td class="pro">✓</td></tr></tbody></table>
      <div class="why-cta"><button class="btn gold lg" data-go="plans">اشترك بـ5 دنانير لكل شيء</button><span class="tiny">الدفع عبر CliQ · التفعيل بعد التأكد من التحويل · صالح حتى نهاية الفصل</span></div></section>`;
  }
  function unitsBlock(t) {
    const idx = cur().idx;
    return idx.units.map((u) => `<div class="lbl" style="margin:22px 0 8px">الوحدة ${u.seq}: ${esc(u.title)}</div><div class="ln-grid">` +
      idx.lessons.filter((l) => l.u === u.seq).map((l) => { const s = lessonStat(l.code), dr = P.diag[u.seq] && P.diag[u.seq].per[l.code], weak = !t && dr && dr[0] / dr[1] < 0.67;
        return `<div class="card pad ln-l ${weak ? "weak" : ""}"><b>الدرس ${l.l}: ${esc(l.title)}</b><span class="tiny">${t ? l.n + " سؤالًا · صفحات الكتاب " + l.pages[0] + "–" + l.pages[1] : s.n ? `حللت ${s.n} سؤالًا بدقّة ${s.acc}٪` : "لم تتدرّب بعد"}${weak ? " · يحتاج مراجعة" : ""}</span>
          ${!t && s.n ? `<div class="bar" style="margin-top:8px"><i style="width:${s.acc}%"></i></div>` : ""}
          <div class="row wrap" style="margin-top:10px;gap:6px">${t ? `<button class="btn primary sm" data-ws="${l.code}">${ic("printer", "sm")}ورقة عمل</button>` : `<button class="btn primary sm" data-pr="${l.code}">تدرّب</button>`}<button class="btn ghost sm" data-go="lesson/${l.code}">${ic("book", "sm")}${l.bk ? "الملزمة" : "الشرح"}</button></div></div>`; }).join("") +
      (t ? `<div class="card pad ln-l ln-dg"><b>اختبار تشخيصي للوحدة ${u.seq}</b><span class="tiny">أسئلة من كل درس لمعرفة مستوى صفّك</span><div class="row wrap" style="margin-top:10px;gap:6px"><button class="btn outline sm" data-ws="U${u.seq}">${ic("printer", "sm")}اطبعه</button><button class="btn ghost sm" data-dg="${u.seq}">جرّبه</button></div></div>` : "") + "</div>").join("");
  }

  // ===================== الدروس والملزمة =====================
  async function lessonsPage() {
    await loadIdx(); await LR.loadOrders(VID); const idx = cur().idx, any = idx.lessons.some((l) => l.bk);
    let h = crumb(isT() ? "ملزمة الدروس" : "دروسي", GN(G) + " · " + idx.lessons.length + " درسًا") + gradeChips();
    if (any) h += `<div class="bk-print"><span>${ic("printer")}</span><div class="grow"><b>ملزمة ${GN(G)} كاملة</b><span class="tiny">غلاف وفهرس وكل الدروس بالمخططات والخرائط الذهنية ومسرد المصطلحات و«أختبر نفسي» بإجاباتها — A4</span></div>
      <button class="btn ${has(G, "book") ? "primary" : "outline"}" id="bkAll">${has(G, "book") ? "اطبع الملزمة" : "معاينة الملزمة"}</button>${has(G, "book") ? "" : `<button class="btn gold" id="bkBuy">اطبعها بدينار</button>`}</div>`;
    h += idx.units.map((u) => `<div class="lbl" style="margin:20px 0 8px">الوحدة ${u.seq}: ${esc(u.title)}</div><div class="ln-grid">` + idx.lessons.filter((l) => l.u === u.seq).map((l) =>
      `<button class="card pad ln-l lsn" data-go="lesson/${l.code}"><span class="pill">${ic("book", "sm")} الدرس ${l.l}</span><b>${esc(l.title)}</b><span class="tiny">${l.outcomes.length} نتاجات · صفحات الكتاب ${l.pages[0]}–${l.pages[1]}</span></button>`).join("") + "</div>").join("");
    $("ln").innerHTML = h; wire();
    if ($("bkAll")) $("bkAll").onclick = () => printBooklet(!has(G, "book"));
    if ($("bkBuy")) $("bkBuy").onclick = () => buy([G], ["book"], () => lessonsPage());
  }
  async function printBooklet(locked) {
    const idx = cur().idx, ls2 = idx.lessons.filter((l) => l.bk);
    toast("جارٍ تجهيز الملزمة…");
    const items = await Promise.all(ls2.map(async (l) => ({ d: await bkData(l.code), meta: { gradeName: GN(G), unit: l.u, lesson: l.l, unitTitle: (idx.units.find((u) => u.seq === l.u) || {}).title, pages: l.pages } })));
    Booklet.print(items, { gradeName: GN(G), subject: idx.subject, owner: locked ? "" : ME.name }, locked ? "معاينة — اطبع الملزمة كاملة بدينار واحد طوال الفصل" : null);
    if (!locked) ping("sheet");
  }
  async function lessonPage(code) {
    await loadIdx(); const l = lessonOf(code); if (!l) { location.hash = ""; return; }
    const idx = cur().idx, u = idx.units.find((x) => x.seq === l.u), s = lessonStat(code), t = isT();
    const bar = `<div class="lsn-bar"><button class="btn primary sm" data-pr="${code}">${ic("spark", "sm")}تدرّب على الدرس</button>${t ? `<button class="btn outline sm" data-ws="${code}">${ic("printer", "sm")}ورقة عمل</button>` : ""}
      ${l.bk ? `<button class="btn ghost sm" id="bkP">${ic("printer", "sm")}اطبع ملزمة الصف</button>` : ""}<span class="grow"></span>${s.n ? `<span class="tiny">حللت ${s.n} سؤالًا بدقّة ${s.acc}٪</span>` : ""}</div>`;
    $("ln").innerHTML = crumb("الدرس " + l.l + ": " + esc(l.title), "الوحدة " + l.u + " · صفحات الكتاب " + l.pages[0] + "–" + l.pages[1]) + '<div class="card pad tiny">جارٍ التحميل…</div>';
    let h = crumb("الدرس " + l.l + ": " + esc(l.title), GN(G) + " · الوحدة " + l.u + " · صفحات الكتاب " + l.pages[0] + "–" + l.pages[1]) + bar;
    if (l.bk) {
      let d; try { d = await bkData(code); } catch (e) { $("ln").innerHTML = h + '<div class="card pad">تعذّر التحميل — تحقّق من الإنترنت.</div>'; wire(); return; }
      h += Booklet.render(d, { gradeName: GN(G), unit: l.u, lesson: l.l, unitTitle: u && u.title, pages: l.pages }, false);
    } else {
      await res(); const r = resOf(l), yt = ytId(r.video);
      if (yt) { h += `<div class="vid"><iframe src="https://www.youtube-nocookie.com/embed/${yt}" title="فيديو الدرس" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen loading="lazy"></iframe></div>`; ping("video"); }
      else if (r.video) h += `<a class="btn primary" target="_blank" rel="noopener" href="${esc(r.video)}">${ic("video", "sm")}شاهد فيديو الشرح</a>`;
      if (r.summary) h += `<div class="card pad" style="margin-top:14px"><h3 style="font-size:16px;margin-bottom:8px">${ic("book", "sm")} ملخص الدرس</h3><div class="sum">${esc(r.summary)}</div></div>`;
      h += `<div class="card pad" style="margin-top:14px"><h3 style="font-size:16px;margin-bottom:8px">${ic("target", "sm")} نتاجات الدرس</h3><ol class="ln-outs">${l.outcomes.map((o) => `<li>${esc(o)}</li>`).join("")}</ol></div>`;
    }
    h += `<div class="row wrap" style="margin:16px 0 6px;gap:8px">${bar.replace('class="lsn-bar"', 'class="lsn-bar end"').replace('id="bkP"', 'id="bkP2"')}</div>`;
    $("ln").innerHTML = h; wire();
    ["bkP", "bkP2"].forEach((id) => { if ($(id)) $(id).onclick = async () => { await LR.loadOrders(VID); printBooklet(!has(G, "book")); if (!has(G, "book")) setTimeout(() => buy([G], ["book"]), 400); }; });
    window.scrollTo(0, 0);
  }

  // ===================== التقدّم =====================
  async function progressPage() {
    await loadIdx(); const idx = cur().idx, stk = streak();
    let h = crumb("تقدّمي", GN(G)) + `<div class="kpis"><div class="kpi"><b class="num">${stk}</b><span>أيام متتالية</span></div><div class="kpi"><b class="num">${Object.values(P.q).reduce((a, s) => a + s.n, 0)}</b><span>سؤالًا حللته</span></div><div class="kpi"><b class="num">${mistakesAll().length}</b><span>في دفتر أخطائي</span></div></div>`;
    h += idx.units.map((u) => `<div class="lbl" style="margin:18px 0 8px">الوحدة ${u.seq}: ${esc(u.title)}${P.diag[u.seq] ? ` · التشخيص ${P.diag[u.seq].pct}٪` : ""}</div>` + idx.lessons.filter((l) => l.u === u.seq).map((l) => { const s = lessonStat(l.code);
      return `<div class="pg-row"><span class="grow">الدرس ${l.l}: ${esc(l.title)}</span><span class="bar" style="width:140px"><i style="width:${s.acc || 0}%"></i></span><b class="num" style="width:54px;text-align:left">${s.n ? s.acc + "٪" : "—"}</b><button class="btn ghost sm" data-pr="${l.code}">تدرّب</button></div>`; }).join("")).join("");
    $("ln").innerHTML = h; wire();
  }

  // ===================== التدريب (بتصحيح وشرح فوري) =====================
  const DORD = { "سهل": 1, "متوسط": 2, "صعب": 3 };
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  async function pool(what) {
    await loadIdx(); const idx = cur().idx;
    if (what === "mistakes") { const ids = mistakesAll(), codes = [...new Set(ids.map((i) => i.split("-")[0]))].filter((c) => idx.lessons.some((l) => l.code === c)); const all = (await Promise.all(codes.map(bank))).flat(); return all.filter((q) => ids.includes(q.id)); }
    if (what === "smart") {
      const sc = idx.lessons.map((l) => { const s = lessonStat(l.code), dr = Object.values(P.diag).map((d) => d.per[l.code]).find(Boolean);
        const acc = dr ? dr[0] / dr[1] : s.n ? s.acc / 100 : 0.5; return { l, w: (1.2 - acc) * (0.5 + Math.random()) }; }).sort((a, b) => b.w - a.w).slice(0, 3);
      return (await Promise.all(sc.map((x) => bank(x.l.code)))).flat();
    }
    return bank(what);
  }
  const R = { qs: [], i: 0, ok: 0, done: 0, what: "" };
  async function practice(what) {
    let all; try { all = await pool(what); } catch (e) { toast("تعذّر تحميل الأسئلة — تحقّق من الإنترنت", true); return; }
    if (!all.length) { toast(what === "mistakes" ? "دفتر أخطائك فارغ — أحسنت!" : "لا أسئلة"); return; }
    const score = (q) => { const s = P.q[q.id]; return (isMistake(q.id) ? 3 : !s ? 2 : s.ok / s.n < 0.6 ? 1.5 : s.last > Date.now() - 2 * 864e5 ? 0.2 : 0.8) * (0.4 + Math.random()); };
    const pick = all.map((q) => ({ q, s: score(q) })).sort((a, b) => b.s - a.s).slice(0, 10).map((x) => x.q).sort((a, b) => DORD[a.d] - DORD[b.d]);
    Object.assign(R, { qs: pick, i: 0, ok: 0, done: 0, what }); location.hash = "#/practice"; drawQ();
  }
  function drawQ() {
    const q = R.qs[R.i], n = R.qs.length, l = lessonOf(q.id.split("-")[0]);
    const opts = shuffle(q.opts.map((t, k) => ({ t, k })));
    $("ln").innerHTML = `<div class="crumb"><button class="iconbtn" id="pX" aria-label="إنهاء">${ic("x")}</button><div><h2>${R.what === "mistakes" ? "دفتر أخطائي" : "تدريب"} · ${R.i + 1} من ${n}</h2>
        <div class="tiny">الدرس ${l.l}: ${esc(l.title)} · ${esc(q.d)} · صحيح ${R.ok} من ${R.done}</div></div></div>
      <div class="bar" style="margin-bottom:14px"><i style="width:${(R.i / n) * 100}%"></i></div>
      <div class="card pad pq"><div class="stem">${esc(q.s)}</div>${tbl(q.tb)}<div class="opts">${opts.map((o, j) => `<button class="opt" data-k="${o.k}"><span class="L">${L[j]}</span><span class="grow">${esc(o.t)}</span></button>`).join("")}</div><div id="pFb"></div></div>`;
    $("pX").onclick = endPractice;
    document.querySelectorAll(".pq .opt").forEach((b) => (b.onclick = () => answer(+b.dataset.k)));
    calcOn(() => { const nx = document.getElementById("pN"); return { el: document.querySelector("#ln .pq"), label: "تدريب · " + (R.i + 1) + " من " + R.qs.length, next: nx ? () => nx.click() : "off" }; });
  }
  // الآلة الحاسبة العلمية (fx-82MS) بجانب السؤال دون أن تغطيه
  function calcOn(q) { if (window.SahmCalc) window.SahmCalc.attach({ root: $("ln"), q }); }
  function calcOff() { if (window.SahmCalc) window.SahmCalc.detach(); }
  function answer(k) {
    const q = R.qs[R.i], good = k === q.c; R.done++; if (good) R.ok++; record(q.id, good);
    document.querySelectorAll(".pq .opt").forEach((b) => { b.disabled = true; b.classList.add("rvo"); const kk = +b.dataset.k; if (kk === q.c) b.classList.add("is-ok"); if (kk === k && !good) b.classList.add("is-bad"); });
    const last = R.i === R.qs.length - 1;
    $("pFb").innerHTML = `<div class="pfb ${good ? "ok" : "bad"}"><b>${good ? "إجابة صحيحة، أحسنت!" : "إجابة خاطئة — الصحيحة بالأخضر"}</b><p class="ln-e">${esc(q.e)}</p>
      <button class="btn primary" id="pN">${last ? "النتيجة" : "التالي"}${ic("left", "sm")}</button></div>`;
    $("pN").onclick = () => { if (last) endPractice(); else { R.i++; drawQ(); window.scrollTo(0, 0); } }; $("pN").focus();
  }
  function endPractice() {
    calcOff();
    if (R.done) ping("practice", R.done);
    const n = R.done, p = n ? Math.round((R.ok / n) * 100) : 0, mk = mistakesAll().length;
    if (!n) { location.hash = ""; return; }
    $("ln").innerHTML = crumb("نتيجة التدريب") + `<div class="card pad" style="text-align:center"><div class="score-ring" style="--p:${p}"><div><div><b class="num">${R.ok}/${n}</b><span class="tiny">${p}٪</span></div></div></div>
      <p class="muted">${p >= 85 ? "ممتاز! أنت تتقن هذه الأسئلة." : p >= 60 ? "جيد — راجع أخطاءك لترتفع أكثر." : "لا بأس — راجع ملزمة الدرس ثم أعد المحاولة."}</p>
      <div class="row wrap" style="justify-content:center;margin-top:10px;gap:8px"><button class="btn primary" data-pr="${R.what}">تدريب جديد</button>${mk ? `<button class="btn outline" data-pr="mistakes">دفتر أخطائي (${mk})</button>` : ""}<button class="btn ghost" data-go="">الرئيسية</button></div></div>`;
    wire();
  }

  // ===================== الاختبار التشخيصي =====================
  async function diagSet(u, per) {
    await loadIdx(); const ls2 = cur().idx.lessons.filter((l) => l.u === u), k = per || (ls2.length >= 6 ? 2 : 3), out = [];
    for (const l of ls2) { const b = await bank(l.code), by = (d) => shuffle(b.filter((q) => q.d === d));
      const want = k === 2 ? ["سهل", "متوسط"] : ["سهل", "متوسط", "صعب"];
      want.forEach((d) => { const q = by(d).find((x) => !out.includes(x)) || shuffle(b.slice()).find((x) => !out.includes(x)); if (q) out.push(q); }); }
    return out;
  }
  const GD = { u: 0, qs: [], ans: {}, i: 0 };
  async function diagPick() {
    await loadIdx(); const idx = cur().idx;
    $("ln").innerHTML = crumb(isT() ? "الاختبارات التشخيصية" : "اختبر نفسك", GN(G) + " — اختر الوحدة") + gradeChips() + `<div class="ln-grid" style="margin-top:12px">${idx.units.map((u) => { const r = P.diag[u.seq];
      return `<div class="card pad ln-l"><b>الوحدة ${u.seq}: ${esc(u.title)}</b><span class="tiny">${idx.lessons.filter((l) => l.u === u.seq).length} دروس${r ? " · آخر نتيجة " + r.pct + "٪" : ""}</span>
        <div class="row wrap" style="margin-top:10px;gap:6px"><button class="btn primary sm" data-dg="${u.seq}">${isT() ? "جرّبه إلكترونيًّا" : "ابدأ"}</button>${isT() ? `<button class="btn outline sm" data-ws="U${u.seq}">${ic("printer", "sm")}اطبعه لصفّك</button>` : ""}</div></div>`; }).join("")}</div>`;
    wire();
  }
  async function diagnostic(u) {
    let qs2; try { qs2 = await diagSet(u); } catch (e) { toast("تعذّر تحميل الأسئلة", true); return; }
    Object.assign(GD, { u, qs: qs2, ans: {}, i: 0 }); location.hash = "#/diagrun"; drawD();
  }
  function drawD() {
    const q = GD.qs[GD.i], n = GD.qs.length, u = cur().idx.units.find((x) => x.seq === GD.u);
    if (!q.sh) q.sh = shuffle(q.opts.map((t, k) => ({ t, k })));
    $("ln").innerHTML = `<div class="crumb"><button class="iconbtn" data-go="" aria-label="إلغاء">${ic("x")}</button><div><h2>تشخيص الوحدة ${GD.u} · ${GD.i + 1} من ${n}</h2><div class="tiny">${esc(u.title)} — أجب بما تعرفه، والنتيجة في النهاية</div></div></div>
      <div class="bar" style="margin-bottom:14px"><i style="width:${(GD.i / n) * 100}%"></i></div>
      <div class="card pad pq"><div class="stem">${esc(q.s)}</div>${tbl(q.tb)}<div class="opts">${q.sh.map((o, j) => `<button class="opt" data-k="${o.k}" aria-checked="${GD.ans[q.id] === o.k}"><span class="L">${L[j]}</span><span class="grow">${esc(o.t)}</span></button>`).join("")}</div>
      <div class="row sp" style="margin-top:14px"><button class="btn ghost" id="dP" ${GD.i ? "" : "disabled"}>السابق</button><button class="btn ghost" id="dS">لا أعرف</button><button class="btn primary" id="dN">${GD.i === n - 1 ? "النتيجة" : "التالي"}</button></div></div>`;
    wire();
    document.querySelectorAll(".pq .opt").forEach((b) => (b.onclick = () => { GD.ans[q.id] = +b.dataset.k; document.querySelectorAll(".pq .opt").forEach((z) => z.setAttribute("aria-checked", z === b)); }));
    const next = () => { if (GD.i === n - 1) diagResult(); else { GD.i++; drawD(); window.scrollTo(0, 0); } };
    $("dN").onclick = next; $("dS").onclick = () => { delete GD.ans[q.id]; next(); }; $("dP").onclick = () => { GD.i--; drawD(); };
    calcOn(() => ({ el: document.querySelector("#ln .pq"), label: "تشخيص الوحدة " + GD.u + " · " + (GD.i + 1) + " من " + n, prev: GD.i ? () => $("dP").click() : "off", next: () => $("dN").click() }));
  }
  async function diagResult() {
    calcOff();
    const per = {}; let ok = 0;
    GD.qs.forEach((q) => { const c = q.id.split("-")[0], good = GD.ans[q.id] === q.c; per[c] = per[c] || [0, 0]; per[c][1]++; if (good) { per[c][0]++; ok++; } if (GD.ans[q.id] != null) record(q.id, good); });
    const pct = Math.round((ok / GD.qs.length) * 100); P.diag[GD.u] = { at: Date.now(), pct, per }; save(); ping("diag");
    const rows = Object.entries(per).map(([c, [a, n]]) => ({ l: lessonOf(c), a, n, r: a / n })).sort((x, y) => x.r - y.r);
    const lvl = (r) => (r >= 0.67 ? ["متمكّن", "open"] : r >= 0.34 ? ["يحتاج مراجعة", "warn"] : ["ابدأ به أولًا", "bad"]);
    let h = crumb("نتيجة تشخيص الوحدة " + GD.u) + `<div class="card pad" style="text-align:center"><div class="score-ring" style="--p:${pct}"><div><div><b class="num">${ok}/${GD.qs.length}</b><span class="tiny">${pct}٪</span></div></div></div>
      <p class="muted">${pct >= 80 ? "مستواك ممتاز في هذه الوحدة. حافظ عليه بالتدريب." : "هذه خطتك: ابدأ بالدروس الأضعف بالترتيب أدناه."}</p></div>
      <div class="lbl" style="margin:18px 0 8px">خطتك بالترتيب</div>` + rows.map((x, i) => { const [t, c] = lvl(x.r);
        return `<div class="card pad ln-plan" style="margin-bottom:10px"><div class="row sp wrap"><b>${i + 1}. الدرس ${x.l.l}: ${esc(x.l.title)}</b><span class="pill ${c}">${t} · ${x.a}/${x.n}</span></div>
          ${x.r < 0.67 ? `<div class="tiny" style="margin-top:6px">راجع ملزمة الدرس، ثم تدرّب على 10 أسئلة منه حتى تصل دقّتك إلى 80٪ فأكثر.</div>` : ""}
          <div class="row wrap" style="margin-top:8px;gap:6px">${x.r < 0.67 ? `<button class="btn ghost sm" data-go="lesson/${x.l.code}">${ic("book", "sm")}الملزمة</button>` : ""}<button class="btn ${x.r < 0.67 ? "primary" : "outline"} sm" data-pr="${x.l.code}">تدرّب</button></div></div>`; }).join("") +
      `<details class="card pad" style="margin-top:12px"><summary style="cursor:pointer;font-weight:700">مراجعة الإجابات مع الشرح</summary>` + GD.qs.map((q, i) => { const a = GD.ans[q.id], good = a === q.c;
        return `<div class="ln-rv ${good ? "ok" : "bad"}"><div class="tiny">${i + 1}. ${good ? "صحيحة" : a == null ? "لم تُجب" : "خاطئة"}</div><b>${esc(q.s)}</b>${tbl(q.tb)}
          <div class="tiny" style="margin-top:4px">${a != null && !good ? "إجابتك: " + esc(q.opts[a]) + " · " : ""}الصحيحة: <b>${esc(q.opts[q.c])}</b></div><p class="ln-e">${esc(q.e)}</p></div>`; }).join("") + "</details>";
    $("ln").innerHTML = h; wire();
  }

  // ===================== مصمّم ورقة العمل / الاختبار =====================
  const BD = {};
  function resetBD() { Object.assign(BD, { g: G, kind: "worksheet", lessons: [], mode: "random", n: 15, mix: "bal", picked: [], drawn: [], title: "", teacher: "", school: "", duration: "", showOutcome: false, explain: true, fo: "", fd: "", q: "",
    forms: 1, names: "", diff: false, wl: { on: false, exam: "الاختبار الأول" } }); }
  resetBD();
  const MIX = { bal: [0.3, 0.43, 0.27], easy: [0.5, 0.35, 0.15], hard: [0.15, 0.4, 0.45] };
  const LEVELS = [["(أ)", "مستوى داعم", [0.6, 0.3, 0.1]], ["(ب)", "مستوى أساسي", [0.3, 0.45, 0.25]], ["(ج)", "مستوى متقدّم", [0.1, 0.4, 0.5]]];
  const ocOf = (q) => { const l = lessonOf(q.id.split("-")[0]); return { oc: "د" + l.u + "." + l.l + "/ن" + q.o, ot: l.outcomes[q.o - 1] || "", lesson: "الدرس " + l.l + ": " + l.title, l }; };
  function drawSet(n, mx, exclude) {
    n = Math.min(n, BD.lessons.reduce((a, c) => a + cur().bank[c].length, 0));
    const want = { "سهل": Math.round(n * mx[0]), "صعب": Math.round(n * mx[2]) }; want["متوسط"] = n - want["سهل"] - want["صعب"];
    const out = [], byL = {}, ex = exclude || new Set();
    BD.lessons.forEach((c) => (byL[c] = shuffle(cur().bank[c].slice()).sort((a, b) => (ex.has(a.id) ? 1 : 0) - (ex.has(b.id) ? 1 : 0))));
    ["سهل", "متوسط", "صعب"].forEach((d) => { let k = want[d], guard = 0; while (k > 0 && guard++ < 500) { for (const c of BD.lessons) { if (k <= 0) break; const q = byL[c].find((x) => x.d === d && !out.includes(x)); if (q) { out.push(q); k--; } } if (!BD.lessons.some((c) => byL[c].some((x) => x.d === d && !out.includes(x)))) break; } });
    BD.lessons.flatMap((c) => byL[c]).forEach((q) => { if (out.length < n && !out.includes(q)) out.push(q); });
    return out.sort((a, b) => DORD[a.d] - DORD[b.d] || a.id.localeCompare(b.id));
  }
  async function builder(arg) {
    await loadIdx(); await LR.loadOrders(VID); const idx = cur().idx;
    if (BD.g !== G) resetBD();
    if (arg) {
      if (arg.startsWith("U")) { const u = +arg.slice(1); BD.lessons = idx.lessons.filter((l) => l.u === u).map((l) => l.code); BD.kind = "test"; BD.n = Math.min(20, BD.lessons.length * 3); }
      else if (lessonOf(arg)) { BD.lessons = [arg]; BD.kind = "worksheet"; }
      BD.picked = []; BD.drawn = []; BD.title = ""; history.replaceState(null, "", "#/build");
    }
    if (!BD.lessons.length) BD.lessons = [idx.lessons[0].code];
    if (!BD.school && ME) BD.school = ME.school || "";
    if (!BD.teacher && isT()) BD.teacher = ME.name || "";
    await Promise.all(BD.lessons.map(bank));
    const pool = BD.lessons.flatMap((c) => cur().bank[c]), avail = pool.length, pro = has(G, "ws");
    const ls2 = BD.lessons.map(lessonOf);
    const defTitle = (BD.kind === "test" ? "اختبار" : "ورقة عمل") + " — " + (ls2.length === 1 ? "الدرس " + ls2[0].l + ": " + ls2[0].title : ls2.length + " دروس");
    const lockI = pro ? "" : `<span class="pro-tag">${ic("key", "sm")}للمشتركين</span>`;
    let h = crumb("مصمّم أوراق العمل والاختبارات", GN(G) + " — كل سؤال من الكتاب ومربوط بنتاجه") + gradeChips();
    h += `<div class="bd"><aside class="card pad bd-side">
      <div class="lbl">النوع</div><div class="seg" id="bK"><button data-v="worksheet" aria-pressed="${BD.kind === "worksheet"}">${ic("file", "sm")}ورقة عمل</button><button data-v="test" aria-pressed="${BD.kind === "test"}">${ic("award", "sm")}اختبار</button></div>
      <div class="lbl" style="margin-top:14px">الدروس <span class="tiny">(درس أو أكثر)</span></div>
      <div class="bd-ls">${idx.units.map((u) => `<div class="bd-u"><b>الوحدة ${u.seq}: ${esc(u.title)}</b>${idx.lessons.filter((l) => l.u === u.seq).map((l) => `<label class="chip lchip ${BD.lessons.includes(l.code) ? "on" : ""}" title="${esc(l.title)}"><input type="checkbox" class="bL" value="${l.code}" ${BD.lessons.includes(l.code) ? "checked" : ""}>الدرس ${l.l}</label>`).join("")}</div>`).join("")}</div>
      <div class="lbl" style="margin-top:14px">طريقة اختيار الأسئلة</div><div class="seg" id="bM"><button data-v="random" aria-pressed="${BD.mode === "random"}">${ic("spark", "sm")}عشوائي من النظام</button><button data-v="manual" aria-pressed="${BD.mode === "manual"}">${ic("list", "sm")}أختارها بنفسي</button></div>
      ${BD.mode === "random" ? `<div class="fields two" style="margin-top:10px"><label class="field"><span>عدد الأسئلة</span><select class="input" id="bN">${[5, 10, 12, 15, 20, 25, 30, 40, 50].filter((x) => x <= avail).map((x) => `<option value="${x}" ${x === BD.n ? "selected" : ""}>${x}${x > 20 && !pro ? " ★" : ""}</option>`).join("")}</select></label>
        <label class="field"><span>مستوى الصعوبة</span><select class="input" id="bX"><option value="bal" ${BD.mix === "bal" ? "selected" : ""}>متوازن</option><option value="easy" ${BD.mix === "easy" ? "selected" : ""}>أسهل</option><option value="hard" ${BD.mix === "hard" ? "selected" : ""}>أصعب</option></select></label></div>
        <button class="btn primary block" id="bDraw" style="margin-top:10px">${ic("spark", "sm")}اسحب ${BD.drawn.length ? "من جديد" : "الأسئلة"}</button>` : `<p class="tiny" style="margin-top:8px">علّم الأسئلة من القائمة. ترتيبها في الورقة = ترتيب اختيارك.</p>`}
      <div class="probox"><div class="lbl">نماذج الورقة ${lockI}</div>
        <div class="seg sm" id="bF">${[1, 2, 3, 4].map((k) => `<button data-v="${k}" aria-pressed="${BD.forms === k && !BD.diff}">${k === 1 ? "نموذج واحد" : k + " نماذج"}</button>`).join("")}<button data-v="S" aria-pressed="${BD.forms === "S" && !BD.diff}">لكل طالب</button></div>
        ${BD.forms === "S" && !BD.diff ? `<label class="field" style="margin-top:8px"><span>أسماء الطلبة (اسم في كل سطر — الصقها من Excel)</span><textarea class="input" id="bNames" rows="5">${esc(BD.names)}</textarea></label><div class="tiny" id="bNc"></div>` : ""}
        <label class="check" style="margin-top:8px"><input type="checkbox" id="bDf" ${BD.diff ? "checked" : ""}> <span><b>ورقة متمايزة</b> — ثلاث أوراق للدروس نفسها: داعمة وأساسية ومتقدّمة</span></label>
        <p class="tiny" style="margin:6px 0 0">${BD.forms === "S" ? "لكل طالب أسئلة وترتيب مختلفان، والمفتاح المجمّع في آخر الملف." : BD.forms > 1 ? "النماذج مختلفة الأسئلة والترتيب، ولكل نموذج مفتاحه." : "اختر عدة نماذج للحدّ من النقل بين الطلبة."}</p></div>
      <div class="lbl" style="margin-top:16px">بيانات الورقة</div>
      <label class="field"><span>العنوان</span><input class="input" id="bT" value="${esc(BD.title)}" placeholder="${esc(defTitle)}"></label>
      <div class="fields two"><label class="field"><span>المدرسة</span><input class="input" id="bS" value="${esc(BD.school)}"></label><label class="field"><span>المعلّم/ة (اختياري)</span><input class="input" id="bTe" value="${esc(BD.teacher)}"></label></div>
      ${BD.kind === "test" ? `<label class="field"><span>المدة (دقيقة، اختياري)</span><input class="input" id="bDu" inputmode="numeric" value="${esc(BD.duration)}"></label>` : ""}
      ${BD.kind === "test" ? `<div class="wlbox"><label class="check"><input type="checkbox" id="bWL" ${BD.wl.on ? "checked" : ""}> <span><b>ترويستي الخاصة — بدون اسم المنصة</b><span class="tiny" style="display:block">للاختبار الأول والنهائي: اسمك ومدرستك والتاريخ الذي تريده${has(G, "wl") ? " · مفعّلة لك" : " · ½ دينار للصف طوال الفصل"}</span></span></label>
        ${BD.wl.on ? `<div class="fields two" style="margin-top:8px"><label class="field"><span>اسم الاختبار</span><select class="input" id="wE">${["الاختبار الأول", "الاختبار النهائي", "اختبار قصير", "امتحان تجريبي"].map((x) => `<option ${x === BD.wl.exam ? "selected" : ""}>${x}</option>`).join("")}</select></label>
          <label class="field"><span>التاريخ</span><input class="input" id="wT" value="${esc(BD.wl.date || "")}" placeholder="مثال: الأحد 2026/11/2"></label></div>
          <label class="field"><span>المديرية</span><input class="input" id="wD" value="${esc(BD.wl.directorate || "")}" placeholder="لواء وادي السير"></label>
          <div class="fields two"><label class="field"><span>الصف</span><input class="input" id="wG" value="${esc(BD.wl.grade || GN(G).replace("الصف ", ""))}"></label><label class="field"><span>الشعبة</span><input class="input" id="wS" value="${esc(BD.wl.section || "")}"></label></div>
          <div class="fields two"><label class="field"><span>العلامة الكلية</span><input class="input" id="wM" inputmode="numeric" value="${esc(BD.wl.marks || "")}" placeholder="عدد الأسئلة"></label><label class="field"><span>الفصل</span><input class="input" id="wF" value="${esc(BD.wl.term || "الأول 2026/2027")}"></label></div>
          <p class="tiny">المدرسة واسم المعلّم من الخانات أعلاه، والمدة من خانة المدة.</p>` : ""}</div>` : ""}
      <label class="check" style="margin-top:8px"><input type="checkbox" id="bO" ${BD.showOutcome ? "checked" : ""}> إظهار رمز النتاج بجانب كل سؤال في ورقة الطالب</label>
      <label class="check"><input type="checkbox" id="bE" ${BD.explain ? "checked" : ""}> شرح الإجابات في صفحة المفتاح</label>
    </aside><section class="bd-main"><div class="bd-bar"><b id="bCount"></b><span class="grow"></span><button class="btn ghost sm" id="bClr">مسح</button><button class="btn primary" id="bPrint">${ic("printer", "sm")}معاينة وطباعة</button></div><div id="bList"></div></section></div>`;
    $("ln").innerHTML = h; wire();
    const rerender = () => { keep(); builder(); };
    document.querySelectorAll("#bK button").forEach((b) => (b.onclick = () => { BD.kind = b.dataset.v; rerender(); }));
    document.querySelectorAll("#bM button").forEach((b) => (b.onclick = () => { BD.mode = b.dataset.v; rerender(); }));
    document.querySelectorAll("#bF button").forEach((b) => (b.onclick = () => { BD.forms = b.dataset.v === "S" ? "S" : +b.dataset.v; BD.diff = false; rerender(); }));
    if ($("bDf")) $("bDf").onchange = (e) => { BD.diff = e.target.checked; if (BD.diff) BD.forms = 1; rerender(); };
    if ($("bNames")) { const cnt = () => { BD.names = $("bNames").value; const n = LR.parseNames(BD.names).length; $("bNc").textContent = n ? n + " طالبًا = " + n + " نموذجًا" : "الصق الأسماء"; }; $("bNames").oninput = cnt; cnt(); }
    document.querySelectorAll(".bL").forEach((c) => (c.onchange = () => { BD.lessons = [...document.querySelectorAll(".bL:checked")].map((x) => x.value); if (!BD.lessons.length) { c.checked = true; BD.lessons = [c.value]; toast("اختر درسًا واحدًا على الأقل"); }
      BD.drawn = BD.drawn.filter((id) => BD.lessons.includes(id.split("-")[0])); BD.picked = BD.picked.filter((id) => BD.lessons.includes(id.split("-")[0])); rerender(); }));
    const keepWl = () => { if (!$("wE")) return; Object.assign(BD.wl, { exam: $("wE").value, date: $("wT").value.trim(), directorate: $("wD").value.trim(), grade: $("wG").value.trim(), section: $("wS").value.trim(), marks: $("wM").value.replace(/\D/g, ""), term: $("wF").value.trim() }); };
    if ($("bWL")) $("bWL").onchange = (e) => { BD.wl.on = e.target.checked; if (BD.wl.on && isT()) { BD.teacher = BD.teacher || ME.name || ""; BD.school = BD.school || ME.school || ""; } rerender(); };
    ["wE", "wT", "wD", "wG", "wS", "wM", "wF"].forEach((id) => { if ($(id)) $(id).onchange = keepWl; });
    function keep() { if (!$("bT")) return; BD.title = $("bT").value.trim(); BD.school = $("bS").value.trim(); BD.teacher = $("bTe").value.trim(); BD.showOutcome = $("bO").checked; BD.explain = $("bE").checked; if ($("bDu")) BD.duration = $("bDu").value.replace(/\D/g, ""); if ($("bNames")) BD.names = $("bNames").value; keepWl(); }
    ["bT", "bS", "bTe", "bO", "bE", "bDu"].forEach((id) => { if ($(id)) $(id).onchange = keep; });
    if ($("bN")) $("bN").onchange = (e) => { BD.n = +e.target.value; };
    if ($("bX")) $("bX").onchange = (e) => { BD.mix = e.target.value; };
    if ($("bDraw")) $("bDraw").onclick = () => { BD.drawn = drawSet(BD.n, MIX[BD.mix]).map((q) => q.id); listDraw(pool); };
    $("bClr").onclick = () => { if (BD.mode === "random") BD.drawn = []; else BD.picked = []; listDraw(pool); };
    $("bPrint").onclick = () => doPrint(pool, defTitle);
    listDraw(pool);
  }
  function toPrintQ(q, shuf) {
    const m = ocOf(q); let opts = q.opts.slice(), c = q.c;
    if (shuf) { const ord = shuffle([0, 1, 2, 3]); opts = ord.map((k) => q.opts[k]); c = ord.indexOf(q.c); }
    return { s: q.s, opts, c, e: q.e, d: q.d, oc: m.oc, ot: m.ot, lesson: m.lesson, tb: q.tb };
  }
  function doPrint(pool, defTitle) {
    if ($("bT")) { BD.title = $("bT").value.trim(); BD.school = $("bS").value.trim(); BD.teacher = $("bTe").value.trim(); BD.showOutcome = $("bO").checked; BD.explain = $("bE").checked; if ($("bDu")) BD.duration = $("bDu").value.replace(/\D/g, ""); if ($("bNames")) BD.names = $("bNames").value; }
    const ids = BD.mode === "random" ? BD.drawn : BD.picked; if (!ids.length) return toast(BD.mode === "random" ? "اضغط «اسحب الأسئلة» أولًا" : "اختر سؤالًا واحدًا على الأقل", true);
    const by = {}; pool.forEach((q) => (by[q.id] = q)); const base1 = ids.map((id) => by[id]), n = base1.length, idx = cur().idx;
    const names = BD.forms === "S" ? LR.parseNames(BD.names) : [];
    if (BD.forms === "S" && !names.length) return toast("الصق أسماء الطلبة لعمل نموذج لكل طالب", true);
    // بناء النماذج
    let forms;
    if (BD.diff) forms = LEVELS.map(([lab, note, mx], i) => ({ label: "نموذج " + lab, note, questions: (i === 1 && BD.mode === "random" ? base1 : BD.mode === "random" ? drawSet(n, mx) : base1.slice().sort((a, b) => (i === 0 ? DORD[a.d] - DORD[b.d] : DORD[b.d] - DORD[a.d]))).map((q) => toPrintQ(q, false)) }));
    else {
      const k = BD.forms === "S" ? names.length : BD.forms, used = new Set(base1.map((q) => q.id)), AB = ["(أ)", "(ب)", "(ج)", "(د)"];
      forms = Array.from({ length: k }, (_, i) => { let set;
        if (i === 0) set = base1; else if (BD.mode === "random") { set = drawSet(n, MIX[BD.mix], used); set.forEach((q) => used.add(q.id)); set = shuffle(set); } else set = shuffle(base1.slice());
        return { label: BD.forms === "S" ? "" : k > 1 ? "نموذج " + AB[i] : "", student: names[i] || "", questions: set.map((q) => toPrintQ(q, i > 0)) }; });
    }
    const lsN = [...new Set(ids.map((id) => id.split("-")[0]))].map(lessonOf);
    const base = { kind: BD.kind, title: BD.title || defTitle, subtitle: lsN.map((l) => "الدرس " + l.l + ": " + l.title).join(" · "), subject: idx.subject, grade: idx.grade,
      school: BD.school, teacher: BD.teacher, duration: BD.duration, showOutcome: BD.showOutcome, withExplain: BD.explain, forms };
    const needPro = forms.length > 1 || BD.diff || n > 20, pro = has(G, "ws");
    const wlOn = BD.kind === "test" && BD.wl.on;
    if (wlOn && (!BD.teacher || !BD.school)) return toast("اكتب اسم المدرسة واسمك للترويسة الخاصة", true);
    const wl = wlOn ? Object.assign({}, BD.wl, { school: BD.school, teacher: BD.teacher, duration: BD.duration, marks: BD.wl.marks || n }) : null;
    const missing = []; if (needPro && !pro) missing.push("ws"); if (wlOn && !has(G, "wl")) missing.push("wl");
    if (!missing.length) { PrintPro.printPro(Object.assign({}, base, wl ? { wl } : {})); ping("sheet"); return; }
    PrintPro.printPro(Object.assign({}, base, wl ? { wl } : {}, { locked: "معاينة — " + missing.map((m) => ITEMS[m]).join(" و") + " للمشتركين" }));
    setTimeout(() => upsell(missing, () => { PrintPro.printPro(Object.assign({}, base, wl ? { wl } : {})); ping("sheet"); }), 300);
  }
  function listDraw(pool) {
    const by = {}; pool.forEach((q) => (by[q.id] = q));
    const card = (q, sel, idx, swap) => { const m = ocOf(q);
      return `<div class="bq ${sel ? "on" : ""}" data-id="${q.id}">${BD.mode === "manual" ? `<span class="bq-k">${sel ? idx : "＋"}</span>` : `<span class="bq-k">${idx}</span>`}
        <div class="grow"><div class="bq-s">${esc(q.s)}</div>${tbl(q.tb)}<div class="bq-o">${q.opts.map((t, j) => `<span class="${j === q.c ? "ok" : ""}">${L[j]}) ${esc(t)}</span>`).join("")}</div>
          <div class="bq-m"><span class="pill">${esc(m.lesson.split(":")[0])}</span><span class="pill gold" title="${esc(m.ot)}">${esc(m.oc)} · ${esc(m.ot.length > 46 ? m.ot.slice(0, 46) + "…" : m.ot)}</span><span class="pill ${q.d === "سهل" ? "open" : q.d === "صعب" ? "warn" : ""}">${esc(q.d)}</span><span class="pill">${esc(q.b)}</span></div></div>
        ${swap ? `<button class="btn ghost sm bq-sw" title="بدّله بسؤال آخر من الدرس والصعوبة نفسيهما">${ic("refresh", "sm")}</button>` : ""}</div>`; };
    let h = "";
    if (BD.mode === "random") {
      h = BD.drawn.length ? BD.drawn.filter((id) => by[id]).map((id, i) => card(by[id], true, i + 1, true)).join("") : `<div class="card pad empty-b">${ic("spark", "lg")}<b>اختر الدروس والعدد، ثم «اسحب الأسئلة»</b><span class="tiny">ستظهر هنا لتراجعها، ويمكنك تبديل أي سؤال بزر واحد.</span></div>`;
      $("bCount").textContent = BD.drawn.length ? "الأسئلة المسحوبة: " + BD.drawn.length : "";
    } else {
      const outs = [...new Set(pool.map((q) => ocOf(q).oc))];
      const vis = pool.filter((q) => (!BD.fo || ocOf(q).oc === BD.fo) && (!BD.fd || q.d === BD.fd) && (!BD.q || q.s.includes(BD.q)));
      h = `<div class="bd-f"><select class="input sm" id="fO"><option value="">كل النتاجات</option>${outs.map((o) => `<option ${o === BD.fo ? "selected" : ""}>${o}</option>`).join("")}</select>
          <select class="input sm" id="fD"><option value="">كل الصعوبات</option>${["سهل", "متوسط", "صعب"].map((d) => `<option ${d === BD.fd ? "selected" : ""}>${d}</option>`).join("")}</select>
          <input class="input sm grow" id="fQ" placeholder="بحث في نص السؤال" value="${esc(BD.q)}"><button class="btn outline sm" id="fAll">اختر الظاهر (${vis.length})</button></div>` +
        vis.map((q) => { const i = BD.picked.indexOf(q.id); return card(q, i >= 0, i + 1, false); }).join("");
      $("bCount").textContent = "اخترت " + BD.picked.length + " من " + pool.length;
    }
    $("bList").innerHTML = h;
    document.querySelectorAll(".bq").forEach((el) => {
      const id = el.dataset.id;
      if (BD.mode === "manual") el.onclick = () => { const i = BD.picked.indexOf(id); if (i >= 0) BD.picked.splice(i, 1); else BD.picked.push(id); listDraw(pool); };
      const sw = el.querySelector(".bq-sw"); if (sw) sw.onclick = (e) => { e.stopPropagation(); const q = by[id], alt = shuffle(cur().bank[id.split("-")[0]].filter((x) => x.d === q.d && !BD.drawn.includes(x.id)))[0] || shuffle(pool.filter((x) => !BD.drawn.includes(x.id)))[0];
        if (!alt) return toast("لا يوجد بديل متاح"); BD.drawn[BD.drawn.indexOf(id)] = alt.id; listDraw(pool); };
    });
    if ($("fO")) { $("fO").onchange = (e) => { BD.fo = e.target.value; listDraw(pool); }; $("fD").onchange = (e) => { BD.fd = e.target.value; listDraw(pool); };
      $("fQ").onchange = (e) => { BD.q = e.target.value.trim(); listDraw(pool); };
      $("fAll").onclick = () => { pool.filter((q) => (!BD.fo || ocOf(q).oc === BD.fo) && (!BD.fd || q.d === BD.fd) && (!BD.q || q.s.includes(BD.q))).forEach((q) => { if (!BD.picked.includes(q.id)) BD.picked.push(q.id); }); listDraw(pool); }; }
  }

  // ===================== الشراء والترغيب =====================
  function buy(grades, items, onActive) {
    const its = items.slice(), p = price(grades, its);
    const label = !isT() ? "ملزمة " + grades.map(GN).join("، ") : grades.length === 6 && p.total === PR.capAll ? "اشتراك كامل لكل الصفوف" : "اشتراك " + grades.map(GN).join("، ");
    LR.buySheet({ vid: VID, me: ME, kind: isT() ? "sub" : "book", grades, items: its, amount: p.total, label,
      desc: isT() ? describe(grades, its) : "اطبع ملزمة الصف كاملة مرات غير محدودة حتى نهاية الفصل.", onActive: () => { onActive ? onActive() : route(); } });
  }
  function describe(grades, items) {
    const recs = items.filter((i) => i.startsWith("rec:")).map((i) => i.slice(4)), parts = [];
    if (recs.length) parts.push(recs.length >= 2 ? "السجلات الرسمية الثمانية" : "سجل «" + ((LR.REC.find((r) => r[0] === recs[0]) || [])[1] || "") + "»");
    ["ws", "wl", "book"].forEach((k) => { if (items.includes(k)) parts.push(ITEMS[k]); });
    return parts.join(" + ") + " — " + (grades.length === 6 ? "لكل الصفوف" : grades.map(GN).join("، ")) + "، حتى نهاية الفصل.";
  }
  function upsell(missing, onActive) {
    const allP = price(GRADES.map((g) => g[0]), ["ws", "wl", "book", "rec:sum", "rec:det"]).total, one = price([G], missing).total;
    const b = U.openSheet(`<h3>${ic("key", "sm")} هذه الميزة للمشتركين</h3>
      <p class="muted" style="margin:4px 0 12px">${missing.map((m) => "«" + ITEMS[m] + "»").join(" و")} — افتحها لـ${GN(G)} طوال الفصل، أو خذ كل شيء لكل الصفوف.</p>
      <div class="up-g"><button class="up-o" id="upOne"><b class="num">${jd(one)}</b><span>دينار</span><em>${missing.map((m) => ITEMS[m]).join(" + ")}<br>${GN(G)}</em></button>
        <button class="up-o best" id="upAll"><i>الأوفر</i><b class="num">${allP}</b><span>دنانير</span><em>كل شيء لكل الصفوف 7–12<br>سجلات + أوراق عمل + ترويسة + ملزمة</em></button></div>
      <button class="btn ghost block" id="upPl" style="margin-top:10px">اختر بنفسك من صفحة الاشتراكات</button>`);
    b.querySelector("#upOne").onclick = () => { U.closeSheet(); buy([G], missing, onActive); };
    b.querySelector("#upAll").onclick = () => { U.closeSheet(); buy(GRADES.map((g) => g[0]), ["ws", "wl", "book", ...LR.REC.map((r) => "rec:" + r[0])], onActive); };
    b.querySelector("#upPl").onclick = () => { U.closeSheet(); location.hash = "#/plans"; };
  }

  // ===================== صفحة الاشتراكات (مربعات اختيار + سعر حيّ) =====================
  const PL = { grades: null, items: null };
  async function plansPage() {
    await LR.loadOrders(VID, true);
    if (!isT()) return studentPlans();
    if (!PL.grades) { PL.grades = [G]; PL.items = ["ws", "wl", "book", "rec:sum", "rec:det"]; }
    const recSel = PL.items.filter((i) => i.startsWith("rec:"));
    const p = price(PL.grades, PL.items), all = price(GRADES.map((g) => g[0]), ["ws", "wl", "book", "rec:sum", "rec:det"]).total;
    const ord = LR.O.list.filter((o) => o.kind === "sub" || o.kind === "book" || o.kind === "records" || o.kind === "wl");
    let h = crumb("الاشتراك والأسعار", "اختر ما تحتاجه بالضبط — والسعر يُحسب أمامك") + `
      <div class="best-deal"><div><span class="pill gold">الأكثر توفيرًا</span><h2>كل شيء لكل الصفوف 7–12</h2><p>السجلات الثمانية + أوراق العمل والاختبارات الاحترافية + الترويسة الخاصة + ملزمة كل صف — حتى نهاية الفصل.</p></div>
        <div class="bd-p"><b class="num">${all}</b><span>دنانير للفصل</span><button class="btn gold lg" id="plAll">اشترك بكل شيء</button><span class="tiny" style="color:#f6ecd3">بدلًا من <s>${price(GRADES.map((g) => g[0]), ["ws", "wl", "book", "rec:sum", "rec:det"]).raw}</s> دينارًا لو اشتريتها منفردة</span></div></div>
      <div class="pl"><section class="card pad"><h3 class="pl-h">${ic("layers", "sm")} 1. الصفوف</h3>
        <div class="pl-g">${GRADES.map(([g, n]) => `<label class="pl-c ${PL.grades.includes(g) ? "on" : ""}"><input type="checkbox" class="plG" value="${g}" ${PL.grades.includes(g) ? "checked" : ""}><b>${g}</b><span>${n}</span></label>`).join("")}
          <label class="pl-c all ${PL.grades.length === 6 ? "on" : ""}"><input type="checkbox" id="plGA" ${PL.grades.length === 6 ? "checked" : ""}><b>${ic("check", "sm")}</b><span>كل الصفوف</span></label></div>
        <h3 class="pl-h" style="margin-top:18px">${ic("file", "sm")} 2. الأوراق والاختبارات والملزمة <span class="tiny">(للصف الواحد)</span></h3>
        ${[["ws", "أوراق العمل والاختبارات الاحترافية", "نماذج متعددة (2–4) أو نموذج لكل طالب بمفتاح مجمّع · أوراق متمايزة بثلاثة مستويات · حتى 50 سؤالًا", PR.ws],
           ["wl", "الاختبارات بترويستك الخاصة", "الأول والنهائي باسمك ومدرستك وتاريخك، دون اسم المنصة", PR.wl],
           ["book", "ملزمة الدروس للطباعة", "ملزمة الصف كاملة بالمخططات والخرائط الذهنية والمسرد و«أختبر نفسي»", PR.book]].map(([k, t, d, pr]) =>
          `<label class="pl-i ${PL.items.includes(k) ? "on" : ""}"><input type="checkbox" class="plI" value="${k}" ${PL.items.includes(k) ? "checked" : ""}><span class="grow"><b>${t}</b><span class="tiny">${d}</span></span><span class="pl-pr"><b class="num">${jd(pr)}</b> د</span></label>`).join("")}
        <h3 class="pl-h" style="margin-top:18px">${ic("award", "sm")} 3. السجلات الرسمية <span class="tiny">(سجل واحد ½ دينار · سجلان فأكثر = الثمانية كلها بدينار للصف)</span></h3>
        <div class="seg" id="plRm"><button data-v="0" aria-pressed="${recSel.length === 0}">بلا سجلات</button><button data-v="1" aria-pressed="${recSel.length === 1}">سجل واحد · ½</button><button data-v="all" aria-pressed="${recSel.length >= 2}">كل السجلات الثمانية · 1</button></div>
        ${recSel.length === 1 ? `<select class="input" id="plR1" style="margin-top:8px">${LR.REC.map(([k, t]) => `<option value="rec:${k}" ${recSel[0] === "rec:" + k ? "selected" : ""}>${esc(t)}</option>`).join("")}</select>` : ""}
        <div class="pl-recs">${LR.REC.map(([k, t]) => `<span class="pl-r ${recSel.length >= 2 || recSel[0] === "rec:" + k ? "on" : ""}">${recSel.length >= 2 || recSel[0] === "rec:" + k ? "✓ " : ""}${esc(t)}</span>`).join("")}</div></section>
        <aside class="card pad pl-sum"><h3>${ic("key", "sm")} ملخّص اشتراكك</h3>
          <div class="pl-tot"><b class="num">${jd(p.total)}</b><span>دينار</span></div>
          <div class="tiny" style="line-height:1.9">${PL.grades.length ? describe(PL.grades, PL.items.concat(recSel.length >= 2 ? LR.REC.map((r) => "rec:" + r[0]) : [])) : "اختر صفًّا واحدًا على الأقل."}</div>
          ${p.raw > p.total ? `<div class="pl-save">${ic("spark", "sm")} وفّرت ${jd(+(p.raw - p.total).toFixed(2))} دينار بالحد الأقصى للسعر</div>` : ""}
          ${p.total >= 3 && p.total < all && PL.grades.length < 6 ? `<div class="pl-nudge">بإضافة ${jd(+(all - p.total).toFixed(2))} فقط تأخذ <b>كل شيء لكل الصفوف</b>. <button class="btn gold sm" id="plUp">خذ الكل بـ${all}</button></div>` : ""}
          <button class="btn primary block lg" id="plGo" ${PL.grades.length && PL.items.length ? "" : "disabled"}>اشترك الآن · ${jd(p.total)} دينار</button>
          <ul class="pl-f"><li>الدفع عبر CliQ إلى <b dir="ltr">${esc(C.CLIQ || "sahm1990")}</b></li><li>التفعيل بعد التأكد من التحويل، وغالبًا خلال وقت قصير</li><li>صالح حتى نهاية الفصل، على 3 أجهزة لك</li><li>للاستفسار: <a href="https://wa.me/962${String(C.CONTACT_PHONE || "").replace(/^0/, "")}" target="_blank" rel="noopener">واتساب ${esc(C.CONTACT_PHONE || "")}</a></li></ul></aside></div>`;
    if (ord.length) h += `<div class="lbl" style="margin:20px 0 8px">طلباتي واشتراكاتي</div>` + ord.map((o) => `<div class="card pad row sp wrap" style="margin-bottom:8px"><span><b>طلب ${o.no}</b> · ${o.kind === "sub" || o.kind === "book" ? esc(describe(o.grades || [], o.items || [])) : o.kind === "wl" ? "اختبار بترويسة خاصة" : "سجلات " + esc(o.section)}</span>
      <span class="pill ${o.status === "active" ? "open" : o.status === "pending" ? "soon" : ""}">${o.status === "active" ? "مفعّل حتى " + o.until : o.status === "pending" ? "بانتظار التأكيد" : "منتهي"}</span></div>`).join("") +
      `<details class="card pad" style="margin-top:8px"><summary class="tiny" style="cursor:pointer">لديك رمز تفعيل (لجهاز آخر)؟</summary><div class="row" style="margin-top:8px;gap:6px"><input class="input mono" id="plC" inputmode="numeric" maxlength="6" dir="ltr" placeholder="000000"><button class="btn outline" id="plR">تفعيل</button></div></details>`;
    h += whyBlock().replace('<button class="btn gold lg" data-go="plans">اشترك بـ5 دنانير لكل شيء</button>', "");
    $("ln").innerHTML = h; wire();
    const redraw = () => plansPage();
    document.querySelectorAll(".plG").forEach((c) => (c.onchange = () => { PL.grades = [...document.querySelectorAll(".plG:checked")].map((x) => x.value); redraw(); }));
    $("plGA").onchange = (e) => { PL.grades = e.target.checked ? GRADES.map((g) => g[0]) : [G]; redraw(); };
    document.querySelectorAll(".plI").forEach((c) => (c.onchange = () => { PL.items = PL.items.filter((i) => i.startsWith("rec:")).concat([...document.querySelectorAll(".plI:checked")].map((x) => x.value)); redraw(); }));
    document.querySelectorAll("#plRm button").forEach((x) => (x.onclick = () => { const v = x.dataset.v; PL.items = PL.items.filter((i) => !i.startsWith("rec:")).concat(v === "0" ? [] : v === "1" ? ["rec:sum"] : ["rec:sum", "rec:det"]); redraw(); }));
    if ($("plR1")) $("plR1").onchange = (e) => { PL.items = PL.items.filter((i) => !i.startsWith("rec:")).concat([e.target.value]); redraw(); };
    $("plGo").onclick = () => buy(PL.grades, PL.items.concat(recSel.length >= 2 ? LR.REC.map((r) => "rec:" + r[0]) : []).filter((v, i, a) => a.indexOf(v) === i), () => { location.hash = ""; route(); });
    $("plAll").onclick = () => buy(GRADES.map((g) => g[0]), ["ws", "wl", "book", ...LR.REC.map((r) => "rec:" + r[0])], () => { location.hash = ""; route(); });
    if ($("plUp")) $("plUp").onclick = () => $("plAll").click();
    if ($("plR")) $("plR").onclick = redeem;
  }
  async function redeem() {
    try { const r = await rpcFetch("public_order_redeem", { p_vid: VID, p_code: $("plC").value.trim() }); if (!r.ok) throw new Error(r.error); await LR.loadOrders(VID, true); toast("تم التفعيل"); route(); }
    catch (e) { toast(e.message, true); }
  }
  async function studentPlans() {
    const ok = has(G, "book");
    $("ln").innerHTML = crumb("ملزمتي للطباعة", GN(G)) + `<div class="best-deal"><div><span class="pill gold">ملزمة ${GN(G)}</span><h2>اطبع ملزمة صفّك كاملة</h2><p>تلخيص كل دروس الفصل بالمخططات والخرائط الذهنية والأمثلة ومسرد المصطلحات و«أختبر نفسي» بإجاباتها — تطبعها متى شئت حتى نهاية الفصل. عرض الدروس على الشاشة يبقى مجانيًّا دائمًا.</p></div>
      <div class="bd-p"><b class="num">1</b><span>دينار للفصل</span>${ok ? `<button class="btn primary lg" id="spP">اطبع الملزمة</button>` : `<button class="btn gold lg" id="spB">اطلبها الآن</button><button class="btn ghost sm" id="spV">معاينة مجانية</button>`}</div></div>
      <details class="card pad" style="margin-top:12px"><summary class="tiny" style="cursor:pointer">لديك رمز تفعيل؟</summary><div class="row" style="margin-top:8px;gap:6px"><input class="input mono" id="plC" inputmode="numeric" maxlength="6" dir="ltr" placeholder="000000"><button class="btn outline" id="plR">تفعيل</button></div></details>`;
    wire(); await loadIdx();
    if ($("spP")) $("spP").onclick = () => printBooklet(false);
    if ($("spV")) $("spV").onclick = () => printBooklet(true);
    if ($("spB")) $("spB").onclick = () => buy([G], ["book"], () => studentPlans());
    $("plR").onclick = redeem;
  }

  // ===================== السجلات الرسمية بأسماء طلابك =====================
  async function recordsPage() {
    await loadIdx(); await LR.loadOrders(VID, true); const idx = cur().idx;
    const F = ls.get("sahm_pub_rec", {}), mNow = new Date(), ym = F.month || (mNow.getFullYear() + "-" + String(mNow.getMonth() + 1).padStart(2, "0"));
    const sel = F.sel || ["sum"];
    let h = crumb("السجلات الرسمية بأسماء طلابك", GN(G) + " — بنتاجات الكتاب حرفيًّا، فارغة للتعبئة اليدوية، بترويسة مدرستك") + gradeChips() +
      `<div class="rec-promo">${ic("award", "lg")}<div><b>سجلاتك الثمانية لـ${GN(G)} بدينار واحد طوال الفصل — ولكل شعبك</b><span>سجل واحد ½ دينار، أو كل شيء لكل الصفوف بـ5 دنانير. عاين مجانًا بأسماء طلابك، وادفع عند الطباعة فقط عبر CliQ.</span></div></div>
      <div class="bd" style="margin-top:14px"><aside class="card pad bd-side">
        <div class="lbl">بيانات الترويسة</div>
        <label class="field"><span>المديرية</span><input class="input" id="rD" value="${esc(F.directorate || "")}" placeholder="مثال: لواء وادي السير"></label>
        <label class="field"><span>المدرسة</span><input class="input" id="rS" value="${esc(F.school || (ME && ME.school) || "")}"></label>
        <label class="field"><span>المعلّم/ة</span><input class="input" id="rT" value="${esc(F.teacher || (ME && ME.name) || "")}"></label>
        <div class="fields two"><label class="field"><span>الصف</span><input class="input" id="rG" value="${esc(GN(G).replace("الصف ", ""))}"></label><label class="field"><span>الشعبة</span><input class="input" id="rC" value="${esc(F.section || "")}" placeholder="أ"></label></div>
        <label class="field"><span>الفصل والعام</span><input class="input" id="rY" value="${esc(F.term || "الفصل الأول 2026/2027")}"></label>
        <label class="field"><span>شهر كشف الحضور</span><input class="input" type="month" id="rM" value="${ym}"></label>
        <div class="lbl" style="margin-top:12px">أسماء الطلبة</div>
        <textarea class="input" id="rN" rows="9" placeholder="الصق عمود الأسماء من Excel — اسم في كل سطر">${esc((F.names || []).join("\n"))}</textarea>
        <div class="tiny" id="rNc"></div>
      </aside><section class="bd-main"><div class="bd-bar"><b id="rSum"></b><span class="grow"></span><button class="btn outline" id="rPrev">${ic("eye", "sm")}معاينة مجانية</button><button class="btn primary" id="rPrint">${ic("printer", "sm")}اطبع</button></div>
        <div class="rec-list">${LR.REC.map(([k, t, d, o]) => `<label class="rec-c ${sel.includes(k) ? "on" : ""}"><input type="checkbox" class="rK" value="${k}" ${sel.includes(k) ? "checked" : ""}>
          <span class="rec-i">${ic(k === "attendance" ? "cal" : k === "daily" ? "bolt" : k === "verbal" ? "award" : "list")}</span><span class="grow"><b>${t}</b><span class="tiny">${d} · ${o === "l" ? "A4 أفقي" : "A4 عمودي"}</span></span><span class="rec-st"></span></label>`).join("")}</div></section></div>`;
    $("ln").innerHTML = h; wire();
    const ctx = () => ({ idx, g: G, directorate: $("rD").value.trim(), school: $("rS").value.trim(), teacher: $("rT").value.trim(), grade: $("rG").value.trim(), section: $("rC").value.trim(), term: $("rY").value.trim(), month: $("rM").value || ym, names: LR.parseNames($("rN").value) });
    const chosen = () => [...document.querySelectorAll(".rK:checked")].map((c) => c.value);
    const unlocked = (k, names) => has(G, "rec:" + k) || (G === "12" && names.length && LR.recUnlocked(k, names));
    const refresh = () => {
      const c = ctx(), ks = chosen(); ls.set("sahm_pub_rec", { directorate: c.directorate, school: c.school, teacher: c.teacher, section: c.section, term: c.term, month: c.month, names: c.names, sel: ks });
      $("rNc").textContent = c.names.length ? c.names.length + " طالبًا" : "لم تُدخل أسماء بعد";
      document.querySelectorAll(".rec-c").forEach((el) => { const k = el.querySelector("input").value; el.classList.toggle("on", el.querySelector("input").checked);
        el.querySelector(".rec-st").innerHTML = unlocked(k, c.names) ? '<span class="pill open">مفعّل ✓</span>' : ""; });
      const need = ks.filter((k) => !unlocked(k, c.names));
      $("rSum").textContent = ks.length ? (need.length ? `المختار ${ks.length} · الطباعة: ${need.length === 1 ? "½ دينار" : "1 دينار لكل السجلات"} لـ${GN(G)}` : "كل المختار مفعّل — اطبع متى شئت") : "اختر سجلًّا واحدًا على الأقل";
    };
    ["rD", "rS", "rT", "rG", "rC", "rY", "rM", "rN"].forEach((id) => ($(id).oninput = refresh));
    document.querySelectorAll(".rK").forEach((c) => (c.onchange = refresh));
    refresh();
    const valid = () => { const c = ctx(); if (!chosen().length) { toast("اختر سجلًّا واحدًا على الأقل", true); return null; } if (!c.names.length) { toast("الصق أسماء طلابك أولًا", true); return null; } if (!c.section) { toast("اكتب الشعبة", true); return null; } return c; };
    $("rPrev").onclick = () => { const c = valid(); if (!c) return; LR.printRecords(chosen(), c, "نسخة معاينة — اضغط «اطبع» لطباعة النسخة النظيفة"); };
    $("rPrint").onclick = () => { const c = valid(); if (!c) return; const ks = chosen(), need = ks.filter((k) => !unlocked(k, c.names));
      if (!need.length) { LR.printRecords(ks, c, null); ping("sheet"); return; }
      buy([G], need.map((k) => "rec:" + k), () => { recordsPage(); LR.printRecords(ks, ctx(), null); }); };
  }

  // ===================== الموجّه =====================
  function route() {
    if (!ME) { regScreen(); return; }
    header();
    const [k, a] = (location.hash || "").replace("#/", "").split("/");
    if (k === "lesson" && a) return lessonPage(a).catch(() => toast("تعذّر التحميل", true));
    if (k === "lessons") return lessonsPage();
    if (k === "build") return builder(a).catch(() => toast("تعذّر تحميل الأسئلة", true));
    if (k === "records") return recordsPage();
    if (k === "plans") return plansPage();
    if (k === "diag") return diagPick();
    if (k === "progress") return progressPage();
    if ((k === "practice" && !R.qs.length) || (k === "diagrun" && !GD.qs.length)) { location.hash = ""; return; }
    if (k === "practice" || k === "diagrun") return;
    calcOff();
    home().catch(() => ($("ln").innerHTML = '<div class="card pad">تعذّر التحميل — تحقّق من الإنترنت وأعد المحاولة.</div>'));
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", route);
  $("lnHome").onclick = (e) => { e.preventDefault(); location.hash = ""; route(); };
  $("lnWho").onclick = () => regScreen();
  $("lnG").onclick = () => { const b = U.openSheet(`<h3>${ic("layers", "sm")} اختر الصف</h3>${gradeChips()}`); b.querySelectorAll("[data-grade]").forEach((x) => (x.onclick = () => { U.closeSheet(); setGrade(x.dataset.grade); route(); })); };
  if (ME && ls.get("sahm_pub_open", "") !== today()) { ls.set("sahm_pub_open", today()); ping("open"); }
  else if (!ME) ping("open");
  LR.loadOrders(VID).then(() => { if (ME) header(); });
  route();
})();
