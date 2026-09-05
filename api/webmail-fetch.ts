// Force Node.js runtime for IMAP TCP/TLS socket support
export const runtime = 'nodejs';

import { ImapFlow } from 'imapflow';
import tls from 'tls';

const WIN1252_MAP: Record<number, string> = {
  0x80: '€', 0x82: '‚', 0x83: 'ƒ', 0x84: '„', 0x85: '…', 0x86: '†', 0x87: '‡',
  0x88: 'ˆ', 0x89: '‰', 0x8A: 'Š', 0x8B: '‹', 0x8C: 'Œ', 0x8E: 'Ž',
  0x91: '‘', 0x92: '’', 0x93: '“', 0x94: '”', 0x95: '•', 0x96: '–', 0x97: '—',
  0x98: '˜', 0x99: '™', 0x9A: 'š', 0x9B: '›', 0x9C: 'œ', 0x9E: 'ž', 0x9F: 'Ÿ',
  0xA0: ' ', 0xA9: '©', 0xAE: '®', 0xB0: '°', 0xB1: '±', 0xB7: '·'
};

function decodeMimeString(input?: string): string {
  if (!input || typeof input !== 'string') return '';

  // 1. Decode RFC 2047 encoded words in subject/headers (=?UTF-8?B?...?= or =?UTF-8?Q?...?=)
  let text = input.replace(/=\?([a-zA-Z0-9_-]+)\?([bBqQ])\?([^?]+)\?=/g, (match, charset, encoding, data) => {
    try {
      if (encoding.toUpperCase() === 'B') {
        return Buffer.from(data, 'base64').toString('utf8');
      } else if (encoding.toUpperCase() === 'Q') {
        const qData = data.replace(/_/g, ' ');
        return decodeQuotedPrintable(qData);
      }
    } catch {
      return data;
    }
    return match;
  });

  return decodeQuotedPrintable(text);
}

function decodeQuotedPrintable(input: string): string {
  if (!input) return '';

  // Remove soft line breaks
  let text = input.replace(/=(\r\n|\n|\r)/g, '');

  // Decode byte sequences
  return text.replace(/((?:=[0-9A-Fa-f]{2})+)/g, (match) => {
    const hexes = match.split('=').filter(Boolean);
    const bytes = Buffer.from(hexes.map(h => parseInt(h, 16)));
    try {
      const strict = new TextDecoder('utf-8', { fatal: true });
      return strict.decode(bytes);
    } catch {
      let s = '';
      for (let i = 0; i < bytes.length; ) {
        let matched = false;
        for (let len = Math.min(4, bytes.length - i); len >= 1; len--) {
          try {
            const sub = bytes.subarray(i, i + len);
            const strict = new TextDecoder('utf-8', { fatal: true });
            s += strict.decode(sub);
            i += len;
            matched = true;
            break;
          } catch {}
        }
        if (!matched) {
          const b = bytes[i];
          s += WIN1252_MAP[b] || String.fromCharCode(b);
          i++;
        }
      }
      return s;
    }
  });
}

function extractSnippetFromBody(body: string, maxLength = 80): string {
  if (!body) return 'New message received';

  let clean = decodeMimeString(body);
  clean = clean.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ');
  clean = clean.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ');
  clean = clean.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, ' ');
  clean = clean.replace(/<[^>]+>/g, ' ');
  clean = clean
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&ndash;/gi, '–')
    .replace(/&mdash;/gi, '—');
  clean = clean.replace(/\s+/g, ' ').trim();

  if (!clean) return 'New message received';
  if (clean.length <= maxLength) return clean;

  const sub = clean.substring(0, maxLength);
  const lastSpace = sub.lastIndexOf(' ');
  if (lastSpace >= 55) {
    return sub.substring(0, lastSpace) + '...';
  }
  return sub + '...';
}

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

          // Extract text and html parts from raw MIME source if present
          let htmlBody = '';
          let textBody = '';

          if (message.source) {
            const rawSource = message.source.toString('binary');

            // Find HTML part
            const htmlPartMatch = rawSource.match(
              /Content-Type:\s*text\/html(?:;[^\r\n]*)?(?:\r?\n[ \t][^\r\n]*)*\r?\n(?:Content-Transfer-Encoding:\s*([^\r\n]+)\r?\n)?(?:[^\r\n]+\r?\n)*\r?\n([\s\S]*?)(?:\r?\n--|$)/i
            );
            if (htmlPartMatch) {
              const enc = (htmlPartMatch[1] || '').trim().toLowerCase();
              const partContent = htmlPartMatch[2];
              if (enc === 'base64') {
                htmlBody = Buffer.from(partContent.replace(/\s+/g, ''), 'base64').toString('utf8');
              } else if (enc === 'quoted-printable') {
                htmlBody = decodeMimeString(partContent);
              } else {
                htmlBody = decodeMimeString(partContent);
              }
            }

            // Find Plain Text part
            const textPartMatch = rawSource.match(
              /Content-Type:\s*text\/plain(?:;[^\r\n]*)?(?:\r?\n[ \t][^\r\n]*)*\r?\n(?:Content-Transfer-Encoding:\s*([^\r\n]+)\r?\n)?(?:[^\r\n]+\r?\n)*\r?\n([\s\S]*?)(?:\r?\n--|$)/i
            );
            if (textPartMatch) {
              const enc = (textPartMatch[1] || '').trim().toLowerCase();
              const partContent = textPartMatch[2];
              if (enc === 'base64') {
                textBody = Buffer.from(partContent.replace(/\s+/g, ''), 'base64').toString('utf8');
              } else if (enc === 'quoted-printable') {
                textBody = decodeMimeString(partContent);
              } else {
                textBody = decodeMimeString(partContent);
              }
            }

            // If neither matched MIME boundaries, use general body after double newline
            if (!htmlBody && !textBody) {
              const headerEnd = rawSource.indexOf('\r\n\r\n');
              const altHeaderEnd = rawSource.indexOf('\n\n');
              const splitIdx = headerEnd !== -1 ? headerEnd + 4 : altHeaderEnd !== -1 ? altHeaderEnd + 2 : 0;
              const remainder = rawSource.substring(splitIdx);
              if (/<[a-z][\s\S]*>/i.test(remainder)) {
                htmlBody = decodeMimeString(remainder);
              } else {
                textBody = decodeMimeString(remainder);
              }
            }
          }

          const rawCandidate = textBody || htmlBody || '';
          const cleanSnippet = extractSnippetFromBody(rawCandidate);
          const decodedSubject = decodeMimeString(envelope.subject || '(No Subject)');
          const decodedFrom = decodeMimeString(fromAddr);

          const finalBodyHtml = htmlBody
            ? htmlBody
            : `<div style="white-space: pre-wrap; font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif; font-size: 14px; line-height: 1.6; color: #0D0D0D; padding: 12px;">${textBody || cleanSnippet}</div>`;

          fetchedEmails.push({
            id: `imap-${message.uid || message.seq}`,
            accountEmail: account?.email || authUser,
            folder: folder || 'inbox',
            from: decodedFrom,
            to: toAddr,
            subject: decodedSubject,
            date: envelope.date ? new Date(envelope.date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : new Date().toLocaleString(),
            timestamp: envelope.date ? new Date(envelope.date).getTime() : Date.now(),
            snippet: cleanSnippet,
            bodyHtml: finalBodyHtml,
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
