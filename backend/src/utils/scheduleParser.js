import mammoth from 'mammoth';
import * as cheerio from 'cheerio';
import TableScheduleParser from './TableScheduleParser.js';

// Utility functions
const isDayLine = (line) => {
  const dayPattern = /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|mon|tue|wed|thu|fri|sat|sun|m|t|w|r|f|s|u|sam|dim|lun|mar|mer|jeu)$/i;
  return dayPattern.test(line.trim());
};

const normalizeDayName = (day) => {
  const dayMap = {
    'mon': 'Monday', 'tue': 'Tuesday', 'wed': 'Wednesday', 'thu': 'Thursday',
    'fri': 'Friday', 'sat': 'Saturday', 'sun': 'Sunday', 'lundi': 'Monday',
    'mardi': 'Tuesday', 'mercredi': 'Wednesday', 'jeudi': 'Thursday',
    'vendredi': 'Friday', 'samedi': 'Saturday', 'dimanche': 'Sunday',
    'm': 'Monday', 't': 'Tuesday', 'w': 'Wednesday', 'r': 'Thursday',
    'f': 'Friday', 's': 'Saturday', 'u': 'Sunday', 'sam': 'Saturday',
    'dim': 'Sunday', 'lun': 'Monday', 'mar': 'Tuesday', 'mer': 'Wednesday',
    'jeu': 'Thursday'
  };
  const lowerDay = day.toLowerCase();
  return dayMap[lowerDay] || lowerDay.split(/\s+/)[0].trim();
};

const countContentSeparators = (text) => {
  return text.split('\n').filter(line => line.trim() === '' || line.trim().length < 5 || /^\s*[-=|]+\s*$/.test(line.trim())).length;
};

const isValidEntry = (entry) => {
  return entry && entry.day && entry.timeSlot && entry.content !== undefined;
};

