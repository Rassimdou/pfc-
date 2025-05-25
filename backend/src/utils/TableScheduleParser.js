class TableScheduleParser {
  static parseScheduleText(ocrText) {
    try {
      // Clean and split OCR text into lines
      const lines = ocrText.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.match(/^\s*\|+$/));
      console.log(`Parsing ${lines.length} lines from OCR text:`, lines);

      const scheduleData = {
        headerInfo: this.extractHeaderInformation(lines),
        timeSlots: [],
        scheduleEntries: []
      };

      // Extract time slots from the table header
      const timeSlotLineIndex = lines.findIndex(line => line.match(/\d{2}:\d{2}\s*-\s*\d{2}:\d{2}/));
      if (timeSlotLineIndex !== -1) {
        const timeSlotLine = lines[timeSlotLineIndex];
        const timeSlots = timeSlotLine.match(/\d{2}:\d{2}\s*-\s*\d{2}:\d{2}/g) || [];
        scheduleData.timeSlots = timeSlots.map(slot => slot.replace(/[\s$]+/g, ''));
        console.log('Time slots extracted:', scheduleData.timeSlots);
        // Remove the time slot line to avoid processing it as content
        lines.splice(timeSlotLineIndex, 1);
      } else {
        scheduleData.timeSlots = ['08:00-09:30', '09:40-11:10', '11:20-12:50', '13:00-14:30', '14:40-16:10', '16:20-17:50'];
        console.warn('No time slot header found, using default slots:', scheduleData.timeSlots);
      }

      // Find the start of the table data by looking for day names
      const dayPattern = /^(Sat|Sun|Mon|Tue|Wed|Thu|Fri)$/i;
      let tableStartIndex = lines.findIndex(line => dayPattern.test(line));
      if (tableStartIndex === -1) {
        throw new Error('Table data not found');
      }

      // Process table rows
      let currentDay = null;
      let currentContent = [];
      for (let i = tableStartIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        const dayMatch = line.match(dayPattern);
        if (dayMatch) {
          if (currentDay && currentContent.length > 0) {
            this.processDayContent(currentDay, currentContent, scheduleData.timeSlots, scheduleData.scheduleEntries);
          }
          currentDay = this.normalizeDayName(dayMatch[0]);
          currentContent = [];
          console.log('Detected new day:', currentDay);
        } else if (currentDay) {
          currentContent.push(line);
        }
      }
      if (currentDay && currentContent.length > 0) {
        this.processDayContent(currentDay, currentContent, scheduleData.timeSlots, scheduleData.scheduleEntries);
      }

      console.log('Total schedule entries parsed:', scheduleData.scheduleEntries.length);
      if (scheduleData.scheduleEntries.length === 0) {
        console.error('No schedule entries found');
      }

      return { success: true, data: scheduleData };
    } catch (error) {
      console.error('Error parsing schedule:', error);
      return { success: false, error: error.message };
    }
  }

  static extractHeaderInformation(lines) {
    const headerInfo = {
      university: '',
      speciality: '',
      section: '',
      academicYear: '',
      semester: '',
      date: '',
      groups: []
    };
    const patterns = {
      university: /University of Science and Technology Houari Boumediene/i,
      speciality: /Schedules of\s*:\s*(.+?)\s*--\s*Section:/i,
      section: /Section:\s*([A-Z])/i,
      academicYear: /College year:\s*(\d{4}\/\d{4})/i,
      semester: /Semester:\s*(\d+)/i,
      date: /Date:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i
    };
    const groupNumbers = new Set();
    for (const line of lines) {
      for (const [key, pattern] of Object.entries(patterns)) {
        if (!headerInfo[key]) {
          const match = line.match(pattern);
          if (match) headerInfo[key] = match[1] ? match[1].trim() : '';
        }
      }
      const groupMatches = line.match(/G(\d)/g);
      if (groupMatches) {
        groupMatches.forEach(match => {
          const groupNum = match.replace('G', '');
          if (groupNum >= '1' && groupNum <= '9') groupNumbers.add(parseInt(groupNum));
        });
      }
    }
    headerInfo.groups = Array.from(groupNumbers).sort();
    console.log('Extracted header info:', headerInfo);
    return headerInfo;
  }

  static normalizeDayName(day) {
    const dayMap = {
      'mon': 'Monday', 'tue': 'Tuesday', 'wed': 'Wednesday', 'thu': 'Thursday',
      'fri': 'Friday', 'sat': 'Saturday', 'sun': 'Sunday'
    };
    return dayMap[day.toLowerCase()] || day;
  }

  static processDayContent(day, contentLines, timeSlots, scheduleEntries) {
    console.log('Processing day:', day, 'with contentLines:', contentLines, 'and timeSlots:', timeSlots);
    const slots = new Array(timeSlots.length).fill('');
    let currentSlotIndex = 0;

    // Combine lines into slots based on indicators
    for (let i = 0; i < contentLines.length; i++) {
      const line = contentLines[i].trim();
      const isNewSlotIndicator = line.match(/^G\d+:/) || line.toLowerCase().includes('course');
      if (isNewSlotIndicator && currentSlotIndex < timeSlots.length) {
        if (slots[currentSlotIndex]) currentSlotIndex++;
        slots[currentSlotIndex] = line;
      } else if (currentSlotIndex < timeSlots.length) {
        slots[currentSlotIndex] += (slots[currentSlotIndex] ? ' ' : '') + line;
      }
    }

    // Map slots to time slots
    for (let i = 0; i < timeSlots.length; i++) {
      const slotContent = slots[i].trim();
      console.log(`Slot ${i} for ${timeSlots[i]}:`, slotContent);
      if (!slotContent) {
        scheduleEntries.push({ day, timeSlot: timeSlots[i], content: '' });
        console.log(`Added empty slot for ${day} ${timeSlots[i]}`);
        continue;
      }

      // Split into multiple entries if multiple groups are present
      const entries = slotContent.split(/,\s*(?=(G\d+:))/).map(entry => entry.trim());
      entries.forEach(entry => {
        if (entry) {
          scheduleEntries.push({ day, timeSlot: timeSlots[i], content: entry });
          console.log(`Processed content for ${day} ${timeSlots[i]}: ${entry}`);
        }
      });
    }
  }

  static formatOutput(data) {
    if (!data || !data.scheduleEntries) return [];
    return data.scheduleEntries.map(entry => `${entry.day} ${entry.timeSlot} ${entry.content}`);
  }

  static formatForDatabase(data) {
    if (!data || !data.scheduleEntries) {
      console.warn('No data or scheduleEntries to format:', data);
      return data;
    }

    return {
      ...data,
      scheduleEntries: data.scheduleEntries.map(entry => {
        console.log('Formatting entry:', entry);
        const [startTime, endTime] = this.extractTimeRange(entry.timeSlot);
        return {
          dayOfWeek: this.convertDayToEnum(entry.day),
          startTime,
          endTime,
          isAvailable: !entry.content,
          moduleName: this.extractModuleName(entry.content),
          professorName: this.extractProfessorName(entry.content),
          sectionName: this.extractGroups(entry.content).join(','),
          roomNumber: this.extractRoomNumber(entry.content),
          roomType: this.determineRoomType(entry.content),
        };
      })
    };
  }

  static validateScheduleData(data) {
    const errors = [];
    const warnings = [];
    if (!data || !data.scheduleEntries) {
      errors.push('No schedule entries provided');
    } else if (data.scheduleEntries.length === 0) {
      errors.push('Schedule entries array is empty');
    }
    if (!data.timeSlots || data.timeSlots.length === 0) {
      warnings.push('No time slots provided, using defaults');
    }
    console.log('Validation result:', { isValid: errors.length === 0, errors, warnings });
    return { isValid: errors.length === 0, errors, warnings };
  }

  static extractTimeRange(timeSlot) {
    const match = timeSlot.match(/(\d{2}:\d{2})-(\d{2}:\d{2})/);
    const result = match ? [match[1], match[2]] : ['00:00', '00:00'];
    console.log(`Extracted time range from ${timeSlot}:`, result);
    return result;
  }

  static convertDayToEnum(day) {
    const dayMap = {
      'Monday': 'MONDAY', 'Tuesday': 'TUESDAY', 'Wednesday': 'WEDNESDAY',
      'Thursday': 'THURSDAY', 'Friday': 'FRIDAY', 'Saturday': 'SATURDAY',
      'Sunday': 'SUNDAY'
    };
    return dayMap[day] || 'MONDAY';
  }

  static extractModuleName(content) {
    if (!content) return '';
    const moduleMatch = content.match(/\/(.+?)(?: --|\s|$)/);
    if (moduleMatch) return moduleMatch[1].trim();
    const courseMatch = content.match(/(^|\s)([^,]+?)(?:course|\s|$)/i);
    return courseMatch ? courseMatch[2].trim().replace(/DW|PW|SE|SC/g, '').trim() : '';
  }

  static extractProfessorName(content) {
    if (!content) return '';
    const professorMatch = content.match(/[A-Z][a-z]+(?:-[A-Z][a-z]+)?\b(?![DPW]W|SE|SC])/);
    return professorMatch ? professorMatch[0] : '';
  }

  static extractGroups(content) {
    if (!content) return [];
    const groupMatches = content.match(/G\d+/g) || [];
    return groupMatches;
  }

  static extractRoomNumber(content) {
    if (!content) return '';
    const roomMatch = content.match(/\b(TP\.\w+|\d{3,4}(?:T|D)?)\b/);
    return roomMatch ? roomMatch[0] : '';
  }

  static determineRoomType(content) {
    if (!content) return 'SALLE_COURS';
    const roomMatch = content.match(/\b(TP\.\w+|\d{3,4}(?:T|D)?)\b/);
    if (roomMatch) {
      const room = roomMatch[0];
      return room.match(/^TP/) || room.match(/T$/) ? 'SALLE_TP' : 'SALLE_COURS';
    }
    return 'SALLE_COURS';
  }

  static parseScheduleBlock(content, day, timeSlot) {
    const entry = { day, timeSlot, content };
    return [this.formatForDatabase({ scheduleEntries: [entry] }).scheduleEntries[0]];
  }
}

export default TableScheduleParser;