import * as XLSX from 'xlsx';

class ExcelScheduleParser {
  static async parseExcelFile(fileBuffer) {
    try {
      if (!fileBuffer || fileBuffer.length === 0) {
        throw new Error('Empty file buffer provided');
      }

      // Read the Excel file
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error('Invalid Excel file: No sheets found');
      }

      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      if (!worksheet) {
        throw new Error('Invalid Excel file: First sheet is empty');
      }

      // Convert to JSON
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      if (!data || data.length === 0) {
        throw new Error('No data found in Excel file');
      }

      console.log('Excel data preview:', {
        totalRows: data.length,
        firstRow: data[0],
        secondRow: data[1]
      });

      // Initialize schedule data structure
      const scheduleData = {
        headerInfo: {
          university: 'USTHB',
          speciality: 'Default Speciality',
          section: 'A',
          academicYear: new Date().getFullYear().toString(),
          semester: '1',
          date: new Date().toLocaleDateString()
        },
        timeSlots: [],
        scheduleEntries: []
      };

      // FIXED: Look for time slots in the first few rows, or use default if none found
      let timeSlotsFound = false;
      let startRow = 0;
      
      // Try to find time slots in first 3 rows
      for (let i = 0; i < Math.min(3, data.length); i++) {
        const extractedSlots = this.extractTimeSlots(data[i]);
        if (extractedSlots && extractedSlots.length > 0) {
          scheduleData.timeSlots = extractedSlots;
          timeSlotsFound = true;
          startRow = i + 1; // Start processing from next row
          console.log(`Found time slots in row ${i}:`, scheduleData.timeSlots);
          break;
        }
      }
      
      // If no time slots found, use default and start from first row
      if (!timeSlotsFound) {
        scheduleData.timeSlots = ['08:00-09:30', '09:40-11:10', '11:20-12:50', '13:00-14:30', '14:40-16:10', '16:20-17:50'];
        startRow = 0;
        console.log('No time slots found, using default:', scheduleData.timeSlots);
      }

      // Process schedule entries starting from the determined start row
      let processedRows = 0;
      for (let i = startRow; i < data.length; i++) {
        const row = data[i];
        if (!Array.isArray(row) || row.length === 0) {
          console.log(`Skipping empty row ${i}`);
          continue;
        }

        // First cell should be the day
        const day = this.normalizeDayName(row[0]);
        if (!day) {
          console.log(`Skipping row ${i}: Invalid day name "${row[0]}"`);
          continue;
        }

        // Process each time slot in the row
        for (let j = 1; j < row.length; j++) {
          const cell = row[j];
          if (!cell || typeof cell !== 'string') {
            console.log(`Skipping empty cell at row ${i}, column ${j}`);
            continue;
          }

          const timeSlot = scheduleData.timeSlots[j - 1];
          if (!timeSlot) {
            console.log(`Skipping cell at row ${i}, column ${j}: No matching time slot`);
            continue;
          }

          // Parse the cell content (improved parsing)
          const parsedEntries = this.parseComplexTimeSlotContent(cell);
          
          parsedEntries.forEach(entry => {
            scheduleData.scheduleEntries.push({
              day,
              timeSlot,
              content: entry.rawContent,
              ...entry
            });
            processedRows++;
          });
        }
      }

      console.log('Processing complete:', {
        totalRows: data.length,
        processedRows,
        scheduleEntries: scheduleData.scheduleEntries.length
      });

      // Validate the extracted data
      const validation = this.validateScheduleData(scheduleData);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Invalid schedule data: ${validation.errors.join(', ')}`,
          details: {
            rowsProcessed: data.length,
            processedRows,
            timeSlots: scheduleData.timeSlots,
            contentPreview: JSON.stringify(data.slice(0, 5))
          }
        };
      }

      return { success: true, data: scheduleData };
    } catch (error) {
      console.error('Error parsing Excel file:', error);
      return { 
        success: false, 
        error: `Failed to parse Excel file: ${error.message}`,
        details: {
          stack: error.stack,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  static parseComplexTimeSlotContent(content) {
    // Clean up the content - remove extra whitespace and normalize line breaks
    const cleanContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
    
    // Split by groups if multiple groups are present
    const groupSections = this.splitByGroups(cleanContent);
    
    const entries = [];
    
    for (const section of groupSections) {
      const parsed = this.parseSingleEntry(section);
      if (parsed) {
        entries.push(parsed);
      }
    }
    
    // If no groups were found, treat as single entry
    if (entries.length === 0) {
      const parsed = this.parseSingleEntry(cleanContent);
      if (parsed) {
        entries.push(parsed);
      }
    }
    
    return entries;
  }

  static splitByGroups(content) {
    // Look for patterns like "G1:", "G2:", etc.
    const groupPattern = /G\d+:/g;
    const matches = Array.from(content.matchAll(groupPattern));
    
    if (matches.length === 0) {
      return [content];
    }
    
    const sections = [];
    let lastIndex = 0;
    
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const nextMatch = matches[i + 1];
      
      const startIndex = match.index;
      const endIndex = nextMatch ? nextMatch.index : content.length;
      
      // Add content before first group if exists
      if (i === 0 && startIndex > 0) {
        sections.push(content.substring(0, startIndex).trim());
      }
      
      sections.push(content.substring(startIndex, endIndex).trim());
    }
    
    return sections.filter(section => section.length > 0);
  }

  static parseSingleEntry(content) {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    if (lines.length === 0) {
      return null;
    }
    
    const entry = {
      rawContent: content,
      modules: [],
      professors: [],
      groups: [],
      rooms: [],
      courseType: 'COURS' // Default
    };
    
    // Extract groups from the content
    const groupMatches = content.match(/G\d+/g);
    if (groupMatches) {
      entry.groups = [...new Set(groupMatches)]; // Remove duplicates
    }
    
    // Extract room numbers (look for patterns like "G1:354", "G1:TP.C8", etc.)
    const roomMatches = content.match(/(?:G\d+:)?((?:\d+[A-Z]?)|(?:TP\.[A-Z]\d+)|(?:[A-Z]+\d*))/g);
    if (roomMatches) {
      roomMatches.forEach(match => {
        const roomNumber = match.replace(/G\d+:/, '');
        if (roomNumber && (/\d/.test(roomNumber) || /^TP\.[A-Z]\d+$/.test(roomNumber))) { // Must contain digit or be TP room
          entry.rooms.push({
            number: roomNumber,
            type: this.determineRoomType(content)
          });
        }
      });
    }
    
    // Determine course type
    if (content.includes('-- DW') || content.includes('-- TD')) {
      entry.courseType = 'TD';
    } else if (content.includes('-- PW') || content.includes('-- TP')) {
      entry.courseType = 'TP';
    } else if (content.includes('course')) {
      entry.courseType = 'COURS';
    }
    
    // Extract module name and professor with improved logic
    let moduleCandidate = '';
    let professorCandidate = '';
    
    // Look for professor name after DW, PW patterns
    const dwPwMatches = content.match(/--\s*(DW|PW|TD|TP),?\s*([A-Z][A-Z\-\s]*[A-Z])/g);
    if (dwPwMatches) {
      dwPwMatches.forEach(match => {
        const professorMatch = match.match(/--\s*(?:DW|PW|TD|TP),?\s*([A-Z][A-Z\-\s]*[A-Z])/);
        if (professorMatch && professorMatch[1]) {
          const prof = professorMatch[1].trim();
          if (prof && !professorCandidate) {
            professorCandidate = prof;
          }
        }
      });
    }
    
    // Extract module name - look for lines that contain "/" or are before "-- DW/PW"
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // FIXED: Skip lines that are just group/room info (G1:354, G1:TP.C8, etc.)
      if (/^G\d+:/.test(line) || /^G\d+$/.test(line) || /^\d+[A-Z]?$/.test(line) || /^TP\.[A-Z]\d+$/.test(line)) {
        continue;
      }
      
      // Check if this line contains module info (before -- DW/PW)
      if (line.includes('-- DW') || line.includes('-- PW') || line.includes('-- TD') || line.includes('-- TP')) {
        // Extract module name from this line (part before --)
        const moduleMatch = line.match(/^\/?(.*?)\s*--\s*(?:DW|PW|TD|TP)/);
        if (moduleMatch && moduleMatch[1]) {
          const module = moduleMatch[1].trim();
          // FIXED: Don't accept group:room patterns as modules (including TP rooms)
          if (module.length > 3 && !/^G\d+:/.test(module) && !/^\d+[A-Z]?$/.test(module) && !/^TP\.[A-Z]\d+$/.test(module)) {
            moduleCandidate = module;
          }
        }
      } else if (line.includes('/') && !moduleCandidate) {
        // Module name with "/" prefix
        let cleanModule = line.replace(/^\//, '').trim();
        // FIXED: Don't accept group:room patterns as modules (including TP rooms)
        if (cleanModule.length > 3 && !/^G\d+:/.test(cleanModule) && !/^\d+[A-Z]?$/.test(cleanModule) && !/^TP\.[A-Z]\d+$/.test(cleanModule)) {
          moduleCandidate = cleanModule;
        }
      } else if (!moduleCandidate && line.length > 5 && !this.isLikelyProfessorName(line)) {
        // FIXED: Don't accept group:room patterns as modules (including TP rooms)
        if (!/^G\d+:/.test(line) && !/^\d+[A-Z]?$/.test(line) && !/^G\d+$/.test(line) && !/^TP\.[A-Z]\d+$/.test(line)) {
          // Longest meaningful line that's not a professor name
          if (line.length > moduleCandidate.length) {
            moduleCandidate = line;
          }
        }
      }
    }
    
    // If no professor found from DW/PW pattern, look for standalone professor lines
    if (!professorCandidate) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Skip lines with module indicators
        if (line.includes('/') || line.includes('--') || line.includes(':')) {
          continue;
        }
        
        // Look for professor name patterns
        if (this.isLikelyProfessorName(line)) {
          professorCandidate = line;
          break;
        }
      }
    }
    
    // Final fallback - look for the last line that could be a professor
    if (!professorCandidate) {
      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i];
        if (this.isLikelyProfessorName(line)) {
          professorCandidate = line;
          break;
        }
      }
    }
    
    if (moduleCandidate) {
      entry.modules.push(moduleCandidate);
    }
    
    if (professorCandidate) {
      entry.professors.push(professorCandidate);
    }
    
    return entry;
  }

  static isLikelyProfessorName(text) {
    if (!text || text.length < 2) return false;
    
    // Remove common non-name parts
    const cleanText = text.replace(/^\//, '').replace(/\s*--\s*(DW|TD|PW|TP).*$/, '').trim();
    
    // Don't consider class type indicators as professor names
    if (['DW', 'PW', 'TD', 'TP', 'COURS', 'COURSE'].includes(cleanText)) {
      return false;
    }
    
    // FIXED: Don't consider TP room patterns (TP.C8, etc.) as professor names
    if (/^TP\.[A-Z]\d+$/.test(cleanText)) {
      return false;
    }
    
    // FIXED: Don't consider group numbers (G1, G2, etc.) as professor names
    if (/^G\d+$/.test(cleanText)) {
      return false;
    }
    
    // FIXED: Don't consider room numbers (like 354, 205A, etc.) as professor names
    if (/^\d+[A-Z]?$/.test(cleanText)) {
      return false;
    }
    
    // FIXED: Don't consider group:room patterns (like G1:354, G1:TP.C8) as professor names
    if (/^G\d+:/.test(cleanText)) {
      return false;
    }
    
    // Check if it's likely a professor name
    return (
      // All caps (common for professor names)
      /^[A-Z][A-Z\-\s]*$/.test(cleanText) ||
      // Contains common professor name patterns
      /^[A-Z][a-z]+-[A-Z][A-Z]*$/.test(cleanText) ||
      // Short uppercase words that are likely names
      (cleanText.length >= 3 && cleanText.length <= 25 && /^[A-Z\-]+$/.test(cleanText))
    ) && 
    // Additional filters
    !cleanText.includes('/') &&
    !cleanText.includes(':') &&
    !cleanText.includes('--') &&
    !/\d{3,}/.test(cleanText) && // Not room numbers
    cleanText.length >= 4; // Minimum length for professor names
  }

  static extractTimeSlots(row) {
    if (!row || !Array.isArray(row)) return [];
    
    return row
      .filter(cell => typeof cell === 'string' && cell.trim().length > 0)
      .map(cell => {
        // Look for time patterns like "08:00-09:30" or "8:00 - 9:30"
        const match = cell.match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/);
        return match ? `${match[1]}-${match[2]}` : null;
      })
      .filter(Boolean);
  }

  static normalizeDayName(day) {
    if (!day || typeof day !== 'string') return null;
    
    const cleanDay = day.toLowerCase().trim();
    
    // FIXED: More comprehensive day mapping with better pattern matching
    const dayMap = {
      // English full names
      'monday': 'MONDAY',
      'tuesday': 'TUESDAY', 
      'wednesday': 'WEDNESDAY',
      'thursday': 'THURSDAY',
      'friday': 'FRIDAY',
      'saturday': 'SATURDAY',
      'sunday': 'SUNDAY',
      // English abbreviations
      'mon': 'MONDAY',
      'tue': 'TUESDAY',
      'wed': 'WEDNESDAY', 
      'thu': 'THURSDAY',
      'fri': 'FRIDAY',
      'sat': 'SATURDAY',
      'sun': 'SUNDAY',
      // French names (common in Algeria)
      'lundi': 'MONDAY',
      'mardi': 'TUESDAY',
      'mercredi': 'WEDNESDAY',
      'jeudi': 'THURSDAY',
      'vendredi': 'FRIDAY',
      'samedi': 'SATURDAY',
      'dimanche': 'SUNDAY',
      // French abbreviations
      'lun': 'MONDAY',
      'mar': 'TUESDAY',
      'mer': 'WEDNESDAY',
      'jeu': 'THURSDAY',
      'ven': 'FRIDAY',
      'sam': 'SATURDAY',
      'dim': 'SUNDAY'
    };
    
    // First try exact match
    if (dayMap[cleanDay]) {
      return dayMap[cleanDay];
    }
    
    // Try partial matching for variations
    for (const [key, value] of Object.entries(dayMap)) {
      if (cleanDay.includes(key) || key.includes(cleanDay)) {
        return value;
      }
    }
    
    // If no match found, return the original uppercase (don't default to MONDAY)
    return day.toUpperCase();
  }

  static determineRoomType(content) {
    if (content.includes('-- DW') || content.includes('-- TD')) return 'SALLE_TD';
    if (content.includes('-- PW') || content.includes('-- TP')) return 'SALLE_TP';
    return 'SALLE_COURS';
  }

  static validateScheduleData(data) {
    const errors = [];

    if (!data.timeSlots || data.timeSlots.length === 0) {
      errors.push('No time slots found');
    }

    if (!data.scheduleEntries || data.scheduleEntries.length === 0) {
      errors.push('No schedule entries found');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static formatForDatabase(data) {
    if (!data || !data.scheduleEntries) return data;

    return {
      ...data,
      scheduleEntries: data.scheduleEntries.map(entry => {
        const [startTime, endTime] = this.extractTimeRange(entry.timeSlot);
        return {
          dayOfWeek: this.convertDayToEnum(entry.day),
          startTime,
          endTime,
          isAvailable: !entry.content,
          moduleName: entry.modules?.[0] || '',
          professorName: entry.professors?.[0] || '',
          sectionName: entry.groups?.join(',') || '',
          roomNumber: entry.rooms?.[0]?.number || '',
          roomType: entry.rooms?.[0]?.type || 'SALLE_COURS',
          courseType: entry.courseType || 'COURS'
        };
      })
    };
  }

  static extractTimeRange(timeSlot) {
    const match = timeSlot.match(/(\d{1,2}:\d{2})-(\d{1,2}:\d{2})/);
    return match ? [match[1], match[2]] : ['00:00', '00:00'];
  }

  static convertDayToEnum(day) {
    const dayMap = {
      'MONDAY': 'MONDAY',
      'TUESDAY': 'TUESDAY',
      'WEDNESDAY': 'WEDNESDAY',
      'THURSDAY': 'THURSDAY',
      'FRIDAY': 'FRIDAY',
      'SATURDAY': 'SATURDAY',
      'SUNDAY': 'SUNDAY'
    };
    return dayMap[day] || 'MONDAY';
  }
}

export default ExcelScheduleParser;