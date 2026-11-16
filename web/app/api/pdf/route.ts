import chromium from "@sparticuz/chromium";
import { type NextRequest, NextResponse } from "next/server";
import puppeteer, { type LaunchOptions } from "puppeteer-core";

import { penggunaAktif } from "@/lib/auth";
import { NAMA_COOKIE_SESI } from "@/lib/token-sesi";

/* ==========================================================================
   UNDUH PDF TANPA DIALOG CETAK (Rama, 16 Nov 2026)

   Tombol "Unduh PDF" di halaman cetak memanggil rute ini. Chrome tanpa layar di
   server membuka halaman cetak yang SAMA (dengan sesi pengguna itu), lalu
   mencetaknya ke PDF memakai aturan @page halaman tersebut — hasilnya sama
   dengan "Save as PDF" di dialog cetak: teks tetap teks, ukuran kertas &
   pemisah halaman sama, tanpa tanggal/URL di pinggir kertas.

   Dulu (layout cetak) PDF sengaja tidak dibuat di server karena pustaka PDF
   biasa sering salah huruf. Di sini yang mencetak adalah Chrome itu sendiri,
   jadi hurufnya sama dengan yang dilihat di layar.

   Keamanan: hanya halaman cetak Tiska Ops (daftar di bawah), hanya di domain
   yang sama, hanya untuk pengguna yang masuk; hak akses halamannya tetap
   diperiksa halaman itu sendiri (wajibIzin) karena Chrome membawa sesi yang
   sama. Hanya cookie sesi yang diteruskan, dan hanya ke domain aplikasi.
   ========================================================================== */

export const runtime = "nodejs";
// Chrome perlu dibuka dulu (±2–5 dtk saat dingin) sebelum halaman dimuat.
export const maxDuration = 60;

/** Halaman di kerangka (cetak). Tambahkan di sini kalau ada halaman cetak baru. */
const HALAMAN_CETAK =
  /^\/(laporan\/penjualan\/cetak|(tagihan|penawaran)\/\d+\/(cetak|dapur)|ikut-menu-pesta\/\d+\/surat-jalan|pembayaran\/\d+\/kwitansi|event\/\d+\/(delivery-order|bast\/[\w-]+)|pelanggan\/\d+\/cetak)$/;

/** Angka dari alamat, dibatasi supaya isian aneh tidak mengubah tata letak. */
function angkaDalam(teks: string | null, min: number, max: number): number | null {
  if (teks === null || teks.trim() === "") return null;
  const n = Number.parseFloat(teks);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

async function opsiChrome(): Promise<LaunchOptions> {
  // Uji di Mac: CHROME_LOKAL = jalur Chrome/Chromium setempat (biner @sparticuz hanya untuk Linux server).
  const lokal = process.env.CHROME_LOKAL;
  if (lokal) return { executablePath: lokal, headless: true, defaultViewport: { width: 1280, height: 900 } };
  return {
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
    // Lebar layar desktop: tata letak halaman (dan hitungan "Muat 1 halaman") sama dengan di laptop kantor.
    defaultViewport: { width: 1280, height: 900 },
  };
}

export async function GET(request: NextRequest) {
  const sesi = await penggunaAktif();
  if (!sesi || sesi.wajibGantiSandi) return new NextResponse("Silakan masuk dulu.", { status: 401 });

  const asal = new URL(request.url);
  let tujuan: URL;
  try {
    tujuan = new URL(asal.searchParams.get("jalur") ?? "", asal.origin);
  } catch {
    return new NextResponse("Halaman tidak dikenal.", { status: 400 });
  }
  if (tujuan.origin !== asal.origin || !HALAMAN_CETAK.test(tujuan.pathname)) {
    return new NextResponse("Halaman ini tidak bisa diunduh sebagai PDF.", { status: 400 });
  }
  const token = request.cookies.get(NAMA_COOKIE_SESI)?.value;
  if (!token) return new NextResponse("Silakan masuk dulu.", { status: 401 });

  // Pilihan yang hidup di browser pengguna (bukan di alamat): ukuran isi & geser blanko kwitansi.
  const skala = angkaDalam(asal.searchParams.get("skala"), 0.5, 1);
  const geserX = angkaDalam(asal.searchParams.get("gx"), -30, 30);
  const geserY = angkaDalam(asal.searchParams.get("gy"), -30, 30);

  const chrome = await puppeteer.launch(await opsiChrome());
  try {
    const halaman = await chrome.newPage();
    await halaman.setCookie({
      name: NAMA_COOKIE_SESI,
      value: token,
      domain: asal.hostname,
      path: "/",
      httpOnly: true,
      secure: asal.protocol === "https:",
    });
    const jawab = await halaman.goto(tujuan.href, { waitUntil: "networkidle0", timeout: 40_000 });
    if (!jawab?.ok()) {
      return new NextResponse(`Halaman cetak gagal dibuka (${jawab?.status() ?? "tanpa jawaban"}).`, { status: 502 });
    }
    if (!(await halaman.$(".lembar-cetak"))) return new NextResponse("Halaman ini bukan halaman cetak.", { status: 400 });

    await halaman.evaluate(
      async (s, x, y) => {
        const akar = document.documentElement.style;
        if (s !== null) akar.setProperty("--skala-cetak", String(s));
        if (x !== null) akar.setProperty("--geser-x", `${x}mm`);
        if (y !== null) akar.setProperty("--geser-y", `${y}mm`);
        await document.fonts.ready;
        // Gambar (logo, tanda tangan, cap) harus selesai dimuat sebelum dicetak.
        await Promise.all(
          [...document.images].map((g) => (g.complete ? null : new Promise((ok) => ((g.onload = ok), (g.onerror = ok))))),
        );
      },
      skala,
      geserX,
      geserY,
    );

    const pdf = await halaman.pdf({ preferCSSPageSize: true, printBackground: true });
    const nama = ((await halaman.title()).replace(/[^\w.-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "dokumen") + ".pdf";
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${nama}"`,
        "cache-control": "no-store",
      },
    });
  } catch (galat) {
    console.error("PDF gagal dibuat", tujuan.pathname, galat);
    return new NextResponse("PDF gagal dibuat. Coba lagi, atau pakai Cetak → Save as PDF.", { status: 500 });
  } finally {
    await chrome.close();
  }
}
