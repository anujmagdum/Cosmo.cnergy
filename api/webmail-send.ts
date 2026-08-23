// Force Node.js runtime for Nodemailer SMTP transport
export const runtime = 'nodejs';

import nodemailer from 'nodemailer';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const payload = req.body || {};
  const account = payload.account || {};
  const to = payload.to || payload.mail?.to;
  const cc = payload.cc || payload.mail?.cc;
  const subject = payload.subject || payload.mail?.subject;
  const html = payload.html || payload.mail?.bodyHtml || payload.mail?.html;
  const text = payload.text || payload.mail?.text || payload.mail?.snippet;
  const attachmentBase64 = payload.attachmentBase64 || payload.mail?.attachments?.[0]?.dataBase64;
  const attachmentName = payload.attachmentName || payload.mail?.attachments?.[0]?.filename;

  if (!to || !subject) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing required dispatch parameters: "to" and "subject" are mandatory.' 
    });
  }

  const smtpHost = (account.smtpHost || process.env.SMTP_HOST || 'mail.cosmocnergy.com').trim();
  const smtpPort = Number(account.smtpPort) || Number(process.env.SMTP_PORT) || 465;
  const authUser = (account.auth_username || account.username || account.email || process.env.SMTP_USER || '').trim();
  const authPass = (account.auth_password || account.password || process.env.SMTP_PASS || '').trim();

  console.log(`[Webmail SMTP] Initiating transport to ${to} via ${smtpHost}:${smtpPort} as ${authUser}`);

  // If no auth password provided, return actionable error instruction
  if (!authPass) {
    console.warn('[Webmail SMTP] Warning: No SMTP password configured for mailbox.');
    return res.status(400).json({
      success: false,
      error: `No SMTP password provided for ${authUser}. Please enter your mailbox password in Webmail Settings -> Gear Icon.`,
      simulated: false
    });
  }

  try {
    const isSecure = smtpPort === 465;
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: isSecure,
      requireTLS: !isSecure && smtpPort === 587,
      auth: {
        user: authUser,
        pass: authPass,
      },
      tls: {
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2'
      },
      connectionTimeout: 12000,
      greetingTimeout: 12000,
      socketTimeout: 20000
    });

    const senderEmail = account.email || authUser;
    const senderName = account.senderName || account.sender_name || 'CosmoCnergy Procurement Webmail';

    const mailOptions: any = {
      from: `"${senderName}" <${senderEmail}>`,
      to,
      cc: cc || undefined,
      subject,
      html: html || `<p style="font-family: sans-serif; font-size: 14px; line-height: 1.6;">${(text || '').replace(/\n/g, '<br/>')}</p>`,
      text: text || undefined
    };

    if (attachmentBase64) {
      const base64Data = attachmentBase64.includes(',') ? attachmentBase64.split(',')[1] : attachmentBase64;
      mailOptions.attachments = [
        {
          filename: attachmentName || 'Procurement_Document.pdf',
          content: base64Data,
          encoding: 'base64'
        }
      ];
    }

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Webmail SMTP] Dispatch succeeded. MessageId: ${info.messageId}`);

    return res.status(200).json({ 
      success: true, 
      messageId: info.messageId,
      accepted: info.accepted || [to],
      message: `Email dispatched successfully to ${to} via ${smtpHost}!`
    });
  } catch (error: any) {
    console.error('[Webmail SMTP] Transport failure:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'SMTP Connection/Authentication Failed. Please check SMTP host, port, and credentials.',
      code: error.code,
      command: error.command
    });
  }
}
