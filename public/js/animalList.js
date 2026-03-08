const API_BASE_URL = "/auctions/api";
let allListings = [];
let filteredListings = [];
let currentViewMode = "grid";
let currentPage = 1;
const itemsPerPage = 12;
let isLoading = false;
let currentUser = null; // Store current user data
let countdownIntervalId = null;
const animalTypeMap = {
  1: { name: "Cattle", icon: "" },
  2: { name: "Goat", icon: "" },
  3: { name: "Sheep", icon: "" },
  4: { name: "Pig", icon: "" },
  5: { name: "Poultry", icon: "" },
  6: { name: "Rabbit", icon: "" },
  7: { name: "Duck", icon: "" },
};
const healthIcons = {
  Excellent: "",
  Good: "",
  Fair: "",
};
const FAV_STORAGE_KEY = "chuu-favourite-listings";
function formatUGX(value) {
  const amount = Number(value || 0);
  return `UGX ${amount.toLocaleString("en-US")}`;
}
function normalizePhone(phone) {
  return String(phone || "").replace(/[^\d+]/g, "");
}
function getFavouriteIds() {
  try {
    const parsed = JSON.parse(localStorage.getItem(FAV_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
function isFavouriteListing(listingId) {
  return getFavouriteIds().includes(String(listingId));
}
function setModalBodyLock(lock) {
  document.body.style.overflow = lock ? "hidden" : "";
}
function getCurrentUserId() {
  if (!currentUser) return "";
  return String(currentUser._id || currentUser.id || "").trim();
}
function getListingSellerId(listing) {
  if (!listing || !listing.seller) return "";
  return String(listing.seller.id || listing.seller._id || "").trim();
}
function canDeleteListing(listing) {
  const userId = getCurrentUserId();
  if (!userId) return false;
  return userId && userId === getListingSellerId(listing);
}
document.addEventListener("DOMContentLoaded", function () {
  loadCurrentUser();
  loadListings();
  setupEventListeners();
});
async function loadCurrentUser() {
  try {
    const response = await fetch("/api/user/current", {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });
    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        currentUser = data.user;
      }
    }
  } catch (error) {
  }
}
async function loadListings() {
  if (isLoading) {
    return;
  }
  isLoading = true;
  showLoadingState();
  try {
    const url = `${API_BASE_URL}/all`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 15000);
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      cache: "no-cache",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text();
throw new Error("Server returned non-JSON response. Expected JSON.");
    }
    const result = await response.json();
if (result.success && Array.isArray(result.data)) {
      allListings = result.data;
      filteredListings = [...allListings];
if (allListings.length > 0) {
      }
      updateStats();
      displayListings();
      hideLoadingState();
    } else {
      throw new Error(result.message || "Invalid response format from server");
    }
  } catch (error) {
    hideLoadingState();
    let errorMsg = `Failed to load listings: ${error.message}`;
    if (error.name === "AbortError") {
      errorMsg =
        "Request timed out after 15 seconds. Server might be slow or unreachable.";
    } else if (error.message.includes("Failed to fetch")) {
      errorMsg =
        "Network error: Cannot reach the server. Check your connection.";
    }
    showErrorState(errorMsg);
  } finally {
    isLoading = false;
  }
}
function showLoadingState() {
  document.getElementById("loading-state").classList.remove("hidden");
  document.getElementById("listings-container").innerHTML = "";
  document.getElementById("empty-state").classList.add("hidden");
}
function hideLoadingState() {
  document.getElementById("loading-state").classList.add("hidden");
}
function showErrorState(message) {
  const container = document.getElementById("listings-container");
  container.innerHTML = `
    <div class="col-span-full text-center py-20">
      <div class="inline-block max-w-2xl">
        <div class="w-32 h-32 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
          <i class="bi bi-exclamation-triangle text-6xl text-red-500"></i>
        </div>
        <h3 class="text-2xl font-bold text-gray-400 mb-3">Error Loading Listings</h3>
        <p class="text-gray-500 mb-6">${message}</p>
        <div class="bg-gray-800/50 rounded-xl p-4 mb-6 text-left">
          <p class="text-sm text-gray-400 font-mono mb-2">Debugging steps:</p>
          <ul class="text-sm text-gray-500 space-y-1 font-mono">
            <li>1. Open browser console (F12) ➡️ Network tab</li>
            <li>2. Check server terminal for errors</li>
            <li>3. Verify MongoDB is running</li>
            <li>4. Ensure /auctions/api/all route exists</li>
          </ul>
        </div>
        <button
          onclick="loadListings()"
          class="px-8 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 font-bold hover:shadow-xl hover:shadow-emerald-500/30 transition-all">
          <i class="bi bi-arrow-clockwise mr-2"></i>Retry Loading
        </button>
      </div>
    </div>
  `;
}
function displayListings() {
  const container = document.getElementById("listings-container");
  const resultsCount = document.getElementById("results-count");
  const emptyState = document.getElementById("empty-state");
  resultsCount.textContent = filteredListings.length;
  if (filteredListings.length === 0) {
    container.innerHTML = "";
    emptyState.classList.remove("hidden");
    return;
  }
  emptyState.classList.add("hidden");
  container.innerHTML = "";
  filteredListings.forEach((listing, index) => {
    const card = createListingCard(listing, index);
    container.appendChild(card);
  });
  updateAuctionCountdowns();
  if (countdownIntervalId) {
    clearInterval(countdownIntervalId);
  }
  countdownIntervalId = setInterval(updateAuctionCountdowns, 1000);
}
function getCountdownLabel(endAt) {
  if (!endAt) return "No end time";
  const end = new Date(endAt);
  if (Number.isNaN(end.getTime())) return "No end time";
  const diff = end.getTime() - Date.now();
  if (diff <= 0) return "Ended";
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m ${seconds}s left`;
}
function updateAuctionCountdowns() {
  document.querySelectorAll(".auction-countdown[data-end-at]").forEach((el) => {
    const endAt = el.getAttribute("data-end-at");
    const label = getCountdownLabel(endAt);
    el.textContent = label;
    el.classList.toggle("bg-red-500/90", label === "Ended");
    el.classList.toggle("bg-emerald-500/90", label !== "Ended");
  });
}
function createListingCard(listing, index) {
  const card = document.createElement("div");
  card.className =
    "card-hover rounded-2xl glass-strong border border-gray-800/50 overflow-hidden animate-scale-in";
  card.style.animationDelay = `${index * 0.05}s`;
  const animalInfo = animalTypeMap[listing.animalType] || {
    name: "Unknown",
    icon: "",
  };
  const healthIcon = healthIcons[listing.healthStatus] || "";
  const ageDisplay = `${listing.age?.years || 0}y ${listing.age?.months || 0}m`;
  const sexLabel = listing.sex || "N/A";
  const fallbackPhoto =
    "https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=400&h=300&fit=crop";
  const photoList = Array.isArray(listing.photos)
    ? listing.photos
        .map((p) => (typeof p === "string" ? p : p && p.url ? p.url : ""))
        .filter(Boolean)
    : [];
  const mainPhoto = photoList.length > 0 ? photoList[0] : fallbackPhoto;
  const photoCount = photoList.length;
  const cardPhotos = (photoList.length > 0 ? photoList.slice(0, 4) : [mainPhoto]).slice(0, 4);
  while (cardPhotos.length < 4) {
    cardPhotos.push(mainPhoto);
  }
  const thumbsHtml = cardPhotos
    .map((photo, thumbIndex) => {
      const extraOverlay =
        thumbIndex === 3 && photoCount > 4
          ? `<div class="absolute inset-0 bg-black/55 flex items-center justify-center text-[11px] font-bold text-white">+${photoCount - 4}</div>`
          : "";
      return `
        <div class="relative h-11 rounded-md overflow-hidden border ${thumbIndex === 0 ? "border-emerald-500/60" : "border-gray-800/60"} cursor-pointer" onclick="viewDetails('${listing._id}')">
          <img src="${photo}" alt="Listing photo ${thumbIndex + 1}" class="w-full h-full object-cover" onerror="this.src='${fallbackPhoto}'">
          ${extraOverlay}
        </div>
      `;
    })
    .join("");
  const countdownLabel = getCountdownLabel(listing.endAt);
  const endAtAttr = listing.endAt ? String(listing.endAt) : "";
  const openingPrice = Number(listing.startingPrice || 0);
  const highestBid = Number(
    listing.highestBidAmount || listing.currentHighestBid || openingPrice || 0,
  );
  const sellerPhone = normalizePhone(listing.seller?.phone);
  const isFavourite = isFavouriteListing(listing._id);
  const canDelete = canDeleteListing(listing);
  card.innerHTML = `
    <div class="p-2.5 pb-0">
      <div class="image-container relative h-36 overflow-hidden rounded-xl cursor-pointer" onclick="viewDetails('${listing._id}')">
        <img src="${mainPhoto}" alt="${
          listing.breed || "Animal"
        }" class="w-full h-full object-cover" onerror="this.src='${fallbackPhoto}'">
        <div class="absolute top-2 left-2 flex gap-1.5">
          <span class="px-2.5 py-1 rounded-full glass-strong backdrop-blur-md text-[11px] font-bold">
          ${animalInfo.name}
          </span>
        ${
          listing.vaccinated
            ? '<span class="px-2.5 py-1 rounded-full bg-green-500/90 backdrop-blur-md text-[11px] font-bold status-live">Vaccinated</span>'
            : ""
        }
        </div>
        <div class="absolute top-2 right-2">
          <span class="px-2.5 py-1 rounded-full glass-strong backdrop-blur-md text-[11px] font-bold">
          ${(healthIcon ? healthIcon + " " : "") + (listing.healthStatus || "Good")}
          </span>
        </div>
        <div class="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <span class="px-2.5 py-1 rounded-full bg-emerald-500/95 backdrop-blur-sm text-[11px] font-bold shadow-lg border border-white/20 auction-countdown" data-end-at="${endAtAttr}">
          ${countdownLabel}
          </span>
        </div>
      </div>
      <div class="grid grid-cols-4 gap-1.5 mt-1.5">
        ${thumbsHtml}
      </div>
    </div>
    <div class="p-4 flex flex-col gap-3">
      <div>
        <h3 class="text-lg font-bold mb-1 font-display cursor-pointer hover:text-emerald-400 transition-colors" onclick="viewDetails('${listing._id}')">${
          listing.breed || "Unknown Breed"
        }</h3>
        <p class="text-xs text-gray-400">
          <i class="bi bi-geo-alt text-emerald-500"></i> ${
            listing.location || "Unknown"
          }
        </p>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div class="text-center p-1.5 rounded-lg bg-gray-800/30">
          <p class="text-[11px] text-gray-400 mb-0.5">Opening</p>
          <p class="font-bold text-xs text-emerald-400">${formatUGX(openingPrice)}</p>
        </div>
        <div class="text-center p-1.5 rounded-lg bg-gray-800/30">
          <p class="text-[11px] text-gray-400 mb-0.5">Highest Bid</p>
          <p class="font-bold text-xs text-green-400">${formatUGX(highestBid)}</p>
        </div>
        <div class="text-center p-1.5 rounded-lg bg-gray-800/30">
          <p class="text-[11px] text-gray-400 mb-0.5">Age</p>
          <p class="font-bold text-xs">${ageDisplay}</p>
        </div>
        <div class="text-center p-1.5 rounded-lg bg-gray-800/30">
          <p class="text-[11px] text-gray-400 mb-0.5">Weight</p>
          <p class="font-bold text-xs">${listing.weight || 0} KG</p>
        </div>
      </div>
      <div class="text-xs text-gray-400 line-clamp-2">${listing.description || "No description"}</div>
      <div class="flex items-center justify-between pt-3 border-t border-gray-800/50 gap-2">
        <div class="flex items-center gap-2 min-w-0">
          <div class="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center font-bold text-xs">
            ${(listing.seller?.name || "A").charAt(0).toUpperCase()}
          </div>
          <div class="min-w-0">
            <p class="text-[11px] font-semibold truncate">${listing.seller?.name || "Anonymous"}</p>
            <p class="text-[11px] text-gray-500 truncate"><i class="bi bi-telephone text-blue-400"></i> ${listing.seller?.phone || "N/A"}</p>
          </div>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="text-[11px] text-gray-500 hidden sm:inline">${sexLabel}</span>
          <button onclick="toggleFavourite('${listing._id}')" class="h-8 w-8 rounded-lg glass border border-gray-800/50 hover:border-rose-500/40 transition-all" title="Favourite">
            <i class="bi ${isFavourite ? "bi-heart-fill text-rose-400" : "bi-heart"}"></i>
          </button>
          <button onclick="shareListing('${listing._id}')" class="h-8 w-8 rounded-lg glass border border-gray-800/50 hover:border-blue-500/40 transition-all" title="Share">
            <i class="bi bi-share"></i>
          </button>
          <button onclick="callSeller('${listing._id}')" class="h-8 w-8 rounded-lg glass border border-gray-800/50 hover:border-emerald-500/40 transition-all ${sellerPhone ? "" : "opacity-50 cursor-not-allowed"}" title="${sellerPhone ? "Call seller" : "Seller phone unavailable"}" ${sellerPhone ? "" : "disabled"}>
            <i class="bi bi-telephone"></i>
          </button>
          <button onclick="viewDetails('${listing._id}')" class="px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 font-semibold text-xs hover:shadow-lg hover:shadow-emerald-500/30 transition-all whitespace-nowrap">
            View Details
          </button>
          ${
            canDelete
              ? `<button onclick="deleteListing('${listing._id}')" class="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/35 text-red-300 hover:bg-red-500/20 transition-all text-xs font-semibold whitespace-nowrap">
            <i class="bi bi-trash3 mr-1"></i>Delete
          </button>`
              : ""
          }
        </div>
      </div>
      ${
        listing.quantity > 1
          ? `
        <div class="text-center py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30">
          <p class="text-xs font-bold text-blue-400">
            <i class="bi bi-stack"></i> ${listing.quantity} Available
          </p>
        </div>
      `
          : ""
      }
    </div>
  `;
  return card;
}
function viewDetails(id) {
  const listing = allListings.find((l) => l._id === id);
  if (!listing) {
    return;
  }
  const animalInfo = animalTypeMap[listing.animalType] || {
    name: "Unknown",
    icon: "",
  };
  const healthIcon = healthIcons[listing.healthStatus] || "";
  const ageDisplay = `${listing.age?.years || 0} years ${
    listing.age?.months || 0
  } months`;
  const photos =
    listing.photos && listing.photos.length > 0
      ? listing.photos
      : [
          "https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=400&h=300&fit=crop",
        ];
  const openingPrice = Number(listing.startingPrice || 0);
  const highestBid = Number(
    listing.highestBidAmount || listing.currentHighestBid || openingPrice || 0,
  );
  const sellerPhone = normalizePhone(listing.seller?.phone);
  const canDelete = canDeleteListing(listing);
  const modal = document.getElementById("detail-modal");
  const content = document.getElementById("modal-content");
  content.innerHTML = `
    <div class="sticky top-0 bg-gray-900/95 backdrop-blur-xl border-b border-gray-800/50 px-3 py-2.5 flex items-center justify-between z-20">
      <h2 class="text-xl font-black font-display text-gradient">Listing Details</h2>
      <button onclick="closeDetailModal()" class="w-9 h-9 rounded-xl glass hover:bg-gray-800/50 flex items-center justify-center transition-all">
        <i class="bi bi-x-lg text-base"></i>
      </button>
    </div>
    <div class="p-3 space-y-3 pb-20 md:pb-3">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
        ${photos
          .map(
            (photo) => `
          <div class="image-container rounded-xl overflow-hidden h-20 sm:h-24">
            <img src="${photo}" alt="${
              listing.breed || "Animal"
            }" class="w-full h-full object-cover" onerror="this.src='https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=400&h=300&fit=crop'">
          </div>
        `,
          )
          .join("")}
      </div>
      <div class="grid md:grid-cols-2 gap-3">
        <div class="space-y-3">
          <div>
            <h3 class="text-xl font-black font-display mb-1.5">${
              listing.breed || "Unknown Breed"
            }</h3>
            <div class="flex flex-wrap gap-1.5">
              <span class="tag-pill px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                ${animalInfo.name}
              </span>
              <span class="tag-pill px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs font-semibold">
                ${(healthIcon ? healthIcon + " " : "") + (listing.healthStatus || "Good")}
              </span>
              ${
                listing.vaccinated
                  ? '<span class="tag-pill px-3 py-1 rounded-full bg-green-500/20 border border-green-500/30 text-green-400 text-xs font-semibold">Vaccinated</span>'
                  : ""
              }
            </div>
          </div>
          <div class="grid grid-cols-2 gap-1.5">
            <div class="p-2.5 rounded-xl bg-gray-800/30">
              <p class="text-xs text-gray-400 mb-1">Opening Price</p>
              <p class="text-base font-bold text-emerald-400">${formatUGX(openingPrice)}</p>
            </div>
            <div class="p-2.5 rounded-xl bg-gray-800/30">
              <p class="text-xs text-gray-400 mb-1">Highest Bid</p>
              <p class="text-base font-bold text-green-400">${formatUGX(highestBid)}</p>
            </div>
            <div class="p-2.5 rounded-xl bg-gray-800/30">
              <p class="text-xs text-gray-400 mb-1">Age</p>
              <p class="text-sm font-bold">${ageDisplay}</p>
            </div>
            <div class="p-2.5 rounded-xl bg-gray-800/30">
              <p class="text-xs text-gray-400 mb-1">Weight</p>
              <p class="text-sm font-bold">${listing.weight || 0} KG</p>
            </div>
            <div class="p-2.5 rounded-xl bg-gray-800/30">
              <p class="text-xs text-gray-400 mb-1">Sex</p>
              <p class="text-sm font-bold">${listing.sex || "N/A"}</p>
            </div>
            <div class="p-2.5 rounded-xl bg-gray-800/30">
              <p class="text-xs text-gray-400 mb-1">Quantity</p>
              <p class="text-sm font-bold">${listing.quantity || 1}</p>
            </div>
          </div>
          <div class="p-2.5 rounded-xl bg-gray-800/30">
            <p class="text-xs text-gray-400 mb-1">
              <i class="bi bi-geo-alt text-emerald-500"></i> Location
            </p>
            <p class="text-sm font-bold">${listing.location || "Not specified"}</p>
          </div>
        </div>
        <div class="space-y-3">
          <div class="p-2.5 rounded-xl bg-gray-800/30">
            <h4 class="font-bold text-sm mb-1.5 text-emerald-500">Description</h4>
            <p class="text-xs text-gray-300 leading-relaxed">${
              listing.description || "No description provided"
            }</p>
          </div>
          <div class="p-2.5 rounded-xl glass-strong border border-gray-800/50">
            <h4 class="font-bold text-sm mb-1.5 text-emerald-500">Seller Information</h4>
            <div class="flex items-center gap-2.5 mb-3">
              <div class="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center font-bold text-sm">
                ${(listing.seller?.name || "A").charAt(0).toUpperCase()}
              </div>
              <div>
                <p class="font-bold text-sm">${listing.seller?.name || "Seller"}</p>
                <p class="text-xs text-gray-400">${listing.seller?.phone || "No phone"}</p>
              </div>
            </div>
            <div class="flex gap-2">
              <button onclick="shareListing('${listing._id}')" class="flex-1 px-3 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-xs font-semibold hover:shadow-lg transition-all">
                <i class="bi bi-share mr-2"></i>Share
              </button>
              <button onclick="toggleFavourite('${listing._id}')" class="px-3 py-2 rounded-xl glass border border-gray-800/50 hover:border-rose-500/50 transition-all">
                <i class="bi ${isFavouriteListing(listing._id) ? "bi-heart-fill text-rose-400" : "bi-heart"}"></i>
              </button>
              <button onclick="callSeller('${listing._id}')" class="px-3 py-2 rounded-xl glass border border-gray-800/50 hover:border-emerald-500/50 transition-all ${sellerPhone ? "" : "opacity-50 cursor-not-allowed"}" ${sellerPhone ? "" : "disabled"}>
                <i class="bi bi-telephone"></i>
              </button>
              ${
                canDelete
                  ? `<button onclick="deleteListing('${listing._id}')" class="px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/35 hover:bg-red-500/20 transition-all text-red-300" title="Delete Listing">
                <i class="bi bi-trash3"></i>
              </button>`
                  : ""
              }
            </div>
          </div>
          <div class="p-2.5 rounded-xl bg-gray-800/30">
            <p class="text-xs text-gray-400">Listed on</p>
            <p class="text-sm font-bold">${new Date(
              listing.createdAt,
            ).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}</p>
          </div>
        </div>
      </div>
      <div class="hidden md:block sticky bottom-0 -mx-3 px-3 py-2.5 bg-gray-900/96 backdrop-blur-xl border-t border-gray-800/60 z-20">
        <button onclick="openBidModal('${listing._id}')" class="w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 font-bold text-sm hover:shadow-2xl hover:shadow-emerald-500/30 transition-all">
          <i class="bi bi-cart-plus mr-2"></i>Place Bid
        </button>
      </div>
      <div class="md:hidden fixed bottom-3 left-3 right-3 z-[70]">
        <button onclick="openBidModal('${listing._id}')" class="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 font-bold text-sm shadow-2xl shadow-emerald-900/40 border border-emerald-300/30">
          <i class="bi bi-cart-plus mr-2"></i>Place Bid
        </button>
      </div>
    </div>
  `;
  modal.classList.remove("hidden");
  modal.classList.add("flex");
  setModalBodyLock(true);
}
function openBidModal(listingId) {
  const listing = allListings.find((l) => l._id === listingId);
  if (!listing) {
    return;
  }
  if (!currentUser) {
    alert("Please log in to place a bid");
    return;
  }
  const bidModal = document.getElementById("bid-modal");
  const bidContent = document.getElementById("bid-modal-content");
  const openingPrice = Number(listing.startingPrice || 0);
  bidContent.innerHTML = `
    <div class="sticky top-0 bg-gray-900/95 backdrop-blur-xl border-b border-gray-800/50 p-6 flex items-center justify-between z-10">
      <h2 class="text-3xl font-black font-display text-gradient">
        <i class="bi bi-gavel mr-2"></i>Place Your Bid
      </h2>
      <button onclick="closeBidModal()" class="w-12 h-12 rounded-xl glass hover:bg-gray-800/50 flex items-center justify-center transition-all">
        <i class="bi bi-x-lg text-xl"></i>
      </button>
    </div>
    <div class="p-6 space-y-6">
      <div class="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-green-600/10 border border-emerald-500/30">
        <div class="flex items-center gap-4">
          <div class="w-16 h-16 rounded-xl overflow-hidden">
            <img src="${
              listing.photos && listing.photos.length > 0
                ? listing.photos[0]
                : "https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=100&h=100&fit=crop"
            }" alt="${listing.breed || "Animal"}" class="w-full h-full object-cover">
          </div>
          <div>
            <h3 class="text-xl font-bold text-emerald-400">${
              listing.breed || "Unknown Breed"
            }</h3>
            <p class="text-sm text-gray-400">
              <i class="bi bi-geo-alt"></i> ${listing.location || "Unknown"}
            </p>
          </div>
        </div>
      </div>
      <div class="space-y-4">
        <h3 class="text-lg font-bold text-emerald-500">
          <i class="bi bi-person-fill mr-2"></i>Bidder Information
        </h3>
        <div class="p-4 rounded-xl glass border border-gray-800/50">
          <label class="block text-sm font-semibold text-gray-300 mb-2">Full Name</label>
          <div class="px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700/50 text-white font-medium">
            ${currentUser.name || "Roggers Anguzu"}
          </div>
        </div>
        <div class="p-4 rounded-xl glass border border-gray-800/50">
          <label class="block text-sm font-semibold text-gray-300 mb-2">Phone Number</label>
          <div class="px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700/50 text-white font-medium">
            ${currentUser.phone || "Not Available"}
          </div>
        </div>
      </div>
      <div class="space-y-4">
        <h3 class="text-lg font-bold text-emerald-500">
          <i class="bi bi-currency-exchange mr-2"></i>Bid Amount
        </h3>
        <div class="p-4 rounded-xl glass border border-gray-800/50">
          <label class="block text-sm font-semibold text-gray-300 mb-2">Enter Your Bid (UGX)</label>
          <div class="relative">
            <span class="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 font-bold text-xl">UGX</span>
            <input
              type="number"
              id="bid-amount"
              placeholder="0.00"
              min="${openingPrice > 0 ? openingPrice : 1}"
              step="0.01"
              class="w-full pl-20 pr-4 py-4 rounded-xl bg-gray-900/80 border-2 border-gray-700/50 focus:border-emerald-500/50 focus:outline-none transition-all text-white text-xl font-bold"
            />
          </div>
          <p class="text-xs text-gray-500 mt-2">
            <i class="bi bi-info-circle mr-1"></i>Opening price: ${formatUGX(openingPrice)}
          </p>
        </div>
      </div>
      <div class="p-4 rounded-xl glass border border-gray-800/50">
        <label class="block text-sm font-semibold text-gray-300 mb-2">
          Additional Notes (Optional)
        </label>
        <textarea
          id="bid-notes"
          rows="3"
          placeholder="Any special requests or comments..."
          class="w-full px-4 py-3 rounded-lg bg-gray-900/80 border border-gray-700/50 focus:border-emerald-500/50 focus:outline-none transition-all text-white resize-none"
        ></textarea>
      </div>
      <div class="flex gap-3 pt-4">
        <button onclick="submitBid('${listingId}')" class="flex-1 px-6 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 font-bold text-lg hover:shadow-2xl hover:shadow-emerald-500/30 transition-all">
          <i class="bi bi-check-circle mr-2"></i>Submit Bid
        </button>
        <button onclick="closeBidModal()" class="px-6 py-4 rounded-xl glass border border-gray-800/50 hover:border-red-500/50 font-bold transition-all text-red-400">
          <i class="bi bi-x-circle mr-2"></i>Cancel
        </button>
      </div>
      <div class="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
        <p class="text-sm text-blue-300">
          <i class="bi bi-shield-check mr-2"></i>
          Your bid will be submitted to the seller. You'll be notified if your bid is accepted.
        </p>
      </div>
    </div>
  `;
  bidModal.classList.remove("hidden");
  bidModal.classList.add("flex");
  setModalBodyLock(true);
}
function closeBidModal(event) {
  if (event && event.target !== event.currentTarget) return;
  const modal = document.getElementById("bid-modal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
  if (document.getElementById("detail-modal").classList.contains("hidden")) {
    setModalBodyLock(false);
  }
}
async function submitBid(listingId) {
  const bidAmount = document.getElementById("bid-amount").value;
  const bidNotes = document.getElementById("bid-notes").value;
  if (!bidAmount || parseFloat(bidAmount) <= 0) {
    alert("Please enter a valid bid amount");
    return;
  }
  if (!currentUser) {
    alert("User information not available. Please log in again.");
    return;
  }
  const bidData = {
    listingId: listingId,
    bidderId: currentUser._id,
    bidderName: currentUser.name,
    bidderPhone: currentUser.phone,
    amount: parseFloat(bidAmount),
    notes: bidNotes || "",
    timestamp: new Date().toISOString(),
  };
  try {
    const response = await fetch("/api/bids/create", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(bidData),
    });
    const result = await response.json();
    if (response.ok && result.success) {
      alert(" Bid has been placed successfully!");
      closeBidModal();
      closeDetailModal();
    } else {
      alert(` Failed to place bid: ${result.message || "Unknown error"}`);
    }
  } catch (error) {
    alert("Network error. Please try again.");
  }
}
function closeDetailModal(event) {
  if (event && event.target !== event.currentTarget) return;
  const modal = document.getElementById("detail-modal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
  if (document.getElementById("bid-modal").classList.contains("hidden")) {
    setModalBodyLock(false);
  }
}
function toggleFavourite(listingId) {
  const id = String(listingId);
  const current = getFavouriteIds();
  const exists = current.includes(id);
  const next = exists ? current.filter((x) => x !== id) : [...current, id];
  localStorage.setItem(FAV_STORAGE_KEY, JSON.stringify(next));
  displayListings();
}
async function shareListing(listingId) {
  const listing = allListings.find((l) => l._id === listingId);
  if (!listing) return;
  const shareUrl = `${window.location.origin}/auctions/${encodeURIComponent(listingId)}`;
  const payload = {
    title: `ChuuAuction - ${listing.breed || "Livestock Listing"}`,
    text: `Check this listing: ${listing.breed || "Livestock"} at ${listing.location || "Uganda"}`,
    url: shareUrl,
  };
  try {
    if (navigator.share) {
      await navigator.share(payload);
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(shareUrl);
      alert("Listing link copied to clipboard.");
      return;
    }
  } catch (error) {
  }
  window.prompt("Copy this listing link:", shareUrl);
}
function callSeller(listingId) {
  const listing = allListings.find((l) => l._id === listingId);
  if (!listing) return;
  const sellerPhone = normalizePhone(listing.seller?.phone);
  if (!sellerPhone) {
    alert("Seller phone is not available for this listing.");
    return;
  }
  window.location.href = `tel:${sellerPhone}`;
}
async function deleteListing(listingId) {
  const listing = allListings.find((l) => l._id === listingId);
  if (!listing) return;
  if (!canDeleteListing(listing)) {
    alert("You are not allowed to delete this listing.");
    return;
  }
  const proceed = confirm(
    "Are you sure you want to delete this auction? This will also remove associated bids and cannot be undone.",
  );
  if (!proceed) return;
  try {
    const response = await fetch(`${API_BASE_URL}/${encodeURIComponent(listingId)}`, {
      method: "DELETE",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) {
      throw new Error(result.message || "Failed to delete listing");
    }
    allListings = allListings.filter((l) => l._id !== listingId);
    filteredListings = filteredListings.filter((l) => l._id !== listingId);
    closeDetailModal();
    closeBidModal();
    updateStats();
    displayListings();
    updateFilterDescription();
    alert("Auction deleted successfully.");
  } catch (error) {
    alert(error.message || "Failed to delete listing.");
  }
}
function setupEventListeners() {
  document
    .getElementById("main-search")
    .addEventListener("input", debounce(applyFilters, 300));
  document
    .getElementById("filter-animal-type")
    .addEventListener("change", applyFilters);
  document
    .getElementById("filter-health")
    .addEventListener("change", applyFilters);
  document
    .getElementById("filter-sex")
    .addEventListener("change", applyFilters);
  document.getElementById("sort-by").addEventListener("change", applyFilters);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeDetailModal();
      closeBidModal();
    }
  });
}
function debounce(func, delay) {
  let timeout;
  return function () {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, arguments), delay);
  };
}
function applyFilters() {
  const searchTerm = document
    .getElementById("main-search")
    .value.toLowerCase()
    .trim();
  const animalType = document.getElementById("filter-animal-type").value;
  const health = document.getElementById("filter-health").value;
  const sex = document.getElementById("filter-sex").value;
  const sortBy = document.getElementById("sort-by").value;
  filteredListings = allListings.filter((listing) => {
    if (searchTerm) {
      const matches =
        (listing.breed || "").toLowerCase().includes(searchTerm) ||
        (listing.location || "").toLowerCase().includes(searchTerm) ||
        (listing.description || "").toLowerCase().includes(searchTerm) ||
        (listing.seller?.name || "").toLowerCase().includes(searchTerm);
      if (!matches) return false;
    }
    if (animalType && String(listing.animalType) !== String(animalType))
      return false;
    if (health && listing.healthStatus !== health) return false;
    if (sex && listing.sex !== sex) return false;
    return true;
  });
  sortListings(sortBy);
  displayListings();
  updateFilterDescription();
}
function applyAdvancedFilters() {
  const weightMin =
    parseFloat(document.getElementById("filter-weight-min").value) || 0;
  const weightMax =
    parseFloat(document.getElementById("filter-weight-max").value) || Infinity;
  const ageMin =
    parseFloat(document.getElementById("filter-age-min").value) || 0;
  const ageMax =
    parseFloat(document.getElementById("filter-age-max").value) || Infinity;
  const quantityMin =
    parseFloat(document.getElementById("filter-quantity-min").value) || 0;
  const quantityMax =
    parseFloat(document.getElementById("filter-quantity-max").value) ||
    Infinity;
  const vaccination = document.querySelector(
    'input[name="vaccination"]:checked',
  ).value;
  const location = document
    .getElementById("filter-location")
    .value.toLowerCase()
    .trim();
  filteredListings = filteredListings.filter((listing) => {
    if (listing.weight < weightMin || listing.weight > weightMax) return false;
    const totalAgeYears =
      (listing.age?.years || 0) + (listing.age?.months || 0) / 12;
    if (totalAgeYears < ageMin || totalAgeYears > ageMax) return false;
    if (listing.quantity < quantityMin || listing.quantity > quantityMax)
      return false;
    if (vaccination !== "" && listing.vaccinated.toString() !== vaccination)
      return false;
    if (location && !(listing.location || "").toLowerCase().includes(location))
      return false;
    return true;
  });
  displayListings();
  updateFilterDescription();
}
function sortListings(sortBy) {
  switch (sortBy) {
    case "newest":
      filteredListings.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      );
      break;
    case "oldest":
      filteredListings.sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
      );
      break;
    case "weight-high":
      filteredListings.sort((a, b) => (b.weight || 0) - (a.weight || 0));
      break;
    case "weight-low":
      filteredListings.sort((a, b) => (a.weight || 0) - (b.weight || 0));
      break;
    case "quantity-high":
      filteredListings.sort((a, b) => (b.quantity || 0) - (a.quantity || 0));
      break;
    case "quantity-low":
      filteredListings.sort((a, b) => (a.quantity || 0) - (b.quantity || 0));
      break;
    default:
      filteredListings.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      );
  }
}
function updateStats() {
  document.getElementById("total-listings").textContent = allListings.length;
  document.getElementById("live-auctions").textContent = allListings.filter(
    (l) => l.endAt && new Date(l.endAt).getTime() > Date.now(),
  ).length;
  document.getElementById("verified-sellers").textContent = new Set(
    allListings.map((l) => l.seller?.name || "Anonymous"),
  ).size;
}
function updateFilterDescription() {
  const activeFilters = [];
  const animalType = document.getElementById("filter-animal-type").value;
  if (animalType)
    activeFilters.push(animalTypeMap[animalType]?.name || "Unknown");
  const health = document.getElementById("filter-health").value;
  if (health) activeFilters.push(health);
  const sex = document.getElementById("filter-sex").value;
  if (sex) activeFilters.push(sex);
  const desc =
    activeFilters.length > 0
      ? `Filtered by: ${activeFilters.join(", ")}`
      : "Showing all available livestock";
  document.getElementById("filter-description").textContent = desc;
}
function toggleAdvancedFilters() {
  const panel = document.getElementById("advanced-filters");
  panel.classList.toggle("expanded");
}
function resetFilters() {
  document.getElementById("main-search").value = "";
  document.getElementById("filter-animal-type").value = "";
  document.getElementById("filter-health").value = "";
  document.getElementById("filter-sex").value = "";
  document.getElementById("sort-by").value = "newest";
  document.getElementById("filter-weight-min").value = "";
  document.getElementById("filter-weight-max").value = "";
  document.getElementById("filter-age-min").value = "";
  document.getElementById("filter-age-max").value = "";
  document.getElementById("filter-quantity-min").value = "";
  document.getElementById("filter-quantity-max").value = "";
  document.getElementById("filter-location").value = "";
  document.querySelector('input[name="vaccination"][value=""]').checked = true;
  filteredListings = [...allListings];
  displayListings();
  updateFilterDescription();
}
function clearSearch() {
  document.getElementById("main-search").value = "";
  applyFilters();
}
function setViewMode(mode) {
  currentViewMode = mode;
  const gridBtn = document.getElementById("view-grid");
  const listBtn = document.getElementById("view-list");
  const container = document.getElementById("listings-container");
  gridBtn.classList.toggle("border-emerald-500/50", mode === "grid");
  gridBtn.classList.toggle("border-gray-800/50", mode !== "grid");
  listBtn.classList.toggle("border-emerald-500/50", mode === "list");
  listBtn.classList.toggle("border-gray-800/50", mode !== "list");
  if (mode === "list") {
    container.classList.remove("grid", "md:grid-cols-2", "lg:grid-cols-3");
    container.classList.add("space-y-4");
  } else {
    container.classList.add("grid", "md:grid-cols-2");
    container.classList.remove("space-y-4");
  }
}
function loadMore() {
  currentPage++;
}
