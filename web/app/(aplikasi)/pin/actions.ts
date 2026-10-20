"use server";

import { pasangPin } from "@/lib/auth";
import { wajibSesi } from "@/lib/rbac";

/** Buat / ganti PIN & pasangkan HP ini (D-101). */
export async function simpanPin(pin: string): Promise<void> {
  await pasangPin(await wajibSesi(), pin);
}
