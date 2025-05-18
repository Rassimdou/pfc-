import express from 'express';
import multer from 'multer';
import textract from 'textract';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/authMiddleware.js';
import { execSync } from 'child_process';
import fs from 'fs';

const prisma = new PrismaClient();
const router = express.Router();

// Ensure upload directory exists
const uploadDir = 'uploads/surveillance';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Improved Multer config
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

// Improved text extraction with promise wrapper
const extractText = (filePath) => new Promise((resolve, reject) => {
  textract.fromFileWithPath(filePath, (err, text) => {
    err ? reject(err) : resolve(text);
  });
});

// Enhanced parser for USTHB-style tables
function parseScheduleText(text) {
  const lines = text.split('\n')
    .map(line => line.trim())
    .filter(line => line.match(/^\d{2}\/\d{2}\/\d{4}/)); // Filter valid date lines

  return lines.map(line => {
    // Split columns using multiple spaces (at least 3)
    const cells = line.split(/\s{3,}/);
    
    // Handle merged date/time columns if needed
    const dateTime = cells[0].split(/\s+/);
    const date = dateTime[0];
    const time = dateTime.length > 1 ? dateTime[1] : cells[1];
    
    return {
      date: convertDate(date),
      time: time.replace(/[^\d:]/g, ''), // Clean time format
      module: cells[2]?.trim(),
      room: cells[3]?.trim()
    };
  });
}

// Date conversion helper
function convertDate(dateStr) {
  const [day, month, year] = dateStr.split('/');
  return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
}

// GET /api/surveillance
router.get('/', async (req, res) => {
  try {
    // For testing, use a hardcoded userId
    const userId = 1; // Replace with your test user ID
    const assignments = await prisma.surveillanceAssignment.findMany({
      where: { userId },
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
router.get('/upload', upload.single('file'), async (req, res) => {
  try {
    // For testing, use a hardcoded userId
    const userId = 1; // Replace with your test user ID
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Save file metadata
    const savedFile = await prisma.surveillanceFile.create({
      data: {
        userId,
        originalName: file.originalname,
        path: file.path,
        uploadedAt: new Date()
      }
    });

    // Extract text and parse
    const text = await extractText(file.path);
    const assignments = parseScheduleText(text);

    // Get user's modules
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { taughtModules: { select: { code: true } } }
    })

    const moduleCodes = user.taughtModules.map(m => m.code);
    
    // Clear old assignments
    await prisma.surveillanceAssignment.deleteMany({ where: { userId } });

    // Create new assignments
    await prisma.surveillanceAssignment.createMany({
      data: assignments.map(({ date, time, module, room }) => ({
        userId,
        date,
        time,
        module,
        room,
        isResponsible: moduleCodes.includes(module),
        canSwap: !moduleCodes.includes(module)
      }))
    });

    res.json({
      success: true,
      processed: assignments.length,
      file: savedFile
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to process surveillance schedule'
    });
  }
});

export default router;