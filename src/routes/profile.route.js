const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/verifyToken');
const upload = require('../middlewares/upload');
const { getProfile, updateProfile } = require('../controllers/profile.controller');

// GET /api/profile — get logged-in user's profile
router.get('/', verifyToken, getProfile);

// PUT /api/profile — uppdate profile 
router.put('/', verifyToken, upload.single('avatar'), updateProfile);

module.exports = router;
