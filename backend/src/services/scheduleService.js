import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

class ScheduleService {
  static async saveScheduleToDatabase(scheduleData, options = {}) {
    try {
      const {
        specialityName,
        academicYear,
        semester,
        sectionName
      } = options;

      console.log('Received schedule data:', scheduleData);
      console.log('Received options:', options);

      // Validate only essential fields
      if (!specialityName || !academicYear || !semester || !sectionName) {
        console.error('Missing required fields:', { specialityName, academicYear, semester, sectionName });
        throw new Error('Missing required fields: specialityName, academicYear, semester, or sectionName');
      }

      console.log('Processing schedule with options:', options);

      // First find or create the palier
      const palierRecord = await prisma.palier.upsert({
        where: {
          name: 'LMD' // Default palier name
        },
        update: {},
        create: {
          name: 'LMD'
        }
      });

      console.log('Found/created palier:', palierRecord);

      // Find or create the year
      const year = await prisma.year.upsert({
        where: {
          name_palierId: {
            name: String(academicYear),
            palierId: palierRecord.id
          }
        },
        update: {},
        create: {
          name: String(academicYear),
          palierId: palierRecord.id
        }
      });

      console.log('Found/created year:', year);

      // Find or create speciality
      const speciality = await prisma.speciality.upsert({
        where: {
          name_palierId_yearId: {
            name: specialityName,
            palierId: palierRecord.id,
            yearId: year.id
          }
        },
        update: {
          palierId: palierRecord.id,
          yearId: year.id
        },
        create: {
          name: specialityName,
          palierId: palierRecord.id,
          yearId: year.id,
          description: `${specialityName} - Year ${academicYear}`
        }
      });

      console.log('Found/created speciality:', speciality);

      // Find or create module with fallback
      const moduleCode = scheduleData.moduleName || 'UNKNOWN';
      const moduleName = scheduleData.moduleName || 'Unknown Module';
      const moduleAcademicYear = parseInt(academicYear);
      
      console.log('Creating/updating module with:', {
        code: moduleCode,
        name: moduleName,
        academicYear: moduleAcademicYear,
        specialityId: speciality.id,
        yearId: year.id,
        palierId: palierRecord.id,
        semestre: semester === '1' ? 'SEMESTRE1' : 'SEMESTRE2'
      });

      // First try to find the module
      let module = await prisma.module.findUnique({
        where: {
          code_academicYear: {
            code: moduleCode,
            academicYear: moduleAcademicYear
          }
        }
      });

      if (!module) {
        // If module doesn't exist, create it
        module = await prisma.module.create({
          data: {
            code: moduleCode,
            name: moduleName,
            academicYear: moduleAcademicYear,
            specialityId: speciality.id,
            yearId: year.id,
            palierId: palierRecord.id,
            semestre: semester === '1' ? 'SEMESTRE1' : 'SEMESTRE2'
          }
        });
      } else {
        // If module exists, update it
        module = await prisma.module.update({
          where: {
            id: module.id
          },
          data: {
            name: moduleName,
            specialityId: speciality.id,
            yearId: year.id,
            palierId: palierRecord.id,
            semestre: semester === '1' ? 'SEMESTRE1' : 'SEMESTRE2'
          }
        });
      }

      console.log('Successfully created/updated module:', module);

      // Find or create section
      const section = await prisma.section.upsert({
        where: {
          name_moduleId_academicYear: {
            name: sectionName,
            moduleId: module.id,
            academicYear: parseInt(academicYear)
          }
        },
        update: {
          yearId: year.id
        },
        create: {
          name: sectionName,
          moduleId: module.id,
          academicYear: parseInt(academicYear),
          yearId: year.id
        }
      });

      console.log('Found/created section:', section);

      // Process each schedule entry
      const scheduleEntries = scheduleData.scheduleEntries || [];
      const savedSlots = [];
      const errors = [];

      for (const entry of scheduleEntries) {
        try {
          console.log('Processing entry:', entry);

          // Find or create professor with fallback
          const professor = await prisma.user.upsert({
            where: {
              email: `${(entry.professorName || 'TBA').toLowerCase().replace(/\s+/g, '.')}@example.com`
            },
            update: {
              name: entry.professorName || 'TBA',
              role: 'PROFESSOR'
            },
            create: {
              email: `${(entry.professorName || 'TBA').toLowerCase().replace(/\s+/g, '.')}@example.com`,
              name: entry.professorName || 'TBA',
              role: 'PROFESSOR',
              isVerified: true
            }
          });

          // Find or create room with fallback
          const room = await prisma.room.upsert({
            where: {
              name: entry.roomNumber || 'TBA'
            },
            update: {
              type: entry.roomType || 'SALLE_COURS'
            },
            create: {
              name: entry.roomNumber || 'TBA',
              type: entry.roomType || 'SALLE_COURS',
              capacity: 30
            }
          });

          // Check if a schedule slot already exists for this combination
          const existingSlot = await prisma.scheduleSlot.findFirst({
            where: {
              moduleId: module.id,
              sectionId: section.id,
              dayOfWeek: entry.dayOfWeek || 'MONDAY',
              startTime: entry.startTime || '08:00'
            }
          });

          if (existingSlot) {
            // Update existing slot
            const updatedSlot = await prisma.scheduleSlot.update({
              where: { id: existingSlot.id },
              data: {
                endTime: entry.endTime || '09:30',
                isAvailable: false,
                ownerId: professor.id,
                roomId: room.id
              }
            });
            savedSlots.push(updatedSlot);
          } else {
            // Create new slot
            const scheduleSlot = await prisma.scheduleSlot.create({
              data: {
                dayOfWeek: entry.dayOfWeek || 'MONDAY',
                startTime: entry.startTime || '08:00',
                endTime: entry.endTime || '09:30',
                isAvailable: false,
                ownerId: professor.id,
                moduleId: module.id,
                sectionId: section.id,
                roomId: room.id
              }
            });
            savedSlots.push(scheduleSlot);
          }
        } catch (error) {
          console.error('Error processing entry:', error);
          errors.push({
            entry,
            error: error.message
          });
        }
      }

      if (errors.length > 0) {
        console.error('Errors occurred while processing entries:', errors);
        return {
          success: false,
          error: `Failed to process ${errors.length} entries`,
          details: errors
        };
      }

      return {
        success: true,
        message: `Successfully saved ${savedSlots.length} schedule slots`,
        data: savedSlots
      };
    } catch (error) {
      console.error('Error saving schedule to database:', error);
      console.error('Error stack:', error.stack);
      return {
        success: false,
        error: error.message,
        details: error.stack
      };
    }
  }

