<template>
  <view class="min-h-screen bg-background">
    <!-- 已提交成功态 -->
    <view v-if="submitted" class="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center gap-4">
      <view class="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center mb-2">
        <text class="text-green-500 text-3xl"></text>
      </view>
      <text class="text-xl font-bold text-foreground">感谢您的评价！</text>
      <text class="text-sm text-muted-foreground">您的反馈帮助我们持续改进直播质量</text>
      <view @click="goBack" class="mt-4 w-full py-3 bg-primary text-white rounded-xl text-sm font-semibold text-center">
        <text>返回回放</text>
      </view>
    </view>

    <!-- 主页面 -->
    <view v-else>
      <!-- 顶部 -->
      <view class="sticky top-0 z-10 bg-white border-b border-border">
        <view class="flex items-center px-4 h-12">
          <view @click="goBack" class="p-1"><text class="text-xl text-foreground">←</text></view>
          <text class="text-base font-semibold ml-3 text-foreground">评价回放</text>
        </view>
      </view>

      <!-- 骨架屏加载态 -->
      <view v-if="loading" class="p-4 space-y-6">
        <view class="bg-white rounded-xl p-4 border border-border text-center">
          <view class="h-3 w-20 bg-[#E8E0D5] rounded mx-auto mb-2 animate-pulse" />
          <view class="h-5 w-40 bg-[#E8E0D5] rounded mx-auto mb-1 animate-pulse" />
          <view class="h-3 w-24 bg-[#E8E0D5] rounded mx-auto animate-pulse" />
        </view>
        <view class="text-center">
          <view class="h-4 w-20 bg-[#E8E0D5] rounded mx-auto mb-3 animate-pulse" />
          <view class="flex justify-center gap-3">
            <view v-for="i in 5" :key="i" class="w-10 h-10 bg-[#E8E0D5] rounded animate-pulse" />
          </view>
        </view>
        <view class="bg-white rounded-xl p-4 border border-border space-y-3">
          <view v-for="i in 4" :key="'a'+i" class="flex items-center justify-between">
            <view class="h-4 w-16 bg-[#E8E0D5] rounded animate-pulse" />
            <view class="flex gap-1.5">
              <view v-for="j in 5" :key="j" class="w-5 h-5 bg-[#E8E0D5] rounded animate-pulse" />
            </view>
          </view>
        </view>
      </view>

      <!-- 主内容 -->
      <view v-else class="p-4 space-y-6">
        <!-- 直播信息 -->
        <view class="bg-white rounded-xl p-4 border border-border text-center">
          <text class="text-xs text-muted-foreground block mb-1">您正在评价</text>
          <text class="text-base font-semibold text-foreground">八字命理精讲系列</text>
          <text class="text-xs text-muted-foreground block mt-0.5">直播回放 #{{ id }}</text>
        </view>

        <!-- 整体评分 -->
        <view class="text-center">
          <text class="text-sm font-medium text-foreground block mb-3">整体评分</text>
          <view class="flex justify-center gap-3 mb-2">
            <view v-for="s in 5" :key="s" @click="setRating(s)" class="transition-transform active:scale-90">
              <text :class="['text-3xl transition-colors', s <= displayRating ? 'text-accent' : 'text-muted-foreground']"></text>
            </view>
          </view>
          <text v-if="displayRating > 0" :class="['text-sm font-semibold', displayRating >= 4 ? 'text-green-600' : displayRating === 3 ? 'text-muted-foreground' : 'text-red-600']">
            {{ ratingLabels[displayRating] }}
          </text>
        </view>

        <!-- 维度评分 -->
        <view v-if="rating > 0" class="bg-white rounded-xl p-4 border border-border space-y-3">
          <text class="text-sm font-medium text-foreground">细项评分</text>
          <view v-for="a in ASPECTS" :key="a.key" class="flex items-center justify-between">
            <text class="text-sm text-muted-foreground">{{ a.label }}</text>
            <view class="flex gap-1.5">
              <view v-for="s in 5" :key="s" @click="setAspect(a.key, s)">
                <text :class="['text-lg transition-colors', s <= (aspectRatings[a.key] || 0) ? 'text-accent' : 'text-muted-foreground']"></text>
              </view>
            </view>
          </view>
        </view>

        <!-- 标签选择 -->
        <view v-if="rating > 0 && currentTags.length > 0">
          <text class="text-sm font-medium text-foreground block mb-2.5">选择标签（可多选）</text>
          <view class="flex flex-wrap gap-2">
            <view v-for="tag in currentTags" :key="tag" @click="toggleTag(tag)" :class="['px-3 py-1.5 rounded-full text-xs font-medium border', selectedTags.includes(tag) ? 'bg-primary text-white border-primary' : 'bg-white text-foreground border-border']">
              <text>{{ tag }}</text>
            </view>
          </view>
        </view>

        <!-- 文字评价 -->
        <view>
          <view class="flex items-center justify-between mb-1.5">
            <text class="text-sm font-medium text-foreground">文字评价（选填）</text>
            <text class="text-xs text-muted-foreground">{{ content.length }}/300</text>
          </view>
          <textarea
            v-model="content"
            placeholder="分享您对这次直播的感受和建议..."
            :maxlength="300"
            class="w-full min-h-[100px] px-3 py-2 text-sm bg-white border border-border rounded-lg resize-none"
          />
        </view>
      </view>

      <!-- 固定提交 -->
      <view class="fixed bottom-0 left-0 right-0 bg-white/95 border-t border-border pb-safe">
        <view class="p-4">
          <view @click="handleSubmit" :class="['w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2', rating === 0 ? 'bg-muted text-muted-foreground' : 'bg-primary text-white']">
            <text v-if="submitting"></text>
            <text>{{ submitting ? '提交中...' : '提交评价' }}</text>
          </view>
        </view>
      </view>
      <view class="h-20" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'

