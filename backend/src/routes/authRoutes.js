import express from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import '../config/passport.js'; // Make sure this path is correct
import { setPassword, loginWithPassword, checkEmailAuthorization, handleGoogleAuth } from '../controllers/authController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// Email verification
router.post('/check-email', checkEmailAuthorization);

// Traditional password authentication
router.post('/set-password', setPassword);
router.post('/login', loginWithPassword);

// Google OAuth flow
router.get(
  '/google',
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    prompt: 'select_account'
  })
);

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false }),
  async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          success: false,
          message: 'Unauthorized: email not registered' 
        });
      }

      const user = await handleGoogleAuth(req.user);
      
      const token = jwt.sign(
        { 
          id: user.id, 
          email: user.email, 
          role: user.role 
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Set refresh token cookie
      const refreshToken = jwt.sign(
        { id: user.id },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
      );

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      // Redirect to frontend with token
      res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
    } catch (error) {
      console.error('Google callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/signup?error=${encodeURIComponent(error.message)}`);
    }
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

    res.json({
      success: true,
      accessToken: newAccessToken,
      user
    });
  } catch (error) {
    res.status(401).json({ 
      success: false,
      message: 'Invalid refresh token' 
    });
  }
});

export default router;
