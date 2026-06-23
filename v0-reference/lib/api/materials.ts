// 推广素材库 API
import { apiGet, apiPost, useMock } from '../api-client'
import type { ApiResponse } from '../types/api'
import type { 
  MaterialType, 
  MaterialCategory, 
  Material, 
  MaterialsData,
  PosterMaterial,
  CopywritingMaterial,
  QrcodeMaterial,
  PosterDetail
} from '../types/materials'

// ========== Mock 数据 ==========

const mockCategories: MaterialCategory[] = [
  { id: 'all', type: 'poster', name: '全部', count: 36 },
  { id: 'poster', type: 'poster', name: '海报', count: 18 },
  { id: 'copywriting', type: 'copywriting', name: '文案', count: 12 },
  { id: 'qrcode', type: 'qrcode', name: '二维码', count: 6 },
]

const mockPosters: PosterMaterial[] = [
  {
    id: 1,
    type: 'poster',
    title: '八字命理课程推广海报',
    thumbnail: '/placeholder.svg?height=200&width=150',
    fullImage: '/placeholder.svg?height=800&width=600',
    width: 600,
    height: 800,
    useCount: 328,
    createdAt: '2026-05-20',
    tags: ['八字', '课程', '推广'],
  },
  {
    id: 2,
    type: 'poster',
    title: '风水大师直播预告',
    thumbnail: '/placeholder.svg?height=200&width=150',
    fullImage: '/placeholder.svg?height=800&width=600',
    width: 600,
    height: 800,
    useCount: 256,
    createdAt: '2026-05-18',
    tags: ['风水', '直播', '预告'],
  },
  {
    id: 3,
    type: 'poster',
    title: '新人注册福利海报',
    thumbnail: '/placeholder.svg?height=200&width=150',
    fullImage: '/placeholder.svg?height=800&width=600',
    width: 600,
    height: 800,
    useCount: 892,
    createdAt: '2026-05-15',
    tags: ['新人', '福利', '注册'],
  },
  {
    id: 4,
    type: 'poster',
    title: '周易入门课程限时优惠',
    thumbnail: '/placeholder.svg?height=200&width=150',
    fullImage: '/placeholder.svg?height=800&width=600',
    width: 600,
    height: 800,
    useCount: 445,
    createdAt: '2026-05-10',
    tags: ['周易', '优惠', '课程'],
  },
]

const mockCopywritings: CopywritingMaterial[] = [
  {
    id: 101,
    type: 'copywriting',
    title: '八字课程推广文案',
    content: '🔮 想知道自己的命运密码吗？\n\n八字命理大师亲授，带你解读人生运势！\n\n✅ 零基础入门，通俗易懂\n✅ 实战案例分析，学完即用\n✅ 终身答疑群，持续进步\n\n限时优惠进行中，点击链接立即报名👇',
    copyCount: 1256,
    createdAt: '2026-05-22',
    tags: ['八字', '课程'],
    scene: '朋友圈/社群推广',
  },
  {
    id: 102,
    type: 'copywriting',
    title: '风水服务推广文案',
    content: '🏠 家居风水布局，影响一家人的运势！\n\n专业风水师在线指导，帮您打造好风水：\n• 客厅布局优化\n• 卧室床位调整\n• 财位催旺方法\n• 煞气化解技巧\n\n现在咨询，享首次优惠价！',
    copyCount: 876,
    createdAt: '2026-05-20',
    tags: ['风水', '服务'],
    scene: '私聊/群发',
  },
  {
    id: 103,
    type: 'copywriting',
    title: '平台注册邀请文案',
    content: '📚 发现一个超棒的国学学习平台！\n\n这里有：\n• 大师在线直播授课\n• 海量国学课程资源\n• 专业命理排盘工具\n• 同好交流圈子\n\n用我的邀请链接注册，新人还能领取专属福利哦~',
    copyCount: 2341,
    createdAt: '2026-05-18',
    tags: ['注册', '邀请'],
    scene: '分享拉新',
  },
]

