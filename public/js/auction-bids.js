(function () {
  var page = document.getElementById("auction-bids-page");
  if (!page) return;

  var userId = page.dataset.userId || "";
  var auctionId = page.dataset.auctionId || "";
  var isAdmin = (page.dataset.isAdmin || "").toLowerCase() === "true";
  var canManageBids =
    (page.dataset.canManageBids || "").toLowerCase() === "true";

  var allGroupedBids = {};
  var currentFilter = "all";

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
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
        className: "status-pending",
        icon: "bi-hourglass-split",
        text: "In Progress",
      },
      accepted: {
        className: "status-accepted",
        icon: "bi-trophy-fill",
        text: "Winner",
      },
      rejected: {
        className: "status-rejected",
        icon: "bi-x-circle-fill",
        text: "Rejected",
      },
    };

    var s = statusMap[status] || statusMap.pending;
    return (
      '<span class="px-3 py-1 rounded-full text-xs font-bold border ' +
      s.className +
      '"><i class="bi ' +
      s.icon +
      ' mr-1"></i>' +
      s.text +
      "</span>"
    );
  }

  function getAnimalImage(photos) {
    if (Array.isArray(photos) && photos.length > 0) {
      if (photos[0] && photos[0].url) return photos[0].url;
      if (typeof photos[0] === "string") return photos[0];
    }
    return "/img/cow.png";
  }

  function showToast(title, message, isError) {
    var toast = document.getElementById("toast");
    if (!toast) return;

    var toastTitle = document.getElementById("toast-title");
    var toastMessage = document.getElementById("toast-message");
    toastTitle.textContent = title;
    toastMessage.textContent = message;

    var panel = toast.querySelector("div");
    panel.classList.toggle("border-red-500/50", !!isError);
    panel.classList.toggle("border-green-500/50", !isError);

    toast.classList.remove("translate-y-20", "opacity-0");
    setTimeout(function () {
      toast.classList.add("translate-y-20", "opacity-0");
    }, 3000);
  }

  function hideStates() {
    document.getElementById("loading").classList.add("hidden");
    document.getElementById("no-bids").classList.add("hidden");
    document.getElementById("error-state").classList.add("hidden");
  }

  function showError(message) {
    hideStates();
    document.getElementById("bids-container").classList.add("hidden");
    document.getElementById("error-message").textContent =
      message || "Could not load bids.";
    document.getElementById("error-state").classList.remove("hidden");
  }

  async function setBidStatus(bidId, nextStatus) {
    var label =
      nextStatus === "accepted"
        ? "Winner"
        : nextStatus === "pending"
          ? "In Progress"
          : "Rejected";

    if (nextStatus === "accepted") {
      var okay = confirm("Set this bid as WINNER? Other bids on this auction will be rejected.");
      if (!okay) return;
    }

    try {
      var response = await fetch("/api/bids/" + bidId + "/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          sellerId: userId,
        }),
      });

      var result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to update bid status");
      }

      showToast("Updated", "Bid status set to " + label + ".", false);
      await loadBids();
    } catch (error) {
      console.error("Error updating bid status:", error);
      showToast("Error", error.message || "Could not update bid status", true);
    }
  }

  function renderStatusActions(bid) {
    if (!bid.canControl) return "";

    var btnBase =
      "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all";

    function button(status, text, classes) {
      var disabled = bid.status === status;
      var attr = disabled
        ? "disabled"
        : 'onclick="setBidStatus(\'' + bid._id + "', '" + status + '\')"';
      var className =
        btnBase +
        (disabled ? " opacity-60 cursor-not-allowed " : " ") +
        classes;
      return (
        "<button " + attr + ' class="' + className + '">' + text + "</button>"
      );
    }

    return (
      '<div class="flex flex-wrap gap-2 mt-3">' +
      button("accepted", "Winner", "bg-green-500/20 border-green-500/40 text-green-300") +
      button("pending", "In Progress", "bg-yellow-500/20 border-yellow-500/40 text-yellow-300") +
      button("rejected", "Reject", "bg-red-500/20 border-red-500/40 text-red-300") +
      "</div>"
    );
  }

  function renderBidCard(bid) {
    var isWinner = bid.status === "accepted";
    var bidderName = escapeHtml(bid.bidderName || "Anonymous");
    var bidderPhone = escapeHtml(bid.bidderPhone || "N/A");
    var bidderInitials = bidderName
      .split(" ")
      .map(function (n) {
        return n[0] || "";
      })
      .join("")
      .slice(0, 2)
      .toUpperCase();

    var cardClass =
      "bid-card p-4 rounded-xl glass border border-gray-800 hover:border-orange-500/50 transition-all";
    if (isWinner) {
      cardClass =
        "bid-card p-4 rounded-xl winner-card bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-2 border-green-500/50 transition-all";
    }

    var bgGradient = isWinner ? "from-green-500 to-emerald-600" : "from-orange-500 to-red-600";
    var textColor = isWinner ? "text-green-500" : "text-orange-500";

    var notesHtml = bid.notes
      ? '<div class="p-2 rounded-lg bg-gray-800/30 border border-gray-700/50 mb-3"><p class="text-sm text-gray-300">' +
        escapeHtml(bid.notes) +
        "</p></div>"
      : "";
    var paymentButtonHtml =
      !canManageBids && bid.status === "accepted"
        ? '<a href="/dashboard/payment?bidId=' +
          bid._id +
          '" class="inline-flex items-center px-3 py-1.5 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs font-semibold hover:shadow-lg hover:shadow-green-500/30 transition"><i class="bi bi-credit-card mr-1"></i>Proceed to Payment</a>'
        : "";

    return (
      '<div class="' +
      cardClass +
      '">' +
      '<div class="flex items-start gap-4">' +
      '<div class="relative flex-shrink-0"><div class="w-12 h-12 rounded-full bg-gradient-to-br ' +
      bgGradient +
      ' flex items-center justify-center font-bold text-lg">' +
      escapeHtml(bidderInitials || "??") +
      "</div></div>" +
      '<div class="flex-1 min-w-0">' +
      '<div class="flex items-start justify-between mb-2">' +
      "<div><h5 class=\"font-bold flex items-center gap-2\">" +
      bidderName +
      '<span class="px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs"><i class="bi bi-telephone mr-1"></i>' +
      bidderPhone +
      "</span></h5>" +
      '<p class="text-xs text-gray-500 mt-1"><i class="bi bi-clock mr-1"></i>' +
      formatDate(bid.createdAt) +
      "</p></div>" +
      '<div class="text-right"><p class="text-xl font-black ' +
      textColor +
      '">' +
      formatCurrency(bid.amount) +
      "</p>" +
      getStatusBadge(bid.status) +
      (paymentButtonHtml
        ? '<div class="mt-2 flex justify-end">' + paymentButtonHtml + "</div>"
        : "") +
      "</div></div>" +
      notesHtml +
      renderStatusActions(bid) +
      "</div></div></div>"
    );
  }

  function renderAuctionGroup(group) {
    var auction = group.auction || {};
    var photoUrl = getAnimalImage(auction.photos);
    var animalType = escapeHtml(auction.animalType || "Livestock");
    var breed = auction.breed ? " - " + escapeHtml(auction.breed) : "";

    var filteredBids =
      currentFilter === "all"
        ? group.bids
        : group.bids.filter(function (b) {
            return b.status === currentFilter;
          });

    if (filteredBids.length === 0 && currentFilter !== "all") return "";

    var highestBidEntry = group.bids.reduce(
      function (max, bid) {
        return (bid.amount || 0) > (max.amount || 0) ? bid : max;
      },
      { amount: 0, bidderName: "-" },
    );
    var trackedHighest = group.auctionTracking || null;
    var highestBid = trackedHighest
      ? trackedHighest.highestBidAmount || 0
      : highestBidEntry.amount || 0;
    var highestBidderName = escapeHtml(
      trackedHighest
        ? trackedHighest.highestBidderName || "-"
        : highestBidEntry.bidderName || "-",
    );

    var winnerCount = group.bids.filter(function (b) {
      return b.status === "accepted";
    }).length;

    var winnerText = winnerCount > 0 ? "Declared" : "Pending";
    var winnerClass = winnerCount > 0 ? "text-green-500" : "text-gray-500";

    var sexHtml = auction.sex
      ? '<span class="px-2 py-1 rounded-lg bg-gray-800/50 text-xs"><i class="bi bi-gender-' +
        String(auction.sex).toLowerCase() +
        ' mr-1"></i>' +
        escapeHtml(auction.sex) +
        "</span>"
      : "";

    var weightHtml = auction.weight
      ? '<span class="px-2 py-1 rounded-lg bg-gray-800/50 text-xs"><i class="bi bi-activity mr-1"></i>' +
        escapeHtml(auction.weight) +
        "kg</span>"
      : "";

    var locationHtml = auction.location
      ? '<span class="px-2 py-1 rounded-lg bg-gray-800/50 text-xs"><i class="bi bi-geo-alt mr-1"></i>' +
        escapeHtml(auction.location) +
        "</span>"
      : "";

    var healthHtml = auction.healthStatus
      ? '<span class="px-2 py-1 rounded-lg bg-green-500/20 text-green-400 text-xs"><i class="bi bi-heart-pulse mr-1"></i>' +
        escapeHtml(auction.healthStatus) +
        "</span>"
      : "";

    return (
      '<div class="auction-group">' +
      '<div class="glass-strong border border-gray-800 rounded-2xl p-6 mb-4">' +
      '<div class="flex flex-col lg:flex-row gap-6">' +
      '<div class="lg:w-48 h-36 rounded-xl overflow-hidden relative flex-shrink-0">' +
      '<img src="' +
      photoUrl +
      '" alt="' +
      animalType +
      '" class="w-full h-full object-cover" onerror="this.src=\'/img/cow.png\'">' +
      '<div class="absolute top-3 right-3"><span class="px-3 py-1 rounded-full bg-green-500/90 backdrop-blur-sm text-xs font-bold flex items-center gap-1"><span class="w-2 h-2 bg-white rounded-full animate-pulse"></span>LIVE</span></div>' +
      "</div>" +
      '<div class="flex-1"><h3 class="text-xl font-bold font-display mb-2">' +
      animalType +
      breed +
      "</h3>" +
      '<div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">' +
      '<div class="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30">' +
      '<p class="text-xs text-gray-400 mb-1">Current Highest Bidder</p>' +
      '<p class="text-sm font-bold text-purple-300 truncate"><i class="bi bi-person-fill mr-1"></i>' +
      highestBidderName +
      "</p></div>" +
      '<div class="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">' +
      '<p class="text-xs text-gray-400 mb-1">Current Highest Amount</p>' +
      '<p class="text-sm font-black text-emerald-400"><i class="bi bi-cash-stack mr-1"></i>' +
      formatCurrency(highestBid) +
      "</p></div></div>" +
      (!canManageBids && trackedHighest
        ? '<div class="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 mb-3"><p class="text-xs text-gray-300">' +
          (trackedHighest.isUserLeading
            ? "You are currently leading on this auction."
            : "You are currently outbid on this auction.") +
          "</p></div>"
        : "") +
      '<div class="flex flex-wrap gap-2 mb-3">' +
      sexHtml +
      weightHtml +
      locationHtml +
      healthHtml +
      "</div>" +
      '<p class="text-sm text-gray-400 mb-4">' +
      escapeHtml(auction.description || "") +
      "</p>" +
      '<div class="grid grid-cols-3 gap-4">' +
      '<div class="p-3 rounded-xl bg-gray-800/30"><p class="text-xs text-gray-400 mb-1">Total Bids</p><p class="text-lg font-black">' +
      group.bids.length +
      "</p></div>" +
      '<div class="p-3 rounded-xl bg-green-500/10 border border-green-500/30"><p class="text-xs text-gray-400 mb-1">Highest Bid</p><p class="text-lg font-black text-green-500">' +
      formatCurrency(highestBid) +
      "</p></div>" +
      '<div class="p-3 rounded-xl bg-orange-500/10 border border-orange-500/30"><p class="text-xs text-gray-400 mb-1">Winner</p><p class="text-lg font-black ' +
      winnerClass +
      '">' +
      winnerText +
      "</p></div>" +
      "</div></div></div></div>" +
      '<div class="space-y-3 pl-4"><h4 class="text-sm font-bold text-gray-400 mb-3"><i class="bi bi-cash-coin mr-2"></i>Bids (' +
      filteredBids.length +
      ")</h4>" +
      filteredBids.map(renderBidCard).join("") +
      (filteredBids.length === 0
        ? '<p class="text-gray-500 text-sm">No bids in this category</p>'
        : "") +
      "</div></div>"
    );
  }

  function renderBids() {
    var container = document.getElementById("bids-container");
    var groups = Object.values(allGroupedBids);

    if (groups.length === 0) {
      hideStates();
      document.getElementById("no-bids").classList.remove("hidden");
      container.classList.add("hidden");
      return;
    }

    hideStates();
    container.classList.remove("hidden");

    var allBids = [];
    groups.forEach(function (group) {
      allBids = allBids.concat(group.bids);
    });

    var winners = allBids.filter(function (b) {
      return b.status === "accepted";
    }).length;

    var highestBid = allBids.reduce(
      function (max, bid) {
        return bid.amount > max.amount ? bid : max;
      },
      { amount: 0, bidderName: "-" },
    );

    document.getElementById("stat-auctions").textContent = groups.length;
    document.getElementById("stat-total").textContent = allBids.length;
    document.getElementById("stat-winners").textContent = winners;
    document.getElementById("stat-top-bidder").textContent =
      highestBid.bidderName || "-";
    document.getElementById("stat-highest-amount").textContent = formatCurrency(
      highestBid.amount,
    );

    container.innerHTML = groups.map(renderAuctionGroup).join("");
  }

  function filterBids(filter) {
    currentFilter = filter;
    document.querySelectorAll(".filter-btn").forEach(function (btn) {
      btn.classList.toggle("active", btn.dataset.filter === filter);
    });
    renderBids();
  }

  async function loadBids() {
    document.getElementById("loading").classList.remove("hidden");
    document.getElementById("bids-container").classList.add("hidden");
    document.getElementById("no-bids").classList.add("hidden");
    document.getElementById("error-state").classList.add("hidden");

    try {
      if (!isAdmin && !userId) {
        showError("User ID not found. Please log in again.");
        return;
      }

      var apiUrl;
      if (isAdmin) {
        apiUrl = "/api/bids/admin/all";
      } else if (canManageBids) {
        apiUrl = "/api/bids/seller/" + encodeURIComponent(userId);
      } else {
        apiUrl = "/api/bids/user/" + encodeURIComponent(userId) + "/details";
      }

      var response = await fetch(apiUrl);
      var result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to fetch bids");
      }

      if (canManageBids || isAdmin) {
        allGroupedBids = result.groupedByAuction || {};
      } else {
        var grouped = {};
        (result.data || []).forEach(function (bid) {
          var bidCopy = Object.assign({}, bid, { canControl: false });
          var id = bidCopy.listingId ? String(bidCopy.listingId) : "unknown";
          if (!grouped[id]) {
            grouped[id] = {
              auction: bidCopy.auction || {},
              auctionTracking: bidCopy.tracking || null,
              bids: [],
              canControl: false,
            };
          }
          if (!grouped[id].auctionTracking && bidCopy.tracking) {
            grouped[id].auctionTracking = bidCopy.tracking;
          }
          grouped[id].bids.push(bidCopy);
        });
        allGroupedBids = grouped;
      }
      if (auctionId) {
        allGroupedBids = allGroupedBids[auctionId]
          ? { [auctionId]: allGroupedBids[auctionId] }
          : {};
      }

      renderBids();
    } catch (error) {
      console.error("Error loading bids:", error);
      showError(error.message || "Error loading bids. Please try again.");
    }
  }

  window.filterBids = filterBids;
  window.setBidStatus = setBidStatus;
  window.reloadBids = loadBids;

  document.addEventListener("DOMContentLoaded", loadBids);
})();

