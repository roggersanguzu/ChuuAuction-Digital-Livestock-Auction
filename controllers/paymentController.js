import Bid from "../models/Bid.js";
import Auction from "../models/Auction.js";
import User from "../models/User.js";
import PaymentTransaction from "../models/PaymentTransaction.js";
import {
  buildCheckoutPayload,
  createHostedCheckoutLink,
  extractPaymentPayload,
  fetchIntaSendPaymentStatus,
  getIntaSendConfig,
  isIntaSendConfigured,
  mapProviderStateToLocalStatus,
  resolveAppBaseUrl,
} from "../services/intasendService.js";

const getSessionUserId = (req) => req.session?.user?.id || req.session?.user?._id;

const requireWinnerBid = async (req, bidId) => {
  const sessionUserId = getSessionUserId(req);
  if (!sessionUserId) {
    const error = new Error("Please log in to continue");
    error.statusCode = 401;
    throw error;
  }

  const bid = await Bid.findById(bidId);
  if (!bid) {
    const error = new Error("Winning bid not found");
    error.statusCode = 404;
    throw error;
  }

  if (String(bid.bidderId) !== String(sessionUserId)) {
    const error = new Error("You can only pay for your own winning bid");
    error.statusCode = 403;
    throw error;
  }

  if (bid.status !== "accepted") {
    const error = new Error("Only declared winning bids can proceed to payment");
    error.statusCode = 400;
    throw error;
  }

  const auction = await Auction.findById(bid.listingId).populate("seller", "name email phone");
  if (!auction) {
    const error = new Error("Auction not found for this bid");
    error.statusCode = 404;
    throw error;
  }

  const buyer = await User.findById(sessionUserId).select("name email phone");
  if (!buyer) {
    const error = new Error("Buyer account not found");
    error.statusCode = 404;
    throw error;
  }

  return { bid, auction, buyer };
};

const getOrCreateTransaction = async ({ bid, auction, buyer, checkoutPayload }) => {
  const update = {
    auction: auction._id,
    buyer: buyer._id,
    seller: auction.seller?._id || auction.seller,
    amount: Number(bid.amount || 0),
    currency: checkoutPayload.currency,
    provider: "IntaSend",
    apiRef: checkoutPayload.apiRef,
    rawInitPayload: checkoutPayload,
  };

  const existing = await PaymentTransaction.findOne({ bid: bid._id });
  if (!existing) {
    return PaymentTransaction.create({
      bid: bid._id,
      ...update,
    });
  }

  if (existing.status !== "complete") {
    Object.assign(existing, update);
    existing.failedReason = "";
    if (!["processing", "complete"].includes(existing.status)) {
      existing.status = "pending";
    }
    await existing.save();
  }

  return existing;
};

const applyProviderPayloadToTransaction = async (transaction, payload, source) => {
  if (!transaction || !payload) return transaction;
  const details = extractPaymentPayload(payload);
  const nextStatus = mapProviderStateToLocalStatus(details.state);

  if (details.invoiceId) transaction.invoiceId = details.invoiceId;
  if (details.apiRef) transaction.apiRef = details.apiRef;
  if (details.provider) transaction.paymentProvider = details.provider;
  transaction.failedReason = details.failedReason || transaction.failedReason;
  transaction.rawLatestPayload = payload;
  if (source === "webhook") transaction.lastWebhookAt = new Date();
  if (source === "client" || source === "status") {
    transaction.lastClientEventAt = new Date();
  }
  if (nextStatus) transaction.status = nextStatus;
  await transaction.save();
  return transaction;
};

const extractProviderErrorMessage = (error, fallback) => {
  const data = error?.response?.data;
  if (!data) return fallback;
  if (typeof data === "string") return data;
  if (typeof data.detail === "string" && data.detail.trim()) return data.detail;
  if (typeof data.message === "string" && data.message.trim()) return data.message;
  if (Array.isArray(data.errors) && data.errors.length > 0) {
    return data.errors
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item.message === "string") return item.message;
        return JSON.stringify(item);
      })
      .join(" | ");
  }
  return JSON.stringify(data);
};

export const renderWinnerPaymentPage = async (req, res) => {
  try {
    const bidId = String(req.query.bidId || "").trim();
    if (!bidId) {
      req.flash("error_msg", "Missing winning bid reference");
      return res.redirect("/dashboard/my-bids");
    }

    const { bid, auction, buyer } = await requireWinnerBid(req, bidId);
    const transaction = await PaymentTransaction.findOne({ bid: bid._id });
    const config = getIntaSendConfig();
    const currentBaseUrl = resolveAppBaseUrl(req);

    return res.render("dashboard/payment", {
      title: "Winner Payment",
      user: req.session.user,
      bidId: String(bid._id),
      amount: Number(bid.amount || 0),
      minimumAmount: Number(bid.amount || 0),
      displayCurrency: "UGX",
      paymentCurrency: config.currency,
      providerConfigured: isIntaSendConfigured(),
      providerName: "IntaSend",
      buyerName: buyer.name,
      buyerEmail: buyer.email || "",
      buyerPhone: buyer.phone || bid.bidderPhone || "",
      animalType: auction.animalType || "Livestock",
      breed: auction.breed || "",
      sellerName: auction.seller?.name || "Seller",
      auctionLocation: auction.location || "",
      transactionStatus: transaction?.status || "pending",
      transactionProvider: transaction?.paymentProvider || "",
      transactionInvoiceId: transaction?.invoiceId || "",
      transactionApiRef: transaction?.apiRef || "",
      currentBaseUrl,
      webhookPath: "/api/payments/webhooks/intasend",
      currentYear: new Date().getFullYear(),
    });
  } catch (error) {
    req.flash("error_msg", error.message || "Unable to load payment page");
    return res.redirect("/dashboard/my-bids");
  }
};

