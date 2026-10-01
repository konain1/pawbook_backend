const User = require('../models/user.model');
const FriendRequest = require('../models/friendRequest.model');

/**
 * GET /api/friends
 * Get all confirmed friends of the logged-in user
 */
exports.getFriends = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    // 1. Fetch user and populated friends array
    const user = await User.findById(currentUserId).populate(
      'friends',
      '_id username email avatar bio createdAt'
    );

    const friendsMap = new Map();

    if (user && Array.isArray(user.friends)) {
      for (const f of user.friends) {
        if (f && f._id) {
          friendsMap.set(f._id.toString(), f);
        }
      }
    }

    // 2. Also check accepted FriendRequests to guarantee all friends show up
    const acceptedRequests = await FriendRequest.find({
      $or: [{ sender: currentUserId }, { receiver: currentUserId }],
      status: 'accepted',
    })
      .populate('sender', '_id username email avatar bio createdAt')
      .populate('receiver', '_id username email avatar bio createdAt');

    let needsSync = false;
    const friendIdsToSync = [];

    for (const reqDoc of acceptedRequests) {
      const sender = reqDoc.sender;
      const receiver = reqDoc.receiver;

      if (!sender || !receiver) continue;

      const otherUser =
        sender._id.toString() === currentUserId.toString() ? receiver : sender;

      if (otherUser && otherUser._id) {
        const otherIdStr = otherUser._id.toString();
        if (!friendsMap.has(otherIdStr)) {
          friendsMap.set(otherIdStr, otherUser);
          friendIdsToSync.push(otherUser._id);
          needsSync = true;
        }
      }
    }

    // 3. Also check mutual follows (if user A follows B, and B follows A)
    if (user && Array.isArray(user.following) && user.following.length > 0) {
      const mutualUsers = await User.find({
        _id: { $in: user.following },
        following: currentUserId,
      }).select('_id username email avatar bio createdAt');

      for (const m of mutualUsers) {
        if (m && m._id && !friendsMap.has(m._id.toString())) {
          friendsMap.set(m._id.toString(), m);
          friendIdsToSync.push(m._id);
          needsSync = true;
        }
      }
    }

    // Proactively sync friends into User document if missing
    if (needsSync && friendIdsToSync.length > 0) {
      await User.findByIdAndUpdate(currentUserId, {
        $addToSet: { friends: { $each: friendIdsToSync } },
      }).catch(() => {});
    }

    const friendsList = Array.from(friendsMap.values());
    res.json(friendsList);
  } catch (err) {
    console.error('Error in getFriends:', err);
    res.status(500).json({ message: 'Server error fetching friends', error: err.message });
  }
};

/**
 * GET /api/friends/requests
 * Get all pending friend requests received by the logged-in user
 */
