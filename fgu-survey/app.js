/* FGU survey — student wizard: one section per page, live progress out of 100%. */
(function () {
  'use strict';
  var F = window.FGU, L = F.L, esc = F.esc, S = F.SECTIONS;
  var DRAFT = 'fgu_survey_draft_v1', DONE = 'fgu_survey_done_v1';

  var T = {
    surveyTitle: ['استبيان التعرف على طلاب المادة', 'Getting to know the class', 'Mieux connaître la classe'],
    lead: ['إجاباتك تساعد محاضر المادة على معرفة مستوى الطلاب العلمي والعملي ومجالات عملهم، ليضبط الشرح والأمثلة والتطبيقات على ما يناسبكم.',
      'Your answers help the lecturer understand the academic and professional level of the class and where you work, so the lectures, examples and exercises fit you.',
      'Vos réponses aident l’enseignant à connaître le niveau académique et professionnel de la classe et vos domaines d’activité, afin d’adapter les cours, les exemples et les exercices.'],
    fSteps: ['6 خطوات قصيرة', '6 short steps', '6 étapes courtes'],
    fTime: ['نحو 8 دقائق', 'About 8 minutes', 'Environ 8 minutes'],
    fReq: ['جميع الأسئلة إلزامية', 'Every question is required', 'Toutes les questions sont obligatoires'],
    start: ['ابدأ الاستبيان', 'Start the survey', 'Commencer le questionnaire'],
    resume: ['متابعة من حيث توقفت', 'Continue where you left off', 'Reprendre là où vous vous êtes arrêté'],
    privacy: ['تُستخدم إجاباتك لأغراض تدريس المادة فقط ولا يطّلع عليها غير محاضر المادة. أسئلة أساسيات الإدارة المالية تشخيصية ولا تدخل في أي علامة.',
      'Your answers are used only for teaching this course and are seen only by the course lecturer. The financial management basics questions are diagnostic and do not count towards any grade.',
      'Vos réponses servent uniquement à l’enseignement de ce cours et ne sont consultées que par l’enseignant. Les questions sur les bases de la gestion financière sont diagnostiques et ne comptent pour aucune note.'],
    stepOf: ['الخطوة {n} من {t}', 'Step {n} of {t}', 'Étape {n} sur {t}'],
    welcome: ['البداية', 'Welcome', 'Accueil'],
    complete: ['اكتمل الاستبيان', 'Survey complete', 'Questionnaire terminé'],
    next: ['التالي', 'Next', 'Suivant'],
    back: ['السابق', 'Back', 'Précédent'],
    send: ['إرسال الإجابات', 'Submit answers', 'Envoyer les réponses'],
    sending: ['جارٍ الإرسال…', 'Submitting…', 'Envoi en cours…'],
    multiTip: ['يمكنك اختيار أكثر من إجابة', 'You can choose more than one', 'Plusieurs réponses possibles'],
    otherPh: ['اكتب باختصار', 'Please specify briefly', 'Précisez brièvement'],
    typePh: ['اكتب إجابتك هنا', 'Type your answer here', 'Écrivez votre réponse ici'],
    eRequired: ['هذا السؤال إلزامي.', 'This question is required.', 'Cette question est obligatoire.'],
    eFour: ['اكتب الاسم الرباعي كاملاً (أربعة أسماء على الأقل).', 'Enter your full four-part name (at least four names).', 'Saisissez votre nom complet en quatre parties (au moins quatre noms).'],
    eOther: ['اكتب توضيحاً قصيراً لخيار «أخرى».', 'Please specify your “Other” answer.', 'Précisez votre réponse « Autre ».'],
    eStep: ['أكمل الأسئلة المظللة بالأحمر للمتابعة.', 'Complete the questions marked in red to continue.', 'Complétez les questions marquées en rouge pour continuer.'],
    eSend: ['تعذر الإرسال. تحقق من اتصالك بالإنترنت ثم اضغط «إرسال الإجابات» مرة أخرى. إجاباتك محفوظة على هذا الجهاز.',
      'Could not submit. Check your internet connection and press “Submit answers” again. Your answers are saved on this device.',
      'Envoi impossible. Vérifiez votre connexion Internet puis appuyez de nouveau sur « Envoyer les réponses ». Vos réponses sont enregistrées sur cet appareil.'],
    doneTitle: ['تم استلام إجاباتك', 'Your answers have been received', 'Vos réponses ont bien été reçues'],
    doneText: ['شكراً لك {name}. وصلت إجاباتك إلى محاضر المادة، ويمكنك إغلاق هذه الصفحة.',
      'Thank you, {name}. Your answers have reached the course lecturer, and you can close this page.',
      'Merci, {name}. Vos réponses ont été transmises à l’enseignant ; vous pouvez fermer cette page.'],
    again: ['تعبئة الاستبيان لطالب آخر على هذا الجهاز', 'Fill in the survey for another student on this device', 'Remplir le questionnaire pour un autre étudiant sur cet appareil'],
    foot: ['مادة الإدارة المالية · جامعة فلوريدا العالمية', 'Financial Management course · Florida Global University', 'Cours de gestion financière · Florida Global University']
  };

  var a = {}, step = -1, dir = 'fwd', stepError = false, sendError = false, sending = false, done = null;
  try { var d = JSON.parse(localStorage.getItem(DRAFT) || 'null'); if (d && d.a) { a = d.a; } } catch (e) {}
  try { done = JSON.parse(localStorage.getItem(DONE) || 'null'); } catch (e) {}
  if (done) step = S.length;

  var $ = function (id) { return document.getElementById(id); };
  function save() { try { localStorage.setItem(DRAFT, JSON.stringify({ a: a })); } catch (e) {} }
  function hasDraft() { for (var k in a) return true; return false; }

  function progress() {
    if (step >= S.length) return 100;
    var total = 0, ok = 0;
    F.ALL.forEach(function (q) { if (F.visible(q, a)) { total++; if (!F.check(q, a)) ok++; } });
    return Math.round(ok / total * 100);
  }
  function paintProgress() {
    var p = progress();
    $('progressFill').style.width = p + '%';
    $('progressPct').textContent = p + '%';
    $('progressTrack').setAttribute('aria-valuenow', p);
    var label = step < 0 ? L(T.welcome) : step >= S.length ? L(T.complete)
      : L(T.stepOf).replace('{n}', step + 1).replace('{t}', S.length) + ' · ' + L(S[step].title);
    $('progressStep').textContent = label;
  }

  function qNumber(q) {
    var n = 0;
    for (var i = 0; i < F.ALL.length; i++) { if (F.visible(F.ALL[i], a)) n++; if (F.ALL[i] === q) return n; }
    return n;
  }

  function qHtml(q) {
    var v = a[q.id], h = '', id = 'q_' + q.id;
    if (q.type === 'text') {
      h = '<input class="field" id="' + id + '" data-q="' + q.id + '" type="text" maxlength="' + (q.maxLength || 120) + '"' +
        (q.ltr ? ' dir="ltr" inputmode="text" autocapitalize="characters"' : '') + (q.autocomplete ? ' autocomplete="' + q.autocomplete + '"' : ' autocomplete="off"') +
        ' value="' + esc(v || '') + '">';
    } else if (q.type === 'longtext') {
      h = '<textarea class="field" id="' + id + '" data-q="' + q.id + '" maxlength="' + (q.maxLength || 600) + '" placeholder="' + esc(L(T.typePh)) + '">' + esc(v || '') + '</textarea>';
    } else if (q.type === 'scale') {
      h = '<div class="scale" role="radiogroup" aria-labelledby="' + id + '_l">';
      for (var i = 1; i <= 5; i++) {
        h += '<label class="opt"><input type="radio" name="' + id + '" data-q="' + q.id + '" value="' + i + '"' + (v === i ? ' checked' : '') +
          ' aria-label="' + i + ' — ' + esc(L(F.SCALE[i - 1])) + '"><span class="num">' + i + '</span></label>';
      }
      h += '</div><div class="scale-ends"><span>1 · ' + esc(L(F.SCALE[0])) + '</span><span>5 · ' + esc(L(F.SCALE[4])) + '</span></div>' +
        '<div class="scale-now" id="' + id + '_now">' + (v ? esc(L(F.SCALE[v - 1])) : '') + '</div>';
    } else {
      var multi = q.type === 'multi', hasOther = false;
      if (multi) h += '<p class="multi-tip">' + esc(L(T.multiTip)) + '</p>';
      h += '<div class="opts' + (q.type === 'quiz' ? ' col' : '') + '" role="' + (multi ? 'group' : 'radiogroup') + '" aria-labelledby="' + id + '_l">';
      q.options.forEach(function (op) {
        var on = multi ? (Array.isArray(v) && v.indexOf(op.v) >= 0) : v === op.v;
        if (op.other) hasOther = true;
        h += '<label class="opt"><input type="' + (multi ? 'checkbox' : 'radio') + '" name="' + id + '" data-q="' + q.id + '" value="' + op.v + '"' + (on ? ' checked' : '') +
          '><span><bdi>' + esc(L(op.l)) + '</bdi></span></label>';
      });
      h += '</div>';
      if (hasOther) {
        var show = multi ? (Array.isArray(v) && v.indexOf('other') >= 0) : v === 'other';
        h += '<input class="field other-box" id="' + id + '_other" data-other="' + q.id + '" type="text" maxlength="80" placeholder="' + esc(L(T.otherPh)) + '" aria-label="' + esc(L(T.otherPh)) + '" value="' + esc(a[q.id + '_other'] || '') + '"' + (show ? '' : ' hidden') + '>';
      }
    }
    return '<div class="q" id="' + id + '_wrap" data-wrap="' + q.id + '"' + (F.visible(q, a) ? '' : ' hidden') + '>' +
      '<div class="q-label" id="' + id + '_l"><span class="q-n num">' + qNumber(q) + '</span>' +
      (q.type === 'text' || q.type === 'longtext' ? '<label for="' + id + '">' + esc(L(q.label)) + '</label>' : '<span>' + esc(L(q.label)) + '</span>') + '</div>' +
      (q.hint ? '<p class="q-hint">' + esc(L(q.hint)) + '</p>' : '') +
      '<div class="q-body">' + h + '</div><p class="q-err" role="alert"></p></div>';
  }

  function arrow() { return '<span class="arrow" aria-hidden="true">→</span>'; }

  function render() {
    var h = '', cls = 'page' + (dir === 'back' ? ' back' : '');
    if (step < 0) {
      h = '<section class="' + cls + '"><div class="hero"><div class="hero-seal"><img src="logo.webp" alt="' + esc(L(F.UNI)) + '"></div>' +
        '<p class="eyebrow">' + esc(L(F.UNI)) + ' · ' + esc(L(F.COURSE)) + '</p>' +
        '<h1>' + esc(L(T.surveyTitle)) + '</h1><p class="lead">' + esc(L(T.lead)) + '</p>' +
        '<ul class="facts"><li>' + esc(L(T.fSteps)) + '</li><li>' + esc(L(T.fTime)) + '</li><li>' + esc(L(T.fReq)) + '</li></ul>' +
        '<div class="actions"><button class="btn btn-gold" id="btnStart" type="button">' + esc(L(hasDraft() ? T.resume : T.start)) + ' ' + arrow() + '</button></div></div>' +
        '<p class="note card">' + esc(L(T.privacy)) + '</p></section>';
    } else if (step >= S.length) {
      var name = String((done && done.name) || '').trim().split(/\s+/)[0] || '';
      h = '<section class="' + cls + '"><div class="card done"><div class="tick"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#ecd9a0" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></div>' +
        '<h2>' + esc(L(T.doneTitle)) + '</h2><p>' + esc(L(T.doneText).replace('{name}', name)).replace(/\s+([،,.])/g, '$1') + '</p>' +
        '<button class="linkbtn" id="btnAgain" type="button">' + esc(L(T.again)) + '</button></div></section>';
    } else {
      var s = S[step], last = step === S.length - 1;
      h = '<section class="' + cls + '"><div class="step-head"><p class="eyebrow num">' + esc(L(T.stepOf).replace('{n}', step + 1).replace('{t}', S.length)) + '</p>' +
        '<h2 id="stepTitle" tabindex="-1">' + esc(L(s.title)) + '</h2><p>' + esc(L(s.intro)) + '</p><div class="rule"></div></div>' +
        '<form class="card form" id="form" novalidate>' + s.questions.map(qHtml).join('') + '</form>' +
        '<div class="banner" id="stepBanner" role="alert"' + (stepError || sendError ? '' : ' hidden') + '>' + esc(L(sendError ? T.eSend : T.eStep)) + '</div>' +
        '<div class="nav"><button class="btn btn-ghost" id="btnBack" type="button">' + esc(L(T.back)) + '</button>' +
        '<button class="btn ' + (last ? 'btn-gold' : 'btn-primary') + '" id="btnNext" type="button"' + (sending ? ' disabled' : '') + '>' +
        esc(L(last ? (sending ? T.sending : T.send) : T.next)) + (last ? '' : ' ' + arrow()) + '</button></div></section>';
    }
    $('stage').innerHTML = h;
    if (stepError) markErrors(false);
    paintChrome();
  }

  function paintChrome() {
    $('brandUni').textContent = L(F.UNI);
    $('brandCourse').textContent = L(F.COURSE);
    $('foot').textContent = L(T.foot);
    document.title = L(T.surveyTitle) + ' · ' + L(F.COURSE) + ' · FGU';
    $('langs').innerHTML = F.LANGS.map(function (l) {
      return '<button type="button" data-lang="' + l + '" lang="' + l + '" aria-pressed="' + (l === F.getLang()) + '" aria-label="' + F.LANG_NAMES[l] + '"><span class="full">' + F.LANG_NAMES[l] + '</span><span class="short">' + F.LANG_SHORT[l] + '</span></button>';
    }).join('');
    paintProgress();
  }

  function errText(code) { return L(code === 'fourNames' ? T.eFour : code === 'otherRequired' ? T.eOther : T.eRequired); }

  /* Marks every unanswered visible question on this page. Returns the first invalid block. */
  function markErrors(focus) {
    var first = null;
    S[step].questions.forEach(function (q) {
      var w = $('q_' + q.id + '_wrap'); if (!w) return;
      var code = F.visible(q, a) ? F.check(q, a) : '';
      w.classList.toggle('invalid', !!code);
      w.querySelector('.q-err').textContent = code ? errText(code) : '';
      if (code && !first) first = w;
    });
    if (first && focus) {
      first.scrollIntoView({ block: 'center', behavior: 'smooth' });
      var el = first.querySelector('input:not([hidden]), textarea');
      if (el) el.focus({ preventScroll: true });
    }
    return first;
  }

  function go(n, d) {
    step = n; dir = d || 'fwd'; stepError = false; sendError = false;
    render();
    window.scrollTo(0, 0);
    var t = $('stepTitle'); if (t) t.focus({ preventScroll: true });
  }

  function payload() {
    var out = { v: 1 };
    F.ALL.forEach(function (q) {
      if (q.id === 'full_name' || q.id === 'student_id') return;
      if (!F.visible(q, a)) { out[q.id] = 'na'; return; }
      var v = a[q.id];
      out[q.id] = typeof v === 'string' ? v.trim() : v;
      var picked = Array.isArray(v) ? v.indexOf('other') >= 0 : v === 'other';
      if (picked) out[q.id + '_other'] = String(a[q.id + '_other'] || '').trim();
    });
    return out;
  }

  function send() {
    if (sending) return;
    sending = true; sendError = false; render();
    var name = String(a.full_name).trim().replace(/\s+/g, ' ');
    F.submit({ lang: F.getLang(), full_name: name, student_id: String(a.student_id).trim(), answers: payload() })
      .then(function () {
        sending = false; done = { name: name, at: Date.now() };
        try { localStorage.setItem(DONE, JSON.stringify(done)); localStorage.removeItem(DRAFT); } catch (e) {}
        a = {}; go(S.length, 'fwd');
      })
      .catch(function () { sending = false; sendError = true; render(); });
  }

  /* ---- events ---- */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.lang) { F.setLang(b.dataset.lang); dir = 'fwd'; render(); return; }
    if (b.id === 'btnStart') {
      var s0 = 0; // resume at the first page that still has something to answer
      for (var i = 0; i < S.length; i++) {
        s0 = i;
        if (S[i].questions.some(function (q) { return F.visible(q, a) && F.check(q, a); })) break;
      }
      go(s0, 'fwd');
    } else if (b.id === 'btnBack') { go(step - 1, 'back'); }
    else if (b.id === 'btnNext') {
      if (markErrors(true)) { stepError = true; $('stepBanner').textContent = L(T.eStep); $('stepBanner').hidden = false; return; }
      if (step === S.length - 1) send(); else go(step + 1, 'fwd');
    } else if (b.id === 'btnAgain') {
      try { localStorage.removeItem(DONE); } catch (e2) {}
      done = null; a = {}; go(-1, 'back');
    }
  });

  function onInput(e) {
    var el = e.target, id = el.dataset.q, oid = el.dataset.other;
    if (oid) { a[oid + '_other'] = el.value; }
    else if (id) {
      var q = F.ALL.filter(function (x) { return x.id === id; })[0];
      if (q.type === 'text' || q.type === 'longtext') a[id] = el.value;
      else if (q.type === 'scale') { a[id] = +el.value; $('q_' + id + '_now').textContent = L(F.SCALE[a[id] - 1]); }
      else if (q.type === 'multi') {
        var boxes = [].slice.call(document.querySelectorAll('input[data-q="' + id + '"]'));
        var noneKey = (q.options.filter(function (op) { return op.none; })[0] || {}).v;
        if (noneKey && el.checked) { // "none" and the real options exclude each other
          boxes.forEach(function (bx) { if (el.value === noneKey ? bx !== el : bx.value === noneKey) bx.checked = false; });
        }
        a[id] = boxes.filter(function (bx) { return bx.checked; }).map(function (bx) { return bx.value; });
      } else a[id] = el.value;
      var ob = $('q_' + id + '_other');
      if (ob) {
        var show = Array.isArray(a[id]) ? a[id].indexOf('other') >= 0 : a[id] === 'other';
        ob.hidden = !show;
        if (show && e.type === 'change' && el.value === 'other') ob.focus();
      }
    } else return;
    save();
    if (e.type === 'change' && step >= 0 && step < S.length) { // conditional questions follow the answers
      var changed = false;
      S[step].questions.forEach(function (q2) {
        var w = $('q_' + q2.id + '_wrap'), vis = F.visible(q2, a);
        if (w && w.hidden === vis) { w.hidden = !vis; changed = true; }
      });
      if (changed) S[step].questions.forEach(function (q3) {
        var n = document.querySelector('#q_' + q3.id + '_wrap .q-n'); if (n) n.textContent = qNumber(q3);
      });
    }
    var key = id || oid, w2 = $('q_' + key + '_wrap');
    if (w2 && w2.classList.contains('invalid')) {
      var qq = F.ALL.filter(function (x) { return x.id === key; })[0];
      if (!F.check(qq, a)) { w2.classList.remove('invalid'); w2.querySelector('.q-err').textContent = ''; }
    }
    paintProgress();
  }
  document.addEventListener('input', onInput);
  document.addEventListener('change', onInput);
  document.addEventListener('submit', function (e) { e.preventDefault(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.matches('input[type="text"]')) { e.preventDefault(); var n = $('btnNext'); if (n) n.click(); }
  });

  render();
})();
