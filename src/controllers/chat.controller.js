const Message = require('../models/message.model');
const User = require('../models/user.model');
const FriendRequest = require('../models/friendRequest.model');

/**
 * GET /api/chat
 * Get conversation list with friends, latest message, and unread counts
 */
exports.getConversationList = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    // 1. Get all friends of the current user
    const currentUser = await User.findById(currentUserId).populate(
      'friends',
      '_id username email avatar bio'
    );

    const friendsMap = new Map();

    if (currentUser && Array.isArray(currentUser.friends)) {
      for (const f of currentUser.friends) {
        if (f && f._id) {
          friendsMap.set(f._id.toString(), f);
        }
      }
    }

    // Also check accepted friend requests
    const acceptedRequests = await FriendRequest.find({
      $or: [{ sender: currentUserId }, { receiver: currentUserId }],
      status: 'accepted',
    })
      .populate('sender', '_id username email avatar bio')
      .populate('receiver', '_id username email avatar bio');

    for (const reqDoc of acceptedRequests) {
      const sender = reqDoc.sender;
      const receiver = reqDoc.receiver;
      if (!sender || !receiver) continue;

      const otherUser =
        sender._id.toString() === currentUserId.toString() ? receiver : sender;

      if (otherUser && otherUser._id) {
        friendsMap.set(otherUser._id.toString(), otherUser);
      }
    }

    // Also check users with whom we have messages even if not explicitly in friendsMap
    const recentMessages = await Message.find({
      $or: [{ sender: currentUserId }, { receiver: currentUserId }],
    })
      .sort({ createdAt: -1 })
      .limit(100);

    for (const msg of recentMessages) {
      const otherId =
        msg.sender.toString() === currentUserId.toString()
          ? msg.receiver.toString()
          : msg.sender.toString();

      if (!friendsMap.has(otherId)) {
        const otherUserDoc = await User.findById(otherId).select('_id username email avatar bio');
        if (otherUserDoc) {
          friendsMap.set(otherId, otherUserDoc);
        }
      }
    }

    const conversationList = [];

    // 2. For each user, get latest message and unread count
    for (const friend of friendsMap.values()) {
      const friendId = friend._id;

      const [lastMsg, unreadCount] = await Promise.all([
        Message.findOne({
          $or: [
            { sender: currentUserId, receiver: friendId },
            { sender: friendId, receiver: currentUserId },
          ],
        }).sort({ createdAt: -1 }),
        Message.countDocuments({
          sender: friendId,
          receiver: currentUserId,
          read: false,
        }),
      ]);

      conversationList.push({
        friend,
        lastMessage: lastMsg
          ? {
              text: lastMsg.text,
              createdAt: lastMsg.createdAt,
              sender: lastMsg.sender,
            }
          : null,
        unreadCount,
        lastActive: lastMsg ? new Date(lastMsg.createdAt).getTime() : 0,
      });
    }

    // Sort conversations: newest message first
    conversationList.sort((a, b) => b.lastActive - a.lastActive);

    res.json(conversationList);
  } catch (err) {
    console.error('Error in getConversationList:', err);
    res.status(500).json({ message: 'Server error fetching conversations', error: err.message });
  }
};

/**
 * GET /api/chat/:friendId
 * Get full message history between current user and friendId
 */
exports.getConversation = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { friendId } = req.params;

    const messages = await Message.find({
      $or: [
        { sender: currentUserId, receiver: friendId },
        { sender: friendId, receiver: currentUserId },
      ],
    })
      .sort({ createdAt: 1 })
      .limit(200);

    res.json(messages);
  } catch (err) {
    console.error('Error in getConversation:', err);
    res.status(500).json({ message: 'Server error fetching conversation', error: err.message });
  }
};

/**
 * POST /api/chat/:friendId
 * Send a message to friendId
 */
exports.sendMessage = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { friendId } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Message text cannot be empty' });
    }

    const message = await Message.create({
      sender: currentUserId,
      receiver: friendId,
      text: text.trim(),
      read: false,
    });

    res.status(201).json(message);
  } catch (err) {
    console.error('Error in sendMessage:', err);
    res.status(500).json({ message: 'Server error sending message', error: err.message });
  }
};

/**
 * PUT /api/chat/read/:friendId
 * Mark messages from friendId as read
 */
exports.markMessagesAsRead = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { friendId } = req.params;

    await Message.updateMany(
      {
        sender: friendId,
        receiver: currentUserId,
        read: false,
      },
      { read: true }
    );

    res.json({ message: 'Messages marked as read' });
  } catch (err) {
    console.error('Error in markMessagesAsRead:', err);
    res.status(500).json({ message: 'Server error marking messages as read', error: err.message });
  }
};
