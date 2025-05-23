import xlsx from 'xlsx';
import fs from 'fs/promises';
import path from 'path';
import mammoth from 'mammoth';
import * as cheerio from 'cheerio';
import ScheduleParser from '../utils/scheduleParser.js';

class FileProcessingService {
  /**
   * Get the file type based on file extension
   * @param {string} filePath - Path to the file
   * @returns {string} File type (docx, xlsx, etc.)
   */
  static getFileType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return ext.slice(1); // Remove the dot
  }

  /**
   * Process a .docx file and extract its content
   * @param {string} filePath - Path to the .docx file
   * @returns {Promise<Object>} Processed file content
   */
  static async processDocxFile(filePath) {
    try {
      console.log('Starting DOCX processing for file:', filePath);
      
      // Read the file
      const buffer = await fs.readFile(filePath);
      console.log('File read successfully, size:', buffer.length);
      
      // Convert DOCX to HTML
      const result = await mammoth.convertToHtml({ buffer });
      const html = result.value;
      console.log('Converted to HTML, length:', html.length);

      // Parse HTML using cheerio
      const $ = cheerio.load(html);
      console.log('HTML parsed with cheerio');
      
      // Initialize schedule data structure
      const scheduleData = {
        headerInfo: {
          university: '',
          speciality: '',
          section: '',
          academicYear: '',
          semester: '',
          date: ''
        },
        timeSlots: [],
        scheduleEntries: []
      };

      // Extract header information - look for specific patterns
      const bodyText = $('body').text();
      console.log('Body text length:', bodyText.length);
      
      const lines = bodyText.split('\n').map(line => line.trim()).filter(Boolean);
      console.log('Number of non-empty lines:', lines.length);
      
      // Extract header information with improved patterns
      for (const line of lines) {
        // University
        if (line.toLowerCase().includes('university') && !scheduleData.headerInfo.university) {
          scheduleData.headerInfo.university = line.trim();
        }
        
        // Speciality
        if ((line.includes('ING.') || line.includes('SIGL') || line.includes('INFO')) && !scheduleData.headerInfo.speciality) {
          scheduleData.headerInfo.speciality = line.trim();
          console.log('Found speciality:', line.trim());
        }
        
        // Section
        const sectionMatch = line.match(/Section:\s*([A-Z])/i);
        if (sectionMatch && !scheduleData.headerInfo.section) {
          scheduleData.headerInfo.section = sectionMatch[1];
          console.log('Found section:', sectionMatch[1]);
        }
        
        // Academic Year
        const yearMatch = line.match(/College year:\s*(\d{4}\/\d{4})/i);
        if (yearMatch && !scheduleData.headerInfo.academicYear) {
          scheduleData.headerInfo.academicYear = yearMatch[1];
        }
        
        // Semester
        const semesterMatch = line.match(/Semester:\s*(\d+)/i);
        if (semesterMatch && !scheduleData.headerInfo.semester) {
          scheduleData.headerInfo.semester = semesterMatch[1];
        }
        
        // Date
        const dateMatch = line.match(/Date:\s*(\d{2}\/\d{2}\/\d{4})/i);
        if (dateMatch && !scheduleData.headerInfo.date) {
          scheduleData.headerInfo.date = dateMatch[1];
        }
      }

      // Check for images first
      const images = $('img');
      console.log('Number of images found:', images.length);
      
      if (images.length > 0) {
        console.log('Document contains images - may contain schedule data in image format');
        return {
          success: false,
          error: 'Document contains images instead of text tables. The schedule appears to be in image format which cannot be processed automatically. Please provide a document with text-based tables or convert the image to text format.',
          containsImages: true,
          imageCount: images.length
        };
      }

      // Process tables with improved parsing
      const tables = $('table');
      console.log('Number of tables found:', tables.length);
      
      if (tables.length === 0) {
        console.warn('No tables found in the document');
        return {
          success: false,
          error: 'No schedule table found in the document. The document may contain only text or images.',
          bodyTextLength: bodyText.length,
          hasContent: bodyText.length > 0
        };
      }
      
      tables.each((tableIndex, table) => {
        console.log(`Processing table ${tableIndex + 1}`);
        const rows = $(table).find('tr');
        console.log(`Table ${tableIndex + 1} has ${rows.length} rows`);
        
        if (rows.length < 2) {
          console.warn('Table has insufficient rows');
          return;
        }
        
        // Get time slots from header row
        const timeSlots = [];
        $(rows[0]).find('td, th').each((i, cell) => {
          if (i > 0) { // Skip first column (days)
            const timeSlot = $(cell).text().trim();
            if (timeSlot && timeSlot.length > 0) {
              timeSlots.push(timeSlot);
            }
          }
        });
        console.log('Time slots found:', timeSlots);
        scheduleData.timeSlots = timeSlots;

        // Process each data row (skip header)
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const day = $(row).find('td:first-child, th:first-child').text().trim();
          
          if (!day || day.length === 0) {
            console.log(`Skipping row ${i} - no day found`);
            continue;
          }
          
          console.log(`Processing row ${i}, day: ${day}`);
          
          $(row).find('td, th').each((colIndex, cell) => {
            if (colIndex > 0 && colIndex <= timeSlots.length) { // Skip first column (days) and ensure valid column
              const cellContent = $(cell).text().trim();
              if (cellContent && cellContent.length > 0) {
                console.log(`Cell content at col ${colIndex}:`, cellContent.substring(0, 100));
                
                // Parse cell content using the improved parser
                const entries = this.parseScheduleCell(cellContent, day, timeSlots[colIndex - 1]);
                if (entries && entries.length > 0) {
                  scheduleData.scheduleEntries.push(...entries);
                  console.log(`Added ${entries.length} entries from cell`);
                }
              }
            }
          });
        }
      });

      console.log('Final extracted schedule data:', {
        headerInfo: scheduleData.headerInfo,
        timeSlots: scheduleData.timeSlots,
        totalEntries: scheduleData.scheduleEntries.length
      });

      // Validate that we have meaningful data
      if (scheduleData.scheduleEntries.length === 0) {
        return {
          success: false,
          error: 'No schedule entries found in the document'
        };
      }

      return {
        success: true,
        data: scheduleData
      };
    } catch (error) {
      console.error('Error processing DOCX file:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Enhanced cell parsing method
   * @param {string} cellContent - Content of the cell
   * @param {string} day - Day of the week
   * @param {string} timeSlot - Time slot
   * @returns {Array} Array of schedule entries
   */
  static parseScheduleCell(cellContent, day, timeSlot) {
    if (!cellContent || !cellContent.trim()) return [];
    
    try {
      const lines = cellContent.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
      const entries = [];
      let currentEntry = this.createEmptyEntry(day, timeSlot);
      
      console.log(`Parsing cell with ${lines.length} lines:`, lines);
      
      for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
        const line = lines[lineIdx];
        console.log(`Processing line ${lineIdx}: "${line}"`);
        
        // Check for group info (G1:457, G2:TP126, etc.)
        const groupMatch = line.match(/^G(\d+):(.+)$/);
        if (groupMatch) {
          // If we already have data in current entry, save it and start new one
          if (currentEntry.groups.length > 0 || currentEntry.modules.length > 0) {
            entries.push({...currentEntry});
            currentEntry = this.createEmptyEntry(day, timeSlot);
          }
          
          const groupNumber = groupMatch[1];
          const groupInfo = groupMatch[2].trim();
          
          currentEntry.groups.push(groupNumber);
          console.log(`Found group: G${groupNumber} with info: ${groupInfo}`);
          
          // Determine type and room from group info
          if (groupInfo.includes('TP')) {
            currentEntry.type = 'TP';
            const tpRoomMatch = groupInfo.match(/TP(\d+)/);
            if (tpRoomMatch) {
              currentEntry.rooms.push({
                number: tpRoomMatch[1],
                type: 'SALLE_TP'
              });
            } else if (/^\d+$/.test(groupInfo)) { // Handle cases like G1:101
              currentEntry.type = 'TD'; // Assuming a number without TP is TD
               currentEntry.rooms.push({
                number: groupInfo,
                type: 'SALLE_TD'
              });
            }
          } else if (/^\d+$/.test(groupInfo)) {
            currentEntry.type = 'TD';
            currentEntry.rooms.push({
              number: groupInfo,
              type: 'SALLE_TD'
            });
          }
          continue;
        }
        
        // Check for module and professor info (format: /Module Name -- DW, TEACHER NAME)
        const moduleMatch = line.match(/^\/(.+)\s+--\s+([DP]W),\s+(.+)$/);
        if (moduleMatch) {
          const moduleName = moduleMatch[1].trim();
          const teacherName = moduleMatch[3].trim();
          
          console.log(`Found module: ${moduleName}, teacher: ${teacherName}`);
          
          if (!currentEntry.modules.includes(moduleName)) {
            currentEntry.modules.push(moduleName);
          }
          if (!currentEntry.professors.includes(teacherName)) {
            currentEntry.professors.push(teacherName);
          }
          continue;
        }
        
        // Check for course info (format: "Module Name course")
        const courseMatch = line.match(/^(.+)\s+course$/i);
        if (courseMatch) {
          currentEntry.type = 'COURSE';
          const moduleName = courseMatch[1].trim();
          console.log(`Found course: ${moduleName}`);
          
          if (!currentEntry.modules.includes(moduleName)) {
            currentEntry.modules.push(moduleName);
          }
          
          // Look ahead for room info on next line
          if (lineIdx + 1 < lines.length) {
            const nextLine = lines[lineIdx + 1].trim();
            if (nextLine.length <= 3 && /^[A-Z0-9]+$/i.test(nextLine)) {
              currentEntry.rooms.push({
                number: nextLine,
                type: 'SALLE_COURS'
              });
              lineIdx++; // Skip the room line
            }
          }
          continue;
        }
        
        // Check for standalone room number (short alphanumeric string)
        if (line.length <= 3 && /^[A-Z0-9]+$/i.test(line) && currentEntry.rooms.length === 0) {
          const roomType = currentEntry.type === 'COURSE' ? 'SALLE_COURS' : 
                          currentEntry.type === 'TP' ? 'SALLE_TP' : 'SALLE_TD';
          
          currentEntry.rooms.push({ number: line, type: roomType });
          console.log(`Found room: ${line} of type: ${roomType}`);
          continue;
        }
        
        // Check for professor name (usually longer text without specific patterns)
        if (line.length > 5 && 
            !line.includes(':') && 
            !line.includes('--') && 
            !line.toLowerCase().includes('course') &&
            currentEntry.professors.length === 0 &&
            currentEntry.modules.length > 0) {
          
          if (!currentEntry.professors.includes(line)) {
            currentEntry.professors.push(line);
            console.log(`Found professor: ${line}`);
          }
          continue;
        }
      }
      
      // Add the final entry if it has useful data
      if (currentEntry.groups.length > 0 || currentEntry.modules.length > 0) {
        entries.push(currentEntry);
      }
      
      console.log(`Parsed ${entries.length} entries from cell`);
      return entries;
      
    } catch (error) {
      console.error('Error parsing schedule cell:', error);
      return [];
    }
  }

  /**
   * Create an empty schedule entry
   * @param {string} day - Day of the week
   * @param {string} timeSlot - Time slot
   * @returns {Object} Empty schedule entry
   */
  static createEmptyEntry(day, timeSlot) {
    return {
      day: day || '',
      timeSlot: timeSlot || '',
      type: 'unknown',
      modules: [],
      professors: [],
      rooms: [],
      groups: []
    };
  }

  /**
   * Process an Excel file and extract its content
   * @param {string} filePath - Path to the Excel file
   * @returns {Promise<Object>} Processed file content
   */
  static async processExcelFile(filePath) {
    try {
      const buffer = await fs.readFile(filePath);
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = xlsx.utils.sheet_to_json(worksheet);
      return { data };
    } catch (error) {
      console.error('Error processing Excel file:', error);
      throw new Error('Failed to process Excel file: ' + error.message);
    }
  }

  /**
   * Clean up temporary files
   * @param {string} filePath - Path to the file to clean up
   */
  static async cleanupFile(filePath) {
    try {
      await fs.unlink(filePath);
      console.log('Cleaned up file:', filePath);
    } catch (error) {
      console.error('Error cleaning up file:', error);
    }
  }

  /**
   * Analyze DOCX content to determine what type of data it contains
   * @param {string} filePath - Path to the .docx file
   * @returns {Promise<Object>} Analysis result
   */
  static async analyzeDocxContent(filePath) {
    try {
      const buffer = await fs.readFile(filePath);
      const result = await mammoth.convertToHtml({ buffer });
      const html = result.value;
      const $ = cheerio.load(html);
      
      const analysis = {
        hasText: false,
        hasTables: false,
        hasImages: false,
        textLength: 0,
        tableCount: 0,
        imageCount: 0,
        contentPreview: ''
      };
      
      // Check for text content
      const bodyText = $('body').text().trim();
      analysis.hasText = bodyText.length > 0;
      analysis.textLength = bodyText.length;
      analysis.contentPreview = bodyText.substring(0, 200) + (bodyText.length > 200 ? '...' : '');
      
      // Check for tables
      const tables = $('table');
      analysis.hasTables = tables.length > 0;
      analysis.tableCount = tables.length;
      
      // Check for images
      const images = $('img');
      analysis.hasImages = images.length > 0;
      analysis.imageCount = images.length;
      
      return { success: true, analysis: analysis };
    } catch (error) {
      console.error('Error analyzing DOCX content:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Process a DOCX file that may contain images with OCR capability
   * @param {string} filePath - Path to the .docx file
   * @param {boolean} enableOCR - Whether to attempt OCR on images (requires additional setup)
   * @returns {Promise<Object>} Processed file content
   */
  static async processDocxFileWithOCR(filePath, enableOCR = false) {
    try {
      console.log('Starting DOCX processing with image support for file:', filePath);
      
      if (enableOCR) {
        console.log('OCR support would require additional libraries like Tesseract.js');
        // تنفيذ OCR هنا
         return { success: false, error: "OCR processing is not currently implemented." }; // Add a return here
      }
      
      const normalResult = await this.processDocxFile(filePath);
      
      if (!normalResult.success && normalResult.containsImages) {
        return {
          ...normalResult,
          suggestions: [
            'Convert the image to a text-based table in Word',
            'Use OCR software to extract text from the image',
            'Manually recreate the schedule in a text-based format',
            'Save the document as a different format (e.g., HTML) if possible'
          ]
        };
      }
      
      return normalResult;
    } catch (error) {
      console.error('Error processing DOCX with image support:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Extract unique palier and specialités combinations from an Excel file
   * @param {string} filePath - Path to the Excel file
   * @returns {Promise<Object>} Extracted data
   */
  static async extractPalierAndSpecialities(filePath) {
    try {
      const result = await this.processExcelFile(filePath);
      const uniqueCombinations = new Set();
      const results = [];

      for (const row of result.data) {
        if (row.palier === 'palier' || row.Palier === 'palier') continue;
        
        const palier = row.palier || row.Palier;
        const specialite = row.specialités || row.Specialités || row.specialites || row.Specialites;
        
        if (!palier || !specialite) continue;
        
        const key = `${palier}-${specialite}`;
        
        if (!uniqueCombinations.has(key)) {
          uniqueCombinations.add(key);
          results.push({
            palier: palier,
            specialite: specialite
          });
        }
      }
      
      return { success: true, data: results };
    } catch (error) {
      console.error('Error extracting palier and specialities:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Validate file format and size
   * @param {string} filePath - Path to the file
   * @param {Array} allowedExtensions - Array of allowed file extensions
   * @param {number} maxSizeInMB - Maximum file size in MB
   * @returns {Promise<Object>} Validation result
   */
  static async validateFile(filePath, allowedExtensions = ['docx', 'pdf'], maxSizeInMB = 50) {
    try {
      const stats = await fs.stat(filePath);
      const fileExtension = this.getFileType(filePath);
      
      if (!allowedExtensions.includes(fileExtension)) {
        return {
          valid: false,
          error: `File type .${fileExtension} is not allowed. Allowed types: ${allowedExtensions.join(', ')}`
        };
      }
      
      const fileSizeInMB = stats.size / (1024 * 1024);
      if (fileSizeInMB > maxSizeInMB) {
        return {
          valid: false,
          error: `File size (${fileSizeInMB.toFixed(2)}MB) exceeds maximum allowed size (${maxSizeInMB}MB)`
        };
      }
      
      return {
        valid: true,
        fileSize: fileSizeInMB,
        fileType: fileExtension
      };
    } catch (error) {
      return {
        valid: false,
        error: `Error validating file: ${error.message}`
      };
    }
  }

  /**
   * Process CSV files and extract data
   * @param {string} filePath - Path to the CSV file
   * @returns {Promise<Object>} Processed CSV data
   */
  static async processCsvFile(filePath) {
    try {
      const csvContent = await fs.readFile(filePath, 'utf8');
      const lines = csvContent.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        throw new Error('CSV file is empty');
      }
      
      const headers = lines[0].split(',').map(header => header.trim().replace(/"/g, ''));
      const data = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(value => value.trim().replace(/"/g, ''));
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        data.push(row);
      }
      
      return { success: true, data: data, headers: headers };
    } catch (error) {
      console.error('Error processing CSV file:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Process a PDF file and extract its content
   * @param {string} filePath - Path to the PDF file
   * @returns {Promise<Object>} Processed file content
   */
  static async processPdfFile(filePath) {
    try {
      console.log('Starting PDF processing for file:', filePath);
      
      // Read the file
      const buffer = await fs.readFile(filePath);
      console.log('File read successfully, size:', buffer.length);
      
      // Use EnhancedScheduleParser to process the PDF
      const result = await ScheduleParser.extractScheduleData(buffer, 'pdf');
      
      if (!result.success) {
        throw new Error(result.error);
      }

      return {
        success: true,
        data: result.data
      };
    } catch (error) {
      console.error('Error processing PDF file:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Process file based on its type
   * @param {string} filePath - Path to the file
   * @returns {Promise<Object>} Processed file content
   */
  static async processFile(filePath) {
    try {
      // First validate the file
      const validation = await this.validateFile(filePath);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      const fileType = this.getFileType(filePath);
      
      console.log(`Processing ${fileType} file: ${filePath}`);
      
      switch (fileType) {
        case 'docx':
          return await this.processDocxFile(filePath);
        
        case 'pdf':
          return await this.processPdfFile(filePath);
        
        case 'xlsx':
          const excelResult = await this.processExcelFile(filePath);
          return { success: true, data: excelResult.data };
        
        case 'csv':
          return await this.processCsvFile(filePath);
        
        default:
          return { success: false, error: `Unsupported file type: ${fileType}` };
      }
    } catch (error) {
      console.error('Error processing file:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate summary statistics for processed data
   * @param {Object} processedData - The processed data
   * @returns {Object} Summary statistics
   */
  static generateSummary(processedData) {
    const summary = {
      totalEntries: 0,
      fileTypes: new Set(),
      dataTypes: new Set()
    };

    if (processedData.scheduleEntries) {
      summary.totalEntries = processedData.scheduleEntries.length;
      summary.dataTypes.add('schedule');
      
      // Additional schedule-specific statistics
      summary.schedule = {
        totalTimeSlots: processedData.timeSlots?.length || 0,
        uniqueDays: new Set(processedData.scheduleEntries.map(entry => entry.day)).size,
        uniqueModules: new Set(processedData.scheduleEntries.flatMap(entry => entry.modules)).size,
        uniqueProfessors: new Set(processedData.scheduleEntries.flatMap(entry => entry.professors)).size,
        entryTypes: {}
      };
      
      // Count entry types
      processedData.scheduleEntries.forEach(entry => {
        const type = entry.type || 'unknown';
        summary.schedule.entryTypes[type] = (summary.schedule.entryTypes[type] || 0) + 1;
      });
    }

    if (Array.isArray(processedData) || (processedData.data && Array.isArray(processedData.data))) {
      const dataArray = Array.isArray(processedData) ? processedData : processedData.data;
      summary.totalEntries = dataArray.length;
      summary.dataTypes.add('tabular');
      
      // Additional tabular data statistics
      if (dataArray.length > 0) {
        summary.tabular = {
          columns: Object.keys(dataArray[0]).length,
          columnNames: Object.keys(dataArray[0])
        };
      }
    }

    return {
      ...summary,
      dataTypes: Array.from(summary.dataTypes),
      generatedAt: new Date().toISOString()
    };
  }
}

export default FileProcessingService;