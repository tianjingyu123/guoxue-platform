<template>
  <view class="min-h-screen bg-[#1A1A1A] flex flex-col">
    <!-- 顶部导航 -->
    <header class="sticky top-0 z-50 bg-black/80" style="backdrop-filter:blur(8px)">
      <view class="flex items-center justify-between px-4 h-14">
        <view @click="goBack" class="text-white"><text class="text-xl">✕</text></view>
        <text class="text-white font-medium">{{ posterTitle }}</text>
        <view class="w-6" />
      </view>
    </header>

    <!-- 加载中 -->
    <view v-if="isLoading" class="flex-1 flex items-center justify-center">
      <view class="text-center">
        <view class="w-10 h-10 rounded-full border-2 border-white/30 border-t-white animate-spin mx-auto mb-4" />
        <text class="text-white/70 text-sm">加载中...</text>
      </view>
    </view>

    <!-- 海报预览区 -->
    <view v-else class="flex-1 flex items-center justify-center px-6 py-4">
      <view class="relative">
        <view v-if="isDrawing" class="absolute inset-0 flex items-center justify-center z-10" style="background:rgba(0,0,0,0.5);border-radius:12px">
          <view class="text-center">
            <view class="w-8 h-8 rounded-full border-2 border-white/30 border-t-white animate-spin mx-auto mb-2" />
            <text class="text-white text-sm">生成中...</text>
          </view>
        </view>
        <canvas canvas-id="posterCanvas" class="rounded-xl shadow-2xl" :style="{ width: canvasStyleW, height: canvasStyleH }" />
      </view>
    </view>

    <!-- 模板选择 -->
    <view v-if="templates.length > 1 && !isLoading" class="px-4 pb-4">
      <text class="text-white/70 text-sm block mb-2">选择模板</text>
      <scroll-view scroll-x class="flex gap-3 pb-2 whitespace-nowrap">
        <view v-for="(tpl, idx) in templates" :key="tpl.id" @click="selectedTemplate = idx"
          class="relative inline-flex w-16 h-24 rounded-lg overflow-hidden border-2 transition-all mr-3 align-top"
          :class="selectedTemplate === idx ? 'border-primary' : 'border-transparent opacity-60'">
          <view class="w-full h-full flex items-center justify-center text-white text-xs" style="background:linear-gradient(135deg,#C41E3A,#8B1538)">
            <text>{{ tpl.name[0] }}</text>
          </view>
          <view v-if="selectedTemplate === idx" class="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
            <text class="text-white text-xs">✓</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 底部操作栏 -->
    <view class="bg-black/80 border-t border-white/10 px-4 py-3" style="padding-bottom:calc(12px + env(safe-area-inset-bottom))">
      <view class="flex gap-3">
        <view @click="handleRegenerate"
          class="flex-1 h-12 rounded-xl flex items-center justify-center gap-1"
          :class="isDrawing ? 'opacity-50' : ''"
          style="border:1px solid rgba(255,255,255,0.2)">
          <text class="text-white text-sm"></text>
          <text class="text-white text-sm">重新生成</text>
        </view>
        <view @click="handleSave"
          class="flex-1 h-12 rounded-xl flex items-center justify-center gap-1"
          :class="!posterUrl || isSaving ? 'opacity-50' : ''"
          style="border:1px solid rgba(255,255,255,0.2)">
          <text class="text-white text-sm">⬇</text>
          <text class="text-white text-sm">{{ isSaving ? '保存中...' : '保存' }}</text>
        </view>
        <view @click="handleShare"
          class="flex-1 h-12 rounded-xl flex items-center justify-center gap-1 text-white"
          :class="!posterUrl ? 'opacity-50' : ''"
          style="background:#C41E3A">
          <text class="text-white text-sm"></text>
          <text class="text-white text-sm">分享</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { api } from '@/api'

type PosterType = 'invite' | 'course' | 'product' | 'article' | 'live' | 'card'

