/* FGU survey — lecturer dashboard: password gate, filters, charts, student list, Excel export. */
(function () {
  'use strict';
  var F = window.FGU, X = window.FGUExcel, L = F.L, esc = F.esc;
  var PASS_KEY = 'fgu_admin_pass';

  var T = {
    admin: ['لوحة المحاضر', 'Lecturer dashboard', 'Tableau de bord de l’enseignant'],
    gateTitle: ['لوحة نتائج الاستبيان', 'Survey results dashboard', 'Résultats du questionnaire'],
    gateText: ['أدخل كلمة مرور المحاضر لعرض إجابات الطلاب.', 'Enter the lecturer password to view student answers.', 'Saisissez le mot de passe de l’enseignant pour voir les réponses.'],
    pass: ['كلمة المرور', 'Password', 'Mot de passe'],
    enter: ['دخول', 'Sign in', 'Se connecter'],
    checking: ['جارٍ التحقق…', 'Checking…', 'Vérification…'],
    wrong: ['كلمة المرور غير صحيحة.', 'That password is not correct.', 'Mot de passe incorrect.'],
    netErr: ['تعذر الاتصال بالخادم. تحقق من الإنترنت وحاول مجدداً.', 'Could not reach the server. Check your connection and try again.', 'Serveur injoignable. Vérifiez votre connexion et réessayez.'],
    students: ['طالباً', 'students', 'étudiants'],
    dupNote: ['أُخفيت {n} إجابة مكررة؛ يُعتمد آخر إرسال لكل رقم جامعي.', '{n} repeated submissions hidden; the latest one per university ID is kept.', '{n} envois répétés masqués ; le dernier par numéro d’étudiant est conservé.'],
    refresh: ['تحديث', 'Refresh', 'Actualiser'],
    excel: ['تصدير Excel', 'Export to Excel', 'Exporter vers Excel'],
    excelBusy: ['جارٍ تجهيز الملف…', 'Preparing the file…', 'Préparation du fichier…'],
    excelFail: ['تعذر إنشاء ملف Excel. حدّث الصفحة وحاول مجدداً.', 'Could not build the Excel file. Reload the page and try again.', 'Impossible de créer le fichier Excel. Rechargez la page et réessayez.'],
    changePass: ['تغيير كلمة المرور', 'Change password', 'Changer le mot de passe'],
    logout: ['خروج', 'Sign out', 'Se déconnecter'],
    all: ['الكل', 'All', 'Tous'],
    kN: ['عدد الطلاب', 'Students', 'Étudiants'],
    kNsub: ['من أصل {n} إجابة', 'of {n} responses', 'sur {n} réponses'],
    kQuiz: ['متوسط اختبار الأساسيات', 'Average basics quiz', 'Moyenne au quiz de base'],
    kQuizSub: ['من 8 أسئلة', 'out of 8 questions', 'sur 8 questions'],
    kWork: ['يعملون حالياً', 'Currently working', 'En activité'],
    kWorkSub: ['دوام كامل أو جزئي أو عمل خاص', 'full-time, part-time or self-employed', 'temps plein, partiel ou indépendant'],
    kFin: ['خبرة مالية أو محاسبية', 'Finance or accounting experience', 'Expérience finance ou comptabilité'],
    kFinSub: ['محاسبة، تمويل، تدقيق أو خزينة', 'accounting, finance, audit or treasury', 'comptabilité, finance, audit ou trésorerie'],
    sLevel: ['المستوى العلمي', 'Academic level', 'Niveau académique'],
    sWho: ['من هم الطلاب', 'Who the students are', 'Qui sont les étudiants'],
    sWork: ['الخبرة العملية ومجال العمل', 'Work experience and field', 'Expérience et domaine professionnels'],
    sSkills: ['المهارات التقنية', 'Technical skills', 'Compétences techniques'],
    sGoals: ['التوقعات والأهداف', 'Expectations and goals', 'Attentes et objectifs'],
    sList: ['الطلاب', 'Students', 'Étudiants'],
    pBands: ['مستوى الطلاب حسب اختبار الأساسيات', 'Student level by basics quiz', 'Niveau selon le quiz de base'],
    pQuiz: ['نسبة الإجابة الصحيحة لكل سؤال', 'Share answering each question correctly', 'Part de bonnes réponses par question'],
    pSelf: ['التقييم الذاتي (متوسط من 5)', 'Self-assessment (average of 5)', 'Auto-évaluation (moyenne sur 5)'],
    othersSaid: ['«أخرى»:', '“Other”:', '« Autre » :'],
    none: ['لا توجد إجابات مطابقة للتصفية.', 'No responses match these filters.', 'Aucune réponse ne correspond à ces filtres.'],
    empty: ['لم تصل أي إجابة بعد. شارك رابط الاستبيان مع الطلاب ثم اضغط «تحديث».', 'No responses yet. Share the survey link with your students, then press “Refresh”.', 'Aucune réponse pour l’instant. Partagez le lien avec vos étudiants puis appuyez sur « Actualiser ».'],
    search: ['بحث بالاسم أو الرقم الجامعي', 'Search by name or university ID', 'Rechercher par nom ou numéro'],
    thName: ['الاسم', 'Name', 'Nom'], thId: ['الرقم الجامعي', 'University ID', 'Numéro'], thLevel: ['المرحلة', 'Programme', 'Cycle'],
    thMajor: ['التخصص', 'Major', 'Spécialité'], thWork: ['العمل', 'Work', 'Emploi'], thQuiz: ['الاختبار', 'Quiz', 'Quiz'], thDate: ['التاريخ', 'Date', 'Date'],
    close: ['إغلاق', 'Close', 'Fermer'],
    del: ['حذف هذه الإجابة', 'Delete this response', 'Supprimer cette réponse'],
    delSure: ['اضغط مرة أخرى لتأكيد الحذف النهائي', 'Press again to delete permanently', 'Appuyez de nouveau pour supprimer définitivement'],
    quizScore: ['درجة الاختبار', 'Quiz score', 'Score au quiz'],
    correct: ['صحيحة', 'correct', 'correct'],
    newPass: ['كلمة المرور الجديدة (8 أحرف على الأقل)', 'New password (at least 8 characters)', 'Nouveau mot de passe (8 caractères minimum)'],
    newPass2: ['أعد كتابة كلمة المرور الجديدة', 'Repeat the new password', 'Répétez le nouveau mot de passe'],
    savePass: ['حفظ كلمة المرور', 'Save password', 'Enregistrer'],
    passShort: ['كلمة المرور يجب ألا تقل عن 8 أحرف.', 'The password needs at least 8 characters.', 'Le mot de passe doit comporter au moins 8 caractères.'],
    passMismatch: ['كلمتا المرور غير متطابقتين.', 'The two passwords do not match.', 'Les deux mots de passe ne correspondent pas.'],
    passSaved: ['تم تغيير كلمة المرور.', 'Password changed.', 'Mot de passe modifié.'],
    loading: ['جارٍ تحميل الإجابات…', 'Loading responses…', 'Chargement des réponses…']
  };

  var pass = '', rows = [], recs = [], dups = 0, loaded = false, busy = false, gateMsg = '', status = '', statusErr = false;
  var filt = { level: '', major: '', emp_status: '' }, search = '';
  try { pass = sessionStorage.getItem(PASS_KEY) || ''; } catch (e) {}

  var $ = function (id) { return document.getElementById(id); };
  var Q = {}; F.ALL.forEach(function (q) { Q[q.id] = q; });
  function fmtDate(d) { try { return d.toLocaleDateString(F.getLang() === 'ar' ? 'ar-EG-u-nu-latn' : F.getLang(), { year: 'numeric', month: 'short', day: 'numeric' }); } catch (e) { return d.toISOString().slice(0, 10); } }
  function pct(x, n) { return n ? Math.round(x / n * 100) : 0; }

  function load() {
    busy = true; render();
    return F.rpc('fgu_survey_admin_list', { p_pass: pass }).then(function (data) {
      rows = data || []; var p = X.prepare(rows); recs = p.list; dups = p.duplicates;
      loaded = true; busy = false; gateMsg = '';
      try { sessionStorage.setItem(PASS_KEY, pass); } catch (e) {}
      render();
    }).catch(function (err) {
      busy = false;
      if (err.wrongPassword) { loaded = false; pass = ''; try { sessionStorage.removeItem(PASS_KEY); } catch (e) {} gateMsg = L(T.wrong); }
      else if (loaded) { status = L(T.netErr); statusErr = true; }
      else gateMsg = L(T.netErr);
      render();
    });
  }

  function filtered() {
    return recs.filter(function (r) {
      for (var k in filt) if (filt[k] && r.a[k] !== filt[k]) return false;
      return true;
    });
  }

  /* ---------- small renderers ---------- */
  function bar(name, value, total, cls, valueText) {
    var w = total ? Math.max(0, Math.min(100, value / total * 100)) : 0;
    return '<div class="bar"><span class="bar-name"><bdi>' + esc(name) + '</bdi></span><span class="bar-val num">' + valueText + '</span>' +
      '<span class="bar-track"><span class="bar-fill ' + (cls || '') + '" style="width:' + w.toFixed(1) + '%"></span></span></div>';
  }
  function countText(c, n) { return '<b>' + c + '</b> · ' + pct(c, n) + '%'; }
  function panel(title, body) { return '<section class="card panel"><h3>' + esc(title) + '</h3>' + body + '</section>'; }

  function distPanel(q, list) {
    var multi = q.type === 'multi', vals = q.options.map(function (op) { return op.v; });
    if (q.showIf && list.some(function (r) { return r.a[q.id] === 'na'; })) vals.push('na');
    var n = list.length, h = '<div class="bars">';
    vals.forEach(function (v) {
      var c = list.filter(function (r) { return multi ? (Array.isArray(r.a[q.id]) && r.a[q.id].indexOf(v) >= 0) : r.a[q.id] === v; }).length;
      h += bar(F.optLabel(q, v), c, n, '', countText(c, n));
    });
    h += '</div>';
    var others = {};
    list.forEach(function (r) { var o = r.a[q.id + '_other']; if (o) others[String(o).trim()] = 1; });
    var ol = Object.keys(others);
    if (ol.length) h += '<p class="q-hint">' + esc(L(T.othersSaid)) + ' ' + ol.map(function (o) { return '<bdi>' + esc(o) + '</bdi>'; }).join('، ') + '</p>';
    return panel(L(q.label), h);
  }
  function quotesPanel(q, list) {
    var h = '<div class="quotes">' + list.map(function (r) {
      return '<blockquote class="quote" style="margin:0"><bdi>' + esc(r.a[q.id] || '') + '</bdi><cite><bdi>' + esc(r.name) + '</bdi></cite></blockquote>';
    }).join('') + '</div>';
    return panel(L(q.label), h);
  }

  /* ---------- page ---------- */
  function chrome() {
    $('brandUni').textContent = L(F.UNI);
    $('brandCourse').textContent = L(F.COURSE) + ' · ' + L(T.admin);
    document.title = L(T.admin) + ' · FGU';
    $('langs').innerHTML = F.LANGS.map(function (l) {
      return '<button type="button" data-lang="' + l + '" lang="' + l + '" aria-pressed="' + (l === F.getLang()) + '" aria-label="' + F.LANG_NAMES[l] + '"><span class="full">' + F.LANG_NAMES[l] + '</span><span class="short">' + F.LANG_SHORT[l] + '</span></button>';
    }).join('');
  }

  function render() {
    chrome();
    if (!loaded) {
      $('app').innerHTML = '<div class="wide"><div class="card gate"><img src="logo.webp" alt="">' +
        '<h1>' + esc(L(T.gateTitle)) + '</h1><p>' + esc(L(T.gateText)) + '</p>' +
        '<form id="gateForm"><input class="field" id="gatePass" type="password" autocomplete="current-password" aria-label="' + esc(L(T.pass)) + '" placeholder="' + esc(L(T.pass)) + '" dir="ltr">' +
        '<button class="btn btn-primary" type="submit"' + (busy ? ' disabled' : '') + '>' + esc(L(busy ? T.checking : T.enter)) + '</button>' +
        (gateMsg ? '<p class="status err" role="alert">' + esc(gateMsg) + '</p>' : '') + '</form></div></div>';
      var gp = $('gatePass'); if (gp && !busy) gp.focus();
      return;
    }
    var list = filtered(), n = list.length;
    var h = '<div class="wide">';
    h += '<div class="toolbar"><div><h1>' + esc(L(T.gateTitle)) + '</h1><p class="sub num">' + recs.length + ' ' + esc(L(T.students)) +
      (dups ? ' · ' + esc(L(T.dupNote).replace('{n}', dups)) : '') + '</p></div>' +
      '<div class="toolbar-actions"><button class="btn btn-gold btn-sm" id="btnExcel" type="button"' + (recs.length ? '' : ' disabled') + '>' + esc(L(T.excel)) + '</button>' +
      '<button class="btn btn-ghost btn-sm" id="btnRefresh" type="button"' + (busy ? ' disabled' : '') + '>' + esc(L(busy ? T.loading : T.refresh)) + '</button>' +
      '<button class="btn btn-ghost btn-sm" id="btnPass" type="button">' + esc(L(T.changePass)) + '</button>' +
      '<button class="btn btn-ghost btn-sm" id="btnOut" type="button">' + esc(L(T.logout)) + '</button></div></div>';
    h += '<p class="status' + (statusErr ? ' err' : '') + '" id="status" role="status"' + (status ? '' : ' hidden') + ' style="margin-bottom:12px">' + esc(status) + '</p>';

    if (!recs.length) { $('app').innerHTML = h + '<div class="card panel"><p class="empty">' + esc(L(T.empty)) + '</p></div></div>'; return; }

    h += '<div class="card filters">' + ['level', 'major', 'emp_status'].map(function (id) {
      var q = Q[id];
      return '<label>' + esc(L(q.label)) + '<select class="field" data-filter="' + id + '" id="f_' + id + '"><option value="">' + esc(L(T.all)) + '</option>' +
        q.options.map(function (op) { return '<option value="' + op.v + '"' + (filt[id] === op.v ? ' selected' : '') + '>' + esc(L(op.l)) + '</option>'; }).join('') + '</select></label>';
    }).join('') + '</div>';

    if (!n) { $('app').innerHTML = h + '<div class="card panel"><p class="empty">' + esc(L(T.none)) + '</p></div></div>'; return; }

    var avg = list.reduce(function (s, r) { return s + r.score; }, 0) / n;
    var working = list.filter(function (r) { return r.a.emp_status !== 'none'; }).length;
    var fin = list.filter(function (r) { return ['accounting', 'finance', 'audit', 'treasury'].indexOf(r.a.job) >= 0; }).length;
    function kpi(label, value, sub) { return '<div class="kpi"><div class="kpi-label">' + esc(label) + '</div><div class="kpi-value num"><bdi dir="ltr">' + value + '</bdi></div><div class="kpi-sub">' + esc(sub) + '</div></div>'; }
    h += '<div class="kpis">' +
      kpi(L(T.kN), n, L(T.kNsub).replace('{n}', recs.length)) +
      kpi(L(T.kQuiz), avg.toFixed(1) + ' <small>/ 8</small>', L(T.kQuizSub)) +
      kpi(L(T.kWork), pct(working, n) + '%', L(T.kWorkSub)) +
      kpi(L(T.kFin), pct(fin, n) + '%', L(T.kFinSub)) + '</div>';

    // academic level
    h += '<h2 class="sec-title">' + esc(L(T.sLevel)) + '</h2><div class="grid">';
    var bh = '<div class="bars">';
    X.BANDS.forEach(function (b, i) { var c = list.filter(function (r) { return r.band === i; }).length; bh += bar(L(b.l), c, n, ['err', 'warn', 'ok'][i], countText(c, n)); });
    h += panel(L(T.pBands), bh + '</div>');
    var qh = '<div class="bars">';
    F.ALL.filter(function (q) { return q.type === 'quiz'; }).forEach(function (q) {
      var c = list.filter(function (r) { return r.a[q.id] === X.KEY[q.id]; }).length, p = pct(c, n);
      qh += bar(L(q.short), c, n, p >= 70 ? 'ok' : p >= 40 ? 'warn' : 'err', '<b>' + p + '%</b>');
    });
    h += panel(L(T.pQuiz), qh + '</div>');
    var sh = '<div class="bars">';
    F.ALL.filter(function (q) { return q.type === 'scale'; }).forEach(function (q) {
      var v = list.map(function (r) { return +r.a[q.id]; }).filter(Boolean);
      var m = v.length ? v.reduce(function (s, x) { return s + x; }, 0) / v.length : 0;
      sh += bar(L(q.short), m, 5, 'gold', '<b>' + m.toFixed(1) + '</b> / 5');
    });
    h += panel(L(T.pSelf), sh + '</div>') + distPanel(Q.courses, list) + '</div>';

    function group(title, ids) { h += '<h2 class="sec-title">' + esc(title) + '</h2><div class="grid">' + ids.map(function (id) { return distPanel(Q[id], list); }).join('') + '</div>'; }
    group(L(T.sWho), ['level', 'major', 'year']);
    group(L(T.sWork), ['emp_status', 'exp_years', 'sector', 'job', 'org_size', 'fin_role', 'tasks', 'certs']);
    group(L(T.sSkills), ['software', 'calc']);
    h += '<h2 class="sec-title">' + esc(L(T.sGoals)) + '</h2><div class="grid">' + distPanel(Q.goals, list) + distPanel(Q.hours, list) + quotesPanel(Q.expect, list) + quotesPanel(Q.concerns, list) + '</div>';

    h += '<h2 class="sec-title">' + esc(L(T.sList)) + '</h2><div class="card panel">' +
      '<input class="field search" id="search" type="search" placeholder="' + esc(L(T.search)) + '" aria-label="' + esc(L(T.search)) + '" value="' + esc(search) + '">' +
      '<div class="table-wrap" style="margin-top:12px"><table class="list"><thead><tr>' +
      [T.thName, T.thId, T.thLevel, T.thMajor, T.thWork, T.thQuiz, T.thDate].map(function (x) { return '<th>' + esc(L(x)) + '</th>'; }).join('') +
      '</tr></thead><tbody id="tbody">' + tableRows(list) + '</tbody></table></div></div>';
    $('app').innerHTML = h + '</div>';
  }

  function tableRows(list) {
    var s = search.trim().toLowerCase();
    return list.filter(function (r) { return !s || r.name.toLowerCase().indexOf(s) >= 0 || r.sid.toLowerCase().indexOf(s) >= 0; }).map(function (r) {
      var a = r.a;
      return '<tr data-id="' + esc(r.id) + '" tabindex="0"><td><bdi>' + esc(r.name) + '</bdi></td><td class="num"><bdi>' + esc(r.sid) + '</bdi></td>' +
        '<td>' + esc(a.level === 'other' ? a.level_other : F.optLabel(Q.level, a.level)) + '</td>' +
        '<td>' + esc(a.major === 'other' ? a.major_other : F.optLabel(Q.major, a.major)) + '</td>' +
        '<td>' + esc(F.optLabel(Q.exp_years, a.exp_years)) + '</td>' +
        '<td><span class="pill b' + r.band + ' num">' + r.score + ' / 8</span></td><td class="num">' + esc(fmtDate(r.at)) + '</td></tr>';
    }).join('');
  }

  function answerText(q, a) {
    var v = a[q.id];
    if (v === 'na') return F.optLabel(q, 'na');
    if (q.type === 'scale') return v ? v + ' / 5 · ' + L(F.SCALE[v - 1]) : '';
    if (q.type === 'longtext' || q.type === 'text') return String(v || '');
    if (q.type === 'multi') return (Array.isArray(v) ? v : []).map(function (x) { return F.optLabel(q, x) + (x === 'other' && a[q.id + '_other'] ? ': ' + a[q.id + '_other'] : ''); }).join(' · ');
    return F.optLabel(q, v) + (v === 'other' && a[q.id + '_other'] ? ': ' + a[q.id + '_other'] : '');
  }

  function openStudent(id) {
    var r = recs.filter(function (x) { return x.id === id; })[0]; if (!r) return;
    var h = '<div class="sheet-head"><div><h2><bdi>' + esc(r.name) + '</bdi></h2><p class="num"><bdi>' + esc(r.sid) + '</bdi> · ' + esc(fmtDate(r.at)) + ' · ' +
      esc(L(T.quizScore)) + ' ' + r.score + ' / 8 · ' + esc(L(X.BANDS[r.band].l)) + '</p></div>' +
      '<button class="sheet-x" type="button" data-close aria-label="' + esc(L(T.close)) + '">✕</button></div><div class="sheet-body">';
    F.SECTIONS.forEach(function (s) {
      h += '<h3>' + esc(L(s.title)) + '</h3><dl style="margin:0">';
      s.questions.forEach(function (q) {
        if (q.id === 'full_name' || q.id === 'student_id') return;
        var cls = '';
        if (q.type === 'quiz') cls = r.a[q.id] === X.KEY[q.id] ? 'right' : 'wrong';
        h += '<div class="kv"><dt>' + esc(L(q.label)) + '</dt><dd class="' + cls + '"><bdi>' + esc(answerText(q, r.a)) + '</bdi>' + (cls === 'right' ? ' ✓' : cls === 'wrong' ? ' ✗' : '') + '</dd></div>';
      });
      h += '</dl>';
    });
    h += '</div><div class="sheet-foot"><button class="btn btn-ghost btn-sm" type="button" data-close>' + esc(L(T.close)) + '</button>' +
      '<button class="btn btn-danger btn-sm" type="button" data-del="' + esc(r.id) + '">' + esc(L(T.del)) + '</button><span class="status err" id="sheetMsg" role="alert"></span></div>';
    $('sheet').innerHTML = h; $('sheet').showModal();
  }

  function openPass() {
    $('sheet').innerHTML = '<div class="sheet-head"><div><h2>' + esc(L(T.changePass)) + '</h2></div><button class="sheet-x" type="button" data-close aria-label="' + esc(L(T.close)) + '">✕</button></div>' +
      '<form class="sheet-body" id="passForm" style="display:grid;gap:12px;padding-top:20px">' +
      '<input class="field" id="np1" type="password" dir="ltr" autocomplete="new-password" placeholder="' + esc(L(T.newPass)) + '" aria-label="' + esc(L(T.newPass)) + '">' +
      '<input class="field" id="np2" type="password" dir="ltr" autocomplete="new-password" placeholder="' + esc(L(T.newPass2)) + '" aria-label="' + esc(L(T.newPass2)) + '">' +
      '<button class="btn btn-primary btn-sm" type="submit">' + esc(L(T.savePass)) + '</button><span class="status err" id="sheetMsg" role="alert"></span></form>';
    $('sheet').showModal();
  }

  function exportExcel(btn) {
    if (!window.ExcelJS) { status = L(T.excelFail); statusErr = true; render(); return; }
    btn.disabled = true; btn.textContent = L(T.excelBusy);
    var wb = X.build(window.ExcelJS, recs, F.getLang());
    wb.xlsx.writeBuffer().then(function (buf) {
      var url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      var a = document.createElement('a');
      a.href = url; a.download = 'FGU-Financial-Management-Survey-' + new Date().toISOString().slice(0, 10) + '.xlsx';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      status = ''; render();
    }).catch(function () { status = L(T.excelFail); statusErr = true; render(); });
  }

  /* ---------- events ---------- */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (b) {
      if (b.dataset.lang) { F.setLang(b.dataset.lang); render(); return; }
      if (b.hasAttribute('data-close')) { $('sheet').close(); return; }
      if (b.id === 'btnRefresh') { status = ''; statusErr = false; load(); return; }
      if (b.id === 'btnExcel') { exportExcel(b); return; }
      if (b.id === 'btnPass') { openPass(); return; }
      if (b.id === 'btnOut') { pass = ''; loaded = false; rows = []; recs = []; try { sessionStorage.removeItem(PASS_KEY); } catch (e1) {} render(); return; }
      if (b.dataset.del) {
        if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = L(T.delSure); return; }
        b.disabled = true;
        F.rpc('fgu_survey_admin_delete', { p_pass: pass, p_id: b.dataset.del })
          .then(function () { $('sheet').close(); return load(); })
          .catch(function () { b.disabled = false; $('sheetMsg').textContent = L(T.netErr); });
        return;
      }
    }
    var tr = e.target.closest('tr[data-id]'); if (tr) openStudent(tr.dataset.id);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.matches('tr[data-id]')) openStudent(e.target.dataset.id);
  });
  document.addEventListener('change', function (e) {
    var k = e.target.dataset.filter; if (!k) return;
    filt[k] = e.target.value; render();
    var el = $('f_' + k); if (el) el.focus();
  });
  document.addEventListener('input', function (e) {
    if (e.target.id !== 'search') return;
    search = e.target.value; $('tbody').innerHTML = tableRows(filtered());
  });
  document.addEventListener('submit', function (e) {
    e.preventDefault();
    if (e.target.id === 'gateForm') { pass = $('gatePass').value; if (pass) load(); }
    if (e.target.id === 'passForm') {
      var p1 = $('np1').value, p2 = $('np2').value, msg = $('sheetMsg');
      if (p1.length < 8) { msg.textContent = L(T.passShort); return; }
      if (p1 !== p2) { msg.textContent = L(T.passMismatch); return; }
      F.rpc('fgu_survey_admin_set_pass', { p_pass: pass, p_new: p1 }).then(function () {
        pass = p1; try { sessionStorage.setItem(PASS_KEY, pass); } catch (e2) {}
        $('sheet').close(); status = L(T.passSaved); statusErr = false; render();
      }).catch(function () { msg.textContent = L(T.netErr); });
    }
  });
  $('sheet').addEventListener('click', function (e) { if (e.target === $('sheet')) $('sheet').close(); });

  if (pass) load(); else render();
})();
