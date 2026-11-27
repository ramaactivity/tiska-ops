import { expect, it } from "vitest";

import { pilihSuara, suaraNatural } from "./kontrol-dapur";

const v = (name: string, lang: string) => ({ name, lang });

it("pilihSuara: neural Edge > Google > bawaan sistem; hanya bahasa Indonesia", () => {
  const mac = [v("Damayanti", "id-ID"), v("Samantha", "en-US")];
  const chrome = [...mac, v("Google Bahasa Indonesia", "id-ID")];
  const edge = [...chrome, v("Microsoft Ardi Online (Natural) - Indonesian (Indonesia)", "id-ID"), v("Microsoft Gadis Online (Natural) - Indonesian (Indonesia)", "id-ID")];
  expect(pilihSuara(mac)?.name).toBe("Damayanti");
  expect(pilihSuara(chrome)?.name).toBe("Google Bahasa Indonesia");
  expect(pilihSuara(edge)?.name).toMatch(/^Microsoft Gadis/);
  expect(pilihSuara([v("Samantha", "en-US")])).toBeNull();
  expect(pilihSuara([v("Indonesian", "in_ID")])?.name).toBe("Indonesian");
});

it("suaraNatural", () => {
  expect(suaraNatural("Microsoft Gadis Online (Natural) - Indonesian (Indonesia)")).toBe(true);
  expect(suaraNatural("Google Bahasa Indonesia")).toBe(true);
  expect(suaraNatural("Damayanti")).toBe(false);
  expect(suaraNatural(null)).toBe(false);
});
