# Invenio Homes website: company site + sales + client offer pages

> **This is the definitive repository** for the Invenio Homes public website and the sales site (Edo, 8 Nov 2026,
> 03:55 CET / 02:55 UTC). Work happens here, on `main`. The older repositories are superseded and should not get new
> work: `edoardo-hash-invenio-sales` (all of its `main` and `dev` is in `sales/`, up to `1c7a961` of 3 Nov 2026),
> `Deepseek` and `inveniohomes-web`. The `compare` branch of the old sales repo ("The vein" portal design,
> invenio-sales-compare) was a design alternative and is not included.

One repository for the public Invenio Homes websites and the client offer pages. All use the
same design system (Cormorant Garamond + Jost, bone / ink / clay, same header, footer, buttons and forms).

| Folder | Site | Vercel project | Notes |
| --- | --- | --- | --- |
| `/` (`public/`, `api/`) | Company site: rentals, agents, owners, destinations | full-website-and-identity | Root directory unchanged, so the existing project keeps deploying it |
| `sales/` | Sales site: villas for sale, sell your villa, buyer brief, sales portal | invenio-website-sales (**Root Directory = `sales`**) | Replaces `edoardo-hash/edoardo-hash-invenio-sales` and its project invenio-sales (invenio-website-sales.vercel.app) |
| `offers/portal-o2/` | Client offer pages v2, live data | — (runs inside `invenio-portal`, `src/app/o2/`) | Copy for review, from `invenio-portal` `dev` `bcfc0d0` |
| `offers/demo/` | The two static offer prototypes | invenio-homes-offer, lila-villas-offer | Was `inveniohomes-web` `v2` `af6a227` |

Not included: the rest of the agent portal (`invenio-portal`, portal-dev.invenio.tools), which the live offer pages
run inside, and the agent sign-in page (portal-dev.invenio.tools/login).

No passwords, API keys or database addresses are in this archive. They live in Vercel's environment variables
(listed below for each site).

---

## 1. How the two sites fit together

```
                 invenio-homes-site (rentals)                       invenio-sales (sales)
                 static HTML, no build                              Next.js 15 app
                 ┌──────────────────────────┐   "Sales" links      ┌──────────────────────────────┐
  visitors  ───► │ / owners / platform /    │ ───────────────────► │ / properties / properties/V-…│
                 │ about / team / dest. /   │ ◄─────────────────── │ / sell / thanks              │
                 │ contact                  │   "Rentals" links    │ EN + /es /it /nl             │
                 └────────────┬─────────────┘                      ├──────────────────────────────┤
                              │ contact form                       │ /portal  (Basic auth, staff) │
                              ▼                                    └──────────────┬───────────────┘
                 Vercel Blob (private JSON)                                       │ reads / writes
                 + optional email (Resend)                                        ▼
                                                                   Neon Postgres (portal database)
"Agent portal" / "Sign in" links ──► portal-dev.invenio.tools/login
```

- **Rentals → Sales**: every link marked `data-sales` in `public/**/index.html` (nav "Sales", footer
  "Villas for sale", home section "Villas for sale, known from the inside").
- **Sales → Rentals**: the env var `COMPANY_SITE_URL` (default `https://full-website-and-identity.vercel.app` until the domain is final, then `https://inveniohomes.com`) drives "Rentals",
  "Villa rentals" and "For owners".
- **Shared design**: `sales/src/app/globals.css` is the rentals stylesheet (`public/assets/css/site.css`)
  copied unchanged, plus an "App additions" section at the end. Fonts and logos are the same files. When the rentals
  stylesheet changes, copy it into the sales one above the "App additions" line.

---

## 2. Company site (repository root)

### What it is

Plain HTML pages, one folder per page, served as they are. No framework and no build step.

| Page | File |
| --- | --- |
| Home | `public/index.html` |
| Owners | `public/owners/index.html` |
| The Platform | `public/the-platform/index.html` |
| About | `public/about/index.html` |
| The Team | `public/the-team/index.html` |
| Destinations (Ibiza, Formentera, Mykonos, Bali) | `public/destinations/index.html` |
| Contact | `public/contact/index.html` |
| Privacy, Terms | `public/privacy/`, `public/terms/` |
| 404 | `public/404.html` |

- Styles: `public/assets/css/site.css` (one file, sections commented).
- Script: `public/assets/js/site.js` (header on scroll, full-screen menu, reveal on scroll, gallery lightbox,
  contact form submit).
- Images and fonts: `public/assets/img/`, `public/assets/fonts/` (self-hosted, no Google Fonts call).
- Header, menu and footer are repeated in every page: a change there is a change in all 9 HTML files.
  A search-and-replace across `public/**/index.html` is the normal way to do it.

