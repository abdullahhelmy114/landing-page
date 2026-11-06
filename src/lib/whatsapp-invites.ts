import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";
import { GROUPS, REGULAR_GROUPS, type WhatsAppInvite } from "@/components/shukraan/data";

/**
 * Each group's WhatsApp invite lives in whatsapp-gruplari/ at the project root (outside public/,
 * so no file has a URL): <file>.txt holds the link, <file>.png|.jpg|.jpeg its QR image. The
 * standalone build and the Docker image carry the folder next to server.js. Server-only.
 */
export const INVITES_DIR = path.join(/* turbopackIgnore: true */ process.cwd(), "whatsapp-gruplari");

const LINK_PREFIX = "https://chat.whatsapp.com/";
/** SHA-256 of the neutral placeholder image every group starts with. */
const PLACEHOLDER_IMAGE_SHA256 = "ef2a31e63620b6591d58c453cae9e72faf4ef018b4d3ab39eda04bcb2b914dff";
const IMAGE_TYPES: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg" };

/** The link in a group's .txt file, or null while it is the placeholder or not a WhatsApp group link. */
export function parseLink(text: string): string | null {
  const line = text
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find(Boolean);
  if (!line?.startsWith(LINK_PREFIX)) return null;
  try {
    const url = new URL(line);
    const code = url.pathname.replace(/^\/+|\/+$/g, "");
    if (url.protocol !== "https:" || url.hostname !== "chat.whatsapp.com" || !code) return null;
    return code.toUpperCase() === "PLACEHOLDER" ? null : line;
  } catch {
    return null;
  }
}

const sha256 = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

/**
 * A group's invite: its link, with its own image, or a QR code generated from the link when the
 * group only has the placeholder image. Null while the group has no real link.
 */
export async function readInvite(dir: string, file: string): Promise<WhatsAppInvite | null> {
  const text = await readFile(path.join(dir, `${file}.txt`), "utf8").catch(() => null);
  const url = text === null ? null : parseLink(text);
  if (!url) return null;

  const names = await readdir(dir).catch(() => [] as string[]);
  for (const ext of Object.keys(IMAGE_TYPES)) {
    for (const name of names.filter((n) => n.toLowerCase() === `${file}${ext}`)) {
      const bytes = await readFile(path.join(dir, name)).catch(() => null);
      if (bytes && bytes.length > 0 && sha256(bytes) !== PLACEHOLDER_IMAGE_SHA256)
        return { url, qr: `data:${IMAGE_TYPES[ext]};base64,${bytes.toString("base64")}` };
    }
  }
  return { url, qr: await QRCode.toDataURL(url, { margin: 2, width: 360 }) };
}

/** The invite for a saved group id (a new-group request has none). */
export async function inviteForGroup(groupId: string, dir = INVITES_DIR): Promise<WhatsAppInvite | null> {
  const group = [...REGULAR_GROUPS, ...GROUPS].find((g) => g.id === groupId);
  return group ? readInvite(dir, group.file) : null;
}

/** How many groups the folder has files for, and how many of them have a real link (for the log). */
export async function describeInvites(dir = INVITES_DIR): Promise<{ groups: number; found: number; linked: number }> {
  const all = [...REGULAR_GROUPS, ...GROUPS];
  let found = 0;
  let linked = 0;
  for (const g of all) {
    const text = await readFile(path.join(dir, `${g.file}.txt`), "utf8").catch(() => null);
    if (text === null) continue;
    found += 1;
    if (parseLink(text)) linked += 1;
  }
  return { groups: all.length, found, linked };
}
