// "Panggung" data demo yang dipakai ulang antar episode. Tiap panggung: siapkan() lalu bersihkan() (selalu
// mengembalikan data demo persis seperti semula) + tanggal jam pura-pura + nama fiktif pengganti nama demo.
import { akun, prisma } from "./data.mjs";

// Event demo #28 "Rapat Kerja Cabang", kirim Senin 19 Okt 2026. Di video tampil sebagai PT Arunika Bogor (fiktif).
export const EVENT_DEMO = {
  jamPalsu: "2026-10-19T02:40:00Z", // 09.40 WIB di hari kirim
  ganti: [["Bank Pakuan Bogor", "PT Arunika Bogor"], ["Bank Pakuan", "PT Arunika"]],
};

// Captain "Dadang Suherman" dipasang ke kloter 2 (berangkat 13.30) event demo, belum menekan Siap.
export function captainDiKloterDemo(username = "ujitmp_vid_cap") {
  const ASLI = { user_id: null, confirmed_at: new Date("2026-10-16T14:35:12Z") }; // penugasan #41 sebelum dipinjam
  return {
    ...EVENT_DEMO,
    akun: username,
    async siapkan() {
      const u = await akun(username, "Dadang Suherman", "captain", { gender: "L", avatar: "w.k01" });
      await prisma.event_assignments.update({ where: { id: 41n }, data: { user_id: u.id, confirmed_at: null } });
    },
    async bersihkan() {
      await prisma.event_assignments.update({ where: { id: 41n }, data: ASLI });
    },
  };
}

// Akun dengan satu peran pada tanggal data demo (tanpa mengubah data) — mis. owner/finance/sales melihat dashboard.
export function akunPeran(peran, nama, username = `ujitmp_vid_${peran}`, extra = {}) {
  return {
    ...EVENT_DEMO,
    akun: username,
    async siapkan() { await akun(username, nama, peran, extra); },
    async bersihkan() {},
  };
}
