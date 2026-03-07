(function () {
  function run() {
    var form = document.getElementById("login-form");
    if (!form) return;
    var emailInput = form.querySelector('input[name="email"]');
    var passwordInput = form.querySelector('input[name="password"]');
    if (emailInput) {
      emailInput.setAttribute("autocomplete", "off");
      emailInput.setAttribute("autocapitalize", "none");
      emailInput.setAttribute("spellcheck", "false");
    }
    if (passwordInput) {
      passwordInput.setAttribute("autocomplete", "new-password");
      passwordInput.setAttribute("spellcheck", "false");
    }
    if (sessionStorage.getItem("clear-login-fields") === "1") {
      if (emailInput) emailInput.value = "";
      if (passwordInput) passwordInput.value = "";
      sessionStorage.removeItem("clear-login-fields");
    }
    if (!form.dataset.clearBound) {
      form.addEventListener("submit", function () {
        sessionStorage.setItem("clear-login-fields", "1");
      });
      form.dataset.clearBound = "1";
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();

