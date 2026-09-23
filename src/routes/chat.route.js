const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/verifyToken');
const {
    getConversation,
    sendMessage,
    markAsRead,
    getConversationList,
} = require('../controllers/chat.controller');

// All routes are protected
router.get('/', verifyToken, getConversationList);
router.get('/:friendId', verifyToken, getConversation);
router.post('/:friendId', verifyToken, sendMessage);
router.put('/read/:friendId', verifyToken, markAsRead);

module.exports = router;
