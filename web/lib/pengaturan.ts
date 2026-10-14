import "server-only";

import { cache } from "react";

import { gabungPengaturan, type PengaturanBisnis } from "./pengaturan-bisnis";
import { prisma } from "./prisma";

/**
 * Angka bisnis yang berlaku, dibaca SEKALI per permintaan (lihat
 * lib/pengaturan-bisnis.ts untuk bawaan & aturannya).
 */
export const bacaPengaturanBisnis = cache(async (): Promise<PengaturanBisnis> => {
  const baris = await prisma.business_settings.findMany({ select: { key: true, value: true } });
  const { pengaturan, ditolak } = gabungPengaturan(baris);
  if (ditolak.length) console.error(`business_settings diabaikan (isi tidak sah): ${ditolak.join(", ")}`);
  return pengaturan;
});
