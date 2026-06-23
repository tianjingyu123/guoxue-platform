"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { ArrowLeft, Download, Share2, Award, Calendar, Clock, User, QrCode, CheckCircle } from "lucide-react"
import { courseApi, type Certificate } from "@/lib/api"

// 骨架屏
function CertificateSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1a2e] to-[#16213e] flex flex-col">
      <div className="p-4">
        <div className="w-8 h-8 bg-white/10 rounded-full animate-pulse" />
      </div>
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm aspect-[3/4] bg-white/10 rounded-lg animate-pulse" />
      </div>
      <div className="p-4 space-y-3">
        <div className="h-12 bg-white/10 rounded-full animate-pulse" />
        <div className="h-12 bg-white/10 rounded-full animate-pulse" />
      </div>
    </div>
  )
}

// 证书组件
function CertificateCard({ certificate }: { certificate: Certificate }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [imageUrl, setImageUrl] = useState<string>("")

  // Canvas绘制证书
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 设置画布尺寸（高清）
    const scale = 2
    canvas.width = 375 * scale
    canvas.height = 500 * scale
    ctx.scale(scale, scale)

    // 绘制背景
    const gradient = ctx.createLinearGradient(0, 0, 0, 500)
    gradient.addColorStop(0, '#FDF8F3')
    gradient.addColorStop(1, '#F5EDE4')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 375, 500)

    // 绘制边框装饰
    ctx.strokeStyle = '#C9A96E'
    ctx.lineWidth = 3
    ctx.strokeRect(15, 15, 345, 470)

    // 内边框
    ctx.strokeStyle = '#E8D5B5'
    ctx.lineWidth = 1
    ctx.strokeRect(25, 25, 325, 450)

    // 顶部装饰图案
    ctx.fillStyle = '#C41E3A'
    ctx.beginPath()
    ctx.arc(187.5, 60, 25, 0, Math.PI * 2)
    ctx.fill()

    // 奖章图标
    ctx.fillStyle = '#FFF'
    ctx.font = 'bold 24px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('★', 187.5, 68)

    // 标题
    ctx.fillStyle = '#C41E3A'
    ctx.font = 'bold 28px "Noto Serif SC", serif'
    ctx.textAlign = 'center'
    ctx.fillText('结业证书', 187.5, 120)

    // 英文副标题
    ctx.fillStyle = '#999'
    ctx.font = '12px Arial'
    ctx.fillText('CERTIFICATE OF COMPLETION', 187.5, 140)

    // 学员姓名
    ctx.fillStyle = '#2C2C2C'
    ctx.font = 'bold 24px "Noto Sans SC", sans-serif'
    ctx.fillText(certificate.studentName, 187.5, 190)

    // 描述文字
    ctx.fillStyle = '#666'
    ctx.font = '14px "Noto Sans SC", sans-serif'
    ctx.fillText('已完成', 187.5, 230)

    // 课程名称
    ctx.fillStyle = '#C41E3A'
    ctx.font = 'bold 18px "Noto Serif SC", serif'
    const courseName = certificate.courseName.length > 16 
      ? certificate.courseName.slice(0, 16) + '...' 
      : certificate.courseName
    ctx.fillText(`《${courseName}》`, 187.5, 265)

    // 课程信息
    ctx.fillStyle = '#666'
    ctx.font = '13px "Noto Sans SC", sans-serif'
    ctx.fillText(`全部课程学习，共计 ${certificate.totalHours} 学时`, 187.5, 295)

    // 分数（如果有）
    if (certificate.score) {
      ctx.fillStyle = '#C9A96E'
      ctx.font = 'bold 16px "Noto Sans SC", sans-serif'
      ctx.fillText(`综合评分：${certificate.score} 分`, 187.5, 325)
    }

    // 分隔线
    ctx.strokeStyle = '#E8D5B5'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(60, 355)
    ctx.lineTo(315, 355)
    ctx.stroke()

    // 讲师签名
    ctx.fillStyle = '#666'
    ctx.font = '12px "Noto Sans SC", sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('授课讲师', 50, 385)
    ctx.fillStyle = '#2C2C2C'
    ctx.font = 'italic 16px "Noto Serif SC", serif'
    ctx.fillText(certificate.instructor, 50, 408)

    // 日期
    ctx.fillStyle = '#666'
    ctx.font = '12px "Noto Sans SC", sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText('颁发日期', 325, 385)
    ctx.fillStyle = '#2C2C2C'
    ctx.font = '14px "Noto Sans SC", sans-serif'
    ctx.fillText(new Date(certificate.completedAt).toLocaleDateString('zh-CN'), 325, 408)

    // 证书编号
    ctx.fillStyle = '#999'
    ctx.font = '10px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(`证书编号：${certificate.certificateNo}`, 187.5, 450)

    // 平台名称
    ctx.fillStyle = '#C41E3A'
    ctx.font = 'bold 12px "Noto Sans SC", sans-serif'
    ctx.fillText('热卜国学', 187.5, 475)

    // 生成图片URL
    setImageUrl(canvas.toDataURL('image/png'))
  }, [certificate])

  return (
    <div className="relative">
      <canvas ref={canvasRef} className="w-full max-w-sm mx-auto rounded-lg shadow-2xl" style={{ display: imageUrl ? 'none' : 'block' }} />
      {imageUrl && (
        <img src={imageUrl} alt="结业证书" className="w-full max-w-sm mx-auto rounded-lg shadow-2xl" />
      )}
    </div>
  )
}

