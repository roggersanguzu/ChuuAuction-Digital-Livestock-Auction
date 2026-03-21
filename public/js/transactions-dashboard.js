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

  function formatAmount(amount, currency) {
    return String(currency || "KES") + " " + (Number(amount) || 0).toLocaleString("en-US");
  }

  function formatDateTime(value) {
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return "N/A";
    return date.toLocaleString("en-UG", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function readContext() {
    var node = byId("transactions-context");
    return {
      isAdmin: !!(node && node.getAttribute("data-is-admin") === "true"),
    };
  }

  var context = readContext();
  var state = {
    all: [],
    filtered: [],
    summaryFilter: "all",
  };

  function getVisibleCurrencies(rows) {
    var map = {};
    rows.forEach(function (row) {
      var code = String(row.currency || "KES").trim().toUpperCase();
      if (!code) return;
      map[code] = true;
    });
    return Object.keys(map);
  }

  function renderSummary(summary, rows) {
    var currencies = getVisibleCurrencies(rows);
    var totalCurrency = currencies.length === 1 ? currencies[0] : "Mixed";
    var totalVolume = Number(summary && summary.totalVolume ? summary.totalVolume : 0);

    if (byId("summary-total")) byId("summary-total").textContent = String(summary.totalTransactions || rows.length || 0);
    if (byId("summary-complete")) byId("summary-complete").textContent = String(summary.completedTransactions || 0);
    if (byId("summary-failed")) byId("summary-failed").textContent = String(summary.failedTransactions || 0);

    if (byId("summary-volume")) {
      byId("summary-volume").textContent =
        totalCurrency === "Mixed"
          ? totalVolume.toLocaleString("en-US")
          : formatAmount(totalVolume, totalCurrency);
    }
    if (byId("summary-volume-note")) {
      byId("summary-volume-note").textContent =
        totalCurrency === "Mixed" ? "Visible records include multiple currencies" : "Across visible transactions";
    }
  }

  function syncSummaryCards() {
    document.querySelectorAll("[data-summary-filter]").forEach(function (card) {
      var filter = String(card.getAttribute("data-summary-filter") || "all").toLowerCase();
      card.classList.toggle("is-active", filter === state.summaryFilter);
    });
  }

  function rowMatchesQuery(row, query) {
    if (!query) return true;
    var haystack = [
      row.itemLabel,
      row.buyerName,
      row.buyerEmail,
      row.sellerName,
      row.sellerEmail,
      row.status,
      row.apiRef,
      row.invoiceId,
      row.failedReason,
      row.provider,
      row.paymentProvider,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.indexOf(query) >= 0;
  }

  function buildPartiesCell(row) {
    if (context.isAdmin) {
      return (
        '<div class="cell-title">' +
        escapeHtml(row.buyerName || "Buyer") +
        '</div><div class="cell-meta">Buyer: ' +
        escapeHtml(row.buyerEmail || "No email") +
        '<br>Seller: ' +
        escapeHtml(row.sellerName || "Seller") +
        "</div>"
      );
    }

    return (
      '<div class="cell-title">' +
      escapeHtml(row.buyerName || "Buyer") +
      " -> " +
      escapeHtml(row.sellerName || "Seller") +
      '</div><div class="cell-meta">' +
      escapeHtml(row.buyerEmail || row.sellerEmail || "No email on file") +
      "</div>"
    );
  }

  function renderRows(rows) {
    var body = byId("transactions-table-body");
    if (!body) return;

    if (!rows.length) {
      body.innerHTML =
        '<tr><td colspan="6" class="empty-state">No transactions match the current filter.</td></tr>';
      return;
    }

    body.innerHTML = rows
      .map(function (row) {
        var status = String(row.status || "pending").toLowerCase();
        var refLine = row.invoiceId
          ? "API Ref: " + escapeHtml(row.apiRef || "-") + "<br>Invoice: " + escapeHtml(row.invoiceId)
          : "API Ref: " + escapeHtml(row.apiRef || "-");

        return (
          "<tr>" +
          '<td data-label="Transaction"><div class="cell-title">' +
          escapeHtml(row.id) +
          '</div><div class="cell-meta">' +
          refLine +
          "</div></td>" +
          '<td data-label="Parties">' +
          buildPartiesCell(row) +
          "</td>" +
          '<td data-label="Item"><div class="cell-title">' +
          escapeHtml(row.itemLabel || "Livestock") +
          '</div><div class="cell-meta">' +
          escapeHtml(row.provider || "IntaSend") +
          (row.failedReason ? "<br>Reason: " + escapeHtml(row.failedReason) : "") +
          "</div></td>" +
          '<td data-label="Amount"><div class="cell-title">' +
          escapeHtml(formatAmount(row.amount, row.currency)) +
          '</div><div class="cell-meta">' +
          escapeHtml(row.paymentProvider || row.provider || "Provider not yet recorded") +
          "</div></td>" +
          '<td data-label="Status"><span class="status-pill ' +
          escapeHtml(status) +
          '">' +
          escapeHtml(status) +
          "</span></td>" +
          '<td data-label="Updated"><div class="cell-title">' +
          escapeHtml(formatDateTime(row.updatedAt || row.createdAt)) +
          '</div><div class="cell-meta">Created: ' +
          escapeHtml(formatDateTime(row.createdAt)) +
          "</div></td>" +
          "</tr>"
        );
      })
      .join("");
  }

  function applyFilters() {
    var query = String((byId("transactions-search") && byId("transactions-search").value) || "").trim().toLowerCase();
    var status = String((byId("transactions-status") && byId("transactions-status").value) || "all").trim().toLowerCase();

    state.filtered = state.all.filter(function (row) {
      var rowStatus = String(row.status || "").toLowerCase();
      var effectiveStatus = status;
      if (state.summaryFilter !== "all") {
        effectiveStatus = state.summaryFilter === "failed_group" ? "failed_group" : state.summaryFilter;
      }
      if (effectiveStatus === "failed_group") {
        if (rowStatus !== "failed" && rowStatus !== "cancelled") return false;
      } else if (effectiveStatus !== "all" && rowStatus !== effectiveStatus) {
        return false;
      }
      return rowMatchesQuery(row, query);
    });

    renderRows(state.filtered);
    syncSummaryCards();
    renderSummary(
      {
        totalTransactions: state.filtered.length,
        totalVolume: state.filtered.reduce(function (sum, row) {
          return sum + Number(row.amount || 0);
        }, 0),
        completedTransactions: state.filtered.filter(function (row) {
          return String(row.status).toLowerCase() === "complete";
        }).length,
        failedTransactions: state.filtered.filter(function (row) {
          var value = String(row.status).toLowerCase();
          return value === "failed" || value === "cancelled";
        }).length,
      },
      state.filtered,
    );
  }

  async function fetchTransactions() {
    var endpoint = context.isAdmin ? "/api/payments/admin/all" : "/api/payments/mine";
    var response = await fetch(endpoint, { credentials: "same-origin" });
    var payload = await response.json().catch(function () {
      return {};
    });
    if (!response.ok || !payload.success) {
      throw new Error(payload.message || "Unable to load transactions");
    }
    return payload;
  }

  function bindEvents() {
    var search = byId("transactions-search");
    var status = byId("transactions-status");
    if (search) search.addEventListener("input", applyFilters);
    if (status) {
      status.addEventListener("change", function () {
        state.summaryFilter = String(status.value || "all").toLowerCase();
        if (state.summaryFilter === "failed" || state.summaryFilter === "cancelled") {
          state.summaryFilter = state.summaryFilter;
        }
        applyFilters();
      });
    }
    document.querySelectorAll("[data-summary-filter]").forEach(function (card) {
      var activate = function () {
        var filter = String(card.getAttribute("data-summary-filter") || "all").toLowerCase();
        state.summaryFilter = filter === "failed" ? "failed_group" : filter;
        if (status) {
          status.value =
            state.summaryFilter === "failed_group" ? "all" : state.summaryFilter;
        }
        applyFilters();
      };
      card.addEventListener("click", activate);
      card.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          activate();
        }
      });
    });
  }

  async function init() {
    bindEvents();
    try {
      var payload = await fetchTransactions();
      state.all = Array.isArray(payload.data) ? payload.data : [];
      state.all.sort(function (a, b) {
        return new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime();
      });
      renderSummary(payload.summary || {}, state.all);
      applyFilters();
    } catch (error) {
      var body = byId("transactions-table-body");
      if (body) {
        body.innerHTML =
          '<tr><td colspan="6" class="error-state">' + escapeHtml(error.message || "Unable to load transactions") + "</td></tr>";
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
