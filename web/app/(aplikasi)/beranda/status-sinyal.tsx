"use client";

import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Tanpa sinyal (D-098): halaman ini bisa jadi salinan terakhir dari service
 * worker — beri tahu jam datanya, dan bahwa tombol baru jalan lagi saat ada sinyal.
 */
export function StatusSinyal({ diperbarui }: { diperbarui: string }) {
  const [daring, setDaring] = useState(true);
  useEffect(() => {
    const ubah = () => setDaring(navigator.onLine);
    ubah();
    window.addEventListener("online", ubah);
    window.addEventListener("offline", ubah);
    return () => {
      window.removeEventListener("online", ubah);
      window.removeEventListener("offline", ubah);
    };
  }, []);
  if (daring) return null;
  return (
    <div role="status" className="mb-3 flex items-start gap-3 rounded-2xl border border-perhatian-garis bg-perhatian-halus p-4 text-base text-perhatian">
      <WifiOff className="mt-0.5 size-5 shrink-0" />
      <p>
        <b>Tidak ada sinyal.</b> Ini jadwal terakhir (diperbarui jam {diperbarui}). Tombol Siap & status kirim jalan lagi begitu ada sinyal.
      </p>
    </div>
  );
}