export const initializeWinnerPayment = async (req, res) => {
  try {
    if (!isIntaSendConfigured()) {
      return res.status(503).json({
        success: false,
        message:
          "IntaSend sandbox is not configured yet. Add your publishable key first.",
      });
    }

    const bidId = String(req.body.bidId || "").trim();
    const { bid, auction, buyer } = await requireWinnerBid(req, bidId);
    const baseUrl = resolveAppBaseUrl(req);
    const winningAmount = Number(bid.amount || 0);
    const requestedAmount = Number(req.body.amount);
    const paymentAmount =
      Number.isFinite(requestedAmount) && requestedAmount > 0
        ? requestedAmount
        : winningAmount;

    if (paymentAmount < winningAmount) {
      return res.status(400).json({
        success: false,
        message: `Payment amount cannot be less than the winning amount of ${winningAmount}`,
      });
    }

    const existingTransaction = await PaymentTransaction.findOne({ bid: bid._id });
    if (existingTransaction?.status === "complete") {
      return res.status(400).json({
        success: false,
        message: "This winning bid has already been paid",
      });
    }
    const checkoutPayload = buildCheckoutPayload({
      bid,
      buyer,
      auction,
      baseUrl,
      amount: paymentAmount,
    });
    const transaction = await getOrCreateTransaction({
      bid,
      auction,
      buyer,
      checkoutPayload,
    });

    return res.status(200).json({
      success: true,
      message: "Payment initialized",
      data: {
        bidId: String(bid._id),
        amount: checkoutPayload.amount,
        currency: checkoutPayload.currency,
        publicKey: checkoutPayload.publicKey,
        firstName: checkoutPayload.firstName,
        email: checkoutPayload.email,
        phoneNumber: checkoutPayload.phoneNumber,
        apiRef: transaction.apiRef,
        narrative: checkoutPayload.narrative,
        redirectUrl: checkoutPayload.redirectUrl,
        testMode: checkoutPayload.testMode,
      },
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to initialize payment",
    });
  }
};

