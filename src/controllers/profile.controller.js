const User = require('../models/user.model');
const bcrypt = require('bcryptjs');
const cloudinary = require('../config/cloudinary');

// Helper: upload buffer to Cloudinary
const uploadToCloudinary = (fileBuffer) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder: 'pawbook/avatars' },
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }
        );
        stream.end(fileBuffer);
    });
};

// GET /api/profile — Get logged-in user's profile
const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// PUT /api/profile — Update profile (username, email, bio, avatar, password)
const updateProfile = async (req, res) => {
    try {
        const { username, email, bio, password } = req.body;
        const user = await User.findById(req.user.id);

        if (!user) return res.status(404).json({ message: 'User not found' });

        // Update username
        if (username) user.username = username;

        // Update bio
        if (bio !== undefined) user.bio = bio;

        // Update email (check for duplicates)
        if (email && email !== user.email) {
            const emailExists = await User.findOne({ email });
            if (emailExists) {
                return res.status(400).json({ message: 'Email already in use' });
            }
            user.email = email;
        }

        // Update password
        if (password) {
            if (password.length < 6) {
                return res.status(400).json({ message: 'Password must be at least 6 characters' });
            }
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
        }

        // Update avatar (if file uploaded)
        if (req.file) {
            const result = await uploadToCloudinary(req.file.buffer);
            user.avatar = result.secure_url;
        }

        await user.save();

        // Return user without password
        const updatedUser = user.toObject();
        delete updatedUser.password;

        res.json({ message: 'Profile updated successfully', user: updatedUser });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

module.exports = { getProfile, updateProfile };
