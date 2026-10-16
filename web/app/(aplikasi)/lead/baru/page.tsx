import type { Metadata } from "next";

import { Halaman, KepalaHalaman } from "@/components/halaman";
import { wajibIzin } from "@/lib/rbac";

import { FormLead } from "../form-lead";

export const metadata: Metadata = { title: "Lead baru" };

export default async function HalamanLeadBaru() {
  await wajibIzin("lead");
  return (
    <Halaman>
      <KepalaHalaman judul="Lead baru" keterangan="Catat calon customer sejak chat pertama — biar tidak ada yang lupa di-follow-up." />
      <FormLead
        batalHref="/lead"
        isi={{ name: "", phone: "", source: "wa", event_type: "", event_date: "", location: "", pax: "", service_form: "", budget: "", next_followup_at: "", notes: "" }}
      />
    </Halaman>
  );
}
