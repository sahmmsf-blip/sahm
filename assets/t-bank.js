// بنك الأسئلة: كل سؤال مرتبط بنتاج، مع الاستيراد من إكسل وتحليل جودة السؤال من إجابات الطلبة
(function () {
  const { esc, toast, openSheet, closeSheet, digits, download, csv, L } = U, S = T.S;
  const BLOOM = ["تذكّر", "فهم", "تطبيق", "تحليل", "تقويم", "إبداع"], DIFF = ["سهل", "متوسط", "صعب"];
  const F = { unit: "", lesson: "", outcome: "", bloom: "", diff: "", q: "", archived: false, limit: 60 };
  const lessonsOf = (u) => (u ? S.U[u].lessons : S.units.flatMap((x) => x.lessons));
  const outsOf = (l, u) => (l ? S.L[l].outcomes : lessonsOf(u).flatMap((x) => x.outcomes));
  const label = (oid) => (S.O[oid] ? S.O[oid].label : "—");

  T.view("bank", {
    title: "بنك الأسئلة", sub: () => "كل سؤال مرتبط بنتاج؛ ومنه تُسحب الاختبارات الإلكترونية",
    async render(el, arg) {
      el.innerHTML = '<div class="loading"><span class="spin"></span>جارٍ تحميل البنك…</div>';
      await T.loadQuestions();
      if (arg && S.O[arg]) Object.assign(F, { unit: S.O[arg].unit.id, lesson: S.O[arg].lesson.id, outcome: arg });
      draw(el);
    }
  });
  function draw(el) {
    const tot = S.qs.filter((x) => x.active).length, zero = Object.values(S.O).filter((o) => !o.nq).length;
    el.innerHTML = `<div class="vhead"><div><h2>${tot} سؤالًا فعّالًا</h2><p>${zero ? zero + " نتاجًا بلا أسئلة بعد" : "كل النتاجات مغطّاة بسؤال واحد على الأقل"}</p></div>
      <div class="toolbar"><button class="btn primary" id="bNew">${ic("layers", "sm")}سؤال جديد</button><button class="btn outline" id="bPaste">${ic("file", "sm")}لصق من إكسل</button>
        <button class="btn ghost sm" id="bTpl">قالب الاستيراد</button><button class="btn ghost sm" id="bExport">تصدير البنك</button></div></div>
      <div class="card pad filters"><div class="fields three">
        <label class="field"><span>الوحدة</span><select class="input" id="bUnit">${T.opt(F.unit, S.units.map((u) => [u.id, "الوحدة " + u.seq + " · " + u.title]), "كل الوحدات")}</select></label>
        <label class="field"><span>الدرس</span><select class="input" id="bLesson">${T.opt(F.lesson, lessonsOf(F.unit).map((l) => [l.id, "و" + l.unit.seq + " · الدرس " + l.seq + " · " + l.title]), "كل الدروس")}</select></label>
        <label class="field"><span>النتاج</span><select class="input" id="bOut">${T.opt(F.outcome, outsOf(F.lesson, F.unit).map((o) => [o.id, o.label + " — " + o.text + " (" + o.nq + ")"]), "كل النتاجات")}</select></label></div>
        <div class="row wrap"><input class="input grow" id="bQ" placeholder="بحث في النص أو رقم السؤال…" value="${esc(F.q)}" style="min-width:200px">
          <select class="input" id="bBloom" style="width:auto">${T.opt(F.bloom, BLOOM.map((b) => [b, b]), "كل مستويات بلوم")}</select>
          <select class="input" id="bDiff" style="width:auto">${T.opt(F.diff, DIFF.map((b) => [b, b]), "كل الصعوبات")}</select>
          <label class="check"><input type="checkbox" id="bArch" ${F.archived ? "checked" : ""}> المؤرشفة</label></div></div>
      <div class="sect"><h3>${ic("target", "sm")}تغطية النتاجات <span class="tiny">اضغط النتاج لتصفية أسئلته</span></h3><div class="card pad stack">` +
      S.units.map((u) => u.lessons.map((l) => `<div><div class="tiny" style="font-weight:700;margin-bottom:6px">الوحدة ${u.seq} · الدرس ${l.seq}: ${esc(l.title)}</div><div class="chips">` +
        l.outcomes.map((o) => `<button class="chip ${o.nq ? "" : "zero"} ${F.outcome === o.id ? "on" : ""}" data-o="${o.id}" title="${esc(o.text)}">ن${o.seq}<span class="n">${o.nq}</span></button>`).join("") + "</div></div>").join("")).join("") +
      `</div></div><div id="bList" class="sect"></div>`;
    const re = () => { F.limit = 60; draw(el); };
    el.querySelector("#bUnit").onchange = (e) => { F.unit = e.target.value; F.lesson = ""; F.outcome = ""; re(); };
    el.querySelector("#bLesson").onchange = (e) => { F.lesson = e.target.value; F.outcome = ""; re(); };
    el.querySelector("#bOut").onchange = (e) => { F.outcome = e.target.value; re(); };
    el.querySelector("#bBloom").onchange = (e) => { F.bloom = e.target.value; re(); };
    el.querySelector("#bDiff").onchange = (e) => { F.diff = e.target.value; re(); };
    el.querySelector("#bArch").onchange = (e) => { F.archived = e.target.checked; re(); };
    let qt; el.querySelector("#bQ").oninput = (e) => { clearTimeout(qt); qt = setTimeout(() => { F.q = e.target.value; list(el); }, 250); };
    el.querySelector("#bNew").onclick = () => editQuestion(null, el);
    el.querySelector("#bPaste").onclick = () => importSheet(el);
    el.querySelector("#bTpl").onclick = downloadTemplate;
    el.querySelector("#bExport").onclick = exportBank;
    el.querySelectorAll("[data-o]").forEach((b) => (b.onclick = () => { const o = S.O[b.dataset.o];
      if (F.outcome === o.id) Object.assign(F, { outcome: "" }); else Object.assign(F, { unit: o.unit.id, lesson: o.lesson.id, outcome: o.id }); re(); }));
    list(el);
  }
  function filtered() {
    const q = F.q.trim();
    return S.qs.filter((x) => {
      if (!F.archived && !x.active) return false;
      const o = S.O[x.outcome_id]; if (!o) return !F.unit && !F.lesson && !F.outcome;
      if (F.unit && o.unit.id !== F.unit) return false;
      if (F.lesson && o.lesson.id !== F.lesson) return false;
      if (F.outcome && x.outcome_id !== F.outcome) return false;
      if (F.bloom && x.bloom !== F.bloom) return false;
      if (F.diff && x.difficulty !== F.diff) return false;
      if (q && !(x.stem + " " + x.options.join(" ") + " " + (x.tag || "")).includes(q) && String(x.num) !== digits(q)) return false;
      return true;
    });
  }
  function list(el) {
    const ls = filtered(), box = el.querySelector("#bList");
    let h = `<h3>${ic("list", "sm")}${ls.length} سؤالًا</h3>`;
    if (!ls.length) h += T.empty("layers", "لا أسئلة بهذه التصفية", "أضف سؤالًا أو الصق مجموعة من إكسل.");
    h += '<div class="g2">' + ls.slice(0, F.limit).map((x) => `<div class="card qitem" style="${x.active ? "" : "opacity:.6"}">
        <div class="row wrap" style="gap:6px"><span class="pill brand num">#${x.num}</span><span class="pill" title="${esc((S.O[x.outcome_id] || {}).text || "")}">${esc(label(x.outcome_id))}</span>
          <span class="pill">${esc(x.bloom)}</span><span class="pill">${esc(x.difficulty)}</span>
          ${x.p != null ? `<span class="pill ${x.p < 0.2 ? "bad" : ""}" title="نسبة من أجابوا صحيحًا">✓ ${Math.round(x.p * 100)}٪ من ${x.n_answers}</span>` : ""}
          ${x.used ? `<span class="pill">في ${x.used} اختبار</span>` : ""}${x.tag ? `<span class="pill gold">${esc(x.tag)}</span>` : ""}${x.active ? "" : '<span class="pill draft">مؤرشف</span>'}</div>
        <div class="stem">${esc(x.stem)}</div>${x.img ? `<img class="qimg" src="${esc(x.img)}" alt="" style="max-height:140px">` : ""}
        <ol>${x.options.map((o, i) => `<li class="${i === x.correct ? "ok" : ""}">${L[i]}) ${esc(o)}</li>`).join("")}</ol>
        <div class="row"><button class="btn sm outline" data-edit="${x.id}">تعديل</button><button class="btn sm ghost" data-arch="${x.id}">${x.active ? "أرشفة" : "استرجاع"}</button></div></div>`).join("") + "</div>";
    if (ls.length > F.limit) h += `<button class="btn outline block" id="bMore" style="margin-top:12px">عرض المزيد (${ls.length - F.limit})</button>`;
    box.innerHTML = h;
    box.querySelectorAll("[data-edit]").forEach((b) => (b.onclick = () => editQuestion(b.dataset.edit, el)));
    box.querySelectorAll("[data-arch]").forEach((b) => (b.onclick = async () => {
      const qq = S.qs.find((x) => x.id === b.dataset.arch);
      await T.guard(T.rpc("t_set_question_active", { p_id: qq.id, p_active: !qq.active }), qq.active ? "أُرشف السؤال" : "استُرجع السؤال");
      qq.active = !qq.active; if (S.O[qq.outcome_id]) S.O[qq.outcome_id].nq += qq.active ? 1 : -1; list(el);
    }));
    const more = box.querySelector("#bMore"); if (more) more.onclick = () => { F.limit += 60; list(el); };
  }

  function outcomePicker(prefix, outId) {
    const o = outId && S.O[outId];
    const u = o ? o.unit.id : (F.unit || S.units[0].id), l = o ? o.lesson.id : (F.lesson || S.U[u].lessons[0].id);
    return `<div class="fields three">
      <label class="field"><span>الوحدة</span><select class="input" id="${prefix}U">${T.opt(u, S.units.map((x) => [x.id, "الوحدة " + x.seq + " · " + x.title]))}</select></label>
      <label class="field"><span>الدرس</span><select class="input" id="${prefix}L">${T.opt(l, S.U[u].lessons.map((x) => [x.id, "الدرس " + x.seq + " · " + x.title]))}</select></label>
      <label class="field"><span>النتاج</span><select class="input" id="${prefix}O">${T.opt(outId || F.outcome, S.L[l].outcomes.map((x) => [x.id, "ن" + x.seq + " — " + x.text]))}</select></label></div>`;
  }
  function wirePicker(root, prefix) {
    const U_ = root.querySelector("#" + prefix + "U"), L_ = root.querySelector("#" + prefix + "L"), O_ = root.querySelector("#" + prefix + "O");
    U_.onchange = () => { L_.innerHTML = T.opt("", S.U[U_.value].lessons.map((x) => [x.id, "الدرس " + x.seq + " · " + x.title])); L_.onchange(); };
    L_.onchange = () => { O_.innerHTML = T.opt("", S.L[L_.value].outcomes.map((x) => [x.id, "ن" + x.seq + " — " + x.text])); };
    return () => O_.value;
  }
  function editQuestion(id, el) {
    if (!S.units.length) return toast("لا وحدات في المنهاج", true);
    const qq = id ? S.qs.find((x) => x.id === id) : { options: ["", "", "", ""], correct: 0, bloom: "فهم", difficulty: "متوسط", stem: "", tag: "", img: "" };
    const opts = qq.options.concat(["", "", "", ""]).slice(0, 4);
    const b = openSheet(`<h3>${id ? "تعديل السؤال #" + qq.num : "سؤال جديد"}</h3>${outcomePicker("qe", qq.outcome_id)}
      <div class="fields two" style="margin-top:12px"><label class="field"><span>مستوى بلوم</span><select class="input" id="qeB">${T.opt(qq.bloom, BLOOM.map((x) => [x, x]))}</select></label>
        <label class="field"><span>الصعوبة</span><select class="input" id="qeD">${T.opt(qq.difficulty, DIFF.map((x) => [x, x]))}</select></label></div>
      <label class="field" style="margin-top:12px"><span>نص السؤال</span><textarea class="input" id="qeS" rows="3">${esc(qq.stem)}</textarea></label>
      <div class="field" style="margin-top:12px"><span>الخيارات — اختر الإجابة الصحيحة بالدائرة (يمكن ترك الأخيرين فارغين). يقبل الخيار أكثر من سطر (للقيود).</span>
        ${opts.map((o, i) => `<div class="row" style="margin-bottom:8px;align-items:flex-start"><input type="radio" name="qeC" value="${i}" ${i === qq.correct ? "checked" : ""} style="width:20px;height:20px;accent-color:var(--accent);margin-top:14px" aria-label="الإجابة الصحيحة ${L[i]}">
          <b style="width:18px;margin-top:12px">${L[i]}</b><textarea class="input grow" id="qeO${i}" rows="1" style="min-height:48px">${esc(o)}</textarea></div>`).join("")}</div>
      <div class="fields two"><label class="field"><span>رابط صورة (اختياري)</span><input class="input" id="qeI" dir="ltr" value="${esc(qq.img || "")}"></label>
        <label class="field"><span>وسم (اختياري)</span><input class="input" id="qeT" value="${esc(qq.tag || "")}"></label></div>
      <div class="foot"><button class="btn primary grow lg" id="qeSave">حفظ السؤال</button></div>`, true);
    const getOut = wirePicker(b, "qe");
    b.querySelector("#qeSave").onclick = async () => {
      const raw = [0, 1, 2, 3].map((i) => b.querySelector("#qeO" + i).value.trim());
      let last = 3; while (last >= 0 && !raw[last]) last--;
      const op = raw.slice(0, last + 1), cor = +(b.querySelector('input[name="qeC"]:checked') || { value: 0 }).value;
      if (!b.querySelector("#qeS").value.trim()) return toast("اكتب نص السؤال", true);
      if (op.length < 2 || op.some((x) => !x)) return toast("اكتب خيارين على الأقل دون فراغ بينهما", true);
      if (cor >= op.length) return toast("الإجابة الصحيحة يجب أن تكون أحد الخيارات المكتوبة", true);
      const p = { id: id || null, outcome_id: getOut(), bloom: b.querySelector("#qeB").value, difficulty: b.querySelector("#qeD").value,
        stem: b.querySelector("#qeS").value, options: op, correct: cor, img: b.querySelector("#qeI").value, tag: b.querySelector("#qeT").value };
      const btn = b.querySelector("#qeSave"); U.spin(btn, true, "جارٍ الحفظ…");
      try {
        const r = await T.rpc("t_save_question", { p });
        closeSheet(); toast("حُفظ السؤال");
        if (r && r.regrade_needed) toast("غيّرت مفتاح سؤال مُجاب عنه — أعد تصحيح الاختبار من صفحته", false);
        await Promise.all([T.loadQuestions(true), T.refreshExams()]); draw(el);
      } catch (e) { toast(e.message, true); U.spin(btn, false); }
    };
  }

  const TPL = ["الوحدة", "الدرس", "النتاج", "نص السؤال", "أ", "ب", "ج", "د", "الإجابة", "بلوم", "الصعوبة"];
  function downloadTemplate() {
    download("قالب استيراد الأسئلة.csv", csv([TPL, [1, 4, 1, "السجلّ الذي تُوثَّق فيه المعاملات المالية يومًا بيوم:", "دفتر الأستاذ", "ميزان المراجعة", "دفتر اليومية", "قائمة الدخل", "ج", "فهم", "سهل"]]));
  }
  const ANS = { "أ": 0, "ا": 0, "a": 0, "1": 0, "ب": 1, "b": 1, "2": 1, "ج": 2, "c": 2, "3": 2, "د": 3, "d": 3, "4": 3 };
  const normBloom = (s) => { s = (s || "").trim().replace(/ّ/g, ""); const m = { "تذكر": "تذكّر", "فهم": "فهم", "تطبيق": "تطبيق", "تحليل": "تحليل", "تقويم": "تقويم", "ابداع": "إبداع", "إبداع": "إبداع" }; return s ? m[s] : "فهم"; };
  function parseImport(text) {
    const rows = T.parseTSV(text);
    if (rows.length && /الوحدة|نص السؤال/.test(rows[0].join(" "))) rows.shift();
    return rows.map((r, i) => {
      const n = (x) => parseInt(digits(x || "").replace(/\D/g, ""), 10), out = { row: i + 1, err: null };
      const u = S.units.find((x) => x.seq === n(r[0])), l = u && u.lessons.find((x) => x.seq === n(r[1])), o = l && l.outcomes.find((x) => x.seq === n(r[2]));
      const op = [r[4], r[5], r[6], r[7]].map((x) => (x || "").trim()); let last = 3; while (last >= 0 && !op[last]) last--;
      const options = op.slice(0, last + 1), cor = ANS[digits((r[8] || "").trim()).toLowerCase().replace(/[()]/g, "")];
      const bloom = normBloom(r[9]), diff = (r[10] || "").trim() || "متوسط";
      Object.assign(out, { outcome_id: o && o.id, label: o ? o.label : "—", stem: (r[3] || "").trim(), options, correct: cor, bloom, difficulty: diff });
      if (!o) out.err = "النتاج غير موجود (تحقّق من أرقام الوحدة والدرس والنتاج)";
      else if (!out.stem) out.err = "نص السؤال فارغ";
      else if (options.length < 2 || options.some((x) => !x)) out.err = "خياران على الأقل دون فراغ بينهما";
      else if (cor === undefined || cor >= options.length) out.err = "الإجابة: أ أو ب أو ج أو د ومن الخيارات المكتوبة";
      else if (!bloom) out.err = "مستوى بلوم غير معروف";
      else if (!DIFF.includes(diff)) out.err = "الصعوبة: سهل أو متوسط أو صعب";
      return out;
    });
  }
  function importSheet(el) {
    const b = openSheet(`<h3>لصق أسئلة من إكسل</h3><p class="tiny">انسخ الصفوف من إكسل أو جوجل شيت والصقها هنا. ترتيب الأعمدة:<br><b>${TPL.join(" | ")}</b><br>
      الوحدة والدرس والنتاج أرقام. الإجابة: أ أو ب أو ج أو د. بلوم والصعوبة اختياريان.</p>
      <textarea class="input mono" id="imT" rows="8" placeholder="الصق هنا…" dir="auto"></textarea>
      <div class="row" style="margin-top:10px"><button class="btn primary" id="imP">معاينة</button><button class="btn ghost sm" id="imTpl">القالب</button></div><div id="imR" style="margin-top:14px"></div>`, true);
    b.querySelector("#imTpl").onclick = downloadTemplate;
    b.querySelector("#imP").onclick = () => {
      const rows = parseImport(b.querySelector("#imT").value), good = rows.filter((x) => !x.err);
      b.querySelector("#imR").innerHTML = `<div class="row sp" style="margin-bottom:8px"><b>${good.length} صالح · ${rows.length - good.length} فيه خطأ</b>
          <button class="btn primary" id="imGo" ${good.length ? "" : "disabled"}>استيراد ${good.length} سؤالًا</button></div>
        <div class="tw" style="max-height:340px"><table class="t"><thead><tr><th>#</th><th>الحالة</th><th>النتاج</th><th>السؤال</th><th>الإجابة</th></tr></thead><tbody>` +
        rows.map((x) => `<tr><td class="num">${x.row}</td><td>${x.err ? `<span class="pill bad">${esc(x.err)}</span>` : '<span class="pill open">صالح</span>'}</td>
          <td class="num">${esc(x.label)}</td><td>${esc(x.stem.slice(0, 80))}</td><td>${x.correct !== undefined && x.options[x.correct] ? L[x.correct] + ") " + esc(x.options[x.correct]) : "—"}</td></tr>`).join("") + "</tbody></table></div>";
      const go = b.querySelector("#imGo");
      if (go) go.onclick = async () => {
        U.spin(go, true, "جارٍ الاستيراد…");
        try {
          const r = await T.rpc("t_import_questions", { p_rows: good.map((x) => ({ outcome_id: x.outcome_id, stem: x.stem, options: x.options, correct: x.correct, bloom: x.bloom, difficulty: x.difficulty })) });
          closeSheet(); toast("استُورد " + r.inserted + " سؤالًا"); await Promise.all([T.loadQuestions(true), T.refreshExams()]); draw(el);
        } catch (e) { toast(e.message, true); U.spin(go, false); }
      };
    };
  }
  function exportBank() {
    const rows = [TPL.concat(["رقم السؤال", "الحالة"])];
    S.qs.forEach((x) => { const o = S.O[x.outcome_id]; if (!o) return;
      rows.push([o.unit.seq, o.lesson.seq, o.seq, x.stem].concat(x.options.concat(["", "", "", ""]).slice(0, 4), [L[x.correct], x.bloom, x.difficulty, x.num, x.active ? "فعّال" : "مؤرشف"])); });
    download("بنك الأسئلة.csv", csv(rows));
  }
  T.bank = { BLOOM, DIFF, label };
})();
