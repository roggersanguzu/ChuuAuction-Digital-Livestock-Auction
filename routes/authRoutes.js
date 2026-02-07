import express from "express";
import { registerUser, loginUser } from "../controllers/authController.js";

const router = express.Router();

router.get("/register", (req, res) => {
  res.render("auth/register", { title: "Register" });
});

router.get("/login", (req, res) => {
  res.render("auth/login", { title: "Login" });
});

router.post("/login", loginUser);

router.post("/register", registerUser);

router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ message: "Logout failed" });
    res.clearCookie("connect.sid");
    res.redirect("/auth/login");
  });
});

export default router;
