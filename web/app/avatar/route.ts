import { svgAvatar } from "@/lib/avatar-svg";

/** GET /avatar?s=<seed>&h=1 → SVG. Hasilnya tetap untuk seed yang sama, jadi boleh di-cache lama. */
export function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const seed = (q.get("s") ?? "").slice(0, 80) || "tiska";
  return new Response(svgAvatar(seed, q.get("h") === "1"), {
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
