/**
 * 成就卡片 canvas 渲染引擎（峰值时刻母版）
 *
 * 纯函数绘制：宣纸纹理底 + 鎏金双边框 + 故宫红印章标题 + 数据网格 +
 * AI 感言 + 品牌落款 + 二维码引导。证书与读后小结共用骨架，按类型微调。
 * 品牌露出引用 BRAND 常量，与海报母版口径一致。
 */

import { BRAND } from "@/lib/brand"
import { ACHIEVEMENT_META, ACHIEVEMENT_SIZE, type AchievementData } from "@/lib/types/achievement"

const FONT_SERIF = `"Noto Serif SC", "Songti SC", serif`
const FONT_SANS = `"Noto Sans SC", system-ui, sans-serif`

// 国风配色（与海报母版一致）
const C = {
  paper: "#f7f0e3",
  paperDark: "#efe4cf",
  brand: "#c41e3a",
  gold: "#c9a96e",
  goldSoft: "#e8d5b5",
  ink: "#2c2620",
  inkSoft: "#7a6f60",
}

export interface RenderCardOptions {
  ctx: CanvasRenderingContext2D
  data: AchievementData
  qrImage?: HTMLImageElement | null
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

// 宣纸肌理底
function drawPaper(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, C.paper)
  g.addColorStop(1, C.paperDark)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  ctx.save()
  ctx.globalAlpha = 0.04
  for (let i = 0; i < 1400; i++) {
    ctx.fillStyle = i % 2 ? "#000" : "#fff"
    ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1)
  }
  ctx.restore()
}

// 鎏金双边框 + 四角云纹
function drawGoldFrame(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.strokeStyle = C.gold
  ctx.lineWidth = 2.5
  roundRect(ctx, 16, 16, w - 32, h - 32, 8)
  ctx.stroke()
  ctx.strokeStyle = C.goldSoft
  ctx.lineWidth = 1
  roundRect(ctx, 24, 24, w - 48, h - 48, 5)
  ctx.stroke()
  ctx.strokeStyle = C.gold
  ctx.lineWidth = 2
  const corners: [number, number, number, number][] = [
    [30, 30, 1, 1],
    [w - 30, 30, -1, 1],
    [30, h - 30, 1, -1],
    [w - 30, h - 30, -1, -1],
  ]
  for (const [cxx, cyy, dx, dy] of corners) {
    ctx.beginPath()
    ctx.moveTo(cxx, cyy + dy * 14)
    ctx.lineTo(cxx, cyy)
    ctx.lineTo(cxx + dx * 14, cyy)
    ctx.stroke()
  }
}

// 故宫红印章
function drawSeal(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.save()
  ctx.fillStyle = C.brand
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = "rgba(255,255,255,0.55)"
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(cx, cy, r - 5, 0, Math.PI * 2)
  ctx.stroke()
  ctx.fillStyle = "#fff"
  ctx.font = `700 ${r * 0.62}px ${FONT_SERIF}`
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(BRAND.nameShort, cx, cy + 1)
  ctx.restore()
  ctx.textBaseline = "alphabetic"
  ctx.textAlign = "left"
}

