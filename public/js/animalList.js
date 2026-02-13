// animalList.js - Livestock Auction Listing Page
console.log("[Script] animalList.js loaded");

// ============================================
// CONFIGURATION
// ============================================
const API_BASE_URL = "/auctions/api";

// Global state
let allListings = [];
let filteredListings = [];
let currentViewMode = "grid";
let currentPage = 1;
const itemsPerPage = 12;
let isLoading = false;
let currentUser = null; // Store current user data

// Animal type mapping
const animalTypeMap = {
  1: { name: "Cattle", icon: "🐄" },
  2: { name: "Goat", icon: "🐐" },
  3: { name: "Sheep", icon: "🐑" },
  4: { name: "Pig", icon: "🐷" },
  5: { name: "Poultry", icon: "🐔" },
  6: { name: "Rabbit", icon: "🐰" },
  7: { name: "Duck", icon: "🦆" },
};

// Health status icons
const healthIcons = {
  Excellent: "💚",
  Good: "💙",
  Fair: "💛",
};

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener("DOMContentLoaded", function () {
  console.log("=".repeat(60));
  console.log("[Frontend] DOM Content Loaded");
  console.log("[Frontend] Current URL:", window.location.href);
  console.log("[Frontend] API Base URL:", API_BASE_URL);
  console.log("[Frontend] Full API endpoint:", API_BASE_URL + "/all");
  console.log("=".repeat(60));

  loadCurrentUser();
  loadListings();
  setupEventListeners();
});

// ============================================
// LOAD CURRENT USER DATA
// ============================================
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
        console.log("[Frontend]  Current user loaded:", currentUser);
      }
    }
  } catch (error) {
    console.error("[Frontend]  Failed to load current user:", error);
  }
}

// ============================================
// LOAD LISTINGS FROM API
// ============================================
async function loadListings() {
  if (isLoading) {
    console.log("[Frontend] Load already in progress");
    return;
  }

  isLoading = true;
  console.log("[Frontend]  Starting loadListings");
  showLoadingState();

  try {
    const url = `${API_BASE_URL}/all`;
    console.log("[Frontend]  Fetching from:", url);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log("[Frontend]  Request timeout after 15s");
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

    console.log("[Frontend]  Response received");
    console.log("[Frontend] Status:", response.status, response.statusText);

    if (!response.ok) {
      const text = await response.text();
      console.error("[Frontend]  Non-OK response:", response.status);
      console.error("[Frontend] Response body:", text);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text();
      console.error("[Frontend]  Response is not JSON");
      console.error("[Frontend] Content-Type:", contentType);
      console.error(
        "[Frontend] Response body (first 500 chars):",
        text.substring(0, 500),
      );
      throw new Error("Server returned non-JSON response. Expected JSON.");
    }

    const result = await response.json();
    console.log("[Frontend]  Parsed JSON successfully");
    console.log("[Frontend] Response structure:", {
      success: result.success,
      count: result.count,
      dataIsArray: Array.isArray(result.data),
      dataLength: result.data?.length,
    });

    if (result.success && Array.isArray(result.data)) {
      allListings = result.data;
      filteredListings = [...allListings];

      console.log(
        `[Frontend]  Loaded ${allListings.length} auction(s) successfully`,
      );

      if (allListings.length > 0) {
        console.log("[Frontend] Sample listing:", allListings[0]);
      }

      updateStats();
      displayListings();
      hideLoadingState();
    } else {
      console.error("[Frontend]  Unexpected response format:", result);
      throw new Error(result.message || "Invalid response format from server");
    }
  } catch (error) {
    console.error("[Frontend]  Fetch error:", error);
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
    console.log("[Frontend]  loadListings completed");
  }
}

// ============================================
// UI STATE FUNCTIONS
// ============================================
function showLoadingState() {
  console.log("[Frontend]  Showing loading state");
  document.getElementById("loading-state").classList.remove("hidden");
  document.getElementById("listings-container").innerHTML = "";
  document.getElementById("empty-state").classList.add("hidden");
}

