const requireLogin = (req, res, next) => {
  if (!req.session?.user) {
    return res.redirect("/auth/login"); // â† redirect instead of JSON error
  }
  req.user = req.session.user;
  next();
};
