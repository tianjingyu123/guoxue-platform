// 国风分享海报绘制引擎（母版系统）
// 纯函数式：输入数据 + 模板规格，输出绘制好的 canvas。
// 可被任意海报场景复用（邀请/课程/商品/文章/直播/名片/圈子）。
// 视觉语言：故宫红 + 宣纸底 + 鎏金 + 思源宋体 + 传统纹样 + 印章落款。

import type { PosterData, PosterType } from '@/lib/types/poster'
import { BRAND, brandRecommendByType } from '@/lib/brand'

// ===== 字体常量（与 layout.tsx 加载的思源字体一致）=====
const FONT_SERIF = '"Noto Serif SC", "Songti SC", serif' // 标题
const FONT_SANS = '"Noto Sans SC", "PingFang SC", sans-serif' // 正文

// ===== 模板规格类型 =====
export interface PosterTheme {
  id: string
  name: string
  // 底色与主色
  bg: string
  paper: string // 宣纸底
  ink: string // 墨色（主文字）
  inkSoft: string // 次要文字
  brand: string // 故宫红
  gold: string // 鎏金
  // 顶部装饰风格
  headerStyle: 'solid' | 'wash' | 'dark'
}

// ===== 引擎入口 =====
export interface RenderOptions {
  ctx: CanvasRenderingContext2D
  data: PosterData
  theme: PosterTheme
  width: number
  height: number
  qrImage?: HTMLImageElement | null
  coverImage?: HTMLImageElement | null
  avatarImage?: HTMLImageElement | null
}

// 圆角矩形路径
function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

// 多行文本，返回结束 y
function drawMultiline(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
  align: CanvasTextAlign = 'left',
): number {
  ctx.textAlign = align
  const chars = Array.from(text)
  let line = ''
  let lines = 0
  let curY = y
  for (let i = 0; i < chars.length; i++) {
    const test = line + chars[i]
    if (ctx.measureText(test).width > maxWidth && line) {
      if (lines >= maxLines - 1) {
        ctx.fillText(line.slice(0, -1) + '…', x, curY)
        return curY
      }
      ctx.fillText(line, x, curY)
      line = chars[i]
      curY += lineHeight
      lines++
    } else {
      line = test
    }
  }
  ctx.fillText(line, x, curY)
  return curY
}

// ===== 母版组件 1：宣纸肌理底 =====
function drawPaperTexture(ctx: CanvasRenderingContext2D, w: number, h: number, theme: PosterTheme) {
  ctx.fillStyle = theme.paper
  ctx.fillRect(0, 0, w, h)
  // 细微噪点纹理（宣纸质感）
  ctx.save()
  ctx.globalAlpha = 0.035
  for (let i = 0; i < 1400; i++) {
    const x = Math.random() * w
    const y = Math.random() * h
    const s = Math.random() * 1.4
    ctx.fillStyle = Math.random() > 0.5 ? theme.ink : theme.brand
    ctx.fillRect(x, y, s, s)
  }
  ctx.restore()
}

// ===== 母版组件 2：云纹角花（四角传统纹样）=====
function drawCloudCorner(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  rotation: number,
  color: string,
) {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(rotation)
  ctx.strokeStyle = color
  ctx.lineWidth = 1.5
  ctx.globalAlpha = 0.5
  // 回纹 + 卷云
  ctx.beginPath()
  ctx.arc(0, 0, size * 0.5, Math.PI, Math.PI * 1.6)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(size * 0.2, -size * 0.2, size * 0.28, Math.PI * 0.8, Math.PI * 1.8)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(0, 0, size * 0.22, Math.PI, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

// ===== 母版组件 3：顶部装饰（按主题切换风格）=====
function drawHeader(ctx: CanvasRenderingContext2D, w: number, theme: PosterTheme) {
  const headerH = 132
  if (theme.headerStyle === 'wash') {
    // 水墨晕染：从主色到透明的纵向渐变
    const g = ctx.createLinearGradient(0, 0, 0, headerH)
    g.addColorStop(0, theme.brand)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.globalAlpha = 0.16
    ctx.fillRect(0, 0, w, headerH)
    ctx.globalAlpha = 1
  } else if (theme.headerStyle === 'dark') {
    const g = ctx.createLinearGradient(0, 0, w, headerH)
    g.addColorStop(0, '#1A1A1A')
    g.addColorStop(1, '#2B2118')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, headerH)
  } else {
    // solid 故宫红横幅
    const g = ctx.createLinearGradient(0, 0, w, headerH)
    g.addColorStop(0, theme.brand)
    g.addColorStop(1, '#8B1538')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, headerH)
  }
  // 鎏金细线分隔
  ctx.strokeStyle = theme.gold
  ctx.globalAlpha = theme.headerStyle === 'wash' ? 0.6 : 0.85
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(24, headerH - 0.5)
  ctx.lineTo(w - 24, headerH - 0.5)
  ctx.stroke()
  ctx.globalAlpha = 1
  return headerH
}

