<template>
  <view class="min-h-screen bg-background pb-24">
    <!-- ===== Loading骨架屏 ===== -->
    <template v-if="loading">
      <header class="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
        <view class="flex items-center gap-3">
          <view class="w-8 h-8 rounded-full skeleton-bg" />
          <view class="h-5 w-24 skeleton-bg rounded" />
        </view>
      </header>
      <view class="p-4 space-y-4">
        <view class="h-8 w-48 skeleton-bg rounded" />
        <view class="h-4 w-32 skeleton-bg rounded" />
        <view v-for="i in 5" :key="i" class="h-4 w-full skeleton-bg rounded" />
      </view>
    </template>

    <!-- ===== 加载失败 ===== -->
    <template v-else-if="!document">
      <view class="min-h-screen bg-background flex items-center justify-center">
        <view class="text-center">
          <text class="text-5xl text-muted-foreground block mb-4"></text>
          <text class="text-sm text-muted-foreground block">文档加载失败</text>
          <view @click="goBack" class="inline-block mt-4 px-6 py-2 bg-white border border-border rounded-full text-sm text-foreground">返回</view>
        </view>
      </view>
    </template>

    <!-- ===== 主内容 ===== -->
    <template v-else>
      <!-- 导航栏 -->
      <header class="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
        <view class="flex items-center justify-between">
          <view class="flex items-center gap-3">
            <view @click="goBack" class="p-1 -ml-1"><text class="text-2xl leading-none">←</text></view>
            <text class="text-lg font-semibold">用户协议</text>
          </view>
          <view @click="showToc = true" class="p-1"><text class="text-lg"></text></view>
        </view>
      </header>

      <!-- 文档信息 -->
      <view class="px-4 py-4 border-b border-border" style="background:rgba(250,248,245,0.5)">
        <text class="text-xl font-bold text-foreground block mb-1">{{ document.title || '用户服务协议' }}</text>
        <view class="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
          <text class="flex items-center gap-1"> 版本 {{ document.version || '1.0' }}</text>
          <text class="flex items-center gap-1">🕐 {{ document.effectiveDate || '2024-01-01' }} 生效</text>
        </view>
        <text v-if="document.summary" class="mt-3 text-sm text-muted-foreground leading-relaxed block">{{ document.summary }}</text>
      </view>

      <!-- 正文 -->
      <view class="px-4 py-6">
        <view class="text-sm text-ink-soft leading-relaxed space-y-4">
          <view v-for="(section, idx) in sections" :key="idx" class="mb-6">
            <text class="text-base font-semibold text-foreground block mb-3 pb-2" style="border-bottom:1px solid rgba(232,224,213,0.6)">{{ section.title }}</text>
            <text class="text-sm text-ink-soft leading-relaxed whitespace-pre-line block">{{ section.content }}</text>
          </view>
        </view>
      </view>

      <!-- 底部确认按钮 -->
      <view v-if="!confirmed" class="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4">
        <view
          @click="handleConfirm"
          class="w-full py-3 rounded-full text-center text-sm font-medium"
          :class="hasScrolledToBottom ? 'bg-primary text-white' : 'bg-[#E8E0D5] text-muted-foreground'"
        >
          {{ confirming ? '确认中...' : hasScrolledToBottom ? ' 我已阅读并同意' : '请阅读完整内容' }}
        </view>
        <text v-if="!hasScrolledToBottom" class="text-xs text-center text-muted-foreground block mt-2">请滚动阅读完整内容后确认</text>
      </view>

      <!-- 已确认状态 -->
      <view v-if="confirmed" class="fixed bottom-0 left-0 right-0 bg-green-50 border-t border-green-200 p-4">
        <view class="flex items-center justify-center gap-2">
          <text class="text-green-600 text-sm font-medium"> 您已确认阅读并同意本协议</text>
        </view>
      </view>

      <!-- 目录抽屉 -->
      <view v-if="showToc" class="fixed inset-0 z-50">
        <view class="absolute inset-0 bg-black/50" @click="showToc = false" />
        <view class="absolute right-0 top-0 bottom-0 w-72 bg-white shadow-xl">
          <view class="flex items-center justify-between p-4 border-b border-border">
            <text class="font-semibold">目录</text>
            <view @click="showToc = false" class="p-1"><text>✕</text></view>
          </view>
          <scroll-view scroll-y class="overflow-y-auto" style="height:calc(100% - 60px)">
            <view class="p-2">
              <view v-for="(item, idx) in toc" :key="idx" @click="scrollToSection(item.id)"
                class="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
                :class="[activeSection === item.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-background', item.level === 2 ? 'font-medium' : 'pl-6']">
                <text class="text-xs">›</text>
                <text class="line-clamp-2">{{ item.title }}</text>
              </view>
              <view v-if="toc.length === 0" class="p-4 text-center text-muted-foreground text-sm">暂无目录</view>
            </view>
          </scroll-view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

