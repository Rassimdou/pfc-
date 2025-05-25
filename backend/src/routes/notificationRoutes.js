import express from 'express';
import { isAuthenticated } from '../middleware/auth.js';
import { getNotifications } from '../controllers/notificationController.js';

const router = express.Router();

// Get all notifications for the current user
router.get('/', isAuthenticated, getNotifications);

export default router; 