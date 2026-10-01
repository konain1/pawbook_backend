const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/verifyToken');
const chatController = require('../controllers/chat.controller');

// All chat routes require authentication
router.use(verifyToken);

// GET /api/chat — Get conversation list
router.get('/', chatController.getConversationList);

// GET /api/chat/:friendId — Get message history with a friend
router.get('/:friendId', chatController.getConversation);

// POST /api/chat/:friendId — Send a message
router.post('/:friendId', chatController.sendMessage);

// PUT /api/chat/read/:friendId — Mark messages as read
router.put('/read/:friendId', chatController.markMessagesAsRead);

module.exports = router;
