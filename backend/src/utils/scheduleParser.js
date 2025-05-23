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
      
      // Log the lines we're about to parse
      console.log('Lines to parse:', lines.slice(tableStructure.startIndex, tableStructure.startIndex + 10));
      
      // Process each line after the header
      let currentDay = null;
      let currentTimeSlotIndex = 0;
      let currentEntry = null;
      
      for (let i = tableStructure.startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        console.log(`Processing line ${i}: "${line}"`);
        
        // Skip empty lines
        if (!line) continue;
        
        // Check for day line with more flexible matching
        if (this.isDayLine(line)) {
          console.log(`Found day: ${line}`);
          // Map abbreviated days to full names
          const dayMap = {
            'mon': 'Monday',
            'tue': 'Tuesday',
            'wed': 'Wednesday',
            'thu': 'Thursday',
            'fri': 'Friday',
            'sat': 'Saturday',
            'sun': 'Sunday'
          };
          currentDay = dayMap[line.toLowerCase()] || line.split(/\s+/)[0].trim();
          currentTimeSlotIndex = 0;
          continue;
        }
        
        // Skip if no day is set
        if (!currentDay) {
          console.log('Skipping line - no day set');
          continue;
        }

        // Check for course entry (e.g., "SEC SYSTEM course")
        const courseMatch = line.match(/^(.+?)\s+course$/i);
        if (courseMatch) {
          console.log(`Found course entry: ${line}`);
          // If we have a previous entry, save it
          if (currentEntry && this.isValidEntry(currentEntry)) {
            console.log('Saving previous entry:', currentEntry);
            scheduleData.scheduleEntries.push(currentEntry);
          }
          
          // Start new course entry
          currentEntry = {
            day: currentDay,
            timeSlot: tableStructure.timeSlots[currentTimeSlotIndex],
            type: 'COURSE',
            modules: [courseMatch[1].trim()],
            professors: [],
            rooms: [],
            groups: []
          };
          console.log('Created new course entry:', currentEntry);
          continue;
        }

        // Try to parse the line as a group/room entry
        const groupRoomMatch = line.match(/^G(\d+):(?:TP\.)?([A-Z0-9.]+)$/i);
        if (groupRoomMatch) {
          console.log(`Found group/room entry: ${line}`);
          // If we have a previous entry, save it
          if (currentEntry && this.isValidEntry(currentEntry)) {
            console.log('Saving previous entry:', currentEntry);
            scheduleData.scheduleEntries.push(currentEntry);
          }
          
          // Start new entry
          currentEntry = {
            day: currentDay,
            timeSlot: tableStructure.timeSlots[currentTimeSlotIndex],
            type: 'unknown',
            modules: [],
            professors: [],
            rooms: [],
            groups: []
          };

          const [_, groupNum, roomInfo] = groupRoomMatch;
          currentEntry.groups.push(groupNum);
          
          if (roomInfo.includes('TP')) {
            currentEntry.type = 'TP';
            currentEntry.rooms.push({
              number: roomInfo.replace('TP', '').trim(),
              type: 'SALLE_TP'
            });
          } else {
            currentEntry.type = 'TD';
            currentEntry.rooms.push({
              number: roomInfo,
              type: 'SALLE_TD'
            });
          }
          console.log('Created new group/room entry:', currentEntry);
          continue;
        }

        // Try to parse module and professor
        const moduleProfMatch = line.match(/^\/(.+?)\s*--\s*([DP]W),\s*(.+)$/);
        if (moduleProfMatch && currentEntry) {
          console.log(`Found module/professor entry: ${line}`);
          const [_, moduleName, dwPw, professorName] = moduleProfMatch;
          currentEntry.modules.push(moduleName.trim());
          currentEntry.professors.push(professorName.trim());
          
          if (currentEntry.type === 'unknown') {
            currentEntry.type = dwPw === 'DW' ? 'COURSE' : 'TP';
          }
          
          // Save the entry if it's valid
          if (this.isValidEntry(currentEntry)) {
            console.log('Saving module/professor entry:', currentEntry);
            scheduleData.scheduleEntries.push(currentEntry);
            currentEntry = null;
            currentTimeSlotIndex = (currentTimeSlotIndex + 1) % tableStructure.timeSlots.length;
          }
          continue;
        }

        // Check for standalone room code (e.g., "SC")
        const roomCodeMatch = line.match(/^([A-Z0-9]+)$/);
        if (roomCodeMatch && currentEntry && currentEntry.type === 'COURSE') {
          console.log(`Found room code: ${line}`);
          currentEntry.rooms.push({
            number: roomCodeMatch[1],
            type: 'SALLE_COURS'
          });
          continue;
        }

        // Check for standalone professor name
        if (line.length > 1 && !line.match(/^G\d+:/) && !line.match(/^\/.+--/) && !line.toLowerCase().includes('course')) {
          console.log(`Found professor name: ${line}`);
          if (currentEntry && !currentEntry.professors.includes(line)) {
            currentEntry.professors.push(line.trim());
            
            // If this is a course entry with a professor, save it
            if (currentEntry.type === 'COURSE' && this.isValidEntry(currentEntry)) {
              console.log('Saving course entry with professor:', currentEntry);
              scheduleData.scheduleEntries.push(currentEntry);
              currentEntry = null;
              currentTimeSlotIndex = (currentTimeSlotIndex + 1) % tableStructure.timeSlots.length;
            }
          }
        }
      }

      // Save the last entry if it exists and is valid
      if (currentEntry && this.isValidEntry(currentEntry)) {
        console.log('Saving final entry:', currentEntry);
        scheduleData.scheduleEntries.push(currentEntry);
      }

      // Log the results
      console.log('Parsed schedule data:', {
        timeSlots: scheduleData.timeSlots.length,
        entries: scheduleData.scheduleEntries.length,
        firstEntry: scheduleData.scheduleEntries[0]
      });

      // Validate the data before returning
      const validation = this.validateScheduleData(scheduleData);
      if (!validation.isValid) {
        console.error('Schedule data validation failed:', validation.errors);
        return {
          success: false,
          error: `Invalid schedule data: ${validation.errors.join(', ')}`
        };
      }

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
    let startIndex = -1;
    let timeSlots = [];
    let headerBlockEndIndex = -1;
    let potentialHeaderLines = [];

    // Find the lines that contain time slots - these are likely the header
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const timeSlotsInLine = this.extractTimeSlotsFromLine(line);

      if (timeSlotsInLine.length > 0) {
        // Found a line with time slots, start collecting potential header lines
        potentialHeaderLines.push(line);
        headerBlockEndIndex = i;

        // Check the next few lines to see if they are part of the header
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
             const nextLine = lines[j].trim();
             const moreTimeSlots = this.extractTimeSlotsFromLine(nextLine);
             // If the next line contains more time slots, is empty, or starts with a pipe, consider it a continuation
             if (moreTimeSlots.length > 0 || nextLine === '' || nextLine.match(/^\s*[|]/)) {
                 potentialHeaderLines.push(nextLine);
                 headerBlockEndIndex = j; // Update end index
             } else {
                 break; // Stop if the pattern is broken
             }
        }

        // Combine potential header lines and extract time slots
        const combinedHeader = potentialHeaderLines.join(' ');
        timeSlots = this.extractTimeSlotsFromLine(combinedHeader);

        // If we found multiple time slots, we consider the header found
        if (timeSlots.length > 1) {
           // Log detected header information
           console.log('Detected Header Lines:', potentialHeaderLines); // Log header lines
           console.log('Extracted Time Slots:', timeSlots); // Log extracted time slots

           // The start index of the table entries is the first line AFTER the header block that contains a day
           startIndex = lines.findIndex((line, index) => 
             index > headerBlockEndIndex && this.isDayLine(line.trim().split(/[|\t]/)[0])
           );
            
            // Fallback: If no clear day line found immediately after header, just start after the header block
            if (startIndex === -1) {
                startIndex = headerBlockEndIndex + 1;
            }

           // Log calculated start index and initial lines for parsing
           console.log('Calculated Table Start Index:', startIndex); // Log start index
           console.log('Lines from Start Index (first 10):', lines.slice(startIndex, startIndex + 10)); // Log first 10 table lines

           break; // Found and processed the header, exit main loop
        } else {
            // Not enough time slots detected in this potential header block, reset and continue search
            potentialHeaderLines = [];
            timeSlots = [];
            startIndex = -1;
            headerBlockEndIndex = -1; // Reset end index
        }
      }
    }

    return {
      found: timeSlots.length > 0 && startIndex !== -1,
      startIndex,
      timeSlots: timeSlots
    };
  }

  /**
   * Extract time slots from a line with more flexible patterns
   * @param {string} line - Line containing time information
   * @returns {Array} Array of time slots
   */
  static extractTimeSlotsFromLine(line) {
    const timeSlots = new Set(); // Use a Set to automatically handle duplicates

    // More flexible time patterns
    const timePatterns = [
      /(\d{1,2}[:.]\d{2})\s*[-–—]\s*(\d{1,2}[:.]\d{2})/g,  // HH:MM - HH:MM or HH.MM - HH.MM with various hyphens
      /(\d{1,2}[h.]\d{2})\s*[-–—]\s*(\d{1,2}[h.]\d{2})/g, // HHhMM - HHhMM or HH.MM - HH.MM (French/alternative)
      /(\d{1,2}[:.]\d{2})\s*[àto]\s*(\d{1,2}[:.]\d{2})/g,  // HH:MM à HH:MM or HH.MM to HH.MM
      /(\d{1,2}[:.]\d{2})/g,  // Just HH:MM or HH.MM
      /(\d{1,2}[h.]\d{2})/g   // Just HHhMM or HH.MM
    ];

    // Clean the line by replacing multiple spaces with single space and handling potential stray characters
    const cleanedLine = line.replace(/\s+/g, ' ').replace(/[^\x20-\x7E]/g, ''); // Remove non-ASCII chars

    for (const pattern of timePatterns) {
        let match;
        while ((match = pattern.exec(cleanedLine)) !== null) {
            // For range patterns (first two), extract both start and end times
            if (match[2]) { 
                const startTime = match[1].replace(/[h.]/g, ':');
                const endTime = match[2].replace(/[h.]/g, ':');
                // Normalize range separator for consistency
                timeSlots.add(`${startTime} - ${endTime}`);
            } else { 
                // For single time patterns, add the time directly
                const singleTime = match[1].replace(/[h.]/g, ':');
                 // Only add if it looks like a potential start or end of a range (optional: may add noise)
                 // For now, just add it, relying on the range patterns to capture the full slots first
                 timeSlots.add(singleTime);
            }
        }
    }

     // Convert Set to Array, filter to keep only ranges if ranges were found, otherwise keep all unique times
     const timeSlotsArray = Array.from(timeSlots);
     const rangeTimeSlots = timeSlotsArray.filter(ts => ts.includes(' - '));

     if(rangeTimeSlots.length > 0) {
         // Sort range time slots
         return rangeTimeSlots.sort((a, b) => {
             const [aStart] = a.split(' - ');
             const [bStart] = b.split(' - ');
             return aStart.localeCompare(bStart);
         });
     } else {
         // If no ranges found, return all unique single times, sorted
          return timeSlotsArray.sort((a, b) => a.localeCompare(b));
     }
  }

  /**
   * Check if a line represents a day row
   * @param {string} line - Line to check
   * @returns {boolean} True if it's a day line
   */
  static isDayLine(line) {
    // More flexible day pattern that matches both full names and abbreviations
    const dayPattern = /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|mon|tue|wed|thu|fri|sat|sun)$/i;
    return dayPattern.test(line.trim());
  }

  /**
   * Parse table entries from lines
   * @param {Array} tableLines - Lines containing table data, starting from the first day
   * @param {Array} timeSlots - Available time slots (sorted)
   * @returns {Array} Schedule entries
   */
  static parseTableEntries(tableLines, timeSlots) {
    const entries = [];
    let currentDay = null;
    let dayContentLines = [];
    let currentTimeSlotIndex = 0;

    for (let i = 0; i < tableLines.length; i++) {
      const line = tableLines[i].trim();
      
      // Enhanced day detection
      if (this.isDayLine(line) || line.match(/^(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i)) {
        // Process previous day's content if exists
        if (currentDay && dayContentLines.length > 0) {
          const dayEntries = this.parseDayBlock(currentDay, dayContentLines, timeSlots);
          entries.push(...dayEntries);
        }
        
        // Start new day
        currentDay = line.split(/\s+/)[0].trim();
        dayContentLines = [];
        currentTimeSlotIndex = 0;
        continue;
      }

      // Skip empty lines
      if (!line) continue;

      // Check if line contains a time slot
      const timeSlotMatch = line.match(/(\d{1,2}[:.]\d{2})\s*[-–—]\s*(\d{1,2}[:.]\d{2})/);
      if (timeSlotMatch) {
        currentTimeSlotIndex = timeSlots.findIndex(slot => 
          slot.includes(timeSlotMatch[1]) || slot.includes(timeSlotMatch[2])
        );
        if (currentTimeSlotIndex === -1) currentTimeSlotIndex = 0;
      }

      // Collect content lines
      if (currentDay !== null) {
        dayContentLines.push(line);
        
        // Try to parse entry immediately if it looks complete
        if (line.match(/(?:G\d+:|course|TP|TD)/i)) {
          const entry = this.parseSingleEntryBlock(line, currentDay, timeSlots[currentTimeSlotIndex]);
          if (entry && this.isValidEntry(entry)) {
            entries.push(entry);
            currentTimeSlotIndex = (currentTimeSlotIndex + 1) % timeSlots.length;
            dayContentLines = []; // Clear after successful parse
          }
        }
      }
    }

    // Process the last day's content
    if (currentDay && dayContentLines.length > 0) {
      const dayEntries = this.parseDayBlock(currentDay, dayContentLines, timeSlots);
      entries.push(...dayEntries);
    }

    return entries;
  }

  /**
   * Parse all content lines belonging to a single day block and extract entries
   * @param {string} day - The day of the entries
   * @param {Array} contentLines - Lines of text content for this day's block
   * @param {Array} timeSlots - Available time slots (sorted)
   * @returns {Array} Schedule entries for the day
   */
  static parseDayBlock(day, contentLines, timeSlots) {
    const entries = [];
    const combinedContent = contentLines.join('\n').trim();
    
    // Enhanced entry pattern matching
    const entryPatterns = [
      /(G\d+:[^\n]*\n?\/[^\n]*--\s*[DP]W,[^\n]*)/,  // TP/TD pattern
      /([^\n]*\s+course[^\n]*)/,                     // Course pattern
      /(G\d+:[^\n]*)/,                              // Group pattern
      /([^\n]*TP[^\n]*)/,                           // TP pattern
      /([^\n]*TD[^\n]*)/                            // TD pattern
    ];

    let timeSlotIndex = 0;
    let remainingContent = combinedContent;

    while (remainingContent) {
      let bestMatch = null;
      let bestPattern = null;

      // Find the best matching pattern
      for (const pattern of entryPatterns) {
        const match = remainingContent.match(pattern);
        if (match && (!bestMatch || match[0].length > bestMatch[0].length)) {
          bestMatch = match;
          bestPattern = pattern;
        }
      }

      if (!bestMatch) break;

      const entryText = bestMatch[0].trim();
      const timeSlot = timeSlots[timeSlotIndex % timeSlots.length];
      
      const entry = this.parseSingleEntryBlock(entryText, day, timeSlot);
      if (entry && this.isValidEntry(entry)) {
        entries.push(entry);
        timeSlotIndex++;
      }

      // Remove the matched content and continue
      remainingContent = remainingContent.slice(bestMatch.index + bestMatch[0].length).trim();
    }

    return entries;
  }

  /**
   * Parse text for a single entry block (e.g., TP/TD or Course) and extract details
   * @param {string} blockContent - Text content for a single entry block
   * @param {string} day - Day of the week
   * @param {string} timeSlot - Time slot
   * @returns {Object|null} Parsed entry object or null if parsing fails
   */
  static parseSingleEntryBlock(blockContent, day, timeSlot) {
    const entry = {
      day: day || '',
      timeSlot: timeSlot || '',
      type: 'unknown',
      modules: [],
      professors: [],
      rooms: [],
      groups: []
    };

    // Split content into lines and clean them
    const lines = blockContent.split('\n').map(line => line.trim()).filter(Boolean);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check for group and room pattern (e.g., "G1:TP122")
      const groupRoomMatch = line.match(/^G(\d+):(?:TP\.)?([A-Z0-9.]+)$/i);
      if (groupRoomMatch) {
        const [_, groupNum, roomInfo] = groupRoomMatch;
        entry.groups.push(groupNum);
        
        // Determine type from room info
        if (roomInfo.includes('TP')) {
          entry.type = 'TP';
          entry.rooms.push({
            number: roomInfo.replace('TP', '').trim(),
            type: 'SALLE_TP'
          });
        } else {
          entry.type = 'TD';
          entry.rooms.push({
            number: roomInfo,
            type: 'SALLE_TD'
          });
        }
        continue;
      }

      // Check for module and professor pattern (e.g., "/Res Proto -- PW, Bouachi")
      const moduleProfMatch = line.match(/^\/(.+?)\s*--\s*([DP]W),\s*(.+)$/);
      if (moduleProfMatch) {
        const [_, moduleName, dwPw, professorName] = moduleProfMatch;
        entry.modules.push(moduleName.trim());
        entry.professors.push(professorName.trim());
        
        // Set type based on DW/PW if not already set
        if (entry.type === 'unknown') {
          entry.type = dwPw === 'DW' ? 'COURSE' : 'TP';
        }
        continue;
      }

      // Check for standalone room number (e.g., "170")
      const roomMatch = line.match(/^(\d+)$/);
      if (roomMatch && entry.type === 'COURSE') {
        entry.rooms.push({
          number: roomMatch[1],
          type: 'SALLE_COURS'
        });
        continue;
      }

      // Check for standalone professor name or room number followed by professor name
      if (line.length > 1 && !line.match(/^G\d+:/) && !line.match(/^\/.+--/)) {
        // Try to match room number followed by professor name
        const roomProfMatch = line.match(/^(\d+)\s+(.+)$/);
        if (roomProfMatch) {
          const [_, roomNum, profName] = roomProfMatch;
          if (entry.type === 'COURSE') {
            entry.rooms.push({
              number: roomNum,
              type: 'SALLE_COURS'
            });
          }
          if (!entry.professors.includes(profName)) {
            entry.professors.push(profName.trim());
          }
        } else if (!line.toLowerCase().includes('course')) {
          // If no room number found, treat as standalone professor name
          if (!entry.professors.includes(line)) {
            entry.professors.push(line.trim());
          }
        }
      }

      // Check for course entry with professor name
      const courseMatch = line.match(/^(.+?)\s+course\s+(.+)$/i);
      if (courseMatch) {
        const [_, moduleName, professorName] = courseMatch;
        entry.modules.push(moduleName.trim());
        entry.type = 'COURSE';
        if (!entry.professors.includes(professorName)) {
          entry.professors.push(professorName.trim());
        }
        continue;
      }

      // Check for course entry without professor name
      const courseOnlyMatch = line.match(/^(.+?)\s+course$/i);
      if (courseOnlyMatch) {
        const [_, moduleName] = courseOnlyMatch;
        entry.modules.push(moduleName.trim());
        entry.type = 'COURSE';
        continue;
      }
    }

    // Log the parsed entry for debugging
    console.log('Parsed entry:', {
      day: entry.day,
      timeSlot: entry.timeSlot,
      type: entry.type,
      modules: entry.modules,
      professors: entry.professors,
      rooms: entry.rooms,
      groups: entry.groups
    });

    return this.isValidEntry(entry) ? entry : null;
  }

  /**
   * Check if entry has valid data
   * @param {Object} entry - Entry to validate
   * @returns {boolean} True if valid
   */
  static isValidEntry(entry) {
    if (!entry) return false;

    // For course entries, we need at least a module
    if (entry.type === 'COURSE') {
      return entry.modules && entry.modules.length > 0;
    }

    // For TP/TD entries, we need at least a group and a module
    if (entry.type === 'TP' || entry.type === 'TD') {
      return (entry.groups && entry.groups.length > 0) && 
             (entry.modules && entry.modules.length > 0);
    }

    // For unknown type, require at least one of: groups, modules, or professors
    return (entry.groups && entry.groups.length > 0) ||
           (entry.modules && entry.modules.length > 0) ||
           (entry.professors && entry.professors.length > 0);
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
      'sunday': 'SUNDAY',
      'lundi': 'MONDAY',
      'mardi': 'TUESDAY',
      'mercredi': 'WEDNESDAY',
      'jeudi': 'THURSDAY',
      'vendredi': 'FRIDAY',
      'samedi': 'SATURDAY',
      'dimanche': 'SUNDAY'
    };
    return dayMap[day.toLowerCase()] || 'MONDAY';
  }

  static extractTimeRange(timeSlot) {
    const match = timeSlot.match(/(\d{1,2}[:]\d{2})\s*-\s*(\d{1,2}[:]\d{2})/);
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

  /**
   * Validate schedule data structure and content
   * @param {Object} data - Schedule data to validate
   * @returns {Object} Validation result
   */
  static validateScheduleData(data) {
    const errors = [];
    const warnings = []; // Use warnings for non-critical issues like missing header info
    
    if (!data) {
      return {
        isValid: false,
        errors: ['No data provided']
      };
    }

    // Check header info (now as warnings)
    if (!data.headerInfo) {
      warnings.push('Missing header information object');
    } else {
      if (!data.headerInfo.speciality) {
        warnings.push('Missing speciality information in header');
      }
      if (!data.headerInfo.section) {
        warnings.push('Missing section information in header');
      }
      // Add checks for other critical header fields if necessary, as warnings
      if (!data.headerInfo.academicYear) {
           warnings.push('Missing academic year information in header');
      }
       if (!data.headerInfo.semester) {
            warnings.push('Missing semester information in header');
       }
    }

    // Check time slots (critical)
    if (!data.timeSlots || !Array.isArray(data.timeSlots) || data.timeSlots.length === 0) {
      errors.push('No time slots found'); // This remains a critical error
    }

    // Check schedule entries (critical)
    if (!data.scheduleEntries || !Array.isArray(data.scheduleEntries) || data.scheduleEntries.length === 0) {
      errors.push('No schedule entries found'); // This remains a critical error
    } else {
      // Basic validation for each entry - still critical if essential fields are missing
      data.scheduleEntries.forEach((entry, index) => {
        if (!entry.day) {
          errors.push(`Entry ${index + 1}: Missing day`);
        }
        if (!entry.timeSlot) {
          errors.push(`Entry ${index + 1}: Missing time slot`);
        }
        // Relaxing requirement for modules/professors/rooms/groups in individual entries
        // An entry is valid if it has day and timeSlot
        // Further validation of entry content might be needed depending on import requirements
      });
    }

    return {
      isValid: errors.length === 0, // Validation passes if no critical errors
      errors,
      warnings
    };
  }

  /**
   * Format schedule data for database storage
   * @param {Object} data - Schedule data to format
   * @returns {Object} Formatted data
   */
  static formatForDatabase(data) {
    if (!data || !data.scheduleEntries) {
      return data;
    }

    return {
      ...data,
      scheduleEntries: data.scheduleEntries.map(entry => ({
        ...entry,
        day: this.convertDayToEnum(entry.day),
        timeSlot: entry.timeSlot,
        modules: entry.modules || [],
        professors: entry.professors || [],
        rooms: entry.rooms || [],
        groups: entry.groups || []
      }))
    };
  }
}

// Export for different module systems
export { ScheduleParser };
export const convertDayToEnum = ScheduleParser.convertDayToEnum;
export const extractTimeRange = ScheduleParser.extractTimeRange;
export const extractScheduleData = ScheduleParser.extractScheduleData;

export default ScheduleParser;