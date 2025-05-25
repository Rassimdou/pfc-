// dbService.js
import { PrismaClient } from '@prisma/client';
import { convertDayToEnum, extractTimeRange } from './scheduleParser.js';

const prisma = new PrismaClient();

export async function importScheduleToDatabase(scheduleData, year, semester) {
  // Validate input data first
  if (!scheduleData?.success || !scheduleData.data) {
    throw new Error('Invalid schedule data: ' + (scheduleData.error || 'Unknown error'));
  }

  const { headerInfo, timeSlots, scheduleEntries } = scheduleData.data;
  
  try {
    // Enhanced speciality creation with validation
    const speciality = await prisma.speciality.upsert({
      where: { 
        name_yearId: {
          name: headerInfo.speciality || 'Unknown Speciality',
          yearId: (await getCurrentYear()).id
        }
      },
      update: {},
      create: {
        name: headerInfo.speciality || 'Unknown Speciality',
        year: { connect: { id: (await getCurrentYear()).id } },
        palier: { connect: { name: 'LMD' } }
      }
    });

    // Batch processing setup
    const batchSize = 50;
    let currentBatch = [];
    let createdCount = 0;

    for (const entry of scheduleEntries) {
      const processedEntry = await processScheduleEntry(entry, speciality, year, semester);
      
      if (processedEntry) {
        currentBatch.push(processedEntry);
        
        if (currentBatch.length >= batchSize) {
          await executeBatch(currentBatch);
          createdCount += currentBatch.length;
          currentBatch = [];
        }
      }
    }

    // Process remaining entries
    if (currentBatch.length > 0) {
      await executeBatch(currentBatch);
      createdCount += currentBatch.length;
    }

    return {
      success: true,
      createdCount,
      totalEntries: scheduleEntries.length
    };

  } catch (error) {
    console.error('Database import failed:', error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    await prisma.$disconnect();
  }
}

// Helper functions
async function processScheduleEntry(entry, speciality, year, semester) {
  try {
    // Use fields from formatForDatabase
    const dayOfWeek = entry.dayOfWeek;
    const startTime = entry.startTime;
    const endTime = entry.endTime;

    // Find or create module first, as section requires moduleId
    const module = await handleModuleCreation(entry, speciality, semester);

    // Find or create section
    const section = await prisma.section.upsert({
      where: {
        name_moduleId_academicYear: {
          name: entry.sectionName || 'A',
          moduleId: module.id,
          academicYear: parseInt(year)
        }
      },
      update: {
        yearId: year.id
      },
      create: {
        name: entry.sectionName || 'A',
        moduleId: module.id,
        academicYear: parseInt(year),
        yearId: year.id
      }
    });

    // Find or create professor and room
    const professor = await handleProfessorCreation(entry, speciality);
    const room = await handleRoomCreation(entry);

    console.log('Processed entity IDs:', {
      moduleId: module?.id,
      sectionId: section?.id,
      professorId: professor?.id,
      roomId: room?.id,
    });

    return {
      dayOfWeek,
      startTime,
      endTime,
      sectionId: section.id,
      moduleId: module.id,
      professorId: professor?.id,
      roomId: room?.id,
      // Removed 'type' and 'groups' as they are not in ScheduleSlot model
    };
  } catch (error) {
    console.error('Entry processing failed:', error);
    return null;
  }
}

async function executeBatch(batch) {
  await prisma.$transaction(
    batch.map(entry => 
      prisma.scheduleSlot.upsert({
        where: {
          // Ensure the unique constraint matches the schema
          moduleId_sectionId_dayOfWeek_startTime: {
            moduleId: entry.moduleId,
            sectionId: entry.sectionId,
            dayOfWeek: entry.dayOfWeek,
            startTime: entry.startTime,
          }
        },
        create: {
          dayOfWeek: entry.dayOfWeek,
          startTime: entry.startTime,
          endTime: entry.endTime,
          isAvailable: false, // Assuming imported slots are not immediately available for swap
          sectionId: entry.sectionId,
          moduleId: entry.moduleId,
          ownerId: entry.professorId,
          roomId: entry.roomId
          // Removed 'type' and 'group' from create
        },
        update: {
          endTime: entry.endTime,
          ownerId: entry.professorId,
          roomId: entry.roomId
          // Removed 'type' and 'group' from update
        }
      })
    )
  );
}

async function handleModuleCreation(entry, speciality, semester) {
  // Use fields from formatForDatabase
  const academicYear = parseInt(entry.academicYear) || (speciality.year?.name ? parseInt(speciality.year.name) : new Date().getFullYear());
  const moduleCode = entry.moduleName ? generateModuleCode(entry.moduleName) : 'UNKNOWN';
  const moduleName = entry.moduleName || 'Unknown Module';

  return prisma.module.upsert({
    where: {
      code_academicYear: {
        code: moduleCode,
        academicYear: academicYear
      }
    },
    update: {
      name: moduleName,
      specialityId: speciality.id,
      semestre: semester // Use the semester from the import parameters
    },
    create: {
      code: moduleCode,
      name: moduleName,
      academicYear: academicYear,
      specialityId: speciality.id,
      yearId: speciality.yearId, // Assuming speciality is linked to a Year
      palierId: speciality.palierId, // Assuming speciality is linked to a Palier
      semestre: semester // Use the semester from the import parameters
    }
  });
}

function generateModuleCode(moduleName) {
  return moduleName
    ? moduleName.slice(0, 3).toUpperCase() + Math.floor(100 + Math.random() * 900)
    : 'MOD' + Math.floor(1000 + Math.random() * 9000);
}

async function handleProfessorCreation(entry, speciality) {
  // Use fields from formatForDatabase
  if (!entry.professorName) return null;

  return prisma.user.upsert({
    where: { email: generateProfessorEmail(entry.professorName) },
    update: {},
    create: {
      name: entry.professorName,
      email: generateProfessorEmail(entry.professorName),
      role: 'PROFESSOR',
      // Link professor to speciality if necessary, but user model has specialitiesTaught array
      // specialitiesTaught: { connect: { id: speciality.id } }
    }
  });
}

function generateProfessorEmail(name) {
  return `${name.toLowerCase().replace(/\s+/g, '.')}@usthb.dz`;
}

async function handleRoomCreation(entry) {
  // Use fields from formatForDatabase
  if (!entry.roomNumber) return null;

  return prisma.room.upsert({
    where: { name: entry.roomNumber },
    update: { type: entry.roomType || 'SALLE_COURS' },
    create: {
      name: entry.roomNumber,
      type: entry.roomType || 'SALLE_COURS',
      capacity: 30 // Default capacity
    }
  });
}

async function getCurrentYear() {
  return prisma.year.upsert({
    where: { name: new Date().getFullYear().toString() },
    update: {},
    create: {
      name: new Date().getFullYear().toString(),
      palier: { connect: { name: 'LMD' } }
    }
  });
}