### Serverless functions

| File | Route | What it does |
| --- | --- | --- |
| `api/contact.js` | `POST /api/contact/` | Saves each contact-form message as a private JSON file in Vercel Blob; emails it too when Resend is set. Honeypot field against bots; if the API fails, the page falls back to opening the visitor's email app. |
| `api/messages.js` | `GET /api/messages/` | The saved messages, newest first, behind HTTP Basic auth (any user name, password = `ADMIN_PASSWORD`). |

### Environment variables (Vercel → Settings → Environment Variables)

| Variable | Needed | What it does |
| --- | --- | --- |
| `BLOB_READ_WRITE_TOKEN` | Yes | Added by Vercel when a Blob store is connected. Without it messages cannot be saved. |
| `ADMIN_PASSWORD` | Yes | Password of `/api/messages/`. Without it that page is closed. |
| `RESEND_API_KEY`, `MAIL_FROM` | Optional | Also email each message. `MAIL_FROM` must be a verified Resend sender. |
| `CONTACT_TO` | Optional | Where the email goes (default find@inveniohomes.com). |

### Run and deploy

```bash
python3 -m http.server 4321 --directory public     # http://localhost:4321 (the form falls back to email locally)
```

Deploy on Vercel: framework **Other**, build command empty, output directory `public`, Node 22. `vercel.json` sets
trailing slashes, security headers and a one-year cache on `/assets/`. `npm install` is only needed for the API
(`@vercel/blob`).

### Addresses to change when the domains are final

| Today | Where | Becomes |
| --- | --- | --- |
| `https://invenio-website-sales.vercel.app` | every `data-sales` link | the sales domain (e.g. `https://sales.inveniohomes.com`) |
| `https://full-website-and-identity.vercel.app` | sales site: "Rentals", "Villa rentals", "For owners" (`COMPANY_SITE` in `sales/src/components/site.tsx`, or env `COMPANY_SITE_URL`) | `https://inveniohomes.com` |
| `https://portal-dev.invenio.tools/login` | every "Go to the Portal" / "Sign in" / "Agents — join us" link (63) | the portal's sign-in address |

```bash
grep -rl "invenio-website-sales.vercel.app" public | xargs sed -i 's#https://invenio-website-sales.vercel.app#https://sales.inveniohomes.com#g'
```

---

## 3. Sales site (`sales/`)

### What it is

A Next.js 15 (App Router) application, TypeScript, React 19, no CSS framework. It reads the listings from the same
Neon Postgres database as the agent portal and writes the buyer requests that come from the website.

### Pages

| URL | File | Content |
| --- | --- | --- |
| `/` | `src/app/[lang]/(site)/page.tsx` | Hero with three facts, "A sales agency that already knows the house", featured listing, off-market brief form, four buying steps, owners, David, call to action |
| `/properties` | `…/properties/page.tsx` | Page head, filter bar (from 6 listings), one listing per row, brief form |
| `/properties/V-xxxxxx` | `…/properties/[ref]/page.tsx` | One villa: gallery + lightbox, facts, sale text, features in groups, documents checked / shared after registration, good to know, distances by road, ~1 km area map, sticky enquiry panel, mobile price bar, similar homes |
| `/sell` | `…/sell/page.tsx` | For owners: four steps, exposure options, the documents file, FAQ, valuation form |
| `/thanks` | `…/thanks/page.tsx` | After a form: brief, enquiry, valuation or "form not connected" |
| `/es/…`, `/it/…`, `/nl/…` | same files | Spanish, Italian, Dutch |
| `/portal…` | `src/app/portal/` | Staff portal (own stylesheet `portal.css` and font, left in its earlier design on purpose): listings by status, approval with missing items, buyer requests board, request page with matching listings, owner confirmations and viewings, Casafari market check (admins), translation export |

### Business rules built in

- **Reference codes, never names.** A listing is always `V-` + the first 6 characters of the villa uuid. The public
  site never receives the villa's real or Invenio name, and `src/lib/villa-names.ts` removes both from the sale text
  too (replaced by "this villa"; place names such as "Cala Vadella" are kept).
- **Never the exact location.** Area and district only; the map is a ~1 km ring around the stored approximate point
  (`approxGps`, 1–2 km from the house), never a pin. Distances are by road, in km (`src/data/road-km.json`).
- **What is public:** listings approved or under offer, not off-market, Invenio Homes brand only (`publicListings` in
  `src/lib/data.ts`).
