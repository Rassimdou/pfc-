import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import prisma from '../lib/prismaClient.js';

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: 'http://localhost:5000/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      const { id, displayName, emails } = profile;

      let user = await prisma.user.findUnique({ where: { googleId: id } });

      if (!user) {
        const email = emails?.[0]?.value;

        // Optional: only allow login if pre-registered
        const preRegistered = await prisma.user.findUnique({ where: { email } });

        if (!preRegistered) return done(null, false); // Not allowed

        user = await prisma.user.update({
          where: { email },
          data: { googleId: id, name: displayName },
        });
      }

      return done(null, user);
    }
  )
);

export default passport;
