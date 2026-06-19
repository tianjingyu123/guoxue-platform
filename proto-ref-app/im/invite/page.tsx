'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  Copy, 
  Check, 
  Download, 
  Share2, 
  QrCode, 
  Link2, 
  Image as ImageIcon,
  Loader2,
  ChevronRight,
  Gift
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { DataState } from '@/components/data-state'
import { 
  getInviteLinkInfo, 
  getInvitePosterConfig, 
  recordShare 
} from '@/lib/api/invite'
import type { InviteLinkInfo, InvitePosterConfig, ShareChannel } from '@/lib/types/invite'

type TabType = 'link' | 'qrcode' | 'poster'

export default function InvitePage() {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  const [activeTab, setActiveTab] = useState<TabType>('link')
  const [linkInfo, setLinkInfo] = useState<InviteLinkInfo | null>(null)
  const [posterConfig, setPosterConfig] = useState<InvitePosterConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [selectedBg, setSelectedBg] = useState(0)
  const [posterGenerated, setPosterGenerated] = useState(false)
  const [generatingPoster, setGeneratingPoster] = useState(false)

  // 加载数据
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const [linkRes, posterRes] = await Promise.all([
          getInviteLinkInfo(),
          getInvitePosterConfig(),
        ])
        if (linkRes.code === 200) {
          setLinkInfo(linkRes.data)
        }
        if (posterRes.code === 200) {
          setPosterConfig(posterRes.data)
        }
      } catch (err) {
        setError('加载失败')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // 复制链接
  const handleCopyLink = useCallback(async () => {
    if (!linkInfo) return
    try {
      await navigator.clipboard.writeText(linkInfo.inviteLink)
      setCopied(true)
      toast.success('链接已复制')
      recordShare('copy', 'invite')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('复制失败')
    }
  }, [linkInfo])

  // 复制邀请码
  const handleCopyCode = useCallback(async () => {
    if (!linkInfo) return
    try {
      await navigator.clipboard.writeText(linkInfo.inviteCode)
      toast.success('邀请码已复制')
    } catch {
      toast.error('复制失败')
    }
  }, [linkInfo])

  // 生成海报
  const generatePoster = useCallback(async () => {
    if (!canvasRef.current || !posterConfig) return
    
    setGeneratingPoster(true)
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Canvas尺寸
    canvas.width = 400
    canvas.height = 600

    try {
      // 绘制背景
      const bgImg = new Image()
      bgImg.crossOrigin = 'anonymous'
      bgImg.src = posterConfig.backgroundImages[selectedBg]
      
      await new Promise((resolve, reject) => {
        bgImg.onload = resolve
        bgImg.onerror = reject
      })
      
      ctx.drawImage(bgImg, 0, 0, 400, 600)

      // 绘制半透明遮罩
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
      ctx.fillRect(0, 0, 400, 600)

      // 绘制用户头像（圆形）
      const avatarImg = new Image()
      avatarImg.crossOrigin = 'anonymous'
      avatarImg.src = posterConfig.userAvatar
      
      await new Promise((resolve, reject) => {
        avatarImg.onload = resolve
        avatarImg.onerror = reject
      })

      ctx.save()
      ctx.beginPath()
      ctx.arc(200, 100, 40, 0, Math.PI * 2)
      ctx.closePath()
      ctx.clip()
      ctx.drawImage(avatarImg, 160, 60, 80, 80)
      ctx.restore()

      // 绘制用户名
      ctx.fillStyle = '#FFFFFF'
      ctx.font = 'bold 18px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(posterConfig.userName, 200, 170)

      // 绘制标题
      ctx.font = 'bold 24px sans-serif'
      ctx.fillText(posterConfig.title, 200, 220)

      // 绘制副标题
      ctx.font = '14px sans-serif'
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
      ctx.fillText(posterConfig.subtitle, 200, 250)

      // 绘制权益列表
      ctx.textAlign = 'left'
      ctx.font = '14px sans-serif'
      posterConfig.benefits.forEach((benefit, index) => {
        ctx.fillText(`• ${benefit}`, 60, 300 + index * 28)
      })

      // 绘制二维码区域背景
      ctx.fillStyle = '#FFFFFF'
      roundRect(ctx, 130, 420, 140, 160, 8)
      ctx.fill()

      // 绘制二维码
      const qrImg = new Image()
      qrImg.crossOrigin = 'anonymous'
      qrImg.src = posterConfig.qrCodeUrl
      
      await new Promise((resolve, reject) => {
        qrImg.onload = resolve
        qrImg.onerror = reject
      })
      
      ctx.drawImage(qrImg, 140, 430, 120, 120)

      // 绘制扫码提示
      ctx.fillStyle = '#666666'
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('扫码加入', 200, 565)

      // 绘制邀请码
      ctx.fillStyle = '#C41E3A'
      ctx.font = 'bold 12px sans-serif'
      ctx.fillText(`邀请码: ${posterConfig.inviteCode}`, 200, 580)

      setPosterGenerated(true)
    } catch (err) {
      toast.error('海报生成失败')
    } finally {
      setGeneratingPoster(false)
    }
  }, [posterConfig, selectedBg])

  // 绘制圆角矩形
  function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
  }

  // 保存海报
  const handleSavePoster = useCallback(() => {
    if (!canvasRef.current) return
    
    const link = document.createElement('a')
    link.download = `invite_poster_${Date.now()}.png`
    link.href = canvasRef.current.toDataURL('image/png')
    link.click()
    
    toast.success('海报已保存')
    recordShare('save', 'poster')
  }, [])

  // 分享到渠道
  const handleShare = useCallback((channel: ShareChannel) => {
    recordShare(channel, 'invite')
    
    const messages: Record<ShareChannel, string> = {
      wechat: '请在微信中打开分享',
      moments: '请在微信朋友圈中打开分享',
      qq: '请在QQ中打开分享',
      weibo: '请在微博中打开分享',
      copy: '链接已复制',
    }
    
    if (channel === 'copy') {
      handleCopyLink()
    } else {
      toast.info(messages[channel])
    }
  }, [handleCopyLink])

  // 当切换到海报Tab时自动生成
  useEffect(() => {
    if (activeTab === 'poster' && posterConfig && !posterGenerated) {
      generatePoster()
    }
  }, [activeTab, posterConfig, posterGenerated, generatePoster])

  // 当切换背景时重新生成
  useEffect(() => {
    if (activeTab === 'poster' && posterConfig && posterGenerated) {
      generatePoster()
    }
  }, [selectedBg])

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-10 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
        <div className="flex items-center justify-between px-4 h-14">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.back()}
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">邀请好友</h1>
          <div className="w-10" />
        </div>
      </header>

      <DataState
        loading={loading}
        error={error}
        empty={!linkInfo}
        emptyMessage="暂无邀请信息"
        onRetry={() => window.location.reload()}
      >
        <div className="p-4 space-y-4">
          {/* 邀请奖励说明 */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-xl p-4 border border-amber-200/50 dark:border-amber-800/50">
            <div className="flex items-center gap-2 mb-2">
              <Gift className="w-5 h-5 text-amber-600" />
              <span className="font-semibold text-amber-800 dark:text-amber-200">邀请奖励</span>
            </div>
            <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
              <li>• 好友注册即得 <span className="font-semibold">10积分</span></li>
              <li>• 好友首次付费返佣 <span className="font-semibold">10%</span></li>
              <li>• 好友开通会员再得 <span className="font-semibold">20元</span></li>
            </ul>
          </div>

          {/* Tab切换 */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="link" className="gap-1.5">
                <Link2 className="w-4 h-4" />
                推荐链接
              </TabsTrigger>
              <TabsTrigger value="qrcode" className="gap-1.5">
                <QrCode className="w-4 h-4" />
                二维码
              </TabsTrigger>
              <TabsTrigger value="poster" className="gap-1.5">
                <ImageIcon className="w-4 h-4" />
                分享海报
              </TabsTrigger>
            </TabsList>

            {/* 推荐链接 */}
            <TabsContent value="link" className="mt-4 space-y-4">
              <div className="bg-card rounded-xl p-4 border">
                <div className="text-sm text-muted-foreground mb-2">我的邀请码</div>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-primary tracking-widest">
                    {linkInfo?.inviteCode}
                  </span>
                  <Button variant="outline" size="sm" onClick={handleCopyCode}>
                    <Copy className="w-4 h-4 mr-1" />
                    复制
                  </Button>
                </div>
              </div>

              <div className="bg-card rounded-xl p-4 border">
                <div className="text-sm text-muted-foreground mb-2">邀请链接</div>
                <div className="bg-muted/50 rounded-lg p-3 text-sm break-all text-foreground/80">
                  {linkInfo?.inviteLink}
                </div>
                <Button 
                  className="w-full mt-3" 
                  onClick={handleCopyLink}
                  disabled={copied}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      已复制
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      复制链接
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            {/* 二维码 */}
            <TabsContent value="qrcode" className="mt-4">
              <div className="bg-card rounded-xl p-6 border text-center">
                <div className="inline-block p-4 bg-white rounded-xl shadow-sm">
                  <img 
                    src={linkInfo?.qrCodeUrl || '/placeholder.svg'} 
                    alt="邀请二维码"
                    className="w-48 h-48"
                  />
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  长按或扫描二维码加入
                </p>
                <p className="mt-1 text-primary font-semibold">
                  邀请码: {linkInfo?.inviteCode}
                </p>
                
                <div className="mt-4 flex gap-3">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => {
                      if (linkInfo?.qrCodeUrl) {
                        const link = document.createElement('a')
                        link.download = `qrcode_${linkInfo.inviteCode}.png`
                        link.href = linkInfo.qrCodeUrl
                        link.click()
                        toast.success('二维码已保存')
                      }
                    }}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    保存二维码
                  </Button>
                  <Button className="flex-1" onClick={handleCopyLink}>
                    <Copy className="w-4 h-4 mr-2" />
                    复制链接
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* 分享海报 */}
            <TabsContent value="poster" className="mt-4">
              <div className="bg-card rounded-xl p-4 border">
                {/* 背景选择 */}
                <div className="mb-4">
                  <div className="text-sm text-muted-foreground mb-2">选择背景</div>
                  <div className="flex gap-2">
                    {posterConfig?.backgroundImages.map((bg, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedBg(index)}
                        className={`w-16 h-24 rounded-lg overflow-hidden border-2 transition-all ${
                          selectedBg === index 
                            ? 'border-primary ring-2 ring-primary/20' 
                            : 'border-transparent hover:border-muted-foreground/30'
                        }`}
                      >
                        <img 
                          src={bg} 
                          alt={`背景${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Canvas海报预览 */}
                <div className="relative flex justify-center bg-muted/30 rounded-lg p-4">
                  {generatingPoster && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-lg z-10">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  )}
                  <canvas 
                    ref={canvasRef}
                    className="max-w-full h-auto rounded-lg shadow-lg"
                    style={{ maxHeight: '400px' }}
                  />
                </div>

                {/* 操作按钮 */}
                <div className="mt-4 flex gap-3">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={generatePoster}
                    disabled={generatingPoster}
                  >
                    {generatingPoster ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <ImageIcon className="w-4 h-4 mr-2" />
                    )}
                    重新生成
                  </Button>
                  <Button 
                    className="flex-1"
                    onClick={handleSavePoster}
                    disabled={!posterGenerated}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    保存海报
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* 分享渠道 */}
          <div className="bg-card rounded-xl p-4 border">
            <div className="text-sm text-muted-foreground mb-3">分享到</div>
            <div className="grid grid-cols-4 gap-4">
              <button 
                onClick={() => handleShare('wechat')}
                className="flex flex-col items-center gap-1.5"
              >
                <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89l-.006-.033zm-2.722 2.394c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982z"/>
                  </svg>
                </div>
                <span className="text-xs text-muted-foreground">微信</span>
              </button>
              
              <button 
                onClick={() => handleShare('moments')}
                className="flex flex-col items-center gap-1.5"
              >
                <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="4" fill="white" />
                  </svg>
                </div>
                <span className="text-xs text-muted-foreground">朋友圈</span>
              </button>
              
              <button 
                onClick={() => handleShare('qq')}
                className="flex flex-col items-center gap-1.5"
              >
                <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.003 2c-2.265 0-6.29 1.364-6.29 7.325v1.195S3.55 14.96 3.55 17.474c0 .665.17 1.025.281 1.025.114 0 .902-.484 1.748-2.072 0 0-.18 2.197 1.904 3.967 0 0-1.77.495-1.77 1.182 0 .686 4.078.43 6.29.43 2.212 0 6.29.256 6.29-.43 0-.687-1.77-1.182-1.77-1.182 2.084-1.77 1.904-3.967 1.904-3.967.846 1.588 1.634 2.072 1.748 2.072.11 0 .281-.36.281-1.025 0-2.514-2.163-6.954-2.163-6.954V9.325C18.293 3.364 14.268 2 12.003 2z"/>
                  </svg>
                </div>
                <span className="text-xs text-muted-foreground">QQ</span>
              </button>
              
              <button 
                onClick={() => handleShare('copy')}
                className="flex flex-col items-center gap-1.5"
              >
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <Copy className="w-6 h-6 text-muted-foreground" />
                </div>
                <span className="text-xs text-muted-foreground">复制链接</span>
              </button>
            </div>
          </div>

          {/* 查看邀请记录 */}
          <Button 
            variant="outline" 
            className="w-full justify-between"
            onClick={() => router.push('/mine/invite-records')}
          >
            <span>查看邀请记录</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </DataState>
    </div>
  )
}