export const createWinnerCheckoutSession = async (req, res) => {
  try {
    if (!isIntaSendConfigured()) {
      return res.status(503).json({
        success: false,
        message: "IntaSend sandbox is not configured yet.",
      });
    }

    const bidId = String(req.body.bidId || "").trim();
    const { bid, auction, buyer } = await requireWinnerBid(req, bidId);
    const baseUrl = resolveAppBaseUrl(req);
    const winningAmount = Number(bid.amount || 0);
    const requestedAmount = Number(req.body.amount);
    const paymentAmount =
      Number.isFinite(requestedAmount) && requestedAmount > 0
        ? requestedAmount
        : winningAmount;

    if (paymentAmount < winningAmount) {
      return res.status(400).json({
        success: false,
        message: `Payment amount cannot be less than the winning amount of ${winningAmount}`,
      });
    }

    const existingTransaction = await PaymentTransaction.findOne({ bid: bid._id });
    if (existingTransaction?.status === "complete") {
      return res.status(400).json({
        success: false,
        message: "This winning bid has already been paid",
      });
    }

    const checkoutPayload = buildCheckoutPayload({
      bid,
      buyer,
      auction,
      baseUrl,
      amount: paymentAmount,
    });
    const transaction = await getOrCreateTransaction({
      bid,
      auction,
      buyer,
      checkoutPayload,
    });

    const providerResponse = await createHostedCheckoutLink(checkoutPayload);
    await applyProviderPayloadToTransaction(transaction, providerResponse, "status");

    const checkoutUrl =
      providerResponse.url ||
      providerResponse.checkout_url ||
      providerResponse.hosted_url ||
      "";

    if (!checkoutUrl) {
      return res.status(502).json({
        success: false,
        message: "IntaSend did not return a checkout URL",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        checkoutUrl,
        apiRef: transaction.apiRef,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        extractProviderErrorMessage(
          error,
          error.message || "Unable to create IntaSend checkout session",
        ) ||
        "Unable to create IntaSend checkout session",
    });
  }
};

export const redirectToWinnerCheckoutSession = async (req, res) => {
  try {
    if (!isIntaSendConfigured()) {
      req.flash("error_msg", "IntaSend sandbox is not configured yet.");
      return res.redirect("/dashboard/my-bids");
    }

    const bidId = String(req.body.bidId || req.params.bidId || req.query.bidId || "").trim();
    const { bid, auction, buyer } = await requireWinnerBid(req, bidId);
    const baseUrl = resolveAppBaseUrl(req);
    const winningAmount = Number(bid.amount || 0);
    const requestedAmount = Number(req.body.amount || req.query.amount);
    const paymentAmount =
      Number.isFinite(requestedAmount) && requestedAmount > 0
        ? requestedAmount
        : winningAmount;

    if (paymentAmount < winningAmount) {
      req.flash("error_msg", "Payment amount cannot be lower than the winning amount.");
      return res.redirect(`/dashboard/payment?bidId=${encodeURIComponent(bidId)}`);
    }

    const existingTransaction = await PaymentTransaction.findOne({ bid: bid._id });
    if (existingTransaction?.status === "complete") {
      req.flash("error_msg", "This winning bid has already been paid.");
      return res.redirect(`/dashboard/payment?bidId=${encodeURIComponent(bidId)}`);
    }

    const checkoutPayload = buildCheckoutPayload({
      bid,
      buyer,
      auction,
      baseUrl,
      amount: paymentAmount,
    });
    const transaction = await getOrCreateTransaction({
      bid,
      auction,
      buyer,
      checkoutPayload,
    });
    const providerResponse = await createHostedCheckoutLink(checkoutPayload);
    await applyProviderPayloadToTransaction(transaction, providerResponse, "status");

    const checkoutUrl =
      providerResponse.url ||
      providerResponse.checkout_url ||
      providerResponse.hosted_url ||
      "";

    if (!checkoutUrl) {
      req.flash("error_msg", "IntaSend checkout link was not returned.");
      return res.redirect(`/dashboard/payment?bidId=${encodeURIComponent(bidId)}`);
    }

    return res.redirect(checkoutUrl);
  } catch (error) {
    req.flash(
      "error_msg",
      extractProviderErrorMessage(
        error,
        error.message || "Unable to create IntaSend checkout session",
      ) || "Unable to create IntaSend checkout session",
    );
    return res.redirect(`/dashboard/payment?bidId=${encodeURIComponent(String(req.body.bidId || req.params.bidId || req.query.bidId || "").trim())}`);
  }
};

export const recordWinnerPaymentEvent = async (req, res) => {
  try {
    const bidId = String(req.params.bidId || req.body.bidId || "").trim();
    const sessionUserId = getSessionUserId(req);

    if (!sessionUserId) {
      return res.status(401).json({ success: false, message: "Please log in" });
    }

    const transaction = await PaymentTransaction.findOne({ bid: bidId });
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Payment transaction not found for this bid",
      });
    }

    if (String(transaction.buyer) !== String(sessionUserId)) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to update this payment",
      });
    }

    await applyProviderPayloadToTransaction(transaction, req.body || {}, "client");

    return res.status(200).json({
      success: true,
      message: "Payment event recorded",
      data: { status: transaction.status },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to record payment event",
    });
  }
};

export const getWinnerPaymentStatus = async (req, res) => {
  try {
    const bidId = String(req.params.bidId || "").trim();
    const sessionUserId = getSessionUserId(req);
    if (!sessionUserId) {
      return res.status(401).json({ success: false, message: "Please log in" });
    }

    const transaction = await PaymentTransaction.findOne({ bid: bidId });
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "No payment transaction found yet",
      });
    }

    if (String(transaction.buyer) !== String(sessionUserId)) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to view this payment",
      });
    }

    if (transaction.invoiceId && transaction.status !== "complete") {
      try {
        const providerStatus = await fetchIntaSendPaymentStatus(transaction.invoiceId);
        await applyProviderPayloadToTransaction(transaction, providerStatus, "status");
      } catch {
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        status: transaction.status,
        provider: transaction.provider,
        paymentProvider: transaction.paymentProvider || "",
        invoiceId: transaction.invoiceId || "",
        apiRef: transaction.apiRef || "",
        failedReason: transaction.failedReason || "",
        updatedAt: transaction.updatedAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to fetch payment status",
    });
  }
};

export const handleIntaSendWebhook = async (req, res) => {
  try {
    const config = getIntaSendConfig();
    const suppliedChallenge =
      String(req.headers["x-intasend-challenge"] || req.body?.challenge || "").trim();

    if (config.webhookChallenge && suppliedChallenge !== config.webhookChallenge) {
      return res.status(403).json({ success: false, message: "Invalid challenge" });
    }

    const details = extractPaymentPayload(req.body || {});
    if (!details.apiRef && !details.invoiceId) {
      return res.status(200).json({
        success: true,
        ignored: true,
        message: "Webhook received but no collection reference was found",
      });
    }

    const transaction = await PaymentTransaction.findOne({
      $or: [
        ...(details.apiRef ? [{ apiRef: details.apiRef }] : []),
        ...(details.invoiceId ? [{ invoiceId: details.invoiceId }] : []),
      ],
    });

    if (!transaction) {
      return res.status(200).json({
        success: true,
        ignored: true,
        message: "Webhook received but no matching local transaction was found",
      });
    }

    await applyProviderPayloadToTransaction(transaction, req.body || {}, "webhook");

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Webhook processing failed",
    });
  }
};
