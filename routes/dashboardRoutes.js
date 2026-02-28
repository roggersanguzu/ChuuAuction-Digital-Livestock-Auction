import express from "express";

const router = express.Router();

// Login required
const requireLogin = (req, res, next) => {
  console.log(
    "requireLogin check - session.user:",
    req.session?.user ? "EXISTS" : "MISSING",
  );
  console.log("Session ID:", req.sessionID);
  console.log("Cookies received:", req.headers.cookie || "no cookies");

  if (!req.session?.user) {
    console.log("No session user - redirecting to login");
    req.flash("error_msg", "Please log in to access the dashboard");
    return res.redirect("/auth/login");
  }
  next();
};

// Role check
const requireRole = (allowedRoles) => (req, res, next) => {
  const userRole = req.session?.user?.role?.trim().toLowerCase();

  console.log("requireRole check:", {
    userRole,
    allowed: allowedRoles,
    sessionUser: !!req.session?.user,
  });

  if (!req.session?.user || !userRole || !allowedRoles.includes(userRole)) {
    console.log("Role check FAILED - redirecting to login");
    req.flash(
      "error_msg",
      "Access denied. You do not have permission for this dashboard.",
    );
    return res.redirect("/auth/login");
  }

  console.log("Role check PASSED");
  next();
};

// Routes
router.get(
  "/farmer",
  requireLogin,
  requireRole(["seller", "farmer"]),
  (req, res) => {
    console.log(
      "ROUTE HIT: /dashboard/farmer - Rendering dashboard/farmer.hbs",
    );
    res.render("dashboard/farmer", {
      title: "Farmer Dashboard",
      user: req.session.user,
    });
  },
);

router.get("/buyer", requireLogin, requireRole(["buyer"]), (req, res) => {
  console.log("ROUTE HIT: /dashboard/buyer - Rendering dashboard/buyer.hbs");
  res.render("dashboard/buyer", {
    title: "Buyer Dashboard",
    user: req.session.user,
  });
});

router.get(
  "/admin",
  requireLogin,
  requireRole(["administrator", "admin"]),
  (req, res) => {
    console.log("ROUTE HIT: /dashboard/admin - Rendering dashboard/admin.hbs");
    res.render("dashboard/admin", {
      title: "Admin Dashboard",
      user: req.session.user,
    });
  },
);

// ============================================
// NEW BID DASHBOARD ROUTES
// ============================================

// My Bids - User's personal bid dashboard (View only)
router.get("/my-bids", requireLogin, (req, res) => {
  console.log(
    "ROUTE HIT: /dashboard/my-bids - Rendering dashboard/my-bids.hbs",
  );
  res.render("dashboard/my-bids", {
    title: "My Bids",
    user: req.session.user,
    userId: req.session.user.id,
  });
});

// Auction Bids - Seller's bid management dashboard
router.get(
  "/auction-bids",
  requireLogin,
  requireRole(["seller", "farmer", "administrator", "admin"]),
  (req, res) => {
    console.log(
      "ROUTE HIT: /dashboard/auction-bids - Rendering dashboard/auction-bids.hbs",
    );
    // For admin, we pass a flag to show all bids
    const isAdmin =
      req.session.user.role === "Administrator" ||
      req.session.user.role === "admin";
    res.render("dashboard/auction-bids", {
      title: "Manage Auction Bids",
      user: req.session.user,
      userId: req.session.user.id,
      isAdmin: isAdmin,
    });
  },
);

// Auction Bids for specific auction
router.get(
  "/auction-bids/:auctionId",
  requireLogin,
  requireRole(["seller", "farmer", "administrator", "admin"]),
  (req, res) => {
    console.log(
      "ROUTE HIT: /dashboard/auction-bids/:auctionId - Rendering dashboard/auction-bids.hbs",
    );
    const isAdmin =
      req.session.user.role === "Administrator" ||
      req.session.user.role === "admin";
    res.render("dashboard/auction-bids", {
      title: "Manage Auction Bids",
      user: req.session.user,
      userId: req.session.user.id,
      auctionId: req.params.auctionId,
      isAdmin: isAdmin,
    });
  },
);

export default router;
