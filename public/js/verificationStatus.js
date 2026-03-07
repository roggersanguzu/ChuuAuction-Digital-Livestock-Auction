const API_BASE_URL = "/verification/api";
let allVerifications = [];
let filteredVerifications = [];
let isLoading = false;
let currentUser = null;
let isAdmin = false;
let activeNavStatus = "all";
let systemOnlineSince = Date.now();
window.currentUser = null;
window.isAdmin = false;

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatStatus(status) {
  const key = String(status || "").toLowerCase();
  const map = {
    pending: "Pending Review",
    processing: "In Processing",
    verified: "Verified and Approved",
    rejected: "Rejected",
    needs_review: "Needs Manual Review",
    incomplete: "Incomplete",
  };
  return map[key] || "Unknown";
}

function getStatusMeta(status) {
  const key = String(status || "").toLowerCase();
  const map = {
    pending: {
      badge: "badge-pending",
      label: "Pending",
      detail: "Waiting for review and validation by the moderation team.",
      nextAction: "Check document clarity and ensure required files are present.",
    },
    processing: {
      badge: "badge-processing",
      label: "Processing",
      detail: "Analysis is running on submitted data and attachments.",
      nextAction: "Wait for analysis to finish or refresh for latest updates.",
    },
    verified: {
      badge: "badge-verified",
      label: "Verified",
      detail: "Submission passed verification checks and is approved.",
      nextAction: "No action needed. This verification is active and valid.",
    },
    rejected: {
      badge: "badge-rejected",
      label: "Rejected",
      detail: "Submission did not satisfy required verification checks.",
      nextAction: "Upload updated valid documents and resubmit immediately.",
    },
    needs_review: {
      badge: "badge-needs_review",
      label: "Needs Review",
      detail: "Automated checks flagged this record for manual validation.",
      nextAction: "Admin should inspect attachments and decide final status.",
    },
    incomplete: {
      badge: "badge-incomplete",
      label: "Incomplete",
      detail: "Submission is missing one or more required data points.",
      nextAction: "Add missing documents and required fields.",
    },
  };
  return map[key] || map.incomplete;
}

function updateSystemState(state) {
  const label = document.getElementById("hdr-system-state");
  const dot = document.querySelector(".hdr-status .status-dot");
  if (!label || !dot) return;
  if (state === "error") {
    label.textContent = "SYSTEM DEGRADED";
    dot.style.background = "var(--red)";
    dot.style.boxShadow = "0 0 12px rgba(248,113,113,0.8)";
    return;
  }
  if (state === "loading") {
    label.textContent = "SYNCING DATA";
    dot.style.background = "var(--amber)";
    dot.style.boxShadow = "0 0 12px rgba(245,158,11,0.8)";
    return;
  }
  label.textContent = "SYSTEM ONLINE";
  dot.style.background = "var(--green)";
  dot.style.boxShadow = "0 0 12px rgba(74,222,128,0.8)";
}

function updateLastSync() {
  const syncEl = document.getElementById("last-sync");
  if (syncEl) syncEl.textContent = new Date().toLocaleTimeString();
}

function formatUptime(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const h = String(hours).padStart(2, "0");
  const m = String(minutes).padStart(2, "0");
  const s = String(seconds).padStart(2, "0");
  return "UP " + h + ":" + m + ":" + s;
}

function updateHeaderTimers() {
  const clockEl = document.getElementById("hdr-clock");
  if (clockEl) clockEl.textContent = new Date().toLocaleTimeString();
  const uptimeEl = document.getElementById("hdr-uptime");
  if (uptimeEl) uptimeEl.textContent = formatUptime(Date.now() - systemOnlineSince);
}

function startHeaderTimers() {
  updateHeaderTimers();
  setInterval(updateHeaderTimers, 1000);
}

function resolveFarmer(v) {
  let farmerName = "Guest / Anonymous";
  let farmerPhone = "N/A";
  let farmerEmail = "N/A";
  if (v.farmer) {
    if (typeof v.farmer === "object") {
      farmerName = v.farmer.name || v.farmer.email || "Unknown User";
      farmerPhone = v.farmer.phone || "N/A";
      farmerEmail = v.farmer.email || "N/A";
    } else {
      farmerName = "User " + String(v.farmer).substring(0, 8);
    }
  }
  return { farmerName, farmerPhone, farmerEmail };
}

function getCountByStatus(arr, status) {
  return arr.filter((v) => String(v.status || "") === status).length;
}

