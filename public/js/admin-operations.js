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
  function formatDateTime(value) {
    var d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return "N/A";
    return d.toLocaleString("en-UG", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  function formatCurrency(amount) {
    return "UGX " + (Number(amount) || 0).toLocaleString("en-US");
  }
  async function fetchJson(url, options) {
    var response = await fetch(url, Object.assign({ credentials: "same-origin" }, options || {}));
    var payload = await response.json().catch(function () {
      return {};
    });
    if (!response.ok || !payload.success) {
      throw new Error(payload.message || "Request failed");
    }
    return payload;
  }
  var moderationState = {
    all: [],
    filtered: [],
    query: "",
    filter: "priority",
    bound: false,
  };
  var complianceState = {
    all: [],
    filtered: [],
    query: "",
    filter: "all",
    bound: false,
  };
  var systemLogs = [];
  function summarizeFlags(entry) {
    var ai = entry.aiVerification || {};
    var ownershipFlags = Array.isArray(ai.ownershipFlags) ? ai.ownershipFlags : [];
    var healthFlags = Array.isArray(ai.healthFlags) ? ai.healthFlags : [];
    var photoFlags = Array.isArray(ai.photoFlags) ? ai.photoFlags : [];
    var totalFlags =
      Number(ai.totalFlags || 0) ||
      ownershipFlags.length + healthFlags.length + photoFlags.length;
    return { total: totalFlags, list: ownershipFlags.concat(healthFlags, photoFlags) };
  }
  function rankModeration(entry) {
    var flags = summarizeFlags(entry).total;
    if (entry.status === "rejected") return 300 + flags;
    if (entry.status === "needs_review") return 200 + flags;
    if (flags > 0) return 100 + flags;
    return 0;
  }
  function matchesModerationFilter(entry, selectedFilter) {
    var flags = summarizeFlags(entry).total;
    if (selectedFilter === "rejected") return entry.status === "rejected";
    if (selectedFilter === "needs_review") return entry.status === "needs_review";
    if (selectedFilter === "flagged") return flags > 0;
    if (selectedFilter === "priority") {
      return entry.status === "rejected" || entry.status === "needs_review" || flags > 0;
    }
    return true;
  }
  function matchesModerationQuery(entry, query) {
    if (!query) return true;
    var flags = summarizeFlags(entry).list.join(" ");
    var haystack = [
      entry._id,
      entry.status,
      entry.verificationType,
      entry.farmer && entry.farmer.name,
      entry.farmer && entry.farmer.email,
      entry.farmer && entry.farmer.phone,
      entry.auction && entry.auction._id,
      entry.auction && entry.auction.animalType,
      entry.auction && entry.auction.breed,
      entry.auction && entry.auction.location,
      flags,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.indexOf(query) >= 0;
  }
  function normalizeModerationPayload(items) {
    return (Array.isArray(items) ? items : [])
      .filter(function (item) {
        var ai = item.aiVerification || {};
        return (
          !!ai.verificationDate ||
          Number(ai.ownershipConfidence || 0) > 0 ||
          Number(ai.healthConfidence || 0) > 0
        );
      })
      .sort(function (a, b) {
        var rankDiff = rankModeration(b) - rankModeration(a);
        if (rankDiff !== 0) return rankDiff;
        return (
          new Date(b.updatedAt || b.createdAt || 0).getTime() -
          new Date(a.updatedAt || a.createdAt || 0).getTime()
        );
      });
  }
  function ensureModerationControls() {
    var host = byId("moderation-list");
    if (!host) return;
    if (byId("moderation-search") && byId("moderation-filter")) return;
    var wrap = document.createElement("div");
    wrap.className = "glass border border-gray-800/40 rounded-2xl p-4 mb-4 grid md:grid-cols-3 gap-3";
    wrap.innerHTML =
      '<div class="md:col-span-2">' +
      '<label for="moderation-search" class="text-[11px] text-gray-500 uppercase tracking-wide">Search flagged and rejected records</label>' +
      '<input id="moderation-search" type="text" placeholder="Search by farmer, auction, verification id, status" class="mt-1 w-full bg-gray-900/60 border border-gray-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50" />' +
      "</div>" +
      "<div>" +
      '<label for="moderation-filter" class="text-[11px] text-gray-500 uppercase tracking-wide">Filter</label>' +
      '<select id="moderation-filter" class="mt-1 w-full bg-gray-900/60 border border-gray-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50">' +
      '<option value="priority">Priority: Rejected and Flagged</option>' +
      '<option value="rejected">Rejected Only</option>' +
      '<option value="needs_review">Needs Review Only</option>' +
      '<option value="flagged">Flagged Only</option>' +
      '<option value="all">All AI Analyzed</option>' +
      "</select>" +
      "</div>";
    host.insertAdjacentElement("beforebegin", wrap);
  }
  function updateModerationHeader(data) {
    var rejected = data.filter(function (item) {
      return item.status === "rejected";
    }).length;
    var review = data.filter(function (item) {
      return item.status === "needs_review";
    }).length;
    var flagged = data.filter(function (item) {
      return summarizeFlags(item).total > 0;
    }).length;
    var summary = byId("moderation-summary");
    if (summary) summary.textContent = flagged + " AI-flagged records, " + rejected + " rejected";
    var buttons = document.querySelectorAll("#tab-moderation .flex.flex-wrap.gap-2 > button");
    if (buttons[0]) buttons[0].textContent = "Rejected (" + rejected + ")";
    if (buttons[1]) buttons[1].textContent = "Needs Review (" + review + ")";
    if (buttons[2]) buttons[2].textContent = "Flagged (" + flagged + ")";
  }
  function renderModerationCards() {
    var host = byId("moderation-list");
    if (!host) return;
    if (!moderationState.filtered.length) {
      host.innerHTML =
        '<div class="glass border border-gray-800/50 rounded-2xl p-5 text-sm text-gray-400">No matching AI analyzed moderation items.</div>';
      return;
    }
    host.innerHTML = moderationState.filtered
      .map(function (item) {
        var flagsData = summarizeFlags(item);
        var riskClass = "bg-sky-500/15 text-sky-300";
        var riskLabel = "Flagged";
        if (item.status === "rejected") {
          riskClass = "bg-red-500/15 text-red-300";
          riskLabel = "Rejected";
        } else if (item.status === "needs_review") {
          riskClass = "bg-amber-500/15 text-amber-300";
          riskLabel = "Needs Review";
        }
        var farmerName = item.farmer && item.farmer.name ? item.farmer.name : "Unknown user";
        var auctionLabel = item.auction
          ? [item.auction.animalType, item.auction.breed, item.auction.location].filter(Boolean).join(" - ")
          : "No linked auction";
        var topFlags = flagsData.list.slice(0, 3).map(escapeHtml).join(" | ");
        return (
          '<div class="glass border border-gray-800/50 rounded-2xl p-4">' +
          '<div class="flex items-start justify-between gap-3">' +
          '<div><p class="text-sm font-semibold">' +
          escapeHtml(farmerName) +
          '</p><p class="text-xs text-gray-500 mt-1">' +
          escapeHtml(auctionLabel) +
          '</p></div><span class="text-xs px-2 py-1 rounded-full font-semibold ' +
          riskClass +
          '">' +
          riskLabel +
          "</span></div>" +
          '<div class="mt-2 text-xs text-gray-400">Flags: ' +
          flagsData.total +
          " - " +
          (topFlags || "No AI flags listed") +
          "</div>" +
          '<div class="flex flex-wrap items-center justify-between gap-2 mt-3">' +
          '<p class="text-xs text-gray-500">' +
          escapeHtml(item._id) +
          " - Updated " +
          formatDateTime(item.updatedAt || item.createdAt) +
          '</p><div class="flex items-center gap-2">' +
          '<button class="px-3 py-1.5 text-xs rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800/40" data-mod-action="set-status" data-mod-status="needs_review" data-mod-id="' +
          escapeHtml(item._id) +
          '">Needs Review</button>' +
          '<button class="px-3 py-1.5 text-xs rounded-lg bg-gradient-to-r from-orange-500 to-red-600 text-white" data-mod-action="set-status" data-mod-status="rejected" data-mod-id="' +
          escapeHtml(item._id) +
          '">Reject</button>' +
          "</div></div></div>"
        );
      })
      .join("");
  }
  function applyModerationFilters() {
    var q = String(moderationState.query || "").trim().toLowerCase();
    moderationState.filtered = moderationState.all.filter(function (entry) {
      return matchesModerationFilter(entry, moderationState.filter) && matchesModerationQuery(entry, q);
    });
    renderModerationCards();
  }
  function bindModerationEvents() {
    if (moderationState.bound) return;
    var host = byId("moderation-list");
    if (!host) return;
    var searchInput = byId("moderation-search");
    var filterInput = byId("moderation-filter");
    if (searchInput) {
      searchInput.addEventListener("input", function () {
        moderationState.query = searchInput.value || "";
        applyModerationFilters();
      });
    }
    if (filterInput) {
      filterInput.addEventListener("change", function () {
        moderationState.filter = filterInput.value || "priority";
        applyModerationFilters();
      });
    }
    host.addEventListener("click", async function (event) {
      var btn = event.target.closest("button[data-mod-action='set-status']");
      if (!btn) return;
      var id = btn.getAttribute("data-mod-id");
      var status = btn.getAttribute("data-mod-status");
      if (!id || !status) return;
      btn.disabled = true;
      try {
        await fetchJson("/verification/api/admin/" + encodeURIComponent(id) + "/status", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: status, notes: "Updated from admin moderation panel" }),
        });
        moderationState.all = moderationState.all.map(function (item) {
          if (String(item._id) !== String(id)) return item;
          return Object.assign({}, item, { status: status, updatedAt: new Date().toISOString() });
        });
        updateModerationHeader(moderationState.all);
        applyModerationFilters();
        if (window.showToast) window.showToast("Verification status updated to " + status, "info");
      } catch (error) {
        if (window.showToast) window.showToast(error.message || "Failed to update moderation status", "error");
      } finally {
        btn.disabled = false;
      }
    });
    moderationState.bound = true;
  }
  async function renderModeration() {
    var host = byId("moderation-list");
    if (!host) return;
    ensureModerationControls();
    bindModerationEvents();
    host.innerHTML =
      '<div class="glass border border-gray-800/50 rounded-2xl p-5 text-sm text-gray-400">Loading moderation queue...</div>';
    try {
      var allRows = [];
      var page = 1;
      var hasNext = true;
      while (hasNext) {
        var payload = await fetchJson(
          "/verification/api/admin/ai-submissions?aiState=analyzed&limit=100&page=" + page,
        );
        allRows = allRows.concat(Array.isArray(payload.data) ? payload.data : []);
        hasNext = !!(payload.pagination && payload.pagination.hasNext);
        page += 1;
      }
      moderationState.all = normalizeModerationPayload(allRows);
      updateModerationHeader(moderationState.all);
      applyModerationFilters();
    } catch (error) {
      host.innerHTML =
        '<div class="glass border border-red-500/30 rounded-2xl p-5 text-sm text-red-300">Unable to load moderation queue: ' +
        escapeHtml(error.message || "Unknown error") +
        "</div>";
    }
  }
  function setDonutArc(id, startOffset, sliceSize) {
    var circle = byId(id);
    if (!circle) return startOffset;
    var circumference = 314;
    var dash = Math.round((sliceSize / 100) * circumference);
    circle.setAttribute("stroke-dasharray", String(circumference));
    circle.setAttribute("stroke-dashoffset", String(circumference - dash + startOffset));
    return startOffset - dash;
  }
  function renderAnalyticsOverview(analytics) {
    if (!analytics) return;
    var totals = analytics.totals || {};
    var verification = analytics.verifications || {};
    var rangeLabel = byId("admin-analytics-range");
    if (rangeLabel) rangeLabel.textContent = "Last 30 days to " + formatDateTime(new Date());
    var revenue = byId("analytics-total-revenue");
    if (revenue) revenue.textContent = formatCurrency(totals.totalRevenue || 0);
    var risk = byId("analytics-risk-count");
    if (risk) risk.textContent = String((verification.rejected || 0) + (verification.needsReview || 0));
    var flags = byId("analytics-total-flags");
    if (flags) flags.textContent = String(verification.totalFlags || 0);
    var conversion = byId("analytics-conversion-rate");
    if (conversion) conversion.textContent = String((analytics.lifecycle || {}).conversionRate || 0) + "%";
    var redFlagsHost = byId("analytics-redflags");
    if (redFlagsHost) {
      var rows = Array.isArray(analytics.redFlags) ? analytics.redFlags : [];
      redFlagsHost.innerHTML = rows.length
        ? rows
            .map(function (item) {
              return (
                '<div class="rounded-xl border border-gray-800 bg-gray-900/40 p-3 cursor-pointer hover:border-orange-500/40 transition-colors" data-link="#moderation">' +
                '<p class="text-xs font-semibold text-white">' +
                escapeHtml(item.userName) +
                " - " +
                escapeHtml(item.status) +
                '</p><p class="text-[11px] text-gray-500 mt-1">' +
                escapeHtml(item.auctionLabel || "No auction label") +
                '</p><p class="text-[11px] text-gray-600 mt-1">' +
                formatDateTime(item.updatedAt) +
                "</p></div>"
              );
            })
            .join("")
        : '<div class="text-xs text-gray-500">No red-flag queue at the moment.</div>';
    }
  }
  function matchComplianceFilter(row, selectedFilter) {
    var missing = Array.isArray(row.missing) ? row.missing : [];
    var hasRejected = Number(row.rejectedCount || 0) > 0;
    if (selectedFilter === "missing_both") return missing.length === 2;
    if (selectedFilter === "missing_ownership") return missing.length === 1 && missing[0] === "ownership";
    if (selectedFilter === "missing_health") return missing.length === 1 && missing[0] === "health";
    if (selectedFilter === "rejected") return hasRejected;
    return true;
  }
  function matchComplianceQuery(row, query) {
    if (!query) return true;
    var missing = Array.isArray(row.missing) ? row.missing.join(" ") : "";
    var haystack = [
      row.name,
      row.email,
      row.role,
      missing,
      row.userId,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.indexOf(query) >= 0;
  }
  function applyComplianceFilters() {
    var q = String(complianceState.query || "").trim().toLowerCase();
    complianceState.filtered = complianceState.all.filter(function (row) {
      return matchComplianceFilter(row, complianceState.filter) && matchComplianceQuery(row, q);
    });
    renderComplianceRows();
  }
  function renderComplianceRows() {
    var body = byId("analytics-compliance-body");
    var count = byId("analytics-compliance-count");
    if (!body) return;
    if (count) {
      count.textContent =
        "Showing " +
        complianceState.filtered.length +
        " of " +
        complianceState.all.length +
        " compliance user records";
    }
    if (!complianceState.filtered.length) {
      body.innerHTML =
        '<tr><td colspan="6" class="px-4 py-6 text-sm text-gray-500">No users match this compliance filter.</td></tr>';
      return;
    }
    body.innerHTML = complianceState.filtered
      .map(function (row) {
        var missing = Array.isArray(row.missing) ? row.missing : [];
        var missingLabel = missing.length ? missing.join(" + ") : "None";
        var missingClass = missing.length
          ? "bg-amber-500/15 text-amber-300"
          : "bg-emerald-500/15 text-emerald-300";
        var rejected = Number(row.rejectedCount || 0);
        var rejectedClass = rejected > 0 ? "bg-red-500/15 text-red-300" : "bg-sky-500/15 text-sky-300";
        return (
          "<tr class=\"border-b border-gray-800/30 hover:bg-gray-800/20 transition-colors\">" +
          '<td class="px-4 py-3.5">' +
          '<p class="text-sm font-semibold text-white">' +
          escapeHtml(row.name || "Unknown user") +
          '</p><p class="text-[11px] text-gray-500">' +
          escapeHtml(row.email || "No email") +
          "</p></td>" +
          '<td class="px-4 py-3.5 text-xs text-gray-300">' +
          escapeHtml(row.role || "User") +
          "</td>" +
          '<td class="px-4 py-3.5"><span class="text-[11px] px-2 py-0.5 rounded-full ' +
          missingClass +
          '">' +
          escapeHtml(missingLabel) +
          "</span></td>" +
          '<td class="px-4 py-3.5"><span class="text-[11px] px-2 py-0.5 rounded-full ' +
          rejectedClass +
          '">' +
          rejected +
          "</span></td>" +
          '<td class="px-4 py-3.5 text-xs text-gray-400">' +
          escapeHtml(formatDateTime(row.createdAt)) +
          "</td>" +
          '<td class="px-4 py-3.5 text-center">' +
          '<button class="px-3 py-1.5 text-xs rounded-lg bg-gradient-to-r from-orange-500 to-red-600 text-white" data-action="manage-compliance-user" data-user-id="' +
          escapeHtml(row.userId) +
          '" data-user-name="' +
          escapeHtml(row.name || "") +
          '" data-user-email="' +
          escapeHtml(row.email || "") +
          '">Manage</button>' +
          "</td>" +
          "</tr>"
        );
      })
      .join("");
  }
  function bindComplianceEvents() {
    if (complianceState.bound) return;
    var searchInput = byId("analytics-compliance-search");
    var filterInput = byId("analytics-compliance-filter");
    var body = byId("analytics-compliance-body");
    if (searchInput) {
      searchInput.addEventListener("input", function () {
        complianceState.query = searchInput.value || "";
        applyComplianceFilters();
      });
    }
    if (filterInput) {
      filterInput.addEventListener("change", function () {
        complianceState.filter = filterInput.value || "all";
        applyComplianceFilters();
      });
    }
    if (body) {
      body.addEventListener("click", function (event) {
        var btn = event.target.closest("[data-action='manage-compliance-user']");
        if (!btn) return;
        var userId = btn.getAttribute("data-user-id");
        var userName = btn.getAttribute("data-user-name");
        var userEmail = btn.getAttribute("data-user-email");
        if (typeof window.openUserManagement === "function") {
          window.openUserManagement({
            userId: userId,
            search: userEmail || userName || "",
            role: "all",
            status: "all",
          });
        } else if (typeof window.switchTab === "function") {
          window.switchTab("users", null);
          window.location.hash = "users";
        }
      });
    }
    complianceState.bound = true;
  }
  function renderCompliance(analytics) {
    var compliance = (analytics && analytics.compliance) || {};
    var rows = Array.isArray(compliance.users) ? compliance.users : [];
    var overdue = byId("analytics-compliance-overdue");
    var missing = byId("analytics-compliance-missing");
    var missingBoth = byId("analytics-compliance-missing-both");
    var rejected = byId("analytics-compliance-rejected");
    if (overdue) overdue.textContent = String(compliance.overdueUsers || 0);
    if (missing) missing.textContent = String(compliance.missingUsers || 0);
    if (missingBoth) missingBoth.textContent = String(compliance.missingBoth || 0);
    if (rejected) rejected.textContent = String(compliance.rejectedUsers || 0);
    complianceState.all = rows.map(function (row) {
      return {
        userId: String(row.userId || row._id || ""),
        name: row.name || "Unknown user",
        email: row.email || "",
        role: row.role || "",
        missing: Array.isArray(row.missing) ? row.missing : [],
        rejectedCount: Number(row.rejectedCount || 0),
        createdAt: row.createdAt,
      };
    });
    bindComplianceEvents();
    applyComplianceFilters();
  }
  function renderBarChart(analytics) {
    var host = byId("bar-chart");
    if (!host) return;
    var categories = Array.isArray(analytics.categories) ? analytics.categories : [];
    if (!categories.length) {
      host.innerHTML = '<div class="text-sm text-gray-500">No category data available.</div>';
      return;
    }
    var max = categories.reduce(function (m, row) {
      return Math.max(m, Number(row.count || 0));
    }, 0);
    host.innerHTML = categories
      .slice(0, 8)
      .map(function (row, index) {
        var value = Number(row.count || 0);
        var width = max > 0 ? Math.max(6, Math.round((value / max) * 100)) : 0;
        var colorClass = ["from-orange-500 to-red-500", "from-blue-500 to-cyan-500", "from-emerald-500 to-teal-500", "from-purple-500 to-indigo-500"][index % 4];
        return (
          '<div class="cursor-pointer" data-link="#auctions"><div class="flex items-center justify-between text-xs mb-1"><span class="text-gray-300 font-semibold">' +
          escapeHtml(row.category || "Unspecified") +
          '</span><span class="text-gray-500">' +
          value +
          '</span></div><div class="h-2.5 bg-gray-800 rounded-full overflow-hidden"><div class="h-full rounded-full bg-gradient-to-r ' +
          colorClass +
          '" style="width:' +
          width +
          '%"></div></div></div>'
        );
      })
      .join("");
  }
  function renderDonut(analytics) {
    var data = Array.isArray(analytics.revenueByCategory) ? analytics.revenueByCategory : [];
    var total = data.reduce(function (sum, row) {
      return sum + Number(row.amount || 0);
    }, 0);
    var slices = [];
    var maxSlices = 4;
    for (var i = 0; i < maxSlices; i += 1) {
      var row = data[i] || { category: "Unspecified", amount: 0 };
      var percentage = total > 0 ? (Number(row.amount || 0) / total) * 100 : 0;
      slices.push({ category: row.category, amount: Number(row.amount || 0), percentage: percentage });
    }
    var offset = 0;
    offset = setDonutArc("donut-cattle", offset, slices[0].percentage);
    offset = setDonutArc("donut-goat", offset, slices[1].percentage);
    offset = setDonutArc("donut-sheep", offset, slices[2].percentage);
    setDonutArc("donut-poultry", offset, slices[3].percentage);
    var center = byId("analytics-donut-total");
    if (center) center.textContent = formatCurrency(total);
    var legendHost = byId("analytics-donut-legend");
    if (legendHost) {
      legendHost.innerHTML = slices
        .map(function (slice, idx) {
          var colors = ["bg-orange-500", "bg-blue-500", "bg-purple-500", "bg-emerald-500"];
          return (
            '<div class="flex items-center justify-between cursor-pointer" data-link="#transactions"><div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full ' +
            colors[idx] +
            '"></span><span class="text-xs text-gray-400">' +
            escapeHtml(slice.category || "Unspecified") +
            '</span></div><span class="text-xs font-semibold text-white">' +
            Math.round(slice.percentage) +
            "%</span></div>"
          );
        })
        .join("");
    }
  }
  function renderFunnel(analytics) {
    var host = byId("funnel-chart");
    if (!host) return;
    var lifecycle = analytics.lifecycle || {};
    var rows = [
      { label: "Listed", value: Number(lifecycle.listedAuctions || 0), color: "from-orange-500 to-red-500" },
      { label: "Live", value: Number(lifecycle.activeAuctions || 0), color: "from-blue-500 to-cyan-500" },
      { label: "With Bids", value: Number(lifecycle.auctionsWithBids || 0), color: "from-purple-500 to-indigo-500" },
      { label: "Sold", value: Number(lifecycle.soldAuctions || 0), color: "from-emerald-500 to-teal-500" },
    ];
    var max = rows.reduce(function (m, row) {
      return Math.max(m, row.value);
    }, 0);
    host.innerHTML = rows
      .map(function (row) {
        var width = max > 0 ? Math.max(6, Math.round((row.value / max) * 100)) : 0;
        var link = row.label === "Sold" ? "#transactions" : "#auctions";
        return (
          '<div class="grid grid-cols-[100px_1fr_56px] items-center gap-3 cursor-pointer" data-link="' + link + '"><span class="text-xs text-gray-400 font-semibold">' +
          row.label +
          '</span><div class="h-3 bg-gray-800 rounded-full overflow-hidden"><div class="h-full bg-gradient-to-r ' +
          row.color +
          '" style="width:' +
          width +
          '%"></div></div><span class="text-xs text-white font-semibold text-right">' +
          row.value +
          "</span></div>"
        );
      })
      .join("");
  }
  function wireAdminAnalyticsClickables() {
    var targets = [
      { id: "analytics-total-revenue", link: "#transactions" },
      { id: "analytics-risk-count", link: "#moderation" },
      { id: "analytics-total-flags", link: "#moderation" },
      { id: "analytics-conversion-rate", link: "#analytics" },
      { id: "analytics-donut-total", link: "#transactions" },
      { id: "analytics-compliance-overdue", link: "#users" },
      { id: "analytics-compliance-missing", link: "#users" },
      { id: "analytics-compliance-missing-both", link: "#users" },
      { id: "analytics-compliance-rejected", link: "#moderation" },
    ];
    targets.forEach(function (item) {
      var el = byId(item.id);
      if (!el) return;
      var card = el.closest(".rounded-xl") || el;
      if (!card) return;
      card.style.cursor = "pointer";
      card.setAttribute("data-link", item.link);
      if (card.dataset.analyticsBound === "1") return;
      card.dataset.analyticsBound = "1";
      card.addEventListener("click", function () {
        if (item.link.charAt(0) === "#" && typeof window.switchTab === "function") {
          var tab = item.link.slice(1);
          window.switchTab(tab, null);
          window.location.hash = tab;
          return;
        }
        window.location.href = item.link;
      });
    });
    document.querySelectorAll("#tab-analytics [data-link]").forEach(function (node) {
      if (node.dataset.linkBound === "1") return;
      node.dataset.linkBound = "1";
      node.addEventListener("click", function () {
        var link = node.getAttribute("data-link");
        if (!link) return;
        if (link.charAt(0) === "#" && typeof window.switchTab === "function") {
          var tab = link.replace(/^#/, "");
          window.switchTab(tab, null);
          window.location.hash = tab;
          return;
        }
        window.location.href = link;
      });
    });
  }
  function addSystemLog(level, message) {
    systemLogs.unshift({
      level: level,
      message: message,
      time: new Date().toISOString(),
    });
    if (systemLogs.length > 18) systemLogs = systemLogs.slice(0, 18);
    var host = byId("system-logs");
    if (!host) return;
    host.innerHTML = systemLogs
      .map(function (line) {
        var color = "text-sky-300";
        if (line.level === "WARN") color = "text-amber-300";
        if (line.level === "ERROR") color = "text-red-300";
        if (line.level === "SUCCESS") color = "text-emerald-300";
        return (
          '<div class="px-2 py-1.5 rounded bg-gray-900/50 border border-gray-800/40 text-[11px] leading-relaxed">' +
          '<span class="text-gray-500">[' +
          formatDateTime(line.time) +
          "]</span> " +
          '<span class="font-semibold ' +
          color +
          '">' +
          line.level +
          "</span> " +
          '<span class="text-gray-300">' +
          escapeHtml(line.message) +
          "</span></div>"
        );
      })
      .join("");
  }
  function applySystemHealth(data) {
    var metrics = (data && data.metrics) || {};
    var pairs = [
      ["cpu", Number(metrics.cpu || 0)],
      ["mem", Number(metrics.mem || 0)],
      ["disk", Number(metrics.disk || 0)],
      ["net", Number(metrics.net || 0)],
    ];
    pairs.forEach(function (pair) {
      var key = pair[0];
      var value = pair[1];
      var valNode = byId(key + "-val");
      var barNode = byId(key + "-bar");
      if (valNode) valNode.textContent = value + "%";
      if (barNode) barNode.style.width = value + "%";
    });
  }
  async function refreshSystemHealth() {
    try {
      var payload = await fetchJson("/api/user/admin/system-health");
      applySystemHealth(payload.data || {});
      var api = (payload.data || {}).api || {};
      addSystemLog("INFO", "API uptime: " + (api.uptimeLabel || "N/A"));
      var db = (payload.data || {}).db || {};
      addSystemLog(db.connected ? "SUCCESS" : "ERROR", "Database state: " + (db.state || "unknown"));
    } catch (error) {
      addSystemLog("ERROR", error.message || "Failed to refresh system health");
    }
  }
  function bindSettings() {
    var saveBtn = byId("settings-save-btn");
    var resetBtn = byId("settings-reset-btn");
    if (!saveBtn || !resetBtn) return;
    function apply(values) {
      if (byId("setting-auction-duration")) byId("setting-auction-duration").value = String(values.auctionDuration || 7);
      if (byId("setting-min-score")) byId("setting-min-score").value = String(values.minScore || 75);
      if (byId("setting-auto-close")) byId("setting-auto-close").checked = !!values.autoClose;
      if (byId("setting-buyer-verification")) byId("setting-buyer-verification").checked = !!values.buyerVerification;
      if (byId("setting-realtime-alerts")) byId("setting-realtime-alerts").checked = !!values.realtimeAlerts;
      if (byId("setting-maintenance-mode")) byId("setting-maintenance-mode").checked = !!values.maintenanceMode;
      if (byId("setting-admin-note")) byId("setting-admin-note").value = values.adminNote || "";
      if (byId("settings-last-saved")) {
        byId("settings-last-saved").textContent = values.savedAt
          ? "Last saved: " + formatDateTime(values.savedAt)
          : "Not saved yet";
      }
      if (values.lastAction) addSystemLog("INFO", "Last action: " + values.lastAction);
    }
    function collect() {
      return {
        auctionDuration: Number((byId("setting-auction-duration") && byId("setting-auction-duration").value) || 7),
        minScore: Number((byId("setting-min-score") && byId("setting-min-score").value) || 75),
        autoClose: !!(byId("setting-auto-close") && byId("setting-auto-close").checked),
        buyerVerification: !!(byId("setting-buyer-verification") && byId("setting-buyer-verification").checked),
        realtimeAlerts: !!(byId("setting-realtime-alerts") && byId("setting-realtime-alerts").checked),
        maintenanceMode: !!(byId("setting-maintenance-mode") && byId("setting-maintenance-mode").checked),
        adminNote: (byId("setting-admin-note") && byId("setting-admin-note").value.trim()) || "",
      };
    }
    fetchJson("/api/user/admin/settings")
      .then(function (payload) {
        apply(payload.data || {});
      })
      .catch(function (error) {
        if (window.showToast) window.showToast(error.message || "Unable to load settings", "error");
      });
    saveBtn.addEventListener("click", function () {
      var payload = collect();
      fetchJson("/api/user/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then(function (response) {
          apply(response.data || {});
          if (window.showToast) window.showToast("Admin settings saved successfully", "success");
        })
        .catch(function (error) {
          if (window.showToast) window.showToast(error.message || "Failed to save settings", "error");
        });
    });
    resetBtn.addEventListener("click", function () {
      var defaults = {
        auctionDuration: 7,
        minScore: 75,
        autoClose: true,
        buyerVerification: true,
        realtimeAlerts: true,
        maintenanceMode: false,
        adminNote: "",
        lastAction: "Settings reset to defaults",
      };
      fetchJson("/api/user/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(defaults),
      })
        .then(function (response) {
          apply(response.data || {});
          if (window.showToast) window.showToast("Settings reset to defaults", "info");
        })
        .catch(function (error) {
          if (window.showToast) window.showToast(error.message || "Failed to reset settings", "error");
        });
    });
  }
  function bindSecurityActions() {
    var actionMap = {
      "security-action-revoke": "revoke_sessions",
      "security-action-password": "enforce_password_policy",
      "security-action-export": "export_audit_logs",
      "security-action-emergency": "emergency_lock",
    };
    Object.keys(actionMap).forEach(function (id) {
      var button = byId(id);
      if (!button) return;
      button.addEventListener("click", function () {
        button.disabled = true;
        fetchJson("/api/user/admin/security-actions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: actionMap[id] }),
        })
          .then(function (payload) {
            addSystemLog("WARN", payload.message || "Action completed");
            if (window.showToast) window.showToast(payload.message || "Action completed", "info");
            return fetchJson("/api/user/admin/settings");
          })
          .then(function (payload) {
            var marker = byId("settings-last-saved");
            if (marker && payload.data && payload.data.savedAt) {
              marker.textContent = "Last saved: " + formatDateTime(payload.data.savedAt);
            }
            if (byId("setting-maintenance-mode")) {
              byId("setting-maintenance-mode").checked = !!(payload.data && payload.data.maintenanceMode);
            }
          })
          .catch(function (error) {
            if (window.showToast) window.showToast(error.message || "Security action failed", "error");
          })
          .finally(function () {
            button.disabled = false;
          });
      });
    });
  }
  async function renderAnalytics() {
    try {
      var payload = await fetchJson("/api/user/admin/analytics");
      var analytics = payload.data || {};
      renderAnalyticsOverview(analytics);
      renderCompliance(analytics);
      renderBarChart(analytics);
      renderDonut(analytics);
      renderFunnel(analytics);
      wireAdminAnalyticsClickables();
    } catch (error) {
      var hosts = ["bar-chart", "funnel-chart", "analytics-redflags"];
      hosts.forEach(function (id) {
        var host = byId(id);
        if (host) host.innerHTML = '<div class="text-sm text-red-300">Unable to load analytics.</div>';
      });
      if (window.showToast) window.showToast(error.message || "Failed to load analytics", "error");
    }
  }
  function init() {
    renderModeration();
    renderAnalytics();
    bindSettings();
    bindSecurityActions();
    addSystemLog("INFO", "Admin operations initialized");
    refreshSystemHealth();
    setInterval(refreshSystemHealth, 15000);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

