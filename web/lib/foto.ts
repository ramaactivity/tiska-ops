/* Untuk browser saja (createImageBitmap & canvas). */

/** Foto kamera dikecilkan di HP (maks 1280px, JPEG 0,7) — hemat kuota di 3G. */
export async function kecilkanFoto(berkas: File): Promise<Blob> {
  const gambar = await createImageBitmap(berkas);
  const skala = Math.min(1, 1280 / Math.max(gambar.width, gambar.height));
  const kanvas = document.createElement("canvas");
  kanvas.width = Math.round(gambar.width * skala);
  kanvas.height = Math.round(gambar.height * skala);
  kanvas.getContext("2d")!.drawImage(gambar, 0, 0, kanvas.width, kanvas.height);
  return new Promise((ok, gagal) => kanvas.toBlob((b) => (b ? ok(b) : gagal(new Error("Foto gagal diproses."))), "image/jpeg", 0.7));
}
