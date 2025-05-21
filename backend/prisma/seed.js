import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  // Clear existing data in the correct order to handle foreign key constraints
  await prisma.scheduleSlot.deleteMany()
  await prisma.surveillanceAssignment.deleteMany()
  await prisma.section.deleteMany()
  await prisma.module.deleteMany()
  await prisma.speciality.deleteMany()
  await prisma.palier.deleteMany()

  // Create paliers and their specialities
  const paliersData = [
    {
      name: "LMD",
      specialities: [
        "Informatique L2",
        "ISIL L2",
        "GTR L2",
        "BIG DATA ANALYTICS M1",
        "BIG DATA ANALYTICS M2",
        "IL M1",
        "IL M2",
        "RSD M1",
        "RSD M2",
        "IV M1",
        "IV M2",
        "BIOINFO M1",
        "BIOINFO M2",
        "SII M1",
        "SII M2",
        "HPC M1",
        "HPC M2",
        "SSI M1",
        "SSI M2",
        "Licence 1 L1"
      ]
    },
    {
      name: "SIGL",
      specialities: [
        "SIGL L2",
        "SIGL L1"
      ]
    },
    {
      name: "ING",
      specialities: [
        "Ingénieur 2 ING 2",
        "SOFTWARE ENGINEERING ING3",
        "COMPUTER SECURITY ING3",
        "Ingénieur 1 ING 1"
      ]
    }
  ]

  for (const palierData of paliersData) {
    const palier = await prisma.palier.create({
      data: {
        name: palierData.name,
        specialities: {
          create: palierData.specialities.map(specialityName => ({
            name: specialityName,
            description: `${specialityName} - ${palierData.name}`
          }))
        }
      }
    })
    console.log(`Created palier: ${palier.name}`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 