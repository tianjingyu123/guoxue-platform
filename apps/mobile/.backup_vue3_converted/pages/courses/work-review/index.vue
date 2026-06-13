<template>
  <view class="min-h-screen bg-background pb-20">
    <!-- ===== 骨架屏 ===== -->
    <view v-if="isLoading" class="min-h-screen bg-background">
      <view class="h-14 bg-white border-b border-border" />
      <view class="p-4 space-y-4">
        <view v-for="i in 3" :key="i" class="bg-white rounded-xl p-4 overflow-hidden">
          <view class="flex items-center gap-3 mb-3">
            <view class="w-10 h-10 rounded-full animate-pulse" style="background:rgba(232,224,213,0.5)" />
            <view class="flex-1">
              <view class="h-4 w-20 rounded mb-2 animate-pulse" style="background:rgba(232,224,213,0.5)" />
              <view class="h-3 w-32 rounded animate-pulse" style="background:rgba(232,224,213,0.5)" />
            </view>
          </view>
          <view class="h-16 rounded animate-pulse" style="background:rgba(232,224,213,0.5)" />
        </view>
      </view>
    </view>

    <template v-else>
      <!-- ===== 导航栏 ===== -->
      <view class="sticky top-0 z-40 bg-white border-b border-border">
        <view class="flex items-center justify-between px-4 h-14">
          <view class="flex items-center gap-3">
            <view @click="goBack" class="p-1 -ml-1 active:opacity-60">
              <text class="text-xl text-foreground leading-none">←</text>
            </view>
            <text class="font-medium text-foreground">作业批改</text>
          </view>
          <view @click="batchMode = !batchMode"
            :class="['px-3 py-1 rounded-full text-sm transition-all', batchMode ? 'bg-primary text-white' : 'bg-[#F2EFEA] text-ink-soft']">
            <text>{{ batchMode ? '取消批量' : '批量批改' }}</text>
          </view>
        </view>
      </view>

      <!-- ===== 统计和筛选 ===== -->
      <view class="px-4 py-3 bg-white border-b border-border">
        <view class="flex items-center justify-between mb-3">
          <view class="flex items-center gap-4">
            <view class="flex items-center gap-1">
              <text class="text-sm text-ink-soft"> 共 {{ submissions.length }} 份作业</text>
            </view>
            <view class="flex items-center gap-1">
              <text class="text-sm text-orange-500">🕐</text>
              <text class="text-sm text-orange-600">{{ pendingCount }} 份待批改</text>
            </view>
          </view>
        </view>
        <view class="flex gap-2">
          <view v-for="f in filterOptions" :key="f.id" @click="filter = f.id"
            :class="['px-3 py-1.5 rounded-full text-sm transition-all', filter === f.id ? 'bg-primary text-white' : 'bg-[#F2EFEA] text-ink-soft']">
            <text>{{ f.label }}</text>
          </view>
        </view>
      </view>

      <!-- ===== 内容区 ===== -->
      <view class="p-4">
        <!-- ===== 批改面板 ===== -->
        <view v-if="selectedWork" class="bg-white rounded-xl shadow-lg overflow-hidden">
          <!-- 学生信息与作业内容 -->
          <view class="p-4 border-b border-border">
            <view class="flex items-center justify-between mb-3">
              <view class="flex items-center gap-2">
                <view class="w-8 h-8 rounded-full flex items-center justify-center"
                  style="background:linear-gradient(135deg,rgba(196,30,58,0.2),rgba(201,169,110,0.2))">
                  <text class="text-xs font-medium text-primary">{{ selectedWork.student.name[0] }}</text>
                </view>
                <view>
                  <text class="text-sm font-medium text-foreground">{{ selectedWork.student.name }}</text>
                  <text class="text-xs text-muted-foreground ml-2">{{ selectedWork.submittedAt }}</text>
                </view>
              </view>
              <text @click="selectedWork = null" class="text-muted-foreground text-sm active:opacity-60">收起</text>
            </view>

            <!-- 作业内容 -->
            <view class="bg-background rounded-lg p-3 mb-3" @longpress="onLongPressContent">
              <text class="text-sm text-foreground whitespace-pre-wrap block select-text">{{ selectedWork.content }}</text>
            </view>

            <!-- 图片附件 -->
            <view v-if="selectedWork.images && selectedWork.images.length > 0" class="flex gap-2 flex-wrap">
              <view v-for="(img, idx) in selectedWork.images" :key="idx"
                @click="previewImage = img"
                class="w-16 h-16 rounded-lg overflow-hidden active:opacity-70" style="background:rgba(232,224,213,0.5)">
                <view class="w-full h-full flex items-center justify-center">
                  <image v-if="img && img.startsWith('http')" :src="img" mode="aspectFill" class="w-full h-full" />
                  <text v-else class="text-2xl text-muted-foreground"></text>
                </view>
              </view>
            </view>
          </view>

          <!-- 批改区域 -->
          <view class="p-4 space-y-4">
            <!-- 分数 -->
            <view>
              <label class="text-sm font-medium text-foreground mb-2 block">评分</label>
              <view class="flex items-center gap-4">
                <input type="number" v-model.number="reviewScore"
                  class="w-20 h-10 text-center text-xl font-bold text-primary border-2 rounded-lg outline-none box-border"
                  style="border-color:rgba(196,30,58,0.3)" />
                <view class="flex gap-2">
                  <view v-for="s in quickScores" :key="s" @click="reviewScore = s"
                    :class="['px-3 py-1 rounded-full text-sm transition-all', reviewScore === s ? 'bg-primary text-white' : 'bg-[#F2EFEA] text-ink-soft']">
                    <text>{{ s }}</text>
                  </view>
                </view>
              </view>
            </view>

            <!-- 快捷评语 -->
            <view>
              <label class="text-sm font-medium text-foreground mb-2 block">快捷评语</label>
              <view class="flex gap-2 flex-wrap">
                <view v-for="t in commentTemplates" :key="t.id" @click="reviewComment = t.text"
                  class="px-3 py-1 rounded-full text-xs bg-[#F2EFEA] text-ink-soft active:bg-primary/10 active:text-primary transition-all">
                  <text>{{ t.label }}</text>
                </view>
              </view>
            </view>

            <!-- 教师评语 -->
            <view>
              <label class="text-sm font-medium text-foreground mb-2 block">教师评语</label>
              <textarea v-model="reviewComment" placeholder="请输入评语..."
                class="w-full h-24 p-3 text-sm border border-border rounded-lg resize-none outline-none box-border"
                style="line-height:1.6" />
            </view>

            <!-- 修改建议 -->
            <view>
              <label class="text-sm font-medium text-foreground mb-2 block">
                修改建议
                <text class="text-xs text-muted-foreground font-normal">（选中作业文字可快速添加）</text>
              </label>
              <view class="space-y-2 mb-2">
                <view v-for="(s, idx) in suggestions" :key="idx"
                  class="flex items-start gap-2 p-2.5 bg-red-50 rounded-lg text-sm text-red-700">
                  <text class="flex-1 leading-relaxed">{{ s }}</text>
                  <text @click="removeSuggestion(idx)" class="text-red-400 shrink-0 active:text-red-600">
                    ✕
                  </text>
                </view>
              </view>
              <view class="flex gap-2">
                <input v-model="newSuggestion" placeholder="输入修改建议..."
                  class="flex-1 h-9 px-3 text-sm border border-border rounded-lg outline-none box-border"
                  @confirm="addSuggestion" />
                <view @click="addSuggestion"
                  class="px-3 h-9 bg-[#F2EFEA] text-ink-soft rounded-lg text-sm flex items-center active:bg-[#E8E0D5]">
                  <text>添加</text>
                </view>
              </view>
            </view>

            <!-- 操作按钮 -->
            <view class="flex gap-3 pt-2">
              <view @click="handleReview('returned')"
                class="flex-1 h-11 border-2 border-primary text-primary rounded-xl font-medium flex items-center justify-center gap-2 active:bg-primary/5 transition-all">
                <text></text>
                <text>退回修改</text>
              </view>
              <view @click="handleReview('graded')"
                class="flex-1 h-11 rounded-xl font-medium flex items-center justify-center gap-2 text-white active:opacity-90 transition-all"
                style="background:linear-gradient(135deg,#C41E3A,#E74C3C)">
                <text></text>
                <text>提交批改</text>
              </view>
            </view>
          </view>
        </view>

        <!-- ===== 作业列表 ===== -->
        <view v-else class="space-y-3">
          <!-- 空状态 -->
          <view v-if="filteredSubmissions.length === 0" class="text-center py-20">
            <view class="w-16 h-16 rounded-full bg-[#F2EFEA] flex items-center justify-center mx-auto mb-4">
              <text class="text-2xl text-muted-foreground"></text>
            </view>
            <text class="text-muted-foreground">暂无作业</text>
          </view>

          <!-- 作业卡片 -->
          <view v-for="work in filteredSubmissions" :key="work.id" class="relative">
            <!-- 批量选择按钮 -->
            <view v-if="batchMode" @click.stop="toggleSelect(work.id)"
              class="absolute -left-2 top-4 w-6 h-6 rounded-full border-2 flex items-center justify-center z-10"
              :class="isSelected(work.id) ? 'bg-primary border-primary' : 'bg-white border-border'">
              <text v-if="isSelected(work.id)" class="text-white text-xs leading-none">✓</text>
            </view>

            <!-- 作业卡片内容 -->
            <view @click="handleSelectWork(work)"
              :class="[
                'bg-white rounded-xl p-4 transition-all cursor-pointer',
                selectedWork?.id === work.id ? 'ring-2 ring-primary shadow-lg' : 'active:shadow-md'
              ]"
              :style="selectedWork?.id === work.id ? { boxShadow: '0 4px 12px rgba(196,30,58,0.15)' } : {}">
              <view class="flex items-start justify-between mb-3">
                <view class="flex items-center gap-3">
                  <view class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium text-primary"
                    style="background:linear-gradient(135deg,rgba(196,30,58,0.2),rgba(201,169,110,0.2))">
                    <text>{{ work.student.name[0] }}</text>
                  </view>
                  <view>
                    <text class="text-sm font-medium text-foreground block">{{ work.student.name }}</text>
                    <text class="text-xs text-muted-foreground block mt-0.5">{{ work.chapterTitle }}</text>
                  </view>
                </view>
                <text :class="['px-2 py-0.5 rounded-full text-xs font-medium', statusClass(work.status)]">
                  {{ statusLabel(work.status) }}
                </text>
              </view>

              <text class="text-sm text-ink-soft line-clamp-2 mb-2 block leading-relaxed">{{ work.content }}</text>

              <view class="flex items-center justify-between text-xs text-muted-foreground">
                <view class="flex items-center gap-3">
                  <text class="flex items-center gap-1"> {{ work.wordCount }}字</text>
                  <text v-if="work.images && work.images.length > 0" class="flex items-center gap-1">
                     {{ work.images.length }}图
                  </text>
                </view>
                <text>{{ work.submittedAt }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- ===== 批量操作栏 ===== -->
      <view v-if="batchMode && selectedIds.length > 0"
        class="fixed bottom-0 left-0 right-0 bg-white border-t border-border z-40"
        style="padding:16px;padding-bottom:calc(16px + env(safe-area-inset-bottom))">
        <view class="flex items-center justify-between">
          <text class="text-sm text-ink-soft">已选 {{ selectedIds.length }} 份</text>
          <view @click="handleBatchReview"
            class="px-6 py-2 rounded-full text-sm font-medium text-white active:opacity-90 transition-all"
            style="background:linear-gradient(135deg,#C41E3A,#E74C3C)">
            批量批改
          </view>
        </view>
      </view>
    </template>

    <!-- ===== 图片预览遮罩 ===== -->
    <view v-if="previewImage" class="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" @click="previewImage = null">
      <view class="w-72 h-72 rounded-xl overflow-hidden flex items-center justify-center" style="background:rgba(232,224,213,0.3)">
        <image v-if="previewImage.startsWith('http')" :src="previewImage" mode="aspectFit" class="w-full h-full" />
        <text v-else class="text-6xl text-muted-foreground"></text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

// ===== 常量 =====
const commentTemplates = [
  { id: '1', label: '优秀', text: '作业完成得非常出色，理解深入，表达清晰，继续保持！' },
  { id: '2', label: '良好', text: '整体完成较好，对知识点有一定理解，建议进一步深入学习。' },
  { id: '3', label: '合格', text: '基本完成作业要求，但理解还不够深入，请结合课程内容再次复习。' },
  { id: '4', label: '需改进', text: '作业存在一些问题，请根据批注重新修改后提交。' },
]

const quickScores = [100, 90, 80, 70, 60]

const filterOptions = [
  { id: 'all', label: '全部' },
  { id: 'pending', label: '待批改' },
  { id: 'graded', label: '已批改' },
]

// ===== 类型定义 =====
interface Student {
  id: string
  name: string
  avatar: string
}

interface Submission {
  id: string
  student: Student
  chapterId: string
  chapterTitle: string
  content: string
  images: string[]
  submittedAt: string
  status: 'pending' | 'graded' | 'returned'
  wordCount: number
}

// ===== 状态 =====
const isLoading = ref(true)
const submissions = ref<Submission[]>([])
const selectedWork = ref<Submission | null>(null)
const filter = ref<'all' | 'pending' | 'graded'>('all')
const batchMode = ref(false)

// 批改表单
const reviewScore = ref(80)
const reviewComment = ref('')
const suggestions = ref<string[]>([])
const newSuggestion = ref('')
const previewImage = ref<string | null>(null)

// 批量选择
const selectedIds = ref<string[]>([])

// ===== 计算属性 =====
const pendingCount = computed(() =>
  submissions.value.filter(s => s.status === 'pending').length
)

const filteredSubmissions = computed(() => {
  if (filter.value === 'all') return submissions.value
  return submissions.value.filter(s => s.status === filter.value)
})

// ===== 生命周期 =====
onMounted(async () => {
  // 获取路由参数
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  const courseId = currentPage?.$page?.options?.courseId || ''

  // 模拟加载
  await new Promise(resolve => setTimeout(resolve, 500))
  submissions.value = getMockSubmissions()
  isLoading.value = false
})

// ===== Mock 数据 =====
function getMockSubmissions(): Submission[] {
  return [
    {
      id: '1',
      student: { id: 's1', name: '张三', avatar: '' },
      chapterId: 'c1', chapterTitle: '第一章：八字基础',
      content: '通过本章学习，我了解到八字命理的核心是以出生时间为基础，用天干地支来表示。天干有十个：甲、乙、丙、丁、戊、己、庚、辛、壬、癸；地支有十二个：子、丑、寅、卯、辰、巳、午、未、申、酉、戌、亥。\n\n八字中最重要的是日主，代表命主本人。通过分析日主与其他七个字的关系，可以推断一个人的性格特点和命运走向。',
      images: [],
      submittedAt: '2024-01-15 14:30',
      status: 'pending',
      wordCount: 156,
    },
    {
      id: '2',
      student: { id: 's2', name: '李四', avatar: '' },
      chapterId: 'c1', chapterTitle: '第一章：八字基础',
      content: '八字命理学习心得：天干地支是基础，需要熟练掌握。日主很重要，是分析的核心。',
      images: [],
      submittedAt: '2024-01-15 15:20',
      status: 'pending',
      wordCount: 42,
    },
    {
      id: '3',
      student: { id: 's3', name: '王五', avatar: '' },
      chapterId: 'c2', chapterTitle: '第二章：五行生克',
      content: '五行相生：木生火、火生土、土生金、金生水、水生木。五行相克：木克土、土克水、水克火、火克金、金克木。这些关系在八字分析中非常重要。',
      images: [],
      submittedAt: '2024-01-14 10:15',
      status: 'graded',
      wordCount: 78,
    },
    {
      id: '4',
      student: { id: 's4', name: '赵六', avatar: '' },
      chapterId: 'c2', chapterTitle: '第二章：五行生克',
      content: '五行的生克制化是八字分析的基础原理，需要反复练习才能熟练掌握。',
      images: [],
      submittedAt: '2024-01-13 09:00',
      status: 'pending',
      wordCount: 35,
    },
  ]
}

// ===== 状态辅助函数 =====
function statusClass(status: string): string {
  switch (status) {
    case 'pending': return 'bg-orange-50 text-orange-600'
    case 'graded': return 'bg-green-50 text-green-600'
    case 'returned': return 'bg-red-50 text-red-600'
    default: return 'bg-gray-50 text-gray-600'
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'pending': return '待批改'
    case 'graded': return '已批改'
    case 'returned': return '已退回'
    default: return status
  }
}

// ===== 交互操作 =====
function handleSelectWork(work: Submission) {
  if (batchMode.value) {
    toggleSelect(work.id)
    return
  }
  if (work.status === 'pending') {
    selectedWork.value = work
  }
}

function toggleSelect(id: string) {
  const idx = selectedIds.value.indexOf(id)
  if (idx >= 0) {
    selectedIds.value.splice(idx, 1)
  } else {
    selectedIds.value.push(id)
  }
}

function isSelected(id: string): boolean {
  return selectedIds.value.includes(id)
}

function addSuggestion() {
  if (newSuggestion.value.trim()) {
    suggestions.value.push(newSuggestion.value.trim())
    newSuggestion.value = ''
  }
}

function removeSuggestion(index: number) {
  suggestions.value.splice(index, 1)
}

function handleReview(status: 'graded' | 'returned') {
  if (!selectedWork.value) return
  submissions.value = submissions.value.map(s =>
    s.id === selectedWork.value!.id ? { ...s, status } : s
  ) as Submission[]
  selectedWork.value = null
  suggestions.value = []
  uni.showToast({ title: status === 'graded' ? '批改完成' : '已退回', icon: 'success' })
}

function handleBatchReview() {
  if (selectedIds.value.length === 0) return
  // 批量标记为已批改
  submissions.value = submissions.value.map(s =>
    selectedIds.value.includes(s.id) ? { ...s, status: 'graded' } : s
  ) as Submission[]
  selectedIds.value = []
  batchMode.value = false
  uni.showToast({ title: '批量批改完成', icon: 'success' })
}

// 长按作业内容添加为建议（模拟选中文字功能）
function onLongPressContent() {
  uni.showActionSheet({
    itemList: ['将全篇内容添加为修改建议', '取消'],
    success: (res) => {
      if (res.tapIndex === 0 && selectedWork.value) {
        const snippet = selectedWork.value.content.slice(0, 100)
        suggestions.value.push(`"${snippet}..." - 建议重新组织语言表达`)
        uni.showToast({ title: '已添加修改建议', icon: 'none' })
      }
    },
  })
}

// ===== 导航 =====
function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.select-text {
  user-select: text;
  -webkit-user-select: text;
}

/* transition for batch select buttons */
.transition-all {
  transition: all 0.2s ease;
}
</style>
