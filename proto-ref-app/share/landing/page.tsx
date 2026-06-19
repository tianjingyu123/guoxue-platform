"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { 
  Download, 
  Play, 
  BookOpen, 
  Users, 
  Star, 
  Clock, 
  Eye,
  ShoppingBag,
  Radio,
  FileText,
  ChevronRight,
  Smartphone,
  X
} from "lucide-react"
import { cn } from "@/lib/utils"

// 分享内容类型
type ShareType = 'course' | 'article' | 'live' | 'product' | 'teacher' | 'invite'

// 模拟获取分享内容
async function getShareContent(type: ShareType, id: string) {
  await new Promise(resolve => setTimeout(resolve, 300))
  
  const contents: Record<ShareType, object> = {
    course: {
      type: 'course',
      title: '八字命理精讲：从入门到精通',
      cover: '/placeholder.svg?height=200&width=360',
      teacher: { name: '张明德', avatar: '/placeholder.svg', title: '资深命理师' },
      price: 299,
      originalPrice: 599,
      studentCount: 3256,
      rating: 4.9,
      lessons: 48,
      duration: '24小时',
      description: '系统讲解八字命理基础知识，从天干地支到排盘解读，由浅入深，适合零基础学员...',
    },
    article: {
      type: 'article',
      title: '如何看懂自己的八字命盘？一文读懂命理学入门',
      cover: '/placeholder.svg?height=180&width=360',
      author: { name: '易学研究院', avatar: '/placeholder.svg' },
      readCount: 12580,
      likeCount: 856,
      publishedAt: '2026-06-01',
      summary: '八字命理是中国传统文化中的重要组成部分，通过出生年月日时的天干地支组合，可以推算出一个人的命运走向...',
    },
    live: {
      type: 'live',
      title: '今日八字运势解析 - 互动答疑专场',
      cover: '/placeholder.svg?height=200&width=360',
      host: { name: '王老师', avatar: '/placeholder.svg', title: '首席讲师' },
      status: 'upcoming',
      startTime: '2026-06-05 20:00',
      viewerCount: 0,
      reserveCount: 1280,
    },
    product: {
      type: 'product',
      title: '专业风水罗盘 - 纯铜精制',
      cover: '/placeholder.svg?height=200&width=200',
      price: 688,
      originalPrice: 998,
      sales: 526,
      rating: 4.8,
      description: '纯铜精制，做工精细，适合专业风水师使用...',
    },
    teacher: {
      type: 'teacher',
      name: '张明德',
      avatar: '/placeholder.svg?height=120&width=120',
      title: '资深命理师 · 风水大师',
      followers: 12800,
      courses: 15,
      students: 8600,
      intro: '从事命理研究30余年，师从多位名师，擅长八字命理、风水堪舆...',
    },
    invite: {
      type: 'invite',
      inviter: { name: '国学爱好者', avatar: '/placeholder.svg' },
      title: '邀请您加入热卜',
      subtitle: '探索国学智慧，开启命理之旅',
      benefits: ['新用户注册送100积分', '首次购课享9折优惠', '专属学习礼包'],
    },
  }
  
  return contents[type] || contents.course
}

