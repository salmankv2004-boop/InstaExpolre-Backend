import express from "express";
import {
  getAllPosts,
  getMyPosts,
  getSavedPosts,
  createPost,
  toggleLike,
  toggleSave,
  addComment,
  deleteComment,
  toggleCommentLike,
  getUserPosts,
} from "../controllers/post.controller.js";

import { protect } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/multer.middleware.js";

const router = express.Router();

router.get("/", protect, getAllPosts);
router.get("/me", protect, getMyPosts);
router.get("/saved", protect, getSavedPosts);
router.get("/user/:id", protect, getUserPosts);

router.post("/", protect, upload.single("image"), createPost);
router.post("/:id/like", protect, toggleLike);
router.post("/:id/save", protect, toggleSave);
router.post("/:id/comment", protect, addComment);
router.post("/:postId/comment/:commentId/like", protect, toggleCommentLike);
router.delete("/:postId/comment/:commentId", protect, deleteComment);

export default router;
