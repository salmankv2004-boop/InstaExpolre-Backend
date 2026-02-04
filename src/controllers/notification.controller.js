import Notification from "../models/Notification.model.js";

export const getNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ recipient: req.user._id })
            .populate("sender", "username avatar")
            .populate("post", "image")
            .sort({ createdAt: -1 });

        res.status(200).json(notifications);
    } catch (error) {
        console.error("Error in getNotifications:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const markNotificationsAsRead = async (req, res) => {
    try {
        const { type, senderId } = req.query;
        const query = { recipient: req.user._id, isRead: false };

        if (senderId) query.sender = senderId;

        if (type === "activity") {
            // Mark everything EXCEPT messages as read
            query.type = { $ne: "message" };
        } else if (type) {
            query.type = type;
        }


        await Notification.updateMany(query, { isRead: true });
        res.status(200).json({ message: "Notifications marked as read" });
    } catch (error) {
        console.error("Error in markNotificationsAsRead:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};



export const deleteNotification = async (req, res) => {
    try {
        const notificationId = req.params.id;
        await Notification.findOneAndDelete({ _id: notificationId, recipient: req.user._id });
        res.status(200).json({ message: "Notification deleted" });
    } catch (error) {
        console.error("Error in deleteNotification:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
