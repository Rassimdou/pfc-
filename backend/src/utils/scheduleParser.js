// scheduleParser.js
import * as cheerio from 'cheerio';

/**
 * Parses schedule data from HTML extracted from a .docx file
 * @param {string} htmlContent - HTML content from the .docx file
 * @returns {Object} Structured schedule data
 */
function extractScheduleData(htmlContent) {
  const $ = cheerio.load(htmlContent);
  
  // Extract header information
  const headerInfo = {
    university: extractText($, 'University of Science and Technology'),
    speciality: extractSpeciality($),
    section: extractSection($),
    academicYear: extractAcademicYear($),
    semester: extractSemester($),
    date: extractDate($)
  };
  
  // Extract time slots from the table header
  const timeSlots = [];
  $('table tr:first-child td').each((i, el) => {
    if (i > 0) { // Skip the first column (days)
      const timeSlot = $(el).text().trim();
      if (timeSlot) {
        timeSlots.push(timeSlot);
      }
    }
  });
  
  // Extract schedule entries from each cell
  const scheduleEntries = [];
  
  $('table tr').each((rowIndex, row) => {
    if (rowIndex > 0) { // Skip header row
      const day = $(row).find('td:first-child').text().trim();
      
      $(row).find('td').each((colIndex, cell) => {
        if (colIndex > 0 && $(cell).text().trim()) { // Skip days column and empty cells
          const cellHtml = $(cell).html();
          const cellText = $(cell).text().trim();
          const timeSlot = timeSlots[colIndex - 1];
          
          // Parse the cell content
          const entries = parseScheduleCell(cellText, cellHtml, day, timeSlot);
          if (entries && entries.length > 0) {
            scheduleEntries.push(...entries);
          }
        }
      });
    }
  });
  
  return {
    headerInfo,
    timeSlots,
    scheduleEntries
  };
}

/**
 * Extract text that contains a specific substring
 * @param {Object} $ - Cheerio object
 * @param {string} substring - Substring to search for
 * @returns {string} Extracted text
 */
function extractText($, substring) {
  const pattern = new RegExp(`.*${substring}.*`, 'i');
  const matches = $('body').text().match(pattern);
  return matches ? matches[0].trim() : '';
}

/**
 * Extract speciality from the document
 * @param {Object} $ - Cheerio object
 * @returns {string} Extracted speciality
 */
function extractSpeciality($) {
  const specialityPattern = /ING\.[A-Z]+/i;
  const matches = $('body').text().match(specialityPattern);
  return matches ? matches[0].trim() : '';
}

/**
 * Extract section from the document
 * @param {Object} $ - Cheerio object
 * @returns {string} Extracted section
 */
function extractSection($) {
  const sectionPattern = /Section:\s*([A-Z])/i;
  const matches = $('body').text().match(sectionPattern);
  return matches ? matches[1].trim() : '';
}

/**
 * Extract academic year from the document
 * @param {Object} $ - Cheerio object
 * @returns {string} Extracted academic year
 */
function extractAcademicYear($) {
  const yearPattern = /College year:\s*(\d{4}\/\d{4})/i;
  const matches = $('body').text().match(yearPattern);
  return matches ? matches[1] : '';
}

/**
 * Extract semester from the document
 * @param {Object} $ - Cheerio object
 * @returns {string} Extracted semester
 */
function extractSemester($) {
  const semesterPattern = /Semester:\s*(\d+)/i;
  const matches = $('body').text().match(semesterPattern);
  return matches ? matches[1] : '';
}

/**
 * Extract date from the document
 * @param {Object} $ - Cheerio object
 * @returns {string} Extracted date
 */
function extractDate($) {
  const datePattern = /Date:\s*(\d{2}\/\d{2}\/\d{4})/i;
  const matches = $('body').text().match(datePattern);
  return matches ? matches[1] : '';
}

/**
 * Parse a schedule cell to extract all course information
 * @param {string} cellText - Text content of the cell
 * @param {string} cellHtml - HTML content of the cell
 * @param {string} day - Day of the week
 * @param {string} timeSlot - Time slot
 * @returns {Array} Array of schedule entries
 */
