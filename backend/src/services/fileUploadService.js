import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Create upload directories if they don't exist
const createUploadDirectories = () => {
  const dirs = ['uploads/schedules', 'uploads/specialities'];
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

// Initialize directories
createUploadDirectories();

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Determine the destination based on the route
    const isScheduleUpload = req.path.includes('schedule');
    const uploadPath = isScheduleUpload ? 'uploads/schedules' : 'uploads/specialities';
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter configuration
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = {
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': true, // .docx
    'application/vnd.ms-excel': true, // .xls
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': true // .xlsx
  };

  const allowedExtensions = ['.docx', '.xls', '.xlsx'];

  const ext = path.extname(file.originalname).toLowerCase();
  const isValidMimeType = allowedMimeTypes[file.mimetype];
  const isValidExtension = allowedExtensions.includes(ext);

  if (isValidMimeType && isValidExtension) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${allowedExtensions.join(', ')}`));
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1 // Only allow one file at a time
  }
});

// Error handling middleware
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 10MB'
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${error.message}`
    });
  }
  
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  next();
};

export { upload, handleUploadError }; 