// 分站微页面装修器数据层 — 真连站长自服务端点 /station/micro-page/*（P2-b）
// 站长像装修店铺一样自建分站首页：楼层式增删改排序 + 草稿/发布。

import { apiGet, apiPost, apiPut, apiDelete } from '@/utils/request'

export type MicroPageStatus = 'DRAFT' | 'PUBLISHED' | 'OFFLINE'

// 微页面楼层组件
export interface MicroComponent {
  id: string
  type: string
  title?: string
  config: Record<string, any>
  sortOrder: number
}

// 微页面
export interface MicroPage {
  id: string
  name: string
  route: string
  status: MicroPageStatus
  stationId: string | null
  entryVisible?: boolean
  components: MicroComponent[]
}

// 组件蓝图（站长可拖入的组件目录）
export interface ComponentBlueprint {
  type: string
  name: string
  icon: string
  desc: string
  defaultTitle: string
  defaultConfig: Record<string, any>
  // 是否已支持详细配置编辑（false=可添加但配置项后续完善）
  configurable: boolean
}

// 站长组件目录：通用内容组件 + 文档要求的站长专属组件
export const COMPONENT_LIBRARY: ComponentBlueprint[] = [
  { type: 'richtext', name: '公告', icon: 'file-text', desc: '富文本公告 / 活动说明', defaultTitle: '公告', defaultConfig: { content: '' }, configurable: true },
  { type: 'master-card', name: '站长名片', icon: 'user', desc: '展示你的头像 / 简介 / 经营数据', defaultTitle: '站长名片', defaultConfig: { intro: '', showStats: true }, configurable: true },
  { type: 'recommend', name: '精选内容', icon: 'grid', desc: '平台精选好课好物内容流', defaultTitle: '精选推荐', defaultConfig: { source: 'recommend' }, configurable: true },
  { type: 'banner', name: '轮播图', icon: 'image', desc: '首页顶部轮播海报', defaultTitle: '轮播图', defaultConfig: { images: [] }, configurable: true },
  { type: 'recommend-course', name: '推荐课程', icon: 'book-open', desc: '把你想推广的课程置顶', defaultTitle: '站长推荐课程', defaultConfig: { courseIds: [] }, configurable: false },
  { type: 'recommend-agent', name: '推荐智能体', icon: 'cpu', desc: '推荐你的专属智能体', defaultTitle: '站长推荐智能体', defaultConfig: { agentIds: [] }, configurable: false },
]

export function findBlueprint(type: string): ComponentBlueprint | undefined {
  return COMPONENT_LIBRARY.find((c) => c.type === type)
}
export function componentLabel(type: string): string {
  return findBlueprint(type)?.name || type
}
export function componentIcon(type: string): string {
  return findBlueprint(type)?.icon || 'box'
}

export const microPageApi = {
  /** 我的分站微页面列表 */
  async getMy(): Promise<MicroPage[]> {
    const res = await apiGet<MicroPage[] | { items?: MicroPage[] }>('/station/micro-page/my')
    return Array.isArray(res) ? res : (res?.items || [])
  },
  /** 微页面详情（含楼层组件） */
  async getDetail(id: string): Promise<MicroPage> {
    return apiGet<MicroPage>(`/station/micro-page/${id}`)
  },
  /** 创建微页面（route 后端生成） */
  async create(name: string, description?: string): Promise<MicroPage> {
    return apiPost<MicroPage>('/station/micro-page', { name, description })
  },
  /** 更新微页面基本信息 */
  async update(id: string, data: { name?: string; description?: string; entryVisible?: boolean }): Promise<void> {
    await apiPut(`/station/micro-page/${id}`, data)
  },
  /** 删除微页面 */
  async remove(id: string): Promise<void> {
    await apiDelete(`/station/micro-page/${id}`)
  },
  /** 添加楼层组件 */
  async addComponent(id: string, comp: { type: string; title?: string; config?: Record<string, any>; sortOrder?: number }): Promise<MicroComponent> {
    return apiPost<MicroComponent>(`/station/micro-page/${id}/components`, comp)
  },
  /** 更新楼层组件（标题/配置） */
  async updateComponent(id: string, compId: string, data: { title?: string; config?: Record<string, any> }): Promise<void> {
    await apiPut(`/station/micro-page/${id}/components/${compId}`, data)
  },
  /** 删除楼层组件 */
  async deleteComponent(id: string, compId: string): Promise<void> {
    await apiDelete(`/station/micro-page/${id}/components/${compId}`)
  },
  /** 楼层排序（传入新顺序的组件ID数组） */
  async sortComponents(id: string, componentIds: string[]): Promise<void> {
    await apiPut(`/station/micro-page/${id}/components/sort`, { componentIds })
  },
  /** 发布微页面 */
  async publish(id: string): Promise<void> {
    await apiPost(`/station/micro-page/${id}/publish`, {})
  },
}
