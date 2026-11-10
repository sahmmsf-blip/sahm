/* FGU — Financial Management student survey: shared definitions (questions, languages, storage).
   Every label is [Arabic, English, French]. Stored answers use the option keys, never the labels. */
(function () {
  'use strict';

  var CFG = {
    // Public Supabase key: it can only insert a response. Reading needs the admin password.
    url: 'https://dpbjpjtrsjbmlijpkaup.supabase.co',
    key: 'sb_publishable_08Lm9kVInE-dqMJWlqK8Hw_fwwFmOf5',
    table: 'fgu_survey_responses'
  };

  var LANGS = ['ar', 'en', 'fr'];
  var LANG_NAMES = { ar: 'العربية', en: 'English', fr: 'Français' };
  var LANG_SHORT = { ar: 'عربي', en: 'EN', fr: 'FR' };
  var lang = 'ar';
  try { var saved = localStorage.getItem('fgu_lang'); if (LANGS.indexOf(saved) >= 0) lang = saved; } catch (e) {}

  function L(x, forLang) {
    if (x == null) return '';
    if (typeof x === 'string') return x;
    var i = LANGS.indexOf(forLang || lang);
    return x[i] != null ? x[i] : x[1];
  }
  function setLang(l) {
    if (LANGS.indexOf(l) < 0) return;
    lang = l;
    try { localStorage.setItem('fgu_lang', l); } catch (e) {}
    document.documentElement.lang = l;
    document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
  }

  var OTHER = { v: 'other', l: ['أخرى', 'Other', 'Autre'], other: true };
  var IDK = { v: 'idk', l: ['لا أعرف', 'I don’t know', 'Je ne sais pas'] };
  var SCALE = [
    ['ضعيف جداً', 'Very weak', 'Très faible'],
    ['ضعيف', 'Weak', 'Faible'],
    ['متوسط', 'Average', 'Moyen'],
    ['جيد', 'Good', 'Bon'],
    ['ممتاز', 'Excellent', 'Excellent']
  ];
  function o(v, ar, en, fr) { return { v: v, l: [ar, en, fr] }; }
  function same(v, s) { return { v: v, l: [s, s, s] }; }
  function hasWorked(a) { return !(a.emp_status === 'none' && a.exp_years === 'none'); }

  var SECTIONS = [
    {
      id: 'profile',
      title: ['بيانات الطالب', 'Student profile', 'Profil de l’étudiant'],
      intro: ['نبدأ بالتعريف بك وببرنامجك الدراسي.', 'Let’s start with who you are and what you study.', 'Commençons par vous et votre programme d’études.'],
      questions: [
        { id: 'full_name', type: 'text', minWords: 4, maxLength: 120, autocomplete: 'name',
          label: ['الاسم الرباعي', 'Full name (four parts)', 'Nom complet (quatre parties)'],
          hint: ['كما هو مسجل في الجامعة', 'As registered at the university', 'Tel qu’il est enregistré à l’université'] },
        { id: 'student_id', type: 'text', maxLength: 40, ltr: true,
          label: ['الرقم الجامعي', 'University ID number', 'Numéro d’étudiant'] },
        { id: 'level', type: 'single',
          label: ['المرحلة الدراسية الحالية', 'Current degree programme', 'Cycle d’études actuel'],
          options: [o('bachelor', 'بكالوريوس', 'Bachelor’s', 'Licence (Bachelor)'), o('master', 'ماجستير', 'Master’s', 'Master'), same('mba', 'MBA'), OTHER] },
        { id: 'major', type: 'single',
          label: ['التخصص', 'Major', 'Spécialité'],
          options: [o('finance', 'تمويل', 'Finance', 'Finance'), o('accounting', 'محاسبة', 'Accounting', 'Comptabilité'),
            o('business', 'إدارة أعمال', 'Business Administration', 'Administration des affaires'), o('economics', 'اقتصاد', 'Economics', 'Économie'), OTHER] },
        { id: 'year', type: 'single',
          label: ['المستوى الدراسي الحالي', 'Current year of study', 'Année d’études actuelle'],
          options: [o('y1', 'سنة أولى', 'First year', 'Première année'), o('y2', 'سنة ثانية', 'Second year', 'Deuxième année'),
            o('y3', 'سنة ثالثة', 'Third year', 'Troisième année'), o('y4', 'سنة رابعة أو أكثر', 'Fourth year or above', 'Quatrième année ou plus'),
            o('grad', 'دراسات عليا', 'Postgraduate', 'Cycle supérieur')] }
      ]
    },
    {
      id: 'academic',
      title: ['الخلفية العلمية', 'Academic background', 'Parcours académique'],
      intro: ['ما الذي درسته قبل هذه المادة، وكيف تقيّم معرفتك؟', 'What have you studied before this course, and how do you rate your knowledge?', 'Qu’avez-vous étudié avant ce cours, et comment évaluez-vous vos connaissances ?'],
      questions: [
        { id: 'courses', type: 'multi',
          label: ['المقررات التي درستها سابقاً', 'Courses you have already taken', 'Cours que vous avez déjà suivis'],
          options: [Object.assign(o('none', 'لم أدرس أياً منها', 'None of these', 'Aucun de ces cours'), { none: true }),
            o('fin_acc', 'محاسبة مالية', 'Financial accounting', 'Comptabilité financière'),
            o('mgmt_acc', 'محاسبة إدارية', 'Managerial accounting', 'Comptabilité de gestion'),
            o('stats', 'إحصاء', 'Statistics', 'Statistiques'),
            o('micro', 'اقتصاد جزئي', 'Microeconomics', 'Microéconomie'),
            o('macro', 'اقتصاد كلي', 'Macroeconomics', 'Macroéconomie'),
            o('math', 'رياضيات أو تفاضل', 'Mathematics or calculus', 'Mathématiques ou calcul différentiel')] },
        { id: 'k_acc', type: 'scale', short: ['المحاسبة المالية', 'Financial accounting', 'Comptabilité financière'],
          label: ['معرفتك بالمحاسبة المالية', 'Your knowledge of financial accounting', 'Vos connaissances en comptabilité financière'] },
        { id: 'k_stats', type: 'scale', short: ['الإحصاء', 'Statistics', 'Statistiques'],
          label: ['معرفتك بالإحصاء', 'Your knowledge of statistics', 'Vos connaissances en statistiques'] },
        { id: 'k_econ', type: 'scale', short: ['الاقتصاد', 'Economics', 'Économie'],
          label: ['معرفتك بالاقتصاد', 'Your knowledge of economics', 'Vos connaissances en économie'] }
      ]
    },
    {
      id: 'quiz',
      title: ['أساسيات الإدارة المالية', 'Financial management basics', 'Bases de la gestion financière'],
      intro: ['ثمانية أسئلة قصيرة هدفها الإلمام بوضع الطلبة قبل بدء المادة، ولا تدخل في أي علامة. من الطبيعي ألا تعرف بعض الإجابات؛ اختر «لا أعرف» ولا تخمّن.',
        'Eight short questions meant to show where the class stands before the course begins. They do not count towards any grade. Not knowing some answers is normal: choose “I don’t know” rather than guessing.',
        'Huit questions courtes pour situer le niveau de la classe avant le début du cours. Elles ne comptent pour aucune note. Il est normal de ne pas connaître certaines réponses : choisissez « Je ne sais pas » plutôt que de deviner.'],
      questions: [
        { id: 'q1', type: 'quiz', short: ['هدف الإدارة المالية', 'Goal of financial management', 'Objectif de la gestion financière'],
          label: ['الهدف الأساسي للإدارة المالية في الشركة هو:', 'The primary goal of financial management in a firm is to:', 'L’objectif principal de la gestion financière d’une entreprise est de :'],
          options: [o('a', 'تعظيم المبيعات', 'Maximise sales', 'Maximiser les ventes'),
            o('b', 'تعظيم ثروة الملاك (قيمة الشركة)', 'Maximise shareholders’ wealth (firm value)', 'Maximiser la richesse des actionnaires (valeur de l’entreprise)'),
            o('c', 'تقليل التكاليف إلى أدنى حد', 'Minimise costs', 'Minimiser les coûts'),
            o('d', 'تعظيم الربح المحاسبي للسنة الحالية', 'Maximise this year’s accounting profit', 'Maximiser le bénéfice comptable de l’année en cours'), IDK] },
        { id: 'q2', type: 'quiz', short: ['القيمة الحالية', 'Present value', 'Valeur actuelle'],
          label: ['القيمة الحالية لمبلغ 1,100 يُستلم بعد سنة واحدة بمعدل خصم 10% هي:', 'The present value of 1,100 received one year from now, discounted at 10%, is:', 'La valeur actuelle de 1 100 reçus dans un an, actualisés à 10 %, est :'],
          options: [same('a', '990'), same('b', '1,000'), same('c', '1,010'), same('d', '1,210'), IDK] },
        { id: 'q3', type: 'quiz', short: ['القيمة المستقبلية', 'Future value', 'Valeur future'],
          label: ['استثمرت 1,000 بفائدة مركبة 10% سنوياً. قيمتها بعد سنتين:', 'You invest 1,000 at 10% compounded annually. Its value after two years is:', 'Vous placez 1 000 à 10 % d’intérêts composés par an. Sa valeur après deux ans est :'],
          options: [same('a', '1,100'), same('b', '1,200'), same('c', '1,210'), same('d', '1,221'), IDK] },
        { id: 'q4', type: 'quiz', short: ['المخاطرة والعائد', 'Risk and return', 'Risque et rendement'],
          label: ['الأصل الأعلى مخاطرة يطلب المستثمرون منه عادةً عائداً متوقعاً:', 'For a riskier asset, investors normally require an expected return that is:', 'Pour un actif plus risqué, les investisseurs exigent normalement un rendement attendu :'],
          options: [o('a', 'أعلى', 'Higher', 'Plus élevé'), o('b', 'أقل', 'Lower', 'Plus faible'),
            o('c', 'مساوياً لعائد الأصل الخالي من المخاطر', 'Equal to the risk-free return', 'Égal au rendement sans risque'),
            o('d', 'لا علاقة بين المخاطرة والعائد', 'Risk and return are unrelated', 'Le risque et le rendement ne sont pas liés'), IDK] },
        { id: 'q5', type: 'quiz', short: ['صافي القيمة الحالية', 'Net present value', 'Valeur actuelle nette'],
          label: ['إذا كان صافي القيمة الحالية (NPV) لمشروع مستقل موجباً، فالقرار السليم:', 'If an independent project’s net present value (NPV) is positive, the sound decision is to:', 'Si la valeur actuelle nette (VAN) d’un projet indépendant est positive, la bonne décision est :'],
          options: [o('a', 'رفض المشروع', 'Reject the project', 'De rejeter le projet'), o('b', 'قبول المشروع', 'Accept the project', 'D’accepter le projet'),
            o('c', 'الاعتماد على فترة الاسترداد فقط', 'Decide on the payback period alone', 'De décider selon le seul délai de récupération'),
            o('d', 'الانتظار حتى يصبح NPV صفراً', 'Wait until NPV equals zero', 'D’attendre que la VAN soit nulle'), IDK] },
        { id: 'q6', type: 'quiz', short: ['نسبة التداول', 'Current ratio', 'Ratio de liquidité générale'],
          label: ['نسبة التداول تُحسب بقسمة:', 'The current ratio is calculated as:', 'Le ratio de liquidité générale se calcule ainsi :'],
          options: [o('a', 'الأصول المتداولة ÷ الالتزامات المتداولة', 'Current assets ÷ current liabilities', 'Actifs courants ÷ passifs courants'),
            o('b', 'إجمالي الأصول ÷ إجمالي الالتزامات', 'Total assets ÷ total liabilities', 'Total des actifs ÷ total des passifs'),
            o('c', 'صافي الربح ÷ المبيعات', 'Net income ÷ sales', 'Résultat net ÷ chiffre d’affaires'),
            o('d', 'النقد ÷ إجمالي الأصول', 'Cash ÷ total assets', 'Trésorerie ÷ total des actifs'), IDK] },
        { id: 'q7', type: 'quiz', short: ['قائمة المركز المالي', 'Balance sheet', 'Bilan'],
          label: ['القائمة التي تُظهر المركز المالي للشركة في تاريخ محدد هي:', 'The statement that shows a firm’s financial position at a specific date is the:', 'L’état qui présente la situation financière de l’entreprise à une date donnée est :'],
          options: [o('a', 'قائمة الدخل', 'Income statement', 'Le compte de résultat'),
            o('b', 'قائمة التدفقات النقدية', 'Cash flow statement', 'Le tableau des flux de trésorerie'),
            o('c', 'الميزانية العمومية (قائمة المركز المالي)', 'Balance sheet (statement of financial position)', 'Le bilan (état de la situation financière)'),
            o('d', 'قائمة التغيرات في حقوق الملكية', 'Statement of changes in equity', 'L’état des variations des capitaux propres'), IDK] },
        { id: 'q8', type: 'quiz', short: ['تكلفة الدين بعد الضريبة', 'After-tax cost of debt', 'Coût de la dette après impôt'],
          label: ['إذا كانت تكلفة الدين قبل الضريبة Kd ومعدل الضريبة T، فتكلفة الدين بعد الضريبة:', 'If the pre-tax cost of debt is Kd and the tax rate is T, the after-tax cost of debt is:', 'Si le coût de la dette avant impôt est Kd et le taux d’imposition T, le coût de la dette après impôt est :'],
          options: [same('a', 'Kd × (1 + T)'), same('b', 'Kd ÷ T'), same('c', 'Kd × (1 − T)'), same('d', 'Kd − T'), IDK] }
      ]
    },
    {
      id: 'work',
      title: ['الخبرة العملية', 'Work experience', 'Expérience professionnelle'],
      intro: ['نريد أن نعرف علاقتك بسوق العمل وبالقرارات المالية فيه.', 'Tell us about your working life and how close it is to financial decisions.', 'Parlez-nous de votre vie professionnelle et de votre proximité avec les décisions financières.'],
      questions: [
        { id: 'emp_status', type: 'single',
          label: ['الحالة الوظيفية', 'Employment status', 'Situation professionnelle'],
          options: [o('full', 'دوام كامل', 'Full-time employee', 'Salarié à temps plein'), o('part', 'دوام جزئي', 'Part-time employee', 'Salarié à temps partiel'),
            o('own', 'عمل خاص', 'Self-employed / own business', 'Indépendant / entrepreneur'), o('none', 'لا أعمل حالياً', 'Not currently working', 'Sans emploi actuellement')] },
        { id: 'exp_years', type: 'single',
          label: ['سنوات الخبرة العملية', 'Years of work experience', 'Années d’expérience professionnelle'],
          options: [o('none', 'بلا خبرة', 'No experience', 'Aucune expérience'), o('lt2', 'أقل من سنتين', 'Less than 2 years', 'Moins de 2 ans'),
            o('2_5', 'من 2 إلى 5 سنوات', '2 to 5 years', '2 à 5 ans'), o('6_10', 'من 6 إلى 10 سنوات', '6 to 10 years', '6 à 10 ans'),
            o('gt10', 'أكثر من 10 سنوات', 'More than 10 years', 'Plus de 10 ans')] },
        { id: 'sector', type: 'single', showIf: hasWorked,
          label: ['قطاع العمل (الحالي أو الأخير)', 'Work sector (current or most recent)', 'Secteur d’activité (actuel ou le plus récent)'],
          options: [o('banking', 'بنوك وخدمات مالية', 'Banking & financial services', 'Banque et services financiers'), o('insurance', 'تأمين', 'Insurance', 'Assurance'),
            o('industry', 'صناعة', 'Manufacturing', 'Industrie'), o('retail', 'تجارة وتجزئة', 'Trade & retail', 'Commerce et distribution'),
            o('services', 'خدمات', 'Services', 'Services'), o('gov', 'قطاع حكومي', 'Government', 'Secteur public'),
            o('tech', 'اتصالات وتقنية', 'Telecom & technology', 'Télécoms et technologies'), o('health', 'صحة', 'Healthcare', 'Santé'),
            o('edu', 'تعليم', 'Education', 'Éducation'), OTHER] },
        { id: 'job', type: 'single', showIf: hasWorked,
          label: ['مجال الوظيفة (الحالية أو الأخيرة)', 'Job function (current or most recent)', 'Fonction (actuelle ou la plus récente)'],
          options: [o('accounting', 'محاسبة', 'Accounting', 'Comptabilité'), o('finance', 'تمويل', 'Finance', 'Finance'), o('audit', 'تدقيق', 'Audit', 'Audit'),
            o('treasury', 'خزينة', 'Treasury', 'Trésorerie'), o('sales', 'مبيعات', 'Sales', 'Ventes'), o('mgmt', 'إدارة', 'Management', 'Direction / gestion'),
            o('hr', 'موارد بشرية', 'Human resources', 'Ressources humaines'), o('it', 'تقنية معلومات', 'Information technology', 'Informatique'), OTHER] },
        { id: 'org_size', type: 'single', showIf: hasWorked,
          label: ['حجم المنشأة', 'Organisation size', 'Taille de l’organisation'],
          options: [o('lt10', 'أقل من 10 موظفين', 'Fewer than 10 employees', 'Moins de 10 salariés'), o('10_50', 'من 10 إلى 50 موظفاً', '10 to 50 employees', '10 à 50 salariés'),
            o('51_250', 'من 51 إلى 250 موظفاً', '51 to 250 employees', '51 à 250 salariés'), o('gt250', 'أكثر من 250 موظفاً', 'More than 250 employees', 'Plus de 250 salariés')] },
        { id: 'fin_role', type: 'single', showIf: hasWorked,
          label: ['مشاركتك في القرارات المالية في العمل', 'Your involvement in financial decisions at work', 'Votre participation aux décisions financières au travail'],
          options: [o('none', 'لا أشارك', 'I am not involved', 'Je n’y participe pas'), o('observe', 'أتابع فقط', 'I only follow them', 'Je les suis seulement'),
            o('analyse', 'أشارك في التحليل', 'I contribute to the analysis', 'Je participe à l’analyse'), o('decide', 'أتخذ القرار', 'I make the decision', 'Je prends la décision')] },
        { id: 'tasks', type: 'multi',
          label: ['المهام المالية التي نفذتها', 'Financial tasks you have carried out', 'Tâches financières que vous avez réalisées'],
          options: [Object.assign(o('none', 'لا شيء', 'None', 'Aucune'), { none: true }),
            o('budgets', 'موازنات', 'Budgeting', 'Budgets'), o('reports', 'تقارير مالية', 'Financial reporting', 'Reporting financier'),
            o('cashflow', 'تدفقات نقدية', 'Cash flow management', 'Flux de trésorerie'), o('analysis', 'تحليل مالي', 'Financial analysis', 'Analyse financière'),
            o('invest', 'تقييم استثمارات', 'Investment appraisal', 'Évaluation d’investissements'), o('credit', 'ائتمان', 'Credit', 'Crédit'),
            o('costing', 'تكاليف', 'Costing', 'Calcul des coûts'), o('tax', 'ضرائب', 'Taxation', 'Fiscalité')] },
        { id: 'certs', type: 'multi',
          label: ['الشهادات المهنية', 'Professional certificates', 'Certifications professionnelles'],
          options: [Object.assign(o('none', 'لا أحمل شهادة مهنية', 'No professional certificate', 'Aucune certification'), { none: true }),
            same('cfa', 'CFA'), same('cma', 'CMA'), same('acca', 'ACCA'), same('cpa', 'CPA'),
            o('studying', 'أدرس لإحداها حالياً', 'Currently studying for one', 'En préparation de l’une d’elles'), OTHER] }
      ]
    },
    {
      id: 'skills',
      title: ['المهارات الكمية والتقنية', 'Quantitative and technical skills', 'Compétences quantitatives et techniques'],
      intro: ['قيّم نفسك بصدق؛ التقييم يساعد في ضبط مستوى الشرح والتطبيقات.', 'Rate yourself honestly; it helps set the level of the lectures and exercises.', 'Évaluez-vous honnêtement ; cela aide à ajuster le niveau des cours et des exercices.'],
      questions: [
        { id: 's_excel', type: 'scale', short: ['Excel', 'Excel', 'Excel'],
          label: ['مستواك في Excel', 'Your Excel level', 'Votre niveau sur Excel'] },
        { id: 's_math', type: 'scale', short: ['الرياضيات والنسب', 'Mathematics and ratios', 'Mathématiques et ratios'],
          label: ['راحتك في التعامل مع الرياضيات والنسب', 'Your comfort with mathematics and ratios', 'Votre aisance avec les mathématiques et les ratios'] },
        { id: 's_statements', type: 'scale', short: ['قراءة القوائم المالية', 'Reading financial statements', 'Lecture des états financiers'],
          label: ['قدرتك على قراءة القوائم المالية', 'Your ability to read financial statements', 'Votre capacité à lire les états financiers'] },
        { id: 's_english', type: 'scale', short: ['المصطلحات المالية بالإنجليزية', 'Financial terms in English', 'Termes financiers en anglais'],
          label: ['راحتك مع المصطلحات المالية بالإنجليزية', 'Your comfort with financial terms in English', 'Votre aisance avec les termes financiers en anglais'] },
        { id: 'software', type: 'multi',
          label: ['البرامج التي استخدمتها', 'Software you have used', 'Logiciels que vous avez utilisés'],
          options: [Object.assign(o('none', 'لا شيء', 'None', 'Aucun'), { none: true }),
            same('sap', 'SAP'), same('oracle', 'Oracle'), same('quickbooks', 'QuickBooks'), same('odoo', 'Odoo'),
            same('powerbi', 'Power BI'), same('tableau', 'Tableau'), o('python_r', 'Python أو R', 'Python or R', 'Python ou R')] },
        { id: 'calc', type: 'single',
          label: ['استخدامك للآلة الحاسبة المالية', 'Your use of a financial calculator', 'Votre usage d’une calculatrice financière'],
          options: [o('no', 'لا أستخدمها', 'I don’t use one', 'Je n’en utilise pas'), o('sometimes', 'أحياناً', 'Sometimes', 'Parfois'), o('often', 'باستمرار', 'Regularly', 'Régulièrement')] }
      ]
    },
    {
      id: 'goals',
      title: ['التوقعات والأهداف', 'Expectations and goals', 'Attentes et objectifs'],
      intro: ['الخطوة الأخيرة: ماذا تريد من هذه المادة؟', 'Last step: what do you want from this course?', 'Dernière étape : qu’attendez-vous de ce cours ?'],
      questions: [
        { id: 'goals', type: 'multi',
          label: ['هدفك من المادة', 'Your goal for this course', 'Votre objectif pour ce cours'],
          options: [o('pass', 'النجاح في المادة', 'Passing the course', 'Réussir le cours'), o('promo', 'ترقية وظيفية', 'Career advancement', 'Évolution de carrière'),
            o('cert', 'شهادة مهنية', 'A professional certificate', 'Une certification professionnelle'), o('biz', 'مشروع خاص', 'Running my own business', 'Mon propre projet d’entreprise'),
            o('invest', 'استثمار شخصي', 'Personal investing', 'Investissement personnel'), o('academic', 'مسار أكاديمي', 'An academic path', 'Un parcours académique')] },
        { id: 'hours', type: 'single',
          label: ['الساعات الأسبوعية المتاحة لدراسة المادة', 'Hours per week you can give this course', 'Heures par semaine que vous pouvez consacrer à ce cours'],
          options: [o('lt2', 'أقل من ساعتين', 'Less than 2 hours', 'Moins de 2 heures'), o('2_4', 'من 2 إلى 4 ساعات', '2 to 4 hours', '2 à 4 heures'),
            o('5_8', 'من 5 إلى 8 ساعات', '5 to 8 hours', '5 à 8 heures'), o('gt8', 'أكثر من 8 ساعات', 'More than 8 hours', 'Plus de 8 heures')] },
        { id: 'expect', type: 'longtext', maxLength: 600,
          label: ['ما توقعاتك من المادة؟', 'What do you expect from this course?', 'Qu’attendez-vous de ce cours ?'] },
        { id: 'concerns', type: 'longtext', maxLength: 600,
          label: ['ما مخاوفك أو الصعوبات التي تتوقعها؟', 'What concerns or difficulties do you expect?', 'Quelles craintes ou difficultés prévoyez-vous ?'] }
      ]
    }
  ];

  var ALL = [];
  SECTIONS.forEach(function (s) { s.questions.forEach(function (q) { q.section = s.id; ALL.push(q); }); });
  function visible(q, a) { return !q.showIf || q.showIf(a); }

  /* Is this question answered well enough to count? Returns '' when valid, otherwise an error key. */
  function check(q, a) {
    var v = a[q.id];
    if (q.type === 'text' || q.type === 'longtext') {
      var s = String(v == null ? '' : v).trim();
      if (!s) return 'required';
      if (q.minWords && s.split(/\s+/).length < q.minWords) return 'fourNames';
      if (q.type === 'longtext' && s.length < 3) return 'required';
      return '';
    }
    if (q.type === 'scale') return v >= 1 && v <= 5 ? '' : 'required';
    if (q.type === 'multi') {
      if (!Array.isArray(v) || !v.length) return 'required';
      if (v.indexOf('other') >= 0 && !String(a[q.id + '_other'] || '').trim()) return 'otherRequired';
      return '';
    }
    if (!v) return 'required';
    if (v === 'other' && !String(a[q.id + '_other'] || '').trim()) return 'otherRequired';
    return '';
  }

  function optLabel(q, v, forLang) {
    if (v === 'na') return L(['لا ينطبق', 'Not applicable', 'Sans objet'], forLang);
    for (var i = 0; i < q.options.length; i++) if (q.options[i].v === v) return L(q.options[i].l, forLang);
    return v == null ? '' : String(v);
  }

  function headers(extra) {
    var h = { apikey: CFG.key, Authorization: 'Bearer ' + CFG.key, 'Content-Type': 'application/json' };
    for (var k in extra || {}) h[k] = extra[k];
    return h;
  }
  function submit(row) {
    return fetch(CFG.url + '/rest/v1/' + CFG.table, {
      method: 'POST', headers: headers({ Prefer: 'return=minimal' }), body: JSON.stringify(row)
    }).then(function (r) { if (!r.ok) throw new Error('submit ' + r.status); });
  }
  function rpc(fn, args) {
    return fetch(CFG.url + '/rest/v1/rpc/' + fn, { method: 'POST', headers: headers(), body: JSON.stringify(args) })
      .then(function (r) {
        if (r.ok) return r.status === 204 ? null : r.json().catch(function () { return null; });
        return r.json().catch(function () { return {}; }).then(function (e) {
          var err = new Error(e.message || 'rpc ' + r.status);
          err.wrongPassword = e.code === '28P01';
          throw err;
        });
      });
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  window.FGU = {
    LANGS: LANGS, LANG_NAMES: LANG_NAMES, LANG_SHORT: LANG_SHORT, SECTIONS: SECTIONS, ALL: ALL, SCALE: SCALE,
    COURSE: ['الإدارة المالية', 'Financial Management', 'Gestion financière'],
    UNI: ['جامعة فلوريدا العالمية', 'Florida Global University', 'Florida Global University'],
    L: L, setLang: setLang, getLang: function () { return lang; },
    visible: visible, check: check, optLabel: optLabel, hasWorked: hasWorked,
    submit: submit, rpc: rpc, esc: esc
  };
  setLang(lang);
})();
