# Resume Screening and Candidate Sustainability Evaluation System

A web-based AI-powered resume screening and candidate sustainability
evaluation system built with JavaScript, Vite, Supabase, and the Groq AI API.

## Features
- AI-powered resume evaluation across 7 scoring categories
- Candidate sustainability assessment with required sustainability statement
- Secure recruiter dashboard with invite-only access
- Real-time candidate scoring and ranking
- Supabase PostgreSQL cloud database
- PDF and DOCX resume support

## Tech Stack
- Frontend: HTML, CSS, JavaScript
- Build Tool: Vite
- AI Engine: Groq API (Llama 3 70B)
- Database: Supabase (PostgreSQL)
- Authentication: Supabase Auth
- Resume Parsing: pdf.js, mammoth.js

## Setup Instructions
1. Clone the repository
2. Run `npm install`
3. Copy `.env.example` to `.env`
4. Fill in your API keys and SMTP credentials in the `.env` file
5. Run `npm run dev` to start the development server
6. Open `https://resume-screening-evaluation-system.netlify.app/` in your browser

## Environment Variables
See `.env.example` for required environment variables.

## Email Setup (Brevo / Sendinblue SMTP Relay)
To enable transactional email sending (candidate job message updates, interview invitations, application confirmations, and direct recruiter messages), configure the following environment variables.

> **IMPORTANT:** These environment variables MUST be set in both your local `.env` file AND in your live Render Backend Environment settings (**Render Dashboard -> Service -> Environment Settings**):

- `BREVO_SMTP_LOGIN`: Your Brevo SMTP login username (e.g. `b1230e001@smtp-brevo.com` from Brevo Dashboard -> SMTP & API -> SMTP Tab).
- `BREVO_SMTP_PASSWORD`: Your Brevo SMTP password / key generated from the Brevo Dashboard SMTP tab (starts with `xsmtpsib-...`).
- `BREVO_SENDER_NAME`: The sender name displayed on outgoing emails (e.g. `"EBEN Recruitment"`).
- `BREVO_SENDER_EMAIL`: The verified sender email address registered in your Brevo account.

## Deployment
Run `npm run build` to create a production build in the `dist/` folder.
