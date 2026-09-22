const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/verifyToken');
const upload = require('../middlewares/upload');
const { getProfile, updateProfile } = require('../controllers/profile.controller');

// GET /api/profile — Get logged-in user's profile
router.get('/', verifyToken, getProfile);

// PUT /api/profile — Update profile (supports form-data with avatar file)
router.put('/', verifyToken, upload.single('avatar'), updateProfile);

module.exports = router;
