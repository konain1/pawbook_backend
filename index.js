const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

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

// TODO: Add routes here
// app.use('/api/auth', require('./src/routes/auth.routes'));
// app.use('/api/users', require('./src/routes/user.routes'));
// app.use('/api/posts', require('./src/routes/post.routes'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
