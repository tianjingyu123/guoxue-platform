export const API_PREFIX = "/api/v1";

export const CONTENT_TYPE_LABELS: Record<string, string> = {
  ARTICLE: "文章",
  POEM: "诗词",
  CLASSIC: "经典",
};

export const PAGE_SIZE_DEFAULT = 10;

// ── 工具注册表 ──
export * from "./tools-catalog";

// ── 排盘颜色令牌 + 设计约束 ──
export * from "./paipan-tokens";
