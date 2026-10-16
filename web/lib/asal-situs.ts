import "server-only";

import { headers } from "next/headers";

/** "https://tiska-ops.vercel.app" — untuk link yang dikirim keluar (WA). */
export async function asalSitus(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "tiska-ops.vercel.app";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
