import { describe, expect, it } from "vitest";

import { tulisAvatar, uraiAvatar } from "./avatar";

describe("avatar", () => {
  it("kosong = username tanpa hijab; bolak-balik", () => {
    expect(uraiAvatar(null, "ariz")).toEqual({ seed: "ariz", hijab: false });
    expect(uraiAvatar("ariz-3|hijab", "ariz")).toEqual({ seed: "ariz-3", hijab: true });
    expect(tulisAvatar({ seed: "ariz", hijab: false }, "ariz")).toBeNull();
    expect(tulisAvatar({ seed: "ariz", hijab: true }, "ariz")).toBe("ariz|hijab");
  });
});

describe("hijab", () => {
  it("lapisan rambut diganti hijab", async () => {
    const { svgAvatar } = await import("./avatar-svg");
    const polos = svgAvatar("ariz", false);
    const hijab = svgAvatar("ariz", true);
    expect(polos).toContain('<g transform="translate(266 207)">');
    expect(hijab).not.toContain('<g transform="translate(266 207)">');
    expect(hijab).toContain('fill-rule="evenodd"');
  });
});
