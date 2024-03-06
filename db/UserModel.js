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
  image: {
    type: String,
    default: 'aaa3baf6-ed64-4e0a-e96f-907bfecfea00'
  },
  name: {
    type: String,
    unique: [true, 'This name already in use']
  },
  isGoogleAuth: Boolean,
  watchedEpisodes: [watchedEpisodeSchema],
  watchlist: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Anime"
  }]

})

module.exports = mongoose.model.Users || mongoose.model("Users", UserSchema)