/* calc.js — آلة حاسبة علمية بنمط fx-82MS / KK-82MS-D (المعتمدة في وزارة التربية والتعليم)
   منصة السهم العلمي — تعمل داخل الاختبارات وأوراق العمل والتدريب دون أن تغطي السؤال.
   محرّك حساب بلا eval وفق أولويات الآلة: (1) دوال بأقواس Pol( Rec( (2) اللاحقة x² x⁻¹ x! °'" (3) ^ و x√
   (4) a b/c (5) الضرب المختصر قبل π والمتغيرات والأقواس (6) الدوال السابقة و(−) (7) الضرب المختصر قبلها (8) nPr nCr (9) × ÷ (10) + −  */
(function () {
  "use strict";
  if (window.SahmCalc) return;

  // ===================== أدوات عددية =====================
  const MAXQ = 1e15;
  function CE(t, pos) { const e = new Error(t); e.calc = t; e.pos = pos; return e; }
  const ME = () => CE("Math");
  function r15(x) { if (!isFinite(x) || x === 0) return x; if (Math.abs(x) < 1e-99) return 0; return +x.toPrecision(15); }
  function chk(x) { if (typeof x !== "number" || isNaN(x) || !isFinite(x) || Math.abs(x) >= 1e100) throw ME(); return r15(x) || 0; }
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { const t = a % b; a = b; b = t; } return a; }
  function sm(a, b) { const r = a * b; return Math.abs(r) <= 9e15 ? r : NaN; }
  function Qs(n, d) {
    if (isNaN(n) || isNaN(d) || d === 0) return null;
    if (d < 0) { n = -n; d = -d; }
    const g = gcd(n, d) || 1; n /= g; d /= g;
    if (!Number.isSafeInteger(n) || !Number.isSafeInteger(d) || Math.abs(n) > MAXQ || d > MAXQ) return null;
    return [n, d];
  }
  function mk(v, q) { if (q) return { v: chk(q[0] / q[1]), q }; return { v: chk(v), q: null }; }
  const num = (v) => mk(v, null);
  const add = (a, b) => mk(a.v + b.v, a.q && b.q ? Qs(sm(a.q[0], b.q[1]) + sm(b.q[0], a.q[1]), sm(a.q[1], b.q[1])) : null);
  const sub = (a, b) => mk(a.v - b.v, a.q && b.q ? Qs(sm(a.q[0], b.q[1]) - sm(b.q[0], a.q[1]), sm(a.q[1], b.q[1])) : null);
  const mul = (a, b) => mk(a.v * b.v, a.q && b.q ? Qs(sm(a.q[0], b.q[0]), sm(a.q[1], b.q[1])) : null);
  const div = (a, b) => { if (b.v === 0) throw ME(); return mk(a.v / b.v, a.q && b.q ? Qs(sm(a.q[0], b.q[1]), sm(a.q[1], b.q[0])) : null); };
  const neg = (a) => mk(-a.v, a.q ? [-a.q[0], a.q[1]] : null);
  const isInt = (x) => Number.isInteger(x);

  function powV(a, b) {
    const x = a.v, y = b.v;
    if (x === 0 && y <= 0) throw ME();
    if (a.q && b.q && b.q[1] === 1 && Math.abs(b.q[0]) <= 64) {
      const n = b.q[0]; let qn = 1, qd = 1, ok = true;
      for (let i = 0; i < Math.abs(n); i++) { qn = sm(qn, a.q[0]); qd = sm(qd, a.q[1]); if (isNaN(qn) || isNaN(qd)) { ok = false; break; } }
      if (ok) { const q = n >= 0 ? Qs(qn, qd) : Qs(qd, qn); if (q) return mk(0, q); }
    }
    if (x < 0 && !isInt(y)) {
      const inv = 1 / y, k = Math.round(inv);
      if (Math.abs(inv - k) < 1e-9 && Math.abs(k) % 2 === 1) return num(-Math.pow(-x, y));
      throw ME();
    }
    return num(Math.pow(x, y));
  }
  function xroot(n, y) { // n x√ y
    const k = n.v, v = y.v;
    if (k === 0) throw ME();
    if (v < 0) { if (isInt(k) && Math.abs(k) % 2 === 1) return num(-Math.pow(-v, 1 / k)); throw ME(); }
    if (v === 0 && k < 0) throw ME();
    return num(Math.pow(v, 1 / k));
  }
  function fact(a) {
    const x = a.v; if (!isInt(x) || x < 0 || x > 69) throw ME();
    let r = 1; for (let i = 2; i <= x; i++) r *= i;
    return mk(r, r <= MAXQ ? [r, 1] : null);
  }
  function perm(op, a, b) {
    const n = a.v, r = b.v;
    if (!isInt(n) || !isInt(r) || n < 0 || r < 0 || r > n || n >= 1e10) throw ME();
    let v = 1;
    if (op === "npr") { for (let i = 0; i < r; i++) { v *= n - i; if (v >= 1e100) throw ME(); } }
    else { const k = Math.min(r, n - r); for (let i = 0; i < k; i++) { v = (v * (n - i)) / (i + 1); if (v >= 1e100) throw ME(); } if (v < 1e15) v = Math.round(v); }
    return mk(v, v <= MAXQ && isInt(v) ? [v, 1] : null);
  }

  // ===================== الحالة =====================
  const st = {
    mode: "COMP", reg: "Lin", ang: "D", fmt: { t: "Norm", n: 1 }, fd: "ab/c",
    vars: { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, X: 0, Y: 0, M: 0 }, ans: { v: 0, q: [0, 1] },
    tok: [], cur: 0, ins: false, phase: "input", last: null, top: null,
    disp: { v: 0, q: null }, view: "dec", eng: null, mixed: true,
    shift: false, alpha: false, hyp: false, sto: false, rcl: false,
    menu: null, err: null, errTok: null, hist: [], hi: -1,
    data: [], lastDT: null, browse: null, pct: null,
  };

  // ===================== الزوايا والمثلثات =====================
  const toRad = (x) => (st.ang === "D" ? (x * Math.PI) / 180 : st.ang === "G" ? (x * Math.PI) / 200 : x);
  const fromRad = (x) => (st.ang === "D" ? (x * 180) / Math.PI : st.ang === "G" ? (x * 200) / Math.PI : x);
  function trig(f, x) {
    const full = st.ang === "D" ? 360 : st.ang === "G" ? 400 : 0;
    if (full) {
      if (Math.abs(x) >= (st.ang === "D" ? 9e9 : 1e10)) throw ME();
      let m = x % full; if (m < 0) m += full;
      const q4 = full / 4;
      if (m % q4 === 0) {
        const k = m / q4;
        if (f === "sin") return [0, 1, 0, -1][k];
        if (f === "cos") return [1, 0, -1, 0][k];
        if (k % 2) throw ME(); return 0;
      }
      x = toRad(m);
    } else if (Math.abs(x) >= 1.57e8) throw ME();
    let r = f === "sin" ? Math.sin(x) : f === "cos" ? Math.cos(x) : Math.tan(x);
    if (Math.abs(r) < 1e-13) r = 0;
    return r;
  }
  function applyPre(k, a) {
    const x = a.v;
    switch (k) {
      case "sin": case "cos": case "tan": return num(trig(k, x));
      case "asin": case "acos": if (Math.abs(x) > 1) throw ME(); return num(fromRad(k === "asin" ? Math.asin(x) : Math.acos(x)));
      case "atan": return num(fromRad(Math.atan(x)));
      case "sinh": return num(Math.sinh(x));
      case "cosh": return num(Math.cosh(x));
      case "tanh": return num(Math.tanh(x));
      case "asinh": return num(Math.asinh(x));
      case "acosh": if (x < 1) throw ME(); return num(Math.acosh(x));
      case "atanh": if (Math.abs(x) >= 1) throw ME(); return num(Math.atanh(x));
      case "log": if (x <= 0) throw ME(); return num(Math.log10(x));
      case "ln": if (x <= 0) throw ME(); return num(Math.log(x));
      case "tenx": return powV(mk(10, [10, 1]), a);
      case "ex": return num(Math.exp(x));
      case "sqrt": {
        if (x < 0) throw ME();
        if (a.q && a.q[0] >= 0) { const n = Math.round(Math.sqrt(a.q[0])), d = Math.round(Math.sqrt(a.q[1])); if (n * n === a.q[0] && d * d === a.q[1]) return mk(0, [n, d]); }
        return num(Math.sqrt(x));
      }
      case "cbrt": return num(Math.cbrt(x));
      case "neg": return neg(a);
    }
    throw CE("Syntax");
  }
  function rndV(a) {
    const x = a.v, f = st.fmt;
    if (f.t === "Fix") return num(+x.toFixed(f.n));
    if (f.t === "Sci") return num(+x.toPrecision(f.n || 10));
    return num(+x.toPrecision(10));
  }

  // ===================== الإحصاء والانحدار =====================
  function sums() {
    const s = { n: 0, sx: 0, sx2: 0, sy: 0, sy2: 0, sxy: 0, sx3: 0, sx2y: 0, sx4: 0 };
    for (const d of st.data) {
      const f = d.f, x = d.x, y = d.y || 0;
      s.n += f; s.sx += f * x; s.sx2 += f * x * x; s.sy += f * y; s.sy2 += f * y * y; s.sxy += f * x * y;
      s.sx3 += f * x * x * x; s.sx2y += f * x * x * y; s.sx4 += f * x * x * x * x;
    }
    return s;
  }
  function regCoef() {
    const t = st.reg, n = sums().n; if (!n) throw ME();
    if (t === "Quad") {
      const s = sums();
      const Sxx = s.sx2 - (s.sx * s.sx) / n, Sxy = s.sxy - (s.sx * s.sy) / n, Sxx2 = s.sx3 - (s.sx * s.sx2) / n,
        Sx2x2 = s.sx4 - (s.sx2 * s.sx2) / n, Sx2y = s.sx2y - (s.sx2 * s.sy) / n, den = Sxx * Sx2x2 - Sxx2 * Sxx2;
      if (!den) throw ME();
      const B = (Sxy * Sx2x2 - Sx2y * Sxx2) / den, C = (Sx2y * Sxx - Sxy * Sxx2) / den, A = s.sy / n - (B * s.sx) / n - (C * s.sx2) / n;
      return { A, B, C, r: null };
    }
    let X = 0, Y = 0, XX = 0, YY = 0, XY = 0, N = 0;
    for (const d of st.data) {
      let x = d.x, y = d.y;
      if (t === "Log" || t === "Pwr") { if (x <= 0) throw ME(); x = Math.log(x); }
      if (t === "Exp" || t === "Pwr") { if (y <= 0) throw ME(); y = Math.log(y); }
      if (t === "Inv") { if (x === 0) throw ME(); x = 1 / x; }
      N += d.f; X += d.f * x; Y += d.f * y; XX += d.f * x * x; YY += d.f * y * y; XY += d.f * x * y;
    }
    const den = N * XX - X * X; if (!den) throw ME();
    const B = (N * XY - X * Y) / den, A0 = (Y - B * X) / N;
    const rd = Math.sqrt(den * (N * YY - Y * Y));
    return { A: t === "Exp" || t === "Pwr" ? Math.exp(A0) : A0, B, C: 0, r: rd ? (N * XY - X * Y) / rd : null };
  }
  function statVal(k) {
    const s = sums();
    const need = (m) => { if (s.n < m) throw ME(); };
    switch (k) {
      case "sn": return s.n;
      case "sx": return s.sx; case "sx2": return s.sx2; case "sy": return s.sy; case "sy2": return s.sy2; case "sxy": return s.sxy;
      case "sx3": return s.sx3; case "sx2y": return s.sx2y; case "sx4": return s.sx4;
      case "mx": need(1); return s.sx / s.n;
      case "my": need(1); return s.sy / s.n;
      case "sxn": need(1); return Math.sqrt(Math.max(0, s.sx2 / s.n - (s.sx / s.n) ** 2));
      case "syn": need(1); return Math.sqrt(Math.max(0, s.sy2 / s.n - (s.sy / s.n) ** 2));
      case "sxn1": need(2); return Math.sqrt(Math.max(0, (s.sx2 - (s.sx * s.sx) / s.n) / (s.n - 1)));
      case "syn1": need(2); return Math.sqrt(Math.max(0, (s.sy2 - (s.sy * s.sy) / s.n) / (s.n - 1)));
      case "rA": return regCoef().A;
      case "rB": return regCoef().B;
      case "rC": return regCoef().C;
      case "rr": { const r = regCoef().r; if (r == null) throw ME(); return r; }
    }
    throw CE("Syntax");
  }
  function estim(k, a) {
    const v = a.v, c = regCoef(), t = st.reg, { A, B, C } = c;
    if (k === "yh") {
      switch (t) {
        case "Lin": return num(A + B * v);
        case "Log": if (v <= 0) throw ME(); return num(A + B * Math.log(v));
        case "Exp": return num(A * Math.exp(B * v));
        case "Pwr": return num(A * Math.pow(v, B));
        case "Inv": if (v === 0) throw ME(); return num(A + B / v);
        case "Quad": return num(A + B * v + C * v * v);
      }
    }
    if (t === "Quad") {
      if (k === "xh") throw CE("Syntax");
      const D = B * B - 4 * C * (A - v); if (D < 0 || !C) throw ME();
      return num((-B + (k === "xh1" ? 1 : -1) * Math.sqrt(D)) / (2 * C));
    }
    if (k !== "xh") throw CE("Syntax");
    if (!B) throw ME();
    switch (t) {
      case "Lin": return num((v - A) / B);
      case "Log": return num(Math.exp((v - A) / B));
      case "Exp": if (v / A <= 0) throw ME(); return num(Math.log(v / A) / B);
      case "Pwr": if (v / A < 0) throw ME(); return num(Math.pow(v / A, 1 / B));
      case "Inv": if (v === A) throw ME(); return num(B / (v - A));
    }
    throw ME();
  }

  // ===================== الرموز =====================
  const PRE = { sin: 1, cos: 1, tan: 1, asin: 1, acos: 1, atan: 1, sinh: 1, cosh: 1, tanh: 1, asinh: 1, acosh: 1, atanh: 1, log: 1, ln: 1, tenx: 1, ex: 1, sqrt: 1, cbrt: 1 };
  const POST = { sq: 1, cube: 1, inv: 1, fact: 1, dms: 1, dD: 1, dR: 1, dG: 1 };
  const EST = { xh: 1, yh: 1, xh1: 1, xh2: 1 };
  const STATV = { sx2: 1, sx: 1, sn: 1, sy2: 1, sy: 1, sxy: 1, sx3: 1, sx2y: 1, sx4: 1, mx: 1, sxn: 1, sxn1: 1, my: 1, syn: 1, syn1: 1, rA: 1, rB: 1, rC: 1, rr: 1 };
  const VARS = { vA: "A", vB: "B", vC: "C", vD: "D", vE: "E", vF: "F", vX: "X", vY: "Y", vM: "M" };
  const T = {
    ".": ".", E: "E", "+": "+", "-": "−", "*": "×", "/": "÷", neg: "-", frac: "⌟", pow: "^", xrt: "ˣ√", npr: "P", ncr: "C",
    sq: "²", cube: "³", inv: "⁻¹", fact: "!", dms: "°", dD: "°", dR: "ʳ", dG: "ᵍ", xh: "x̂", yh: "ŷ", xh1: "x̂1", xh2: "x̂2",
    sin: "sin ", cos: "cos ", tan: "tan ", asin: "sin⁻¹ ", acos: "cos⁻¹ ", atan: "tan⁻¹ ", sinh: "sinh ", cosh: "cosh ", tanh: "tanh ",
    asinh: "sinh⁻¹ ", acosh: "cosh⁻¹ ", atanh: "tanh⁻¹ ", log: "log ", ln: "ln ", tenx: "10^", ex: "e^", sqrt: "√", cbrt: "³√",
    "(": "(", ")": ")", ",": ",", ";": ";", pol: "Pol(", rec: "Rec(", rnd: "Rnd(", pi: "π", ans: "Ans", ran: "Ran#",
    sx2: "Σx²", sx: "Σx", sn: "n", sy2: "Σy²", sy: "Σy", sxy: "Σxy", sx3: "Σx³", sx2y: "Σx²y", sx4: "Σx⁴",
    mx: "x̄", sxn: "xσn", sxn1: "xσn-1", my: "ȳ", syn: "yσn", syn1: "yσn-1", rA: "A", rB: "B", rC: "C", rr: "r",
  };
  for (let i = 0; i < 10; i++) T[String(i)] = String(i);
  for (const k in VARS) T[k] = VARS[k];
  const tt = (k) => T[k] || k;

  // ===================== التحليل والتقييم =====================
  function lex(tokens) {
    const L = []; let i = 0;
    while (i < tokens.length) {
      const k = tokens[i].k;
      if (/^[0-9.E]$/.test(k)) {
        const pos = i; let m = "", dot = false, ex = null, isI = true;
        while (i < tokens.length && /^[0-9.]$/.test(tokens[i].k)) { const c = tokens[i].k; if (c === ".") { if (dot) throw CE("Syntax", i); dot = true; isI = false; } m += c; i++; }
        if (i < tokens.length && tokens[i].k === "E") {
          isI = false; i++; let e = "";
          if (i < tokens.length && (tokens[i].k === "neg" || tokens[i].k === "-")) { e = "-"; i++; }
          while (i < tokens.length && /^[0-9]$/.test(tokens[i].k)) { e += tokens[i].k; i++; }
          if (!/\d/.test(e)) throw CE("Syntax", i);
          if (i < tokens.length && tokens[i].k === "E") throw CE("Syntax", i);
          ex = +e;
        }
        if (m === "" || m === ".") m = ex !== null && m === "" ? "1" : "0";
        let v = +m; if (ex !== null) v = +(m + "e" + ex);
        if (!isFinite(v) || Math.abs(v) >= 1e100) throw ME();
        L.push({ k: "num", v, int: isI && Math.abs(v) <= MAXQ, pos });
        continue;
      }
      L.push({ k, pos: i }); i++;
    }
    return L;
  }
  function evaluate(tokens) {
    const L = lex(tokens); let p = 0, hasFrac = false, hasDms = false;
    const peek = () => L[p], isK = (k) => !!L[p] && L[p].k === k;
    const SE = () => CE("Syntax", L[p] ? L[p].pos : tokens.length);
    const preStart = (t) => !!t && (PRE[t.k] || t.k === "neg");
    const impStart = (t) => !!t && (t.k === "(" || t.k === "pi" || t.k === "ans" || t.k === "ran" || VARS[t.k] || STATV[t.k] || t.k === "pol" || t.k === "rec" || t.k === "rnd");
    function close() { if (isK(")")) p++; else if (p < L.length) throw SE(); }
    function eAdd() { let a = eMul(); while (isK("+") || isK("-")) { const o = L[p++].k; const b = eMul(); a = o === "+" ? add(a, b) : sub(a, b); } return a; }
    function eMul() { let a = ePC(); while (isK("*") || isK("/")) { const o = L[p++].k; const b = ePC(); a = o === "*" ? mul(a, b) : div(a, b); } return a; }
    function ePC() { let a = eImpB(); while (isK("npr") || isK("ncr")) { const o = L[p++].k; const b = eImpB(); a = perm(o, a, b); } return a; }
    // القيم التقديرية x̂ ŷ تُطبَّق على المعامل كاملًا بإشارته: (−)5 ŷ = ŷ(−5) كما في دليل الآلة
    function eEst() { let a = ePre(); while (peek() && EST[peek().k]) a = estim(L[p++].k, a); return a; }
    function eImpB() { let a = eEst(); while (preStart(peek())) { const b = eEst(); a = mul(a, b); } return a; }
    function ePre() {
      const t = peek(); if (!t) throw SE();
      if (preStart(t)) { p++; const a = ePre(); return applyPre(t.k, a); }
      return eImpA();
    }
    function eImpA() { let a = eFrac(); while (impStart(peek())) { const b = eFrac(); a = mul(a, b); } return a; }
    function eFrac() {
      let a = ePow();
      if (isK("frac")) {
        hasFrac = true; p++; const b = ePow();
        if (isK("frac")) { p++; const c = ePow(); const f = div(b, c); a = a.v < 0 ? sub(a, f) : add(a, f); }
        else a = div(a, b);
        if (isK("frac")) throw SE();
      }
      return a;
    }
    function ePow() {
      let a = ePost();
      while (isK("pow") || isK("xrt")) {
        const o = L[p++].k;
        const b = preStart(peek()) ? ePowPre() : ePost();
        a = o === "pow" ? powV(a, b) : xroot(a, b);
      }
      return a;
    }
    function ePowPre() { const t = L[p++]; const a = preStart(peek()) ? ePowPre() : ePost(); return applyPre(t.k, a); }
    function ePost() {
      let a = ePrim();
      for (;;) {
        const t = peek(); if (!t || !POST[t.k]) break; p++;
        switch (t.k) {
          case "sq": a = mul(a, a); break;
          case "cube": a = mul(mul(a, a), a); break;
          case "inv": a = div(mk(1, [1, 1]), a); break;
          case "fact": a = fact(a); break;
          case "dms": {
            hasDms = true; let v = a.v; const sg = v < 0 ? -1 : 1;
            if (isK("num") && L[p + 1] && L[p + 1].k === "dms") { v += (sg * L[p].v) / 60; p += 2;
              if (isK("num") && L[p + 1] && L[p + 1].k === "dms") { v += (sg * L[p].v) / 3600; p += 2; } }
            a = num(v); break;
          }
          case "dD": a = num(fromRad((a.v * Math.PI) / 180)); break;
          case "dR": a = num(fromRad(a.v)); break;
          case "dG": a = num(fromRad((a.v * Math.PI) / 200)); break;
        }
      }
      return a;
    }
    function ePrim() {
      const t = L[p]; if (!t) throw SE();
      p++;
      if (t.k === "num") return mk(t.v, t.int ? [t.v, 1] : null);
      if (t.k === "(") { const a = eAdd(); close(); return a; }
      if (t.k === "pol" || t.k === "rec") {
        const a = eAdd(); if (!isK(",")) throw SE(); p++; const b = eAdd(); close();
        let r1, r2;
        if (t.k === "pol") { r1 = Math.hypot(a.v, b.v); r2 = a.v === 0 && b.v === 0 ? 0 : fromRad(Math.atan2(b.v, a.v)); }
        else { r1 = a.v * trig("cos", b.v); r2 = a.v * trig("sin", b.v); }
        r1 = chk(r1); r2 = chk(r2); st.vars.E = r1; st.vars.F = r2;
        return num(r1);
      }
      if (t.k === "rnd") { const a = eAdd(); close(); return rndV(a); }
      if (t.k === "pi") return num(Math.PI);
      if (t.k === "ans") return { v: st.ans.v, q: st.ans.q };
      if (t.k === "ran") return num(Math.floor(Math.random() * 1000) / 1000);
      if (VARS[t.k]) return num(st.vars[VARS[t.k]]);
      if (STATV[t.k]) { if (st.mode === "COMP" || (st.mode === "SD" && /y|^r/.test(t.k))) throw CE("Syntax", t.pos); return num(statVal(t.k)); }
      p--; throw SE();
    }
    if (!L.length) throw CE("Syntax", 0);
    const r = eAdd();
    if (p < L.length) throw SE();
    return { val: r, hasFrac, hasDms };
  }

  // ===================== تنسيق العرض =====================
  function sci(x, n, strip) {
    let [m, e] = x.toExponential(Math.max(0, n - 1)).split("e");
    if (strip && m.includes(".")) m = m.replace(/0+$/, "");
    if (!m.includes(".")) m += ".";
    return { m, e: +e };
  }
  const digs = (t) => t.replace(/[-.]/g, "").length;
  function fmtNum(x) {
    if (x === 0 && st.fmt.t !== "Fix" && st.fmt.t !== "Sci") return { m: "0." };
    if (st.eng !== null) {
      const m = r15(x / Math.pow(10, st.eng));
      let s = String(+m.toPrecision(10)); if (/e/.test(s)) return sci(x, 10, true);
      if (!s.includes(".")) s += ".";
      return { m: s, e: st.eng };
    }
    const f = st.fmt, a = Math.abs(x);
    if (f.t === "Sci") return sci(x, f.n || 10, false);
    if (f.t === "Fix") {
      if (a >= 1e10) return sci(x, 10, true);
      const id = a < 1 ? 1 : Math.floor(Math.log10(a)) + 1;
      let t = x.toFixed(Math.max(0, Math.min(f.n, 10 - id)));
      if (digs(t) > 10) t = x.toFixed(Math.max(0, Math.min(f.n, 9 - id)));
      if (!t.includes(".")) t += ".";
      return { m: t };
    }
    const lo = f.n === 2 ? 1e-9 : 1e-2, v = +x.toPrecision(10), av = Math.abs(v);
    if (av >= 1e10 || av < lo) return sci(x, 10, true);
    const id = av < 1 ? 1 : Math.floor(Math.log10(av)) + 1;
    let t = v.toFixed(Math.max(0, 10 - id));
    if (digs(t) > 10) t = v.toFixed(Math.max(0, 9 - id));
    if (t.includes(".")) t = t.replace(/0+$/, ""); else t += ".";
    return { m: t };
  }
  function fracStr(q, mixed) {
    if (!q || q[1] === 1) return null;
    let n = Math.abs(q[0]); const d = q[1], s = q[0] < 0 ? "-" : "";
    const str = mixed && n >= d ? s + Math.floor(n / d) + "⌟" + (n % d) + "⌟" + d : s + n + "⌟" + d;
    return str.replace("-", "").length > 10 ? null : str;
  }
  function toFrac(x) {
    if (isInt(x)) return null;
    let h0 = 0, h1 = 1, k0 = 1, k1 = 0, y = x;
    for (let i = 0; i < 30; i++) {
      const a = Math.floor(y), h = a * h1 + h0, k = a * k1 + k0;
      h0 = h1; h1 = h; k0 = k1; k1 = k;
      if (k > 1e10) return null;
      if (Math.abs(h / k - x) <= Math.abs(x) * 1e-12 + 1e-14) { const q = Qs(h, k); return q && fracStr(q, false) ? q : null; }
      const fr = y - a; if (fr < 1e-15) return null; y = 1 / fr;
    }
    return null;
  }
  function dmsStr(x) {
    const s = x < 0 ? "-" : ""; let a = Math.abs(x);
    if (a >= 1e7) return null;
    let d = Math.floor(a), m = Math.floor((a - d) * 60);
    const rest = r15(((a - d) * 60 - m) * 60);
    const dec = Math.max(0, Math.min(2, 10 - String(d).length - 4));
    let sec = +rest.toFixed(dec);
    if (sec >= 60) { sec -= 60; m++; } if (m >= 60) { m -= 60; d++; }
    return s + d + "°" + m + "°" + String(sec) + "°";
  }

  // ===================== التحرير والمفاتيح =====================
  const ANSFIRST = { "+": 1, "-": 1, "*": 1, "/": 1, pow: 1, xrt: 1, npr: 1, ncr: 1, frac: 1, sq: 1, cube: 1, inv: 1, fact: 1, dD: 1, dR: 1, dG: 1, xh: 1, yh: 1, xh1: 1, xh2: 1 };
  function ins(k) {
    st.pct = null;
    if (st.phase === "result") {
      st.tok = ANSFIRST[k] ? [{ k: "ans" }] : []; st.cur = st.tok.length; st.phase = "input"; st.ins = false; st.top = null; st.hi = -1;
    }
    if (st.tok.length >= 79) return;
    if (st.ins || st.cur >= st.tok.length) st.tok.splice(st.cur, 0, { k }); else st.tok[st.cur] = { k };
    st.cur++;
  }
  function setDisp(val, opt) {
    opt = opt || {};
    st.disp = { v: val.v, q: val.q || null }; st.eng = null; st.mixed = st.fd === "ab/c";
    st.view = opt.dms ? "dms" : opt.frac && fracStr(val.q, st.mixed) ? "frac" : "dec";
    if (opt.dms && !dmsStr(val.v)) st.view = "dec";
  }
  function fail(e, toks) {
    if (!e || !e.calc) e = ME();
    st.err = e.calc + " ERROR"; st.errTok = toks ? toks.slice() : []; st.errPos = e.pos == null ? st.errTok.length : Math.min(e.pos, st.errTok.length);
  }
  function doEq() {
    const toks = st.phase === "result" ? st.last : st.tok;
    if (!toks || !toks.length) return;
    try {
      const r = evaluate(toks);
      st.ans = { v: r.val.v, q: r.val.q };
      st.last = toks.slice(); st.top = null; st.phase = "result"; st.ins = false;
      setDisp(r.val, { frac: r.hasFrac, dms: r.hasDms });
      const h = st.hist[st.hist.length - 1];
      if (!h || JSON.stringify(h.t) !== JSON.stringify(st.last)) st.hist.push({ t: st.last.slice(), v: st.disp, view: st.view });
      if (st.hist.length > 30) st.hist.shift();
      st.hi = -1;
    } catch (e) { fail(e, toks); }
  }
  function curVal() {
    if (st.phase === "input" && st.tok.length) { const r = evaluate(st.tok); return { val: r.val, toks: st.tok.slice(), r }; }
    return { val: { v: st.disp.v, q: st.disp.q }, toks: st.phase === "result" ? (st.last || []) : [] };
  }
  function doSto(name) {
    try {
      const c = curVal(); st.vars[name] = c.val.v; st.ans = c.val;
      st.last = c.toks; st.top = (c.toks.map((t) => tt(t.k)).join("") || (st.phase === "result" ? "Ans" : "0")) + "→" + name;
      st.phase = "result"; setDisp(c.val);
    } catch (e) { fail(e, st.tok); }
  }
  function doRcl(name) { const v = num(st.vars[name]); st.ans = v; st.last = [{ k: "v" + name }]; st.top = name; st.phase = "result"; setDisp(v); }
  function doMem(sign) {
    try {
      const c = curVal(); st.vars.M = chk(st.vars.M + sign * c.val.v); st.ans = c.val;
      st.last = c.toks; st.top = (c.toks.map((t) => tt(t.k)).join("") || "Ans") + (sign > 0 ? " M+" : " M−");
      st.phase = "result"; setDisp(c.val);
    } catch (e) { fail(e, st.tok); }
  }
  function splitTop(toks) {
    const parts = [[]], seps = []; let d = 0;
    for (const t of toks) {
      if (t.k === "(" || t.k === "pol" || t.k === "rec" || t.k === "rnd") d++;
      if (t.k === ")") d--;
      if (d === 0 && (t.k === "," || t.k === ";")) { seps.push(t.k); parts.push([]); continue; }
      parts[parts.length - 1].push(t);
    }
    return { parts, seps };
  }
  function dataFrom(toks) {
    const { parts, seps } = splitTop(toks), reg = st.mode === "REG";
    const ev = (p) => evaluate(p).val.v;
    if (reg) {
      if (seps[0] !== "," || parts.length > 3 || (parts.length === 3 && seps[1] !== ";")) throw CE("Syntax", toks.length);
      return { x: ev(parts[0]), y: ev(parts[1]), f: parts[2] ? ev(parts[2]) : 1 };
    }
    if (parts.length > 2 || (parts.length === 2 && seps[0] !== ";")) throw CE("Syntax", toks.length);
    return { x: ev(parts[0]), f: parts[1] ? ev(parts[1]) : 1 };
  }
  function doDT() {
    try {
      let d;
      if (st.phase === "input" && st.tok.length) d = dataFrom(st.tok);
      else if (st.lastDT) d = Object.assign({}, st.lastDT);
      else return;
      if (!(d.f > 0)) throw ME();
      if (st.data.length >= 80) throw ME();
      st.data.push(d); st.lastDT = d;
      st.last = st.tok.slice(); st.top = "n="; st.phase = "result"; st.disp = { v: sums().n, q: null }; st.view = "dec"; st.eng = null;
    } catch (e) { fail(e, st.tok); }
  }
  function doCL() {
    try {
      if (st.phase === "input" && st.tok.length) {
        const d = dataFrom(st.tok);
        for (let i = st.data.length - 1; i >= 0; i--) { const z = st.data[i]; if (z.x === d.x && (st.mode !== "REG" || z.y === d.y)) { st.data.splice(i, 1); break; } }
      } else st.data.pop();
      st.tok = []; st.cur = 0; st.top = "n="; st.last = []; st.phase = "result"; st.disp = { v: sums().n, q: null }; st.view = "dec"; st.eng = null;
    } catch (e) { fail(e, st.tok); }
  }
  function doPct() {
    if (st.phase !== "input" || !st.tok.length) return;
    const toks = st.tok; let d = 0, iAdd = -1, iMul = -1;
    toks.forEach((t, i) => {
      if (t.k === "(" || t.k === "pol" || t.k === "rec" || t.k === "rnd") d++;
      else if (t.k === ")") d--;
      else if (d === 0 && i > 0) { if (t.k === "+" || t.k === "-") iAdd = i; else if (t.k === "*" || t.k === "/") iMul = i; }
    });
    const idx = iAdd > 0 ? iAdd : iMul;
    try {
      let r; st.pct = null;
      if (idx <= 0) r = div(evaluate(toks).val, num(100));
      else {
        const A = evaluate(toks.slice(0, idx)).val, B = evaluate(toks.slice(idx + 1)).val, op = toks[idx].k;
        if (op === "*") { r = div(mul(A, B), num(100)); st.pctNext = { A }; }
        else if (op === "/") r = mul(div(A, B), num(100));
        else if (op === "+") r = mul(div(add(A, B), A), num(100));
        else r = mul(div(sub(A, B), B), num(100));
        if (op === "*") st.pct = { A, r };
      }
      st.ans = r; st.last = toks.slice(); st.top = toks.map((t) => tt(t.k)).join("") + "%"; st.phase = "result"; setDisp(r);
    } catch (e) { fail(e, toks); }
  }
  function clearAll(what) {
    if (what === "mem" || what === "all") { for (const k in st.vars) st.vars[k] = 0; st.ans = { v: 0, q: [0, 1] }; }
    if (what === "scl" || what === "all") { st.data = []; st.lastDT = null; }
    if (what === "mode" || what === "all") { if (st.mode !== "COMP") { st.data = []; st.lastDT = null; } st.mode = "COMP"; st.reg = "Lin"; st.ang = "D"; st.fmt = { t: "Norm", n: 1 }; st.fd = "ab/c"; }
    if (what === "all") st.hist = [];
    ac();
  }
  function ac() {
    st.tok = []; st.cur = 0; st.phase = "input"; st.ins = false; st.err = null; st.menu = null; st.top = null; st.last = null;
    st.sto = st.rcl = st.hyp = false; st.pct = null; st.browse = null; st.hi = -1;
    st.disp = { v: 0, q: null }; st.view = "dec"; st.eng = null;
  }
  function setMode(m, reg) {
    if (st.mode !== m || (reg && st.reg !== reg)) { st.data = []; st.lastDT = null; }
    st.mode = m; if (reg) st.reg = reg; ac();
  }

  // ===================== القوائم =====================
  function menuDef(m) {
    const reg = st.mode === "REG", quad = st.reg === "Quad";
    switch (m.id) {
      case "mode": return { pages: [["COMP", "SD", "REG"], ["Deg", "Rad", "Gra"], ["Fix", "Sci", "Norm"], ["Disp"]], cycle: true };
      case "reg": return { pages: [["Lin", "Log", "Exp"], ["Pwr", "Inv", "Quad"]] };
      case "disp": return { pages: [["ab/c", "d/c"]] };
      case "clr": return { pages: [[st.mode === "COMP" ? "Mcl" : "Scl", "Mode", "All"]] };
      case "drg": return { pages: [["D", "R", "G"]] };
      case "ssum": return { pages: reg ? [["Σx²", "Σx", "n"], ["Σy²", "Σy", "Σxy"]].concat(quad ? [["Σx³", "Σx²y", "Σx⁴"]] : []) : [["Σx²", "Σx", "n"]] };
      case "svar": return { pages: reg ? [["x̄", "xσn", "xσn-1"], ["ȳ", "yσn", "yσn-1"], quad ? ["A", "B", "C"] : ["A", "B", "r"], quad ? ["x̂1", "x̂2", "ŷ"] : ["x̂", "ŷ"]] : [["x̄", "xσn", "xσn-1"]] };
      case "fix": return { prompt: "Fix 0~9?" };
      case "sci": return { prompt: "Sci 0~9?" };
      case "norm": return { prompt: "Norm 1~2?" };
    }
    return { pages: [[]] };
  }
  const SSUM = [["sx2", "sx", "sn"], ["sy2", "sy", "sxy"], ["sx3", "sx2y", "sx4"]];
  function menuKey(id) {
    const m = st.menu, def = menuDef(m);
    if (id === "ac") { st.menu = null; return; }
    if (def.pages && (id === "right" || id === "left" || (id === "mode" && def.cycle))) {
      const n = def.pages.length; m.page = (m.page + (id === "left" ? n - 1 : 1)) % n; return;
    }
    const dg = /^d(\d)$/.exec(id); if (!dg) return;
    const k = +dg[1];
    if (def.prompt) {
      if (m.id === "fix") st.fmt = { t: "Fix", n: k };
      else if (m.id === "sci") st.fmt = { t: "Sci", n: k };
      else if (m.id === "norm") { if (k !== 1 && k !== 2) return; st.fmt = { t: "Norm", n: k }; }
      st.menu = null; st.eng = null; return;
    }
    const labels = def.pages[m.page]; if (k < 1 || k > labels.length) return;
    const pick = (t) => { st.menu = null; ins(t); };
    switch (m.id) {
      case "mode":
        if (m.page === 0) { if (k === 3) { st.menu = { id: "reg", page: 0 }; return; } st.menu = null; setMode(k === 1 ? "COMP" : "SD"); return; }
        if (m.page === 1) { st.ang = "DRG"[k - 1]; st.menu = null; return; }
        if (m.page === 2) { st.menu = { id: ["fix", "sci", "norm"][k - 1], page: 0 }; return; }
        st.menu = { id: "disp", page: 0 }; return;
      case "reg": st.menu = null; setMode("REG", labels[k - 1]); return;
      case "disp": st.fd = k === 1 ? "ab/c" : "d/c"; st.mixed = k === 1; st.menu = null; return;
      case "clr": st.menu = null; clearAll(k === 1 ? (st.mode === "COMP" ? "mem" : "scl") : k === 2 ? "mode" : "all"); st.top = k === 1 ? (st.mode === "COMP" ? "Mcl" : "Stat clear") : k === 2 ? "Mode clear" : "Reset All"; return;
      case "drg": return pick(["dD", "dR", "dG"][k - 1]);
      case "ssum": return pick(SSUM[m.page][k - 1]);
      case "svar": {
        const P = [["mx", "sxn", "sxn1"], ["my", "syn", "syn1"], st.reg === "Quad" ? ["rA", "rB", "rC"] : ["rA", "rB", "rr"], st.reg === "Quad" ? ["xh1", "xh2", "yh"] : ["xh", "yh"]];
        return pick(P[m.page][k - 1]);
      }
    }
  }

  // ===================== تصفّح البيانات الإحصائية =====================
  function browseFields() { return st.mode === "REG" ? ["x", "y", "f"] : ["x", "f"]; }
  function browseMove(dir) {
    if (!st.data.length) return;
    const F = browseFields();
    if (!st.browse) { st.browse = dir > 0 ? { i: 0, f: 0 } : { i: st.data.length - 1, f: F.length - 1 }; }
    else {
      let { i, f } = st.browse; f += dir;
      if (f >= F.length) { f = 0; i++; } if (f < 0) { f = F.length - 1; i--; }
      if (i < 0 || i >= st.data.length) return;
      st.browse = { i, f };
    }
    st.tok = []; st.cur = 0; st.phase = "input";
  }
  function browseLabel() { const b = st.browse, F = browseFields()[b.f]; return (F === "f" ? "Freq" : F) + (b.i + 1) + "="; }

  // ===================== معالجة الضغطات =====================
  const VARKEY = { neg: "A", dms: "B", hyp: "C", sin: "D", cos: "E", tan: "F", rp: "X", comma: "Y", mplus: "M" };
  const VALUEKEY = /^(d\d|dot|exp|neg|lp|ans)$/;
  function press(id) {
    const sh = st.shift, al = st.alpha;
    st.shift = false; st.alpha = false;
    if (id === "shift") { st.shift = !sh; return; }
    if (id === "alpha") { st.alpha = !al; return; }
    if (id === "on") { ac(); return; }
    if (sh && id === "ac") { hide(); ac(); return; }
    if (st.menu) { menuKey(id); return; }
    if (st.err) {
      if (id === "ac") ac();
      else if (id === "left" || id === "right") { st.tok = st.errTok; st.cur = st.errPos; st.phase = "input"; st.err = null; }
      return;
    }
    if (st.sto || st.rcl) { const v = VARKEY[id], s = st.sto; st.sto = st.rcl = false; if (v && !sh && !al) { s ? doSto(v) : doRcl(v); } return; }
    if (st.pct && !sh && !al && (id === "add" || id === "sub")) {
      try { const r = id === "add" ? add(st.pct.A, st.pct.r) : sub(st.pct.A, st.pct.r); st.ans = r; st.top = (st.top || "") + (id === "add" ? "+" : "−"); setDisp(r); } catch (e) { fail(e, st.tok); }
      st.pct = null; return;
    }
    st.pct = null;
    // تصفّح بيانات SD/REG
    if (st.browse) {
      if (id === "up" || id === "down") { browseMove(id === "down" ? 1 : -1); return; }
      if (id === "ac") { st.browse = null; ac(); return; }
      if (id === "eq" && !sh && st.tok.length) {
        try { const v = evaluate(st.tok).val.v, F = browseFields()[st.browse.f]; if (F === "f" && !(v > 0)) throw ME(); st.data[st.browse.i][F] = v; st.tok = []; st.cur = 0; } catch (e) { fail(e, st.tok); }
        return;
      }
      if (!(VALUEKEY.test(id) || id === "del" || id === "left" || id === "right")) st.browse = null;
    }
    if (st.hyp && !["sin", "cos", "tan"].includes(id)) st.hyp = false;
    if (al) { const v = VARKEY[id]; if (v) ins("v" + v); return; }
    const stat = st.mode !== "COMP";
    if (sh) {
      switch (id) {
        case "inv": return ins("fact");
        case "ncr": return ins("npr");
        case "pol": return ins("rec");
        case "cube": return ins("cbrt");
        case "pow": return ins("xrt");
        case "log": return ins("tenx");
        case "ln": return ins("ex");
        case "sin": case "cos": case "tan": { const h = st.hyp; st.hyp = false; return ins(h ? "a" + id + "h" : "a" + id); }
        case "abc": if (st.phase === "result" && st.view === "frac") st.mixed = !st.mixed; else if (st.phase === "result" && st.view === "dec") { const q = st.disp.q || toFrac(st.disp.v); if (q && fracStr(q, false)) { st.disp.q = q; st.view = "frac"; st.mixed = false; } } return;
        case "dms": if (st.phase === "result" && st.view === "dms") st.view = "dec"; return;
        case "rcl": st.sto = true; return;
        case "eng": if (st.phase === "result" && st.view === "dec") engShift(-1); return;
        case "comma": return ins(";");
        case "mplus": return stat ? doCL() : doMem(-1);
        case "del": if (st.phase === "input") st.ins = !st.ins; return;
        case "mode": st.menu = { id: "clr", page: 0 }; return;
        case "d1": if (stat) st.menu = { id: "ssum", page: 0 }; return;
        case "d2": if (stat) st.menu = { id: "svar", page: 0 }; return;
        case "d0": if (st.phase === "result" || !st.tok.length) { st.tok = [{ k: "rnd" }, { k: "ans" }]; st.phase = "input"; doEq(); } else ins("rnd"); return;
        case "dot": return ins("ran");
        case "exp": return ins("pi");
        case "ans": st.menu = { id: "drg", page: 0 }; return;
        case "eq": return doPct();
      }
      return;
    }
    const D = /^d(\d)$/.exec(id); if (D) return ins(D[1]);
    switch (id) {
      case "dot": return ins(".");
      case "exp": return ins("E");
      case "add": return ins("+");
      case "sub": return ins("-");
      case "mul": return ins("*");
      case "div": return ins("/");
      case "inv": return ins("inv");
      case "ncr": return ins("ncr");
      case "pol": return ins("pol");
      case "cube": return ins("cube");
      case "sq": return ins("sq");
      case "pow": return ins("pow");
      case "sqrt": return ins("sqrt");
      case "log": return ins("log");
      case "ln": return ins("ln");
      case "neg": return ins("neg");
      case "lp": return ins("(");
      case "rp": return ins(")");
      case "comma": return ins(",");
      case "ans": return ins("ans");
      case "hyp": st.hyp = true; return;
      case "sin": case "cos": case "tan": { const h = st.hyp; st.hyp = false; return ins(h ? id + "h" : id); }
      case "dms": if (st.phase === "result") { if (st.view !== "dms" && dmsStr(st.disp.v)) { st.view = "dms"; st.eng = null; } else if (st.view === "dms") st.view = "dec"; } else ins("dms"); return;
      case "abc":
        if (st.phase === "result") {
          if (st.view === "frac") st.view = "dec";
          else { const q = st.disp.q || toFrac(st.disp.v); if (q && fracStr(q, st.mixed)) { st.disp.q = q; st.view = "frac"; st.eng = null; } }
        } else ins("frac");
        return;
      case "rcl": st.rcl = true; return;
      case "eng": if (st.phase === "result" && st.view === "dec") engShift(1); return;
      case "mplus": return stat ? doDT() : doMem(1);
      case "eq": return doEq();
      case "ac": return ac();
      case "del":
        if (st.phase !== "input") return;
        if (st.ins) { if (st.cur > 0) { st.tok.splice(st.cur - 1, 1); st.cur--; } }
        else if (st.cur < st.tok.length) st.tok.splice(st.cur, 1);
        else if (st.cur > 0) { st.tok.pop(); st.cur--; }
        return;
      case "left": case "right":
        if (st.phase === "result") { if (st.last && st.last.length) { st.tok = st.last.slice(); st.cur = id === "left" ? st.tok.length : 0; st.phase = "input"; st.top = null; } return; }
        st.cur = id === "left" ? Math.max(0, st.cur - 1) : Math.min(st.tok.length, st.cur + 1); return;
      case "up": case "down":
        if (stat) { if (st.phase === "result" || !st.tok.length) browseMove(id === "down" ? 1 : -1); return; }
        replay(id === "up" ? -1 : 1); return;
      case "mode": st.menu = { id: "mode", page: 0 }; return;
    }
  }
  function engShift(dir) {
    const x = st.disp.v; if (x === 0) { st.eng = 0; return; }
    if (st.eng === null) { const e = Math.floor(Math.log10(Math.abs(+x.toPrecision(10)))); st.eng = Math.floor(e / 3) * 3 + (dir < 0 ? 3 : 0); return; }
    const ne = st.eng + (dir > 0 ? -3 : 3), m = Math.abs(x / Math.pow(10, ne));
    if (m >= 1e10 || m < 1e-9) return;
    st.eng = ne;
  }
  function replay(dir) {
    const H = st.hist; if (!H.length) return;
    let i = st.hi;
    if (i < 0) { if (dir > 0) return; i = st.phase === "result" && st.last && H.length && JSON.stringify(H[H.length - 1].t) === JSON.stringify(st.last) ? H.length - 2 : H.length - 1; }
    else i += dir;
    if (i < 0 || i >= H.length) return;
    st.hi = i; const h = H[i];
    st.last = h.t.slice(); st.top = null; st.phase = "result"; st.disp = Object.assign({}, h.v); st.view = h.view; st.eng = null; st.ins = false;
  }

  // ===================== واجهة الشاشة =====================
  function lcdModel(W) {
    const ind = { S: st.shift, A: st.alpha, M: st.vars.M !== 0, STO: st.sto, RCL: st.rcl, SD: st.mode === "SD", REG: st.mode === "REG",
      D: st.ang === "D", R: st.ang === "R", G: st.ang === "G", FIX: st.fmt.t === "Fix", SCI: st.fmt.t === "Sci", hyp: st.hyp,
      "▲": false, "▼": false, Disp: st.phase === "result" && st.view !== "dec" };
    const out = { ind, l1: "", cur: -1, insMode: st.ins, l2: { m: "0." }, menu: null };
    if (st.menu) {
      const def = menuDef(st.menu);
      if (def.prompt) { out.l1 = def.prompt; out.l2 = { m: "" }; }
      else { const p = def.pages[st.menu.page]; out.menu = p; if (def.pages.length > 1 && !def.cycle) { ind["▲"] = st.menu.page > 0; ind["▼"] = st.menu.page < def.pages.length - 1; } }
      return out;
    }
    if (st.err) { out.l2 = { err: st.err }; return out; }
    if (st.mode === "COMP" && st.hist.length) { ind["▲"] = true; ind["▼"] = st.hi >= 0 && st.hi < st.hist.length - 1; }
    // السطر الأول
    if (st.browse && st.phase === "input" && !st.tok.length) {
      const b = st.browse, d = st.data[b.i]; out.l1 = browseLabel(); out.l2 = fmtNum(d[browseFields()[b.f]]); return out;
    }
    const parts = (st.phase === "input" ? st.tok : st.last || []).map((t) => tt(t.k));
    if (st.phase === "input") {
      const pre = st.browse ? browseLabel() : "";
      let pos = pre.length; const offs = [];
      parts.forEach((s) => { offs.push(pos); pos += s.length; });
      const full = pre + parts.join(""), cAt = st.cur < offs.length ? offs[st.cur] : full.length;
      let start = 0; if (cAt >= W) start = cAt - W + 1;
      out.l1 = full.slice(start, start + W); out.cur = cAt - start; out.more = { left: start > 0, right: full.length > start + W };
      // السطر الثاني: آخر نتيجة
      out.l2 = valOut();
      if (!st.tok.length && !st.last && st.disp.v === 0) out.l2 = { m: "0." };
      if (st.browse) { const b = st.browse; out.l2 = fmtNum(st.data[b.i][browseFields()[b.f]]); }
    } else {
      const full = st.top != null ? st.top : parts.join("");
      out.l1 = full.length > W ? full.slice(0, W) : full; out.more = { left: false, right: full.length > W };
      out.l2 = valOut();
      if (st.top === "n=") out.l2 = { m: String(st.disp.v) + "." };
    }
    return out;
  }
  function valOut() {
    const d = st.disp;
    if (st.view === "frac") { const s = fracStr(d.q, st.mixed); if (s) return { m: s }; }
    if (st.view === "dms") { const s = dmsStr(d.v); if (s) return { m: s }; }
    return fmtNum(d.v);
  }

  // ===================== بناء الواجهة =====================
  const CSS = `
.sc-fab{position:fixed;left:14px;bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:105;display:flex;align-items:center;gap:8px;height:50px;padding:0 16px 0 14px;border-radius:999px;border:0;
  background:#23272e;color:#fff;font:600 14px/1 var(--f-body,system-ui,sans-serif);box-shadow:0 8px 24px rgba(0,0,0,.28);cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
.sc-fab svg{width:22px;height:22px}.sc-fab:active{transform:scale(.96)}
.sc-inline{display:inline-flex;align-items:center;gap:6px;height:38px;padding:0 12px;border-radius:12px;border:1px solid var(--line,#ddd);background:var(--surface,#fff);color:var(--ink,#111);font:600 13px/1 var(--f-body,system-ui,sans-serif);cursor:pointer;flex:none;touch-action:manipulation}
.sc-inline svg{width:18px;height:18px}.sc-inline[aria-pressed="true"]{background:#23272e;color:#fff;border-color:#23272e}
.sc-panel{position:fixed;z-index:110;left:0;right:0;bottom:0;display:flex;flex-direction:column;max-height:100dvh;background:#1d2026;color:#fff;box-shadow:0 -10px 30px rgba(0,0,0,.35);
  border-radius:18px 18px 0 0;padding-bottom:env(safe-area-inset-bottom,0px);-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;touch-action:manipulation;overscroll-behavior:contain}
.sc-panel.hide{display:none}
.sc-hd{display:flex;align-items:center;gap:8px;padding:8px 12px 6px;direction:rtl;font:600 13px/1.2 var(--f-body,system-ui,sans-serif);color:#cfd5dd;flex:none}
.sc-hd b{flex:1;font-weight:600}.sc-hd button{border:0;background:#2e333b;color:#fff;border-radius:10px;height:30px;min-width:30px;padding:0 10px;font:inherit;cursor:pointer}
.sc-hd .sc-grab{position:absolute;top:4px;left:50%;width:38px;height:4px;margin-left:-19px;border-radius:4px;background:#4a505a}
.sc-strip{direction:rtl;background:var(--surface,#fff);color:var(--ink,#111);margin:0 8px 6px;border-radius:12px;padding:6px 10px 8px;flex:0 1 auto;min-height:0;overflow:auto;font:14px/1.6 var(--f-body,system-ui,sans-serif)}
.sc-strip.hide{display:none}
.sc-qh{display:flex;align-items:center;gap:6px;margin-bottom:4px;font-size:12px;color:var(--muted,#667)}
.sc-qh b{flex:1;font-weight:600}.sc-qh button{border:1px solid var(--line,#ddd);background:var(--surface-2,#f4f4f4);color:inherit;border-radius:8px;height:26px;min-width:30px;font:inherit;cursor:pointer}
.sc-qh button:disabled{opacity:.35}
.sc-stem{font-size:14px;line-height:1.65}.sc-stem img{max-width:100%;max-height:120px}.sc-stem table{font-size:12px}
.sc-stem .stem{font-weight:500;font-size:14px!important;line-height:1.65!important;margin:0!important}.sc-stem .qnum,.sc-stem .pq-n{display:none}.sc-stem>*{padding:0!important;margin:0!important;border:0!important;box-shadow:none!important;background:none!important}
.sc-opts{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px}
.sc-o{display:flex;gap:6px;align-items:flex-start;text-align:start;border:1.5px solid var(--line,#ddd);background:var(--surface,#fff);color:inherit;border-radius:10px;padding:6px 8px;font:13px/1.5 var(--f-body,system-ui,sans-serif);cursor:pointer}
.sc-o i{font-style:normal;font-weight:700;flex:none;width:22px;height:22px;border-radius:7px;display:grid;place-items:center;background:var(--surface-2,#eee);font-size:12px}
.sc-o.on{border-color:var(--accent,#0a7);background:var(--accent-soft,#e6f6f1)}.sc-o.on i{background:var(--accent,#0a7);color:#fff}
.sc-o.ok{border-color:var(--ok,#1a7f37);background:var(--ok-bg,#e8f5ec)}.sc-o.bad{border-color:var(--danger,#c33);background:var(--danger-bg,#fdecec)}
.sc-o:disabled{cursor:default}
.sc-body{direction:ltr;padding:0 10px 8px;flex:none;--fk:28px;--nk:38px;--lb:10px}
.sc-lcd{background:linear-gradient(#c8d2bf,#bcc7b3);color:#141813;border-radius:8px;padding:3px 8px 4px;box-shadow:inset 0 2px 6px rgba(0,0,0,.35);margin-bottom:8px;font-family:"Courier New",ui-monospace,monospace;container-type:inline-size}
.sc-ind{display:flex;gap:5px;font:700 9px/12px system-ui,sans-serif;height:12px;letter-spacing:.02em;overflow:hidden}
.sc-ind span{opacity:0}.sc-ind span.on{opacity:.9}
.sc-l1{height:22px;font-size:17px;line-height:22px;white-space:pre;overflow:hidden;position:relative;font-weight:600}
.sc-l1 .c{position:relative}.sc-l1 .c.ov{text-decoration:underline;text-decoration-thickness:2px;animation:scb 1s steps(1) infinite}
.sc-l1 .c.bar::before{content:"";position:absolute;left:-1px;top:3px;bottom:3px;width:2px;background:#141813;animation:scb 1s steps(1) infinite}
.sc-l1 .c.end::after{content:"_";position:absolute;left:0;animation:scb 1s steps(1) infinite}
@keyframes scb{50%{opacity:0}}
.sc-l1 .ml,.sc-l1 .mr{position:absolute;top:0;font-size:10px}.sc-l1 .ml{left:-6px}.sc-l1 .mr{right:-6px}
.sc-l2{height:34px;display:flex;justify-content:flex-end;align-items:flex-start;font:600 30px/34px "Courier New",ui-monospace,monospace;white-space:nowrap;overflow:hidden}
.sc-l2 .x{font-size:15px;line-height:18px;margin-left:4px;align-self:flex-start}.sc-l2 .er{font-size:22px}
.sc-menu{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;text-align:center;font:600 15px/24px "Courier New",monospace}
.sc-menu.n{font-size:22px;line-height:34px}
.sc-g6{display:grid;grid-template-columns:repeat(6,1fr);column-gap:6px;row-gap:2px}
.sc-g5{display:grid;grid-template-columns:repeat(5,1fr);column-gap:7px;row-gap:5px;margin-top:6px}
.sc-k{display:flex;flex-direction:column;min-width:0}
.sc-lb{display:flex;justify-content:space-between;gap:2px;height:calc(var(--lb) + 3px);font:700 var(--lb)/1 system-ui,sans-serif;white-space:nowrap;overflow:visible;padding:0 1px}
.sc-lb .s{color:#f2c84b}.sc-lb .a{color:#ff7a7a}
.sc-b{height:var(--fk);border:0;border-radius:7px;background:#3a4049;color:#fff;font:600 13px/1 system-ui,sans-serif;cursor:pointer;box-shadow:0 2px 0 #121418;padding:0;min-width:0;-webkit-tap-highlight-color:transparent}
.sc-b:active,.sc-b.pr{transform:translateY(1px);box-shadow:0 1px 0 #121418;filter:brightness(1.25)}
.sc-b sup{font-size:.7em;vertical-align:.55em;line-height:0}.sc-b sub{font-size:.7em;line-height:0}
.sc-b.sh{color:#f2c84b}.sc-b.al{color:#ff7a7a}.sc-b.on{outline:2px solid currentColor}
.sc-g5 .sc-b{height:var(--nk);font-size:18px;background:#e6e8ec;color:#1b1e23;border-radius:9px;box-shadow:0 3px 0 #9aa0a8}
.sc-g5 .sc-b.op{font-size:22px}.sc-g5 .sc-b.sm{font-size:14px}
.sc-g5 .sc-b.o{background:#e2732e;color:#fff;box-shadow:0 3px 0 #9c4615;font-size:15px}
.sc-g5 .sc-lb{height:calc(var(--lb) + 2px)}
.sc-pad{grid-column:3/5;grid-row:1/3;position:relative;margin:2px 4px;border-radius:50%;background:#2c3139;box-shadow:inset 0 0 0 2px #444b55;aspect-ratio:auto}
.sc-pad button{position:absolute;border:0;background:transparent;color:#d6dbe2;font-size:13px;cursor:pointer;padding:0}
.sc-pad [data-k=up]{top:0;left:25%;right:25%;height:38%}.sc-pad [data-k=down]{bottom:0;left:25%;right:25%;height:38%}
.sc-pad [data-k=left]{left:0;top:25%;bottom:25%;width:34%}.sc-pad [data-k=right]{right:0;top:25%;bottom:25%;width:34%}
.sc-pad button:active{color:#fff;background:rgba(255,255,255,.08)}
.sc-brand{display:none;justify-content:space-between;align-items:center;font:700 10px/1 system-ui,sans-serif;color:#aab2bd;margin:0 2px 5px;letter-spacing:.06em}
@media (min-width:900px) and (min-height:560px){
  html.sc-docked body{margin-left:372px}
  .sc-panel{left:0;top:0;right:auto;bottom:0;width:360px;max-height:none;border-radius:0 16px 16px 0;padding-top:4px;box-shadow:6px 0 30px rgba(0,0,0,.25)}
  .sc-strip,.sc-tgl{display:none!important}
  .sc-body{flex:1;display:flex;flex-direction:column;justify-content:center}.sc-brand{display:flex!important}
  .sc-fab{left:20px;bottom:20px}
}
@media print{.sc-panel,.sc-fab{display:none!important}}
.pq{scroll-margin-top:110px}`;

  const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4.5" y="2.5" width="15" height="19" rx="2.5"/><rect x="7.5" y="5.5" width="9" height="4" rx="1"/><path d="M8 13h.01M12 13h.01M16 13h.01M8 16.5h.01M12 16.5h.01M16 16.5h.01M8 19h.01M12 19h4"/></svg>';
  // [المعرّف, الوجه, SHIFT, ALPHA, صنف]
  const TOP = [
    ["shift", "SHIFT", "", "", "sh"], ["alpha", "ALPHA", "", "", "al"], null, ["mode", "MODE", "CLR", ""], ["on", "ON", "", ""],
    ["inv", "x<sup>-1</sup>", "x!", ""], ["ncr", "nCr", "nPr", ""], ["pol", "Pol(", "Rec(", ""], ["cube", "x<sup>3</sup>", "<sup>3</sup>√", ""],
    ["abc", "a<sup>b</sup>/<sub>c</sub>", "d/c", ""], ["sqrt", "√", "", ""], ["sq", "x<sup>2</sup>", "", ""], ["pow", "^", "<sup>x</sup>√", ""], ["log", "log", "10<sup>x</sup>", ""], ["ln", "ln", "e<sup>x</sup>", ""],
    ["neg", "(−)", "", "A"], ["dms", "°'\"", "←", "B"], ["hyp", "hyp", "", "C"], ["sin", "sin", "sin<sup>-1</sup>", "D"], ["cos", "cos", "cos<sup>-1</sup>", "E"], ["tan", "tan", "tan<sup>-1</sup>", "F"],
    ["rcl", "RCL", "STO", ""], ["eng", "ENG", "←", ""], ["lp", "(", "", ""], ["rp", ")", "", "X"], ["comma", ",", ";", "Y"], ["mplus", "M+", "M− CL", "M"],
  ];
  const BOT = [
    ["d7", "7", "", ""], ["d8", "8", "", ""], ["d9", "9", "", ""], ["del", "DEL", "INS", "", "o"], ["ac", "AC", "OFF", "", "o"],
    ["d4", "4", "", ""], ["d5", "5", "", ""], ["d6", "6", "", ""], ["mul", "×", "", "", "op"], ["div", "÷", "", "", "op"],
    ["d1", "1", "S-SUM", ""], ["d2", "2", "S-VAR", ""], ["d3", "3", "", ""], ["add", "+", "", "", "op"], ["sub", "−", "", "", "op"],
    ["d0", "0", "Rnd", ""], ["dot", "•", "Ran#", ""], ["exp", "EXP", "π", "", "sm"], ["ans", "Ans", "DRG▸", "", "sm"], ["eq", "=", "%", "", "op"],
  ];
  const NAMES = { shift: "SHIFT", alpha: "ALPHA", mode: "MODE", on: "ON", inv: "مقلوب العدد", ncr: "التوافيق", pol: "Pol", cube: "التكعيب", abc: "كسر", sqrt: "جذر تربيعي", sq: "التربيع", pow: "أُس", log: "log", ln: "ln",
    neg: "سالب", dms: "درجات دقائق ثوانٍ", hyp: "hyp", sin: "sin", cos: "cos", tan: "tan", rcl: "RCL", eng: "ENG", lp: "قوس فتح", rp: "قوس إغلاق", comma: "فاصلة", mplus: "M+",
    del: "حذف", ac: "مسح الكل", mul: "ضرب", div: "قسمة", add: "جمع", sub: "طرح", dot: "فاصلة عشرية", exp: "EXP", ans: "Ans", eq: "يساوي", up: "أعلى", down: "أسفل", left: "يسار", right: "يمين" };
  function keyHTML(k) {
    if (!k) return '<div class="sc-pad"><button type="button" data-k="up" aria-label="أعلى">▲</button><button type="button" data-k="left" aria-label="يسار">◀</button><button type="button" data-k="right" aria-label="يمين">▶</button><button type="button" data-k="down" aria-label="أسفل">▼</button></div>';
    const [id, face, s, a, cls] = k;
    return `<div class="sc-k"><div class="sc-lb"><span class="s">${s}</span><span class="a">${a}</span></div><button type="button" class="sc-b ${cls || ""}" data-k="${id}" aria-label="${NAMES[id] || id}">${face}</button></div>`;
  }

  let ui = null, ctx = null, W = 18, mo = null, ro = null, padSaved = null, refreshT = 0;
  function build() {
    if (ui) return;
    const style = document.createElement("style"); style.id = "sahm-calc-css"; style.textContent = CSS; document.head.appendChild(style);
    const fab = document.createElement("button"); fab.type = "button"; fab.className = "sc-fab"; fab.innerHTML = ICON + "<span>الآلة الحاسبة</span>"; fab.setAttribute("aria-label", "فتح الآلة الحاسبة");
    fab.style.display = "none";
    const p = document.createElement("div"); p.className = "sc-panel hide"; p.setAttribute("role", "dialog"); p.setAttribute("aria-label", "الآلة الحاسبة العلمية");
    p.innerHTML = `<div class="sc-hd"><span class="sc-grab"></span><b>الآلة الحاسبة العلمية</b><button type="button" class="sc-tgl" data-ui="strip">إخفاء السؤال</button><button type="button" data-ui="close" aria-label="إغلاق الآلة الحاسبة">✕</button></div>
      <div class="sc-strip"></div>
      <div class="sc-body"><div class="sc-brand"><span>fx-82MS</span><span>2-LINE DISPLAY</span></div>
        <div class="sc-lcd"><div class="sc-ind"></div><div class="sc-l1"></div><div class="sc-l2"></div></div>
        <div class="sc-g6">${TOP.map(keyHTML).join("")}</div><div class="sc-g5">${BOT.map(keyHTML).join("")}</div></div>`;
    document.body.appendChild(fab); document.body.appendChild(p);
    ui = { fab, p, strip: p.querySelector(".sc-strip"), lcd: p.querySelector(".sc-lcd"), ind: p.querySelector(".sc-ind"), l1: p.querySelector(".sc-l1"), l2: p.querySelector(".sc-l2"), tgl: p.querySelector(".sc-tgl"), inline: null };
    ui.ind.innerHTML = ["S", "A", "M", "STO", "RCL", "SD", "REG", "D", "R", "G", "FIX", "SCI", "hyp", "Disp", "▲", "▼"].map((x) => `<span data-i="${x}">${x}</span>`).join("");
    fab.onclick = () => show();
    // منع الضغط المطوّل والقائمة والسحب داخل الآلة (لا تُحسب مخالفة)
    ["contextmenu", "selectstart", "dragstart", "copy", "cut"].forEach((ev) => p.addEventListener(ev, (e) => { e.preventDefault(); e.stopPropagation(); }));
    p.addEventListener("click", (e) => {
      const u = e.target.closest("[data-ui]");
      if (u) { if (u.dataset.ui === "close") hide(); else if (u.dataset.ui === "strip") { stripOn = !stripOn; renderStrip(); layout(); } return; }
      const b = e.target.closest("[data-k]"); if (!b || !p.contains(b)) return;
      const k = b.dataset.k; tap(k);
    });
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", () => { if (isOpen()) { measure(); layout(); render(); } });
    ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => layout()) : null;
    if (ro) ro.observe(p);
  }
  function tap(k) {
    try { press(k); } catch (e) { fail(e, st.tok); }
    render();
    if (navigator.vibrate) try { navigator.vibrate(6); } catch (e) {}
  }
  let stripOn = true;
  const isOpen = () => ui && !ui.p.classList.contains("hide");
  const docked = () => window.matchMedia("(min-width:900px) and (min-height:560px)").matches;
  function measure() {
    const w = ui.l1.clientWidth || 300, fs = parseFloat(getComputedStyle(ui.l1).fontSize) || 17;
    W = Math.max(12, Math.floor(w / (fs * 0.6)) - 1);
  }
  // مقاس الأزرار حسب ارتفاع الشاشة: الآلة كاملة دائمًا، والباقي للسؤال
  function size() {
    const H = window.innerHeight || 700, dk = docked(), body = ui.p.querySelector(".sc-body");
    const over = dk ? 262 : 222, target = dk ? H - 24 : Math.max(380, Math.min(H * 0.6, 540));
    let fk = (target - over) / (5 + 4 * 1.38); fk = Math.max(21, Math.min(dk ? 38 : 34, fk));
    body.style.setProperty("--fk", fk.toFixed(1) + "px"); body.style.setProperty("--nk", (fk * 1.38).toFixed(1) + "px");
    body.style.setProperty("--lb", (fk < 26 ? 9 : fk < 31 ? 10 : 11) + "px");
    ui.strip.style.maxHeight = dk ? "" : Math.max(96, H - target - 44 - 70) + "px";
  }
  function layout() {
    if (!ui) return;
    const open = isOpen(), dk = docked();
    if (open) size();
    document.documentElement.classList.toggle("sc-docked", open && dk);
    if (open && !dk) {
      if (padSaved === null) padSaved = document.body.style.paddingBottom || "";
      document.body.style.paddingBottom = ui.p.offsetHeight + 12 + "px";
    } else if (padSaved !== null) { document.body.style.paddingBottom = padSaved; padSaved = null; }
    if (ui.inline) ui.inline.setAttribute("aria-pressed", open ? "true" : "false");
    ui.fab.style.display = ctx && !open && !ctx.host ? "" : "none";
  }
  function show() {
    if (!ui) build();
    ui.p.classList.remove("hide"); measure(); render(); renderStrip(); layout();
  }
  function hide() { if (!ui) return; ui.p.classList.add("hide"); layout(); }
  function render() {
    if (!ui || !isOpen()) return;
    const m = lcdModel(W);
    ui.ind.querySelectorAll("span").forEach((s) => s.classList.toggle("on", !!m.ind[s.dataset.i]));
    ui.p.querySelectorAll('[data-k="shift"]').forEach((b) => b.classList.toggle("on", st.shift));
    ui.p.querySelectorAll('[data-k="alpha"]').forEach((b) => b.classList.toggle("on", st.alpha));
    const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
    if (m.menu) {
      ui.l1.innerHTML = `<div class="sc-menu">${m.menu.map((x) => `<span>${esc(x)}</span>`).join("")}</div>`;
      ui.l2.innerHTML = `<div class="sc-menu n" style="width:100%">${m.menu.map((x, i) => `<span>${i + 1}</span>`).join("")}</div>`;
      return;
    }
    let h = "";
    if (m.cur >= 0 && !st.err) {
      const s = m.l1;
      for (let i = 0; i <= s.length; i++) {
        const ch = i < s.length ? esc(s[i]) : "";
        if (i === m.cur) h += i < s.length ? `<span class="c ${m.insMode ? "bar" : "ov"}">${ch}</span>` : `<span class="c ${m.insMode ? "bar" : "end"}">&nbsp;</span>`;
        else h += ch;
      }
    } else h = esc(m.l1);
    if (m.more && m.more.left) h = '<span class="ml">◀</span>' + h;
    if (m.more && m.more.right) h += '<span class="mr">▶</span>';
    ui.l1.innerHTML = h;
    const r = m.l2;
    if (r.err) ui.l2.innerHTML = `<span class="er">${esc(r.err)}</span>`;
    else ui.l2.innerHTML = `<span>${esc(r.m)}</span>${r.e != null ? `<span class="x">×10<sup>${r.e < 0 ? "−" + -r.e : r.e}</sup></span>` : ""}`;
  }

  // ===================== شريط السؤال المصغّر =====================
  const LET = ["أ", "ب", "ج", "د", "هـ", "و"];
  function renderStrip() {
    if (!ui) return;
    ui.tgl.style.display = ctx && ctx.q ? "" : "none";
    ui.tgl.textContent = stripOn ? "إخفاء السؤال" : "عرض السؤال";
    const info = ctx && ctx.q ? safeQ() : null;
    if (!info || !info.el || !stripOn || docked()) { ui.strip.classList.add("hide"); ui.strip.innerHTML = ""; return; }
    ui.strip.classList.remove("hide");
    const c = info.el.cloneNode(true);
    c.querySelectorAll(".opts,[id$='Fb'],.pfb,.pq-f,button,script").forEach((x) => x.remove());
    c.querySelectorAll("[id]").forEach((x) => x.removeAttribute("id"));
    const opts = [...info.el.querySelectorAll(".opt")];
    ui.strip.innerHTML = `<div class="sc-qh">${info.prev ? '<button type="button" data-n="prev" aria-label="السؤال السابق">‹ السابق</button>' : ""}<b>${info.label || "السؤال"}</b>${info.next ? '<button type="button" data-n="next" aria-label="السؤال التالي">التالي ›</button>' : ""}</div><div class="sc-stem"></div>
      <div class="sc-opts">${opts.map((o, j) => { const t = (o.querySelector(".grow") || o.lastElementChild || o).textContent.trim();
        const cl = o.classList.contains("is-ok") ? "ok" : o.classList.contains("is-bad") ? "bad" : o.getAttribute("aria-checked") === "true" ? "on" : "";
        return `<button type="button" class="sc-o ${cl}" data-o="${j}" ${o.disabled ? "disabled" : ""}><i>${LET[j] || j + 1}</i><span></span></button>`; }).join("")}</div>`;
    ui.strip.querySelector(".sc-stem").appendChild(c);
    ui.strip.querySelectorAll(".sc-o").forEach((b, j) => { const o = opts[j]; b.querySelector("span").textContent = (o.querySelector(".grow") || o.lastElementChild || o).textContent.trim();
      b.onclick = () => { o.click(); setTimeout(renderStrip, 30); }; });
    const pv = ui.strip.querySelector('[data-n="prev"]'), nx = ui.strip.querySelector('[data-n="next"]');
    if (pv) { pv.disabled = info.prev === "off"; pv.onclick = () => { if (typeof info.prev === "function") info.prev(); setTimeout(renderStrip, 30); }; }
    if (nx) { nx.disabled = info.next === "off"; nx.onclick = () => { if (typeof info.next === "function") info.next(); setTimeout(renderStrip, 30); }; }
  }
  function safeQ() { try { return ctx.q(); } catch (e) { return null; } }
  function scheduleStrip() { if (refreshT) return; refreshT = requestAnimationFrame(() => { refreshT = 0; if (isOpen()) { renderStrip(); layout(); } }); }

  // ===================== لوحة المفاتيح =====================
  const KB = { "0": "d0", "1": "d1", "2": "d2", "3": "d3", "4": "d4", "5": "d5", "6": "d6", "7": "d7", "8": "d8", "9": "d9", ".": "dot", "+": "add", "-": "sub", "*": "mul", "x": "mul", "/": "div",
    "^": "pow", "(": "lp", ")": "rp", ",": "comma", Enter: "eq", "=": "eq", Backspace: "del", Delete: "del", Escape: "ac", ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down", e: "exp", E: "exp" };
  function onKey(e) {
    if (!isOpen() || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target; if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    if (document.querySelector(".sheet.open,.sheet-wrap.open,[data-sheet-open]")) return;
    let k = KB[e.key];
    if (e.key === "%") { k = null; tap("shift"); tap("eq"); }
    else if (e.key === "!") { k = null; tap("shift"); tap("inv"); }
    else if (!k) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (k) { tap(k); const b = ui.p.querySelector(`[data-k="${k}"]`); if (b) { b.classList.add("pr"); setTimeout(() => b.classList.remove("pr"), 110); } }
  }

  // ===================== الواجهة العامة =====================
  window.SahmCalc = {
    /* attach({ root, q:()=>({el,label,prev,next}), host }) — يُظهر زر الآلة الحاسبة في هذه الشاشة */
    attach(o) {
      build(); ctx = o || {};
      if (mo) { mo.disconnect(); mo = null; }
      if (ctx.root && typeof MutationObserver !== "undefined") {
        mo = new MutationObserver(scheduleStrip);
        mo.observe(ctx.root, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-checked", "class", "disabled"] });
      }
      if (ui.inline) { ui.inline.remove(); ui.inline = null; }
      if (ctx.host) {
        const b = document.createElement("button"); b.type = "button"; b.className = "sc-inline"; b.innerHTML = ICON + "<span>الآلة الحاسبة</span>";
        b.setAttribute("aria-label", "الآلة الحاسبة"); b.onclick = () => (isOpen() ? hide() : show());
        ctx.host.appendChild(b); ui.inline = b;
      }
      layout(); if (isOpen()) { renderStrip(); render(); }
    },
    detach() {
      if (!ui) return; ctx = null; if (mo) { mo.disconnect(); mo = null; }
      if (ui.inline) { ui.inline.remove(); ui.inline = null; }
      hide(); layout();
    },
    refresh() { scheduleStrip(); },
    open: () => show(), close: () => hide(), isOpen: () => !!isOpen(),
    _t: { press(...ks) { ks.forEach((k) => { try { press(k); } catch (e) { fail(e, st.tok); } }); return lcdModel(30); }, st, evaluate, fmtNum, reset() { clearAll("all"); st.hist = []; } },
  };
})();
