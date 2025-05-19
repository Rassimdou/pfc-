import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { authenticate } from '../middleware/authMiddleware.js';
import prisma from '../lib/prismaClient.js';
import mammoth from 'mammoth';
import fs from 'fs';
import nodemailer from 'nodemailer';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../../uploads/surveillance');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only Microsoft Word files are allowed'));
    }
  }
});

// Extract text from Word document
const extractText = (filePath) => new Promise((resolve, reject) => {
  mammoth.extractRawText({ path: filePath })
    .then(result => resolve(result.value))
    .catch(error => reject(error));
});

// Parse the extracted text into structured data
function parseScheduleText(text) {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);
  const assignments = [];
  let currentDate = null;
  let currentTime = null;

  for (const line of lines) {
    // Try to match date pattern (e.g., "Date: 2024-04-30")
    const dateMatch = line.match(/Date:\s*(\d{4}-\d{2}-\d{2})/i);
    if (dateMatch) {
      currentDate = dateMatch[1];
      continue;
    }

    // Try to match time pattern (e.g., "Time: 09:00")
    const timeMatch = line.match(/Time:\s*(\d{2}:\d{2})/i);
    if (timeMatch) {
      currentTime = timeMatch[1];
      continue;
    }

    // Try to match module and room pattern
    const moduleMatch = line.match(/([A-Za-z0-9\s]+)\s*-\s*([A-Za-z0-9\s]+)/);
    if (moduleMatch && currentDate && currentTime) {
      const [_, module, room] = moduleMatch;
      
      // Determine room type based on room name
      let roomType = 'SALLE_COURS';
      if (room.toLowerCase().includes('tp')) {
        roomType = 'SALLE_TP';
      } else if (room.toLowerCase().includes('td')) {
        roomType = 'SALLE_TD';
      }

      assignments.push({
        date: currentDate,
        time: currentTime,
        module: module.trim(),
        room: room.trim(),
        roomType
      });
    }
  }

  return assignments;
}

