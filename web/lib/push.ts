import "server-only";

import { after } from "next/server";
import webpush from "web-push";

import type { PesanPush } from "./hitung/notifikasi";
import type { Peran } from "./peran";
import { prisma } from "./prisma";

/* ==========================================================================
   PUSH NOTIFIKASI HP (Fase 3.4, D-096) — web-push + VAPID.

   Kirim = upaya terbaik: tidak pernah melempar galat ke pemanggil (notifikasi
   gagal bukan alasan simpan PR gagal). Langganan yang sudah mati (404/410)
   dihapus. Tanpa kunci VAPID (mis. dev) = tidak mengirim apa pun.
   ========================================================================== */

let siap: boolean | null = null;
function konfigurasi(): boolean {
  if (siap !== null) return siap;
  const publik = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privat = process.env.VAPID_PRIVATE_KEY;
  siap = Boolean(publik && privat);
  if (siap) webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:catering.tiska@gmail.com", publik!, privat!);
  return siap;
}

export async function kirimPush(userIds: bigint[], pesan: PesanPush): Promise<{ terkirim: number; gagal: number }> {
  if (!userIds.length || !konfigurasi()) return { terkirim: 0, gagal: 0 };
  const langganan = await prisma.push_subscriptions.findMany({ where: { user_id: { in: userIds } } });
  let terkirim = 0;
  let gagal = 0;
  await Promise.all(
    langganan.map(async (l) => {
      try {
        await webpush.sendNotification({ endpoint: l.endpoint, keys: { p256dh: l.p256dh, auth: l.auth } }, JSON.stringify(pesan), { TTL: 60 * 60 * 12 });
        terkirim++;
        await prisma.push_subscriptions.update({ where: { id: l.id }, data: { last_sent_at: new Date() } });
      } catch (e) {
        gagal++;
        const kode = (e as { statusCode?: number }).statusCode;
        if (kode === 404 || kode === 410) await prisma.push_subscriptions.delete({ where: { id: l.id } }).catch(() => {});
        else console.error("push gagal", kode, (e as Error).message);
      }
    }),
  );
  return { terkirim, gagal };
}

/** Akun aktif berperan tertentu (owner/admin tidak ikut kecuali disebut). */
export async function akunBerperan(peran: Peran[]): Promise<bigint[]> {
  // Akun yang merangkap pekerjaan Finance tanpa berperan Finance (mis. Admin) ikut menerima (D-121).
  const tambahan = peran.includes("finance") ? [{ notif_finance: true }] : [];
  return (await prisma.users.findMany({ where: { is_active: true, OR: [{ role: { in: peran } }, ...tambahan] }, select: { id: true } })).map((u) => u.id);
}

/** Kirim sesudah respons (next/server `after`) — dipanggil SESUDAH data tersimpan. */
export function kirimNanti(tujuan: bigint[] | Peran[], pesan: PesanPush | null): void {
  if (!pesan) return;
  after(async () => {
    try {
      const ids = typeof tujuan[0] === "bigint" ? (tujuan as bigint[]) : await akunBerperan(tujuan as Peran[]);
      await kirimPush(ids, pesan);
    } catch (e) {
      console.error("push nanti gagal", (e as Error).message);
    }
  });
}
