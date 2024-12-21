const express = require('express');
const router = express.Router();
const passport = require('passport');
const User = require('../models/user');

router.get('/signup', (req, res) => {
    res.render('users/signup.ejs');
});

router.post('/signup', async (req, res, next) => {
    try {
        const { username, password } = req.body;
        const user = new User({ username });
        const registeredUser = await User.register(user, password);
        req.login(registeredUser, err => {
            if (err) return next(err);
            res.redirect('/home');
        });
    } catch (e) {
        console.log(e);
        res.redirect('/user/signup');
    }
});

router.get('/login', (req, res) => {
    res.render('users/login.ejs');
});

router.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            return next(err); // Handle errors
        }
        if (!user) {
            return res.redirect('/user/login'); // Handle failed login
        }
        req.logIn(user, (err) => {
            if (err) {
                return next(err);
            }

            // Check if the user was trying to access a page before login
            const redirectTo = req.session.returnTo || '/home'; // Default to /home if no returnTo
            delete req.session.returnTo; // Clear stored URL after redirection
            return res.redirect(redirectTo);
        });
    })(req, res, next);
});


// Logout Route
router.get('/logout', (req, res, next) => {
    req.logout(err => {
      if (err) return next(err);
      res.redirect('/home');
    });
  });
  router.get('*',(req,res)=>{
    res.render('../error.ejs')
})
module.exports = router;
