import mongoose from "mongoose";
import Message from "../models/Message.model.js";
import User from "../models/User.model.js";
import Notification from "../models/Notification.model.js";
import { getReceiverSocketId, io } from "../utils/socket.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";

export const sendMessage = async (req, res) => {
    try {
        const { receiverId, content, sharedPostId } = req.body;
        const senderId = req.user._id;

        // Validation for receiverId
        if (!receiverId) {
            return res.status(400).json({ message: "Receiver ID is required" });
        }

        // Check if content or image is provided
        if (!content && !req.file && !sharedPostId) {
            return res.status(400).json({ message: "Message content or attachment is required" });
        }

        let imageUrl = null;
        if (req.file) {
            const result = await uploadToCloudinary(req.file.buffer, "messages");
            imageUrl = result.secure_url;
        }

        const newMessage = await Message.create({
            sender: senderId,
            receiver: receiverId,
            content: content || (imageUrl ? "Sent an image" : "Check out this post!"),
            sharedPost: sharedPostId,
            image: imageUrl
        });

        // Populate shared post with full details including user
        const populatedMessage = await Message.findById(newMessage._id)
            .populate({
                path: "sharedPost",
                populate: { path: "user", select: "username avatar" }
            });


        // Real-time message emission
        const receiverSocketId = getReceiverSocketId(receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("newMessage", populatedMessage);
        }

        // Create notification for the message
        const notification = await Notification.create({
            recipient: receiverId,
            sender: senderId,
            type: "message",
            content: content || (imageUrl ? "Sent an image" : sharedPostId ? "Sent a post" : "Sent a message"),
        });

        const populatedNotification = await notification.populate("sender", "username avatar");
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("newNotification", populatedNotification);
        }

        res.status(201).json(populatedMessage);

    } catch (error) {
        console.error("sendMessage error:", error);
        res.status(500).json({ message: "Failed to send message", error: error.message, details: error });
    }
};


export const getMessages = async (req, res) => {
    try {
        const { userId } = req.params; // The other user's ID
        const myId = req.user._id;

        const messages = await Message.find({
            $or: [
                { sender: myId, receiver: userId },
                { sender: userId, receiver: myId },
            ],
        }).populate({
            path: "sharedPost",
            populate: { path: "user", select: "username avatar" }
        }).sort({ createdAt: 1 }); // Oldest first

        res.status(200).json(messages);

    } catch (error) {
        res.status(500).json({ message: "Failed to fetch messages", error: error.message });
    }
};

export const getConversations = async (req, res) => {
    try {
        const myId = new mongoose.Types.ObjectId(req.user._id);

        // Find all messages where I am sender or receiver
        // This is a simple aggregation to get unique conversation partners
        const conversations = await Message.aggregate([
            {
                $match: {
                    $or: [{ sender: myId }, { receiver: myId }],
                },
            },
            {
                $sort: { createdAt: -1 },
            },
            {
                $group: {
                    _id: {
                        $cond: [
                            { $eq: ["$sender", myId] },
                            "$receiver",
                            "$sender",
                        ],
                    },
                    lastMessage: { $first: "$$ROOT" },
                },
            },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "userInfo",
                },
            },
            {
                $unwind: "$userInfo",
            },
            {
                $project: {
                    "userInfo.password": 0,
                    "userInfo.email": 0,
                },
            },
            {
                $sort: { "lastMessage.createdAt": -1 },
            },
        ]);

        res.status(200).json(conversations);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch conversations", error: error.message });
    }
};
