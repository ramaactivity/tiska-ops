/**
 * Avatar orang (D-061): users.avatar = "<seed>" atau "<seed>|hijab"; kosong
 * = seed username tanpa hijab. Murni — dipakai server & browser (pemilih
 * avatar). Gambarnya dirender di /avatar (lib/avatar-svg.ts).
 */
export type PilihanAvatar = { seed: string; hijab: boolean };

export function uraiAvatar(avatar: string | null | undefined, username: string): PilihanAvatar {
  const [seed, gaya] = (avatar ?? "").split("|");
  return { seed: seed || username, hijab: gaya === "hijab" };
}

export function tulisAvatar(p: PilihanAvatar, username: string): string | null {
  if (p.seed === username && !p.hijab) return null;
  return `${p.seed}${p.hijab ? "|hijab" : ""}`;
}

export function urlAvatar(p: PilihanAvatar): string {
  return `/avatar?s=${encodeURIComponent(p.seed)}${p.hijab ? "&h=1" : ""}`;
}

/** Pilihan wajah di pemilih: seed username + variasinya. */
export function variasiSeed(username: string, n = 12): string[] {
  return [username, ...Array.from({ length: n - 1 }, (_, i) => `${username}-${i + 2}`)];
}
