import Notification from "../models/Notification.model.js";

export const getNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ recipient: req.user._id })
            .populate("sender", "username avatar followRequests")
            .populate("post", "image")
            .sort({ createdAt: -1 });

        const followingIds = req.user.following.map(id => id.toString());
        const myId = req.user._id.toString();

        const formattedNotifications = notifications.map(notification => {
            const notifObj = notification.toObject();
            if (notifObj.sender) {
                notifObj.sender.isFollowing = followingIds.includes(notifObj.sender._id.toString());
                notifObj.sender.isRequested = notifObj.sender.followRequests?.some(id => id.toString() === myId) || false;

                // Remove large array from response
                delete notifObj.sender.followRequests;
            }
            return notifObj;
        });

        res.status(200).json(formattedNotifications);
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
