import axios from "axios";

const normalizePhone = (value) =>
  String(value || "")
    .replace(/[^\d]/g, "")
    .trim();

const shouldSendPhoneNumber = (phoneNumber, currency) => {
  if (!phoneNumber) return false;
  const normalizedCurrency = String(currency || "").trim().toUpperCase();
  if (normalizedCurrency === "KES") {
    return phoneNumber.startsWith("254");
  }
  return true;
};

export const getIntaSendConfig = () => ({
  publicKey: String(process.env.INTASEND_PUBLISHABLE_KEY || "").trim(),
  secretKey: String(process.env.INTASEND_SECRET_KEY || "").trim(),
  currency: String(process.env.INTASEND_CURRENCY || "KES")
    .trim()
    .toUpperCase(),
  testMode: String(process.env.INTASEND_TEST_MODE || "true").trim() !== "false",
  webhookChallenge: String(process.env.INTASEND_WEBHOOK_CHALLENGE || "").trim(),
  baseUrl: String(process.env.APP_BASE_URL || "").trim(),
});

export const isIntaSendConfigured = () =>
  Boolean(getIntaSendConfig().publicKey);

export const buildApiRef = (bidId) =>
  `bid-${String(bidId)}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const resolveAppBaseUrl = (req) => {
  const configuredBaseUrl = String(process.env.APP_BASE_URL || "").trim();
  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/+$/, "");
  }

  const forwardedProto = String(req?.headers?.["x-forwarded-proto"] || "")
    .split(",")[0]
    .trim();
  const forwardedHost = String(req?.headers?.["x-forwarded-host"] || "")
    .split(",")[0]
    .trim();
  const host = forwardedHost || String(req?.get?.("host") || "").trim();
  const protocol =
    forwardedProto ||
    String(req?.protocol || "").trim() ||
    (host.includes("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");

  if (!host) {
    return "http://localhost:3000";
  }

  return `${protocol}://${host}`.replace(/\/+$/, "");
};

export const mapProviderStateToLocalStatus = (value) => {
  const state = String(value || "")
    .trim()
    .toUpperCase();
  if (["COMPLETE", "COMPLETED", "SUCCESS", "PAID"].includes(state)) {
    return "complete";
  }
  if (["PROCESSING", "PENDING", "IN_PROGRESS"].includes(state)) {
    return "processing";
  }
  if (["FAILED", "FAIL", "ERROR"].includes(state)) {
    return "failed";
  }
  if (["CANCELLED", "CANCELED"].includes(state)) {
    return "cancelled";
  }
  return "pending";
};

export const extractPaymentPayload = (payload = {}) => {
  const invoice =
    payload.invoice ||
    payload.data?.invoice ||
    payload.data ||
    payload.payment ||
    payload;

  return {
    state:
      payload.state || payload.status || invoice.state || invoice.status || "",
    invoiceId:
      payload.invoice_id ||
      payload.invoiceId ||
      invoice.invoice_id ||
      invoice.invoiceId ||
      invoice.id ||
      "",
    apiRef:
      payload.api_ref ||
      payload.apiRef ||
      invoice.api_ref ||
      invoice.apiRef ||
      invoice.reference ||
      "",
    provider:
      payload.provider || invoice.provider || invoice.payment_provider || "",
    failedReason:
      payload.failed_reason ||
      payload.failedReason ||
      invoice.failed_reason ||
      invoice.failedReason ||
      payload.message ||
      "",
  };
};

export const buildCheckoutPayload = ({
  bid,
  buyer,
  auction,
  baseUrl,
  amount,
}) => {
  const config = getIntaSendConfig();
  const effectiveBaseUrl = String(baseUrl || config.baseUrl || "http://localhost:3000")
    .trim()
    .replace(/\/+$/, "");
  const checkoutAmount = Number.isFinite(Number(amount))
    ? Number(amount)
    : Number(bid.amount || 0);

  return {
    publicKey: config.publicKey,
    currency: config.currency,
    testMode: config.testMode,
    host: effectiveBaseUrl,
    redirectUrl: `${effectiveBaseUrl}/dashboard/payment/return/${bid._id}`,
    amount: checkoutAmount,
    firstName: String(buyer?.name || "Buyer").trim(),
    lastName: "",
    email: String(buyer?.email || "").trim(),
    phoneNumber: normalizePhone(buyer?.phone || bid.bidderPhone || ""),
    apiRef: buildApiRef(bid._id),
    narrative: `${auction?.animalType || "Livestock"} auction winner payment`,
  };
};

export const createHostedCheckoutLink = async (checkoutPayload) => {
  const payload = {
    first_name: checkoutPayload.firstName,
    last_name: checkoutPayload.lastName || "",
    email: checkoutPayload.email,
    host: checkoutPayload.host,
    amount: checkoutPayload.amount,
    currency: checkoutPayload.currency,
    api_ref: checkoutPayload.apiRef,
    redirect_url: checkoutPayload.redirectUrl,
    comment: checkoutPayload.narrative,
  };

  if (shouldSendPhoneNumber(checkoutPayload.phoneNumber, checkoutPayload.currency)) {
    payload.phone_number = checkoutPayload.phoneNumber;
  }

  const response = await axios.post(
    "https://api.intasend.com/api/v1/checkout/",
    payload,
    {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-IntaSend-Public-API-Key": checkoutPayload.publicKey,
      },
      timeout: 30000,
    },
  );

  return response.data || {};
};

export const fetchIntaSendPaymentStatus = async (invoiceId) => {
  const config = getIntaSendConfig();
  if (!config.secretKey || !invoiceId) {
    return null;
  }

  const response = await axios.post(
    "https://api.intasend.com/api/v1/payment/status/",
    {
      invoice_id: invoiceId,
    },
    {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${config.secretKey}`,
      },
      timeout: 30000,
    },
  );

  return response.data || {};
};
