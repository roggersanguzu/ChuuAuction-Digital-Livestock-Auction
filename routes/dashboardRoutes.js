import express from "express";
const router = express.Router();
const requireLogin = (req, res, next) => {
if (!req.session?.user) {
    req.flash("error_msg", "Please log in to access the dashboard");
    return res.redirect("/auth/login");
  }
  next();
};
const requireRole = (allowedRoles) => (req, res, next) => {
  const userRole = req.session?.user?.role?.trim().toLowerCase();
if (!req.session?.user || !userRole || !allowedRoles.includes(userRole)) {
    req.flash(
      "error_msg",
      "Access denied. You do not have permission for this dashboard.",
    );
    return res.redirect("/auth/login");
  }
  next();
};
router.get(
  "/farmer",
  requireLogin,
  requireRole(["seller", "farmer"]),
  (req, res) => {
res.render("dashboard/farmer", {
      title: "Farmer Dashboard",
      user: req.session.user,
    });
  },
);
router.get("/buyer", requireLogin, requireRole(["buyer"]), (req, res) => {
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
    res.render("dashboard/admin", {
      title: "Admin Dashboard",
      user: req.session.user,
    });
  },
);
router.get("/my-bids", requireLogin, (req, res) => {
res.render("dashboard/my-bids", {
    title: "My Bids",
    user: req.session.user,
    userId: req.session.user.id,
  });
});
router.get("/transactions", requireLogin, (req, res) => {
  const role = req.session.user.role?.trim().toLowerCase();
  const isAdmin = role === "administrator" || role === "admin";
  const dashboardHome =
    isAdmin ? "/dashboard/admin#transactions" : role === "buyer" ? "/dashboard/buyer" : "/dashboard/farmer";
  res.render("dashboard/transactions", {
    title: isAdmin ? "All Transactions" : "My Transactions",
    user: req.session.user,
    isAdmin,
    dashboardHome,
  });
});
router.get("/auction-bids", requireLogin, (req, res) => {
const role = req.session.user.role?.trim().toLowerCase();
  const isAdmin = role === "administrator" || role === "admin";
  const canManageBids = ["seller", "farmer", "administrator", "admin"].includes(
    role,
  );
  const dashboardHome =
    role === "buyer" ? "/dashboard/buyer" : "/dashboard/farmer";
  res.render("dashboard/auction-bids", {
    title: "Manage Auction Bids",
    user: req.session.user,
    userId: req.session.user.id,
    isAdmin: isAdmin,
    canManageBids,
    dashboardHome,
    userRole: role,
  });
});
router.get("/auction-bids/:auctionId", requireLogin, (req, res) => {
const role = req.session.user.role?.trim().toLowerCase();
  const isAdmin = role === "administrator" || role === "admin";
  const canManageBids = ["seller", "farmer", "administrator", "admin"].includes(
    role,
  );
  const dashboardHome =
    role === "buyer" ? "/dashboard/buyer" : "/dashboard/farmer";
  res.render("dashboard/auction-bids", {
    title: "Manage Auction Bids",
    user: req.session.user,
    userId: req.session.user.id,
    auctionId: req.params.auctionId,
    isAdmin: isAdmin,
    canManageBids,
    dashboardHome,
    userRole: role,
  });
});
export default router;
