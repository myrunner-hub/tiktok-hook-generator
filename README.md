# TikTok Hook Generator

Simple full-stack Next.js MVP that generates viral TikTok hooks using Groq.

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start)

## Local development

1. Install dependencies:
   - `npm install`
2. Create `.env.local`:
   - `GROQ_API_KEY=your_groq_api_key_here`
3. Run:
   - `npm run dev`

## Deploy on Netlify

This repo includes `netlify.toml` with the Next.js plugin.

1. Push this folder to GitHub.
2. In Netlify, create a **New site from Git** and select the repo.
3. Netlify should auto-detect:
   - Build command: `npm run build`
   - Publish directory: `.next` (handled by Next plugin)
4. Add environment variable in Netlify site settings:
   - `GROQ_API_KEY` = your Groq API key
5. Deploy.

## API route

- Endpoint: `/api/generate`
- Model: `llama3-70b-8192`
- Provider endpoint: `https://api.groq.com/openai/v1/chat/completions`