async function loadCurrentUser() {
  try {
    const response = await fetch("/verification/api/current-user", {
      method: "GET",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });
    const data = await response.json();
    if (response.ok && data.success && data.user) {
      currentUser = data.user;
      window.currentUser = data.user;
      const role = String(currentUser.role || "").toLowerCase();
      isAdmin = role === "administrator" || role === "admin";
      window.isAdmin = isAdmin;
      const adminBanner = document.getElementById("admin-banner");
      const userBanner = document.getElementById("user-banner");
      if (isAdmin && adminBanner) adminBanner.style.display = "flex";
      if (!isAdmin && userBanner) userBanner.style.display = "flex";
    }
  } catch (error) {
  } finally {
    loadVerifications();
  }
}

function showLoadingState() {
  const container = document.getElementById("cards-container");
  if (!container) return;
  container.innerHTML =
    '<div class="state-box"><div class="spinner-ring"></div><div class="state-title">Loading verification records</div><div class="state-sub">Synchronizing live submissions and analytics</div></div>';
}

function showErrorState(msg) {
  const container = document.getElementById("cards-container");
  if (!container) return;
  container.innerHTML =
    '<div class="state-box"><div class="state-title">Unable to load records</div><div class="state-sub">' +
    escapeHtml(msg) +
    "</div></div>";
}

function updateStats(stats) {
  const total = Number(stats?.total || allVerifications.length || 0);
  const pending = Number(
    stats?.pending || getCountByStatus(allVerifications, "pending"),
  );
  const verified = Number(
    stats?.verified || getCountByStatus(allVerifications, "verified"),
  );
  const rejected = Number(
    stats?.rejected || getCountByStatus(allVerifications, "rejected"),
  );
  const processing = Number(
    stats?.processing || getCountByStatus(allVerifications, "processing"),
  );
  const processed = verified + rejected;
  const rate = total > 0 ? Math.round((verified / total) * 100) : 0;
  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };
  setText("st-total", total);
  setText("st-pending", pending);
  setText("st-verified", verified);
  setText("st-rejected", rejected);
  setText("sb-rate", rate + "%");
  setText("sb-processed", processed);
  const rateBar = document.getElementById("sb-rate-bar");
  if (rateBar) rateBar.style.width = rate + "%";
  const setTrend = (id, value) => {
    const node = document.getElementById(id);
    if (!node) return;
    const prefix = value > 0 ? "up " : value < 0 ? "down " : "flat ";
    const pct = Math.abs(value);
    node.textContent = prefix + pct + "%";
    node.className =
      "stat-trend " +
      (value > 0 ? "trend-up" : value < 0 ? "trend-down" : "trend-flat");
  };
  const totalTrend = total > 0 ? Math.round((processing / Math.max(total, 1)) * 10) : 0;
  setTrend("tr-total", totalTrend);
  setTrend("tr-pending", pending > 0 ? -Math.min(9, pending) : 0);
  setTrend("tr-verified", verified > 0 ? Math.min(12, verified) : 0);
  setTrend("tr-rejected", rejected > 0 ? -Math.min(12, rejected) : 0);
}

function updateNavBadges() {
  const counts = { all: allVerifications.length };
  allVerifications.forEach((v) => {
    const s = String(v.status || "");
    counts[s] = (counts[s] || 0) + 1;
  });
  [
    "all",
    "pending",
    "processing",
    "verified",
    "rejected",
    "needs_review",
    "incomplete",
  ].forEach((k) => {
    const el = document.getElementById("nb-" + k);
    if (el) el.textContent = String(counts[k] || 0);
  });
}

function highlightActiveNav() {
  document.querySelectorAll(".nav-item[data-nav]").forEach((el) => {
    el.classList.toggle("active", el.getAttribute("data-nav") === activeNavStatus);
  });
}

function bindTopStatCards() {
  document.querySelectorAll(".stat-card[data-stat-filter]").forEach((card) => {
    if (card.dataset.bound === "1") return;
    card.dataset.bound = "1";
    const activate = () => {
      const target = card.getAttribute("data-stat-filter") || "all";
      const filter = document.getElementById("filter-status");
      if (filter) filter.value = target;
      activeNavStatus = target;
      highlightActiveNav();
      applyFilters();
      document
        .querySelectorAll(".stat-card[data-stat-filter]")
        .forEach((node) => node.classList.remove("is-active"));
      card.classList.add("is-active");
    };
    card.addEventListener("click", activate);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activate();
      }
    });
  });
}

