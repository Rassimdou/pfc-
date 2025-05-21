// dbService.js
import { PrismaClient } from '@prisma/client';
import { convertDayToEnum, extractTimeRange } from './scheduleParser.js';

const prisma = new PrismaClient();

/**
 * Imports schedule data into the database
 * @param {Object} scheduleData - Extracted schedule data
 * @param {string} selectedYear - Selected academic year
 * @param {string} selectedSemester - Selected semester number
 * @returns {Object} Result of the import operation
 */
export async function importScheduleToDatabase(scheduleData, selectedYear, selectedSemester) {
  try {
    const { headerInfo, scheduleEntries } = scheduleData;
    const specialityCode = headerInfo.speciality || 'ING.INFO';
    const sectionLetter = headerInfo.section || 'A';
    const academicYear = parseInt(selectedYear) || 2024;
    
    // Convert semester string to enum value
    const semesterEnum = selectedSemester === '1' ? 'SEMESTRE1' : 'SEMESTRE2';
    
    // 1. Get or create the speciality
    const speciality = await findOrCreateSpeciality(specialityCode);
    
    // 2. Process each schedule entry
    const createdSlots = [];
    const processedSlots = [];
    
    for (const entry of scheduleEntries) {
      try {
        // Convert day string to enum
        const dayOfWeek = convertDayToEnum(entry.day);
        
        // Extract time range from time slot
        const [startTime, endTime] = extractTimeRange(entry.timeSlot);
        
        // Skip if no modules or if already processed identical slot
        if (entry.modules.length === 0 || 
            isProcessedSlot(processedSlots, dayOfWeek, startTime, entry.modules[0])) {
          continue;
        }
        
        // For each module mentioned in the entry
        for (const moduleName of entry.modules) {
          // Find or create module
          const module = await findOrCreateModule({
            name: moduleName,
            academicYear,
            semesterEnum,
            specialityId: speciality.id
          });
          
          // For each professor mentioned in the entry
          for (const professorName of entry.professors) {
            // Find or create professor
            const professor = await findOrCreateProfessor({
              name: professorName,
              specialityId: speciality.id
            });
            
            // Connect professor to module if not already connected
            await connectProfessorToModule(professor.id, module.id);
            
            // Process sections and groups
            // If no explicit groups, use default group "1"
            const groups = entry.groups.length > 0 ? entry.groups : ['1'];
            
            for (const groupNumber of groups) {
              // Create section name with group information
              const sectionName = `${sectionLetter}-G${groupNumber}`;
              
              // Find or create section
              const section = await findOrCreateSection({
                name: sectionName,
                moduleId: module.id,
                academicYear
              });
              
              // Process rooms if any
              let roomId = null;
              if (entry.rooms.length > 0) {
                const roomInfo = entry.rooms[0];
                const room = await findOrCreateRoom({
                  number: roomInfo.number.toString(),
                  type: roomInfo.type || getRoomTypeFromEntryType(entry.type)
                });
                roomId = room.id;
              }
              
              // Create schedule slot
              const slotData = {
                dayOfWeek,
                startTime,
                endTime,
                isAvailable: false,
                ownerId: professor.id,
                moduleId: module.id,
                sectionId: section.id,
                ...(roomId ? { roomId } : {})
              };
              
              const scheduleSlot = await createScheduleSlot(slotData);
              
              createdSlots.push(scheduleSlot);
              
              // Track processed slot to avoid duplicates
              processedSlots.push({
                day: dayOfWeek,
                time: startTime,
                module: moduleName
              });
            }
          }
        }
      } catch (error) {
        console.error('Error processing schedule entry:', error);
        // Continue with next entry even if this one fails
      }
    }
    
    return {
      createdSlots: createdSlots.length,
      message: `Successfully imported ${createdSlots.length} schedule slots`
    };
  } catch (error) {
    console.error('Error importing schedule to database:', error);
    throw new Error('Failed to import schedule data: ' + error.message);
  }
}