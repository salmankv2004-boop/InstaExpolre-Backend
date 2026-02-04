import Post from "../models/Post.model.js";
import User from "../models/User.model.js";
import Notification from "../models/Notification.model.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import { io, getReceiverSocketId } from "../utils/socket.js";

/* ================= FEED POSTS ================= */
export const getAllPosts = async (req, res) => {
  try {
    const userId = req.user?._id;
    const user = userId ? await User.findById(userId) : null;

    let query = {};
    if (user) {
      // Instagram style: Posts from me + people I follow
      // Also exclude people who blocked me
      query = {
        $and: [
          {
            $or: [
              { user: userId },
              { user: { $in: user.following } }
            ]
          },
          { user: { $nin: user.blockedUsers } } // People I blocked
        ]
      };
    }



    const posts = await Post.find(query)
      .populate("user", "username avatar")
      .populate("comments.user", "username avatar")
      .sort({ createdAt: -1 });

    const formattedPosts = posts.map(post => {
      const p = post.toObject();
      return {
        ...p,
        user: {
          ...p.user,
          isFollowing: user ? user.following.some(id => id.toString() === p.user._id.toString()) : false
        },
        isLiked: userId ? post.likes.some(id => id.toString() === userId.toString()) : false,
        isSaved: user ? user.savedPosts.some(id => id.toString() === post._id.toString()) : false,
      };
    });


    res.json(formattedPosts);
  } catch (err) {
    console.error("getAllPosts error:", err);
    res.status(500).json({ message: "Failed to load feed" });
  }
};

/* ================= MY POSTS ================= */
export const getMyPosts = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const posts = await Post.find({ user: req.user._id })
      .populate("user", "username avatar")
      .populate("comments.user", "username avatar")
      .sort({ createdAt: -1 });

    const userId = req.user._id.toString();
    const user = await User.findById(userId);

    const formattedPosts = posts.map(post => {
      const p = post.toObject();
      return {
        ...p,
        user: {
          ...p.user,
          isFollowing: false // Can't follow self
        },
        isLiked: post.likes.some(id => id.toString() === userId),
        isSaved: user.savedPosts.some(id => id.toString() === post._id.toString()),
      };
    });


    res.json(formattedPosts);
  } catch (err) {
    console.error("getMyPosts error:", err);
    res.status(500).json({ message: "Failed to load your posts" });
  }
};

/* ================= CREATE POST ================= */
export const createPost = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Media (image or video) is required" });
    }

    const { caption, visibility = 'public' } = req.body;

    // Determine type based on mimetype
    const type = req.file.mimetype.startsWith('video/') ? 'reel' : 'post';
    const folder = type === 'reel' ? "reels" : "posts";

    const result = await uploadToCloudinary(req.file.buffer, folder);

    const postData = {
      user: req.user._id,
      caption,
      visibility,
      type
    };

    if (type === 'reel') {
      postData.video = result.secure_url;
    } else {
      postData.image = result.secure_url;
    }

    const post = await Post.create(postData);

    res.status(201).json(post);
  } catch (err) {
    console.error("createPost error:", err);
    res.status(500).json({
      message: "Failed to create post",
      error: err.message
    });
  }
};

/* ================= LIKE / UNLIKE ================= */
export const toggleLike = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const userId = req.user._id.toString();

    const liked = post.likes.some(id => id.toString() === userId);

    post.likes = liked
      ? post.likes.filter(id => id.toString() !== userId)
      : [...post.likes, req.user._id];

    await post.save();

    // Send Notification for Like
    if (!liked && post.user.toString() !== userId) {
      const notification = await Notification.create({
        recipient: post.user,
        sender: userId,
        type: "like",
        post: post._id,
      });

      const populatedNotification = await notification.populate("sender", "username avatar");
      const receiverSocketId = getReceiverSocketId(post.user.toString());
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("newNotification", populatedNotification);
      }
    }

    res.json({ liked: !liked, likesCount: post.likes.length });
  } catch (err) {
    console.error("toggleLike error:", err);
    res.status(500).json({ message: "Failed to toggle like" });
  }
};

/* ================= COMMENT ================= */
export const addComment = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const { text } = req.body;
    const post = await Post.findById(req.params.id);

    if (!post) return res.status(404).json({ message: "Post not found" });

    post.comments.push({ user: req.user._id, text });
    await post.save();

    // Re-populate to get user info for the new comment
    const updatedPost = await Post.findById(post._id).populate("comments.user", "username avatar");

    // Send Notification for Comment
    if (post.user.toString() !== req.user._id.toString()) {
      const notification = await Notification.create({
        recipient: post.user,
        sender: req.user._id,
        type: "comment",
        post: post._id,
        content: text,
      });

      const populatedNotification = await notification.populate("sender", "username avatar");
      const receiverSocketId = getReceiverSocketId(post.user.toString());
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("newNotification", populatedNotification);
      }
    }

    res.json(updatedPost.comments);

  } catch (err) {
    console.error("addComment error:", err);
    res.status(500).json({ message: "Failed to add comment", error: err.message });
  }
};

