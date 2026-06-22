/**
 * Canvas 适配层（最高保真风险项的隔离层）
 *
 * 策略：原型的纯绘制函数（render-engine / render-card，只依赖 ctx，平台无关）原样复用，
 * 平台差异（取 node / dpr / 字体就绪 / 图片加载 / 导出）全部收敛在此适配器。
 * 详见 docs/迁移准备/02-Canvas适配层方案.md。
 */
import { fontReady } from './font-loader'

export interface CanvasHandle {
  canvas: any
  ctx: CanvasRenderingContext2D
  width: number
  height: number
}

/** 获取小程序 Canvas 2D node 并按 dpr 初始化（H5 下退化为标准 canvas） */
export function getCanvas(selector: string, width: number, height: number, comp?: any): Promise<CanvasHandle> {
  return new Promise((resolve, reject) => {
    const query = comp ? uni.createSelectorQuery().in(comp) : uni.createSelectorQuery()
    query
      .select(selector)
      // uni 类型声明要求 fields 第二参数 callback，实际结果在 exec 回调中统一获取，此处传空函数
      .fields({ node: true, size: true } as any, () => {})
      .exec((res: any[]) => {
        const node = res?.[0]?.node
        if (!node) { reject(new Error(`canvas node 未找到: ${selector}`)); return }
        const ctx = node.getContext('2d') as CanvasRenderingContext2D
        const dpr = uni.getSystemInfoSync().pixelRatio || 2
        node.width = width * dpr
        node.height = height * dpr
        ctx.scale(dpr, dpr)
        resolve({ canvas: node, ctx, width, height })
      })
  })
}

/** 小程序 canvas 图片加载（替代 new Image()） */
export function loadImage(canvas: any, src: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const img = canvas.createImage()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/** 统一渲染入口：取 node → 等字体就绪 → 执行纯绘制函数 → 返回 handle 供导出 */
export async function renderToCanvas(
  selector: string,
  size: { width: number; height: number },
  renderFn: (ctx: CanvasRenderingContext2D, handle: CanvasHandle) => Promise<void> | void,
  comp?: any,
): Promise<CanvasHandle> {
  const handle = await getCanvas(selector, size.width, size.height, comp)
  await fontReady
  await renderFn(handle.ctx, handle)
  return handle
}
