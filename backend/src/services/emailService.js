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
  },
  tls: {
    // Do not fail on invalid certs
    rejectUnauthorized: false,
    minVersion: 'TLSv1.2'
  }
});

// Verify transporter configuration
transporter.verify(function(error, success) {
  if (error) {
    console.error('SMTP Connection Error:', {
      message: error.message,
      code: error.code,
      command: error.command,
      stack: error.stack
    });
  } else {
    console.log('SMTP Server is ready to take our messages');
  }
});

// Read template
const invitationTemplate = fs.readFileSync(
  path.join(__dirname, './emailTemplates.html'),
  'utf8'
);

export const sendInvitationEmail = async (email, invitationLink) => {
  // Replace template variables
  const html = invitationTemplate
    .replace(/{{invitationLink}}/g, invitationLink)
    .replace(/{{currentYear}}/g, new Date().getFullYear());

  const mailOptions = {
    from: {
      name: 'USTHB Platform',
      address: process.env.SMTP_FROM
    },
    to: email,
    subject: 'Invitation to Join USTHB Platform',
    html: html,
    headers: {
      'X-Antivirus': 'Checked',
      'X-Antivirus-Status': 'Clean'
    }
  };

  try {
    console.log('Attempting to send invitation email to:', email);
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.response);
    return info;
  } catch (error) {
    console.error('Failed to send invitation email:', {
      error: error.message,
      code: error.code,
      command: error.command
    });
    throw error;
  }
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