function hideLoadingState() {
  console.log("[Frontend]  Hiding loading state");
  document.getElementById("loading-state").classList.add("hidden");
}

function showErrorState(message) {
  console.log("[Frontend]  Showing error state:", message);
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
            <li>1. Open browser console (F12) → Network tab</li>
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

// ============================================
// DISPLAY FUNCTIONS
// ============================================
function displayListings() {
  console.log("[Frontend]  Displaying listings");
  const container = document.getElementById("listings-container");
  const resultsCount = document.getElementById("results-count");
  const emptyState = document.getElementById("empty-state");

  resultsCount.textContent = filteredListings.length;

  if (filteredListings.length === 0) {
    console.log("[Frontend]  No listings to display");
    container.innerHTML = "";
    emptyState.classList.remove("hidden");
    return;
  }

  console.log("[Frontend]  Displaying", filteredListings.length, "listings");
  emptyState.classList.add("hidden");
  container.innerHTML = "";

  filteredListings.forEach((listing, index) => {
    const card = createListingCard(listing, index);
    container.appendChild(card);
  });
}

function createListingCard(listing, index) {
  const card = document.createElement("div");
  card.className =
    "card-hover rounded-2xl glass-strong border border-gray-800/50 overflow-hidden animate-scale-in";
  card.style.animationDelay = `${index * 0.05}s`;

  const animalInfo = animalTypeMap[listing.animalType] || {
    name: "Unknown",
    icon: "🐾",
  };
  const healthIcon = healthIcons[listing.healthStatus] || "❤️";
  const ageDisplay = `${listing.age?.years || 0}y ${listing.age?.months || 0}m`;

  const mainPhoto =
    listing.photos && listing.photos.length > 0
      ? listing.photos[0]
      : "https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=400&h=300&fit=crop";

  const photoCount = listing.photos ? listing.photos.length : 0;

  card.innerHTML = `
    <div class="image-container relative h-56 overflow-hidden">
      <img src="${mainPhoto}" alt="${
        listing.breed || "Animal"
      }" class="w-full h-full object-cover" onerror="this.src='https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=400&h=300&fit=crop'">
      <div class="absolute top-3 left-3 flex gap-2">
        <span class="px-3 py-1 rounded-full glass-strong backdrop-blur-md text-xs font-bold">
          ${animalInfo.icon} ${animalInfo.name}
        </span>
        ${
          listing.vaccinated
            ? '<span class="px-3 py-1 rounded-full bg-green-500/90 backdrop-blur-md text-xs font-bold status-live">✅ Vaccinated</span>'
            : ""
        }
      </div>
      <div class="absolute top-3 right-3">
        <span class="px-3 py-1 rounded-full glass-strong backdrop-blur-md text-xs font-bold">
          ${healthIcon} ${listing.healthStatus || "Good"}
        </span>
      </div>
      ${
        photoCount > 1
          ? `
        <div class="absolute bottom-3 right-3 px-3 py-1 rounded-full glass-strong backdrop-blur-md text-xs font-bold">
          <i class="bi bi-images"></i> ${photoCount}
        </div>
      `
          : ""
      }
    </div>

    <div class="p-5">
      <div class="mb-4">
        <h3 class="text-xl font-bold mb-1 font-display">${
          listing.breed || "Unknown Breed"
        }</h3>
        <p class="text-sm text-gray-400">
          <i class="bi bi-geo-alt text-emerald-500"></i> ${
            listing.location || "Unknown"
          }
        </p>
      </div>

      <div class="grid grid-cols-3 gap-3 mb-4">
        <div class="text-center p-2 rounded-lg bg-gray-800/30">
          <p class="text-xs text-gray-400 mb-1">Age</p>
          <p class="font-bold text-sm">${ageDisplay}</p>
        </div>
        <div class="text-center p-2 rounded-lg bg-gray-800/30">
          <p class="text-xs text-gray-400 mb-1">Weight</p>
          <p class="font-bold text-sm">${listing.weight || 0} KG</p>
        </div>
        <div class="text-center p-2 rounded-lg bg-gray-800/30">
          <p class="text-xs text-gray-400 mb-1">Sex</p>
          <p class="font-bold text-sm">${listing.sex === "Male" ? "♂" : "♀"} ${
            listing.sex || "N/A"
          }</p>
        </div>
      </div>

      <p class="text-sm text-gray-400 mb-4 line-clamp-2">${
        listing.description || "No description"
      }</p>

      <div class="flex items-center justify-between pt-4 border-t border-gray-800/50">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center font-bold text-sm">
            ${(listing.seller?.name || "A").charAt(0).toUpperCase()}
          </div>
          <div>
            <p class="text-xs font-semibold">${
              listing.seller?.name || "Anonymous"
            }</p>
            <p class="text-xs text-gray-500">
              <i class="bi bi-star-fill text-yellow-500"></i> ${
                listing.seller?.rating || 4.5
              }
            </p>
          </div>
        </div>
        <div>
          <button 
            onclick="viewDetails('${listing._id}')" 
            class="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 font-semibold text-sm hover:shadow-lg hover:shadow-emerald-500/30 transition-all">
            View Details
          </button>
        </div>
      </div>

      ${
        listing.quantity > 1
          ? `
        <div class="mt-3 text-center py-2 rounded-lg bg-blue-500/10 border border-blue-500/30">
          <p class="text-sm font-bold text-blue-400">
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
    console.warn("[Frontend] Listing not found for ID:", id);
    return;
  }

  const animalInfo = animalTypeMap[listing.animalType] || {
    name: "Unknown",
    icon: "🐾",
  };
  const healthIcon = healthIcons[listing.healthStatus] || "❤️";
  const ageDisplay = `${listing.age?.years || 0} years ${
    listing.age?.months || 0
  } months`;

  const photos =
    listing.photos && listing.photos.length > 0
      ? listing.photos
      : [
          "https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=400&h=300&fit=crop",
        ];

  const modal = document.getElementById("detail-modal");
  const content = document.getElementById("modal-content");

  content.innerHTML = `
    <div class="sticky top-0 bg-gray-900/95 backdrop-blur-xl border-b border-gray-800/50 p-6 flex items-center justify-between z-10">
      <h2 class="text-3xl font-black font-display text-gradient">Listing Details</h2>
      <button onclick="closeDetailModal()" class="w-12 h-12 rounded-xl glass hover:bg-gray-800/50 flex items-center justify-center transition-all">
        <i class="bi bi-x-lg text-xl"></i>
      </button>
    </div>

    <div class="p-6 space-y-6">
      <div class="grid grid-cols-1 ${
        photos.length > 1 ? "md:grid-cols-2" : ""
      } gap-4">
        ${photos
          .map(
            (photo) => `
          <div class="image-container rounded-2xl overflow-hidden h-64">
            <img src="${photo}" alt="${
              listing.breed || "Animal"
            }" class="w-full h-full object-cover" onerror="this.src='https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=400&h=300&fit=crop'">
          </div>
        `,
          )
          .join("")}
      </div>

      <div class="grid md:grid-cols-2 gap-6">
        <div class="space-y-4">
          <div>
            <h3 class="text-3xl font-black font-display mb-2">${
              listing.breed || "Unknown Breed"
            }</h3>
            <div class="flex flex-wrap gap-2">
              <span class="tag-pill px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-semibold">
                ${animalInfo.icon} ${animalInfo.name}
              </span>
              <span class="tag-pill px-4 py-2 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 font-semibold">
                ${healthIcon} ${listing.healthStatus || "Good"}
              </span>
              ${
                listing.vaccinated
                  ? '<span class="tag-pill px-4 py-2 rounded-full bg-green-500/20 border border-green-500/30 text-green-400 font-semibold">✅ Vaccinated</span>'
                  : ""
              }
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="p-4 rounded-xl bg-gray-800/30">
              <p class="text-sm text-gray-400 mb-1">Age</p>
              <p class="text-xl font-bold">${ageDisplay}</p>
            </div>
            <div class="p-4 rounded-xl bg-gray-800/30">
              <p class="text-sm text-gray-400 mb-1">Weight</p>
              <p class="text-xl font-bold">${listing.weight || 0} KG</p>
            </div>
            <div class="p-4 rounded-xl bg-gray-800/30">
              <p class="text-sm text-gray-400 mb-1">Sex</p>
              <p class="text-xl font-bold">${listing.sex === "Male" ? "♂" : "♀"} ${
                listing.sex || "N/A"
              }</p>
            </div>
            <div class="p-4 rounded-xl bg-gray-800/30">
              <p class="text-sm text-gray-400 mb-1">Quantity</p>
              <p class="text-xl font-bold">${listing.quantity || 1}</p>
            </div>
          </div>

          <div class="p-4 rounded-xl bg-gray-800/30">
            <p class="text-sm text-gray-400 mb-1">
              <i class="bi bi-geo-alt text-emerald-500"></i> Location
            </p>
            <p class="text-lg font-bold">${listing.location || "Not specified"}</p>
          </div>

          ${
            listing.vaccinated
              ? `
          <div class="p-4 rounded-xl bg-green-500/10 border border-green-500/30">
            <p class="text-sm text-gray-400 mb-1">Vaccination License</p>
            <p class="text-lg font-bold text-green-400">${
              listing.vaccinationLicense || "N/A"
            }</p>
          </div>
          `
              : ""
          }
        </div>

        <div class="space-y-4">
          <div class="p-4 rounded-xl bg-gray-800/30">
            <h4 class="font-bold text-lg mb-3 text-emerald-500">Description</h4>
            <p class="text-gray-300 leading-relaxed">${
              listing.description || "No description provided"
            }</p>
          </div>

          <div class="p-4 rounded-xl glass-strong border border-gray-800/50">
            <h4 class="font-bold text-lg mb-3 text-emerald-500">Seller Information</h4>
            <div class="flex items-center gap-3 mb-4">
              <div class="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center font-bold text-xl">
                ${(listing.seller?.name || "A").charAt(0).toUpperCase()}
              </div>
              <div>
                <p class="font-bold text-lg">${
                  listing.seller?.name || "Renowned Seller"
                }</p>
                <div class="flex items-center gap-2 text-sm">
                  ${
                    listing.seller?.verified
                      ? '<span class="text-blue-400"><i class="bi bi-patch-check-fill"></i> Verified</span>'
                      : ""
                  }
                  <span class="text-yellow-500">
                    <i class="bi bi-star-fill"></i> ${
                      listing.seller?.rating || 4.5
                    }
                  </span>
                </div>
              </div>
            </div>
            <div class="flex gap-2">
              <button class="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 font-semibold hover:shadow-lg transition-all">
                <i class="bi bi-chat-dots mr-2"></i>Contact Seller
              </button>
              <button class="px-4 py-3 rounded-xl glass border border-gray-800/50 hover:border-emerald-500/50 transition-all">
                <i class="bi bi-telephone"></i>
              </button>
            </div>
          </div>

          <div class="p-4 rounded-xl bg-gray-800/30">
            <p class="text-sm text-gray-400">Listed on</p>
            <p class="text-lg font-bold">${new Date(
              listing.createdAt,
            ).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}</p>
          </div>
        </div>
      </div>

      <div class="flex gap-3 pt-6 border-t border-gray-800/50">
        <button onclick="openBidModal('${listing._id}')" class="flex-1 px-6 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 font-bold text-lg hover:shadow-2xl hover:shadow-emerald-500/30 transition-all">
          <i class="bi bi-cart-plus mr-2"></i>Place Bid
        </button>
        <button class="px-6 py-4 rounded-xl glass border border-gray-800/50 hover:border-emerald-500/50 font-bold transition-all">
          <i class="bi bi-heart"></i>
        </button>
        <button class="px-6 py-4 rounded-xl glass border border-gray-800/50 hover:border-emerald-500/50 font-bold transition-all">
          <i class="bi bi-share"></i>
        </button>
      </div>
    </div>
  `;

  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

