const Post = require('../models/post.model');
const cloudinary = require('../config/cloudinary');

// Helper: populate post query consistently
const populatePostQuery = (query) => {
    return query
        .populate('user', '-password')
        .populate({
            path: 'originalPost',
            populate: [
                { path: 'user', select: '-password' },
                { path: 'shares', select: 'username avatar bio email' }
            ]
        })
        .populate('shares', 'username avatar bio email')
        .populate('comments.user', '-password')
        .populate('comments.replies.user', '-password');
};

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

        const populatedPost = await populatePostQuery(Post.findById(post._id));
        res.status(201).json(populatedPost);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// POST /api/posts/:id/share — Share a post to user's feed
const sharePost = async (req, res) => {
    try {
        const { id } = req.params;
        const { caption } = req.body;

        const targetPost = await Post.findById(id);
        if (!targetPost) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // If target post is itself a shared post, link to root original post
        const rootPostId = targetPost.isShared && targetPost.originalPost
            ? targetPost.originalPost
            : targetPost._id;

        // Verify root original post exists
        const rootPost = await Post.findById(rootPostId);
        if (!rootPost) {
            return res.status(404).json({ message: 'Original post was deleted' });
        }

        // Check if user is trying to share their own post (sharing is only for friends/others)
        if (rootPost.user.toString() === req.user.id || targetPost.user.toString() === req.user.id) {
            return res.status(400).json({ message: 'You cannot share your own post. Sharing is only for friends and others!' });
        }

        // Create shared feed post
        const sharedPost = await Post.create({
            user: req.user.id,
            caption: caption || '',
            isShared: true,
            originalPost: rootPost._id,
        });

        // Add user to root original post's shares list
        await rootPost.updateOne({ $addToSet: { shares: req.user.id } });

        const populatedSharedPost = await populatePostQuery(Post.findById(sharedPost._id));
        res.status(201).json(populatedSharedPost);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// GET /api/posts/:id/shares — Get users who shared this post
const getPostShares = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id)
            .populate('shares', 'username avatar bio email createdAt');

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        res.json(post.shares || []);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// GET /api/posts/:id/likes — Get users who liked this post (PRIVATE: only author can view)
const getPostLikes = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id)
            .populate('likes', 'username avatar bio email createdAt');

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // Privacy rule: only author who posted this post can view who liked it
        const postAuthorId = post.user ? (post.user._id || post.user).toString() : null;
        if (postAuthorId !== req.user.id) {
            return res.status(403).json({
                message: 'Private: Only the person who created this post can see who liked it.'
            });
        }

        res.json(post.likes || []);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// GET /api/posts — Get all posts (feed)
const getAllPosts = async (req, res) => {
    try {
        const posts = await populatePostQuery(Post.find()).sort({ createdAt: -1 });
        res.json(posts);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// GET /api/posts/:id — Get a single post
const getPostById = async (req, res) => {
    try {
        const post = await populatePostQuery(Post.findById(req.params.id));

        if (!post) return res.status(404).json({ message: 'Post not found' });
        res.json(post);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// GET /api/posts/user/:userId — Get all posts by a user
const getPostsByUser = async (req, res) => {
    try {
        const posts = await populatePostQuery(Post.find({ user: req.params.userId })).sort({ createdAt: -1 });
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

        const updatedPost = await populatePostQuery(Post.findById(req.params.id));
        res.status(201).json(updatedPost);
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

        const updatedPost = await populatePostQuery(Post.findById(req.params.id));
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

        // If it was a shared post, remove user from root original post's shares array if no other active shares exist
        if (post.isShared && post.originalPost) {
            const otherShares = await Post.countDocuments({
                _id: { $ne: post._id },
                user: req.user.id,
                isShared: true,
                originalPost: post.originalPost,
            });

            if (otherShares === 0) {
                await Post.findByIdAndUpdate(post.originalPost, {
                    $pull: { shares: req.user.id }
                });
            }
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

        // Update image if new file uploaded (only for non-shared posts)
        if (req.file) {
            const result = await uploadToCloudinary(req.file.buffer);
            post.image = result.secure_url;
        }

        await post.save();

        const updatedPost = await populatePostQuery(Post.findById(req.params.id));
        res.json(updatedPost);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

module.exports = {
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
};
