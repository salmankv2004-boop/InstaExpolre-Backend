import express from "express";
import passport from "passport";
import {
  register,
  login,
  googleLogin,
  me,
  changePassword,
} from "../controllers/auth.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

/* NORMAL AUTH */
router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, me);
router.put("/change-password", protect, changePassword);


/* 🔐 GOOGLE AUTH */
router.post("/google", googleLogin);

export default router;
