<template>
  <view class="min-h-screen bg-background">
    <!-- 加载骨架屏 -->
    <view v-if="loading" class="min-h-screen flex items-center justify-center">
      <view class="text-center">
        <view class="w-16 h-16 rounded-full bg-muted animate-pulse mx-auto mb-4" />
        <text class="text-sm text-muted-foreground">加载中...</text>
      </view>
    </view>

    <!-- 主内容 -->
    <view v-else class="min-h-screen bg-background pb-32">
      <!-- 顶部导航 -->
      <view class="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border" style="padding-top: var(--status-bar-height);">
        <view class="flex items-center justify-between px-4 h-14">
          <view @click="goBack" class="p-2 -ml-2 rounded-full">
            <text class="text-foreground text-lg">←</text>
          </view>
          <text class="font-semibold text-base text-foreground">AI封面生成</text>
          <view @click="showHistory = true; loadHistory()" class="p-2 rounded-full">
            <text class="text-foreground"></text>
          </view>
        </view>
      </view>

      <scroll-view scroll-y class="p-4 space-y-6">
        <!-- 封面标题输入 -->
        <view>
          <text class="text-sm font-medium text-foreground mb-2 block">内容标题</text>
          <input
            v-model="title"
            placeholder="输入文章或内容的标题"
            class="w-full px-3 py-2.5 bg-secondary rounded-xl text-sm text-foreground placeholder:text-muted-foreground"
          />
        </view>

        <!-- 风格选择 -->
        <view>
          <text class="text-sm font-medium text-foreground mb-3 block">封面风格</text>
          <view class="grid grid-cols-3 gap-2">
            <view
              v-for="styleItem in styleOptions"
              :key="styleItem.value"
              @click="selectedStyle = styleItem.value"
              :class="['relative p-3 rounded-xl border-2 transition-all text-center', selectedStyle === styleItem.value ? 'border-primary bg-red-50' : 'border-border bg-white']"
            >
              <view class="w-full h-12 rounded-lg bg-secondary mb-2 flex items-center justify-center">
                <text class="text-2xl text-muted-foreground">️</text>
              </view>
              <text :class="['text-xs font-medium', selectedStyle === styleItem.value ? 'text-primary' : 'text-foreground']">{{ styleItem.label }}</text>
              <view v-if="selectedStyle === styleItem.value" class="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                <text class="text-white text-xs">✓</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 尺寸选择 -->
        <view>
          <text class="text-sm font-medium text-foreground mb-3 block">封面尺寸</text>
          <view class="flex gap-3">
            <view
              v-for="sizeItem in sizeOptions"
              :key="sizeItem.value"
              @click="selectedSize = sizeItem.value"
              :class="['flex-1 p-3 rounded-xl text-center transition-colors border', selectedSize === sizeItem.value ? 'bg-primary/5 border-primary text-primary' : 'bg-secondary border-border text-foreground']"
            >
              <text class="text-sm font-medium block">{{ sizeItem.label }}</text>
              <text class="text-xs text-muted-foreground block mt-0.5">{{ sizeItem.ratio }}</text>
            </view>
          </view>
        </view>

        <!-- Prompt 输入 -->
        <view>
          <view class="flex items-center justify-between mb-2">
            <text class="text-sm font-medium text-foreground">描述说明（可选）</text>
            <view @click="handleSmartPrompt" class="px-3 py-1 rounded-full bg-secondary text-xs text-foreground">
              <text> 智能生成</text>
            </view>
          </view>
          <textarea
            v-model="prompt"
            placeholder="用文字描述您想要的封面效果..."
            class="w-full h-24 px-3 py-2.5 bg-secondary rounded-xl text-sm text-foreground placeholder:text-muted-foreground resize-none"
          />
        </view>

        <!-- 生成数量 -->
        <view>
          <text class="text-sm font-medium text-foreground mb-2 block">生成数量</text>
          <view class="flex gap-2">
            <view
              v-for="n in [2, 4, 6]"
              :key="n"
              @click="generateCount = n"
              :class="['w-16 py-2 rounded-xl text-center text-sm transition-colors border', generateCount === n ? 'bg-primary text-white border-primary' : 'bg-secondary text-foreground border-border']"
            >
              <text>{{ n }}张</text>
            </view>
          </view>
        </view>

        <!-- 生成按钮 -->
        <view
          @click="handleGenerate"
          :class="['w-full py-3.5 rounded-xl font-medium text-base text-center transition-all', title.trim() && !generating ? 'bg-primary text-white' : 'bg-muted text-muted-foreground']"
        >
          <text>{{ generating ? '生成中...' : '生成封面' }}</text>
        </view>

        <!-- 生成结果 -->
        <view v-if="results.length > 0" class="space-y-4">
          <view class="flex items-center justify-between">
            <text class="text-base font-semibold text-foreground">生成结果</text>
            <view @click="handleGenerate" class="flex items-center gap-1 text-sm text-primary">
              <text></text>
              <text>重新生成</text>
            </view>
          </view>
          <view class="grid grid-cols-2 gap-3">
            <view
              v-for="result in results"
              :key="result.id"
              @click="selectedResultId = result.id"
              :class="['rounded-xl overflow-hidden border-2 transition-all', selectedResultId === result.id ? 'border-primary' : 'border-border']"
            >
              <view class="aspect-[16/9] bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                <text class="text-muted-foreground text-center px-2 text-xs">{{ styleOptions.find(s => s.value === selectedStyle)?.label }}风格</text>
              </view>
              <view class="p-2 bg-white">
                <text class="text-xs text-foreground line-clamp-1 block">{{ title }}</text>
              </view>
              <view v-if="selectedResultId === result.id" class="absolute -top-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                <text class="text-white text-xs">✓</text>
              </view>
            </view>
          </view>

          <!-- 选中封面详情 -->
          <view v-if="selectedResult" class="bg-white rounded-xl p-4 space-y-4 border border-border">
            <view class="aspect-video rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
              <text class="text-muted-foreground">{{ styleOptions.find(s => s.value === selectedStyle)?.label }}风格封面</text>
            </view>
            <view class="flex items-center gap-2 text-xs text-muted-foreground">
              <view class="px-2 py-0.5 bg-secondary rounded">{{ styleOptions.find(s => s.value === selectedStyle)?.label }}</view>
              <view class="px-2 py-0.5 bg-secondary rounded">{{ selectedSize }}</view>
            </view>
            <!-- 操作按钮 -->
            <view class="flex gap-3">
              <view @click="handleSave" :class="['flex-1 py-3 rounded-xl text-sm font-medium text-center border border-border', selectedResultId && !saving ? 'text-foreground' : 'text-muted-foreground']">
                <text>{{ saving ? '保存中...' : '保存' }}</text>
              </view>
              <view @click="handleDownload" :class="['flex-1 py-3 rounded-xl text-sm font-medium text-center border border-border', selectedResultId ? 'text-foreground' : 'text-muted-foreground']">
                <text>下载</text>
              </view>
            </view>
            <view @click="handleApply" :class="['w-full py-3 rounded-xl text-sm font-semibold text-center', selectedResultId ? 'bg-primary text-white' : 'bg-muted text-muted-foreground']">
              <text>应用封面</text>
            </view>
          </view>
        </view>
      </scroll-view>

      <!-- 历史记录弹窗 -->
      <view v-if="showHistory" class="fixed inset-0 z-50 flex items-end">
        <view @click="showHistory = false" class="absolute inset-0 bg-black/40" />
        <view class="relative w-full max-h-[70vh] bg-white rounded-t-2xl overflow-hidden">
          <view class="p-4 border-b border-border flex items-center justify-between">
            <text class="font-medium text-foreground">生成历史</text>
            <view @click="showHistory = false" class="p-1">
              <text>✕</text>
            </view>
          </view>
          <scroll-view scroll-y class="p-4 max-h-[60vh]">
            <view v-if="historyLoading" class="flex items-center justify-center py-8">
              <text class="text-sm text-muted-foreground">加载中...</text>
            </view>
            <view v-else-if="history.length > 0">
              <view v-for="item in history" :key="item.id" class="flex items-center gap-3 p-3 rounded-xl border border-border mb-2">
                <view class="w-16 h-12 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center flex-shrink-0">
                  <text class="text-xs text-muted-foreground">️</text>
                </view>
                <view class="flex-1 min-w-0">
                  <text class="text-sm text-foreground line-clamp-1 block">{{ item.title }}</text>
                  <text class="text-xs text-muted-foreground block">{{ item.createTime }}</text>
                </view>
              </view>
            </view>
            <view v-else class="flex flex-col items-center justify-center py-8">
              <text class="text-sm text-muted-foreground">暂无历史记录</text>
            </view>
          </scroll-view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

