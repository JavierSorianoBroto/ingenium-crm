import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Optional: Add a simple token check for security (can be passed as query param or body)
  const testToken = req.headers['x-test-token'] || req.body?.token;
  if (testToken !== process.env.TEST_EMAIL_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized - invalid test token' });
  }

  try {
    // Configure email service
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    // Get email from request body
    const { to, projectName } = req.body;

    if (!to) {
      return res.status(400).json({ error: 'Missing "to" email address in request body' });
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: to,
      subject: `[TEST] Recordatorio: Follow-up mañana para ${projectName || 'Proyecto de Prueba'}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #fef3c7; padding: 12px 16px; border-radius: 6px; margin-bottom: 16px; border-left: 4px solid #f59e0b;">
            <p style="margin: 0; color: #92400e;"><strong>⚠️ EMAIL DE PRUEBA</strong> - Este es un email de prueba del sistema de recordatorios.</p>
          </div>
          <h2 style="color: #2563eb;">📌 Recordatorio de Follow-up</h2>
          <p>Hola Usuario de Prueba,</p>
          <p>Te recordamos que mañana (<strong>${tomorrow.toLocaleDateString('es-ES')}</strong>) tienes un follow-up programado:</p>
          <div style="background: #f6f8fb; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #2563eb;">
            <p style="margin: 0; font-size: 16px; color: #0f172a;"><strong>${projectName || 'Proyecto de Prueba'}</strong></p>
          </div>
          <p>Por favor, asegúrate de contactar al cliente a tiempo.</p>
          <hr style="border: none; border-top: 1px solid #e5eaf2; margin: 24px 0;">
          <p style="color: #64748b; font-size: 12px;">Este es un recordatorio automático del CRM Ingenium. No responda a este email.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({
      message: `Email de prueba enviado a ${to}`,
      projectName: projectName || 'Proyecto de Prueba',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    return res.status(500).json({ error: 'Failed to send email', details: error.message });
  }
}
