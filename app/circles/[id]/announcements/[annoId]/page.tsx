"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Share2, Pin, Check, Bell, ChevronRight, Clock, Eye } from "lucide-react"
import { circleApi, type Announcement } from "@/lib/api"

// ============================================================
// 骨架屏
// ============================================================
function AnnouncementSkeleton() {
  return (
    <div className="min-h-screen bg-[#FAF8F5] animate-pulse">
      <div className="h-14 bg-[#C41E3A]" />
      <div className="px-4 py-5 space-y-4">
        <div className="h-5 bg-[#F2EFEA] rounded w-3/4" />
        <div className="h-3 bg-[#F2EFEA] rounded w-1/3" />
        <div className="space-y-2 pt-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-4 bg-[#F2EFEA] rounded w-full" />
          ))}
          <div className="h-4 bg-[#F2EFEA] rounded w-2/3" />
        </div>
      </div>
    </div>
  )
}

// ============================================================
// 模拟数据
// ============================================================
const mockAnnouncement: Announcement = {
  id: "1",
  circleId: "c1",
  circleName: "八字命理研习社",
  title: "圈子重要规则更新：关于内容质量与互动规范的说明",
  content: `亲爱的圈友们：

为了给大家提供更好的学习交流环境，圈子管理团队经过讨论，决定对圈子规则进行更新。请各位圈友仔细阅读以下内容：

**一、内容质量要求**

1. 所有发帖须与命理、国学相关，严禁发布无关广告、营销内容；
2. 提倡原创内容，转载须注明来源，严禁直接搬运他人付费内容；
3. 对他人的命盘分析须基于专业知识，不得无依据妄下论断；
4. 鼓励图文并茂，高质量帖子将获得精华标注并获得额外积分奖励。

**二、互动规范**

1. 评论须礼貌友善，禁止人身攻击、谩骂或带有侮辱性语言；
2. 圈内讨论应基于理性分析，欢迎不同观点，但须以事实为据；
3. 私信功能须用于正当学习交流，严禁骚扰行为；
4. 发现违规内容请通过举报功能反映，切勿在评论区引战。

**三、违规处理**

• 首次违规：警告并删除违规内容
• 二次违规：禁言3天
• 三次及以上：移出圈子，严重者永久封禁

**四、新功能上线**

本周我们将上线"每周精华"评选活动，每周日由管理团队评选5篇优质帖子，作者将获得：
- 精华徽章展示
- 50积分奖励  
- 优先推荐展示权益

感谢大家的支持与配合，我们共同维护一个高质量的国学学习社区！`,
  isPinned: true,
  isRead: false,
  readCount: 328,
  publishedAt: "2024-01-15T09:00:00Z",
  author: { id: "u1", name: "圈子管理员", avatar: "" },
}

const mockRelated: Announcement[] = [
  {
    id: "2", circleId: "c1", circleName: "八字命理研习社",
    title: "关于圈子积分系统升级的公告",
    content: "",
    isPinned: false, isRead: true, readCount: 215,
    publishedAt: "2024-01-10T09:00:00Z",
    author: { id: "u1", name: "圈子管理员", avatar: "" },
  },
  {
    id: "3", circleId: "c1", circleName: "八字命理研习社",
    title: "新年活动：八字2024年运势公益解读报名开始",
    content: "",
    isPinned: false, isRead: true, readCount: 487,
    publishedAt: "2024-01-05T09:00:00Z",
    author: { id: "u1", name: "圈子管理员", avatar: "" },
  },
]