function createCard(v, idx) {
  const status = getStatusMeta(v.status);
  const types = {
    ownership: { label: "Ownership" },
    health: { label: "Health" },
    both: { label: "Ownership + Health" },
  };
  const type = types[v.verificationType] || {
    label: String(v.verificationType || "Unknown"),
  };
  const farmer = resolveFarmer(v);
  const dateStr = new Date(v.createdAt).toLocaleDateString();
  const shortId = String(v._id || "").slice(-8).toUpperCase();
  const ownershipCount = Array.isArray(v.ownershipDocuments)
    ? v.ownershipDocuments.length
    : 0;
  const healthCount = Array.isArray(v.healthDocuments)
    ? v.healthDocuments.length
    : 0;
  const photoCount = Array.isArray(v.animalPhotos) ? v.animalPhotos.length : 0;
  const card = document.createElement("div");
  card.className = "v-card s-" + String(v.status || "incomplete");
  card.style.animationDelay = idx * 0.04 + "s";
  let controls = "";
  if (isAdmin) {
    controls =
      '<select class="foot-select" id="sel-' +
      v._id +
      '" data-cur="' +
      escapeHtml(v.status) +
      '">' +
      '<option value="pending">Pending</option>' +
      '<option value="processing">Processing</option>' +
      '<option value="verified">Verified</option>' +
      '<option value="rejected">Rejected</option>' +
      '<option value="needs_review">Needs Review</option>' +
      '<option value="incomplete">Incomplete</option>' +
      "</select>" +
      '<button class="foot-btn foot-btn-save" id="upd-' +
      v._id +
      '" onclick="updateStatus(\'' +
      v._id +
      "')\">Save</button>";
  } else {
    controls = '<div class="status-readonly">' + escapeHtml(status.label) + "</div>";
  }
  card.innerHTML =
    '<div class="v-stripe"></div>' +
    '<div class="v-card-head">' +
    '<div><div class="v-card-id">#' +
    shortId +
    " · " +
    dateStr +
    "</div>" +
    '<div class="v-card-name">' +
    escapeHtml(type.label) +
    " Verification</div></div>" +
    '<span class="status-badge ' +
    status.badge +
    '">' +
    escapeHtml(status.label) +
    "</span>" +
    "</div>" +
    '<div class="v-card-body">' +
    '<div class="info-row"><span class="info-label">Submitted By</span><span class="info-value">' +
    escapeHtml(farmer.farmerName) +
    "</span></div>" +
    '<div class="info-row"><span class="info-label">Type</span><span class="type-tag">' +
    escapeHtml(type.label) +
    "</span></div>" +
    '<div class="info-row"><span class="info-label">Documents</span>' +
    '<span class="doc-tag"><i class="fas fa-scroll"></i> ' +
    ownershipCount +
    " Ownership</span>" +
    '<span class="doc-tag"><i class="fas fa-heartbeat"></i> ' +
    healthCount +
    " Health</span>" +
    '<span class="doc-tag"><i class="fas fa-camera"></i> ' +
    photoCount +
    " Photos</span></div>" +
    '<div class="info-row"><span class="info-label">Status Detail</span><span class="info-value">' +
    escapeHtml(status.detail) +
    "</span></div>" +
    "</div>" +
    '<div class="v-card-foot">' +
    controls +
    '<button class="foot-btn foot-btn-view" onclick="openDetail(\'' +
    v._id +
    '\')"><i class="fas fa-file-alt"></i>Details</button>' +
    "</div>";
  const sel = card.querySelector("#sel-" + v._id);
  if (sel) sel.value = String(v.status || "pending");
  return card;
}

function displayVerifications() {
  const container = document.getElementById("cards-container");
  if (!container) return;
  const result = document.getElementById("result-count");
  if (result) {
    result.textContent =
      String(filteredVerifications.length) +
      " result" +
      (filteredVerifications.length === 1 ? "" : "s");
  }
  if (!filteredVerifications.length) {
    container.innerHTML =
      '<div class="state-box"><div class="state-title">No records found</div><div class="state-sub">No submissions match the current filter set.</div></div>';
    return;
  }
  container.innerHTML = '<div class="cards-grid" id="cards-grid"></div>';
  const grid = document.getElementById("cards-grid");
  filteredVerifications.forEach((v, i) => {
    grid.appendChild(createCard(v, i));
  });
}