// ============================================
// BID MODAL FUNCTIONS
// ============================================
function openBidModal(listingId) {
  const listing = allListings.find((l) => l._id === listingId);
  if (!listing) {
    console.warn("[Frontend] Listing not found for bidding");
    return;
  }

  if (!currentUser) {
    alert("Please log in to place a bid");
    return;
  }

  const bidModal = document.getElementById("bid-modal");
  const bidContent = document.getElementById("bid-modal-content");

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
      <!-- Listing Info -->
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

      <!-- Bidder Information (Read-only from database) -->
      <div class="space-y-4">
        <h3 class="text-lg font-bold text-emerald-500">
          <i class="bi bi-person-fill mr-2"></i>Bidder Information
        </h3>
        
        <div class="p-4 rounded-xl glass border border-gray-800/50">
          <label class="block text-sm font-semibold text-gray-300 mb-2">Full Name</label>
          <div class="px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700/50 text-white font-medium">
            ${currentUser.name || "Not Available"}
          </div>
        </div>

        <div class="p-4 rounded-xl glass border border-gray-800/50">
          <label class="block text-sm font-semibold text-gray-300 mb-2">Phone Number</label>
          <div class="px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700/50 text-white font-medium">
            ${currentUser.phone || "Not Available"}
          </div>
        </div>
      </div>

      <!-- Bid Amount -->
      <div class="space-y-4">
        <h3 class="text-lg font-bold text-emerald-500">
          <i class="bi bi-currency-exchange mr-2"></i>Bid Amount
        </h3>
        
        <div class="p-4 rounded-xl glass border border-gray-800/50">
          <label class="block text-sm font-semibold text-gray-300 mb-2">Enter Your Bid (KES)</label>
          <div class="relative">
            <span class="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 font-bold text-xl">KES</span>
            <input
              type="number"
              id="bid-amount"
              placeholder="0.00"
              min="1"
              step="0.01"
              class="w-full pl-20 pr-4 py-4 rounded-xl bg-gray-900/80 border-2 border-gray-700/50 focus:border-emerald-500/50 focus:outline-none transition-all text-white text-xl font-bold"
            />
          </div>
          <p class="text-xs text-gray-500 mt-2">
            <i class="bi bi-info-circle mr-1"></i>Enter your maximum bid amount
          </p>
        </div>
      </div>

      <!-- Additional Notes (Optional) -->
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

      <!-- Action Buttons -->
      <div class="flex gap-3 pt-4">
        <button onclick="submitBid('${listingId}')" class="flex-1 px-6 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 font-bold text-lg hover:shadow-2xl hover:shadow-emerald-500/30 transition-all">
          <i class="bi bi-check-circle mr-2"></i>Submit Bid
        </button>
        <button onclick="closeBidModal()" class="px-6 py-4 rounded-xl glass border border-gray-800/50 hover:border-red-500/50 font-bold transition-all text-red-400">
          <i class="bi bi-x-circle mr-2"></i>Cancel
        </button>
      </div>

      <!-- Info Notice -->
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
}

function closeBidModal(event) {
  if (event && event.target !== event.currentTarget) return;
  const modal = document.getElementById("bid-modal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
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

  console.log("[Frontend] Submitting bid:", bidData);

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
    console.error("[Frontend] Error submitting bid:", error);
    alert("Network error. Please try again.");
  }
}

function closeDetailModal(event) {
  if (event && event.target !== event.currentTarget) return;
  const modal = document.getElementById("detail-modal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
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

    if (animalType && listing.animalType !== animalType) return false;
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
  console.log("[Frontend]  Updating stats");
  document.getElementById("total-listings").textContent = allListings.length;
  document.getElementById("live-auctions").textContent = allListings.filter(
    (l) => l.vaccinated,
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
    container.classList.add("grid", "md:grid-cols-2", "lg:grid-cols-3");
    container.classList.remove("space-y-4");
  }
}

function loadMore() {
  currentPage++;
  console.log("[Frontend] Load more triggered - page:", currentPage);
}

console.log("[Frontend]  Script loaded successfully");
