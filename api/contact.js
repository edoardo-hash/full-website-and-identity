import { put } from "@vercel/blob";

/**
 * Contact form → saved, so no enquiry depends on the visitor's email app.
 * - Saved as one private JSON file per message in the project's Vercel Blob store (BLOB_READ_WRITE_TOKEN, set by
 *   Vercel when the store is connected). Read them at /api/messages (ADMIN_PASSWORD).
 * - Also emailed to CONTACT_TO (default find@inveniohomes.com) when RESEND_API_KEY and MAIL_FROM are set.
 * - A hidden "website" field catches bots: filled in = answered "ok" and dropped.
 */
const TO = process.env.CONTACT_TO || "find@inveniohomes.com";
const TYPES = new Set(["", "owner", "agent", "partner"]);
const text = (v, max) => String(v ?? "").replace(/\r/g, "").trim().slice(0, max);
const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "POST only" });
  }
  let body = req.body ?? {};
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  if (text(body.website, 200)) return res.status(200).json({ ok: true }); // honeypot

  const m = {
    name: text(body.name, 120),
    email: text(body.email, 200),
    phone: text(body.phone, 60),
    company: text(body.company, 160),
    type: TYPES.has(text(body.type, 20)) ? text(body.type, 20) : "",
    message: text(body.message, 5000),
    consent: body.consent === true,
    page: text(body.page, 200),
    receivedAt: new Date().toISOString(),
    country: text(req.headers["x-vercel-ip-country"], 4),
    userAgent: text(req.headers["user-agent"], 300),
  };
  const missing = [];
  if (m.name.length < 2) missing.push("name");
  if (!isEmail(m.email)) missing.push("email");
  if (m.message.length < 4) missing.push("message");
  if (!m.consent) missing.push("consent");
  if (missing.length) return res.status(400).json({ ok: false, missing });

  let saved = false;
  let emailed = false;
  const errors = [];

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const id = `${m.receivedAt.replace(/[:.]/g, "-")}-${Math.random().toString(36).slice(2, 8)}`;
      await put(`messages/${id}.json`, JSON.stringify(m, null, 2), { access: "private", contentType: "application/json", addRandomSuffix: false });
      saved = true;
    } catch (e) {
      errors.push(`save: ${e instanceof Error ? e.message : e}`);
    }
  }

  if (process.env.RESEND_API_KEY && process.env.MAIL_FROM) {
    try {
      const lines = [
        `Name: ${m.name}`, `Email: ${m.email}`, m.phone && `Phone: ${m.phone}`, m.company && `Company: ${m.company}`,
        m.type && `Enquiry type: ${m.type}`, m.country && `Country (from IP): ${m.country}`, "", m.message,
      ].filter((l) => l !== "" && l !== false && l !== undefined);
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
        body: JSON.stringify({ from: process.env.MAIL_FROM, to: [TO], reply_to: m.email, subject: `Website enquiry — ${m.name}`, text: lines.join("\n") }),
      });
      if (r.ok) emailed = true;
      else errors.push(`email: ${r.status}`);
    } catch (e) {
      errors.push(`email: ${e instanceof Error ? e.message : e}`);
    }
  }

  if (errors.length) console.error("contact form:", errors.join("; "));
  if (!saved && !emailed) return res.status(503).json({ ok: false, error: "The form is not connected yet" });
  return res.status(200).json({ ok: true });
}
