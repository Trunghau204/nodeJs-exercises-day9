var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
require("dotenv").config();
let mongoose = require("mongoose");

var indexRouter = require("./routes/index");
var usersRouter = require("./routes/users");

var app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", indexRouter);
app.use("/api/v1/users", usersRouter);
app.use("/api/v1/auth", require("./routes/auth"));
app.use("/api/v1/carts", require("./routes/carts"));
app.use("/api/v1/products", require("./routes/products"));
app.use("/api/v1/categories", require("./routes/categories"));
app.use("/api/v1/roles", require("./routes/roles"));
app.use("/api/v1/upload", require("./routes/upload"));
app.use("/api/v1/messages", require("./routes/messages"));

const mongoUri = process.env.MONGODB_URI;
const mongoTimeout = Number(process.env.MONGO_TIMEOUT_MS || 10000);

app.locals.dbReady = false;

async function connectMongo() {
  if (!mongoUri) {
    console.error("❌ Missing MONGODB_URI in .env");
    return;
  }

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: mongoTimeout,
    });
    app.locals.dbReady = true;
    console.log("✅ Connected to MongoDB successfully!");
  } catch (err) {
    app.locals.dbReady = false;
    console.log("❌ MongoDB initial connection failed:", err.message);
  }
}

mongoose.connection.on("disconnected", function () {
  app.locals.dbReady = false;
  console.log("❌ Disconnected from MongoDB");
});

mongoose.connection.on("error", function (err) {
  app.locals.dbReady = false;
  console.log("❌ MongoDB connection error:", err.message);
});

connectMongo();
// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.send(err.message);
});

module.exports = app;
