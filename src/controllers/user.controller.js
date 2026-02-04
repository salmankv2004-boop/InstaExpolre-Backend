import User from "../models/User.model.js";
import Notification from "../models/Notification.model.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import { io, getReceiverSocketId } from "../utils/socket.js";


/* ================= GET MY PROFILE ================= */
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (err) {
    console.error("getMe error:", err);
    res.status(401).json({ message: "Unauthorized" });
  }
};

/* ================= GET USER BY ID ================= */
export const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if I am blocked
    if (user.blockedUsers.includes(req.user._id)) {
      return res.status(403).json({ message: "User not found" }); // Hide existence or show blocked message
    }


    // Check if the logged-in user is following this person
    const isFollowing = user.followers.some(
      id => id.toString() === req.user._id.toString()
    );

    // Check if follow request is pending
    const isRequested = user.followRequests.some(
      id => id.toString() === req.user._id.toString()
    );

    res.json({
      ...user.toObject(),
      isFollowing,
      isRequested
    });

  } catch (err) {
    console.error("getUser error:", err);
    res.status(400).json({ message: "Invalid user ID" });
  }
};

/* ================= FOLLOW USER ================= */
export const followUser = async (req, res) => {
  try {
    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({ message: "You cannot follow yourself" });
    }

    const userToFollow = await User.findById(req.params.id);
    const me = await User.findById(req.user._id);

    if (!userToFollow) {
      return res.status(404).json({ message: "User find failed" });
    }

    if (me.following.some(id => id.toString() === userToFollow._id.toString())) {
      return res.status(400).json({ message: "Already following" });
    }

    if (userToFollow.blockedUsers.includes(me._id)) {
      return res.status(403).json({ message: "You are blocked by this user" });
    }

    // If account is private, send request
    if (userToFollow.isPrivate) {
      if (userToFollow.followRequests.includes(me._id)) {
        return res.status(400).json({ message: "Follow request already sent" });
      }
      userToFollow.followRequests.push(me._id);
      await userToFollow.save();

      // Notification for Request
      await Notification.create({
        recipient: userToFollow._id,
        sender: me._id,
        type: "follow_request",
      });

      const receiverSocketId = getReceiverSocketId(userToFollow._id.toString());
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("newNotification", {
          sender: { _id: me._id, username: me.username, avatar: me.avatar },
          type: "follow_request",
          createdAt: new Date(),
        });
      }

      return res.json({ message: "Follow request sent" });
    }

    me.following.push(userToFollow._id);
    userToFollow.followers.push(me._id);

    await me.save();
    await userToFollow.save();

    // Send Notification for Follow
    const notification = await Notification.create({
      recipient: userToFollow._id,
      sender: me._id,
      type: "follow",
    });

    const populatedNotification = await notification.populate("sender", "username avatar");
    const receiverSocketId = getReceiverSocketId(userToFollow._id.toString());
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newNotification", populatedNotification);
    }

    res.json({ message: "User followed successfully" });

  } catch (err) {
    console.error("followUser error:", err);
    res.status(500).json({ message: "Follow failed", error: err.message });
  }
};

/* ================= UNFOLLOW USER ================= */
export const unfollowUser = async (req, res) => {
  try {
    const userToUnfollow = await User.findById(req.params.id);
    const me = await User.findById(req.user._id);

    if (!userToUnfollow) {
      return res.status(404).json({ message: "User not found" });
    }

    me.following = me.following.filter(
      id => id.toString() !== userToUnfollow._id.toString()
    );

    userToUnfollow.followers = userToUnfollow.followers.filter(
      id => id.toString() !== me._id.toString()
    );

    await me.save();
    await userToUnfollow.save();

    res.json({ message: "User unfollowed successfully" });
  } catch (err) {
    console.error("unfollowUser error:", err);
    res.status(500).json({ message: "Unfollow failed", error: err.message });
  }
};

/* ================= UPDATE MY PROFILE ================= */
export const updateMe = async (req, res) => {
  try {
    const { username, fullName, bio } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (username) user.username = username;
    if (fullName !== undefined) user.fullName = fullName;
    if (bio !== undefined) user.bio = bio;


    // 🔥 Avatar upload
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, "avatars");
      user.avatar = result.secure_url;
    }

    await user.save();

    res.json({
      _id: user._id,
      username: user.username,
      avatar: user.avatar,
      bio: user.bio,
    });
  } catch (err) {
    console.error("updateMe error:", err);
    res.status(500).json({
      message: "Failed to update profile",
      error: err.message
    });
  }
};
/* ================= SEARCH USERS ================= */
export const searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.json([]);

    const users = await User.find({
      username: { $regex: query, $options: "i" }
    })
      .select("username avatar bio followers following")
      .limit(10);

    const userId = req.user._id.toString();
    const formatted = users.map(user => ({
      ...user.toObject(),
      isFollowing: user.followers.some(f => f.toString() === userId)
    }));

    res.json(formatted);
  } catch (err) {
    console.error("searchUsers error:", err);
    res.status(500).json({ message: "Search failed" });
  }
};
/* ================= PRIVACY & SECURITY ================= */

