import { NextResponse } from 'next/server';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

export async function GET() {
  // Use an App Password for Gmail/Yahoo, NOT your main password
  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD 
    }
  });

  try {
    await client.connect();
    let lock = await client.getMailboxLock('INBOX');
    let extractedData = [];

    try {
      // Search for unread emails from a specific bank (example)
      for await (let message of client.fetch({ from: 'alerts@hdfcbank.net', seen: false }, { source: true })) {
        const parsed = await simpleParser(message.source);
        const text = parsed.text;
        
        // Similar regex extraction as SMS
        const amountMatch = text.match(/(?:rs\.?|usd|\$)?\s*(\d+(?:,\d+)*(?:\.\d+)?)/i);
        if (amountMatch) {
          extractedData.push({
            subject: parsed.subject,
            amount: parseFloat(amountMatch[1].replace(/,/g, '')),
            date: parsed.date
          });
          // TODO: Save to Prisma database here
        }
      }
    } finally {
      lock.release();
    }
    await client.logout();
    
    return NextResponse.json({ success: true, synced: extractedData.length, data: extractedData });
  } catch (error) {
    console.error("Email sync error:", error);
    return NextResponse.json({ error: 'Failed to sync emails' }, { status: 500 });
  }
}