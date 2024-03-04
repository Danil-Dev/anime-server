const mongoose = require("mongoose");
const watchedEpisodeSchema = require("./WatchedEpisodeSchema");

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, "Please provide an Email."],
    unique: [true, "This email already exists."]
  },

  password: {
    type: String,
    required: [false, "Please provide a password."],
    unique: false
  },
  image: String,
  name: String,
  isGoogleAuth: Boolean,
  watchedEpisodes: [watchedEpisodeSchema],
  watchlist: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Anime"
  }]

})

module.exports = mongoose.model.Users || mongoose.model("Users", UserSchema)