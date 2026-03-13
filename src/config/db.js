import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    console.log("⏳ Retrying MongoDB connection in 5 seconds...");
    // Retry after 5 seconds instead of crashing the server
    setTimeout(connectDB, 5000);
  }
};

export default connectDB;
