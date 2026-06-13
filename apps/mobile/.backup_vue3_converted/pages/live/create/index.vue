<template>
  <view class="min-h-screen bg-background pb-24">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-10 bg-white border-b border-border px-4 py-3 flex items-center justify-between">
      <view @click="goBack" class="p-1 -ml-1">
        <text class="text-foreground text-xl">←</text>
      </view>
      <text class="text-lg font-semibold text-foreground">{{ editId ? '编辑直播' : '创建直播' }}</text>
      <view @click="handleSubmit(true)" class="text-sm text-ink-soft">
        <text>存草稿</text>
      </view>
    </view>

    <view class="p-4 space-y-4">
      <!-- 直播模式选择 -->
      <view class="bg-white rounded-2xl p-4">
        <text class="text-sm font-medium text-foreground mb-3 block">
          直播模式 <text class="text-primary">*</text>
        </text>
        <view class="grid grid-cols-2 gap-3">
          <view
            @click="liveMode = 'vertical'"
            :class="[
              'relative p-4 rounded-xl border-2 transition-all',
              liveMode === 'vertical'
                ? 'border-primary bg-red-50'
                : 'border-border bg-background'
            ]"
          >
            <view class="absolute top-2 right-2 bg-primary text-white text-[10px] px-1.5 py-0.5 rounded">
              <text>推荐</text>
            </view>
            <view :class="['w-10 h-10 rounded-lg flex items-center justify-center mb-2', liveMode === 'vertical' ? 'bg-primary text-white' : 'bg-[#E8E0D5] text-ink-soft']">
              <text class="text-lg"></text>
            </view>
            <text :class="['font-medium text-sm block', liveMode === 'vertical' ? 'text-primary' : 'text-foreground']">手机竖屏</text>
            <text class="text-[10px] text-muted-foreground mt-1 block">适合带货、聊天互动</text>
          </view>

          <view
            @click="liveMode = 'horizontal'"
            :class="[
              'p-4 rounded-xl border-2 transition-all',
              liveMode === 'horizontal'
                ? 'border-primary bg-red-50'
                : 'border-border bg-background'
            ]"
          >
            <view :class="['w-10 h-10 rounded-lg flex items-center justify-center mb-2', liveMode === 'horizontal' ? 'bg-primary text-white' : 'bg-[#E8E0D5] text-ink-soft']">
              <text class="text-lg">🖥</text>
            </view>
            <text :class="['font-medium text-sm block', liveMode === 'horizontal' ? 'text-primary' : 'text-foreground']">OBS横屏</text>
            <text class="text-[10px] text-muted-foreground mt-1 block">适合课程、课件讲解</text>
          </view>
        </view>

        <!-- OBS提示 -->
        <view v-if="liveMode === 'horizontal'" class="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <view class="flex items-start gap-2">
            <text class="text-amber-600 text-sm mt-0.5 flex-shrink-0">⚙️</text>
            <view>
              <text class="text-xs text-amber-800 font-medium block">OBS推流设置</text>
              <text class="text-[10px] text-amber-700 mt-1 block">横屏直播需要使用OBS等推流软件，开播后将显示推流地址。</text>
              <view @click="goTo('/pages/live/obs-guide/index')" class="text-[10px] text-amber-800 underline mt-1 inline-block">
                <text>查看OBS配置教程</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 封面上传 -->
      <view class="bg-white rounded-2xl p-4">
        <text class="text-sm font-medium text-foreground mb-3 block">
          直播封面 <text class="text-primary">*</text>
        </text>
        <view
          @click="handleCoverUpload"
          :class="[
            'relative aspect-video rounded-xl overflow-hidden border-2 border-dashed',
            errors.cover ? 'border-primary bg-red-50' : 'border-border bg-background'
          ]"
        >
          <view v-if="form.cover" class="absolute inset-0">
            <image :src="form.cover" mode="aspectFill" class="w-full h-full" />
            <view class="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0">
              <text class="text-white text-2xl"></text>
            </view>
          </view>
          <view v-else class="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <text class="text-muted-foreground text-2xl"></text>
            <text class="text-sm text-muted-foreground">点击上传封面</text>
            <text class="text-xs text-muted-foreground">建议尺寸 16:9，支持 JPG/PNG</text>
          </view>
        </view>
        <text v-if="errors.cover" class="text-xs text-primary mt-2 block">{{ errors.cover }}</text>
      </view>

      <!-- 基本信息 -->
      <view class="bg-white rounded-2xl p-4 space-y-4">
        <!-- 标题 -->
        <view>
          <text class="text-sm font-medium text-foreground mb-2 block">
            直播标题 <text class="text-primary">*</text>
          </text>
          <input
            v-model="form.title"
            placeholder="请输入直播标题，最多30字"
            maxlength="30"
            :class="[
              'w-full px-4 py-3 rounded-xl border bg-background text-foreground placeholder:text-muted-foreground outline-none',
              errors.title ? 'border-primary' : 'border-border'
            ]"
          />
          <view class="flex justify-between mt-1">
            <text v-if="errors.title" class="text-xs text-primary">{{ errors.title }}</text>
            <text v-else class="text-xs" />
            <text class="text-xs text-muted-foreground">{{ form.title.length }}/30</text>
          </view>
        </view>

        <!-- 开播时间 -->
        <view>
          <text class="text-sm font-medium text-foreground mb-2 block">
            开播时间 <text class="text-primary">*</text>
          </text>
          <view
            @click="showDatePicker = true"
            :class="['w-full px-4 py-3 rounded-xl border bg-background flex items-center justify-between', errors.startTime ? 'border-primary' : 'border-border']"
          >
            <view class="flex items-center gap-2">
              <text class="text-muted-foreground"></text>
              <text :class="form.startTime ? 'text-foreground' : 'text-muted-foreground'">
                {{ form.startTime ? formatDateTime(form.startTime) : '请选择开播时间' }}
              </text>
            </view>
            <text class="text-muted-foreground">›</text>
          </view>
          <text v-if="errors.startTime" class="text-xs text-primary mt-1 block">{{ errors.startTime }}</text>
        </view>

        <!-- 直播类型 -->
        <view>
          <text class="text-sm font-medium text-foreground mb-2 block">直播类型</text>
          <view class="grid grid-cols-2 gap-3">
            <view
              v-for="item in liveTypeOptions"
              :key="item.value"
              @click="form.type = item.value"
              :class="[
                'p-4 rounded-xl border-2 transition-all',
                form.type === item.value
                  ? 'border-primary bg-red-50'
                  : 'border-border bg-background'
              ]"
            >
              <text :class="['text-sm font-medium block', form.type === item.value ? 'text-primary' : 'text-foreground']">{{ item.label }}</text>
              <text class="text-xs text-muted-foreground mt-1 block">{{ item.desc }}</text>
            </view>
          </view>
        </view>

        <!-- 分类 -->
        <view>
          <text class="text-sm font-medium text-foreground mb-2 block">
            直播分类 <text class="text-primary">*</text>
          </text>
          <view
            @click="showCategoryPicker = true"
            :class="['w-full px-4 py-3 rounded-xl border bg-background flex items-center justify-between', errors.categoryId ? 'border-primary' : 'border-border']"
          >
            <text :class="selectedCategory ? 'text-foreground' : 'text-muted-foreground'">
              {{ selectedCategory?.name || '请选择分类' }}
            </text>
            <text class="text-muted-foreground">›</text>
          </view>
          <text v-if="errors.categoryId" class="text-xs text-primary mt-1 block">{{ errors.categoryId }}</text>
        </view>
      </view>

      <!-- 更多设置 -->
      <view class="bg-white rounded-2xl p-4 space-y-4">
        <!-- 描述 -->
        <view>
          <text class="text-sm font-medium text-foreground mb-2 block">直播简介</text>
          <textarea
            v-model="form.description"
            placeholder="介绍一下本场直播的内容..."
            maxlength="200"
            class="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground outline-none resize-none"
            style="min-height: 80px"
          />
          <view class="text-right">
            <text class="text-xs text-muted-foreground">{{ form.description.length }}/200</text>
          </view>
        </view>

        <!-- 标签 -->
        <view>
          <text class="text-sm font-medium text-foreground mb-2 block">
            直播标签 <text class="text-xs text-muted-foreground font-normal">（最多5个）</text>
          </text>
          <view class="flex flex-wrap gap-2 mb-2">
            <view v-for="(tag, idx) in form.tags" :key="idx" class="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 text-primary rounded-full text-sm">
              <text>{{ tag }}</text>
              <text @click="removeTag(idx)" class="text-primary">✕</text>
            </view>
          </view>
          <view v-if="form.tags.length < 5" class="flex gap-2">
            <input
              v-model="tagInput"
              @confirm="addTag"
              placeholder="输入标签后回车添加"
              maxlength="10"
              class="flex-1 px-4 py-2 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
            <view @click="addTag" class="px-4 py-2 bg-primary text-white rounded-xl text-sm">
              <text>添加</text>
            </view>
          </view>
        </view>

        <!-- 公开设置 -->
        <view class="flex items-center justify-between py-2">
          <view>
            <text class="text-sm font-medium text-foreground block">公开直播</text>
            <text class="text-xs text-muted-foreground mt-0.5 block">关闭后仅粉丝可见</text>
          </view>
          <view
            @click="form.isPublic = !form.isPublic"
            :class="['w-12 h-7 rounded-full transition-colors relative', form.isPublic ? 'bg-primary' : 'bg-gray-300']"
          >
            <view :class="['w-5 h-5 bg-white rounded-full shadow transition-transform absolute top-1', form.isPublic ? 'left-6' : 'left-1']" />
          </view>
        </view>
      </view>

      <!-- 提示 -->
      <view class="flex items-start gap-2 px-2">
        <text class="text-accent text-sm mt-0.5 flex-shrink-0">ℹ️</text>
        <text class="text-xs text-muted-foreground">直播开始前15分钟将推送通知给已预约的用户，请确保按时开播</text>
      </view>
    </view>

    <!-- 底部按钮 -->
    <view class="fixed bottom-0 left-0 right-0 bg-white border-t border-border p-4">
      <view
        @click="handleSubmit(false)"
        :class="['w-full py-3.5 bg-gradient-to-r from-primary to-[#E85D75] text-white rounded-xl font-medium text-center', loading ? 'opacity-50' : '']"
      >
        <text>{{ loading ? '提交中...' : editId ? '保存修改' : '创建直播' }}</text>
      </view>
    </view>

    <!-- 分类选择器弹窗 -->
    <view v-if="showCategoryPicker" class="fixed inset-0 z-50 flex items-end">
      <view class="absolute inset-0 bg-black/50" @click="showCategoryPicker = false" />
      <view class="relative w-full bg-white rounded-t-3xl max-h-[60vh] overflow-hidden">
        <view class="flex items-center justify-between p-4 border-b border-border">
          <view @click="showCategoryPicker = false" class="text-ink-soft"><text>取消</text></view>
          <text class="font-medium text-foreground">选择分类</text>
          <view class="w-8" />
        </view>
        <view class="p-4 grid grid-cols-3 gap-3 overflow-y-auto max-h-[50vh]">
          <view
            v-for="cat in mockCategories"
            :key="cat.id"
            @click="selectCategory(cat.id)"
            :class="[
              'p-3 rounded-xl border-2 text-center transition-all',
              form.categoryId === cat.id
                ? 'border-primary bg-red-50 text-primary'
                : 'border-border bg-background text-foreground'
            ]"
          >
            <text>{{ cat.name }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 日期时间选择器弹窗 -->
    <view v-if="showDatePicker" class="fixed inset-0 z-50 flex items-end">
      <view class="absolute inset-0 bg-black/50" @click="showDatePicker = false" />
      <view class="relative w-full bg-white rounded-t-3xl">
        <view class="flex items-center justify-between p-4 border-b border-border">
          <view @click="showDatePicker = false" class="text-ink-soft"><text>取消</text></view>
          <text class="font-medium text-foreground">选择时间</text>
          <view @click="confirmDateTime" class="text-primary font-medium"><text>确定</text></view>
        </view>
        <view class="flex h-64">
          <scroll-view scroll-y class="flex-1 border-r border-border">
            <view
              v-for="opt in dateOptions"
              :key="opt.date"
              @click="selectedDate = opt.date"
              :class="['w-full px-4 py-3 flex items-center justify-between', selectedDate === opt.date ? 'bg-red-50 text-primary' : 'text-foreground']"
            >
              <text>{{ opt.display }}</text>
              <text v-if="selectedDate === opt.date" class="text-primary">✓</text>
            </view>
          </scroll-view>
          <scroll-view scroll-y class="flex-1">
            <view
              v-for="t in timeOptions"
              :key="t"
              @click="selectedTime = t"
              :class="['w-full px-4 py-3 flex items-center justify-between', selectedTime === t ? 'bg-red-50 text-primary' : 'text-foreground']"
            >
              <text>{{ t }}</text>
              <text v-if="selectedTime === t" class="text-primary">✓</text>
            </view>
          </scroll-view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

// ============================================================
// Types
// ============================================================
interface LiveCategory {
  id: string
  name: string
}

interface CreateLiveRoomData {
  title: string
  cover: string
  startTime: string
  type: 'knowledge' | 'commerce'
  categoryId: string
  description: string
  tags: string[]
  isPublic: boolean
}

// ============================================================
// Mock data
// ============================================================
const mockCategories: LiveCategory[] = [
  { id: '1', name: '易经国学' },
  { id: '2', name: '风水堪舆' },
  { id: '3', name: '命理八字' },
  { id: '4', name: '紫微斗数' },
  { id: '5', name: '面相手相' },
  { id: '6', name: '六爻占卜' },
  { id: '7', name: '奇门遁甲' },
  { id: '8', name: '其他' },
]

const liveTypeOptions = [
  { value: 'knowledge', label: '知识授课', desc: '适合课程讲解' },
  { value: 'commerce', label: '电商带货', desc: '适合商品销售' },
]

// ============================================================
// State
// ============================================================
const editId = ref('')
const loading = ref(false)
const showCategoryPicker = ref(false)
const showDatePicker = ref(false)
const liveMode = ref<'vertical' | 'horizontal'>('vertical')
const tagInput = ref('')
const selectedDate = ref('')
const selectedTime = ref('')

const errors = ref<Record<string, string>>({})

const form = ref<CreateLiveRoomData>({
  title: '',
  cover: '',
  startTime: '',
  type: 'knowledge',
  categoryId: '',
  description: '',
  tags: [],
  isPublic: true,
})

// ============================================================
// Computed
// ============================================================
const selectedCategory = computed(() => mockCategories.find(c => c.id === form.value.categoryId))

const dateOptions = computed(() => {
  const options: { date: string; display: string }[] = []
  const now = new Date()
  for (let i = 0; i < 30; i++) {
    const date = new Date(now)
    date.setDate(date.getDate() + i)
    const dateStr = date.toISOString().split('T')[0]
    const weekDay = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()]
    options.push({
      date: dateStr,
      display: i === 0 ? '今天' : i === 1 ? '明天' : `${date.getMonth() + 1}月${date.getDate()}日 ${weekDay}`,
    })
  }
  return options
})

