import express from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs'; // Import bcrypt for password comparison and hashing
import '../config/passport.js'; // Make sure this path is correct
import { setPassword, loginWithPassword, checkEmailAuthorization, handleGoogleAuth, completeGoogleSignup, generateTokens } from '../controllers/authController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import prisma from '../lib/prismaClient.js';

const router = express.Router();

// Email verification
router.post('/check-email', checkEmailAuthorization);

// Token verification endpoint
router.get('/verify', authenticate, async (req, res) => {
  try {
    // If we get here, the token is valid (authenticate middleware passed)
    res.json({
      success: true,
      user: req.user
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
});

// Traditional password authentication
router.post('/set-password', setPassword);
router.post('/login', loginWithPassword);

// Google OAuth flow
router.get(
  '/google',
  (req, res, next) => {
    console.log('Initiating Google OAuth...');
    passport.authenticate('google', { 
      scope: ['profile', 'email'],
      prompt: 'select_account',
      accessType: 'offline',
      failureRedirect: `${process.env.FRONTEND_URL}/login?error=${encodeURIComponent('Authentication failed')}`
    })(req, res, next);
  }
);

router.get(
  '/google/callback',
  (req, res, next) => {
    console.log('Received Google callback...');
    passport.authenticate('google', { 
      session: false,
      failureRedirect: `${process.env.FRONTEND_URL}/login?error=${encodeURIComponent('Authentication failed')}`
    }, async (err, user, info) => {
      try {
        if (err) {
          console.error('Google auth error:', err);
          return res.redirect(`${process.env.FRONTEND_URL}/login?error=${encodeURIComponent('Authentication failed')}`);
        }
        
        if (!user) {
          console.error('No user returned from Google auth:', info);
          return res.redirect(`${process.env.FRONTEND_URL}/login?error=${encodeURIComponent(info?.message || 'Authentication failed')}`);
        }

        // If user needs to complete registration (no phone number), redirect to signup
        if (!user.phoneNumber) {
          return res.redirect(`${process.env.FRONTEND_URL}/signup?token=${user.accessToken}&email=${encodeURIComponent(user.email)}`);
        }

        // Otherwise redirect to dashboard with tokens
        const redirectUrl = new URL(`${process.env.FRONTEND_URL}/user/page`);
        redirectUrl.searchParams.set('token', user.accessToken);
        redirectUrl.searchParams.set('user', JSON.stringify(user));
        return res.redirect(redirectUrl.toString());
      } catch (error) {
        console.error('Error in Google callback:', error);
        res.redirect(`${process.env.FRONTEND_URL}/login?error=${encodeURIComponent('An unexpected error occurred')}`);
      }
    })(req, res, next);
  }
);

// Token refresh endpoint
router.post('/refresh-token', async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  
  if (!refreshToken) {
    return res.status(401).json({ 
      success: false,
      message: 'No refresh token provided' 
    });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true
      }
    });

    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    const newAccessToken = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Set the new access token in a secure HTTP-only cookie
    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600000 // 1 hour
    });

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({ 
      success: false,
      message: 'Invalid refresh token' 
    });
  }
});

// Complete Google signup
router.post('/complete-google-signup', completeGoogleSignup);

// GET /api/user/profile - Fetch authenticated user's profile
router.get('/user/profile', authenticate, async (req, res) => {
  try {
    // The authenticate middleware adds user information to req.user
    const userId = req.user.id;

    const userProfile = await prisma.user.findUnique({
      where: { id: userId },
      select: { // Select the fields you want to expose
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        phoneNumber: true,
        // Add any other profile fields you want to retrieve
      },
    });

    if (!userProfile) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found',
      });
    }

    res.json({
      success: true,
      user: userProfile,
    });

  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile',
    });
  }
});

// POST /api/auth/change-password - Change authenticated user's password
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required.',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      // This case should ideally not be reached if authenticate middleware works correctly,
      // but it's good practice to handle it.
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    // Compare provided current password with the hashed password in the database
    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Incorrect current password.',
      });
    }

    // Hash the new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password in the database
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedNewPassword,
      },
    });

    res.json({
      success: true,
      message: 'Password changed successfully.',
    });

  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password.',
    });
  }
});

export default router;
