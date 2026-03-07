(function () {
  function byId(id) {
    return document.getElementById(id);
  }
  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
  function formatCurrency(amount) {
    var n = Number(amount) || 0;
    return "UGX " + n.toLocaleString("en-US");
  }
  function timeLeftLabel(endAt) {
    if (!endAt) return "No deadline";
    var end = new Date(endAt);
    if (Number.isNaN(end.getTime())) return "No deadline";
    var diff = end.getTime() - Date.now();
    if (diff <= 0) return "Closed";
    var totalMinutes = Math.floor(diff / 60000);
    var days = Math.floor(totalMinutes / 1440);
    var hours = Math.floor((totalMinutes % 1440) / 60);
    var mins = totalMinutes % 60;
    if (days > 0) return days + "d " + hours + "h left";
    if (hours > 0) return hours + "h " + mins + "m left";
    return mins + "m left";
  }
  async function fetchJson(url) {
    var response = await fetch(url, { credentials: "same-origin" });
    var payload = await response.json().catch(function () {
      return {};
    });
    if (!response.ok || !payload || payload.success === false) {
      throw new Error(payload.message || "Request failed");
    }
    return payload;
  }
  async function fetchAuctions() {
    var payload = await fetchJson("/auctions/api/all");
    var all = Array.isArray(payload.data) ? payload.data : [];
    var now = Date.now();
    var active = all.filter(function (auction) {
      if (!auction.endAt) return true;
      var end = new Date(auction.endAt);
      if (Number.isNaN(end.getTime())) return true;
      return end.getTime() > now;
    });
    return active.slice(0, 6);
  }
  async function fetchAuctionBidMeta(auctionId) {
    try {
      var payload = await fetchJson("/api/bids/auction/" + encodeURIComponent(auctionId));
      var bids = Array.isArray(payload.data) ? payload.data : [];
      var highest = bids.length
        ? bids.reduce(function (max, bid) {
            var amount = Number(bid.amount) || 0;
            return amount > max ? amount : max;
          }, 0)
        : 0;
      return {
        count: bids.length,
        highest: highest,
      };
    } catch (_) {
      return { count: 0, highest: 0 };
    }
  }
  function makeAuctionCard(auction, bidMeta) {
    var firstPhoto = Array.isArray(auction.photos) && auction.photos.length
      ? auction.photos[0]
      : "/img/cow4.jpg";
    var label = [auction.animalType, auction.breed].filter(Boolean).join(" - ");
    if (!label) label = "Livestock Auction";
    var ageYears = Number(auction.age && auction.age.years) || 0;
    var ageMonths = Number(auction.age && auction.age.months) || 0;
    var ageLabel = ageYears + "y " + ageMonths + "m";
    var weight = Number(auction.weight) || 0;
    var startPrice = Number(auction.expectedPrice) || 0;
    var currentBid = Number(bidMeta.highest) || startPrice;
    var bidsCount = Number(bidMeta.count) || 0;
    var progress = startPrice > 0
      ? Math.min(100, Math.max(6, Math.round((currentBid / startPrice) * 40)))
      : 12;
    var destination = "/auctions/animalList?auctionId=" + encodeURIComponent(auction._id);
    return (
      '<div class="auction-card" data-link="' + destination + '">' +
      '<div class="auction-img">' +
      '<img src="' + escapeHtml(firstPhoto) + '" alt="' + escapeHtml(label) + '" onerror="this.style.background=\'linear-gradient(135deg,#1c2030,#252a3a)\';this.removeAttribute(\'src\')"/>' +
      '<div class="auction-img-overlay"></div>' +
      '<div class="auction-badges">' +
      '<span class="badge-live"><span class="ld"></span>Live Now</span>' +
      '<button class="btn-heart" type="button"><i class="bi bi-heart"></i></button>' +
      "</div>" +
      '<div class="auction-meta">' +
      '<span class="meta-pill"><i class="bi bi-clock tc"></i> ' + escapeHtml(timeLeftLabel(auction.endAt)) + "</span>" +
      '<span class="meta-pill"><i class="bi bi-people bc"></i> ' + bidsCount + " bids</span>" +
      "</div>" +
      "</div>" +
      '<div class="auction-body">' +
      '<div class="auction-name">' + escapeHtml(label) + "</div>" +
      '<div class="auction-specs">Age: ' + ageLabel + " | Weight: " + weight + "kg | " + escapeHtml(auction.location || "Uganda") + "</div>" +
      '<div class="bid-section">' +
      '<div class="bid-row"><span class="bid-key">Current Bid</span><span class="bid-alert hot">' + (bidsCount ? "Competitive" : "New Listing") + "</span></div>" +
      '<div class="bid-current">' + formatCurrency(currentBid) + "</div>" +
      '<div class="bid-progress"><div class="bid-progress-bar" style="width:' + progress + '%"></div></div>' +
      '<div class="bid-progress-label">' + bidsCount + " bid(s) so far</div>" +
      '<div class="bid-start">Started at ' + formatCurrency(startPrice) + "</div>" +
      "</div>" +
      '<a class="btn-bid primary" href="' + destination + '"><i class="bi bi-hammer"></i> Open Auction</a>' +
      "</div>" +
      "</div>"
    );
  }
  function wireCards(container) {
    container.addEventListener("click", function (event) {
      var heart = event.target.closest(".btn-heart");
      if (heart) {
        heart.classList.toggle("active");
        var icon = heart.querySelector("i");
        if (icon) {
          icon.classList.toggle("bi-heart");
          icon.classList.toggle("bi-heart-fill");
        }
        return;
      }
      var card = event.target.closest("[data-link]");
      if (!card) return;
      var ignore = event.target.closest("a,button,input,select,textarea,label");
      if (ignore) return;
      var link = card.getAttribute("data-link");
      if (link) window.location.href = link;
    });
  }
  async function init() {
    var container = byId("buyer-live-auctions");
    if (!container) return;
    container.innerHTML =
      '<div class="auction-card"><div class="auction-body"><div class="auction-name">Loading live auctions...</div><div class="auction-specs">Fetching current listings and bids.</div></div></div>';
    wireCards(container);
    try {
      var auctions = await fetchAuctions();
      if (!auctions.length) {
        container.innerHTML =
          '<div class="auction-card"><div class="auction-body"><div class="auction-name">No active auctions found</div><div class="auction-specs">Create an auction or check back shortly.</div></div></div>';
        return;
      }
      var metas = await Promise.all(
        auctions.map(function (a) {
          return fetchAuctionBidMeta(a._id);
        }),
      );
      container.innerHTML = auctions
        .map(function (auction, index) {
          return makeAuctionCard(auction, metas[index] || { count: 0, highest: 0 });
        })
        .join("");
    } catch (error) {
      container.innerHTML =
        '<div class="auction-card"><div class="auction-body"><div class="auction-name">Unable to load auctions</div><div class="auction-specs">' +
        escapeHtml(error.message || "Please refresh and try again.") +
        "</div></div></div>";
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

