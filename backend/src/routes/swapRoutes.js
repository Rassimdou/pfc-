import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import prisma from '../lib/prismaClient.js';
import nodemailer from 'nodemailer'; // Import nodemailer
import { sendSwapAcceptedNotification } from '../services/emailService.js';

const router = express.Router();

// Configure nodemailer transporter (Assuming process.env variables are set)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

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
    const { fromAssignmentId, toAssignmentIds } = req.body;
    const userId = req.user.id;

    if (!fromAssignmentId || !toAssignmentIds || !Array.isArray(toAssignmentIds) || toAssignmentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: fromAssignmentId, toAssignmentIds (as a non-empty array)'
      });
    }

    const fromAssignmentIdInt = parseInt(fromAssignmentId);

    // Verify the 'from' assignment belongs to the authenticated user and is swappable
    const fromAssignment = await prisma.surveillanceAssignment.findUnique({
      where: { id: fromAssignmentIdInt },
      select: { userId: true, canSwap: true }
    });

    if (!fromAssignment || fromAssignment.userId !== userId) {
      return res.status(403).json({ success: false, message: 'You can only initiate swaps for your own assignments.' });
    }
    if (!fromAssignment.canSwap) {
       return res.status(400).json({ success: false, message: 'Your selected assignment is not swappable.' });
    }

    const createdRequests = [];
    const failedRequests = [];
    const notificationsSent = [];

    for (const toAssignmentId of toAssignmentIds) {
      const toAssignmentIdInt = parseInt(toAssignmentId);

    // Verify the 'to' assignment exists, is swappable, and is not involved in a pending request
    const toAssignment = await prisma.surveillanceAssignment.findUnique({
        where: { id: toAssignmentIdInt },
        select: { // Use select only to specify all desired fields and relations
            id: true,
            userId: true,
            canSwap: true,
            module: true,
            date: true,
            time: true,
            room: true,
            user: { // Select the related user
                select: { // Select specific fields from the user
                    email: true
                }
            },
            fromSwapRequests: { // Select the related fromSwapRequests
                where: { status: 'PENDING' }, // Keep the where clause for filtering pending requests
                 select: { id: true } // Select necessary fields from the relation, or true for all fields
            },
            toSwapRequests: { // Select the related toSwapRequests
                where: { status: 'PENDING' }, // Keep the where clause for filtering pending requests
                 select: { id: true } // Select necessary fields from the relation, or true for all fields
            }
        }
    });

    if (!toAssignment) {
          failedRequests.push({ id: toAssignmentId, reason: 'Target assignment not found.' });
          continue; // Skip to the next target assignment
    }
    if (toAssignment.userId === userId) {
           failedRequests.push({ id: toAssignmentId, reason: 'Cannot swap with your own assignment.' });
           continue; // Skip
    }
    if (!toAssignment.canSwap) {
           failedRequests.push({ id: toAssignmentId, reason: 'The target assignment is not swappable.' });
           continue; // Skip
    }
    if (toAssignment.fromSwapRequests.length > 0 || toAssignment.toSwapRequests.length > 0) {
           failedRequests.push({ id: toAssignmentId, reason: 'The target assignment is already involved in a pending swap request.' });
           continue; // Skip
    }

    // Create the anonymous swap request
      try {
    const swapRequest = await prisma.surveillanceSwapRequest.create({
      data: {
        fromAssignmentId: fromAssignmentIdInt,
        toAssignmentId: toAssignmentIdInt,
        userId: userId, // The user who initiated the request
        status: 'PENDING',
        isAnonymous: true, // Mark as anonymous initially
      }
    });
        createdRequests.push(swapRequest);

    // Send anonymous email notification to the target teacher
     try {
         await transporter.sendMail({
             from: process.env.SMTP_FROM,
             to: toAssignment.user.email,
             subject: 'New Anonymous Surveillance Swap Request',
             html: `
               <h2>New Anonymous Surveillance Swap Request</h2>
               <p>Another teacher has requested to swap one of your surveillance duties.</p>
               <h3>Your Assignment:</h3>
               <ul>
                 <li><strong>Date:</strong> ${new Date(toAssignment.date).toLocaleDateString()}</li>
                 <li><strong>Time:</strong> ${toAssignment.time}</li>
                 <li><strong>Module:</strong> ${toAssignment.module}</li>
                 <li><strong>Room:</strong> ${toAssignment.room}</li>
               </ul>
               <p>Log in to the platform to view the request and decide whether to accept or decline. The identity of the requesting teacher will be revealed only if you accept.</p>
             `,
         });
             notificationsSent.push(toAssignment.user.email);
     } catch (emailError) {
             console.error('Error sending anonymous swap notification email to ${toAssignment.user.email}:', emailError);
             // Log the email error but allow the request creation to proceed
             failedRequests.push({ id: toAssignmentId, reason: `Failed to send email to ${toAssignment.user.email}` });
         }

      } catch (dbError) {
          console.error(`Error creating swap request for target ${toAssignmentId}:`, dbError);
          failedRequests.push({ id: toAssignmentId, reason: 'Failed to create database record.' });
      }
    }

    if (createdRequests.length > 0) {
        res.json({
          success: true,
          message: `Successfully sent ${createdRequests.length} swap request(s). ${failedRequests.length > 0 ? `(${failedRequests.length} failed)` : ''}`,
          createdRequests,
          failedRequests,
          notificationsSent,
        });
    } else if (failedRequests.length > 0) {
        res.status(400).json({
            success: false,
            message: `Failed to send any swap requests. ${failedRequests.length} failed.`,
            failedRequests,
        });
    } else {
         // This case should ideally not happen if input validation passes
         res.status(400).json({
             success: false,
             message: 'No valid target assignments provided.',
         });
    }

  } catch (error) {
    console.error('Error initiating anonymous swap request(s):', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to initiate anonymous swap request(s)'
    });
  }
});