- **Features are yes / no only.** A feature is shown only if it is ticked; never a list of "no".
- **Few listings:** below 6 public listings the filters are hidden and the brief leads (`src/lib/catalogue.ts`).
- **Matching** (`src/lib/rules.ts`) is copied from the portal (`invenio-portal/src/lib/sales/rules.ts`): keep the two in step.

### Languages

- Every client-facing string is in `src/lib/i18n/en.ts` (English). `*word*` marks the italic accent in a title.
- Spanish, Italian, Dutch are in `src/lib/i18n/static/{es,it,nl}.json`, produced by DeepSeek through the Vercel AI
  Gateway (zero data retention) and committed. A stored value is used only while its English source is unchanged;
  a new or changed string is translated at runtime until the next export.
- Hand corrections go in `src/lib/i18n/overrides.ts` (they always win).
- To refresh the stored files: sign in to `/portal` as admin, open `/portal/i18n-export?lang=es` (then `it`, `nl`),
  save each answer over the matching JSON file, commit.
- The sale text of each villa is translated at runtime and cached.

### Forms (all server actions in `src/app/actions.ts`)

| Form | Writes |
| --- | --- |
| Buyer brief | `sale_contact` + `sale_request` (budget, areas, bedrooms, must-haves, timing) |
| Villa enquiry ("Request details" / "Arrange a viewing") | `sale_contact` + `sale_request` + `sale_activity` on that villa |
| Valuation (Sell) | `sale_contact` (kind owner) with the area, bedrooms and "rented with Invenio" in its notes |

Without a database every form lands on "This form isn't connected yet" and nothing is lost silently.

### Database

The sales site has **no migrations of its own**: the tables belong to the agent portal (migrations 068–072).

- Reads: `villa_snapshot`, `villa_sale`, `villa_sale_status`, `villa_sale_feature`, `sale_document`.
- Writes: `sale_contact`, `sale_request`, `sale_request_villa`, `sale_activity`, and from the portal `villa_sale` /
  `villa_sale_history` (create draft, approve).

Without `DATABASE_URL` every page still renders and says listings can't be shown.

### Environment variables

