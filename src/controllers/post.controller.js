const Post = require('../models/post.model');
const cloudinary = require('../config/cloudinary');

// Helper: upload buffer to Cloudinary
const uploadToCloudinary = (fileBuffer) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder: 'pawbook/posts' },
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }
        );
        stream.end(fileBuffer);
    });
};

// POST /api/posts — Create a new post
const createPost = async (req, res) => {
    try {
        const { caption } = req.body;

        if (!req.file) {
            return res.status(400).json({ message: 'Image is required' });
        }

        // Upload image to Cloudinary
        const result = await uploadToCloudinary(req.file.buffer);

        const post = await Post.create({
            user: req.user.id,
            image: result.secure_url,
            caption,
        });

        const populatedPost = await post.populate('user', '-password');
        res.status(201).json(populatedPost);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// GET /api/posts — Get all posts (feed)
const getAllPosts = async (req, res) => {
    try {
        const posts = await Post.find()
            .populate('user', '-password')
            .populate('comments.user', '-password')
            .populate('comments.replies.user', '-password')
            .sort({ createdAt: -1 });

        res.json(posts);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// GET /api/posts/:id — Get a single post
const getPostById = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id)
            .populate('user', '-password')
            .populate('comments.user', '-password')
            .populate('comments.replies.user', '-password');

        if (!post) return res.status(404).json({ message: 'Post not found' });
        res.json(post);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// GET /api/posts/user/:userId — Get all posts by a user
const getPostsByUser = async (req, res) => {
    try {
        const posts = await Post.find({ user: req.params.userId })
            .populate('user', '-password')
            .sort({ createdAt: -1 });

        res.json(posts);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// PUT /api/posts/:id/like — Like / unlike a post
const likePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        const alreadyLiked = post.likes.includes(req.user.id);

        if (alreadyLiked) {
            await post.updateOne({ $pull: { likes: req.user.id } });
            res.json({ message: 'Post unliked' });
        } else {
            await post.updateOne({ $push: { likes: req.user.id } });
            res.json({ message: 'Post liked' });
        }
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// POST /api/posts/:id/comment — Add a comment
const addComment = async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) return res.status(400).json({ message: 'Comment text is required' });

        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        post.comments.push({
            user: req.user.id,
            text,
            createdAt: new Date(),
        });

        await post.save();

        const updatedPost = await Post.findById(req.params.id)
            .populate('user', '-password')
            .populate('comments.user', '-password')
            .populate('comments.replies.user', '-password');

        res.status(201).json(updatedPost);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// DELETE /api/posts/:id — Delete a post
const deletePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        if (post.user.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to delete this post' });
        }

        await post.deleteOne();
        res.json({ message: 'Post deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};
// PUT /api/posts/:id — Update a post (caption and/or image)
const updatePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        if (post.user.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to update this post' });
        }

        const { caption } = req.body;

        // Update caption
        if (caption !== undefined) post.caption = caption;

        // Update image if new file uploaded
        if (req.file) {
            const result = await uploadToCloudinary(req.file.buffer);
            post.image = result.secure_url;
        }

        await post.save();

        const updatedPost = await Post.findById(req.params.id)
            .populate('user', '-password')
            .populate('comments.user', '-password');

        res.json(updatedPost);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// POST /api/posts/:id/comment/:commentId/reply — Reply to a comment
const replyToComment = async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) return res.status(400).json({ message: 'Reply text is required' });

        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        const comment = post.comments.id(req.params.commentId);
        if (!comment) return res.status(404).json({ message: 'Comment not found' });

        comment.replies.push({
            user: req.user.id,
            text,
            createdAt: new Date(),
        });

        await post.save();

        const updatedPost = await Post.findById(req.params.id)
            .populate('user', '-password')
            .populate('comments.user', '-password')
            .populate('comments.replies.user', '-password');

        res.status(201).json(updatedPost);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

module.exports = { createPost, getAllPosts, getPostById, getPostsByUser, likePost, addComment, replyToComment, deletePost, updatePost };
