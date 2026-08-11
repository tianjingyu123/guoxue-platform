import {
  COMMERCIAL_CLASSIC_LICENSES,
  PUBLIC_CLASSIC_BOOK_WHERE,
  PUBLIC_CLASSIC_COPYRIGHT_WHERE,
} from "./classic-publication-policy";

describe("古籍公开许可门禁", () => {
  it("只接受受控的可商用许可值，不包含非商业许可", () => {
    expect(COMMERCIAL_CLASSIC_LICENSES).toContain("CC-BY-SA-4.0");
    expect(COMMERCIAL_CLASSIC_LICENSES).toContain("OWNED");
    expect(COMMERCIAL_CLASSIC_LICENSES).not.toContain("CC-BY-NC-4.0");
  });

  it("图书必须已发布、未删除，并存在已审计许可台账", () => {
    expect(PUBLIC_CLASSIC_BOOK_WHERE).toMatchObject({
      status: "PUBLISHED",
      deletedAt: null,
      copyrights: {
        some: {
          auditedAt: { not: null },
        },
      },
    });
    expect(PUBLIC_CLASSIC_COPYRIGHT_WHERE).toMatchObject({
      auditedAt: { not: null },
    });
  });
});
