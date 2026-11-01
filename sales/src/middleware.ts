import { NextResponse, type NextRequest } from "next/server";
import { decodeBasic, roleFromAuthorization, safeEqual, userFromAuthorization } from "@/lib/auth";
import { PORTAL_LOGIN_URL } from "@/lib/portal-link";

const LOCALES = ["es", "it", "nl"];

/**
 * 1. The portal shows buyers' names and contact details, so it is locked: HTTP Basic auth against PORTAL_PASSWORD
 *    (any user name). With no PORTAL_PASSWORD set it is closed to everyone. Server actions post to the page URL,
 *    so they are covered too.
 * 2. The public site: English at the plain URLs (rewritten to /en/...), Spanish, Italian and Dutch under /es, /it, /nl.
 *    x-lang and x-path tell the pages which language and which path (for the language switcher).
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // One portal (Edo, 1 Nov 2026): /portal goes to the Invenio portal sign-in, like every portal link on the company
  // site. The old staff pages here stay reachable only with PORTAL_LEGACY=1 (and their password) until removed.
  if (pathname === "/portal" || pathname.startsWith("/portal/")) {
    if (process.env.PORTAL_LEGACY !== "1") return NextResponse.redirect(PORTAL_LOGIN_URL, 307);
    return portal(req);
  }
  // Whole-site lock (Edo, 30 Oct 2026: only he has access to dev): with SITE_PASSWORD set on a branch, every public
  // page asks for it too. The dev branch sets PORTAL_PASSWORD to the same value, so one sign-in covers both.
  const sitePass = process.env.SITE_PASSWORD;
  if (sitePass && !safeEqual(basicPassword(req) ?? "", sitePass)) return askPassword("Invenio sales (development)");

  const seg = pathname.split("/")[1] ?? "";
  if (seg === "en") {
    const url = req.nextUrl.clone();
    url.pathname = pathname.slice(3) || "/";
    return NextResponse.redirect(url, 308);
  }
  const headers = new Headers(req.headers);
  headers.delete("x-portal-role"); // the public site never has a portal role
  headers.delete("x-portal-user");
  if (LOCALES.includes(seg)) {
    headers.set("x-lang", seg);
    headers.set("x-path", pathname.slice(seg.length + 1) || "/");
    return NextResponse.next({ request: { headers } });
  }
  headers.set("x-lang", "en");
  headers.set("x-path", pathname);
  const url = req.nextUrl.clone();
  url.pathname = `/en${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url, { request: { headers } });
}

/**
 * Who is looking (Edo, 30 Oct 2026): PORTAL_PASSWORD = admin (sees the villa's Invenio name and real name),
 * PORTAL_AGENT_PASSWORD (optional, for external sales agents later) = agent (reference codes only).
 * The role travels to the pages in x-portal-role, always set here so a browser can't send its own.
 */
function portal(req: NextRequest) {
  if (!process.env.PORTAL_PASSWORD) return new NextResponse("The sales portal is locked: set PORTAL_PASSWORD on this Vercel project.", { status: 503 });
  const auth = req.headers.get("authorization");
  const role = roleFromAuthorization(auth);
  if (!role) return askPassword("Invenio sales portal");
  const headers = new Headers(req.headers);
  // Kept for the pages' convenience only: pages and actions check the password again (src/lib/auth.ts).
  headers.set("x-portal-role", role);
  headers.set("x-portal-user", encodeURIComponent(userFromAuthorization(auth)));
  return NextResponse.next({ request: { headers } });
}

function basicPassword(req: NextRequest): string | null {
  return decodeBasic(req.headers.get("authorization"))?.password ?? null;
}

function askPassword(realm: string) {
  return new NextResponse(`Sign in to ${realm}.`, {
    status: 401,
    headers: { "WWW-Authenticate": `Basic realm="${realm}", charset="UTF-8"` },
  });
}

// The portal is always matched, whatever the path ends with (review 1 Nov 2026: /portal/…/x.json skipped the password).
export const config = {
  matcher: ["/portal", "/portal/:path*", "/((?!_next/|portal|favicon|.*\\.(?:svg|jpg|jpeg|png|webp|ico|txt|xml|woff2|woff|css|js|json|webmanifest)$).*)"],
};
