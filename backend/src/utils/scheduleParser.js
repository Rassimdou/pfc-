// Enhanced Schedule Parser - Unified version
import mammoth from 'mammoth';
import * as cheerio from 'cheerio';

class ScheduleParser {
  /**
   * Main processing function for schedule files
   * @param {Buffer} fileBuffer - File content as Buffer
   * @param {string} fileType - File extension (pdf/docx)
   * @param {Object} options - Additional processing options
   * @returns {Promise<Object>} Parsed schedule data
   */
  static async processScheduleFile(fileBuffer, fileType, options = {}) {
    try {
      console.log('Processing schedule file with type:', fileType);
      
      if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
        throw new Error('Invalid file buffer provided');
      }
      
      const processor = this.getProcessor(fileType);
      if (!processor) {
        throw new Error(`Unsupported file type: ${fileType}`);
      }
      
      const result = await processor.call(this, fileBuffer, options);
      
      if (result.success) {
        // Validate and enhance the parsed data
        result.data = this.validateAndEnhanceData(result.data);
        result.summary = this.generateDataSummary(result.data);
      }
      
      return result;
    } catch (error) {
      console.error('Processing error:', error);
      return {
        success: false,
        error: error.message,
        details: error.stack
      };
    }
  }

  /**
   * Get the appropriate processor for the file type
   * @param {string} fileType - File extension
   * @returns {Function|null} Processor function
   */
  static getProcessor(fileType) {
    const processors = {
      'pdf': this.processPDF,
      'docx': this.processDOCX
    };
    return processors[fileType.toLowerCase()];
  }

  /**
   * Process PDF files with enhanced error handling
   * @param {Buffer} pdfBuffer - PDF file content
   * @param {Object} options - Processing options
   */
  static async processPDF(pdfBuffer, options = {}) {
    try {
      console.log('Starting PDF processing, buffer size:', pdfBuffer.length);
      
      // Dynamic import for better compatibility
      const pdfParse = (await import('pdf-parse')).default;
      const data = await pdfParse(pdfBuffer);
      
      if (!data || !data.text) {
        throw new Error('Failed to extract text from PDF');
      }
      
      console.log('PDF text extracted, length:', data.text.length);
      return this.parseExtractedText(data.text, 'pdf');
    } catch (error) {
      console.error('Error processing PDF:', error);
      return {
        success: false,
        error: `PDF processing failed: ${error.message}`,
        suggestions: [
          'Ensure the PDF contains selectable text',
          'Try converting the PDF to DOCX format',
          'Check if the PDF is password protected'
        ]
      };
    }
  }

  /**
   * Process DOCX files with enhanced table detection
   * @param {Buffer} docxBuffer - DOCX file content
   * @param {Object} options - Processing options
   */
  static async processDOCX(docxBuffer, options = {}) {
    try {
      console.log('Starting DOCX processing, buffer size:', docxBuffer.length);
      
      const { value: html } = await mammoth.convertToHtml({ buffer: docxBuffer });
      console.log('DOCX converted to HTML, length:', html.length);
      
      const $ = cheerio.load(html);
      
      // Check for images first
      const images = $('img');
      if (images.length > 0 && !options.ignoreImages) {
        return {
          success: false,
          error: 'Document contains images instead of text tables',
          containsImages: true,
          imageCount: images.length,
          suggestions: [
            'Convert images to text-based tables in Word',
            'Use OCR software to extract text from images',
            'Manually recreate the schedule in text format',
            'Save as HTML and retry processing'
          ]
        };
      }
      
      return this.parseDOCXHtml(html, $);
    } catch (error) {
      console.error('Error processing DOCX:', error);
      return {
        success: false,
        error: `DOCX processing failed: ${error.message}`
      };
    }
  }

  /**
   * Parse extracted text content (works for both PDF and plain text)
   * @param {string} text - Extracted text
   * @param {string} sourceType - Source file type
   */
  static parseExtractedText(text, sourceType = 'unknown') {
    try {
      const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
      console.log(`Parsing ${lines.length} lines from ${sourceType}`);
      
      const scheduleData = {
        headerInfo: this.extractHeaderInformation(lines),
        timeSlots: [],
        scheduleEntries: []
      };

      // Find table structure
      const tableStructure = this.detectTableStructure(lines);
      if (!tableStructure.found) {
        return {
          success: false,
          error: 'No schedule table structure detected',
          rawText: text.substring(0, 500) + '...'
        };
      }

      scheduleData.timeSlots = tableStructure.timeSlots;
      scheduleData.scheduleEntries = this.parseTableEntries(
        lines.slice(tableStructure.startIndex),
        tableStructure.timeSlots
      );

      return {
        success: true,
        data: scheduleData,
        sourceType
      };
    } catch (error) {
      console.error('Error parsing text:', error);
      return {
        success: false,
        error: `Text parsing failed: ${error.message}`
      };
    }
  }

  /**
   * Parse DOCX HTML content with enhanced table handling
   * @param {string} html - Converted HTML from DOCX
   * @param {CheerioAPI} $ - Cheerio instance
   */
  static parseDOCXHtml(html, $) {
    try {
      const bodyText = $('body').text();
      const scheduleData = {
        headerInfo: this.extractHeaderFromHtml($, bodyText),
        timeSlots: [],
        scheduleEntries: []
      };

      const tables = $('table');
      console.log(`Found ${tables.length} tables`);
      
      if (tables.length === 0) {
        return {
          success: false,
          error: 'No tables found in document',
          hasContent: bodyText.length > 0,
          contentPreview: bodyText.substring(0, 200)
        };
      }

      // Process the main schedule table
      const scheduleTable = this.findScheduleTable(tables, $);
      if (!scheduleTable) {
        return {
          success: false,
          error: 'No valid schedule table found'
        };
      }

      const tableData = this.parseHtmlTable(scheduleTable, $);
      scheduleData.timeSlots = tableData.timeSlots;
      scheduleData.scheduleEntries = tableData.entries;

      return {
        success: true,
        data: scheduleData,
        sourceType: 'docx'
      };
    } catch (error) {
      console.error('Error parsing DOCX HTML:', error);
      return {
        success: false,
        error: `HTML parsing failed: ${error.message}`
      };
    }
  }

  /**
   * Extract header information from text lines
   * @param {Array} lines - Array of text lines
   * @returns {Object} Header information
   */
  static extractHeaderInformation(lines) {
    const headerInfo = {
      university: '',
      speciality: '',
      section: '',
      academicYear: '',
      semester: '',
      date: ''
    };

    const patterns = {
      university: /university|université/i,
      speciality: /(?:ING\.|SIGL|INFO|MAS\.HPC|specialit[yé])/i,
      section: /section:\s*([A-Z])/i,
      academicYear: /(?:college year|année):\s*(\d{4}\/\d{4})/i,
      semester: /semester?:\s*(\d+)/i,
      date: /date:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i
    };

    for (const line of lines) {
      for (const [key, pattern] of Object.entries(patterns)) {
        if (!headerInfo[key]) {
          const match = line.match(pattern);
          if (match) {
            headerInfo[key] = match[1] || line.trim();
            console.log(`Found ${key}:`, headerInfo[key]);
          }
        }
      }
    }

    return headerInfo;
  }

  /**
   * Detect table structure in text lines
   * @param {Array} lines - Array of text lines
   * @returns {Object} Table structure information
   */
  static detectTableStructure(lines) {
    // Look for table indicators with more flexible patterns
    const tableIndicators = [
      /^\s*[|]\s*.*[|]\s*$/,  // Lines with pipes
      /^\s*\d{1,2}[:]\d{2}\s*[-]\s*\d{1,2}[:]\d{2}/,  // Time patterns
      /monday|tuesday|wednesday|thursday|friday|saturday|sunday/i,
      /^\s*\d{1,2}[:]\d{2}/,  // Just time without range
      /^\s*[A-Za-z]+\s*[-]\s*\d{1,2}[:]\d{2}/,  // Day - time format
      /^\s*[A-Za-z]+\s*[,]\s*\d{1,2}[:]\d{2}/   // Day, time format
    ];

    let startIndex = -1;
    let timeSlots = [];

    // First pass: look for time slots
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Try to extract time slots from current line
      timeSlots = this.extractTimeSlotsFromLine(line);
      
      if (timeSlots.length > 0) {
        startIndex = i;
        break;
      }
      
      // If no time slots found, check for day patterns
      if (tableIndicators.some(pattern => pattern.test(line))) {
        startIndex = i;
        // Try to extract time slots from next line
        if (i + 1 < lines.length) {
          timeSlots = this.extractTimeSlotsFromLine(lines[i + 1]);
        }
        break;
      }
    }

    // If no time slots found but we have a start index, try to find time slots in subsequent lines
    if (startIndex !== -1 && timeSlots.length === 0) {
      for (let i = startIndex + 1; i < Math.min(startIndex + 5, lines.length); i++) {
        timeSlots = this.extractTimeSlotsFromLine(lines[i]);
        if (timeSlots.length > 0) {
          startIndex = i;
          break;
        }
      }
    }

    return {
      found: startIndex !== -1,
      startIndex,
      timeSlots
    };
  }

  /**
   * Extract time slots from a line with more flexible patterns
   * @param {string} line - Line containing time information
   * @returns {Array} Array of time slots
   */
  static extractTimeSlotsFromLine(line) {
    const timeSlots = [];
    
    // More flexible time patterns
    const timePatterns = [
      /\d{1,2}[:]\d{2}\s*[-]\s*\d{1,2}[:]\d{2}/,  // 09:00 - 10:30
      /\d{1,2}[:]\d{2}/,  // Just time
      /\d{1,2}[h]\d{2}/,  // French format
      /\d{1,2}[.]\d{2}/   // Alternative format
    ];
    
    // Split by common delimiters
    const parts = line.split(/[|\t,;]/).map(part => part.trim());
    
    for (const part of parts) {
      for (const pattern of timePatterns) {
        const match = part.match(pattern);
        if (match) {
          timeSlots.push(match[0]);
          break;
        }
      }
    }
    
    return timeSlots;
  }

  /**
   * Parse table entries from lines
   * @param {Array} tableLines - Lines containing table data
   * @param {Array} timeSlots - Available time slots
   * @returns {Array} Schedule entries
   */
  static parseTableEntries(tableLines, timeSlots) {
    const entries = [];
    
    for (const line of tableLines) {
      if (this.isDayLine(line)) {
        const dayEntries = this.parseDayLine(line, timeSlots);
        entries.push(...dayEntries);
      }
    }
    
    return entries;
  }

  /**
   * Check if a line represents a day row
   * @param {string} line - Line to check
   * @returns {boolean} True if it's a day line
   */
  static isDayLine(line) {
    const dayPattern = /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i;
    return dayPattern.test(line.trim());
  }

  /**
   * Parse a day line into schedule entries
   * @param {string} line - Day line to parse
   * @param {Array} timeSlots - Available time slots
   * @returns {Array} Schedule entries for the day
   */
  static parseDayLine(line, timeSlots) {
    const columns = line.split(/[|\t]/).map(col => col.trim());
    const day = columns[0];
    const entries = [];

    for (let i = 1; i < columns.length && i <= timeSlots.length; i++) {
      const cellContent = columns[i];
      if (cellContent && cellContent.length > 0) {
        const cellEntries = this.parseScheduleCell(
          cellContent,
          day,
          timeSlots[i - 1]
        );
        entries.push(...cellEntries);
      }
    }

    return entries;
  }

  /**
   * Enhanced schedule cell parser
   * @param {string} cellContent - Content of the cell
   * @param {string} day - Day of the week
   * @param {string} timeSlot - Time slot
   * @returns {Array} Array of schedule entries
   */
  static parseScheduleCell(cellContent, day, timeSlot) {
    if (!cellContent?.trim()) return [];

    try {
      // Split content into logical parts
      const parts = this.splitCellContent(cellContent);
      const entries = [];

      for (const part of parts) {
        const entry = this.createBaseEntry(day, timeSlot);
        this.enrichEntry(entry, part);
        
        if (this.isValidEntry(entry)) {
          entries.push(entry);
        }
      }

      return entries;
    } catch (error) {
      console.error('Error parsing cell:', error);
      return [];
    }
  }

  /**
   * Split cell content into logical parts
   * @param {string} content - Cell content
   * @returns {Array} Array of content parts
   */
  static splitCellContent(content) {
    // Split on group patterns (G1:, G2:, etc.)
    const groupPattern = /(?=G\d+:)/g;
    let parts = content.split(groupPattern).filter(Boolean);
    
    // If no groups found, treat as single part
    if (parts.length === 1 && !parts[0].includes('G')) {
      // Try splitting on newlines or other delimiters
      parts = content.split(/[\n\r]+/).filter(Boolean);
    }
    
    return parts;
  }

  /**
   * Create a base entry structure
   * @param {string} day - Day of the week
   * @param {string} timeSlot - Time slot
   * @returns {Object} Base entry
   */
  static createBaseEntry(day, timeSlot) {
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
   * Enrich entry with parsed information
   * @param {Object} entry - Entry to enrich
   * @param {string} content - Content to parse
   */
  static enrichEntry(entry, content) {
    const lines = content.split(/[\n\r]+/).map(line => line.trim()).filter(Boolean);
    
    for (const line of lines) {
      // Group pattern: G1:457, G2:TP126
      const groupMatch = line.match(/^G(\d+):(.*)$/);
      if (groupMatch) {
        entry.groups.push(`G${groupMatch[1]}`);
        this.parseGroupInfo(entry, groupMatch[2]);
        continue;
      }
      
      // Module and professor pattern: /Module -- DW, Professor Name
      const moduleMatch = line.match(/^\/(.+?)\s*--\s*[DP]W,\s*(.+)$/);
      if (moduleMatch) {
        entry.modules.push(moduleMatch[1].trim());
        entry.professors.push(moduleMatch[2].trim());
        continue;
      }
      
      // Course pattern: Module Name course
      const courseMatch = line.match(/^(.+?)\s+course$/i);
      if (courseMatch) {
        entry.type = 'COURSE';
        entry.modules.push(courseMatch[1].trim());
        continue;
      }
      
      // Standalone module or professor
      this.parseStandaloneLine(entry, line);
    }
  }

  /**
   * Parse group information
   * @param {Object} entry - Entry to update
   * @param {string} groupInfo - Group information string
   */
  static parseGroupInfo(entry, groupInfo) {
    const info = groupInfo.trim();
    
    // TP room pattern
    if (info.includes('TP')) {
      entry.type = 'TP';
      const tpMatch = info.match(/TP(\d+)/);
      if (tpMatch) {
        entry.rooms.push({
          number: tpMatch[1],
          type: 'SALLE_TP'
        });
      }
    }
    // Regular room number
    else if (/^\d+$/.test(info)) {
      entry.type = entry.type === 'unknown' ? 'TD' : entry.type;
      entry.rooms.push({
        number: info,
        type: entry.type === 'COURSE' ? 'SALLE_COURS' : 'SALLE_TD'
      });
    }
  }

  /**
   * Parse standalone line (professor, room, etc.)
   * @param {Object} entry - Entry to update
   * @param {string} line - Line to parse
   */
  static parseStandaloneLine(entry, line) {
    // Short alphanumeric: likely a room
    if (line.length <= 4 && /^[A-Z0-9]+$/i.test(line)) {
      entry.rooms.push({
        number: line,
        type: entry.type === 'COURSE' ? 'SALLE_COURS' : 'SALLE_TD'
      });
    }
    // Longer text: likely professor or module
    else if (line.length > 4 && !line.includes(':') && !line.includes('--')) {
      if (entry.modules.length === 0) {
        entry.modules.push(line);
      } else if (entry.professors.length === 0) {
        entry.professors.push(line);
      }
    }
  }

  /**
   * Check if entry has valid data
   * @param {Object} entry - Entry to validate
   * @returns {boolean} True if valid
   */
  static isValidEntry(entry) {
    return entry.groups.length > 0 || 
           entry.modules.length > 0 || 
           entry.professors.length > 0;
  }

  /**
   * Find the main schedule table in HTML tables
   * @param {CheerioStatic} tables - Cheerio table elements
   * @param {CheerioAPI} $ - Cheerio instance
   * @returns {CheerioElement|null} Schedule table element
   */
  static findScheduleTable(tables, $) {
    let bestTable = null;
    let maxScore = 0;

    tables.each((i, table) => {
      const score = this.scoreTableAsSchedule(table, $);
      if (score > maxScore) {
        maxScore = score;
        bestTable = table;
      }
    });

    return maxScore > 0 ? bestTable : null;
  }

  /**
   * Score a table based on how likely it is to be a schedule
   * @param {CheerioElement} table - Table element
   * @param {CheerioAPI} $ - Cheerio instance
   * @returns {number} Score
   */
  static scoreTableAsSchedule(table, $) {
    let score = 0;
    const rows = $(table).find('tr');
    
    if (rows.length < 2) return 0;
    
    // Check first row for time patterns
    const firstRowText = $(rows[0]).text().toLowerCase();
    if (firstRowText.includes('time') || /\d{1,2}:\d{2}/.test(firstRowText)) {
      score += 10;
    }
    
    // Check for day names in first column
    const dayPattern = /monday|tuesday|wednesday|thursday|friday/i;
    rows.each((i, row) => {
      if (i > 0) {
        const firstCell = $(row).find('td, th').first().text();
        if (dayPattern.test(firstCell)) {
          score += 5;
        }
      }
    });
    
    // Prefer tables with more rows and columns
    const colCount = $(rows[0]).find('td, th').length;
    score += Math.min(rows.length * 2, 20);
    score += Math.min(colCount * 3, 15);
    
    return score;
  }

  /**
   * Parse HTML table into schedule data
   * @param {CheerioElement} table - Table element
   * @param {CheerioAPI} $ - Cheerio instance
   * @returns {Object} Parsed table data
   */
  static parseHtmlTable(table, $) {
    const rows = $(table).find('tr');
    const timeSlots = [];
    const entries = [];

    // Extract time slots from header
    $(rows[0]).find('td, th').each((i, cell) => {
      if (i > 0) {
        const timeSlot = $(cell).text().trim();
        if (timeSlot) timeSlots.push(timeSlot);
      }
    });

    // Process data rows
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const day = $(row).find('td, th').first().text().trim();
      
      if (!day) continue;

      $(row).find('td, th').each((colIndex, cell) => {
        if (colIndex > 0 && colIndex <= timeSlots.length) {
          const cellContent = $(cell).text().trim();
          if (cellContent) {
            const cellEntries = this.parseScheduleCell(
              cellContent,
              day,
              timeSlots[colIndex - 1]
            );
            entries.push(...cellEntries);
          }
        }
      });
    }

    return { timeSlots, entries };
  }

  /**
   * Extract header information from HTML
   * @param {CheerioAPI} $ - Cheerio instance
   * @param {string} bodyText - Body text content
   * @returns {Object} Header information
   */
  static extractHeaderFromHtml($, bodyText) {
    const lines = bodyText.split('\n').map(line => line.trim()).filter(Boolean);
    return this.extractHeaderInformation(lines);
  }

  /**
   * Validate and enhance parsed data
   * @param {Object} data - Parsed schedule data
   * @returns {Object} Enhanced data
   */
  static validateAndEnhanceData(data) {
    if (!data) return data;

    // Ensure all entries have required fields
    if (data.scheduleEntries) {
      data.scheduleEntries = data.scheduleEntries.map(entry => ({
        ...entry,
        type: entry.type || 'unknown',
        modules: entry.modules || [],
        professors: entry.professors || [],
        rooms: entry.rooms || [],
        groups: entry.groups || []
      }));
    }

    // Add validation flags
    data.validation = {
      hasTimeSlots: (data.timeSlots?.length || 0) > 0,
      hasEntries: (data.scheduleEntries?.length || 0) > 0,
      hasHeaderInfo: Object.values(data.headerInfo || {}).some(v => v && v.trim())
    };

    return data;
  }

  /**
   * Generate summary statistics for parsed data
   * @param {Object} data - Parsed schedule data
   * @returns {Object} Summary statistics
   */
  static generateDataSummary(data) {
    if (!data) return {};

    const summary = {
      totalEntries: data.scheduleEntries?.length || 0,
      timeSlots: data.timeSlots?.length || 0,
      uniqueDays: new Set((data.scheduleEntries || []).map(e => e.day)).size,
      uniqueModules: new Set((data.scheduleEntries || []).flatMap(e => e.modules)).size,
      uniqueProfessors: new Set((data.scheduleEntries || []).flatMap(e => e.professors)).size,
      uniqueRooms: new Set((data.scheduleEntries || []).flatMap(e => e.rooms.map(r => r.number))).size,
      entryTypes: {}
    };

    // Count entry types
    (data.scheduleEntries || []).forEach(entry => {
      const type = entry.type || 'unknown';
      summary.entryTypes[type] = (summary.entryTypes[type] || 0) + 1;
    });

    return summary;
  }

  /**
   * Utility functions for external use
   */
  static convertDayToEnum(day) {
    const dayMap = {
      'monday': 'MONDAY',
      'tuesday': 'TUESDAY', 
      'wednesday': 'WEDNESDAY',
      'thursday': 'THURSDAY',
      'friday': 'FRIDAY',
      'saturday': 'SATURDAY',
      'sunday': 'SUNDAY'
    };
    return dayMap[day.toLowerCase()] || 'MONDAY';
  }

  static extractTimeRange(timeSlot) {
    const match = timeSlot.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
    return match ? [match[1], match[2]] : ['00:00', '00:00'];
  }

  /**
   * Main entry point for schedule extraction
   * @param {Buffer} fileBuffer - File content as Buffer
   * @param {string} fileType - File extension
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Extraction result
   */
  static async extractScheduleData(fileBuffer, fileType, options = {}) {
    try {
      const result = await this.processScheduleFile(fileBuffer, fileType, options);
      
      if (result.success) {
        console.log('Schedule extraction successful:', {
          entries: result.data.scheduleEntries?.length || 0,
          timeSlots: result.data.timeSlots?.length || 0
        });
      }
      
      return result;
    } catch (error) {
      console.error('Schedule extraction failed:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Export for different module systems
export { ScheduleParser };
export const convertDayToEnum = ScheduleParser.convertDayToEnum;
export const extractTimeRange = ScheduleParser.extractTimeRange;
export const extractScheduleData = ScheduleParser.extractScheduleData;

export default ScheduleParser;