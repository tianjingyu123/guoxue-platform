const INTERNAL_CLASSIC_COPY =
  /(?:本次候选|候选素材|数字来源|数据快照|冻结\s*Markdown|批次终审|定期\s*Codex\s*复核)/i;

/**
 * 将导入和审核阶段的内部说明转换为面向读者的简介。
 * 所有公开古籍入口共用，避免首页、推荐流与详情页口径不一致。
 */
export function toPublicClassicIntro(
  intro: string | null | undefined,
  title: string,
): string {
  const raw = (intro || "").trim();
  const isInternalCopy =
    !raw ||
    /^来源[:：]/.test(raw) ||
    /殆知阁收录古籍/.test(raw) ||
    INTERNAL_CLASSIC_COPY.test(raw) ||
    /原文共\s*\d+\s*字/.test(raw) ||
    /共\s*\d+\s*章，\s*\d+\s*字/.test(raw);

  return isInternalCopy ? `《${title}》，中华传统典籍，点击阅读全文。` : raw;
}
