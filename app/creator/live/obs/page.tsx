"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  ChevronLeft, Copy, RefreshCw, Check, Eye, EyeOff, 
  Wifi, WifiOff, Clock, Activity, Monitor, Settings,
  AlertTriangle, CheckCircle2, Info, ExternalLink,
  Gauge, Zap, Signal
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

// 模拟推流数据
const streamData = {
  serverUrl: "rtmp://live-push.rebu.cn/live",
  streamKey: "rebu_live_8f7d6e5c4b3a2910_1698765432",
  status: "online", // online | offline | connecting
  duration: 3845, // 秒
  fps: 30,
  bitrate: 4500, // kbps
  resolution: "1920x1080",
  droppedFrames: 12,
  totalFrames: 115350,
}

// 画质配置建议
const qualityPresets = [
  {
    id: "high",
    name: "高清 1080P",
    resolution: "1920x1080",
    bitrate: "4500-6000",
    fps: 30,
    network: "上行 ≥ 10Mbps",
    recommended: true,
    desc: "适合知识授课，画面清晰细腻",
  },
  {
    id: "medium",
    name: "标清 720P",
    resolution: "1280x720",
    bitrate: "2500-4000",
    fps: 30,
    network: "上行 ≥ 5Mbps",
    recommended: false,
    desc: "适合大部分场景，兼顾清晰度与流畅度",
  },
  {
    id: "low",
    name: "流畅 480P",
    resolution: "854x480",
    bitrate: "1000-2000",
    fps: 30,
    network: "上行 ≥ 2Mbps",
    recommended: false,
    desc: "网络较差时使用，保证流畅性",
  },
]

// OBS配置步骤
const obsSteps = [
  {
    step: 1,
    title: "打开OBS设置",
    desc: "点击菜单栏「设置」或按快捷键 Ctrl+Shift+S",
  },
  {
    step: 2,
    title: "进入推流设置",
    desc: "在左侧菜单选择「推流」选项",
  },
  {
    step: 3,
    title: "选择服务类型",
    desc: "服务选择「自定义」，填入下方服务器地址",
  },
  {
    step: 4,
    title: "填写串流密钥",
    desc: "将下方串流密钥复制粘贴到对应输入框",
  },
  {
    step: 5,
    title: "开始推流",
    desc: "点击「开始推流」按钮，等待连接成功",
  },
]

