import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { sendMessage, getMessages, getConversations } from "../controllers/message.controller.js";
import { upload } from "../middleware/multer.middleware.js";

const router = express.Router();

router.post("/", protect, upload.single("image"), sendMessage);
router.get("/conversations", protect, getConversations);
router.get("/:userId", protect, getMessages);

export default router;
