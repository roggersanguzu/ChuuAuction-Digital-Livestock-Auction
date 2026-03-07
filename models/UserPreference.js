import mongoose from "mongoose";
const userPreferenceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    buyer: {
      type: {
        notifications: { type: Boolean, default: true },
        emailAlerts: { type: Boolean, default: true },
        smsAlerts: { type: Boolean, default: false },
        desktopAlerts: { type: Boolean, default: true },
        soundAlerts: { type: Boolean, default: false },
        instantOutbidAlerts: { type: Boolean, default: true },
        watchlistAlerts: { type: Boolean, default: true },
        maxBidConfirm: { type: Boolean, default: true },
        bidDigestHours: { type: Number, min: 1, max: 24, default: 6 },
        autoRefreshSeconds: { type: Number, min: 10, max: 300, default: 60 },
        compactCards: { type: Boolean, default: false },
        showBidTrends: { type: Boolean, default: true },
        showSuggestedAuctions: { type: Boolean, default: true },
      },
      default: () => ({}),
    },
    farmer: {
      type: {
        notifications: { type: Boolean, default: true },
        autoCloseBids: { type: Boolean, default: false },
        bidAlertThreshold: { type: Number, min: 0, max: 1000000000, default: 0 },
        newBidAlerts: { type: Boolean, default: true },
        desktopAlerts: { type: Boolean, default: true },
        soundAlerts: { type: Boolean, default: false },
        reservePriceWarnings: { type: Boolean, default: true },
        winnerConfirmationRequired: { type: Boolean, default: true },
        showContactOnListings: { type: Boolean, default: true },
        autoArchiveDays: { type: Number, min: 1, max: 90, default: 14 },
        autoRefreshSeconds: { type: Number, min: 10, max: 300, default: 60 },
        compactCards: { type: Boolean, default: false },
        showPerformanceWidgets: { type: Boolean, default: true },
      },
      default: () => ({}),
    },
    themeMode: {
      type: String,
      enum: ["light", "dark", "system"],
      default: "dark",
    },
    timezone: { type: String, default: "EAT" },
  },
  { timestamps: true },
);
const UserPreference = mongoose.model("UserPreference", userPreferenceSchema);
export default UserPreference;

