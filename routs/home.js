const express = require("express");
const router = express.Router();
const Post = require("../models/post");
const User = require("../models/user")
const StarMeetup = require('../models/starMeetup');
const Comment = require("../models/comment")
const axios = require("axios");
const retry = require('async-retry');
const API_KEY = "iBn02kEgw8JhJqsqgS8LOne1O5SWGUsWTG1lyj9b";
const methodOverride = require("method-override")
const nodemailer = require('nodemailer');
const isLoggedIn = require('../middlewares/checkCommentOwnership');
const multer = require('multer')
const checkCommentOwnership = require("../middlewares/isLoggedIn")
const YOUTUBE_API_KEY = "AIzaSyBGZ0L_cVaJlzgOleTwyNDgBvFjRLNBq7I"
// const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3/search';
router.use(methodOverride('_method'))

router.get('/', (req, res) => {
    res.render("listings/index.ejs",{ user: req.user });
});

// NOTE: Home route
router.get("/home", (req, res) => {
    res.render("listings/index.ejs",{ user: req.user });
});

// NOTE: Astro gallery route
router.get("/astrogallery", async (req, res) => {
    try {
        let allPosts = await Post.find({});
        res.render("listings/astrogallery.ejs", { allPosts });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});

//education api call
router.get('/education', async (req, res) => {
    try {
        const searchQueries = [
            'astronomy',
            'planets',
            'space exploration',
            'cosmos',
            'galaxies',
            'space science',
            'solar system',
            'NASA',
            'earth',
            'space mission'
        ];

        console.log("Fetching YouTube videos with queries:", searchQueries);

        const videoPromises = searchQueries.map(query =>
            axios.get('https://www.googleapis.com/youtube/v3/search', {
                params: {
                    part: 'snippet',
                    q: query,
                    key: YOUTUBE_API_KEY,
                    maxResults: 5,
                    type: 'video',
                },
            }).catch(err => {
                console.error(`Error fetching videos for query: ${query}`, err.message);
                return null; // Prevent failure of the entire route
            })
        );

        const videoResponses = await Promise.all(videoPromises);

        const validResponses = videoResponses.filter(response => response && response.data && response.data.items);

        const videos = validResponses.flatMap(response => response.data.items);

        if (!videos || videos.length === 0) {
            console.warn("No results found.");
            return res.render('listings/education', { videos: [], error: "No results found. Try a different search term!" });
        }

        console.log("Fetched videos:", videos.length);
        res.render('listings/education', { videos });
    } catch (err) {
        console.error('Error fetching educational content:', err.message);
        res.status(500).send('Server Error. Please try again later.');
    }
});

// NOTE: New post routes
router.get("/new",isLoggedIn, (req, res) => {
    res.render("listings/new.ejs");
});

router.post("/new", isLoggedIn, async (req, res) => {
    try {
        const { title, description, image, createdAt } = req.body;

        // Dynamically set the author to the logged-in user
        const newPost = new Post({
            title,
            description,
            image,
            createdAt: createdAt || Date.now(), // Use the provided date or default to now
            author: {
                id: req.user._id, // Use the logged-in user's ID
                username: req.user.username, // Use the logged-in user's username
            },
        });

        await newPost.save();
        res.redirect("/home");
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});


// NOTE: Edit post routes

// router.post("/new", isLoggedIn, upload.single('image'), async (req, res) => {
//     try {
//         // Detailed logging
//         console.log("Request User:", req.user); // Check if user is properly logged in
//         console.log("Request Body:", req.body);
//         console.log("Uploaded File:", req.file);

//         // Comprehensive file check
//         if (!req.file) {
//             console.error("No file uploaded");
//             return res.status(400).send("No file uploaded");
//         }

//         const { title, description, createdAt } = req.body;

//         // Validate inputs
//         if (!title || !description) {
//             console.error("Missing required fields");
//             return res.status(400).send("Title and description are required");
//         }

//         // Create post object
//         const newPost = new Post({
//             title,
//             description,
//             image: req.file.path,
//             createdAt: createdAt ? new Date(createdAt) : Date.now(),
//             author: {
//                 id: req.user._id,
//                 username: req.user.username,
//             },
//             // Optional: initialize other fields
//             comments: [],
//             likes: 0,
//             likedBy: []
//         });

//         // Validate the post before saving
//         const validationError = newPost.validateSync();
//         if (validationError) {
//             console.error("Validation Error:", validationError);
//             return res.status(400).send(`Validation Error: ${validationError.message}`);
//         }

//         // Save the post
//         const savedPost = await newPost.save();

//         console.log("Successfully saved post:", savedPost);

//         res.redirect("/home");
//     } catch (err) {
//         console.error("Full Error during post creation:", err);

//         // More detailed error handling
//         if (err.name === 'ValidationError') {
//             return res.status(400).send(`Validation Error: ${err.message}`);
//         }

//         res.status(500).send(`Server Error: ${err.message}`);
//     }
// });

router.get("/edit/:id",isLoggedIn, async (req, res) => {
    try {
        let currPost = await Post.findById(req.params.id);
        if (!currPost) {
            return res.status(404).send("Post not found");
        }

        res.render("listings/edit.ejs", { post: currPost });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});

router.put("/edit/:id", async (req, res) => {
    try {
        const { title, description, image } = req.body;
        const updatedPost = await Post.findByIdAndUpdate(req.params.id, {
            title,
            description,
            image
        }, { new: true });

        if (!updatedPost) {
            return res.status(404).send("Post not found");
        }

        res.redirect("/view/" + req.params.id);
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});

// NOTE: View post route
router.get("/view/:id",isLoggedIn, async (req, res) => {
    try {
        const currPost = await Post.findById(req.params.id).populate("comments");
        console.log(currPost.author.username,"and id is =", currPost.author.id);
        console.log(req.user.username,"and id is =", req.user.id);
        res.render("listings/view.ejs", {
            post: currPost,
            user: req.user, // Pass the logged-in user to the template
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});



// NOTE: Delete post route
router.delete("/delete/:id",isLoggedIn, async (req, res) => {
    try {
        const deletedPost = await Post.findByIdAndDelete(req.params.id)
        console.log(deletedPost);
        if (!deletedPost) {
            return res.status(404).send("Post not found");
        }
        res.redirect("/astrogallery");
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});

// NOTE: Event route
router.get("/events", (req, res) => {
    res.render("listings/astroevents.ejs");
});

// NOTE: 3D Astro map route
router.get("/astromap", (req, res) => {
    res.render('listings/starmap.ejs');
});

// NOTE: Picture of the Day route (NASA API)
router.get("/pod", async (req, res) => {
    try {
        const response = await axios.get(`https://api.nasa.gov/planetary/apod?api_key=${API_KEY}`);
        const podData = response.data;
        res.render("listings/pod.ejs", { pod: podData });
    } catch (err) {
        console.error("Error fetching POD from NASA:", err);
        res.status(500).send("Server Error");
    }
});

// NOTE: Planet information route (using Solar System OpenData API)
router.get("/planetInfo", async (req, res) => {
    const planetName = req.query.planetName.toLowerCase();

    try {
        const response = await axios.get(`https://api.le-systeme-solaire.net/rest/bodies/${planetName}`);
        const planetData = response.data;

        if (!planetData) {
            return res.status(404).send("Planet not found");
        }

        res.render("listings/planetInfo.ejs", { planet: planetData });
    } catch (err) {
        console.error("Error fetching planet information:", err);
        res.status(500).send("Server Error back and try different planate");
    }
});


// NOTE: Star information route (NASA API or another relevant API)
router.get("/starInfo", async (req, res) => {
    const starName = req.query.starName.toLowerCase(); // Convert to lowercase for case-insensitive matching

    // Mock star data for additional stars
    const mockStarData = {
        sun: {
          name: "Sun",
          type: "G-type Main-Sequence Star (Yellow Dwarf)",
          distance: "0 AU (Center of Solar System)",
          mass: "1.989 × 10^30 kg",
          radius: "695,700 km"
        },
        sirius: {
          name: "Sirius",
          type: "A-type Main-Sequence Star",
          distance: "8.6 light years",
          mass: "2.02 × Solar Mass",
          radius: "1.71 × Solar Radius"
        },
        betelgeuse: {
          name: "Betelgeuse",
          type: "Red Supergiant",
          distance: "642.5 light years",
          mass: "11.6 × Solar Mass",
          radius: "764 × Solar Radius"
        },
        proxima_centauri: {
          name: "Proxima Centauri",
          type: "Red Dwarf",
          distance: "4.24 light years",
          mass: "0.12 × Solar Mass",
          radius: "0.14 × Solar Radius"
        },
        vega: {
          name: "Vega",
          type: "A-type Main-Sequence Star",
          distance: "25.04 light years",
          mass: "2.135 × Solar Mass",
          radius: "2.362 × Solar Radius"
        },
        aldebaran: {
          name: "Aldebaran",
          type: "K-type Giant Star",
          distance: "65.3 light years",
          mass: "1.16 × Solar Mass",
          radius: "44.2 × Solar Radius"
        },
        // Add more stars here:
        // ...
        polaris: {
          name: "Polaris",
          type: "F-type Supergiant",
          distance: "434 light years",
          mass: "6.75 × Solar Mass",
          radius: "45 × Solar Radius"
        },
        rigel: {
          name: "Rigel",
          type: "Blue Supergiant",
          distance: "860 light years",
          mass: "17 × Solar Mass",
          radius: "78 × Solar Radius"
        },
        antares: {
          name: "Antares",
          type: "Red Supergiant",
          distance: "600 light years",
          mass: "12 × Solar Mass",
          radius: "883 × Solar Radius"
        },
        spica: {
          name: "Spica",
          type: "Blue-White Main-Sequence Star",
          distance: "250 light years",
          mass: "11 × Solar Mass",
          radius: "7.8 × Solar Mass"
        },
        acrux: {
          name: "Acrux",
          type: "Blue-White Supergiant",
          distance: "320 light years",
          mass: "14 × Solar Mass",
          radius: "12 × Solar Radius"
        }
      };

    try {
        // Check if the star name exists in the mock data
        const starData = mockStarData[starName];

        if (starData) {
            res.render("listings/starInfo.ejs", { star: starData });
        } else {
            // Default case: if star info is not found
            res.render("listings/starInfo.ejs", { star: { name: "Unknown", type: "NULL", distance: "NULL", mass: "NULL", radius: "NULL" } });
        }
    } catch (err) {
        console.error("Error fetching star information:", err);
        res.status(500).send("Server Error");
    }
});


router.get("/events", async (req, res) => {
    try {
        const response = await axios.get(`https://api.nasa.gov/DONKI/WSAEnlilSimulations?api_key=${API_KEY}`);
        const events = response.data;
        console.log(events);

        const filteredEvents = events.map(event => ({
            name: event.eventType,
            date: event.startTime
        }));

        console.log('Filtered Events:', filteredEvents); // Debugging

        res.render("listings/comingEvents.ejs", { events: filteredEvents });
    } catch (err) {
        console.error("Error fetching astro events:", err);
        res.status(500).send("Server Error");
    }
});


//
router.post('/posts/:id/like', isLoggedIn, async (req, res) => {
    const { id } = req.params;  // Post ID
    const userId = req.user._id; // Current logged-in user's ID

    try {
        const post = await Post.findById(id);
        if (!post) {
            return res.status(404).send("Post not found");
        }

        // Check if the user has already liked the post
        if (post.likedBy.includes(userId)) {
            return res.redirect(`/view/${id}`);  // If already liked, redirect without incrementing
        }

        // If not liked, add the user's ID to the likedBy array and increment likes
        post.likedBy.push(userId);
        post.likes += 1;
        await post.save();

        res.redirect(`/view/${id}`);
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal server error");
    }
});

// POST /posts/:id/comments - Create a new comment
router.post('/views/:id/comments', isLoggedIn, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        const comment = new Comment({
            text: req.body.text,
            author: {
                id: req.user._id,
                username: req.user.username
            }
        });
        await comment.save();

        // Add the comment to the post
        post.comments.push(comment);
        await post.save();

        res.redirect(`/view/${req.params.id}`);
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});

//add comment
router.post('/posts/:id/comments', isLoggedIn, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        const newComment = new Comment({
            text: req.body.text,
            author: {
                id: req.user._id,
                username: req.user.username,
            },
            post: post._id  // Set the post ID here
        });

        await newComment.save();
        post.comments.push(newComment);
        await post.save();

        res.redirect(`/view/${post._id}`);
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});


// Route to edit a comment (GET for form display)
router.get('/comments/:comment_id/edit', isLoggedIn, async (req, res) => {
    const comment = await Comment.findById(req.params.comment_id);
    if (!comment.author.id.equals(req.user._id)) {
        return res.status(403).send("Unauthorized");
    }
    res.render('listings/editt', { comment });
});

// Route to update a comment (PUT for updating)
router.put('/comments/:id', isLoggedIn, async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);

        // Check if the logged-in user is the author of the comment
        if (!comment.author.id.equals(req.user._id)) {
            return res.status(403).send("Unauthorized");
        }

        // Update the comment's text
        comment.text = req.body.text;
        await comment.save();

        // Redirect back to the post view page using comment.post
        res.redirect(`/view/${comment.post}`);
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});

// Route to delete a comment
router.delete('/comments/:comment_id', isLoggedIn, async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.comment_id);
        if (!comment) {
            return res.status(404).send("Comment not found");
        }

        // Ensure the user deleting the comment is the comment author
        if (!comment.author.id.equals(req.user._id)) {
            return res.status(403).send("Unauthorized");
        }

        // Delete the comment using `deleteOne` or `findByIdAndDelete`
        await Comment.findByIdAndDelete(req.params.comment_id);

        // Redirect back to the post view page
        res.redirect(`/view/${comment.post}`);
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});

// Route to display all star meetups
router.get("/starMeetup", async (req, res) => {
    try {
        // Fetch meetups from the database
        const meetups = await StarMeetup.find(); // Adjust the query as needed

        // Render the template and pass meetups to it
        res.render("listings/starMeetup", { meetups }); // Replace "yourTemplate" with your actual template name
    } catch (error) {
        console.error("Error retrieving meetups:", error);
        res.status(500).send("Error retrieving meetups: " + error.message);
    }
});


// serve the form
router.get("/starMeetup-form",isLoggedIn, (req,res)=>{
    res.render("listings/starMeetupFrom.ejs")
})

router.post('/starMeetup', async (req, res) => {
    // Process Boolean fields for checkboxes
    const starMeetupData = {
      eventName: req.body.eventName,
      location: req.body.location,
      city: req.body.city,
      date: req.body.date,
      description: req.body.description,
      capacity: req.body.capacity,
      rules: req.body.rules,
      carAllowed: req.body.carAllowed === 'on',
      foodAvailable: req.body.foodAvailable === 'on',
      equipmentProvided: req.body.equipmentProvided === 'on',
      chairsProvided: req.body.chairsProvided === 'on',
      itemsToBorrow: req.body.itemsToBorrow,
      ageLimit: req.body.ageLimit,
      socialLinks: req.body.socialLinks,
      contactNumber: req.body.contactNumber,
      contactEmail: req.body.contactEmail,
      venueType: req.body.venueType,
      memberSignaturesLink: req.body.memberSignaturesLink,
      siteImageLink: req.body.siteImageLink,
      whatsappLink: req.body.whatsappLink,
      createdBy: req.user.username
    };

    try {
      const newEvent = new StarMeetup(starMeetupData);
      await newEvent.save();
      res.redirect('/starMeetup');
    } catch (error) {
      res.status(400).send(`Error creating event: ${error.message}`);
    }
});

// Route to show meetup details
router.get('/starMeetup/:id',isLoggedIn, async (req, res) => {
    try {
      const meetup = await StarMeetup.findById(req.params.id);
      res.render('listings/meetup-details', { meetup , user: req.user});
    } catch (err) {
      console.error(err);
      res.status(500).send('Something went wrong.');
    }
});

// Edit route
router.get('/meetup/edit/:id',isLoggedIn, async (req, res) => {
    const meetup = await StarMeetup.findById(req.params.id);
    let user = req.user
    if (user.username !== meetup.createdBy) {
        return res.status(403).send('Unauthorized access');
    }
    res.render('listings/editMeetup', { meetup });
});

router.put('/meetup/edit/:id', isLoggedIn, async (req, res) => {
    const { id } = req.params;

    // Convert checkbox values to Booleans
    const updates = {
        ...req.body,
        carAllowed: req.body.carAllowed === "on",
        foodAvailable: req.body.foodAvailable === "on",
        equipmentProvided: req.body.equipmentProvided === "on",
        chairsProvided: req.body.chairsProvided === "on"
    };

    const meetup = await StarMeetup.findById(id);

    // Update and save the meetup with the new data
    await StarMeetup.findByIdAndUpdate(id, updates, { new: true });
    res.redirect(`/starMeetup/${id}`);
});


router.post('/meetup/delete/:id', isLoggedIn, async (req, res) => {
    const { id } = req.params;

    try {
        const meetup = await StarMeetup.findById(id);

        if (!meetup) {
            // Handle case where meetup is not found
            return res.status(404).send('Meetup not found');
        }

        // Check if the logged-in user is the creator of the meetup
        if (req.user.username !== meetup.createdBy) {
            return res.status(403).send('you dont have access to delete this');
        }

        // Delete the meetup
        await StarMeetup.findByIdAndDelete(id);

        // Redirect to the meetups page with a success message (optional)
        res.redirect('/starMeetup?message=Meetup+deleted+successfully');
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal server error');
    }
});

//
router.get('/starMeetups/search', async (req, res) => {
    try {
      const query = req.query.query || ''; // Get search query
      console.log(query);
      const meetups = await StarMeetup.find({
        $or: [
          { eventName: { $regex: query, $options: 'i' } },
          { location: { $regex: query, $options: 'i' } }
        ]
      });
      res.render('listings/searchMeetup', { meetups });
    } catch (err) {
      console.error(err);
      res.status(500).send('Error fetching meetups');
    }
});

router.get('/searchPost', async (req, res) => {
    try {
      const query = req.query.query; // Get the search term from the query string
      const regex = new RegExp(query, 'i'); // 'i' makes it case-insensitive
      const results = await Post.find({
        $or: [
          { title: regex },       // Search in title
          { description: regex }, // Search in description
        ],
      });
      res.render('listings/searchPosts', { results, query });
    } catch (err) {
      console.error(err);
      res.status(500).send('An error occurred while searching.');
    }
});

router.get('/test-error', (req, res) => {
    throw new Error('This is a test error!');
});

module.exports = router;
