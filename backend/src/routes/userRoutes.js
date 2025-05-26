import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { 
  getUserProfile,
  updateUserProfile,
  changeUserPassword
} from '../controllers/userController.js';

const router = express.Router();

// Profile routes
router.get('/profile', authenticate, getUserProfile);
router.put('/profile', authenticate, updateUserProfile);
router.post('/change-password', authenticate, changeUserPassword);

export default router; 