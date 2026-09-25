const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/verifyToken');
const upload = require('../middlewares/upload');
const {
    createPost,
    getAllPosts,
    getPostById,
    getPostsByUser,
    likePost,
    addComment,
    replyToComment,
    deletePost,
    updatePost,
} = require('../controllers/post.controller');

const { postLimiter } = require('../middlewares/rateLimiter');

// All routes are protected
router.post('/', verifyToken, postLimiter, upload.single('image'), createPost);
router.get('/', verifyToken, getAllPosts);
router.get('/:id', verifyToken, getPostById);
router.get('/user/:userId', verifyToken, getPostsByUser);
router.put('/:id/like', verifyToken, likePost);
router.post('/:id/comment', verifyToken, addComment);
router.post('/:id/comment/:commentId/reply', verifyToken, replyToComment);
router.delete('/:id', verifyToken, deletePost);
router.put('/:id', verifyToken, upload.single('image'), updatePost);

module.exports = router;
