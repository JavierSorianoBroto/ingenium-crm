import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, message } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Missing email address' });
  }

  if (!process.env.SENDGRID_API_KEY) {
    console.error('SENDGRID_API_KEY is undefined');
    return res.status(500).json({ error: 'SendGrid API key not configured. Contact admin.' });
  }

  try {
    await sgMail.send({
      to: email,
      from: 'noreply@ingeniumcrm.com',
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
