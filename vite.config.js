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
    server: {
      proxy: {
        '/api': {
          target: env.VITE_API_BASE_URL || 'http://localhost:5000',
          changeOrigin: true,
          secure: false
        }
      }
    }
  }
})
