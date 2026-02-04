
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    fullName: {
      type: String,
      default: "",
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    password: {
      type: String,
    },

    avatar: {
      type: String,
      default: "",
    },

    bio: {
      type: String,
      default: "",
      maxlength: 150,
    },

    googleId: {
      type: String,
    },

    followers: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    ],

    following: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    ],
    followRequests: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    ],
    blockedUsers: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    ],
    restrictedUsers: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    ],
    savedPosts: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Post" },
    ],
    isPrivate: {
      type: Boolean,
      default: false,
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
  },

  { timestamps: true }
);

export default mongoose.models.User || mongoose.model("User", userSchema);

