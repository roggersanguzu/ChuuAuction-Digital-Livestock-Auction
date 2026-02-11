import express from "express";

const router = express.Router();
router.get("/priceCalculator", (req, res) => {
  res.render("livestock/priceCalculator", {
    title: "Animal Price Calculator",
  });
});
export default router;
