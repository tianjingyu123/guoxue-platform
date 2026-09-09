/**
 * 古籍正文质量门槛。
 *
 * 这里只判断是否适合直接向读者发布，不修订原文，也不推测缺失内容。
 * P0 问题进入待审核；P1 问题保留给朗读清洗、人工复核或技术分段流程处理。
 */
export interface ClassicQualityChapter {
  title?: string | null;
  content?: string | null;
}

export interface ClassicContentQuality {
  totalChars: number;
  flags: string[];
  publishable: boolean;
}

const speechRiskCharacter = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B-\u200D\u2060\uFEFF\uE000-\uF8FF\u{F0000}-\u{FFFFD}\u{100000}-\u{10FFFD}]/gu;

export function assessClassicContent(
  chapters: ClassicQualityChapter[] | null | undefined,
): ClassicContentQuality {
  const normalized = Array.isArray(chapters) ? chapters : [];
  const lengths = normalized.map((chapter) => String(chapter.content || "").trim().length);
  const totalChars = lengths.reduce((sum, length) => sum + length, 0);
  const fullText = normalized.map((chapter) => chapter.content || "").join("\n");
  const flags: string[] = [];

  if (!normalized.length) flags.push("P0_NO_CHAPTERS");
  if (totalChars < 500) flags.push("P0_TOO_SHORT_FOR_FULL_BOOK");
  if (lengths.some((length) => length === 0)) flags.push("P0_EMPTY_CHAPTER");
  if (speechRiskCharacter.test(fullText)) flags.push("P1_SPEECH_RISK_CHARACTERS");
  speechRiskCharacter.lastIndex = 0;
  if (normalized.length === 1 && totalChars >= 4000) flags.push("P1_NEEDS_TECHNICAL_CHUNKS");

  return { totalChars, flags, publishable: !flags.some((flag) => flag.startsWith("P0_")) };
}
