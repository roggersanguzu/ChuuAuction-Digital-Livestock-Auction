// my-bids.js - JavaScript for My Bids page with search and filters

var userId = null;
var allBids = []; // Store all bids for filtering

// Wait for DOM to be ready
document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM Content Loaded - Starting bid loading");

  var bidsContainer = document.getElementById("bids-container");
  if (bidsContainer) {
    userId = bidsContainer.getAttribute("data-user-id");
    console.log("User ID from container:", userId);
  }

  if (!userId && typeof window.userId !== "undefined") {
    userId = window.userId;
    console.log("User ID from window:", userId);
  }

  console.log("Final userId being used:", userId);
  console.log("userId is truthy:", !!userId);

  if (userId && userId.length > 0) {
    loadBids();
  } else {
    console.error("No userId found! Showing error.");
    var loading = document.getElementById("loading");
    if (loading) {
      loading.classList.add("hidden");
    }
    showError("User ID not found. Please log in again.");
  }

  // Set up event listeners for search and filters
  setupSearchAndFilters();
});

// Set up search and filter event listeners
function setupSearchAndFilters() {
  // Search input
  var searchInput = document.getElementById("search-input");
  var clearSearch = document.getElementById("clear-search");

  if (searchInput) {
    searchInput.addEventListener(
      "input",
      debounce(function () {
        var query = this.value.toLowerCase().trim();
        clearSearch.classList.toggle("hidden", query.length === 0);
        applyFilters();
      }, 300),
    );

    searchInput.addEventListener("keyup", function (e) {
      if (e.key === "Escape") {
        this.value = "";
        clearSearch.classList.add("hidden");
        applyFilters();
      }
    });
  }

  if (clearSearch) {
    clearSearch.addEventListener("click", function () {
      searchInput.value = "";
      this.classList.add("hidden");
      applyFilters();
    });
  }

  // Status filter buttons
  var filterBtns = document.querySelectorAll(".filter-btn");
  filterBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      // Remove active class from siblings
      var parent = this.parentElement;
      parent.querySelectorAll(".filter-btn").forEach(function (b) {
        b.classList.remove("active");
      });
      // Add active class to clicked button
      this.classList.add("active");
      applyFilters();
    });
  });

  // Animal type filter
  var animalTypeFilter = document.getElementById("animal-type-filter");
  if (animalTypeFilter) {
    animalTypeFilter.addEventListener("change", applyFilters);
  }

  // Sort filter
  var sortFilter = document.getElementById("sort-filter");
  if (sortFilter) {
    sortFilter.addEventListener("change", applyFilters);
  }

  // Quick filter buttons
  var quickFilters = document.querySelectorAll(".quick-filter");
  quickFilters.forEach(function (btn) {
    btn.addEventListener("click", function () {
      this.classList.toggle("active");
      applyFilters();
    });
  });

  // Clear filters button
  var clearFilters = document.getElementById("clear-filters");
  if (clearFilters) {
    clearFilters.addEventListener("click", function () {
      clearAllFilters();
    });
  }
}

// Apply all filters to bids
function applyFilters() {
  if (allBids.length === 0) return;

  var searchQuery = document
    .getElementById("search-input")
    .value.toLowerCase()
    .trim();
  var statusFilter = document
    .querySelector(".filter-btn.active")
    .getAttribute("data-value");
  var animalTypeFilter = document.getElementById("animal-type-filter").value;
  var sortFilter = document.getElementById("sort-filter").value;

  // Get quick filter states
  var quickFilters = {};
  document.querySelectorAll(".quick-filter.active").forEach(function (btn) {
    var field = btn.getAttribute("data-field");
    var value = btn.getAttribute("data-value");
    quickFilters[field] = value;
  });

  // Filter bids
  var filteredBids = allBids.filter(function (bid) {
    var auction = bid.auction || {};

    // Status filter
    if (statusFilter !== "all" && bid.status !== statusFilter) {
      return false;
    }

    // Animal type filter
    if (animalTypeFilter !== "all") {
      var animalType = (auction.animalType || "").toLowerCase();
      if (!animalType.includes(animalTypeFilter)) {
        return false;
      }
    }

    // Search query filter
    if (searchQuery) {
      var searchFields = [
        auction.animalType || "",
        auction.breed || "",
        auction.location || "",
        bid.bidderName || "",
        bid.notes || "",
      ]
        .join(" ")
        .toLowerCase();

      if (!searchFields.includes(searchQuery)) {
        return false;
      }
    }

    // Quick filters
    if (quickFilters.hasNotes === "true" && !bid.notes) {
      return false;
    }
    if (quickFilters.hasPhotos === "true") {
      var hasPhotos = auction.photos && auction.photos.length > 0;
      if (!hasPhotos) return false;
    }
    if (quickFilters.minAmount) {
      if (bid.amount < parseInt(quickFilters.minAmount)) return false;
    }
    if (quickFilters.maxAmount) {
      if (bid.amount > parseInt(quickFilters.maxAmount)) return false;
    }

    return true;
  });

  // Sort bids
  filteredBids.sort(function (a, b) {
    switch (sortFilter) {
      case "newest":
        return new Date(b.createdAt) - new Date(a.createdAt);
      case "oldest":
        return new Date(a.createdAt) - new Date(b.createdAt);
      case "highest":
        return b.amount - a.amount;
      case "lowest":
        return a.amount - b.amount;
      default:
        return 0;
    }
  });

  // Update results count
  document.getElementById("results-count").textContent = filteredBids.length;

  // Render filtered bids
  renderBids(filteredBids);
}

