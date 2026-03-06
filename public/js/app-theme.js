(function () {
  var THEME_KEY = "chuu-theme";
  var LEGACY_THEME_KEY = "theme";
  var dynamicTimeRegistry = [];
  var dynamicCountdownRegistry = [];

  function getSavedTheme() {
    var saved =
      localStorage.getItem(THEME_KEY) || localStorage.getItem(LEGACY_THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
    return "dark";
  }

  function applyTheme(theme) {
    var isDark = theme === "dark";

    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.classList.toggle("dark", isDark);

    // Some templates embed nested <html> blocks; keep them in sync too.
    document.querySelectorAll("html").forEach(function (node) {
      node.classList.toggle("dark", isDark);
      node.setAttribute("data-theme", theme);
    });

    localStorage.setItem(THEME_KEY, theme);
    localStorage.setItem(LEGACY_THEME_KEY, theme);

    var themeIcon = document.getElementById("theme-icon");
    if (themeIcon) {
      themeIcon.className = isDark ? "bi bi-moon-stars-fill" : "bi bi-sun-fill";
    }

    document.querySelectorAll("[data-theme-label]").forEach(function (el) {
      el.textContent = isDark ? "Dark" : "Light";
    });
  }

  function toggleTheme() {
    var next =
      document.documentElement.getAttribute("data-theme") === "dark"
        ? "light"
        : "dark";
    applyTheme(next);
  }

  function ensureThemeButton() {
    if (document.getElementById("global-theme-fab")) return;

    var btn = document.createElement("button");
    btn.id = "global-theme-fab";
    btn.className = "theme-fab";
    btn.type = "button";
    btn.innerHTML =
      '<i class="bi bi-moon-stars-fill" aria-hidden="true"></i>' +
      '<span class="theme-label">Theme: <span data-theme-label>Dark</span></span>';
    btn.addEventListener("click", toggleTheme);

    document.body.appendChild(btn);
  }

  function toMs(unit, value) {
    if (unit === "d" || unit === "day" || unit === "days")
      return value * 86400000;
    if (
      unit === "h" ||
      unit === "hr" ||
      unit === "hrs" ||
      unit === "hour" ||
      unit === "hours"
    )
      return value * 3600000;
    return value * 60000;
  }

  function parseAgoToken(tokenText) {
    var m = String(tokenText || "")
      .toLowerCase()
      .match(
        /(\d+)\s*(d|day|days|h|hr|hrs|hour|hours|m|min|mins|minute|minutes)\s+ago/,
      );
    if (!m) return null;
    var value = Number(m[1]);
    if (Number.isNaN(value)) return null;
    return Date.now() - toMs(m[2], value);
  }

  function parseLeftToken(tokenText) {
    var value = String(tokenText || "")
      .toLowerCase()
      .trim();
    var hm = value.match(/(\d+)\s*h\s*(\d+)\s*m\s*left/);
    if (hm) {
      return Date.now() + Number(hm[1]) * 3600000 + Number(hm[2]) * 60000;
    }
    var m = value.match(/(\d+)\s*m\s*left/);
    if (m) {
      return Date.now() + Number(m[1]) * 60000;
    }
    var d = value.match(/(\d+)\s*d\s*(\d+)\s*h\s*left/);
    if (d) {
      return Date.now() + Number(d[1]) * 86400000 + Number(d[2]) * 3600000;
    }
    return null;
  }

  function formatAgoFrom(baseMs) {
    var diff = Math.max(0, Date.now() - baseMs);
    var mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return mins + " min ago";
    var hours = Math.floor(mins / 60);
    if (hours < 24) return hours + "h ago";
    var days = Math.floor(hours / 24);
    return days + "d ago";
  }

  function formatLeftTo(endMs) {
    var diff = endMs - Date.now();
    if (diff <= 0) return "Ended";
    var totalSeconds = Math.floor(diff / 1000);
    var days = Math.floor(totalSeconds / 86400);
    var hours = Math.floor((totalSeconds % 86400) / 3600);
    var mins = Math.floor((totalSeconds % 3600) / 60);
    var secs = totalSeconds % 60;
    if (days > 0) return days + "d " + hours + "h left";
    if (hours > 0) return hours + "h " + mins + "m left";
    return mins + "m " + secs + "s left";
  }

  function registerDynamicTimeNodes() {
    var nodes = document.querySelectorAll("p,span,div,small,time,li");
    nodes.forEach(function (el) {
      if (el.dataset.dynamicTimeBound === "1") return;
      var raw = (el.textContent || "").trim();
      if (!raw || raw.length > 90) return;

      var agoTokenMatch = raw.match(
        /(\d+\s*(?:d|day|days|h|hr|hrs|hour|hours|m|min|mins|minute|minutes)\s+ago\.?)/i,
      );
      if (agoTokenMatch) {
        var base = parseAgoToken(agoTokenMatch[1]);
        if (base) {
          el.dataset.dynamicTimeBound = "1";
          dynamicTimeRegistry.push({
            el: el,
            template: raw.replace(agoTokenMatch[1], "{{time}}"),
            baseMs: base,
          });
          return;
        }
      }

      var leftTokenMatch = raw.match(
        /(\d+\s*d\s*\d+\s*h\s*left|\d+\s*h\s*\d+\s*m\s*left|\d+\s*m\s*left)/i,
      );
      if (leftTokenMatch) {
        var endMs = parseLeftToken(leftTokenMatch[1]);
        if (endMs) {
          el.dataset.dynamicTimeBound = "1";
          dynamicCountdownRegistry.push({
            el: el,
            template: raw.replace(leftTokenMatch[1], "{{time}}"),
            endMs: endMs,
          });
          return;
        }
      }

      var endsInMatch = raw.match(/(ends in\s+\d+\s+minutes?)/i);
      if (endsInMatch) {
        var minutesMatch = endsInMatch[1].match(/(\d+)/);
        if (minutesMatch) {
          var endInMs = Date.now() + Number(minutesMatch[1]) * 60000;
          el.dataset.dynamicTimeBound = "1";
          dynamicCountdownRegistry.push({
            el: el,
            template: raw.replace(endsInMatch[1], "ends in {{time}}"),
            endMs: endInMs,
          });
        }
      }
    });
  }

  function refreshDynamicTimeNodes() {
    dynamicTimeRegistry = dynamicTimeRegistry.filter(function (item) {
      if (!item.el || !item.el.isConnected) return false;
      item.el.textContent = item.template.replace(
        "{{time}}",
        formatAgoFrom(item.baseMs),
      );
      return true;
    });

    dynamicCountdownRegistry = dynamicCountdownRegistry.filter(function (item) {
      if (!item.el || !item.el.isConnected) return false;
      var label = formatLeftTo(item.endMs);
      if (item.template.indexOf("ends in {{time}}") !== -1) {
        label = label.replace(/\s*left$/i, "");
      }
      item.el.textContent = item.template.replace("{{time}}", label);
      return true;
    });
  }

  function bindExistingThemeButtons() {
    var toggle = document.getElementById("theme-toggle");
    if (toggle && !toggle.dataset.themeBound) {
      toggle.addEventListener("click", toggleTheme);
      toggle.dataset.themeBound = "true";
    }
  }

  function bindSidebarSet(config) {
    var sidebar = document.getElementById(config.sidebarId);
    var openBtn = document.getElementById(config.openId);
    var closeBtn = document.getElementById(config.closeId);
    var overlay = document.getElementById(config.overlayId);

    if (!sidebar || !openBtn) return;

    var closeStamp = 0;

    var openFn = function () {
      if (config.bodyClass) document.body.classList.add(config.bodyClass);
      sidebar.classList.remove("-translate-x-full");
      sidebar.classList.add("translate-x-0", "open");
      if (overlay) overlay.classList.add("active", "open");
      if (config.lockBodyScroll) document.body.style.overflow = "hidden";
    };

    var closeFn = function () {
      closeStamp = Date.now();
      if (config.bodyClass) document.body.classList.remove(config.bodyClass);
      sidebar.classList.add("-translate-x-full");
      sidebar.classList.remove("translate-x-0", "open");
      if (overlay) overlay.classList.remove("active", "open");
      if (config.lockBodyScroll) document.body.style.overflow = "";
    };

    if (!openBtn.dataset.menuBound) {
      openBtn.addEventListener("click", function () {
        if (Date.now() - closeStamp < 280) return;
        var isOpen =
          sidebar.classList.contains("open") ||
          sidebar.classList.contains("translate-x-0");
        if (isOpen) {
          closeFn();
        } else {
          openFn();
        }
      });
      openBtn.dataset.menuBound = "true";
    }

    if (closeBtn && !closeBtn.dataset.menuBound) {
      closeBtn.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        closeFn();
      });
      closeBtn.dataset.menuBound = "true";
    }

    if (overlay && !overlay.dataset.menuBound) {
      overlay.addEventListener("click", function (event) {
        event.preventDefault();
        closeFn();
      });
      overlay.dataset.menuBound = "true";
    }

    sidebar.querySelectorAll("a").forEach(function (link) {
      if (!link.dataset.menuBound) {
        link.addEventListener("click", function () {
          if (window.innerWidth < 1024) closeFn();
        });
        link.dataset.menuBound = "true";
      }
    });
  }

  function bindGenericMobileMenus() {
    bindSidebarSet({
      sidebarId: "app-sidebar",
      openId: "app-mobile-open",
      closeId: "app-mobile-close",
      overlayId: "app-sidebar-overlay",
      bodyClass: "sidebar-open",
    });

    bindSidebarSet({
      sidebarId: "sidebar",
      openId: "mobile-sidebar-toggle",
      closeId: "sidebar-toggle",
      overlayId: "sidebar-overlay",
    });

    bindSidebarSet({
      sidebarId: "sidebar",
      openId: "mobileToggle",
      closeId: "sidebarClose",
      overlayId: "sidebarOverlay",
    });

    bindSidebarSet({
      sidebarId: "drw",
      openId: "ham",
      closeId: "drw-close",
      overlayId: "drw-overlay",
      lockBodyScroll: true,
    });

    var hamburger = document.getElementById("hamburger");
    var drawer = document.getElementById("drawer");
    var drawerOverlay = document.getElementById("drawer-overlay");
    var drawerClose = document.getElementById("drawer-close");

    if (hamburger && drawer) {
      var openDrawer = function () {
        drawer.classList.add("open");
        if (drawerOverlay) drawerOverlay.classList.add("open");
        hamburger.classList.add("open");
        document.body.style.overflow = "hidden";
      };

      var closeDrawer = function () {
        drawer.classList.remove("open");
        if (drawerOverlay) drawerOverlay.classList.remove("open");
        hamburger.classList.remove("open");
        document.body.style.overflow = "";
      };

      if (!hamburger.dataset.menuBound) {
        hamburger.addEventListener("click", function () {
          if (drawer.classList.contains("open")) {
            closeDrawer();
          } else {
            openDrawer();
          }
        });
        hamburger.dataset.menuBound = "true";
      }
      if (drawerClose && !drawerClose.dataset.menuBound) {
        drawerClose.addEventListener("click", closeDrawer);
        drawerClose.dataset.menuBound = "true";
      }
      if (drawerOverlay && !drawerOverlay.dataset.menuBound) {
        drawerOverlay.addEventListener("click", closeDrawer);
        drawerOverlay.dataset.menuBound = "true";
      }

      drawer.querySelectorAll("a").forEach(function (link) {
        if (!link.dataset.menuBound) {
          link.addEventListener("click", function () {
            if (window.innerWidth < 1024) closeDrawer();
          });
          link.dataset.menuBound = "true";
        }
      });
    }
  }

  function init() {
    applyTheme(getSavedTheme());
    ensureThemeButton();
    bindExistingThemeButtons();
    bindGenericMobileMenus();

    registerDynamicTimeNodes();
    refreshDynamicTimeNodes();
    setInterval(refreshDynamicTimeNodes, 1000);
    setInterval(registerDynamicTimeNodes, 15000);

    // Auto-dismiss flash messages to keep dashboard clean after login.
    setTimeout(function () {
      document
        .querySelectorAll(".flash, .flash-success, .flash-error")
        .forEach(function (el) {
          el.style.transition = "opacity 0.35s ease, transform 0.35s ease";
          el.style.opacity = "0";
          el.style.transform = "translateY(-8px)";
          setTimeout(function () {
            if (el && el.parentNode) el.parentNode.removeChild(el);
          }, 380);
        });
    }, 2800);

    // Keep footer years current automatically.
    var currentYear = new Date().getFullYear();
    document.querySelectorAll(".js-year").forEach(function (el) {
      el.textContent = String(currentYear);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
