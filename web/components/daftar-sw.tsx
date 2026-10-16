"use client";

import { useEffect } from "react";

/** Mendaftarkan service worker (D-053) — hanya di produksi, supaya dev tidak tertahan cache. */
export function DaftarSw() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Gagal mendaftar bukan alasan aplikasi berhenti.
    });
  }, []);
  return null;
}
