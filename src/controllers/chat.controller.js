const Message = require('../models/message.model');
const User = require('../models/user.model');

// GET /api/chat/:friendId — Get conversation with a friend
const getConversation = async (req, res) => {
    try {
        const userId = req.user.id;
        const friendId = req.params.friendId;

        // Check if they are friends
        const user = await User.findById(userId);
        if (!user.friends.includes(friendId)) {
            return res.status(403).json({ message: 'You can only chat with friends' });
        }

        const messages = await Message.find({
            $or: [
                { sender: userId, receiver: friendId },
                { sender: friendId, receiver: userId },
            ],
        })
            .sort({ createdAt: 1 })
            .populate('sender', 'username avatar')
            .populate('receiver', 'username avatar');

        res.json(messages);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// POST /api/chat/:friendId — Send a message (REST fallback)
const sendMessage = async (req, res) => {
    try {
        const userId = req.user.id;
        const friendId = req.params.friendId;
        const { text } = req.body;

        if (!text) return res.status(400).json({ message: 'Message text is required' });

        // Check if they are friends
        const user = await User.findById(userId);
        if (!user.friends.includes(friendId)) {
            return res.status(403).json({ message: 'You can only chat with friends' });
        }

        const message = await Message.create({
            sender: userId,
            receiver: friendId,
            text,
        });

        const populatedMessage = await message.populate([
            { path: 'sender', select: 'username avatar' },
            { path: 'receiver', select: 'username avatar' },
        ]);

        // Emit via Socket.io if available
        const io = req.app.get('io');
        if (io) {
            io.to(friendId).emit('newMessage', populatedMessage);
            io.to(userId).emit('newMessage', populatedMessage);
        }

        res.status(201).json(populatedMessage);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// PUT /api/chat/read/:friendId — Mark all messages from a friend as read
const markAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const friendId = req.params.friendId;

        await Message.updateMany(
            { sender: friendId, receiver: userId, read: false },
            { read: true }
        );

        res.json({ message: 'Messages marked as read' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// GET /api/chat — Get list of conversations (latest message per friend)
const getConversationList = async (req, res) => {
    try {
        const userId = new (require('mongoose').Types.ObjectId)(req.user.id);

        const conversations = await Message.aggregate([
            {
                $match: {
                    $or: [{ sender: userId }, { receiver: userId }],
                },
            },
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: {
                        $cond: [
                            { $eq: ['$sender', userId] },
                            '$receiver',
                            '$sender',
                        ],
                    },
                    lastMessage: { $first: '$$ROOT' },
                    unreadCount: {
                        $sum: {
                            $cond: [
                                { $and: [{ $eq: ['$receiver', userId] }, { $eq: ['$read', false] }] },
                                1,
                                0,
                            ],
                        },
                    },
                },
            },
            { $sort: { 'lastMessage.createdAt': -1 } },
        ]);

        // Populate friend details
        await User.populate(conversations, {
            path: '_id',
            select: 'username avatar',
        });

        const result = conversations.map((conv) => ({
            friend: conv._id,
            lastMessage: conv.lastMessage,
            unreadCount: conv.unreadCount,
        }));

        res.json(result);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

module.exports = { getConversation, sendMessage, markAsRead, getConversationList };
