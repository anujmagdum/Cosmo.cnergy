import DOMPurify from 'dompurify';

/**
 * Windows-1252 byte-to-character fallback mapping for single-byte symbols
 * often found in emails that are not valid UTF-8 sequences.
 */
const WIN1252_MAP: Record<number, string> = {
  0x80: '€', 0x82: '‚', 0x83: 'ƒ', 0x84: '„', 0x85: '…', 0x86: '†', 0x87: '‡',
  0x88: 'ˆ', 0x89: '‰', 0x8A: 'Š', 0x8B: '‹', 0x8C: 'Œ', 0x8E: 'Ž',
  0x91: '‘', 0x92: '’', 0x93: '“', 0x94: '”', 0x95: '•', 0x96: '–', 0x97: '—',
  0x98: '˜', 0x99: '™', 0x9A: 'š', 0x9B: '›', 0x9C: 'œ', 0x9E: 'ž', 0x9F: 'Ÿ',
  0xA0: ' ', 0xA9: '©', 0xAE: '®', 0xB0: '°', 0xB1: '±', 0xB7: '·'
};

/**
 * Decodes RFC 2047 encoded words (=?UTF-8?B?...?= or =?UTF-8?Q?...?=),
 * Quoted-Printable hex sequences (=XX), and soft line breaks.
 */
export function decodeMimeQuotedPrintable(input?: string): string {
  if (!input || typeof input !== 'string') return '';

  // 1. Decode RFC 2047 encoded words in subject/headers
  let text = input.replace(/=\?([a-zA-Z0-9_-]+)\?([bBqQ])\?([^?]+)\?=/g, (match, charset, encoding, data) => {
    try {
      if (encoding.toUpperCase() === 'B') {
        const bin = typeof atob === 'function' ? atob(data) : Buffer.from(data, 'base64').toString('binary');
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return new TextDecoder(charset || 'utf-8').decode(bytes);
      } else if (encoding.toUpperCase() === 'Q') {
        const qData = data.replace(/_/g, ' ');
        return decodeMimeQuotedPrintable(qData);
      }
    } catch {
      return data;
    }
    return match;
  });

  // 2. Remove soft line breaks (=\r\n or =\n or =\r)
  text = text.replace(/=(\r\n|\n|\r)/g, '');

  // 3. Decode contiguous Quoted-Printable hex byte sequences (=XX)
  text = text.replace(/((?:=[0-9A-Fa-f]{2})+)/g, (match) => {
    const hexes = match.split('=').filter(Boolean);
    const bytes = new Uint8Array(hexes.map(h => parseInt(h, 16)));

    // Try decoding with strict UTF-8
    try {
      const strictUtf8 = new TextDecoder('utf-8', { fatal: true });
      return strictUtf8.decode(bytes);
    } catch {
      // Fallback: byte-by-byte recovery with Windows-1252 awareness
      let decodedStr = '';
      let i = 0;
      while (i < bytes.length) {
        let matched = false;
        for (let len = Math.min(4, bytes.length - i); len >= 1; len--) {
          try {
            const sub = bytes.slice(i, i + len);
            const strict = new TextDecoder('utf-8', { fatal: true });
            decodedStr += strict.decode(sub);
            i += len;
            matched = true;
            break;
          } catch {}
        }
        if (!matched) {
          const b = bytes[i];
          decodedStr += WIN1252_MAP[b] || String.fromCharCode(b);
          i++;
        }
      }
      return decodedStr;
    }
  });

  return text;
}

/**
 * Strips duplicate synthetic header containers (<p><strong>Subject:</strong> ...</p>)
 * injected by naive IMAP dumpers or previous mock saves.
 */
export function cleanRawEmailBody(body?: string): string {
  if (!body) return '';

  let cleaned = decodeMimeQuotedPrintable(body);

  // Remove synthetic header blocks like <p><strong>Subject:</strong>...</p>...<hr.../>
  cleaned = cleaned.replace(
    /<p>\s*<strong>\s*Subject:[\s\S]*?<\/p>\s*<p>\s*<strong>\s*From:[\s\S]*?<\/p>\s*<p>\s*<strong>\s*Date:[\s\S]*?<\/p>\s*(?:<p>\s*<strong>\s*To:[\s\S]*?<\/p>\s*)?<hr[^>]*>/gi,
    ''
  );

  // Remove plain text headers if they start the body
  cleaned = cleaned.replace(
    /^(?:Subject:[^\r\n]*\r?\n)?(?:From:[^\r\n]*\r?\n)?(?:Date:[^\r\n]*\r?\n)?(?:To:[^\r\n]*\r?\n)?(?:---+\r?\n)?/i,
    ''
  );

  return cleaned.trim();
}