/* ================= DELETE COMMENT ================= */
export const deleteComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    // Only comment owner or post owner can delete
    if (comment.user.toString() !== req.user._id.toString() && post.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "Unauthorized to delete this comment" });
    }

    comment.deleteOne();
    await post.save();

    const updatedPost = await Post.findById(post._id).populate("comments.user", "username avatar");
    res.json(updatedPost.comments);
  } catch (err) {
    console.error("deleteComment error:", err);
    res.status(500).json({ message: "Failed to delete comment", error: err.message });
  }
};

/* ================= LIKE / UNLIKE COMMENT ================= */
export const toggleCommentLike = async (req, res) => {
  try {
    const { postId, commentId } = req.params;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    const userId = req.user._id.toString();
    const liked = comment.likes.some(id => id.toString() === userId);

    if (liked) {
      // Unlike
      comment.likes = comment.likes.filter(id => id.toString() !== userId);
    } else {
      // Like
      comment.likes.push(userId);

      // Send Notification
      if (comment.user.toString() !== userId) {
        const notification = await Notification.create({
          recipient: comment.user,
          sender: userId,
          type: "comment_like",
          post: post._id,
          content: comment.text,
        });

        const populatedNotification = await notification.populate("sender", "username avatar");
        const receiverSocketId = getReceiverSocketId(comment.user.toString());
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("newNotification", populatedNotification);
        }
      }
    }

    await post.save();

    // Return updated comments
    // We need to populate to ensure consistent frontend state if needed, 
    // although for likes we usually just need the ID. 
    // But returning full proper list is safer.
    const updatedPost = await Post.findById(post._id).populate("comments.user", "username avatar");

    res.json(updatedPost.comments);
  } catch (err) {
    console.error("toggleCommentLike error:", err);
    res.status(500).json({ message: "Failed to toggle comment like" });
  }
};

/* ================= TOGGLE SAVE ================= */
export const toggleSave = async (req, res) => {
  try {
    const userId = req.user._id;
    const postId = req.params.id;

    const user = await User.findById(userId);
    const postIndex = user.savedPosts.indexOf(postId);

    if (postIndex === -1) {
      user.savedPosts.push(postId);
    } else {
      user.savedPosts.splice(postIndex, 1);
    }

    await user.save();
    res.json({ message: postIndex === -1 ? "Post saved" : "Post removed from saves" });
  } catch (err) {
    console.error("toggleSave error:", err);
    res.status(500).json({ message: "Failed to save post" });
  }
};

/* ================= GET SAVED POSTS ================= */
export const getSavedPosts = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: "savedPosts",
      populate: { path: "user", select: "username avatar" }
    });

    const formatted = user.savedPosts.map(post => ({
      ...post.toObject(),
      isLiked: post.likes.some(id => id.toString() === req.user._id.toString()),
      isSaved: true
    }));

    res.json(formatted);
  } catch (err) {
    console.error("getSavedPosts error:", err);
    res.status(500).json({ message: "Failed to load saved posts" });
  }
};

/* ================= USER POSTS ================= */
export const getUserPosts = async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ message: "User not found" });

    const userId = req.user?._id?.toString();

    // Check if following
    const isOwner = userId === targetUser._id.toString();
    const isFollowing = targetUser.followers.some(id => id.toString() === userId);

    // 1. Account Level Privacy
    if (targetUser.isPrivate && !isOwner && !isFollowing) {
      return res.json([]);
    }

    // 2. Post Level Privacy
    // If not owner and not following, show only public posts
    // (This handles Public Profile -> Private Post case)
    let query = { user: req.params.id };
    if (!isOwner && !isFollowing) {
      query.visibility = 'public';
    }

    const posts = await Post.find(query)
      .populate("user", "username avatar")
      .populate("comments.user", "username avatar")
      .sort({ createdAt: -1 });

    const currUser = userId ? await User.findById(userId) : null;


    const formatted = posts.map(post => ({
      ...post.toObject(),
      isLiked: userId ? post.likes.some(id => id.toString() === userId) : false,
      isSaved: currUser ? currUser.savedPosts.some(id => id.toString() === post._id.toString()) : false,
    }));

    res.json(formatted);
  } catch (err) {
    console.error("getUserPosts error:", err);
    res.status(500).json({ message: "Failed to load user posts" });
  }
};
