import express from "express";
import {
  createWinnerCheckoutSession,
  getWinnerPaymentStatus,
  handleIntaSendWebhook,
  initializeWinnerPayment,
  listAdminTransactions,
  listMyTransactions,
  recordWinnerPaymentEvent,
  redirectToWinnerCheckoutSession,
  renderWinnerPaymentPage,
} from "../controllers/paymentController.js";

const router = express.Router();

const requireLogin = (req, res, next) => {
  if (!req.session?.user) {
    if (req.path.startsWith("/api/")) {
      return res.status(401).json({
        success: false,
        message: "Please log in to continue",
      });
    }
    req.flash("error_msg", "Please log in to continue");
    return res.redirect("/auth/login");
  }
  next();
};

router.get("/dashboard/payment", requireLogin, renderWinnerPaymentPage);
router.post("/dashboard/payment/checkout", requireLogin, redirectToWinnerCheckoutSession);
router.get("/dashboard/payment/return/:bidId", requireLogin, (req, res) => {
  const bidId = String(req.params.bidId || "").trim();
  if (!bidId) {
    req.flash("error_msg", "Missing payment return reference");
    return res.redirect("/dashboard/my-bids");
  }
  return res.redirect(`/dashboard/payment?bidId=${encodeURIComponent(bidId)}&source=redirect`);
});
router.post("/api/payments/initialize", requireLogin, initializeWinnerPayment);
router.post("/api/payments/checkout-session", requireLogin, createWinnerCheckoutSession);
router.post("/api/payments/:bidId/event", requireLogin, recordWinnerPaymentEvent);
router.get("/api/payments/mine", requireLogin, listMyTransactions);
router.get("/api/payments/admin/all", requireLogin, listAdminTransactions);
router.get("/api/payments/:bidId/status", requireLogin, getWinnerPaymentStatus);
router.post("/api/payments/webhooks/intasend", handleIntaSendWebhook);

export default router;
