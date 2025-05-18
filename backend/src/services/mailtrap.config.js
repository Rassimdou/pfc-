import nodemailer from 'nodemailer';

// For development (Mailtrap)
const devConfig = {
  host: "sandbox.smtp.mailtrap.io",
  port: 2525,
  auth: {
    user: process.env.MAILTRAP_USER,
    pass: process.env.MAILTRAP_PASS
  }
};

// For production (real SMTP)
const prodConfig = {
  service: 'SendGrid', // or your provider
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
};

export const transporter = nodemailer.createTransport(
  process.env.NODE_ENV === 'production' ? prodConfig : devConfig
);