// Clear all filters
function clearAllFilters() {
  // Reset search
  var searchInput = document.getElementById("search-input");
  var clearSearch = document.getElementById("clear-search");
  if (searchInput) searchInput.value = "";
  if (clearSearch) clearSearch.classList.add("hidden");

  // Reset status filters
  document.querySelectorAll(".filter-btn").forEach(function (btn) {
    btn.classList.remove("active");
    if (btn.getAttribute("data-value") === "all") {
      btn.classList.add("active");
    }
  });

  // Reset animal type
  var animalTypeFilter = document.getElementById("animal-type-filter");
  if (animalTypeFilter) animalTypeFilter.value = "all";

  // Reset sort
  var sortFilter = document.getElementById("sort-filter");
  if (sortFilter) sortFilter.value = "newest";

  // Reset quick filters
  document.querySelectorAll(".quick-filter").forEach(function (btn) {
    btn.classList.remove("active");
  });

  // Apply filters (which will show all)
  applyFilters();
}

// Debounce function for search
function debounce(func, wait) {
  var timeout;
  return function executedFunction() {
    var context = this;
    var args = arguments;
    var later = function () {
      timeout = null;
      func.apply(context, args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Format currency function
function formatCurrency(amount) {
  return "UGX " + new Intl.NumberFormat("en-UG").format(amount || 0);
}

// Format date function
function formatDate(dateStr) {
  var date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Get status badge
function getStatusBadge(status) {
  var statusMap = {
    pending: {
      class: "status-pending",
      icon: "bi-hourglass-split",
      text: "Pending",
    },
    accepted: {
      class: "status-accepted",
      icon: "bi-trophy-fill",
      text: "Winner",
    },
    rejected: {
      class: "status-rejected",
      icon: "bi-x-circle-fill",
      text: "Rejected",
    },
  };
  var s = statusMap[status] || statusMap.pending;
  return (
    '<span class="px-3 py-1 rounded-full text-xs font-bold border ' +
    s.class +
    '"><i class="bi ' +
    s.icon +
    ' mr-1"></i>' +
    s.text +
    "</span>"
  );
}

// Get animal image
function getAnimalImage(photos) {
  if (photos && photos.length > 0) {
    return photos[0].url;
  }
  return "/img/cow.png";
}

// Render bid card
function renderBidCard(bid) {
  var auction = bid.auction || {};
  var photoUrl = getAnimalImage(auction.photos);
  var animalType = auction.animalType || "Livestock";
  var isWinner = bid.status === "accepted";
  var paymentButtonHtml = isWinner
    ? '<a href="/dashboard/payment?bidId=' +
      bid._id +
      '" class="px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 hover:shadow-lg hover:shadow-green-500/30 transition text-sm font-semibold"><i class="bi bi-credit-card mr-2"></i>Proceed to Payment</a>'
    : "";

  return (
    '<div class="bid-card glass-strong border border-gray-800 rounded-2xl p-6 transition-all duration-300 ' +
    (isWinner ? "ring-2 ring-green-500/50" : "") +
    '">' +
    '<div class="flex flex-col lg:flex-row gap-6">' +
    '<div class="lg:w-64 h-48 rounded-xl overflow-hidden relative flex-shrink-0">' +
    '<img src="' +
    photoUrl +
    '" alt="' +
    animalType +
    '" class="w-full h-full object-cover" onerror="this.src=\'/img/cow.png\'">' +
    '<div class="absolute top-3 right-3">' +
    getStatusBadge(bid.status) +
    "</div>" +
    (isWinner
      ? '<div class="absolute top-3 left-3 px-3 py-1 rounded-full bg-green-500 text-white text-xs font-bold flex items-center gap-1"><i class="bi bi-trophy-fill"></i> WINNER</div>'
      : "") +
    "</div>" +
    '<div class="flex-1">' +
    '<div class="flex items-start justify-between mb-4">' +
    "<div>" +
    '<h3 class="text-xl font-bold font-display mb-2">' +
    animalType +
    (auction.breed ? " - " + auction.breed : "") +
    "</h3>" +
    '<div class="flex flex-wrap gap-2 mb-3">' +
    (auction.sex
      ? '<span class="px-2 py-1 rounded-lg bg-gray-800/50 text-xs"><i class="bi bi-gender-' +
        auction.sex.toLowerCase() +
        ' mr-1"></i>' +
        auction.sex +
        "</span>"
      : "") +
    (auction.weight
      ? '<span class="px-2 py-1 rounded-lg bg-gray-800/50 text-xs"><i class="bi bi-activity mr-1"></i>' +
        auction.weight +
        "kg</span>"
      : "") +
    (auction.location
      ? '<span class="px-2 py-1 rounded-lg bg-gray-800/50 text-xs"><i class="bi bi-geo-alt mr-1"></i>' +
        auction.location +
        "</span>"
      : "") +
    "</div>" +
    "</div>" +
    '<div class="text-right">' +
    '<p class="text-sm text-gray-400 mb-1">Your Bid Amount</p>' +
    '<p class="text-3xl font-black ' +
    (isWinner ? "text-green-500" : "text-orange-500") +
    '">' +
    formatCurrency(bid.amount) +
    "</p>" +
    "</div>" +
    "</div>" +
    (bid.notes
      ? '<div class="p-3 rounded-lg bg-gray-800/30 border border-gray-700/50 mb-4"><p class="text-sm text-gray-300"><i class="bi bi-chat-quote text-orange-500 mr-2"></i>' +
        bid.notes +
        "</p></div>"
      : "") +
    '<div class="flex items-center justify-between pt-4 border-t border-gray-800">' +
    '<div class="text-sm text-gray-500"><i class="bi bi-clock mr-1"></i> Bid placed: ' +
    formatDate(bid.createdAt) +
    "</div>" +
    '<div class="flex items-center gap-2">' +
    paymentButtonHtml +
    '<a href="/auctions/animalList" class="px-4 py-2 rounded-lg glass border border-gray-700 hover:border-orange-500 transition text-sm"><i class="bi bi-eye mr-2"></i>View Auction</a>' +
    "</div>" +
    "</div>" +
    "</div>" +
    "</div>" +
    "</div>"
  );
}

// Render bids to container
function renderBids(bids) {
  var container = document.getElementById("bids-container");
  var noResults = document.getElementById("no-results");
  var loading = document.getElementById("loading");
  var noBids = document.getElementById("no-bids");

  // Hide loading
  loading.classList.add("hidden");

  // Check if we have bids at all
  if (allBids.length === 0) {
    noBids.classList.remove("hidden");
    container.classList.add("hidden");
    noResults.classList.add("hidden");
    return;
  }

  // Check if filtered results
  if (bids.length === 0) {
    noResults.classList.remove("hidden");
    container.classList.add("hidden");
    noBids.classList.add("hidden");
    return;
  }

  // Show bids
  noResults.classList.add("hidden");
  noBids.classList.add("hidden");
  container.classList.remove("hidden");

  container.innerHTML = bids.map(renderBidCard).join("");
}

// Fetch and render bids
async function loadBids() {
  try {
    console.log("Fetching bids from API...");
    console.log("User ID being used:", userId);
    console.log("User ID type:", typeof userId);

    var apiUrl = "/api/bids/user/" + userId + "/details";
    console.log("API URL:", apiUrl);

    var response = await fetch(apiUrl);

    console.log("Response status:", response.status);
    console.log("Response ok:", response.ok);

    if (!response.ok) {
      throw new Error("HTTP error! status: " + response.status);
    }

    var result = await response.json();

    console.log("API Response:", result);

    document.getElementById("loading").classList.add("hidden");

    if (!result.success) {
      console.error("API returned error:", result.message);
      showError("API Error: " + (result.message || "Unknown error"));
      return;
    }

    if (result.count === 0 || !result.data) {
      // Show no bids message
      allBids = [];
      document.getElementById("stat-pending").textContent = "0";
      document.getElementById("stat-accepted").textContent = "0";
      document.getElementById("stat-rejected").textContent = "0";
      document.getElementById("stat-total").textContent = "0";
      document.getElementById("results-count").textContent = "0";

      document.getElementById("no-bids").classList.remove("hidden");
      console.log("No bids found for userId:", userId);
      return;
    }

    console.log("Bids loaded:", result.count);
    console.log("Sample bid data:", result.data[0]);

    // Store all bids for filtering
    allBids = result.data;

    // Update stats
    var pending = allBids.filter(function (b) {
      return b.status === "pending";
    }).length;
    var accepted = allBids.filter(function (b) {
      return b.status === "accepted";
    }).length;
    var rejected = allBids.filter(function (b) {
      return b.status === "rejected";
    }).length;

    document.getElementById("stat-pending").textContent = pending;
    document.getElementById("stat-accepted").textContent = accepted;
    document.getElementById("stat-rejected").textContent = rejected;
    document.getElementById("stat-total").textContent = allBids.length;
    document.getElementById("results-count").textContent = allBids.length;

    // Apply initial filters (show all)
    applyFilters();
  } catch (error) {
    console.error("Error loading bids:", error);
    console.error("Error details:", error.stack);
    showError("Error loading bids: " + error.message);
  }
}

function showError(message) {
  var loading = document.getElementById("loading");
  if (loading) {
    loading.innerHTML =
      '<div class="text-red-500"><i class="bi bi-exclamation-triangle text-2xl mb-2"></i><p>' +
      message +
      "</p></div>";
  }
}

