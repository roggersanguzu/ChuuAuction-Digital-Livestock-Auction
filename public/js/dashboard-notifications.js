(function () {
  function byId(id) {
    return document.getElementById(id);
  }
  function getContext() {
    var el = byId("dashboard-stats-context");
    if (!el) return null;
    return {
      role: String(el.getAttribute("data-role") || "").toLowerCase(),
      userId: String(el.getAttribute("data-user-id") || ""),
    };
  }
  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
  function formatAgo(dateValue) {
    var ts = new Date(dateValue).getTime();
    if (Number.isNaN(ts)) return "just now";
    var diff = Math.max(0, Date.now() - ts);
    var mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return mins + " min ago";
    var hours = Math.floor(mins / 60);
    if (hours < 24) return hours + "h ago";
    var days = Math.floor(hours / 24);
    return days + "d ago";
  }
  function severityClass(severity) {
    var s = String(severity || "info").toLowerCase();
    if (s === "success") return "text-green-400 border-green-500";
    if (s === "warning") return "text-yellow-400 border-yellow-500";
    if (s === "error") return "text-red-400 border-red-500";
    return "text-orange-400 border-orange-500";
  }
  function getLocalAuctionAlerts() {
    var source = window.__auctionDueAlerts;
    if (!Array.isArray(source)) return [];
    return source
      .map(function (item) {
        return Object.assign({}, item, {
          id: String(item.id || ""),
          title: String(item.title || "Auction update"),
          body: String(item.body || ""),
          severity: item.severity || "info",
          createdAt: item.createdAt || new Date().toISOString(),
          link: item.link || "",
        });
      })
      .filter(function (item) {
        return item.id && item.title;
      });
  }
  async function fetchNotifications() {
    var response = await fetch("/api/user/notifications?limit=30", {
      credentials: "same-origin",
    });
    var payload = await response.json().catch(function () {
      return {};
    });
    if (!response.ok || payload.success === false) {
      throw new Error(payload.message || "Failed to load notifications");
    }
    return payload;
  }
  function updateBadge(el, count) {
    if (!el) return;
    var c = Math.max(0, Number(count) || 0);
    el.textContent = String(c);
    if (c <= 0) {
      el.style.opacity = "0";
      el.style.pointerEvents = "none";
    } else {
      el.style.opacity = "1";
      el.style.pointerEvents = "auto";
    }
  }
  function getViewedStorageKey(ctx) {
    return "chuu:viewed-notifications:" + (ctx.userId || "guest") + ":" + ctx.role;
  }
  function getViewedSet(ctx) {
    try {
      var raw = localStorage.getItem(getViewedStorageKey(ctx));
      var parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return new Set();
      return new Set(parsed.map(function (id) { return String(id); }));
    } catch (_error) {
      return new Set();
    }
  }
  function saveViewedSet(ctx, viewedSet) {
    try {
      localStorage.setItem(
        getViewedStorageKey(ctx),
        JSON.stringify(Array.from(viewedSet).slice(-600)),
      );
    } catch (_error) {
    }
  }
  function ensureFloatingPanel(id) {
    var panel = byId(id);
    if (panel) return panel;
    panel = document.createElement("div");
    panel.id = id;
    panel.className =
      "hidden fixed z-[120] right-4 top-20 w-[360px] max-h-[70vh] overflow-y-auto rounded-2xl border border-gray-800 bg-gray-900/95 backdrop-blur-xl shadow-2xl shadow-black/40";
    document.body.appendChild(panel);
    return panel;
  }
  function bindFloatingToggle(button, panel, onOpen) {
    if (!button || !panel || button.dataset.notifBound === "1") return;
    button.dataset.notifBound = "1";
    button.addEventListener("click", function () {
      var willOpen = panel.classList.contains("hidden");
      panel.classList.toggle("hidden");
      if (willOpen && typeof onOpen === "function") onOpen();
    });
    document.addEventListener("click", function (event) {
      if (panel.classList.contains("hidden")) return;
      if (panel.contains(event.target) || button.contains(event.target)) return;
      panel.classList.add("hidden");
    });
  }
  function buildNotificationRows(items) {
    var rows = (items || [])
      .map(function (item) {
        var cls = severityClass(item.severity);
        var linkOpen = item.link
          ? '<a href="' + escapeHtml(item.link) + '" class="block">'
          : '<div class="block">';
        var linkClose = item.link ? "</a>" : "</div>";
        return (
          linkOpen +
          '<div class="p-3.5 border-b border-gray-800/60 hover:bg-gray-800/40 transition-colors border-l-2 ' +
          cls +
          '">' +
          '<p class="text-sm font-semibold text-white">' +
          escapeHtml(item.title) +
          "</p>" +
          '<p class="text-xs text-gray-400 mt-1">' +
          escapeHtml(item.body) +
          "</p>" +
          '<p class="text-[11px] text-gray-600 mt-1">' +
          escapeHtml(formatAgo(item.createdAt)) +
          "</p>" +
          "</div>" +
          linkClose
        );
      })
      .join("");
    if (rows) return rows;
    return '<div class="p-4 text-sm text-gray-400">No new notifications</div>';
  }
  function bindAdminReadOnOpen(button, onOpen) {
    if (!button || button.dataset.notifBound === "1") return;
    button.dataset.notifBound = "1";
    button.addEventListener("click", function () {
      setTimeout(function () {
        var dropdown = byId("notif-dropdown");
        if (!dropdown || dropdown.classList.contains("open")) {
          if (typeof onOpen === "function") onOpen();
        }
      }, 0);
    });
  }
  function renderForAdmin(items, unreadCount, onOpen) {
    var badge = byId("admin-notif-count");
    var btn = byId("admin-notif-btn");
    var list = byId("admin-notif-list");
    if (!badge || !list) return;
    bindAdminReadOnOpen(btn, onOpen);
    updateBadge(badge, unreadCount);
    list.innerHTML = buildNotificationRows(items);
  }
  function renderForBuyer(items, unreadCount, onOpen) {
    var btn = byId("buyer-notif-btn");
    var badge = byId("buyer-notif-count");
    if (!btn || !badge) return;
    var panel = ensureFloatingPanel("buyer-notif-panel");
    bindFloatingToggle(btn, panel, onOpen);
    updateBadge(badge, unreadCount);
    panel.innerHTML =
      '<div class="sticky top-0 bg-gray-900/95 border-b border-gray-800 p-3.5">' +
      '<p class="text-sm font-semibold text-white">Buyer Notifications</p>' +
      "</div>" +
      buildNotificationRows(items);
  }
  function renderForFarmer(items, unreadCount, onOpen) {
    var btn = byId("farmer-notif-btn");
    var badge = byId("farmer-notif-count");
    if (!btn || !badge) return;
    var panel = ensureFloatingPanel("farmer-notif-panel");
    bindFloatingToggle(btn, panel, onOpen);
    updateBadge(badge, unreadCount);
    panel.innerHTML =
      '<div class="sticky top-0 bg-gray-900/95 border-b border-gray-800 p-3.5">' +
      '<p class="text-sm font-semibold text-white">Farmer Notifications</p>' +
      "</div>" +
      buildNotificationRows(items);
  }
  async function refresh() {
    var ctx = getContext();
    if (!ctx) return;
    try {
      var payload = await fetchNotifications();
      var apiItems = Array.isArray(payload.data) ? payload.data : [];
      var localItems = getLocalAuctionAlerts();
      var mergedMap = {};
      apiItems.concat(localItems).forEach(function (item) {
        var id = String(item.id || "");
        if (!id) return;
        mergedMap[id] = item;
      });
      var items = Object.keys(mergedMap).map(function (key) {
        return mergedMap[key];
      });
      items.sort(function (a, b) {
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });
      var viewed = getViewedSet(ctx);
      var unreadCount = items.filter(function (item) {
        return !viewed.has(String(item.id || ""));
      }).length;
      var markVisibleAsViewed = function () {
        var changed = false;
        items.forEach(function (item) {
          var id = String(item.id || "");
          if (!id || viewed.has(id)) return;
          viewed.add(id);
          changed = true;
        });
        if (changed) saveViewedSet(ctx, viewed);
        unreadCount = 0;
        if (ctx.role === "admin" || ctx.role === "administrator") {
          updateBadge(byId("admin-notif-count"), unreadCount);
        } else if (ctx.role === "buyer") {
          updateBadge(byId("buyer-notif-count"), unreadCount);
        } else if (ctx.role === "seller" || ctx.role === "farmer") {
          updateBadge(byId("farmer-notif-count"), unreadCount);
        }
      };
      if (ctx.role === "admin" || ctx.role === "administrator") {
        renderForAdmin(items, unreadCount, markVisibleAsViewed);
      } else if (ctx.role === "buyer") {
        renderForBuyer(items, unreadCount, markVisibleAsViewed);
      } else if (ctx.role === "seller" || ctx.role === "farmer") {
        renderForFarmer(items, unreadCount, markVisibleAsViewed);
      }
    } catch (error) {
      var fallbackItems = getLocalAuctionAlerts();
      if (!fallbackItems.length) return;
      var viewedFallback = getViewedSet(ctx);
      var unreadFallback = fallbackItems.filter(function (item) {
        return !viewedFallback.has(String(item.id || ""));
      }).length;
      var markFallbackViewed = function () {
        var changed = false;
        fallbackItems.forEach(function (item) {
          var id = String(item.id || "");
          if (!id || viewedFallback.has(id)) return;
          viewedFallback.add(id);
          changed = true;
        });
        if (changed) saveViewedSet(ctx, viewedFallback);
        if (ctx.role === "admin" || ctx.role === "administrator") {
          updateBadge(byId("admin-notif-count"), 0);
        } else if (ctx.role === "buyer") {
          updateBadge(byId("buyer-notif-count"), 0);
        } else if (ctx.role === "seller" || ctx.role === "farmer") {
          updateBadge(byId("farmer-notif-count"), 0);
        }
      };
      if (ctx.role === "admin" || ctx.role === "administrator") {
        renderForAdmin(fallbackItems, unreadFallback, markFallbackViewed);
      } else if (ctx.role === "buyer") {
        renderForBuyer(fallbackItems, unreadFallback, markFallbackViewed);
      } else if (ctx.role === "seller" || ctx.role === "farmer") {
        renderForFarmer(fallbackItems, unreadFallback, markFallbackViewed);
      }
    }
  }
  function init() {
    refresh();
    setInterval(refresh, 45000);
    window.addEventListener("chuu:auction-alerts-updated", refresh);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
