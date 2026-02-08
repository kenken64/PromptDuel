import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY;
const resend = apiKey ? new Resend(apiKey) : null;
const senderEmail = process.env.SENDER_EMAIL || 'onboarding@resend.dev';
const appName = 'Prompt Duel';
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

export async function sendPasswordResetEmail(
  email: string,
  username: string,
  resetToken: string
): Promise<{ success: boolean; error?: string }> {
  const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

  if (!resend) {
    console.error('RESEND_API_KEY not configured. Password reset email not sent.');
    console.log('Reset URL (for development):', resetUrl);
    // In development, return success so the flow can be tested
    return { success: true };
  }

  try {
    const { error } = await resend.emails.send({
      from: `${appName} <${senderEmail}>`,
      to: email,
      subject: 'Reset Your Password - Prompt Duel',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: 'Press Start 2P', Arial, sans-serif;
              background-color: #1a1a2e;
              color: #fff;
              padding: 20px;
              margin: 0;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #212337;
              border: 4px solid #92cc41;
              padding: 30px;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .header h1 {
              color: #92cc41;
              font-size: 24px;
              margin: 0;
            }
            .content {
              font-size: 14px;
              line-height: 1.8;
              color: #ccc;
            }
            .button {
              display: inline-block;
              background-color: #92cc41;
              color: #000;
              padding: 15px 30px;
              text-decoration: none;
              font-weight: bold;
              margin: 20px 0;
              border: none;
            }
            .button:hover {
              background-color: #a3d952;
            }
            .footer {
              margin-top: 30px;
              font-size: 12px;
              color: #888;
              text-align: center;
            }
            .warning {
              background-color: rgba(231, 110, 85, 0.2);
              border: 2px solid #e76e55;
              padding: 15px;
              margin: 20px 0;
              font-size: 12px;
              color: #e76e55;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Prompt Duel</h1>
            </div>
            <div class="content">
              <p>Hey ${username}!</p>
              <p>We received a request to reset your password for your Prompt Duel account.</p>
              <p style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </p>
              <div class="warning">
                This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
              </div>
              <p>If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #92cc41;">${resetUrl}</p>
            </div>
            <div class="footer">
              <p>This email was sent from Prompt Duel.</p>
              <p>If you didn't request this, please ignore this email.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('Failed to send password reset email:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Email service error:', error);
    return { success: false, error: 'Failed to send email' };
  }
}
