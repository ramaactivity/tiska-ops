import { prisma } from "@/lib/prisma";

/** Pilihan untuk FormPaket (detail & paket baru): menu aktif, bentuk penyajian, lini yang ada. Tanpa biaya. */
export async function pilihanFormPaket() {
  const [menu, bentuk, lini] = await Promise.all([
    prisma.menus.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.service_forms.findMany({ orderBy: { sort: "asc" }, select: { id: true, name: true } }),
    prisma.packages.findMany({ where: { line: { not: null } }, distinct: ["line"], select: { line: true } }),
  ]);
  return [
    menu.map((m) => ({ id: m.id.toString(), label: m.name })),
    bentuk.map((b) => ({ id: b.id.toString(), name: b.name })),
    lini.map((l) => l.line ?? "").filter(Boolean),
  ] as const;
}