class ScheduleParser {
  static async processScheduleFile(fileBuffer, fileType, options = {}) {
    try {
      console.log('Processing schedule file with type:', fileType);
      if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
        throw new Error('Invalid file buffer provided');
      }
      const processor = ScheduleParser.getProcessor(fileType);
      if (!processor) {
        throw new Error(`Unsupported file type: ${fileType}`);
      }
      const result = await processor.call(ScheduleParser, fileBuffer, options);
      if (result.success) {
        result.data = ScheduleParser.validateAndEnhanceData(result.data);
        result.formattedOutput = ScheduleParser.formatOutput(result.data);
        result.databaseReady = ScheduleParser.formatForDatabase(result.data);
      }
      return result;
    } catch (error) {
      console.error('Processing error:', error);
      return { success: false, error: error.message, details: error.stack };
    }
  }

  static getProcessor(fileType) {
    const processors = { 'pdf': ScheduleParser.processPDF, 'docx': ScheduleParser.processDOCX };
    return processors[fileType.toLowerCase()];
  }

  static async processPDF(pdfBuffer, options = {}) {
    try {
      console.log('Starting PDF processing, buffer size:', pdfBuffer.length);
      const pdfParse = (await import('pdf-parse')).default;
      const data = await pdfParse(pdfBuffer);
      if (!data || !data.text) {
        throw new Error('Failed to extract text from PDF');
      }
      console.log('PDF text extracted, length:', data.text.length);
      console.log('Raw extracted text preview:', data.text.substring(0, 1000));

      // Skip TableScheduleParser and use direct parsing
      console.log('Enforcing direct parsing with ScheduleParser');
      return ScheduleParser.parseExtractedText(data.text, 'pdf');
    } catch (error) {
      console.error('Error processing PDF:', error);
      return {
        success: false,
        error: `PDF processing failed: ${error.message}`,
        suggestions: [
          'Ensure the PDF contains selectable text',
          'Try converting the PDF to DOCX format',
          'Check if the PDF is password protected',
          'Use OCR tools like Tesseract if the schedule is an image (e.g., tesseract input.pdf output -l eng)'
        ]
      };
    }
  }

  static async processDOCX(docxBuffer, options = {}) {
    try {
      console.log('Starting DOCX processing, buffer size:', docxBuffer.length);
      const { value: html } = await mammoth.convertToHtml({ buffer: docxBuffer });
      console.log('DOCX converted to HTML, length:', html.length);
      const $ = cheerio.load(html);
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
      return ScheduleParser.parseDOCXHtml(html, $);
    } catch (error) {
      console.error('Error processing DOCX:', error);
      return { success: false, error: `DOCX processing failed: ${error.message}` };
    }
  }

  static parseExtractedText(text, sourceType = 'unknown') {
    try {
      let normalizedText = text.replace(/\t/g, ' ').replace(/\$/g, '').trim();
      const dayPattern = /\b(mon|tue|wed|thu|fri|sat|sun|lun|mar|mer|jeu|ven|sam|dim)\b/gi;
      normalizedText = normalizedText.replace(dayPattern, '\n$1');
      normalizedText = normalizedText.replace(/(G\d+:[^\s]+)/g, '\n$1');
      const lines = normalizedText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      console.log(`Parsing ${lines.length} lines from ${sourceType}`);

      const scheduleData = {
        headerInfo: ScheduleParser.extractHeaderInformation(lines),
        timeSlots: [],
        scheduleEntries: []
      };

      let timeHeaderIndex = -1;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.match(/\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}/)) {
          timeHeaderIndex = i;
          const timeString = line.replace(/\s+/g, '');
          const timeMatches = timeString.match(/\d{1,2}:\d{2}-\d{1,2}:\d{2}/g) || [];
          scheduleData.timeSlots = timeMatches.map(time => `${time}`);
          console.log('Time header found at line', i, ':', scheduleData.timeSlots);
          break;
        }
      }

      if (timeHeaderIndex === -1) {
        console.warn('Time header not found. Using default time slots.');
        scheduleData.timeSlots = ['08:00-09:30', '09:40-11:10', '11:20-12:50', '13:00-14:30', '14:40-16:10', '16:20-17:50'];
      } else {
        lines.splice(timeHeaderIndex, 1);
      }

      let currentDay = null;
      let currentContent = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (isDayLine(line)) {
          if (currentDay && currentContent.length > 0) {
            ScheduleParser.processDayContent(currentDay, currentContent, scheduleData.timeSlots, scheduleData.scheduleEntries);
          }
          currentDay = normalizeDayName(line);
          currentContent = [];
          console.log('Detected new day:', currentDay, 'at line', i);
        } else if (currentDay && line.length > 0) {
          currentContent.push(line);
          console.log('Accumulated content for', currentDay, ':', line);
        }
      }
      if (currentDay && currentContent.length > 0) {
        ScheduleParser.processDayContent(currentDay, currentContent, scheduleData.timeSlots, scheduleData.scheduleEntries);
      }

      console.log('Total schedule entries parsed:', scheduleData.scheduleEntries.length);
      if (scheduleData.scheduleEntries.length === 0) {
        console.error('No schedule entries found. Possible issues:');
        console.error('1. PDF may be image-based (use OCR).');
        console.error('2. No recognizable day names (e.g., Saturday, Mon, M).');
        console.error('3. Schedule table missing or in unexpected format.');
      }

      const validation = ScheduleParser.validateScheduleData(scheduleData);
      if (!validation.isValid) {
        console.error('Schedule data validation failed:', validation.errors);
        return {
          success: false,
          error: `Invalid schedule data: ${validation.errors.join(', ')}`,
          details: {
            linesProcessed: lines.length,
            timeSlots: scheduleData.timeSlots,
            contentPreview: normalizedText.substring(0, 1000)
          }
        };
      }

      return { success: true, data: scheduleData, sourceType };
    } catch (error) {
      console.error('Error parsing text:', error);
      return {
        success: false,
        error: `Text parsing failed: ${error.message}`,
        details: { contentPreview: text.substring(0, 1000) }
      };
    }
  }

  static processDayContent(day, contentLines, timeSlots, scheduleEntries) {
    // Group content into slots based on separators (new group/course indicators)
    const slots = Array(timeSlots.length).fill(null).map(() => []);
    let currentSlotIndex = 0;

    // Combine lines into slots
    let currentSlotContent = [];
    for (let i = 0; i < contentLines.length; i++) {
      const line = contentLines[i];
      const isNewSlotIndicator = line.match(/^G\d+:/) || line.toLowerCase().includes('course');
      if (isNewSlotIndicator && currentSlotContent.length > 0) {
        if (currentSlotIndex < timeSlots.length) {
          slots[currentSlotIndex] = currentSlotContent;
          currentSlotIndex++;
        }
        currentSlotContent = [line];
      } else {
        currentSlotContent.push(line);
      }
    }
    if (currentSlotContent.length > 0 && currentSlotIndex < timeSlots.length) {
      slots[currentSlotIndex] = currentSlotContent;
    }

    // Map slots to time slots, preserving empty slots
    for (let i = 0; i < timeSlots.length; i++) {
      const slotContent = slots[i] ? slots[i].join(' ').trim() : '';
      if (!slotContent) {
        scheduleEntries.push({
          day,
          timeSlot: timeSlots[i],
          content: ''
        });
        console.log(`Added empty slot for ${day} ${timeSlots[i]}`);
        continue;
      }

      // Split into multiple entries if multiple groups are present
      const entries = slotContent.split(/,\s*(?=(G\d+:))/).map(entry => entry.trim());
      entries.forEach(entry => {
        if (entry) {
          const parsedContent = ScheduleParser.parseTimeSlotContent(entry);
          scheduleEntries.push({
            day,
            timeSlot: timeSlots[i],
            content: entry,
            ...parsedContent
          });
          console.log(`Processed content for ${day} ${timeSlots[i]}: ${entry}`);
        }
      });
    }
  }

  static parseTimeSlotContent(content) {
    const result = {
      type: '',
      modules: [],
      professors: [],
      rooms: [],
      groups: []
    };

    const parts = content.split(/(G\d+:[^\s]+)|(course)/i).filter(part => part && part.trim());
    let currentModule = '';
    let currentType = '';
    let currentProfessor = '';
    let currentRoom = '';

    for (const part of parts) {
      const groupMatch = part.match(/G(\d+):([^\s]+)/);
      if (groupMatch) {
        const group = `G${groupMatch[1]}`;
        const room = groupMatch[2];
        result.groups.push(group);
        result.rooms.push({ number: room, type: room.match(/^TP/) ? 'SALLE_TP' : 'SALLE_COURS' });
        continue;
      }

      const typeMatch = part.match(/\b(DW|PW|SE|SC)\b/i);
      if (typeMatch) {
        currentType = typeMatch[0].toUpperCase();
        result.type = currentType;
      }

      const professorMatch = part.match(/[A-Z][a-z]+(?:-[A-Z][a-z]+)?\b(?![DPW]W|SE|SC)/);
      if (professorMatch) {
        currentProfessor = professorMatch[0];
        result.professors.push(currentProfessor);
      }

      const modulePart = part.split(/\b(DW|PW|SE|SC|course)\b/i)[0].trim();
      if (modulePart && !modulePart.match(/G\d+:/)) {
        currentModule = modulePart.replace(/\/+/g, '').trim();
        if (currentModule) result.modules.push(currentModule);
      }

      const roomMatch = part.match(/\b(\d{3,4}(?:T|D)?)\b/);
      if (roomMatch && !part.match(/G\d+:/)) {
        currentRoom = roomMatch[0];
        result.rooms.push({ number: currentRoom, type: currentRoom.match(/T$/) ? 'SALLE_TP' : 'SALLE_COURS' });
      }
    }

    return result;
  }

  static formatOutput(data) {
    if (!data || !data.scheduleEntries) return [];
    return data.scheduleEntries.map(entry => {
      return `${entry.day} ${entry.timeSlot} ${entry.content}`;
    });
  }

  static formatForDatabase(data) {
    if (!data || !data.scheduleEntries) return data;

    return {
      ...data,
      scheduleEntries: data.scheduleEntries.map(entry => {
        const [startTime, endTime] = ScheduleParser.extractTimeRange(entry.timeSlot);
        return {
          dayOfWeek: ScheduleParser.convertDayToEnum(entry.day),
          startTime,
          endTime,
          isAvailable: !entry.content, // Empty slots are available
          moduleName: entry.modules?.[0] || TableScheduleParser.extractModuleName(entry.content),
          professorName: entry.professors?.[0] || TableScheduleParser.extractProfessorName(entry.content),
          sectionName: entry.groups?.join(',') || TableScheduleParser.extractGroups(entry.content).join(','),
          roomNumber: entry.rooms?.[0]?.number || TableScheduleParser.extractRoomNumber(entry.content),
          roomType: entry.rooms?.[0]?.type || TableScheduleParser.determineRoomType(entry.content),
        };
      })
    };
  }

  static parseDOCXHtml(html, $) {
    try {
      const bodyText = $('body').text();
      const scheduleData = {
        headerInfo: ScheduleParser.extractHeaderFromHtml($, bodyText),
        timeSlots: [],
        scheduleEntries: []
      };

      const tables = $('table');
      console.log(`Found ${tables.length} tables`);
      if (tables.length === 0) {
        return { success: false, error: 'No tables found in document', hasContent: bodyText.length > 0, contentPreview: bodyText.substring(0, 200) };
      }

      const scheduleTable = ScheduleParser.findScheduleTable(tables, $);
      if (!scheduleTable) {
        return { success: false, error: 'No valid schedule table found' };
      }

      const rows = $(scheduleTable).find('tr');
      scheduleData.timeSlots = $(rows[0]).find('td, th').slice(1).map((i, cell) => $(cell).text().trim()).get();

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const cells = $(row).find('td, th');
        const day = normalizeDayName($(cells[0]).text().trim());
        if (!isDayLine(day)) continue;

        cells.slice(1).each((j, cell) => {
          const content = $(cell).text().trim();
          if (content && j < scheduleData.timeSlots.length) {
            const parsedContent = ScheduleParser.parseTimeSlotContent(content);
            scheduleData.scheduleEntries.push({
              day,
              timeSlot: scheduleData.timeSlots[j],
              content,
              ...parsedContent
            });
          }
        });
      }

      return { success: true, data: scheduleData, sourceType: 'docx' };
    } catch (error) {
      console.error('Error parsing DOCX HTML:', error);
      return { success: false, error: `HTML parsing failed: ${error.message}` };
    }
  }

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
      university: /university/i,
      speciality: /Schedules of\s*:\s*(.+?)\s*--\s*Section:/i,
      section: /Section:\s*([A-Z])/i,
      academicYear: /College year:\s*(\d{4}\/\d{4})/i,
      semester: /Semester:\s*(\d+)/i,
      date: /Date:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i
    };
    for (const line of lines) {
      for (const [key, pattern] of Object.entries(patterns)) {
        if (!headerInfo[key]) {
          const match = line.match(pattern);
          if (match) headerInfo[key] = match[1] ? match[1].trim() : line.trim().split(pattern)[1]?.trim() || '';
        }
      }
    }
    return headerInfo;
  }

  static extractHeaderFromHtml($, bodyText) {
    return ScheduleParser.extractHeaderInformation(bodyText.split('\n'));
  }

  static findScheduleTable(tables, $) {
    let bestTable = null;
    let maxScore = 0;
    tables.each((i, table) => {
      const score = ScheduleParser.scoreTableAsSchedule(table, $);
      if (score > maxScore) {
        maxScore = score;
        bestTable = table;
      }
    });
    return maxScore > 0 ? bestTable : null;
  }

  static scoreTableAsSchedule(table, $) {
    let score = 0;
    const rows = $(table).find('tr');
    if (rows.length < 2) return 0;
    const firstRowText = $(rows[0]).text().toLowerCase();
    if (firstRowText.includes('time') || /\d{1,2}:\d{2}/.test(firstRowText)) score += 10;
    const dayPattern = /monday|tuesday|wednesday|thursday|friday|saturday|sunday/i;
    rows.each((i, row) => {
      if (i > 0) {
        const firstCell = $(row).find('td, th').first().text();
        if (dayPattern.test(firstCell)) score += 5;
      }
    });
    const colCount = $(rows[0]).find('td, th').length;
    score += Math.min(rows.length * 2, 20);
    score += Math.min(colCount * 3, 15);
    return score;
  }

  static validateAndEnhanceData(data) {
    if (!data) return data;
    if (data.scheduleEntries) {
      data.scheduleEntries = data.scheduleEntries.map(entry => ({
        ...entry,
        day: entry.day || '',
        timeSlot: entry.timeSlot || '',
        content: entry.content || ''
      }));
    }
    data.validation = {
      hasTimeSlots: (data.timeSlots?.length || 0) > 0,
      hasEntries: (data.scheduleEntries?.length || 0) > 0,
      hasHeaderInfo: Object.values(data.headerInfo || {}).some(v => v && v.trim())
    };
    return data;
  }

  static convertDayToEnum(day) {
    const dayMap = {
      'monday': 'MONDAY', 'tuesday': 'TUESDAY', 'wednesday': 'WEDNESDAY',
      'thursday': 'THURSDAY', 'friday': 'FRIDAY', 'saturday': 'SATURDAY',
      'sunday': 'SUNDAY', 'lundi': 'MONDAY', 'mardi': 'TUESDAY',
      'mercredi': 'WEDNESDAY', 'jeudi': 'THURSDAY', 'vendredi': 'FRIDAY',
      'samedi': 'SATURDAY', 'dimanche': 'SUNDAY',
      'm': 'MONDAY', 't': 'Tuesday', 'w': 'Wednesday', 'r': 'THURSDAY',
      'f': 'FRIDAY', 's': 'SATURDAY', 'u': 'SUNDAY', 'sam': 'SATURDAY',
      'dim': 'SUNDAY', 'lun': 'MONDAY', 'mar': 'TUESDAY', 'mer': 'WEDNESDAY',
      'jeu': 'THURSDAY'
    };
    return dayMap[day.toLowerCase()] || 'MONDAY';
  }

  static extractTimeRange(timeSlot) {
    const match = timeSlot.match(/(\d{1,2}:\d{2})-(\d{1,2}:\d{2})/);
    return match ? [match[1], match[2]] : ['00:00', '00:00'];
  }

  static async extractScheduleData(fileBuffer, fileType, options = {}) {
    try {
      const result = await ScheduleParser.processScheduleFile(fileBuffer, fileType, options);
      if (result.success) {
        console.log('Schedule extraction successful:', {
          entries: result.data.scheduleEntries?.length || 0,
          timeSlots: result.data.timeSlots?.length || 0
        });
      }
      return result;
    } catch (error) {
      console.error('Schedule extraction failed:', error);
      return { success: false, error: error.message, timestamp: new Date().toISOString() };
    }
  }

  static validateScheduleData(data) {
    const errors = [];
    const warnings = [];
    if (!data) {
      return { isValid: false, errors: ['No data provided'] };
    }
    if (!data.headerInfo) warnings.push('Missing header information object');
    else {
      if (!data.headerInfo.speciality) warnings.push('Missing speciality information in header');
      if (!data.headerInfo.section) warnings.push('Missing section information in header');
      if (!data.headerInfo.academicYear) warnings.push('Missing academic year in header');
      if (!data.headerInfo.semester) warnings.push('Missing semester in header');
    }
    if (!data.timeSlots || !Array.isArray(data.timeSlots) || data.timeSlots.length === 0) {
      errors.push('No time slots found');
    }
    if (!data.scheduleEntries || !Array.isArray(data.scheduleEntries) || data.scheduleEntries.length === 0) {
      errors.push('No schedule entries found');
    } else {
      data.scheduleEntries.forEach((entry, index) => {
        if (!entry.day) errors.push(`Entry ${index + 1}: Missing day`);
        if (!entry.timeSlot) errors.push(`Entry ${index + 1}: Missing time slot`);
        if (!entry.content && entry.content !== '') warnings.push(`Entry ${index + 1}: No content assigned`);
      });
    }
    return { isValid: errors.length === 0, errors, warnings };
  }
}

export { ScheduleParser };
export const convertDayToEnum = ScheduleParser.convertDayToEnum;
export const extractTimeRange = ScheduleParser.extractTimeRange;
export const extractScheduleData = ScheduleParser.extractScheduleData;
export { isDayLine, normalizeDayName, countContentSeparators, isValidEntry };
export default ScheduleParser;