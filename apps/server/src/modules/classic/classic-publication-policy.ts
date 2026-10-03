import { Prisma } from "@prisma/client";

/**
 * 公开古籍必须具备明确权利基础：开放许可、公版独立数字化、平台自有，
 * 或已完成内部授权登记的公司授权内容。内部审计字段不等于公开页面披露字段。
 *
 * 许可值采用受控枚举字符串；不要用 contains/startsWith 放宽匹配，避免把
 * CC-BY-NC 或来源方自称的模糊 "Open Data" 误判成可商用许可。
 */
export const COMMERCIAL_CLASSIC_LICENSES = [
  "CC-BY-SA-4.0",
  "CC-BY-SA-3.0",
  "CC-BY-4.0",
  "CC0-1.0",
  "PUBLIC-DOMAIN",
  "OWNED",
  "AUTHORIZED",
] as const;

export const PUBLIC_CLASSIC_BOOK_WHERE: Prisma.ClassicBookWhereInput = {
  status: "PUBLISHED",
  deletedAt: null,
  copyrights: {
    some: {
      license: { in: [...COMMERCIAL_CLASSIC_LICENSES] },
      auditedAt: { not: null },
    },
  },
};

export const PUBLIC_CLASSIC_COPYRIGHT_WHERE: Prisma.ClassicCopyrightWhereInput = {
  license: { in: [...COMMERCIAL_CLASSIC_LICENSES] },
  auditedAt: { not: null },
};
