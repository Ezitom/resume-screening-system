import { defineConfig } from 'vite'

export default defineConfig({
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
  }
})
