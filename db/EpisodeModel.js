const mongoose = require("mongoose");

const episodeSchema = new mongoose.Schema({
  episode_number: Number,
  title: String,
  duration: String,
  date: Date,
  description: String,
  video: String,
  intro: String,
  end: Number,
  image_thumb: String,
  anime: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Anime",
  }
});

module.exports = mongoose.model.Episodes || mongoose.model("Episodes", episodeSchema)