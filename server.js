var express = require("express");
var mongoose = require("mongoose");
var bodyParser = require("body-parser");
var handlebars = require("express-handlebars");
var request= require("request");
var cheerio= require("cheerio");



// If deployed, use the deployed database. Otherwise use the local mongoHeadlines database
var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/mongoHeadlines";

// Set mongoose to leverage built in JavaScript ES6 Promises
// Connect to the Mongo DB
mongoose.Promise = Promise;
mongoose.connect(MONGODB_URI);


// Require all models
var db = require("./models");

var PORT = 3000;

// Initialize Express
var app = express();

// Configure middleware

app.use(bodyParser.json());
app.use(logger("dev"));
// Parse request body as JSON
app.use(bodyParser.urlencoded({ extended: true }));
// app.use(express.json());
// Make public a static folder
app.use(express.static("public"));

app.engine("handlebars", handlebars({ defaultLayout: "main" }));
app.set("view engine", "handlebars");


// Routes
require("./routes/index.js")(app)



// Start the server
app.listen(PORT, function() {
  console.log("App running on port " + PORT + "!");
});
