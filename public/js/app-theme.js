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
    var path = window.location.pathname || "";
    if (/^\/dashboard\/buyer(\/|$)/i.test(path)) return;
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
    if (!sidebar.dataset.escapeBound) {
      document.addEventListener("keydown", function (event) {
        if (event.key !== "Escape") return;
        closeFn();
      });
      sidebar.dataset.escapeBound = "true";
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
  function buildFooterLinks(role) {
    var isAdmin = role === "admin" || role === "administrator";
    var isBuyer = role === "buyer";
    var isFarmer = role === "seller" || role === "farmer";
    var productLinks = [
      { href: "/", label: "Marketplace Home" },
      { href: "/auctions/animalList", label: "Live Auctions" },
      { href: "/verification/status", label: "Verification Status" },
    ];
    var accountLinks = [
      { href: "/auth/login", label: "Sign In" },
      { href: "/auth/register", label: "Create Account" },
      { href: "/auth/terms", label: "Terms" },
      { href: "/auth/privacy", label: "Privacy Policy" },
    ];
    if (isAdmin) {
      accountLinks = [
        { href: "/dashboard/admin", label: "Admin Dashboard" },
        { href: "/dashboard/admin#analytics", label: "Analytics" },
        { href: "/dashboard/admin#users", label: "User Management" },
        { href: "/verification/ai-status", label: "AI Verification" },
      ];
    } else if (isBuyer) {
      accountLinks = [
        { href: "/dashboard/buyer", label: "Buyer Dashboard" },
        { href: "/dashboard/my-bids", label: "My Bids" },
        { href: "/auctions/animalList", label: "Browse Livestock" },
        { href: "/verification/submit", label: "Submit Documents" },
      ];
    } else if (isFarmer) {
      accountLinks = [
        { href: "/dashboard/farmer", label: "Farmer Dashboard" },
        { href: "/auctions/create", label: "Create Auction" },
        { href: "/dashboard/auction-bids", label: "Manage Auction Bids" },
        { href: "/verification/submit", label: "Submit Documents" },
      ];
    }
    return { productLinks: productLinks, accountLinks: accountLinks };
  }
  function buildFooterMarkup(role) {
    var links = buildFooterLinks(role);
    function renderLinks(items) {
      return items
        .map(function (item) {
          return '<li><a href="' + item.href + '">' + item.label + "</a></li>";
        })
        .join("");
    }
    return (
      '<footer class="app-footer" data-app-footer="1">' +
      '<div class="app-footer-inner">' +
      '<div class="app-footer-grid">' +
      '<div class="app-footer-brand">' +
      '<a href="/" class="app-footer-logo">' +
      '<span class="app-footer-logo-badge"><img src="/img/logo.png" alt="ChuuAuction Logo" /></span>' +
      '<span class="app-footer-logo-title"><span class="accent">Chuu</span>Auction</span>' +
      "</a>" +
      '<p class="app-footer-sub">Digital livestock auction infrastructure for trusted trade, transparent pricing, and verifiable records across Uganda.</p>' +
      '<div class="app-footer-socials">' +
      '<a href="https://www.facebook.com/itsanguzur" target="_blank" rel="noopener" class="app-footer-social" aria-label="Facebook"><i class="bi bi-facebook"></i></a>' +
      '<a href="https://x.com/itsranguzu" target="_blank" rel="noopener" class="app-footer-social" aria-label="X"><i class="bi bi-twitter"></i></a>' +
      '<a href="https://www.instagram.com/itsranguzu_/" target="_blank" rel="noopener" class="app-footer-social" aria-label="Instagram"><i class="bi bi-instagram"></i></a>' +
      '<a href="https://www.linkedin.com/in/roggersanguzu/" target="_blank" rel="noopener" class="app-footer-social" aria-label="LinkedIn"><i class="bi bi-linkedin"></i></a>' +
      "</div>" +
      "</div>" +
      '<div><p class="app-footer-head">Platform</p><ul class="app-footer-links">' +
      renderLinks(links.productLinks) +
      "</ul></div>" +
      '<div><p class="app-footer-head">Account</p><ul class="app-footer-links">' +
      renderLinks(links.accountLinks) +
      "</ul></div>" +
      '<div><p class="app-footer-head">Contact</p>' +
      '<ul class="app-footer-contact">' +
      '<li><i class="bi bi-envelope"></i> support@chuuauction.ug</li>' +
      '<li><i class="bi bi-telephone"></i> +256 700 000 000</li>' +
      '<li><i class="bi bi-geo-alt"></i> Kampala, Uganda</li>' +
      "</ul></div>" +
      "</div>" +
      '<div class="app-footer-bottom">' +
      '<p class="app-footer-copy">© <span class="js-year"></span> ChuuAuction. All rights reserved.</p>' +
      '<div class="app-footer-badges"><span class="app-footer-pill">Enterprise Security</span><span class="app-footer-pill">Audit Ready</span><span class="app-footer-pill">Real-Time Marketplace</span></div>' +
      "</div>" +
      "</div>" +
      "</footer>"
    );
  }
  function normalizeCrumbLabel(segment) {
    var map = {
      dashboard: "Dashboard",
      admin: "Admin Dashboard",
      buyer: "Buyer Dashboard",
      farmer: "Farmer Dashboard",
      auctions: "Auctions",
      animalList: "Listed Animals",
      bids: "Bids",
      create: "Create Auction",
      verification: "Verification",
      "ai-status": "AI Verification Status",
      status: "Verification Status",
      submit: "Submit Documents",
      list: "Verification List",
      livestock: "Livestock",
      priceCalculator: "Price Calculator",
      auth: "Auth",
      login: "Login",
      register: "Create Account",
      "my-bids": "My Bids",
      "auction-bids": "Manage Auction Bids",
      settings: "Settings",
      transactions: "Transactions",
      moderation: "Moderation",
      analytics: "Analytics",
      users: "User Management",
      terms: "Terms",
      privacy: "Privacy",
    };
    if (map[segment]) return map[segment];
    return String(segment || "")
      .replace(/[-_]+/g, " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/\b\w/g, function (m) {
        return m.toUpperCase();
      })
      .trim();
  }
  function resolveHashCrumb(hash, pathname) {
    var clean = String(hash || "").replace(/^#/, "");
    if (!clean) return "";
    var path = String(pathname || window.location.pathname || "");
    if (path.indexOf("/dashboard/admin") === 0) {
      var adminMap = {
        dashboard: "Admin Overview",
        analytics: "Admin Analytics",
        users: "User Management",
        auctions: "Auction Oversight",
        transactions: "Transaction Monitor",
        moderation: "Moderation Queue",
        system: "System Health",
        settings: "Admin Settings",
      };
      return adminMap[clean] || normalizeCrumbLabel(clean);
    }
    if (path.indexOf("/dashboard/buyer") === 0) {
      var buyerMap = {
        dashboard: "Buyer Overview",
        transactions: "Transactions",
        bids: "My Bid Activity",
        outcomes: "Bid Outcomes",
        settings: "Buyer Settings",
      };
      return buyerMap[clean] || normalizeCrumbLabel(clean);
    }
    if (path.indexOf("/dashboard/farmer") === 0) {
      var farmerMap = {
        dashboard: "Seller Overview",
        auctions: "My Auctions",
        bids: "Received Bids",
        verification: "Verification",
        settings: "Seller Settings",
      };
      return farmerMap[clean] || normalizeCrumbLabel(clean);
    }
    var map = {
      dashboard: "Overview",
      analytics: "Analytics",
      users: "User Management",
      auctions: "Auctions",
      transactions: "Transactions",
      moderation: "Moderation",
      system: "System Health",
      settings: "Settings",
    };
    return map[clean] || normalizeCrumbLabel(clean);
  }
  function isLikelyMongoId(value) {
    return /^[a-f0-9]{24}$/i.test(String(value || "").trim());
  }
  function buildDashboardItems(path) {
    if (path === "/dashboard/admin") {
      return [
        { label: "Home", href: "/" },
        { label: "Dashboard", href: "/dashboard/admin" },
        { label: "Admin Command Center", href: "", current: true },
      ];
    }
    if (path === "/dashboard/buyer") {
      return [
        { label: "Home", href: "/" },
        { label: "Dashboard", href: "/dashboard/buyer" },
        { label: "Buyer Workspace", href: "", current: true },
      ];
    }
    if (path === "/dashboard/farmer") {
      return [
        { label: "Home", href: "/" },
        { label: "Dashboard", href: "/dashboard/farmer" },
        { label: "Seller Workspace", href: "", current: true },
      ];
    }
    if (path === "/dashboard/my-bids") {
      return [
        { label: "Home", href: "/" },
        { label: "Dashboard", href: "/dashboard/buyer" },
        { label: "My Bids", href: "", current: true },
      ];
    }
    if (path === "/dashboard/auction-bids") {
      return [
        { label: "Home", href: "/" },
        { label: "Dashboard", href: "/dashboard/farmer" },
        { label: "Manage Auction Bids", href: "", current: true },
      ];
    }
    if (path.indexOf("/dashboard/auction-bids/") === 0) {
      var parts = path.split("/").filter(Boolean);
      var last = parts[parts.length - 1];
      var auctionLabel = isLikelyMongoId(last)
        ? "Auction " + last.slice(-6).toUpperCase()
        : normalizeCrumbLabel(last);
      return [
        { label: "Home", href: "/" },
        { label: "Dashboard", href: "/dashboard/farmer" },
        { label: "Manage Auction Bids", href: "/dashboard/auction-bids" },
        { label: auctionLabel, href: "", current: true },
      ];
    }
    return null;
  }
  function buildBreadcrumbItems() {
    var path = window.location.pathname || "/";
    var dashboardItems = buildDashboardItems(path);
    if (dashboardItems) {
      var dashboardHashLabel = resolveHashCrumb(window.location.hash, path);
      if (dashboardHashLabel) {
        dashboardItems[dashboardItems.length - 1].current = false;
        dashboardItems[dashboardItems.length - 1].href = path;
        dashboardItems.push({
          label: dashboardHashLabel,
          href: "",
          current: true,
        });
      }
      return dashboardItems;
    }
    var segments = path.split("/").filter(Boolean);
    var items = [{ label: "Home", href: "/" }];
    if (!segments.length) {
      items.push({ label: "Landing", href: "", current: true });
      return items;
    }
    var cumulative = "";
    segments.forEach(function (seg, index) {
      cumulative += "/" + seg;
      var isLast = index === segments.length - 1;
      items.push({
        label: normalizeCrumbLabel(seg),
        href: isLast ? "" : cumulative,
        current: isLast,
      });
    });
    var hashLabel = resolveHashCrumb(window.location.hash, path);
    if (hashLabel) {
      items[items.length - 1].current = false;
      items[items.length - 1].href = path;
      items.push({
        label: hashLabel,
        href: "",
        current: true,
      });
    }
    return items;
  }
  function renderBreadcrumbs(host) {
    if (!host) return;
    var items = buildBreadcrumbItems();
    var html = items
      .map(function (item, idx) {
        var sep = idx > 0 ? '<span class="app-crumb-sep"><i class="bi bi-chevron-right"></i></span>' : "";
        if (item.current) {
          return sep + '<span class="app-crumb-current">' + item.label + "</span>";
        }
        return (
          sep +
          '<a class="app-crumb-link" href="' +
          item.href +
          '">' +
          item.label +
          "</a>"
        );
      })
      .join("");
    host.innerHTML = '<nav class="app-breadcrumbs" aria-label="Breadcrumb">' + html + "</nav>";
  }
  function ensureBreadcrumbs() {
    var path = window.location.pathname || "";
    if (/^\/auth\/(login|register)$/i.test(path)) return;
    if (/^\/dashboard\/buyer(\/|$)/i.test(path)) return;
    var existing = document.querySelector("[data-app-breadcrumbs]");
    var host = existing;
    if (!host) {
      var anchor =
        document.querySelector("main") ||
        document.querySelector(".main") ||
        document.querySelector(".wrapper") ||
        document.body;
      if (!anchor) return;
      host = document.createElement("div");
      host.className = "app-breadcrumbs-wrap";
      host.setAttribute("data-app-breadcrumbs", "1");
      var insertBefore = null;
      if (anchor.children && anchor.children.length) {
        for (var i = 0; i < anchor.children.length; i += 1) {
          var child = anchor.children[i];
          var className = String(child.className || "");
          var isDecorative =
            /\bfixed\b/.test(className) ||
            /\babsolute\b/.test(className) ||
            /\bpointer-events-none\b/.test(className) ||
            child.getAttribute("aria-hidden") === "true";
          if (!isDecorative) {
            insertBefore = child;
            break;
          }
        }
      }
      if (insertBefore) {
        anchor.insertBefore(host, insertBefore);
      } else {
        anchor.appendChild(host);
      }
    }
    renderBreadcrumbs(host);
  }
  function ensureGlobalFooter() {
    var path = window.location.pathname || "";
    if (/^\/auth\/(login|register)$/i.test(path)) return;
    if (/^\/verification(\/|$)/i.test(path)) return;
    if (document.querySelector("[data-app-footer]")) return;
    if (document.querySelector("footer")) return;
    var ctx = document.getElementById("dashboard-stats-context");
    var role = ctx ? String(ctx.getAttribute("data-role") || "").toLowerCase() : "";
    var host = document.body;
    if (!host) return;
    var wrap = document.createElement("div");
    wrap.innerHTML = buildFooterMarkup(role);
    var footer = wrap.firstChild;
    if (!footer) return;
    host.appendChild(footer);
  }
  function init() {
    document.body.style.overflow = "";
    applyTheme(getSavedTheme());
    ensureThemeButton();
    bindExistingThemeButtons();
    bindGenericMobileMenus();
    ensureBreadcrumbs();
    ensureGlobalFooter();
    registerDynamicTimeNodes();
    refreshDynamicTimeNodes();
    setInterval(refreshDynamicTimeNodes, 1000);
    setInterval(registerDynamicTimeNodes, 15000);
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
    var currentYear = new Date().getFullYear();
    document.querySelectorAll(".js-year").forEach(function (el) {
      el.textContent = String(currentYear);
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth >= 1024) {
        document.body.style.overflow = "";
      }
    });
    window.addEventListener("hashchange", ensureBreadcrumbs);
    window.addEventListener("popstate", ensureBreadcrumbs);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

