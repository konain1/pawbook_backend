const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/verifyToken');
const {
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    getPendingRequests,
    getSentRequests,
    getFriends,
} = require('../controllers/friend.controller');

// All routes are protected
router.get('/', verifyToken, getFriends);
router.get('/requests', verifyToken, getPendingRequests);
router.get('/sent', verifyToken, getSentRequests);
router.post('/request/:userId', verifyToken, sendFriendRequest);
router.put('/accept/:requestId', verifyToken, acceptFriendRequest);
router.put('/reject/:requestId', verifyToken, rejectFriendRequest);
router.delete('/remove/:userId', verifyToken, removeFriend);

module.exports = router;