/**
 * Extracts a true, clean body snippet of 60-80 characters from email body.
 * Strips HTML, scripts, styles, duplicate headers, and unescapes entities.
 */
export function extractTrueBodySnippet(bodyHtml?: string, rawSnippet?: string, minChars = 60, maxChars = 80): string {
  // Use bodyHtml first if available; fall back to rawSnippet
  let source = bodyHtml || rawSnippet || '';
  if (!source) return 'No preview available';

  // Decode MIME
  let text = decodeMimeQuotedPrintable(source);

  // Remove <style>...</style> and <script>...</script>
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ');
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ');
  text = text.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, ' ');

  // Remove synthetic header lines
  text = text.replace(/<p>\s*<strong>\s*Subject:[\s\S]*?<\/p>\s*<p>\s*<strong>\s*From:[\s\S]*?<\/p>\s*<p>\s*<strong>\s*Date:[\s\S]*?<\/p>\s*<hr[^>]*>/gi, ' ');
  text = text.replace(/Subject:.*?From:.*?Date:.*?(---|\n)/gis, ' ');

  // Strip all HTML tags
  text = text.replace(/<[^>]+>/g, ' ');

  // Unescape standard HTML entities
  text = text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&ndash;/gi, '–')
    .replace(/&mdash;/gi, '—')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

  // Normalize whitespace
  text = text.replace(/\s+/g, ' ').trim();

  if (!text) {
    if (rawSnippet && rawSnippet.trim()) {
      return rawSnippet.trim().substring(0, maxChars);
    }
    return 'Empty message body';
  }

  // If text is within limits, return
  if (text.length <= maxChars) {
    return text;
  }

  // Truncate at word boundary between minChars and maxChars if possible
  const sub = text.substring(0, maxChars);
  const lastSpace = sub.lastIndexOf(' ');
  if (lastSpace >= minChars) {
    return sub.substring(0, lastSpace) + '...';
  }
  return sub + '...';
}

/**
 * Sanitizes HTML using DOMPurify and wraps it in a self-contained, responsive
 * document structure safe for rendering inside an isolated sandbox iframe.
 */
export function buildSanitizedIframeDoc(rawHtml: string): string {
  const decodedHtml = cleanRawEmailBody(rawHtml);

  // Check if content is plain text (no tags)
  const hasHtmlTags = /<[a-z][\s\S]*>/i.test(decodedHtml);
  const contentToSanitize = hasHtmlTags
    ? decodedHtml
    : `<div style="white-space: pre-wrap; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #0D0D0D;">${decodedHtml}</div>`;

  // Sanitize via DOMPurify
  const sanitizeFn = (DOMPurify as any).sanitize || ((DOMPurify as any).default && (DOMPurify as any).default.sanitize);
  const sanitized = sanitizeFn ? sanitizeFn(contentToSanitize, {
    ADD_ATTR: ['target', 'style', 'align', 'valign', 'border', 'cellpadding', 'cellspacing', 'bgcolor'],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover']
  }) : contentToSanitize;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <base target="_blank">
  <style>
    *, *::before, *::after {
      box-sizing: border-box;
    }
    html, body {
      margin: 0;
      padding: 0;
      background-color: #ffffff;
      color: #0D0D0D;
      font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      word-break: break-word;
      overflow-wrap: break-word;
    }
    body {
      padding: 20px;
    }
    img {
      max-width: 100% !important;
      height: auto !important;
    }
    table {
      max-width: 100% !important;
      border-collapse: collapse;
    }
    a {
      color: #059669;
      text-decoration: underline;
    }
    blockquote {
      margin: 12px 0;
      padding-left: 12px;
      border-left: 3px solid #cbd5e1;
      color: #475569;
    }
    pre, code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 13px;
      background: #f8fafc;
      padding: 2px 4px;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  ${sanitized}
</body>
</html>`;
}

/**
 * Formats a clean list item date (e.g. "31 Aug" or "10:45 AM" or "31 Aug 2026")
 */
export function formatEmailListDate(dateString: string, timestamp?: number): string {
  try {
    const time = timestamp ? new Date(timestamp) : new Date(dateString);
    if (isNaN(time.getTime())) return dateString.split(',')[0] || dateString;

    const now = new Date();
    const isToday = now.toDateString() === time.toDateString();
    if (isToday) {
      return time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    }

    const isSameYear = now.getFullYear() === time.getFullYear();
    if (isSameYear) {
      return time.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    }

    return time.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateString.split(',')[0] || dateString;
  }
}
