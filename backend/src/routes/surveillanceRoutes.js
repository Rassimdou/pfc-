import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { isAuthenticated } from '../middleware/auth.js';
import prisma from '../lib/prismaClient.js';
import mammoth from 'mammoth';
import fs from 'fs';
import nodemailer from 'nodemailer';
import { JSDOM } from 'jsdom';
import { createSwapRequest, getPendingSwapRequests } from '../controllers/surveillanceController.js';
import { sendSwapRequestNotification } from '../services/emailService.js';

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
    const allowedTypes = ['.doc', '.docx', '.pdf', '.html', '.htm']; // Added more formats
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only Microsoft Word, PDF, and HTML files are allowed'));
    }
  }
});

// Extract content from document
async function extractDocumentContent(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  
  if (ext === '.doc' || ext === '.docx') {
    // For Word documents, extract both text and HTML
    const [textResult, htmlResult] = await Promise.all([
      mammoth.extractRawText({ path: filePath }),
      mammoth.convertToHtml({ path: filePath })
    ]);
    
    return {
      text: textResult.value,
      html: htmlResult.value
    };
  } else if (ext === '.html' || ext === '.htm') {
    // For HTML files, read the content directly
    const html = fs.readFileSync(filePath, 'utf8');
    const dom = new JSDOM(html);
    return {
      text: dom.window.document.body.textContent,
      html: html
    };
  } else if (ext === '.pdf') {
    // For PDF files, you would need a PDF parsing library
    // This is a placeholder for PDF parsing
    throw new Error('PDF parsing not implemented yet');
  } else {
    throw new Error('Unsupported file format');
  }
}

// Parse surveillance assignments from document
function parseExamSchedule(content) {
  // First try to parse from HTML if available
  if (content.html) {
    const htmlAssignments = parseTableFromHtml(content.html);
    if (htmlAssignments.length > 0) {
      return htmlAssignments;
    }
  }
  
  // Fall back to text parsing
  return parseTableFromText(content.text);
}

// Parse table from HTML content
function parseTableFromHtml(html) {
  const assignments = [];
  const dom = new JSDOM(html);
  const tables = dom.window.document.querySelectorAll('table');
  
  // Find the table with date, time, module, and room columns
  for (const table of tables) {
    const rows = table.querySelectorAll('tr');
    let headerRow = rows[0];
    let headerCells = headerRow?.querySelectorAll('th, td');
    
    // Check if this table has our expected headers
    const headerTexts = Array.from(headerCells || []).map(cell => cell.textContent.trim().toLowerCase());
    const hasDateHeader = headerTexts.some(text => text.includes('date'));
    const hasTimeHeader = headerTexts.some(text => 
      text.includes('horaire') || text.includes('heure') || text.includes('time')
    );
    const hasModuleHeader = headerTexts.some(text => text.includes('module'));
    const hasRoomHeader = headerTexts.some(text => 
      text.includes('local') || text.includes('salle') || text.includes('room')
    );
    
    if (hasDateHeader && hasTimeHeader && hasModuleHeader && hasRoomHeader) {
      // Found our table! Now extract data from each row
      for (let i = 1; i < rows.length; i++) {
        const cells = rows[i].querySelectorAll('td');
        if (cells.length >= 4) {
          const date = cells[0].textContent.trim();
          const time = cells[1].textContent.trim();
          const module = cells[2].textContent.trim();
          const room = cells[3].textContent.trim();
          
          if (date && time && module && room) {
            // Format date properly
            let formattedDate = formatDate(date);
            
            // Determine room type
            const roomType = determineRoomType(room);
            
            assignments.push({
              date: formattedDate,
              time: time,
              module: module,
              room: room,
              roomType
            });
          }
        }
      }
      
      if (assignments.length > 0) {
        return assignments;
      }
    }
  }
  
  return assignments;
}

