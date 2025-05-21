import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import prisma from '../lib/prismaClient.js';
import jwt from 'jsonwebtoken';
import { generateTokens } from '../controllers/authController.js';

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.API_URL}/api/auth/google/callback`,
      passReqToCallback: true
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        console.log('Google profile:', profile);
        const email = profile.emails?.[0]?.value?.toLowerCase();
        
        if (!email) {
          console.log('No email provided by Google');
          return done(null, false, { message: 'No email provided by Google' });
        }

        // Check if email is authorized
        const pendingTeacher = await prisma.pendingTeacher.findUnique({
          where: { email }
        });

        if (!pendingTeacher) {
          console.log('Email not authorized:', email);
          return done(null, false, { message: 'Email not authorized for registration' });
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
            isVerified: true
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
              isVerified: true
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
