// الحصة الآن: الحضور والغياب + الرصد اليومي (مشاركة/سلوك) + اختيار طالب عشوائي — بلمسة واحدة
(function () {
  const { esc, toast } = U, S = T.S;
  const CS = { mode: "att", date: null, period: 1, sel: new Set() };
  const CYCLE = ["present", "absent", "late", "excused"];

  T.view("class", {
    title: "الحصة الآن", secAware: true, sub: () => "الحضور والرصد اليومي — سجل تربوي لا يدخل في العلامة الرسمية",
    render(el) {
      if (!T.sec()) { el.innerHTML = T.empty("users", "لا توجد شعب بعد", "", '<a class="btn primary" href="#people" style="margin-top:12px">أضف شعبة</a>'); return; }
      CS.date = CS.date || T.today();
      const studs = T.studentsOf(S.sec);
      let h = `<div class="vhead"><div><div class="seg" id="cMode">
          <button data-m="att" aria-pressed="${CS.mode === "att"}">${ic("checkc", "sm")}الحضور والغياب</button>
          <button data-m="ev" aria-pressed="${CS.mode === "ev"}">${ic("bolt", "sm")}الرصد اليومي</button></div></div>
        <div class="toolbar"><input type="date" class="input sm" id="cDate" value="${CS.date}" style="width:auto">
          <select class="input sm" id="cPer" style="width:auto">${T.opt(CS.period, [1, 2, 3, 4, 5, 6, 7].map((n) => [n, "الحصة " + ["الأولى", "الثانية", "الثالثة", "الرابعة", "الخامسة", "السادسة", "السابعة"][n - 1]]))}</select>
          <button class="btn outline sm" id="cRand">${ic("spark", "sm")}طالب عشوائي</button><button class="btn outline sm" id="cGroups">${ic("users", "sm")}مجموعات متمايزة</button><button class="btn outline sm" id="cPrintDay">${ic("printer", "sm")}ورقة الرصد اليومي</button></div></div>`;
      if (!studs.length) { el.innerHTML = h + T.empty("users", "لا طلبة في هذه الشعبة", "", '<a class="btn primary" href="#people" style="margin-top:12px">أضف الطلبة</a>'); wireTop(el); return; }
      h += CS.mode === "att" ? attHtml(studs) : evHtml(studs);
      el.innerHTML = h; wireTop(el);
      CS.mode === "att" ? wireAtt(el, studs) : wireEv(el, studs);
    }
  });

  // ---------- التعليم المتمايز داخل الحصة: ثلاث مجموعات حسب آخر معدل، ولكل مجموعة نشاط من البنك بمستواها ----------
  async function groupsSheet() {
    const [tiers] = await Promise.all([T.loadTiers(S.sec, true), T.loadQuestions()]);
    const studs = T.studentsOf(S.sec), G = { S: [], C: [], E: [] };
    studs.forEach((s) => G[(tiers[s.id] || {}).tier || "C"].push(s));
    const lessons = T.semUnits(S.sec).flatMap((u) => u.lessons);
    const lastL = (() => { const ids = new Set(studs.map((s) => s.id)); const m = S.mastery.filter((x) => ids.has(x.student_id)).sort((a, b) => (b.assessed_on || "").localeCompare(a.assessed_on || ""))[0];
      return m && S.O[m.outcome_id] ? S.O[m.outcome_id].lesson.id : (lessons[0] || {}).id; })();
    const MIX = { S: ["سهل", "سهل", "متوسط", "متوسط"], C: ["سهل", "متوسط", "متوسط", "صعب"], E: ["متوسط", "صعب", "صعب", "صعب"] };
    const pickFor = (lid, t) => { const used = new Set(); return MIX[t].map((d) => { const pool = S.qs.filter((q) => q.active && S.O[q.outcome_id] && S.O[q.outcome_id].lesson.id === lid && q.difficulty === d && !used.has(q.id));
      const q = pool[Math.floor(Math.random() * pool.length)]; if (q) used.add(q.id); return q; }).filter(Boolean); };
    const b = U.openSheet(`<h3>مجموعات متمايزة — ${esc(T.sec().name)}</h3>
      <p class="tiny">المجموعات من آخر معدل لكل طالب (آخر ١٠ تقييمات، الأحدث أثقل) وتتحدّث تلقائيًّا. لكل مجموعة نشاط من بنك الأسئلة بمستواها، يقيس النتاجات نفسها.</p>
      <label class="field"><span>الدرس</span><select class="input" id="gL">${T.opt(lastL, lessons.map((l) => [l.id, "و" + l.unit.seq + " · الدرس " + l.seq + " · " + l.title]))}</select></label>
      <div id="gBox" style="margin-top:12px"></div>
      <div class="foot"><button class="btn primary grow" id="gPrint">${ic("printer", "sm")}طباعة بطاقات المجموعات</button><button class="btn outline" id="gNew">أسئلة أخرى</button></div>`, true);
    let cur = {};
    const draw = () => { const lid = b.querySelector("#gL").value; cur = { S: pickFor(lid, "S"), C: pickFor(lid, "C"), E: pickFor(lid, "E") };
      b.querySelector("#gBox").innerHTML = '<div class="dgroups">' + ["S", "C", "E"].map((t) => `<div class="card pad"><h4>${T.TIER[t].sym} مجموعة ${T.TIER[t].n} <span class="tiny">(${G[t].length})</span></h4>
        <div class="tiny" style="margin-bottom:6px">${G[t].map((s) => esc(s.full_name.split(" ").slice(0, 2).join(" "))).join("، ") || "—"}</div>
        <ol class="tiny" style="padding-inline-start:18px;margin:0">${cur[t].map((q) => `<li style="margin-bottom:4px;white-space:pre-line">${esc(q.stem)} <span class="pill">${esc(q.difficulty)}</span></li>`).join("") || "<li>لا أسئلة كافية لهذا الدرس في البنك</li>"}</ol></div>`).join("") + "</div>"; };
    b.querySelector("#gL").onchange = draw; b.querySelector("#gNew").onclick = draw; draw();
    b.querySelector("#gPrint").onclick = () => { const L = ["أ", "ب", "ج", "د"], les = S.L[b.querySelector("#gL").value];
      const html = ["S", "C", "E"].map((t) => `<div class="doc" style="font-family:'IBM Plex Sans Arabic',Arial;font-size:13px"><h2 style="font-family:Amiri,serif;margin:0 0 4px">نشاط المجموعة ${T.TIER[t].sym}</h2>
        <div style="color:#475569;margin-bottom:8px">${esc(S.subject.name || "")} — ${esc(les ? "الدرس " + les.seq + ": " + les.title : "")} — ${esc(T.sec().name)}</div>
        <div style="border:1px solid #cbd5e1;border-radius:8px;padding:6px 10px;margin-bottom:10px">أفراد المجموعة: ${G[t].map((s) => esc(s.full_name)).join("، ")}</div>
        <ol>${cur[t].map((q) => `<li style="margin-bottom:10px;break-inside:avoid"><div style="font-weight:600;white-space:pre-line">${esc(q.stem)}</div>${q.options.map((o, i) => `<div style="white-space:pre-line">${L[i]}) ${esc(o)}</div>`).join("")}</li>`).join("")}</ol></div>`).join("");
      T.printDoc("مجموعات متمايزة — " + T.sec().name, html, "portrait"); };
  }

  function wireTop(el) {
    el.querySelector("#cPrintDay").onclick = () => T.forms.dailyDialog();
    el.querySelector("#cGroups").onclick = () => groupsSheet().catch((e) => toast(e.message, true));
    el.querySelectorAll("#cMode button").forEach((b) => (b.onclick = () => { CS.mode = b.dataset.m; T.route(); }));
    el.querySelector("#cDate").onchange = (e) => { CS.date = e.target.value || T.today(); T.route(); };
    el.querySelector("#cPer").onchange = (e) => { CS.period = +e.target.value; };
    el.querySelector("#cRand").onclick = () => {
      const studs = T.studentsOf(S.sec).filter((s) => { const a = attOf(s.id); return !a || a.status === "present" || a.status === "late"; });
      if (!studs.length) return toast("لا طلبة حاضرون", true);
      const cards = [...el.querySelectorAll(".sc")]; let i = 0, n = 14 + Math.floor(Math.random() * 8);
      const pick = studs[Math.floor(Math.random() * studs.length)];
      const spinT = setInterval(() => {
        cards.forEach((c) => c.classList.remove("sel"));
        const c = cards[i++ % cards.length]; if (c) c.classList.add("sel");
        if (i > n) { clearInterval(spinT); cards.forEach((c) => c.classList.toggle("sel", c.dataset.s === pick.id));
          const card = el.querySelector(`.sc[data-s="${pick.id}"]`); if (card) card.scrollIntoView({ behavior: "smooth", block: "center" });
          toast("الطالب: " + pick.full_name); if (CS.mode === "ev") { CS.sel = new Set([pick.id]); setTimeout(() => T.route(), 1200); } }
      }, 70);
    };
  }
  const attOf = (sid) => S.att.find((a) => a.student_id === sid && a.on_date === CS.date);

  // ---------- الحضور ----------
  function attHtml(studs) {
    const cnt = { present: 0, absent: 0, late: 0, excused: 0, none: 0 };
    studs.forEach((s) => { const a = attOf(s.id); cnt[a ? a.status : "none"]++; });
    return `<div class="card pad" style="margin-bottom:14px"><div class="row sp wrap">
        <div class="stats-inline"><span>حاضر <b>${cnt.present}</b></span><span>غائب <b style="color:var(--danger)">${cnt.absent}</b></span>
        <span>متأخر <b style="color:var(--warn)">${cnt.late}</b></span><span>بعذر <b>${cnt.excused}</b></span><span>لم يُسجَّل <b>${cnt.none}</b></span></div>
        <div class="toolbar"><button class="btn primary sm" id="aAll">${ic("check", "sm")}الباقون حاضرون</button><button class="btn ghost sm" id="aClear">مسح اليوم</button></div></div>
        <p class="tiny" style="margin-top:8px">اضغط بطاقة الطالب لتبديل حالته: حاضر ← غائب ← متأخر ← غائب بعذر. يُحفظ فورًا.</p></div>
      <div class="cgrid">` + studs.map((s) => { const a = attOf(s.id), st = a ? a.status : "";
        return `<button class="sc ${st}" data-s="${s.id}"><span class="no">${s.serial_no}</span><span class="nm">${esc(s.full_name)}</span><span class="st">${st ? T.ATT[st] : "—"}</span></button>`; }).join("") + "</div>";
  }
  function wireAtt(el, studs) {
    const saveT = {};
    el.querySelectorAll(".sc").forEach((b) => (b.onclick = () => {
      const sid = b.dataset.s, a = attOf(sid), cur = a ? a.status : null;
      const next = CYCLE[(CYCLE.indexOf(cur) + 1) % CYCLE.length];
      b.className = "sc " + next; b.querySelector(".st").textContent = T.ATT[next];
      if (a) a.status = next; else S.att.push({ student_id: sid, on_date: CS.date, status: next, _tmp: true });
      clearTimeout(saveT[sid]);
      saveT[sid] = setTimeout(() => T.W.setAttendance([{ student_id: sid, on_date: CS.date, status: next }]).then(() => { S.att = S.att.filter((x) => !x._tmp || x.student_id !== sid); refreshCounts(el, studs); })
        .catch((e) => toast(e.message, true)), 350);
    }));
    el.querySelector("#aAll").onclick = async () => {
      const rows = studs.filter((s) => !attOf(s.id)).map((s) => ({ student_id: s.id, on_date: CS.date, status: "present" }));
      if (!rows.length) return toast("سُجّل الجميع");
      try { await T.W.setAttendance(rows); toast("سُجّل " + rows.length + " حاضرًا"); T.route(); } catch (e) { toast(e.message, true); }
    };
    el.querySelector("#aClear").onclick = async () => {
      if (!(await U.confirmSheet("مسح حضور اليوم؟", "يُمسح تسجيل الحضور لهذه الشعبة في " + T.fmtD(CS.date) + ".", "امسح", true))) return;
      try { await T.W.setAttendance(studs.filter((s) => attOf(s.id)).map((s) => ({ student_id: s.id, on_date: CS.date, status: null }))); T.route(); } catch (e) { toast(e.message, true); }
    };
  }
  function refreshCounts(el) { if (T.S.cur === "class" && CS.mode === "att") { const y = window.scrollY; T.route(); window.scrollTo(0, y); } }

  // ---------- الرصد اليومي ----------
  const evToday = (sid) => S.events.filter((e) => e.student_id === sid && e.on_date === CS.date);
  const net = (sid) => evToday(sid).reduce((a, e) => { const t = S.eventTypes.find((x) => x.id === e.event_type_id); return a + (t ? t.direction * +t.weight : 0); }, 0);
  function evHtml(studs) {
    const ids = new Set(studs.map((s) => s.id));
    CS.sel = new Set([...CS.sel].filter((x) => ids.has(x)));
    const log = S.events.filter((e) => e.on_date === CS.date && ids.has(e.student_id)).sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
    const pos = S.eventTypes.filter((e) => e.direction > 0), neg = S.eventTypes.filter((e) => e.direction < 0);
    return `<div class="row sp wrap" style="margin-bottom:10px"><div class="tiny">١) اختر طالبًا أو أكثر &nbsp; ٢) اضغط الحدث من اللوحة السفلية — يُسجَّل للجميع دفعة واحدة.</div>
        <div class="toolbar"><button class="btn ghost sm" id="eAll">تحديد الكل</button><button class="btn ghost sm" id="eNone">إلغاء التحديد</button></div></div>
      <div class="cgrid">` + studs.map((s) => { const n = net(s.id), a = attOf(s.id);
        return `<button class="sc ${CS.sel.has(s.id) ? "sel" : ""}" data-s="${s.id}" ${a && a.status === "absent" ? 'style="opacity:.45"' : ""}><span class="no">${s.serial_no}${a && a.status === "absent" ? " · غائب" : ""}</span>
          <span class="nm">${esc(s.full_name)}</span>${n ? `<span class="pts ${n > 0 ? "pos" : "neg"}">${n > 0 ? "+" : ""}${T.nf(n, 1)}</span>` : ""}</button>`; }).join("") + `</div>
      <div class="dock"><div class="row sp" style="margin-bottom:10px"><b id="eSelTxt">${CS.sel.size ? "المحدَّدون: " + CS.sel.size : "لم تحدّد طالبًا"}</b><span class="tiny">الحصة ${CS.period}</span></div>
        <div class="evgrid">${pos.map(evBtn).join("")}</div><div class="evgrid" style="margin-top:8px">${neg.map(evBtn).join("")}</div></div>
      <div class="sect"><h3>${ic("list", "sm")}سجل ${CS.date === T.today() ? "اليوم" : T.fmtD(CS.date)} <span class="tiny">${log.length} حدثًا</span></h3>
        <div class="card pad log">${log.length ? log.map((e) => { const st = S.stu[e.student_id], t = S.eventTypes.find((x) => x.id === e.event_type_id) || {};
          return `<div class="lr"><span style="font-size:18px">${esc(t.icon || "•")}</span><span class="grow"><b>${esc(st ? st.full_name : "")}</b> — ${esc(t.label || "")} <span class="tiny">· الحصة ${e.period || "—"}</span></span>
            <button class="btn sm ghost" data-del="${e.id}">تراجع</button></div>`; }).join("") : '<p class="tiny" style="margin:0">لا أحداث بعد.</p>'}</div></div>`;
  }
  const evBtn = (e) => `<button class="evb ${e.direction > 0 ? "pos" : "neg"}" data-ev="${e.id}"><span class="e">${esc(e.icon || "•")}</span>${esc(e.label)}</button>`;
  function wireEv(el, studs) {
    const upd = () => { el.querySelector("#eSelTxt").textContent = CS.sel.size ? "المحدَّدون: " + CS.sel.size : "لم تحدّد طالبًا"; };
    el.querySelectorAll(".sc").forEach((b) => (b.onclick = () => { const id = b.dataset.s; CS.sel.has(id) ? CS.sel.delete(id) : CS.sel.add(id); b.classList.toggle("sel"); upd(); }));
    el.querySelector("#eAll").onclick = () => { studs.forEach((s) => CS.sel.add(s.id)); T.route(); };
    el.querySelector("#eNone").onclick = () => { CS.sel.clear(); T.route(); };
    el.querySelectorAll("[data-ev]").forEach((b) => (b.onclick = async () => {
      if (!CS.sel.size) return toast("اختر طالبًا أولًا", true);
      const t = S.eventTypes.find((x) => x.id === b.dataset.ev);
      try {
        await T.W.addEvents([...CS.sel].map((sid) => ({ student_id: sid, event_type_id: t.id, on_date: CS.date, period: CS.period })));
        toast(t.label + " · سُجّل لـ " + CS.sel.size); CS.sel.clear();
        const y = window.scrollY; T.route(); window.scrollTo(0, y);
      } catch (e) { toast(e.message, true); }
    }));
    el.querySelectorAll("[data-del]").forEach((b) => (b.onclick = async () => {
      try { await T.W.delEvent(b.dataset.del); const y = window.scrollY; T.route(); window.scrollTo(0, y); } catch (e) { toast(e.message, true); }
    }));
  }
})();
