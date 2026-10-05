import axios from 'axios';
import nodemailer from 'nodemailer';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export interface SendEmailResult {
  success: boolean;
  provider: 'resend' | 'smtp' | 'mock';
  messageId?: string;
  latencyMs?: number;
  error?: string;
}

export interface MockSentEmail {
  to: string;
  subject: string;
  html: string;
  text?: string;
  sentAt: string;
}

const mockEmailInbox: MockSentEmail[] = [];

/**
 * Returns all emails captured by the mock sink during tests and development.
 */
export function getMockEmails(): MockSentEmail[] {
  return [...mockEmailInbox];
}

/**
 * Clears the mock email inbox.
 */
export function clearMockEmails(): void {
  mockEmailInbox.length = 0;
}

/**
 * Probes which email provider is currently active based on environment variables.
 */
export function getActiveEmailProvider(): 'resend' | 'smtp' | 'mock' {
  if (process.env.NODE_ENV === 'test') {
    return 'mock';
  }
  if (process.env.RESEND_API_KEY) {
    return 'resend';
  }
  if (process.env.SMTP_HOST) {
    return 'smtp';
  }
  return 'mock';
}

/**
 * Dispatches an email using the best available transport provider.
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const startTime = Date.now();
  const provider = getActiveEmailProvider();
  const fromAddress = options.from || process.env.EMAIL_FROM || 'OSS Command Center <notifications@oss-command.center>';

  // 1. Mock Transport (Tests & Development fallback)
  if (provider === 'mock') {
    const record: MockSentEmail = {
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      sentAt: new Date().toISOString()
    };
    mockEmailInbox.push(record);
    const latencyMs = Date.now() - startTime;
    return {
      success: true,
      provider: 'mock',
      messageId: `mock_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      latencyMs
    };
  }

  // 2. Resend REST API Transport
  if (provider === 'resend') {
    try {
      const apiKey = process.env.RESEND_API_KEY;
      const res = await axios.post(
        'https://api.resend.com/emails',
        {
          from: fromAddress,
          to: [options.to],
          subject: options.subject,
          html: options.html,
          text: options.text
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      return {
        success: true,
        provider: 'resend',
        messageId: res.data?.id,
        latencyMs: Date.now() - startTime
      };
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Resend delivery failed';
      return {
        success: false,
        provider: 'resend',
        error: message,
        latencyMs: Date.now() - startTime
      };
    }
  }

  // 3. SMTP Transport via Nodemailer
  if (provider === 'smtp') {
    try {
      const host = process.env.SMTP_HOST!;
      const port = Number(process.env.SMTP_PORT || 587);
      const secure = process.env.SMTP_SECURE === 'true' || port === 465;
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;

      const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: user && pass ? { user, pass } : undefined,
        connectionTimeout: 10000
      });

      const info = await transporter.sendMail({
        from: fromAddress,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text
      });

      return {
        success: true,
        provider: 'smtp',
        messageId: info.messageId,
        latencyMs: Date.now() - startTime
      };
    } catch (err: any) {
      return {
        success: false,
        provider: 'smtp',
        error: err.message || 'SMTP delivery failed',
        latencyMs: Date.now() - startTime
      };
    }
  }

  return {
    success: false,
    provider: 'mock',
    error: 'No valid email transport provider found',
    latencyMs: Date.now() - startTime
  };
}