const isLoading = ref(true)
const isDrawing = ref(false)
const isSaving = ref(false)
const posterTitle = ref('分享海报')
const posterUrl = ref('')
const selectedTemplate = ref(0)
const posterType = ref<PosterType>('invite')
const canvasStyleW = ref('300px')
const canvasStyleH = ref('533px')

interface PosterTemplate { id: number; name: string; thumbnail: string }
const templates = ref<PosterTemplate[]>([])

// 海报数据接口
interface PosterExtra {
  benefits?: string[]; lessonCount?: number; studentCount?: number
  speaker?: string; time?: string; liveStatus?: string
  qrText?: string
}
interface PosterData {
  type: PosterType; title: string; subtitle?: string; description?: string
  coverImage?: string; price?: number; originalPrice?: number
  qrCodeUrl: string; extra?: PosterExtra
}

const posterData = ref<PosterData | null>(null)

const posterTitles: Record<PosterType, string> = {
  invite: '邀请海报', course: '课程海报', product: '商品海报',
  article: '文章海报', live: '直播海报', card: '名片海报',
}

onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  const options = currentPage?.$page?.options || currentPage?.options || {}
  const type = (options.type || 'invite') as PosterType
  posterType.value = type
  posterTitle.value = posterTitles[type] || '分享海报'

  if (type === 'invite') {
    templates.value = [
      { id: 1, name: '经典红', thumbnail: '' },
      { id: 2, name: '雅致金', thumbnail: '' },
    ]
  }

  posterData.value = generateMockData(type)
  isLoading.value = false
  setTimeout(() => drawPoster(), 300)
})

watch(selectedTemplate, () => {
  if (!isDrawing.value) drawPoster()
})

function generateMockData(type: PosterType): PosterData {
  const base = {
    qrCodeUrl: '',
    extra: {} as PosterExtra,
  }
  switch (type) {
    case 'invite':
      return { ...base, type, title: '邀请您加入热卜', subtitle: '与您一起探索国学智慧', extra: { benefits: ['注册即得100积分', '首单立减10元', '免费试听精品课程'] } }
    case 'course':
      return { ...base, type, title: '八字命理入门精讲', subtitle: '从零基础到实战分析', description: '系统学习八字知识，掌握命运规律', coverImage: '/images/courses/course-1.jpg', price: 199, originalPrice: 399, extra: { lessonCount: 32, studentCount: 1280, qrText: '扫码查看课程详情' } }
    case 'product':
      return { ...base, type, title: '开光文昌塔摆件', subtitle: '助力学业事业', description: '正宗开光，助运学业事业', coverImage: '/images/products/product-1.jpg', price: 168, originalPrice: 268, extra: { qrText: '扫码查看商品详情' } }
    case 'article':
      return { ...base, type, title: '八字看婚姻的三个关键点', subtitle: '日支为配偶宫，看日支与其他地支的关系', description: '深度解析八字合婚的核心技法，看完你也能分析自己的婚姻走势', qrCodeUrl: '', extra: { qrText: '扫码查看文章详情' } }
    case 'live':
      return { ...base, type, title: '八字命理直播公开课', subtitle: '周易大师亲授', description: '本期主题：如何从八字看财运走势？在线答疑互动', coverImage: '/images/live/live-1.jpg', price: 0, extra: { speaker: '周易大师', time: '今晚20:00', liveStatus: '直播中', qrText: '扫码预约直播' } }
    case 'card':
      return { ...base, type, title: '周易大师', subtitle: '20年命理研究经验', description: '八字命理 | 风水布局 | 姓名分析', qrCodeUrl: '', extra: { qrText: '扫码添加微信' } }
    default:
      return { ...base, type, title: '分享海报', qrCodeUrl: '' }
  }
}

function drawPoster() {
  if (!posterData.value) return
  isDrawing.value = true
  const query = uni.createSelectorQuery()
  query.select('#posterCanvas').fields({ node: true, size: true }).exec((res: any) => {
    const canvas = res[0]?.node
    if (canvas) {
      drawWithNode(canvas, posterData.value!)
    } else {
      drawLegacy(posterData.value!)
    }
  })
}

