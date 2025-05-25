import prisma from '../lib/prismaClient.js';
import { sendPermutationRequestNotification } from '../services/emailService.js';

export const createPermutationRequest = async (req, res) => {
  try {
    const { fromSlotId, toSlotId, isAnonymous } = req.body;
    const userId = req.user.id;

    // Get the schedule slots with their owners
    const fromSlot = await prisma.scheduleSlot.findUnique({
      where: { id: fromSlotId },
      include: { user: true }
    });

    const toSlot = await prisma.scheduleSlot.findUnique({
      where: { id: toSlotId },
      include: { user: true }
    });

    if (!fromSlot || !toSlot) {
      return res.status(404).json({
        success: false,
        message: 'One or both schedule slots not found'
      });
    }

    // Verify that the current user is the owner of fromSlot
    if (fromSlot.ownerId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only create permutation requests for your own slots'
      });
    }

    // Create the permutation request
    const permutationRequest = await prisma.permutationRequest.create({
      data: {
        fromSlotId,
        toSlotId,
        userId,
        isAnonymous
      }
    });

    // Send email notification to the receiver (owner of toSlot)
    try {
      await sendPermutationRequestNotification(
        toSlot.user.email, // This is the receiver's email
        isAnonymous ? 'Anonymous User' : fromSlot.user.name,
        {
          fromDate: fromSlot.date,
          fromTime: fromSlot.time,
          fromModule: fromSlot.module,
          fromRoom: fromSlot.room,
          toDate: toSlot.date,
          toTime: toSlot.time,
          toModule: toSlot.module,
          toRoom: toSlot.room
        }
      );
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError);
      // Continue with the response even if email fails
    }

    res.status(201).json({
      success: true,
      message: 'Permutation request created successfully',
      data: permutationRequest
    });
  } catch (error) {
    console.error('Error creating permutation request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create permutation request'
    });
  }
}; 