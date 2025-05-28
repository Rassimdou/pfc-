import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import prisma from '../lib/prismaClient.js';
import jwt from 'jsonwebtoken';
import { generateTokens } from '../controllers/authController.js';

// Debug logging
console.log('Environment variables:');
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID);
console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET);
console.log('FRONTEND_URL:', process.env.FRONTEND_URL);

// Ensure consistent port usage
const API_URL = 'http://localhost:5000';
const callbackURL = `${API_URL}/api/auth/google/callback`;
console.log('API URL:', API_URL);
console.log('Callback URL:', callbackURL);

// Log the full OAuth configuration
const oauthConfig = {
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL,
  scope: ['profile', 'email']
};
console.log('OAuth Configuration:', {
  ...oauthConfig,
  clientSecret: oauthConfig.clientSecret ? 'Set' : 'Not set'
});

passport.use(
  new GoogleStrategy(
    oauthConfig,
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        console.log('Google OAuth callback received:', {
          accessToken: accessToken ? 'Present' : 'Missing',
          refreshToken: refreshToken ? 'Present' : 'Missing',
          profileId: profile.id,
          email: profile.emails?.[0]?.value,
          callbackURL
        });
        
        const email = profile.emails?.[0]?.value?.toLowerCase();
        
        if (!email) {
          console.log('No email provided by Google');
          return done(null, false, { message: 'No email provided by Google' });
        }

        // Check if user already exists
        let user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isVerified: true,
            phoneNumber: true
          }
        });

        if (!user) {
          console.log('Creating new user for:', email);
          // Create new user from Google profile
          user = await prisma.user.create({
            data: {
              email,
              name: `${profile.name.givenName} ${profile.name.familyName}`,
              firstName: profile.name.givenName || '',
              lastName: profile.name.familyName || '',
              role: 'PROFESSOR',
              googleId: profile.id,
              isVerified: true,
              createdAt: new Date()
            },
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
              isVerified: true,
              phoneNumber: true
            }
          });
        }

        // Generate tokens
        const tokens = generateTokens(user);
        
        // Store refresh token in database
        await prisma.refreshToken.create({
          data: {
            token: tokens.refreshToken,
            userId: user.id,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
          }
        });

        // Return user with tokens
        return done(null, {
          ...user,
          accessToken: tokens.accessToken
        });
      } catch (error) {
        console.error('Error in Google strategy:', error);
        return done(error);
      }
    }
  )
);

export default passport;
