// Force Node.js runtime for Nodemailer SMTP transport
export const runtime = 'nodejs';

import nodemailer from 'nodemailer';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON request body' });
    }
  }
  body = body || {};

  const { to, subject, text } = body;

  if (!to || !subject || !text) {
    return res.status(400).json({ error: 'Missing required parameters (to, subject, text)' });
  }

  try {
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = Number(process.env.SMTP_PORT) || 587;
    const isSecure = smtpPort === 465;

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: isSecure,
      requireTLS: !isSecure && smtpPort === 587,
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
      },
      tls: {
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2'
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000
    });

    await transporter.sendMail({
      from: `"${process.env.VITE_COMPANY_NAME || 'CosmoCnergy Procurement'}" <${process.env.SMTP_USER || 'noreply@cosmocnergy.com'}>`,
      to,
      subject,
      text
    });

    return res.status(200).json({ success: true, message: 'Email dispatched successfully via Vercel serverless!' });
  } catch (error: any) {
    console.error('Nodemailer error:', error);
    return res.status(500).json({ error: 'Failed to send email', details: error.message });
  }
}
