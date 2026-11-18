"use client";

import { useEffect } from "react";

/**
 * Menyalakan pembuat PDF di server lebih dulu (D-207) dari halaman detail invoice/quotation/payment, supaya
 * pratinjau halaman & Unduh PDF tidak menunggu server bangun (±10 dtk). Paling sering sekali per 5 menit per tab.
 */
export function HangatkanPdf() {
  useEffect(() => {
    try {
      if (Date.now() - Number(sessionStorage.getItem("pdf-hangat") ?? 0) < 300_000) return;
      sessionStorage.setItem("pdf-hangat", String(Date.now()));
    } catch {
      // Tanpa penyimpanan tab: tetap dihangatkan.
    }
    void fetch("/api/pdf?hangat=1").catch(() => null);
  }, []);
  return null;
}
