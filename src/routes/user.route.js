const express = require('express');
const router = express.Router();
const User = require('../models/user.model');
const verifyToken = require('../middlewares/verifyToken');

// GET /api/users/profile/:id — Get user profile
router.get('/profile/:id', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// GET /api/users/me — Get logged-in user's profile
router.get('/me', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// PUT /api/users/update — Update profile (bio, avatar, username)
router.put('/update', verifyToken, async (req, res) => {
    try {
        const { username, bio, avatar } = req.body;
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { username, bio, avatar },
            { new: true }
        ).select('-password');
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// PUT /api/users/follow/:id — Follow a user
router.put('/follow/:id', verifyToken, async (req, res) => {
    try {
        if (req.user.id === req.params.id) {
            return res.status(400).json({ message: 'You cannot follow yourself' });
        }

        const userToFollow = await User.findById(req.params.id);
        const currentUser = await User.findById(req.user.id);

        if (!userToFollow) return res.status(404).json({ message: 'User not found' });

        if (currentUser.following.includes(req.params.id)) {
            return res.status(400).json({ message: 'Already following this user' });
        }

        await currentUser.updateOne({ $push: { following: req.params.id } });
        await userToFollow.updateOne({ $push: { followers: req.user.id } });

        // If mutual follow, also add to friends
        if (userToFollow.following && userToFollow.following.some(id => id.toString() === req.user.id)) {
            await currentUser.updateOne({ $addToSet: { friends: req.params.id } });
            await userToFollow.updateOne({ $addToSet: { friends: req.user.id } });
        }

        res.json({ message: 'Followed successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// PUT /api/users/unfollow/:id — Unfollow a user
router.put('/unfollow/:id', verifyToken, async (req, res) => {
    try {
        if (req.user.id === req.params.id) {
            return res.status(400).json({ message: 'You cannot unfollow yourself' });
        }

        const userToUnfollow = await User.findById(req.params.id);
        const currentUser = await User.findById(req.user.id);

        if (!userToUnfollow) return res.status(404).json({ message: 'User not found' });

        if (!currentUser.following.includes(req.params.id)) {
            return res.status(400).json({ message: 'You are not following this user' });
        }

        await currentUser.updateOne({ $pull: { following: req.params.id } });
        await userToUnfollow.updateOne({ $pull: { followers: req.user.id } });

        res.json({ message: 'Unfollowed successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// GET /api/users/search?q=keyword — Search users by username (or get all users if query is empty)
router.get('/search', verifyToken, async (req, res) => {
    try {
        const { q } = req.query;
        let queryObj = { _id: { $ne: req.user.id } };
        if (q && q.trim()) {
            queryObj.username = { $regex: q.trim(), $options: 'i' };
        }

        const users = await User.find(queryObj)
            .select('-password')
            .sort({ createdAt: -1 })
            .limit(100);

        res.json(users);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;