// 主组件内容
function CertificatePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const courseId = searchParams.get('courseId') || '1'

  const [certificate, setCertificate] = useState<Certificate | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  // 获取证书数据
  useEffect(() => {
    const fetchCertificate = async () => {
      try {
        const data = await courseApi.certificate(courseId)
        setCertificate(data)
      } catch (error) {
        // 使用模拟数据
        setCertificate({
          id: "cert-001",
          courseId: courseId,
          courseName: "八字命理入门精讲",
          studentName: "张三",
          studentAvatar: "",
          completedAt: new Date().toISOString(),
          certificateNo: "RB2024010001",
          qrCodeUrl: "",
          instructor: "李明德",
          totalHours: 32,
          score: 95,
        })
      } finally {
        setIsLoading(false)
      }
    }
    fetchCertificate()
  }, [courseId])

  // 保存到相册
  const handleSave = async () => {
    setIsSaving(true)
    try {
      const canvas = document.querySelector('canvas')
      if (canvas) {
        const link = document.createElement('a')
        link.download = `certificate-${certificate?.certificateNo}.png`
        link.href = canvas.toDataURL('image/png')
        link.click()
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 2000)
      }
    } finally {
      setIsSaving(false)
    }
  }

  // 分享
  const handleShare = async () => {
    setIsSharing(true)
    try {
      if (navigator.share) {
        await navigator.share({
          title: `我获得了《${certificate?.courseName}》结业证书`,
          text: `我在热卜国学完成了《${certificate?.courseName}》课程学习，获得结业证书！`,
          url: window.location.href,
        })
      } else {
        // 复制链接
        await navigator.clipboard.writeText(window.location.href)
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 2000)
      }
    } finally {
      setIsSharing(false)
    }
  }

  if (isLoading) {
    return <CertificateSkeleton />
  }

  if (!certificate) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a1a2e] to-[#16213e] flex flex-col items-center justify-center p-4">
        <Award className="w-16 h-16 text-white/30 mb-4" />
        <p className="text-white/60 text-center">暂无证书</p>
        <p className="text-white/40 text-sm mt-2">完成全部课程后可获得结业证书</p>
        <button
          onClick={() => router.back()}
          className="mt-6 px-6 py-2 bg-white/10 text-white rounded-full"
        >
          返回课程
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1a2e] to-[#16213e] flex flex-col">
      {/* 顶部导航 */}
      <div className="flex items-center justify-between p-4">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-white font-medium">结业证书</h1>
        <div className="w-10" />
      </div>

      {/* 恭喜提示 */}
      <div className="px-4 py-2 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#C9A96E]/20 to-[#C41E3A]/20 rounded-full">
          <CheckCircle className="w-4 h-4 text-[#C9A96E]" />
          <span className="text-[#C9A96E] text-sm">恭喜您完成课程学习！</span>
        </div>
      </div>

      {/* 证书展示 */}
      <div className="flex-1 flex items-center justify-center p-4">
        <CertificateCard certificate={certificate} />
      </div>

      {/* 证书信息 */}
      <div className="px-4 py-3 mx-4 bg-white/5 rounded-xl mb-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-[#C9A96E]" />
            <span className="text-white/60">学员：</span>
            <span className="text-white">{certificate.studentName}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#C9A96E]" />
            <span className="text-white/60">学时：</span>
            <span className="text-white">{certificate.totalHours}小时</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#C9A96E]" />
            <span className="text-white/60">日期：</span>
            <span className="text-white">{new Date(certificate.completedAt).toLocaleDateString('zh-CN')}</span>
          </div>
          <div className="flex items-center gap-2">
            <QrCode className="w-4 h-4 text-[#C9A96E]" />
            <span className="text-white/60">编号：</span>
            <span className="text-white text-xs">{certificate.certificateNo}</span>
          </div>
        </div>
      </div>

      {/* 底部操作按钮 */}
      <div className="p-4 space-y-3 pb-8">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full py-3.5 bg-gradient-to-r from-[#C41E3A] to-[#E74C3C] text-white font-medium rounded-full flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Download className="w-5 h-5" />
          {isSaving ? '保存中...' : '保存到相册'}
        </button>
        <button
          onClick={handleShare}
          disabled={isSharing}
          className="w-full py-3.5 bg-white/10 text-white font-medium rounded-full flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Share2 className="w-5 h-5" />
          {isSharing ? '分享中...' : '分享给好友'}
        </button>
      </div>

      {/* 成功提示 */}
      {showSuccess && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-black/80 text-white px-6 py-3 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span>操作成功</span>
          </div>
        </div>
      )}
    </div>
  )
}

// 导出组件
export default function CertificatePage() {
  return (
    <Suspense fallback={<CertificateSkeleton />}>
      <CertificatePageContent />
    </Suspense>
  )
}