// Parse table from text content
function parseTableFromText(text) {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);
  const assignments = [];
  
  // Find the table section in the text
  let inTable = false;
  let headerFound = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if we've reached the table header
    const isHeaderLine = 
      (line.toLowerCase().includes('date') && 
       (line.toLowerCase().includes('horaire') || line.toLowerCase().includes('heure')) && 
       line.toLowerCase().includes('module') && 
       (line.toLowerCase().includes('local') || line.toLowerCase().includes('salle')));
    
    if (!headerFound && isHeaderLine) {
      headerFound = true;
      inTable = true;
      continue;
    }
    
    // Skip lines until we find the header
    if (!headerFound) {
      continue;
    }
    
    // Check if we've reached the end of the table
    if (inTable && (line.startsWith('NB') || line.startsWith('N.B') || line.length < 10)) {
      inTable = false;
      continue;
    }
    
    // Process table rows
    if (inTable) {
      // Skip empty rows
      if (!line || line.trim() === '') continue;
      
      // Try to extract the 4 columns
      const columns = extractColumnsFromLine(line);
      
      if (columns.length >= 4) {
        const date = columns[0];
        const time = columns[1];
        const module = columns[2];
        const room = columns[3];
        
        // Format date properly
        let formattedDate = formatDate(date);
        
        // Determine room type
        const roomType = determineRoomType(room);
        
        assignments.push({
          date: formattedDate,
          time: time,
          module: module,
          room: room,
          roomType
        });
      }
    }
  }
  
  return assignments;
}

// Extract columns from a text line
function extractColumnsFromLine(line) {
  // First try splitting by whitespace
  let columns = line.split(/\s{2,}|\t/).filter(col => col.trim().length > 0);
  
  // If that didn't work well, try another approach
  if (columns.length < 4) {
    // Look for date patterns
    const datePattern = /\d{2}[\.\/-]\d{2}[\.\/-]\d{4}|\d{2}[\.\/-]\d{2}[\.\/-]\d{2}/;
    const dateMatch = line.match(datePattern);
    
    if (dateMatch) {
      const dateStr = dateMatch[0];
      const parts = line.split(dateStr);
      
      if (parts.length > 1) {
        // The part after the date should contain time, module, and room
        const afterDate = parts[1].trim();
        
        // Try to identify the time pattern
        const timePattern = /\d{1,2}[:\.]?\d{2}/;
        const timeMatch = afterDate.match(timePattern);
        
        if (timeMatch) {
          const timeStr = timeMatch[0];
          const timeIndex = afterDate.indexOf(timeStr);
          const afterTime = afterDate.substring(timeIndex + timeStr.length).trim();
          
          // Now split the rest by spaces or other delimiters
          const moduleAndRoom = afterTime.split(/\s{2,}|\t|–|-/).filter(part => part.trim().length > 0);
          
          if (moduleAndRoom.length >= 2) {
            columns = [
              dateStr,
              timeStr,
              moduleAndRoom[0].trim(),
              moduleAndRoom[1].trim()
            ];
          } else if (moduleAndRoom.length === 1) {
            // Try to split the single part into module and room
            const parts = moduleAndRoom[0].split(/\s+/);
            const halfIndex = Math.floor(parts.length / 2);
            
            columns = [
              dateStr,
              timeStr,
              parts.slice(0, halfIndex).join(' ').trim(),
              parts.slice(halfIndex).join(' ').trim()
            ];
          }
        }
      }
    }
  }
  
  return columns;
}

// Format date to YYYY-MM-DD
function formatDate(dateStr) {
  // Handle various date formats
  const patterns = [
    /(\d{2})[\.\/-](\d{2})[\.\/-](\d{4})/, // DD/MM/YYYY or DD.MM.YYYY or DD-MM-YYYY
    /(\d{2})[\.\/-](\d{2})[\.\/-](\d{2})/, // DD/MM/YY or DD.MM.YY or DD-MM-YY
    /(\d{4})[\.\/-](\d{2})[\.\/-](\d{2})/, // YYYY/MM/DD or YYYY.MM.DD or YYYY-MM-DD
    /(\d{2})[\.\/-](\d{2})[\.\/-](\d{4})/, // MM/DD/YYYY or MM.DD.YYYY or MM-DD-YYYY (US format)
  ];
  
  for (const pattern of patterns) {
    const match = dateStr.match(pattern);
    if (match) {
      // Format differs based on the pattern
      if (pattern.toString().includes('(\\d{4})[\\.\\/-](\\d{2})[\\.\\/-](\\d{2})')) {
        // Already in YYYY-MM-DD format
        return `${match[1]}-${match[2]}-${match[3]}`;
      } else if (match[3].length === 4) {
        // DD/MM/YYYY format
        return `${match[3]}-${match[2]}-${match[1]}`;
      } else if (match[3].length === 2) {
        // DD/MM/YY format - assume 20XX for years
        return `20${match[3]}-${match[2]}-${match[1]}`;
      }
    }
  }
  
  // If we couldn't parse the date format, return as is
  return dateStr;
}

