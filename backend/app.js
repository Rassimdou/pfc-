import express from 'express';
import passport from 'passport';
import session from 'express-session';
import dotenv from 'dotenv';
import authRoutes from './src/routes/authRoutes.js';
import adminRoutes from './src/routes/adminRoutes.js';
import userRoutes from './src/routes/userRoutes.js';
import pool from './src/config/db.js'
import { PrismaClient } from '@prisma/client';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import surveillanceRoutes from './src/routes/surveillanceRoutes.js';
import swapRoutes from './src/routes/swapRoutes.js'
import notificationRoutes from './src/routes/notificationRoutes.js';

const prisma = new PrismaClient();
dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS configuration
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173', process.env.FRONTEND_URL].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Set-Cookie']
}));

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);
app.use('/api/surveillance', surveillanceRoutes);
app.use('/api/swap', swapRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const PORT = process.env.PORT || 5000;
const HOST = 'localhost'; // Change to localhost

// Add a test route before starting the server
app.get('/test', (req, res) => {
  res.json({ message: 'Server is running', timestamp: new Date().toISOString() });
});

app.listen(PORT, HOST, () => {
  console.log('=================================');
  console.log(`Server is running on:`);
  console.log(`- Local:   http://localhost:${PORT}`);
  console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log(`API URL: ${process.env.API_URL || 'http://localhost:5000'}`);
  console.log('=================================');
});
