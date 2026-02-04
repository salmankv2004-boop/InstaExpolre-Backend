import Post from "../models/Post.model.js";
import Message from "../models/Message.model.js";
import User from "../models/User.model.js";

export const getActivity = async (req, res) => {
  try {
    const userId = req.user._id;

    // 1. Find interactions on my posts
    const posts = await Post.find({ user: userId })
      .populate("likes", "username avatar")
      .populate("comments.user", "username avatar")
      .sort({ updatedAt: -1 });

    const activities = [];

    posts.forEach(post => {
      // Likes
      post.likes.forEach(user => {
        if (user._id.toString() !== userId.toString()) {
          activities.push({
            type: "like",
            user,
            postId: post._id,
            createdAt: post.updatedAt,
          });
        }
      });

      // Comments
      post.comments.forEach(comment => {
        if (comment.user._id.toString() !== userId.toString()) {
          activities.push({
            type: "comment",
            user: comment.user,
            postId: post._id,
            text: comment.text,
            createdAt: comment.createdAt,
          });
        }
      });
    });

    // 2. Find unread messages for notification (Optional but requested)
    // We'll just show the latest unread message from each sender
    const unreadMessages = await Message.find({ receiver: userId, read: false })
      .populate("sender", "username avatar")
      .sort({ createdAt: -1 });

    unreadMessages.forEach(msg => {
      activities.push({
        type: "message",
        user: msg.sender,
        text: msg.content,
        createdAt: msg.createdAt
      });
    });

    // 3. Find followers
    const followers = await User.find({ following: userId })
      .select("username avatar createdAt")
      .limit(20);

    followers.forEach(follower => {
      activities.push({
        type: "follow",
        user: follower,
        createdAt: follower.createdAt // This is approximate for notification
      });
    });

    activities.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    res.json(activities);
  } catch (err) {
    console.error("Activity error:", err);
    res.status(500).json({ message: "Failed to load activity", error: err.message });
  }
};
