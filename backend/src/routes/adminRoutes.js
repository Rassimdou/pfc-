import express from 'express';
import { 
  registerTeacher, 
  getTeachers,
  updateTeacher,
  deleteTeacher,
  getTeacherById,
  deletePendingTeacher
} from '../controllers/adminController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import multer from 'multer';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import nodemailer from 'nodemailer';

const prisma = new PrismaClient();
const router = express.Router();

// Ensure upload directory exists
const uploadDir = 'uploads/surveillance';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer configuration for file uploads
const upload = multer({
  dest: uploadDir,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/msword' || /\.doc$/.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Only Microsoft Word 97-2003 (.doc) files are allowed'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Teacher management routes
router.get('/teachers', authenticate, getTeachers);
router.get('/teachers/:id', authenticate, getTeacherById);
router.post('/teachers', authenticate, registerTeacher);
router.put('/teachers/:id', authenticate, updateTeacher);
router.delete('/teachers/:id', authenticate, deleteTeacher);
router.delete('/pending-teachers/:id', authenticate, deletePendingTeacher);

// Admin surveillance upload
router.post('/surveillance/upload', authenticate, upload.single('file'), async (req, res) => {
  try {
    const { teacherId, date, time, module, room, isResponsible } = req.body;
    const file = req.file;

    if (!teacherId || !date || !time || !module || !room) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Verify the teacher exists and get their modules
    const teacher = await prisma.user.findUnique({
      where: { id: parseInt(teacherId) },
      include: { taughtModules: true }
    });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    // Find the module
    const moduleRecord = await prisma.module.findFirst({
      where: {
        OR: [
          { code: module },
          { name: module }
        ]
      }
    });

    if (!moduleRecord) {
      return res.status(404).json({
        success: false,
        message: 'Module not found'
      });
    }

    // Create surveillance assignment
    const assignment = await prisma.surveillanceAssignment.create({
      data: {
        userId: parseInt(teacherId),
        date: new Date(date),
        time: time,
        module: module,
        room: room,
        isResponsible: isResponsible === 'true',
        canSwap: !isResponsible,
        moduleId: moduleRecord.id
      }
    });

    // Save file metadata if a file was uploaded
    if (file) {
      await prisma.surveillanceFile.create({
        data: {
          userId: parseInt(teacherId),
          originalName: file.originalname,
          path: file.path,
          uploadedAt: new Date()
        }
      });
    }

    // Send email notification
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    await transporter.sendMail({
      from: `"USTHB-Xchange" <${process.env.SMTP_USER}>`,
      to: teacher.email,
      subject: 'New Surveillance Assignment',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #059669;">New Surveillance Assignment</h2>
          <p>You have been assigned a new surveillance duty:</p>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Date:</strong> ${new Date(date).toLocaleDateString()}</p>
            <p><strong>Time:</strong> ${time}</p>
            <p><strong>Module:</strong> ${module}</p>
            <p><strong>Room:</strong> ${room}</p>
            <p><strong>Role:</strong> ${isResponsible === 'true' ? 'Responsible' : 'Assistant'}</p>
          </div>
          <p>Please log in to your dashboard to view more details.</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            This is an automated message, please do not reply to this email.
          </p>
        </div>
      `
    });

    res.json({
      success: true,
      message: 'Surveillance assignment created successfully',
      assignment
    });

  } catch (error) {
    console.error('Error creating surveillance assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create surveillance assignment'
    });
  }
});

// Get all surveillance assignments
router.get('/surveillance', authenticate, async (req, res) => {
  try {
    const assignments = await prisma.surveillanceAssignment.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        fromSwapRequests: {
          where: {
            status: 'PENDING'
          },
          select: {
            id: true,
            status: true
          }
        },
        toSwapRequests: {
          where: {
            status: 'PENDING'
          },
          select: {
            id: true,
            status: true
          }
        }
      },
      orderBy: {
        date: 'asc'
      }
    });

    res.json({
      success: true,
      assignments: assignments.map(assignment => ({
        ...assignment,
        swapRequest: assignment.fromSwapRequests[0] || assignment.toSwapRequests[0]
      }))
    });
  } catch (error) {
    console.error('Error fetching surveillance assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch surveillance assignments'
    });
  }
});

// Create new surveillance assignment
router.post('/surveillance', authenticate, async (req, res) => {
  try {
    const { teacherId, date, time, module, room, isResponsible } = req.body;

    if (!teacherId || !date || !time || !module || !room) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Verify the teacher exists and get their modules
    const teacher = await prisma.user.findUnique({
      where: { id: parseInt(teacherId) },
      include: { taughtModules: true }
    });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    // Find the module
    const moduleRecord = await prisma.module.findFirst({
      where: {
        OR: [
          { code: module },
          { name: module }
        ]
      }
    });

    if (!moduleRecord) {
      return res.status(404).json({
        success: false,
        message: 'Module not found'
      });
    }

    // Create surveillance assignment
    const assignment = await prisma.surveillanceAssignment.create({
      data: {
        userId: parseInt(teacherId),
        date: new Date(date),
        time,
        module,
        room,
        isResponsible: isResponsible === true,
        canSwap: !isResponsible,
        moduleId: moduleRecord.id
      }
    });

    // Send email notification to the teacher
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: teacher.email,
      subject: 'New Surveillance Assignment',
      html: `
        <h2>New Surveillance Assignment</h2>
        <p>You have been assigned to a new surveillance duty:</p>
        <ul>
          <li><strong>Date:</strong> ${new Date(date).toLocaleDateString()}</li>
          <li><strong>Time:</strong> ${time}</li>
          <li><strong>Module:</strong> ${module}</li>
          <li><strong>Room:</strong> ${room}</li>
          <li><strong>Role:</strong> ${isResponsible ? 'Responsible' : 'Assistant'}</li>
        </ul>
        <p>Please log in to your account to view more details.</p>
      `
    });

    res.json({
      success: true,
      assignment
    });
  } catch (error) {
    console.error('Error creating surveillance assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create surveillance assignment'
    });
  }
});

// Update surveillance assignment
router.put('/surveillance/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { date, time, module, room, isResponsible } = req.body;

    const assignment = await prisma.surveillanceAssignment.update({
      where: { id: parseInt(id) },
      data: {
        date: date ? new Date(date) : undefined,
        time,
        module,
        room,
        isResponsible: isResponsible === true,
        canSwap: !isResponsible
      }
    });

    res.json({
      success: true,
      assignment
    });
  } catch (error) {
    console.error('Error updating surveillance assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update surveillance assignment'
    });
  }
});

// Delete surveillance assignment
router.delete('/surveillance/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.surveillanceAssignment.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'Surveillance assignment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting surveillance assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete surveillance assignment'
    });
  }
});

// Get all exchange history
router.get('/exchanges', authenticate, async (req, res) => {
  try {
    const exchanges = await prisma.exchange.findMany({
      include: {
        initiator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        receiver: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: exchanges
    });
  } catch (error) {
    console.error('Error fetching exchanges:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch exchange history'
    });
  }
});

// Get all modules
router.get('/modules', authenticate, async (req, res) => {
  try {
    const modules = await prisma.module.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        academicYear: true,
        palier: true,
        semestre: true,
        speciality: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: [
        { academicYear: 'desc' },
        { code: 'asc' }
      ]
    });

    res.json({
      success: true,
      modules
    });
  } catch (error) {
    console.error('Error fetching modules:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch modules'
    });
  }
});

export default router;
