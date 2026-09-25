const rateLimit = require('express-rate-limit');

// General API rate limit — 500 requests per 15 minutes
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    message: { message: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Auth rate limit — 20 attempts per 15 minutes (login/register)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { message: 'Too many auth attempts, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Chat rate limit — 60 messages per minute
const chatLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    message: { message: 'Too many messages, slow down.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Post creation rate limit — 100 posts per 1 hour
const postLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 100,
    message: { message: 'Too many posts created. Limit is 100 posts per hour, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Friend request rate limit — 50 requests per hour
const friendLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 50,
    message: { message: 'Too many friend requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = { apiLimiter, authLimiter, chatLimiter, postLimiter, friendLimiter };