  static async savePlanningData(planningData, options = {}) {
    try {
      const {
        specialityName,
        academicYear,
        semester,
        sectionName
      } = options;

      console.log('Received planning data:', planningData);
      console.log('Received options:', options);

      // Validate required fields
      if (!specialityName || !academicYear || !semester || !sectionName) {
        throw new Error('Missing required fields: specialityName, academicYear, semester, or sectionName');
      }

      // First find or create the palier
      const palierRecord = await prisma.palier.upsert({
        where: {
          name: 'LMD' // Default palier name
        },
        update: {},
        create: {
          name: 'LMD'
        }
      });

      // Find or create the year
      const year = await prisma.year.upsert({
        where: {
          name_palierId: {
            name: String(academicYear),
            palierId: palierRecord.id
          }
        },
        update: {},
        create: {
          name: String(academicYear),
          palierId: palierRecord.id
        }
      });

      // Find or create the speciality
      const speciality = await prisma.speciality.upsert({
        where: {
          name_palierId_yearId: {
            name: specialityName,
            palierId: palierRecord.id,
            yearId: year.id
          }
        },
        update: {},
        create: {
          name: specialityName,
          palierId: palierRecord.id,
          yearId: year.id
        }
      });

      // Find or create the module
      const module = await prisma.module.upsert({
        where: {
          code_academicYear: {
            code: planningData.moduleCode || 'TBA',
            academicYear: parseInt(academicYear)
          }
        },
        update: {
          name: planningData.moduleName || 'TBA',
          specialityId: speciality.id,
          yearId: year.id,
          palierId: palierRecord.id,
          semestre: semester
        },
        create: {
          code: planningData.moduleCode || 'TBA',
          name: planningData.moduleName || 'TBA',
          specialityId: speciality.id,
          yearId: year.id,
          palierId: palierRecord.id,
          academicYear: parseInt(academicYear),
          semestre: semester
        }
      });

      // Find or create the section
      const section = await prisma.section.upsert({
        where: {
          name_moduleId_academicYear: {
            name: sectionName,
            moduleId: module.id,
            academicYear: parseInt(academicYear)
          }
        },
        update: {
          yearId: year.id,
          palierId: palierRecord.id
        },
        create: {
          name: sectionName,
          moduleId: module.id,
          academicYear: parseInt(academicYear),
          yearId: year.id,
          palierId: palierRecord.id
        }
      });

      const savedSlots = [];
      const errors = [];

      // Process each planning entry
      for (const entry of planningData.entries) {
        try {
          // Find or create professor
          const professor = await prisma.user.upsert({
            where: {
              email: `${(entry.professorName || 'TBA').toLowerCase().replace(/\s+/g, '.')}@example.com`
            },
            update: {
              name: entry.professorName || 'TBA',
              role: 'PROFESSOR'
            },
            create: {
              email: `${(entry.professorName || 'TBA').toLowerCase().replace(/\s+/g, '.')}@example.com`,
              name: entry.professorName || 'TBA',
              role: 'PROFESSOR',
              isVerified: true
            }
          });

          // Find or create room
          const room = await prisma.room.upsert({
            where: {
              name: entry.roomNumber || 'TBA'
            },
            update: {
              type: entry.roomType || 'SALLE_COURS'
            },
            create: {
              name: entry.roomNumber || 'TBA',
              type: entry.roomType || 'SALLE_COURS',
              capacity: 30
            }
          });

          // Create or update schedule slot
          const scheduleSlot = await prisma.scheduleSlot.upsert({
            where: {
              moduleId_sectionId_dayOfWeek_startTime: {
                moduleId: module.id,
                sectionId: section.id,
                dayOfWeek: entry.dayOfWeek,
                startTime: entry.startTime
              }
            },
            update: {
              endTime: entry.endTime,
              isAvailable: false,
              ownerId: professor.id,
              roomId: room.id
            },
            create: {
              dayOfWeek: entry.dayOfWeek,
              startTime: entry.startTime,
              endTime: entry.endTime,
              isAvailable: false,
              ownerId: professor.id,
              moduleId: module.id,
              sectionId: section.id,
              roomId: room.id
            }
          });

          savedSlots.push(scheduleSlot);
        } catch (error) {
          console.error('Error processing entry:', error);
          errors.push({
            entry,
            error: error.message
          });
        }
      }

      if (errors.length > 0) {
        return {
          success: false,
          error: `Failed to process ${errors.length} entries`,
          details: errors
        };
      }

      return {
        success: true,
        message: `Successfully saved ${savedSlots.length} schedule slots`,
        data: savedSlots
      };

    } catch (error) {
      console.error('Error saving planning data:', error);
      return {
        success: false,
        error: error.message,
        details: error.stack
      };
    }
  }
}

export default ScheduleService; 