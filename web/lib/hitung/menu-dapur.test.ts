import { describe, expect, it } from "vitest";

import { calonMirip, jarakEdit, kemiripanNama, saringMirip, skorCari } from "../cari-mirip";
import { buatPenentuMenu, type DataMenu, kunciMenu } from "./menu-dapur";

const menu = (id: string, name: string, adaResep = true, x: Partial<DataMenu> = {}): DataMenu => ({ id, name, active: true, adaResep, mergedInto: null, ...x });

describe("cari mirip", () => {
  it("toleran huruf besar-kecil, tanda baca, urutan kata, dan salah ketik tipis", () => {
    expect(skorCari("buncis jagung", "Tumis Buncis-Jagung Semi")).toBeGreaterThan(0.9);
    expect(skorCari("jagung buncis", "Tumis Buncis-Jagung Semi")).toBeGreaterThan(0);
    expect(skorCari("bunics", "Tumis Buncis Jagung Semi")).toBeGreaterThan(0); // dua huruf tertukar
    expect(skorCari("lidah cabe ijo", "Lidah Cabe Ijo (Box)")).toBe(1);
  });
  it("kata pendek harus persis supaya tidak asal cocok", () => {
    expect(skorCari("ijo", "Lidah Cabe Hijau")).toBe(0);
    expect(skorCari("sapi", "Sate Ayam")).toBe(0);
  });
  it("kata menempel tetap ketemu", () => {
    expect(skorCari("lemontea", "Es Lemon Tea / Sereh")).toBeGreaterThan(0.9);
  });
  it("urutan: memuat persis di depan, lalu yang mirip", () => {
    const d = ["Sate Ayam Madura", "Ayam Sate Bumbu", "Sate Ayan"];
    expect(saringMirip("sate ayam", d, (x) => x)).toEqual(["Sate Ayam Madura", "Ayam Sate Bumbu", "Sate Ayan"]);
  });
  it("jarak edit menghitung huruf tertukar sebagai satu", () => {
    expect(jarakEdit("buncis", "bunics")).toBe(1);
    expect(jarakEdit("kerupuk", "krupuk")).toBe(1);
  });
  it("kemiripan nama untuk saran: urutan kata & kata sajian diabaikan, beda masakan tidak setinggi kembar", () => {
    expect(kemiripanNama("Telur Pindang", "Pindang Telur")).toBe(1);
    expect(kemiripanNama("Nasi Putih", "Nasi Putih (Box)")).toBe(1);
    expect(kemiripanNama("Sambal (Sambal Bawang)", "Sambal Bawang")).toBe(1);
    expect(kemiripanNama("Tumis Buncis Jagung Manis", "Tumis Buncis Jagung Semi")).toBe(0.6);
    expect(kemiripanNama("Empal Suir 1/2", "Empal Suir")).toBe(0.5);
    expect(kemiripanNama("Nasi Kuning (Box)", "Nasi Kuning (Prasmanan)")).toBe(1);
    expect(kemiripanNama("Nasi Kuning (Box)", "Nasi Kuning (Prasmanan)", false)).toBe(0.5); // resep: box ≠ prasmanan
    expect(kemiripanNama("Air Mineral (Cleo Cup 220 ml)", "Air Mineral (Cleo Cup Botol 330 ml)")).toBe(0.6);
    expect(calonMirip("Tumis Wortel Buncis", ["Tumis Buncis dan Wortel", "Sop Buntut"], (x) => x).map((c) => c.x)).toEqual(["Tumis Buncis dan Wortel"]);
  });
});

describe("penentu menu dapur", () => {
  const data = [
    menu("1", "Tumis Buncis Jagung Semi"),
    menu("2", "Tumis Buncis-Jagung Semi", false),
    menu("3", "Sambal Bawang"),
    menu("4", "Empal Gepuk", true, { active: false, mergedInto: "5" }),
    menu("5", "Empal Gepuk Bandung"),
    menu("6", "Tumis Buncis Jagung Manis", false),
  ];
  const cari = buatPenentuMenu(data, [{ menuId: "3", name: "Sambal (Sambal Bawang)" }]);

  it("persis & kode paket di depan diabaikan", () => {
    expect(cari("Sambal Bawang")).toEqual({ id: "3", cara: "persis" });
    expect(kunciMenu("[PR-06] Lidah Cabe Ijo")).toBe("lidah cabe ijo");
  });
  it("menu kembar beda tanda baca: yang punya resep menang", () => {
    expect(cari("tumis buncis jagung semi")).toEqual({ id: "1", cara: "rapi" });
    expect(cari("Tumis Buncis-Jagung Semi")).toEqual({ id: "1", cara: "rapi" }); // nama persis menu kembar tanpa resep
  });
  it("nama lain & menu yang sudah digabung", () => {
    expect(cari("Sambal (Sambal Bawang)")).toEqual({ id: "3", cara: "nama lain" });
    expect(cari("EMPAL GEPUK")).toEqual({ id: "5", cara: "digabung" });
  });
  it("salah ketik satu huruf dihitung sebagai mirip; dua calon sama dekat tidak ditebak", () => {
    expect(cari("Tumis Bunciz Jagung Semi")).toEqual({ id: "1", cara: "mirip" });
    const ragu = buatPenentuMenu([menu("1", "Kerupuk Udang Besar"), menu("2", "Kerupuk Udang Beras")], []);
    expect(ragu("Kerupuk Udang Bears")).toBeNull();
    expect(cari("Sambal Bawan")).toEqual({ id: "3", cara: "mirip" }); // kurang satu huruf
    const pendek = buatPenentuMenu([menu("1", "Sop Iga")], []);
    expect(pendek("Sop Ika")).toBeNull(); // nama < 10 huruf tidak ditebak — terlalu mudah keliru
  });
  it("tidak menebak bila ragu", () => {
    expect(cari("Sop Iga")).toBeNull();
  });
});
