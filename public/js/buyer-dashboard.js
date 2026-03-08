(function () {
  function byId(id) {
    return document.getElementById(id);
  }
  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
  function formatCurrency(amount) {
    return "UGX " + (Number(amount) || 0).toLocaleString("en-US");
  }
  function timeLeftLabel(endAt) {
    if (!endAt) return "No deadline";
    var end = new Date(endAt);
    if (Number.isNaN(end.getTime())) return "No deadline";
    var diff = end.getTime() - Date.now();
    if (diff <= 0) return "Ended";
    var totalMinutes = Math.floor(diff / 60000);
    var days = Math.floor(totalMinutes / 1440);
    var hours = Math.floor((totalMinutes % 1440) / 60);
    if (days > 0) return days + "d left";
    if (hours > 0) return hours + "h left";
    return Math.max(totalMinutes, 1) + "m left";
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
  function dueInfo(endAt) {
    if (!endAt) {
      return {
        key: "not_due",
        label: "Not Due",
        className: "bg-sky-500/15 text-sky-300 border border-sky-500/30",
        isDue: false,
      };
    }
    var end = new Date(endAt).getTime();
    if (Number.isNaN(end)) {
      return {
        key: "not_due",
        label: "Not Due",
        className: "bg-sky-500/15 text-sky-300 border border-sky-500/30",
        isDue: false,
      };
    }
    var diff = end - Date.now();
    if (diff <= 0) {
      return {
        key: "due",
        label: "Due",
        className: "bg-red-500/15 text-red-300 border border-red-500/30",
        isDue: true,
      };
    }
    if (diff <= 24 * 60 * 60 * 1000) {
      return {
        key: "due_soon",
        label: "Due Soon",
        className: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
        isDue: true,
      };
    }
    return {
      key: "not_due",
      label: "Not Due",
      className: "bg-sky-500/15 text-sky-300 border border-sky-500/30",
      isDue: false,
    };
  }
  function cardClasses(status) {
    if (status === "completed") {
      return {
        badge: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
        hover: "hover:border-emerald-500/60",
      };
    }
    if (status === "upcoming") {
      return {
        badge: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
        hover: "hover:border-amber-500/60",
      };
    }
    return {
      badge: "bg-red-500/15 text-red-300 border border-red-500/30",
      hover: "hover:border-red-500/60",
    };
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
  async function fetchAuctions() {
    var response = await fetch("/auctions/api/all", { credentials: "same-origin" });
    var payload = await response.json().catch(function () {
      return {};
    });
    if (!response.ok || !payload || payload.success === false) {
      throw new Error((payload && payload.message) || "Failed to load auctions");
    }
    return Array.isArray(payload.data) ? payload.data : [];
  }
  function renderCards(host, rows) {
    if (!rows.length) {
      host.innerHTML =
        '<div class="glass border border-gray-800/40 rounded-2xl p-5 text-sm text-gray-400 md:col-span-2 xl:col-span-3">No auctions match your filters.</div>';
      return;
    }
    host.innerHTML = rows
      .map(function (a) {
        var status = auctionStatus(a);
        var due = dueInfo(a.endAt);
        var classes = cardClasses(status);
        var statusLabel =
          status === "completed" ? "Completed" : status === "upcoming" ? "Upcoming" : "Live";
        var title = [a.animalType, a.breed].filter(Boolean).join(" - ") || "Auction";
        var sellerName = (a.seller && a.seller.name) || "Unknown seller";
        var endLabel = a.endAt ? new Date(a.endAt).toLocaleString("en-UG") : "No end date";
        var bidsCount = Number(a.bidsCount || 0);
        var photo = Array.isArray(a.photos) && a.photos.length ? a.photos[0] : "";
        var auctionId = a._id || a.id || "";
        var destination = "/auctions/animalList" + (auctionId ? "?auctionId=" + encodeURIComponent(auctionId) : "");
        return (
          '<a href="' +
          destination +
          '" class="block glass border border-gray-800/40 rounded-2xl p-4 transition-all duration-200 hover:-translate-y-0.5 ' +
          classes.hover +
          '">' +
          (photo
            ? '<div class="mb-3 rounded-xl overflow-hidden border border-gray-800/40"><img src="' +
              escapeHtml(photo) +
              '" alt="' +
              escapeHtml(title) +
              '" class="w-full h-36 object-cover" /></div>'
            : "") +
          '<div class="flex items-start justify-between gap-3 mb-3">' +
          '<div><p class="text-sm font-semibold text-white">' +
          escapeHtml(title) +
          '</p><p class="text-xs text-gray-500 mt-1">' +
          escapeHtml(a.location || "No location") +
          " - " +
          escapeHtml(sellerName) +
          '</p></div><div class="flex flex-wrap justify-end gap-1.5"><span class="text-[11px] px-2 py-1 rounded-full font-semibold ' +
          classes.badge +
          '">' +
          statusLabel +
          '</span><span class="text-[11px] px-2 py-1 rounded-full font-semibold ' +
          due.className +
          '">' +
          due.label +
          "</span></div></div>" +
          '<div class="grid grid-cols-2 gap-2 text-xs mb-3">' +
          '<div class="rounded-lg bg-gray-900/50 border border-gray-800/40 p-2"><p class="text-gray-500">Current Bid</p><p class="font-semibold text-white">' +
          formatCurrency(a.currentHighestBid || 0) +
          '</p></div><div class="rounded-lg bg-gray-900/50 border border-gray-800/40 p-2"><p class="text-gray-500">Bids</p><p class="font-semibold text-white">' +
          bidsCount +
          '</p></div><div class="rounded-lg bg-gray-900/50 border border-gray-800/40 p-2"><p class="text-gray-500">Starting</p><p class="font-semibold text-white">' +
          formatCurrency(a.startingPrice || a.expectedPrice || 0) +
          '</p></div><div class="rounded-lg bg-gray-900/50 border border-gray-800/40 p-2"><p class="text-gray-500">Reserve</p><p class="font-semibold text-white">' +
          formatCurrency(a.reservePrice || 0) +
          "</p></div></div>" +
          '<div class="flex items-center justify-between text-[11px] text-gray-500">' +
          "<span>Ends: " +
          escapeHtml(endLabel) +
          '</span><span class="font-semibold text-orange-300">' +
          escapeHtml(timeLeftLabel(a.endAt)) +
          '</span></div><div class="mt-3 text-xs font-semibold ' +
          (due.key === "due" ? "text-red-300" : due.key === "due_soon" ? "text-amber-300" : "text-orange-300") +
          '">' +
          (due.key === "due"
            ? "Due - Closed"
            : due.key === "due_soon"
              ? "Due Soon - Bid Now"
              : "Still On - Place Bid") +
          ' <i class="bi bi-arrow-right-short"></i></div></a>'
        );
      })
      .join("");
  }
  function publishAuctionAlerts(prefix, rows) {
    var alerts = rows
      .map(function (a) {
        var due = dueInfo(a.endAt);
        if (due.key !== "due" && due.key !== "due_soon") return null;
        var id = String(a._id || a.id || "");
        if (!id) return null;
        var title = due.key === "due" ? "Auction due now" : "Auction due soon";
        var body =
          ([a.animalType, a.breed].filter(Boolean).join(" - ") || "An auction") +
          (due.key === "due"
            ? " is now due. Avoid placing new bids."
            : " is nearing due time. Place bids now.");
        return {
          id: "local-auction-" + id + "-" + due.key,
          title: title,
          body: body,
          severity: due.key === "due" ? "warning" : "info",
          createdAt: a.endAt || new Date().toISOString(),
          link: "/auctions/animalList?auctionId=" + encodeURIComponent(id),
        };
      })
      .filter(Boolean);
    if (!window.__auctionDueAlertsByScope) window.__auctionDueAlertsByScope = {};
    window.__auctionDueAlertsByScope[prefix] = alerts;
    var merged = [];
    Object.keys(window.__auctionDueAlertsByScope).forEach(function (scope) {
      var list = window.__auctionDueAlertsByScope[scope];
      if (Array.isArray(list)) merged = merged.concat(list);
    });
    window.__auctionDueAlerts = merged;
    window.dispatchEvent(new CustomEvent("chuu:auction-alerts-updated"));
  }
  function initAuctionExplorer(prefix, hostId) {
    var host = byId(hostId);
    if (!host) return;
    var searchInput = byId(prefix + "-auction-search");
    var sortInput = byId(prefix + "-auction-sort");
    var typeInput = byId(prefix + "-auction-type");
    var statusFilters = byId(prefix + "-auction-status-filters");
    var countLabel = byId(prefix + "-auctions-count-label");
    var state = { all: [], status: "all", query: "", sortBy: "newest", type: "all" };
    function updateStatusButtons() {
      if (!statusFilters) return;
      var counts = { all: state.all.length, live: 0, upcoming: 0, completed: 0 };
      state.all.forEach(function (row) {
        counts[auctionStatus(row)] += 1;
      });
      var labels = { all: "All", live: "Live", upcoming: "Upcoming", completed: "Completed" };
      statusFilters.querySelectorAll("[data-filter]").forEach(function (btn) {
        var kind = btn.getAttribute("data-filter");
        if (!kind || !counts.hasOwnProperty(kind)) return;
        btn.textContent = labels[kind] + " (" + counts[kind] + ")";
        var active = kind === state.status;
        btn.classList.toggle("active", active);
        btn.classList.toggle("bg-red-500/15", active);
        btn.classList.toggle("text-red-400", active);
        btn.classList.toggle("text-gray-500", !active);
      });
    }
    function apply() {
      var query = String(state.query || "").trim().toLowerCase();
      var rows = state.all.filter(function (a) {
        if (state.status !== "all" && auctionStatus(a) !== state.status) return false;
        if (state.type !== "all") {
          var t = String(a.animalType || "").toLowerCase();
          if (t.indexOf(state.type) === -1) return false;
        }
        if (!query) return true;
        var haystack = [a.animalType, a.breed, a.location, a.description, a.seller && a.seller.name]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.indexOf(query) >= 0;
      });
      rows = sortAuctions(rows, state.sortBy);
      if (countLabel) countLabel.textContent = "Showing " + rows.length + " of " + state.all.length + " auctions";
      renderCards(host, rows);
    }
    if (searchInput) {
      searchInput.addEventListener("input", function () {
        state.query = searchInput.value || "";
        apply();
      });
    }
    if (sortInput) {
      sortInput.addEventListener("change", function () {
        state.sortBy = sortInput.value || "newest";
        apply();
      });
    }
    if (typeInput) {
      typeInput.addEventListener("change", function () {
        state.type = typeInput.value || "all";
        apply();
      });
    }
    if (statusFilters) {
      statusFilters.addEventListener("click", function (event) {
        var btn = event.target.closest("[data-filter]");
        if (!btn) return;
        state.status = btn.getAttribute("data-filter") || "all";
        updateStatusButtons();
        apply();
      });
    }
    host.innerHTML =
      '<div class="glass border border-gray-800/40 rounded-2xl p-5 text-sm text-gray-400 md:col-span-2 xl:col-span-3">Loading auctions...</div>';
    fetchAuctions()
      .then(function (rows) {
        state.all = rows;
        publishAuctionAlerts(prefix, rows);
        updateStatusButtons();
        apply();
      })
      .catch(function (error) {
        host.innerHTML =
          '<div class="glass border border-red-500/30 rounded-2xl p-5 text-sm text-red-300 md:col-span-2 xl:col-span-3">Unable to load auctions: ' +
          escapeHtml(error.message || "Unknown error") +
          "</div>";
      });
  }
  function init() {
    initAuctionExplorer("buyer", "buyer-live-auctions");
    initAuctionExplorer("farmer", "farmer-live-auctions");
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
