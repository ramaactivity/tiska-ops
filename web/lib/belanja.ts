/* Purchase Request (D-075): status & labelnya. Murni — dipakai server & browser. */

export const LABEL_STATUS_PR = {
  draft: "Draft",
  diajukan: "Menunggu Finance",
  disetujui: "Disetujui",
  selesai: "Selesai",
  batal: "Batal",
} as const;
export type StatusPr = keyof typeof LABEL_STATUS_PR;
