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
import { extractScheduleData } from '../utils/scheduleParser.js';
import { importScheduleToDatabase } from '../utils/dbservice.js';
import mammoth from 'mammoth';
import xlsx from 'xlsx';
import { isAuthenticated, isAdmin } from '../middleware/auth.js';
import { upload, handleUploadError } from '../services/fileUploadService.js';
import FileProcessingService from '../services/fileProcessingService.js';
import ScheduleParser from '../utils/scheduleParser.js';

const prisma = new PrismaClient();
const router = express.Router();

// Ensure upload directories exist
const uploadDirs = {
  surveillance: 'uploads/surveillance',
  schedules: 'uploads/schedules'
};

Object.values(uploadDirs).forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Multer configuration for file uploads
const uploadMulter = multer({
  dest: uploadDirs.surveillance,
  fileFilter: (req, file, cb) => {
    // Check file extension
    const fileExtension = path.extname(file.originalname).toLowerCase();
    const validMimeTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/octet-stream',
      'application/pdf'
    ];

    console.log('File upload details:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      extension: fileExtension
    });

    if (fileExtension === '.docx' || fileExtension === '.pdf' || validMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only Microsoft Word (.docx) and PDF (.pdf) files are allowed'));
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
router.post('/surveillance/upload', authenticate, uploadMulter.single('file'), async (req, res) => {
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

// Schedule extraction route
router.post('/extract-schedule', authenticate, upload.single('file'), handleUploadError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    console.log('Processing file:', req.file.path);
    const result = await FileProcessingService.processFile(req.file.path);

    if (!result.success) {
      throw new Error(result.error);
    }

    res.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    console.error('Error processing schedule file:', error);
    res.status(500).json({
      success: false,
      message: `Error processing ${req.file?.mimetype === 'application/pdf' ? 'PDF' : 'DOCX'}: ${error.message}`
    });
  } finally {
    // Clean up the uploaded file
    if (req.file?.path) {
      try {
        await fs.promises.unlink(req.file.path);
      } catch (error) {
        console.error('Error cleaning up file:', error);
      }
    }
  }
});

// Function to create user schedules based on section schedules
async function createUserSchedules(scheduleData, year, semester) {
  try {
    const { scheduleEntries } = scheduleData;
    const specialityCode = scheduleData.headerInfo.speciality;
    const sectionLetter = scheduleData.headerInfo.section;

    // Get all professors for this speciality
    const professors = await prisma.user.findMany({
      where: {
        role: 'PROFESSOR',
        specialitiesTaught: {
          some: {
            name: specialityCode
          }
        }
      }
    });

    // Process each schedule entry
    for (const entry of scheduleEntries) {
      // Find the module
      const module = await prisma.module.findFirst({
        where: {
          name: entry.modules[0],
          academicYear: parseInt(year),
          semestre: semester === '1' ? 'SEMESTRE1' : 'SEMESTRE2'
        }
      });

      if (!module) continue;

      // Find the section
      const section = await prisma.section.findFirst({
        where: {
          name: `${sectionLetter}-G${entry.groups[0]}`,
          moduleId: module.id,
          academicYear: parseInt(year)
        }
      });

      if (!section) continue;

      // Find the professor
      const professor = professors.find(p => 
        entry.professors.some(profName => 
          p.name.toLowerCase().includes(profName.toLowerCase())
        )
      );

      if (!professor) continue;

      // Create or update schedule slot
      await prisma.scheduleSlot.upsert({
        where: {
          moduleId_sectionId_dayOfWeek_startTime: {
            moduleId: module.id,
            sectionId: section.id,
            dayOfWeek: entry.day,
            startTime: entry.timeSlot.split(' - ')[0]
          }
        },
        update: {
          ownerId: professor.id,
          endTime: entry.timeSlot.split(' - ')[1],
          isAvailable: false
        },
        create: {
          dayOfWeek: entry.day,
          startTime: entry.timeSlot.split(' - ')[0],
          endTime: entry.timeSlot.split(' - ')[1],
          isAvailable: false,
          ownerId: professor.id,
          moduleId: module.id,
          sectionId: section.id
        }
      });
    }
  } catch (error) {
    console.error('Error creating user schedules:', error);
    throw error;
  }
}

// Get all specialities
router.get('/specialities', authenticate, async (req, res) => {
  try {
    const specialities = await prisma.speciality.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        palier: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    res.json({
      success: true,
      specialities
    });
  } catch (error) {
    console.error('Error fetching specialities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch specialities'
    });
  }
});

// Route to import specialities from Excel
router.post('/import-specialities', isAuthenticated, isAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    if (!data || data.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'The Excel file is empty or has no data'
      });
    }

    // Validate required columns
    const firstRow = data[0];
    if (!firstRow['Palier'] || !firstRow['Specialités']) {
      return res.status(400).json({
        success: false,
        message: 'The Excel file must contain "Palier" and "Specialités" columns'
      });
    }

    const results = {
      total: data.length,
      imported: 0,
      skipped: 0,
      errors: []
    };

    // Process each row
    for (const row of data) {
      try {
        const palier = row['Palier']?.toString().trim();
        const speciality = row['Specialités']?.toString().trim();

        if (!palier || !speciality) {
          results.skipped++;
          results.errors.push(`Row ${results.imported + results.skipped}: Missing required fields`);
          continue;
        }

        // Validate palier
        if (!['LMD', 'ING', 'SIGL'].includes(palier)) {
          results.skipped++;
          results.errors.push(`Row ${results.imported + results.skipped}: Invalid palier "${palier}"`);
          continue;
        }

        // Create or update speciality
        await prisma.speciality.upsert({
          where: {
            name_palier: {
              name: speciality,
              palier: palier
            }
          },
          update: {
            description: row['Description']?.toString().trim() || null
          },
          create: {
            name: speciality,
            palier: palier,
            description: row['Description']?.toString().trim() || null
          }
        });

        results.imported++;
      } catch (error) {
        results.skipped++;
        results.errors.push(`Row ${results.imported + results.skipped}: ${error.message}`);
      }
    }

    // Clean up the uploaded file
    try {
      await fs.promises.unlink(req.file.path);
    } catch (error) {
      console.error('Error deleting temporary file:', error);
    }

    res.json({
      success: true,
      message: `Import completed: ${results.imported} imported, ${results.skipped} skipped`,
      results
    });
  } catch (error) {
    console.error('Error processing specialities file:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing file: ' + error.message
    });
  }
});

export default router;
