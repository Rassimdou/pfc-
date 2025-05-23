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
    const dayEnum = convertDayToEnum(entry.day);
    const [startTime, endTime] = extractTimeRange(entry.timeSlot);
    
    const section = await prisma.section.upsert({
      where: { 
        name_specialityId: {
          name: entry.section || 'A',
          specialityId: speciality.id
        }
      },
      update: {},
      create: {
        name: entry.section || 'A',
        specialityId: speciality.id,
        academicYear: year
      }
    });

    const module = await handleModuleCreation(entry, speciality, semester);
    const professor = await handleProfessorCreation(entry, speciality);
    const room = await handleRoomCreation(entry);

    return {
      dayEnum,
      startTime,
      endTime,
      sectionId: section.id,
      moduleId: module.id,
      professorId: professor?.id,
      roomId: room?.id,
      type: entry.type || 'COURSE',
      groups: entry.groups
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
          unique_slot: {
            dayOfWeek: entry.dayEnum,
            startTime: entry.startTime,
            sectionId: entry.sectionId,
            moduleId: entry.moduleId
          }
        },
        create: {
          dayOfWeek: entry.dayEnum,
          startTime: entry.startTime,
          endTime: entry.endTime,
          type: entry.type,
          group: entry.groups?.join(',') || null,
          sectionId: entry.sectionId,
          moduleId: entry.moduleId,
          professorId: entry.professorId,
          roomId: entry.roomId
        },
        update: {
          endTime: entry.endTime,
          type: entry.type,
          group: entry.groups?.join(',') || null,
          professorId: entry.professorId,
          roomId: entry.roomId
        }
      })
    )
  );
}

async function handleModuleCreation(entry, speciality, semester) {
  return prisma.module.upsert({
    where: {
      name_specialityId_semestre: {
        name: entry.modules[0] || 'Unknown Module',
        specialityId: speciality.id,
        semestre: semester
      }
    },
    update: {},
    create: {
      name: entry.modules[0] || 'Unknown Module',
      code: generateModuleCode(entry.modules[0]),
      specialityId: speciality.id,
      semestre: semester,
      academicYear: speciality.yearId
    }
  });
}

function generateModuleCode(moduleName) {
  return moduleName
    ? moduleName.slice(0, 3).toUpperCase() + Math.floor(100 + Math.random() * 900)
    : 'MOD' + Math.floor(1000 + Math.random() * 9000);
}

async function handleProfessorCreation(entry, speciality) {
  if (!entry.professors?.length) return null;
  
  return prisma.user.upsert({
    where: { email: generateProfessorEmail(entry.professors[0]) },
    update: {},
    create: {
      name: entry.professors[0],
      email: generateProfessorEmail(entry.professors[0]),
      role: 'PROFESSOR',
      specialitiesTaught: { connect: { id: speciality.id } }
    }
  });
}

function generateProfessorEmail(name) {
  return `${name.toLowerCase().replace(/\s+/g, '.')}@usthb.dz`;
}

async function handleRoomCreation(entry) {
  if (!entry.rooms?.length) return null;
  
  return prisma.room.upsert({
    where: { number: entry.rooms[0].number },
    update: { type: entry.rooms[0].type },
    create: {
      number: entry.rooms[0].number,
      type: entry.rooms[0].type || 'SALLE_COURS',
      capacity: 30
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