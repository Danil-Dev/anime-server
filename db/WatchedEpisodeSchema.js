const mongoose = require("mongoose");

const watchedEpisodeSchema = new mongoose.Schema({
  animeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Anime",
  },
  episodeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Episodes",
  },
  episodeNumber: Number,
  watchedOn: {
    type: Date,
    default: Date.now,
  },
  currentTime: {
    type: Number,
    default: 0,
  }
});

module.exports = watchedEpisodeSchema