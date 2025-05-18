import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prismaClient.js';

// Security constants
const SALT_ROUNDS = 12;
const TOKEN_EXPIRATION = '1h';
const REFRESH_TOKEN_EXPIRATION = '7d';


// authController.js - checkEmailAuthorization
export const checkEmailAuthorization = async (req, res) => {
  const { email } = req.body;
  
  try {
    if (!email) {
      console.log('No email provided in request');
      return res.status(400).json({ valid: false, message: 'Email is required' });
    }

    const normalizedEmail = email.toLowerCase();
    console.log('Checking email:', normalizedEmail);

    const pendingTeacher = await prisma.pendingTeacher.findUnique({
      where: { email: normalizedEmail }
    });
    console.log('Pending teacher result:', pendingTeacher);

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });
    console.log('Existing user result:', existingUser);

    res.json({
      valid: !!pendingTeacher && !existingUser,
      message: pendingTeacher ? 'Email authorized' : 'Not authorized'
    });

  } catch (error) {
    console.error('Full error details:', error);
    res.status(500).json({
      valid: false,
      message: 'Database query failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
// Token generation utility
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: TOKEN_EXPIRATION }
  );

  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRATION }
  );

  return { accessToken, refreshToken };
};

export const handleGoogleAuth = async (profile) => {
  try {
    const email = profile.emails[0].value.toLowerCase();
    
    // Check if email is authorized
    const pendingTeacher = await prisma.pendingTeacher.findUnique({
      where: { email }
    });

    if (!pendingTeacher) {
      throw new Error('Email not authorized');
    }

    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      // Create new user from Google profile
      user = await prisma.user.create({
        data: {
          email,
          firstName: profile.name.givenName,
          lastName: profile.name.familyName,
          isVerified: true,
          role: 'TEACHER',
          department: pendingTeacher.department // Use department from pendingTeacher
        }
      });
    }

    return user;
  } catch (error) {
    console.error('Google auth error:', error);
    throw error;
  }
};

export const setPassword = async (req, res) => {
  try {
    const { email, password, firstName, lastName, department } = req.body;

    // Validate input
    if (!password || password.length < 8) {
      return res.status(400).json({ 
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }

    if (!firstName || !lastName || !department) {
      return res.status(400).json({
        success: false,
        message: 'First name, last name, and department are required'
      });
    }

    // Check if email is authorized
    const pendingTeacher = await prisma.pendingTeacher.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!pendingTeacher) {
      return res.status(403).json({
        success: false,
        message: 'Email not authorized'
      });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Create or update user with additional information
    const updatedUser = await prisma.user.upsert({
      where: { email },
      update: { 
        password: hashedPassword,
        isVerified: true,
        firstName,
        lastName,
        department
      },
      create: {
        email,
        password: hashedPassword,
        isVerified: true,
        firstName,
        lastName,
        department,
        role: 'TEACHER'
      },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        department: true
      }
    });

    const tokens = generateTokens(updatedUser);
    
    // Store refresh token in database
    await prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: updatedUser.id
      }
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      success: true,
      accessToken: tokens.accessToken,
      user: updatedUser
    });

  } catch (error) {
    console.error('Password set error:', error);
    
    const response = {
      success: false,
      message: 'Failed to set password'
    };

    if (error.code === 'P2025') {
      response.message = 'User not found';
    }

    res.status(500).json(response);
  }
};

export const loginWithPassword = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt for email:', email);

    // Validate input
    if (!email || !password) {
      console.log('Missing email or password');
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        password: true,
        role: true,
        name: true
      }
    });

    console.log('User found:', user ? 'Yes' : 'No');

    if (!user || !user.password) {
      // Simulate password hash comparison time to prevent timing attacks
      await bcrypt.hash(password, SALT_ROUNDS);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const isValid = await bcrypt.compare(password, user.password);
    console.log('Password valid:', isValid);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const tokens = generateTokens(user);
    console.log('Tokens generated successfully');
    
    // Store refresh token in database
    await prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      }
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      success: true,
      accessToken: tokens.accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error details:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};