/**
 * One portal, one sign-in (Edo, 1 Nov 2026): every portal link on the company site and on the sales site goes to the
 * same page, the Invenio portal sign-in. Rentals and sales are sections of that portal; the roles decide who sees
 * Sales. Change the address here (or PORTAL_LOGIN_URL on Vercel) when the production sign-in moves.
 */
export const PORTAL_LOGIN_URL = process.env.PORTAL_LOGIN_URL || "https://portal-dev.invenio.tools/login";
