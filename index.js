const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const User = require('./models/User');
const Post = require('./models/Post');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
require('dotenv').config(); // Load environment variables

const app = express();

// Constants
const salt = bcrypt.genSaltSync(10);
const secret = process.env.JWT_SECRET || 'your_default_secret'; // Use environment variable

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// File Upload Setup
const uploadMiddleware = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/; // Allow only image files
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb('Error: File type not allowed!', false);
  }
});

// MongoDB connection
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/myapp'; // Use environment variable
mongoose.connect(mongoURI)
  .then(() => {
    console.log('Successfully connected to MongoDB Atlas');
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });

// Preflight CORS handling
app.options('*', cors());

// Register route
app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    const hashedPassword = bcrypt.hashSync(password, salt);
    const userDoc = await User.create({ username, password: hashedPassword });
    res.json(userDoc);
  } catch (e) {
    res.status(500).json({ error: 'Registration failed', details: e.message });
  }
});

// Login route
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const userDoc = await User.findOne({ username });
    if (!userDoc) return res.status(400).json({ error: 'User not found' });

    const passOk = bcrypt.compareSync(password, userDoc.password);
    if (passOk) {
      jwt.sign({ username, id: userDoc._id }, secret, {}, (err, token) => {
        if (err) return res.status(500).json({ error: 'Token generation failed' });
        res.cookie('token', token, { httpOnly: true }).json({ id: userDoc._id, username });
      });
    } else {
      res.status(400).json({ error: 'Wrong credentials' });
    }
  } catch (e) {
    res.status(500).json({ error: 'Error logging in' });
  }
});

// Profile route
app.get('/profile', (req, res) => {
  const { token } = req.cookies;
  if (!token) return res.status(401).json({ error: 'No token provided' });

  jwt.verify(token, secret, {}, (err, info) => {
    if (err) return res.status(403).json({ error: 'Token invalid' });
    res.json(info);
  });
});

// Logout route
app.post('/logout', (req, res) => {
  res.cookie('token', '', { maxAge: 0, httpOnly: true }).json({ message: 'Logged out' });
});

// Create Post route
app.post('/posts', uploadMiddleware.single('file'), async (req, res) => {
  const { path: tempPath, originalname } = req.file;
  const ext = originalname.split('.').pop();
  const newPath = `${tempPath}.${ext}`;
  fs.renameSync(tempPath, newPath);

  const { token } = req.cookies;
  jwt.verify(token, secret, {}, async (err, info) => {
    if (err) return res.status(403).json({ error: 'Token invalid' });

    const { title, summary, content } = req.body;
    try {
      const postDoc = await Post.create({
        title,
        summary,
        content,
        cover: newPath,
        author: info.id,
      });
      res.json(postDoc);
    } catch (e) {
      res.status(500).json({ error: 'Failed to create post', details: e.message });
    }
  });
});

// Edit Post route
app.put('/posts', uploadMiddleware.single('file'), async (req, res) => {
  let newPath = null;
  
  if (req.file) {
    const { path: tempPath, originalname } = req.file;
    const ext = originalname.split('.').pop();
    newPath = `${tempPath}.${ext}`;
    fs.renameSync(tempPath, newPath);
  }

  const { token } = req.cookies;
  jwt.verify(token, secret, {}, async (err, info) => {
    if (err) return res.status(403).json({ error: 'Token invalid' });

    const { id, title, summary, content } = req.body;
    try {
      const postDoc = await Post.findById(id);
      if (!postDoc) return res.status(404).json({ error: 'Post not found' });

      if (postDoc.author.toString() !== info.id) {
        return res.status(403).json({ error: 'You are not the author' });
      }

      await postDoc.updateOne({
        title,
        summary,
        content,
        cover: newPath ? newPath : postDoc.cover, // Keep old cover if no new file
      });

      res.json(postDoc);
    } catch (e) {
      res.status(500).json({ error: 'Failed to update post', details: e.message });
    }
  });
});

// DELETE /posts/:id endpoint
app.delete('/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const post = await Post.findByIdAndDelete(id);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.status(200).json({ message: 'Post deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting post', details: error.message });
  }
});

// Get All Posts route
app.get('/posts', async (req, res) => {
  try {
    const posts = await Post.find()
      .populate('author', ['username'])
      .sort({ createdAt: -1 })
      .limit(20);
    res.json(posts);
  } catch (e) {
    res.status(500).json({ error: 'Error fetching posts', details: e.message });
  }
});

// Get Single Post route
app.get('/posts/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const postDoc = await Post.findById(id).populate('author', ['username']);
    if (!postDoc) return res.status(404).json({ error: 'Post not found' });
    res.json(postDoc);
  } catch (e) {
    res.status(500).json({ error: 'Error fetching post', details: e.message });
  }
});

// Start Server
app.listen(4000, () => {
  console.log('Server running on http://localhost:4000');
});
