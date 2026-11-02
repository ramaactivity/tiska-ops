import { describe, expect, it } from "vitest";

import { jenisTautan, rapikanTautan } from "./aset";

describe("aset digital", () => {
  it("merapikan tautan yang ditempel", () => {
    expect(rapikanTautan("  https://drive.google.com/drive/folders/1AbC?usp=sharing ")).toBe("https://drive.google.com/drive/folders/1AbC?usp=sharing");
    expect(rapikanTautan("canva.com/design/DAF1/edit")).toBe("https://canva.com/design/DAF1/edit");
    expect(rapikanTautan("javascript:alert(1)")).toBeNull();
    expect(rapikanTautan("bukan link")).toBeNull();
    expect(rapikanTautan("localhost")).toBeNull();
    expect(rapikanTautan("")).toBeNull();
  });
  it("mengenali jenis tautan", () => {
    expect(jenisTautan("https://drive.google.com/drive/folders/1AbC").jenis).toBe("folder");
    expect(jenisTautan("https://drive.google.com/drive/u/0/folders/1AbC").jenis).toBe("folder");
    expect(jenisTautan("https://drive.google.com/file/d/1x/view").jenis).toBe("drive");
    expect(jenisTautan("https://docs.google.com/spreadsheets/d/1x/edit").jenis).toBe("sheets");
    expect(jenisTautan("https://docs.google.com/document/d/1x/edit").jenis).toBe("docs");
    expect(jenisTautan("https://www.canva.com/design/DAF1/view").jenis).toBe("canva");
    expect(jenisTautan("https://canva.link/abc").jenis).toBe("canva");
    expect(jenisTautan("https://www.dropbox.com/s/x")).toEqual({ jenis: "lain", label: "dropbox.com" });
  });
});
