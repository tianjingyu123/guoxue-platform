/**
 * 圈子数据 + 类型 + API 封装（从原型 app/circles/page.tsx 与 lib/api.ts circleApi 1:1 迁移）
 * mock 数据与原型完全一致；真实接口走 utils/request，mock 开关同原型口径。
 */
import { apiGet, apiPost, useMock } from '@/utils/request'

export interface Circle {
  id: string
  name: string
  cover: string
  description: string
  category: string
  members: number
  posts: number
  isJoined: boolean
  todayActive?: number
  rank?: number
}

export interface CircleCategory { id: string; name: string; icon: string }

export interface UpcomingLive {
  id: string; title: string; host: string; avatar: string
  startTime: string; viewers: number; circleId: string; circleName: string
}

export interface TodayActivity {
  id: string; type: 'checkin' | 'homework' | 'qa'; title: string
  participants: number; deadline: string; circleId: string; reward: string
}

export interface HotPost {
  id: string; circleId: string; circleName: string
  author: { name: string; avatar: string; title?: string }
  content: string; images: string[]; likes: number; comments: number
  time: string; isPinned?: boolean
}

// ─── 分类（原型 categories，icon 用通用 book-open） ───
export const circleCategories: CircleCategory[] = [
  { id: '', name: '推荐', icon: 'star' },
  { id: 'bazi', name: '八字命理', icon: 'book-open' },
  { id: 'ziwei', name: '紫微斗数', icon: 'book-open' },
  { id: 'fengshui', name: '风水堪舆', icon: 'book-open' },
  { id: 'yijing', name: '易经', icon: 'book-open' },
  { id: 'liuyao', name: '六爻', icon: 'book-open' },
  { id: 'qimen', name: '奇门遁甲', icon: 'book-open' },
  { id: 'yangsheng', name: '养生', icon: 'book-open' },
  { id: 'shufa', name: '书法', icon: 'book-open' },
]

// ─── 直播预告（原型 upcomingLives） ───
export const upcomingLives: UpcomingLive[] = [
  { id: 'live1', title: '八字入门精讲（第3期）', host: '周易大师', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=master', startTime: '今晚 20:00', viewers: 1280, circleId: '1', circleName: '八字研习社' },
  { id: 'live2', title: '紫微斗数实战案例分析', host: '张玄风', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhang', startTime: '明天 19:30', viewers: 860, circleId: '2', circleName: '紫微斗数学院' },
]

// ─── 今日活动（原型 todayActivities） ───
export const todayActivities: TodayActivity[] = [
  { id: 'act1', type: 'checkin', title: '《易经》共读打卡 Day 15', participants: 328, deadline: '23:59', circleId: '4', reward: '+10经验' },
  { id: 'act2', type: 'homework', title: '八字案例分析作业', participants: 156, deadline: '本周日', circleId: '1', reward: '+50经验' },
  { id: 'act3', type: 'qa', title: '限时免费提问活动', participants: 89, deadline: '12:00', circleId: '1', reward: '免费' },
]

// ─── 热门帖子信息流（原型 hotPosts） ───
export const hotPosts: HotPost[] = [
  { id: 'p1', circleId: '1', circleName: '八字研习社', author: { name: '周易大师', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=master', title: '圈主' }, content: '今天分享一个八字案例：某人八字为甲子、丙寅、戊辰、壬戌，这个八字有什么特点？从五行来看，日主戊土生于寅月...', images: ['https://picsum.photos/400/300?random=201'], likes: 328, comments: 56, time: '2小时前', isPinned: true },
  { id: 'p2', circleId: '2', circleName: '紫微斗数学院', author: { name: '张玄风', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhang', title: '嘉宾' }, content: '紫微斗数中的「四化」如何理解？化禄主福、化权主权、化科主名、化忌主烦。今天重点讲讲化忌...', images: [], likes: 256, comments: 42, time: '3小时前' },
  { id: 'p3', circleId: '3', circleName: '风水堪舆交流', author: { name: '王德华', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=wang' }, content: '分享一个商铺选址的风水案例。这家店位于T字路口，门前有一棵大树遮挡，开业三个月生意惨淡...', images: ['https://picsum.photos/400/300?random=202', 'https://picsum.photos/400/300?random=203'], likes: 198, comments: 38, time: '5小时前' },
]

// ─── 圈子 mock（原型 mockCircles，完全一致） ───
export const mockCircles: Circle[] = [
  { id: '1', name: '八字研习社', cover: 'https://picsum.photos/400/300?random=101', description: '专注八字命理学习与交流', category: 'bazi', members: 12800, posts: 3560, isJoined: true, todayActive: 128, rank: 1 },
  { id: '2', name: '紫微斗数爱好者', cover: 'https://picsum.photos/400/300?random=102', description: '探索紫微斗数的奥秘', category: 'ziwei', members: 8600, posts: 2180, isJoined: false, todayActive: 86, rank: 2 },
  { id: '3', name: '风水学堂', cover: 'https://picsum.photos/400/300?random=103', description: '风水堪舆知识分享', category: 'fengshui', members: 6500, posts: 1820, isJoined: true, todayActive: 56, rank: 3 },
  { id: '4', name: '易经读书会', cover: 'https://picsum.photos/400/300?random=104', description: '一起研读易经经典', category: 'yijing', members: 5200, posts: 1560, isJoined: false, todayActive: 42 },
  { id: '5', name: '六爻预测交流', cover: 'https://picsum.photos/400/300?random=105', description: '六爻占卜实战分享', category: 'liuyao', members: 4800, posts: 1280, isJoined: false, todayActive: 38 },
  { id: '6', name: '奇门遁甲研究', cover: 'https://picsum.photos/400/300?random=106', description: '奇门遁甲术数探讨', category: 'qimen', members: 3600, posts: 960, isJoined: false, todayActive: 28 },
  { id: '7', name: '中医养生圈', cover: 'https://picsum.photos/400/300?random=107', description: '传统养生智慧分享', category: 'yangsheng', members: 9200, posts: 2860, isJoined: true, todayActive: 96 },
  { id: '8', name: '书法艺术', cover: 'https://picsum.photos/400/300?random=108', description: '书法练习与鉴赏', category: 'shufa', members: 7800, posts: 2340, isJoined: false, todayActive: 68 },
]

// ─── API（mock 优先，与原型 Promise.allSettled 容错口径一致） ───
export const circleApi = {
  list: async (params?: { category?: string }): Promise<{ data: Circle[]; total: number }> => {
    if (useMock()) {
      const filtered = params?.category ? mockCircles.filter(c => c.category === params.category) : mockCircles
      return { data: filtered, total: filtered.length }
    }
    return apiGet(`/circles?category=${params?.category || ''}`)
  },
  my: async (): Promise<Circle[]> => {
    if (useMock()) return mockCircles.filter(c => c.isJoined)
    return apiGet('/circles/my')
  },
  getRanking: async (): Promise<Circle[]> => {
    if (useMock()) return mockCircles.slice(0, 5).map((c, i) => ({ ...c, rank: i + 1 }))
    return apiGet('/circles/ranking')
  },
  join: (id: string) => apiPost<{ success: boolean }>(`/circles/${id}/join`),
  leave: (id: string) => apiPost<{ success: boolean }>(`/circles/${id}/leave`),
}

/** 成员数格式化：>=1万显示「x.x万」（原型口径） */
export function formatMembers(n: number): string {
  return n >= 10000 ? `${(n / 10000).toFixed(1)}万` : String(n)
}