// 导航辅助
function goBack() { uni.navigateBack() }
function goTo(url: string) { uni.navigateTo({ url }) }

// 类型定义
type CoverStyle = 'traditional' | 'modern' | 'minimalist' | 'artistic' | 'calligraphy'
type CoverSize = '16:9' | '4:3' | '1:1' | '3:4'

interface CoverStyleOption {
  value: CoverStyle
  label: string
  desc: string
}

interface CoverGenerateResult {
  id: string
  url: string
  style: CoverStyle
  size: CoverSize
}

interface CoverHistoryItem {
  id: string
  title: string
  createTime: string
  imageUrl: string
}

// 风格选项
const styleOptions: CoverStyleOption[] = [
  { value: 'traditional', label: '传统国风', desc: '水墨、国画风格' },
  { value: 'modern', label: '现代简约', desc: '简洁大气风格' },
  { value: 'minimalist', label: '极简留白', desc: '大量留白设计' },
  { value: 'artistic', label: '艺术插画', desc: '手绘插画风格' },
  { value: 'calligraphy', label: '书法字体', desc: '书法大字风格' },
]

// 尺寸选项
const sizeOptions: { value: CoverSize; label: string; ratio: string }[] = [
  { value: '16:9', label: '横版', ratio: '16:9' },
  { value: '4:3', label: '标准', ratio: '4:3' },
  { value: '1:1', label: '方形', ratio: '1:1' },
  { value: '3:4', label: '竖版', ratio: '3:4' },
]

