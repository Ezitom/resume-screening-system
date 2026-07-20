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
4. Fill in your API keys in the `.env` file
5. Run `npm run dev` to start the development server
6. Open `https://ezitom.vercel.app` in your browser

## Environment Variables
See `.env.example` for required environment variables.

## Email Setup (Brevo / Sendinblue)
To enable transactional email sending (candidate job message updates and interview invitations), configure the following environment variables in your deployment platform (e.g. Render Dashboard -> Environment Settings):
- `BREVO_API_KEY`: Your Brevo v3 API Key (from Brevo Dashboard -> SMTP & API).
- `BREVO_SENDER_NAME`: The sender name displayed on emails (e.g. `"EBEN Recruitment"`).
- `BREVO_SENDER_EMAIL`: The verified sender email address registered with your Brevo account.

## Deployment
Run `npm run build` to create a production build in the `dist/` folder.
