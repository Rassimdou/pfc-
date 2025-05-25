import prisma from '../lib/prismaClient.js';
import { sendSwapRequestNotification } from '../services/emailService.js';

export const createSwapRequest = async (req, res) => {
  try {
    const { fromAssignmentId, toAssignmentId, isAnonymous } = req.body;
    const userId = req.user.id;

    // Get the assignments with their owners
    const fromAssignment = await prisma.surveillanceAssignment.findUnique({
      where: { id: fromAssignmentId },
      include: { user: true }
    });

    const toAssignment = await prisma.surveillanceAssignment.findUnique({
      where: { id: toAssignmentId },
      include: { user: true }
    });

    if (!fromAssignment || !toAssignment) {
      return res.status(404).json({
        success: false,
        message: 'One or both assignments not found'
      });
    }

    // Verify that the current user is the owner of fromAssignment
    if (fromAssignment.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only create swap requests for your own assignments'
      });
    }

    // Create the swap request
    const swapRequest = await prisma.surveillanceSwapRequest.create({
      data: {
        fromAssignmentId,
        toAssignmentId,
        userId,
        isAnonymous
      }
    });

    // Send email notification to the receiver (owner of toAssignment)
    try {
      await sendSwapRequestNotification(
        toAssignment.user.email, // This is the receiver's email
        isAnonymous ? 'Anonymous User' : fromAssignment.user.name,
        {
          date: fromAssignment.date,
          time: fromAssignment.time,
          module: fromAssignment.module,
          room: fromAssignment.room
        }
      );
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError);
      // Continue with the response even if email fails
    }

    res.status(201).json({
      success: true,
      message: 'Swap request created successfully',
      data: swapRequest
    });
  } catch (error) {
    console.error('Error creating swap request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create swap request'
    });
  }
};

// Get pending swap requests for the current user
export const getPendingSwapRequests = async (req, res) => {
  try {
    const userId = req.user.id;

    const pendingRequests = await prisma.surveillanceSwapRequest.findMany({
      where: {
        toAssignment: {
          userId: userId
        },
        status: 'PENDING'
      },
      include: {
        fromAssignment: {
          include: {
            user: true,
            moduleRef: true
          }
        },
        toAssignment: {
          include: {
            moduleRef: true
          }
        }
      }
    });

    // Format the response
    const formattedRequests = pendingRequests.map(request => ({
      id: request.id,
      module: request.toAssignment.moduleRef.name,
      date: request.toAssignment.date,
      time: request.toAssignment.time,
      fromUser: {
        id: request.fromAssignment.user.id,
        firstName: request.fromAssignment.user.firstName,
        lastName: request.fromAssignment.user.lastName
      },
      fromModule: request.fromAssignment.moduleRef.name,
      fromDate: request.fromAssignment.date,
      fromTime: request.fromAssignment.time,
      createdAt: request.createdAt
    }));

    res.json(formattedRequests);
  } catch (error) {
    console.error('Error fetching pending swap requests:', error);
    res.status(500).json({ error: 'Failed to fetch pending swap requests' });
  }
};

export default {
  createSwapRequest,
  getPendingSwapRequests
}; 