import { neon } from "@neondatabase/serverless";
import { z } from "zod";

const schema = z.object({
  gender: z.enum(["Kadın", "Erkek"]),
  group_id: z.string().trim().min(1).max(40),
  level: z.enum(["A2", "B1", "B2"]),
  availability: z.string().trim().max(1000).optional().default(""),
  full_name: z.string().trim().min(2).max(120),
  whatsapp: z.string().trim().min(6).max(30),
  email: z.string().trim().email().max(255),
  goal: z.string().trim().min(1).max(2000),
  eligibility: z.enum(["dad", "sakarya", "other"]),
});

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
    return Response.json({ ok: true, id: rows[0]?.["id"] ?? null });
  } catch (error) {
    console.error("shukraan register insert failed", error);
    return Response.json({ error: "Database error" }, { status: 500 });
  }
}
