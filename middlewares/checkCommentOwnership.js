// middleware.js
module.exports = function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        return next(); // User is authenticated, continue
    }
    res.redirect('/user/login'); // User not authenticated, redirect to login
};
