/**
 * 二维码 canvas 绘制工具（分享卡/海报真二维码）
 *
 * 基于 uqrcodejs（纯 JS 编码器·无 DOM 依赖·H5/小程序/App 多端通用）：
 * 只用它的编码能力（make() 产出 modules 点阵），码点由本工具直接画到
 * uni.createCanvasContext 旧接口画布的指定 (x, y, size) 区域，
 * 因此可无缝嵌入现有成就卡/海报的手绘流程（在 ctx.draw() 之前调用即可）。
 *
 * 铁律：任何一步失败（编码异常/文本为空）静默降级返回 false，
 * 调用方据此决定是否绘制配文——无二维码也能保存原卡。
 */
// @ts-ignore uqrcodejs 为纯 JS 库，无类型声明（下方以 UQRCodeInstance 收口实例类型）
import UQRCode from 'uqrcodejs'

/** uqrcodejs 实例（仅声明本工具用到的成员） */
interface UQRCodeInstance {
  /** 二维码内容（内部自动做 UTF-8 编码） */
  data: string
  /** 目标尺寸（本工具自绘码点，仅参与内部计算） */
  size: number
  /** 内部 margin（静区由本工具的 padding 衬底负责，置 0） */
  margin: number
  /** 生成点阵 */
  make(): void
  /** make() 后可读：码点矩阵（uqrcodejs 4.x 元素为对象，.isBlack=true 表示深色码点） */
  modules: { isBlack: boolean }[][]
  /** make() 后可读：点阵边长 */
  moduleCount: number
}

export interface DrawQrOptions {
  /** 码点颜色（默认 #2d2a26·近黑保证识别率） */
  foreground?: string
  /** 白色衬底颜色（默认 #ffffff） */
  background?: string
  /** 衬底四周留白 px（二维码静区·默认 6） */
  padding?: number
  /** 衬底圆角 px（默认 8） */
  radius?: number
  /** 配文（绘制成功才画·居中于二维码正下方，如「长按识别 · 一起学」） */
  caption?: string
  /** 配文颜色（默认 #9a8b73） */
  captionColor?: string
  /** 配文字号（默认 10） */
  captionSize?: number
}

/**
 * 把 text 生成二维码并绘制到画布 (x, y) 处 size×size 区域（含白色衬底+静区）。
 * @returns 是否绘制成功（false=静默降级，画布不受影响）
 */
export function drawQrToCanvas(
  ctx: UniApp.CanvasContext,
  text: string,
  x: number,
  y: number,
  size: number,
  options: DrawQrOptions = {},
): boolean {
  if (!text || size <= 0) return false
  const {
    foreground = '#2d2a26',
    background = '#ffffff',
    padding = 6,
    radius = 8,
    caption = '',
    captionColor = '#9a8b73',
    captionSize = 10,
  } = options
  try {
    const qr = new (UQRCode as new () => UQRCodeInstance)()
    qr.data = text
    qr.size = size
    qr.margin = 0
    qr.make()
    const modules = qr.modules
    const count = qr.moduleCount
    if (!modules || !count) return false

    // 白色衬底（含静区，保证深色卡面上的识别率）
    ctx.setFillStyle(background)
    roundRectPath(ctx, x - padding, y - padding, size + padding * 2, size + padding * 2, radius)
    ctx.fill()

    // 码点：精确整数边界（round(i*size/count)）逐格填充，无重叠无白缝
    // 注意 uqrcodejs 4.x 的 modules[r][c] 是对象，以 .isBlack 判定深色码点（历史 bug：误当 boolean 导致全黑）
    ctx.setFillStyle(foreground)
    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        if (!modules[row][col] || !modules[row][col].isBlack) continue
        const px0 = x + Math.round((col * size) / count)
        const px1 = x + Math.round(((col + 1) * size) / count)
        const py0 = y + Math.round((row * size) / count)
        const py1 = y + Math.round(((row + 1) * size) / count)
        ctx.fillRect(px0, py0, px1 - px0, py1 - py0)
      }
    }

    // 配文：居中于二维码正下方
    if (caption) {
      ctx.setFillStyle(captionColor)
      ctx.setFontSize(captionSize)
      ctx.setTextAlign('center')
      ctx.fillText(caption, x + size / 2, y + size + padding + captionSize + 4)
    }
    return true
  } catch {
    return false // 静默降级：无二维码也能保存原卡
  }
}

/** 圆角矩形路径（uni 旧接口 canvas 无 roundRect，用 arcTo 拼） */
function roundRectPath(
  ctx: UniApp.CanvasContext,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.lineTo(x + w - rr, y)
  ctx.arcTo(x + w, y, x + w, y + rr, rr)
  ctx.lineTo(x + w, y + h - rr)
  ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr)
  ctx.lineTo(x + rr, y + h)
  ctx.arcTo(x, y + h, x, y + h - rr, rr)
  ctx.lineTo(x, y + rr)
  ctx.arcTo(x, y, x + rr, y, rr)
  ctx.closePath()
}