exports.getPendingRequests = async (req, res) => {
  try {
    const requests = await FriendRequest.find({
      receiver: req.user.id,
      status: 'pending',
    })
      .populate('sender', '_id username email avatar bio createdAt')
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (err) {
    console.error('Error in getPendingRequests:', err);
    res.status(500).json({ message: 'Server error fetching requests', error: err.message });
  }
};

/**
 * GET /api/friends/sent
 * Get all friend requests sent by the logged-in user
 */
exports.getSentRequests = async (req, res) => {
  try {
    const requests = await FriendRequest.find({
      sender: req.user.id,
      status: 'pending',
    })
      .populate('receiver', '_id username email avatar bio createdAt')
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (err) {
    console.error('Error in getSentRequests:', err);
    res.status(500).json({ message: 'Server error fetching sent requests', error: err.message });
  }
};

/**
 * POST /api/friends/request/:userId
 * Send a friend request to another user
 */
exports.sendFriendRequest = async (req, res) => {
  try {
    const senderId = req.user.id;
    const receiverId = req.params.userId;

    if (senderId === receiverId) {
      return res.status(400).json({ message: 'You cannot send a friend request to yourself' });
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: 'User not found' });
    }

    const senderUser = await User.findById(senderId);

    // Check if already friends
    if (senderUser.friends && senderUser.friends.some((f) => f.toString() === receiverId)) {
      return res.status(400).json({ message: 'You are already friends with this user' });
    }

    // Check existing request between these two users
    let existingRequest = await FriendRequest.findOne({
      $or: [
        { sender: senderId, receiver: receiverId },
        { sender: receiverId, receiver: senderId },
      ],
    });

    if (existingRequest) {
      if (existingRequest.status === 'accepted') {
        // Ensure friends array is in sync
        await User.findByIdAndUpdate(senderId, { $addToSet: { friends: receiverId } });
        await User.findByIdAndUpdate(receiverId, { $addToSet: { friends: senderId } });
        return res.status(400).json({ message: 'You are already friends with this user' });
      }

      if (existingRequest.status === 'pending') {
        if (existingRequest.sender.toString() === senderId) {
          return res.status(400).json({ message: 'Friend request already sent' });
        } else {
          // The other person already sent a request -> Auto accept!
          existingRequest.status = 'accepted';
          await existingRequest.save();

          await User.findByIdAndUpdate(senderId, { $addToSet: { friends: receiverId } });
          await User.findByIdAndUpdate(receiverId, { $addToSet: { friends: senderId } });

          return res.json({
            message: 'You both added each other and are now friends!',
            autoAccepted: true,
          });
        }
      }

      // If previously rejected, re-open as pending
      if (existingRequest.status === 'rejected') {
        existingRequest.sender = senderId;
        existingRequest.receiver = receiverId;
        existingRequest.status = 'pending';
        await existingRequest.save();
        return res.json({ message: 'Friend request sent successfully', request: existingRequest });
      }
    }

    // Create new request
    const newRequest = await FriendRequest.create({
      sender: senderId,
      receiver: receiverId,
      status: 'pending',
    });

    res.status(201).json({ message: 'Friend request sent successfully', request: newRequest });
  } catch (err) {
    console.error('Error in sendFriendRequest:', err);
    res.status(500).json({ message: 'Server error sending request', error: err.message });
  }
};

/**
 * PUT /api/friends/accept/:requestId
 * Accept an incoming friend request
 */
exports.acceptFriendRequest = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { requestId } = req.params;

    const request = await FriendRequest.findById(requestId).populate(
      'sender',
      '_id username email avatar bio'
    );

    if (!request) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    if (request.receiver.toString() !== currentUserId.toString()) {
      return res.status(403).json({ message: 'Not authorized to accept this request' });
    }

    request.status = 'accepted';
    await request.save();

    const senderId = request.sender._id || request.sender;

    // Add each user to the other's friends array
    await User.findByIdAndUpdate(currentUserId, { $addToSet: { friends: senderId } });
    await User.findByIdAndUpdate(senderId, { $addToSet: { friends: currentUserId } });

    res.json({
      message: 'Friend request accepted',
      friend: request.sender,
    });
  } catch (err) {
    console.error('Error in acceptFriendRequest:', err);
    res.status(500).json({ message: 'Server error accepting request', error: err.message });
  }
};

/**
 * PUT /api/friends/reject/:requestId
 * Reject an incoming friend request
 */
exports.rejectFriendRequest = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { requestId } = req.params;

    const request = await FriendRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    if (request.receiver.toString() !== currentUserId.toString()) {
      return res.status(403).json({ message: 'Not authorized to reject this request' });
    }

    request.status = 'rejected';
    await request.save();

    res.json({ message: 'Friend request rejected' });
  } catch (err) {
    console.error('Error in rejectFriendRequest:', err);
    res.status(500).json({ message: 'Server error rejecting request', error: err.message });
  }
};

/**
 * DELETE /api/friends/:friendId
 * Remove a friend
 */
exports.removeFriend = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { friendId } = req.params;

    await User.findByIdAndUpdate(currentUserId, { $pull: { friends: friendId } });
    await User.findByIdAndUpdate(friendId, { $pull: { friends: currentUserId } });

    await FriendRequest.deleteMany({
      $or: [
        { sender: currentUserId, receiver: friendId },
        { sender: friendId, receiver: currentUserId },
      ],
    });

    res.json({ message: 'Friend removed successfully' });
  } catch (err) {
    console.error('Error in removeFriend:', err);
    res.status(500).json({ message: 'Server error removing friend', error: err.message });
  }
};
