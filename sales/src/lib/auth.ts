/**
 * Portal sign-in (HTTP Basic auth), checked from the Authorization header itself.
 *
 * Review of 1 Nov 2026: the role used to travel only in an x-portal-role header set by the middleware. Server actions
 * are reachable from every page that imports app/actions.ts (the public ones included) and the middleware skipped
 * paths ending in .json/.js/.css…, so that header could be sent by a browser. Now every portal page and action reads
 * the password again here; the header is never trusted. Works in the middleware (Edge) and on the server (Node).
 */
export type PortalRole = "admin" | "agent";

/** Same time whatever the input, so the password can't be guessed one character at a time. */
export function safeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

export function decodeBasic(authorization: string | null | undefined): { user: string; password: string } | null {
  if (!authorization?.startsWith("Basic ")) return null;
  let decoded: string;
  try {
    decoded = new TextDecoder().decode(Uint8Array.from(atob(authorization.slice(6).trim()), (c) => c.charCodeAt(0)));
  } catch {
    return null; // malformed header: treated as signed out, not as a server error
  }
  const i = decoded.indexOf(":");
  if (i < 0) return null;
  return { user: decoded.slice(0, i), password: decoded.slice(i + 1) };
}

export function roleFromAuthorization(authorization: string | null | undefined): PortalRole | null {
  const creds = decodeBasic(authorization);
  if (!creds) return null;
  const admin = process.env.PORTAL_PASSWORD;
  const agent = process.env.PORTAL_AGENT_PASSWORD;
  if (admin && safeEqual(creds.password, admin)) return "admin";
  if (agent && safeEqual(creds.password, agent)) return "agent";
  return null;
}

/** The user name typed at sign-in (any text): only to say who did something, never for access. */
export function userFromAuthorization(authorization: string | null | undefined): string {
  return (decodeBasic(authorization)?.user ?? "").replace(/[^\p{L}\p{N} .@'_-]/gu, "").trim().slice(0, 60);
}
