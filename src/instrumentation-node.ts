import { INVITES_DIR, describeInvites } from "@/lib/whatsapp-invites";

/** Logs how many groups the WhatsApp folder covers (counts only, never a link). */
export async function logInvitesFolder() {
  const { groups, found, linked } = await describeInvites();
  const where = found ? `found at ${INVITES_DIR}` : `NOT FOUND at ${INVITES_DIR}`;
  console.log(`[whatsapp-gruplari] ${where}: ${found}/${groups} groups, ${linked} with a WhatsApp link`);
}
