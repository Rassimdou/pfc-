import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from the root .env file
dotenv.config({ path: join(__dirname, '../../../.env') });

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

async function createProfessor() {
  try {
    // Professor data
    const professorData = {
      email: 'younesmessekher@gmail.com',
      password: 'younes12', // This will be hashed
      firstName: 'younes',
      lastName: 'mmmmm',
      name: 'younes',
      role: 'PROFESSOR',
      phoneNumber: '+213555123456',
      isVerified: true
    };

    console.log('Creating professor with data:', {
      ...professorData,
      password: '********' // Don't log the actual password
    });

    // Hash the password
    const hashedPassword = await bcrypt.hash(professorData.password, SALT_ROUNDS);

    // Create the professor
    const professor = await prisma.user.create({
      data: {
        email: professorData.email,
        password: hashedPassword,
        firstName: professorData.firstName,
        lastName: professorData.lastName,
        name: professorData.name,
        role: professorData.role,
        phoneNumber: professorData.phoneNumber,
        isVerified: professorData.isVerified
      }
    });

    console.log('\nProfessor created successfully:');
    console.log({
      id: professor.id,
      email: professor.email,
      name: `${professor.firstName} ${professor.lastName}`,
      role: professor.role,
      department: professor.department,
      title: professor.title
    });

  } catch (error) {
    console.error('\nError creating professor:', error.message);
    if (error.code === 'P2002') {
      console.error('A user with this email already exists.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
console.log('Starting professor creation script...\n');
createProfessor()
  .then(() => console.log('\nScript completed.'))
  .catch(error => console.error('\nScript failed:', error)); 