// 导航辅助
function goBack() { uni.navigateBack() }

// Route params
const id = ref('')

onLoad((options) => {
  if (options?.id) {
    id.value = options.id as string
  }
})

// 加载态
const loading = ref(true)

onMounted(() => {
  setTimeout(() => { loading.value = false }, 600)
})

// 维度评分项
const ASPECTS = [
  { key: 'content', label: '内容质量' },
  { key: 'interaction', label: '互动体验' },
  { key: 'audio', label: '音画质量' },
  { key: 'value', label: '价值感受' },
]

// 标签按评分分组
const TAGS_BY_RATING: Record<number, string[]> = {
  5: ['内容丰富', '讲解清晰', '互动活跃', '干货满满', '值得反复看', '强烈推荐'],
  4: ['内容不错', '讲解清楚', '收获较大', '整体满意'],
  3: ['一般般', '内容普通', '有待提高'],
  2: ['讲解不清', '内容较少', '互动较少'],
  1: ['内容差', '浪费时间', '不推荐'],
}

const ratingLabels = ['', '很差', '较差', '一般', '不错', '非常好']

// 状态
const rating = ref(0)
const aspectRatings = ref<Record<string, number>>({})
const selectedTags = ref<string[]>([])
const content = ref('')
const submitting = ref(false)
const submitted = ref(false)

const displayRating = computed(() => rating.value)
const currentTags = computed(() => TAGS_BY_RATING[rating.value] ?? [])

function setRating(s: number) {
  rating.value = s
  selectedTags.value = []
}

function setAspect(key: string, s: number) {
  aspectRatings.value = { ...aspectRatings.value, [key]: s }
}

function toggleTag(tag: string) {
  const idx = selectedTags.value.indexOf(tag)
  if (idx >= 0) {
    selectedTags.value.splice(idx, 1)
  } else {
    selectedTags.value.push(tag)
  }
}

async function handleSubmit() {
  if (rating.value === 0) return
  submitting.value = true
  await new Promise(r => setTimeout(r, 900))
  submitting.value = false
  submitted.value = true
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
