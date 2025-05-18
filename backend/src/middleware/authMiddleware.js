import jwt from 'jsonwebtoken';


export const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    console.log('Received token:', token); // Debug token

    if (!token) {
        console.log('No token provided');
        return res.status(401).json({ message: 'Unauthorized - No token provided' });
    }
    try {
         const user = jwt.verify(token, process.env.JWT_SECRET);
         console.log('Decoded user:', user); // Debug decoded user
         req.user = user;
         next();
    } catch (error) {
        console.error('Token verification error:', error);
        res.status(401).json({ message: 'Invalid token' }); 
    }

}

export const validateInvitation = async (req, res, next) => {
    try {
      const { token, email } = req.query;
      
      // Hash received token
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
      
      const verification = await prisma.verification.findFirst({
        where: {
          token: hashedToken,
          expires: { gt: new Date() },
          user: { email }
        }
      });
  
      if (!verification) {
        return res.status(401).json({ 
          error: 'Invalid or expired invitation link' 
        });
      }
  
      req.validEmail = email;
      next();
    } catch (error) {
      res.status(500).json({ error: 'Invitation validation failed' });
    }
  };