interface LegalDocTocItem { id: string; title: string; level: number }
interface LegalDocument {
  title: string
  version: string
  effectiveDate: string
  summary: string
  content: string
  confirmedAt?: string
}

const loading = ref(true)
const document = ref<LegalDocument | null>(null)
const confirmed = ref(false)
const confirming = ref(false)
const showToc = ref(false)
const activeSection = ref('')
const hasScrolledToBottom = ref(false)

const sections = [
  { title: '一、服务条款', content: '欢迎使用热卜国学平台（以下简称"本平台"）。在使用本平台提供的各项服务之前，请您务必仔细阅读并充分理解本协议各条款。' },
  { title: '二、账号注册与安全', content: '1. 用户注册时应提供真实、准确、完整的个人资料。\n2. 用户应妥善保管账号密码，因用户个人原因导致的账号安全问题由用户自行负责。\n3. 用户不得将账号借给他人使用，否则由此产生的责任由用户承担。' },
  { title: '三、用户行为规范', content: '用户在使用本平台服务时，应遵守中华人民共和国相关法律法规，不得利用本平台从事以下行为：\n1. 发布、传播违法违规内容；\n2. 侵犯他人知识产权或其他合法权益；\n3. 干扰、破坏本平台的正常运行；\n4. 其他违反法律法规或本协议的行为。' },
  { title: '四、知识产权', content: '本平台所有内容，包括但不限于文字、图片、音频、视频、软件等，其知识产权归本平台或相关权利人所有。未经许可，用户不得擅自使用。' },
  { title: '五、免责声明', content: '1. 本平台提供的国学内容仅供学习参考，不构成任何投资、医疗等专业建议；\n2. 因不可抗力或非本平台原因导致的服务中断，本平台不承担责任；\n3. 用户因违反本协议导致的任何损失，由用户自行承担。' },
  { title: '六、协议修改', content: '本平台有权根据需要修改本协议，修改后的协议将在本平台公布。如用户不同意修改后的协议，应停止使用本平台服务。' },
  { title: '七、联系我们', content: '如您对本协议有任何疑问，请通过以下方式联系我们：\n客服邮箱：support@rebu.com\n客服电话：400-xxx-xxxx' },
]

const toc: LegalDocTocItem[] = sections.map((s, i) => ({
  id: `section-${i}`,
  title: s.title,
  level: 2,
}))

// ===== 数据加载 =====
onMounted(() => {
  loadDocument()
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})

function loadDocument() {
  loading.value = true
  setTimeout(() => {
    document.value = {
      title: '用户服务协议',
      version: '2.1',
      effectiveDate: '2024-01-01',
      summary: '欢迎使用热卜国学平台。本协议是您与本平台之间关于使用服务的各项条款和条件。',
      content: '',
    }
    loading.value = false
  }, 500)
}

function handleScroll() {
  if (hasScrolledToBottom.value) return
  const { scrollTop, scrollHeight, clientHeight } = document.documentElement
  if (scrollTop + clientHeight >= scrollHeight - 100) {
    hasScrolledToBottom.value = true
  }
  // 检测当前章节
  toc.forEach(item => {
    const el = document.getElementById(item.id)
    if (el) {
      const rect = el.getBoundingClientRect()
      if (rect.top <= 100 && rect.bottom > 100) {
        activeSection.value = item.id
      }
    }
  })
}

function scrollToSection(id: string) {
  const el = document.getElementById(id)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    showToc.value = false
  }
}

async function handleConfirm() {
  confirming.value = true
  await new Promise(resolve => setTimeout(resolve, 500))
  confirmed.value = true
  confirming.value = false
}

function goBack() { uni.navigateBack() }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
.skeleton-bg {
  background: linear-gradient(90deg, #f0ece6 25%, #e8e0d5 50%, #f0ece6 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
