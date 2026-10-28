// Data demo untuk rekaman: akun dummy (awalan ujitmp_vid) dan penautan sementara ke data demo.
// Semua yang dibuat/diubah di sini dikembalikan lagi oleh fungsi pasangannya.
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../web");
const req = createRequire(path.join(WEB, "package.json"));
req("dotenv").config({ path: path.join(WEB, ".env"), quiet: true });
const { PrismaClient } = req("@prisma/client");
const { PrismaPg } = req("@prisma/adapter-pg");
const bcrypt = req("bcryptjs");

export const SANDI = "UjiPr#2026";
export const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DIRECT_DATABASE_URL, max: 1 }) });

export async function akun(username, name, role, extra = {}) {
  const ada = await prisma.users.findUnique({ where: { username } });
  if (ada) return ada;
  const hash = `$2y$${(await bcrypt.hash(SANDI, 10)).slice(4)}`;
  return prisma.users.create({ data: { name, username, password: hash, role, is_active: true, wajib_ganti_sandi: false, created_at: new Date(), updated_at: new Date(), ...extra } });
}

export async function hapusAkunDummy() {
  return prisma.users.deleteMany({ where: { username: { startsWith: "ujitmp_vid" } } });
}
