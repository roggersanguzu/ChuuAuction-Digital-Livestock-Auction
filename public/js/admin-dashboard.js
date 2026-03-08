(function () {
  var sidebar = document.getElementById("sidebar");
  var overlay = document.getElementById("sidebar-overlay");
  var mobileMenuBtn = document.getElementById("mobile-menu-btn");
  var sidebarClose = document.getElementById("sidebar-close");
  var toastHost = document.getElementById("toast-container");
  var globalSearchInput = document.getElementById("global-search");
  var adminAuctionState = {
    all: [],
    filtered: [],
    status: "all",
    query: "",
    sortBy: "newest",
    type: "all",
    initialized: false,
  };
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
    if (name === "auctions") {
      renderAdminAuctions();
    }
  };
  function formatCurrency(amount) {
    return "UGX " + (Number(amount) || 0).toLocaleString("en-US");
  }
  function auctionStatus(item) {
    var now = Date.now();
    var endAt = item && item.endAt ? new Date(item.endAt).getTime() : null;
    var highest = Number(item && item.currentHighestBid ? item.currentHighestBid : 0);
    var starting = Number(item && item.startingPrice ? item.startingPrice : 0);
    if (endAt && endAt < now) return "completed";
    if (endAt && endAt - now > 2 * 24 * 60 * 60 * 1000 && highest <= starting) return "upcoming";
    return "live";
  }
  function sortAuctions(rows, sortBy) {
    var sorted = rows.slice();
    sorted.sort(function (a, b) {
      var aCreated = new Date(a.createdAt || 0).getTime();
      var bCreated = new Date(b.createdAt || 0).getTime();
      if (sortBy === "oldest") return aCreated - bCreated;
      if (sortBy === "highest_bid") {
        return Number(b.currentHighestBid || 0) - Number(a.currentHighestBid || 0);
      }
      if (sortBy === "ending_soon") {
        var aEnd = new Date(a.endAt || "2999-12-31").getTime();
        var bEnd = new Date(b.endAt || "2999-12-31").getTime();
        return aEnd - bEnd;
      }
      return bCreated - aCreated;
    });
    return sorted;
  }
  function updateAuctionStatusButtons() {
    var counts = { all: adminAuctionState.all.length, live: 0, upcoming: 0, completed: 0 };
    adminAuctionState.all.forEach(function (row) {
      counts[auctionStatus(row)] += 1;
    });
    document.querySelectorAll("#admin-auction-status-filters .tab-btn[data-filter]").forEach(function (btn) {
      var filter = btn.getAttribute("data-filter");
      if (!filter || !counts.hasOwnProperty(filter)) return;
      var labels = {
        all: "📋 All",
        live: "🔴 Live",
        upcoming: "⏳ Upcoming",
        completed: "✅ Completed",
      };
      btn.textContent = labels[filter] + " (" + counts[filter] + ")";
    });
  }
  function renderAuctionCards(rows) {
    var host = document.getElementById("auctions-grid");
    var label = document.getElementById("admin-auctions-count-label");
    if (!host) return;
    if (label) {
      label.textContent =
        "Showing " + rows.length + " of " + adminAuctionState.all.length + " auctions";
    }
    if (!rows.length) {
      host.innerHTML =
        '<div class="glass border border-gray-800/40 rounded-2xl p-5 text-sm text-gray-400 md:col-span-2 xl:col-span-3">No auctions match your filters.</div>';
      return;
    }
    host.innerHTML = rows
      .map(function (a) {
        var status = auctionStatus(a);
        var statusClass =
          status === "completed"
            ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
            : status === "upcoming"
              ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
              : "bg-red-500/15 text-red-300 border border-red-500/30";
        var cardBorderClass =
          status === "completed"
            ? "hover:border-emerald-500/60"
            : status === "upcoming"
              ? "hover:border-amber-500/60"
              : "hover:border-red-500/60";
        var statusLabel =
          status === "completed" ? "Completed" : status === "upcoming" ? "Upcoming" : "Live";
        var title = [a.animalType, a.breed].filter(Boolean).join(" - ") || "Auction";
        var sellerName = (a.seller && a.seller.name) || "Unknown seller";
        var endLabel = a.endAt ? new Date(a.endAt).toLocaleString("en-UG") : "No end date";
        var endTime = a.endAt ? new Date(a.endAt).getTime() : null;
        var now = Date.now();
        var remaining = "No deadline";
        if (endTime) {
          var diff = endTime - now;
          if (diff <= 0) {
            remaining = "Ended";
          } else {
            var hours = Math.floor(diff / (60 * 60 * 1000));
            var days = Math.floor(hours / 24);
            remaining = days > 0 ? days + "d left" : Math.max(hours, 1) + "h left";
          }
        }
        var bidsCount = Number(a.bidsCount || 0);
        var auctionId = a._id || a.id || "";
        var detailsHref = "/auctions/animalList" + (auctionId ? "?auctionId=" + encodeURIComponent(auctionId) : "");
        return (
          '<a href="' +
          detailsHref +
          '" class="block glass border border-gray-800/40 rounded-2xl p-4 transition-all duration-200 hover:-translate-y-0.5 ' +
          cardBorderClass +
          '">' +
          '<div class="flex items-start justify-between gap-3 mb-3">' +
          '<div><p class="text-sm font-semibold text-white">' +
          String(title) +
          '</p><p class="text-xs text-gray-500 mt-1">' +
          String(a.location || "No location") +
          " - " +
          String(sellerName) +
          '</p></div><span class="text-[11px] px-2 py-1 rounded-full font-semibold ' +
          statusClass +
          '">' +
          statusLabel +
          "</span></div>" +
          '<div class="grid grid-cols-2 gap-2 text-xs mb-3">' +
          '<div class="rounded-lg bg-gray-900/50 border border-gray-800/40 p-2"><p class="text-gray-500">Current Bid</p><p class="font-semibold text-white">' +
          formatCurrency(a.currentHighestBid || 0) +
          '</p></div><div class="rounded-lg bg-gray-900/50 border border-gray-800/40 p-2"><p class="text-gray-500">Bids</p><p class="font-semibold text-white">' +
          bidsCount +
          '</p></div><div class="rounded-lg bg-gray-900/50 border border-gray-800/40 p-2"><p class="text-gray-500">Starting</p><p class="font-semibold text-white">' +
          formatCurrency(a.startingPrice || 0) +
          '</p></div><div class="rounded-lg bg-gray-900/50 border border-gray-800/40 p-2"><p class="text-gray-500">Reserve</p><p class="font-semibold text-white">' +
          formatCurrency(a.reservePrice || 0) +
          "</p></div></div>" +
          '<div class="flex items-center justify-between text-[11px] text-gray-500">' +
          "<span>Ends: " +
          String(endLabel) +
          '</span><span class="font-semibold text-orange-300">' +
          remaining +
          '</span></div><div class="mt-3 text-xs font-semibold text-orange-300">Open Details <i class="bi bi-arrow-right-short"></i></div></a>'
        );
      })
      .join("");
  }
  function applyAuctionFilters() {
    var query = String(adminAuctionState.query || "").trim().toLowerCase();
    var rows = adminAuctionState.all.filter(function (a) {
      if (adminAuctionState.status && adminAuctionState.status !== "all" && auctionStatus(a) !== adminAuctionState.status) return false;
      if (adminAuctionState.type !== "all") {
        var t = String(a.animalType || "").toLowerCase();
        if (t.indexOf(adminAuctionState.type) === -1) return false;
      }
      if (!query) return true;
      var haystack = [
        a.animalType,
        a.breed,
        a.location,
        a.description,
        a.seller && a.seller.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.indexOf(query) >= 0;
    });
    adminAuctionState.filtered = sortAuctions(rows, adminAuctionState.sortBy);
    renderAuctionCards(adminAuctionState.filtered);
  }
  async function renderAdminAuctions() {
    var host = document.getElementById("auctions-grid");
    if (!host) return;
    if (!adminAuctionState.initialized) {
      var searchInput = document.getElementById("admin-auctions-search");
      var sortInput = document.getElementById("admin-auctions-sort");
      var typeInput = document.getElementById("admin-auctions-type");
      if (searchInput) {
        searchInput.addEventListener("input", function () {
          adminAuctionState.query = searchInput.value || "";
          applyAuctionFilters();
        });
      }
      if (sortInput) {
        sortInput.addEventListener("change", function () {
          adminAuctionState.sortBy = sortInput.value || "newest";
          applyAuctionFilters();
        });
      }
      if (typeInput) {
        typeInput.addEventListener("change", function () {
          adminAuctionState.type = typeInput.value || "all";
          applyAuctionFilters();
        });
      }
      adminAuctionState.initialized = true;
    }
    host.innerHTML =
      '<div class="glass border border-gray-800/40 rounded-2xl p-5 text-sm text-gray-400 md:col-span-2 xl:col-span-3">Loading live auctions...</div>';
    try {
      var response = await fetch("/auctions/api/all", { credentials: "same-origin" });
      var payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error((payload && payload.message) || "Failed to load auctions");
      }
      adminAuctionState.all = Array.isArray(payload.data) ? payload.data : [];
      updateAuctionStatusButtons();
      applyAuctionFilters();
    } catch (error) {
      host.innerHTML =
        '<div class="glass border border-red-500/30 rounded-2xl p-5 text-sm text-red-300 md:col-span-2 xl:col-span-3">' +
        "Unable to load auctions: " +
        String(error.message || "Unknown error") +
        "</div>";
    }
  }
  window.filterAuctions = function (kind, clickedEl) {
    adminAuctionState.status = kind;
    var buttons = document.querySelectorAll(".tab-btn[data-filter]");
    buttons.forEach(function (btn) {
      btn.classList.remove("active-tab-btn", "bg-red-500/15", "text-red-400");
      btn.classList.add("text-gray-500");
    });
    if (clickedEl) {
      clickedEl.classList.add("active-tab-btn", "bg-red-500/15", "text-red-400");
      clickedEl.classList.remove("text-gray-500");
    }
    applyAuctionFilters();
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
      if (activePanel && activePanel.id === "tab-auctions") {
        var auctionSearch = document.getElementById("admin-auctions-search");
        if (auctionSearch) {
          auctionSearch.value = query;
          auctionSearch.dispatchEvent(new Event("input", { bubbles: true }));
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
  if (window.location.hash.replace("#", "").trim() === "auctions") {
    renderAdminAuctions();
  }
})();
