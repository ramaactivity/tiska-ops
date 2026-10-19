/* Purchase Request (D-075): status & labelnya. Murni — dipakai server & browser. */

export const LABEL_STATUS_PR = {
  draft: "Draft",
  diajukan: "Menunggu Finance",
  disetujui: "Disetujui",
  selesai: "Selesai",
  batal: "Batal",
} as const;
export type StatusPr = keyof typeof LABEL_STATUS_PR;

/* PO supplier tempo (D-083). */
export const LABEL_STATUS_PO = {
  draft: "Draft",
  dikirim: "Dipesan",
  sebagian: "Diterima sebagian",
  diterima: "Diterima",
  batal: "Batal",
} as const;
export type StatusPo = keyof typeof LABEL_STATUS_PO;
