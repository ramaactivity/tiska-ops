/** Cara customer menyetujui quotation (01-SPEC E.12, D-044). Murni. */
export const CARA_SETUJU = {
  wa: "WhatsApp",
  telepon: "Telepon",
  email: "Email",
  tanda_tangan: "Tanda tangan",
  langsung: "Langsung / tatap muka",
} as const;
export type CaraSetuju = keyof typeof CARA_SETUJU;
