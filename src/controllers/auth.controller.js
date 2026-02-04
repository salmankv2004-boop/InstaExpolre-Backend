// import User from "../models/User.model.js";
// import bcrypt from "bcryptjs";
// import jwt from "jsonwebtoken";
// import { OAuth2Client } from "google-auth-library";

// /* ================= JWT HELPER ================= */
// const generateToken = (id) =>
//   jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

// /* ================= REGISTER ================= */
// export const register = async (req, res) => {
//   try {
//     const { username, email, password } = req.body;

//     if (!username || !email || !password) {
//       return res.status(400).json({ message: "All fields are required" });
//     }

//     if (await User.findOne({ email })) {
//       return res.status(400).json({ message: "Email already registered" });
//     }

//     if (await User.findOne({ username })) {
//       return res.status(400).json({ message: "Username already taken" });
//     }

//     const hashedPassword = await bcrypt.hash(password, 10);

//     const user = await User.create({
//       username,
//       email,
//       password: hashedPassword,
//     });

//     const token = generateToken(user._id);
//     const { password: pw, ...userData } = user._doc;

//     res.status(201).json({ user: userData, token });
//   } catch (err) {
//     console.error("Register error:", err);
//     res.status(500).json({ message: "Register failed" });
//   }
// };

// /* ================= LOGIN ================= */
// export const login = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     const user = await User.findOne({ email });
//     if (!user || !user.password) {
//       return res.status(400).json({ message: "Invalid credentials" });
//     }

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return res.status(400).json({ message: "Invalid credentials" });
//     }

//     const token = generateToken(user._id);
//     const { password: pw, ...userData } = user._doc;

//     res.json({ user: userData, token });
//   } catch (err) {
//     console.error("Login error:", err);
//     res.status(500).json({ message: "Login failed" });
//   }
// };

// /* ================= GOOGLE LOGIN ================= */
// export const googleLogin = async (req, res) => {
//   try {
//     const { credential } = req.body;

//     console.log("reachedd", req.body);


//     const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
//     const ticket = await client.verifyIdToken({
//       idToken: credential,
//       audience: process.env.GOOGLE_CLIENT_ID,
//     });

//     const { email, name, picture } = ticket.getPayload();

//     let user = await User.findOne({ email });

//     if (!user) {
//       // Create a unique username from the name
//       let baseUsername = name.replace(/\s+/g, "").toLowerCase();
//       let username = baseUsername;
//       let count = 0;

//       // Keep checking until we find a unique one
//       while (await User.findOne({ username })) {
//         count++;
//         username = `${baseUsername}${count}`;
//       }

//       user = await User.create({
//         username,
//         email,
//         avatar: picture,
//       });
//     }

//     const token = generateToken(user._id);
//     const { password: pw, ...userData } = user._doc;

//     res.json({ user: userData, token });
//   } catch (err) {
//     console.error("Google login error:", err);
//     res.status(400).json({ message: "Google login failed" });
//   }
// };

// /* ================= CURRENT USER ================= */
// export const me = async (req, res) => {
//   try {
//     const user = await User.findById(req.user._id)
//       .select("-password")
//       .populate("followRequests", "username avatar");
//     res.json({ user });
//   } catch (error) {
//     res.status(401).json({ message: "Unauthorized" });
//   }
// };

// /* ================= CHANGE PASSWORD ================= */
// export const changePassword = async (req, res) => {
//   try {
//     const { currentPassword, newPassword } = req.body;
//     const user = await User.findById(req.user._id);

//     if (!user.password) {
//       return res.status(400).json({ message: "Account uses Google login." });
//     }

//     const isMatch = await bcrypt.compare(currentPassword, user.password);
//     if (!isMatch) {
//       return res.status(400).json({ message: "Incorrect current password" });
//     }

//     user.password = await bcrypt.hash(newPassword, 10);
//     await user.save();
//     res.json({ message: "Password updated successfully" });
//   } catch (err) {
//     res.status(500).json({ message: "Failed to update password" });
//   }
// };


import User from "../models/User.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";

/* ================= JWT HELPER ================= */
const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/* ================= REGISTER ================= */
export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (await User.findOne({ email })) {
      return res.status(400).json({ message: "Email already registered" });
    }

    if (await User.findOne({ username })) {
      return res.status(400).json({ message: "Username already taken" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
    });

    const token = generateToken(user._id);
    const { password: pw, ...userData } = user._doc;

    res.status(201).json({ user: userData, token });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Register failed" });
  }
};

/* ================= LOGIN ================= */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !user.password) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = generateToken(user._id);
    const { password: pw, ...userData } = user._doc;

    res.json({ user: userData, token });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Login failed" });
  }
};

/* ================= GOOGLE LOGIN ================= */
export const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ message: "Google credential missing" });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(400).json({ message: "Invalid Google token" });
    }

    const { email, name = "user", picture } = payload;

    let user = await User.findOne({ email });

    if (!user) {
      let baseUsername = name.replace(/\s+/g, "").toLowerCase() || "user";
      let username = baseUsername;
      let count = 0;

      while (await User.findOne({ username })) {
        count++;
        username = `${baseUsername}${count}`;
      }

      user = await User.create({
        username,
        email,
        avatar: picture,
      });
    }

    const token = generateToken(user._id);
    const { password: pw, ...userData } = user._doc;

    res.json({ user: userData, token });
  } catch (err) {
    console.error("Google login error:", err);
    res.status(401).json({ message: "Google authentication failed" });
  }
};

/* ================= CURRENT USER ================= */
export const me = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select("-password")
      .populate("followRequests", "username avatar");

    res.json({ user });
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
  }
};

/* ================= CHANGE PASSWORD ================= */
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    if (!user.password) {
      return res
        .status(400)
        .json({ message: "Account uses Google login." });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect current password" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to update password" });
  }
};