export function renderAchievementCard({ ctx, data, qrImage }: RenderCardOptions) {
  const { width: w, height: h } = ACHIEVEMENT_SIZE
  const meta = ACHIEVEMENT_META[data.type]
  const cx = w / 2

  drawPaper(ctx, w, h)
  drawGoldFrame(ctx, w, h)

  // 顶部品牌区
  drawSeal(ctx, cx, 62, 22)
  ctx.textAlign = "center"
  ctx.fillStyle = C.inkSoft
  ctx.font = `12px ${FONT_SANS}`
  ctx.fillText(`${BRAND.name} · ${BRAND.slogan}`, cx, 102)

  // 主标题
  ctx.fillStyle = C.brand
  ctx.font = `700 30px ${FONT_SERIF}`
  ctx.fillText(meta.sealTitle, cx, 150)
  ctx.fillStyle = C.gold
  ctx.font = `10px ${FONT_SANS}`
  ctx.fillText(meta.enTitle, cx, 170)

  // 用户名
  ctx.fillStyle = C.ink
  ctx.font = `700 24px ${FONT_SANS}`
  ctx.fillText(data.userName, cx, 212)

  // 完成说明
  ctx.fillStyle = C.inkSoft
  ctx.font = `14px ${FONT_SANS}`
  ctx.fillText(meta.doneText(data.subject), cx, 242)

  // 数据网格
  const stats = data.stats.slice(0, 3)
  const gridTop = 278
  const colW = (w - 80) / stats.length
  stats.forEach((s, i) => {
    const colX = 40 + colW * i + colW / 2
    ctx.fillStyle = C.brand
    ctx.font = `700 22px ${FONT_SERIF}`
    ctx.textAlign = "center"
    ctx.fillText(s.value, colX, gridTop + 4)
    ctx.fillStyle = C.inkSoft
    ctx.font = `12px ${FONT_SANS}`
    ctx.fillText(s.label, colX, gridTop + 26)
    if (i < stats.length - 1) {
      ctx.strokeStyle = C.goldSoft
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(40 + colW * (i + 1), gridTop - 12)
      ctx.lineTo(40 + colW * (i + 1), gridTop + 24)
      ctx.stroke()
    }
  })

  // AI 感言
  const quoteY = gridTop + 64
  ctx.textAlign = "center"
  ctx.fillStyle = C.gold
  ctx.font = `700 26px ${FONT_SERIF}`
  ctx.fillText("\u201c", cx, quoteY)
  ctx.fillStyle = C.ink
  ctx.font = `15px ${FONT_SERIF}`
  const maxW = w - 90
  const linesArr: string[] = []
  let line = ""
  for (const ch of data.aiComment) {
    if (ctx.measureText(line + ch).width > maxW) {
      linesArr.push(line)
      line = ch
    } else line += ch
  }
  if (line) linesArr.push(line)
  linesArr.slice(0, 3).forEach((ln, i) => {
    ctx.fillText(ln, cx, quoteY + 26 + i * 24)
  })

  // 底部分隔线
  const footY = h - 96
  ctx.strokeStyle = C.goldSoft
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(40, footY)
  ctx.lineTo(w - 40, footY)
  ctx.stroke()

  // 底部左：日期 / 讲师 / 编号
  ctx.textAlign = "left"
  ctx.fillStyle = C.inkSoft
  ctx.font = `11px ${FONT_SANS}`
  ctx.fillText(`日期 ${data.date}`, 40, footY + 22)
  if (data.instructor) ctx.fillText(`讲师 ${data.instructor}`, 40, footY + 40)
  if (data.serialNo) ctx.fillText(`编号 ${data.serialNo}`, 40, footY + (data.instructor ? 58 : 40))

  // 底部右：二维码 + 引导
  const qrSize = 50
  const qrX = w - 40 - qrSize
  const qrY = footY + 14
  if (qrImage) {
    ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize)
  } else {
    ctx.strokeStyle = C.gold
    ctx.lineWidth = 1
    roundRect(ctx, qrX, qrY, qrSize, qrSize, 4)
    ctx.stroke()
    ctx.fillStyle = C.inkSoft
    ctx.font = `9px ${FONT_SANS}`
    ctx.textAlign = "center"
    ctx.fillText("二维码", qrX + qrSize / 2, qrY + qrSize / 2 + 3)
  }
  ctx.fillStyle = C.inkSoft
  ctx.font = `9px ${FONT_SANS}`
  ctx.textAlign = "center"
  ctx.fillText("扫码加入热卜国学", qrX + qrSize / 2, qrY + qrSize + 14)

  ctx.textAlign = "left"
}
