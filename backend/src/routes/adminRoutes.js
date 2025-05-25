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

// Get all classrooms
router.get('/classrooms', authenticate, async (req, res) => {
  try {
    const rooms = await prisma.room.findMany({
      orderBy: {
        name: 'asc'
      }
    });

    res.json({
      success: true,
      data: rooms
    });
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch rooms'
    });
  }
});

// Create a new classroom
router.post('/classrooms', authenticate, async (req, res) => {
  try {
    const { name, type, capacity, floor, building } = req.body;

    // Generate a room number if not provided
    const roomNumber = name || `ROOM-${Date.now()}`;

    const classroom = await prisma.room.create({
      data: {
        name,
        number: roomNumber,
        type,
        capacity: capacity ? parseInt(capacity) : null,
        floor: floor ? parseInt(floor) : null,
        building,
        isAvailable: true
      }
    });

    res.json({
      success: true,
      data: classroom
    });
  } catch (error) {
    console.error('Error creating classroom:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create classroom'
    });
  }
});

// Update a classroom
router.put('/classrooms/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, capacity, floor, building, isAvailable } = req.body;

    const classroom = await prisma.room.update({
      where: { id: parseInt(id) },
      data: {
        name,
        type,
        capacity: capacity ? parseInt(capacity) : null,
        floor: floor ? parseInt(floor) : null,
        building,
        isAvailable
      }
    });

    res.json({
      success: true,
      data: classroom
    });
  } catch (error) {
    console.error('Error updating classroom:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update classroom'
    });
  }
});

// Delete a classroom
router.delete('/classrooms/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if classroom is being used in any schedules
    const schedules = await prisma.scheduleSlot.findMany({
      where: { roomId: parseInt(id) }
    });

    if (schedules.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete classroom as it is being used in schedules'
      });
    }

    await prisma.room.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'Classroom deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting classroom:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete classroom'
    });
  }
});

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
        time,
        module,
        room,
        isResponsible: isResponsible === true || isResponsible === 'true',
        canSwap: !(isResponsible === true || isResponsible === 'true'),
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
            <p><strong>Role:</strong> ${isResponsible === true || isResponsible === 'true' ? 'Responsible' : 'Assistant'}</p>
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

