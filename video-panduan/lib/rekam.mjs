// Perekam langkah: membuka Tiska Ops asli, menjalankan langkah-langkah naskah, dan memotret tiap keadaan.
// Hasil: <keluar>/frame/*.jpg + <keluar>/rekaman.json (posisi sorotan & ketukan per langkah, koordinat CSS layar).
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { SANDI } from "./data.mjs";

const BASE = process.env.TISKA_URL || "http://localhost:3100";

export async function rekam(ep, keluar) {
  mkdirSync(`${keluar}/frame`, { recursive: true });
  const hp = ep.layar === "hp";
  const vp = hp ? { width: 390, height: 844 } : { width: 1440, height: 900 };
  const br = await chromium.launch({ executablePath: process.env.CHROME_BIN });
  const p = await (await br.newContext({ viewport: vp, deviceScaleFactor: hp ? 3 : 2, isMobile: hp, hasTouch: hp })).newPage();

  await p.goto(BASE + "/masuk"); await p.waitForLoadState("networkidle"); await p.waitForTimeout(800);
  await p.fill('[name="username"]', ep.akun); await p.fill('[name="sandi"]', SANDI); await p.click('button[type="submit"]');
  await p.waitForURL((u) => !u.pathname.startsWith("/masuk"), { timeout: 60000 });
  await p.goto(BASE + ep.mulai); await p.waitForLoadState("networkidle"); await p.waitForTimeout(1200);

  // Tampilan dirapikan untuk video saja (data asli tidak diubah): label DEMO, nama fiktif, kartu yang tidak dibahas.
  const rapikan = () => p.evaluate(({ ganti, sembunyi }) => {
    document.querySelectorAll("nextjs-portal").forEach((e) => e.remove());
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) { let t = n.textContent; t = t.replace(/DEMO\s*[-•·]\s*/g, "").replace(/\s*\(DEMO-\d+\)/g, ""); for (const [a, b] of ganti) t = t.split(a).join(b); if (t !== n.textContent) n.textContent = t; }
    // Sembunyikan kartu kecil yang memuat teks itu: naik dari teksnya selama wadahnya masih kecil (< 220 huruf).
    for (const s of sembunyi) for (const el of document.querySelectorAll("main *")) if (el.children.length === 0 && el.textContent.trim().startsWith(s)) { let k = el; while (k.parentElement && k.parentElement.textContent.trim().length < 220) k = k.parentElement; k.style.display = "none"; }
  }, { ganti: ep.ganti || [], sembunyi: ep.sembunyi || [] });

  let n = 0;
  const foto = async () => { await rapikan(); const f = `frame/f${String(n++).padStart(4, "0")}.jpg`; await p.screenshot({ path: `${keluar}/${f}`, type: "jpeg", quality: 90 }); return f; };
  const kotak = async (pilih) => {
    const ls = (Array.isArray(pilih) ? pilih : [pilih]).map((f) => f(p));
    let a = null;
    for (const l of ls) { const b = await l.first().boundingBox({ timeout: 4000 }).catch(() => null); if (!b) { console.log("  ! elemen sorotan tidak ketemu"); continue; } a = a ? { x1: Math.min(a.x1, b.x), y1: Math.min(a.y1, b.y), x2: Math.max(a.x2, b.x + b.width), y2: Math.max(a.y2, b.y + b.height) } : { x1: b.x, y1: b.y, x2: b.x + b.width, y2: b.y + b.height }; }
    return a && { x: a.x1, y: a.y1, w: a.x2 - a.x1, h: a.y2 - a.y1 };
  };

  const hasil = [];
  for (const [i, l] of ep.langkah.entries()) {
    const gulir = [];
    // notifikasi singkat (toast) dari langkah sebelumnya bisa menutupi elemen — singkirkan bila diminta naskah
    if (l.tanpaToast) await p.evaluate(() => document.querySelectorAll("[data-sonner-toaster]").forEach((e) => e.remove()));
    // gulir halus ke posisi y: satu foto per frame video 60 fps
    const gulirKeY = async (y1, detik) => {
      const y0 = await p.evaluate(() => scrollY);
      y1 = await p.evaluate((v) => Math.max(0, Math.min(v, document.documentElement.scrollHeight - innerHeight)), y1);
      const k = Math.max(1, Math.round(detik * 60));
      if (Math.abs(y1 - y0) > 2) for (let j = 1; j <= k; j++) { const e = j / k, q = e < 0.5 ? 4 * e * e * e : 1 - Math.pow(-2 * e + 2, 3) / 2; await p.evaluate((v) => scrollTo(0, v), Math.round(y0 + (y1 - y0) * q)); gulir.push(await foto()); }
    };
    if (l.gulirKe) { const el = l.gulirKe(p).first(); await rapikan(); await gulirKeY(await el.evaluate((e, o) => e.getBoundingClientRect().top + scrollY - o, l.gulirJarak ?? 120), l.gulirDetik ?? 0.9); }
    // Elemen yang disorot/diketuk harus terlihat utuh: kalau di luar layar, gulir halus sampai ada di tengah.
    for (const pilih of [l.sorot, l.ketuk].filter(Boolean)) {
      await rapikan(); const r = await kotak(pilih); if (!r) continue;
      if (r.y < 70 || r.y + r.h > vp.height - 40) await gulirKeY((await p.evaluate(() => scrollY)) + r.y + r.h / 2 - vp.height * 0.45, 0.8);
    }
    await p.waitForTimeout(150);
    const tampil = await foto();
    const sorot = l.sorot ? await kotak(l.sorot) : null;
    const ketuk = l.ketuk ? await kotak(l.ketuk) : null;
    if (l.ketuk) { await l.ketuk(p).first().click(); await p.waitForLoadState("networkidle").catch(() => {}); await p.waitForTimeout(l.tunggu ?? 1500); }
    hasil.push({ no: i + 1, narasi: l.narasi, gulir, tampil, sorot, ketuk: ketuk && { x: ketuk.x + ketuk.w / 2, y: ketuk.y + ketuk.h / 2 }, zoom: l.zoom ?? null });
    console.log(`  langkah ${i + 1}: ${gulir.length} frame gulir, sorot ${sorot ? "ya" : "-"}, ketuk ${ketuk ? "ya" : "-"}`);
  }
  const akhir = await foto();
  await br.close();
  writeFileSync(`${keluar}/rekaman.json`, JSON.stringify({ layar: ep.layar, viewport: vp, langkah: hasil, akhir }, null, 1));
  return hasil;
}