// GET /api/swap/received-requests
// Fetches swap requests where the authenticated user is the target teacher
router.get('/received-requests', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const receivedRequests = await prisma.surveillanceSwapRequest.findMany({
      where: {
        toAssignment: {
          userId: userId,
        },
        status: 'PENDING',
      },
      include: {
        fromAssignment: {
          select: {
            date: true,
            time: true,
            module: true,
            room: true,
            user: { // Include the sender's user details
              select: { name: true, email: true }
            }
          }
        },
        toAssignment: { // Include details of the assignment being requested from the current user
           select: {
            date: true,
            time: true,
            module: true,
            room: true,
            user: { // Include the receiver's user details (should be the current user)
              select: { name: true, email: true }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      success: true,
      requests: receivedRequests,
    });

  } catch (error) {
    console.error('Error fetching received swap requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch received swap requests.',
    });
  }
});

// POST /api/surveillance/swap/:swapId/accept
// Accepts a swap request and cancels other pending requests for the same originating assignment
router.post('/surveillance/swap/:swapId/accept', authenticate, async (req, res) => {
  try {
    console.log('[%s] Accepting swap request started for swapId: %s', new Date().toISOString(), req.params.swapId); // Log start
    const { swapId } = req.params;
    const userId = req.user.id; // The user who is accepting the swap
    const swapIdInt = parseInt(swapId);

    // Use a transaction to ensure atomicity
    await prisma.$transaction(async (prisma) => {
      console.log('[%s] Transaction started for swapId: %s', new Date().toISOString(), swapIdInt); // Log transaction start
      // 1. Find the swap request to verify it exists and is pending, and belongs to an assignment of the accepting user
      const swapRequestToAccept = await prisma.surveillanceSwapRequest.findUnique({
        where: { id: swapIdInt },
        select: {
          id: true,
          status: true,
          toAssignmentId: true,
          fromAssignmentId: true,
          userId: true, // The initiator of the swap request
        },
      });

      console.log('[%s] Found swap request to accept: %o', new Date().toISOString(), swapRequestToAccept); // Log found request

      if (!swapRequestToAccept) {
        console.error('[%s] Swap request not found for id: %s', new Date().toISOString(), swapIdInt); // Log error
        throw new Error('Swap request not found.');
      }

      if (swapRequestToAccept.status !== 'PENDING') {
        console.error('[%s] Swap request not pending for id: %s (status: %s)', new Date().toISOString(), swapIdInt, swapRequestToAccept.status); // Log error
        throw new Error('Swap request is not pending and cannot be accepted.');
      }

      // Verify that the 'toAssignment' of this request belongs to the user who is accepting
      const toAssignment = await prisma.surveillanceAssignment.findUnique({
        where: { id: swapRequestToAccept.toAssignmentId },
        select: { userId: true, id: true, module: true, room: true, date: true, time: true },
      });

       console.log('[%s] Found toAssignment: %o', new Date().toISOString(), toAssignment); // Log toAssignment

      if (!toAssignment || toAssignment.userId !== userId) {
         console.error('[%s] toAssignment not found or does not belong to accepting user: %o', new Date().toISOString(), toAssignment); // Log error
         throw new Error('You can only accept swap requests for your own assignments.');
      }

       // Find the 'fromAssignment' to get the sender's user ID and email
      const fromAssignment = await prisma.surveillanceAssignment.findUnique({
        where: { id: swapRequestToAccept.fromAssignmentId },
        select: { userId: true, id: true, module: true, room: true, date: true, time: true, user: { select: { email: true } } }, // Include user email
      });

      console.log('[%s] Found fromAssignment: %o', new Date().toISOString(), fromAssignment); // Log fromAssignment

      if (!fromAssignment) {
          console.error('[%s] fromAssignment not found for id: %s', new Date().toISOString(), swapRequestToAccept.fromAssignmentId); // Log error
          throw new Error('Originating assignment not found.');
      }

      console.log('[%s] Updating swap request status to APPROVED for id: %s', new Date().toISOString(), swapIdInt); // Log update step
      // 2. Update the accepted swap request status to APPROVED
      await prisma.surveillanceSwapRequest.update({
        where: { id: swapIdInt },
        data: { status: 'APPROVED' },
      });
      console.log('[%s] Swap request status updated.', new Date().toISOString()); // Log update complete

      console.log('[%s] Cancelling other pending requests from the same original assignment: %s', new Date().toISOString(), swapRequestToAccept.fromAssignmentId); // Log cancelling step
      // 3. Find and update other pending requests from the same original assignment to CANCELLED
      const cancelResult = await prisma.surveillanceSwapRequest.updateMany({
        where: {
          fromAssignmentId: swapRequestToAccept.fromAssignmentId,
          status: 'PENDING',
          id: { not: swapIdInt }, // Exclude the accepted request
        },
        data: { status: 'CANCELLED' },
      });
      console.log('[%s] Cancelled %d other pending requests.', new Date().toISOString(), cancelResult.count); // Log cancel complete

      console.log('[%s] Swapping userIds for assignments: %s and %s', new Date().toISOString(), fromAssignment.id, toAssignment.id); // Log swap step
      // 4. Swap the userIds of the two assignments
      await prisma.surveillanceAssignment.update({
        where: { id: fromAssignment.id },
        data: { userId: toAssignment.userId },
      });

      await prisma.surveillanceAssignment.update({
        where: { id: toAssignment.id },
        data: { userId: fromAssignment.userId },
      });
       console.log('[%s] UserIds swapped.', new Date().toISOString()); // Log swap complete

      // 5. Notify the sender that their request has been accepted
      console.log('[%s] Attempting to send swap accepted notification email to: %s', new Date().toISOString(), fromAssignment.user?.email); // Log email step
      // Use the email from the fetched fromAssignment
      if (fromAssignment.user && fromAssignment.user.email) {
        await sendSwapAcceptedNotification(fromAssignment.user.email, {
          fromAssignment: {
            module: fromAssignment.module,
            room: fromAssignment.room,
            date: fromAssignment.date,
            time: fromAssignment.time,
          },
          toAssignment: {
            module: toAssignment.module,
            room: toAssignment.room,
            date: toAssignment.date,
            time: toAssignment.time,
          },
        });
         console.log('[%s] Swap accepted notification email sent.', new Date().toISOString()); // Log email sent
      }
       console.log('[%s] Transaction completed successfully for swapId: %s', new Date().toISOString(), swapIdInt); // Log transaction complete

    }); // End of transaction

    console.log('[%s] Accepting swap request finished successfully for swapId: %s', new Date().toISOString(), swapIdInt); // Log finish
    res.json({ success: true, message: 'Swap request accepted and other pending requests cancelled.' });

  } catch (error) {
    console.error('[%s] Error accepting swap request for swapId %s: %s', new Date().toISOString(), req.params?.swapId, error); // Log error with timestamp and swapId
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to accept swap request'
    });
  }
});

