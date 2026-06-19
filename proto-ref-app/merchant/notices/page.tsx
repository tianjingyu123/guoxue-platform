'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Megaphone, Clock, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// Mock data - 商家公告
const mockNotices = [
  {
    id: '1',
    type: 'important',
    title: '紧急：商品发布规则重大调整',
    content: '自2024年2月1日起，所有商品需通过新的质量审核体系。请及时更新您的商品信息，以确保符合新规则。',
    category: '规则',
    time: '2024-01-20 10:30',
    read: false,
  },
  {
    id: '2',
    type: 'activity',
    title: '春节特卖活动报名开始',
    content: '春节将至，平台推出春节特卖活动。符合条件的商家可免费参加，机会有限，请尽快报名。',
    category: '活动',
    time: '2024-01-19 15:20',
    read: false,
  },
  {
    id: '3',
    type: 'warning',
    title: '警告：您的店铺存在违规商品',
    content: '我们发现您的店铺中存在2件违规商品，请在24小时内进行处理，否则可能面临处罚。',
    category: '警告',
    time: '2024-01-18 09:45',
    read: true,
  },
  {
    id: '4',
    type: 'success',
    title: '恭喜！您成功升级为高级商家',
    content: '感谢您的持续支持与优秀的经营表现，您已经升级为高级商家等级，可享受更多权益。',
    category: '成就',
    time: '2024-01-17 14:10',
    read: true,
  },
  {
    id: '5',
    type: 'info',
    title: '平台系统升级通知',
    content: '平台将于本周日凌晨进行系统维护，维护期间可能影响服务。感谢您的理解与支持。',
    category: '系统',
    time: '2024-01-16 11:20',
    read: true,
  },
]

const getNoticeIcon = (type: string) => {
  switch (type) {
    case 'important':
      return <AlertTriangle className="w-5 h-5 text-red-600" />
    case 'activity':
      return <Megaphone className="w-5 h-5 text-blue-600" />
    case 'warning':
      return <AlertCircle className="w-5 h-5 text-orange-600" />
    case 'success':
      return <CheckCircle className="w-5 h-5 text-green-600" />
    default:
      return <Megaphone className="w-5 h-5 text-foreground/60" />
  }
}

const getNoticeColor = (type: string) => {
  switch (type) {
    case 'important':
      return 'bg-red-50 border-red-200'
    case 'activity':
      return 'bg-blue-50 border-blue-200'
    case 'warning':
      return 'bg-orange-50 border-orange-200'
    case 'success':
      return 'bg-green-50 border-green-200'
    default:
      return 'bg-muted'
  }
}

const getCategoryBadgeColor = (category: string) => {
  switch (category) {
    case '规则':
      return 'bg-red-100 text-red-800'
    case '活动':
      return 'bg-blue-100 text-blue-800'
    case '警告':
      return 'bg-orange-100 text-orange-800'
    case '成就':
      return 'bg-green-100 text-green-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export default function NoticesPage() {
  const router = useRouter()
  const [notices, setNotices] = useState(mockNotices)
  const [selectedNotice, setSelectedNotice] = useState<typeof mockNotices[0] | null>(null)

  const unreadCount = notices.filter(n => !n.read).length

  const handleNoticeClick = (notice: typeof mockNotices[0]) => {
    setSelectedNotice(notice)
    if (!notice.read) {
      setNotices(notices.map(n => n.id === notice.id ? { ...n, read: true } : n))
    }
  }

  const handleBack = () => {
    setSelectedNotice(null)
  }

  if (selectedNotice) {
    return (
      <div className="min-h-screen bg-background">
        {/* 顶部导航 */}
        <div className="sticky top-0 z-10 bg-background border-b border-border">
          <div className="flex items-center justify-between px-4 py-3">
            <button onClick={handleBack} className="p-1">
              <ArrowLeft className="w-6 h-6 text-foreground" />
            </button>
            <h1 className="text-lg font-semibold text-foreground">公告详情</h1>
            <div className="w-8" />
          </div>
        </div>

        <div className="pb-20">
          {/* 内容 */}
          <div className={`mx-4 mt-4 p-4 rounded-xl border ${getNoticeColor(selectedNotice.type)}`}>
            <div className="flex items-start gap-3 mb-4">
              {getNoticeIcon(selectedNotice.type)}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-lg font-semibold text-foreground">{selectedNotice.title}</h2>
                  <Badge className={`${getCategoryBadgeColor(selectedNotice.category)}`}>
                    {selectedNotice.category}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  {selectedNotice.time}
                </div>
              </div>
            </div>

            <p className="text-foreground leading-relaxed whitespace-pre-wrap">
              {selectedNotice.content}
            </p>
          </div>

          {/* 相关链接 */}
          <div className="mx-4 mt-6">
            <h3 className="text-sm font-semibold text-foreground mb-3">相关操作</h3>
            <div className="space-y-2">
              {selectedNotice.type === 'important' && (
                <button className="w-full p-3 text-left bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-lg text-primary font-medium transition-colors">
                  查看新规则详情
                </button>
              )}
              {selectedNotice.type === 'activity' && (
                <button className="w-full p-3 text-left bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-lg text-primary font-medium transition-colors">
                  立即报名活动
                </button>
              )}
              {selectedNotice.type === 'warning' && (
                <button className="w-full p-3 text-left bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-lg text-primary font-medium transition-colors">
                  查看违规商品
                </button>
              )}
              <button
                onClick={handleBack}
                className="w-full p-3 text-left bg-muted hover:bg-muted/80 rounded-lg text-foreground font-medium transition-colors"
              >
                返回列表
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => router.back()} className="p-1">
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">商家公告</h1>
          <div className="w-8" />
        </div>
      </div>

      <div className="pb-20">
        {/* 未读提示 */}
        {unreadCount > 0 && (
          <div className="mx-4 mt-4 p-3 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-between">
            <span className="text-sm text-foreground font-medium">
              您有 {unreadCount} 条未读公告
            </span>
            <button
              onClick={() => setNotices(notices.map(n => ({ ...n, read: true })))}
              className="text-xs text-primary hover:underline"
            >
              全部标记已读
            </button>
          </div>
        )}

        {/* 公告列表 */}
        <div className="mx-4 mt-4">
          <div className="space-y-2">
            {notices.map(notice => (
              <button
                key={notice.id}
                onClick={() => handleNoticeClick(notice)}
                className={`w-full p-4 rounded-xl border transition-all text-left ${
                  getNoticeColor(notice.type)
                } ${!notice.read ? 'ring-2 ring-primary/30' : ''}`}
              >
                <div className="flex items-start gap-3">
                  {getNoticeIcon(notice.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground flex-1 truncate">
                        {notice.title}
                      </h3>
                      {!notice.read && (
                        <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-foreground/70 line-clamp-2 mb-2">
                      {notice.content}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className={getCategoryBadgeColor(notice.category)}>
                        {notice.category}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {notice.time}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
