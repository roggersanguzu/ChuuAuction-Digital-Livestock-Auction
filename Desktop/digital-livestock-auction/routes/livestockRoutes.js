import express from "express";

const router = express.Router();
router.get("/priceCalculator", (req, res) => {
  res.render("livestock/priceCalculator", {
    title: "Animal Price Calculator",
  });
});
router.get("/verification", (req, res) => {
  res.render("livestock/verification", {
    title: "Upload Data for Verification",
  });
});
router.get("/notes", (req, res) => {
  res.render("livestock/notes", {
    title: "Important Notes",
  });
});
router.get("/settings", (req, res) => {
  res.render("livestock/settings", {
    title: "Settings",
  });
});

export default router;
