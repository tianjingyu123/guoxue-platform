import { apiGet, apiPost, useMock } from '../api-client'
import type { ApiResponse } from '../types/api'
import type { 
  LiveRoom, 
  ReplayDetail, 
  ReplayChapter, 
  ReplaySlide, 
  ReplayDiscussion, 
  ReplayQA, 
  ReplayProduct,
  PlaybackSpeed
} from '../types/live'

// Mock 回放数据
const mockReplayDetail: ReplayDetail = {
  id: 1,
  title: '八字命理入门：如何看懂自己的命盘',
  cover: '/placeholder.svg?height=720&width=1280',
  type: 'knowledge',
  status: 'replay',
  host: {
    id: 1,
    name: '周易大师',
    avatar: '/placeholder.svg?height=80&width=80',
    followers: 12800,
    isVerified: true,
    title: '资深命理师',
  },
  viewerCount: 3256,
  likeCount: 1890,
  startTime: '2026-01-15 19:00',
  endTime: '2026-01-15 21:30',
  duration: '02:30:15',
  isPaid: true,
  price: 29.9,
  isPurchased: true,
  circle: {
    id: 1,
    name: '八字命理研习社',
    members: 1280,
  },
  replayUrl: '/videos/replay-sample.mp4',
  chapters: [
    { id: 1, title: '课程介绍', startTime: 0, timeDisplay: '00:00:00', description: '本节课程概述' },
    { id: 2, title: '八字基础概念', startTime: 300, timeDisplay: '00:05:00', description: '天干地支与八字结构' },
    { id: 3, title: '日主与十神', startTime: 900, timeDisplay: '00:15:00', description: '日主的含义和十神推算' },
    { id: 4, title: '五行生克关系', startTime: 1800, timeDisplay: '00:30:00', description: '五行相生相克的规律' },
    { id: 5, title: '命盘实例分析', startTime: 3000, timeDisplay: '00:50:00', description: '真实案例解读' },
    { id: 6, title: '大运流年', startTime: 4500, timeDisplay: '01:15:00', description: '大运和流年的看法' },
    { id: 7, title: '互动答疑', startTime: 6000, timeDisplay: '01:40:00', description: '学员问题解答' },
    { id: 8, title: '课程总结', startTime: 7800, timeDisplay: '02:10:00', description: '知识点回顾' },
  ],
  slides: [
    { id: 1, time: 0, timeDisplay: '00:00:00', imageUrl: '/placeholder.svg?height=540&width=960', title: '封面' },
    { id: 2, time: 300, timeDisplay: '00:05:00', imageUrl: '/placeholder.svg?height=540&width=960', title: '八字结构图' },
    { id: 3, time: 900, timeDisplay: '00:15:00', imageUrl: '/placeholder.svg?height=540&width=960', title: '十神表' },
    { id: 4, time: 1800, timeDisplay: '00:30:00', imageUrl: '/placeholder.svg?height=540&width=960', title: '五行生克图' },
    { id: 5, time: 3000, timeDisplay: '00:50:00', imageUrl: '/placeholder.svg?height=540&width=960', title: '案例命盘' },
  ],
  discussions: [
    { id: 1, time: 323, timeDisplay: '00:05:23', userId: 101, userName: '命理爱好者', userAvatar: '/placeholder.svg', content: '老师讲得太好了，终于听懂了', isHost: false },
    { id: 2, time: 765, timeDisplay: '00:12:45', userId: 102, userName: '学易小白', userAvatar: '/placeholder.svg', content: '请问日主是什么意思？', isHost: false },
    { id: 3, time: 930, timeDisplay: '00:15:30', userId: 1, userName: '周易大师', userAvatar: '/placeholder.svg', content: '日主就是日柱天干，代表命主本人', isHost: true },
    { id: 4, time: 1690, timeDisplay: '00:28:10', userId: 103, userName: '紫微门徒', userAvatar: '/placeholder.svg', content: '八字和紫微斗数哪个更准？', isHost: false },
    { id: 5, time: 2122, timeDisplay: '00:35:22', userId: 104, userName: '风水学徒', userAvatar: '/placeholder.svg', content: '老师能讲讲大运流年吗', isHost: false },
    { id: 6, time: 2538, timeDisplay: '00:42:18', userId: 1, userName: '周易大师', userAvatar: '/placeholder.svg', content: '下节课会专门讲大运流年的看法', isHost: true },
    { id: 7, time: 3940, timeDisplay: '01:05:40', userId: 105, userName: '初学者', userAvatar: '/placeholder.svg', content: '笔记记下来了，感谢老师', isHost: false },
    { id: 8, time: 5415, timeDisplay: '01:30:15', userId: 106, userName: '命理研究者', userAvatar: '/placeholder.svg', content: '这个案例分析太精彩了', isHost: false },
  ],
  qaList: [
    { 
      id: 1, 
      time: 1110, 
      timeDisplay: '00:18:30', 
      question: '八字中的十神是怎么确定的？', 
      questionerId: 102,
      questionerName: '学易小白',
      answer: '十神是根据日干与其他七个字的五行生克关系来确定的。同我者为比劫，生我者为印星，我生者为食伤，我克者为财星，克我者为官杀。',
      answererId: 1,
      answererName: '周易大师',
    },
    { 
      id: 2, 
      time: 2720, 
      timeDisplay: '00:45:20', 
      question: '命盘中缺某个五行怎么办？', 
      questionerId: 103,
      questionerName: '紫微门徒',
      answer: '五行有缺不一定是坏事，关键看整体格局。如果缺的五行是忌神，反而是好事。可以通过后天方位、颜色、职业等方式来补充。',
      answererId: 1,
      answererName: '周易大师',
    },
    { 
      id: 3, 
      time: 4545, 
      timeDisplay: '01:15:45', 
      question: '大运和流年哪个影响更大？', 
      questionerId: 104,
      questionerName: '风水学徒',
      answer: '大运管十年，影响更为深远和持久；流年管一年，影响相对较短但更为具体。两者需要结合来看，大运好流年差，影响有限；大运差流年好，也难有大的突破。',
      answererId: 1,
      answererName: '周易大师',
    },
  ],
  products: [
    { id: 1, name: '《渊海子平》精装版', image: '/placeholder.svg', price: 68, originalPrice: 98, sales: 256, mentionTime: 1530, mentionTimeDisplay: '00:25:30' },
    { id: 2, name: '八字排盘专业罗盘', image: '/placeholder.svg', price: 198, originalPrice: 298, sales: 128, mentionTime: 3135, mentionTimeDisplay: '00:52:15' },
    { id: 3, name: '命理学入门套装', image: '/placeholder.svg', price: 168, originalPrice: 238, sales: 89, mentionTime: 4720, mentionTimeDisplay: '01:18:40' },
  ],
}