function applyFilters() {
  const search = String(
    document.getElementById("search-input")?.value || "",
  )
    .toLowerCase()
    .trim();
  const status = String(document.getElementById("filter-status")?.value || "all");
  const type = String(document.getElementById("filter-type")?.value || "all");
  filteredVerifications = allVerifications.filter((v) => {
    if (status !== "all" && String(v.status || "") !== status) return false;
    if (type !== "all" && String(v.verificationType || "") !== type) return false;
    if (search) {
      const farmer = resolveFarmer(v);
      const key = [
        farmer.farmerName,
        farmer.farmerEmail,
        v._id,
        v.verificationType,
        v.status,
      ]
        .join(" ")
        .toLowerCase();
      if (!key.includes(search)) return false;
    }
    return true;
  });
  displayVerifications();
  updateNavBadges();
}

async function loadVerifications() {
  if (isLoading) return;
  isLoading = true;
  updateSystemState("loading");
  showLoadingState();
  try {
    const endpoint = isAdmin
      ? API_BASE_URL + "/admin/all"
      : API_BASE_URL + "/my-verifications";
    const response = await fetch(endpoint, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.message || "Failed to load records");
    allVerifications = Array.isArray(result.data) ? result.data : [];
    filteredVerifications = allVerifications.slice();
    updateStats(result.stats || {});
    updateNavBadges();
    applyFilters();
    updateLastSync();
    updateSystemState("online");
  } catch (error) {
    showErrorState(error.message || "Failed to load records");
    updateSystemState("error");
  } finally {
    isLoading = false;
  }
}

