"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import { BackButton } from "@/components/common/back-button"
import { 
  MapPin, 
  Clock, 
  User, 
  QrCode, 
  Keyboard, 
  CheckCircle2,
  Calendar,
  Users,
  Navigation,
  Award,
  Loader2,
  X
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useSearchParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { 
  getCourseCheckinDetail, 
  checkin, 
  checkout,
  getCheckinStatusInfo,
  getCourseStatusInfo,
  isInCheckinWindow,
  formatCheckinMethod
} from "@/lib/api/offline"
import type { CourseCheckinDetail, CheckinRecord } from "@/lib/types/offline"

function CheckinPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const courseId = Number(searchParams.get("courseId") || 1)
  const qrContent = searchParams.get("qr") || ""
  
  const [detail, setDetail] = useState<CourseCheckinDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkinMode, setCheckinMode] = useState<'qr' | 'code'>('qr')
  const [inputCode, setInputCode] = useState("")
  const [isChecking, setIsChecking] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [successData, setSuccessData] = useState<{ rank?: number; points?: number } | null>(null)
  const [myRecord, setMyRecord] = useState<CheckinRecord | null>(null)

  // 加载课程签到详情
  useEffect(() => {
    loadDetail()
  }, [courseId])

  // 如果有扫码内容，自动签到
  useEffect(() => {
    if (qrContent && detail && !myRecord) {
      handleQrCheckin(qrContent)
    }
  }, [qrContent, detail, myRecord])

  const loadDetail = async () => {
    setLoading(true)
    try {
      const response = await getCourseCheckinDetail(courseId)
      if (response.code === 200 && response.data) {
        setDetail(response.data)
        setMyRecord(response.data.myRecord || null)
      }
    } catch {
      toast.error("加载失败")
    } finally {
      setLoading(false)
    }
  }

  // 扫码签到
  const handleQrCheckin = async (content: string) => {
    if (!detail) return
    
    setIsChecking(true)
    try {
      const response = await checkin({
        courseId: detail.course.id,
        qrContent: content,
      })
      
      if (response.code === 200 && response.data?.success) {
        // 触发震动反馈
        if (navigator.vibrate) {
          navigator.vibrate([100, 50, 100])
        }
        setSuccessData({ rank: response.data.rank, points: response.data.points })
        setMyRecord(response.data.record || null)
        setShowSuccess(true)
      } else {
        toast.error(response.data?.message || "签到失败")
      }
    } catch {
      toast.error("签到失败，请重试")
    } finally {
      setIsChecking(false)
    }
  }

  // 签到码签到
  const handleCodeCheckin = async () => {
    if (!detail || !inputCode.trim()) {
      toast.error("请输入签到码")
      return
    }
    
    setIsChecking(true)
    try {
      const response = await checkin({
        courseId: detail.course.id,
        code: inputCode.trim().toUpperCase(),
      })
      
      if (response.code === 200 && response.data?.success) {
        if (navigator.vibrate) {
          navigator.vibrate([100, 50, 100])
        }
        setSuccessData({ rank: response.data.rank, points: response.data.points })
        setMyRecord(response.data.record || null)
        setShowSuccess(true)
      } else {
        toast.error(response.data?.message || "签到码无效")
      }
    } catch {
      toast.error("签到失败，请重试")
    } finally {
      setIsChecking(false)
    }
  }

  // 签退
  const handleCheckout = async () => {
    if (!detail) return
    
    setIsChecking(true)
    try {
      const response = await checkout(detail.course.id)
      if (response.code === 200 && response.data?.success) {
        toast.success("签退成功")
        setMyRecord(response.data.record || null)
      } else {
        toast.error("签退失败")
      }
    } catch {
      toast.error("签退失败")
    } finally {
      setIsChecking(false)
    }
  }

  // 打开扫码
  const openScanner = () => {
    router.push(`/common/scan?returnUrl=${encodeURIComponent(`/offline/checkin?courseId=${courseId}`)}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <p className="text-muted-foreground mb-4">未找到课程信息</p>
        <Button variant="outline" onClick={() => router.back()}>返回</Button>
      </div>
    )
  }

  const { course, stats } = detail
  const canCheckin = isInCheckinWindow(course) && !myRecord
  const canCheckout = myRecord?.status === 'checked_in'
  const courseStatus = getCourseStatusInfo(course.status)

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center justify-between px-4 h-14">
          <BackButton fallbackPath="/offline" />
          <h1 className="font-semibold">课程签到</h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="p-4 space-y-4 pb-32">
        {/* 课程信息卡片 */}
        <Card className="overflow-hidden">
          <div className="relative">
            <img 
              src={course.cover} 
              alt={course.title}
              className="w-full h-40 object-cover"
            />
            <Badge 
              className={cn(
                "absolute top-3 right-3",
                course.status === 'ongoing' ? "bg-green-500" : "bg-blue-500"
              )}
            >
              {courseStatus.label}
            </Badge>
          </div>
          
          <div className="p-4 space-y-3">
            <h2 className="font-semibold text-lg leading-tight">{course.title}</h2>
            
            {/* 讲师 */}
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={course.instructor.avatar} />
                <AvatarFallback>{course.instructor.name[0]}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{course.instructor.name}</p>
                {course.instructor.title && (
                  <p className="text-xs text-muted-foreground">{course.instructor.title}</p>
                )}
              </div>
            </div>

            {/* 时间地点 */}
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p>{course.startTime.split(' ')[0]}</p>
                  <p className="text-muted-foreground">
                    {course.startTime.split(' ')[1]} - {course.endTime.split(' ')[1]}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p>{course.location.name}</p>
                  <p className="text-muted-foreground text-xs">{course.location.address}</p>
                </div>
              </div>
            </div>

            {/* 签到统计 */}
            <div className="flex items-center gap-4 pt-2 border-t">
              <div className="flex items-center gap-1 text-sm">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span>报名 {course.enrolledCount}/{course.maxEnrollment}</span>
              </div>
              <div className="flex items-center gap-1 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>已签到 {stats.checkedIn}/{stats.total}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* 我的签到状态 */}
        {myRecord && (
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  myRecord.status === 'checked_in' ? "bg-green-100" : "bg-gray-100"
                )}>
                  <CheckCircle2 className={cn(
                    "w-5 h-5",
                    myRecord.status === 'checked_in' ? "text-green-600" : "text-gray-600"
                  )} />
                </div>
                <div>
                  <p className="font-medium">
                    {getCheckinStatusInfo(myRecord.status).label}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {myRecord.checkinTime && `签到时间: ${myRecord.checkinTime.split(' ')[1]}`}
                    {myRecord.checkoutTime && ` | 签退: ${myRecord.checkoutTime.split(' ')[1]}`}
                  </p>
                </div>
              </div>
              <Badge variant="secondary">
                {formatCheckinMethod(myRecord.checkinMethod)}
              </Badge>
            </div>
            
            {/* 签退按钮 */}
            {canCheckout && (
              <Button 
                variant="outline" 
                className="w-full mt-4"
                onClick={handleCheckout}
                disabled={isChecking}
              >
                {isChecking ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                签退
              </Button>
            )}
          </Card>
        )}

        {/* 签到区域 */}
        {canCheckin && (
          <Card className="p-4">
            <h3 className="font-medium mb-4">签到方式</h3>
            
            {/* 切换签到方式 */}
            <div className="flex gap-2 mb-4">
              <Button
                variant={checkinMode === 'qr' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setCheckinMode('qr')}
              >
                <QrCode className="w-4 h-4 mr-2" />
                扫码签到
              </Button>
              <Button
                variant={checkinMode === 'code' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setCheckinMode('code')}
              >
                <Keyboard className="w-4 h-4 mr-2" />
                签到码
              </Button>
            </div>

            {checkinMode === 'qr' ? (
              <div className="text-center py-6">
                <div 
                  className="w-24 h-24 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center mb-4 cursor-pointer hover:bg-primary/20 transition-colors"
                  onClick={openScanner}
                >
                  <QrCode className="w-10 h-10 text-primary" />
                </div>
                <p className="text-muted-foreground text-sm mb-4">点击扫描签到二维码</p>
                <Button onClick={openScanner} disabled={isChecking}>
                  {isChecking ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  打开扫码
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <Input
                    placeholder="请输入签到码"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                    className="text-center text-lg tracking-widest font-mono"
                    maxLength={10}
                  />
                </div>
                <Button 
                  className="w-full"
                  onClick={handleCodeCheckin}
                  disabled={isChecking || !inputCode.trim()}
                >
                  {isChecking ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  确认签到
                </Button>
              </div>
            )}

            {/* 签到时间提示 */}
            <div className="mt-4 text-center text-sm text-muted-foreground flex items-center justify-center gap-1">
              <Clock className="w-4 h-4" />
              签到时间: {course.checkinStart?.split(' ')[1]} - {course.checkinEnd?.split(' ')[1]}
            </div>
          </Card>
        )}

        {/* 签到已结束或未开始 */}
        {!canCheckin && !myRecord && (
          <Card className="p-6 text-center">
            <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="font-medium mb-1">签到未开放</p>
            <p className="text-sm text-muted-foreground">
              签到时间: {course.checkinStart?.split(' ')[1]} - {course.checkinEnd?.split(' ')[1]}
            </p>
          </Card>
        )}

        {/* 导航到上课地点 */}
        {course.location.latitude && course.location.longitude && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              const url = `https://uri.amap.com/marker?position=${course.location.longitude},${course.location.latitude}&name=${encodeURIComponent(course.location.name)}`
              window.open(url, '_blank')
            }}
          >
            <Navigation className="w-4 h-4 mr-2" />
            导航到上课地点
          </Button>
        )}
      </div>

      {/* 签到成功动画弹层 */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-background rounded-2xl p-6 mx-4 max-w-sm w-full text-center animate-in zoom-in-95 duration-300">
            <button
              className="absolute top-4 right-4 text-muted-foreground"
              onClick={() => setShowSuccess(false)}
            >
              <X className="w-5 h-5" />
            </button>
            
            {/* 成功动画 */}
            <div className="w-20 h-20 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center animate-bounce">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            
            <h3 className="text-xl font-semibold mb-2">签到成功</h3>
            
            {successData?.rank && (
              <p className="text-muted-foreground mb-4">
                您是第 <span className="text-primary font-semibold">{successData.rank}</span> 位签到
              </p>
            )}
            
            {successData?.points && (
              <div className="bg-primary/10 rounded-lg py-3 px-4 mb-4 flex items-center justify-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                <span className="text-primary font-medium">+{successData.points} 积分</span>
              </div>
            )}
            
            <Button className="w-full" onClick={() => setShowSuccess(false)}>
              确定
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function CheckinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <CheckinPageContent />
    </Suspense>
  )
}
