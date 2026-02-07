import User from "../models/User.js";
import bcrypt from "bcryptjs";

// REGISTER USER
export const registerUser = async (req, res) => {
  console.log("POST /auth/register received! Body:", req.body);

  const { name, email, phone, role, password, confirmPassword } = req.body;

  const trimmedName = name?.trim();
  const trimmedEmail = email?.trim();
  const trimmedRole = role?.trim();

  if (
    !trimmedName ||
    !trimmedEmail ||
    !password ||
    !confirmPassword ||
    !trimmedRole
  ) {
    console.log("Validation failed: missing or empty fields");
    req.flash("error_msg", "Please fill in all required fields");
    return res.redirect("/auth/register");
  }

  if (password !== confirmPassword) {
    console.log("Validation failed: passwords do not match");
    req.flash("error_msg", "Passwords do not match");
    return res.redirect("/auth/register");
  }

  try {
    const normalizedEmail = trimmedEmail.toLowerCase();
    console.log("Checking for existing user with email:", normalizedEmail);

    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      console.log("User already exists");
      req.flash("error_msg", "Email already registered");
      return res.redirect("/auth/register");
    }

    console.log("Hashing password...");
    const hashedPassword = await bcrypt.hash(password, 12);

    console.log("Creating user in DB with role:", trimmedRole);
    const newUser = await User.create({
      name: trimmedName,
      email: normalizedEmail,
      phone: phone ? phone.trim() : undefined,
      role: trimmedRole,
      password: hashedPassword,
    });

    console.log("User created successfully:", newUser._id);
    req.flash("success_msg", "Registration successful. Please log in.");
    res.redirect("/auth/login");
  } catch (err) {
    console.error("REGISTRATION ERROR:", err.message, err.stack);
    const errorMsg =
      err.code === 11000
        ? "Email already registered"
        : err.name === "ValidationError"
          ? Object.values(err.errors)[0].message
          : "Server error during registration. Please try again.";
    req.flash("error_msg", errorMsg);
    res.redirect("/auth/register");
  }
};

// LOGIN USER
export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  console.log("LOGIN ATTEMPT - Raw input:", {
    email,
    passwordLength: password?.length || 0,
  });

  const trimmedEmail = email?.trim();
  if (!trimmedEmail || !password) {
    console.log("Login failed: missing email or password");
    req.flash("error_msg", "Please enter email and password");
    return res.redirect("/auth/login");
  }

  try {
    const normalizedEmail = trimmedEmail.toLowerCase();
    console.log("Searching for user with normalized email:", normalizedEmail);

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      console.log("No user found for email:", normalizedEmail);
      req.flash("error_msg", "Invalid email or password");
      return res.redirect("/auth/login");
    }

    console.log("User found! ID:", user._id, "Role:", user.role);

    const isMatch = await bcrypt.compare(password, user.password);
    console.log("Password match result:", isMatch);

    if (!isMatch) {
      console.log("Incorrect password for user:", normalizedEmail);
      req.flash("error_msg", "Invalid email or password");
      return res.redirect("/auth/login");
    }

    req.session.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role.trim(),
    };

    console.log("Session BEFORE save:", req.session.user);

    req.session.save((err) => {
      if (err) {
        console.error("Session save FAILED:", err.message);
        req.flash("error_msg", "Session error - login failed");
        return res.redirect("/auth/login");
      }

      console.log("Session SAVE SUCCESS!");
      console.log("Session AFTER save:", req.session.user);

      req.flash("success_msg", `Welcome back, ${user.name}!`);

      const roleLower = user.role.trim().toLowerCase();
      console.log("Normalized role for redirect:", roleLower);

      switch (roleLower) {
        case "seller":
        case "farmer":
          console.log("Redirect → /dashboard/farmer");
          return res.redirect("/dashboard/farmer");
        case "buyer":
          console.log("Redirect → /dashboard/buyer");
          return res.redirect("/dashboard/buyer");
        case "administrator":
        case "admin":
          console.log("Redirect → /dashboard/admin");
          return res.redirect("/dashboard/admin");
        default:
          console.log("Unknown role - no redirect:", roleLower);
          req.flash("error_msg", `Unknown role: "${user.role}"`);
          return res.redirect("/auth/login");
      }
    });
  } catch (err) {
    console.error("LOGIN CRASH:", err.message, err.stack);
    req.flash("error_msg", "Server error during login. Please try again.");
    res.redirect("/auth/login");
  }
};