// POST /api/surveillance/swap/:swapId/decline
// Declines a swap request
router.post('/surveillance/swap/:swapId/decline', authenticate, async (req, res) => {
  try {
    const swapId = parseInt(req.params.swapId);
    const userId = req.user.id;

    // 1. Find the swap request to be declined
    const swapRequest = await prisma.surveillanceSwapRequest.findUnique({
      where: { id: swapId },
      include: { toAssignment: { select: { userId: true } } }
    });

    if (!swapRequest) {
      return res.status(404).json({ success: false, message: 'Swap request not found.' });
    }

    // Ensure the authenticated user is the target teacher of this swap request
     if (swapRequest.toAssignment.userId !== userId) {
         return res.status(403).json({ success: false, message: 'You are not authorized to decline this swap request.' });
     }

    // Ensure the swap request is still pending
     if (swapRequest.status !== 'PENDING') {
         return res.status(400).json({ success: false, message: 'This swap request is no longer pending.' });
     }

    // 2. Update the swap request status to 'REJECTED'
    await prisma.surveillanceSwapRequest.update({
      where: { id: swapId },
      data: { status: 'REJECTED' },
    });

     // 3. TODO: Implement notification for the user who sent the request that it was declined.

    res.json({ success: true, message: 'Swap request declined successfully.' });

  } catch (error) {
    console.error('Error declining swap request:', error);
    res.status(500).json({ success: false, message: 'Failed to decline swap request.' });
  }
});