// ============================================================
// 富文本渲染（简单解析 markdown 加粗/换行/列表）
// ============================================================
function RichContent({ content }: { content: string }) {
  const lines = content.split("\n")
  return (
    <div className="space-y-2 text-[15px] leading-7 text-[#444]">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-2" />
        // 加粗标题
        if (line.startsWith("**") && line.endsWith("**")) {
          return (
            <p key={i} className="font-semibold text-[#2C2C2C] mt-4 mb-1">
              {line.replace(/\*\*/g, "")}
            </p>
          )
        }
        // 数字列表
        if (/^\d+\./.test(line)) {
          return (
            <p key={i} className="pl-4 text-[#555]">
              {line}
            </p>
          )
        }
        // 点列表
        if (line.startsWith("• ")) {
          return (
            <p key={i} className="pl-4 flex gap-2 text-[#555]">
              <span className="text-[#C41E3A] mt-1 shrink-0">•</span>
              <span>{line.slice(2)}</span>
            </p>
          )
        }
        // 横线
        if (line.trim() === "---") return <hr key={i} className="border-[#E8E3DB] my-3" />
        return <p key={i} className="text-[#555]">{line}</p>
      })}
    </div>
  )
}

// ============================================================
// 时间格式化
// ============================================================
function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
}

// ============================================================
// 主内容组件
// ============================================================
function AnnouncementDetailContent() {
  const router = useRouter()
  const params = useParams()
  const circleId = params.id as string
  const annoId = params.annoId as string

  const [announcement, setAnnouncement] = useState<Announcement | null>(null)
  const [related, setRelated] = useState<Announcement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRead, setIsRead] = useState(false)
  const [showShareToast, setShowShareToast] = useState(false)
  const [showReadToast, setShowReadToast] = useState(false)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      try {
        const [annoRes, allRes] = await Promise.all([
          circleApi.getAnnouncement(circleId),
          circleApi.listAnnouncements(circleId),
        ])
        // API 返回单条公告，用 annoId 匹配
        const found = (allRes as any[])?.find?.((a: any) => a.id === annoId)
        setAnnouncement((found as Announcement) || mockAnnouncement)
        setIsRead(found?.isRead || mockAnnouncement.isRead)
        setRelated(
          ((allRes as any[])?.filter?.((a: any) => a.id !== annoId) || mockRelated).slice(0, 3)
        )
      } catch {
        setAnnouncement(mockAnnouncement)
        setRelated(mockRelated)
        setIsRead(mockAnnouncement.isRead)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [circleId, annoId])

  const handleRead = async () => {
    if (isRead) return
    try {
      await circleApi.markAnnouncementRead(circleId, annoId)
    } catch { /* ignore */ }
    setIsRead(true)
    setShowReadToast(true)
    setTimeout(() => setShowReadToast(false), 2000)
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: announcement?.title, url: window.location.href }).catch(() => {})
    } else {
      navigator.clipboard.writeText(window.location.href).catch(() => {})
      setShowShareToast(true)
      setTimeout(() => setShowShareToast(false), 2000)
    }
  }

  if (isLoading) return <AnnouncementSkeleton />
  if (!announcement) return null

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-28">
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-30 bg-[#C41E3A] flex items-center h-14 px-4 gap-3">
        <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center rounded-full bg-white/15">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <span className="flex-1 text-white font-medium text-base truncate">圈子公告</span>
        <button onClick={handleShare} className="w-9 h-9 flex items-center justify-center rounded-full bg-white/15">
          <Share2 className="w-5 h-5 text-white" />
        </button>
      </header>

      {/* 圈子来源标签 */}
      <div
        className="flex items-center gap-2 px-4 py-3 bg-white border-b border-[#F0EBE3] cursor-pointer"
        onClick={() => router.push(`/circles/${circleId}`)}
      >
        <Bell className="w-4 h-4 text-[#C41E3A]" />
        <span className="text-sm text-[#666] flex-1">来自圈子：<span className="text-[#C41E3A] font-medium">{announcement.circleName}</span></span>
        <ChevronRight className="w-4 h-4 text-[#999]" />
      </div>

      {/* 主内容卡片 */}
      <div className="mx-4 mt-4 bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.06)] overflow-hidden">
        {/* 置顶标识 */}
        {announcement.isPinned && (
          <div className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-[#FFF8E7] to-[#FFFDF5] border-b border-[#F5EDD0]">
            <Pin className="w-3.5 h-3.5 text-[#C9A96E]" />
            <span className="text-xs font-medium text-[#C9A96E]">置顶公告</span>
          </div>
        )}

        <div className="p-5">
          {/* 标题 */}
          <h1 className="text-[17px] font-bold text-[#2C2C2C] leading-snug mb-3">
            {announcement.title}
          </h1>

          {/* 元信息 */}
          <div className="flex items-center gap-4 pb-4 mb-4 border-b border-[#F5F0E8]">
            <div className="flex items-center gap-1.5">
              {announcement.author.avatar ? (
                <img src={announcement.author.avatar} className="w-5 h-5 rounded-full" alt="" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-[#C41E3A] flex items-center justify-center">
                  <span className="text-[8px] text-white font-bold">管</span>
                </div>
              )}
              <span className="text-xs text-[#666]">{announcement.author.name}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-[#999]">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatDate(announcement.publishedAt)}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-[#999] ml-auto">
              <Eye className="w-3.5 h-3.5" />
              <span>{announcement.readCount} 已读</span>
            </div>
          </div>

          {/* 正文富文本 */}
          <RichContent content={announcement.content} />
        </div>
      </div>

      {/* 相关公告 */}
      {related.length > 0 && (
        <div className="mx-4 mt-4">
          <h3 className="text-sm font-semibold text-[#2C2C2C] mb-3">其他公告</h3>
          <div className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.06)] overflow-hidden divide-y divide-[#F5F0E8]">
            {related.map(item => (
              <button
                key={item.id}
                onClick={() => router.push(`/circles/${circleId}/announcements/${item.id}`)}
                className="w-full flex items-start gap-3 px-4 py-3.5 text-left hover:bg-[#FAF8F5] transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-[#FEF0F0] flex items-center justify-center shrink-0 mt-0.5">
                  {item.isPinned ? (
                    <Pin className="w-3.5 h-3.5 text-[#C9A96E]" />
                  ) : (
                    <Bell className="w-3.5 h-3.5 text-[#C41E3A]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-snug truncate ${item.isRead ? "text-[#999]" : "text-[#2C2C2C] font-medium"}`}>
                    {item.title}
                  </p>
                  <p className="text-xs text-[#999] mt-0.5">{formatDate(item.publishedAt)}</p>
                </div>
                {!item.isRead && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C41E3A] shrink-0 mt-2" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 底部"已读"确认按钮区 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#F0EBE3] px-4 py-3 flex gap-3 safe-area-pb">
        <button
          onClick={() => router.push(`/circles/${circleId}`)}
          className="flex-1 h-11 rounded-xl border border-[#E8E3DB] text-[#666] text-sm font-medium"
        >
          返回圈子
        </button>
        <button
          onClick={handleRead}
          disabled={isRead}
          className={`flex-1 h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
            isRead
              ? "bg-[#F5F0E8] text-[#999] cursor-not-allowed"
              : "bg-gradient-to-r from-[#C41E3A] to-[#E8294A] text-white shadow-[0_4px_12px_rgba(196,30,58,0.3)]"
          }`}
        >
          <Check className="w-4 h-4" />
          {isRead ? "已确认阅读" : "确认已读"}
        </button>
      </div>

      {/* Toast 提示 */}
      {showReadToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#2C2C2C]/90 text-white text-sm px-4 py-2 rounded-full flex items-center gap-2">
          <Check className="w-4 h-4 text-green-400" />
          已标记为已读
        </div>
      )}
      {showShareToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#2C2C2C]/90 text-white text-sm px-4 py-2 rounded-full">
          链接已复制
        </div>
      )}
    </div>
  )
}

// ============================================================
// 导出
// ============================================================
export default function AnnouncementDetailPage() {
  return (
    <Suspense fallback={<AnnouncementSkeleton />}>
      <AnnouncementDetailContent />
    </Suspense>
  )
}
