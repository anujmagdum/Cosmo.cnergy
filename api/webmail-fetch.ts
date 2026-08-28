// Force Node.js runtime for IMAP TCP/TLS socket support
export const runtime = 'nodejs';

import { ImapFlow } from 'imapflow';
import tls from 'tls';

// Serverless Handler for IMAP Email Sync & Connection Testing
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { account, mode = 'fetch', folder = 'inbox' } = req.body || {};

  const imapHost = (account?.imapHost || account?.imap_host || process.env.IMAP_HOST || '').trim();
  const imapPort = Number(account?.imapPort) || Number(account?.imap_port) || Number(process.env.IMAP_PORT) || 993;
  const authUser = (account?.username || account?.auth_username || account?.email || '').trim();
  const authPass = (account?.password || account?.auth_password || process.env.IMAP_PASS || '').trim();

  if (!imapHost) {
    return res.status(400).json({
      success: false,
      error: 'IMAP Host is required. Please check your Webmail account settings.'
    });
  }

  if (!authUser || !authPass) {
    return res.status(400).json({
      success: false,
      error: `Password or username missing for ${authUser || 'account'}. Please enter your email password in Webmail Settings (Gear Icon).`
    });
  }

  try {
    const isSecure = imapPort === 993;
    const client = new ImapFlow({
      host: imapHost,
      port: imapPort,
      secure: isSecure,
      auth: {
        user: authUser,
        pass: authPass,
      },
      tls: {
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2'
      },
      logger: false
    });

    await client.connect();

    if (mode === 'test') {
      await client.logout();
      return res.status(200).json({
        success: true,
        message: `Connection & authentication to ${imapHost}:${imapPort} verified for ${authUser}!`
      });
    }

    // Determine target mailbox path
    let mailboxPath = 'INBOX';
    if (folder === 'sent') {
      mailboxPath = imapHost.includes('gmail') ? '[Gmail]/Sent Mail' : 'Sent';
    } else if (folder === 'trash') {
      mailboxPath = imapHost.includes('gmail') ? '[Gmail]/Trash' : 'Trash';
    }

    let lock;
    try {
      lock = await client.getMailboxLock(mailboxPath);
    } catch (boxErr) {
      console.warn(`[IMAP] Could not lock ${mailboxPath}, falling back to INBOX:`, boxErr);
      lock = await client.getMailboxLock('INBOX');
    }

    const fetchedEmails: any[] = [];

    try {
      const status = await client.status(mailboxPath, { messages: true, unseen: true });
      const total = status.messages || 0;

      if (total > 0) {
        const fetchCount = Math.min(20, total);
        const startSeq = Math.max(1, total - fetchCount + 1);
        const searchRange = `${startSeq}:${total}`;

        for await (let message of client.fetch(searchRange, { envelope: true, bodyStructure: true, source: true, flags: true })) {
          const envelope = message.envelope || { from: [], to: [], subject: '', date: new Date() };
          const fromAddr = envelope.from?.[0]
            ? `${envelope.from[0].name || ''} <${envelope.from[0].address || ''}>`.trim()
            : 'Unknown Sender';

          const toAddr = envelope.to?.[0]?.address || account?.email || authUser;

          // Extract text snippet or body from source if present
          let bodyText = '';
          if (message.source) {
            const rawSource = message.source.toString();
            const textMatch = rawSource.match(/Content-Type:\s*text\/(?:plain|html)[^]*?\r?\n\r?\n([^]*?)(?:\r?\n--|$)/i);
            bodyText = textMatch ? textMatch[1].trim() : rawSource.substring(0, 500);
          }

          const cleanSnippet = (envelope.subject || bodyText.substring(0, 120) || 'New message received').replace(/<[^>]*>?/gm, '');

          fetchedEmails.push({
            id: `imap-${message.uid || message.seq}`,
            accountEmail: account?.email || authUser,
            folder: folder || 'inbox',
            from: fromAddr,
            to: toAddr,
            subject: envelope.subject || '(No Subject)',
            date: envelope.date ? new Date(envelope.date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : new Date().toLocaleString(),
            timestamp: envelope.date ? new Date(envelope.date).getTime() : Date.now(),
            snippet: cleanSnippet,
            bodyHtml: `<div style="font-family: Arial, sans-serif; padding: 14px; color: #073642; line-height: 1.6;">
              <p><strong>Subject:</strong> ${envelope.subject || '(No Subject)'}</p>
              <p><strong>From:</strong> ${fromAddr}</p>
              <p><strong>Date:</strong> ${envelope.date ? new Date(envelope.date).toUTCString() : new Date().toUTCString()}</p>
              <hr style="border: 0; border-top: 1px solid #D6D1B1; margin: 15px 0;"/>
              <div style="white-space: pre-wrap; font-size: 13px;">${bodyText || cleanSnippet}</div>
            </div>`,
            isUnread: !(message.flags?.has('\\Seen')),
            isStarred: Boolean(message.flags?.has('\\Flagged')),
          });
        }
      }
    } finally {
      if (lock) lock.release();
    }

    await client.logout();
    return res.status(200).json({ 
      success: true, 
      emails: fetchedEmails.reverse(),
      totalFound: fetchedEmails.length,
      message: `Successfully retrieved ${fetchedEmails.length} messages from ${imapHost}.`
    });

  } catch (error: any) {
    console.error('[IMAP Service] Node.js Runtime IMAP Connection/Fetch Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to connect to IMAP server. Please verify IMAP host, port, username, and password.'
    });
  }
}
