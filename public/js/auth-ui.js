(function () {
  function bindPasswordToggle(toggleId, inputId, iconId) {
    var toggle = document.getElementById(toggleId);
    var input = document.getElementById(inputId);
    var icon = document.getElementById(iconId);
    if (!toggle || !input || !icon) return;
    toggle.addEventListener("click", function () {
      var isPassword = input.type === "password";
      input.type = isPassword ? "text" : "password";
      icon.classList.toggle("bi-eye", !isPassword);
      icon.classList.toggle("bi-eye-slash", isPassword);
      toggle.setAttribute(
        "aria-label",
        isPassword ? "Hide password" : "Show password",
      );
    });
  }
  function init() {
    bindPasswordToggle("toggle-password", "password", "eye-icon");
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
