"use client"

import { useState, useEffect, use } from "react"
import { BackButton } from "@/components/common/back-button"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Users, 
  Share2, 
  Heart, 
  ChevronRight,
  CheckCircle,
  AlertCircle,
  QrCode,
  CalendarPlus,
  Phone,
  Navigation,
  X,
  Loader2,
  BookOpen,
  Award,
  GraduationCap,
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { toast } from "sonner"
import { 
  getOfflineCourseDetail, 
  enrollOfflineCourse, 
  cancelEnrollment,
  addToCalendar,
  getCourseStatusLabel,
  getCourseStatusColor,
  getNavigationUrl,
} from "@/lib/api/offline"
import type { OfflineCourseDetail } from "@/lib/types/offline"

interface PageProps {
  params: Promise<{ id: string }>
}

export default function OfflineCourseDetailPage({ params }: PageProps) {
  const resolvedParams = use(params)
  const courseId = Number(resolvedParams.id)
  
  const [course, setCourse] = useState<OfflineCourseDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [showQrCode, setShowQrCode] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [isFavorited, setIsFavorited] = useState(false)

  useEffect(() => {
    loadCourseDetail()
  }, [courseId])

  const loadCourseDetail = async () => {
    setLoading(true)
    try {
      const response = await getOfflineCourseDetail(courseId)
      if (response.code === 200 && response.data) {
        setCourse(response.data)
      }
    } catch (error) {
      toast.error('加载失败')
    } finally {
      setLoading(false)
    }
  }

  const handleEnroll = async () => {
    if (!course) return
    
    // 如果有价格，跳转支付
    if (course.price && course.price > 0) {
      toast.info('正在跳转支付...')
      // 实际应跳转支付页面
      return
    }
    
    setEnrolling(true)
    try {
      const response = await enrollOfflineCourse(courseId)
      if (response.code === 200 && response.data.success) {
        toast.success('报名成功')
        // 更新课程状态
        setCourse(prev => prev ? {
          ...prev,
          myEnrollment: {
            id: response.data.enrollmentId || 0,
            status: 'confirmed',
            enrollTime: new Date().toISOString(),
            qrCode: response.data.qrCode,
            seatNo: response.data.seatNo,
          },
          currentParticipants: (prev.currentParticipants || 0) + 1,
        } : null)
        setShowQrCode(true)
      } else {
        toast.error(response.message || '报名失败')
      }
    } catch (error) {
      toast.error('网络错误')
    } finally {
      setEnrolling(false)
    }
  }

  const handleCancel = async () => {
    setCancelling(true)
    try {
      const response = await cancelEnrollment(courseId)
      if (response.code === 200 && response.data.success) {
        toast.success(`取消成功${response.data.refundAmount ? `，${response.data.refundStatus}` : ''}`)
        setCourse(prev => prev ? {
          ...prev,
          myEnrollment: undefined,
          currentParticipants: Math.max((prev.currentParticipants || 1) - 1, 0),
        } : null)
        setShowCancelConfirm(false)
      } else {
        toast.error(response.message || '取消失败')
      }
    } catch (error) {
      toast.error('网络错误')
    } finally {
      setCancelling(false)
    }
  }

  const handleAddToCalendar = async () => {
    try {
      const response = await addToCalendar(courseId)
      if (response.code === 200) {
        toast.success('已添加到日历')
      }
    } catch (error) {
      toast.error('添加失败')
    }
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: course?.title,
        text: `${course?.title} - 热卜线下课程`,
        url: window.location.href,
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      toast.success('链接已复制')
    }
  }

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
          <div className="flex items-center justify-between px-4 h-14">
            <BackButton fallbackPath="/offline/courses" />
            <h1 className="font-medium">课程详情</h1>
            <div className="w-10" />
          </div>
        </header>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
          <div className="flex items-center justify-between px-4 h-14">
            <BackButton fallbackPath="/offline/courses" />
            <h1 className="font-medium">课程详情</h1>
            <div className="w-10" />
          </div>
        </header>
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <AlertCircle className="w-12 h-12 mb-2" />
          <p>课程不存在</p>
        </div>
      </div>
    )
  }

  const isEnrolled = !!course.myEnrollment
  const canEnroll = course.status === 'enrolling' && !isEnrolled
  const isFull = course.status === 'full'
  const participants = course.currentParticipants || course.enrolledCount || 0
  const maxParticipants = course.maxParticipants || course.maxEnrollment || 0

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* 头部 */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <BackButton fallbackPath="/offline/courses" />
          <h1 className="font-medium truncate max-w-[200px]">{course.title}</h1>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsFavorited(!isFavorited)}
              className="p-2"
            >
              <Heart className={cn("w-5 h-5", isFavorited ? "fill-red-500 text-red-500" : "text-muted-foreground")} />
            </button>
            <button onClick={handleShare} className="p-2">
              <Share2 className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </header>

      {/* 封面图 */}
      <div className="relative aspect-video bg-secondary">
        <img src={course.cover} alt={course.title} className="w-full h-full object-cover" />
        <Badge className={cn("absolute top-3 left-3", getCourseStatusColor(course.status))}>
          {getCourseStatusLabel(course.status)}
        </Badge>
        {course.price === 0 && (
          <Badge className="absolute top-3 right-3 bg-green-500 text-white">免费</Badge>
        )}
      </div>

      {/* 基本信息 */}
      <div className="p-4 space-y-4">
        <div>
          <h1 className="text-xl font-bold mb-2">{course.title}</h1>
          {course.tags && course.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {course.tags.map((tag, i) => (
                <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
              ))}
            </div>
          )}
          <p className="text-sm text-muted-foreground">{course.description}</p>
        </div>

        {/* 价格 */}
        <div className="flex items-baseline gap-2">
          {course.price === 0 ? (
            <span className="text-2xl font-bold text-green-600">免费</span>
          ) : (
            <>
              <span className="text-2xl font-bold text-primary">¥{course.price}</span>
              {course.originalPrice && course.originalPrice > course.price && (
                <span className="text-sm text-muted-foreground line-through">¥{course.originalPrice}</span>
              )}
            </>
          )}
        </div>

        {/* 时间地点信息 */}
        <Card className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="text-sm font-medium">课程时间</p>
              <p className="text-sm text-muted-foreground">
                {formatDateTime(course.startTime)} - {formatDateTime(course.endTime)}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-primary mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">{course.stationName || '上课地点'}</p>
              <p className="text-sm text-muted-foreground">{course.address}</p>
            </div>
            {course.location?.latitude && (
              <a 
                href={getNavigationUrl({ latitude: course.location.latitude, longitude: course.location.longitude || 0, name: course.stationName || '' } as any)}
                target="_blank"
                className="text-primary text-sm flex items-center gap-1"
              >
                <Navigation className="w-4 h-4" />
                导航
              </a>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-medium">报名人数</p>
              <p className="text-sm text-muted-foreground">
                {participants}/{maxParticipants}人
                {isFull && <span className="text-orange-500 ml-2">（已满）</span>}
              </p>
            </div>
          </div>
        </Card>

        {/* 已报名学员头像 */}
        {course.enrolledUsers && course.enrolledUsers.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {course.enrolledUsers.slice(0, 5).map((user) => (
                <Avatar key={user.id} className="w-8 h-8 border-2 border-background">
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback>{user.name[0]}</AvatarFallback>
                </Avatar>
              ))}
            </div>
            <span className="text-sm text-muted-foreground">
              {participants}人已报名
            </span>
          </div>
        )}

        {/* Tab 内容 */}
        <Tabs defaultValue="intro" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="intro">课程介绍</TabsTrigger>
            <TabsTrigger value="outline">课程大纲</TabsTrigger>
            <TabsTrigger value="instructor">讲师介绍</TabsTrigger>
          </TabsList>

          <TabsContent value="intro" className="mt-4 space-y-4">
            {course.content && (
              <div 
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: course.content }}
              />
            )}
            
            {course.enrollNotice && (
              <Card className="p-4">
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  报名须知
                </h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{course.enrollNotice}</p>
              </Card>
            )}

            {course.refundPolicy && (
              <Card className="p-4">
                <h3 className="font-medium mb-2">退款规则</h3>
                <p className="text-sm text-muted-foreground">{course.refundPolicy}</p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="outline" className="mt-4">
            {course.outline && course.outline.length > 0 ? (
              <div className="space-y-3">
                {course.outline.map((item, index) => (
                  <Card key={item.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{item.title}</h4>
                          <span className="text-xs text-muted-foreground">{item.duration}</span>
                        </div>
                        {item.description && (
                          <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">暂无大纲</div>
            )}
          </TabsContent>

          <TabsContent value="instructor" className="mt-4">
            {course.instructorDetail ? (
              <Card className="p-4">
                <div className="flex items-start gap-4">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={course.instructorDetail.avatar} />
                    <AvatarFallback>{course.instructorDetail.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{course.instructorDetail.name}</h3>
                    <p className="text-sm text-muted-foreground">{course.instructorDetail.title}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-4 h-4" />
                        {course.instructorDetail.courseCount}门课
                      </span>
                      <span className="flex items-center gap-1">
                        <GraduationCap className="w-4 h-4" />
                        {course.instructorDetail.studentCount}学员
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <h4 className="font-medium mb-2">讲师简介</h4>
                  <p className="text-sm text-muted-foreground">{course.instructorDetail.introduction}</p>
                </div>
                {course.instructorDetail.specialties && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">擅长领域</h4>
                    <div className="flex flex-wrap gap-2">
                      {course.instructorDetail.specialties.map((s, i) => (
                        <Badge key={i} variant="secondary">{s}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                <Link href={`/instructor/${course.instructor.id}`}>
                  <Button variant="outline" className="w-full mt-4">
                    查看讲师主页
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </Card>
            ) : (
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={course.instructor.avatar} />
                    <AvatarFallback>{course.instructor.name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium">{course.instructor.name}</h3>
                    <p className="text-sm text-muted-foreground">{course.instructor.title}</p>
                  </div>
                </div>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* 底部操作栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 flex items-center gap-3">
        {isEnrolled ? (
          <>
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => setShowQrCode(true)}
            >
              <QrCode className="w-4 h-4 mr-2" />
              入场码
            </Button>
            <Button 
              variant="outline"
              onClick={handleAddToCalendar}
            >
              <CalendarPlus className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              className="text-destructive"
              onClick={() => setShowCancelConfirm(true)}
            >
              取消报名
            </Button>
          </>
        ) : (
          <>
            <div className="flex-1">
              {course.price === 0 ? (
                <span className="text-lg font-bold text-green-600">免费</span>
              ) : (
                <span className="text-lg font-bold text-primary">¥{course.price}</span>
              )}
            </div>
            <Button 
              className="flex-1 bg-primary"
              disabled={!canEnroll || enrolling || isFull}
              onClick={handleEnroll}
            >
              {enrolling ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {isFull ? '已满员' : canEnroll ? '立即报名' : getCourseStatusLabel(course.status)}
            </Button>
          </>
        )}
      </div>

      {/* 入场二维码弹窗 */}
      {showQrCode && course.myEnrollment && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">入场二维码</h3>
              <button onClick={() => setShowQrCode(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-center">
              <div className="w-48 h-48 mx-auto bg-secondary rounded-lg flex items-center justify-center mb-4">
                <QrCode className="w-32 h-32 text-foreground" />
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                请在入场时向工作人员出示此二维码
              </p>
              {course.myEnrollment.seatNo && (
                <p className="text-lg font-bold">
                  座位号: {course.myEnrollment.seatNo}
                </p>
              )}
              <div className="mt-4 p-3 bg-secondary rounded-lg text-left text-sm">
                <p><strong>课程:</strong> {course.title}</p>
                <p><strong>时间:</strong> {formatDateTime(course.startTime)}</p>
                <p><strong>地点:</strong> {course.address}</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              className="w-full mt-4"
              onClick={() => setShowQrCode(false)}
            >
              关闭
            </Button>
          </Card>
        </div>
      )}

      {/* 取消报名确认弹窗 */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-sm p-6">
            <div className="text-center mb-4">
              <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-2" />
              <h3 className="font-bold text-lg">确认取消报名？</h3>
            </div>
            {course.refundPolicy && (
              <div className="p-3 bg-secondary rounded-lg text-sm text-muted-foreground mb-4">
                <p className="font-medium text-foreground mb-1">退款规则：</p>
                <p>{course.refundPolicy}</p>
              </div>
            )}
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setShowCancelConfirm(false)}
              >
                再想想
              </Button>
              <Button 
                variant="destructive" 
                className="flex-1"
                onClick={handleCancel}
                disabled={cancelling}
              >
                {cancelling ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                确认取消
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
