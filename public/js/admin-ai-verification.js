(function () {
  var state = {
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
  var elements = {
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
  function esc(v) {
    return String(v || "").replace(/[&<>"']/g, function (c) {
      if (c === "&") return "&amp;";
      if (c === "<") return "&lt;";
      if (c === ">") return "&gt;";
      if (c === '"') return "&quot;";
      return "&#39;";
    });
  }
  function fmtDate(v) {
    if (!v) return "N/A";
    var d = new Date(v);
    if (isNaN(d.getTime())) return "N/A";
    return d.toLocaleString("en-UG", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  function statusClass(s) {
    return "spill sp-" + String(s || "pending");
  }
  function animateNum(el, target) {
    var start = parseInt(el.textContent) || 0;
    var dur = 900;
    var t0 = performance.now();
    function tick(now) {
      var p = Math.min((now - t0) / dur, 1);
      var ease = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(start + (target - start) * ease);
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  function api(path, options) {
    return fetch(
      path,
      Object.assign(
        {
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
        },
        options || {},
      ),
    ).then(function (r) {
      return r
        .json()
        .catch(function () {
          return null;
        })
        .then(function (data) {
          if (!r.ok)
            throw new Error(
              (data && (data.message || data.error)) || "Request failed",
            );
          return data;
        });
    });
  }
  function renderRows() {
    if (!state.rows.length) {
      elements.rows.innerHTML =
        '<div class="state-box">' +
        '<div class="state-ico"><i class="bi bi-inbox"></i></div>' +
        '<div class="state-txt">No submissions found for your current filters.</div>' +
        "</div>";
      return;
    }
    elements.rows.innerHTML = state.rows
      .map(function (item) {
        var isActive = state.selectedId === item._id;
        var submitter = (item.farmer && item.farmer.name) || "Guest Submitter";
        var auctionLbl = item.auction
          ? [item.auction.animalType, item.auction.breed]
              .filter(Boolean)
              .join(" / ")
          : "No linked auction";
        var aiReady = !!(
          item.aiVerification && item.aiVerification.verificationDate
        );
        var score = Math.round(item.verificationScore || 0);
        var docCount =
          ((item.documentCounts && item.documentCounts.ownership) || 0) +
          ((item.documentCounts && item.documentCounts.health) || 0) +
          ((item.documentCounts && item.documentCounts.photos) || 0);
        return (
          '<button type="button" data-id="' +
          esc(item._id) +
          '"' +
          ' class="sub-btn' +
          (isActive ? " is-active" : "") +
          '">' +
          '<div class="sub-top">' +
          "<div>" +
          '<div class="sub-name">' +
          esc(submitter) +
          "</div>" +
          '<div class="sub-auction">' +
          esc(auctionLbl) +
          "</div>" +
          '<div class="sub-id">ID: ' +
          esc(item._id) +
          "</div>" +
          "</div>" +
          '<span class="' +
          statusClass(item.status) +
          '">' +
          esc(item.status) +
          "</span>" +
          "</div>" +
          '<div class="sub-chips">' +
          '<span class="chip">Type: ' +
          esc(item.verificationType) +
          "</span>" +
          '<span class="chip">Score: ' +
          score +
          "</span>" +
          '<span class="chip">Docs: ' +
          docCount +
          "</span>" +
          '<span class="chip ' +
          (aiReady ? "chip-ai-on" : "chip-ai-off") +
          '">' +
          '<i class="bi ' +
          (aiReady ? "bi-cpu-fill" : "bi-cpu") +
          '"></i> ' +
          (aiReady ? "Analyzed" : "Not Yet") +
          "</span>" +
          "</div>" +
          '<div class="sub-date">Submitted: ' +
          fmtDate(item.createdAt) +
          "</div>" +
          "</button>"
        );
      })
      .join("");
  }
  function renderStats(stats) {
    animateNum(elements.statTotal, stats ? stats.total || 0 : 0);
    animateNum(elements.statPending, stats ? stats.pending || 0 : 0);
    animateNum(elements.statVerified, stats ? stats.verified || 0 : 0);
    animateNum(elements.statAnalyzed, stats ? stats.analyzed || 0 : 0);
  }
  function setPagination(pg) {
    state.totalPages = (pg && pg.totalPages) || 1;
    state.page = (pg && pg.page) || 1;
    elements.pageLabel.textContent =
      "Page " + state.page + " of " + state.totalPages;
    elements.prevPage.disabled = !(pg && pg.hasPrev);
    elements.nextPage.disabled = !(pg && pg.hasNext);
  }
  function renderDetail(data) {
    var docsOwn = data.ownershipDocuments || [];
    var docsHlt = data.healthDocuments || [];
    var photos = data.animalPhotos || [];
    var ai = data.aiVerification || {};
    var allDocs = docsOwn.concat(docsHlt).concat(photos);
    var docLinks =
      allDocs
        .map(function (doc, i) {
          var label = doc.fileName || doc.type || "Document " + (i + 1);
          return (
            '<a class="doc-lnk" href="' +
            esc(doc.url) +
            '" target="_blank" rel="noreferrer">' +
            '<i class="bi bi-file-earmark-text"></i>' +
            esc(label) +
            "</a>"
          );
        })
        .join("") ||
      '<span style="font-size:12px;color:var(--text-dim);">No files available</span>';
    var ownConf = Math.round(ai.ownershipConfidence || 0);
    var hltConf = Math.round(ai.healthConfidence || 0);
    var farmerName = (data.farmer && data.farmer.name) || "Guest Submitter";
    var farmerEmail = (data.farmer && data.farmer.email) || "No email";
    var auctionLbl = data.auction
      ? [data.auction.animalType, data.auction.breed]
          .filter(Boolean)
          .join(" / ")
      : "No linked auction";
    document.getElementById("detail-panel").innerHTML =
      "<div>" +
      '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:16px;">' +
      "<div>" +
      '<div style="font-family:var(--f-mono);font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:var(--hud-amber);margin-bottom:6px;">Selected Submission</div>' +
      '<div style="font-family:var(--f-display);font-size:18px;font-weight:800;margin-bottom:4px;">' +
      esc(farmerName) +
      "</div>" +
      '<div style="font-family:var(--f-mono);font-size:11px;color:var(--text-muted);">' +
      esc(farmerEmail) +
      "</div>" +
      "</div>" +
      '<span class="' +
      statusClass(data.status) +
      '">' +
      esc(data.status) +
      "</span>" +
      "</div>" +
      '<div class="d-sec">' +
      '<div class="d-sec-title"><i class="bi bi-info-circle-fill"></i> Submission Details</div>' +
      '<div class="d-row"><span class="d-key">Auction</span><span class="d-val">' +
      esc(auctionLbl) +
      "</span></div>" +
      '<div class="d-row"><span class="d-key">Type</span><span class="d-val">' +
      esc(data.verificationType) +
      "</span></div>" +
      '<div class="d-row"><span class="d-key">Submitted</span><span class="d-val">' +
      fmtDate(data.createdAt) +
      "</span></div>" +
      '<div class="d-row"><span class="d-key">Score</span>' +
      '<span class="d-val" style="font-family:var(--f-mono);color:var(--hud-amber);">' +
      Math.round(data.verificationScore || 0) +
      "</span>" +
      "</div>" +
      "</div>" +
      '<div class="d-sec">' +
      '<div class="d-sec-title"><i class="bi bi-folder2-open"></i> Document Chain</div>' +
      '<div style="display:flex;gap:18px;margin-bottom:10px;font-family:var(--f-mono);font-size:11px;">' +
      '<span style="color:var(--text-muted);">Ownership: <strong style="color:var(--text-primary);">' +
      docsOwn.length +
      "</strong></span>" +
      '<span style="color:var(--text-muted);">Health: <strong style="color:var(--text-primary);">' +
      docsHlt.length +
      "</strong></span>" +
      '<span style="color:var(--text-muted);">Photos: <strong style="color:var(--text-primary);">' +
      photos.length +
      "</strong></span>" +
      "</div>" +
      '<div style="display:flex;flex-wrap:wrap;gap:4px;">' +
      docLinks +
      "</div>" +
      "</div>" +
      '<div class="d-sec">' +
      '<div class="d-sec-title"><i class="bi bi-cpu-fill"></i> Gemini Analysis Results</div>' +
      '<div class="d-row"><span class="d-key">Last Analyzed</span><span class="d-val">' +
      fmtDate(ai.verificationDate) +
      "</span></div>" +
      '<div class="conf-wrap" style="margin-top:10px;">' +
      '<div class="conf-row"><span>Ownership Confidence</span><span style="color:var(--hud-amber);">' +
      ownConf +
      "%</span></div>" +
      '<div class="conf-track"><div class="conf-fill f-own" style="width:0%" data-target="' +
      ownConf +
      '"></div></div>' +
      "</div>" +
      '<div class="conf-wrap" style="margin-top:8px;margin-bottom:12px;">' +
      '<div class="conf-row"><span>Health Confidence</span><span style="color:var(--hud-blue);">' +
      hltConf +
      "%</span></div>" +
      '<div class="conf-track"><div class="conf-fill f-hlt" style="width:0%" data-target="' +
      hltConf +
      '"></div></div>' +
      "</div>" +
      '<div style="font-family:var(--f-mono);font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:var(--text-muted);margin-bottom:4px;">OWNERSHIP NOTES</div>' +
      '<div class="ai-bubble">' +
      esc(ai.ownershipAnalysis || "Not yet analyzed") +
      "</div>" +
      '<div style="font-family:var(--f-mono);font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:var(--text-muted);margin:10px 0 4px;">HEALTH NOTES</div>' +
      '<div class="ai-bubble">' +
      esc(ai.healthAnalysis || "Not yet analyzed") +
      "</div>" +
      "</div>" +
      '<button id="analyze-btn" type="button" class="btn-analyze">' +
      "Run Gemini Analysis" +
      "</button>" +
      "</div>";
    setTimeout(function () {
      document
        .querySelectorAll(".conf-fill[data-target]")
        .forEach(function (bar) {
          bar.style.width = bar.getAttribute("data-target") + "%";
        });
    }, 120);
    var analyzeBtn = document.getElementById("analyze-btn");
    analyzeBtn.addEventListener("click", function () {
      analyzeSubmission(data._id, analyzeBtn);
    });
  }
  function loadRows() {
    var q = new URLSearchParams({
      page: String(state.page),
      limit: String(state.limit),
      status: state.status,
      type: state.type,
      aiState: state.aiState,
      q: state.q,
    });
    elements.rows.innerHTML =
      '<div class="state-box">' +
      '<div class="animal-pod p-cow" style="width:54px;height:54px;font-size:24px;">' +
      '<div class="pod-scan"></div><i class="bi bi-arrow-repeat"></i></div>' +
      '<div class="state-txt">Fetching submissions...</div>' +
      "</div>";
    return api("/verification/api/admin/ai-submissions?" + q.toString())
      .then(function (payload) {
        state.rows = payload.data || [];
        if (state.selectedId) {
          var stillExists = state.rows.some(function (r) {
            return r._id === state.selectedId;
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
          document.getElementById("detail-panel").innerHTML =
            '<div class="dp-placeholder">' +
            '<div class="dp-placeholder-ico"><i class="bi bi-search"></i></div>' +
            '<div style="font-family:var(--f-display);font-size:17px;font-weight:800;">Select a Submission</div>' +
            '<div style="font-size:13px;color:var(--text-muted);max-width:210px;line-height:1.65;">Choose a record from the list to view details.</div>' +
            "</div>";
        }
      })
      .catch(function (err) {
        elements.rows.innerHTML =
          '<div class="state-box">' +
          '<div class="state-ico" style="color:#f87171;"><i class="bi bi-exclamation-triangle"></i></div>' +
          '<div class="state-txt">' +
          esc(err.message) +
          "</div>" +
          "</div>";
      });
  }
  function loadDetail(id) {
    if (!id) return;
    document.getElementById("detail-panel").innerHTML =
      '<div class="dp-placeholder">' +
      '<div class="dp-placeholder-ico" style="font-size:26px;"><i class="bi bi-gear"></i></div>' +
      '<div style="font-size:13px;color:var(--text-muted);">Loading submission details...</div>' +
      "</div>";
    return api(
      "/verification/api/admin/ai-submissions/" + encodeURIComponent(id),
    )
      .then(function (payload) {
        renderDetail(payload.data);
      })
      .catch(function (err) {
        document.getElementById("detail-panel").innerHTML =
          '<div style="padding:20px;">' +
          '<div style="background:rgba(220,38,38,.1);border:1px solid rgba(220,38,38,.25);border-radius:12px;padding:16px;font-size:13px;color:#f87171;">' +
          esc(err.message) +
          "</div></div>";
      });
  }
  function analyzeSubmission(id, btn) {
    if (!id) return;
    btn.disabled = true;
    var orig = btn.innerHTML;
    btn.innerHTML =
      '<span class="spin-ring"></span> Running Gemini Analysis...';
    api(
      "/verification/api/admin/ai-submissions/" +
        encodeURIComponent(id) +
        "/analyze",
      {
        method: "POST",
        body: JSON.stringify({}),
      },
    )
      .then(function () {
        return loadRows();
      })
      .then(function () {
        return loadDetail(id);
      })
      .catch(function (err) {
        alert(err.message || "Analysis failed");
      })
      .finally(function () {
        btn.disabled = false;
        btn.innerHTML = orig;
      });
  }
  function setupEvents() {
    var searchTimer = null;
    elements.searchInput.addEventListener("input", function (e) {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () {
        state.q = e.target.value.trim();
        state.page = 1;
        loadRows();
      }, 350);
    });
    elements.statusFilter.addEventListener("change", function (e) {
      state.status = e.target.value;
      state.page = 1;
      loadRows();
    });
    elements.typeFilter.addEventListener("change", function (e) {
      state.type = e.target.value;
      state.page = 1;
      loadRows();
    });
    elements.aiFilter.addEventListener("change", function (e) {
      state.aiState = e.target.value;
      state.page = 1;
      loadRows();
    });
    elements.limitFilter.addEventListener("change", function (e) {
      state.limit = Number(e.target.value) || 12;
      state.page = 1;
      loadRows();
    });
    elements.refreshBtn.addEventListener("click", function () {
      elements.refreshBtn.classList.add("is-spinning");
      loadRows().finally(function () {
        elements.refreshBtn.classList.remove("is-spinning");
      });
    });
    elements.prevPage.addEventListener("click", function () {
      if (state.page > 1) {
        state.page--;
        loadRows();
      }
    });
    elements.nextPage.addEventListener("click", function () {
      if (state.page < state.totalPages) {
        state.page++;
        loadRows();
      }
    });
    elements.rows.addEventListener("click", function (e) {
      var btn = e.target.closest("button[data-id]");
      if (!btn) return;
      var id = btn.getAttribute("data-id");
      if (!id) return;
      state.selectedId = id;
      renderRows();
      loadDetail(id);
    });
  }
  setupEvents();
  loadRows();
})();
