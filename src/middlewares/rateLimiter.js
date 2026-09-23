const rateLimit = require('express-rate-limit');

// General API rate limit — 100 requests per 15 minutes
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { message: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Auth rate limit — 10 attempts per 15 minutes (login/register)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { message: 'Too many auth attempts, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Chat rate limit — 30 messages per minute
const chatLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: { message: 'Too many messages, slow down.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Post creation rate limit — 10 posts per hour
const postLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: { message: 'Too many posts, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Friend request rate limit — 20 requests per hour
const friendLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 20,
    message: { message: 'Too many friend requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = { apiLimiter, authLimiter, chatLimiter, postLimiter, friendLimiter };
