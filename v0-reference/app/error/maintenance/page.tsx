"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { 
  Wrench, 
  Clock, 
  RefreshCw, 
  ChevronRight,
  Bell,
  CheckCircle,
  AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface MaintenanceInfo {
  isUnderMaintenance: boolean
  title: string
  message: string
  estimatedEndTime: string
  affectedServices: string[]
  announcementId?: number
  progress?: number
}

// Mock 维护信息
const mockMaintenanceInfo: MaintenanceInfo = {
  isUnderMaintenance: true,
  title: '系统升级维护中',
  message: '我们正在进行系统升级，以提供更好的服务体验。给您带来的不便，敬请谅解。',
  estimatedEndTime: '2026-06-03 18:00',
  affectedServices: ['课程播放', '在线支付', '排盘工具', '社区互动'],
  announcementId: 1001,
  progress: 65,
}

export default function MaintenancePage() {
  const router = useRouter()
  const [info, setInfo] = useState<MaintenanceInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [countdown, setCountdown] = useState<string>('')

  // 加载维护信息
  useEffect(() => {
    const loadInfo = async () => {
      await new Promise(resolve => setTimeout(resolve, 500))
      setInfo(mockMaintenanceInfo)
      setLoading(false)
    }
    loadInfo()
  }, [])

  // 计算倒计时
  useEffect(() => {
    if (!info?.estimatedEndTime) return

    const updateCountdown = () => {
      const end = new Date(info.estimatedEndTime).getTime()
      const now = Date.now()
      const diff = end - now

      if (diff <= 0) {
        setCountdown('即将恢复')
        return
      }

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      if (hours > 0) {
        setCountdown(`${hours}小时${minutes}分钟`)
      } else if (minutes > 0) {
        setCountdown(`${minutes}分${seconds}秒`)
      } else {
        setCountdown(`${seconds}秒`)
      }
    }

    updateCountdown()
    const timer = setInterval(updateCountdown, 1000)
    return () => clearInterval(timer)
  }, [info?.estimatedEndTime])

  // 检查维护状态
  const checkStatus = useCallback(async () => {
    setChecking(true)
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // 模拟：随机决定是否维护结束
    const isStillMaintaining = Math.random() > 0.3
    
    if (!isStillMaintaining) {
      router.replace('/')
    } else {
      setChecking(false)
    }
  }, [router])

  // 定期自动检查
  useEffect(() => {
    const timer = setInterval(() => {
      if (!checking) {
        checkStatus()
      }
    }, 60000) // 每分钟检查一次
    return () => clearInterval(timer)
  }, [checking, checkStatus])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-background flex flex-col">
      {/* 主内容 */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {/* 维护图标 */}
        <div className="relative mb-8">
          <div className="w-32 h-32 bg-orange-100 rounded-full flex items-center justify-center">
            <Wrench className="w-16 h-16 text-orange-500" />
          </div>
          {/* 旋转齿轮动画 */}
          <div className="absolute -right-2 -top-2 w-12 h-12 bg-orange-200 rounded-full flex items-center justify-center animate-spin" style={{ animationDuration: '3s' }}>
            <svg className="w-8 h-8 text-orange-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
              <path fillRule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 010-1.113zM17.25 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z" clipRule="evenodd" />
            </svg>
          </div>
        </div>

        {/* 标题 */}
        <h1 className="text-2xl font-bold text-foreground mb-2">
          {info?.title || '系统维护中'}
        </h1>
        
        {/* 维护说明 */}
        <p className="text-muted-foreground text-center max-w-sm mb-6">
          {info?.message}
        </p>

        {/* 进度条 */}
        {info?.progress !== undefined && (
          <div className="w-full max-w-xs mb-6">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">升级进度</span>
              <span className="text-primary font-medium">{info.progress}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-orange-400 to-primary rounded-full transition-all duration-500"
                style={{ width: `${info.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* 预计恢复时间 */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-border w-full max-w-sm mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">预计恢复时间</p>
              <p className="font-semibold text-foreground">{info?.estimatedEndTime}</p>
            </div>
            {countdown && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">剩余</p>
                <p className="text-sm font-medium text-primary">{countdown}</p>
              </div>
            )}
          </div>
        </div>

        {/* 受影响的服务 */}
        {info?.affectedServices && info.affectedServices.length > 0 && (
          <div className="w-full max-w-sm mb-6">
            <p className="text-sm text-muted-foreground mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              本次维护影响以下服务
            </p>
            <div className="flex flex-wrap gap-2">
              {info.affectedServices.map((service, index) => (
                <span 
                  key={index}
                  className="px-3 py-1 bg-orange-50 text-orange-600 text-sm rounded-full"
                >
                  {service}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button
            onClick={checkStatus}
            disabled={checking}
            className="w-full"
          >
            {checking ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                检查中...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                检查是否恢复
              </>
            )}
          </Button>

          {info?.announcementId && (
            <Button
              variant="outline"
              onClick={() => router.push(`/notices/${info.announcementId}`)}
              className="w-full"
            >
              <Bell className="w-4 h-4 mr-2" />
              查看维护公告
              <ChevronRight className="w-4 h-4 ml-auto" />
            </Button>
          )}
        </div>
      </div>

      {/* 底部提示 */}
      <div className="p-6 text-center">
        <div className="bg-green-50 rounded-lg p-4 max-w-sm mx-auto">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div className="text-left">
              <p className="text-sm font-medium text-green-700">维护完成后将自动跳转</p>
              <p className="text-xs text-green-600 mt-1">
                系统会每分钟自动检查维护状态，恢复后将自动返回首页
              </p>
            </div>
          </div>
        </div>
        
        <p className="text-xs text-muted-foreground mt-4">
          如有紧急问题，请联系客服：400-888-8888
        </p>
      </div>
    </div>
  )
}
