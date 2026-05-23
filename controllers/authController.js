import User from "../models/User.js";
import bcrypt from "bcryptjs";

const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$/;

function normalizeRole(inputRole) {
  const role = String(inputRole || "").trim().toLowerCase();
  if (role === "seller" || role === "farmer") return "Seller";
  if (role === "buyer") return "Buyer";
  if (role === "admin" || role === "administrator") return "Administrator";
  return null;
}

function normalizePublicRegistrationRole(inputRole) {
  const normalizedRole = normalizeRole(inputRole);
  return normalizedRole === "Administrator" ? null : normalizedRole;
}

function normalizeSessionRole(inputRole) {
  const role = String(inputRole || "").trim().toLowerCase();
  if (role === "seller" || role === "farmer") return "farmer";
  if (role === "buyer") return "buyer";
  if (role === "admin" || role === "administrator") return "admin";
  return "";
}

async function comparePasswordWithLegacySupport(password, storedPassword) {
  const incomingPassword = String(password || "");
  const savedPassword = String(storedPassword || "");

  if (!incomingPassword || !savedPassword) {
    return { isMatch: false, shouldUpgradeHash: false };
  }

  if (BCRYPT_HASH_PATTERN.test(savedPassword)) {
    return {
      isMatch: await bcrypt.compare(incomingPassword, savedPassword),
      shouldUpgradeHash: false,
    };
  }

  return {
    isMatch: incomingPassword === savedPassword,
    shouldUpgradeHash: incomingPassword === savedPassword,
  };
}

function saveSession(req) {
  return new Promise((resolve, reject) => {
    req.session.save((err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

export const registerUser = async (req, res) => {
  const { name, email, phone, role, password, confirmPassword, terms } = req.body;
  const trimmedName = String(name || "").trim();
  const trimmedEmail = String(email || "").trim().toLowerCase();
  const trimmedPhone = String(phone || "").trim();
  const normalizedRole = normalizePublicRegistrationRole(role);

  if (!trimmedName || !trimmedEmail || !trimmedPhone || !password || !confirmPassword || !normalizedRole) {
    req.flash("error_msg", "Please fill in all required fields");
    return res.redirect("/auth/register");
  }

  if (!terms) {
    req.flash("error_msg", "Please agree to the Terms & Conditions");
    return res.redirect("/auth/register");
  }

  if (password.length < 6) {
    req.flash("error_msg", "Password must be at least 6 characters");
    return res.redirect("/auth/register");
  }

  if (password !== confirmPassword) {
    req.flash("error_msg", "Passwords do not match");
    return res.redirect("/auth/register");
  }

  try {
    const exists = await User.findOne({ email: trimmedEmail });
    if (exists) {
      req.flash("error_msg", "Email already registered");
      return res.redirect("/auth/register");
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    await User.create({
      name: trimmedName,
      email: trimmedEmail,
      phone: trimmedPhone,
      role: normalizedRole,
      password: hashedPassword,
      accountStatus: "active",
    });

    req.flash("success_msg", "Registration successful. Please log in.");
    return res.redirect("/auth/login");
  } catch (err) {
    const errorMsg =
      err.code === 11000
        ? "Email already registered"
        : "Server error during registration. Please try again.";
    req.flash("error_msg", errorMsg);
    return res.redirect("/auth/register");
  }
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;
  const trimmedEmail = String(email || "").trim().toLowerCase();

  if (!trimmedEmail || !password) {
    req.flash("error_msg", "Please enter email and password");
    return res.redirect("/auth/login");
  }

  try {
    const user = await User.findOne({ email: trimmedEmail });
    if (!user) {
      req.flash("error_msg", "Invalid email or password");
      return res.redirect("/auth/login");
    }

    if (user.accountStatus && user.accountStatus !== "active") {
      req.flash(
        "error_msg",
        "Your account is currently not active. Please contact an administrator.",
      );
      return res.redirect("/auth/login");
    }

    const { isMatch, shouldUpgradeHash } = await comparePasswordWithLegacySupport(
      password,
      user.password,
    );
    if (!isMatch) {
      req.flash("error_msg", "Invalid email or password");
      return res.redirect("/auth/login");
    }

    if (shouldUpgradeHash) {
      try {
        user.password = password;
        await user.save({ validateBeforeSave: false });
      } catch (upgradeError) {
        console.warn("Password hash upgrade skipped during login:", {
          email: trimmedEmail,
          error: upgradeError.message,
        });
      }
    }

    req.session.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: normalizeSessionRole(user.role),
      accountRole: user.role,
      accountStatus: user.accountStatus || "active",
    };

    req.flash("success_msg", `Welcome back, ${user.name}!`);
    await saveSession(req);

    const roleLower = String(user.role || "").trim().toLowerCase();
    if (
      roleLower === "seller" ||
      roleLower === "farmer" ||
      roleLower === "buyer" ||
      roleLower === "administrator" ||
      roleLower === "admin"
    ) {
      return res.redirect(303, "/dashboard");
    }

    console.error("Login failed due to unknown role:", {
      email: trimmedEmail,
      role: user.role,
    });
    req.flash("error_msg", `Unknown role: "${user.role}"`);
    return res.redirect("/auth/login");
  } catch (err) {
    console.error("Login failed:", {
      email: trimmedEmail,
      message: err.message,
      stack: err.stack,
    });
    req.flash("error_msg", "Server error during login. Please try again.");
    return res.redirect("/auth/login");
  }
};