// POST /api/surveillance/swap/:swapId/cancel
// Cancels a swap request (intended for the user who sent the request)
router.post('/surveillance/swap/:swapId/cancel', authenticate, async (req, res) => {
  try {
    console.log('[%s] Cancelling swap request started for swapId: %s', new Date().toISOString(), req.params.swapId); // Log start
    const swapId = parseInt(req.params.swapId);
    const userId = req.user.id;

    // 1. Find the swap request to be cancelled
    const swapRequest = await prisma.surveillanceSwapRequest.findUnique({
      where: { id: swapId },
      select: { userId: true, status: true }
    });

     console.log('[%s] Found swap request for cancelling: %o', new Date().toISOString(), swapRequest); // Log found request

    if (!swapRequest) {
      console.error('[%s] Swap request not found for cancelling id: %s', new Date().toISOString(), swapId); // Log error
      return res.status(404).json({ success: false, message: 'Swap request not found.' });
    }

    // Ensure the authenticated user is the one who sent this swap request
    if (swapRequest.userId !== userId) {
        console.error('[%s] User %s is not authorized to cancel swap request %s (owned by user %s)', new Date().toISOString(), userId, swapId, swapRequest.userId); // Log error
        return res.status(403).json({ success: false, message: 'You are not authorized to cancel this swap request.' });
    }

    // Ensure the swap request is still pending
     if (swapRequest.status !== 'PENDING') {
          console.error('[%s] Swap request %s is not pending (status: %s)', new Date().toISOString(), swapId, swapRequest.status); // Log error
         return res.status(400).json({ success: false, message: 'This swap request is no longer pending.' });
     }

    console.log('[%s] Updating swap request status to CANCELLED for id: %s', new Date().toISOString(), swapId); // Log update step
    // 2. Update the swap request status to 'CANCELLED'
    await prisma.surveillanceSwapRequest.update({
      where: { id: swapId },
      data: { status: 'CANCELLED' },
    });
     console.log('[%s] Swap request status updated to CANCELLED.', new Date().toISOString()); // Log update complete

    res.json({ success: true, message: 'Swap request cancelled successfully.' });

  } catch (error) {
    console.error('[%s] Error cancelling swap request for swapId %s: %s', new Date().toISOString(), req.params?.swapId, error); // Log error with timestamp and swapId
    res.status(500).json({ success: false, message: 'Failed to cancel swap request.' });
  }
});

export default router; 