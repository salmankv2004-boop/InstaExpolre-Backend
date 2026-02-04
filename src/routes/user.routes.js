import express from "express";
import {
  getMe,
  getUser,
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getSuggestedUsers,
  updateMe,
  searchUsers,
  updatePrivacySettings,
  blockUser,
  unblockUser,
  handleFollowRequest,
} from "../controllers/user.controller.js";


import { protect } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/multer.middleware.js";

const router = express.Router();

router.get("/me", protect, getMe);
router.get("/search", protect, searchUsers);
router.get("/suggestions/list", protect, getSuggestedUsers);
router.get("/:id", protect, getUser);
router.get("/:id/followers", protect, getFollowers);
router.get("/:id/following", protect, getFollowing);
router.post("/:id/follow", protect, followUser);

router.post("/:id/unfollow", protect, unfollowUser);


router.put(
  "/me",
  protect,
  upload.single("avatar"),
  updateMe
);

// Privacy & Security
router.put("/privacy", protect, updatePrivacySettings);
router.post("/:id/block", protect, blockUser);
router.post("/:id/unblock", protect, unblockUser);
router.post("/follow-request", protect, handleFollowRequest);

export default router;

