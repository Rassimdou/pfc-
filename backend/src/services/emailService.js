import nodemailer from 'nodemailer';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { getSwapRequestTemplate, getPermutationRequestTemplate } from './emailTemplates.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Create a transporter using environment variables
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Read template
const invitationTemplate = fs.readFileSync(
  path.join(__dirname, './emailTemplates.html'),
  'utf8'
);

export const sendInvitationEmail = async (email, invitationLink) => {
  const mailOptions = {
    from: process.env.SMTP_FROM,
    to: email,
    subject: 'Invitation to Join USTHB Platform',
    html: `
      <h1>Welcome to USTHB Platform</h1>
      <p>You have been invited to join the USTHB platform. Click the link below to complete your registration:</p>
      <a href="${invitationLink}">Complete Registration</a>
    `
  };

  await transporter.sendMail(mailOptions);
};

export const sendSwapRequestNotification = async (receiverEmail, senderName, assignmentDetails) => {
  const mailOptions = {
    from: process.env.SMTP_FROM,
    to: receiverEmail,
    subject: 'New Surveillance Swap Request',
    html: getSwapRequestTemplate(senderName, assignmentDetails)
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Swap request notification email sent successfully');
  } catch (error) {
    console.error('Failed to send swap request notification:', error);
    throw error;
  }
};

export const sendPermutationRequestNotification = async (receiverEmail, senderName, slotDetails) => {
  const mailOptions = {
    from: process.env.SMTP_FROM,
    to: receiverEmail,
    subject: 'New Schedule Permutation Request',
    html: getPermutationRequestTemplate(senderName, slotDetails)
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Permutation request notification email sent successfully');
  } catch (error) {
    console.error('Failed to send permutation request notification:', error);
    throw error;
  }
};