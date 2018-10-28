var express = require("express");
var bodyParser = require("body-parser");
var logger = require("morgan");
var mongoose = require("mongoose");
var exphbs = require("express-handlebars");
var request= require ("request");

// Requiring our Note and Article models
var Note = require("./models/Note.js");
var Article = require("./models/Article.js");
// Our scraping tools
// Axios is a promised-based http library, similar to jQuery's Ajax method
// It works on the client and on the server
var axios = require("axios");
var cheerio = require("cheerio");

// Require all models
var db = require("./models");

var PORT = 3000;

// Initialize Express
var app = express();

// Configure middleware

// Use morgan logger for logging requests
app.use(logger("dev"));
// Use body-parser for handling form submissions
app.use(bodyParser.urlencoded({ extended: true }));


//setting up handlebars
app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

// Use express.static to serve the public folder as a static directory
app.use(express.static("public"));

// Connect to the Mongo DB
// mongoose.connect("mongodb://192.168.99.100");
var MONGODB_URI = process.env.MONGODB_URI || "mongodb://root:root@192.168.99.100/mongoHeadlines?authSource=admin";




// Set mongoose to leverage built in JavaScript ES6 Promises
// Connect to the Mongo DB
mongoose.Promise = Promise;
mongoose.connect(MONGODB_URI, { useNewUrlParser: true });


// Routes



// A GET route for scraping
app.get("/scrape", function(req, res) {
  // First, we grab the body of the html with request
  request("https://www.gamespot.com/news/",function(error, response, url) {
    // Then, we load that into cheerio and save it to $ for a shorthand selector
    var $ = cheerio.load(url);

    // Now, we grab every a tag within the listing result, and do the following:
    $(".media-article a").each(function(i, element) {
      // Save an empty result object
      var result = {};

      // Add the text and href of every link, and save them as properties of the result object
      if($(this).find(".media-title").text().length > 0) {
        
        result.title = $(this)
        .find(".media-title")
        .text();
      } else {
        result.title = "No Title";
      }
    
    
      if($(this).find(".media-deck").text().length > 0) {
        result.synopsis = $(this) 
        .find(".media-deck")
        .text();
      } else {
        result.synopsis = "no synopsis"
      }
      
      if($(this).find("img").attr("src") === undefined) {
        result.image = "No image"
      } else {
        result.image = $(this)
        .find("img")
        .attr("src");
        
        
      }
    
      if($(this).attr("href").length > 0) {
        result.link = $(this)
        .attr("href");
      } else {
        result.link = "no link";
      }
    
      // Create a new Article using the `result` object built from scraping
      db.Article.create(result)
        .then(function(dbArticle) {
          // View the added result in the console
           console.log(dbArticle);
        })
        .catch(function(err) {
          // If an error occurred, send it to the client
          console.log(err);
          return res.json(err);
        });
    });

    // If we were able to successfully scrape and save an Article, send a message to the client
    //res.send("Scrape Complete");
 
});
res.redirect("/articles");
});

// Route for getting all Articles from the db
app.get("/articles", function(req, res) {
  // Grab every document in the Articles collection
  db.Article.find({})
  .populate("notes","body").exec(function(err,doc)
    {
      if (err) {
        res.send(err);
      }
      else {
        res.render("articles", {articles: doc});
      }
      });
    });
// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function(req, res) { 

  // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
  db.Article.findOne({ _id: req.params.id })
    // ..and populate all of the notes associated with it

    .populate("note")
    .exec(function (err, doc) {
      if (err) {
        console.log('Error: ' + err);
      } else {
        hbsObj.article = doc;
        var link = "https://www.gamespot.com" + doc.link;
        // console.log("this is the link", link);

        request(link, function (error, response, html) {
          var $ = cheerio.load(html)
          // console.log("this is the html", html);

          $('article').each(function (i, element) {
            hbsObj.body = $(this).children('.messageText').text();
            // Send article body and comments to article.handlbars through hbObj
            res.render("articles", hbsObj);
            // Prevents loop through so it doesn't return an empty hbsObj.body
            return false;

    // .then(function(dbArticle) {
    //   // If we were able to successfully find an Article with the given id, send it back to the client
    //   res.json(dbArticle);
    // })
    // .catch(function(err) {
    //   // If an error occurred, send it to the client
    //   res.json(err);
          });
    });
  }
  });
});
    
    
// Route for saving/updating an Article's associated Note
app.post("/articles/:id", function(req, res) {
  // Create a new note and pass the req.body to the entry
  db.Note.create(req.body)
    .then(function(dbNote) {
      // If a Note was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Note
      // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
      // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
      return db.Article.findOneAndUpdate({ _id: req.params.id }, { note: dbNote._id }, { new: true });
    })
    .then(function(dbArticle) {
      // If we were able to successfully update an Article, send it back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Start the server
app.listen(PORT, function() {
  console.log("App running on port " + PORT + "!");
});