function parseScheduleCell(cellText, cellHtml, day, timeSlot) {
  // Skip empty cells
  if (!cellText.trim()) return [];
  
  const lines = cellText.split('\n').map(line => line.trim()).filter(line => line);
  const entries = [];
  let currentEntry = createEmptyEntry(day, timeSlot);
  let lineIdx = 0;
  
  while (lineIdx < lines.length) {
    const line = lines[lineIdx];
    
    // Check for group info (G1:457, G2:TP126, etc.)
    const groupMatch = line.match(/^G(\d+):(.+)$/);
    if (groupMatch) {
      // If we already processed a group, save the current entry and start a new one
      if (currentEntry.groups.length > 0) {
        entries.push({...currentEntry});
        currentEntry = createEmptyEntry(day, timeSlot);
      }
      
      const groupNumber = groupMatch[1];
      const groupInfo = groupMatch[2].trim();
      
      currentEntry.groups.push(groupNumber);
      
      // Check if it's a TP session
      if (groupInfo.includes('TP')) {
        currentEntry.type = 'TP';
        const tpRoomMatch = groupInfo.match(/TP(\d+)/);
        if (tpRoomMatch) {
          currentEntry.rooms.push({
            number: tpRoomMatch[1],
            type: 'SALLE_TP'
          });
        }
      } else {
        currentEntry.type = 'TD';
        // Extract room number
        const roomNumber = groupInfo.trim();
        if (roomNumber && /^\d+$/.test(roomNumber)) {
          currentEntry.rooms.push({
            number: roomNumber,
            type: 'SALLE_TD'
          });
        }
      }
      
      lineIdx++;
      continue;
    }
    
    // Check for module and professor info (format: /Module Name -- DW, TEACHER NAME)
    const moduleMatch = line.match(/^\/(.+)\s+--\s+([DP]W),\s+(.+)$/);
    if (moduleMatch) {
      const moduleName = moduleMatch[1].trim();
      const teacherName = moduleMatch[3].trim();
      
      currentEntry.modules.push(moduleName);
      if (!currentEntry.professors.includes(teacherName)) {
        currentEntry.professors.push(teacherName);
      }
      
      lineIdx++;
      continue;
    }
    
    // Check for course info (format: "Module Name course")
    const courseMatch = line.match(/^(.+)\s+course$/i);
    if (courseMatch) {
      currentEntry.type = 'COURSE';
      const moduleName = courseMatch[1].trim();
      currentEntry.modules.push(moduleName);
      
      // Look ahead for room info (usually single character on next line)
      if (lineIdx + 1 < lines.length && lines[lineIdx + 1].length <= 3) {
        const roomNumber = lines[lineIdx + 1].trim();
        currentEntry.rooms.push({
          number: roomNumber,
          type: 'SALLE_COURS'
        });
        lineIdx += 2; // Skip room line
      } else {
        lineIdx++;
      }
      
      continue;
    }
    
    // Check for professor name in a course (usually follows room info)
    if (currentEntry.type === 'COURSE' && 
        currentEntry.professors.length === 0 && 
        lines[lineIdx].length > 3) {
      const professorName = lines[lineIdx].trim();
      currentEntry.professors.push(professorName);
      lineIdx++;
      continue;
    }
    
    // If this is a single letter/number and we already have a type, it's likely a room number
    if (line.length <= 3 && currentEntry.type !== 'unknown' && currentEntry.rooms.length === 0) {
      const roomType = currentEntry.type === 'COURSE' ? 'SALLE_COURS' : 
                      currentEntry.type === 'TP' ? 'SALLE_TP' : 'SALLE_TD';
      
      currentEntry.rooms.push({
        number: line,
        type: roomType
      });
      
      lineIdx++;
      continue;
    }
    
    // Default: move to next line if we couldn't parse this one
    lineIdx++;
  }
  
  // Add the last entry if it has any useful data
  if (currentEntry.groups.length > 0 || currentEntry.modules.length > 0) {
    entries.push(currentEntry);
  }
  
  return entries;
}

/**
 * Create an empty schedule entry object
 * @param {string} day - Day of the week
 * @param {string} timeSlot - Time slot
 * @returns {Object} Empty schedule entry
 */
function createEmptyEntry(day, timeSlot) {
  return {
    day,
    timeSlot,
    type: 'unknown', // Will be set to COURSE, TD, or TP
    modules: [],
    professors: [],
    rooms: [],
    groups: []
  };
}

/**
 * Convert day string to day enum value
 * @param {string} day - Day string from schedule
 * @returns {string} Day enum value
 */
function convertDayToEnum(day) {
  const dayMap = {
    'Mon': 'MONDAY',
    'Tue': 'TUESDAY',
    'Wed': 'WEDNESDAY',
    'Thu': 'THURSDAY',
    'Fri': 'FRIDAY',
    'Sat': 'SATURDAY',
    'Sun': 'SUNDAY'
  };
  
  // Handle various ways days might be presented
  let normalizedDay;
  if (day.length <= 3) {
    normalizedDay = day;
  } else {
    normalizedDay = day.substring(0, 3);
  }
  
  return dayMap[normalizedDay] || 'MONDAY';
}

/**
 * Extract start and end times from a time slot string
 * @param {string} timeSlot - Time slot string (e.g., "08:00 - 09:30")
 * @returns {Array} Array containing start and end times
 */
function extractTimeRange(timeSlot) {
  const timeMatch = timeSlot.match(/(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/);
  if (timeMatch) {
    return [timeMatch[1], timeMatch[2]];
  }
  return ['08:00', '09:30']; // Default if parsing fails
}

export {
  extractScheduleData,
  convertDayToEnum,
  extractTimeRange
};