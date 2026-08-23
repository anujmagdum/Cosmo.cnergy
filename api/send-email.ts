// Force Node.js runtime for Nodemailer SMTP transport
export const runtime = 'nodejs';

import nodemailer from 'nodemailer';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { to, subject, text } = req.body;

  if (!to || !subject || !text) {
    return res.status(400).json({ error: 'Missing required parameters (to, subject, text)' });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
      }
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
