# TikTok Hook Generator

Simple full-stack Next.js MVP that generates viral TikTok hooks using Groq.

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start)

## Local development

1. Install dependencies:
   - `npm install`
2. Create `.env.local`:
   - `GROQ_API_KEY=your_groq_api_key_here`
   - `STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here`
   - `STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret_here`
   - `NEXT_PUBLIC_APP_URL=http://localhost:3000`
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
   - `STRIPE_SECRET_KEY` = your Stripe secret key
   - `STRIPE_WEBHOOK_SECRET` = your Stripe webhook signing secret
   - `NEXT_PUBLIC_APP_URL` = your site URL (example: `https://your-site.netlify.app`)
5. Deploy.

## API route

- Endpoint: `/api/generate`
- Model: `llama-3.3-70b-versatile` (with fallback models)
- Provider endpoint: `https://api.groq.com/openai/v1/chat/completions`
- Stripe checkout endpoint: `/api/create-checkout-session`
- Stripe checkout verification endpoint: `/api/verify-checkout-session`
- Stripe webhook endpoint: `/api/stripe-webhook`
