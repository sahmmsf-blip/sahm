// شاشة الترتيب ولوحة الشرف للمعلم: نفس احتساب صفحة الطالب (داخل الشعبة، ترتيبان، لحظيًّا)
(function () {
  const { esc } = U, S = T.S, B = () => T.brain, RK = U.RK;
  const R = { kind: "second" };
  const KINDS = { second: "النتاجات (التقويم الثاني)", total: "المجموع الكلي" };
  const BAND = { top: ["العشرة الأوائل", "gold"], mid: ["الوسط", "open"], low: ["الأواخر", "warn"] };

  // الترتيب التنافسي: المتساوون يأخذون المركز نفسه (١، ١، ٣…) — مطابق لدالة student_rank
  function ranking(secId, kind) {
    const c = B().caps();
    const rows = T.studentsOf(secId).map((s) => { const r = B().calc(s), v = kind === "second" ? r.second : r.total;
      return { s, r, v: v == null ? null : Math.round(v * 10000) / 10000 }; });
    const has = rows.filter((x) => x.v != null).sort((a, b) => b.v - a.v || a.s.serial_no - b.s.serial_no), n = has.length;
    has.forEach((x) => { x.rank = 1 + has.filter((y) => y.v > x.v).length; x.tie = has.filter((y) => y.v === x.v).length > 1; x.band = RK.band(x.rank, n); });
    return { has, none: rows.filter((x) => x.v == null), n, cap: kind === "second" ? c.cap2 : c.max };
  }
  const badge = (x, n, big) => `<span class="rkb ${big ? "big" : ""}" style="--rk-bg:${RK.theme(x.rank, n)}">${x.rank}</span>`;

  T.view("rank", {
    title: "الترتيب ولوحة الشرف", secAware: true, sub: () => "ترتيب الطلبة داخل الشعبة — يتحدّث لحظيًّا، وهو نفسه ما يراه كل طالب في صفحته",
    render(el) {
      const sec = T.sec();
      if (!sec) { el.innerHTML = T.empty("award", "لا توجد شعب بعد"); return; }
      const K = ranking(S.sec, R.kind), cnt = { top: 0, mid: 0, low: 0 }; K.has.forEach((x) => cnt[x.band]++);
      let h = `<div class="vhead"><div><h2>${esc(sec.name)}</h2><p>${K.n} طالبًا مرتَّبًا${K.none.length ? " · " + K.none.length + " لم يُقَس بعد" : ""}</p></div>
        <div class="toolbar"><div class="seg" id="rkKind">${Object.entries(KINDS).map(([k, t]) => `<button data-k="${k}" aria-pressed="${R.kind === k}">${t}</button>`).join("")}</div>
          <button class="btn primary" id="rkWall">${ic("award", "sm")}عرض لوحة الشرف على الشاشة</button></div></div>`;
      if (!K.n) { el.innerHTML = h + T.empty("award", "لا يوجد ترتيب بعد", R.kind === "second" ? "يظهر بعد أول قياس للنتاجات." : "يظهر بعد أول علامة."); wire(el); return; }

      // منصة التتويج: الثلاثة الأوائل
      const pod = K.has.filter((x) => x.rank <= 3).slice(0, 5);
      h += `<div class="card pad podium">${RK.confetti(26)}<div class="pod">` + pod.map((x) => `<a class="pd r${Math.min(x.rank, 3)}" href="#student/${x.s.id}">
          <div class="pd-ph">${T.avBox(x.s, x.rank === 1 ? 92 : 74)}${badge(x, K.n, true)}</div><b>${esc(x.s.full_name)}</b>
          <span class="tiny">المركز ${RK.ordinal(x.rank)}${x.tie ? " (مكرّر)" : ""} · ${T.nf(x.v)} من ${T.nf(K.cap)}</span></a>`).join("") + `</div></div>`;

      h += `<div class="row wrap" style="gap:8px;margin:14px 0 10px">${Object.entries(BAND).map(([k, [t, c]]) => `<span class="pill ${c}">${t}: ${cnt[k]}</span>`).join("")}
        <span class="tiny grow">العشرة الأوائل يرون «بطاقة الشرف» ورسالتك، والوسط يرى رقمه ورسالة تحفيز، و<b>الأواخر لا يرون رقم ترتيبهم</b> بل رسالة تحفيز فقط.</span></div>`;
      h += `<div class="tw"><table class="t rkt"><thead><tr><th class="num">المركز</th><th>الطالب</th><th class="num">${R.kind === "second" ? "التقويم الثاني" : "المجموع"}</th><th style="min-width:120px"></th><th>ما يراه الطالب</th></tr></thead><tbody>` +
        K.has.map((x) => { const p = K.cap ? Math.min(100, (x.v / K.cap) * 100) : 0, [bt, bc] = BAND[x.band];
          return `<tr class="b-${x.band}"><td class="num">${badge(x, K.n)}</td>
            <td><a href="#student/${x.s.id}" style="color:inherit;font-weight:600">${T.av(x.s.id, 26)}${esc(x.s.full_name)}</a>${x.rank <= 10 ? " " + RK.star : ""}${x.tie ? ' <span class="tiny">(مكرّر)</span>' : ""}</td>
            <td class="num"><b>${T.nf(x.v)}</b> <span class="tiny">من ${T.nf(K.cap)}</span></td>
            <td><div class="bar"><i style="width:${p}%"></i></div></td>
            <td><span class="pill ${bc}">${bt}</span> <span class="tiny">${x.band === "low" ? "رسالة تحفيز بلا رقم" : "المركز " + RK.ordinal(x.rank)}</span></td></tr>`; }).join("") +
        K.none.map((x) => `<tr class="dim"><td class="num">—</td><td>${T.av(x.s.id, 26)}${esc(x.s.full_name)}</td><td class="num tiny" colspan="3">لم يُقَس بعد</td></tr>`).join("") + "</tbody></table></div>";
      h += `<p class="tiny" style="margin-top:10px">يُحسب ترتيب النتاجات من علامة التقويم الثاني، وترتيب المجموع من الأول + الثاني + النهائي بما رُصد حتى الآن. المتساوون يأخذون المركز نفسه. رسائل الطلبة تعدّلها من <a href="#settings">الإعدادات</a>.</p>`;
      el.innerHTML = h; wire(el);
    }
  });

  function wire(el) {
    el.querySelectorAll("#rkKind button").forEach((b) => (b.onclick = () => { R.kind = b.dataset.k; T.route(); }));
    const w = el.querySelector("#rkWall"); if (w) w.onclick = wall;
  }

  // لوحة الشرف على شاشة الصف: العشرة الأوائل فقط (لا يُعرض ترتيب البقية أمام الزملاء)
  function wall() {
    const sec = T.sec(), K = ranking(S.sec, R.kind), top = K.has.filter((x) => x.rank <= 10);
    const box = document.createElement("div"); box.className = "hwall"; box.id = "hwall";
    box.innerHTML = `${RK.confetti(60)}<button class="hw-x" aria-label="إغلاق">✕</button>
      <div class="hw-h"><div class="hw-rib">لوحة الشرف</div><h1>${esc(S.subject.name || "")} — شعبة ${esc(sec.name)}</h1>
        <p>العشرة الأوائل في ${KINDS[R.kind]} · ${esc(new Date().toLocaleDateString("ar-JO", { day: "numeric", month: "long", year: "numeric" }))}</p></div>
      <div class="hw-g">${top.map((x) => `<div class="hw-c r${Math.min(x.rank, 4)}"><div class="hw-ph">${T.avBox(x.s, x.rank <= 3 ? 120 : 92)}${badge(x, K.n, true)}</div>
        <b>${esc(x.s.full_name)}</b><span>${RK.star} المركز ${RK.ordinal(x.rank)}</span></div>`).join("") || '<p style="grid-column:1/-1;text-align:center">لا ترتيب بعد.</p>'}</div>
      <div class="hw-f">معلّم المادة: ${esc(S.me.full_name || "")} · منصة السهم العلمي</div>`;
    document.body.appendChild(box);
    const close = () => { document.removeEventListener("keydown", esc_); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); box.remove(); };
    const esc_ = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", esc_);
    box.querySelector(".hw-x").onclick = close;
    try { if (box.requestFullscreen) box.requestFullscreen().catch(() => {}); } catch (e) {}
    box.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement && document.body.contains(box)) close(); });
  }
  T.rank = { ranking };
})();
