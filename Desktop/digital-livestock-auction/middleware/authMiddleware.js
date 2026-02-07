// Example middleware (authMiddleware.js or similar)
const requireLogin = (req, res, next) => {
  if (!req.session?.user) {
    return res.redirect("/auth/login"); // ← redirect instead of JSON error
  }
  req.user = req.session.user;
  next();
};