export default function OBSStreamingPage() {
  const router = useRouter()
  const [showStreamKey, setShowStreamKey] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [selectedQuality, setSelectedQuality] = useState("high")
  const [streamStatus, setStreamStatus] = useState(streamData.status)
  const [duration, setDuration] = useState(streamData.duration)

  // 模拟推流时长计时
  useEffect(() => {
    if (streamStatus === "online") {
      const timer = setInterval(() => {
        setDuration(prev => prev + 1)
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [streamStatus])

  // 格式化时长
  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }

  // 复制到剪贴板
  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  // 重置串流密钥
  const handleResetKey = () => {
    setIsResetting(true)
    setTimeout(() => {
      setIsResetting(false)
      setShowResetDialog(false)
    }, 1500)
  }

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-1">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-base font-semibold">OBS推流设置</h1>
          </div>
          <Button variant="ghost" size="sm" className="text-xs gap-1.5">
            <ExternalLink className="w-3.5 h-3.5" />
            下载OBS
          </Button>
        </div>
      </header>

      <div className="px-4 pt-4 space-y-4">
        {/* 推流状态卡片 */}
        <Card className={cn(
          "p-4 border-2",
          streamStatus === "online" ? "border-green-500/30 bg-green-500/5" : 
          streamStatus === "connecting" ? "border-amber-500/30 bg-amber-500/5" : 
          "border-border"
        )}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {streamStatus === "online" ? (
                <Wifi className="w-5 h-5 text-green-500" />
              ) : streamStatus === "connecting" ? (
                <Wifi className="w-5 h-5 text-amber-500 animate-pulse" />
              ) : (
                <WifiOff className="w-5 h-5 text-muted-foreground" />
              )}
              <span className="font-semibold">推流状态</span>
            </div>
            <Badge className={cn(
              "text-xs",
              streamStatus === "online" ? "bg-green-500" : 
              streamStatus === "connecting" ? "bg-amber-500" : 
              "bg-muted text-muted-foreground"
            )}>
              {streamStatus === "online" ? "推流中" : 
               streamStatus === "connecting" ? "连接中" : "离线"}
            </Badge>
          </div>

          {streamStatus === "online" && (
            <div className="grid grid-cols-4 gap-3">
              <div className="text-center p-2 rounded-lg bg-background">
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  <Clock className="w-3 h-3" />
                  <span className="text-[10px]">时长</span>
                </div>
                <p className="text-sm font-bold font-mono">{formatDuration(duration)}</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-background">
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  <Activity className="w-3 h-3" />
                  <span className="text-[10px]">帧率</span>
                </div>
                <p className="text-sm font-bold">{streamData.fps} fps</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-background">
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  <Gauge className="w-3 h-3" />
                  <span className="text-[10px]">码率</span>
                </div>
                <p className="text-sm font-bold">{streamData.bitrate} kbps</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-background">
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  <Monitor className="w-3 h-3" />
                  <span className="text-[10px]">分辨率</span>
                </div>
                <p className="text-sm font-bold">{streamData.resolution}</p>
              </div>
            </div>
          )}

          {streamStatus === "online" && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">丢帧率</span>
                <span className={cn(
                  "font-medium",
                  streamData.droppedFrames / streamData.totalFrames < 0.001 ? "text-green-500" : "text-amber-500"
                )}>
                  {((streamData.droppedFrames / streamData.totalFrames) * 100).toFixed(3)}%
                  <span className="text-muted-foreground ml-1">({streamData.droppedFrames}帧)</span>
                </span>
              </div>
            </div>
          )}

          {streamStatus === "offline" && (
            <p className="text-sm text-muted-foreground">
              当前未检测到推流，请在OBS中开始推流
            </p>
          )}
        </Card>

        {/* 推流地址信息 */}
        <Card className="p-4">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Settings className="w-4 h-4 text-primary" />
            推流配置信息
          </h2>

          <div className="space-y-4">
            {/* 服务器地址 */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">服务器地址（Server URL）</Label>
              <div className="flex gap-2">
                <Input 
                  value={streamData.serverUrl}
                  readOnly
                  className="font-mono text-sm bg-secondary/50"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(streamData.serverUrl, "server")}
                  className="flex-shrink-0"
                >
                  {copiedField === "server" ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* 串流密钥 */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">串流密钥（Stream Key）</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input 
                    type={showStreamKey ? "text" : "password"}
                    value={streamData.streamKey}
                    readOnly
                    className="font-mono text-sm bg-secondary/50 pr-10"
                  />
                  <button
                    onClick={() => setShowStreamKey(!showStreamKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showStreamKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(streamData.streamKey, "key")}
                  className="flex-shrink-0"
                >
                  {copiedField === "key" ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* 重新生成 */}
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">
                密钥泄露？点击重新生成
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowResetDialog(true)}
                className="text-xs gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                重新生成
              </Button>
            </div>
          </div>
        </Card>

        {/* OBS配置引导 */}
        <Card className="p-4">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-500" />
            OBS配置指南
          </h2>

          <div className="space-y-3">
            {obsSteps.map((item, index) => (
              <div 
                key={item.step}
                className="flex gap-3"
              >
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                  {item.step}
                </div>
                <div className="flex-1 pt-0.5">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-medium text-amber-600 dark:text-amber-400">安全提示</p>
                <p className="text-muted-foreground mt-0.5">
                  请勿将串流密钥分享给他人，泄露可能导致直播间被盗用。如已泄露，请立即重新生成。
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* 画质配置建议 */}
        <Card className="p-4">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            画质配置建议
          </h2>

          <p className="text-xs text-muted-foreground mb-3">
            根据您的网络情况选择合适的画质配置
          </p>

          <div className="space-y-2">
            {qualityPresets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => setSelectedQuality(preset.id)}
                className={cn(
                  "w-full p-3 rounded-lg border-2 text-left transition-all",
                  selectedQuality === preset.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{preset.name}</span>
                    {preset.recommended && (
                      <Badge className="bg-green-500 text-[10px] px-1.5">推荐</Badge>
                    )}
                  </div>
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                    selectedQuality === preset.id ? "border-primary bg-primary" : "border-muted-foreground/30"
                  )}>
                    {selectedQuality === preset.id && (
                      <Check className="w-3 h-3 text-primary-foreground" />
                    )}
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground mb-2">{preset.desc}</p>
                
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">分辨率</span>
                    <p className="font-medium">{preset.resolution}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">码率</span>
                    <p className="font-medium">{preset.bitrate}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">帧率</span>
                    <p className="font-medium">{preset.fps}fps</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">网络要求</span>
                    <p className="font-medium">{preset.network}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* 网络测速入口 */}
          <div className="mt-4 p-3 rounded-lg bg-secondary/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Signal className="w-4 h-4 text-primary" />
              <span className="text-sm">不确定网络情况？</span>
            </div>
            <Button variant="outline" size="sm" className="text-xs">
              测试网速
            </Button>
          </div>
        </Card>

        {/* OBS输出设置建议 */}
        <Card className="p-4">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Monitor className="w-4 h-4 text-cyan-500" />
            OBS输出设置参考
          </h2>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">输出模式</span>
              <span className="font-medium">高级</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">编码器</span>
              <span className="font-medium">x264 / NVENC（N卡推荐）</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">码率控制</span>
              <span className="font-medium">CBR（恒定码率）</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">关键帧间隔</span>
              <span className="font-medium">2秒</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">CPU预设</span>
              <span className="font-medium">veryfast</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">音频采样率</span>
              <span className="font-medium">44.1kHz / 48kHz</span>
            </div>
          </div>
        </Card>

        {/* 常见问题 */}
        <Card className="p-4">
          <h2 className="font-semibold mb-3">常见问题</h2>
          
          <div className="space-y-3">
            <details className="group">
              <summary className="flex items-center justify-between cursor-pointer text-sm py-2">
                <span>推流失败怎么办？</span>
                <ChevronLeft className="w-4 h-4 -rotate-90 group-open:rotate-90 transition-transform" />
              </summary>
              <p className="text-xs text-muted-foreground pb-2 pl-2">
                1. 检查服务器地址和串流密钥是否正确复制<br />
                2. 确认网络连接正常，防火墙未拦截OBS<br />
                3. 尝试重新生成串流密钥
              </p>
            </details>
            
            <details className="group">
              <summary className="flex items-center justify-between cursor-pointer text-sm py-2">
                <span>画面卡顿如何解决？</span>
                <ChevronLeft className="w-4 h-4 -rotate-90 group-open:rotate-90 transition-transform" />
              </summary>
              <p className="text-xs text-muted-foreground pb-2 pl-2">
                1. 降低输出分辨率和码率<br />
                2. 检查CPU/GPU占用率，关闭不必要的程序<br />
                3. 使用有线网络替代WiFi
              </p>
            </details>
            
            <details className="group">
              <summary className="flex items-center justify-between cursor-pointer text-sm py-2">
                <span>如何实现画中画效果？</span>
                <ChevronLeft className="w-4 h-4 -rotate-90 group-open:rotate-90 transition-transform" />
              </summary>
              <p className="text-xs text-muted-foreground pb-2 pl-2">
                在OBS中添加「视频捕获设备」源获取摄像头画面，调整大小和位置叠加在课件画面上即可。
              </p>
            </details>
          </div>
        </Card>
      </div>

      {/* 重新生成确认对话框 */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>重新生成串流密钥？</AlertDialogTitle>
            <AlertDialogDescription>
              重新生成后，旧密钥将立即失效。如果正在推流，将会断开连接，需要使用新密钥重新配置OBS。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResetting}>取消</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleResetKey}
              disabled={isResetting}
              className="bg-red-500 hover:bg-red-600"
            >
              {isResetting ? "生成中..." : "确认重新生成"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
