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
    deletePost,
} = require('../controllers/post.controller');

// All routes are protected
router.post('/', verifyToken, upload.single('image'), createPost);
router.get('/', verifyToken, getAllPosts);
router.get('/:id', verifyToken, getPostById);
router.get('/user/:userId', verifyToken, getPostsByUser);
router.put('/:id/like', verifyToken, likePost);
router.post('/:id/comment', verifyToken, addComment);
router.delete('/:id', verifyToken, deletePost);

module.exports = router;