// Get surveillance assignments for a specific teacher
router.get('/surveillance/teacher/:teacherId', authenticate, async (req, res) => {
  try {
    const { teacherId } = req.params;

    // Verify the teacher exists
    const teacher = await prisma.user.findUnique({
      where: { id: parseInt(teacherId) }
    });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    const assignments = await prisma.surveillanceAssignment.findMany({
      where: {
        userId: parseInt(teacherId)
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
    console.error('Error fetching teacher surveillance assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch teacher surveillance assignments'
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
        ${isResponsible ? 
          '<p><strong>Note:</strong> As the responsible teacher, this assignment cannot be swapped.</p>' : 
          '<p><strong>Note:</strong> As an assistant, you can request to swap this assignment with other teachers.</p>'
        }
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
    const exchanges = await prisma.surveillanceSwapRequest.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        fromAssignment: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
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
                email: true
              }
            }
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
router.get('/modules', async (req, res) => {
  try {
    const modules = await prisma.module.findMany({
      include: {
        speciality: true,
        year: true,
        palier: true
      }
    });
    res.json({ success: true, data: modules });
  } catch (error) {
    console.error('Error fetching modules:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch modules' });
  }
});

// Schedule extraction route
router.post('/extract-schedule', authenticate, upload.single('file'), handleUploadError, async (req, res) => {
  let uploadedFile = null;
  try {
    if (!req.file) {
      console.error('No file uploaded');
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    uploadedFile = req.file;
    console.log('Processing file:', {
      path: uploadedFile.path,
      originalname: uploadedFile.originalname,
      mimetype: uploadedFile.mimetype,
      size: uploadedFile.size
    });

    // Verify file exists
    try {
      await fs.promises.access(uploadedFile.path);
      console.log('File exists and is accessible');
    } catch (error) {
      console.error('File not found or not accessible:', error);
      throw new Error(`File not found or not accessible: ${error.message}`);
    }

    // Process the file
    console.log('Starting file processing');
    const result = await FileProcessingService.processFile(uploadedFile.path);
    console.log('File processing completed:', {
      success: result.success,
      hasData: !!result.data,
      error: result.error
    });

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
      message: `Error processing ${uploadedFile?.mimetype === 'application/pdf' ? 'PDF' : 'DOCX'}: ${error.message}`,
      details: {
        stack: error.stack,
        timestamp: new Date().toISOString()
      }
    });
  } finally {
    // Clean up the uploaded file
    if (uploadedFile?.path) {
      try {
        await fs.promises.unlink(uploadedFile.path);
        console.log('Uploaded file cleaned up successfully');
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

        // First find or create the palier
        const palierRecord = await prisma.palier.upsert({
          where: {
            name: 'LMD' // Default palier name
          },
          update: {},
          create: {
            name: 'LMD'
          }
        });

        console.log('Found or created palier:', palierRecord);

        // Then find or create the year using the palier ID
        const year = await prisma.year.upsert({
          where: {
            name_palierId: {
              name: String(palier),
              palierId: palierRecord.id
            }
          },
          update: {},
          create: {
            name: String(palier),
            palierId: palierRecord.id
          }
        });

        console.log('Found or created year:', year);

        // Then find or create speciality using the year ID
        const specialityRecord = await prisma.speciality.upsert({
          where: {
            name_palierId_yearId: {
              name: speciality,
              palierId: palierRecord.id,
              yearId: year.id
            }
          },
          update: {},
          create: {
            name: speciality,
            palierId: palierRecord.id,
            yearId: year.id
          }
        });

        console.log('Found or created speciality:', specialityRecord);

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

// Add new endpoint to fetch sections by speciality and year
router.get('/sections', authenticate, async (req, res) => {
  try {
    const { speciality: specialityName, year: academicYear } = req.query;

    if (!specialityName || !academicYear) {
      return res.status(400).json({
        success: false,
        message: 'Speciality and year are required query parameters'
      });
    }

    // Find the speciality and year to get their IDs
    const speciality = await prisma.speciality.findFirst({
      where: { name: specialityName }
    });

     // Find the academic year record
     const yearRecord = await prisma.year.findFirst({
      where: { name: academicYear.toString() } // Assuming academicYear is a number
    });

    if (!speciality || !yearRecord) {
       // Attempt to find by academic year as integer if parsing failed
       const yearRecordInt = await prisma.year.findFirst({
           where: { name: parseInt(academicYear) } // Try parsing as integer
       });

       if(!speciality || !yearRecordInt){
            return res.status(404).json({
               success: false,
               message: 'Speciality or year not found'
            });
       }
        // Use the found integer year record if found
        yearRecord = yearRecordInt;
    }

    // Fetch sections linked to modules of this speciality and year
    const sections = await prisma.section.findMany({
      where: {
        academicYear: parseInt(academicYear), // Filter by academic year (integer)
        module: {
          specialityId: speciality.id,
        }
      },
      select: {
        id: true,
        name: true,
        // Include other relevant section data if needed
      },
      distinct: ['name'], // Get unique section names
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      sections
    });

  } catch (error) {
    console.error('Error fetching sections:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sections: ' + error.message
    });
  }
});

// Add new endpoints for managing section schedules (ScheduleSlot)

// Get schedule slots by section, speciality, year, and semester
router.get('/schedules/section', authenticate, async (req, res) => {
  try {
    const { section: sectionName, speciality: specialityName, year: academicYear, semester } = req.query;

    console.log('Received request with params:', { sectionName, specialityName, academicYear, semester });

    if (!sectionName || !specialityName || !academicYear || !semester) {
      return res.status(400).json({
        success: false,
        message: 'Section, speciality, year, and semester are required query parameters'
      });
    }

    // Find the speciality with a more flexible search
    const speciality = await prisma.speciality.findFirst({
      where: {
        OR: [
          { name: specialityName },
          { name: specialityName.replace(/\+/g, ' ') },
          { name: { contains: specialityName.replace(/\+/g, ' ') } },
          { name: { contains: specialityName } }
        ]
      }
    });

    console.log('Found speciality:', speciality);

    // Convert academicYear to string for the query
    const yearRecord = await prisma.year.findFirst({
      where: { 
        OR: [
          { name: academicYear.toString() },
          { name: academicYear },
          { name: parseInt(academicYear).toString() },
          { name: `First Year` },
          { name: `Second Year` },
          { name: `Third Year` },
          { name: `Fourth Year` },
          { name: `Fifth Year` }
        ]
      }
    });

    console.log('Found year record:', yearRecord);

    if (!speciality || !yearRecord) {
      console.log('Missing speciality or year:', { speciality, yearRecord });
      return res.status(404).json({
        success: false,
        message: 'Speciality or year not found',
        details: {
          specialityFound: !!speciality,
          yearFound: !!yearRecord,
          searchedSpeciality: specialityName,
          searchedYear: academicYear
        }
      });
    }

    // Find modules for this speciality, year, and semester
    const modules = await prisma.module.findMany({
      where: {
        specialityId: speciality.id,
        academicYear: parseInt(academicYear),
        semestre: semester.toUpperCase()
      },
      select: { id: true }
    });

    console.log('Found modules:', modules);

    if (modules.length === 0) {
      return res.json({ success: true, scheduleSlots: [] });
    }

    const moduleIds = modules.map(m => m.id);

    // Find the section within these modules
    const section = await prisma.section.findFirst({
      where: {
        name: sectionName,
        academicYear: parseInt(academicYear),
        moduleId: { in: moduleIds }
      },
      select: { id: true }
    });

    console.log('Found section:', section);

    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section not found for the given criteria',
        details: {
          sectionName,
          academicYear,
          moduleIds
        }
      });
    }

    // Fetch schedule slots for the found section
    const scheduleSlots = await prisma.scheduleSlot.findMany({
      where: {
        sectionId: section.id,
      },
      include: {
        module: { select: { code: true, name: true } },
        owner: { select: { name: true } },
        room: { select: { number: true, type: true } },
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' },
      ]
    });

    console.log('Found schedule slots:', scheduleSlots.length);

    res.json({
      success: true,
      scheduleSlots
    });

  } catch (error) {
    console.error('Error fetching section schedules:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch section schedules: ' + error.message
    });
  }
});

// Add a new schedule slot for a section
router.post('/schedules/section', authenticate, async (req, res) => {
  try {
    const { section: sectionName, speciality: specialityName, year: academicYear, semester, day, timeSlot, module: moduleName, professor: professorName, room: roomNumber, type, groups } = req.body;

    if (!sectionName || !specialityName || !academicYear || !semester || !day || !timeSlot || !moduleName || !professorName || !roomNumber || !type || !groups) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided'
      });
    }

    // First find or create the palier
    const palierRecord = await prisma.palier.upsert({
      where: {
        name: 'LMD' // Default palier name
      },
      update: {},
      create: {
        name: 'LMD'
      }
    });

    console.log('Found or created palier:', palierRecord);

    // Then find or create the year using the palier ID
    const year = await prisma.year.upsert({
      where: {
        name_palierId: {
          name: String(academicYear),
          palierId: palierRecord.id
        }
      },
      update: {},
      create: {
        name: String(academicYear),
        palierId: palierRecord.id
      }
    });

    console.log('Found or created year:', year);

    // Then find or create speciality using the year ID
    const speciality = await prisma.speciality.upsert({
      where: {
        name_palierId_yearId: {
          name: specialityName,
          palierId: palierRecord.id,
          yearId: year.id
        }
      },
      update: {},
      create: {
        name: specialityName,
        palierId: palierRecord.id,
        yearId: year.id
      }
    });

    console.log('Found or created speciality:', speciality);

     const module = await prisma.module.upsert({
        where: { code: moduleName, academicYear: parseInt(academicYear) }, // Assuming moduleName is code or unique identifier
        update: {},
        create: {
            code: moduleName,
            name: moduleName, // Or infer name if code is used
            academicYear: parseInt(academicYear),
            palierId: speciality.palierId, // Inherit from speciality
            yearId: year.id, // Link to year record
            semestre: semester.toUpperCase(),
            specialityId: speciality.id,
        }
    });

    const section = await prisma.section.upsert({
        where: { name: sectionName, moduleId: module.id, academicYear: parseInt(academicYear) },
        update: {},
        create: { name: sectionName, moduleId: module.id, academicYear: parseInt(academicYear) }
    });

    const professor = await prisma.user.upsert({
      where: { email: `${professorName.toLowerCase().replace(/\s+/g, '.')}}@usthb.dz` }, // Assuming email format
      update: { name: professorName },
      create: { name: professorName, email: `${professorName.toLowerCase().replace(/\s+/g, '.')}}@usthb.dz`, role: 'PROFESSOR' }
    });

    const room = await prisma.room.upsert({
      where: { number: roomNumber },
      update: {},
      create: { number: roomNumber, name: `Room ${roomNumber}`, type: type.toUpperCase(), capacity: 0 } // Default capacity/name
    });

    // Create the schedule slot
    const scheduleSlot = await prisma.scheduleSlot.create({
      data: {
        dayOfWeek: day.toUpperCase(),
        startTime: timeSlot.split(' - ')[0],
        endTime: timeSlot.split(' - ')[1] || timeSlot.split(' - ')[0], // Handle single time entry
        type: type.toUpperCase(),
        group: groups.join(','), // Store groups as comma-separated string
        ownerId: professor.id,
        moduleId: module.id,
        sectionId: section.id,
        roomId: room.id,
        isAvailable: false, // Manually added schedules are initially not available for swaps
      }
    });

    res.json({
      success: true,
      scheduleSlot
    });

  } catch (error) {
    console.error('Error adding section schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add section schedule: ' + error.message
    });
  }
});

