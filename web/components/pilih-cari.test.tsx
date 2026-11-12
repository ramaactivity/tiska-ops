import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PilihCari } from "./pilih-cari";

const MENU = [
  { id: "1", label: "Nasi Putih" },
  { id: "2", label: "Sate Ayam" },
];

describe("PilihCari + nama baru (D-163)", () => {
  it("nama baru hanya muncul sesudah mengetik, dan hilang kalau namanya persis ada", () => {
    const baru = vi.fn();
    render(<PilihCari pilihan={MENU} onPilih={() => {}} onTulisBaru={baru} />);
    const kotak = screen.getByRole("combobox");
    fireEvent.focus(kotak);
    expect(screen.queryByText(/Pakai nama baru/)).toBeNull();
    fireEvent.change(kotak, { target: { value: "nasi putih" } });
    expect(screen.queryByText(/Pakai nama baru/)).toBeNull();
    fireEvent.change(kotak, { target: { value: "Es Doger" } });
    fireEvent.click(screen.getByText(/Pakai nama baru/));
    expect(baru).toHaveBeenCalledWith("Es Doger");
  });

  it("Enter memilih yang ada di daftar, bukan nama baru", () => {
    const pilih = vi.fn();
    const baru = vi.fn();
    render(<PilihCari pilihan={MENU} onPilih={pilih} onTulisBaru={baru} />);
    const kotak = screen.getByRole("combobox");
    fireEvent.focus(kotak);
    fireEvent.change(kotak, { target: { value: "sate" } });
    fireEvent.keyDown(kotak, { key: "Enter" });
    expect(pilih).toHaveBeenCalledWith(MENU[1]);
    expect(baru).not.toHaveBeenCalled();
  });
});