async function drawWithNode(canvas: any, data: PosterData) {
  const ctx = canvas.getContext('2d')
  const dpr = 2
  const w = 375; const h = 667
  canvas.width = w * dpr; canvas.height = h * dpr
  ctx.scale(dpr, dpr)

  // 背景
  ctx.fillStyle = '#FAF8F5'
  ctx.fillRect(0, 0, w, h)

  // 顶部装饰
  const gradient = ctx.createLinearGradient(0, 0, w, 150)
  gradient.addColorStop(0, '#C41E3A')
  gradient.addColorStop(1, '#8B1538')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, w, 150)

  // 装饰圆
  ctx.fillStyle = 'rgba(255,255,255,0.1)'
  for (let i = 0; i < 5; i++) {
    ctx.beginPath()
    ctx.arc(50 + i * 80, 75, 30, 0, Math.PI * 2)
    ctx.fill()
  }

  let currentY = 180

  if (data.type === 'invite') {
    // 邀请海报
    ctx.fillStyle = '#333'
    ctx.font = 'bold 24px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(data.title, w / 2, currentY)
    currentY += 35

    if (data.subtitle) {
      ctx.fillStyle = '#666'
      ctx.font = '14px sans-serif'
      ctx.fillText(data.subtitle, w / 2, currentY)
      currentY += 40
    }

    if (data.extra?.benefits) {
      ctx.textAlign = 'left'
      ctx.fillStyle = '#C9A96E'
      ctx.font = '14px sans-serif'
      data.extra.benefits.forEach((b, i) => {
        ctx.fillText('✦ ' + b, 60, currentY + i * 35)
      })
      currentY += data.extra.benefits.length * 35 + 30
    }

    // 二维码占位
    ctx.fillStyle = '#eee'
    roundRect(ctx, (w - 120) / 2, 430, 120, 120, 8)
    ctx.fill()

    ctx.fillStyle = '#999'
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('扫码加入热卜', w / 2, 570)

  } else if (data.type === 'course' || data.type === 'product') {
    // 课程/商品海报
    // 标题
    ctx.fillStyle = '#333'
    ctx.font = 'bold 18px sans-serif'
    ctx.textAlign = 'left'
    drawMultilineText(ctx, data.title, 30, currentY, w - 60, 26, 2)
    currentY += 50

    if (data.subtitle) {
      ctx.fillStyle = '#666'
      ctx.font = '14px sans-serif'
      ctx.fillText(data.subtitle, 30, currentY)
      currentY += 30
    }

    // 价格
    if (data.price !== undefined) {
      ctx.fillStyle = '#C41E3A'
      ctx.font = 'bold 28px sans-serif'
      ctx.fillText('¥' + data.price, 30, currentY)

      if (data.originalPrice) {
        const priceW = ctx.measureText('¥' + data.price).width
        ctx.fillStyle = '#999'
        ctx.font = '14px sans-serif'
        ctx.fillText('¥' + data.originalPrice, 40 + priceW, currentY)
        ctx.strokeStyle = '#999'
        ctx.lineWidth = 1
        const origW = ctx.measureText('¥' + data.originalPrice).width
        ctx.beginPath()
        ctx.moveTo(40 + priceW, currentY - 5)
        ctx.lineTo(40 + priceW + origW, currentY - 5)
        ctx.stroke()
      }
      currentY += 40
    }

    if (data.extra?.lessonCount || data.extra?.studentCount) {
      ctx.fillStyle = '#999'
      ctx.font = '12px sans-serif'
      const info: string[] = []
      if (data.extra.lessonCount) info.push(data.extra.lessonCount + '节课程')
      if (data.extra.studentCount) info.push(data.extra.studentCount + '人学习')
      ctx.fillText(info.join(' · '), 30, currentY)
      currentY += 30
    }

    // 二维码区域
    currentY = h - 130
    ctx.fillStyle = '#f5f5f5'
    roundRect(ctx, 30, currentY, w - 60, 100, 12)
    ctx.fill()

    ctx.fillStyle = '#ddd'
    roundRect(ctx, 45, currentY + 15, 70, 70, 8)
    ctx.fill()

    ctx.fillStyle = '#333'
    ctx.font = 'bold 14px sans-serif'
    ctx.fillText('扫码查看详情', 130, currentY + 40)
    ctx.fillStyle = '#999'
    ctx.font = '12px sans-serif'
    ctx.fillText('长按识别二维码', 130, currentY + 60)

  } else if (data.type === 'live') {
    // 直播海报
    ctx.fillStyle = '#333'
    ctx.font = 'bold 20px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(data.title, w / 2, currentY)
    currentY += 35

    if (data.subtitle) {
      ctx.fillStyle = '#666'
      ctx.font = '14px sans-serif'
      ctx.fillText(data.subtitle, w / 2, currentY)
      currentY += 35
    }

    if (data.extra?.speaker) {
      ctx.fillStyle = '#C41E3A'
      ctx.font = '16px sans-serif'
      ctx.fillText('主讲人：' + data.extra.speaker, w / 2, currentY)
      currentY += 30
    }
    if (data.extra?.time) {
      ctx.fillStyle = '#999'
      ctx.font = '13px sans-serif'
      ctx.fillText('时间：' + data.extra.time, w / 2, currentY)
      currentY += 40
    }

    // 二维码
    ctx.fillStyle = '#eee'
    roundRect(ctx, (w - 100) / 2, currentY, 100, 100, 8)
    ctx.fill()

    ctx.fillStyle = '#999'
    ctx.font = '12px sans-serif'
    ctx.fillText('扫码预约直播', w / 2, currentY + 115)

  } else {
    // 文章/名片海报
    ctx.fillStyle = '#333'
    ctx.font = 'bold 20px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(data.title, w / 2, currentY)
    currentY += 40

    if (data.subtitle) {
      ctx.fillStyle = '#666'
      ctx.font = '14px sans-serif'
      ctx.fillText(data.subtitle, w / 2, currentY)
      currentY += 40
    }

    if (data.description) {
      ctx.fillStyle = '#999'
      ctx.font = '13px sans-serif'
      ctx.textAlign = 'left'
      drawMultilineText(ctx, data.description, 40, currentY, w - 80, 22, 3)
      currentY += 80
    }

    // 二维码
    currentY = h - 180
    ctx.fillStyle = '#eee'
    roundRect(ctx, (w - 100) / 2, currentY, 100, 100, 8)
    ctx.fill()

    ctx.fillStyle = '#999'
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('扫码查看详情', w / 2, currentY + 115)
  }

  // 底部品牌
  ctx.fillStyle = '#ccc'
  ctx.font = '11px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('热卜 · 国学知识付费平台', w / 2, h - 20)

  // 生成图片
  posterUrl.value = canvas.toDataURL('image/png')
  isDrawing.value = false
}

