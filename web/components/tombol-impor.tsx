import { FileUp } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

/** Tombol menuju halaman impor Excel/CSV (D-073), dipasang di samping tombol Tambah. */
export function TombolImpor({ jenis }: { jenis: string }) {
  return (
    <Button variant="outline" className="rounded-full bg-card" render={<Link href={`/impor/${jenis}`} />}>
      <FileUp className="size-4" />
      Impor Excel / CSV
    </Button>
  );
}