// GET /api/surveillance
router.get('/', authenticate, async (req, res) => {
  try {
    const assignments = await prisma.surveillanceAssignment.findMany({
      where: { userId: req.user.id },
      orderBy: { date: 'asc' }
    });
    res.json({ data: assignments });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

// GET /api/surveillance/files
router.get('/files', async (req, res) => {
  try {
    // For testing, use a hardcoded userId
    const userId = 1; // Replace with your test user ID
    const files = await prisma.surveillanceFile.findMany({
      where: { userId },
      orderBy: { uploadedAt: 'desc' }
    });
    res.json({ files });
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

// POST /api/surveillance/upload
router.post('/upload', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const filePath = req.file.path;
    const text = await extractText(filePath);
    const assignments = parseScheduleText(text);

    // Save file metadata
    const fileRecord = await prisma.surveillanceFile.create({
      data: {
        originalName: req.file.originalname,
        path: filePath,
        hash: req.file.filename,
        userId: req.user.id
      }
    });

    res.json({
      success: true,
      message: 'File processed successfully',
      assignments,
      fileId: fileRecord.id
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process file'
    });
  }
});

// POST /api/surveillance/confirm-upload
router.post('/confirm-upload', authenticate, async (req, res) => {
  try {
    const { assignments } = req.body;
    
    if (!Array.isArray(assignments)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid assignments data'
      });
    }

    const createdAssignments = await Promise.all(
      assignments.map(async (assignment) => {
        // Find or create module
        const module = await prisma.module.upsert({
          where: { code: assignment.module },
          update: {},
          create: {
            code: assignment.module,
            name: assignment.module,
            specialityId: 1 // Default speciality, adjust as needed
          }
        });

        return prisma.surveillanceAssignment.create({
          data: {
            date: new Date(assignment.date),
            time: assignment.time,
            module: assignment.module,
            room: assignment.room,
            roomType: assignment.roomType,
            userId: req.user.id,
            moduleId: module.id
          }
        });
      })
    );

    res.json({
      success: true,
      message: 'Assignments created successfully',
      assignments: createdAssignments
    });
  } catch (error) {
    console.error('Assignment creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create assignments'
    });
  }
});

// GET /api/surveillance/assignments
router.get('/assignments', authenticate, async (req, res) => {
  try {
    const assignments = await prisma.surveillanceAssignment.findMany({
      where: {
        userId: req.user.id
      },
      include: {
        moduleRef: true,
        fromSwapRequests: {
          include: {
            toAssignment: true
          }
        },
        toSwapRequests: {
          include: {
            fromAssignment: true
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
    console.error('Error fetching assignments:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch surveillance assignments' 
    });
  }
});

// Create swap request
router.post('/:assignmentId/swap-request', authenticate, async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { targetAssignmentId } = req.body;

    if (!targetAssignmentId) {
      return res.status(400).json({
        success: false,
        message: 'Target assignment ID is required'
      });
    }

    // Get the assignments
    const [fromAssignment, toAssignment] = await Promise.all([
      prisma.surveillanceAssignment.findUnique({
        where: { id: parseInt(assignmentId) },
        include: { user: true }
      }),
      prisma.surveillanceAssignment.findUnique({
        where: { id: parseInt(targetAssignmentId) },
        include: { user: true }
      })
    ]);

    if (!fromAssignment || !toAssignment) {
      return res.status(404).json({
        success: false,
        message: 'One or both assignments not found'
      });
    }

    // Verify the user owns the from assignment
    if (fromAssignment.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only request swaps for your own assignments'
      });
    }

    // Check if assignments are swappable
    if (!fromAssignment.canSwap || !toAssignment.canSwap) {
      return res.status(400).json({
        success: false,
        message: 'One or both assignments cannot be swapped'
      });
    }

    // Check if there's already a pending swap request
    const existingRequest = await prisma.surveillanceSwapRequest.findFirst({
      where: {
        OR: [
          { fromAssignmentId: parseInt(assignmentId) },
          { toAssignmentId: parseInt(assignmentId) }
        ],
        status: 'PENDING'
      }
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: 'There is already a pending swap request for one of these assignments'
      });
    }

    // Create the swap request
    const swapRequest = await prisma.surveillanceSwapRequest.create({
      data: {
        fromAssignmentId: parseInt(assignmentId),
        toAssignmentId: parseInt(targetAssignmentId),
        userId: req.user.id,
        status: 'PENDING'
      }
    });

    // Send email notification to the target teacher
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
      to: toAssignment.user.email,
      subject: 'New Surveillance Swap Request',
      html: `
        <h2>New Surveillance Swap Request</h2>
        <p>${fromAssignment.user.name} has requested to swap surveillance duties with you:</p>
        <h3>Your Current Assignment:</h3>
        <ul>
          <li><strong>Date:</strong> ${new Date(toAssignment.date).toLocaleDateString()}</li>
          <li><strong>Time:</strong> ${toAssignment.time}</li>
          <li><strong>Module:</strong> ${toAssignment.module}</li>
          <li><strong>Room:</strong> ${toAssignment.room}</li>
        </ul>
        <h3>Proposed Assignment:</h3>
        <ul>
          <li><strong>Date:</strong> ${new Date(fromAssignment.date).toLocaleDateString()}</li>
          <li><strong>Time:</strong> ${fromAssignment.time}</li>
          <li><strong>Module:</strong> ${fromAssignment.module}</li>
          <li><strong>Room:</strong> ${fromAssignment.room}</li>
        </ul>
        <p>Please log in to your account to accept or decline this request.</p>
      `
    });

    res.json({
      success: true,
      swapRequest
    });
  } catch (error) {
    console.error('Error creating swap request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create swap request'
    });
  }
});

