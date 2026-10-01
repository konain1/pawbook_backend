const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/verifyToken');
const upload = require('../middlewares/upload');
const {
    createPost,
    sharePost,
    getPostShares,
    getPostLikes,
    getAllPosts,
    getPostById,
    getPostsByUser,
    likePost,
    addComment,
    replyToComment,
    deletePost,
    updatePost,
} = require('../controllers/post.controller');

// All routes are protected
router.post('/', verifyToken, upload.single('image'), createPost);
router.post('/:id/share', verifyToken, sharePost);
router.get('/:id/shares', verifyToken, getPostShares);
router.get('/:id/likes', verifyToken, getPostLikes);
router.get('/', verifyToken, getAllPosts);
router.get('/:id', verifyToken, getPostById);
router.get('/user/:userId', verifyToken, getPostsByUser);
router.put('/:id/like', verifyToken, likePost);
router.post('/:id/comment', verifyToken, addComment);
router.post('/:id/comment/:commentId/reply', verifyToken, replyToComment);
router.delete('/:id', verifyToken, deletePost);
router.put('/:id', verifyToken, upload.single('image'), updatePost);

module.exports = router;
