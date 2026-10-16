import { describe, expect, it } from "vitest";

import { peringatanEvent } from "./operasional";

const kini = new Date("2026-10-16T22:50:00Z"); // 05.50 WIB 17 Okt

describe("peringatan operasional", () => {
  it("tanpa kloter → satu peringatan; event selesai/batal → tidak ada", () => {
    expect(peringatanEvent({ tanggal: "2026-10-17", kloter: [], status: "final" }, kini)).toEqual(["Belum ada kloter & tim"]);
    expect(peringatanEvent({ tanggal: "2026-10-17", kloter: [], status: "batal" }, kini)).toEqual([]);
  });

  it("tanpa captain, belum konfirmasi, mepet belum siap, telat berangkat", () => {
    expect(
      peringatanEvent(
        {
          tanggal: "2026-10-17",
          status: "final",
          kloter: [
            { no: 1, jam: "05.30", adaCaptain: true, anggota: 3, belumSiap: 0, status: ["dimasak", "packing", "siap"] },
            { no: 2, jam: "06.00", adaCaptain: false, anggota: 2, belumSiap: 1, status: ["dimasak"] },
          ],
        },
        kini,
      ),
    ).toEqual([
      "Kloter 1 (05.30): lewat jam berangkat, belum berangkat",
      "Kloter 2 (06.00): tanpa captain",
      'Kloter 2 (06.00): 1 orang belum "Siap 👍"',
      'Kloter 2 (06.00): 10 menit lagi, dapur belum "Siap angkut"',
    ]);
  });

  it("sudah berangkat → aman walau jamnya lewat", () => {
    expect(
      peringatanEvent({ tanggal: "2026-10-17", status: "final", kloter: [{ no: 1, jam: "05.30", adaCaptain: true, anggota: 2, belumSiap: 0, status: ["siap", "berangkat"] }] }, kini),
    ).toEqual([]);
  });
});
