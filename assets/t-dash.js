// لوحة القيادة: صورة كاملة عن الصف في شاشة واحدة، وما يحتاج انتباهك الآن
(function () {
  const { esc } = U, S = T.S, B = () => T.brain;

  T.view("dash", {
    title: "لوحة القيادة", secAware: true,
    render(el) {
      const sec = T.sec(), c = B().caps();
      if (!S.sections.length) {
        el.innerHTML = T.empty("users", "ابدأ بإضافة شعبة وطلابها", "كل شيء في المنظومة مبني على الشعب والطلبة.", '<div style="margin-top:14px"><a class="btn primary" href="#people">الطلبة والشعب</a></div>');
        return;
      }
      const sm = B().secSummary(S.sec), hr = new Date().getHours();
      const open = S.exams.filter((e) => e.state === "open"), soon = S.exams.filter((e) => e.state === "scheduled").sort((a, b) => a.starts_at.localeCompare(b.starts_at));
      const todayAtt = S.att.filter((a) => a.on_date === T.today() && sm.studs.some((s) => s.id === a.student_id));
      const absentToday = todayAtt.filter((a) => a.status === "absent").length;
      const alerts = B().alerts();

      let h = `<div class="vhead"><div><h2>${hr < 12 ? "صباح الخير" : "مساء الخير"}، الأستاذ ${esc(U.firstName(S.me.full_name))}</h2>
        <p>${esc(new Intl.DateTimeFormat("ar-JO-u-nu-latn", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Amman" }).format(new Date()))} · الشعبة الحالية: <b>${esc(sec.name)}</b></p></div>
        <div class="toolbar"><a class="btn primary" href="#class">${ic("bolt", "sm")}ابدأ الحصة</a><a class="btn outline" href="#grid">${ic("target", "sm")}رصد النتاجات</a>
        <a class="btn outline" href="#exams">${ic("file", "sm")}اختبار جديد</a></div></div>`;

      h += `<div class="kpi-row">
        <div class="kp">${ic("users")}<b class="num">${sm.studs.length}</b><span>طالبًا في الشعبة</span><small>${sec.n_cred} منهم جاهزون لدخول المنصة</small></div>
        <div class="kp">${ic("target")}<b class="num">${Math.round(sm.coverage * 100)}٪</b><span>تغطية رصد النتاجات</span><div class="meter"><i style="width:${Math.round(sm.coverage * 100)}%"></i></div></div>
        <div class="kp">${ic("award")}<b class="num">${sm.avgSecond != null ? T.nf(sm.avgSecond, 1) : "—"}</b><span>متوسط التقويم الثاني</span><small>من ${T.nf(c.cap2)}</small></div>
        <div class="kp ${sm.risks.length ? "warn" : ""}">${ic("alert")}<b class="num">${sm.risks.length}</b><span>يحتاجون دعمًا</span><small>تحليل الإتقان والغياب والسلوك</small></div>
        <div class="kp">${ic("play")}<b class="num">${open.length}</b><span>اختبار مفتوح الآن</span><small>${soon.length ? "التالي " + U.ago(soon[0].starts_at) : "لا مجدول"}</small></div></div>`;

      h += '<div class="split" style="margin-top:22px"><div>';
      h += `<div class="sect" style="margin-top:0"><h3>${ic("spark", "sm")}يحتاج انتباهك <span class="tiny">${alerts.length ? alerts.length + " بندًا" : ""}</span></h3>`;
      h += alerts.length ? '<div class="alerts">' + alerts.slice(0, 9).map((a) => `<a class="al ${a.lvl}" href="${a.go}" style="text-decoration:none;color:inherit">
          <span class="dot">${ic(a.ic, "sm")}</span><span class="tx">${esc(a.msg)}${a.sub ? `<small>${esc(a.sub)}</small>` : ""}</span><span class="btn sm soft">${esc(a.act)}</span></a>`).join("") + "</div>"
        : T.empty("checkc", "كل شيء على ما يرام", "لا يوجد ما يحتاج تدخّلك الآن.");
      h += "</div>";

      if (open.length) h += `<div class="sect"><h3>${ic("play", "sm")}مفتوح الآن</h3><div class="g2">` + open.map((e) => `<a class="card secard" href="#exam/${e.id}" style="text-decoration:none;color:inherit">
          <div class="row sp"><b style="font-family:var(--f-disp)">${esc(e.title)}</b><span class="pill open">مفتوح</span></div>
          <div class="tiny">سلّم ${e.n_done} من ${e.n_students}${e.n_running ? " · يحلّ الآن " + e.n_running : ""} · يُغلق ${esc(U.ago(e.ends_at))}</div>
          <div class="meter"><i style="width:${e.n_students ? Math.round((e.n_done / e.n_students) * 100) : 0}%"></i></div>
          ${e.mode === "lab" && e.lab_code ? `<div class="row sp"><span class="tiny">رمز الجلسة</span><span class="big-code">${esc(e.lab_code)}</span></div>` : ""}</a>`).join("") + "</div></div>";

      // النتاجات الأضعف
      h += `<div class="sect"><h3>${ic("target", "sm")}خريطة إتقان الشعبة <span class="tiny">متوسط كل نتاج قيس</span></h3>`;
      const measuredOuts = sm.perOut.filter((p) => p.n);
      h += measuredOuts.length ? '<div class="card pad stack">' + measuredOuts.sort((a, b) => a.avg - b.avg).slice(0, 8).map((p) => `<a href="#grid/${p.o.lesson.id}" style="color:inherit;text-decoration:none">
          <div class="row sp" style="font-size:13.5px;align-items:flex-start"><span><span class="lbl-chip">${esc(p.o.label)}</span> ${esc(p.o.text)}</span><b class="num">${T.nf(p.avg, 1)}</b></div>
          <div class="lvstack" style="margin-top:6px">${p.dist.map((n) => `<i style="width:${(n / p.n) * 100}%"></i>`).join("")}</div></a>`).join("") +
          `<p class="tiny">مرتبة من الأضعف. الألوان: مبتدئ · نامٍ · متمكّن · متميّز.</p></div>`
        : T.empty("target", "لم يُرصد أي نتاج بعد لهذه الشعبة", "ابدأ من «رصد النتاجات» أو اعتمد نتائج اختبار إلكتروني.");
      h += "</div></div><div>";

      // اليوم
      h += `<div class="card pad"><h3 style="font-size:15.5px;margin-bottom:10px">${ic("cal", "sm")} اليوم في «${esc(sec.name)}»</h3>
        <div class="stats-inline"><span>الحضور: <b>${todayAtt.length ? (sm.studs.length - absentToday) + "/" + sm.studs.length : "لم يُسجَّل"}</b></span>
        <span>غياب: <b>${absentToday}</b></span><span>أحداث الرصد اليومي: <b>${S.events.filter((e) => e.on_date === T.today() && sm.studs.some((s) => s.id === e.student_id)).length}</b></span></div>
        <a class="btn soft block" href="#class" style="margin-top:12px">${ic("bolt", "sm")}الحصة الآن</a></div>`;

      // يحتاجون دعمًا
      h += `<div class="sect"><h3>${ic("user", "sm")}يحتاجون دعمًا</h3>`;
      h += sm.risks.length ? '<div class="risk">' + sm.risks.slice(0, 6).map((x) => `<a class="rk" href="#student/${x.st.id}" style="text-decoration:none;color:inherit">
          <span class="avatar">${esc(U.firstName(x.st.full_name).slice(0, 1))}</span><span><b style="font-size:14px">${esc(x.st.full_name)}</b><div class="why">${esc(x.why.join(" · "))}</div></span>
          <span class="scorepill">${x.score}</span></a>`).join("") + "</div>"
        : '<div class="card pad tiny">لا يوجد طالب في دائرة الخطر حسب البيانات الحالية.</div>';
      h += "</div>";

      // الشعب
      h += `<div class="sect"><h3>${ic("users", "sm")}الشعب</h3><div class="stack">` + S.sections.map((s) => {
        const x = B().secSummary(s.id);
        return `<button class="card secard" data-sec="${s.id}" style="${s.id === S.sec ? "border-color:var(--accent)" : ""}"><div class="hd"><span class="av">${esc(s.name.trim().slice(0, 2))}</span>
          <div class="grow"><b>${esc(s.name)}</b><div class="tiny">${x.studs.length} طالبًا · ${s.n_cred} جاهز للدخول</div></div></div>
          <div class="row3"><span><b class="num">${Math.round(x.coverage * 100)}٪</b>تغطية</span><span><b class="num">${x.avgSecond != null ? T.nf(x.avgSecond, 1) : "—"}</b>التقويم الثاني</span><span><b class="num">${x.risks.length}</b>يحتاج دعمًا</span></div></button>`;
      }).join("") + "</div></div>";

      if (soon.length) h += `<div class="sect"><h3>${ic("clock", "sm")}مجدولة</h3><div class="card list">` + soon.slice(0, 5).map((e) => `<a class="li" href="#exam/${e.id}" style="color:inherit;text-decoration:none">
          <div><b>${esc(e.title)}</b><div class="tiny">${esc(U.fmtDT(e.starts_at))}</div></div><span class="pill scheduled">${esc(U.ago(e.starts_at))}</span></a>`).join("") + "</div></div>";
      h += "</div></div>";
      el.innerHTML = h;
      el.querySelectorAll("[data-sec]").forEach((b) => (b.onclick = () => { S.sec = b.dataset.sec; try { localStorage.setItem("sahm_t_sec", S.sec); } catch (e) {} T.route(); }));
    }
  });
})();
