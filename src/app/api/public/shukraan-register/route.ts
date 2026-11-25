import { neon } from "@neondatabase/serverless";
import { registrationSchema as schema } from "@/lib/registration-schema";
import { inviteForGroup } from "@/lib/whatsapp-invites";

export async function POST(request: Request) {
  const url = process.env["DATABASE_URL"];
  if (!url) return Response.json({ error: "DATABASE_URL is not configured" }, { status: 500 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid input" }, { status: 400 });
  const d = parsed.data;

  try {
    const sql = neon(url);
    await sql`
      CREATE TABLE IF NOT EXISTS shukraan_registrations (
        id BIGSERIAL PRIMARY KEY,
        gender TEXT NOT NULL,
        group_id TEXT NOT NULL,
        level TEXT NOT NULL,
        availability TEXT,
        full_name TEXT NOT NULL,
        whatsapp TEXT NOT NULL,
        email TEXT NOT NULL,
        goal TEXT NOT NULL,
        eligibility TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
    const rows = await sql`
      INSERT INTO shukraan_registrations
        (gender, group_id, level, availability, full_name, whatsapp, email, goal, eligibility)
      VALUES (${d.gender}, ${d.group_id}, ${d.level}, ${d.availability}, ${d.full_name},
              ${d.whatsapp}, ${d.email}, ${d.goal}, ${d.eligibility})
      RETURNING id`;
    // The saved group's WhatsApp link and QR code, read from whatsapp-gruplari/ (null while it has none).
    const whatsapp = await inviteForGroup(d.group_id).catch((error) => {
      console.error("shukraan whatsapp invite read failed", error);
      return null;
    });
    return Response.json({ ok: true, id: rows[0]?.["id"] ?? null, whatsapp });
  } catch (error) {
    console.error("shukraan register insert failed", error);
    return Response.json({ error: "Database error" }, { status: 500 });
  }
}
