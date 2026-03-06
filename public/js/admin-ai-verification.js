(function () {
  const state = {
    page: 1,
    limit: 12,
    status: "all",
    type: "all",
    aiState: "all",
    q: "",
    totalPages: 1,
    rows: [],
    selectedId: null,
  };

  const elements = {
    rows: document.getElementById("rows"),
    detailPanel: document.getElementById("detail-panel"),
    pageLabel: document.getElementById("page-label"),
    prevPage: document.getElementById("prev-page"),
    nextPage: document.getElementById("next-page"),
    refreshBtn: document.getElementById("refresh-btn"),
    searchInput: document.getElementById("search-input"),
    statusFilter: document.getElementById("status-filter"),
    typeFilter: document.getElementById("type-filter"),
    aiFilter: document.getElementById("ai-filter"),
    limitFilter: document.getElementById("limit-filter"),
    statTotal: document.getElementById("stat-total"),
    statPending: document.getElementById("stat-pending"),
    statVerified: document.getElementById("stat-verified"),
    statAnalyzed: document.getElementById("stat-analyzed"),
  };

  function statusClass(status) {
    return "status-pill status-" + String(status || "pending");
  }

  function formatDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString("en-UG", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function safeText(value) {
    return String(value || "").replace(/[&<>"']/g, function (char) {
      if (char === "&") return "&amp;";
      if (char === "<") return "&lt;";
      if (char === ">") return "&gt;";
      if (char === '"') return "&quot;";
      return "&#39;";
    });
  }

  async function api(path, options) {
    const response = await fetch(path, {
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
      ...options,
    });

    const data = await response.json().catch(function () {
      return null;
    });

    if (!response.ok) {
      throw new Error(data?.message || data?.error || "Request failed");
    }

    return data;
  }

  function renderRows() {
    if (!state.rows.length) {
      elements.rows.innerHTML =
        '<div class="rounded-xl border border-dashed border-slate-600 p-6 text-center text-sm text-gray-300">No submissions found for your current filters.</div>';
      return;
    }

    elements.rows.innerHTML = state.rows
      .map(function (item) {
        const isActive = state.selectedId === item._id;
        const submitter = item.farmer?.name || "Guest Submitter";
        const auctionLabel = item.auction
          ? [item.auction.animalType, item.auction.breed]
              .filter(Boolean)
              .join(" - ")
          : "No linked auction";

        return (
          '<button type="button" data-id="' +
          item._id +
          '" class="w-full rounded-xl border border-slate-700 p-3 text-left transition hover:border-blue-400/60 ' +
          (isActive ? "row-active" : "") +
          '">' +
          '<div class="flex items-start justify-between gap-3">' +
          "<div>" +
          '<p class="text-sm font-semibold">' +
          safeText(submitter) +
          "</p>" +
          '<p class="text-xs text-gray-300 mt-0.5">' +
          safeText(auctionLabel) +
          "</p>" +
          '<p class="text-[11px] text-gray-400 mt-1">ID: ' +
          safeText(item._id) +
          "</p>" +
          "</div>" +
          '<span class="' +
          statusClass(item.status) +
          '">' +
          safeText(item.status) +
          "</span>" +
          "</div>" +
          '<div class="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-300">' +
          '<span class="rounded-md bg-slate-700/70 px-2 py-1">Type: ' +
          safeText(item.verificationType) +
          "</span>" +
          '<span class="rounded-md bg-slate-700/70 px-2 py-1">Score: ' +
          Math.round(item.verificationScore || 0) +
          "</span>" +
          '<span class="rounded-md bg-slate-700/70 px-2 py-1">Docs: ' +
          ((item.documentCounts?.ownership || 0) +
            (item.documentCounts?.health || 0) +
            (item.documentCounts?.photos || 0)) +
          "</span>" +
          '<span class="rounded-md bg-slate-700/70 px-2 py-1">AI: ' +
          (item.aiVerification?.verificationDate ? "Ready" : "Not Yet") +
          "</span>" +
          "</div>" +
          '<p class="mt-2 text-[11px] text-gray-400">Submitted: ' +
          formatDate(item.createdAt) +
          "</p>" +
          "</button>"
        );
      })
      .join("");
  }

  function renderStats(stats) {
    elements.statTotal.textContent = String(stats?.total || 0);
    elements.statPending.textContent = String(stats?.pending || 0);
    elements.statVerified.textContent = String(stats?.verified || 0);
    elements.statAnalyzed.textContent = String(stats?.analyzed || 0);
  }

  function setPagination(pagination) {
    state.totalPages = pagination?.totalPages || 1;
    state.page = pagination?.page || 1;
    elements.pageLabel.textContent =
      "Page " + state.page + " of " + state.totalPages;
    elements.prevPage.disabled = !pagination?.hasPrev;
    elements.nextPage.disabled = !pagination?.hasNext;
  }

  function renderDetail(data) {
    const docsOwnership = data.ownershipDocuments || [];
    const docsHealth = data.healthDocuments || [];
    const photos = data.animalPhotos || [];
    const ai = data.aiVerification || {};

    const documentLinks = docsOwnership
      .concat(docsHealth)
      .concat(photos)
      .map(function (doc, index) {
        const label = doc.fileName || doc.type || "Document " + (index + 1);
        return (
          '<a class="underline text-blue-300" target="_blank" rel="noreferrer" href="' +
          safeText(doc.url) +
          '">' +
          safeText(label) +
          "</a>"
        );
      })
      .join('<span class="text-gray-500">, </span>');

    elements.detailPanel.innerHTML =
      '<div class="space-y-4">' +
      '<div class="flex items-start justify-between gap-2">' +
      "<div>" +
      '<p class="text-xs uppercase tracking-wide text-gray-400">Selected Submission</p>' +
      '<h2 class="text-lg font-semibold mt-1">' +
      safeText(data.farmer?.name || "Guest Submitter") +
      "</h2>" +
      '<p class="text-xs text-gray-300 mt-1">' +
      safeText(data.farmer?.email || "No email") +
      "</p>" +
      "</div>" +
      '<span class="' +
      statusClass(data.status) +
      '">' +
      safeText(data.status) +
      "</span>" +
      "</div>" +
      '<div class="rounded-xl border border-slate-700 p-3 text-sm">' +
      '<p><span class="text-gray-400">Auction:</span> ' +
      safeText(
        data.auction
          ? [data.auction.animalType, data.auction.breed]
              .filter(Boolean)
              .join(" - ")
          : "No linked auction",
      ) +
      "</p>" +
      '<p class="mt-1"><span class="text-gray-400">Verification Type:</span> ' +
      safeText(data.verificationType) +
      "</p>" +
      '<p class="mt-1"><span class="text-gray-400">Submitted:</span> ' +
      formatDate(data.createdAt) +
      "</p>" +
      "</div>" +
      '<div class="rounded-xl border border-slate-700 p-3 text-sm">' +
      '<p class="font-medium">Documents</p>' +
      '<p class="text-xs text-gray-300 mt-1">Ownership: ' +
      docsOwnership.length +
      " | Health: " +
      docsHealth.length +
      " | Photos: " +
      photos.length +
      "</p>" +
      '<p class="mt-2 text-xs text-gray-300 break-words">' +
      (documentLinks || "No files available") +
      "</p>" +
      "</div>" +
      '<div class="rounded-xl border border-slate-700 p-3 text-sm">' +
      '<p class="font-medium">AI Result</p>' +
      '<p class="mt-1 text-xs text-gray-300">Last analyzed: ' +
      formatDate(ai.verificationDate) +
      "</p>" +
      '<p class="mt-1 text-xs text-gray-300">Ownership confidence: ' +
      Math.round(ai.ownershipConfidence || 0) +
      "%</p>" +
      '<p class="mt-1 text-xs text-gray-300">Health confidence: ' +
      Math.round(ai.healthConfidence || 0) +
      "%</p>" +
      '<p class="mt-1 text-xs text-gray-300">Ownership notes: ' +
      safeText(ai.ownershipAnalysis || "Not available") +
      "</p>" +
      '<p class="mt-1 text-xs text-gray-300">Health notes: ' +
      safeText(ai.healthAnalysis || "Not available") +
      "</p>" +
      "</div>" +
      '<button id="analyze-btn" type="button" class="w-full rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-400">' +
      '<i class="bi bi-cpu"></i> Analyze With Gemini' +
      "</button>" +
      "</div>";

    const analyzeBtn = document.getElementById("analyze-btn");
    analyzeBtn.addEventListener("click", function () {
      analyzeSubmission(data._id, analyzeBtn);
    });
  }

  async function loadRows() {
    const query = new URLSearchParams({
      page: String(state.page),
      limit: String(state.limit),
      status: state.status,
      type: state.type,
      aiState: state.aiState,
      q: state.q,
    });

    elements.rows.innerHTML =
      '<div class="rounded-xl border border-dashed border-slate-600 p-5 text-sm text-gray-300">Loading submissions...</div>';

    try {
      const payload = await api(
        "/verification/api/admin/ai-submissions?" + query.toString(),
      );

      state.rows = payload.data || [];

      if (state.selectedId) {
        const stillExists = state.rows.some(function (row) {
          return row._id === state.selectedId;
        });
        if (!stillExists) state.selectedId = null;
      }

      if (!state.selectedId && state.rows.length) {
        state.selectedId = state.rows[0]._id;
      }

      renderRows();
      renderStats(payload.stats || {});
      setPagination(payload.pagination || {});

      if (state.selectedId) {
        loadDetail(state.selectedId);
      } else {
        elements.detailPanel.innerHTML =
          '<p class="text-sm text-gray-300">Select a submission from the list to view details and run AI analysis.</p>';
      }
    } catch (error) {
      elements.rows.innerHTML =
        '<div class="rounded-xl border border-red-500/40 bg-red-500/10 p-5 text-sm text-red-200">' +
        safeText(error.message) +
        "</div>";
    }
  }

  async function loadDetail(id) {
    if (!id) return;
    elements.detailPanel.innerHTML =
      '<p class="text-sm text-gray-300">Loading selected submission...</p>';

    try {
      const payload = await api(
        "/verification/api/admin/ai-submissions/" + encodeURIComponent(id),
      );
      renderDetail(payload.data);
    } catch (error) {
      elements.detailPanel.innerHTML =
        '<div class="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">' +
        safeText(error.message) +
        "</div>";
    }
  }

  async function analyzeSubmission(id, button) {
    if (!id) return;

    button.disabled = true;
    const original = button.innerHTML;
    button.innerHTML =
      '<i class="bi bi-hourglass-split"></i> Running Analysis...';

    try {
      await api(
        "/verification/api/admin/ai-submissions/" +
          encodeURIComponent(id) +
          "/analyze",
        {
          method: "POST",
          body: JSON.stringify({}),
        },
      );
      await loadRows();
      await loadDetail(id);
    } catch (error) {
      alert(error.message || "AI analysis failed");
    } finally {
      button.disabled = false;
      button.innerHTML = original;
    }
  }

  function setupEvents() {
    let searchTimer = null;

    elements.searchInput.addEventListener("input", function (event) {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () {
        state.q = event.target.value.trim();
        state.page = 1;
        loadRows();
      }, 350);
    });

    elements.statusFilter.addEventListener("change", function (event) {
      state.status = event.target.value;
      state.page = 1;
      loadRows();
    });

    elements.typeFilter.addEventListener("change", function (event) {
      state.type = event.target.value;
      state.page = 1;
      loadRows();
    });

    elements.aiFilter.addEventListener("change", function (event) {
      state.aiState = event.target.value;
      state.page = 1;
      loadRows();
    });

    elements.limitFilter.addEventListener("change", function (event) {
      state.limit = Number(event.target.value) || 12;
      state.page = 1;
      loadRows();
    });

    elements.refreshBtn.addEventListener("click", function () {
      loadRows();
    });

    elements.prevPage.addEventListener("click", function () {
      if (state.page <= 1) return;
      state.page -= 1;
      loadRows();
    });

    elements.nextPage.addEventListener("click", function () {
      if (state.page >= state.totalPages) return;
      state.page += 1;
      loadRows();
    });

    elements.rows.addEventListener("click", function (event) {
      const button = event.target.closest("button[data-id]");
      if (!button) return;
      const id = button.getAttribute("data-id");
      if (!id) return;

      state.selectedId = id;
      renderRows();
      loadDetail(id);
    });
  }

  setupEvents();
  loadRows();
})();