// Accept swap request
router.post('/swap/:requestId/accept', authenticate, async (req, res) => {
  try {
    const { requestId } = req.params;

    // Get the swap request
    const swapRequest = await prisma.surveillanceSwapRequest.findUnique({
      where: { id: parseInt(requestId) },
      include: {
        fromAssignment: {
          include: { user: true }
        },
        toAssignment: {
          include: { user: true }
        }
      }
    });

    if (!swapRequest) {
      return res.status(404).json({
        success: false,
        message: 'Swap request not found'
      });
    }

    // Verify the user owns the to assignment
    if (swapRequest.toAssignment.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only accept swap requests for your own assignments'
      });
    }

    // Update the swap request status
    await prisma.surveillanceSwapRequest.update({
      where: { id: parseInt(requestId) },
      data: { status: 'APPROVED' }
    });

    // Swap the assignments
    await prisma.$transaction([
      prisma.surveillanceAssignment.update({
        where: { id: swapRequest.fromAssignmentId },
        data: { userId: swapRequest.toAssignment.userId }
      }),
      prisma.surveillanceAssignment.update({
        where: { id: swapRequest.toAssignmentId },
        data: { userId: swapRequest.fromAssignment.userId }
      })
    ]);

    // Send email notifications
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    // Notify both teachers
    await Promise.all([
      transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: swapRequest.fromAssignment.user.email,
        subject: 'Surveillance Swap Request Accepted',
        html: `
          <h2>Swap Request Accepted</h2>
          <p>Your surveillance swap request has been accepted.</p>
          <p>The assignments have been swapped successfully.</p>
        `
      }),
      transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: swapRequest.toAssignment.user.email,
        subject: 'Surveillance Swap Request Accepted',
        html: `
          <h2>Swap Request Accepted</h2>
          <p>You have accepted the surveillance swap request.</p>
          <p>The assignments have been swapped successfully.</p>
        `
      })
    ]);

    res.json({
      success: true,
      message: 'Swap request accepted successfully'
    });
  } catch (error) {
    console.error('Error accepting swap request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to accept swap request'
    });
  }
});

// Decline swap request
router.post('/swap/:requestId/decline', authenticate, async (req, res) => {
  try {
    const { requestId } = req.params;

    // Get the swap request
    const swapRequest = await prisma.surveillanceSwapRequest.findUnique({
      where: { id: parseInt(requestId) },
      include: {
        fromAssignment: {
          include: { user: true }
        },
        toAssignment: {
          include: { user: true }
        }
      }
    });

    if (!swapRequest) {
      return res.status(404).json({
        success: false,
        message: 'Swap request not found'
      });
    }

    // Verify the user owns the to assignment
    if (swapRequest.toAssignment.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only decline swap requests for your own assignments'
      });
    }

    // Update the swap request status
    await prisma.surveillanceSwapRequest.update({
      where: { id: parseInt(requestId) },
      data: { status: 'REJECTED' }
    });

    // Send email notification to the requester
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
      to: swapRequest.fromAssignment.user.email,
      subject: 'Surveillance Swap Request Declined',
      html: `
        <h2>Swap Request Declined</h2>
        <p>Your surveillance swap request has been declined.</p>
      `
    });

    res.json({
      success: true,
      message: 'Swap request declined successfully'
    });
  } catch (error) {
    console.error('Error declining swap request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to decline swap request'
    });
  }
});

// Cancel swap request
router.post('/swap/:requestId/cancel', authenticate, async (req, res) => {
  try {
    const { requestId } = req.params;

    // Get the swap request
    const swapRequest = await prisma.surveillanceSwapRequest.findUnique({
      where: { id: parseInt(requestId) },
      include: {
        fromAssignment: {
          include: { user: true }
        },
        toAssignment: {
          include: { user: true }
        }
      }
    });

    if (!swapRequest) {
      return res.status(404).json({
        success: false,
        message: 'Swap request not found'
      });
    }

    // Verify the user owns the from assignment
    if (swapRequest.fromAssignment.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only cancel your own swap requests'
      });
    }

    // Update the swap request status
    await prisma.surveillanceSwapRequest.update({
      where: { id: parseInt(requestId) },
      data: { status: 'CANCELLED' }
    });

    // Send email notification to the target teacher
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
      to: swapRequest.toAssignment.user.email,
      subject: 'Surveillance Swap Request Cancelled',
      html: `
        <h2>Swap Request Cancelled</h2>
        <p>The surveillance swap request has been cancelled by the requester.</p>
      `
    });

    res.json({
      success: true,
      message: 'Swap request cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling swap request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel swap request'
    });
  }
});

export default router;