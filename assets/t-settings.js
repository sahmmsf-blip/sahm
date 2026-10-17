// الإعدادات: بيانات المعلّم والرقم الوطني، المبحث وتقسيمة العلامة وقاعدة الاحتساب، الإشعارات، الحساب، النسخ الاحتياطي
(function () {
  const { esc, toast, openSheet, closeSheet, digits } = U, S = T.S;

  T.view("settings", {
    title: "الإعدادات", sub: () => "تُحفظ كل خانة تلقائيًّا عند تغييرها",
    async render(el) {
      const me = S.me, sj = S.subject, c = T.brain.caps();
      let email = ""; try { email = ((await T.sb.auth.getUser()).data.user || {}).email || ""; } catch (e) {}
      el.innerHTML = `<div class="g2">
        <div class="card pad"><h3 style="font-size:16px;margin-bottom:14px">${ic("user", "sm")} بيانات المعلّم</h3><div class="fields">
          <label class="field"><span>الاسم كما يظهر على السجلات</span><input class="input" id="sName" value="${esc(me.full_name || "")}"></label>
          <label class="field"><span>المدرسة</span><input class="input" id="sSchool" value="${esc(me.school || "")}"></label>
          <label class="field"><span>المديرية</span><input class="input" id="sDir" value="${esc(me.directorate || "")}"></label>
          <label class="field"><span>الهاتف</span><input class="input" id="sPhone" dir="ltr" value="${esc(me.phone || "")}"></label></div></div>
        <div class="card pad"><h3 style="font-size:16px;margin-bottom:14px">${ic("id", "sm")} الدخول بالرقم الوطني</h3>
          <p class="tiny" style="margin-bottom:10px">بعد الربط تدخل برقمك الوطني ثم كلمة السر، دون كتابة البريد.</p>
          <div class="row"><input class="input mono grow" id="sNid" inputmode="numeric" maxlength="10" dir="ltr" value="${esc(me.national_id || "")}" placeholder="٠٠٠٠٠٠٠٠٠٠" style="letter-spacing:.12em">
            <button class="btn primary" id="sNidGo">ربط</button></div>
          ${me.national_id ? '<div class="note ok" style="margin-top:10px">مربوط — يمكنك الدخول به الآن.</div>' : '<div class="note warn" style="margin-top:10px">لم يُربط بعد.</div>'}
          <h3 style="font-size:16px;margin:20px 0 10px">${ic("key", "sm")} الحساب</h3><p class="tiny">${esc(email)}</p>
          <div class="row wrap" style="margin-top:8px"><button class="btn outline" id="sPass">تغيير كلمة السر</button><button class="btn outline" id="sSkin">${ic("palette", "sm")}المظهر</button></div></div>
        <div class="card pad"><h3 style="font-size:16px;margin-bottom:14px">${ic("award", "sm")} المبحث وتقسيمة العلامة</h3><div class="fields">
          <div class="fields two"><label class="field"><span>اسم المبحث</span><input class="input" id="sSubj" value="${esc(sj.name || "")}"></label><label class="field"><span>الصف</span><input class="input" id="sGrade" value="${esc(sj.grade_label || "")}"></label></div>
          <div class="fields four"><label class="field"><span>العلامة العظمى</span><input class="input mono" type="number" id="sMax" value="${sj.max_mark || 100}"></label>
            <label class="field"><span>الأول %</span><input class="input mono" type="number" id="sP1" value="${sj.first_eval_pct || 30}"></label>
            <label class="field"><span>الثاني % (النتاجات)</span><input class="input mono" type="number" id="sP2" value="${sj.second_eval_pct || 30}"></label>
            <label class="field"><span>النهائي %</span><input class="input mono" type="number" id="sP3" value="${sj.final_eval_pct || 40}"></label></div>
          <div class="field"><span>احتساب مستوى النتاج عند تعدد القياسات</span><div class="seg" id="sRule"><button data-r="highest" aria-pressed="${c.rule !== "latest"}">أعلى مستوى</button><button data-r="latest" aria-pressed="${c.rule === "latest"}">أحدث قياس</button></div></div>
          <div class="note" id="capNote"></div>
          <p class="tiny">المادة (4)-أ: اختبار كتابي 30% · تقويمات مستمرة قائمة على الأداء 30% · اختبار كتابي نهائي 40%.</p></div></div>
        <div class="card pad"><h3 style="font-size:16px;margin-bottom:14px">${ic("mail", "sm")} الإشعارات بالبريد</h3>
          <label class="check"><input type="checkbox" id="sNotify" ${me.notify_email !== false ? "checked" : ""}> أرسل لي بعد إغلاق كل اختبار ملف Excel بالعلامات وحالات الغش</label>
          <p class="tiny" style="margin-top:10px">يصل الملف إلى: <b dir="ltr">${esc(email)}</b>. ويمكنك إرساله يدويًّا من صفحة أي اختبار بزر «أرسله لبريدي».</p>
          <div class="note" style="margin-top:10px">يتطلّب الإرسال مفتاح خدمة Resend (مجاني) محفوظًا في Supabase باسم <b dir="ltr">RESEND_API_KEY</b>. إن لم يُضبط بعد، يبقى زر «Excel النتائج» في صفحة الاختبار متاحًا دائمًا.</div>
          <h3 style="font-size:16px;margin:20px 0 10px">${ic("file", "sm")} نسخة احتياطية</h3>
          <p class="tiny">ملف Excel واحد فيه الطلبة والقياسات والعلامات والحضور والرصد اليومي.</p>
          <button class="btn outline" id="sBackup" style="margin-top:8px">تنزيل النسخة الاحتياطية</button></div>
        <div class="card pad" style="grid-column:1/-1"><h3 style="font-size:16px;margin-bottom:6px">${ic("award", "sm")} رسائلك للطلبة حسب ترتيبهم</h3>
          <p class="tiny" style="margin-bottom:12px">تظهر باسمك في صفحة «ترتيبي» عند كل طالب: العشرة الأوائل ترى رسالة «بطاقة الشرف»، والوسط والأواخر رسالة تحفيز. يُرتَّب الطالب داخل شعبته فقط، والثلث الأخير لا يرى رقم ترتيبه.</p>
          <div class="fields three">${[["top", "العشرة الأوائل (بطاقة الشرف)"], ["mid", "الوسط"], ["low", "الأواخر (بلا رقم ترتيب)"]].map(([k, t]) =>
            `<label class="field"><span>${t}</span><textarea class="input hm" data-k="${k}" rows="5">${esc(((me.honor_msgs || {})[k]) || U.HONOR[k])}</textarea></label>`).join("")}</div>
          <button class="btn sm ghost" id="sHonorReset" style="margin-top:8px">استعادة الرسائل الافتراضية</button></div></div>
        <p class="tiny" style="text-align:center;margin-top:20px">منصة السهم العلمي للاختبارات الذكية وتقويم الأداء · الإصدار 3.7 — الدفتر الجانبي ومنصة الاختبارات في منظومة واحدة</p>`;
      const cap = () => { const m = +el.querySelector("#sMax").value || 0, p1 = +el.querySelector("#sP1").value || 0, p2 = +el.querySelector("#sP2").value || 0, p3 = +el.querySelector("#sP3").value || 0;
        el.querySelector("#capNote").innerHTML = `الأول ${T.nf(m * p1 / 100)} · الثاني ${T.nf(m * p2 / 100)} · النهائي ${T.nf(m * p3 / 100)} — المجموع ${T.nf(m * (p1 + p2 + p3) / 100)} من ${m}` +
          (p1 + p2 + p3 !== 100 ? ' <b style="color:var(--danger)">(النسب لا تساوي ١٠٠٪)</b>' : ""); };
      cap();
      let tm;
      const saveT = () => { clearTimeout(tm); tm = setTimeout(async () => {
        const t = { full_name: el.querySelector("#sName").value.trim(), school: el.querySelector("#sSchool").value.trim(), directorate: el.querySelector("#sDir").value.trim(), phone: el.querySelector("#sPhone").value.trim(), notify_email: el.querySelector("#sNotify").checked };
        try { await T.q(T.sb.from("teachers").update(t).eq("id", S.me.id)); Object.assign(S.me, t); T.fillShell(); toast("حُفظت بيانات المعلّم"); } catch (e) { toast(e.message, true); } }, 400); };
      ["sName", "sSchool", "sDir", "sPhone"].forEach((id) => (el.querySelector("#" + id).onchange = saveT));
      el.querySelector("#sNotify").onchange = saveT;
      let ts;
      const saveS = (extra) => { clearTimeout(ts); ts = setTimeout(async () => {
        const u = Object.assign({ name: el.querySelector("#sSubj").value.trim(), grade_label: el.querySelector("#sGrade").value.trim(), max_mark: +el.querySelector("#sMax").value,
          first_eval_pct: +el.querySelector("#sP1").value, second_eval_pct: +el.querySelector("#sP2").value, final_eval_pct: +el.querySelector("#sP3").value }, extra || {});
        try { await T.q(T.sb.from("subjects").update(u).eq("id", S.subject.id)); Object.assign(S.subject, u); T.brain.invalidate(); toast("حُفظ المبحث"); } catch (e) { toast(e.message, true); } }, 400); };
      ["sSubj", "sGrade", "sMax", "sP1", "sP2", "sP3"].forEach((id) => { el.querySelector("#" + id).oninput = cap; el.querySelector("#" + id).onchange = () => saveS(); });
      el.querySelectorAll("#sRule button").forEach((b) => (b.onclick = () => { el.querySelectorAll("#sRule button").forEach((z) => z.setAttribute("aria-pressed", z === b)); saveS({ outcome_rule: b.dataset.r }); }));
      const nid = el.querySelector("#sNid"); nid.oninput = () => (nid.value = digits(nid.value).replace(/\D/g, "").slice(0, 10));
      el.querySelector("#sNidGo").onclick = async () => {
        try { const r = await T.rpc("t_set_my_nid", { p_nid: nid.value }); S.me.national_id = r.nid; try { localStorage.setItem("sahm_t_nid", r.nid); } catch (e) {} toast("رُبط رقمك الوطني"); T.route(); } catch (e) { toast(e.message, true); }
      };
      el.querySelector("#sSkin").onclick = U.skinPicker;
      el.querySelector("#sPass").onclick = () => {
        const b = openSheet(`<h3>تغيير كلمة السر</h3><label class="field"><span>كلمة السر الجديدة (٨ أحرف على الأقل)</span><input class="input" type="password" id="np" autocomplete="new-password" dir="ltr"></label>
          <div class="foot"><button class="btn primary grow" id="npb">حفظ</button></div>`);
        b.querySelector("#npb").onclick = async () => { const p = b.querySelector("#np").value; if (p.length < 8) return toast("٨ أحرف على الأقل", true);
          const r = await T.sb.auth.updateUser({ password: p }); closeSheet(); toast(r.error ? "تعذّر التغيير: " + r.error.message : "تم تغيير كلمة السر", !!r.error); };
      };
      el.querySelector("#sBackup").onclick = () => backup().catch((e) => toast(e.message, true));
      let th;
      const saveHonor = () => { clearTimeout(th); th = setTimeout(async () => {
        const m = {}; el.querySelectorAll(".hm").forEach((t) => { const v = t.value.trim(); if (v && v !== U.HONOR[t.dataset.k]) m[t.dataset.k] = v.slice(0, 600); });
        const v = Object.keys(m).length ? m : null;
        try { await T.q(T.sb.from("teachers").update({ honor_msgs: v }).eq("id", S.me.id)); S.me.honor_msgs = v; toast("حُفظت رسائل الترتيب"); } catch (e) { toast(e.message, true); } }, 500); };
      el.querySelectorAll(".hm").forEach((t) => (t.onchange = saveHonor));
      el.querySelector("#sHonorReset").onclick = () => { el.querySelectorAll(".hm").forEach((t) => (t.value = U.HONOR[t.dataset.k])); saveHonor(); };
    }
  });

  async function backup() {
    await T.loadScript(T.XLSX_URL); const X = window.XLSX, wb = X.utils.book_new(); wb.Workbook = { Views: [{ RTL: true }] };
    const add = (name, rows) => { const ws = X.utils.aoa_to_sheet(rows); ws["!views"] = [{ RTL: true }]; X.utils.book_append_sheet(wb, ws, name); };
    const sn = (id) => (S.stu[id] || {}).full_name || "", ss = (id) => T.secName((S.stu[id] || {}).section_id);
    add("الطلبة", [["الشعبة", "م", "الاسم", "الرقم الوطني", "تاريخ الميلاد", "الحالة"]].concat(S.students.map((s) => [T.secName(s.section_id), s.serial_no, s.full_name, s.national_id || "", s.birth_date || "", s.is_active ? "فعّال" : "مؤرشف"])));
    add("القياسات", [["الشعبة", "الطالب", "النتاج", "المستوى", "الأداة", "التاريخ", "المصدر"]].concat(S.mastery.map((m) => [ss(m.student_id), sn(m.student_id), (S.O[m.outcome_id] || {}).label || "", m.level, T.toolName(m.tool_code), m.assessed_on, m.source])));
    add("العلامات", [["الشعبة", "الطالب", "الخانة", "العلامة", "غائب بلا عذر"]].concat(S.marks.map((m) => [ss(m.student_id), sn(m.student_id), m.slot === "first_written" ? "الأول" : "النهائي", m.mark, m.absent_no_excuse ? "نعم" : ""])));
    add("الحضور", [["الشعبة", "الطالب", "التاريخ", "الحالة"]].concat(S.att.map((a) => [ss(a.student_id), sn(a.student_id), a.on_date, T.ATT[a.status] || a.status])));
    add("الرصد اليومي", [["الشعبة", "الطالب", "التاريخ", "الحصة", "الحدث"]].concat(S.events.map((e) => [ss(e.student_id), sn(e.student_id), e.on_date, e.period, (S.eventTypes.find((t) => t.id === e.event_type_id) || {}).label || ""])));
    X.writeFile(wb, "نسخة احتياطية — منصة السهم العلمي — " + T.today() + ".xlsx"); toast("نُزّلت النسخة الاحتياطية");
  }
})();
