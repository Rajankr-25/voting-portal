require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');

const authRoutes = require('./routes/auth');
const voterRoutes = require('./routes/voter');
const adminRoutes = require('./routes/admin');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('❌ MONGO_URI is not defined in .env file');
  process.exit(1);
}

// Connect to MongoDB
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session
app.use(session({
  secret: 'voting-portal-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: MONGO_URI }),
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // 24 hours
}));

// Routes
app.use('/auth', authRoutes);
app.use('/voter', voterRoutes);
app.use('/admin', adminRoutes);
app.use('/api', apiRoutes);

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🗳️  Voting Portal running on http://localhost:${PORT}`);
});