| Variable | Needed | What it does |
| --- | --- | --- |
| `DATABASE_URL` | Yes | The database with the villa snapshot and the sales tables. Either Neon (`…neon.tech…`, queried over HTTP) or any Postgres such as the netcup server (`postgresql://user:pass@host:5432/invenio?sslmode=require`, connection pool). See `src/lib/db.ts`. |
| `DATABASE_SSL`, `DATABASE_POOL_MAX` | Optional | `DATABASE_SSL=0` for a Postgres without SSL; pool size per instance (default 3). |
| `SITE_URL` | Optional | The sales site's own address for canonical and hreflang links (e.g. https://sales.inveniohomes.com). |
| `SITE_INDEX` | At launch | `1` lets search engines index the site. Leave unset on previews and dev. |
| `PORTAL_PASSWORD` | Yes for `/portal` | Admin password of the staff portal (HTTP Basic auth, any user name). Without it `/portal` is closed. |
| `PORTAL_AGENT_PASSWORD` | Optional | Password for external sales agents: references only, no villa names. |
| `SITE_PASSWORD` | Optional | Locks the whole public site (used on a private dev branch). Leave unset for a public site. |
| `COMPANY_SITE_URL` | Optional | Where "Rentals" links go (default https://full-website-and-identity.vercel.app until the domain is final). |
| `AI_TEXT_MODEL`, `AI_TEXT_BASE_URL`, `AI_GATEWAY_API_KEY` | Optional | Translation model (default `deepseek/deepseek-v4-flash` via Vercel AI Gateway; on Vercel the deployment's OIDC token is used, no key needed). |
| `CASAFARI_API_KEY` | Optional | Casafari comparables in the portal's market check (admins only). |

### Run and deploy

```bash
cd sales
npm install
DATABASE_URL="postgresql://…" PORTAL_PASSWORD="…" npm run dev     # http://localhost:3000
npm run build && npm start                                          # production build
```

Deploy on Vercel with framework **Next.js** and the variables above. `src/middleware.ts` handles the language
prefixes and the portal password; it skips images, fonts, CSS and JS.

---

## 4. Client offer pages (`offers/`)

An agent selects villas and dates in the portal and sends the client a private link. The client sees only the
selection: no menu, no prices of other villas, no Invenio contact (the agent is the contact), never the exact address.

### Two brands, never mixed

| Villas | Offer goes out as | Look | Footer |
| --- | --- | --- | --- |
| Licensed | **Invenio Homes** | Light: bone background, clay accent | Availability note |
| Non Touristic | **Lila Villas** | Dark: navy with gold | Plus the agreed Non Touristic disclaimer, once |

A selection with both kinds becomes two sibling offers with two links (the agent sends both). The licence **number**
is shown on every licensed villa; the words "Licensed" / "Non Touristic" never appear on a client page.
Default is **white label**: no company name ("Villa selection").

### `offers/portal-o2/`: the live pages (part of the portal)

These files live in the portal at `src/app/o2/` and **do not run on their own**: they read the offer, villas, photos,
prices and calendars through the portal's libraries and database. They are here so the design and the code can be
read and reviewed with the rest of the site.

| URL | File | Content |
| --- | --- | --- |
| `/o2/<code>` | `[code]/page.tsx` | The selection: hero photo, "3 villas / 3–10 July 2027" (or the villa name for one villa), facts bar (dates, guests, from €, availability), numbered cards in the agent's order with licence number and price, "Available if the owner agrees" block, closing band |
| `/o2/<code>/<uuid>` | `[code]/[uuid]/page.tsx` | One villa: gallery (5 photos, lightbox with all 40 by room), facts, description folded after ~110 words, features in groups, location (~1 km circle map, road distances, restaurants and sights nearby), sticky panel with dates and price, previous / next villa |
| `/o2/<code>/t` | `[code]/t/route.ts` | Time-on-page beacon (same as the v1 pages) |
| — | `[code]/shared.tsx` | Header, footer, expired page, date formats, feature groups, small photo groups merged |
| — | `[code]/gallery-v2.tsx` | Gallery + lightbox (same as the sales villa page) |
| — | `[code]/v2.css`, `layout.tsx` | All styles, scoped under `.v2` with the two brand themes; fonts loaded only under `/o2` |

Same rules as the original `/o/<code>` pages, because they use the same data:

- Same code, same opens counter, same expiry (Lila Villas links expire 7 days after the client's first open);
  dates are hidden after 5 opens; add `?preview=1` to look without counting an open.
- A villa booked after the offer was made stays in it with a red "Rented" mark.
- Villa names are the public ones; the owner's real name is scrubbed from texts.

Where it plugs into the rest of the portal (not in this archive):

| Portal file | Change |
| --- | --- |
| `src/components/search-results.tsx` | "Get Link v2" button above "Get link" in the offer tray |
| `src/app/(portal)/offers/actions.ts` | Same `createOffer`; with `v2=1` the offer page shows the v2 links first |
| `src/app/(portal)/offers/[id]/page.tsx` | Both links on every offer, Copy / Preview, "Copy both links v2" for mixed groups |
| `src/lib/brand.ts` | `offerHrefV2(code)` → `/o2/<code>` |
| `src/proxy.ts` | `/o2` is public (no sign-in) |

Uses from the portal: `@/lib/offers` (open the offer, count opens, expiry), `@/lib/villas` (client-safe villa data),
`@/lib/photo-labels` and `photo-order` (photos grouped by room, max 40), `@/lib/offer-availability` (Rented),
`@/lib/area-near`, `@/lib/villa-map` and `@/components/area-map` (road distances, ~1 km circle),
`@/lib/brand` (brands, licence number, disclaimer), `@/components/offer-tracker`, and the "ask the owner" action of
`/o/<code>`. The brand offer domains (offer.world-class.properties, offer.bestofclassvillas.com) don't serve v2 yet.

### `offers/demo/`: the static prototypes

Hand-built HTML of two real selections (4–11 July 2027), no build step, the same way the rentals site is built:

- `demo/invenio-homes/` — four licensed villas (Can Savasana, Can Octavia, Can Cecilia, Can Vista Cala Jondal),
  selection page + one page per villa.
- `demo/lila-villas/` — Villa Capella (Non Touristic), selection page + villa page, dark theme, disclaimer.

Each folder has its own README with the design decisions. Preview with
`python3 -m http.server 4322 --directory offers/demo/invenio-homes` (or `lila-villas`); deploy on Vercel as framework
"Other", output directory `.`. They are fixed snapshots: prices and availability are those of 31 Oct 2026.

---

## 5. Changing things: where to look

| I want to change… | Rentals | Sales |
| --- | --- | --- |
| A text | the page's `index.html` | `src/lib/i18n/en.ts`, then the translation export (or an override) |
| Colours, type, spacing | `public/assets/css/site.css` | `src/app/globals.css` (keep in step with rentals) |
| Header / footer | every `public/**/index.html` | `src/components/site.tsx` |
| A photo | `public/assets/img/` | `public/assets/img/` (site photos); villa photos come from the database |
| Contact address / phone | every `index.html` | `DAVID` in `src/components/site.tsx` |
| A listing | — | the agent portal (villa → Sale tab), never here |
| Offer pages | — | text and layout in `offers/portal-o2/` (in the portal repo), styles in `v2.css`; the villas, prices and photos come from the portal |

## 6. Open items (1 Nov 2026)

- The figures on the rentals home (3,500 registered users, 900 approved properties, 450 searches a day) and 553
  registered agents on Owners are not confirmed; see the copy review sent to Nick, Natalia and Dragan.
- Final domains for both sites and for the portal sign-in (section 2, "Addresses to change").
- Option discussed, not built: serve the sales site under `/sales` on the company domain (Vercel rewrite + Next.js
  `basePath: "/sales"`).
- Option discussed, not built: an admin panel in the portal to edit the texts of both sites without a deploy.

---

## 7. Review fixes (1 Nov 2026, branch `dev-full-site`)

Committed 1 Nov 2026, 18:58 CET (17:58 UTC).

**Sales site, security**
- Every portal page and server action checks the password itself (`sales/src/lib/auth.ts`). Before, five portal
  actions (status, notes, "send villa", owner and viewing steps) ran without any password when posted to a public
  page, and the role came from a header a browser could send.
- The middleware always covers `/portal`: `/portal/…/x.json` used to skip the password.
- Passwords are compared in constant time; a malformed sign-in header is "signed out", not a server error.
- Portal notes are signed with the user name typed at sign-in instead of "sales-site".

**Sales site, forms**
- The villa enquiry form sends only the reference; the server finds the villa. The full villa uuid is no longer in
  the public page (it tied V-codes to villa names, see the open item below).
- Budgets are read as people type them in every language: "2,5" = €2.5M (was €25M), "1.200.000" = €1.2M (was lost),
  "800k", "2,5 mln", "950" = €950k. Code and rules in `sales/src/lib/money.ts`.
- A hidden anti-spam field on the three forms; bots are thanked and nothing is written.
- Portal actions refuse anything that isn't a valid villa uuid.

**Sales site, search engines**
- Canonical and hreflang (en / es / it / nl / x-default) on every public page.
- `noindex` stays until `SITE_INDEX=1` is set on the production project.

**Database**
- `DATABASE_URL` can be Neon or a normal Postgres (netcup): `sales/src/lib/db.ts` picks the driver from the address.
  Tested against a local Postgres 16.

**Company site**
- Canonical, Open Graph, structured data, sitemap and robots point to https://inveniohomes.com (they pointed to
  preview addresses).
- Every `*.vercel.app` address answers with `X-Robots-Tag: noindex`, so previews never compete with the real site.
- The owners page "Sales enquiries welcome" button went to an old address (invenio-sales-v2); now `/sell` on the
  sales site, marked `data-sales` like the other sales links.
- Phones: form fields at 44 px (from the 1 Nov critique).

**Still open (decisions)**
- Reference codes are the first 6 characters of the villa uuid, and the uuid is in rental offer links
  (`/o2/<code>/<uuid>`) and in the portal: anyone holding one can match a V-code to a villa. A separate code (random,
  stored on `villa_sale`) would close it, but references already sent to buyers would change.
- Netcup database and Invenio API (checked on the server, 1 Nov 2026):
  - netcup Postgres 17, database `invenio`, schemas `impulse`, `invenio`, `ops`, `ai`, `agents`, `people`. It is the
    source of the villa data (`invenio.villa`, `villa_media`, `villa_amenity`, `price_period`, `booking`…), copied to
    the portal's Neon database by logical replication (publication `portal_pub`, 33 tables).
  - The sales tables (`villa_sale`, `villa_sale_status`, `villa_sale_feature`, `sale_*`) and `villa_snapshot` exist
    **only on Neon** (portal migrations 068–072). Pointing `DATABASE_URL` at netcup today would show no listings and the
    forms would fail. Options: (a) keep Neon until the switch, when Invenio moves to its own database (the agreed
    IMpulse migration model); (b) create the sales tables on netcup now and have the portal write there too.
  - "Invenio API" = the IMpulse mirror on https://data.invenio.tools (`/plapi/getdata/<endpoint>`, IMpulse `api-key` +
    `bp_uuid` headers): villa list, calendars, booking finance, payments, users. Raw IMpulse data; it has nothing about
    sales, so the sales site does not need it directly — villa data reaches it through Neon.
- The company site is English only; the IT / ES / PT-BR / NL pages of today's inveniohomes.com need a decision and
  redirects from the old WordPress addresses before the switch.
