import nodemailer from 'nodemailer';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

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

export const sendInvitationEmail = async (email) => {
  try {
    console.log('Sending invitation email to:', email);
    
    const mailOptions = {
      from: `"USTHB-Xchange" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Welcome to USTHB-Xchange - Complete Your Registration',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #059669;">Welcome to USTHB-Xchange!</h2>
          <p>You've been invited to join USTHB-Xchange as a teacher. To complete your registration, please visit:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/signup" 
               style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Complete Registration
            </a>
          </div>
          <p>You can also sign up using your Google account by clicking the "Continue with Google" button on the registration page.</p>
          <p>If you didn't request this invitation, please ignore this email.</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            This is an automated message, please do not reply to this email.
          </p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending invitation email:', error);
    throw new Error('Failed to send invitation email');
  }
};