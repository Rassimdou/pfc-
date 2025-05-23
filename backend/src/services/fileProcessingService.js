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
   * Process a PDF file and extract schedule data
   * @param {string} filePath - Path to the PDF file
   * @returns {Promise<Object>} Processed file content
   */
  static async processPdfFile(filePath) {
    try {
      console.log('Starting PDF processing for file:', filePath);
      
      // Read the file
      const buffer = await fs.readFile(filePath);
      console.log('File read successfully, size:', buffer.length);
      
      // Use ScheduleParser to process the PDF
      const result = await ScheduleParser.extractScheduleData(buffer, 'pdf');
      
      if (!result.success) {
        throw new Error(result.error);
      }

      // Validate the extracted data
      const validation = ScheduleParser.validateScheduleData(result.data);
      
      if (!validation.isValid) {
        console.warn('Schedule data validation failed:', validation.errors);
        return {
          success: false,
          error: 'Invalid schedule data: ' + validation.errors.join(', '),
          validation: validation
        };
      }

      // Format data for database
      const formattedData = ScheduleParser.formatForDatabase(result.data);

      return {
        success: true,
        data: formattedData,
        rawData: result.data,
        validation: validation
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
          date: '',
          groups: []
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
      await this.extractHeaderInfoFromDocx(lines, scheduleData);

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
      
      await this.processDocxTables(tables, $, scheduleData);

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

      // Format data for database
      const formattedData = ScheduleParser.formatForDatabase(scheduleData);

      return {
        success: true,
        data: formattedData,
        rawData: scheduleData
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
   * Extract header information from DOCX lines
   * @param {Array} lines - Text lines from DOCX
   * @param {Object} scheduleData - Schedule data object to populate
   */
  static async extractHeaderInfoFromDocx(lines, scheduleData) {
    const groupNumbers = new Set();
    
    for (const line of lines) {
      // University
      if (line.toLowerCase().includes('university') && !scheduleData.headerInfo.university) {
        scheduleData.headerInfo.university = line.trim();
      }
      
      // Speciality and Section
      const specialityMatch = line.match(/Schedules of\s*:\s*(.+?)\s*--\s*Section:\s*([A-Z])/i);
      if (specialityMatch && !scheduleData.headerInfo.speciality) {
        scheduleData.headerInfo.speciality = specialityMatch[1].trim();
        scheduleData.headerInfo.section = specialityMatch[2];
        console.log('Found speciality:', specialityMatch[1].trim());
        console.log('Found section:', specialityMatch[2]);
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

      // Extract groups
      const groupMatches = line.match(/G(\d)/g);
      if (groupMatches) {
        groupMatches.forEach(match => {
          const groupNum = match.replace('G', '');
          if (groupNum >= '1' && groupNum <= '9') {
            groupNumbers.add(parseInt(groupNum));
          }
        });
      }
    }

    scheduleData.headerInfo.groups = Array.from(groupNumbers).sort();
  }

  /**
   * Process DOCX tables and extract schedule entries
   * @param {Object} tables - jQuery tables object
   * @param {Object} $ - jQuery instance
   * @param {Object} scheduleData - Schedule data object to populate
   */
  static async processDocxTables(tables, $, scheduleData) {
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
        
        $(row).find('td, th').each(async (colIndex, cell) => {
          if (colIndex > 0 && colIndex <= timeSlots.length) {
            const cellContent = $(cell).text().trim();
            if (cellContent && cellContent.length > 0) {
              console.log(`Cell content at col ${colIndex}:`, cellContent.substring(0, 100));
              
              // Use enhanced parser for cell content
              const entry = await ScheduleParser.parseScheduleBlock(
                cellContent, 
                day, 
                timeSlots[colIndex - 1]
              );
              
              if (entry) {
                scheduleData.scheduleEntries.push(entry);
                console.log(`Added entry from cell`);
              }
            }
          }
        });
      }
    });
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
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Process a file based on its type
   * @param {string} filePath - Path to the file
   * @returns {Promise<Object>} Processed file content
   */
  static async processFile(filePath) {
    try {
      const fileType = this.getFileType(filePath);
      console.log('Processing file:', filePath, 'Type:', fileType);

      switch (fileType.toLowerCase()) {
        case 'pdf':
          return await this.processPdfFile(filePath);
        case 'docx':
          return await this.processDocxFile(filePath);
        case 'xlsx':
        case 'xls':
          return await this.processExcelFile(filePath);
        default:
          throw new Error(`Unsupported file type: ${fileType}`);
      }
    } catch (error) {
      console.error('Error processing file:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default FileProcessingService;