// Determine room type based on room name
function determineRoomType(room) {
  if (!room) return 'SALLE_COURS';
  
  const roomLower = room.toLowerCase();
  if (roomLower.includes('tp')) {
    return 'SALLE_TP';
  } else if (roomLower.includes('td')) {
    return 'SALLE_TD';
  } else if (roomLower.includes('amphi') || roomLower.includes('amphitheatre')) {
    return 'AMPHITHEATRE';
  } else {
    return 'SALLE_COURS';
  }
}

// GET /api/surveillance
router.get('/', isAuthenticated, async (req, res) => {
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

// POST /api/surveillance/upload
router.post('/upload', isAuthenticated, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const filePath = req.file.path;
    
    // Extract content from the document
    const content = await extractDocumentContent(filePath);
    
    // Parse assignments from the content
    const assignments = parseExamSchedule(content);
    
    if (assignments.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Could not parse any assignments from the uploaded file'
      });
    }

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
      message: `File processed successfully, extracted ${assignments.length} assignments`,
      assignments,
      fileId: fileRecord.id
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({
      success: false,
      message: `Failed to process file: ${error.message}`
    });
  }
});

// POST /api/surveillance/confirm-upload
router.post('/confirm-upload', isAuthenticated, async (req, res) => {
  try {
    const { assignments, fileId, teacherId } = req.body;
    
    console.log('Received request:', { assignments, fileId, teacherId });
    
    if (!Array.isArray(assignments) || assignments.length === 0 || !teacherId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or empty assignments data or missing teacher ID'
      });
    }

    // Verify the teacher exists and get their details
    const teacher = await prisma.user.findFirst({
      where: { 
        OR: [
          { id: parseInt(teacherId) },
          { email: teacherId.toString().includes('@') ? teacherId : `${teacherId}@usthb.dz` }
        ]
      }
    });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    // Use the found teacher's ID consistently
    const consistentTeacherId = teacher.id;

    // First, ensure we have a default speciality
    const defaultPalier = await prisma.palier.upsert({
      where: { name: 'LMD' },
      update: {},
      create: { name: 'LMD' }
    });

    const defaultYear = await prisma.year.upsert({
      where: {
        name_palierId: {
          name: 'Default',
          palierId: defaultPalier.id
        }
      },
      update: {},
      create: {
        name: 'Default',
        palierId: defaultPalier.id
      }
    });

    const defaultSpeciality = await prisma.speciality.upsert({
      where: {
        name_palierId_yearId: {
          name: 'Default',
          palierId: defaultPalier.id,
          yearId: defaultYear.id
        }
      },
      update: {},
      create: {
        name: 'Default',
        description: 'Default speciality for surveillance assignments',
        palierId: defaultPalier.id,
        yearId: defaultYear.id
      }
    });

    // Create assignments in database
    const createdAssignments = await Promise.all(
      assignments.map(async (assignment) => {
        console.log('Processing assignment:', assignment);
        
        if (!assignment.module || !assignment.date || !assignment.time || !assignment.room) {
          console.error('Missing required fields:', assignment);
          throw new Error(`Missing required fields in assignment data: ${JSON.stringify(assignment)}`);
        }

        // Find or create module
        const module = await prisma.module.upsert({
          where: { 
            code_academicYear: {
              code: assignment.module,
              academicYear: new Date().getFullYear() // Use current year as default
            }
          },
          update: {},
          create: {
            code: assignment.module,
            name: assignment.module,
            academicYear: new Date().getFullYear(), // Use current year as default
            specialityId: defaultSpeciality.id,
            palierId: defaultPalier.id,
            yearId: defaultYear.id,
            semestre: 'SEMESTRE1' // Default semestre
          }
        });

        // Create a proper date object
        let assignmentDate;
        try {
          assignmentDate = new Date(assignment.date);
          if (isNaN(assignmentDate.getTime())) {
            throw new Error(`Invalid date format: ${assignment.date}`);
          }
        } catch (err) {
          console.error(`Error parsing date ${assignment.date}:`, err);
          throw new Error(`Invalid date format: ${assignment.date}`);
        }

        try {
          return await prisma.surveillanceAssignment.create({
            data: {
              date: assignmentDate,
              time: assignment.time,
              module: assignment.module,
              room: assignment.room,
              roomType: assignment.roomType || 'SALLE_COURS',
              userId: consistentTeacherId, // Use the consistent teacher ID
              moduleId: module.id,
              isResponsible: assignment.isResponsible || false, // Use value from frontend, default to false
              canSwap: assignment.hasOwnProperty('canSwap') ? assignment.canSwap : !assignment.isResponsible // Use value from frontend, default based on isResponsible
            }
          });
        } catch (err) {
          console.error('Error creating assignment:', err);
          throw new Error(`Failed to create assignment: ${err.message}`);
        }
      })
    );

    // Send email notification to the teacher
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    try {
      console.log('Attempting to send email to:', teacher.email);
      console.log('SMTP Configuration:', {
        service: 'gmail',
        user: process.env.SMTP_USER,
        from: process.env.SMTP_FROM
      });

      await transporter.sendMail({
        from: {
          name: 'USTHB Platform',
          address: process.env.SMTP_USER // Use the Gmail address directly
        },
        to: teacher.email,
        subject: 'New Surveillance Assignment',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #059669;">New Surveillance Assignment</h2>
            <p>You have been assigned a new surveillance duty:</p>
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Date:</strong> ${new Date(createdAssignments[0].date).toLocaleDateString()}</p>
              <p><strong>Time:</strong> ${createdAssignments[0].time}</p>
              <p><strong>Module:</strong> ${createdAssignments[0].module}</p>
              <p><strong>Room:</strong> ${createdAssignments[0].room}</p>
              <p><strong>Role:</strong> ${createdAssignments[0].isResponsible ? 'Responsible' : 'Assistant'}</p>
            </div>
            <p>Please log in to your dashboard to view more details.</p>
            <hr style="border: 1px solid #eee; margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">
              This is an automated message, please do not reply to this email.
            </p>
          </div>
        `
      });
      console.log('Email sent successfully to:', teacher.email);
    } catch (emailError) {
      console.error('Failed to send email notification:', {
        error: emailError.message,
        code: emailError.code,
        command: emailError.command,
        stack: emailError.stack,
        response: emailError.response,
        responseCode: emailError.responseCode
      });
      // Don't throw the error, just log it and continue
    }

    res.json({
      success: true,
      message: `Created ${createdAssignments.length} assignments successfully`,
      assignments: createdAssignments
    });
  } catch (error) {
    console.error('Assignment creation error:', error);
    res.status(500).json({
      success: false,
      message: `Failed to create assignments: ${error.message}`
    });
  }
});

// GET /api/surveillance/assignments
router.get('/assignments', isAuthenticated, async (req, res) => {
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
router.post('/:assignmentId/swap-request', isAuthenticated, async (req, res) => {
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
    try {
      await sendSwapRequestNotification(
        toAssignment.user.email,
        fromAssignment.user.name,
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
      console.log('Swap request email sent successfully to:', toAssignment.user.email);
    } catch (emailError) {
      console.error('Failed to send swap request email:', {
        error: emailError.message,
        code: emailError.code,
        command: emailError.command,
        stack: emailError.stack,
        response: emailError.response,
        responseCode: emailError.responseCode
      });
    }

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
router.post('/swap/:requestId/accept', isAuthenticated, async (req, res) => {
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
    try {
    // Notify both teachers
    await Promise.all([
        sendSwapRequestNotification(
          swapRequest.fromAssignment.user.email,
          'System',
          {
            date: swapRequest.fromAssignment.date,
            time: swapRequest.fromAssignment.time,
            module: swapRequest.fromAssignment.module,
            room: swapRequest.fromAssignment.room,
            status: 'accepted'
          }
        ),
        sendSwapRequestNotification(
          swapRequest.toAssignment.user.email,
          'System',
          {
            date: swapRequest.toAssignment.date,
            time: swapRequest.toAssignment.time,
            module: swapRequest.toAssignment.module,
            room: swapRequest.toAssignment.room,
            status: 'accepted'
          }
        )
      ]);
    } catch (emailError) {
      console.error('Failed to send acceptance notifications:', emailError);
      // Continue with the response even if email fails
    }

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
router.post('/swap/:requestId/decline', isAuthenticated, async (req, res) => {
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
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: false
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
router.post('/swap/:requestId/cancel', isAuthenticated, async (req, res) => {
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
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: false
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

// POST /api/surveillance
router.post('/', isAuthenticated, async (req, res) => {
  try {
    const { date, time, module, room, teacherId, isResponsible } = req.body;

    if (!date || !time || !module || !room || !teacherId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Verify the teacher exists
    const teacher = await prisma.user.findFirst({
      where: { 
        OR: [
          { id: parseInt(teacherId) },
          { email: teacherId.toString().includes('@') ? teacherId : `${teacherId}@usthb.dz` }
        ]
      }
    });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    // Create the assignment
    const assignment = await prisma.surveillanceAssignment.create({
      data: {
        date: new Date(date),
        time,
        module,
        room,
        userId: teacher.id,
        isResponsible: isResponsible || false,
        canSwap: !isResponsible // If teacher is responsible, they cannot swap
      }
    });

    res.json({
      success: true,
      message: 'Assignment created successfully',
      assignment
    });
  } catch (error) {
    console.error('Error creating assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create assignment'
    });
  }
});

// DELETE /api/surveillance/teacher/:teacherId/all
router.delete('/teacher/:teacherId/all', isAuthenticated, async (req, res) => {
  try {
    const { teacherId } = req.params;

    // Verify the teacher exists
    const teacher = await prisma.user.findFirst({
      where: { 
        OR: [
          { id: parseInt(teacherId) },
          { email: teacherId.toString().includes('@') ? teacherId : `${teacherId}@usthb.dz` }
        ]
      }
    });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    // Get all assignments for the teacher
    const assignments = await prisma.surveillanceAssignment.findMany({
      where: { userId: teacher.id },
      include: {
        fromSwapRequests: true,
        toSwapRequests: true
      }
    });

    // Delete all swap requests associated with these assignments
    const swapRequestIds = [
      ...assignments.flatMap(a => a.fromSwapRequests.map(r => r.id)),
      ...assignments.flatMap(a => a.toSwapRequests.map(r => r.id))
    ];

    if (swapRequestIds.length > 0) {
      await prisma.surveillanceSwapRequest.deleteMany({
        where: { id: { in: swapRequestIds } }
      });
    }

    // Delete all assignments
    await prisma.surveillanceAssignment.deleteMany({
      where: { userId: teacher.id }
    });

    // Send email notification to the teacher
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: teacher.email,
      subject: 'Surveillance Assignments Deleted',
      html: `
        <h2>Surveillance Assignments Deleted</h2>
        <p>All your surveillance assignments have been deleted by an administrator.</p>
        <p>If you believe this was done in error, please contact the administration.</p>
      `
    });

    res.json({
      success: true,
      message: `Successfully deleted ${assignments.length} assignments and ${swapRequestIds.length} swap requests`
    });
  } catch (error) {
    console.error('Error deleting assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete assignments'
    });
  }
});

// Create a swap request
router.post('/swap-requests', isAuthenticated, createSwapRequest);

// Get pending swap requests for the current user
router.get('/swap-requests/pending', isAuthenticated, getPendingSwapRequests);

export default router;