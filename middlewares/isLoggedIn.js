module.exports = function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        return next(); // User is authenticated, continue to the next route
    }

    // Save the original URL the user tried to access
    req.session.returnTo = req.originalUrl;

    // Redirect to the login page
    res.redirect('/user/login');
};