function ShareLandingContent() {
  const searchParams = useSearchParams()
  const type = (searchParams.get("type") || "course") as ShareType
  const id = searchParams.get("id") || "1"
  
  const [content, setContent] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDownloadTip, setShowDownloadTip] = useState(false)

  useEffect(() => {
    getShareContent(type, id).then(data => {
      setContent(data as Record<string, unknown>)
      setLoading(false)
    })
  }, [type, id])

  const handleOpenApp = () => {
    // 尝试唤起App
    const scheme = `rebu://share?type=${type}&id=${id}`
    const startTime = Date.now()
    
    window.location.href = scheme
    
    // 如果2秒后还在页面，说明没有安装App，显示下载提示
    setTimeout(() => {
      if (Date.now() - startTime < 2500) {
        setShowDownloadTip(true)
      }
    }, 2000)
  }

  const handleDownload = () => {
    // 跳转到应用商店
    const ua = navigator.userAgent.toLowerCase()
    if (/iphone|ipad|ipod/.test(ua)) {
      window.location.href = 'https://apps.apple.com/app/rebu'
    } else {
      window.location.href = 'https://play.google.com/store/apps/details?id=com.rebu.app'
    }
  }

  // 渲染课程预览
  const renderCoursePreview = () => {
    const course = content as Record<string, unknown>
    const teacher = course.teacher as Record<string, string>
    return (
      <div className="space-y-4">
        <div className="relative aspect-video rounded-xl overflow-hidden">
          <img 
            src={course.cover as string} 
            alt={course.title as string}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
              <Play className="w-8 h-8 text-primary ml-1" />
            </div>
          </div>
          <Badge className="absolute top-3 left-3 bg-primary">精品课程</Badge>
        </div>
        
        <h1 className="text-xl font-bold">{course.title as string}</h1>
        
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={teacher.avatar} />
            <AvatarFallback>{teacher.name[0]}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{teacher.name}</p>
            <p className="text-xs text-muted-foreground">{teacher.title}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="w-4 h-4" />{(course.studentCount as number).toLocaleString()}人学习
          </span>
          <span className="flex items-center gap-1">
            <Star className="w-4 h-4 text-amber-500" />{course.rating as number}分
          </span>
          <span className="flex items-center gap-1">
            <BookOpen className="w-4 h-4" />{course.lessons as number}节
          </span>
        </div>
        
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-primary">¥{course.price as number}</span>
          <span className="text-sm text-muted-foreground line-through">¥{course.originalPrice as number}</span>
        </div>
        
        <Card className="p-4 bg-muted/30">
          <p className="text-sm text-muted-foreground line-clamp-3">{course.description as string}</p>
        </Card>
      </div>
    )
  }

  // 渲染文章预览
  const renderArticlePreview = () => {
    const article = content as Record<string, unknown>
    const author = article.author as Record<string, string>
    return (
      <div className="space-y-4">
        <div className="aspect-[2/1] rounded-xl overflow-hidden">
          <img 
            src={article.cover as string} 
            alt={article.title as string}
            className="w-full h-full object-cover"
          />
        </div>
        
        <h1 className="text-xl font-bold leading-tight">{article.title as string}</h1>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="w-8 h-8">
              <AvatarImage src={author.avatar} />
              <AvatarFallback>{author.name[0]}</AvatarFallback>
            </Avatar>
            <span className="text-sm">{author.name}</span>
          </div>
          <span className="text-xs text-muted-foreground">{article.publishedAt as string}</span>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Eye className="w-4 h-4" />{(article.readCount as number).toLocaleString()}阅读
          </span>
          <span className="flex items-center gap-1">
            <Star className="w-4 h-4" />{article.likeCount as number}点赞
          </span>
        </div>
        
        <Card className="p-4 bg-muted/30">
          <p className="text-sm text-muted-foreground">{article.summary as string}</p>
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">打开App查看完整内容</p>
          </div>
        </Card>
      </div>
    )
  }

  // 渲染直播预览
  const renderLivePreview = () => {
    const live = content as Record<string, unknown>
    const host = live.host as Record<string, string>
    return (
      <div className="space-y-4">
        <div className="relative aspect-video rounded-xl overflow-hidden">
          <img 
            src={live.cover as string} 
            alt={live.title as string}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <Badge className="absolute top-3 left-3 bg-orange-500">
            <Radio className="w-3 h-3 mr-1" />即将开播
          </Badge>
        </div>
        
        <h1 className="text-xl font-bold">{live.title as string}</h1>
        
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10 ring-2 ring-primary">
            <AvatarImage src={host.avatar} />
            <AvatarFallback>{host.name[0]}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{host.name}</p>
            <p className="text-xs text-muted-foreground">{host.title}</p>
          </div>
        </div>
        
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-center gap-2 text-primary">
            <Clock className="w-4 h-4" />
            <span className="font-medium">开播时间：{live.startTime as string}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            已有 {(live.reserveCount as number).toLocaleString()} 人预约
          </p>
        </Card>
      </div>
    )
  }

  // 渲染商品预览
  const renderProductPreview = () => {
    const product = content as Record<string, unknown>
    return (
      <div className="space-y-4">
        <div className="aspect-square rounded-xl overflow-hidden bg-muted">
          <img 
            src={product.cover as string} 
            alt={product.title as string}
            className="w-full h-full object-contain"
          />
        </div>
        
        <h1 className="text-xl font-bold">{product.title as string}</h1>
        
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-primary">¥{product.price as number}</span>
          <span className="text-sm text-muted-foreground line-through">¥{product.originalPrice as number}</span>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <ShoppingBag className="w-4 h-4" />已售{product.sales as number}件
          </span>
          <span className="flex items-center gap-1">
            <Star className="w-4 h-4 text-amber-500" />{product.rating as number}分
          </span>
        </div>
        
        <Card className="p-4 bg-muted/30">
          <p className="text-sm text-muted-foreground">{product.description as string}</p>
        </Card>
      </div>
    )
  }

  // 渲染讲师预览
  const renderTeacherPreview = () => {
    const teacher = content as Record<string, unknown>
    return (
      <div className="space-y-4 text-center">
        <Avatar className="w-24 h-24 mx-auto ring-4 ring-primary/20">
          <AvatarImage src={teacher.avatar as string} />
          <AvatarFallback className="text-2xl">{(teacher.name as string)[0]}</AvatarFallback>
        </Avatar>
        
        <div>
          <h1 className="text-xl font-bold">{teacher.name as string}</h1>
          <p className="text-sm text-muted-foreground mt-1">{teacher.title as string}</p>
        </div>
        
        <div className="flex justify-center gap-8">
          <div className="text-center">
            <p className="text-xl font-bold text-primary">{((teacher.followers as number) / 1000).toFixed(1)}k</p>
            <p className="text-xs text-muted-foreground">粉丝</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-primary">{teacher.courses as number}</p>
            <p className="text-xs text-muted-foreground">课程</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-primary">{((teacher.students as number) / 1000).toFixed(1)}k</p>
            <p className="text-xs text-muted-foreground">学员</p>
          </div>
        </div>
        
        <Card className="p-4 bg-muted/30 text-left">
          <p className="text-sm text-muted-foreground">{teacher.intro as string}</p>
        </Card>
      </div>
    )
  }

  // 渲染邀请预览
  const renderInvitePreview = () => {
    const invite = content as Record<string, unknown>
    const inviter = invite.inviter as Record<string, string>
    const benefits = invite.benefits as string[]
    return (
      <div className="space-y-6 text-center">
        <div className="py-6">
          <Avatar className="w-16 h-16 mx-auto mb-3">
            <AvatarImage src={inviter.avatar} />
            <AvatarFallback>{inviter.name[0]}</AvatarFallback>
          </Avatar>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{inviter.name}</span> 邀请您加入
          </p>
        </div>
        
        <div>
          <h1 className="text-2xl font-bold">{invite.title as string}</h1>
          <p className="text-muted-foreground mt-2">{invite.subtitle as string}</p>
        </div>
        
        <Card className="p-4 bg-primary/5 border-primary/20">
          <p className="text-sm font-medium text-primary mb-3">新用户专属福利</p>
          <div className="space-y-2">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-xs text-primary font-medium">{index + 1}</span>
                </div>
                <span>{benefit}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    )
  }

  // 根据类型渲染内容
  const renderContent = () => {
    if (!content) return null
    
    switch (type) {
      case 'course': return renderCoursePreview()
      case 'article': return renderArticlePreview()
      case 'live': return renderLivePreview()
      case 'product': return renderProductPreview()
      case 'teacher': return renderTeacherPreview()
      case 'invite': return renderInvitePreview()
      default: return renderCoursePreview()
    }
  }

  // 获取类型图标
  const getTypeIcon = () => {
    const icons: Record<ShareType, React.ReactNode> = {
      course: <BookOpen className="w-4 h-4" />,
      article: <FileText className="w-4 h-4" />,
      live: <Radio className="w-4 h-4" />,
      product: <ShoppingBag className="w-4 h-4" />,
      teacher: <Users className="w-4 h-4" />,
      invite: <Users className="w-4 h-4" />,
    }
    return icons[type]
  }

  const getTypeLabel = () => {
    const labels: Record<ShareType, string> = {
      course: '课程',
      article: '文章',
      live: '直播',
      product: '商品',
      teacher: '讲师',
      invite: '邀请',
    }
    return labels[type]
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">热卜</span>
            </div>
            <span className="font-medium">国学知识平台</span>
          </div>
          <Button size="sm" onClick={handleOpenApp}>
            打开App
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </header>

      {/* 内容区域 */}
      <main className="flex-1 px-4 py-6 pb-24">
        {loading ? (
          <div className="space-y-4 animate-pulse">
            <div className="aspect-video bg-muted rounded-xl" />
            <div className="h-6 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-20 bg-muted rounded" />
          </div>
        ) : (
          <>
            {/* 类型标签 */}
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="outline" className="gap-1">
                {getTypeIcon()}
                {getTypeLabel()}分享
              </Badge>
            </div>
            
            {renderContent()}
          </>
        )}
      </main>

      {/* 底部固定栏 */}
      <footer className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 safe-area-inset-bottom">
        <Button 
          className="w-full h-12 text-base gap-2" 
          onClick={handleOpenApp}
        >
          <Smartphone className="w-5 h-5" />
          打开App查看完整内容
        </Button>
        <p className="text-xs text-center text-muted-foreground mt-2">
          下载热卜App，解锁更多国学内容
        </p>
      </footer>

      {/* 下载提示弹窗 */}
      {showDownloadTip && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center">
          <div className="w-full max-w-lg bg-background rounded-t-2xl p-6 animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">下载热卜App</h3>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowDownloadTip(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-xl">热卜</span>
              </div>
              <div>
                <p className="font-medium">热卜 - 国学知识平台</p>
                <p className="text-sm text-muted-foreground">探索国学智慧，开启命理之旅</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <Button className="w-full h-12 gap-2" onClick={handleDownload}>
                <Download className="w-5 h-5" />
                立即下载
              </Button>
              <Button 
                variant="outline" 
                className="w-full h-12"
                onClick={() => setShowDownloadTip(false)}
              >
                继续浏览
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ShareLandingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    }>
      <ShareLandingContent />
    </Suspense>
  )
}