function drawLegacy(data: PosterData) {
  const ctx = uni.createCanvasContext('posterCanvas')
  const w = 300; const h = 533
  ctx.setFillStyle('#FAF8F5'); ctx.fillRect(0, 0, w, h)
  ctx.setFillStyle('#C41E3A'); ctx.fillRect(0, 0, w, 120)
  ctx.setFillStyle('rgba(255,255,255,0.1)')
  for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(40 + i * 56, 60, 24, 0, Math.PI * 2); ctx.fill() }

  if (data.type === 'invite') {
    ctx.setFillStyle('#333'); ctx.setFontSize(18); ctx.setTextAlign('center')
    ctx.fillText(data.title, 150, 170)
    if (data.subtitle) { ctx.setFillStyle('#666'); ctx.setFontSize(12); ctx.fillText(data.subtitle, 150, 200) }
    if (data.extra?.benefits) {
      ctx.setTextAlign('left'); ctx.setFillStyle('#C9A96E'); ctx.setFontSize(12)
      data.extra.benefits.forEach((b, i) => ctx.fillText('✦ ' + b, 50, 250 + i * 30))
    }
    ctx.setFillStyle('#eee'); ctx.fillRect(90, 370, 120, 100)
    ctx.setFillStyle('#999'); ctx.setFontSize(10); ctx.setTextAlign('center')
    ctx.fillText('扫码加入热卜', 150, 490)
  } else if (data.type === 'course' || data.type === 'product') {
    ctx.setFillStyle('#333'); ctx.setFontSize(16)
    ctx.fillText(data.title, 30, 170)
    if (data.price !== undefined) {
      ctx.setFillStyle('#C41E3A'); ctx.setFontSize(22)
      ctx.fillText('¥' + data.price, 30, 210)
    }
    ctx.setFillStyle('#f5f5f5')
    roundRectLegacy(ctx, 30, 410, w - 60, 80, 10); ctx.fill()
    ctx.setFillStyle('#ddd'); ctx.fillRect(40, 420, 60, 60)
    ctx.setFillStyle('#333'); ctx.setFontSize(12)
    ctx.fillText('扫码查看详情', 110, 450)
  } else {
    ctx.setFillStyle('#333'); ctx.setFontSize(16); ctx.setTextAlign('center')
    ctx.fillText(data.title, 150, 170)
    if (data.description) {
      ctx.setFillStyle('#999'); ctx.setFontSize(11); ctx.setTextAlign('left')
      ctx.fillText(data.description, 40, 210)
    }
    ctx.setFillStyle('#eee'); ctx.fillRect(100, 360, 100, 100)
    ctx.setFillStyle('#999'); ctx.setFontSize(10); ctx.setTextAlign('center')
    ctx.fillText('扫码查看详情', 150, 480)
  }

  ctx.setFillStyle('#ccc'); ctx.setFontSize(9); ctx.setTextAlign('center')
  ctx.fillText('热卜 · 国学知识付费平台', 150, 518)
  ctx.draw(false, () => { isDrawing.value = false })
}

