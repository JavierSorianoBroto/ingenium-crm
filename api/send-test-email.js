import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, message } = req.body;

  if (!email || !process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: '📧 Ingenium CRM - Test Email',
      html: `
        <div style="font-family: Arial; max-width: 600px; margin: 0 auto;">
          <div style="background: #04101d; padding: 20px; border-radius: 8px; color: #00e5b0;">
            <h2>Ingenium CRM</h2>
            <p>${message}</p>
            <p style="color: #4d7597; font-size: 12px; margin-top: 20px;">
              This is a test email. Your email reminders are working correctly! ✅
            </p>
          </div>
        </div>
      `,
    });

    return res.status(200).json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    console.error('Email error:', error);
    return res.status(500).json({ error: error.message });
  }
}
