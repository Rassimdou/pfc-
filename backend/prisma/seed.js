import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const palierData = {
  "paliers": [
    {
      "nom_palier": "LMD",
      "years": [
        {
          "year_name": "First Year",
          "specialites": ["Licence 1"]
        },
        {
          "year_name": "Second Year",
          "specialites": [
            "Licence 2",
            "ISIL L2",
            "GTR L2",
            "SIGL L2"
          ]
        },
        {
          "year_name": "Third Year",
          "specialites": [
            "ACAD L3",
            "ISIL L3",
            "GTR L3"
          ]
        },
        {
          "year_name": "Fourth Year",
          "specialites": [
            "BIG DATA ANALYTICS M1",
            "IL M1",
            "RSD M1",
            "IV M1",
            "BIOINFO M1",
            "SII M1",
            "HPC M1",
            "SSI M1"
          ]
        },
        {
          "year_name": "Fifth Year",
          "specialites": [
            "BIG DATA ANALYTICS M2",
            "IL M2",
            "RSD M2",
            "IV M2",
            "BIOINFO M2",
            "SII M2",
            "HPC M2",
            "SSI M2"
          ]
        }
      ]
    },
    {
      "nom_palier": "SIGL",
      "years": [
        {
          "year_name": "First Year",
          "specialites": ["SIGL L1"]
        },
        {
          "year_name": "Second Year",
          "specialites": ["SIGL L2"]
        }
      ]
    },
    {
      "nom_palier": "Ingénieur",
      "years": [
        {
          "year_name": "First Year",
          "specialites": ["ING 1"]
        },
        {
          "year_name": "Second Year",
          "specialites": ["ING 2"]
        },
        {
          "year_name": "Third Year",
          "specialites": [
            "SOFTWARE ENGINEERING ING3",
            "COMPUTER SECURITY ING3"
          ]
        }
      ]
    }
  ]
};

async function main() {
  try {
    // Clear existing data
    await prisma.speciality.deleteMany();
    await prisma.year.deleteMany();
    await prisma.palier.deleteMany();

    // Create paliers and their years and specialities
    for (const palier of palierData.paliers) {
      // First create the palier
      const createdPalier = await prisma.palier.create({
        data: {
          name: palier.nom_palier
        }
      });

      // Then create years for this palier
      for (const year of palier.years) {
        const createdYear = await prisma.year.create({
          data: {
            name: year.year_name,
            palierId: createdPalier.id
          }
        });

        // Finally create specialities for this year
        for (const speciality of year.specialites) {
          await prisma.speciality.create({
            data: {
              name: speciality,
              description: `${speciality} - ${year.year_name}`,
              palierId: createdPalier.id,
              yearId: createdYear.id
            }
          });
        }
      }

      console.log(`Created palier: ${createdPalier.name}`);
    }

    console.log('Seed completed successfully');
  } catch (error) {
    console.error('Error during seeding:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 