// ===== 母版组件 4：印章式品牌落款 =====
function drawSeal(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, theme: PosterTheme) {
  ctx.save()
  // 朱红印章方块
  roundRectPath(ctx, x, y, size, size, 6)
  ctx.fillStyle = theme.brand
  ctx.fill()
  // 印章文字「热卜」
  ctx.fillStyle = '#FFF'
  ctx.font = `600 ${size * 0.34}px ${FONT_SERIF}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('热', x + size * 0.3, y + size * 0.32)
  ctx.fillText('卜', x + size * 0.7, y + size * 0.32)
  ctx.fillText('国', x + size * 0.3, y + size * 0.7)
  ctx.fillText('学', x + size * 0.7, y + size * 0.7)
  ctx.textBaseline = 'alphabetic'
  ctx.restore()
}

// ===== 母版组件 4.5：顶部品牌区（Logo 印章 + 品牌名 + Slogan）=====
// 品牌露出母版级强制项：每张海报顶部统一展示，口径来自 BRAND 常量。
function drawBrandHeader(ctx: CanvasRenderingContext2D, theme: PosterTheme, headerText: string) {
  // 左侧 Logo 印章标识
  const logoSize = 38
  const logoX = 28
  const logoY = 28
  roundRectPath(ctx, logoX, logoY, logoSize, logoSize, 7)
  ctx.fillStyle = theme.gold
  ctx.fill()
  ctx.fillStyle = theme.brand
  ctx.font = `700 ${logoSize * 0.5}px ${FONT_SERIF}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(BRAND.nameShort.charAt(0), logoX + logoSize / 2, logoY + logoSize / 2 + 1)
  ctx.textBaseline = 'alphabetic'

  // 右侧品牌名 + Slogan
  const textX = logoX + logoSize + 12
  ctx.textAlign = 'left'
  ctx.fillStyle = headerText
  ctx.font = `700 21px ${FONT_SERIF}`
  ctx.fillText(BRAND.name, textX, logoY + 18)
  ctx.fillStyle = theme.gold
  ctx.font = `12px ${FONT_SANS}`
  ctx.fillText(`${BRAND.slogan} · ${BRAND.nameEn}`, textX, logoY + 36)
}

// ===== 母版组件 5：二维码卡片 =====
function drawQrCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  theme: PosterTheme,
  qrImage: HTMLImageElement | null | undefined,
  hint: string,
) {
  // 卡片底
  roundRectPath(ctx, x, y, w, h, 14)
  ctx.fillStyle = theme.headerStyle === 'dark' ? 'rgba(255,255,255,0.06)' : '#FFFFFF'
  ctx.fill()
  ctx.strokeStyle = theme.gold
  ctx.globalAlpha = 0.4
  ctx.lineWidth = 1
  roundRectPath(ctx, x, y, w, h, 14)
  ctx.stroke()
  ctx.globalAlpha = 1
  // 二维码
  const qrSize = h - 28
  const qrX = x + 16
  const qrY = y + 14
  if (qrImage) {
    ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize)
  } else {
    ctx.fillStyle = '#EAEAEA'
    roundRectPath(ctx, qrX, qrY, qrSize, qrSize, 6)
    ctx.fill()
  }
  // 提示文字
  const textX = qrX + qrSize + 18
  ctx.textAlign = 'left'
  ctx.fillStyle = theme.headerStyle === 'dark' ? '#F5F0E8' : theme.ink
  ctx.font = `600 16px ${FONT_SERIF}`
  ctx.fillText('扫码', textX, y + h * 0.42)
  ctx.fillText(hint, textX, y + h * 0.42 + 24)
  ctx.fillStyle = theme.inkSoft
  ctx.font = `12px ${FONT_SANS}`
  ctx.fillText(BRAND.qrGuide, textX, y + h - 18)
}