// Update a schedule slot for a section
router.put('/schedules/section/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { day, timeSlot, module: moduleName, professor: professorName, room: roomNumber, type, groups } = req.body;

    // Find related entities based on updated data
    const module = moduleName ? await prisma.module.findFirst({ where: { code: moduleName } }) : undefined; // Assuming moduleName is code
    const professor = professorName ? await prisma.user.findFirst({ where: { email: `${professorName.toLowerCase().replace(/\s+/g, '.')}}@usthb.dz` } }) : undefined; // Assuming email format
    const room = roomNumber ? await prisma.room.findFirst({ where: { number: roomNumber } }) : undefined;

    const updatedScheduleSlot = await prisma.scheduleSlot.update({
      where: { id: parseInt(id) },
      data: {
        dayOfWeek: day ? day.toUpperCase() : undefined,
        startTime: timeSlot ? timeSlot.split(' - ')[0] : undefined,
        endTime: timeSlot ? (timeSlot.split(' - ')[1] || timeSlot.split(' - ')[0]) : undefined,
        type: type ? type.toUpperCase() : undefined,
        group: groups ? groups.join(',') : undefined,
        ownerId: professor?.id,
        moduleId: module?.id,
        roomId: room?.id,
      },
      include: { // Include related data in the response
        module: { select: { code: true, name: true } },
        owner: { select: { name: true } },
        room: { select: { number: true, type: true } },
      }
    });

    res.json({
      success: true,
      scheduleSlot: updatedScheduleSlot
    });

  } catch (error) {
    console.error('Error updating section schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update section schedule: ' + error.message
    });
  }
});

