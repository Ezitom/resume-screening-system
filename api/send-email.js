module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { to, subject, html, to_name } = req.body || {};

  try {
    const brevoKey = process.env.MAIL_PASS || process.env.BREVO_API_KEY || process.env.BREVO_SMTP_PASSWORD;
    let senderEmail = process.env.BREVO_SENDER_EMAIL;
    let senderName = process.env.BREVO_SENDER_NAME || 'Resume Screening Team';

    if (process.env.MAIL_FROM) {
      const match = process.env.MAIL_FROM.match(/^(.*?)\s*<([^>]+)>$/);
      if (match) {
        senderName = match[1].trim() || senderName;
        senderEmail = match[2].trim();
      } else {
        senderEmail = process.env.MAIL_FROM.trim();
      }
    }

    if (!brevoKey || !senderEmail) {
      return res.status(500).json({ message: 'Brevo API key or sender email is not configured on the server.' });
    }

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': brevoKey
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: to, name: to_name || 'Candidate' }],
        subject,
        htmlContent: html
      })
    });

    const resData = await response.json();
    return res.status(response.status).json(resData);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
