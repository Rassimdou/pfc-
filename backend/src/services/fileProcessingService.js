import xlsx from 'xlsx';
import fs from 'fs/promises';
import path from 'path';
import mammoth from 'mammoth';
import * as cheerio from 'cheerio';
import { exec } from 'child_process';
import { promisify } from 'util';
import ScheduleParser, { isDayLine, normalizeDayName } from '../utils/scheduleParser.js';

const execPromise = promisify(exec);

class FileProcessingService {
  static getFileType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return ext.slice(1);
  }

  static async processPdfFile(filePath) {
    try {
      console.log('Starting PDF processing for file:', filePath);
      
      // Verify file exists and is readable
      try {
        const stats = await fs.stat(filePath);
        console.log('File stats:', {
          size: stats.size,
          isFile: stats.isFile(),
          permissions: stats.mode
        });
      } catch (error) {
        console.error('Error accessing file:', error);
        throw new Error(`Cannot access file: ${error.message}`);
      }

      const buffer = await fs.readFile(filePath);
      console.log('File read successfully, size:', buffer.length);

      // Define paths for the Python script and output JSON
      const pythonScriptPath = path.resolve(process.cwd(), 'scripts', 'extract_schedule_table.py');
      const outputJsonPath = path.resolve(filePath.replace('.pdf', '.json'));

      console.log('Paths:', {
        pythonScript: pythonScriptPath,
        outputJson: outputJsonPath,
        currentWorkingDir: process.cwd()
      });

      // Verify Python script exists
      try {
        await fs.access(pythonScriptPath);
        console.log('Python script exists and is accessible');
      } catch (error) {
        console.error('Python script not found or not accessible:', error);
        throw new Error(`Python script not found at ${pythonScriptPath}`);
      }

      // Call the Python script
      const command = `py "${pythonScriptPath}" "${path.resolve(filePath)}" "${outputJsonPath}"`;
      console.log('Executing command:', command);
      try {
        const { stdout, stderr } = await execPromise(command);
        if (stderr) {
          console.warn('Python script stderr:', stderr);
        }
        if (stdout) {
          console.log('Python script stdout:', stdout);
        }
        console.log('Python script executed successfully');
      } catch (error) {
        console.error('Error executing Python script:', error);
        console.error('Command that failed:', command);
        console.error('Error details:', {
          code: error.code,
          signal: error.signal,
          stdout: error.stdout,
          stderr: error.stderr
        });
        throw error;
      }

      // Verify output JSON exists
      try {
        await fs.access(outputJsonPath);
        console.log('Output JSON file exists and is accessible');
      } catch (error) {
        console.error('Output JSON file not found or not accessible:', error);
        throw new Error(`Output JSON file not found at ${outputJsonPath}`);
      }

      // Read the output JSON
      let result;
      try {
        const jsonContent = await fs.readFile(outputJsonPath, 'utf-8');
        console.log('JSON content read successfully, length:', jsonContent.length);
        result = JSON.parse(jsonContent);
        console.log('JSON parsed successfully');
      } catch (error) {
        console.error('Error reading or parsing JSON:', error);
        throw new Error(`Failed to read or parse JSON: ${error.message}`);
      }

      // Clean up the JSON file
      try {
        await fs.unlink(outputJsonPath);
        console.log('Temporary JSON file cleaned up successfully');
      } catch (error) {
        console.warn('Failed to clean up temporary JSON file:', error);
      }

      if (!result.success) {
        console.error('Python script error:', result.error);
        return {
          success: false,
          error: `Failed to process PDF: ${result.error}`,
          details: {
            timestamp: new Date().toISOString(),
            fileSize: buffer.length,
            fileType: 'pdf'
          }
        };
      }

      const validation = ScheduleParser.validateScheduleData(result.data);
      if (!validation.isValid) {
        console.warn('Schedule data validation failed:', validation.errors);
        return {
          success: false,
          error: 'Invalid schedule data: ' + validation.errors.join(', '),
          validation: validation,
          details: {
            warnings: validation.warnings,
            dataPreview: result.data,
            timestamp: new Date().toISOString(),
            fileSize: buffer.length,
            fileType: 'pdf'
          }
        };
      }

      if (!result.data.scheduleEntries || result.data.scheduleEntries.length === 0) {
        return {
          success: false,
          error: 'No schedule entries found in the document',
          details: {
            headerInfo: result.data.headerInfo,
            timeSlots: result.data.timeSlots,
            timestamp: new Date().toISOString(),
            fileSize: buffer.length,
            fileType: 'pdf',
            contentPreview: result.data.rawContent ? result.data.rawContent.substring(0, 500) : null
          }
        };
      }

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
        error: `Error processing PDF: ${error.message}`,
        details: {
          stack: error.stack,
          timestamp: new Date().toISOString(),
          filePath: filePath
        }
      };
    }
  }

  static async processDocxFile(filePath) {
    try {
      console.log('Starting DOCX processing for file:', filePath);
      const buffer = await fs.readFile(filePath);
      console.log('File read successfully, size:', buffer.length);
      const result = await mammoth.convertToHtml({ buffer });
      const html = result.value;
      console.log('Converted to HTML, length:', html.length);
      const $ = cheerio.load(html);
      console.log('HTML parsed with cheerio');

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

      const bodyText = $('body').text();
      console.log('Body text length:', bodyText.length);
      const lines = bodyText.split('\n').map(line => line.trim()).filter(Boolean);
      console.log('Number of non-empty lines:', lines.length);
      await this.extractHeaderInfoFromDocx(lines, scheduleData);

      const images = $('img');
      console.log('Number of images found:', images.length);
      if (images.length > 0) {
        console.log('Document contains images - may contain schedule data in image format');
        return {
          success: false,
          error: 'Document contains images instead of text tables. The schedule appears to be in image format which cannot be processed automatically. Please provide a document with text-based tables or convert the image to text format.',
          containsImages: true,
          imageCount: images.length,
          details: {
            bodyTextPreview: bodyText.substring(0, 500),
            imageCount: images.length
          }
        };
      }

      const tables = $('table');
      console.log('Number of tables found:', tables.length);
      if (tables.length === 0) {
        console.warn('No tables found in the document');
        return {
          success: false,
          error: 'No schedule table found in the document. The document may contain only text or images.',
          details: {
            bodyTextLength: bodyText.length,
            hasContent: bodyText.length > 0,
            contentPreview: bodyText.substring(0, 500)
          }
        };
      }

      await this.processDocxTables(tables, $, scheduleData);

      console.log('Final extracted schedule data:', {
        headerInfo: scheduleData.headerInfo,
        timeSlots: scheduleData.timeSlots,
        totalEntries: scheduleData.scheduleEntries.length
      });

      if (scheduleData.scheduleEntries.length === 0) {
        return {
          success: false,
          error: 'No schedule entries found in the document. Please ensure the document contains a properly formatted schedule table.',
          details: {
            headerInfo: scheduleData.headerInfo,
            timeSlots: scheduleData.timeSlots,
            tableCount: tables.length,
            bodyTextPreview: bodyText.substring(0, 500)
          }
        };
      }

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
        error: `Error processing DOCX: ${error.message}`,
        details: {
          stack: error.stack,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  static async extractHeaderInfoFromDocx(lines, scheduleData) {
    const groupNumbers = new Set();
    for (const line of lines) {
      if (line.toLowerCase().includes('university') && !scheduleData.headerInfo.university) {
        scheduleData.headerInfo.university = line.trim();
      }
      const specialityMatch = line.match(/Schedules of\s*:\s*(.+?)\s*--\s*Section:\s*([A-Z])/i);
      if (specialityMatch && !scheduleData.headerInfo.speciality) {
        scheduleData.headerInfo.speciality = specialityMatch[1].trim();
        scheduleData.headerInfo.section = specialityMatch[2];
        console.log('Found speciality:', specialityMatch[1].trim());
        console.log('Found section:', specialityMatch[2]);
      }
      const yearMatch = line.match(/College year:\s*(\d{4}\/\d{4})/i);
      if (yearMatch && !scheduleData.headerInfo.academicYear) {
        scheduleData.headerInfo.academicYear = yearMatch[1];
      }
      const semesterMatch = line.match(/Semester:\s*(\d+)/i);
      if (semesterMatch && !scheduleData.headerInfo.semester) {
        scheduleData.headerInfo.semester = semesterMatch[1];
      }
      const dateMatch = line.match(/Date:\s*(\d{2}\/\d{2}\/\d{4})/i);
      if (dateMatch && !scheduleData.headerInfo.date) {
        scheduleData.headerInfo.date = dateMatch[1];
      }
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

  static async processDocxTables(tables, $, scheduleData) {
    for (let tableIndex = 0; tableIndex < tables.length; tableIndex++) {
      const table = tables[tableIndex];
      console.log(`Processing table ${tableIndex + 1}`);
      const rows = $(table).find('tr');
      console.log(`Table ${tableIndex + 1} has ${rows.length} rows`);

      if (rows.length < 2) {
        console.warn('Table has insufficient rows');
        continue;
      }

      const timeSlots = [];
      $(rows[0]).find('td, th').each((i, cell) => {
        if (i > 0) {
          const timeSlot = $(cell).text().trim();
          if (timeSlot && timeSlot.length > 0) {
            timeSlots.push(timeSlot);
          }
        }
      });
      console.log('Time slots found:', timeSlots);
      scheduleData.timeSlots = timeSlots;

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        let day = $(row).find('td:first-child, th:first-child').text().trim();
        day = normalizeDayName(day);

        if (!isDayLine(day)) {
          console.log(`Skipping row ${i} - invalid day: ${day}`);
          continue;
        }

        console.log(`Processing row ${i}, day: ${day}`);
        const cells = $(row).find('td, th').toArray();
        for (let colIndex = 1; colIndex < cells.length && colIndex <= timeSlots.length; colIndex++) {
          const cellContent = $(cells[colIndex]).text().trim();
          if (cellContent && cellContent.length > 0) {
            console.log(`Cell content at col ${colIndex}:`, cellContent.substring(0, 100));
            const entries = await ScheduleParser.parseScheduleBlock(
              cellContent,
              day,
              timeSlots[colIndex - 1]
            );
            if (entries && entries.length > 0) {
              scheduleData.scheduleEntries.push(...entries);
              console.log(`Added ${entries.length} entries from cell`);
            } else {
              console.warn('No entries parsed from cell content:', cellContent);
            }
          }
        }
      }
    }
  }

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