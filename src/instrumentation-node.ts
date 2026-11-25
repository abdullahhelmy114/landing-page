import { defaultSource, describeInvites } from "@/lib/whatsapp-invites";

/** Logs how many groups the WhatsApp data covers (counts only, never a link). */
export async function logInvitesFolder() {
  const src = defaultSource();
  const { groups, found, linked, logos, verified } = await describeInvites(src);
  const where = src.id === "bundle" ? "bundled at build time" : found ? `read from ${src.id}` : `NOT FOUND at ${src.id}`;
  console.log(`[whatsapp-gruplari] ${where}: ${found}/${groups} groups, ${linked} with a WhatsApp link, ${logos} with a logo, ${verified} QR codes read back`);
}
