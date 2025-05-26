import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import prisma from '../lib/prismaClient.js';
import { sendSwapRequestNotification } from '../services/emailService.js';

const router = express.Router();

// POST /api/swap/request-criteria
// Initiates a swap request based on date and time criteria
router.post('/request-criteria', authenticate, async (req, res) => {
  try {
    const { assignmentId, desiredDate, desiredTime } = req.body;

    console.log('Received swap search request:', { assignmentId, desiredDate, desiredTime }); // Log received criteria

    if (!assignmentId || !desiredDate || !desiredTime) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: assignmentId, desiredDate, desiredTime'
      });
    }

    const userId = req.user.id;
    const assignmentIdInt = parseInt(assignmentId);

    // 1. Find the user's assignment (optional, mainly for verification)
    const userAssignment = await prisma.surveillanceAssignment.findUnique({
      where: { id: assignmentIdInt },
      select: { 
        id: true,
        userId: true, 
        isResponsible: true, 
        canSwap: true,
        date: true,
        time: true,
        module: true,
        room: true
      }
    });

    if (!userAssignment) {
      return res.status(404).json({ success: false, message: 'Originating assignment not found.' });
    }

    if (userAssignment.userId !== userId) {
       return res.status(403).json({ success: false, message: 'You can only request swaps for your own assignments.' });
    }

    if (!userAssignment.canSwap) {
       return res.status(400).json({ success: false, message: 'Your selected assignment is not swappable.' });
    }

    // Parse the desired date string into a Date object (assuming YYYY-MM-DD format)
    const targetDate = new Date(desiredDate);
     if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid desired date format.' });
    }
    // Set time to midnight for date comparison
    targetDate.setUTCHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setUTCDate(targetDate.getUTCDate() + 1);

    console.log('Searching for matches with date range:', targetDate.toISOString(), 'to', nextDay.toISOString(), 'and time:', desiredTime); // Log search parameters
    console.log('Current user ID:', userId); // Debug log

    // 2. Find other swappable assignments from *other* teachers matching desiredDate and desiredTime
    // 3. Filter out assignments that are responsible or already involved in a pending swap
    const potentialMatches = await prisma.surveillanceAssignment.findMany({
      where: {
        AND: [
          // Match date (within the same day)
          {
            date: {
              gte: targetDate,
              lt: nextDay,
            }
          },
          // Match time
          { time: desiredTime },
          // Must be from a different user
          { userId: { not: userId } },
          // Must be swappable
          { canSwap: true },
          // Must not be involved in any pending swap request
          { fromSwapRequests: { none: { status: 'PENDING' } } },
          { toSwapRequests: { none: { status: 'PENDING' } } }
        ]
      },
      select: {
        id: true,
        date: true,
        time: true,
        module: true,
        room: true,
        userId: true,
      }
    });

    console.log('Raw potential matches from DB:', potentialMatches); // Log raw results
    console.log('User IDs in results:', potentialMatches.map(m => m.userId)); // Debug log

    // Double-check that we don't have any of the user's own assignments
    const filteredMatches = potentialMatches.filter(match => match.userId !== userId);
    console.log('After filtering user ID:', filteredMatches.map(m => m.userId)); // Debug log

    // 4. Return a list of potential swap targets (initially anonymous)
    res.json({
      success: true,
      message: `Found ${filteredMatches.length} potential swap targets.`,
      potentialMatches: filteredMatches.map(match => ({
         id: match.id,
         date: match.date.toISOString().split('T')[0], // Ensure consistent date format
         time: match.time,
         module: match.module,
         room: match.room,
         // Include the sender's assignment details
         senderAssignment: {
           id: userAssignment.id,
           date: userAssignment.date.toISOString().split('T')[0],
           time: userAssignment.time,
           module: userAssignment.module,
           room: userAssignment.room
         }
      }))
    });

  } catch (error) {
    console.error('Error initiating criteria-based swap request:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to initiate swap request'
    });
  }
});

// POST /api/swap/initiate-anonymous-request
// Initiates an anonymous swap request with a specific target assignment
router.post('/initiate-anonymous-request', authenticate, async (req, res) => {
  try {
    const { fromAssignmentId, toAssignmentId } = req.body;
    const userId = req.user.id;

    if (!fromAssignmentId || !toAssignmentId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: fromAssignmentId, toAssignmentId'
      });
    }

    const fromAssignmentIdInt = parseInt(fromAssignmentId);
    const toAssignmentIdInt = parseInt(toAssignmentId);

    // Verify the 'from' assignment belongs to the authenticated user and is swappable
    const fromAssignment = await prisma.surveillanceAssignment.findUnique({
      where: { id: fromAssignmentIdInt },
      select: { 
        userId: true, 
        canSwap: true,
        date: true,
        time: true,
        module: true,
        room: true
      }
    });

    if (!fromAssignment || fromAssignment.userId !== userId) {
      return res.status(403).json({ success: false, message: 'You can only initiate swaps for your own assignments.' });
    }
    if (!fromAssignment.canSwap) {
       return res.status(400).json({ success: false, message: 'Your selected assignment is not swappable.' });
    }

    // Verify the 'to' assignment exists, is swappable, and is not involved in a pending request
    const toAssignment = await prisma.surveillanceAssignment.findUnique({
        where: { id: toAssignmentIdInt },
        select: {
            id: true,
            userId: true,
            canSwap: true,
            module: true,
            date: true,
            time: true,
            room: true,
            user: {
                select: {
                    email: true
                }
            },
            fromSwapRequests: {
                where: { status: 'PENDING' },
                select: { id: true }
            },
            toSwapRequests: {
                where: { status: 'PENDING' },
                select: { id: true }
            }
        }
    });

    if (!toAssignment) {
        return res.status(404).json({ success: false, message: 'Target assignment not found.' });
    }
    if (toAssignment.userId === userId) {
         return res.status(400).json({ success: false, message: 'You cannot swap with your own assignment.' });
    }
    if (!toAssignment.canSwap) {
         return res.status(400).json({ success: false, message: 'The target assignment is not swappable.' });
    }
    if (toAssignment.fromSwapRequests.length > 0 || toAssignment.toSwapRequests.length > 0) {
         return res.status(400).json({ success: false, message: 'The target assignment is already involved in a pending swap request.' });
    }

    // Create the anonymous swap request
    const swapRequest = await prisma.surveillanceSwapRequest.create({
      data: {
        fromAssignmentId: fromAssignmentIdInt,
        toAssignmentId: toAssignmentIdInt,
        userId: userId,
        status: 'PENDING',
        isAnonymous: true,
      }
    });

    // Send anonymous email notification to the target teacher
    try {
      await sendSwapRequestNotification(
        toAssignment.user.email,
        'Anonymous User',
        {
          // Current assignment (receiver's assignment)
          date: toAssignment.date,
          time: toAssignment.time,
          module: toAssignment.module,
          room: toAssignment.room,
          // Requested assignment (sender's assignment)
          requestedDate: fromAssignment.date,
          requestedTime: fromAssignment.time,
          requestedModule: fromAssignment.module,
          requestedRoom: fromAssignment.room
        }
      );
    } catch (emailError) {
      console.error('Error sending anonymous swap notification email:', emailError);
      // Continue with the request even if email fails
    }

    res.json({
      success: true,
      message: 'Anonymous swap request sent successfully.',
      swapRequest,
    });

  } catch (error) {
    console.error('Error initiating anonymous swap request:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to initiate anonymous swap request'
    });
  }
});

export default router; 