/**
 * 获取回放详情
 */
export async function getReplayDetail(id: number): Promise<ApiResponse<ReplayDetail>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 400))
    return { code: 200, data: { ...mockReplayDetail, id }, message: 'success' }
  }
  return apiGet<ReplayDetail>(`/live/replay/${id}`)
}

/**
 * 记录播放进度
 */
export async function savePlayProgress(
  replayId: number, 
  currentTime: number
): Promise<ApiResponse<{ success: boolean }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 100))
    return { code: 200, data: { success: true }, message: 'success' }
  }
  return apiPost<{ success: boolean }>(`/live/replay/${replayId}/progress`, { currentTime })
}

/**
 * 获取上次播放进度
 */
export async function getPlayProgress(replayId: number): Promise<ApiResponse<{ currentTime: number }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 100))
    return { code: 200, data: { currentTime: 0 }, message: 'success' }
  }
  return apiGet<{ currentTime: number }>(`/live/replay/${replayId}/progress`)
}

/**
 * 购买回放
 */
export async function purchaseReplay(replayId: number): Promise<ApiResponse<{ orderId: string }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 500))
    return { code: 200, data: { orderId: 'RP' + Date.now() }, message: '购买成功' }
  }
  return apiPost<{ orderId: string }>(`/live/replay/${replayId}/purchase`)
}

// ========== 工具函数 ==========

/**
 * 秒数转时间显示
 */
export function formatSeconds(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

/**
 * 时间字符串转秒数
 */
export function parseTimeToSeconds(timeStr: string): number {
  const parts = timeStr.split(':').map(Number)
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  }
  return parts[0] * 60 + parts[1]
}

/**
 * 倍速选项
 */
export const PLAYBACK_SPEEDS: PlaybackSpeed[] = [0.5, 0.75, 1, 1.25, 1.5, 2]

/**
 * 获取倍速显示文本
 */
export function getSpeedLabel(speed: PlaybackSpeed): string {
  return speed === 1 ? '倍速' : `${speed}x`
}

/**
 * 根据当前时间获取当前章节
 */
export function getCurrentChapter(chapters: ReplayChapter[], currentTime: number): ReplayChapter | null {
  if (!chapters.length) return null
  for (let i = chapters.length - 1; i >= 0; i--) {
    if (currentTime >= chapters[i].startTime) {
      return chapters[i]
    }
  }
  return chapters[0]
}

/**
 * 根据当前时间获取当前课件
 */
export function getCurrentSlide(slides: ReplaySlide[], currentTime: number): ReplaySlide | null {
  if (!slides.length) return null
  for (let i = slides.length - 1; i >= 0; i--) {
    if (currentTime >= slides[i].time) {
      return slides[i]
    }
  }
  return slides[0]
}
