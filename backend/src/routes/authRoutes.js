import express from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import '../config/passport.js'; // Make sure this path is correct
import { setPassword, loginWithPassword, checkEmailAuthorization, handleGoogleAuth, completeGoogleSignup } from '../controllers/authController.js';
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
      accessType: 'offline'
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

        if (user.token) {
          console.log('Authentication successful, redirecting with token');
          // Store the token in a secure HTTP-only cookie
          res.cookie('accessToken', user.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 3600000 // 1 hour
          });
          
          res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
        } else {
          console.error('No token in user object');
          res.redirect(`${process.env.FRONTEND_URL}/login?error=${encodeURIComponent('Authentication failed')}`);
        }
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

export default router;
