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

  const { to, subject, html } = req.body;

  try {
    const resendKey = process.env.VITE_RESEND_API_KEY || process.env.RESEND_API_KEY;

    if (!resendKey) {
      return res.status(500).json({ message: 'Resend API key is not configured on the server.' });
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendKey}`
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev',
        to,
        subject,
        html
      })
    });

    const resData = await response.json();
    return res.status(response.status).json(resData);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
