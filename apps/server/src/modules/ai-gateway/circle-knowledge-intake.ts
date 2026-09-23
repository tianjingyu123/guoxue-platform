/** 自动采集的初筛只排除明显噪声；短但可能有价值的内容留给人工复核。 */
export function screenCircleKnowledge(text: string): "skip" | "review" | "eligible" {
  const plain = String(text || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&(?:nbsp|amp|lt|gt);/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  const compact = plain.replace(/[\s，。！？!?,.～~、；;：:（）()]+/g, "").toLowerCase();
  if (!compact) return "skip";
  if (/^(你好|您好|嗨|哈哈+|收到|明白|谢谢|谢谢老师|支持|顶|路过|签到|打卡|赞|好的|ok|666)+$/.test(compact)) return "skip";
  if (compact.length < 40) return "review";
  return "eligible";
}
