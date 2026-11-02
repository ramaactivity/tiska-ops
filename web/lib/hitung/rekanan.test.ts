import { describe, expect, it } from "vitest";

import { feeInvoice, statusPartnerFee, tebakJenisKlien } from "./rekanan";

describe("customer & rekanan", () => {
  it("tebak jenis klien dari nama", () => {
    expect(tebakJenisKlien("PT. Alim Rugi Hoyong Untung")).toBe("perusahaan");
    expect(tebakJenisKlien("CV Maju Jaya")).toBe("perusahaan");
    expect(tebakJenisKlien("Bank BJB Cabang Bogor")).toBe("perusahaan");
    expect(tebakJenisKlien("Dinas Pendidikan Kota Bogor")).toBe("instansi");
    expect(tebakJenisKlien("Ibu Rahmi-KLHK")).toBe("instansi");
    expect(tebakJenisKlien("Yayasan Al-Azhar")).toBe("organisasi");
    expect(tebakJenisKlien("SMA Negeri 1 Bogor")).toBe("organisasi");
    expect(tebakJenisKlien("Arisan Ibu-ibu Komplek Bukit")).toBe("kelompok");
    expect(tebakJenisKlien("Komunitas Lari Bogor")).toBe("kelompok");
    expect(tebakJenisKlien("Ibu Dina")).toBe("perorangan");
    expect(tebakJenisKlien("Ptolemy Rahman")).toBe("perorangan");
  });
  it("status Partner Fee: siap setelah klien lunas", () => {
    expect(statusPartnerFee("partial", false)).toBe("menunggu");
    expect(statusPartnerFee("paid", false)).toBe("siap");
    expect(statusPartnerFee("paid", true)).toBe("dibayar");
  });
  it("Partner Fee = % × nilai makanan; % rekanan menggantikan bawaan", () => {
    expect(feeInvoice("11912500", null, 3.5)).toEqual({ pct: 3.5, jumlah: 416938 });
    expect(feeInvoice("10000000", "5", 3.5)).toEqual({ pct: 5, jumlah: 500000 });
    expect(feeInvoice("10000000", "0", 3.5)).toEqual({ pct: 0, jumlah: 0 });
  });
});
