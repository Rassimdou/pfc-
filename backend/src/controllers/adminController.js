import prisma from '../lib/prismaClient.js';
import { sendInvitationEmail } from '../services/emailService.js'; // Ensure this service exists
import crypto from 'crypto';

export const registerTeacher = async (req, res) => {
  // Check if user is admin
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Only administrators can add teachers'
    });
  }

  const { email } = req.body;

  try {
    // Validate email
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase();

    // Check existing users
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists in system'
      });
    }

    // Check existing pending teacher
    const existingPendingTeacher = await prisma.pendingTeacher.findUnique({
      where: { email: normalizedEmail }
    });

    if (existingPendingTeacher) {
      return res.status(400).json({
        success: false,
        message: 'Email already added to the system'
      });
    }

    // Generate verification token
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Create pending teacher record with verification in a transaction
    const result = await prisma.$transaction(async (prisma) => {
      const pendingTeacher = await prisma.pendingTeacher.create({
        data: {
          email: normalizedEmail,
          adminId: req.user.id,
          verification: {
            create: {
              token: hashedToken,
              expires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
            }
          }
        },
        include: {
          verification: true
        }
      });
      return pendingTeacher;
    });

    // Send invitation email
    try {
      const invitationLink = `${process.env.FRONTEND_URL}/signup?token=${token}&email=${encodeURIComponent(normalizedEmail)}`;
      await sendInvitationEmail(normalizedEmail, invitationLink);
      console.log('Invitation email sent successfully');
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError);
      // Continue with the response even if email fails
    }

    res.status(201).json({
      success: true,
      message: 'Teacher added successfully and invitation email sent',
      data: {
        email: result.email,
        type: 'pending'
      }
    });

  } catch (error) {
    console.error('Teacher registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add teacher',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const getTeachers = async (req, res) => {
  try {
    console.log('Fetching teachers...');
    
    // First try to get active teachers
    console.log('Fetching active teachers...');
    const activeTeachers = await prisma.user.findMany({
      where: {
        role: 'PROFESSOR'
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        createdAt: true,
        isVerified: true,
        phoneNumber: true
      }
    });
    console.log('Active teachers found:', activeTeachers.length);

    // Then try to get pending teachers
    console.log('Fetching pending teachers...');
    const pendingTeachers = await prisma.pendingTeacher.findMany({
      select: {
        id: true,
        email: true,
        createdAt: true,
        admin: {
          select: {
            id: true,
            email: true
          }
        }
      }
    });
    console.log('Pending teachers found:', pendingTeachers.length);

    // Combine and format the results
    const teachers = [
      ...activeTeachers.map(teacher => ({
        ...teacher,
        name: `${teacher.firstName} ${teacher.lastName}`,
        type: 'active',
        status: teacher.isVerified ? 'Active' : 'Pending'
      })),
      ...pendingTeachers.map(teacher => ({
        ...teacher,
        name: 'Pending Registration',
        type: 'pending',
        status: 'Pending'
      }))
    ];

    console.log('Total teachers:', teachers.length);
    res.status(200).json({
      success: true,
      data: teachers
    });
  } catch (error) {
    console.error('Detailed error in getTeachers:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch teachers',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const getTeacherById = async (req, res) => {
  try {
    const { id } = req.params;
    const teacher = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        createdAt: true
      }
    });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    res.status(200).json({
      success: true,
      data: teacher
    });
  } catch (error) {
    console.error('Error fetching teacher:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch teacher',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const updateTeacher = async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const teacher = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true
      }
    });

    res.status(200).json({
      success: true,
      message: 'Teacher updated successfully',
      data: teacher
    });
  } catch (error) {
    console.error('Error updating teacher:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update teacher',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const deleteTeacher = async (req, res) => {
  const { id } = req.params;
  const { type } = req.query;

  try {
    console.log('Attempting to delete teacher:', { id, type });
    
    if (type === 'pending') {
      console.log('Deleting pending teacher');
      await prisma.pendingTeacher.delete({
        where: { id: parseInt(id, 10) }
      });
    } else {
      console.log('Deleting active teacher');
      const userId = parseInt(id, 10);
      
      // First check if user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          refreshTokens: true,
          surveillanceAssignments: true
        }
      });

      console.log('Found user:', user ? 'Yes' : 'No');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Teacher not found'
        });
      }

      console.log('Starting deletion transaction');
      // Delete related records in a transaction
      await prisma.$transaction(async (prisma) => {
        try {
          // Delete refresh tokens
          console.log('Deleting refresh tokens');
          await prisma.refreshToken.deleteMany({
            where: { userId }
          });

          // Delete surveillance assignments
          console.log('Deleting surveillance assignments');
          await prisma.surveillanceAssignment.deleteMany({
            where: { userId }
          });

          // Finally delete the user
          console.log('Deleting user');
          await prisma.user.delete({
            where: { id: userId }
          });
        } catch (transactionError) {
          console.error('Transaction error:', transactionError);
          throw transactionError;
        }
      });
    }

    console.log('Deletion successful');
    res.status(200).json({
      success: true,
      message: 'Teacher deleted successfully'
    });
  } catch (error) {
    console.error('Detailed error in deleteTeacher:', {
      name: error.name,
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack
    });
    
    // Handle specific Prisma errors
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to delete teacher',
      error: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        code: error.code,
        meta: error.meta
      } : undefined
    });
  }
};

export const resendInvitation = async (req, res) => {
  // Check if user is admin
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Only administrators can resend invitations'
    });
  }

  const { email } = req.body;

  try {
    // Find pending teacher
    const pendingTeacher = await prisma.pendingTeacher.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        verification: true
      }
    });

    if (!pendingTeacher) {
      return res.status(404).json({
        success: false,
        message: 'No pending teacher found with this email'
      });
    }

    // Generate new verification token
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Update verification record
    await prisma.verification.update({
      where: {
        id: pendingTeacher.verification[0].id
      },
      data: {
        token: hashedToken,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      }
    });

    // Send new invitation email
    const invitationLink = `${process.env.FRONTEND_URL}/signup?token=${token}&email=${encodeURIComponent(email)}`;
    await sendInvitationEmail(email, invitationLink);

    res.json({
      success: true,
      message: 'Invitation resent successfully'
    });

  } catch (error) {
    console.error('Error resending invitation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend invitation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const deletePendingTeacher = async (req, res) => {
  const { id } = req.params;
  try {
    const deleted = await prisma.pendingTeacher.delete({
      where: { id: parseInt(id, 10) }
    });
    res.status(200).json({
      success: true,
      message: 'Pending teacher deleted successfully',
      data: deleted
    });
  } catch (error) {
    console.error('Error deleting pending teacher:', error);
    res.status(404).json({
      success: false,
      message: 'Pending teacher not found'
    });
  }
};