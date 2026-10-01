const express = require('express');
const router = express.Router();
const { register, login, forgotPassword, verifyResetOtp, resetPassword } = require('../controllers/auth.controller');

// POST /api/auth/register
router.post('/register', register);

// POST /api/auth/login
router.post('/login', login);

// POST /api/auth/forgot-password
router.post('/forgot-password', forgotPassword);

// POST /api/auth/verify-otp
router.post('/verify-otp', verifyResetOtp);

// POST /api/auth/reset-password
router.post('/reset-password', resetPassword);

module.exports = router;
