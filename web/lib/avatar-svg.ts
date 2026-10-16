import "server-only";

import { notionists } from "@dicebear/collection";
import { createAvatar } from "@dicebear/core";

import { pakaiHijab } from "./avatar-hijab";

/**
 * SVG avatar Notionists (DiceBear, CC0) dari paket lokal — nama/seed tidak
 * pernah dikirim ke layanan luar. Tanpa jenggot: jenis kelamin tidak dicatat.
 */
export function svgAvatar(seed: string, hijab: boolean): string {
  const svg = createAvatar(notionists, { seed, beardProbability: 0, backgroundColor: ["transparent"] }).toString();
  return hijab ? pakaiHijab(svg) : svg;
}
