
//  import User from "../models/User.model.js";
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

//     // Check if email or username already exists
//     const existingEmail = await User.findOne({ email });
//     if (existingEmail) return res.status(400).json({ message: "Email already registered" });

//     const existingUsername = await User.findOne({ username });
//     if (existingUsername) return res.status(400).json({ message: "Username already taken" });

//     // Hash the password
//     const hashedPassword = await bcrypt.hash(password, 10);

//     // CREATE USER and save to variable
//     const user = await User.create({
//       username,       // <--- include username
//       email,
//       password: hashedPassword,
//     });

//     // Generate JWT token
//     const token = generateToken(user._id);

//     // Remove password from response
//     const { password: pw, ...userData } = user._doc;

//     res.status(201).json({ user: userData, token });

//   } catch (err) {
//     console.error("Register error:", err);   // log the real error
//     if (err.code === 11000) {
//       if (err.keyPattern?.email) return res.status(400).json({ message: "Email already registered" });
//       if (err.keyPattern?.username) return res.status(400).json({ message: "Username already taken" });
//     }
//     res.status(500).json({ message: "Register failed" });
//   }
// };


// /* ================= LOGIN ================= */
// export const login = async (req, res) => {
//   try {
//     console.log("Login controller working");

//     const { email, password } = req.body;
//     console.log("Email and password received:", email, password);

//     const user = await User.findOne({ email });
//     if (!user) {
//       console.log("User not found");
//       return res.status(400).json({ message: "Invalid credentials" });
//     }

//     // Block password login for Google accounts
//     if (!user.password) {
//       console.log("Google account - cannot use password login");
//       return res.status(400).json({ message: "This account uses Google login" });
//     }

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       console.log("Password is incorrect");
//       return res.status(400).json({ message: "Invalid credentials" });
//     }

//     const token = generateToken(user._id);
//     const { password: pw, ...userData } = user._doc;

//     console.log("Login successful for:", email);
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

//     const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
//     const ticket = await client.verifyIdToken({
//       idToken: credential,
//       audience: process.env.GOOGLE_CLIENT_ID,
//     });

//     const { email, name, picture } = ticket.getPayload();

//     let user = await User.findOne({ email });

//     // if (!user) {
//     //   user = await User.create({
//     //     username: name,
//     //     email,
//     //     avatar: picture,
//     //   });
//     // }
// if (!user) {
//   user = await User.create({
//     username,
//     email,
//     avatar: picture,
//   });
// }

//     const token = generateToken(user._id);
//     const { password: pw, ...userData } = user._doc;

//     res.json({ user: userData, token });
//   }  catch (err) {
//   console.error("Google login error:", err);
//   res.status(400).json({ message: "Google login failed" });
// }

// };

// /* ================= CURRENT USER ================= */
// export const me = async (req, res) => {
//   try {
//     const user = await User.findById(req.userId).select("-password");
//     if (!user) return res.status(404).json({ message: "User not found" });
//     res.json({ user });
//   } catch {
//     res.status(401).json({ message: "Unauthorized" });
//   }
// };
import User from "../models/User.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";

/* ================= JWT HELPER ================= */
const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

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

    console.log("reachedd", req.body);


    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { email, name, picture } = ticket.getPayload();

    let user = await User.findOne({ email });

    if (!user) {
      // Create a unique username from the name
      let baseUsername = name.replace(/\s+/g, "").toLowerCase();
      let username = baseUsername;
      let count = 0;

      // Keep checking until we find a unique one
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
    res.status(400).json({ message: "Google login failed" });
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
      return res.status(400).json({ message: "Account uses Google login." });
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