// Delete a schedule slot for a section
router.delete('/schedules/section/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.scheduleSlot.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'Section schedule deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting section schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete section schedule: ' + error.message
    });
  }
});

// Bulk import schedule slots for a section
router.post('/schedules/section/bulk', async (req, res) => {
  try {
    console.log('Received bulk import request:', {
      specialityName: req.body.specialityName,
      academicYear: req.body.academicYear,
      semester: req.body.semester,
      sectionName: req.body.sectionName,
      scheduleEntriesCount: req.body.scheduleEntries?.length
    });

    const { specialityName, academicYear, semester, sectionName, scheduleEntries } = req.body;

    // Validate required fields
    if (!specialityName || !academicYear || !semester || !sectionName || !scheduleEntries) {
      console.log('Missing required fields:', {
        specialityName: !!specialityName,
        academicYear: !!academicYear,
        semester: !!semester,
        sectionName: !!sectionName,
        scheduleEntries: !!scheduleEntries
      });
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // First find or create the palier
    const palierRecord = await prisma.palier.upsert({
      where: {
        name: 'LMD' // Default palier name
      },
      update: {},
      create: {
        name: 'LMD'
      }
    });

    console.log('Found or created palier:', palierRecord);

    // Then find or create the year using the palier ID
    const year = await prisma.year.upsert({
      where: {
        name_palierId: {
          name: String(academicYear),
          palierId: palierRecord.id
        }
      },
      update: {},
      create: {
        name: String(academicYear),
        palierId: palierRecord.id
      }
    });

    console.log('Found or created year:', year);

    // Then find or create speciality using the year ID
    const speciality = await prisma.speciality.upsert({
      where: {
        name_palierId_yearId: {
          name: specialityName,
          palierId: palierRecord.id,
          yearId: year.id
        }
      },
      update: {},
      create: {
        name: specialityName,
        palierId: palierRecord.id,
        yearId: year.id
      }
    });

    console.log('Found or created speciality:', speciality);

    // Process each schedule entry
    let totalEntries = 0;
    let successfulEntries = 0;
    let errors = [];

    for (const entry of scheduleEntries) {
      try {
        console.log('Processing entry:', entry);

        // Find or create module
        const module = await prisma.module.upsert({
          where: {
            name: entry.module
          },
          update: {},
          create: {
            name: entry.module,
            code: entry.module,
            specialityId: speciality.id,
            yearId: year.id,
            semester: semester.toUpperCase()
          }
        });

        console.log('Found/created module:', module);

        // Find or create section
        const section = await prisma.section.upsert({
          where: {
            name_specialityId: {
              name: sectionName,
              specialityId: speciality.id
            }
          },
          update: {},
          create: {
            name: sectionName,
            specialityId: speciality.id,
            yearId: year.id
          }
        });

        console.log('Found/created section:', section);

        // Find or create professor
        const professor = await prisma.professor.upsert({
          where: {
            name: entry.professor
          },
          update: {},
          create: {
            name: entry.professor,
            email: `${entry.professor.toLowerCase().replace(/\s+/g, '.')}@univ.com`
          }
        });

        console.log('Found/created professor:', professor);

        // Find or create room
        const room = await prisma.room.upsert({
          where: {
            number: entry.room
          },
          update: {},
          create: {
            number: entry.room,
            type: 'SALLE_COURS',
            capacity: 30
          }
        });

        console.log('Found/created room:', room);

        // Create schedule slot
        const scheduleSlot = await prisma.scheduleSlot.create({
          data: {
            day: entry.day,
            timeSlot: entry.timeSlot,
            type: entry.type || 'COURSE',
            moduleId: module.id,
            professorId: professor.id,
            roomId: room.id,
            sectionId: section.id,
            groups: entry.groups || []
          }
        });

        console.log('Created schedule slot:', scheduleSlot);
        successfulEntries++;
      } catch (error) {
        console.error('Error processing entry:', error);
        errors.push({
          entry,
          error: error.message
        });
      }
      totalEntries++;
    }

    console.log('Import completed:', {
      totalEntries,
      successfulEntries,
      errorCount: errors.length
    });

    return res.json({
      success: true,
      message: 'Schedule imported successfully',
      stats: {
        totalEntries,
        successfulEntries,
        errorCount: errors.length
      },
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Error in bulk import:', error);
    return res.status(500).json({
      success: false,
      message: 'Error importing schedule',
      error: error.message
    });
  }
});

// Module Management Routes
router.post('/modules', async (req, res) => {
  try {
    const { code, name, description, academicYear, palierId, yearId, specialityId, semestre } = req.body;

    // Validate required fields
    if (!code || !name || !specialityId || !yearId || !palierId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Check if module code already exists
    const existingModule = await prisma.module.findFirst({
      where: { code }
    });

    if (existingModule) {
      return res.status(400).json({
        success: false,
        message: 'Module code already exists'
      });
    }

    const module = await prisma.module.create({
      data: {
        code,
        name,
        description,
        academicYear: academicYear || new Date().getFullYear(),
        palierId: parseInt(palierId),
        yearId: parseInt(yearId),
        specialityId: parseInt(specialityId),
        semestre: semestre || 'SEMESTRE1'
      },
      include: {
        speciality: true,
        year: true,
        palier: true
      }
    });

    res.json({ success: true, data: module });
  } catch (error) {
    console.error('Error creating module:', error);
    res.status(500).json({ success: false, message: 'Failed to create module' });
  }
});

router.put('/modules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, description, academicYear, palierId, yearId, specialityId, semestre } = req.body;

    // Validate required fields
    if (!code || !name || !specialityId || !yearId || !palierId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Check if module exists
    const existingModule = await prisma.module.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingModule) {
      return res.status(404).json({
        success: false,
        message: 'Module not found'
      });
    }

    // Check if new code conflicts with existing modules
    if (code !== existingModule.code) {
      const codeExists = await prisma.module.findFirst({
        where: {
          code,
          id: { not: parseInt(id) }
        }
      });

      if (codeExists) {
        return res.status(400).json({
          success: false,
          message: 'Module code already exists'
        });
      }
    }

    const updatedModule = await prisma.module.update({
      where: { id: parseInt(id) },
      data: {
        code,
        name,
        description,
        academicYear: academicYear || existingModule.academicYear,
        palierId: parseInt(palierId),
        yearId: parseInt(yearId),
        specialityId: parseInt(specialityId),
        semestre: semestre || existingModule.semestre
      },
      include: {
        speciality: true,
        year: true,
        palier: true
      }
    });

    res.json({ success: true, data: updatedModule });
  } catch (error) {
    console.error('Error updating module:', error);
    res.status(500).json({ success: false, message: 'Failed to update module' });
  }
});

router.delete('/modules/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if module exists
    const module = await prisma.module.findUnique({
      where: { id: parseInt(id) }
    });

    if (!module) {
      return res.status(404).json({
        success: false,
        message: 'Module not found'
      });
    }

    // Check if module is being used in any schedules
    const scheduleSlots = await prisma.scheduleSlot.findFirst({
      where: { moduleId: parseInt(id) }
    });

    if (scheduleSlots) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete module as it is being used in schedules'
      });
    }

    await prisma.module.delete({
      where: { id: parseInt(id) }
    });

    res.json({ success: true, message: 'Module deleted successfully' });
  } catch (error) {
    console.error('Error deleting module:', error);
    res.status(500).json({ success: false, message: 'Failed to delete module' });
  }
});

export default router;

