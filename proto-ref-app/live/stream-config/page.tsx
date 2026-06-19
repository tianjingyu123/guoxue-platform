"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, Copy, Check, Eye, EyeOff, RefreshCw, Circle, ExternalLink, Monitor, Settings, Wifi, WifiOff } from "lucide-react"
import { liveApi, type StreamConfig, type StreamStatus } from "@/lib/api"

// Mock数据
const mockConfig: StreamConfig = {
  roomId: "room1",
  roomTitle: "周易六十四卦深度解读",
  streamUrl: "rtmp://live.rebu.com/live",
  streamKey: "stream_key_abc123xyz789",
  playUrl: "https://live.rebu.com/play/room1.flv",
  recommendedSettings: {
    resolution: "1920x1080",
    bitrate: "4000-6000 Kbps",
    fps: "30",
    encoder: "x264 / NVENC"
  }
}

const obsSteps = [
  {
    title: "打开OBS Studio",
    description: "下载并安装最新版OBS Studio，打开软件",
    image: "/placeholder.svg"
  },
  {
    title: "进入推流设置",
    description: "点击「设置」→「推流」，服务选择「自定义」",
    image: "/placeholder.svg"
  },
  {
    title: "填写推流信息",
    description: "将下方的「推流地址」填入服务器，「推流密钥」填入串流密钥",
    image: "/placeholder.svg"
  },
  {
    title: "配置视频参数",
    description: "点击「输出」→「流」，设置编码器和比特率；点击「视频」设置分辨率",
    image: "/placeholder.svg"
  },
  {
    title: "开始推流",
    description: "点击主界面的「开始推流」按钮，等待连接成功后即可开播",
    image: "/placeholder.svg"
  }
]

function StreamConfigContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const roomId = searchParams.get('roomId') || 'room1'
  
  const [loading, setLoading] = useState(true)
  const [config, setConfig] = useState<StreamConfig | null>(null)
  const [status, setStatus] = useState<StreamStatus | null>(null)
  const [showKey, setShowKey] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [copiedKey, setCopiedKey] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    const loadData = async () => {
      try {
        // const [configRes, statusRes] = await Promise.all([
        //   liveApi.getStreamConfig(roomId),
        //   liveApi.checkStreamStatus(roomId)
        // ])
        // setConfig(configRes)
        // setStatus(statusRes)
        setConfig(mockConfig)
        setStatus({ roomId, isStreaming: false })
      } catch (error) {
        console.error('Failed to load stream config:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [roomId])

  const copyToClipboard = async (text: string, type: 'url' | 'key') => {
    try {
      await navigator.clipboard.writeText(text)
      if (type === 'url') {
        setCopiedUrl(true)
        setTimeout(() => setCopiedUrl(false), 2000)
      } else {
        setCopiedKey(true)
        setTimeout(() => setCopiedKey(false), 2000)
      }
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const checkStatus = async () => {
    setCheckingStatus(true)
    try {
      // const statusRes = await liveApi.checkStreamStatus(roomId)
      // setStatus(statusRes)
      // 模拟状态检测
      await new Promise(resolve => setTimeout(resolve, 1500))
      setStatus(prev => prev ? { ...prev, isStreaming: Math.random() > 0.5 } : null)
    } catch (error) {
      console.error('Failed to check status:', error)
    } finally {
      setCheckingStatus(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5]">
        <div className="sticky top-0 z-10 bg-white border-b border-[#E8E3DB] px-4 py-3 h-14" />
        <div className="p-4 space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl h-32 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!config) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#999999]">加载失败</p>
          <button onClick={() => router.back()} className="mt-4 text-[#C41E3A]">返回</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-6">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#E8E3DB]">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => router.back()} className="p-1 -ml-1">
            <ChevronLeft className="w-6 h-6 text-[#2C2C2C]" />
          </button>
          <h1 className="text-lg font-semibold text-[#2C2C2C]">推流配置</h1>
          <div className="w-6" />
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 直播间信息 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-[#C41E3A] to-[#E8546D] rounded-xl flex items-center justify-center">
              <Monitor className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-[#2C2C2C] truncate">{config.roomTitle}</h2>
              <p className="text-sm text-[#999999]">直播间ID: {config.roomId}</p>
            </div>
          </div>
        </div>

        {/* 推流状态 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {status?.isStreaming ? (
                <>
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <Wifi className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-green-600">推流中</p>
                    <p className="text-sm text-[#999999]">
                      {status.viewers || 0}人观看 · {status.bitrate || 0} Kbps
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <WifiOff className="w-5 h-5 text-[#999999]" />
                  </div>
                  <div>
                    <p className="font-medium text-[#666666]">未推流</p>
                    <p className="text-sm text-[#999999]">等待OBS连接</p>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={checkStatus}
              disabled={checkingStatus}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-[#C41E3A] border border-[#C41E3A] rounded-full disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${checkingStatus ? 'animate-spin' : ''}`} />
              刷新
            </button>
          </div>

          {status?.isStreaming && (
            <div className="mt-4 pt-4 border-t border-[#E8E3DB]">
              <div className="aspect-video bg-black rounded-xl overflow-hidden relative">
                <div className="absolute inset-0 flex items-center justify-center text-white/50">
                  直播预览
                </div>
                <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-500 text-white text-xs px-2 py-0.5 rounded">
                  <Circle className="w-2 h-2 fill-current animate-pulse" />
                  LIVE
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 推流地址和密钥 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <h3 className="font-semibold text-[#2C2C2C] flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#C41E3A]" />
            推流信息
          </h3>

          {/* 推流地址 */}
          <div>
            <label className="text-sm text-[#666666] mb-1.5 block">推流地址（服务器）</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-[#FAF8F5] rounded-lg px-3 py-2.5 font-mono text-sm text-[#2C2C2C] break-all">
                {config.streamUrl}
              </div>
              <button
                onClick={() => copyToClipboard(config.streamUrl, 'url')}
                className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                  copiedUrl ? 'bg-green-100 text-green-600' : 'bg-[#FAF8F5] text-[#666666] hover:bg-[#E8E3DB]'
                }`}
              >
                {copiedUrl ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* 推流密钥 */}
          <div>
            <label className="text-sm text-[#666666] mb-1.5 block">推流密钥（串流密钥）</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-[#FAF8F5] rounded-lg px-3 py-2.5 font-mono text-sm text-[#2C2C2C] break-all">
                {showKey ? config.streamKey : '••••••••••••••••••••••'}
              </div>
              <button
                onClick={() => setShowKey(!showKey)}
                className="shrink-0 w-10 h-10 bg-[#FAF8F5] rounded-lg flex items-center justify-center text-[#666666] hover:bg-[#E8E3DB]"
              >
                {showKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
              <button
                onClick={() => copyToClipboard(config.streamKey, 'key')}
                className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                  copiedKey ? 'bg-green-100 text-green-600' : 'bg-[#FAF8F5] text-[#666666] hover:bg-[#E8E3DB]'
                }`}
              >
                {copiedKey ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-xs text-orange-500 mt-1.5">请勿泄露推流密钥，否则他人可能冒用您的直播间</p>
          </div>
        </div>

        {/* 推荐参数 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-semibold text-[#2C2C2C] mb-3">推荐参数设置</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#FAF8F5] rounded-xl p-3">
              <p className="text-xs text-[#999999]">分辨率</p>
              <p className="font-medium text-[#2C2C2C]">{config.recommendedSettings.resolution}</p>
            </div>
            <div className="bg-[#FAF8F5] rounded-xl p-3">
              <p className="text-xs text-[#999999]">比特率</p>
              <p className="font-medium text-[#2C2C2C]">{config.recommendedSettings.bitrate}</p>
            </div>
            <div className="bg-[#FAF8F5] rounded-xl p-3">
              <p className="text-xs text-[#999999]">帧率</p>
              <p className="font-medium text-[#2C2C2C]">{config.recommendedSettings.fps} fps</p>
            </div>
            <div className="bg-[#FAF8F5] rounded-xl p-3">
              <p className="text-xs text-[#999999]">编码器</p>
              <p className="font-medium text-[#2C2C2C]">{config.recommendedSettings.encoder}</p>
            </div>
          </div>
        </div>

        {/* OBS配置步骤 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[#2C2C2C]">OBS配置教程</h3>
            <a
              href="https://obsproject.com/download"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[#C41E3A] flex items-center gap-1"
            >
              下载OBS
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          {/* 步骤指示器 */}
          <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-2">
            {obsSteps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  index === currentStep
                    ? 'bg-[#C41E3A] text-white'
                    : index < currentStep
                    ? 'bg-green-100 text-green-600'
                    : 'bg-[#FAF8F5] text-[#999999]'
                }`}
              >
                {index < currentStep ? <Check className="w-4 h-4" /> : index + 1}
              </button>
            ))}
          </div>

          {/* 当前步骤内容 */}
          <div className="bg-[#FAF8F5] rounded-xl p-4">
            <div className="aspect-video bg-[#E8E3DB] rounded-lg mb-3 flex items-center justify-center text-[#999999]">
              步骤 {currentStep + 1} 示意图
            </div>
            <h4 className="font-medium text-[#2C2C2C] mb-1">
              步骤 {currentStep + 1}: {obsSteps[currentStep].title}
            </h4>
            <p className="text-sm text-[#666666]">{obsSteps[currentStep].description}</p>
          </div>

          {/* 步骤导航 */}
          <div className="flex items-center justify-between mt-4">
            <button
              onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
              disabled={currentStep === 0}
              className="px-4 py-2 text-sm text-[#666666] disabled:opacity-50"
            >
              上一步
            </button>
            <button
              onClick={() => setCurrentStep(prev => Math.min(obsSteps.length - 1, prev + 1))}
              disabled={currentStep === obsSteps.length - 1}
              className="px-4 py-2 text-sm text-[#C41E3A] font-medium disabled:opacity-50"
            >
              下一步
            </button>
          </div>
        </div>

        {/* 常见问题 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-semibold text-[#2C2C2C] mb-3">常见问题</h3>
          <div className="space-y-3">
            <div className="bg-[#FAF8F5] rounded-xl p-3">
              <p className="font-medium text-[#2C2C2C] text-sm mb-1">推流失败怎么办？</p>
              <p className="text-xs text-[#666666]">请检查网络连接、推流地址和密钥是否正确，确保防火墙未阻止OBS</p>
            </div>
            <div className="bg-[#FAF8F5] rounded-xl p-3">
              <p className="font-medium text-[#2C2C2C] text-sm mb-1">画面卡顿怎么办？</p>
              <p className="text-xs text-[#666666]">尝试降低比特率或分辨率，检查上行带宽是否足够</p>
            </div>
            <div className="bg-[#FAF8F5] rounded-xl p-3">
              <p className="font-medium text-[#2C2C2C] text-sm mb-1">可以使用其他推流软件吗？</p>
              <p className="text-xs text-[#666666]">支持任何RTMP推流软件，如Streamlabs、XSplit等</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <div className="sticky top-0 z-10 bg-white border-b border-[#E8E3DB] px-4 py-3 h-14" />
      <div className="p-4 space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-2xl h-32 animate-pulse" />
        ))}
      </div>
    </div>
  )
}

export default function StreamConfigPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <StreamConfigContent />
    </Suspense>
  )
}