// ===== 主绘制流程 =====
export function renderPoster(opts: RenderOptions) {
  const { ctx, data, theme, width: w, height: h, qrImage, coverImage, avatarImage } = opts

  // 1. 宣纸底
  drawPaperTexture(ctx, w, h, theme)

  // 2. 顶部装饰
  const headerH = drawHeader(ctx, w, theme)

  // 3. 四角云纹
  drawCloudCorner(ctx, 18, headerH + 28, 30, 0, theme.gold)
  drawCloudCorner(ctx, w - 18, headerH + 28, 30, Math.PI / 2, theme.gold)
  drawCloudCorner(ctx, 18, h - 90, 30, -Math.PI / 2, theme.gold)
  drawCloudCorner(ctx, w - 18, h - 90, 30, Math.PI, theme.gold)

  const headerText = theme.headerStyle === 'wash' ? theme.ink : '#FFFFFF'

  // 4. 顶部品牌区（母版级强制项：Logo 标识 + 品牌名 + Slogan）
  drawBrandHeader(ctx, theme, headerText)

  // 5. 主体内容（按类型）
  let y = headerH + 56
  const padX = 28
  const contentW = w - padX * 2

  renderBody(ctx, data, theme, w, h, padX, contentW, y, coverImage, avatarImage)

  // 6. 二维码卡片（统一底部）
  const cardY = h - 156
  drawQrCard(ctx, padX, cardY, contentW, 96, theme, qrImage, hintByType(data.type))

  // 7. 印章落款
  drawSeal(ctx, w - padX - 44, cardY - 60, 44, theme)

  // 8. 底部版权
  ctx.fillStyle = theme.inkSoft
  ctx.font = `11px ${FONT_SANS}`
  ctx.textAlign = 'center'
  ctx.fillText(BRAND.copyright, w / 2, h - 28)
}