export const updatePrivacySettings = async (req, res) => {
  try {
    const { isPrivate, twoFactorEnabled } = req.body;
    const user = await User.findById(req.user._id);

    if (isPrivate !== undefined) user.isPrivate = isPrivate;
    if (twoFactorEnabled !== undefined) user.twoFactorEnabled = twoFactorEnabled;

    await user.save();
    res.json({ message: "Privacy settings updated", user });
  } catch (err) {
    res.status(500).json({ message: "Failed to update settings" });
  }
};

export const blockUser = async (req, res) => {
  try {
    const me = await User.findById(req.user._id);
    const userToBlockId = req.params.id;

    if (me.blockedUsers.includes(userToBlockId)) {
      return res.status(400).json({ message: "Already blocked" });
    }

    me.blockedUsers.push(userToBlockId);
    // Also unfollow
    me.following = me.following.filter(id => id.toString() !== userToBlockId);

    await me.save();

    // Remove from their followers too
    await User.findByIdAndUpdate(userToBlockId, {
      $pull: { followers: me._id }
    });

    res.json({ message: "User blocked" });
  } catch (err) {
    res.status(500).json({ message: "Blocking failed" });
  }
};

export const unblockUser = async (req, res) => {
  try {
    const me = await User.findById(req.user._id);
    me.blockedUsers = me.blockedUsers.filter(id => id.toString() !== req.params.id);
    await me.save();
    res.json({ message: "User unblocked" });
  } catch (err) {
    res.status(500).json({ message: "Unblocking failed" });
  }
};

export const handleFollowRequest = async (req, res) => {
  try {
    const { requesterId, action } = req.body; // action: 'accept' or 'decline'
    const me = await User.findById(req.user._id);

    if (!me.followRequests.includes(requesterId)) {
      return res.status(404).json({ message: "Request not found" });
    }

    me.followRequests = me.followRequests.filter(id => id.toString() !== requesterId);

    if (action === "accept") {
      me.followers.push(requesterId);
      await User.findByIdAndUpdate(requesterId, {
        $push: { following: me._id }
      });

      // Notify them
      const notification = await Notification.create({
        recipient: requesterId,
        sender: me._id,
        type: "follow_accept",
      });

      const populatedNotification = await notification.populate("sender", "username avatar");
      const receiverSocketId = getReceiverSocketId(requesterId.toString());
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("newNotification", populatedNotification);
      }

    }

    await me.save();
    res.json({ message: `Request ${action}ed` });
  } catch (err) {
    res.status(500).json({ message: "Request handling failed" });
  }
};
/* ================= GET FOLLOWERS ================= */
export const getFollowers = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate("followers", "username avatar fullName bio followers followRequests");
    if (!user) return res.status(404).json({ message: "User not found" });

    const me = await User.findById(req.user._id);
    const followingIds = me.following.map(id => id.toString());

    const formatted = user.followers.map(f => ({
      ...f.toObject(),
      isFollowing: followingIds.includes(f._id.toString()),
      isRequested: f.followRequests?.some(id => id.toString() === req.user._id.toString())
    }));

    res.json(formatted);
  } catch (err) {
    console.error("getFollowers error:", err);
    res.status(500).json({ message: "Failed to fetch followers" });
  }
};

/* ================= GET FOLLOWING ================= */
export const getFollowing = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate("following", "username avatar fullName bio followers followRequests");
    if (!user) return res.status(404).json({ message: "User not found" });

    const me = await User.findById(req.user._id);
    const followingIds = me.following.map(id => id.toString());

    const formatted = user.following.map(f => ({
      ...f.toObject(),
      isFollowing: followingIds.includes(f._id.toString()),
      isRequested: f.followRequests?.some(id => id.toString() === req.user._id.toString())
    }));

    res.json(formatted);
  } catch (err) {
    console.error("getFollowing error:", err);
    res.status(500).json({ message: "Failed to fetch following" });
  }
};

/* ================= GET SUGGESTED USERS ================= */
export const getSuggestedUsers = async (req, res) => {
  try {
    const me = await User.findById(req.user._id);
    const excludeIds = [req.user._id, ...me.following, ...me.followRequests];

    const suggested = await User.find({
      _id: { $nin: excludeIds }
    })
      .select("username avatar fullName bio followers")
      .limit(10);

    const formatted = suggested.map(user => ({
      ...user.toObject(),
      isFollowing: false,
      isRequested: false
    }));

    res.json(formatted);
  } catch (err) {
    console.error("getSuggestedUsers error:", err);
    res.status(500).json({ message: "Failed to fetch suggestions" });
  }
};

