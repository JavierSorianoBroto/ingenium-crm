import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://cdvcooucmnpprqfgaluz.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkdmNvb3VjbW5wcHJxZmdhbHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NTMyMjcsImV4cCI6MjA5MDAyOTIyN30.sJ5ysVx0kTHZ9Lv8ySqIpVfOJrhWY2NvBkBXodXKuhY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Configure email service (using nodemailer with Gmail or your preferred provider)
// For production, use environment variables for email credentials
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD, // Use app-specific password for Gmail
  },
});

export default async function handler(req, res) {
  // Only allow POST requests and cron auth header
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify it's a legitimate cron request from Vercel
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Get tomorrow's date
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD format

    // Query projects with follow-up date = tomorrow
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name, responsible, followUp')
      .eq('followUp', tomorrowStr);

    if (projectsError) {
      console.error('Error fetching projects:', projectsError);
      return res.status(500).json({ error: 'Failed to fetch projects' });
    }

    if (!projects || projects.length === 0) {
      return res.status(200).json({ message: 'No follow-ups scheduled for tomorrow' });
    }

    // Get responsible people details (emails)
    const responsibleNames = [...new Set(projects.map(p => p.responsible).filter(Boolean))];
    
    if (responsibleNames.length === 0) {
      return res.status(200).json({ message: 'No responsible people found' });
    }

    const { data: responsibles, error: responsiblesError } = await supabase
      .from('responsibles')
      .select('name, email')
      .in('name', responsibleNames);

    if (responsiblesError) {
      console.error('Error fetching responsibles:', responsiblesError);
      return res.status(500).json({ error: 'Failed to fetch responsible people' });
    }

    // Create email map for quick lookup
    const emailMap = {};
    responsibles.forEach(r => {
      emailMap[r.name] = r.email;
    });

    // Send emails
    let emailCount = 0;
    for (const project of projects) {
      const email = emailMap[project.responsible];
      if (!email) {
        console.warn(`No email found for responsible: ${project.responsible}`);
        continue;
      }

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: `Recordatorio: Follow-up mañana para ${project.name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">📌 Recordatorio de Follow-up</h2>
            <p>Hola <strong>${project.responsible}</strong>,</p>
            <p>Te recordamos que mañana (<strong>${tomorrow.toLocaleDateString('es-ES')}</strong>) tienes un follow-up programado:</p>
            <div style="background: #f6f8fb; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #2563eb;">
              <p style="margin: 0; font-size: 16px; color: #0f172a;"><strong>${project.name}</strong></p>
            </div>
            <p>Por favor, asegúrate de contactar al cliente a tiempo.</p>
            <hr style="border: none; border-top: 1px solid #e5eaf2; margin: 24px 0;">
            <p style="color: #64748b; font-size: 12px;">Este es un recordatorio automático del CRM Ingenium. No responda a este email.</p>
          </div>
        `,
      };

      try {
        await transporter.sendMail(mailOptions);
        emailCount++;
        console.log(`Email sent to ${email} for project ${project.name}`);
      } catch (emailError) {
        console.error(`Failed to send email to ${email}:`, emailError);
      }
    }

    return res.status(200).json({
      message: `Successfully sent ${emailCount} reminder emails`,
      projectsChecked: projects.length,
    });
  } catch (error) {
    console.error('Error in send-reminders:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
