(function () {
  function getContext() {
    var el = document.getElementById("dashboard-stats-context");
    if (!el) return null;
    return {
      role: (el.getAttribute("data-role") || "").toLowerCase(),
    };
  }
  function formatCurrency(amount) {
    var n = Number(amount) || 0;
    return "UGX " + n.toLocaleString("en-US");
  }
  function setText(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value;
  }
  function wireCardLinks() {
    var cards = document.querySelectorAll("[data-link]");
    cards.forEach(function (card) {
      if (card.dataset.linkBound === "1") return;
      card.dataset.linkBound = "1";
      card.addEventListener("click", function (event) {
        var target = event.target;
        if (target && target.closest("a,button,input,select,textarea,label")) {
          return;
        }
        var link = card.getAttribute("data-link");
        if (!link) return;
        if (link.charAt(0) === "#" && typeof window.switchTab === "function") {
          var tab = link.replace(/^#/, "");
          window.switchTab(tab, null);
          window.location.hash = tab;
          return;
        }
        window.location.href = link;
      });
      card.setAttribute("role", "link");
      card.setAttribute("tabindex", "0");
      card.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          var link = card.getAttribute("data-link");
          if (!link) return;
          if (link.charAt(0) === "#" && typeof window.switchTab === "function") {
            var tab = link.replace(/^#/, "");
            window.switchTab(tab, null);
            window.location.hash = tab;
            return;
          }
          window.location.href = link;
        }
      });
    });
  }
  function applyFarmer(data) {
    setText("farmer-stat-sales", formatCurrency(data.totalSales || 0));
    setText("farmer-stat-listings", String(data.activeListings || 0));
    setText("farmer-stat-pending", String(data.pendingBids || 0));
    setText("farmer-stat-rate", String(data.successRate || 0) + "%");
  }
  function applyBuyer(data) {
    setText("buyer-stat-pending", String(data.pendingBids || 0));
    setText("buyer-stat-spent", formatCurrency(data.totalSpent || 0));
    setText("buyer-stat-favourites", String(data.myBids || 0));
    setText("buyer-stat-auctions", String(data.activeAuctions || 0));
    setText("buyer-success-rate", String(data.successRate || 0) + "%");
    setText("buyer-win-count", String(data.acceptedBids || 0));
    setText("buyer-loss-count", String(data.rejectedBids || 0));
    setText("buyer-pending-count", String(data.pendingBids || 0));
  }
  function applyAdmin(data) {
    setText("admin-kpi-revenue", formatCurrency(data.totalRevenue || 0));
    setText("admin-kpi-users", String(data.activeUsers || 0));
    setText("admin-kpi-auctions", String(data.activeAuctions || 0));
    setText("admin-kpi-rate", String(data.successRate || 0) + "%");
  }
  async function loadStats() {
    var ctx = getContext();
    wireCardLinks();
    if (!ctx) return;
    try {
      var response = await fetch("/api/user/dashboard-stats", {
        credentials: "same-origin",
      });
      if (!response.ok) return;
      var result = await response.json();
      if (!result || !result.success || !result.data) return;
      var data = result.data;
      if (ctx.role === "seller" || ctx.role === "farmer") {
        applyFarmer(data);
        return;
      }
      if (ctx.role === "buyer") {
        applyBuyer(data);
        return;
      }
      if (ctx.role === "administrator" || ctx.role === "admin") {
        applyAdmin(data);
      }
    } catch (error) {
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadStats);
  } else {
    loadStats();
  }
})();
