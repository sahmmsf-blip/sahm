// الطلبة والشعب: إدارة كاملة (إضافة/تعديل/نقل/حذف/أرشفة، بيانات الدخول) + ملف الطالب الشامل وتقريره
(function () {
  const { esc, toast, openSheet, closeSheet, confirmSheet, digits } = U, S = T.S, B = () => T.brain;

  T.view("people", {
    title: "الطلبة والشعب", secAware: true, sub: () => "يدخل الطالب إلى صفحته برقمه الوطني وتاريخ ميلاده",
    render(el) {
      if (!S.sections.length) {
        el.innerHTML = T.empty("users", "لا توجد شعب بعد", "أنشئ أول شعبة ثم أضف طلابها أو الصقهم من إكسل.", '<button class="btn primary" id="pSecNew" style="margin-top:12px">＋ شعبة جديدة</button>');
        el.querySelector("#pSecNew").onclick = () => sectionSheet(null); return;
      }
      const sec = T.sec(), all = T.studentsOf(S.sec, true), active = all.filter((s) => s.is_active), arch = all.filter((s) => !s.is_active);
      const ready = active.filter((s) => s.national_id && s.birth_date).length;
      const secOpts = T.opt(S.sec, S.sections.map((s) => [s.id, s.name]));
      let h = `<div class="vhead"><div><h2>${esc(sec.name)}</h2><p>${active.length} طالبًا · ${ready} جاهز لدخول المنصة${active.length - ready ? ` · <b style="color:var(--danger)">${active.length - ready} بلا رقم وطني أو تاريخ ميلاد</b>` : ""}</p></div>
        <div class="toolbar"><button class="btn outline sm" id="pSecNew">＋ شعبة</button><button class="btn outline sm" id="pSecRen">تسمية الشعبة</button>
          <button class="btn outline sm" id="pCards">${ic("printer", "sm")}بطاقات الدخول</button></div></div>
        <div class="card pad" style="margin-bottom:12px"><div class="row wrap"><button class="btn outline" id="pAdd">＋ طالب</button><button class="btn outline" id="pPaste">${ic("file", "sm")}لصق من إكسل</button>
          <button class="btn primary" id="pSave">${ic("check", "sm")}حفظ التعديلات</button><span class="tiny" id="pDirty"></span></div>
          <p class="tiny" style="margin-top:8px">عدّل مباشرة في الجدول ثم «حفظ». لنقل طالب لشعبة أخرى غيّر عمود الشعبة. الحذف يؤرشف من له سجلات حفاظًا على الأدلة.</p></div>
        <div class="tw"><table class="t" id="pT"><thead><tr><th class="num">م</th><th>اسم الطالب</th><th>الرقم الوطني</th><th>تاريخ الميلاد</th><th>الشعبة</th><th class="num">الحالة</th><th></th></tr></thead><tbody>` +
        active.map((s) => row(s, secOpts)).join("") + "</tbody></table></div>";
      if (arch.length) h += `<details class="card pad" style="margin-top:12px"><summary style="cursor:pointer;font-weight:700">الطلبة المؤرشفون (${arch.length})</summary>
        <p class="tiny">حُذفوا ولهم سجلات، فحُفظت سجلاتهم كدليل ولا يظهرون في الكشوف.</p>` +
        arch.map((s) => `<div class="row sp" style="padding:7px 0;border-bottom:1px solid var(--line)"><span>${s.serial_no} · ${esc(s.full_name)}</span><button class="btn sm outline" data-restore="${s.id}">استرجاع</button></div>`).join("") + "</details>";
      el.innerHTML = h;
      const dirty = () => (el.querySelector("#pDirty").textContent = "• توجد تعديلات غير محفوظة");
      const wire = (root) => {
        root.querySelectorAll(".cN,.cS").forEach((i) => (i.oninput = () => { i.value = digits(i.value).replace(/\D/g, ""); dirty(); }));
        root.querySelectorAll(".cName,.cD,.cSec").forEach((i) => { i.addEventListener("input", dirty); i.addEventListener("change", dirty); });
        root.querySelectorAll(".cRm").forEach((b) => (b.onclick = () => b.closest("tr").remove()));
        root.querySelectorAll(".cDel").forEach((b) => (b.onclick = () => delStudent(b.closest("tr").dataset.id)));
      };
      wire(el);
      const addRow = (r) => { const tb = el.querySelector("#pT tbody"); tb.insertAdjacentHTML("beforeend", row(r || {}, secOpts)); const tr = tb.lastElementChild; wire(tr); dirty(); return tr; };
      el.querySelector("#pAdd").onclick = () => { const tr = addRow(); tr.querySelector(".cName").focus(); tr.scrollIntoView({ behavior: "smooth", block: "center" }); };
      el.querySelector("#pSecNew").onclick = () => sectionSheet(null);
      el.querySelector("#pSecRen").onclick = () => sectionSheet(sec);
      el.querySelector("#pCards").onclick = () => printCards(active, sec);
      el.querySelectorAll("[data-restore]").forEach((b) => (b.onclick = async () => {
        try { await T.q(T.sb.from("students").update({ is_active: true }).eq("id", b.dataset.restore)); S.stu[b.dataset.restore].is_active = true; T.brain.invalidate(); toast("استُرجع الطالب"); T.route(); } catch (e) { toast(e.message, true); }
      }));
      el.querySelector("#pSave").onclick = async () => {
        const p = [...el.querySelectorAll("#pT tbody tr")].map((tr) => ({ id: tr.dataset.id || null, serial: tr.querySelector(".cS").value || null, name: tr.querySelector(".cName").value.trim(),
          nid: tr.querySelector(".cN").value, dob: tr.querySelector(".cD").value || null, section_id: tr.querySelector(".cSec").value }));
        const btn = el.querySelector("#pSave"); U.spin(btn, true, "جارٍ الحفظ…");
        try {
          const r = await T.rpc("t_save_students", { p_section: S.sec, p_rows: p });
          toast("حُفظ — عُدّل " + r.updated + (r.added ? " وأُضيف " + r.added : ""));
          await reloadStudents(); T.route();
        } catch (e) { toast(e.message, true); U.spin(btn, false); }
      };
      el.querySelector("#pPaste").onclick = () => {
        const b = openSheet(`<h3>لصق الطلبة من إكسل</h3><p class="tiny">أربعة أعمدة: <b>الرقم التسلسلي | اسم الطالب | الرقم الوطني | تاريخ الميلاد</b>.<br>
          إن وُجد الرقم التسلسلي تُحدَّث بياناته، وإلا يُضاف. التاريخ بصيغة 15/3/2008 أو 2008-03-15. (يُقبل ثلاثة أعمدة: التسلسلي | الوطني | الميلاد.)</p>
          <textarea class="input mono" id="cpT" rows="8" dir="auto"></textarea><button class="btn primary block" id="cpGo" style="margin-top:10px">تعبئة الجدول</button>`);
        b.querySelector("#cpGo").onclick = () => {
          let upd = 0, add = 0, bad = 0;
          T.parseTSV(b.querySelector("#cpT").value).forEach((r) => {
            const serial = parseInt(digits(r[0] || "").replace(/\D/g, ""), 10); if (!serial) return;
            const three = !/[ء-يٱ-ۓa-zA-Z]/.test(r[1] || "");
            const name = three ? "" : (r[1] || "").trim(), nid = three ? r[1] : r[2], dob = three ? r[2] : r[3];
            let tr = [...el.querySelectorAll("#pT tbody tr")].find((t) => +t.querySelector(".cS").value === serial);
            if (!tr) { if (!name) { bad++; return; } tr = addRow({ serial_no: serial }); add++; } else upd++;
            if (name) tr.querySelector(".cName").value = name;
            if (nid) tr.querySelector(".cN").value = digits(nid).replace(/\D/g, "");
            const d = T.parseDate(dob); if (d) tr.querySelector(".cD").value = d; else if ((dob || "").trim()) bad++;
          });
          dirty(); closeSheet(); toast("حُدّث " + upd + " وأُضيف " + add + (bad ? " — تعذّر " + bad + " صفًّا" : "") + ". راجع ثم «حفظ».", !!bad);
        };
      };
    }
  });
  function row(s, secOpts) {
    const ready = s.national_id && s.birth_date, rk = s.id ? B().risk(s) : null;
    return `<tr ${s.id ? `data-id="${s.id}"` : 'data-new="1"'}><td><input class="input mono cS" inputmode="numeric" value="${s.serial_no == null ? "" : s.serial_no}" style="width:62px"></td>
      <td><div class="row" style="gap:6px">${rk && rk.score >= 35 ? '<span class="stud"><span class="flag" title="يحتاج دعمًا"></span></span>' : ""}<input class="input cName" value="${esc(s.full_name || "")}" placeholder="اسم الطالب الرباعي" style="min-width:210px"></div></td>
      <td><input class="input mono cN" inputmode="numeric" dir="ltr" value="${esc(s.national_id || "")}" style="width:140px"></td>
      <td><input class="input cD" type="date" value="${esc(s.birth_date || "")}"></td>
      <td><select class="input cSec" style="min-width:130px">${secOpts}</select></td>
      <td class="num">${s.id ? (ready ? '<span class="pill open">جاهز</span>' : '<span class="pill bad">ناقص</span>') : '<span class="pill">جديد</span>'}</td>
      <td style="white-space:nowrap">${s.id ? `<a class="btn sm soft" href="#student/${s.id}">الملف</a> <button class="btn sm ghost cDel" title="حذف">حذف</button>` : '<button class="btn sm ghost cRm">إزالة</button>'}</td></tr>`;
  }
  async function reloadStudents() {
    S.students = await T.all("students", "id,section_id,serial_no,full_name,is_active,national_id,birth_date", "serial_no");
    S.stu = {}; S.students.forEach((s) => (S.stu[s.id] = s));
    S.sections.forEach((sc) => { const a = S.students.filter((s) => s.section_id === sc.id && s.is_active); sc.n = a.length; sc.n_cred = a.filter((s) => s.national_id && s.birth_date).length; });
    T.brain.invalidate();
  }
  async function delStudent(id) {
    const s = S.stu[id];
    const has = S.mastery.some((m) => m.student_id === id) || S.events.some((e) => e.student_id === id) || S.att.some((a) => a.student_id === id) || S.marks.some((m) => m.student_id === id);
    let att = 0; try { att = (await T.q(T.sb.from("attempts").select("id").eq("student_id", id).limit(1))).length; } catch (e) {}
    const archive = has || att > 0;
    if (!(await confirmSheet((archive ? "أرشفة " : "حذف ") + s.full_name + "؟", archive ? "له سجلات (قياسات أو حضور أو علامات أو اختبارات)، فيُؤرشف بدل الحذف وتبقى سجلاته محفوظة، ويمكن استرجاعه." : "لا سجلات له؛ سيُحذف نهائيًّا.", archive ? "أرشف" : "احذف", true))) return;
    try {
      if (archive) { await T.q(T.sb.from("students").update({ is_active: false }).eq("id", id)); toast("أُرشف الطالب"); }
      else { await T.q(T.sb.from("students").delete().eq("id", id)); toast("حُذف الطالب"); }
      await reloadStudents(); T.route();
    } catch (e) { toast(e.message, true); }
  }
  function sectionSheet(sec) {
    const b = openSheet(`<h3>${sec ? "تسمية الشعبة" : "شعبة جديدة"}</h3><label class="field"><span>اسم الشعبة</span><input class="input" id="snName" value="${esc(sec ? sec.name : "")}" placeholder="مثال: أعمال / ب"></label>
      <div class="foot"><button class="btn primary grow" id="snGo">حفظ</button></div>`);
    b.querySelector("#snGo").onclick = async () => {
      try { const r = await T.rpc("t_save_section", { p: { id: sec ? sec.id : null, name: b.querySelector("#snName").value } });
        closeSheet(); toast("حُفظت الشعبة"); S.sec = r.id; try { localStorage.setItem("sahm_t_sec", r.id); } catch (e) {}
        await T.loadAll(); T.route(); } catch (e) { toast(e.message, true); }
    };
  }
  function printCards(studs, sec) {
    const url = new URL("index.html", location.href).href;
    const html = `<div class="cards">${studs.map((s) => `<div class="lc"><div class="lt">منصة السهم العلمي للاختبارات الذكية</div><b>${esc(s.full_name)}</b>
      <div>الشعبة: ${esc(sec.name)} · الرقم التسلسلي: ${s.serial_no}</div><div class="u">${esc(url)}</div>
      <div class="hint">ادخل برقمك الوطني وتاريخ ميلادك${s.national_id && s.birth_date ? "" : " — <b>بياناتك غير مكتملة، راجع المعلّم</b>"}</div></div>`).join("")}</div>`;
    T.printDoc("بطاقات الدخول — " + sec.name, html, "portrait",
      `.cards{display:grid;grid-template-columns:1fr 1fr;gap:6mm}.lc{border:1px dashed #555;border-radius:3mm;padding:4mm;font-size:10.5pt;line-height:1.7;break-inside:avoid}
       .lc b{font-size:13pt;display:block}.lt{font-family:Amiri,serif;font-weight:700;color:#16325a}.u{direction:ltr;text-align:right;font-family:monospace;font-size:9.5pt}.hint{font-size:9pt;color:#444}`);
  }

  // ================= ملف الطالب =================
  T.view("student", {
    title: "ملف الطالب", sub: (id) => (S.stu[id] ? S.stu[id].full_name : ""),
    async render(el, id) {
      const st = S.stu[id];
      if (!st) { el.innerHTML = T.empty("user", "الطالب غير موجود"); return; }
      const r = B().calc(st), rk = B().risk(st), c = B().caps(), sec = S.sections.find((x) => x.id === st.section_id) || {};
      const att = S.att.filter((a) => a.student_id === id).sort((a, b) => b.on_date.localeCompare(a.on_date));
      const cnt = { present: 0, absent: 0, late: 0, excused: 0 }; att.forEach((a) => (cnt[a.status] = (cnt[a.status] || 0) + 1));
      const evs = S.events.filter((e) => e.student_id === id).sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
      let pos = 0, neg = 0; evs.forEach((e) => { const t = S.eventTypes.find((x) => x.id === e.event_type_id); if (t) t.direction > 0 ? pos++ : neg++; });
      const pct = r.total != null ? Math.round((r.total / c.max) * 100) : 0;
      let h = `<div class="card pad"><div class="prof-head"><span class="avatar">${esc(U.firstName(st.full_name).slice(0, 1))}</span>
          <div class="grow"><h2 style="font-size:21px">${esc(st.full_name)}</h2><div class="tiny">${esc(sec.name || "")} · الرقم التسلسلي ${st.serial_no} · ${st.national_id && st.birth_date ? '<span class="pill open">جاهز لدخول المنصة</span>' : '<span class="pill bad">بيانات الدخول ناقصة</span>'}${st.is_active ? "" : ' · <span class="pill draft">مؤرشف</span>'} · <span id="sTier" class="tiny"></span></div></div>
          <div class="ring" style="--p:${pct}"><div><div><b class="num">${T.nf(r.total, 1)}</b><span class="tiny">من ${T.nf(c.max)}</span></div></div></div>
          <div class="toolbar"><button class="btn primary" id="sRep">${ic("printer", "sm")}تقرير الطالب</button><a class="btn outline" href="#people">الشعبة</a></div></div></div>
        <div class="kpi-row" style="margin-top:14px">
          <div class="kp"><b class="num">${T.nf(r.first)}</b><span>الاختبار الأول</span><small>من ${T.nf(c.cap1)}</small></div>
          <div class="kp"><b class="num">${T.nf(r.second)}</b><span>التقويم الثاني (النتاجات)</span><small>من ${T.nf(c.cap2)} · قيس ${r.N}/${r.nOut}</small></div>
          <div class="kp"><b class="num">${T.nf(r.fin)}</b><span>الاختبار النهائي</span><small>من ${T.nf(c.cap3)}</small></div>
          <div class="kp"><b>${esc(r.verbal)}</b><span>التقدير</span><small>${r.complete ? "المادة (١٨)" : "يكتمل بعد كل العلامات"}</small></div>
          <div class="kp ${rk.score >= 35 ? "warn" : ""}"><b class="num">${rk.score}</b><span>مؤشر الحاجة للدعم</span><small>${esc(rk.why.slice(0, 2).join(" · ") || "لا مؤشرات مقلقة")}</small></div></div>
        <div class="split" style="margin-top:18px"><div><div class="sect" style="margin-top:0"><h3>${ic("target", "sm")}خريطة النتاجات</h3>` +
        r.unitList.map((u, ui) => `<details class="unit" ${ui === 0 ? "open" : ""}><summary><div class="ibox">${ic("layers")}</div><div class="grow"><h3>الوحدة ${u.seq}: ${esc(u.title)}</h3>
            <div class="tiny">نصيبها من التقويم الثاني: ${T.nf(r.units[ui])}</div></div></summary>` +
          T.outcomesOfUnits([u]).map((o) => { const e = B().effOf(id, o.id);
            return `<div class="oc"><span class="lbl-chip">${esc(o.short)}</span><span>${esc(o.text)}${e ? `<span class="tiny" style="display:block">${esc(T.toolName(e.tool_code))} · ${esc(T.fmtD(e.assessed_on))}${e.source === "exam" ? " · اختبار إلكتروني" : ""}</span>` : ""}</span>
              <span class="lv lv${e ? e.level : 0}">${e ? e.level + " · " + T.LV[e.level] : "لم يُقَس"}</span></div>`; }).join("") + "</details>").join("") +
        `</div><div class="sect"><h3>${ic("file", "sm")}الكويزات والاختبارات وأوراق العمل</h3><div id="sAtt">${'<div class="card pad tiny">جارٍ التحميل…</div>'}</div></div></div><div>
          <div class="card pad"><h3 style="font-size:15px;margin-bottom:10px">${ic("cal", "sm")} الحضور</h3><div class="stats-inline"><span>حاضر <b>${cnt.present}</b></span><span>غائب <b style="color:var(--danger)">${cnt.absent}</b></span><span>متأخر <b>${cnt.late}</b></span><span>بعذر <b>${cnt.excused}</b></span></div>
            ${att.filter((a) => a.status !== "present").slice(0, 8).map((a) => `<div class="tiny" style="margin-top:6px">${esc(T.fmtD(a.on_date))} — ${T.ATT[a.status]}</div>`).join("")}</div>
          <div class="card pad" style="margin-top:12px"><h3 style="font-size:15px;margin-bottom:10px">${ic("bolt", "sm")} الرصد اليومي</h3><div class="stats-inline"><span>إيجابي <b style="color:var(--ok)">${pos}</b></span><span>سلبي <b style="color:var(--danger)">${neg}</b></span></div>
            <div class="log" style="margin-top:8px">${evs.slice(0, 10).map((e) => { const t = S.eventTypes.find((x) => x.id === e.event_type_id) || {};
              return `<div class="lr"><span>${esc(t.icon || "•")}</span><span class="grow">${esc(t.label || "")}</span><span class="tiny">${esc(T.fmtD(e.on_date))}</span></div>`; }).join("") || '<p class="tiny">لا أحداث.</p>'}</div></div>
          ${rk.why.length ? `<div class="card pad" style="margin-top:12px"><h3 style="font-size:15px;margin-bottom:8px">${ic("spark", "sm")} لماذا يحتاج دعمًا؟</h3><ul style="margin:0;padding-inline-start:18px;font-size:13.5px">${rk.why.map((w) => `<li>${esc(w)}</li>`).join("")}</ul></div>` : ""}
        </div></div>`;
      el.innerHTML = h;
      el.querySelector("#sRep").onclick = () => T.records.studentReport(st);
      T.loadTiers(st.section_id).then((m) => { const t = m[id], box = el.querySelector("#sTier"); if (!t || !box) return; const d = T.TIER[t.tier];
        box.innerHTML = `<span class="pill ${d.cls}" title="${esc(d.d)}">${d.sym} مستوى التمايز: ${d.n}</span> آخر معدل ${T.nf(t.avg, 1)}٪ من ${t.n} تقييمات`; });
      try {
        const at = await T.q(T.sb.from("attempts").select("id,exam_id,score,total,status,submitted_at,started_at,violations,closed_by_guard").eq("student_id", id).order("started_at", { ascending: false }));
        const box = el.querySelector("#sAtt"); if (!box) return;
        box.innerHTML = at.length ? '<div class="card list">' + at.map((a) => { const e = S.exams.find((x) => x.id === a.exam_id) || {}, p = a.total ? Math.round((a.score / a.total) * 100) : null;
          return `<a class="li" href="#exam/${a.exam_id}" style="color:inherit;text-decoration:none"><div><b>${esc(T.exTitle(e) || "اختبار")}</b><div class="tiny">${esc(T.exKind(e))} · ${esc(U.fmtDT(a.submitted_at || a.started_at, false))}${e.paper && a.status === "in_progress" ? " · لم تُرصد بعد" : ""}${a.violations ? ` · <span style="color:var(--danger)">${a.violations} مخالفة</span>` : ""}${a.closed_by_guard ? " · أُغلق تلقائيًّا" : ""}</div></div>
            <span class="score num">${p != null ? a.score + "/" + a.total : "—"}</span></a>`; }).join("") + "</div>" : '<div class="card pad tiny">لم يقدّم أي اختبار إلكتروني بعد.</div>';
      } catch (e) { /* اختياري */ }
    }
  });
  T.people = { reloadStudents };
})();
