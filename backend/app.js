import express from 'express';
import passport from 'passport';
import session from 'express-session';
import dotenv from 'dotenv';
import authRoutes from './src/routes/authRoutes.js';
import adminRoutes from './src/routes/adminRoutes.js';
import pool from './src/config/db.js'
import { PrismaClient } from '@prisma/client';
import cors from 'cors';
import surveillanceRoutes from './src/routes/surveillanceRoutes.js';

const prisma = new PrismaClient();
dotenv.config();
const app = express();

//middleware
app.use(express.json());
app.use(express.urlencoded({ extended:true }));
app.use(session({secret: 'keyboard cat', resave: false, saveUninitialized: true}));
app.use(passport.initialize());
app.use(passport.session());


// CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
  }));


//test database connection
const users = await prisma.user.findMany();
console.log(users); // Should show your test user

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

app.use('/uploads/surveillance', express.static('uploads/surveillance'));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
