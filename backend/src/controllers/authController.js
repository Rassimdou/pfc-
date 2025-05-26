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
export const generateTokens = (user) => {
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
          role: 'PROFESSOR',
          department: pendingTeacher.department // Use department from pendingTeacher
        }
      });

      // Delete the pending teacher record since they are now active
      await prisma.pendingTeacher.delete({
        where: { email }
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
    const { email, password, firstName, lastName, phoneNumber, isGoogleSignup } = req.body;

    // Validate input
    if (!isGoogleSignup) {
      if (!password || password.length < 8) {
        return res.status(400).json({ 
          success: false,
          message: 'Password must be at least 8 characters long'
        });
      }
    }

    if (!firstName || !lastName || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'First name, last name, and phone number are required'
      });
    }

    // Validate phone number format (basic validation)
    const phoneRegex = /^\+?[\d\s-]{8,}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format'
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

    // Hash password if provided
    const hashedPassword = password ? await bcrypt.hash(password, SALT_ROUNDS) : null;

    // Create or update user with additional information
    const updatedUser = await prisma.user.upsert({
      where: { email: email.toLowerCase() },
      update: { 
        password: hashedPassword,
        isVerified: true,
        firstName,
        lastName,
        phoneNumber,
        name: `${firstName} ${lastName}`
      },
      create: {
        email: email.toLowerCase(),
        password: hashedPassword,
        isVerified: true,
        firstName,
        lastName,
        phoneNumber,
        name: `${firstName} ${lastName}`,
        role: 'PROFESSOR'
      },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        phoneNumber: true
      }
    });

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: updatedUser.id, 
        email: updatedUser.email, 
        role: updatedUser.role,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({
      success: true,
      accessToken: token,
      user: updatedUser
    });

  } catch (error) {
    console.error('Set password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set password',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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

    // First check if user exists
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        password: true,
        role: true,
        firstName: true,
        lastName: true,
        isVerified: true
      }
    });

    console.log('User found:', user ? 'Yes' : 'No');
    if (user) {
      console.log('User details:', {
        id: user.id,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        hasPassword: !!user.password
      });
    }

    if (!user || !user.password) {
      console.log('User not found or has no password');
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
      console.log('Password validation failed');
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate tokens
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

    // Remove password from user object before sending
    const { password: _, ...userWithoutPassword } = user;

    // Send response with token in body
    res.json({
      success: true,
      accessToken: tokens.accessToken,
      user: userWithoutPassword
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

export const completeGoogleSignup = async (req, res) => {
  try {
    const { email, firstName, lastName, phoneNumber } = req.body;

    // Validate input
    if (!firstName || !lastName || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'First name, last name, and phone number are required'
      });
    }

    // Validate phone number format
    const phoneRegex = /^\+?[\d\s-]{8,}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format'
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

    // Create or update user
    const user = await prisma.user.upsert({
      where: { email: email.toLowerCase() },
      update: {
        firstName,
        lastName,
        phoneNumber,
        name: `${firstName} ${lastName}`,
        isVerified: true
      },
      create: {
        email: email.toLowerCase(),
        firstName,
        lastName,
        phoneNumber,
        name: `${firstName} ${lastName}`,
        role: 'PROFESSOR',
        isVerified: true,
        department: pendingTeacher.department
      },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        phoneNumber: true
      }
    });

    // Delete the pending teacher record since they are now active
    await prisma.pendingTeacher.delete({
      where: { email: email.toLowerCase() }
    });

    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({
      success: true,
      accessToken: token,
      user
    });

  } catch (error) {
    console.error('Google signup completion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete signup',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};