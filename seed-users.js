import mongoose from "mongoose";
import User from "./src/models/User.model.js";
import bcrypt from "bcryptjs";

const MONGO_URI = "mongodb://localhost:27017/instagram-clone";

const testUsers = [
    {
        username: "john_doe",
        email: "john@example.com",
        password: "password123",
        fullName: "John Doe",
        bio: "Travel enthusiast 🌍",
    },
    {
        username: "jane_smith",
        email: "jane@example.com",
        password: "password123",
        fullName: "Jane Smith",
        bio: "Coffee lover ☕",
    },
    {
        username: "mike_wilson",
        email: "mike@example.com",
        password: "password123",
        fullName: "Mike Wilson",
        bio: "Photographer 📸",
    },
    {
        username: "sarah_jones",
        email: "sarah@example.com",
        password: "password123",
        fullName: "Sarah Jones",
        bio: "Fitness coach 💪",
    },
    {
        username: "alex_brown",
        email: "alex@example.com",
        password: "password123",
        fullName: "Alex Brown",
        bio: "Tech geek 💻",
    },
];

async function seedUsers() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("✅ Connected to MongoDB");

        // Check existing users
        const existingCount = await User.countDocuments();
        console.log(`📊 Current users in database: ${existingCount}`);

        // Create test users if they don't exist
        for (const userData of testUsers) {
            const exists = await User.findOne({ username: userData.username });
            if (!exists) {
                const hashedPassword = await bcrypt.hash(userData.password, 10);
                await User.create({
                    ...userData,
                    password: hashedPassword,
                });
                console.log(`✅ Created user: ${userData.username}`);
            } else {
                console.log(`⏭️  User already exists: ${userData.username}`);
            }
        }

        const finalCount = await User.countDocuments();
        console.log(`\n📊 Total users in database: ${finalCount}`);

        // List all users
        const allUsers = await User.find().select("username email fullName");
        console.log("\n👥 All users:");
        allUsers.forEach(user => {
            console.log(`  - ${user.username} (${user.fullName || 'No name'})`);
        });

        await mongoose.disconnect();
        console.log("\n✅ Done!");
    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
}

seedUsers();