const timeOptions = computed(() => {
  const times: string[] = []
  for (let h = 0; h < 24; h++) {
    times.push(`${h.toString().padStart(2, '0')}:00`)
    times.push(`${h.toString().padStart(2, '0')}:30`)
  }
  return times
})

// ============================================================
// Lifecycle
// ============================================================
onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  if (currentPage?.options?.id) {
    editId.value = currentPage.options.id
    // 编辑模式：加载现有数据（mock）
    form.value = {
      title: '周易六十四卦精讲直播',
      cover: '/placeholder.svg',
      startTime: '2024-12-20T20:00',
      type: 'knowledge',
      categoryId: '1',
      description: '深入讲解周易六十四卦的卦象、爻辞和应用方法',
      tags: ['周易', '六十四卦', '国学'],
      isPublic: true,
    }
  }
})

// ============================================================
// Methods
// ============================================================
function selectCategory(id: string) {
  form.value.categoryId = id
  showCategoryPicker.value = false
  errors.value = { ...errors.value, categoryId: '' }
}

function confirmDateTime() {
  if (selectedDate.value && selectedTime.value) {
    form.value.startTime = `${selectedDate.value}T${selectedTime.value}`
    showDatePicker.value = false
    errors.value = { ...errors.value, startTime: '' }
  }
}

