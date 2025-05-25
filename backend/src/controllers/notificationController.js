import prisma from '../lib/prismaClient.js';

// Get all notifications for the current user
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get pending swap requests
    const pendingSwaps = await prisma.surveillanceSwapRequest.findMany({
      where: {
        OR: [
          { userId: userId },
          { toAssignment: { userId: userId } }
        ],
        status: 'PENDING'
      },
      include: {
        fromAssignment: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                firstName: true,
                lastName: true
              }
            }
          }
        },
        toAssignment: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });

    // Get pending permutation requests
    const pendingPermutations = await prisma.permutationRequest.findMany({
      where: {
        OR: [
          { initiatorId: userId },
          { receiverId: userId }
        ],
        status: 'PENDING'
      },
      include: {
        initiator: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true
          }
        },
        receiver: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true
          }
        },
        slotA: true,
        slotB: true
      }
    });

    // Format notifications
    const notifications = [
      ...pendingSwaps.map(swap => ({
        id: swap.id,
        type: 'SWAP_REQUEST',
        title: swap.isAnonymous ? 'New Swap Request' : `Swap Request from ${swap.fromAssignment.user.firstName} ${swap.fromAssignment.user.lastName}`,
        message: `Swap request for surveillance on ${new Date(swap.fromAssignment.date).toLocaleDateString()}`,
        details: {
          fromUserId: swap.userId,
          toUserId: swap.toAssignment.userId,
          fromAssignment: {
            date: swap.fromAssignment.date,
            time: swap.fromAssignment.time,
            module: swap.fromAssignment.module,
            room: swap.fromAssignment.room
          },
          toAssignment: {
            date: swap.toAssignment.date,
            time: swap.toAssignment.time,
            module: swap.toAssignment.module,
            room: swap.toAssignment.room
          },
          isAnonymous: swap.isAnonymous
        },
        createdAt: swap.createdAt
      })),
      ...pendingPermutations.map(perm => ({
        id: perm.id,
        type: 'PERMUTATION_REQUEST',
        title: `Schedule Permutation Request from ${perm.initiator.firstName} ${perm.initiator.lastName}`,
        message: `Request to swap schedule slots`,
        details: {
          fromUserId: perm.initiatorId,
          toUserId: perm.receiverId,
          fromSlot: {
            module: perm.slotA.module.name,
            day: perm.slotA.dayOfWeek,
            time: `${perm.slotA.startTime} - ${perm.slotA.endTime}`
          },
          toSlot: {
            module: perm.slotB.module.name,
            day: perm.slotB.dayOfWeek,
            time: `${perm.slotB.startTime} - ${perm.slotB.endTime}`
          }
        },
        createdAt: perm.createdAt
      }))
    ];

    // Sort notifications by creation date (newest first)
    notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
}; 