import prisma from '../lib/prismaClient.js';
import bcrypt from 'bcrypt';

const createAdmin = async () => {
  try {
    const adminEmail = 'admin@university.edu';
    const adminPassword = 'admin123'; // You should change this in production
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    const admin = await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        role: 'ADMIN',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        name: 'Admin User',
        isVerified: true
      },
      create: {
        email: adminEmail,
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        name: 'Admin User',
        role: 'ADMIN',
        isVerified: true
      }
    });

    console.log('Admin user created/updated successfully:', admin);
    console.log('Login credentials:');
    console.log('Email:', adminEmail);
    console.log('Password:', adminPassword);
  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    await prisma.$disconnect();
  }
};

createAdmin(); 