const mockQrcodes: QrcodeMaterial[] = [
  {
    id: 201,
    type: 'qrcode',
    title: '分站注册二维码',
    qrcodeUrl: '/placeholder.svg?height=200&width=200',
    targetUrl: 'https://example.com/register?ref=station001',
    qrcodeType: 'register',
    scanCount: 3256,
    createdAt: '2026-05-01',
  },
  {
    id: 202,
    type: 'qrcode',
    title: '热门课程二维码',
    qrcodeUrl: '/placeholder.svg?height=200&width=200',
    targetUrl: 'https://example.com/course/123',
    qrcodeType: 'product',
    scanCount: 1892,
    createdAt: '2026-05-10',
  },
  {
    id: 203,
    type: 'qrcode',
    title: '官方圈子二维码',
    qrcodeUrl: '/placeholder.svg?height=200&width=200',
    targetUrl: 'https://example.com/circle/1',
    qrcodeType: 'circle',
    scanCount: 2156,
    createdAt: '2026-05-15',
  },
]

// ========== API 函数 ==========

/**
 * 获取素材库数据
 */
export async function getMaterials(
  type: MaterialType | 'all' = 'all',
  page: number = 1,
  pageSize: number = 20
): Promise<ApiResponse<MaterialsData>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 500))
    
    let materials: Material[] = []
    if (type === 'all') {
      materials = [...mockPosters, ...mockCopywritings, ...mockQrcodes]
    } else if (type === 'poster') {
      materials = mockPosters
    } else if (type === 'copywriting') {
      materials = mockCopywritings
    } else if (type === 'qrcode') {
      materials = mockQrcodes
    }

    const start = (page - 1) * pageSize
    const end = start + pageSize
    const paginatedMaterials = materials.slice(start, end)

    return {
      code: 200,
      data: {
        categories: mockCategories,
        materials: paginatedMaterials,
        total: materials.length,
        hasMore: end < materials.length,
      },
      message: 'success',
    }
  }
  return apiGet<MaterialsData>('/station/materials', { type, page, pageSize })
}

/**
 * 获取海报详情
 */
export async function getPosterDetail(posterId: number): Promise<ApiResponse<PosterDetail>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    const poster = mockPosters.find(p => p.id === posterId)
    if (!poster) {
      return { code: 404, data: null as unknown as PosterDetail, message: '海报不存在' }
    }
    return {
      code: 200,
      data: {
        ...poster,
        description: '专业设计师制作，适用于朋友圈、社群推广',
        downloadCount: Math.floor(poster.useCount * 0.8),
        shareCount: Math.floor(poster.useCount * 0.3),
      },
      message: 'success',
    }
  }
  return apiGet<PosterDetail>(`/station/materials/poster/${posterId}`)
}

/**
 * 记录素材使用
 */
export async function useMaterial(
  materialId: number, 
  type: MaterialType,
  action: 'copy' | 'download' | 'share' | 'save'
): Promise<ApiResponse<{ success: boolean }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 200))
    return { code: 200, data: { success: true }, message: 'success' }
  }
  return apiPost<{ success: boolean }>('/station/materials/use', { materialId, type, action })
}

/**
 * 生成自定义二维码
 */
export async function generateCustomQrcode(
  targetUrl: string,
  title: string
): Promise<ApiResponse<QrcodeMaterial>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 800))
    return {
      code: 200,
      data: {
        id: Date.now(),
        type: 'qrcode',
        title,
        qrcodeUrl: '/placeholder.svg?height=200&width=200',
        targetUrl,
        qrcodeType: 'custom',
        scanCount: 0,
        createdAt: new Date().toLocaleDateString('zh-CN'),
      },
      message: 'success',
    }
  }
  return apiPost<QrcodeMaterial>('/station/materials/qrcode/generate', { targetUrl, title })
}

/**
 * 获取素材类型名称
 */
export function getMaterialTypeName(type: MaterialType): string {
  const names: Record<MaterialType, string> = {
    poster: '海报',
    copywriting: '文案',
    qrcode: '二维码',
  }
  return names[type] || '素材'
}
