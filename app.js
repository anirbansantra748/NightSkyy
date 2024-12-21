const express = require('express');
const mongoose = require('mongoose');
const ejsMate = require('ejs-mate');
const path = require('path');
const passport = require('passport');
const flash = require('connect-flash');
const LocalStrategy = require('passport-local');
const expressSession = require('express-session');
const methodOverride = require('method-override');
const User = require('./models/user');
const homeRout = require('./routs/home');
const userRout = require('./routs/user');
const multer = require('multer');

const app = express();
const mongo_url = 'mongodb+srv://opvmro460:oQSi3PUnafrbOwQv@cluster0.57nzu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const port = 3000;

// Connect to MongoDB
mongoose.connect(mongo_url)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Set EJS as the template engine
app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));

// Session configuration
app.use(expressSession({
    secret: 'AnirbanOpi1234',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 * 7 }, // 1 week session duration
}));

// Initialize Passport and use sessions
app.use(passport.initialize());
app.use(passport.session());

// Configure Passport
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Middleware to set `isAuthenticated` for templates
app.use((req, res, next) => {
  res.locals.user = req.user;
  next();
});

// Routes
app.use("/", homeRout);
app.use("/user", userRout);
// Flash middleware
app.use(flash());

// // Make flash messages available in all views
// app.use((req, res, next) => {
//     res.locals.success = req.flash("success");
//     res.locals.error = req.flash("error");
//     next();
//   });

// General error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.render('../error.ejs');
});

// Start server
app.listen(port, () => {
    console.log(`App is running on port ${port}`);
});
