import { catatStatusKloter, konfirmasiTugas, simpanBast } from "@/app/(aplikasi)/beranda/actions";
import { catatAntarPesanan } from "@/app/(aplikasi)/ikut-menu-pesta/antar-actions";
import { penggunaAktif } from "@/lib/auth";

/**
 * Penerima antrian laporan HP tim (D-099). Route biasa, bukan server action:
 * laporan yang menunggu sinyal berjam-jam tetap terkirim walau aplikasi sudah
 * di-deploy ulang (ID server action berubah tiap build).
 * 401 = simpan dulu di HP (masuk lagi); 400 = laporan ditolak, buang + tampilkan alasannya.
 */
export async function POST(req: Request) {
  const sesi = await penggunaAktif();
  if (!sesi || sesi.wajibGantiSandi) return Response.json({ pesan: "Sesi habis — masuk lagi supaya laporan terkirim." }, { status: 401 });
  const f = await req.formData();
  const angka = (k: string) => (f.get(k) === null || f.get(k) === "" ? null : Number(f.get(k)));
  const berkas = (k: string) => (f.get(k) instanceof Blob ? (f.get(k) as Blob) : null);
  try {
    if (f.get("jenis") === "siap") await konfirmasiTugas(String(f.get("id")), angka("jam") ?? undefined);
    else if (f.get("jenis") === "antar") await catatAntarPesanan(String(f.get("id")), { foto: berkas("foto"), tunai: f.get("tunai") === "true", jam: angka("jam") ?? undefined });
    else if (f.get("jenis") === "bast")
      await simpanBast(String(f.get("id")), {
        penerima: String(f.get("penerima") ?? ""),
        kondisi: String(f.get("kondisi") ?? ""),
        catatan: String(f.get("catatan") ?? ""),
        ttd: berkas("ttd"),
        foto: berkas("foto"),
        jam: angka("jam") ?? undefined,
      });
    else {
      const foto = f.get("foto");
      await catatStatusKloter(String(f.get("id")), String(f.get("status")), {
        foto: foto instanceof Blob ? foto : null,
        lat: angka("lat"),
        lng: angka("lng"),
        jam: angka("jam") ?? undefined,
      });
    }
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ pesan: e instanceof Error ? e.message : "Gagal." }, { status: 400 });
  }
}
