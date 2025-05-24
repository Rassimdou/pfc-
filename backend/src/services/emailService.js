import nodemailer from 'nodemailer';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { format } from 'date-fns';

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

export const sendSwapAcceptedNotification = async (recipientEmail, swapDetails) => {
  try {
    console.log('Sending swap accepted notification to:', recipientEmail);
    
    const mailOptions = {
      from: `"USTHB-Xchange" <${process.env.SMTP_USER}>`,
      to: recipientEmail,
      subject: 'Your Swap Request Has Been Accepted!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #059669;">Your Swap Request Accepted!</h2>
          <p>Good news! Your swap request for the following assignment has been accepted:</p>
          
          <div style="background-color: #f0fdf4; border-left: 4px solid #34d399; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p><strong>Your Original Assignment:</strong></p>
            <p>${swapDetails.fromAssignment.module} - ${swapDetails.fromAssignment.room}</p>
            <p>${format(new Date(swapDetails.fromAssignment.date), 'MMM dd, yyyy')} at ${swapDetails.fromAssignment.time}</p>
          </div>

          <p>It has been swapped with:</p>
          
          <div style="background-color: #eff6ff; border-left: 4px solid #60a5fa; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p><strong>Assignment Received in Swap:</strong></p>
            <p>${swapDetails.toAssignment.module} - ${swapDetails.toAssignment.room}</p>
            <p>${format(new Date(swapDetails.toAssignment.date), 'MMM dd, yyyy')} at ${swapDetails.toAssignment.time}</p>
          </div>

          <p>The swap has been confirmed and is reflected in your schedule.</p>

          <p>If you have any questions, please contact the administrator.</p>
          
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            This is an automated message, please do not reply to this email.
          </p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Swap accepted notification email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending swap accepted notification email:', error);
    throw new Error('Failed to send swap accepted notification email');
  }
};