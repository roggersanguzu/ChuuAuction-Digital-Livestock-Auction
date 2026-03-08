(function () {
  var container = document.getElementById("buyer-bid-outcomes");
  if (!container) return;
  var userId = container.dataset.userId || "";
  if (!userId) {
    container.innerHTML =
      '<div class="card" style="padding:18px;color:#8892a4">Could not load bid outcomes. Please log in again.</div>';
    return;
  }
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
  function statusBadge(status) {
    if (status === "accepted") {
      return '<span class="badge-live" style="background:rgba(34,197,94,.22);border-color:rgba(34,197,94,.45)"><span class="ld" style="background:#22c55e"></span>Winner</span>';
    }
    if (status === "rejected") {
      return '<span class="badge-live" style="background:rgba(239,68,68,.18);border-color:rgba(239,68,68,.35)"><span class="ld" style="background:#ef4444"></span>Outbid</span>';
    }
    return '<span class="badge-live" style="background:rgba(234,179,8,.18);border-color:rgba(234,179,8,.35)"><span class="ld" style="background:#eab308"></span>In Progress</span>';
  }
  function toPhotoUrl(photos) {
    if (!Array.isArray(photos) || photos.length === 0) return "/img/cow.png";
    if (typeof photos[0] === "string") return photos[0];
    return photos[0]?.url || "/img/cow.png";
  }
  function renderCard(bid) {
    var auction = bid.auction || {};
    var image = toPhotoUrl(auction.photos);
    var title = [auction.animalType, auction.breed].filter(Boolean).join(" - ") || "Livestock Auction";
    return (
      '<div class="auction-card">' +
      '<div class="auction-img">' +
      '<img src="' +
      image +
      '" alt="' +
      escapeHtml(title) +
      '" onerror="this.src=\'/img/cow.png\'">' +
      '<div class="auction-img-overlay"></div>' +
      '<div class="auction-badges">' +
      statusBadge(bid.status) +
      '</div>' +
      '</div>' +
      '<div class="auction-body">' +
      '<div class="auction-name">' +
      escapeHtml(title) +
      '</div>' +
      '<div class="auction-specs">' +
      escapeHtml(auction.location || "Location pending") +
      '</div>' +
      '<div class="bid-section">' +
      '<div class="bid-row"><span class="bid-key">Your Bid</span></div>' +
      '<div class="bid-current">' +
      formatCurrency(bid.amount) +
      '</div>' +
      '<div class="bid-start">Placed: ' +
      new Date(bid.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
      '</div>' +
      '</div>' +
      '<a class="btn-bid" style="display:inline-flex;justify-content:center;text-decoration:none" href="/dashboard/my-bids">View Full Bid Status</a>' +
      '</div></div>'
    );
  }
  async function loadOutcomes() {
    container.innerHTML =
      '<div class="card" style="padding:18px;color:#8892a4">Loading your bid outcomes...</div>';
    try {
      var res = await fetch("/api/bids/user/" + encodeURIComponent(userId) + "/details");
      var result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.message || "Failed to load bid outcomes");
      }
      var bids = Array.isArray(result.data) ? result.data : [];
      if (bids.length === 0) {
        container.innerHTML =
          '<div class="card" style="padding:18px;color:#8892a4">No bid outcomes yet. Start bidding to track winner status here.</div>';
        return;
      }
      bids.sort(function (a, b) {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      var top = bids.slice(0, 3);
      container.innerHTML = top.map(renderCard).join("");
    } catch (err) {
      container.innerHTML =
        '<div class="card" style="padding:18px;color:#fca5a5">Could not load your bid outcomes right now.</div>';
    }
  }
  document.addEventListener("DOMContentLoaded", loadOutcomes);
})();
