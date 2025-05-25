import express from 'express';
import { extractScheduleWithGemini } from '../services/geminiService.js';
import multer from 'multer';
import pdfplumber from 'pdfplumber';
import fs from 'fs';
import path from 'path';
import FileProcessingService from '../services/fileProcessingService.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// Process PDF file and optionally save to database
router.post('/extract-pdf', authenticate, upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    console.log('Processing file:', filePath);

    // Get database options from request body
    const options = {
      saveToDatabase: req.body.saveToDatabase === 'true',
      specialityName: req.body.specialityName,
      academicYear: req.body.academicYear,
      semester: req.body.semester,
      sectionName: req.body.sectionName
    };

    const result = await FileProcessingService.processPdfFile(filePath, options);

    // Clean up the uploaded file
    fs.unlinkSync(filePath);

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({
      success: true,
      data: result.data,
      formattedOutput: result.formattedOutput,
      dbResult: result.dbResult
    });
  } catch (error) {
    console.error('Error processing PDF:', error);
    res.status(500).json({ error: error.message });
  }
});

// Process Excel file and optionally save to database
router.post('/extract-excel', authenticate, upload.single('excel'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    console.log('Processing file:', filePath);

    // Get database options from request body
    const options = {
      saveToDatabase: req.body.saveToDatabase === 'true',
      specialityName: req.body.specialityName,
      academicYear: req.body.academicYear,
      semester: req.body.semester,
      sectionName: req.body.sectionName
    };

    const result = await FileProcessingService.processExcelFile(filePath, options);

    // Clean up the uploaded file
    fs.unlinkSync(filePath);

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({
      success: true,
      data: result.data,
      formattedOutput: result.formattedOutput,
      dbResult: result.dbResult
    });
  } catch (error) {
    console.error('Error processing Excel:', error);
    res.status(500).json({ error: error.message });
  }
});

// Process DOCX file and optionally save to database
router.post('/extract-docx', authenticate, upload.single('docx'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    console.log('Processing file:', filePath);

    // Get database options from request body
    const options = {
      saveToDatabase: req.body.saveToDatabase === 'true',
      specialityName: req.body.specialityName,
      academicYear: req.body.academicYear,
      semester: req.body.semester,
      sectionName: req.body.sectionName
    };

    const result = await FileProcessingService.processDocxFile(filePath, options);

    // Clean up the uploaded file
    fs.unlinkSync(filePath);

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({
      success: true,
      data: result.data,
      formattedOutput: result.formattedOutput,
      dbResult: result.dbResult
    });
  } catch (error) {
    console.error('Error processing DOCX:', error);
    res.status(500).json({ error: error.message });
  }
});

// Existing endpoint for Gemini extraction
router.post('/extract-with-gemini', authenticate, async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'No text provided' });
    }

    const result = await extractScheduleWithGemini(text);
    res.json(result);
  } catch (error) {
    console.error('Error extracting with Gemini:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router; 