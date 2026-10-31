# Invenio Homes — company website (full-website-and-identity)

The Invenio Homes site for agents, concierges and owners (Ibiza, Formentera, Mykonos, Bali), in the v2 editorial design
(Cormorant Garamond + Jost). Started on 31 Oct 2026 from the static build published at invenio-homes-v2.vercel.app; moved to this repository on 1 Nov 2026 with the Sales link and the critique of the same day ("Design Critique: company site and offer flow").

## How it is built

- `public/` — the website: one folder per page (`index.html`), styles in `public/assets/css/site.css`, one script in
  `public/assets/js/site.js`, images and fonts in `public/assets/`. No build step: Vercel serves the folder as it is.
  The original generator (`build.py` + `content/*.json`) was not in a repository and could not be recovered, so pages
  are edited directly in their HTML.
- `api/contact.js` — the contact form posts here. Each message is saved as a private JSON file in the project's Vercel
  Blob store, and also emailed to `CONTACT_TO` when Resend is configured. If the server can't take it, the page falls
  back to opening the visitor's email app (the old behaviour).
- `api/messages.js` — the saved messages, newest first, behind a password.

## Settings (Vercel → Settings → Environment Variables)

| Variable | What it does |
| --- | --- |
| `BLOB_READ_WRITE_TOKEN` | Set by Vercel when the Blob store is connected to the project. Needed to save messages. |
| `ADMIN_PASSWORD` | Password for `/api/messages` (any user name). Without it the page is closed. |
| `RESEND_API_KEY`, `MAIL_FROM` | Optional: also email every message. `MAIL_FROM` must be a verified Resend sender. |
| `CONTACT_TO` | Optional: where the email goes (default find@inveniohomes.com). |

## Addresses to change in one place

- The sales site: every `data-sales` link (header, phone menu, footer, home section) points to invenio-sales.vercel.app.
- The agent portal: Sign in / Create account / Go to the Portal point to invenio-portal-signin.vercel.app/login until
  production sign-in is on. Both are plain text in the pages: `grep -rl data-sales public` and `grep -rl portal-signin public`.

## Changes from the published v2 (31 Oct – 1 Nov 2026)

- Sales link in the header, the phone menu and the footer, and a "Villas for sale" section on the home page.
- Portal links to the sign-in page instead of portal-dev; legal details (register GOIBE766172/2024) on privacy and terms.

- Contact form saves every message (before: it only opened the visitor's email app).
- Small text passes WCAG AA 4.5:1 on every background: darker clay and muted tones, lighter footer labels, nothing under 11px.
- Phones: every link has a 44px tap area; stronger shade behind the hero text.

## Local preview

```bash
python3 -m http.server 4321 --directory public   # pages only; the form falls back to email without the API
```
