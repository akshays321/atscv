# ATS CV Maker (AI + Razorpay ₹99)

A static front-end (`public/index.html`) plus two tiny serverless functions:

| Endpoint | Purpose |
|---|---|
| `POST /api/ai` | Calls Claude to build / improve / tailor the CV. Your API key stays on the server. |
| `POST /api/verify` | Checks a Razorpay payment ID is real, captured and ≥ ₹99 before unlocking the PDF. |

## Deploy on Vercel (easiest)
1. Push this folder to a GitHub repo, import it at vercel.com (no build settings needed).
2. Project → Settings → Environment Variables, add:
   - `ANTHROPIC_API_KEY` – from console.anthropic.com (required for the AI features)
   - `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` – Razorpay Dashboard → Settings → API Keys (recommended, enables real payment verification)
   - optional: `CLAUDE_MODEL` (default `claude-sonnet-5-5`), `MIN_AMOUNT_PAISE` (default `9900`), `ALLOWED_ORIGIN` (your site URL)
3. Redeploy.

## Deploy on Netlify
Same folder, connect the repo; `netlify.toml` is already set up. Add the same environment variables.

## Razorpay setup
In your Razorpay payment button / payment page settings, set the redirect / callback URL to your deployed site.
Razorpay then returns the customer with `?razorpay_payment_id=pay_xxx`, and the page verifies and unlocks automatically.
Without it, customers paste the payment ID from their receipt into the unlock box.

## How downloads work
The watermark-free PDF is produced with the browser's Print → "Save as PDF" (real selectable text, which ATS parsers need).
Turn off "Headers and footers" in the print dialog.

## Honest limits
- The unlock state is stored in the visitor's browser. Verification makes sure the payment ID is genuine, but one payment ID can still be shared with others. Preventing that needs a database that marks each ID as used (or login accounts).
- AI output can contain mistakes. The prompts forbid inventing facts and use `[X%]` placeholders, and the ATS checklist flags any left unfilled, but users must review before applying.
- Each AI click costs you a small amount of Claude API usage; consider rate-limiting if you get traffic.

## Local testing
`npx vercel dev` (with a `.env` file based on `.env.example`) serves the page and the functions together.
