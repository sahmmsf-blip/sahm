// التشغيل: السمة، الهيكل، الدخول، تحميل البيانات الموحّد، ثم التوجيه
(function () {
  const { $, toast } = U;
  U.initSkin("teacher", "white");
  T.buildShell();
  async function boot() {
    $("vLogin").classList.add("hide"); $("app").classList.remove("hide");
    $("view").innerHTML = '<div class="loading"><span class="spin"></span>جارٍ تحميل المنظومة…</div>';
    try { await T.loadAll(); }
    catch (e) {
      $("view").innerHTML = T.empty("alert", "تعذّر تحميل البيانات", U.esc(e.message), '<button class="btn primary" style="margin-top:12px" onclick="location.reload()">إعادة المحاولة</button>');
      if (/JWT|session|auth/i.test(e.message)) { await T.sb.auth.signOut(); location.reload(); }
      return;
    }
    if (!location.hash) location.hash = "#dash";
    T.route();
  }
  window.addEventListener("hashchange", () => T.route());
  T.wireLogin(boot);
  T.sb.auth.getSession().then(({ data }) => { if (data.session) boot(); else $("vLogin").classList.remove("hide"); });
  // تحديث صامت للبيانات كل ٣ دقائق إن كانت الصفحة ظاهرة (مثلًا بعد تسليم الطلبة)
  setInterval(async () => {
    if (document.hidden || !T.S.ready || ["grid", "marks", "people", "settings"].includes(T.S.cur) || document.querySelector(".sheet.on")) return;
    try { await T.refreshExams(); T.fillShell(); } catch (e) {}
  }, 180000);
})();
