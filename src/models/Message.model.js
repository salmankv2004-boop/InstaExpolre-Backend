import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
    {
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        receiver: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        content: {
            type: String,
            required: function () { return !this.sharedPost && !this.image; }, // Required if not sharing a post or image
        },
        sharedPost: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Post",
        },
        image: {
            type: String,
        },
        read: {
            type: Boolean,
            default: false,
        },

    },
    { timestamps: true }
);

export default mongoose.models.Message || mongoose.model("Message", messageSchema);