function drawMultilineText(ctx: any, text: string, x: number, y: number, maxW: number, lineH: number, maxLines: number) {
  let line = ''
  let lineCount = 0
  for (const char of text) {
    const testLine = line + char
    const metrics = ctx.measureText(testLine)
    if (metrics.width > maxW && line !== '') {
      ctx.fillText(line, x, y + lineCount * lineH)
      lineCount++
      if (lineCount >= maxLines) {
        ctx.fillText(line.slice(0, -1) + '...', x, y + (lineCount - 1) * lineH)
        return
      }
      line = char
    } else {
      line = testLine
    }
  }
  ctx.fillText(line, x, y + lineCount * lineH)
}

function roundRect(ctx: any, x: number, y: number, w: number, h: number, r: number) {
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function roundRectLegacy(ctx: any, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.arc(x + r, y + r, r, Math.PI, Math.PI * 3 / 2)
  ctx.lineTo(w - r + x, y)
  ctx.arc(w - r + x, r + y, r, Math.PI * 3 / 2, Math.PI * 2)
  ctx.lineTo(w + x, h + y - r)
  ctx.arc(w - r + x, h - r + y, r, 0, Math.PI * 1 / 2)
  ctx.lineTo(r + x, h + y)
  ctx.arc(r + x, h - r + y, r, Math.PI * 1 / 2, Math.PI)
  ctx.closePath()
}

function handleRegenerate() {
  if (!isDrawing.value) drawPoster()
}

function handleSave() {
  if (isDrawing.value || !posterUrl.value) return
  isSaving.value = true
  uni.showLoading({ title: '保存中...' })
  uni.canvasToTempFilePath({
    canvasId: 'posterCanvas',
    success: (res: any) => {
      uni.saveImageToPhotosAlbum({
        filePath: res.tempFilePath,
        success: () => { uni.hideLoading(); isSaving.value = false; uni.showToast({ title: '海报已保存', icon: 'success' }) },
        fail: () => { uni.hideLoading(); isSaving.value = false; uni.showToast({ title: '保存失败，请手动截图', icon: 'none' }) },
      })
    },
    fail: () => { uni.hideLoading(); isSaving.value = false; uni.showToast({ title: '生成失败', icon: 'none' }) },
  })
}

function handleShare() {
  if (!posterUrl.value) return
  uni.share({
    title: posterTitle.value,
    content: '分享海报',
  })
}

function goBack() { uni.navigateBack() }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
