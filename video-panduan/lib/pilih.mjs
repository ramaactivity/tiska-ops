// Cara menunjuk elemen di aplikasi untuk naskah (sorot / ketuk / gulirKe). Semua mengembalikan (p) => Locator.
export const tombol = (nama) => (p) => p.getByRole("button", { name: nama });
export const tautan = (nama) => (p) => p.getByRole("link", { name: nama });
export const teks = (t) => (p) => p.getByText(t, { exact: false });
export const kolom = (label) => (p) => p.getByLabel(label);
export const isian = (placeholder) => (p) => p.getByPlaceholder(placeholder);
export const css = (sel) => (p) => p.locator(sel);
// Kartu utuh yang memuat teks itu (wadah terdekat berkelas "rounded"), mis. kartu angka di dashboard.
export const kartu = (t) => (p) => p.getByText(t, { exact: false }).first().locator("xpath=ancestor::*[contains(@class,'rounded')][1]");
// Satu baris daftar yang bisa diketuk (tautan) dan memuat teks itu, mis. satu quotation di daftar.
export const baris = (t) => (p) => p.locator("a", { hasText: t });
