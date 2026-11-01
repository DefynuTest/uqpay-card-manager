import { Resend } from 'resend';
import { config } from '../config';

let client: Resend | null = null;

function getClient(): Resend {
  if (!client) {
    if (!config.resendApiKey) {
      throw new Error('RESEND_API_KEY is required for email OTP');
    }
    client = new Resend(config.resendApiKey);
  }
  return client;
}

export async function sendOtpEmail(email: string, code: string): Promise<void> {
  const resend = getClient();

  await resend.emails.send({
    from: config.emailFrom,
    to: email,
    subject: `${code} — Your Card Manager verification code`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="color: #1a1a1a; margin-bottom: 8px;">Verify your Telegram link</h2>
        <p style="color: #666; font-size: 15px; line-height: 1.5;">
          Enter this code in the Telegram bot to link your ZOQQ account:
        </p>
        <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #1a1a1a;">${code}</span>
        </div>
        <p style="color: #999; font-size: 13px;">
          This code expires in 5 minutes. If you didn't request this, you can safely ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #bbb; font-size: 12px;">ZOQQ Card Manager</p>
      </div>
    `,
  });

  console.log(`[Email] OTP sent to ${email.slice(0, 3)}***`);
}
