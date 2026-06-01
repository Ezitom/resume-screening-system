import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    build: {
      rollupOptions: {
        input: {
          main:               'index.html',
          dashboard:          'dashboard.html',
          login:              'login.html',
          analytics:          'analytics.html',
          jobPostings:        'job-postings.html',
          candidateDetails:   'candidate-details.html',
          resumeUpload:       'resume-upload.html',
          forgotPassword:     'forgot-password.html',
          resetPassword:      'reset-password.html',
          setPassword:        'set-password.html',
          openPositions:      'open-positions.html',
          privacyPolicy:      'privacy-policy.html',
          signup:             'signup.html',
          support:            'support.html',
          termsOfUse:         'terms-of-use.html',
        }
      }
    },
    plugins: [
      {
        name: 'api-middleware',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url?.startsWith('/api/send-email') && req.method === 'POST') {
              let body = '';
              req.on('data', chunk => { body += chunk; });
              req.on('end', async () => {
                try {
                  const { to, subject, html } = JSON.parse(body);
                  const resendKey = env.VITE_RESEND_API_KEY;

                  if (!resendKey) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'VITE_RESEND_API_KEY is not defined in local .env file' }));
                    return;
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
                  res.writeHead(response.status, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify(resData));
                } catch (err) {
                  res.writeHead(500, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ message: err.message }));
                }
              });
            } else {
              next();
            }
          });
        }
      }
    ]
  }
})
