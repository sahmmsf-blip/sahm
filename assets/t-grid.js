// رصد النتاجات (مستوى الإتقان ١–٤ بالأداة والتاريخ) + العلامات (الاختبار الأول والنهائي)
(function () {
  const { esc, toast, openSheet, closeSheet, confirmSheet, digits } = U, S = T.S, B = () => T.brain;
  const G = { lesson: null, tool: "observation", date: null };
  try { G.lesson = localStorage.getItem("sahm_t_lesson"); } catch (e) {}

  T.view("grid", {
    title: "رصد النتاجات", secAware: true, sub: () => "اضغط الخلية أو اكتب ١–٤ بلوحة المفاتيح؛ واضغط رأس العمود لتعبئته للجميع",
    render(el, arg) {
      if (!T.sec()) { el.innerHTML = T.empty("users", "لا توجد شعب بعد"); return; }
      const units = T.semUnits(S.sec), studs = T.studentsOf(S.sec);
      const lessons = units.flatMap((u) => u.lessons);
      if (arg && S.L[arg]) G.lesson = arg;
      if (!G.lesson || !lessons.find((l) => l.id === G.lesson)) {
        const firstGap = lessons.find((l) => l.outcomes.some((o) => studs.some((s) => !B().effOf(s.id, o.id))));
        G.lesson = (firstGap || lessons[0] || {}).id;
      }
      try { localStorage.setItem("sahm_t_lesson", G.lesson || ""); } catch (e) {}
      G.date = G.date || T.today();
      const L = S.L[G.lesson];
      let h = `<div class="card pad lessonbar">` + units.map((u) => `<div class="u"><b>الوحدة ${u.seq}</b>` + u.lessons.map((l) => {
          const cells = l.outcomes.length * studs.length; let n = 0;
          l.outcomes.forEach((o) => studs.forEach((s) => { if (B().effOf(s.id, o.id)) n++; }));
          const pc = cells ? Math.round((n / cells) * 100) : 0;
          return `<button class="chip ${l.id === G.lesson ? "on" : ""}" data-l="${l.id}" title="${esc(l.title)}">الدرس ${l.seq}<span class="n">${pc}٪</span></button>`;
        }).join("") + "</div>").join("") + `</div>`;
      if (!L) { el.innerHTML = h + T.empty("target", "لا دروس في هذا الفصل"); wireLessons(el); return; }
      h += `<div class="vhead" style="margin-top:16px"><div><h2>الدرس ${L.seq}: ${esc(L.title)}</h2><p>الوحدة ${L.unit.seq}: ${esc(L.unit.title)} · ${L.outcomes.length} نتاجات · ${studs.length} طالبًا</p></div>
        <div class="toolbar"><select class="input sm" id="gTool" style="width:auto">${T.opt(G.tool, S.tools.map((t) => [t.code, t.name]))}</select>
          <input type="date" class="input sm" id="gDate" value="${G.date}" style="width:auto"></div></div>
        <div class="legend" style="margin-bottom:10px">${[1, 2, 3, 4].map((k) => `<span class="l${k}">${k} · ${T.LV[k]}</span>`).join("")}
          <span style="background:var(--surface-2)"><i style="width:7px;height:7px;border-radius:50%;background:var(--gold);display:inline-block"></i> من اختبار إلكتروني</span></div>`;
      if (!studs.length) { el.innerHTML = h + T.empty("users", "لا طلبة في هذه الشعبة"); wireLessons(el); return; }
      h += `<div class="tw" style="max-height:72vh"><table class="mgrid" id="mg"><thead><tr><th class="nm">الطالب</th>` +
        L.outcomes.map((o) => { const n = studs.filter((s) => B().effOf(s.id, o.id)).length;
          return `<th class="oh" data-col="${o.id}" title="اضغط لتعبئة العمود — ${esc(o.text)}"><div class="vt">${esc(o.text)}</div><span class="n">ن${o.seq}</span><span class="cv">${n}/${studs.length}</span></th>`; }).join("") +
        `<th class="oh" style="cursor:default"><div class="vt">متوسط الطالب في الدرس</div></th></tr></thead><tbody>` +
        studs.map((s, ri) => {
          const lv = L.outcomes.map((o) => B().effOf(s.id, o.id)), got = lv.filter(Boolean);
          const avg = got.length ? got.reduce((a, r) => a + r.level, 0) / got.length : null;
          return `<tr><td class="nm"><div class="stud"><span class="no">${s.serial_no}</span><a class="s" href="#student/${s.id}" style="color:inherit">${esc(s.full_name)}</a></div></td>` +
            L.outcomes.map((o, ci) => { const r = lv[ci], n = B().countOf(s.id, o.id);
              return `<td class="c"><button class="cell ${r ? "l" + r.level : ""}" data-s="${s.id}" data-o="${o.id}" data-r="${ri}" data-c="${ci}">${r ? r.level : "·"}${r && r.source === "exam" ? '<span class="src"></span>' : ""}${n > 1 ? `<span class="cnt">${n}</span>` : ""}</button></td>`; }).join("") +
            `<td class="c"><b class="num" style="color:var(--ink-2)">${avg ? T.nf(avg, 1) : "—"}</b></td></tr>`;
        }).join("") + "</tbody></table></div>";
      const cells = L.outcomes.length * studs.length; let done = 0; L.outcomes.forEach((o) => studs.forEach((s) => { if (B().effOf(s.id, o.id)) done++; }));
      h += `<p class="tiny" style="margin-top:10px">قِيس ${done} من ${cells} خانة في هذا الدرس. يُعتمد لكل نتاج ${B().caps().rule === "latest" ? "أحدث" : "أعلى"} مستوى، وكل قياس يبقى محفوظًا بتاريخه وأداته دليلًا للمشرف.
        <br>اختصار: انقر خلية ثم اكتب 1–4، وتنقّل بالأسهم.</p>`;
      el.innerHTML = h;
      wireLessons(el);
      el.querySelector("#gTool").onchange = (e) => (G.tool = e.target.value);
      el.querySelector("#gDate").onchange = (e) => (G.date = e.target.value || T.today());
      el.querySelectorAll(".cell").forEach((b) => {
        b.onclick = () => cellSheet(b.dataset.s, b.dataset.o);
        b.onkeydown = (e) => {
          const k = digits(e.key);
          if (/^[1-4]$/.test(k)) { e.preventDefault(); saveLevel(b.dataset.s, b.dataset.o, +k, { r: +b.dataset.r, c: +b.dataset.c }); }
          const mv = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, 1], ArrowRight: [0, -1] }[e.key];
          if (mv) { e.preventDefault(); const t = el.querySelector(`.cell[data-r="${+b.dataset.r + mv[0]}"][data-c="${+b.dataset.c + mv[1]}"]`); if (t) t.focus(); }
        };
      });
      el.querySelectorAll("[data-col]").forEach((b) => (b.onclick = () => columnSheet(b.dataset.col, studs)));
      if (G.focus) { const t = el.querySelector(`.cell[data-r="${G.focus.r}"][data-c="${G.focus.c}"]`); if (t) t.focus(); G.focus = null; }
    }
  });
  function wireLessons(el) { el.querySelectorAll("[data-l]").forEach((b) => (b.onclick = () => { G.lesson = b.dataset.l; T.go("#grid/" + b.dataset.l); })); }

  async function saveLevel(sid, oid, level, focus) {
    try {
      await T.W.addMastery([{ student_id: sid, outcome_id: oid, tool_code: G.tool, level, assessed_on: G.date }]);
      toast("حُفظ · " + T.LV[level]);
      if (focus) G.focus = { r: focus.r + 1, c: focus.c };
      const y = window.scrollY; T.route(); window.scrollTo(0, y);
    } catch (e) { toast("تعذّر الحفظ — " + e.message, true); }
  }
  function cellSheet(sid, oid) {
    const st = S.stu[sid], o = S.O[oid], cur = B().effOf(sid, oid);
    const hist = S.mastery.filter((m) => m.student_id === sid && m.outcome_id === oid).sort((a, b) => b.assessed_on.localeCompare(a.assessed_on) || (b.created_at || "").localeCompare(a.created_at || ""));
    const b = openSheet(`<h3>${esc(st.full_name)}</h3><div class="note" style="margin-bottom:12px"><b>${esc(o.label)}</b> — ${esc(o.text)}<br>
        <span class="tiny">الأداة: ${esc(T.toolName(G.tool))} · ${esc(T.fmtD(G.date))} (غيّرهما من أعلى الجدول)</span></div>
      <div class="levels">${[1, 2, 3, 4].map((k) => `<button class="lvbtn" data-l="${k}" ${cur && cur.level === k ? 'aria-pressed="true"' : ""}><b>${k}</b><span><i>${T.LV[k]}</i><s>${T.LVD[k]}</s></span><span class="tiny">${k * 25}٪</span></button>`).join("")}</div>
      ${hist.length ? `<div class="lbl" style="margin-top:16px">سجل القياسات (${hist.length})</div><div class="hist">` + hist.map((m) => `<div class="h"><span class="lv lv${m.level}">${m.level} · ${T.LV[m.level]}</span>
          <span class="grow">${esc(T.toolName(m.tool_code))} · ${esc(T.fmtD(m.assessed_on))}${m.source === "exam" ? ' · <span class="pill gold">اختبار إلكتروني</span>' : ""}</span>
          ${m.source === "exam" ? "" : `<button class="btn sm ghost" data-del="${m.id}">حذف</button>`}</div>`).join("") + "</div>" : ""}`);
    b.querySelectorAll(".lvbtn").forEach((x) => (x.onclick = () => { closeSheet(); saveLevel(sid, oid, +x.dataset.l); }));
    b.querySelectorAll("[data-del]").forEach((x) => (x.onclick = async () => {
      try { await T.W.delMastery(x.dataset.del); closeSheet(); toast("حُذف القياس"); const y = window.scrollY; T.route(); window.scrollTo(0, y); } catch (e) { toast(e.message, true); }
    }));
  }
  function columnSheet(oid, studs) {
    const o = S.O[oid], miss = studs.filter((s) => !B().effOf(s.id, oid));
    const b = openSheet(`<h3>تعبئة عمود كامل</h3><div class="note" style="margin-bottom:12px"><b>${esc(o.label)}</b> — ${esc(o.text)}</div>
      <div class="seg" id="colScope" style="margin-bottom:12px"><button data-x="miss" aria-pressed="true">غير المقيسين فقط (${miss.length})</button><button data-x="all" aria-pressed="false">كل الطلبة (${studs.length})</button></div>
      <div class="levels">${[1, 2, 3, 4].map((k) => `<button class="lvbtn" data-l="${k}"><b>${k}</b><span><i>${T.LV[k]}</i><s>يُسند للطلبة المختارين في هذا النتاج</s></span></button>`).join("")}</div>
      <p class="tiny" style="margin-top:12px">مفيد بعد ورقة عمل أو اختبار ورقي صحّحته كاملًا — ثم عدّل الاستثناءات فرديًّا.</p>`);
    let scope = "miss";
    b.querySelectorAll("#colScope button").forEach((x) => (x.onclick = () => { scope = x.dataset.x; b.querySelectorAll("#colScope button").forEach((z) => z.setAttribute("aria-pressed", z === x)); }));
    b.querySelectorAll(".lvbtn").forEach((x) => (x.onclick = async () => {
      const list = scope === "miss" ? miss : studs; if (!list.length) return toast("لا يوجد طلبة غير مقيسين", true);
      closeSheet();
      try { await T.W.addMastery(list.map((s) => ({ student_id: s.id, outcome_id: oid, tool_code: G.tool, level: +x.dataset.l, assessed_on: G.date })));
        toast("حُفظ لـ " + list.length + " طالبًا"); T.route(); } catch (e) { toast(e.message, true); }
    }));
  }

  // ================= العلامات =================
  T.view("marks", {
    title: "العلامات", secAware: true, sub: () => "الاختبار الأول والنهائي — والتقويم الثاني يُحسب تلقائيًّا من النتاجات",
    render(el) {
      if (!T.sec()) { el.innerHTML = T.empty("users", "لا توجد شعب بعد"); return; }
      const studs = T.studentsOf(S.sec), c = B().caps();
      if (!studs.length) { el.innerHTML = T.empty("users", "لا طلبة في هذه الشعبة"); return; }
      const mk = (sid, slot) => B().markOf(sid, slot) || {};
      let h = `<div class="vhead"><div><h2>علامات «${esc(T.sec().name)}»</h2><p>الأول من ${T.nf(c.cap1)} · الثاني (النتاجات) من ${T.nf(c.cap2)} · النهائي من ${T.nf(c.cap3)} · المجموع من ${T.nf(c.max)}</p></div>
        <div class="toolbar"><button class="btn outline sm" id="mPaste">${ic("file", "sm")}لصق عمود من إكسل</button><button class="btn primary" id="mSave">${ic("check", "sm")}حفظ العلامات</button></div></div>
        <div class="tw"><table class="t" id="mT"><thead><tr><th class="num">م</th><th>الطالب</th><th class="num">الأول (${T.nf(c.cap1)})</th><th class="num">غائب بلا عذر</th>
          <th class="num">الثاني (${T.nf(c.cap2)})</th><th class="num">النهائي (${T.nf(c.cap3)})</th><th class="num">غائب بلا عذر</th><th class="num">المجموع</th><th>التقدير</th></tr></thead><tbody>` +
        studs.map((s) => { const f = mk(s.id, "first_written"), z = mk(s.id, "final_written"), r = B().calc(s);
          return `<tr data-s="${s.id}"><td class="num">${s.serial_no}</td><td><a href="#student/${s.id}" style="color:inherit;font-weight:600">${esc(s.full_name)}</a></td>
            <td class="num"><input class="input mono m1" inputmode="decimal" value="${f.mark != null ? f.mark : ""}" style="width:84px;text-align:center"></td>
            <td class="num"><input type="checkbox" class="a1" ${f.absent_no_excuse ? "checked" : ""} style="width:18px;height:18px;accent-color:var(--danger)"></td>
            <td class="num"><b>${T.nf(r.second)}</b></td>
            <td class="num"><input class="input mono m3" inputmode="decimal" value="${z.mark != null ? z.mark : ""}" style="width:84px;text-align:center"></td>
            <td class="num"><input type="checkbox" class="a3" ${z.absent_no_excuse ? "checked" : ""} style="width:18px;height:18px;accent-color:var(--danger)"></td>
            <td class="num"><b class="tot">${T.nf(r.total)}</b></td><td class="vb">${esc(r.verbal)}</td></tr>`; }).join("") +
        `</tbody></table></div><p class="tiny" style="margin-top:10px">«غائب بلا عذر» يُحتسب صفرًا. اترك الخانة فارغة إن لم يُقدَّم الاختبار بعد. علامة الاختبار الأول قد تُكتب تلقائيًّا عند اعتماد اختبار إلكتروني من نوع «الاختبار الأول».</p>`;
      el.innerHTML = h;
      const live = (tr) => {
        const s = S.stu[tr.dataset.s], r = B().calc(s);
        const v1 = tr.querySelector(".a1").checked ? 0 : num(tr.querySelector(".m1").value), v3 = tr.querySelector(".a3").checked ? 0 : num(tr.querySelector(".m3").value);
        const parts = [v1, r.second, v3].filter((x) => x != null), tot = parts.length ? parts.reduce((a, b) => a + b, 0) : null;
        tr.querySelector(".tot").textContent = T.nf(tot);
        tr.querySelector(".vb").textContent = v1 != null && r.second != null && v3 != null ? B().verbal((tot / c.max) * 100) : "—";
        [[".m1", c.cap1], [".m3", c.cap3]].forEach(([k, cap]) => { const i = tr.querySelector(k), v = num(i.value); i.classList.toggle("bad", v != null && (v < 0 || v > cap)); });
      };
      el.querySelectorAll("#mT tbody tr").forEach((tr) => tr.querySelectorAll("input").forEach((i) => (i.oninput = () => { if (i.classList.contains("m1") || i.classList.contains("m3")) i.value = digits(i.value).replace(/[^\d.]/g, ""); live(tr); })));
      el.querySelector("#mSave").onclick = async () => {
        const rows = [];
        for (const tr of el.querySelectorAll("#mT tbody tr")) {
          const sid = tr.dataset.s;
          for (const [slot, mi, ai, cap] of [["first_written", ".m1", ".a1", c.cap1], ["final_written", ".m3", ".a3", c.cap3]]) {
            const v = num(tr.querySelector(mi).value), a = tr.querySelector(ai).checked;
            if (v != null && (v < 0 || v > cap)) return toast("علامة خارج الحد للطالب " + S.stu[sid].full_name, true);
            const old = B().markOf(sid, slot) || {};
            if ((old.mark != null ? +old.mark : null) === v && !!old.absent_no_excuse === a) continue;
            rows.push({ student_id: sid, slot, mark: a ? null : v, absent_no_excuse: a });
          }
        }
        if (!rows.length) return toast("لا تغييرات");
        const btn = el.querySelector("#mSave"); U.spin(btn, true, "جارٍ الحفظ…");
        try { await T.W.saveMarks(rows); toast("حُفظ " + rows.length + " علامة"); T.route(); } catch (e) { toast(e.message, true); U.spin(btn, false); }
      };
      el.querySelector("#mPaste").onclick = () => {
        const b = openSheet(`<h3>لصق علامات من إكسل</h3><p class="tiny">إمّا عمود علامات بترتيب الطلبة في الجدول، أو عمودان: الرقم التسلسلي | العلامة. اكتب «غ» للغائب بلا عذر.</p>
          <div class="seg" id="pSlot" style="margin:8px 0"><button data-k="m1" aria-pressed="true">الاختبار الأول</button><button data-k="m3" aria-pressed="false">الاختبار النهائي</button></div>
          <textarea class="input mono" id="pT" rows="8" dir="auto"></textarea><button class="btn primary block" id="pGo" style="margin-top:10px">تعبئة الجدول</button>`);
        let k = "m1"; b.querySelectorAll("#pSlot button").forEach((x) => (x.onclick = () => { k = x.dataset.k; b.querySelectorAll("#pSlot button").forEach((z) => z.setAttribute("aria-pressed", z === x)); }));
        b.querySelector("#pGo").onclick = () => {
          const rows = T.parseTSV(b.querySelector("#pT").value), trs = [...el.querySelectorAll("#mT tbody tr")]; let n = 0;
          rows.forEach((r, i) => {
            let tr, val;
            if (r.length >= 2 && r[1].trim() !== "") { const ser = parseInt(digits(r[0]).replace(/\D/g, ""), 10); tr = trs.find((t) => S.stu[t.dataset.s].serial_no === ser); val = r[1]; }
            else { tr = trs[i]; val = r[0]; }
            if (!tr) return; val = (val || "").trim();
            const ab = tr.querySelector(k === "m1" ? ".a1" : ".a3");
            if (/^غ/.test(val)) { ab.checked = true; tr.querySelector("." + k).value = ""; } else { ab.checked = false; tr.querySelector("." + k).value = digits(val).replace(/[^\d.]/g, ""); }
            live(tr); n++;
          });
          closeSheet(); toast("عُبّئت " + n + " خانة — راجع ثم اضغط «حفظ العلامات»");
        };
      };
    }
  });
  const num = (v) => { v = String(v || "").trim(); if (v === "") return null; const n = Number(v); return isNaN(n) ? null : n; };
})();
