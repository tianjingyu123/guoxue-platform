import { Prisma } from "@prisma/client";

/**
 * 首发古籍只公开已经完成来源审计、且许可允许商业发布的内容。
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
