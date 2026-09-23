/** 只允许跳转平台公开详情页，任何外部 URL 均不从 AI 卡片打开。 */
export function canOpenAiGuideTarget(target: string): boolean {
  return /^\/(pkg-classics\/detail\/index|pkg-circle\/(articles|circles)\/detail|pkg-course\/detail\/index)\?id=[^&#]+$/.test(target)
}

export function shouldShowLearningGuide(query: string): boolean {
  if (/退款|投诉|举报|客服|失败|打不开|扣费|余额|你好|谢谢/.test(query)) return false
  return /古籍|原文|论语|诗词|经史|典故|这句|是什么意思|怎么理解|学习|入门|课程|阅读|书|篇/.test(query)
}

/** 古籍问答默认只引导免费阅读；用户明确找课程/圈子时才显示对应入口。 */
export function selectReadingGuideCards<T extends { type: string; target: string }>(cards: T[], query: string): T[] {
  const wantsCourseOrCircle = /课程|上课|圈子|社群/.test(query)
  return cards
    .filter((card) => canOpenAiGuideTarget(card.target)
      && (card.type === 'classic' || card.type === 'article'
        || (wantsCourseOrCircle && (card.type === 'course' || card.type === 'circle'))))
    .slice(0, 2)
}
