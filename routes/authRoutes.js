import express from "express";
import { registerUser, loginUser } from "../controllers/authController.js";
const router = express.Router();
router.get("/register", (req, res) => {
  res.render("auth/register", { title: "Register" });
});
router.get("/login", (req, res) => {
  res.render("auth/login", { title: "Login" });
});
router.get("/terms", (req, res) => {
  res.render("auth/terms", { title: "Terms & Conditions" });
});
router.get("/privacy", (req, res) => {
  res.render("auth/privacy", { title: "Privacy Policy" });
});
router.get("/animalList", (req, res) => {
  res.render("auctions/animalList", { title: "Animal List" });
});
router.get("/farmer", (req, res) => {
  res.render("dashboard/farmer", { title: "Farmer Dashboard" });
});
router.post("/login", loginUser);
router.post("/register", registerUser);

const logoutUser = (req, res) => {
  const baseCookieOptions = {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  };

  const finishLogout = () => {
    for (const secure of [false, true]) {
      res.clearCookie("chuuauction.sid", { ...baseCookieOptions, secure });
      res.clearCookie("connect.sid", { ...baseCookieOptions, secure });
    }
    res.set("Cache-Control", "no-store");
    return res.redirect(303, "/auth/login");
  };

  if (!req.session) {
    return finishLogout();
  }

  req.session.user = null;
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout failed:", err);
    }
    return finishLogout();
  });
};

router.post("/logout", logoutUser);
router.get("/logout", logoutUser);
export default router;
