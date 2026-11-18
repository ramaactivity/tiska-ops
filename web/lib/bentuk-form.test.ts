import { describe, expect, it } from "vitest";

import type { IsiAwal } from "@/components/form-dokumen";

import { pakaiLagi } from "./bentuk-form";

describe("pakaiLagi (D-202)", () => {
  const lama = {
    id: "12",
    customer_id: "3",
    tanggal: "2026-11-02",
    tanggal_akhir: "2026-11-16",
    event_dates: [{ kunci: "a", tanggal: "2026-11-05" }],
    po_reference: "PO-778",
    notes: "Dikonversi dari Penawaran QUO-TC-2611-001",
    items: [{ kunci: "91", item_name: "Lunch box", price: "48.500", sesi_tanggal: "2026-11-05", sesi_jam: "12.00", children: [{ kunci: "91-0", item_name: "Nasi putih" }] }],
  } as unknown as IsiAwal;

  it("isi ikut, tanggal & nomor milik pesanan lama dikosongkan", () => {
    const baru = pakaiLagi(lama, "2026-11-18", "2026-12-02");
    expect(baru.id).toBeUndefined();
    expect([baru.customer_id, baru.tanggal, baru.tanggal_akhir, baru.po_reference, baru.notes]).toEqual(["3", "2026-11-18", "2026-12-02", "", ""]);
    expect(baru.event_dates).toEqual([]);
    expect(baru.items[0]).toMatchObject({ item_name: "Lunch box", price: "48.500", sesi_tanggal: undefined, sesi_jam: "12.00" });
    expect(baru.items[0].children?.[0].item_name).toBe("Nasi putih");
  });

  it("catatan biasa tetap ikut", () => {
    expect(pakaiLagi({ ...lama, notes: "Harga sudah termasuk ongkir" }, "2026-11-18", "2026-12-02").notes).toBe("Harga sudah termasuk ongkir");
  });
});
