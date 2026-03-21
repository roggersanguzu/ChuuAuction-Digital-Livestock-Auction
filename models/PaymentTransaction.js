import mongoose from "mongoose";

const paymentTransactionSchema = new mongoose.Schema(
  {
    bid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bid",
      required: true,
      index: true,
      unique: true,
    },
    auction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auction",
      required: true,
      index: true,
    },
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      default: "KES",
      trim: true,
      uppercase: true,
    },
    provider: {
      type: String,
      required: true,
      default: "IntaSend",
    },
    apiRef: {
      type: String,
      trim: true,
      index: true,
    },
    invoiceId: {
      type: String,
      trim: true,
      index: true,
    },
    paymentProvider: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "processing", "complete", "failed", "cancelled"],
      default: "pending",
      index: true,
    },
    failedReason: {
      type: String,
      default: "",
      trim: true,
    },
    lastWebhookAt: {
      type: Date,
    },
    lastClientEventAt: {
      type: Date,
    },
    rawInitPayload: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    rawLatestPayload: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true },
);

const PaymentTransaction = mongoose.model(
  "PaymentTransaction",
  paymentTransactionSchema,
);

export default PaymentTransaction;
