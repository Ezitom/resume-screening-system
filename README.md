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

## Deployment
Run `npm run build` to create a production build in the `dist/` folder.
