document.addEventListener("DOMContentLoaded", function () {
  // Theme Toggle
  var themeToggle = document.getElementById("theme-toggle");
  var html = document.documentElement;
  var currentTheme = localStorage.getItem("chuu-theme") || localStorage.getItem("theme") || "dark";
  if (currentTheme === "dark") {
    html.classList.add("dark");
  }
  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      html.classList.toggle("dark");
      var nextTheme = html.classList.contains("dark") ? "dark" : "light";
      localStorage.setItem("theme", nextTheme);
      localStorage.setItem("chuu-theme", nextTheme);
    });
  }

  // Password Visibility Toggle
  var togglePassword = document.getElementById("toggle-password");
  var passwordInput = document.getElementById("password");
  var eyeIcon = document.getElementById("eye-icon");
  if (togglePassword && passwordInput && eyeIcon) {
    togglePassword.addEventListener("click", function () {
      var type =
        passwordInput.getAttribute("type") === "password" ? "text" : "password";
      passwordInput.setAttribute("type", type);
      eyeIcon.classList.toggle("bi-eye");
      eyeIcon.classList.toggle("bi-eye-slash");
    });
  }

  // Password Strength Bars
  var bars = [
    document.getElementById("bar1"),
    document.getElementById("bar2"),
    document.getElementById("bar3"),
    document.getElementById("bar4"),
  ];
  var strengthText = document.getElementById("password-strength-text");
  var BAR_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e"];

  function resetBars() {
    bars.forEach(function (bar) {
      if (bar) {
        bar.style.background = "";
        bar.style.opacity = "0.2";
      }
    });
  }

  function calculateStrength(password) {
    if (!password) {
      return 0;
    }

    var score = 0;
    var hasLower = /[a-z]/.test(password);
    var hasUpper = /[A-Z]/.test(password);
    var hasNumber = /[0-9]/.test(password);
    var hasSymbol = /[^a-zA-Z0-9]/.test(password);

    if (password.length >= 8) {
      score++;
    }
    if (hasLower && hasUpper) {
      score++;
    }
    if (hasNumber) {
      score++;
    }
    if (hasSymbol) {
      score++;
    }

    var isCommonWeak = /^(password|123456|qwerty|admin|letmein|welcome|passw0rd)$/i.test(password);
    var hasRepeating = /(.)\1{2,}/.test(password);

    if (password.length < 8) {
      score = Math.min(score, 1);
    }
    if (isCommonWeak) {
      score = 1;
    }
    if (hasRepeating && score > 1) {
      score--;
    }

    return Math.max(0, Math.min(score, 4));
  }

  if (passwordInput) {
    passwordInput.addEventListener("input", function () {
      var password = this.value;
      var strength = calculateStrength(password);

      resetBars();
      if (strengthText) {
        strengthText.textContent = "";
        strengthText.style.color = "";
      }
      if (password.length === 0) {
        return;
      }

      for (var i = 0; i < strength; i++) {
        if (bars[i]) {
          bars[i].style.background = BAR_COLORS[i];
          bars[i].style.opacity = "1";
        }
      }

      var labels = ["", "Very Weak", "Weak", "Medium", "Strong"];
      if (strengthText && strength > 0) {
        strengthText.textContent = labels[strength];
        strengthText.style.color = BAR_COLORS[strength - 1];
      }
    });
  }

  // Password Match Validation
  var confirmPassword = document.getElementById("confirmPassword");
  if (confirmPassword && passwordInput) {
    confirmPassword.addEventListener("input", function () {
      if (this.value !== passwordInput.value) {
        this.setCustomValidity("Passwords do not match");
        this.classList.add("border-red-500");
        this.classList.remove("border-gray-300");
      } else {
        this.setCustomValidity("");
        this.classList.remove("border-red-500");
        this.classList.add("border-gray-300");
      }
    });
  }

  // Form Submission
  var form = document.getElementById("create-account-form");
  var submitBtn = form ? form.querySelector('button[type="submit"]') : null;
  if (form) {
    form.addEventListener("submit", function (e) {
      var roleValue = form.querySelector('[name="role"]').value.trim();
      var termsChecked = form.querySelector('[name="terms"]').checked;
      var pwd = passwordInput ? passwordInput.value : "";
      var confirmPwd = confirmPassword ? confirmPassword.value : "";

      if (!roleValue) {
        alert("Please select a role");
        e.preventDefault();
        return;
      }
      if (!termsChecked) {
        alert("Please agree to the Terms & Conditions");
        e.preventDefault();
        return;
      }
      if (pwd !== confirmPwd) {
        alert("Passwords do not match");
        e.preventDefault();
        return;
      }

      if (submitBtn) {
        var originalHTML = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML =
          '<i class="bi bi-hourglass-split animate-spin"></i> Creating Account...';
        setTimeout(function () {
          if (submitBtn.disabled) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalHTML;
          }
        }, 10000);
      }
    });
  }

  console.log("ChuuAuction Registration System Loaded");
});
