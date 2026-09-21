/**
 * 朗读文本清理。
 *
 * 原文绝不在这里修改；这个函数只生成送往语音服务的临时副本。
 * 控制符、零宽字符和私用区字形常会让不同的 TTS 引擎中断或直接拒绝请求，
 * 所以将它们转换为可读的停顿或“缺字”提示。
 */
export function normalizeSpeechText(input: string): string {
  return input
    // 保留换行和制表符，其余 C0/C1 控制符都不能进入 XML/语音接口。
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, " ")
    // 这些是常见的复制网页、OCR 和富文本遗留的不可见字符。
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, " ")
    // 私用区字符没有通用读音，保留“此处原文有未识别字”的语义提示。
    .replace(/[\uE000-\uF8FF\u{F0000}-\u{FFFFD}\u{100000}-\u{10FFFD}]/gu, "〔缺字〕")
    // 避免 OCR 产生的连续缺字提示把一句话撑得过长。
    .replace(/(?:〔缺字〕\s*){2,}/g, "〔缺字〕")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}
