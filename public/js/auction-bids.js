function parseBoolean(value) {
  return String(value || "").toLowerCase() === "true";
}
function getPageContext() {
  var root = document.getElementById("auction-bids-page");
  return {
    userId: String(root?.dataset.userId || "").trim(),
    isAdmin: parseBoolean(root?.dataset.isAdmin),
    canManageBids: parseBoolean(root?.dataset.canManageBids),
    auctionId: String(root?.dataset.auctionId || "").trim(),
  };
}
var pageContext = getPageContext();
var allGroupedBids = {};
var currentFilter = "all";
function normalizeGroupedBidsFromUserList(list) {
  var grouped = {};
  (list || []).forEach(function (bid) {
    var auctionId = bid.listingId ? String(bid.listingId) : "unknown";
    if (!grouped[auctionId]) {
      grouped[auctionId] = {
        auction: bid.auction || null,
        bids: [],
        canControl: false,
      };
    }
    grouped[auctionId].bids.push(
      Object.assign({}, bid, {
        canControl: false,
      }),
    );
  });
  return grouped;
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
  var s = statusMap[status] || statusMap["pending"];
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
function showToast(title, message, isError) {
  if (!isError) isError = false;
  var toast = document.getElementById("toast");
  var toastTitle = document.getElementById("toast-title");
  var toastMessage = document.getElementById("toast-message");
  toastTitle.textContent = title;
  toastMessage.textContent = message;
  if (isError) {
    toast.querySelector("div").classList.remove("border-green-500/50");
    toast.querySelector("div").classList.add("border-red-500/50");
  } else {
    toast.querySelector("div").classList.add("border-green-500/50");
    toast.querySelector("div").classList.remove("border-red-500/50");
  }
  toast.classList.remove("translate-y-20", "opacity-0");
  setTimeout(function () {
    toast.classList.add("translate-y-20", "opacity-0");
  }, 3000);
}
async function markAsWinner(bidId, bidderName) {
  if (
    !confirm(
      "Are you sure you want to declare " +
        bidderName +
        " as the winner? This will reject all other bids.",
    )
  ) {
    return;
  }
  try {
    var response = await fetch("/api/bids/" + bidId + "/mark-winner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sellerId: pageContext.userId }),
    });
    var result = await response.json();
    if (result.success) {
      showToast("Success!", bidderName + " has been declared as the winner!");
      loadBids();
    } else {
      showToast(
        "Error",
        result.message || "Failed to mark bid as winner",
        true,
      );
    }
  } catch (error) {
    showToast("Error", "An error occurred. Please try again.", true);
  }
}
function renderBidCard(bid) {
  var isWinner = bid.status === "accepted";
  var isPending = bid.status === "pending";
  var canControl = bid.canControl && isPending;
  var bidOwnerId = bid.bidderId && typeof bid.bidderId === "object" ? String(bid.bidderId._id || bid.bidderId.id || "") : String(bid.bidderId || "");
  var isWinningBuyer =
    isWinner &&
    !pageContext.canManageBids &&
    !!pageContext.userId &&
    bidOwnerId === pageContext.userId;
  var bidderInitials = "??";
  if (bid.bidderName) {
    bidderInitials = bid.bidderName
      .split(" ")
      .map(function (n) {
        return n[0];
      })
      .join("")
      .substring(0, 2)
      .toUpperCase();
  }
  var cardClass =
    "bid-card p-4 rounded-xl glass border border-gray-800 hover:border-orange-500/50 transition-all";
  if (isWinner) {
    cardClass =
      "bid-card p-4 rounded-xl winner-card bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-2 border-green-500/50 transition-all";
  }
  var bgGradient = "from-orange-500 to-red-600";
  if (isWinner) bgGradient = "from-green-500 to-emerald-600";
  var winnerBadge = "";
  if (isWinner) {
    winnerBadge =
      '<div class="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center border-2 border-gray-900"><i class="bi bi-check text-xs"></i></div>';
  }
  var textColor = "text-orange-500";
  if (isWinner) textColor = "text-green-500";
  var notesHtml = "";
  if (bid.notes) {
    notesHtml =
      '<div class="p-2 rounded-lg bg-gray-800/30 border border-gray-700/50 mb-3"><p class="text-sm text-gray-300">' +
      bid.notes +
      "</p></div>";
  }
  var actionHtml = "";
  if (canControl) {
    actionHtml =
      '<div class="flex gap-2 mt-2"><button onclick="markAsWinner(\'' +
      bid._id +
      "', '" +
      (bid.bidderName || "Anonymous") +
      '\')" class="w-full sm:w-auto px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 font-semibold hover:shadow-lg hover:shadow-green-500/30 transition text-sm"><i class="bi bi-trophy-fill mr-1"></i>Declare Winner</button></div>';
  } else if (isWinningBuyer) {
    actionHtml =
      '<div class="flex gap-2 mt-2 flex-wrap">' +
      '<a href="/dashboard/payment?bidId=' +
      encodeURIComponent(bid._id || "") +
      '" class="w-full sm:w-auto px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 font-semibold hover:shadow-lg hover:shadow-green-500/30 transition text-sm text-center"><i class="bi bi-credit-card mr-1"></i>Pay Now</a>' +
      "</div>";
  }
  return (
    '<div class="' +
    cardClass +
    '">' +
    '<div class="flex flex-col sm:flex-row sm:items-start gap-3">' +
    '<div class="relative flex-shrink-0">' +
    '<div class="w-12 h-12 rounded-full bg-gradient-to-br ' +
    bgGradient +
    ' flex items-center justify-center font-bold text-lg">' +
    bidderInitials +
    "</div>" +
    winnerBadge +
    "</div>" +
    '<div class="flex-1 min-w-0 overflow-hidden">' +
    '<div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">' +
    '<div class="min-w-0"><h5 class="font-bold flex flex-wrap items-center gap-2">' +
    (bid.bidderName || "Anonymous") +
    '<span class="max-w-full break-all px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs"><i class="bi bi-telephone mr-1"></i>' +
    (bid.bidderPhone || "N/A") +
    "</span></h5>" +
    '<p class="text-xs text-gray-500 mt-1"><i class="bi bi-clock mr-1"></i>' +
    formatDate(bid.createdAt) +
    "</p></div>" +
    '<div class="text-left sm:text-right"><p class="text-lg sm:text-xl font-black ' +
    textColor +
    '">' +
    formatCurrency(bid.amount) +
    "</p>" +
    getStatusBadge(bid.status) +
    "</div>" +
    "</div>" +
    notesHtml +
    actionHtml +
    "</div></div></div>"
  );
}
function renderAuctionGroup(auctionId, group) {
  var auction = group.auction || {};
  var photoUrl = getAnimalImage(auction.photos);
  var animalType = auction.animalType || "Livestock";
  var filteredBids = group.bids;
  if (currentFilter !== "all") {
    filteredBids = group.bids.filter(function (b) {
      return b.status === currentFilter;
    });
  }
  if (filteredBids.length === 0 && currentFilter !== "all") {
    return "";
  }
  var highestBid = 0;
  group.bids.forEach(function (bid) {
    if (bid.amount > highestBid) highestBid = bid.amount;
  });
  var winnerCount = 0;
  group.bids.forEach(function (bid) {
    if (bid.status === "accepted") winnerCount++;
  });
  var sexHtml = "";
  if (auction.sex) {
    sexHtml =
      '<span class="px-2 py-1 rounded-lg bg-gray-800/50 text-xs"><i class="bi bi-gender-' +
      auction.sex.toLowerCase() +
      ' mr-1"></i>' +
      auction.sex +
      "</span>";
  }
  var weightHtml = "";
  if (auction.weight) {
    weightHtml =
      '<span class="px-2 py-1 rounded-lg bg-gray-800/50 text-xs"><i class="bi bi-speedometer mr-1"></i>' +
      auction.weight +
      "kg</span>";
  }
  var locationHtml = "";
  if (auction.location) {
    locationHtml =
      '<span class="px-2 py-1 rounded-lg bg-gray-800/50 text-xs"><i class="bi bi-geo-alt mr-1"></i>' +
      auction.location +
      "</span>";
  }
  var healthHtml = "";
  if (auction.healthStatus) {
    healthHtml =
      '<span class="px-2 py-1 rounded-lg bg-green-500/20 text-green-400 text-xs"><i class="bi bi-heart-pulse mr-1"></i>' +
      auction.healthStatus +
      "</span>";
  }
  var winnerText = "Pending";
  var winnerClass = "text-gray-500";
  if (winnerCount > 0) {
    winnerText = "Declared";
    winnerClass = "text-green-500";
  }
  var bidsHtml = filteredBids.map(renderBidCard).join("");
  var noBidsHtml = "";
  if (filteredBids.length === 0) {
    noBidsHtml =
      '<div class="p-4 rounded-xl border border-dashed border-gray-700 text-gray-500 text-sm">No bids in this category</div>';
  }
  return (
    '<section class="auction-group glass-strong border border-gray-800 rounded-2xl p-4 sm:p-5 md:p-6">' +
    '<div class="flex flex-col lg:flex-row gap-6 pb-5 border-b border-gray-800/70">' +
    '<div class="w-full sm:w-56 lg:w-48 h-36 rounded-xl overflow-hidden relative flex-shrink-0">' +
    '<img src="' +
    photoUrl +
    '" alt="' +
    animalType +
    '" class="w-full h-full object-cover" onerror="this.src=\'/img/cow.png\'">' +
    '<div class="absolute top-3 right-3"><span class="px-3 py-1 rounded-full bg-green-500/90 backdrop-blur-sm text-xs font-bold flex items-center gap-1"><span class="w-2 h-2 bg-white rounded-full animate-pulse"></span>LIVE</span></div></div>' +
    '<div class="flex-1 min-w-0"><h3 class="text-lg sm:text-xl font-bold font-display mb-2 break-words">' +
    animalType +
    (auction.breed ? "- " + auction.breed : "") +
    "</h3>" +
    '<div class="flex flex-wrap gap-2 mb-3">' +
    sexHtml +
    weightHtml +
    locationHtml +
    healthHtml +
    "</div>" +
    '<p class="text-xs sm:text-sm text-gray-400 mb-4 break-words">' +
    (auction.description || "") +
    "</p>" +
    '<div class="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4"><div class="p-3 rounded-xl bg-gray-800/30"><p class="text-xs text-gray-400 mb-1">Total Bids</p><p class="text-lg font-black">' +
    group.bids.length +
    "</p></div>" +
    '<div class="p-3 rounded-xl bg-green-500/10 border border-green-500/30"><p class="text-xs text-gray-400 mb-1">Highest Bid</p><p class="text-lg font-black text-green-500">' +
    formatCurrency(highestBid) +
    "</p></div>" +
    '<div class="p-3 rounded-xl bg-orange-500/10 border border-orange-500/30"><p class="text-xs text-gray-400 mb-1">Winner</p><p class="text-lg font-black ' +
    winnerClass +
    '">' +
    winnerText +
    "</p></div></div></div></div>" +
    '<div class="mt-5 rounded-2xl border border-gray-800/70 bg-gray-900/30 p-3 sm:p-4 md:p-5">' +
    '<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-4">' +
    '<h4 class="text-sm font-bold text-gray-300"><i class="bi bi-hand-thumbs-up mr-2 text-orange-400"></i>Placed Bids</h4>' +
    '<span class="px-2.5 py-1 rounded-lg bg-gray-800/70 border border-gray-700 text-xs font-semibold text-gray-300">' +
    filteredBids.length +
    " shown</span></div>" +
    '<div class="space-y-3">' +
    bidsHtml +
    noBidsHtml +
    "</div></div></section>"
  );
}
function filterBids(filter) {
  currentFilter = filter;
  document.querySelectorAll(".filter-btn").forEach(function (btn) {
    btn.classList.remove("active", "border-orange-500/50");
    btn.classList.add("border-gray-700");
    if (btn.dataset.filter === filter) {
      btn.classList.add("active", "border-orange-500/50");
      btn.classList.remove("border-gray-700");
    }
  });
  renderBids();
}
function renderBids() {
  var container = document.getElementById("bids-container");
  var groups = Object.entries(allGroupedBids);
  if (groups.length === 0) {
    document.getElementById("no-bids").classList.remove("hidden");
    container.classList.add("hidden");
    return;
  }
  document.getElementById("no-bids").classList.add("hidden");
  container.classList.remove("hidden");
  var allBids = [];
  groups.forEach(function (g) {
    allBids = allBids.concat(g[1].bids);
  });
  var auctions = groups.length;
  var totalBids = allBids.length;
  var winners = 0;
  allBids.forEach(function (bid) {
    if (bid.status === "accepted") winners++;
  });
  var highestBid = { amount: 0, bidderName: "-" };
  allBids.forEach(function (bid) {
if (bid.amount > highestBid.amount) {
      highestBid = bid;
    }
  });
  var topBidder = highestBid.bidderName || "-";
  var highest = highestBid.amount;
  document.getElementById("stat-auctions").textContent = auctions;
  document.getElementById("stat-total").textContent = totalBids;
  document.getElementById("stat-winners").textContent = winners;
  document.getElementById("stat-top-bidder").textContent = topBidder;
  document.getElementById("stat-highest-amount").textContent =
    formatCurrency(highest);
  container.innerHTML = groups
    .map(function (g) {
      return renderAuctionGroup(g[0], g[1]);
    })
    .join("");
}
async function loadBids() {
  try {
    if (!pageContext.userId || pageContext.userId === "{{userId}}") {
      document.getElementById("loading").innerHTML =
        '<div class="text-red-500"><i class="bi bi-exclamation-triangle text-2xl mb-2"></i><p>Error: User ID not found. Please log in again.</p></div>';
      return;
    }
    var apiUrl;
    if (pageContext.isAdmin === true) {
      apiUrl = "/api/bids/admin/all";
    } else if (pageContext.canManageBids) {
      if (pageContext.auctionId) {
        apiUrl =
          "/api/bids/auction/" +
          encodeURIComponent(pageContext.auctionId) +
          "?sellerId=" +
          encodeURIComponent(pageContext.userId);
      } else {
        apiUrl = "/api/bids/seller/" + encodeURIComponent(pageContext.userId);
      }
    } else {
      apiUrl =
        "/api/bids/user/" + encodeURIComponent(pageContext.userId) + "/details";
    }
    var response = await fetch(apiUrl);
    var result = await response.json();
    document.getElementById("loading").classList.add("hidden");
    if (!result.success) {
      document.getElementById("loading").innerHTML =
        '<div class="text-red-500"><i class="bi bi-exclamation-triangle text-2xl mb-2"></i><p>Error loading bids: ' +
        (result.message || "Unknown error") +
        "</p></div>";
      return;
    }
    if (result.groupedByAuction && typeof result.groupedByAuction === "object") {
      allGroupedBids = result.groupedByAuction;
    } else if (Array.isArray(result.data)) {
      allGroupedBids = normalizeGroupedBidsFromUserList(result.data);
    } else {
      allGroupedBids = {};
    }
    renderBids();
  } catch (error) {
    document.getElementById("loading").innerHTML =
      '<div class="text-red-500"><i class="bi bi-exclamation-triangle text-2xl mb-2"></i><p>Error loading bids. Please try again.</p></div>';
  }
}
document.addEventListener("DOMContentLoaded", loadBids);
window.reloadBids = loadBids;
