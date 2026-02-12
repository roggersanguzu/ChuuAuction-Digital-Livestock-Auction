import express from "express";
import { registerUser, loginUser } from "../controllers/authController.js";

const router = express.Router();

router.get("/register", (req, res) => {
  res.render("auth/register", { title: "Register" });
});

router.get("/login", (req, res) => {
  res.render("auth/login", { title: "Login" });
});
router.get("/animalList", (req, res) => {
  res.render("auctions/animalList", { title: "Animal List" });
});
router.get("/farmer", (req, res) => {
  res.render("dashboard/farmer", { title: "Farmer Dashboard" });
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
