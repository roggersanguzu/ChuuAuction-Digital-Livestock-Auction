// verificationStatus.js - Verification Status Dashboard
console.log("[VerificationStatus] Script loaded");

const API_BASE_URL = "/verification/api";

let allVerifications = [];
let filteredVerifications = [];
let isLoading = false;
let currentUser = null;
let isAdmin = false;

// Make currentUser and isAdmin globally accessible
window.currentUser = null;
window.isAdmin = false;

document.addEventListener("DOMContentLoaded", function () {
  loadCurrentUser();
});

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
      const role = currentUser.role ? currentUser.role.toLowerCase() : "";
      isAdmin = role === "administrator" || role === "admin";
      console.log("[VerificationStatus] Current user:", currentUser);
      console.log("[VerificationStatus] Is admin:", isAdmin);
      if (isAdmin) {
        document.getElementById("admin-banner").style.display = "flex";
      } else {
        document.getElementById("user-banner").style.display = "flex";
      }
      loadVerifications();
    } else {
      console.log("[VerificationStatus] No user logged in");
      loadVerifications();
    }
  } catch (error) {
    console.error("[VerificationStatus] Error loading user:", error);
    loadVerifications();
  }
}

async function loadVerifications() {
  if (isLoading) return;
  isLoading = true;
  showLoadingState();

  try {
    // Admins see all, regular users see only theirs
    const endpoint = isAdmin
      ? `${API_BASE_URL}/admin/all`
      : `${API_BASE_URL}/my-verifications`;

    console.log("[VerificationStatus] Fetching from:", endpoint);

    const response = await fetch(endpoint, {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    const result = await response.json();
    console.log("[VerificationStatus] Response:", result);
    console.log("[VerificationStatus] Current user ID:", currentUser?.id);

    if (result.success) {
      allVerifications = result.data || [];
      filteredVerifications = [...allVerifications];
      console.log(
        "[VerificationStatus] Loaded",
        allVerifications.length,
        "verifications",
      );
      updateStats(result.stats);
      applyFilters();
      hideLoadingState();
    } else {
      showErrorState(result.message || "Failed to load");
    }
  } catch (error) {
    console.error("[VerificationStatus] Error:", error);
    showErrorState("Failed to load: " + error.message);
  } finally {
    isLoading = false;
  }
}

function applyFilters() {
  const search =
    document.getElementById("search-input")?.value?.toLowerCase() || "";
  const status = document.getElementById("filter-status")?.value || "all";
  const type = document.getElementById("filter-type")?.value || "all";

  filteredVerifications = allVerifications.filter((v) => {
    if (status !== "all" && v.status !== status) return false;
    if (type !== "all" && v.verificationType !== type) return false;
    if (search) {
      const farmerName = v.farmer?.name || v.farmer?.email || "Guest";
      const id = v._id.toLowerCase();
      if (!farmerName.toLowerCase().includes(search) && !id.includes(search))
        return false;
    }
    return true;
  });

  displayVerifications();
  updateNavBadges();
}

function clearFilters() {
  document.getElementById("search-input").value = "";
  document.getElementById("filter-status").value = "all";
  document.getElementById("filter-type").value = "all";
  applyFilters();
}

function setNav(status, el) {
  document
    .querySelectorAll(".nav-item")
    .forEach((e) => e.classList.remove("active"));
  el.classList.add("active");
  document.getElementById("filter-status").value = status;
  applyFilters();
}

function updateNavBadges() {
  const counts = { all: allVerifications.length };
  allVerifications.forEach((v) => {
    counts[v.status] = (counts[v.status] || 0) + 1;
  });
  [
    "all",
    "pending",
    "processing",
    "verified",
    "rejected",
    "needs_review",
  ].forEach((k) => {
    const el = document.getElementById("nb-" + k);
    if (el) el.textContent = counts[k] || 0;
  });
}

window.clearFilters = clearFilters;
window.setNav = setNav;

function showLoadingState() {
  const container = document.getElementById("cards-container");
  if (container) {
    container.innerHTML =
      '<div class="state-box"><div class="spinner-ring"></div><div class="state-title">Loading...</div></div>';
  }
}

function hideLoadingState() {}

function showErrorState(msg) {
  const container = document.getElementById("cards-container");
  if (container) {
    container.innerHTML =
      '<div class="state-box"><div class="state-icon">⚠️</div><div class="state-title">Error</div><div class="state-sub">' +
      msg +
      "</div></div>";
  }
}

function updateStats(stats) {
  if (document.getElementById("st-total"))
    document.getElementById("st-total").textContent = stats?.total || 0;
  if (document.getElementById("st-pending"))
    document.getElementById("st-pending").textContent = stats?.pending || 0;
  if (document.getElementById("st-verified"))
    document.getElementById("st-verified").textContent = stats?.verified || 0;
  if (document.getElementById("st-rejected"))
    document.getElementById("st-rejected").textContent = stats?.rejected || 0;
}

function displayVerifications() {
  const container = document.getElementById("cards-container");
  if (!container) return;

  if (filteredVerifications.length === 0) {
    container.innerHTML =
      '<div class="state-box"><div class="state-icon">📭</div><div class="state-title">No verifications found</div><div class="state-sub">' +
      (isAdmin
        ? "No submissions yet from any users."
        : "You haven't submitted any verifications yet.") +
      "</div></div>";
    return;
  }

  container.innerHTML = '<div class="cards-grid" id="cards-grid"></div>';
  const grid = document.getElementById("cards-grid");
  if (grid) {
    filteredVerifications.forEach((v, i) => {
      grid.appendChild(createCard(v, i));
    });
  }
}

function createCard(v, idx) {
  const statusCfg = {
    pending: { icon: "⏳", label: "Pending", badge: "badge-pending" },
    processing: { icon: "⚙️", label: "Processing", badge: "badge-processing" },
    verified: { icon: "✅", label: "Verified", badge: "badge-verified" },
    rejected: { icon: "❌", label: "Rejected", badge: "badge-rejected" },
    needs_review: {
      icon: "🔍",
      label: "Needs Review",
      badge: "badge-needs_review",
    },
    incomplete: { icon: "📋", label: "Incomplete", badge: "badge-incomplete" },
  };
  const typeCfg = {
    ownership: { icon: "📜", label: "Ownership" },
    health: { icon: "💊", label: "Health" },
    both: { icon: "📦", label: "Both" },
  };
  const sc = statusCfg[v.status] || {
    icon: "📋",
    label: v.status,
    badge: "badge-incomplete",
  };
  const tc = typeCfg[v.verificationType] || {
    icon: "📋",
    label: v.verificationType,
  };

  let farmerName = "Guest / Anonymous";
  if (v.farmer) {
    if (typeof v.farmer === "object") {
      farmerName = v.farmer.name || v.farmer.email || "Unknown User";
    } else {
      farmerName = "User " + v.farmer.substring(0, 8);
    }
  }

  const dateStr = new Date(v.createdAt).toLocaleDateString();
  const shortId = v._id.slice(-8).toUpperCase();

  const card = document.createElement("div");
  card.className = "v-card s-" + v.status;
  card.style.animationDelay = idx * 0.04 + "s";

  let controls = isAdmin
    ? '<select class="foot-select" id="sel-' +
      v._id +
      '" data-cur="' +
      v.status +
      '">' +
      '<option value="pending">⏳ Pending</option>' +
      '<option value="processing">⚙️ Processing</option>' +
      '<option value="verified">✅ Verified</option>' +
      '<option value="rejected">❌ Rejected</option>' +
      '<option value="needs_review">🔍 Needs Review</option>' +
      "</select>" +
      '<button class="foot-btn foot-btn-save" id="upd-' +
      v._id +
      '" onclick="updateStatus(\'' +
      v._id +
      "')\">Save</button>"
    : '<div class="status-readonly">Status: ' +
      sc.icon +
      " " +
      sc.label +
      "</div>";

  card.innerHTML =
    '<div class="stripe"></div>' +
    '<div class="v-card-head">' +
    "<div>" +
    '<div class="v-card-id">#' +
    shortId +
    " · " +
    dateStr +
    "</div>" +
    '<div class="v-card-name">' +
    tc.icon +
    " " +
    tc.label +
    " Verification</div>" +
    "</div>" +
    '<span class="badge ' +
    sc.badge +
    '">' +
    sc.icon +
    " " +
    sc.label +
    "</span>" +
    "</div>" +
    '<div class="v-card-body">' +
    '<div class="info-row"><span class="info-label">Submitted By</span><span class="info-value">' +
    farmerName +
    "</span></div>" +
    '<div class="info-row"><span class="info-label">Type</span><span class="type-tag">' +
    tc.icon +
    " " +
    tc.label +
    "</span></div>" +
    '<div class="info-row"><span class="info-label">Documents</span>' +
    '<span class="doc-tag">📜 ' +
    (v.ownershipDocuments?.length || 0) +
    "</span>" +
    '<span class="doc-tag">💊 ' +
    (v.healthDocuments?.length || 0) +
    "</span>" +
    '<span class="doc-tag">📷 ' +
    (v.animalPhotos?.length || 0) +
    "</span>" +
    "</div></div>" +
    '<div class="v-card-foot">' +
    controls +
    '<button class="foot-btn foot-btn-view" onclick="openDetail(\'' +
    v._id +
    '\')"><i class="fas fa-external-link-alt"></i></button>' +
    "</div>";

  return card;
}

window.updateStatus = async function (id) {
  const sel = document.getElementById("sel-" + id);
  const btn = document.getElementById("upd-" + id);
  const newStatus = sel.value;
  const curStatus = sel.dataset.cur;
  if (newStatus === curStatus) {
    alert("Status is already " + newStatus);
    return;
  }
  btn.disabled = true;
  btn.textContent = "...";
  try {
    const response = await fetch("/verification/api/admin/" + id + "/status", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    const json = await response.json();
    if (!json.success) throw new Error(json.message);
    const rec = allVerifications.find((v) => v._id === id);
    if (rec) rec.status = newStatus;
    sel.dataset.cur = newStatus;
    alert("✅ Status updated to " + newStatus);
    loadVerifications();
  } catch (err) {
    alert("Failed: " + err.message);
    sel.value = curStatus;
  } finally {
    btn.disabled = false;
    btn.textContent = "Save";
  }
};

window.openDetail = function (id) {
  const v = allVerifications.find((r) => r._id === id);
  if (!v) return;

  const overlay = document.getElementById("detail-overlay");
  document.getElementById("modal-sub-id").textContent =
    "ID: " + v._id + " • " + new Date(v.createdAt).toLocaleString();

  let farmerName = "Guest / Anonymous";
  let farmerPhone = "N/A";
  let farmerEmail = "N/A";

  if (v.farmer) {
    if (typeof v.farmer === "object") {
      farmerName = v.farmer.name || v.farmer.email || "Unknown User";
      farmerPhone = v.farmer.phone || "N/A";
      farmerEmail = v.farmer.email || "N/A";
    } else {
      farmerName = "User " + v.farmer.substring(0, 8);
    }
  }

  document.getElementById("modal-body").innerHTML =
    '<div class="field-grid"><div class="field"><div class="field-label">Status</div><div class="field-value">' +
    v.status +
    '</div></div><div class="field"><div class="field-label">Type</div><div class="field-value">' +
    v.verificationType +
    '</div></div><div class="field"><div class="field-label">Submitted By</div><div class="field-value">' +
    farmerName +
    '</div></div><div class="field"><div class="field-label">Email</div><div class="field-value">' +
    farmerEmail +
    '</div></div><div class="field"><div class="field-label">Phone</div><div class="field-value">' +
    farmerPhone +
    '</div></div><div class="field"><div class="field-label">Date</div><div class="field-value">' +
    new Date(v.createdAt).toLocaleString() +
    "</div></div></div>";

  overlay.classList.add("open");
};

window.closeModal = function (event) {
  if (!event || event.target === document.getElementById("detail-overlay")) {
    document.getElementById("detail-overlay").classList.remove("open");
  }
};

window.refreshData = function () {
  loadVerifications();
};
