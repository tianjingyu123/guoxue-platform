import {
  PUBLIC_QUARANTINED_IDS,
  isPublicContentQuarantined,
  publicQuarantinedIds,
} from "./public-content-quarantine";

describe("公开内容精确隔离规则", () => {
  it("只命中清单中的类型与 ID 组合", () => {
    expect(isPublicContentQuarantined("product", PUBLIC_QUARANTINED_IDS.product[0])).toBe(true);
    expect(isPublicContentQuarantined("course", PUBLIC_QUARANTINED_IDS.course[0])).toBe(true);
    expect(isPublicContentQuarantined("video", PUBLIC_QUARANTINED_IDS.video[0])).toBe(true);
    expect(isPublicContentQuarantined("circle", PUBLIC_QUARANTINED_IDS.circle[0])).toBe(true);
    expect(isPublicContentQuarantined("PRODUCT", PUBLIC_QUARANTINED_IDS.product[0])).toBe(true);
    expect(isPublicContentQuarantined("product", "normal-product-id")).toBe(false);
    expect(isPublicContentQuarantined("article", PUBLIC_QUARANTINED_IDS.product[0])).toBe(false);
  });

  it("Prisma 过滤数组返回副本，调用方修改不会污染规则", () => {
    const ids = publicQuarantinedIds("product");
    ids.pop();
    expect(publicQuarantinedIds("product")).toHaveLength(PUBLIC_QUARANTINED_IDS.product.length);
  });
});
