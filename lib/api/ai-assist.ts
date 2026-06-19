/**
 * AI 辅助 mock 生成（UI 壳，无真实 API）。
 * 迁移/联调阶段替换为真实模型调用即可，接口形状保持不变。
 */
import type { AIAssistRequest, AIAssistResult } from "@/lib/types/ai-assist"

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

export async function runAIAssist(req: AIAssistRequest): Promise<AIAssistResult> {
  await delay(900)
  const t = req.input.trim()
  switch (req.action) {
    case "polish":
      return { action: req.action, candidates: [`${t}——此句若稍加雕琢，更见从容：${t}，言简而意丰，娓娓道来。`] }
    case "classical":
      return { action: req.action, candidates: [`观君所言「${t}」，可雅化为：「${t}，诚哉斯言，余心有戚戚焉。」`] }
    case "expand":
      return { action: req.action, candidates: [`${t}。究其根本，此中道理可从三处细说：其一在心，其二在行，其三在恒，三者相成，方得圆满。`] }
    case "continue":
      return { action: req.action, candidates: [`${t}……顺此思绪而下，愈觉天地之广、学问之深，唯有勤勉以求，方不负光阴。`] }
    case "summarize":
      return { action: req.action, candidates: [`要点提炼：${t.slice(0, 12)}…—— 核心在于「知行合一」，余者皆为注脚。`] }
    case "title":
      return {
        action: req.action,
        candidates: [`论「${t.slice(0, 6)}」之道`, `${t.slice(0, 6)}：一份诚恳的体悟`, `从${t.slice(0, 4)}说开去`],
      }
    default:
      return { action: req.action, candidates: [t] }
  }
}