// 组件状态
const title = ref('')
const prompt = ref('')
const selectedStyle = ref<CoverStyle>('traditional')
const selectedSize = ref<CoverSize>('16:9')
const generateCount = ref(4)

const loading = ref(true)
const generating = ref(false)
const results = ref<CoverGenerateResult[]>([])
const selectedResultId = ref<string | null>(null)
const saving = ref(false)

const showHistory = ref(false)
const history = ref<CoverHistoryItem[]>([])
const historyLoading = ref(false)

const selectedResult = computed(() => results.value.find(r => r.id === selectedResultId.value))

// 初始化
onMounted(() => {
  setTimeout(() => {
    loading.value = false
  }, 300)
})

// 智能生成Prompt
const handleSmartPrompt = () => {
  if (!title.value.trim()) return
  // 模拟智能生成
  prompt.value = `封面主题：${title.value}，风格：${styleOptions.find(s => s.value === selectedStyle.value)?.label}，请生成一张精美的封面图片。`
}

// 生成封面
const handleGenerate = async () => {
  if (!title.value.trim()) return

  generating.value = true
  results.value = []
  selectedResultId.value = null

  // 模拟生成
  await new Promise(resolve => setTimeout(resolve, 2000))

  const mockResults: CoverGenerateResult[] = []
  for (let i = 0; i < generateCount.value; i++) {
    mockResults.push({
      id: `result_${Date.now()}_${i}`,
      url: '',
      style: selectedStyle.value,
      size: selectedSize.value,
    })
  }
  results.value = mockResults
  if (mockResults.length > 0) {
    selectedResultId.value = mockResults[0].id
  }
  generating.value = false
}

// 保存到素材库
const handleSave = async () => {
  if (!selectedResultId.value) return
  saving.value = true
  await new Promise(resolve => setTimeout(resolve, 500))
  saving.value = false
  uni.showToast({ title: '已保存到素材库', icon: 'success' })
}

// 下载封面
const handleDownload = () => {
  if (!selectedResultId.value) return
  uni.showToast({ title: '已开始下载', icon: 'none' })
}

// 应用封面
const handleApply = () => {
  const selected = results.value.find(r => r.id === selectedResultId.value)
  if (selected) {
    uni.showToast({ title: '封面已应用', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 800)
  }
}

// 加载历史记录
const loadHistory = async () => {
  historyLoading.value = true
  await new Promise(resolve => setTimeout(resolve, 500))
  history.value = [
    { id: '1', title: '文章封面示例1', createTime: '2024-03-15', imageUrl: '' },
    { id: '2', title: '文章封面示例2', createTime: '2024-03-14', imageUrl: '' },
  ]
  historyLoading.value = false
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
