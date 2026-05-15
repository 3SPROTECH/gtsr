import nodemailer from 'nodemailer';
import { env } from './env.js';

let transporter = null;

if (env.smtp.host && env.smtp.user) {
  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth: { user: env.smtp.user, pass: env.smtp.pass },
  });
}

export async function sendMail({ to, subject, html, text }) {
  if (!transporter) {
    // Mode dev sans SMTP : on log uniquement
    console.log(`[MAIL:DEV] -> ${to} | ${subject}`);
    return { skipped: true };
  }
  return transporter.sendMail({ from: env.smtp.from, to, subject, html, text });
}
