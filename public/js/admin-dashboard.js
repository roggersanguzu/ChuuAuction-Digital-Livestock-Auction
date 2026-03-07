(function () {
  var sidebar = document.getElementById("sidebar");
  var overlay = document.getElementById("sidebar-overlay");
  var mobileMenuBtn = document.getElementById("mobile-menu-btn");
  var sidebarClose = document.getElementById("sidebar-close");
  var toastHost = document.getElementById("toast-container");
  var globalSearchInput = document.getElementById("global-search");
  function closeSidebar() {
    if (!sidebar || !overlay) return;
    sidebar.classList.add("-translate-x-full");
    overlay.classList.remove("active");
  }
  function openSidebar() {
    if (!sidebar || !overlay) return;
    sidebar.classList.remove("-translate-x-full");
    overlay.classList.add("active");
  }
  if (mobileMenuBtn) mobileMenuBtn.addEventListener("click", openSidebar);
  if (sidebarClose) sidebarClose.addEventListener("click", closeSidebar);
  if (overlay) overlay.addEventListener("click", closeSidebar);
  window.addEventListener("resize", function () {
    if (!sidebar || !overlay) return;
    if (window.innerWidth >= 1024) {
      sidebar.classList.remove("-translate-x-full");
      overlay.classList.remove("active");
    }
  });
  var toastId = 0;
  window.showToast = function (msg, type) {
    var kind = type || "info";
    if (!toastHost) return;
    toastId += 1;
    var iconClass = "bi bi-info-circle text-blue-400";
    if (kind === "success") iconClass = "bi bi-check-circle text-green-400";
    if (kind === "error") iconClass = "bi bi-exclamation-triangle text-red-400";
    var item = document.createElement("div");
    item.id = "toast-" + toastId;
    item.className =
      "flex items-center gap-3 px-4 py-3 rounded-xl glass border border-gray-800/50 shadow-xl shadow-black/30 max-w-sm";
    item.innerHTML =
      '<i class="' +
      iconClass +
      '"></i><p class="text-sm text-white flex-1"></p>';
    item.querySelector("p").textContent = String(msg || "Done");
    toastHost.appendChild(item);
    setTimeout(function () {
      if (item.parentNode) item.remove();
    }, 2800);
  };
  window.toggleNotifications = function () {
    var dropdown = document.getElementById("notif-dropdown");
    if (dropdown) dropdown.classList.toggle("open");
  };
  window.switchTab = function (name, clickedEl) {
    var panels = document.querySelectorAll(".tab-panel");
    panels.forEach(function (panel) {
      panel.classList.add("hidden");
    });
    var panel = document.getElementById("tab-" + name);
    if (panel) panel.classList.remove("hidden");
    var links = document.querySelectorAll(".nav-link");
    links.forEach(function (link) {
      link.classList.remove("active", "bg-gray-800/40");
    });
    if (!clickedEl) {
      clickedEl = document.querySelector(
        '.nav-link[onclick*="switchTab(\'' + name + '\'"]',
      );
    }
    if (clickedEl) clickedEl.classList.add("active", "bg-gray-800/40");
    if (name) {
      var nextHash = "#" + name;
      if (window.location.hash !== nextHash) {
        history.replaceState(null, "", nextHash);
        try {
          window.dispatchEvent(new HashChangeEvent("hashchange"));
        } catch (error) {
          window.dispatchEvent(new Event("hashchange"));
        }
      }
    }
    if (window.innerWidth < 1024) closeSidebar();
  };
  window.filterAuctions = function (kind, clickedEl) {
    var buttons = document.querySelectorAll(".tab-btn[data-filter]");
    buttons.forEach(function (btn) {
      btn.classList.remove("active-tab-btn", "bg-red-500/15", "text-red-400");
      btn.classList.add("text-gray-500");
    });
    if (clickedEl) {
      clickedEl.classList.add("active-tab-btn", "bg-red-500/15", "text-red-400");
      clickedEl.classList.remove("text-gray-500");
    }
    if (window.showToast) {
      window.showToast("Showing " + kind + " auctions", "info");
    }
  };
  function setDynamicRangeLabel() {
    var label = document.getElementById("admin-range-label");
    if (!label) return;
    var now = new Date();
    var prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    var formatter = new Intl.DateTimeFormat("en-UG", {
      month: "short",
      year: "numeric",
    });
    label.textContent = formatter.format(prev) + " - " + formatter.format(now);
  }
  function deriveInitials(name) {
    var parts = String(name || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!parts.length) return "A";
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (
      parts[0].charAt(0).toUpperCase() + "/" + parts[1].charAt(0).toUpperCase()
    );
  }
  function hydrateAdminIdentity() {
    var identity = document.getElementById("admin-identity");
    if (!identity) return;
    var name = identity.getAttribute("data-name") || "Roggers Anguzu";
    var email = identity.getAttribute("data-email") || "admin@chuuauction.co";
    var initials = deriveInitials(name);
    document.querySelectorAll(".admin-initials").forEach(function (el) {
      el.textContent = initials;
    });
    var nameEl = document.getElementById("admin-profile-name");
    if (nameEl) nameEl.textContent = name;
    var emailEl = document.getElementById("admin-profile-email");
    if (emailEl) emailEl.textContent = email;
  }
  function filterNodesInPanel(panel, query) {
    if (!panel) return 0;
    var selector = "";
    if (panel.id === "tab-moderation") selector = "#moderation-list > .glass";
    else if (panel.id === "tab-transactions") selector = "#transactions-body tr";
    else if (panel.id === "tab-auctions") selector = "#auctions-grid > div";
    else return 0;
    var nodes = panel.querySelectorAll(selector);
    var shown = 0;
    nodes.forEach(function (node) {
      var text = (node.textContent || "").toLowerCase();
      var match = !query || text.indexOf(query) >= 0;
      node.classList.toggle("hidden", !match);
      if (match) shown += 1;
    });
    return shown;
  }
  function bindGlobalSearch() {
    if (!globalSearchInput) return;
    var timer = null;
    function runSearch() {
      var query = String(globalSearchInput.value || "").trim().toLowerCase();
      var activePanel = document.querySelector(".tab-panel:not(.hidden)");
      if (activePanel && activePanel.id === "tab-users") {
        var userSearch = document.getElementById("user-search");
        if (userSearch) {
          userSearch.value = query;
          userSearch.dispatchEvent(new Event("input", { bubbles: true }));
        }
        return;
      }
      if (activePanel && activePanel.id === "tab-moderation") {
        var modSearch = document.getElementById("moderation-search");
        if (modSearch) {
          modSearch.value = query;
          modSearch.dispatchEvent(new Event("input", { bubbles: true }));
          return;
        }
      }
      filterNodesInPanel(activePanel, query);
    }
    globalSearchInput.addEventListener("input", function () {
      if (timer) clearTimeout(timer);
      timer = setTimeout(runSearch, 180);
    });
    document.addEventListener("keydown", function (event) {
      var isShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";
      if (!isShortcut) return;
      event.preventDefault();
      globalSearchInput.focus();
      globalSearchInput.select();
    });
  }
  function activateInitialTab() {
    var hash = window.location.hash.replace("#", "").trim();
    var requested = hash || "dashboard";
    var tab = document.getElementById("tab-" + requested) ? requested : "dashboard";
    var link = document.querySelector(
      '.nav-link[onclick*="switchTab(\'' + tab + '\'"]',
    );
    window.switchTab(tab, link || null);
  }
  setDynamicRangeLabel();
  hydrateAdminIdentity();
  bindGlobalSearch();
  activateInitialTab();
})();

