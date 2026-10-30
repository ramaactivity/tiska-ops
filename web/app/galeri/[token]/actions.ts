"use server";

import { prisma } from "@/lib/prisma";

/** Klien membuka link galeri (D-126) — dipanggil dari browser, jadi pratinjau link WhatsApp tidak ikut terhitung. */
export async function catatDibuka(token: string): Promise<void> {
  if (!/^[0-9a-f]{32}$/.test(token)) return;
  await prisma.$executeRaw`
    UPDATE menu_galleries
       SET open_count = open_count + 1, last_opened_at = now(), first_opened_at = COALESCE(first_opened_at, now())
     WHERE token = ${token} AND disabled_at IS NULL AND expires_at > now()`;
}
