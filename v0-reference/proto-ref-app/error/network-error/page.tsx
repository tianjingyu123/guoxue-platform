"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { 
  WifiOff, 
  RefreshCw, 
  Home,
  ArrowLeft,
  Signal,
  SignalLow,
  SignalMedium,
  SignalHigh
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type NetworkStatus = 'offline' | 'online' | 'checking'

export default function NetworkErrorPage() {
  const router = useRouter()
  const [status, setStatus] = useState<NetworkStatus>('offline')
  const [retryCount, setRetryCount] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)
  const [signalStrength, setSignalStrength] = useState(0)

  // 检测网络状态
  const checkNetwork = useCallback(async () => {
    setIsRetrying(true)
    setStatus('checking')
    
    // 模拟信号强度动画
    let strength = 0
    const interval = setInterval(() => {
      strength = (strength + 1) % 4
      setSignalStrength(strength)
    }, 200)

    try {
      // 尝试请求一个简单的端点来检测网络
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      
      const response = await fetch('/api/health', { 
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-store'
      })
      
      clearTimeout(timeoutId)
      clearInterval(interval)
      
      if (response.ok || navigator.onLine) {
        setStatus('online')
        setSignalStrength(3)
        // 网络恢复，延迟后返回
        setTimeout(() => {
          router.back()
        }, 1000)
      } else {
        setStatus('offline')
        setSignalStrength(0)
      }
    } catch {
      clearInterval(interval)
      // 备用检测：使用 navigator.onLine
      if (navigator.onLine) {
        setStatus('online')
        setSignalStrength(3)
        setTimeout(() => {
          router.back()
        }, 1000)
      } else {
        setStatus('offline')
        setSignalStrength(0)
      }
    } finally {
      setIsRetrying(false)
      setRetryCount(prev => prev + 1)
    }
  }, [router])

  // 监听网络状态变化
  useEffect(() => {
    const handleOnline = () => {
      setStatus('online')
      setSignalStrength(3)
      setTimeout(() => {
        router.back()
      }, 1000)
    }

    const handleOffline = () => {
      setStatus('offline')
      setSignalStrength(0)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // 初始检测
    if (navigator.onLine) {
      checkNetwork()
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [checkNetwork, router])

  // 信号图标
  const SignalIcon = () => {
    if (status === 'checking') {
      switch (signalStrength) {
        case 0: return <Signal className="w-8 h-8 text-muted-foreground" />
        case 1: return <SignalLow className="w-8 h-8 text-orange-500" />
        case 2: return <SignalMedium className="w-8 h-8 text-yellow-500" />
        case 3: return <SignalHigh className="w-8 h-8 text-green-500" />
        default: return <Signal className="w-8 h-8 text-muted-foreground" />
      }
    }
    if (status === 'online') {
      return <SignalHigh className="w-8 h-8 text-green-500" />
    }
    return <WifiOff className="w-8 h-8 text-muted-foreground" />
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            className="shrink-0"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">网络状态</h1>
        </div>
      </header>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* 图标区域 */}
        <div className={cn(
          "w-32 h-32 rounded-full flex items-center justify-center mb-8 transition-colors duration-300",
          status === 'online' ? "bg-green-100" : 
          status === 'checking' ? "bg-muted" : "bg-muted"
        )}>
          <div className={cn(
            "w-24 h-24 rounded-full flex items-center justify-center transition-colors duration-300",
            status === 'online' ? "bg-green-200" : 
            status === 'checking' ? "bg-muted-foreground/10" : "bg-muted-foreground/10"
          )}>
            {status === 'online' ? (
              <SignalHigh className="w-12 h-12 text-green-600" />
            ) : status === 'checking' ? (
              <RefreshCw className="w-12 h-12 text-muted-foreground animate-spin" />
            ) : (
              <WifiOff className="w-12 h-12 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* 状态文字 */}
        <h2 className={cn(
          "text-2xl font-bold mb-3 transition-colors duration-300",
          status === 'online' ? "text-green-600" : "text-foreground"
        )}>
          {status === 'online' ? '网络已恢复' : 
           status === 'checking' ? '正在检测网络...' : '网络连接已断开'}
        </h2>
        
        <p className="text-muted-foreground text-center max-w-sm mb-2">
          {status === 'online' ? '正在返回上一页...' :
           status === 'checking' ? '请稍候，正在尝试连接网络' :
           '请检查您的网络设置，确保设备已连接到互联网'}
        </p>

        {status === 'offline' && retryCount > 0 && (
          <p className="text-sm text-muted-foreground mb-6">
            已尝试 {retryCount} 次
          </p>
        )}

        {/* 信号强度指示 */}
        <div className="flex items-center gap-2 mb-8">
          <SignalIcon />
          <span className="text-sm text-muted-foreground">
            {status === 'online' ? '信号良好' :
             status === 'checking' ? '检测中' : '无信号'}
          </span>
        </div>

        {/* 操作按钮 */}
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button 
            onClick={checkNetwork}
            disabled={isRetrying}
            className="w-full"
            size="lg"
          >
            {isRetrying ? (
              <>
                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                正在重试...
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5 mr-2" />
                重试连接
              </>
            )}
          </Button>
          
          <Button 
            variant="outline"
            onClick={() => router.push('/')}
            className="w-full"
            size="lg"
          >
            <Home className="w-5 h-5 mr-2" />
            返回首页
          </Button>
        </div>

        {/* 帮助提示 */}
        <div className="mt-12 p-4 bg-muted/50 rounded-lg max-w-sm">
          <h3 className="font-medium text-sm mb-3">排查建议</h3>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
              <span>检查Wi-Fi或移动数据是否开启</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
              <span>尝试开启/关闭飞行模式</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5">3</span>
              <span>重启路由器或切换网络</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5">4</span>
              <span>如问题持续，请联系网络服务商</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
