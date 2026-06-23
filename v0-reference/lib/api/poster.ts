import { apiGet, apiPost, useMock } from '../api-client'
import type { ApiResponse } from '../types/api'
import type { PosterType, PosterData, PosterConfig, PosterTemplate } from '../types/poster'

// Mock 海报模板
const mockTemplates: PosterTemplate[] = [
  {
    id: 1,
    name: '经典国风',
    thumbnail: '/placeholder.svg?height=200&width=150',
    backgroundImage: '/placeholder.svg?height=600&width=400',
    layout: 'default',
  },
  {
    id: 2,
    name: '简约风格',
    thumbnail: '/placeholder.svg?height=200&width=150',
    backgroundImage: '/placeholder.svg?height=600&width=400',
    layout: 'minimal',
  },
  {
    id: 3,
    name: '精选推荐',
    thumbnail: '/placeholder.svg?height=200&width=150',
    backgroundImage: '/placeholder.svg?height=600&width=400',
    layout: 'featured',
  },
]

/**
 * 获取海报配置
 */
export async function getPosterConfig(type: PosterType): Promise<ApiResponse<PosterConfig>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 200))
    return {
      code: 200,
      data: {
        width: 750,
        height: 1334,
        backgroundColor: '#FAF8F5',
        templates: mockTemplates,
      },
      message: 'success',
    }
  }
  return apiGet<PosterConfig>('/share/poster/config', { type })
}

/**
 * 获取海报数据
 */
export async function getPosterData(
  type: PosterType,
  targetId?: number
): Promise<ApiResponse<PosterData>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    
    const baseData: Partial<PosterData> = {
      type,
      qrCodeUrl: '/placeholder.svg?height=120&width=120',
      userAvatar: '/placeholder.svg?height=60&width=60',
      userName: '国学爱好者',
    }
    
    const typeData: Record<PosterType, Partial<PosterData>> = {
      invite: {
        title: '邀请好友，共享国学智慧',
        subtitle: '扫码加入热卜，开启国学之旅',
        extra: {
          inviteCode: 'ABC123',
          benefits: ['好友注册即得10积分', '好友首次付费返佣10%', '好友开通会员再得20元'],
        },
      },
      course: {
        title: '八字命理入门到精通',
        subtitle: '张明德 · 国学大师',
        coverImage: '/placeholder.svg?height=300&width=400',
        price: 199,
        originalPrice: 299,
        extra: {
          lessonCount: 48,
          studentCount: 12680,
        },
      },
      article: {
        title: '如何通过八字看财运',
        subtitle: '深入浅出讲解八字财运分析',
        coverImage: '/placeholder.svg?height=300&width=400',
        extra: {
          readCount: 8520,
          likeCount: 326,
        },
      },
      live: {
        title: '八字命理直播课',
        subtitle: '张明德老师 · 今晚8点',
        coverImage: '/placeholder.svg?height=300&width=400',
        extra: {
          viewerCount: 1580,
          startTime: '今晚 20:00',
        },
      },
      product: {
        title: '专业风水罗盘',
        subtitle: '正品保证 · 大师推荐',
        coverImage: '/placeholder.svg?height=300&width=400',
        price: 688,
        originalPrice: 888,
      },
      profile: {
        title: '张明德',
        subtitle: '国学大师 · 八字命理专家',
        description: '从事国学研究30年，著有《八字精解》等多部著作',
        coverImage: '/placeholder.svg?height=200&width=200',
      },
      circle: {
        title: '国学研习圈',
        subtitle: '与同好一起精进国学智慧',
        coverImage: '/placeholder.svg?height=300&width=400',
        description: '汇聚国学爱好者，每日精选好文、定期线上讲座',
        extra: {
          memberCount: 3680,
          contentCount: 1280,
        },
      },
    }
    
    return {
      code: 200,
      data: { ...baseData, ...typeData[type] } as PosterData,
      message: 'success',
    }
  }
  return apiGet<PosterData>('/share/poster/data', { type, targetId })
}

/**
 * 记录海报分享
 */
export async function recordPosterShare(
  type: PosterType,
  targetId?: number,
  channel?: string
): Promise<ApiResponse<{ success: boolean }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 100))
    return { code: 200, data: { success: true }, message: 'success' }
  }
  return apiPost<{ success: boolean }>('/share/poster/record', { type, targetId, channel })
}

/**
 * 获取海报类型标题
 */
export function getPosterTypeTitle(type: PosterType): string {
  const titles: Record<PosterType, string> = {
    invite: '邀请海报',
    course: '课程海报',
    article: '文章海报',
    live: '直播海报',
    product: '商品海报',
    profile: '名片海报',
    circle: '圈子海报',
  }
  return titles[type]
}

/**
 * Canvas 绘制工具函数
 */
export const canvasUtils = {
  // 绘制圆角矩形
  roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ) {
    ctx.beginPath()
    ctx.moveTo(x + radius, y)
    ctx.lineTo(x + width - radius, y)
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
    ctx.lineTo(x + width, y + height - radius)
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
    ctx.lineTo(x + radius, y + height)
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
    ctx.lineTo(x, y + radius)
    ctx.quadraticCurveTo(x, y, x + radius, y)
    ctx.closePath()
  },
  
  // 绘制圆形图片
  drawCircleImage(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    x: number,
    y: number,
    size: number
  ) {
    ctx.save()
    ctx.beginPath()
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2)
    ctx.closePath()
    ctx.clip()
    ctx.drawImage(img, x, y, size, size)
    ctx.restore()
  },
  
  // 绘制多行文本
  drawMultilineText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
    maxLines: number = 2
  ): number {
    const words = text.split('')
    let line = ''
    let lineCount = 0
    let currentY = y
    
    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i]
      const metrics = ctx.measureText(testLine)
      
      if (metrics.width > maxWidth && i > 0) {
        if (lineCount >= maxLines - 1) {
          ctx.fillText(line.slice(0, -1) + '...', x, currentY)
          return currentY
        }
        ctx.fillText(line, x, currentY)
        line = words[i]
        currentY += lineHeight
        lineCount++
      } else {
        line = testLine
      }
    }
    ctx.fillText(line, x, currentY)
    return currentY
  },
  
  // 加载图片
  loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = src
    })
  },
}
