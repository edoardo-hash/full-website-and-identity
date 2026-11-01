# Client offer pages — Villa Capella (Lila Villas)

The private selection a client opens from their advisor's link: `/` (the selection) and `/villa-capella/` (the villa).
Static pages, no build step. Started on 31 Oct 2026 from the build published at invenio-offer.vercel.app, with the
design critique of the same day applied ("Design Critique: Invenio offer pages").

## Rules applied (from the portal, `invenio-portal` CLAUDE.md and `src/lib/brand.ts`)

- **Brand from the licence.** Villa Capella is Non Touristic, so the page is Lila Villas (dark navy, gold accent,
  wordmark), never Invenio Homes. A licensed villa goes out as Invenio Homes. A mixed selection = two sibling offers.
- **The advisor is the contact.** No Invenio or Lila Villas email, phone or WhatsApp on client pages: "Reply on
  WhatsApp" opens the client's own WhatsApp with the villa, dates and price written, so they send it to their advisor;
  "Reply by email" opens an email with no recipient. No link to the portal.
- **Non Touristic disclaimer** once, word for word, at the bottom of each page.
- **Map:** the area as a ~1 km circle, never a pin; no exact address or GPS.
- **Counts:** real bedrooms, bathrooms and guests.

## Other fixes

- "Cala Villa Capella" (name-scrub bug) → Cala Vadella; one spelling for the bay.
- One villa: the page says "Villa Capella for your week", no "1 of 1" counters.
- Price note: what the €20,328 covers and that the €3,000 deposit is refunded after check-out.
- Features in five groups (Outdoors, Indoors, Views, Good for, Good to know); internal tags dropped
  (Neighbours, Filming, Private).
- Photo categories under 3 photos merged into the nearest one.
- Small text at 4.5:1 or better, nothing under 11px, 44px tap areas on phones.
