const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Route imports
const authRoute = require('./src/routes/auth.route');
const userRoute = require('./src/routes/user.route');
const postRoute = require('./src/routes/post.route');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));



// Health check route
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Pawbook API is running 🐾' });
});

// Routes
app.use('/api/auth', authRoute);
app.use('/api/users', userRoute);
app.use('/api/posts', postRoute);

const PORT = process.env.PORT || 5200;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
