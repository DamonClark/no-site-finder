import nodemailer from 'nodemailer';

// Sends only to yourself (the digest notification) via your own Gmail —
// not used for any user-facing email, which stays manual/copy-paste.
export async function sendOwnerDigest(subject: string, text: string): Promise<void> {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) throw new Error('GMAIL_USER / GMAIL_APP_PASSWORD not configured');

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: user,
    to: user,
    subject,
    text,
  });
}
