import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export default async function handler(req, res) {
  console.log('=== API CALLED ===');
  console.log('Method:', req.method);
  console.log('Body:', req.body);
  console.log('ENV KEY:', process.env.SENDGRID_API_KEY ? 'EXISTS' : 'MISSING');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, message } = req.body || {};

  console.log('Email:', email);
  console.log('Message:', message);

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  if (!process.env.SENDGRID_API_KEY) {
    return res.status(500).json({ 
      error: 'SENDGRID_API_KEY not configured',
      hasKey: !!process.env.SENDGRID_API_KEY
    });
  }

  try {
    const msg = {
      to: email,
      from: 'noreply@ingeniumcrm.com',
      subject: '📧 Ingenium CRM - Test Email',
      html: `<h2>Ingenium CRM</h2><p>${message || 'Test email'}</p>`,
    };

    await sgMail.send(msg);

    return res.status(200).json({ success: true, message: 'Email sent' });
  } catch (error) {
    console.error('ERROR:', error);
    return res.status(500).json({ 
      error: error.message,
      details: error.toString()
    });
  }
}
