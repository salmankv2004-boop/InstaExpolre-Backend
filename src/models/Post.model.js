import mongoose from "mongoose";

/* ================= COMMENT SCHEMA ================= */
const commentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  text: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500,
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  }],
}, { timestamps: true });

/* ================= POST SCHEMA ================= */
const postSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ['post', 'reel'],
    default: 'post',
  },
  image: {
    type: String, // For photos
  },
  video: {
    type: String, // For reels
  },
  caption: {
    type: String,
    trim: true,
    maxlength: 2200,   // Instagram limit
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  }],
  comments: [commentSchema],
  visibility: {
    type: String,
    enum: ['public', 'private'],
    default: 'public',
  },
  isArchived: {
    type: Boolean,
    default: false,
  },
  isHidden: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

export default mongoose.models.Post || mongoose.model("Post", postSchema);
