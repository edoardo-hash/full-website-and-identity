import { timingSafeEqual } from "node:crypto";
import { get, list } from "@vercel/blob";

/**
 * The saved contact-form messages, newest first. HTTP Basic auth: any user name, password = ADMIN_PASSWORD.
 * Without ADMIN_PASSWORD the page is closed to everyone.
 */
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function allowed(req) {
  const pass = process.env.ADMIN_PASSWORD;
  if (!pass) return false;
  const auth = String(req.headers.authorization || "");
  if (!auth.startsWith("Basic ")) return false;
  const decoded = Buffer.from(auth.slice(6), "base64").toString("utf8");
  const given = Buffer.from(decoded.slice(decoded.indexOf(":") + 1));
  const want = Buffer.from(pass);
  return given.length === want.length && timingSafeEqual(given, want);
}

export default async function handler(req, res) {
  if (!allowed(req)) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Invenio Homes messages", charset="UTF-8"');
    return res.status(401).send("Sign in to read the website messages.");
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(503).send("No message store is connected to this project yet.");

  const blobs = [];
  let cursor;
  do {
    const page = await list({ prefix: "messages/", cursor, limit: 1000 });
    blobs.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor && blobs.length < 5000);
  blobs.sort((a, b) => (a.pathname < b.pathname ? 1 : -1));

  const shown = blobs.slice(0, 200);
  const messages = await Promise.all(
    shown.map(async (b) => {
      try {
        const r = await get(b.pathname, { access: "private", useCache: false });
        return r ? JSON.parse(await new Response(r.stream).text()) : null;
      } catch {
        return null;
      }
    }),
  );

  const when = (iso) => new Date(iso).toLocaleString("en-GB", { timeZone: "Europe/Madrid", dateStyle: "medium", timeStyle: "short" });
  const rows = messages
    .filter(Boolean)
    .map((m) => `<article>
      <header><b>${esc(m.name)}</b> · <a href="mailto:${esc(m.email)}">${esc(m.email)}</a>${m.phone ? ` · ${esc(m.phone)}` : ""}${m.company ? ` · ${esc(m.company)}` : ""}${m.type ? ` · <span class="t">${esc(m.type)}</span>` : ""}</header>
      <p>${esc(m.message).replace(/\n/g, "<br>")}</p>
      <footer>${esc(when(m.receivedAt))} CET${m.country ? ` · ${esc(m.country)}` : ""}</footer>
    </article>`)
    .join("\n");

  res.setHeader("content-type", "text/html; charset=utf-8");
  return res.status(200).send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>Website messages · Invenio Homes</title>
<style>
body{margin:0;background:#f6f1e7;color:#16140f;font:16px/1.5 "Helvetica Neue",Arial,sans-serif}
main{max-width:860px;margin:0 auto;padding:32px 16px 64px}
h1{font-weight:400;font-size:32px;margin:0 0 6px}
.n{color:#625c4e;margin:0 0 28px}
article{background:#fffdf8;border:1px solid rgba(22,20,15,.14);padding:18px 20px;margin:0 0 14px}
article header{font-size:15px}
article p{margin:10px 0;white-space:normal;overflow-wrap:anywhere}
article footer{font-size:13px;color:#625c4e}
a{color:#8a512f}.t{text-transform:capitalize}
</style></head><body><main>
<h1>Website messages</h1>
<p class="n">${blobs.length} message${blobs.length === 1 ? "" : "s"}${blobs.length > shown.length ? `, the newest ${shown.length} shown` : ""}. Newest first.</p>
${rows || "<p>No messages yet.</p>"}
</main></body></html>`);
}
