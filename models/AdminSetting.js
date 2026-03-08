import mongoose from "mongoose";
const adminSettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "admin-platform",
      index: true,
    },
    auctionDuration: { type: Number, min: 1, max: 30, default: 7 },
    minScore: { type: Number, min: 50, max: 100, default: 75 },
    autoClose: { type: Boolean, default: true },
    buyerVerification: { type: Boolean, default: true },
    realtimeAlerts: { type: Boolean, default: true },
    maintenanceMode: { type: Boolean, default: false },
    adminNote: { type: String, trim: true, default: "" },
    lastAction: { type: String, trim: true, default: "" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);
const AdminSetting = mongoose.model("AdminSetting", adminSettingSchema);
export default AdminSetting;
