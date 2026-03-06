// userController.js - Controller for user operations
import User from "../models/User.js";
import Auction from "../models/Auction.js";
import Bid from "../models/Bid.js";
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

// Get current logged-in user
export const getCurrentUser = async (req, res) => {
  try {
    console.log("[UserController] Fetching current user");
    console.log("[UserController] Session:", req.session);

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

    console.log("[UserController] ✅ User found:", user.name);

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
    console.error("[UserController] ❌ Error fetching current user:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user data",
      error: error.message,
    });
  }
};

// Get dynamic dashboard stats for current logged-in user
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
      const [activeUsers, totalAuctions, totalBids, acceptedBids, acceptedRows] =
        await Promise.all([
          User.countDocuments({
            $or: [
              { accountStatus: "active" },
              { accountStatus: { $exists: false } },
              { accountStatus: null },
            ],
          }),
          Auction.countDocuments(),
          Bid.countDocuments(),
          Bid.countDocuments({ status: "accepted" }),
          Bid.find({ status: "accepted" }).select("amount"),
        ]);

      const totalRevenue = acceptedRows.reduce(
        (sum, b) => sum + (Number(b.amount) || 0),
        0,
      );
      data.activeUsers = activeUsers;
      data.activeAuctions = totalAuctions;
      data.totalRevenue = totalRevenue;
      data.successRate =
        totalBids > 0 ? Math.round((acceptedBids / totalBids) * 100) : 0;
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

    // Buyer and default fallback
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
    console.error("[UserController] Error fetching dashboard stats:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard stats",
      error: error.message,
    });
  }
};

// Admin: list/search/filter users with pagination
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
    console.error("[UserController] adminListUsers error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      error: error.message,
    });
  }
};

// Admin: create user with role
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
    console.error("[UserController] adminCreateUser error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create user",
      error: error.message,
    });
  }
};

// Admin: update profile fields/role for a user
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
    console.error("[UserController] adminUpdateUser error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update user",
      error: error.message,
    });
  }
};

// Admin: change account status (activate/inactivate/suspend)
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
    console.error("[UserController] adminUpdateUserStatus error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update user status",
      error: error.message,
    });
  }
};

// Admin: reset/change user password
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
    console.error("[UserController] adminResetUserPassword error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to reset password",
      error: error.message,
    });
  }
};

// Admin: delete user
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
    console.error("[UserController] adminDeleteUser error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete user",
      error: error.message,
    });
  }
};

export default {
  getCurrentUser,
  getDashboardStats,
  adminListUsers,
  adminCreateUser,
  adminUpdateUser,
  adminUpdateUserStatus,
  adminResetUserPassword,
  adminDeleteUser,
};
