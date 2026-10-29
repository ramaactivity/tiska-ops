/**
 * Akun uji SEMENTARA untuk tes browser oleh Claude (izin Rama 29 Okt 2026).
 *
 *   node scripts/akun-uji.mjs buat <berkas-sandi.json>   membuat/mengaktifkan ujitmp_admin, ujitmp_finance, ujitmp_gudang, ujitmp_driver
 *   node scripts/akun-uji.mjs hapus                      menghapus keempatnya (dinonaktifkan bila sudah dipakai dokumen)
 *
 * Sandi acak ditulis ke berkas (bukan dicetak) dan diganti setiap "buat".
 * Hanya empat nama di bawah yang pernah disentuh — akun lain tidak.
 */
import { randomBytes } from "node:crypto";
import fs from "node:fs";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import "dotenv/config";

const AKUN = [
  ["ujitmp_admin", "admin"],
  ["ujitmp_finance", "finance"],
  ["ujitmp_gudang", "gudang"],
  ["ujitmp_driver", "driver"],
];
const [perintah, berkas] = process.argv.slice(2);
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DIRECT_DATABASE_URL, max: 1 }) });

if (perintah === "buat" && berkas) {
  const sandi = {};
  for (const [username, role] of AKUN) {
    const s = randomBytes(12).toString("base64url");
    const hash = `$2y$${(await bcrypt.hash(s, 10)).slice(4)}`;
    const data = { password: hash, role, is_active: true, wajib_ganti_sandi: false, gagal_masuk: 0, terkunci_sampai: null, pin_hash: null };
    await prisma.users.upsert({ where: { username }, create: { ...data, username, name: `Uji Sementara (${role})` }, update: data });
    sandi[username] = s;
  }
  fs.writeFileSync(berkas, JSON.stringify(sandi), { mode: 0o600 });
  console.log(`akun uji aktif: ${AKUN.map((a) => a[0]).join(", ")} — sandi di ${berkas}`);
} else if (perintah === "hapus") {
  for (const [username] of AKUN) {
    try {
      const r = await prisma.users.deleteMany({ where: { username } });
      console.log(`${username}: ${r.count ? "dihapus" : "tidak ada"}`);
    } catch {
      await prisma.users.update({ where: { username }, data: { is_active: false, password: "-" } });
      console.log(`${username}: dipakai dokumen → dinonaktifkan`);
    }
  }
} else {
  console.error("Cara pakai: node scripts/akun-uji.mjs buat <berkas-sandi.json> | hapus");
  process.exitCode = 1;
}
await prisma.$disconnect();
