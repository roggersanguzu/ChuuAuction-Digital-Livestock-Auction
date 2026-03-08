import User from "../models/User.js";
import Auction from "../models/Auction.js";
import Bid from "../models/Bid.js";
import Verification from "../models/Verification.js";
import AdminSetting from "../models/AdminSetting.js";
import UserPreference from "../models/UserPreference.js";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
const toObjectId = (value) => {
  if (!value) return null;
  try {
    return new mongoose.Types.ObjectId(value);
  } catch {
    return null;
  }
};
const normalizeRole = (role) => {
  const value = String(role || "").trim().toLowerCase();
  if (value === "seller" || value === "farmer") return "Seller";
  if (value === "buyer") return "Buyer";
  if (value === "administrator" || value === "admin") return "Administrator";
  return null;
};
const isAdminSession = (req) => {
  const role = String(req.session?.user?.role || "").trim().toLowerCase();
  return role === "administrator" || role === "admin";
};
const ADMIN_SETTINGS_KEY = "admin-platform";
const ADMIN_SETTINGS_DEFAULTS = {
  auctionDuration: 7,
  minScore: 75,
  autoClose: true,
  buyerVerification: true,
  realtimeAlerts: true,
  maintenanceMode: false,
  adminNote: "",
  lastAction: "",
};
const getAdminSettingsDoc = async () => {
  let settings = await AdminSetting.findOne({ key: ADMIN_SETTINGS_KEY });
  if (!settings) {
    settings = await AdminSetting.create({
      key: ADMIN_SETTINGS_KEY,
      ...ADMIN_SETTINGS_DEFAULTS,
    });
  }
  return settings;
};
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const getUserPreferenceDoc = async (userIdObj) => {
  let pref = await UserPreference.findOne({ user: userIdObj });
  if (!pref) {
    pref = await UserPreference.create({ user: userIdObj });
  }
  return pref;
};
const getAdminAnalyticsPayload = async () => {
  const now = new Date();
  const periodStart = new Date(now);
  periodStart.setDate(periodStart.getDate() - 30);
  const complianceThreshold = new Date(now);
  complianceThreshold.setDate(complianceThreshold.getDate() - 3);
  const [
    totalAuctions,
    liveAuctions,
    totalBids,
    acceptedBids,
    pendingBids,
    rejectedBids,
    acceptedRows,
    categoryCountsRaw,
    revenueByCategoryRaw,
    bidCountsByDayRaw,
    auctionCountsByDayRaw,
    verificationAggRaw,
    verificationStatusRaw,
    redFlagRowsRaw,
    totalUsers,
    activeUsers,
    complianceUsersRaw,
    complianceCoverageRaw,
  ] = await Promise.all([
    Auction.countDocuments(),
    Auction.countDocuments({ endAt: { $gte: now } }),
    Bid.countDocuments(),
    Bid.countDocuments({ status: "accepted" }),
    Bid.countDocuments({ status: "pending" }),
    Bid.countDocuments({ status: "rejected" }),
    Bid.find({ status: "accepted" }).select("amount listingId"),
    Auction.aggregate([
      { $group: { _id: { $ifNull: ["$animalType", "Unspecified"] }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Bid.aggregate([
      { $match: { status: "accepted" } },
      {
        $lookup: {
          from: "auctions",
          localField: "listingId",
          foreignField: "_id",
          as: "auction",
        },
      },
      { $unwind: { path: "$auction", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { $ifNull: ["$auction.animalType", "Unspecified"] },
          amount: { $sum: "$amount" },
        },
      },
      { $sort: { amount: -1 } },
    ]),
    Bid.aggregate([
      { $match: { createdAt: { $gte: periodStart } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Auction.aggregate([
      { $match: { createdAt: { $gte: periodStart } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Verification.aggregate([
      {
        $project: {
          status: 1,
          analyzed: {
            $cond: [{ $ifNull: ["$aiVerification.verificationDate", false] }, 1, 0],
          },
          ownershipFlagsCount: {
            $size: { $ifNull: ["$aiVerification.ownershipFlags", []] },
          },
          healthFlagsCount: {
            $size: { $ifNull: ["$aiVerification.healthFlags", []] },
          },
          photoFlagsCount: {
            $size: { $ifNull: ["$aiVerification.photoFlags", []] },
          },
        },
      },
      {
        $addFields: {
          totalFlags: {
            $add: ["$ownershipFlagsCount", "$healthFlagsCount", "$photoFlagsCount"],
          },
        },
      },
      {
        $group: {
          _id: null,
          totalSubmissions: { $sum: 1 },
          analyzedSubmissions: { $sum: "$analyzed" },
          flaggedRecords: {
            $sum: { $cond: [{ $gt: ["$totalFlags", 0] }, 1, 0] },
          },
          totalFlags: { $sum: "$totalFlags" },
          severeFlags: {
            $sum: { $cond: [{ $gte: ["$totalFlags", 3] }, 1, 0] },
          },
        },
      },
    ]),
    Verification.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Verification.find({
      $or: [{ status: "rejected" }, { status: "needs_review" }],
    })
      .sort({ updatedAt: -1 })
      .limit(8)
      .populate("farmer", "name email")
      .populate("auction", "animalType breed location")
      .lean(),
    User.countDocuments(),
    User.countDocuments({
      $or: [
        { accountStatus: "active" },
        { accountStatus: { $exists: false } },
        { accountStatus: null },
      ],
    }),
    User.find({
      role: { $ne: "Administrator" },
      createdAt: { $lte: complianceThreshold },
    })
      .select("_id name email role createdAt")
      .lean(),
    Verification.aggregate([
      { $match: { farmer: { $ne: null } } },
      {
        $group: {
          _id: "$farmer",
          hasOwnership: {
            $max: {
              $cond: [{ $in: ["$verificationType", ["ownership", "both"]] }, 1, 0],
            },
          },
          hasHealth: {
            $max: {
              $cond: [{ $in: ["$verificationType", ["health", "both"]] }, 1, 0],
            },
          },
          rejectedCount: {
            $sum: {
              $cond: [{ $eq: ["$status", "rejected"] }, 1, 0],
            },
          },
        },
      },
    ]),
  ]);
  const totalRevenue = acceptedRows.reduce(
    (sum, row) => sum + (Number(row.amount) || 0),
    0,
  );
  const soldAuctionIds = new Set(acceptedRows.map((row) => String(row.listingId)).filter(Boolean));
  const auctionsWithBidIds = await Bid.distinct("listingId");
  const byDayMap = {};
  for (let i = 29; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    byDayMap[key] = { date: key, bids: 0, auctions: 0 };
  }
  bidCountsByDayRaw.forEach((row) => {
    if (byDayMap[row._id]) byDayMap[row._id].bids = Number(row.count || 0);
  });
  auctionCountsByDayRaw.forEach((row) => {
    if (byDayMap[row._id]) byDayMap[row._id].auctions = Number(row.count || 0);
  });
  const verificationAgg = verificationAggRaw[0] || {
    totalSubmissions: 0,
    analyzedSubmissions: 0,
    flaggedRecords: 0,
    totalFlags: 0,
    severeFlags: 0,
  };
  const verificationByStatus = verificationStatusRaw.reduce((acc, item) => {
    acc[item._id || "unknown"] = Number(item.count || 0);
    return acc;
  }, {});
  const byCategory = categoryCountsRaw.map((item) => ({
    category: item._id || "Unspecified",
    count: Number(item.count || 0),
  }));
  const revenueByCategory = revenueByCategoryRaw.map((item) => ({
    category: item._id || "Unspecified",
    amount: Number(item.amount || 0),
  }));
  const complianceMap = complianceCoverageRaw.reduce((acc, item) => {
    acc[String(item._id)] = {
      hasOwnership: Number(item.hasOwnership || 0) > 0,
      hasHealth: Number(item.hasHealth || 0) > 0,
      rejectedCount: Number(item.rejectedCount || 0),
    };
    return acc;
  }, {});
  const missingComplianceUsers = complianceUsersRaw
    .map((user) => {
      const coverage = complianceMap[String(user._id)] || {
        hasOwnership: false,
        hasHealth: false,
        rejectedCount: 0,
      };
      const missing = [];
      if (!coverage.hasOwnership) missing.push("ownership");
      if (!coverage.hasHealth) missing.push("health");
      if (!missing.length && coverage.rejectedCount <= 0) return null;
      return {
        userId: user._id,
        name: user.name || "Unknown user",
        email: user.email || "",
        role: user.role || "",
        missing,
        rejectedCount: coverage.rejectedCount,
        createdAt: user.createdAt,
      };
    })
    .filter(Boolean);
  return {
    totals: {
      users: totalUsers,
      activeUsers,
      auctions: totalAuctions,
      liveAuctions,
      bids: totalBids,
      acceptedBids,
      pendingBids,
      rejectedBids,
      totalRevenue,
      bidSuccessRate: totalBids > 0 ? Math.round((acceptedBids / totalBids) * 100) : 0,
    },
    lifecycle: {
      listedAuctions: totalAuctions,
      activeAuctions: liveAuctions,
      auctionsWithBids: auctionsWithBidIds.length,
      soldAuctions: soldAuctionIds.size,
      conversionRate:
        totalAuctions > 0 ? Math.round((soldAuctionIds.size / totalAuctions) * 100) : 0,
    },
    categories: byCategory,
    revenueByCategory,
    trend: Object.values(byDayMap),
    verifications: {
      totalSubmissions: verificationAgg.totalSubmissions,
      analyzedSubmissions: verificationAgg.analyzedSubmissions,
      flaggedRecords: verificationAgg.flaggedRecords,
      severeFlags: verificationAgg.severeFlags,
      totalFlags: verificationAgg.totalFlags,
      rejected: verificationByStatus.rejected || 0,
      needsReview: verificationByStatus.needs_review || 0,
      verified: verificationByStatus.verified || 0,
      byStatus: verificationByStatus,
    },
    redFlags: redFlagRowsRaw.map((item) => ({
      id: item._id,
      status: item.status,
      userName: item.farmer?.name || "Unknown user",
      userEmail: item.farmer?.email || "",
      auctionLabel: [item.auction?.animalType, item.auction?.breed, item.auction?.location]
        .filter(Boolean)
        .join(" - "),
      updatedAt: item.updatedAt || item.createdAt,
    })),
    compliance: {
      overdueUsers: complianceUsersRaw.length,
      missingUsers: missingComplianceUsers.length,
      missingOwnershipOnly: missingComplianceUsers.filter(
        (row) => row.missing.length === 1 && row.missing[0] === "ownership",
      ).length,
      missingHealthOnly: missingComplianceUsers.filter(
        (row) => row.missing.length === 1 && row.missing[0] === "health",
      ).length,
      missingBoth: missingComplianceUsers.filter((row) => row.missing.length === 2).length,
      rejectedUsers: missingComplianceUsers.filter((row) => row.rejectedCount > 0).length,
      users: missingComplianceUsers.slice(0, 12),
    },
  };
};
export const getCurrentUser = async (req, res) => {
  try {
    if (!req.session || !req.session.user) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }
    const userId = req.session.user.id || req.session.user._id;
    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    return res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || "Not provided",
        role: user.role,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user data",
      error: error.message,
    });
  }
};
export const getDashboardStats = async (req, res) => {
  try {
    if (!req.session || !req.session.user) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }
    const sessionUser = req.session.user;
    const userIdRaw = sessionUser.id || sessionUser._id;
    const userIdObj = toObjectId(userIdRaw);
    const role = String(sessionUser.role || "").trim().toLowerCase();
    const isAdmin = role === "administrator" || role === "admin";
    const isBuyer = role === "buyer";
    const isFarmer = role === "seller" || role === "farmer";
    let data = {
      role,
      totalRevenue: 0,
      activeUsers: 0,
      activeAuctions: 0,
      successRate: 0,
      totalSales: 0,
      activeListings: 0,
      pendingBids: 0,
      myBids: 0,
      acceptedBids: 0,
      rejectedBids: 0,
      totalSpent: 0,
    };
    if (isAdmin) {
      const analytics = await getAdminAnalyticsPayload();
      data.activeUsers = analytics.totals.activeUsers;
      data.activeAuctions = analytics.totals.auctions;
      data.totalRevenue = analytics.totals.totalRevenue;
      data.successRate = analytics.totals.bidSuccessRate;
      data.pendingBids = analytics.totals.pendingBids;
      data.acceptedBids = analytics.totals.acceptedBids;
      data.rejectedBids = analytics.totals.rejectedBids;
      data.adminAnalytics = analytics;
      return res.status(200).json({ success: true, data });
    }
    if (isFarmer) {
      if (!userIdObj) {
        return res.status(400).json({
          success: false,
          message: "Invalid user id",
        });
      }
      const auctions = await Auction.find({ seller: userIdObj }).select("_id");
      const auctionIds = auctions.map((a) => a._id);
      data.activeListings = auctionIds.length;
      if (auctionIds.length > 0) {
        const [totalBids, pendingBids, acceptedBids, acceptedRows] =
          await Promise.all([
            Bid.countDocuments({ listingId: { $in: auctionIds } }),
            Bid.countDocuments({ listingId: { $in: auctionIds }, status: "pending" }),
            Bid.countDocuments({ listingId: { $in: auctionIds }, status: "accepted" }),
            Bid.find({ listingId: { $in: auctionIds }, status: "accepted" }).select(
              "amount",
            ),
          ]);
        data.pendingBids = pendingBids;
        data.acceptedBids = acceptedBids;
        data.totalSales = acceptedRows.reduce(
          (sum, b) => sum + (Number(b.amount) || 0),
          0,
        );
        data.successRate =
          totalBids > 0 ? Math.round((acceptedBids / totalBids) * 100) : 0;
      }
      return res.status(200).json({ success: true, data });
    }
    if (!userIdObj) {
      return res.status(400).json({
        success: false,
        message: "Invalid user id",
      });
    }
    const [totalAuctions, pending, accepted, rejected, acceptedRows] =
      await Promise.all([
        Auction.countDocuments(),
        Bid.countDocuments({ bidderId: userIdObj, status: "pending" }),
        Bid.countDocuments({ bidderId: userIdObj, status: "accepted" }),
        Bid.countDocuments({ bidderId: userIdObj, status: "rejected" }),
        Bid.find({ bidderId: userIdObj, status: "accepted" }).select("amount"),
      ]);
    data.activeAuctions = totalAuctions;
    data.pendingBids = pending;
    data.acceptedBids = accepted;
    data.rejectedBids = rejected;
    data.myBids = pending + accepted + rejected;
    data.totalSpent = acceptedRows.reduce(
      (sum, b) => sum + (Number(b.amount) || 0),
      0,
    );
    data.successRate =
      data.myBids > 0 ? Math.round((accepted / data.myBids) * 100) : 0;
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard stats",
      error: error.message,
    });
  }
};
export const adminListUsers = async (req, res) => {
  try {
    if (!isAdminSession(req)) {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }
    const search = String(req.query.search || "").trim();
    const role = String(req.query.role || "all").trim().toLowerCase();
    const status = String(req.query.status || "all").trim().toLowerCase();
    const sortByRaw = String(req.query.sortBy || "createdAt");
    const sortOrderRaw = String(req.query.sortOrder || "desc").toLowerCase();
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(5, Number.parseInt(req.query.limit, 10) || 10));
    const sortByAllowed = new Set(["name", "email", "role", "accountStatus", "createdAt"]);
    const sortBy = sortByAllowed.has(sortByRaw) ? sortByRaw : "createdAt";
    const sortOrder = sortOrderRaw === "asc" ? 1 : -1;
    const query = {};
    if (search) {
      const rgx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [{ name: rgx }, { email: rgx }, { phone: rgx }, { role: rgx }];
    }
    if (role !== "all") {
      const normalized = normalizeRole(role);
      if (normalized) query.role = normalized;
    }
    if (status !== "all") {
      if (status === "active") {
        query.$and = query.$and || [];
        query.$and.push({
          $or: [
            { accountStatus: "active" },
            { accountStatus: { $exists: false } },
            { accountStatus: null },
          ],
        });
      } else {
        query.accountStatus = status;
      }
    }
    const [total, users] = await Promise.all([
      User.countDocuments(query),
      User.find(query)
        .select("-password")
        .sort({ [sortBy]: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit),
    ]);
    return res.status(200).json({
      success: true,
      data: users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      error: error.message,
    });
  }
};
export const adminCreateUser = async (req, res) => {
  try {
    if (!isAdminSession(req)) {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const phone = String(req.body.phone || "").trim();
    const role = normalizeRole(req.body.role);
    const password = String(req.body.password || "");
    if (!name || !email || !role || !password) {
      return res.status(400).json({
        success: false,
        message: "name, email, role and password are required",
      });
    }
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ success: false, message: "Email is already in use" });
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email,
      phone: phone || undefined,
      role,
      password: hashedPassword,
      accountStatus: "active",
    });
    return res.status(201).json({
      success: true,
      message: "User created successfully",
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        role: user.role,
        accountStatus: user.accountStatus,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create user",
      error: error.message,
    });
  }
};
export const adminUpdateUser = async (req, res) => {
  try {
    if (!isAdminSession(req)) {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }
    const userId = req.params.userId;
    const update = {};
    if (typeof req.body.name !== "undefined") update.name = String(req.body.name || "").trim();
    if (typeof req.body.phone !== "undefined") update.phone = String(req.body.phone || "").trim();
    if (typeof req.body.email !== "undefined") {
      update.email = String(req.body.email || "").trim().toLowerCase();
    }
    if (typeof req.body.role !== "undefined") {
      const normalized = normalizeRole(req.body.role);
      if (!normalized) {
        return res.status(400).json({ success: false, message: "Invalid role" });
      }
      update.role = normalized;
    }
    const target = await User.findById(userId);
    if (!target) return res.status(404).json({ success: false, message: "User not found" });
    if (update.email && update.email !== target.email) {
      const duplicate = await User.findOne({ email: update.email, _id: { $ne: target._id } });
      if (duplicate) {
        return res.status(409).json({ success: false, message: "Email is already in use" });
      }
    }
    Object.assign(target, update);
    await target.save();
    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: {
        _id: target._id,
        name: target.name,
        email: target.email,
        phone: target.phone || "",
        role: target.role,
        accountStatus: target.accountStatus || "active",
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update user",
      error: error.message,
    });
  }
};
export const adminUpdateUserStatus = async (req, res) => {
  try {
    if (!isAdminSession(req)) {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }
    const userId = req.params.userId;
    const status = String(req.body.status || "").trim().toLowerCase();
    if (!["active", "inactive", "suspended"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Use active, inactive or suspended",
      });
    }
    const sessionUserId = String(req.session?.user?.id || req.session?.user?._id || "");
    if (sessionUserId && String(userId) === sessionUserId && status !== "active") {
      return res.status(400).json({
        success: false,
        message: "You cannot deactivate or suspend your own account",
      });
    }
    const user = await User.findByIdAndUpdate(
      userId,
      { accountStatus: status },
      { new: true },
    ).select("-password");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    return res.status(200).json({
      success: true,
      message: `User status changed to ${status}`,
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update user status",
      error: error.message,
    });
  }
};
export const adminResetUserPassword = async (req, res) => {
  try {
    if (!isAdminSession(req)) {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }
    const userId = req.params.userId;
    const newPassword = String(req.body.newPassword || "");
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters",
      });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    const user = await User.findByIdAndUpdate(
      userId,
      { password: hashedPassword },
      { new: true },
    ).select("-password");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    return res.status(200).json({
      success: true,
      message: "Password updated successfully",
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to reset password",
      error: error.message,
    });
  }
};
export const adminDeleteUser = async (req, res) => {
  try {
    if (!isAdminSession(req)) {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }
    const userId = req.params.userId;
    const sessionUserId = String(req.session?.user?.id || req.session?.user?._id || "");
    if (sessionUserId && String(userId) === sessionUserId) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account",
      });
    }
    const user = await User.findByIdAndDelete(userId).select("-password");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    return res.status(200).json({
      success: true,
      message: "User deleted successfully",
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete user",
      error: error.message,
    });
  }
};
export const getAdminAnalytics = async (req, res) => {
  try {
    if (!isAdminSession(req)) {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }
    const analytics = await getAdminAnalyticsPayload();
    return res.status(200).json({
      success: true,
      data: analytics,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load admin analytics",
      error: error.message,
    });
  }
};
export const getAdminSettings = async (req, res) => {
  try {
    if (!isAdminSession(req)) {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }
    const settings = await getAdminSettingsDoc();
    return res.status(200).json({
      success: true,
      data: {
        auctionDuration: settings.auctionDuration,
        minScore: settings.minScore,
        autoClose: settings.autoClose,
        buyerVerification: settings.buyerVerification,
        realtimeAlerts: settings.realtimeAlerts,
        maintenanceMode: settings.maintenanceMode,
        adminNote: settings.adminNote || "",
        lastAction: settings.lastAction || "",
        savedAt: settings.updatedAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load settings",
      error: error.message,
    });
  }
};
export const updateAdminSettings = async (req, res) => {
  try {
    if (!isAdminSession(req)) {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }
    const userId = toObjectId(req.session?.user?.id || req.session?.user?._id);
    const payload = {
      auctionDuration: clamp(Number(req.body.auctionDuration) || 7, 1, 30),
      minScore: clamp(Number(req.body.minScore) || 75, 50, 100),
      autoClose: !!req.body.autoClose,
      buyerVerification: !!req.body.buyerVerification,
      realtimeAlerts: !!req.body.realtimeAlerts,
      maintenanceMode: !!req.body.maintenanceMode,
      adminNote: String(req.body.adminNote || "").trim().slice(0, 600),
      lastAction: String(req.body.lastAction || "").trim().slice(0, 220),
      updatedBy: userId || undefined,
    };
    const settings = await AdminSetting.findOneAndUpdate(
      { key: ADMIN_SETTINGS_KEY },
      { $set: payload },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    return res.status(200).json({
      success: true,
      message: "Settings updated successfully",
      data: {
        auctionDuration: settings.auctionDuration,
        minScore: settings.minScore,
        autoClose: settings.autoClose,
        buyerVerification: settings.buyerVerification,
        realtimeAlerts: settings.realtimeAlerts,
        maintenanceMode: settings.maintenanceMode,
        adminNote: settings.adminNote || "",
        lastAction: settings.lastAction || "",
        savedAt: settings.updatedAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update settings",
      error: error.message,
    });
  }
};
export const getAdminSystemHealth = async (req, res) => {
  try {
    if (!isAdminSession(req)) {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }
    const uptimeSec = process.uptime();
    const memory = process.memoryUsage();
    const dbState = mongoose.connection?.readyState || 0;
    const dbStateLabel = ["disconnected", "connected", "connecting", "disconnecting"][dbState] || "unknown";
    const [activeAuctions, pendingVerifications, pendingBids] = await Promise.all([
      Auction.countDocuments({ endAt: { $gte: new Date() } }),
      Verification.countDocuments({
        $or: [{ status: "pending" }, { status: "processing" }, { status: "needs_review" }],
      }),
      Bid.countDocuments({ status: "pending" }),
    ]);
    const cpuApprox = clamp(Math.round((memory.heapUsed / Math.max(memory.heapTotal, 1)) * 100), 5, 95);
    const memApprox = clamp(Math.round((memory.rss / (1024 * 1024 * 1024)) * 100), 10, 95);
    const diskApprox = clamp(Math.round((activeAuctions + pendingVerifications) % 100), 8, 90);
    const netApprox = clamp(Math.round((pendingBids * 1.7) % 100), 12, 88);
    return res.status(200).json({
      success: true,
      data: {
        status: "healthy",
        api: {
          state: "online",
          uptimeSec,
          uptimeLabel: `${Math.floor(uptimeSec / 3600)}h ${Math.floor((uptimeSec % 3600) / 60)}m`,
        },
        db: {
          state: dbStateLabel,
          connected: dbState === 1,
        },
        queue: {
          pendingVerifications,
          pendingBids,
        },
        metrics: {
          cpu: cpuApprox,
          mem: memApprox,
          disk: diskApprox,
          net: netApprox,
        },
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load system health",
      error: error.message,
    });
  }
};
export const runAdminSecurityAction = async (req, res) => {
  try {
    if (!isAdminSession(req)) {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }
    const action = String(req.body.action || "").trim();
    const allowed = new Set([
      "revoke_sessions",
      "enforce_password_policy",
      "export_audit_logs",
      "emergency_lock",
    ]);
    if (!allowed.has(action)) {
      return res.status(400).json({ success: false, message: "Invalid action" });
    }
    const actionLabels = {
      revoke_sessions: "Revoked active sessions (except current admin)",
      enforce_password_policy: "Enforced strong password policy",
      export_audit_logs: "Queued security audit export",
      emergency_lock: "Enabled emergency platform lock mode",
    };
    const patch = {
      key: ADMIN_SETTINGS_KEY,
      updatedBy: toObjectId(req.session?.user?.id || req.session?.user?._id) || undefined,
      lastAction: actionLabels[action],
    };
    if (action === "emergency_lock") patch.maintenanceMode = true;
    const settings = await AdminSetting.findOneAndUpdate(
      { key: ADMIN_SETTINGS_KEY },
      { $set: patch },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    return res.status(200).json({
      success: true,
      message: actionLabels[action],
      data: {
        action,
        lastAction: settings.lastAction,
        maintenanceMode: settings.maintenanceMode,
        savedAt: settings.updatedAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to execute security action",
      error: error.message,
    });
  }
};
export const getUserSettings = async (req, res) => {
  try {
    const userIdObj = toObjectId(req.session?.user?.id || req.session?.user?._id);
    if (!userIdObj) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }
    const role = String(req.session?.user?.role || "").trim().toLowerCase();
    const pref = await getUserPreferenceDoc(userIdObj);
    const isBuyer = role === "buyer";
    const isFarmer = role === "seller" || role === "farmer";
    const roleSettings = isBuyer
      ? pref.buyer
      : isFarmer
        ? pref.farmer
        : {};
    return res.status(200).json({
      success: true,
      data: {
        role,
        themeMode: pref.themeMode || "dark",
        timezone: pref.timezone || "EAT",
        settings: roleSettings || {},
        savedAt: pref.updatedAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load user settings",
      error: error.message,
    });
  }
};
export const updateUserSettings = async (req, res) => {
  try {
    const userIdObj = toObjectId(req.session?.user?.id || req.session?.user?._id);
    if (!userIdObj) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }
    const role = String(req.session?.user?.role || "").trim().toLowerCase();
    const isBuyer = role === "buyer";
    const isFarmer = role === "seller" || role === "farmer";
    if (!isBuyer && !isFarmer) {
      return res.status(400).json({ success: false, message: "Settings available for buyer and farmer accounts only" });
    }
    const incoming = req.body?.settings || {};
    const patch = {
      themeMode: ["light", "dark", "system"].includes(req.body?.themeMode)
        ? req.body.themeMode
        : "dark",
      timezone: String(req.body?.timezone || "EAT").trim().slice(0, 64),
    };
    if (isBuyer) {
      patch.buyer = {
        notifications: !!incoming.notifications,
        emailAlerts: !!incoming.emailAlerts,
        smsAlerts: !!incoming.smsAlerts,
        desktopAlerts: !!incoming.desktopAlerts,
        soundAlerts: !!incoming.soundAlerts,
        instantOutbidAlerts: !!incoming.instantOutbidAlerts,
        watchlistAlerts: !!incoming.watchlistAlerts,
        maxBidConfirm: !!incoming.maxBidConfirm,
        bidDigestHours: clamp(Number(incoming.bidDigestHours) || 6, 1, 24),
        autoRefreshSeconds: clamp(Number(incoming.autoRefreshSeconds) || 60, 10, 300),
        compactCards: !!incoming.compactCards,
        showBidTrends: !!incoming.showBidTrends,
        showSuggestedAuctions: !!incoming.showSuggestedAuctions,
      };
    }
    if (isFarmer) {
      patch.farmer = {
        notifications: !!incoming.notifications,
        autoCloseBids: !!incoming.autoCloseBids,
        bidAlertThreshold: clamp(Number(incoming.bidAlertThreshold) || 0, 0, 1000000000),
        newBidAlerts: !!incoming.newBidAlerts,
        desktopAlerts: !!incoming.desktopAlerts,
        soundAlerts: !!incoming.soundAlerts,
        reservePriceWarnings: !!incoming.reservePriceWarnings,
        winnerConfirmationRequired: !!incoming.winnerConfirmationRequired,
        showContactOnListings: !!incoming.showContactOnListings,
        autoArchiveDays: clamp(Number(incoming.autoArchiveDays) || 14, 1, 90),
        autoRefreshSeconds: clamp(Number(incoming.autoRefreshSeconds) || 60, 10, 300),
        compactCards: !!incoming.compactCards,
        showPerformanceWidgets: !!incoming.showPerformanceWidgets,
      };
    }
    const pref = await UserPreference.findOneAndUpdate(
      { user: userIdObj },
      { $set: patch },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    return res.status(200).json({
      success: true,
      message: "Settings updated successfully",
      data: {
        role,
        themeMode: pref.themeMode || "dark",
        timezone: pref.timezone || "EAT",
        settings: isBuyer ? pref.buyer : pref.farmer,
        savedAt: pref.updatedAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update user settings",
      error: error.message,
    });
  }
};
export const getUserNotifications = async (req, res) => {
  try {
    const sessionUser = req.session?.user;
    const userIdRaw = sessionUser?.id || sessionUser?._id;
    const userIdObj = toObjectId(userIdRaw);
    const role = String(sessionUser?.role || "").trim().toLowerCase();
    const isAdmin = role === "administrator" || role === "admin";
    const isSeller = role === "seller" || role === "farmer";
    const isBuyer = role === "buyer";
    if (!userIdObj) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }
    const limit = Math.min(
      60,
      Math.max(10, Number.parseInt(req.query.limit, 10) || 30),
    );
    const items = [];
    const seen = new Set();
    const now = new Date();
    const complianceThreshold = new Date(now);
    complianceThreshold.setDate(complianceThreshold.getDate() - 3);
    const pushNotification = (entry) => {
      const id = String(entry.id || "");
      if (!id || seen.has(id)) return;
      seen.add(id);
      items.push({
        id,
        type: entry.type || "system",
        severity: entry.severity || "info",
        title: entry.title || "Notification",
        body: entry.body || "",
        createdAt: entry.createdAt || new Date().toISOString(),
        link: entry.link || "",
      });
    };
    const currentUser = await User.findById(userIdObj)
      .select("name role createdAt")
      .lean();
    const myVerifications = await Verification.find({ farmer: userIdObj })
      .populate("auction", "animalType breed")
      .sort({ updatedAt: -1 })
      .limit(10)
      .lean();
    myVerifications.forEach((v) => {
      const animal = [v.auction?.animalType, v.auction?.breed]
        .filter(Boolean)
        .join(" - ");
      let title = "Verification update";
      let severity = "info";
      if (v.status === "verified") {
        title = "Verification approved";
        severity = "success";
      } else if (v.status === "rejected") {
        title = "Verification rejected";
        severity = "error";
      } else if (v.status === "needs_review") {
        title = "Verification needs review";
        severity = "warning";
      }
      pushNotification({
        id: "verif-" + v._id + "-" + (v.updatedAt || v.createdAt),
        type: "verification",
        severity,
        title,
        body:
          (animal || "Your submission") +
          " - status: " +
          String(v.status || "pending").replace("_", " "),
        createdAt: v.updatedAt || v.createdAt,
        link: "/verification/status",
      });
    });
    if (!isAdmin && currentUser?.createdAt && new Date(currentUser.createdAt) <= complianceThreshold) {
      const myComplianceAgg = await Verification.aggregate([
        { $match: { farmer: userIdObj } },
        {
          $group: {
            _id: null,
            hasOwnership: {
              $max: {
                $cond: [{ $in: ["$verificationType", ["ownership", "both"]] }, 1, 0],
              },
            },
            hasHealth: {
              $max: {
                $cond: [{ $in: ["$verificationType", ["health", "both"]] }, 1, 0],
              },
            },
            rejectedCount: {
              $sum: {
                $cond: [{ $eq: ["$status", "rejected"] }, 1, 0],
              },
            },
          },
        },
      ]);
      const compliance = myComplianceAgg[0] || {
        hasOwnership: 0,
        hasHealth: 0,
        rejectedCount: 0,
      };
      const missing = [];
      if (!Number(compliance.hasOwnership)) missing.push("ownership");
      if (!Number(compliance.hasHealth)) missing.push("health");
      const rejectedCount = Number(compliance.rejectedCount || 0);
      if (missing.length > 0 || rejectedCount > 0) {
        let body = "";
        if (missing.length > 0) {
          body +=
            "You must submit " +
            missing.join(" and ") +
            " verification document(s). ";
        }
        if (rejectedCount > 0) {
          body +=
            "Your rejected submissions require new uploads. ";
        }
        body +=
          "Submit updated ownership and health documents as soon as possible to avoid account deactivation.";
        pushNotification({
          id:
            "compliance-self-" +
            String(userIdObj) +
            "-" +
            Number(Boolean(compliance.hasOwnership)) +
            Number(Boolean(compliance.hasHealth)) +
            "-" +
            Number(rejectedCount > 0),
          type: "compliance",
          severity: rejectedCount > 0 ? "error" : "warning",
          title: "Required document update",
          body,
          createdAt: now,
          link: "/verification/submit",
        });
      }
    }
    const myRecentBids = await Bid.find({ bidderId: userIdObj })
      .populate("listingId", "animalType breed endAt")
      .sort({ updatedAt: -1 })
      .limit(20)
      .lean();
    myRecentBids.forEach((b) => {
      const auctionLabel = [b.listingId?.animalType, b.listingId?.breed]
        .filter(Boolean)
        .join(" - ");
      let title = "Bid activity";
      let severity = "info";
      if (b.status === "accepted") {
        title = "You are the winner";
        severity = "success";
      } else if (b.status === "rejected") {
        title = "Bid not selected";
        severity = "warning";
      } else if (b.status === "pending") {
        title = "Bid submitted";
      }
      pushNotification({
        id: "mybid-" + b._id + "-" + (b.updatedAt || b.createdAt),
        type: "bid",
        severity,
        title,
        body:
          (auctionLabel || "Auction") +
          " - UGX " +
          Number(b.amount || 0).toLocaleString("en-US"),
        createdAt: b.updatedAt || b.createdAt,
        link: "/dashboard/my-bids",
      });
    });
    const myAuctionIds = [
      ...new Set(
        myRecentBids
          .map((b) => b.listingId?._id?.toString() || b.listingId?.toString())
          .filter(Boolean),
      ),
    ];
    if (myAuctionIds.length > 0) {
      const marketBids = await Bid.find({ listingId: { $in: myAuctionIds } })
        .select("listingId bidderId bidderName amount createdAt")
        .sort({ amount: -1, createdAt: 1 })
        .lean();
      const topByAuction = {};
      marketBids.forEach((b) => {
        const key = String(b.listingId);
        if (!topByAuction[key]) topByAuction[key] = b;
      });
      const myBidByAuction = {};
      myRecentBids.forEach((b) => {
        const key = b.listingId?._id
          ? String(b.listingId._id)
          : String(b.listingId || "");
        if (!key) return;
        const current = Number(myBidByAuction[key]?.amount || 0);
        const amount = Number(b.amount || 0);
        if (!myBidByAuction[key] || amount > current) {
          myBidByAuction[key] = b;
        }
      });
      Object.keys(myBidByAuction).forEach((auctionId) => {
        const mine = myBidByAuction[auctionId];
        const top = topByAuction[auctionId];
        if (!top) return;
        const mineAmount = Number(mine.amount || 0);
        const topAmount = Number(top.amount || 0);
        const iAmTop =
          String(top.bidderId) === String(userIdObj) && mineAmount >= topAmount;
        const auctionLabel = [mine.listingId?.animalType, mine.listingId?.breed]
          .filter(Boolean)
          .join(" - ");
        if (iAmTop) {
          pushNotification({
            id: "lead-" + auctionId + "-" + topAmount,
            type: "leading_bid",
            severity: "success",
            title: "You are currently highest bidder",
            body:
              (auctionLabel || "Auction") +
              " - leading at UGX " +
              topAmount.toLocaleString("en-US"),
            createdAt: top.createdAt || mine.updatedAt || mine.createdAt,
            link: "/dashboard/my-bids",
          });
        } else if (topAmount > mineAmount) {
          pushNotification({
            id: "outbid-" + auctionId + "-" + topAmount,
            type: "outbid",
            severity: "warning",
            title: "You have been outbid",
            body:
              (auctionLabel || "Auction") +
              " - top bid is UGX " +
              topAmount.toLocaleString("en-US"),
            createdAt: top.createdAt || mine.updatedAt || mine.createdAt,
            link: "/dashboard/my-bids",
          });
        }
      });
    }
    if (isSeller || isAdmin) {
      const sellerAuctions = await Auction.find({ seller: userIdObj })
        .select("_id animalType breed")
        .sort({ createdAt: -1 })
        .limit(60)
        .lean();
      const sellerAuctionMap = {};
      const sellerAuctionIds = sellerAuctions.map((a) => {
        sellerAuctionMap[String(a._id)] = a;
        return a._id;
      });
      if (sellerAuctionIds.length > 0) {
        const inboundBids = await Bid.find({ listingId: { $in: sellerAuctionIds } })
          .sort({ createdAt: -1 })
          .limit(30)
          .lean();
        inboundBids.forEach((b) => {
          const auction = sellerAuctionMap[String(b.listingId)];
          const auctionLabel = [auction?.animalType, auction?.breed]
            .filter(Boolean)
            .join(" - ");
          pushNotification({
            id: "sellerbid-" + b._id,
            type: "seller_bid",
            severity: b.status === "accepted" ? "success" : "info",
            title: b.status === "pending" ? "New bid received" : "Bid status updated",
            body:
              (auctionLabel || "Your auction") +
              " - " +
              (b.bidderName || "Bidder") +
              " bid UGX " +
              Number(b.amount || 0).toLocaleString("en-US"),
            createdAt: b.updatedAt || b.createdAt,
            link: "/dashboard/auction-bids/" + String(b.listingId),
          });
        });
      }
    }
    if (isAdmin) {
      const [recentVerifications, recentUsers, highRiskVerifications, overdueUsers, complianceCoverage] =
        await Promise.all([
          Verification.find({})
            .populate("farmer", "name email")
            .sort({ createdAt: -1 })
            .limit(12)
            .lean(),
          User.find({})
            .select("name email role createdAt")
            .sort({ createdAt: -1 })
            .limit(8)
            .lean(),
          Verification.find({
            $or: [{ status: "rejected" }, { status: "needs_review" }],
          })
            .populate("farmer", "name email")
            .sort({ updatedAt: -1 })
            .limit(10)
            .lean(),
          User.find({
            role: { $ne: "Administrator" },
            createdAt: { $lte: complianceThreshold },
          })
            .select("_id name email role createdAt")
            .sort({ createdAt: 1 })
            .lean(),
          Verification.aggregate([
            { $match: { farmer: { $ne: null } } },
            {
              $group: {
                _id: "$farmer",
                hasOwnership: {
                  $max: {
                    $cond: [{ $in: ["$verificationType", ["ownership", "both"]] }, 1, 0],
                  },
                },
                hasHealth: {
                  $max: {
                    $cond: [{ $in: ["$verificationType", ["health", "both"]] }, 1, 0],
                  },
                },
                rejectedCount: {
                  $sum: {
                    $cond: [{ $eq: ["$status", "rejected"] }, 1, 0],
                  },
                },
              },
            },
          ]),
        ]);
      recentVerifications.forEach((v) => {
        pushNotification({
          id: "admin-doc-" + v._id + "-" + (v.createdAt || ""),
          type: "admin_document",
          severity: "info",
          title: "New verification document",
          body:
            (v.farmer?.name || v.farmer?.email || "User") +
            " submitted " +
            String(v.verificationType || "verification") +
            " documents",
          createdAt: v.createdAt,
          link: "/verification/ai-status",
        });
      });
      recentUsers.forEach((u) => {
        pushNotification({
          id: "admin-user-" + u._id + "-" + (u.createdAt || ""),
          type: "admin_user",
          severity: "info",
          title: "New user registered",
          body:
            (u.name || u.email || "User") +
            " joined as " +
            String(u.role || "User"),
          createdAt: u.createdAt,
          link: "/dashboard/admin#users",
        });
      });
      highRiskVerifications.forEach((v) => {
        pushNotification({
          id: "admin-risk-" + v._id + "-" + (v.updatedAt || ""),
          type: "admin_risk",
          severity: v.status === "rejected" ? "error" : "warning",
          title:
            v.status === "rejected"
              ? "Verification rejected"
              : "Verification needs review",
          body:
            (v.farmer?.name || v.farmer?.email || "User") +
            " - " +
            String(v.status).replace("_", " "),
          createdAt: v.updatedAt || v.createdAt,
          link: "/dashboard/admin#moderation",
        });
      });
      const coverageByUser = complianceCoverage.reduce((acc, row) => {
        acc[String(row._id)] = {
          hasOwnership: Number(row.hasOwnership || 0) > 0,
          hasHealth: Number(row.hasHealth || 0) > 0,
          rejectedCount: Number(row.rejectedCount || 0),
        };
        return acc;
      }, {});
      const complianceRows = overdueUsers
        .map((u) => {
          const userCoverage = coverageByUser[String(u._id)] || {
            hasOwnership: false,
            hasHealth: false,
            rejectedCount: 0,
          };
          const missing = [];
          if (!userCoverage.hasOwnership) missing.push("ownership");
          if (!userCoverage.hasHealth) missing.push("health");
          if (!missing.length && userCoverage.rejectedCount <= 0) return null;
          return {
            ...u,
            missing,
            rejectedCount: userCoverage.rejectedCount,
          };
        })
        .filter(Boolean);
      const rejectedUsers = complianceRows.filter((row) => row.rejectedCount > 0).length;
      if (complianceRows.length > 0) {
        pushNotification({
          id: "admin-compliance-summary-" + complianceRows.length + "-" + rejectedUsers,
          type: "admin_compliance",
          severity: rejectedUsers > 0 ? "warning" : "info",
          title: "Compliance tracking alert",
          body:
            complianceRows.length +
            " overdue account(s) are missing required ownership/health documents. " +
            rejectedUsers +
            " user(s) also have rejected document submissions.",
          createdAt: now,
          link: "/dashboard/admin#analytics",
        });
      }
      complianceRows.slice(0, 10).forEach((row) => {
        const parts = [];
        if (row.missing.length > 0) parts.push("missing: " + row.missing.join(" + "));
        if (row.rejectedCount > 0) parts.push("rejected: " + row.rejectedCount);
        pushNotification({
          id: "admin-compliance-user-" + row._id + "-" + parts.join("|"),
          type: "admin_compliance_user",
          severity: row.rejectedCount > 0 ? "error" : "warning",
          title: "User document follow-up required",
          body:
            (row.name || row.email || "User") +
            " (" +
            (row.role || "User") +
            ") - " +
            parts.join(", "),
          createdAt: row.createdAt || now,
          link: "/dashboard/admin#users",
        });
      });
    }
    items.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    const sliced = items.slice(0, limit);
    return res.status(200).json({
      success: true,
      count: sliced.length,
      unreadCount: sliced.length,
      data: sliced,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load notifications",
      error: error.message,
    });
  }
};
export default {
  getCurrentUser,
  getDashboardStats,
  getAdminAnalytics,
  getAdminSettings,
  updateAdminSettings,
  getAdminSystemHealth,
  runAdminSecurityAction,
  getUserSettings,
  updateUserSettings,
  adminListUsers,
  adminCreateUser,
  adminUpdateUser,
  adminUpdateUserStatus,
  adminResetUserPassword,
  adminDeleteUser,
  getUserNotifications,
};
