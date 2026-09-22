const FriendRequest = require('../models/friendRequest.model');
const User = require('../models/user.model');

// POST /api/friends/request/:userId — Send a friend request
const sendFriendRequest = async (req, res) => {
    try {
        const senderId = req.user.id;
        const receiverId = req.params.userId;

        if (senderId === receiverId) {
            return res.status(400).json({ message: 'You cannot send a friend request to yourself' });
        }

        // Check if they are already friends
        const sender = await User.findById(senderId);
        if (sender.friends.includes(receiverId)) {
            return res.status(400).json({ message: 'Already friends' });
        }

        // Check if a request already exists (in either direction)
        const existingRequest = await FriendRequest.findOne({
            $or: [
                { sender: senderId, receiver: receiverId, status: 'pending' },
                { sender: receiverId, receiver: senderId, status: 'pending' },
            ],
        });

        if (existingRequest) {
            return res.status(400).json({ message: 'Friend request already pending' });
        }

        const friendRequest = await FriendRequest.create({
            sender: senderId,
            receiver: receiverId,
        });

        res.status(201).json({ message: 'Friend request sent', friendRequest });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// PUT /api/friends/accept/:requestId — Accept a friend request
const acceptFriendRequest = async (req, res) => {
    try {
        const friendRequest = await FriendRequest.findById(req.params.requestId);

        if (!friendRequest) {
            return res.status(404).json({ message: 'Friend request not found' });
        }

        if (friendRequest.receiver.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        if (friendRequest.status !== 'pending') {
            return res.status(400).json({ message: `Request already ${friendRequest.status}` });
        }

        // Update request status
        friendRequest.status = 'accepted';
        await friendRequest.save();

        // Add each other as friends
        await User.findByIdAndUpdate(friendRequest.sender, {
            $addToSet: { friends: friendRequest.receiver },
        });
        await User.findByIdAndUpdate(friendRequest.receiver, {
            $addToSet: { friends: friendRequest.sender },
        });

        res.json({ message: 'Friend request accepted' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// PUT /api/friends/reject/:requestId — Reject a friend request
const rejectFriendRequest = async (req, res) => {
    try {
        const friendRequest = await FriendRequest.findById(req.params.requestId);

        if (!friendRequest) {
            return res.status(404).json({ message: 'Friend request not found' });
        }

        if (friendRequest.receiver.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        if (friendRequest.status !== 'pending') {
            return res.status(400).json({ message: `Request already ${friendRequest.status}` });
        }

        friendRequest.status = 'rejected';
        await friendRequest.save();

        res.json({ message: 'Friend request rejected' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// DELETE /api/friends/remove/:userId — Remove a friend
const removeFriend = async (req, res) => {
    try {
        const userId = req.user.id;
        const friendId = req.params.userId;

        await User.findByIdAndUpdate(userId, { $pull: { friends: friendId } });
        await User.findByIdAndUpdate(friendId, { $pull: { friends: userId } });

        // Also delete the friend request record
        await FriendRequest.findOneAndDelete({
            $or: [
                { sender: userId, receiver: friendId, status: 'accepted' },
                { sender: friendId, receiver: userId, status: 'accepted' },
            ],
        });

        res.json({ message: 'Friend removed' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// GET /api/friends/requests — Get all pending friend requests received
const getPendingRequests = async (req, res) => {
    try {
        const requests = await FriendRequest.find({
            receiver: req.user.id,
            status: 'pending',
        }).populate('sender', '-password');

        res.json(requests);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// GET /api/friends/sent — Get all sent friend requests
const getSentRequests = async (req, res) => {
    try {
        const requests = await FriendRequest.find({
            sender: req.user.id,
            status: 'pending',
        }).populate('receiver', '-password');

        res.json(requests);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// GET /api/friends — Get all friends
const getFriends = async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .populate('friends', '-password');

        res.json(user.friends);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

module.exports = {
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    getPendingRequests,
    getSentRequests,
    getFriends,
};
