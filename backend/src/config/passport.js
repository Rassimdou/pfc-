import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import prisma from '../lib/prismaClient.js';
import jwt from 'jsonwebtoken';

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

        // Check if user already exists
        let user = await prisma.user.findUnique({
          where: { email }
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
              role: 'STUDENT', // Default role for Google signups
              googleId: profile.id,
              isVerified: true,
              createdAt: new Date()
            }
          });
        }

        // Generate JWT token
        const token = jwt.sign(
          {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role
          },
          process.env.JWT_SECRET,
          { expiresIn: '1h' }
        );

        return done(null, { token });
      } catch (error) {
        console.error('Google auth error:', error);
        return done(error);
      }
    }
  )
);

export default passport;
