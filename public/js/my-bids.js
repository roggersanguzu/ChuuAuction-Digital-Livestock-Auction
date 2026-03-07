
var userId = null;
var allBids = []; // Store all bids for filtering
document.addEventListener("DOMContentLoaded", function () {
  var bidsContainer = document.getElementById("bids-container");
  if (bidsContainer) {
    userId = bidsContainer.getAttribute("data-user-id");
  }
  if (!userId && typeof window.userId !== "undefined") {
    userId = window.userId;
  }
  if (userId && userId.length > 0) {
    loadBids();
  } else {
    var loading = document.getElementById("loading");
    if (loading) {
      loading.classList.add("hidden");
    }
    showError("User ID not found. Please log in again.");
  }
  setupSearchAndFilters();
});
function setupSearchAndFilters() {
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
  var filterBtns = document.querySelectorAll(".filter-btn");
  filterBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var parent = this.parentElement;
      parent.querySelectorAll(".filter-btn").forEach(function (b) {
        b.classList.remove("active");
      });
      this.classList.add("active");
      applyFilters();
    });
  });
  var animalTypeFilter = document.getElementById("animal-type-filter");
  if (animalTypeFilter) {
    animalTypeFilter.addEventListener("change", applyFilters);
  }
  var sortFilter = document.getElementById("sort-filter");
  if (sortFilter) {
    sortFilter.addEventListener("change", applyFilters);
  }
  var quickFilters = document.querySelectorAll(".quick-filter");
  quickFilters.forEach(function (btn) {
    btn.addEventListener("click", function () {
      this.classList.toggle("active");
      applyFilters();
    });
  });
  var clearFilters = document.getElementById("clear-filters");
  if (clearFilters) {
    clearFilters.addEventListener("click", function () {
      clearAllFilters();
    });
  }
}
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
  var quickFilters = {};
  document.querySelectorAll(".quick-filter.active").forEach(function (btn) {
    var field = btn.getAttribute("data-field");
    var value = btn.getAttribute("data-value");
    quickFilters[field] = value;
  });
  var filteredBids = allBids.filter(function (bid) {
    var auction = bid.auction || {};
    if (statusFilter !== "all" && bid.status !== statusFilter) {
      return false;
    }
    if (animalTypeFilter !== "all") {
      var animalType = (auction.animalType || "").toLowerCase();
      if (!animalType.includes(animalTypeFilter)) {
        return false;
      }
    }
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
  document.getElementById("results-count").textContent = filteredBids.length;
  renderBids(filteredBids);
}
function clearAllFilters() {
  var searchInput = document.getElementById("search-input");
  var clearSearch = document.getElementById("clear-search");
  if (searchInput) searchInput.value = "";
  if (clearSearch) clearSearch.classList.add("hidden");
  document.querySelectorAll(".filter-btn").forEach(function (btn) {
    btn.classList.remove("active");
    if (btn.getAttribute("data-value") === "all") {
      btn.classList.add("active");
    }
  });
  var animalTypeFilter = document.getElementById("animal-type-filter");
  if (animalTypeFilter) animalTypeFilter.value = "all";
  var sortFilter = document.getElementById("sort-filter");
  if (sortFilter) sortFilter.value = "newest";
  document.querySelectorAll(".quick-filter").forEach(function (btn) {
    btn.classList.remove("active");
  });
  applyFilters();
}
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
function formatCurrency(amount) {
  return "UGX " + new Intl.NumberFormat("en-UG").format(amount || 0);
}
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
function getAnimalImage(photos) {
  if (photos && photos.length > 0) {
    return photos[0].url;
  }
  return "/img/cow.png";
}
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
function renderBids(bids) {
  var container = document.getElementById("bids-container");
  var noResults = document.getElementById("no-results");
  var loading = document.getElementById("loading");
  var noBids = document.getElementById("no-bids");
  loading.classList.add("hidden");
  if (allBids.length === 0) {
    noBids.classList.remove("hidden");
    container.classList.add("hidden");
    noResults.classList.add("hidden");
    return;
  }
  if (bids.length === 0) {
    noResults.classList.remove("hidden");
    container.classList.add("hidden");
    noBids.classList.add("hidden");
    return;
  }
  noResults.classList.add("hidden");
  noBids.classList.add("hidden");
  container.classList.remove("hidden");
  container.innerHTML = bids.map(renderBidCard).join("");
}
async function loadBids() {
  try {
    var apiUrl = "/api/bids/user/" + userId + "/details";
    var response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error("HTTP error! status: " + response.status);
    }
    var result = await response.json();
    document.getElementById("loading").classList.add("hidden");
    if (!result.success) {
      showError("API Error: " + (result.message || "Unknown error"));
      return;
    }
    if (result.count === 0 || !result.data) {
      allBids = [];
      document.getElementById("stat-pending").textContent = "0";
      document.getElementById("stat-accepted").textContent = "0";
      document.getElementById("stat-rejected").textContent = "0";
      document.getElementById("stat-total").textContent = "0";
      document.getElementById("results-count").textContent = "0";
      document.getElementById("no-bids").classList.remove("hidden");
      return;
    }
    allBids = result.data;
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
    applyFilters();
  } catch (error) {
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

