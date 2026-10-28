// @vitest-environment node
import { SignJWT } from "jose";
import { beforeAll, describe, expect, it } from "vitest";

import { bacaTokenSesi, kunciSesi, perpanjangTokenSesi, tandatanganiSesi, UMUR_SESI_DETIK } from "./token-sesi";

beforeAll(() => {
  process.env.AUTH_SECRET ??= "rahasia-uji-yang-cukup-panjang-untuk-hs256";
});

const tokenBerumur = (detikLalu: number) => {
  const iat = Math.floor(Date.now() / 1000) - detikLalu;
  return new SignJWT({ id: "7", nama: "Uji", peran: "sales" }).setProtectedHeader({ alg: "HS256" }).setIssuedAt(iat).setExpirationTime(iat + UMUR_SESI_DETIK).sign(kunciSesi());
};

describe("sesi 7 hari, diperpanjang selama dipakai (D-110)", () => {
  it("token baru berlaku 7 hari", async () => {
    const isi = await bacaTokenSesi(await tandatanganiSesi({ id: "7" }));
    expect(isi!.exp! - isi!.iat!).toBe(UMUR_SESI_DETIK);
  });

  it("belum sehari: tidak diperpanjang", async () => {
    expect(await perpanjangTokenSesi(await tokenBerumur(60 * 60 * 5))).toBeNull();
  });

  it("lebih dari sehari: diperpanjang 7 hari lagi, isi sesi tetap", async () => {
    const baru = await perpanjangTokenSesi(await tokenBerumur(60 * 60 * 30));
    const isi = await bacaTokenSesi(baru!);
    expect(isi).toMatchObject({ id: "7", nama: "Uji", peran: "sales" });
    expect(isi!.exp! - Math.floor(Date.now() / 1000)).toBeGreaterThan(UMUR_SESI_DETIK - 5);
  });

  it("sudah lewat 7 hari / palsu / kosong: tidak dihidupkan lagi", async () => {
    expect(await perpanjangTokenSesi(await tokenBerumur(UMUR_SESI_DETIK + 60))).toBeNull();
    expect(await perpanjangTokenSesi("bukan.token.sah")).toBeNull();
    expect(await perpanjangTokenSesi(undefined)).toBeNull();
  });
});
