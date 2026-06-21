"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { BackButton } from "@/components/common/back-button"
import { 
  Loader2, 
  CheckCircle, 
  XCircle, 
  UserPlus, 
  Users, 
  CreditCard, 
  Link as LinkIcon,
  QrCode,
  ArrowRight,
  RefreshCw,
  Home
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import Link from "next/link"

// 扫码结果类型
type ScanResultType = 
  | 'friend'      // 加好友
  | 'group'       // 加群
  | 'pay'         // 付款
  | 'course'      // 课程
  | 'article'     // 文章
  | 'live'        // 直播
  | 'invite'      // 邀请注册
  | 'checkin'     // 签到
  | 'url'         // 外部链接
  | 'unknown'     // 未知

// 扫码解析结果
interface ScanResult {
  type: ScanResultType
  data: Record<string, unknown>
  action?: {
    label: string
    url?: string
    handler?: string
  }
}

// 解析二维码内容
async function parseQrCode(content: string): Promise<ScanResult> {
  // 模拟解析延迟
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  // 解析热卜平台链接
  if (content.includes('rebu.com') || content.includes('rebu://')) {
    // 好友二维码
    if (content.includes('/user/') || content.includes('user=')) {
      const userId = content.match(/user[=/](\d+)/)?.[1] || '123'
      return {
        type: 'friend',
        data: {
          userId,
          nickname: '国学爱好者',
          avatar: '/placeholder.svg',
          signature: '探索国学智慧，传承传统文化',
        },
        action: { label: '添加好友', handler: 'addFriend' },
      }
    }
    
    // 群二维码
    if (content.includes('/group/') || content.includes('group=')) {
      const groupId = content.match(/group[=/](\d+)/)?.[1] || '456'
      return {
        type: 'group',
        data: {
          groupId,
          name: '八字命理交流群',
          avatar: '/placeholder.svg',
          memberCount: 128,
          description: '探讨八字命理，共同学习进步',
        },
        action: { label: '申请加入', handler: 'joinGroup' },
      }
    }
    
    // 付款码
    if (content.includes('/pay/') || content.includes('pay=')) {
      return {
        type: 'pay',
        data: {
          merchantId: '789',
          merchantName: '热卜国学',
          merchantAvatar: '/placeholder.svg',
        },
        action: { label: '立即付款', url: '/pay/transfer' },
      }
    }
    
    // 课程
    if (content.includes('/course/')) {
      const courseId = content.match(/course\/(\d+)/)?.[1] || '1'
      return {
        type: 'course',
        data: {
          courseId,
          title: '八字命理入门精讲',
          cover: '/placeholder.svg',
          price: 199,
          teacher: '张明德',
        },
        action: { label: '查看课程', url: `/course/${courseId}` },
      }
    }
    
    // 文章
    if (content.includes('/article/')) {
      const articleId = content.match(/article\/(\d+)/)?.[1] || '1'
      return {
        type: 'article',
        data: {
          articleId,
          title: '如何看懂自己的八字命盘',
          cover: '/placeholder.svg',
          author: '易学先生',
        },
        action: { label: '阅读文章', url: `/article/${articleId}` },
      }
    }
    
    // 直播
    if (content.includes('/live/')) {
      const liveId = content.match(/live\/(\d+)/)?.[1] || '1'
      return {
        type: 'live',
        data: {
          liveId,
          title: '今晚8点：八字看财运专题',
          cover: '/placeholder.svg',
          host: '王老师',
          status: 'upcoming',
        },
        action: { label: '进入直播', url: `/live/${liveId}` },
      }
    }
    
    // 邀请注册
    if (content.includes('/invite/') || content.includes('invite=')) {
      const inviteCode = content.match(/invite[=/](\w+)/)?.[1] || 'ABC123'
      return {
        type: 'invite',
        data: {
          inviteCode,
          inviterName: '国学传承者',
          inviterAvatar: '/placeholder.svg',
          benefits: ['注册即得100积分', '首单立减10元'],
        },
        action: { label: '立即注册', url: `/auth/register?invite=${inviteCode}` },
      }
    }
    
    // 签到
    if (content.includes('/checkin/')) {
      return {
        type: 'checkin',
        data: {
          eventName: '线下讲座签到',
          eventTime: '2026-06-05 14:00',
          location: '北京国学馆',
        },
        action: { label: '确认签到', handler: 'checkin' },
      }
    }
  }
  
  // 外部 URL
  if (content.startsWith('http://') || content.startsWith('https://')) {
    return {
      type: 'url',
      data: { url: content },
      action: { label: '访问链接', url: content },
    }
  }
  
  // 无法识别
  return {
    type: 'unknown',
    data: { content },
  }
}

// 获取类型配置
function getTypeConfig(type: ScanResultType) {
  const configs: Record<ScanResultType, { icon: typeof UserPlus; label: string; color: string; bgColor: string }> = {
    friend: { icon: UserPlus, label: '好友名片', color: 'text-blue-600', bgColor: 'bg-blue-50' },
    group: { icon: Users, label: '群聊', color: 'text-green-600', bgColor: 'bg-green-50' },
    pay: { icon: CreditCard, label: '收款码', color: 'text-amber-600', bgColor: 'bg-amber-50' },
    course: { icon: QrCode, label: '课程', color: 'text-purple-600', bgColor: 'bg-purple-50' },
    article: { icon: QrCode, label: '文章', color: 'text-cyan-600', bgColor: 'bg-cyan-50' },
    live: { icon: QrCode, label: '直播', color: 'text-red-600', bgColor: 'bg-red-50' },
    invite: { icon: UserPlus, label: '邀请注册', color: 'text-primary', bgColor: 'bg-primary/10' },
    checkin: { icon: CheckCircle, label: '签到', color: 'text-green-600', bgColor: 'bg-green-50' },
    url: { icon: LinkIcon, label: '外部链接', color: 'text-gray-600', bgColor: 'bg-gray-50' },
    unknown: { icon: XCircle, label: '未知', color: 'text-gray-400', bgColor: 'bg-gray-50' },
  }
  return configs[type]
}

function ScanPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const content = searchParams.get("content") || searchParams.get("data") || ""
  
  const [status, setStatus] = useState<'parsing' | 'success' | 'error'>('parsing')
  const [result, setResult] = useState<ScanResult | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (!content) {
      setStatus('error')
      return
    }
    
    parseQrCode(decodeURIComponent(content))
      .then(res => {
        setResult(res)
        setStatus(res.type === 'unknown' ? 'error' : 'success')
      })
      .catch(() => {
        setStatus('error')
      })
  }, [content])

  const handleAction = async () => {
    if (!result?.action) return
    
    if (result.action.url) {
      router.push(result.action.url)
      return
    }
    
    if (result.action.handler) {
      setActionLoading(true)
      // 模拟操作
      await new Promise(resolve => setTimeout(resolve, 1500))
      setActionLoading(false)
      
      // 根据 handler 类型处理
      switch (result.action.handler) {
        case 'addFriend':
          router.push(`/im/chat?targetId=${result.data.userId}&type=user`)
          break
        case 'joinGroup':
          router.push(`/im/group-chat/${result.data.groupId}`)
          break
        case 'checkin':
          router.push('/profile')
          break
      }
    }
  }

  const typeConfig = result ? getTypeConfig(result.type) : null
  const TypeIcon = typeConfig?.icon || QrCode

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <BackButton fallbackUrl="/" />
          <h1 className="font-semibold">扫码结果</h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="p-4">
        {/* 解析中 */}
        {status === 'parsing' && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
            <p className="text-muted-foreground">正在解析二维码...</p>
          </div>
        )}

        {/* 解析成功 */}
        {status === 'success' && result && (
          <div className="space-y-6">
            {/* 类型标识 */}
            <div className="flex justify-center">
              <div className={cn(
                "w-20 h-20 rounded-full flex items-center justify-center",
                typeConfig?.bgColor
              )}>
                <TypeIcon className={cn("w-10 h-10", typeConfig?.color)} />
              </div>
            </div>

            <p className="text-center text-muted-foreground">{typeConfig?.label}</p>

            {/* 内容卡片 */}
            <Card className="p-4">
              {/* 好友 */}
              {result.type === 'friend' && (
                <div className="flex items-center gap-4">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={result.data.avatar as string} />
                    <AvatarFallback>{(result.data.nickname as string)?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg">{result.data.nickname as string}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {result.data.signature as string}
                    </p>
                  </div>
                </div>
              )}

              {/* 群聊 */}
              {result.type === 'group' && (
                <div className="flex items-center gap-4">
                  <Avatar className="w-16 h-16 rounded-lg">
                    <AvatarImage src={result.data.avatar as string} />
                    <AvatarFallback className="rounded-lg">{(result.data.name as string)?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg">{result.data.name as string}</h3>
                    <p className="text-sm text-muted-foreground">{result.data.memberCount as number}人</p>
                    <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                      {result.data.description as string}
                    </p>
                  </div>
                </div>
              )}

              {/* 付款 */}
              {result.type === 'pay' && (
                <div className="flex items-center gap-4">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={result.data.merchantAvatar as string} />
                    <AvatarFallback>{(result.data.merchantName as string)?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg">{result.data.merchantName as string}</h3>
                    <p className="text-sm text-muted-foreground">向TA付款</p>
                  </div>
                </div>
              )}

              {/* 课程 */}
              {result.type === 'course' && (
                <div className="flex gap-3">
                  <img 
                    src={result.data.cover as string} 
                    alt={result.data.title as string}
                    className="w-24 h-16 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium line-clamp-2">{result.data.title as string}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{result.data.teacher as string}</p>
                    <p className="text-primary font-semibold mt-1">¥{result.data.price as number}</p>
                  </div>
                </div>
              )}

              {/* 文章 */}
              {result.type === 'article' && (
                <div className="flex gap-3">
                  <img 
                    src={result.data.cover as string} 
                    alt={result.data.title as string}
                    className="w-24 h-16 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium line-clamp-2">{result.data.title as string}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{result.data.author as string}</p>
                  </div>
                </div>
              )}

              {/* 直播 */}
              {result.type === 'live' && (
                <div className="flex gap-3">
                  <div className="relative">
                    <img 
                      src={result.data.cover as string} 
                      alt={result.data.title as string}
                      className="w-24 h-16 rounded-lg object-cover"
                    />
                    {result.data.status === 'live' && (
                      <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-red-500 text-white text-[10px] rounded">
                        直播中
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium line-clamp-2">{result.data.title as string}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{result.data.host as string}</p>
                  </div>
                </div>
              )}

              {/* 邀请注册 */}
              {result.type === 'invite' && (
                <div className="text-center">
                  <Avatar className="w-16 h-16 mx-auto mb-3">
                    <AvatarImage src={result.data.inviterAvatar as string} />
                    <AvatarFallback>{(result.data.inviterName as string)?.[0]}</AvatarFallback>
                  </Avatar>
                  <p className="text-muted-foreground mb-2">
                    <span className="font-medium text-foreground">{result.data.inviterName as string}</span> 邀请您加入热卜
                  </p>
                  <div className="space-y-1 mt-4">
                    {(result.data.benefits as string[])?.map((benefit, idx) => (
                      <div key={idx} className="flex items-center justify-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span>{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 签到 */}
              {result.type === 'checkin' && (
                <div className="text-center">
                  <h3 className="font-semibold text-lg">{result.data.eventName as string}</h3>
                  <p className="text-muted-foreground mt-2">{result.data.eventTime as string}</p>
                  <p className="text-muted-foreground">{result.data.location as string}</p>
                </div>
              )}

              {/* 外部链接 */}
              {result.type === 'url' && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">即将访问外部链接：</p>
                  <p className="text-sm text-blue-600 break-all">{result.data.url as string}</p>
                  <p className="text-xs text-amber-600 mt-2">请注意识别链接安全性</p>
                </div>
              )}
            </Card>

            {/* 操作按钮 */}
            {result.action && (
              <Button 
                className="w-full h-12 text-base"
                onClick={handleAction}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <ArrowRight className="w-5 h-5 mr-2" />
                )}
                {result.action.label}
              </Button>
            )}
          </div>
        )}

        {/* 解析失败 */}
        {status === 'error' && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-6">
              <XCircle className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="font-semibold text-lg mb-2">无法识别二维码</h3>
            <p className="text-muted-foreground text-center mb-6">
              {content ? '该二维码内容无法识别或已失效' : '未获取到二维码内容'}
            </p>
            
            {result?.type === 'unknown' && result.data.content && (
              <Card className="w-full p-4 mb-6">
                <p className="text-sm text-muted-foreground mb-1">原始内容：</p>
                <p className="text-sm break-all">{result.data.content as string}</p>
              </Card>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => router.back()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                重新扫码
              </Button>
              <Button variant="outline" asChild>
                <Link href="/">
                  <Home className="w-4 h-4 mr-2" />
                  返回首页
                </Link>
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default function ScanPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    }>
      <ScanPageContent />
    </Suspense>
  )
}
