const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const setupSocket = require('./src/socket/socket');

// Route imports
const authRoute = require('./src/routes/auth.route');
const userRoute = require('./src/routes/user.route');
const postRoute = require('./src/routes/post.route');
const profileRoute = require('./src/routes/profile.route');
const friendRoute = require('./src/routes/friend.route');
const chatRoute = require('./src/routes/chat.route');

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST'],
  },
});

// Initialize socket handlers
setupSocket(io);

// Make io accessible in routes
app.set('io', io);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const { apiLimiter, authLimiter, chatLimiter, postLimiter, friendLimiter } = require('./src/middlewares/rateLimiter');
app.use('/api', apiLimiter);

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// Health check route
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Pawbook API is running 🐾' });
});

// Routes with specific rate limits
app.use('/api/auth', authLimiter, authRoute);
app.use('/api/users', userRoute);
app.use('/api/posts', postRoute);
app.use('/api/profile', profileRoute);
app.use('/api/friends', friendRoute);
app.use('/api/chat', chatLimiter, chatRoute);

const PORT = process.env.PORT || 5200;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
