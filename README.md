# Suds Wilmington — sudslaundryrentals.com

Hand-built static site (replacing the Squarespace one), served by a Cloudflare
Worker.

- `public/` — the site: `index.html`, `privacy-policy.html`, `images/`,
  `_redirects` (old Squarespace URLs).
- `src/index.js` — the Worker: serves `public/` and handles the contact form
  at `POST /api/contact`, emailing it via Resend to Robert
  (landman@servicelaundryrentals.com) and Kyle, from website@oddnc.com
  (the verified sending domain in ODD's Resend account). Needs the Resend API key as the Worker
  secret `Suds-Website-Email` (Settings → Variables and Secrets — not the
  Build variables; `RESEND_API_KEY` also works); without it the form says it couldn't send and suggests calling.
- `wrangler.jsonc` — Worker `suds-laundry-rentals`; `previews: {}` is needed
  for Workers Builds' preview deploys of non-main branches.

Push to `main` deploys. Local preview with the Worker:
`npx wrangler dev` (http://localhost:8787).
