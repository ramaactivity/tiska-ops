"""
Logo turunan untuk tab Logo & brand di Aset Digital (D-227).

    python3 scripts/buat-logo-turunan.py

1. Logo sponsorship + ®: 6 kartu "LOGO FOR SPONSORSHIP" (arsip, tanpa ®) diberi ® yang DIAMBIL dari logo
   resmi warna yang sama — bukan digambar ulang. Ukuran & jaraknya mengikuti perbandingan di logo resmi
   (diukur dari tinggi huruf TISKA), jadi letaknya sama persis dengan logo ® resmi. Atas permintaan Rama.
2. Foto profil (DP) WhatsApp/Instagram 1080×1080: logo resmi di atas latar warna brand, dimuatkan ke dalam
   lingkaran (WA & IG memotong foto profil jadi bulat) — tulisan TISKA tidak terpotong.

Masukan: public/brand/unduh/logo-tiska-*.png (logo resmi) + folder arsip sponsorship (repo tiska-ops-arsip).
Keluaran: public/brand/unduh/logo-tiska-sponsor-*.png, dp-tiska-*.png. Butuh Pillow.
"""

import os

from PIL import Image

AKAR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
UNDUH = os.path.join(AKAR, "public", "brand", "unduh")
ARSIP = os.path.join(AKAR, "..", "..", "tiska-ops-arsip", "lampiran", "logo", "LOGO FOR SPONSORSHIP")

AMBANG = 60  # alfa minimum yang dihitung "ada tinta"


def kotak_tinta(im, x0, y0, x1, y1, kecuali=None):
    """Kotak pembatas piksel bertinta di dalam area; `kecuali` = kotak yang diabaikan."""
    px = im.load()
    kiri, atas, kanan, bawah = x1, y1, x0, y0
    for y in range(y0, y1):
        for x in range(x0, x1):
            if px[x, y][3] <= AMBANG:
                continue
            if kecuali and kecuali[0] <= x <= kecuali[2] and kecuali[1] <= y <= kecuali[3]:
                continue
            kiri, atas, kanan, bawah = min(kiri, x), min(atas, y), max(kanan, x), max(bawah, y)
    return (kiri, atas, kanan, bawah)


def ukur_resmi(warna):
    """® dan tulisan TISKA (tanpa ®, tanpa 'catering service') di logo resmi mendatar."""
    im = Image.open(os.path.join(UNDUH, f"logo-tiska-{warna}-mendatar.png")).convert("RGBA")
    w, h = im.size
    # ® = satu-satunya tinta di pojok kanan atas tulisan (di atas puncak huruf A).
    reg = kotak_tinta(im, int(w * 0.93), int(h * 0.25), w, int(h * 0.43))
    # Tulisan TISKA: kanan simbol, sebelum baris "catering service".
    kata = kotak_tinta(im, int(w * 0.47), int(h * 0.25), w, int(h * 0.62), kecuali=reg)
    return im, reg, kata


def tempel_r(i, warna):
    resmi, reg, kata = ukur_resmi(warna)
    tinggi_resmi = kata[3] - kata[1]
    r = resmi.crop((reg[0], reg[1], reg[2] + 1, reg[3] + 1))

    sp = Image.open(os.path.join(ARSIP, f"Logo Tiska for Sponsorship {i}.png")).convert("RGBA")
    # Tulisan TISKA di kartu sponsorship: kanan simbol, di atas "catering service", di dalam bingkai.
    kata_sp = kotak_tinta_beda(sp, 790, 380, 1500, 575)
    s = (kata_sp[3] - kata_sp[1]) / tinggi_resmi
    r = r.resize((round(r.width * s), round(r.height * s)), Image.LANCZOS)
    x = round(kata_sp[2] + (reg[0] - kata[2]) * s)
    y = round(kata_sp[1] + (reg[1] - kata[1]) * s)
    sp.alpha_composite(r, (x, y))
    keluar = os.path.join(UNDUH, f"logo-tiska-sponsor-{i}.png")
    sp.save(keluar, optimize=True)
    print(f"sponsor {i} ({warna}): skala {s:.3f}, ® di ({x},{y}) {r.size} → {os.path.basename(keluar)}")


def kotak_tinta_beda(im, x0, y0, x1, y1):
    """Seperti kotak_tinta, tetapi untuk kartu berlatar penuh: tinta = piksel yang berbeda dari latar kartu."""
    px = im.load()
    latar = px[825, 200]  # bidang kartu di atas logo
    kiri, atas, kanan, bawah = x1, y1, x0, y0
    for y in range(y0, y1):
        for x in range(x0, x1):
            p = px[x, y]
            if p[3] <= AMBANG:
                continue
            if latar[3] > AMBANG and sum(abs(p[k] - latar[k]) for k in range(3)) < 90:
                continue
            kiri, atas, kanan, bawah = min(kiri, x), min(atas, y), max(kanan, x), max(bawah, y)
    return (kiri, atas, kanan, bawah)


def muat_lingkaran(logo, sisi, porsi):
    """Skala supaya diagonal kotak logo = porsi × diameter lingkaran DP. Porsi ≤ 1 aman untuk bentuk apa pun; simbol
    berbentuk belah ketupat boleh > 1 karena pojok kotaknya kosong (ujung ornamen ada di tengah sisi)."""
    bb = logo.getbbox()
    logo = logo.crop(bb)
    diag = (logo.width ** 2 + logo.height ** 2) ** 0.5
    s = porsi * sisi / diag
    return logo.resize((round(logo.width * s), round(logo.height * s)), Image.LANCZOS)


def dp(nama, sumber, latar, porsi, potong_simbol=False):
    logo = Image.open(os.path.join(UNDUH, sumber)).convert("RGBA")
    if potong_simbol:
        # Simbol saja: ornamen di atas tulisan. Cari baris kosong pertama di bawah ornamen.
        px = logo.load()
        w, h = logo.size
        isi = [any(px[x, y][3] > AMBANG for x in range(0, w, 2)) for y in range(h)]
        bb = logo.getbbox()
        y = bb[1]
        while y < h and isi[y]:
            y += 1
        logo = logo.crop((0, 0, w, y))
    SISI = 1080
    logo = muat_lingkaran(logo, SISI, porsi)
    kanvas = Image.new("RGBA", (SISI, SISI), latar)
    kanvas.alpha_composite(logo, ((SISI - logo.width) // 2, (SISI - logo.height) // 2))
    kanvas.convert("RGB").save(os.path.join(UNDUH, nama), optimize=True)
    print(f"{nama}: logo {logo.size} di latar {latar}")


if __name__ == "__main__":
    for i, warna in [(1, "putih"), (2, "putih"), (3, "hitam"), (4, "hitam"), (5, "emas"), (6, "emas")]:
        tempel_r(i, warna)
    dp("dp-tiska-emas.png", "logo-tiska-emas-tegak.png", (14, 13, 10, 255), 0.90)
    dp("dp-tiska-hitam.png", "logo-tiska-hitam-tegak.png", (246, 241, 231, 255), 0.90)
    dp("dp-tiska-simbol.png", "logo-tiska-emas-tegak.png", (14, 13, 10, 255), 1.15, potong_simbol=True)
