import express from 'express';
import passport from 'passport';
import session from 'express-session';
import dotenv from 'dotenv';
import authRoutes from './src/routes/authRoutes.js';
import adminRoutes from './src/routes/adminRoutes.js';
import pool from './src/config/db.js'
import { PrismaClient } from '@prisma/client';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import surveillanceRoutes from './src/routes/surveillanceRoutes.js';
import swapRoutes from './src/routes/swapRoutes.js'
const prisma = new PrismaClient();
dotenv.config();
const app = express();

//middleware
app.use(express.json());
app.use(express.urlencoded({ extended:true }));
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'keyboard cat',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax'
  }
}));
app.use(passport.initialize());
app.use(passport.session());

// CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Set-Cookie'],
    maxAge: 86400 // 24 hours
}));

// Add request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    console.log('Headers:', req.headers);
    console.log('Cookies:', req.cookies);
    next();
});

//test database connection
// const users = await prisma.user.findMany(); // Commented out potentially blocking code
// console.log(users); // Commented out

app.get('/test-db', async (req , res)=>{
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query('SELECT 1 + 1 AS ssolution');
        connection.release();
        res.json({message : 'Database connection successfully' , result :rows[0].solution});

    } catch (error) {
        console.error('Database connection failed:', error);
        res.status(500).json({error : 'Database connection failed'});
    }
}) 


app.use('/api/auth', authRoutes);  // Adds /api prefix
app.use('/api/admin', adminRoutes);
app.use('/api/surveillance', surveillanceRoutes);
app.use('/api/swap', swapRoutes);
app.use('/uploads/surveillance', express.static('uploads/surveillance'));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