function formatDateTime(dateTime: string): string {
  if (!dateTime) return ''
  const date = new Date(dateTime)
  return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

function handleCoverUpload() {
  // Mock上传
  form.value.cover = '/placeholder.svg'
  errors.value = { ...errors.value, cover: '' }
}

function addTag() {
  const t = tagInput.value.trim()
  if (t && !form.value.tags.includes(t) && form.value.tags.length < 5) {
    form.value.tags.push(t)
    tagInput.value = ''
  }
}

function removeTag(index: number) {
  form.value.tags = form.value.tags.filter((_, i) => i !== index)
}

function validateForm(): boolean {
  const newErrors: Record<string, string> = {}
  if (!form.value.title.trim()) newErrors.title = '请输入直播标题'
  else if (form.value.title.length > 30) newErrors.title = '标题不能超过30个字'
  if (!form.value.cover) newErrors.cover = '请上传封面图'
  if (!form.value.startTime) newErrors.startTime = '请选择开播时间'
  if (!form.value.categoryId) newErrors.categoryId = '请选择直播分类'
  errors.value = newErrors
  return Object.keys(newErrors).length === 0
}

async function handleSubmit(isDraft = false) {
  if (!isDraft && !validateForm()) return
  loading.value = true
  try {
    // Mock API call
    await new Promise(resolve => setTimeout(resolve, 800))
    goBack()
  } finally {
    loading.value = false
  }
}

function goBack() {
  uni.navigateBack()
}

function goTo(url: string) {
  uni.navigateTo({ url })
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