// 主体内容分发
function renderBody(
  ctx: CanvasRenderingContext2D,
  data: PosterData,
  theme: PosterTheme,
  w: number,
  h: number,
  padX: number,
  contentW: number,
  startY: number,
  coverImage?: HTMLImageElement | null,
  avatarImage?: HTMLImageElement | null,
) {
  let y = startY

  // 封面图（课程/商品/文章）
  if (coverImage && (data.type === 'course' || data.type === 'product' || data.type === 'article')) {
    const ch = 168
    ctx.save()
    roundRectPath(ctx, padX, y, contentW, ch, 12)
    ctx.clip()
    const ratio = Math.max(contentW / coverImage.width, ch / coverImage.height)
    const dw = coverImage.width * ratio
    const dh = coverImage.height * ratio
    ctx.drawImage(coverImage, padX + (contentW - dw) / 2, y + (ch - dh) / 2, dw, dh)
    ctx.restore()
    // 鎏金描边
    ctx.strokeStyle = theme.gold
    ctx.globalAlpha = 0.4
    roundRectPath(ctx, padX, y, contentW, ch, 12)
    ctx.stroke()
    ctx.globalAlpha = 1
    y += ch + 28
  }

  // 名片：头像居中
  if (data.type === 'profile' && avatarImage) {
    const size = 84
    ctx.save()
    ctx.beginPath()
    ctx.arc(w / 2, y + size / 2, size / 2, 0, Math.PI * 2)
    ctx.clip()
    ctx.drawImage(avatarImage, (w - size) / 2, y, size, size)
    ctx.restore()
    ctx.strokeStyle = theme.gold
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(w / 2, y + size / 2, size / 2, 0, Math.PI * 2)
    ctx.stroke()
    y += size + 26
  }

  // 标题
  ctx.fillStyle = theme.ink
  ctx.font = `700 26px ${FONT_SERIF}`
  const titleAlign = data.type === 'profile' ? 'center' : 'left'
  const titleX = data.type === 'profile' ? w / 2 : padX
  y = drawMultiline(ctx, data.title, titleX, y, contentW, 36, 2, titleAlign)
  y += 30

  // 副标题
  if (data.subtitle) {
    ctx.fillStyle = theme.brand
    ctx.font = `15px ${FONT_SANS}`
    y = drawMultiline(ctx, data.subtitle, titleX, y, contentW, 24, 1, titleAlign)
    y += 28
  }

  // 描述（缺省时用按类型品牌推荐语，确保每张海报都有文化质感文字）
  const desc = data.description || brandRecommendByType(data.type, data.title)
  if (desc) {
    ctx.fillStyle = theme.inkSoft
    ctx.font = `14px ${FONT_SANS}`
    y = drawMultiline(ctx, desc, titleX, y, contentW, 24, 3, titleAlign)
    y += 30
  }

  // 价格（课程/商品）
  if (data.price !== undefined) {
    ctx.textAlign = 'left'
    ctx.fillStyle = theme.brand
    ctx.font = `700 30px ${FONT_SERIF}`
    ctx.fillText(`¥${data.price}`, padX, y)
    const pw = ctx.measureText(`¥${data.price}`).width
    if (data.originalPrice) {
      ctx.fillStyle = theme.inkSoft
      ctx.font = `15px ${FONT_SANS}`
      const ox = padX + pw + 12
      ctx.fillText(`¥${data.originalPrice}`, ox, y)
      const ow = ctx.measureText(`¥${data.originalPrice}`).width
      ctx.strokeStyle = theme.inkSoft
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(ox, y - 5)
      ctx.lineTo(ox + ow, y - 5)
      ctx.stroke()
    }
    y += 34
  }

  // 邀请权益列表
  if (data.type === 'invite' && data.extra?.benefits?.length) {
    ctx.textAlign = 'left'
    data.extra.benefits.slice(0, 4).forEach((b, i) => {
      const by = y + i * 30
      // 鎏金回纹标记
      ctx.fillStyle = theme.gold
      ctx.font = `14px ${FONT_SERIF}`
      ctx.fillText('❖', padX, by)
      ctx.fillStyle = theme.ink
      ctx.font = `15px ${FONT_SANS}`
      ctx.fillText(b, padX + 24, by)
    })
    y += data.extra.benefits.slice(0, 4).length * 30 + 6
    if (data.extra.inviteCode) {
      ctx.fillStyle = theme.inkSoft
      ctx.font = `13px ${FONT_SANS}`
      ctx.fillText(`邀请码：${data.extra.inviteCode}`, padX, y)
      y += 24
    }
  }

  // 统计信息
  const stats: string[] = []
  if (data.extra?.lessonCount) stats.push(`${data.extra.lessonCount} 节课`)
  if (data.extra?.studentCount) stats.push(`${data.extra.studentCount} 人在学`)
  if (data.extra?.readCount) stats.push(`${data.extra.readCount} 阅读`)
  if (data.extra?.viewerCount) stats.push(`${data.extra.viewerCount} 人观看`)
  if (data.extra?.memberCount) stats.push(`${data.extra.memberCount} 位成员`)
  if (stats.length) {
    ctx.textAlign = titleAlign
    ctx.fillStyle = theme.inkSoft
    ctx.font = `13px ${FONT_SANS}`
    ctx.fillText(stats.join('  ·  '), titleX, y)
  }
}

function hintByType(type: PosterType): string {
  const map: Record<PosterType, string> = {
    invite: '加入',
    course: '听课',
    product: '购买',
    article: '阅读',
    live: '看直播',
    profile: '关注',
    circle: '进圈',
  }
  return map[type] || '查看'
}
