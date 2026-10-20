import "server-only";

import { prisma } from "./prisma";

/**
 * Uang yang sudah dibayar klien untuk satu event (D-102): invoice dari
 * quotation event itu + invoice yang tertaut langsung, kecuali yang dibatalkan.
 */
export async function dibayarEvent(e: { quotation_id: bigint; invoice_id: bigint | null }): Promise<number> {
  const r = await prisma.invoices.aggregate({
    where: { status: { not: "cancelled" }, OR: [{ quotation_id: e.quotation_id }, ...(e.invoice_id ? [{ id: e.invoice_id }] : [])] },
    _sum: { paid_amount: true },
  });
  return Number(r._sum.paid_amount ?? 0);
}
