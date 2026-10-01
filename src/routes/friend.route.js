const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/verifyToken');
const friendController = require('../controllers/friend.controller');

// All friend routes require authentication
router.use(verifyToken);

// GET /api/friends — Get all friends of the current user
router.get('/', friendController.getFriends);

// GET /api/friends/requests — Get pending incoming requests
router.get('/requests', friendController.getPendingRequests);

// GET /api/friends/sent — Get sent pending requests
router.get('/sent', friendController.getSentRequests);

// POST /api/friends/request/:userId — Send a friend request
router.post('/request/:userId', friendController.sendFriendRequest);

// PUT /api/friends/accept/:requestId — Accept a request
router.put('/accept/:requestId', friendController.acceptFriendRequest);

// PUT /api/friends/reject/:requestId — Reject a request
router.put('/reject/:requestId', friendController.rejectFriendRequest);

// DELETE /api/friends/:friendId — Remove a friend
router.delete('/:friendId', friendController.removeFriend);

module.exports = router;