window.updateStatus = async function (id) {
  const sel = document.getElementById("sel-" + id);
  const btn = document.getElementById("upd-" + id);
  if (!sel || !btn) return;
  const newStatus = String(sel.value || "");
  const curStatus = String(sel.dataset.cur || "");
  if (!newStatus || newStatus === curStatus) return;
  btn.disabled = true;
  btn.textContent = "Saving...";
  try {
    const response = await fetch("/verification/api/admin/" + id + "/status", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    const json = await response.json();
    if (!json.success) throw new Error(json.message || "Status update failed");
    const rec = allVerifications.find((v) => String(v._id) === String(id));
    if (rec) rec.status = newStatus;
    sel.dataset.cur = newStatus;
    applyFilters();
    updateStats({
      total: allVerifications.length,
      pending: getCountByStatus(allVerifications, "pending"),
      verified: getCountByStatus(allVerifications, "verified"),
      rejected: getCountByStatus(allVerifications, "rejected"),
      processing: getCountByStatus(allVerifications, "processing"),
    });
    updateLastSync();
  } catch (error) {
    sel.value = curStatus;
  } finally {
    btn.disabled = false;
    btn.textContent = "Save";
  }
};

window.openDetail = function (id) {
  const v = allVerifications.find((r) => String(r._id) === String(id));
  if (!v) return;
  const overlay = document.getElementById("detail-overlay");
  const modalId = document.getElementById("modal-sub-id");
  const body = document.getElementById("modal-body");
  if (!overlay || !modalId || !body) return;
  const farmer = resolveFarmer(v);
  const status = getStatusMeta(v.status);
  const ownershipCount = Array.isArray(v.ownershipDocuments)
    ? v.ownershipDocuments.length
    : 0;
  const healthCount = Array.isArray(v.healthDocuments)
    ? v.healthDocuments.length
    : 0;
  const photoCount = Array.isArray(v.animalPhotos) ? v.animalPhotos.length : 0;
  const isGood = String(v.status || "").toLowerCase() === "verified";
  const intelTone = isGood ? "success" : "warning";
  const typeLabelMap = {
    ownership: "Ownership",
    health: "Health",
    both: "Ownership + Health",
  };
  const typeLabel = typeLabelMap[String(v.verificationType || "").toLowerCase()] || String(v.verificationType || "Unknown");
  modalId.textContent = "ID: " + v._id + " • " + new Date(v.createdAt).toLocaleString();
  body.innerHTML =
    '<div class="modal-hero">' +
    '<div class="modal-hero-card">' +
    '<div class="modal-hero-title">Verification Summary</div>' +
    '<div class="modal-hero-sub">' + escapeHtml(farmer.farmerName) + " • " + escapeHtml(typeLabel) + '</div>' +
    '<div style="margin-top:10px"><span class="modal-status-pill ' + status.badge + '">' + escapeHtml(formatStatus(v.status)) + "</span></div>" +
    "</div>" +
    '<div class="modal-hero-card">' +
    '<div class="modal-hero-title" style="font-size:14px">Submission Timeline</div>' +
    '<div class="modal-hero-sub">Created: ' + new Date(v.createdAt).toLocaleString() + "</div>" +
    '<div class="modal-hero-sub" style="margin-top:6px">Record ID: #' + escapeHtml(String(v._id).slice(-8).toUpperCase()) + "</div>" +
    "</div>" +
    "</div>" +
    '<div class="modal-sec-hdr">Core Details</div>' +
    '<div class="field-grid">' +
    '<div class="field"><div class="field-label">Status</div><div class="field-value">' +
    escapeHtml(formatStatus(v.status)) +
    "</div></div>" +
    '<div class="field"><div class="field-label">Verification Type</div><div class="field-value">' +
    escapeHtml(typeLabel) +
    "</div></div>" +
    '<div class="field"><div class="field-label">Submitted By</div><div class="field-value">' +
    escapeHtml(farmer.farmerName) +
    "</div></div>" +
    '<div class="field"><div class="field-label">Email</div><div class="field-value">' +
    escapeHtml(farmer.farmerEmail) +
    "</div></div>" +
    '<div class="field"><div class="field-label">Phone</div><div class="field-value">' +
    escapeHtml(farmer.farmerPhone) +
    "</div></div>" +
    '<div class="field"><div class="field-label">Submitted At</div><div class="field-value">' +
    new Date(v.createdAt).toLocaleString() +
    "</div></div>" +
    '<div class="field"><div class="field-label">Ownership Documents</div><div class="field-value">' +
    ownershipCount +
    " files</div></div>" +
    '<div class="field"><div class="field-label">Health Documents</div><div class="field-value">' +
    healthCount +
    " files</div></div>" +
    '<div class="field"><div class="field-label">Animal Photos</div><div class="field-value">' +
    photoCount +
    " files</div></div>" +
    "</div>" +
    '<div class="modal-sec-hdr" style="margin-top:14px">Documents Snapshot</div>' +
    '<div class="modal-kpi-grid">' +
    '<div class="modal-kpi"><div class="modal-kpi-label">Ownership Files</div><div class="modal-kpi-value">' + ownershipCount + "</div></div>" +
    '<div class="modal-kpi"><div class="modal-kpi-label">Health Files</div><div class="modal-kpi-value">' + healthCount + "</div></div>" +
    '<div class="modal-kpi"><div class="modal-kpi-label">Animal Photos</div><div class="modal-kpi-value">' + photoCount + "</div></div>" +
    "</div>" +
    '<div class="modal-sec-hdr" style="margin-top:14px">Status Intelligence</div>' +
    '<div class="modal-intel-grid">' +
    '<div class="modal-intel-card ' + intelTone + '"><div class="modal-intel-label">Current Meaning</div><div class="modal-intel-value">' + escapeHtml(status.detail) + "</div></div>" +
    '<div class="modal-intel-card"><div class="modal-intel-label">Recommended Next Action</div><div class="modal-intel-value">' + escapeHtml(status.nextAction) + "</div></div>" +
    "</div>";
  overlay.classList.add("open");
};

window.closeModal = function (event) {
  const overlay = document.getElementById("detail-overlay");
  if (!overlay) return;
  if (!event || event.target === overlay) overlay.classList.remove("open");
};

window.refreshData = function () {
  loadVerifications();
};

window.clearFilters = function () {
  const search = document.getElementById("search-input");
  const fs = document.getElementById("filter-status");
  const ft = document.getElementById("filter-type");
  if (search) search.value = "";
  if (fs) fs.value = "all";
  if (ft) ft.value = "all";
  activeNavStatus = "all";
  highlightActiveNav();
  applyFilters();
};

window.setNav = function (status, el) {
  activeNavStatus = String(status || "all");
  const fs = document.getElementById("filter-status");
  if (fs) fs.value = activeNavStatus;
  highlightActiveNav();
  applyFilters();
  document.querySelectorAll(".stat-card[data-stat-filter]").forEach((node) => {
    node.classList.toggle(
      "is-active",
      node.getAttribute("data-stat-filter") === activeNavStatus,
    );
  });
  if (el) {
    document
      .querySelectorAll(".nav-item[data-nav]")
      .forEach((node) => node.classList.remove("active"));
    el.classList.add("active");
  }
};

window.setTypeFilter = function (type) {
  const sel = document.getElementById("filter-type");
  if (sel) sel.value = String(type || "all");
  applyFilters();
};

document.addEventListener("DOMContentLoaded", function () {
  bindTopStatCards();
  const firstStat = document.querySelector('.stat-card[data-stat-filter="all"]');
  if (firstStat) firstStat.classList.add("is-active");
  startHeaderTimers();
  updateSystemState("loading");
  loadCurrentUser();
});
