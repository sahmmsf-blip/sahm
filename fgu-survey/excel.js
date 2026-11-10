/* FGU survey — scoring and the interactive Excel workbook (admin side only).
   Workbook: Dashboard (filters + live formulas + data bars), Responses, Calc (0/1 helper columns), Lists (hidden). */
(function () {
  'use strict';
  var F = window.FGU, L = F.L;

  var KEY = { q1: 'b', q2: 'b', q3: 'c', q4: 'a', q5: 'b', q6: 'a', q7: 'c', q8: 'c' };
  var QUIZ_MAX = 8;
  var BANDS = [
    { l: ['تأسيسي (0–3)', 'Foundation (0–3)', 'Débutant (0–3)'] },
    { l: ['متوسط (4–6)', 'Intermediate (4–6)', 'Intermédiaire (4–6)'] },
    { l: ['متقدم (7–8)', 'Advanced (7–8)', 'Avancé (7–8)'] }
  ];
  function score(a) { var s = 0; for (var k in KEY) if (a[k] === KEY[k]) s++; return s; }
  function band(s) { return s <= 3 ? 0 : s <= 6 ? 1 : 2; }

  /* Rows from the database -> one record per student (latest submission per university ID). */
  function prepare(rows) {
    var seen = {}, list = [], dup = 0;
    rows.slice().sort(function (x, y) { return new Date(y.created_at) - new Date(x.created_at); }).forEach(function (r) {
      var k = String(r.student_id).trim().toLowerCase();
      if (seen[k]) { dup++; return; }
      seen[k] = 1;
      var a = r.answers || {}, s = score(a);
      list.push({ id: r.id, at: new Date(r.created_at), lang: r.lang, name: r.full_name, sid: String(r.student_id).trim(), a: a, score: s, band: band(s) });
    });
    return { list: list, duplicates: dup };
  }

  var X = {
    title: ['لوحة استبيان طلاب الإدارة المالية', 'Financial Management Student Survey — Dashboard', 'Tableau de bord — Enquête étudiants, Gestion financière'],
    generated: ['تاريخ التصدير', 'Exported on', 'Exporté le'],
    filters: ['التصفية — اختر من القوائم المنسدلة فتتحدث كل الأرقام', 'Filters — pick from the drop-down lists and every figure updates', 'Filtres — choisissez dans les listes déroulantes, tous les chiffres se mettent à jour'],
    all: ['الكل', 'All', 'Tous'],
    respondents: ['عدد الطلاب (بعد التصفية)', 'Students (after filters)', 'Étudiants (après filtres)'],
    avgScore: ['متوسط درجة الاختبار من 8', 'Average quiz score out of 8', 'Score moyen au quiz sur 8'],
    count: ['العدد', 'Count', 'Nombre'], pct: ['النسبة', 'Share', 'Part'], avg: ['المتوسط من 5', 'Average of 5', 'Moyenne sur 5'],
    correct: ['إجابات صحيحة', 'Correct answers', 'Bonnes réponses'],
    bands: ['مستوى الطلاب حسب الاختبار', 'Student level by quiz score', 'Niveau des étudiants selon le quiz'],
    quizQ: ['نسبة الإجابة الصحيحة لكل سؤال', 'Share answering each question correctly', 'Part de bonnes réponses par question'],
    selfRate: ['التقييم الذاتي (متوسط من 5)', 'Self-assessment (average of 5)', 'Auto-évaluation (moyenne sur 5)'],
    date: ['تاريخ الإرسال', 'Submitted', 'Envoyé le'], name: ['الاسم الرباعي', 'Full name', 'Nom complet'], sid: ['الرقم الجامعي', 'University ID', 'Numéro d’étudiant'],
    lang: ['اللغة', 'Language', 'Langue'], score: ['درجة الاختبار من 8', 'Quiz score of 8', 'Score au quiz sur 8'], band: ['المستوى', 'Level band', 'Niveau'],
    other: ['توضيح «أخرى»', '“Other” detail', 'Précision « Autre »']
  };

  function colLetter(n) { var s = ''; while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = (n - m - 1) / 26; } return s; }
  function hasOther(q) { return (q.options || []).some(function (op) { return op.other; }); }
  function multiVals(r, q) { var v = r.a[q.id]; return Array.isArray(v) ? v : []; }

  function build(ExcelJS, recs, lang) {
    var t = function (x) { return L(x, lang); };
    var rtl = lang === 'ar';
    var NAVY = 'FF0C2742', MID = 'FF1B4B78', GOLD = 'FFC8A24A', TINT = 'FFEAF0F7', WHITE = 'FFFFFFFF', MUTED = 'FF5A6A7C';
    var wb = new ExcelJS.Workbook();
    wb.creator = 'FGU Financial Management survey'; wb.created = new Date();
    wb.calcProperties = { fullCalcOnLoad: true };
    var dash = wb.addWorksheet('Dashboard', { views: [{ rightToLeft: rtl, showGridLines: false }], properties: { tabColor: { argb: GOLD } } });
    var resp = wb.addWorksheet('Responses', { views: [{ rightToLeft: rtl, state: 'frozen', ySplit: 1, xSplit: 0 }] });
    var calc = wb.addWorksheet('Calc', { views: [{ rightToLeft: rtl, state: 'frozen', ySplit: 1 }] });
    var lists = wb.addWorksheet('Lists', { state: 'hidden' });
    var last = Math.max(recs.length + 1, 2);

    /* ---------- Responses ---------- */
    var RC = [], rcol = {};
    function addR(key, header, width, fn, fmt) { RC.push({ header: header, width: width, fn: fn, fmt: fmt }); rcol[key] = RC.length; }
    addR('n', '#', 6, function (r, i) { return i + 1; });
    addR('at', t(X.date), 18, function (r) { return new Date(r.at.getTime() - r.at.getTimezoneOffset() * 60000); }, 'yyyy-mm-dd hh:mm');
    addR('name', t(X.name), 34, function (r) { return r.name; });
    addR('sid', t(X.sid), 16, function (r) { return r.sid; });
    addR('lang', t(X.lang), 10, function (r) { return String(r.lang || '').toUpperCase(); });
    F.ALL.forEach(function (q) {
      if (q.id === 'full_name' || q.id === 'student_id') return;
      var head = t(q.label).replace(/[:：]\s*$/, '');
      if (q.type === 'scale') addR(q.id, head, 16, function (r) { return +r.a[q.id] || null; });
      else if (q.type === 'longtext') addR(q.id, head, 52, function (r) { return String(r.a[q.id] || ''); });
      else if (q.type === 'multi') addR(q.id, head, 40, function (r) {
        if (r.a[q.id] === 'na') return F.optLabel(q, 'na', lang);
        return multiVals(r, q).map(function (v) {
          return F.optLabel(q, v, lang) + (v === 'other' && r.a[q.id + '_other'] ? ': ' + r.a[q.id + '_other'] : '');
        }).join(' | ');
      });
      else {
        addR(q.id, head, 26, function (r) { return F.optLabel(q, r.a[q.id], lang); });
        if (hasOther(q)) addR(q.id + '_other', head + ' — ' + t(X.other), 24, function (r) { return String(r.a[q.id + '_other'] || ''); });
      }
      if (q.id === 'q8') {
        addR('score', t(X.score), 14, function (r) { return r.score; });
        addR('band', t(X.band), 20, function (r) { return t(BANDS[r.band].l); });
      }
    });
    resp.columns = RC.map(function (c) { return { width: c.width }; });
    resp.addRow(RC.map(function (c) { return c.header; }));
    recs.forEach(function (r, i) { resp.addRow(RC.map(function (c) { return c.fn(r, i); })); });
    RC.forEach(function (c, i) { if (c.fmt) resp.getColumn(i + 1).numFmt = c.fmt; });
    styleHeader(resp.getRow(1));
    resp.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: RC.length } };
    resp.eachRow(function (row, n) { if (n > 1) row.alignment = { vertical: 'top', wrapText: true }; });

    /* ---------- Calc (row-aligned with Responses) ---------- */
    var CC = [], ccol = {};
    function addC(key, header, fn) { CC.push({ header: header, fn: fn }); ccol[key] = CC.length; }
    addC('sid', t(X.sid), function (r) { return r.sid; });
    F.ALL.forEach(function (q) {
      if (q.type === 'multi') q.options.forEach(function (op) {
        addC(q.id + ':' + op.v, t(q.label) + ' — ' + t(op.l), function (r) { return multiVals(r, q).indexOf(op.v) >= 0 ? 1 : 0; });
      });
      if (q.type === 'quiz') addC(q.id, t(q.short) + ' ✓', function (r) { return r.a[q.id] === KEY[q.id] ? 1 : 0; });
    });
    calc.columns = CC.map(function () { return { width: 16 }; });
    calc.addRow(CC.map(function (c) { return c.header; }));
    recs.forEach(function (r) { calc.addRow(CC.map(function (c) { return c.fn(r); })); });
    styleHeader(calc.getRow(1));

    function styleHeader(row) {
      row.height = 40;
      row.eachCell(function (c) {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
        c.font = { bold: true, color: { argb: WHITE }, size: 11 };
        c.alignment = { vertical: 'middle', wrapText: true };
      });
    }
    function RR(key) { var c = colLetter(rcol[key]); return 'Responses!$' + c + '$2:$' + c + '$' + last; }
    function CR(key) { var c = colLetter(ccol[key]); return 'Calc!$' + c + '$2:$' + c + '$' + last; }

    /* ---------- Lists + filters ---------- */
    var ALL = t(X.all);
    var filterQs = ['level', 'major', 'emp_status'].map(function (id) { return F.ALL.filter(function (q) { return q.id === id; })[0]; });
    filterQs.forEach(function (q, i) {
      [ALL].concat(q.options.map(function (op) { return t(op.l); })).forEach(function (v, j) { lists.getCell(j + 1, i + 1).value = v; });
    });
    var FROW = 5, NROW = 9;
    var FILT = filterQs.map(function (q, i) {
      return RR(q.id) + ',IF($C$' + (FROW + i) + '="' + ALL + '","*",$C$' + (FROW + i) + ')';
    }).join(',');

    /* ---------- Dashboard ---------- */
    dash.columns = [{ width: 3 }, { width: 46 }, { width: 16 }, { width: 34 }, { width: 3 }];
    dash.mergeCells('B1:D1'); dash.mergeCells('B2:D2'); dash.mergeCells('B4:D4');
    var c1 = dash.getCell('B1'); c1.value = t(X.title);
    c1.font = { bold: true, size: 18, color: { argb: WHITE } }; c1.alignment = { vertical: 'middle', indent: 1 };
    dash.getRow(1).height = 44;
    ['A1', 'B1', 'E1', 'A2', 'B2', 'E2'].forEach(function (k) { dash.getCell(k).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } }; });
    var c2 = dash.getCell('B2');
    c2.value = t(F.UNI) + ' · ' + t(F.COURSE) + ' · ' + t(X.generated) + ' ' + new Date().toISOString().slice(0, 10);
    c2.font = { size: 11, color: { argb: 'FFECD9A0' } }; c2.alignment = { indent: 1 };
    var c4 = dash.getCell('B4'); c4.value = t(X.filters); c4.font = { bold: true, color: { argb: MID }, size: 11 };

    filterQs.forEach(function (q, i) {
      var r = FROW + i;
      dash.getCell('B' + r).value = t(q.label);
      dash.getCell('B' + r).font = { bold: true };
      var c = dash.getCell('C' + r);
      dash.mergeCells('C' + r + ':D' + r);
      c.value = ALL;
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF6DC' } };
      c.border = { top: { style: 'medium', color: { argb: GOLD } }, bottom: { style: 'medium', color: { argb: GOLD } }, left: { style: 'medium', color: { argb: GOLD } }, right: { style: 'medium', color: { argb: GOLD } } };
      c.font = { bold: true, color: { argb: NAVY } };
      c.dataValidation = { type: 'list', allowBlank: false, formulae: ['Lists!$' + colLetter(i + 1) + '$1:$' + colLetter(i + 1) + '$' + (q.options.length + 1)] };
    });

    var n = recs.length;
    function kpi(r, label, formula, result, fmt) {
      dash.getCell('B' + r).value = label; dash.getCell('B' + r).font = { bold: true, size: 12 };
      var c = dash.getCell('C' + r); c.value = { formula: formula, result: result };
      c.font = { bold: true, size: 14, color: { argb: MID } }; if (fmt) c.numFmt = fmt;
    }
    var avgScore = n ? recs.reduce(function (s, r) { return s + r.score; }, 0) / n : 0;
    kpi(NROW, t(X.respondents), 'COUNTIFS(' + FILT + ')', n);
    kpi(NROW + 1, t(X.avgScore), 'IFERROR(AVERAGEIFS(' + RR('score') + ',' + FILT + '),0)', avgScore, '0.0');
    var NREF = '$C$' + NROW;

    var row = NROW + 3;
    function blockHead(title, h2, h3) {
      var cells = [['B', title], ['C', h2], ['D', h3]];
      cells.forEach(function (p) {
        var c = dash.getCell(p[0] + row); c.value = p[1];
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: MID } };
        c.font = { bold: true, color: { argb: WHITE } };
        c.alignment = { vertical: 'middle', wrapText: true, horizontal: p[0] === 'B' ? undefined : 'center' };
      });
      dash.getRow(row).height = 30;
      row++;
    }
    function line(label, formula, result, kind) {
      var b = dash.getCell('B' + row); b.value = label; b.alignment = { wrapText: true, vertical: 'middle' };
      var c = dash.getCell('C' + row); c.value = { formula: formula, result: result };
      c.alignment = { horizontal: 'center' }; if (kind === 'avg') c.numFmt = '0.00';
      var d = dash.getCell('D' + row);
      var div = kind === 'avg' ? 5 : null;
      d.value = div ? { formula: 'C' + row + '/5', result: result / 5 } : { formula: 'IF(' + NREF + '=0,0,C' + row + '/' + NREF + ')', result: n ? result / n : 0 };
      d.numFmt = '0%';
      ['B', 'C', 'D'].forEach(function (k) { dash.getCell(k + row).border = { bottom: { style: 'hair', color: { argb: 'FFD9E1EA' } } }; });
      row++;
    }
    function bars(from, color) {
      if (row - 1 < from) return;
      dash.addConditionalFormatting({
        ref: 'D' + from + ':D' + (row - 1),
        rules: [{ type: 'dataBar', priority: 1, gradient: false, minLength: 0, maxLength: 100, cfvo: [{ type: 'num', value: 0 }, { type: 'num', value: 1 }], color: { argb: color || MID } }]
      });
      row++;
    }
    function countWhere(fn) { return recs.filter(fn).length; }

    function blockSingle(q) {
      blockHead(t(q.label), t(X.count), t(X.pct));
      var from = row, vals = q.options.map(function (op) { return op.v; });
      if (q.showIf) vals.push('na');
      vals.forEach(function (v) {
        line(F.optLabel(q, v, lang), 'COUNTIFS(' + FILT + ',' + RR(q.id) + ',$B' + row + ')', countWhere(function (r) { return r.a[q.id] === v; }));
      });
      bars(from);
    }
    function blockMulti(q) {
      blockHead(t(q.label), t(X.count), t(X.pct));
      var from = row;
      q.options.forEach(function (op) {
        line(t(op.l), 'COUNTIFS(' + FILT + ',' + CR(q.id + ':' + op.v) + ',1)', countWhere(function (r) { return multiVals(r, q).indexOf(op.v) >= 0; }));
      });
      bars(from);
    }
    function byId(id) { return F.ALL.filter(function (q) { return q.id === id; })[0]; }

    // 1. level of the class
    blockHead(t(X.bands), t(X.count), t(X.pct));
    var from = row;
    BANDS.forEach(function (b, i) { line(t(b.l), 'COUNTIFS(' + FILT + ',' + RR('band') + ',$B' + row + ')', countWhere(function (r) { return r.band === i; })); });
    bars(from, GOLD);

    blockHead(t(X.quizQ), t(X.correct), t(X.pct));
    from = row;
    F.ALL.filter(function (q) { return q.type === 'quiz'; }).forEach(function (q) {
      line(t(q.short), 'SUMIFS(' + CR(q.id) + ',' + FILT + ')', countWhere(function (r) { return r.a[q.id] === KEY[q.id]; }));
    });
    bars(from, 'FF1D7A4C');

    blockHead(t(X.selfRate), t(X.avg), t(X.pct));
    from = row;
    F.ALL.filter(function (q) { return q.type === 'scale'; }).forEach(function (q) {
      var vals = recs.map(function (r) { return +r.a[q.id]; }).filter(Boolean);
      var avg = vals.length ? vals.reduce(function (s, v) { return s + v; }, 0) / vals.length : 0;
      line(t(q.short), 'IFERROR(AVERAGEIFS(' + RR(q.id) + ',' + FILT + '),0)', avg, 'avg');
    });
    bars(from, GOLD);

    // 2. everything else, in survey order
    ['level', 'major', 'year', 'courses', 'emp_status', 'exp_years', 'sector', 'job', 'org_size', 'fin_role', 'tasks', 'certs', 'software', 'calc', 'goals', 'hours'].forEach(function (id) {
      var q = byId(id); if (q.type === 'multi') blockMulti(q); else blockSingle(q);
    });

    dash.getCell('B' + (row + 1)).value = 'Responses · Calc';
    dash.getCell('B' + (row + 1)).font = { italic: true, color: { argb: MUTED }, size: 9 };
    return wb;
  }

  window.FGUExcel = { KEY: KEY, QUIZ_MAX: QUIZ_MAX, BANDS: BANDS, score: score, band: band, prepare: prepare, build: build };
})();
