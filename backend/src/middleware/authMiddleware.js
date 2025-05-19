import jwt from 'jsonwebtoken';
import prisma from '../lib/prismaClient.js';

export const authenticate = async (req, res, next) => {
    try {
        // Check for token in Authorization header, cookie, or localStorage
        const authHeader = req.headers.authorization;
        const token = authHeader?.split(' ')[1] || req.cookies.accessToken || req.cookies.token;
        
        if (!token) {
            return res.status(401).json({ 
                success: false,
                message: 'Unauthorized - No token provided' 
            });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Verify user still exists
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
                    message: 'Unauthorized - User not found' 
                });
            }

            req.user = user;
            next();
        } catch (jwtError) {
            if (jwtError.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    message: 'Token expired',
                    code: 'TOKEN_EXPIRED'
                });
            }
            throw jwtError;
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(401).json({ 
            success: false,
            message: 'Unauthorized - Invalid token' 
        });
    }
};

export const validateInvitation = async (req, res, next) => {
    try {
        const { token, email } = req.query;
        
        if (!token || !email) {
            return res.status(400).json({ 
                success: false,
                message: 'Token and email are required' 
            });
        }
        
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
                success: false,
                message: 'Invalid or expired invitation link' 
            });
        }
    
        req.validEmail = email;
        next();
    } catch (error) {
        console.error('Invitation validation error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Invitation validation failed' 
        });
    }
};