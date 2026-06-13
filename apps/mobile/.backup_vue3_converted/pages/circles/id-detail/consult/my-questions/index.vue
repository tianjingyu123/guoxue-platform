<template>
  <view class="min-h-screen bg-background">
    <!-- 加载骨架屏 -->
    <view v-if="loading" class="p-4 space-y-3">
      <view class="h-12 bg-muted rounded-lg" />
      <view class="h-10 bg-muted rounded-full" />
      <view v-for="i in 3" :key="i" class="h-32 bg-muted rounded-xl" />
    </view>

    <template v-else>
      <!-- 顶部导航 -->
      <view class="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
        <view @click="goBack">
          <text class="text-xl text-foreground">←</text>
        </view>
        <text class="text-base font-semibold text-foreground">我的问答</text>
        <view class="flex-1" />
        <text class="text-xs text-muted-foreground">共 {{ filtered.length }} 条</text>
      </view>

      <!-- 统计 -->
      <view class="mx-4 mt-3 grid grid-cols-3 gap-2">
        <view class="bg-white rounded-xl p-3 text-center border border-border">
          <text class="text-lg font-bold text-foreground block">{{ mockQs.length }}</text>
          <text class="text-[10px] text-muted-foreground">全部</text>
        </view>
        <view class="bg-white rounded-xl p-3 text-center border border-border">
          <text class="text-lg font-bold text-green-600 block">{{ mockQs.filter(q => q.status === 'answered').length }}</text>
          <text class="text-[10px] text-muted-foreground">已回答</text>
        </view>
        <view class="bg-white rounded-xl p-3 text-center border border-border">
          <text class="text-lg font-bold text-orange-500 block">{{ mockQs.filter(q => q.status === 'pending').length }}</text>
          <text class="text-[10px] text-muted-foreground">待回答</text>
        </view>
      </view>

      <!-- 筛选 -->
      <view class="flex gap-2 px-4 pt-4 pb-2">
        <view
          v-for="f in filterOptions" :key="f.key"
          @click="filter = f.key"
          :class="['px-3 py-1.5 rounded-full text-sm font-medium transition-colors', filter === f.key ? 'bg-primary text-white' : 'bg-muted text-foreground']"
        >
          <text>{{ f.label }}</text>
        </view>
      </view>

      <!-- 问题列表 -->
      <view class="px-4 pb-24 space-y-3 pt-2">
        <view
          v-for="q in filtered"
          :key="q.id"
          class="bg-white border border-border rounded-xl overflow-hidden"
        >
          <!-- 问题头部 -->
          <view @click="toggleExpand(q.id)" class="w-full p-4" :class="expandedIds.has(q.id) ? '' : ''">
            <view class="flex items-start gap-3">
              <image :src="q.avatar" mode="aspectFill" class="w-10 h-10 rounded-full flex-shrink-0 mt-0.5" />
              <view class="flex-1 min-w-0">
                <view class="flex items-center justify-between gap-2 mb-1.5">
                  <view class="flex items-center gap-1.5">
                    <text class="text-xs text-muted-foreground">{{ q.expert }}</text>
                    <text class="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full">{{ q.specialty }}</text>
                  </view>
                  <text
                    :class="['text-xs flex items-center gap-0.5 flex-shrink-0 px-2 py-0.5 rounded-full', q.status === 'answered' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-500']"
                  >
                    <text>{{ q.status === 'answered' ? '✓' : '🕐' }}</text>
                    <text>{{ q.status === 'answered' ? '已回答' : '待回答' }}</text>
                  </text>
                </view>
                <text class="text-sm text-foreground leading-relaxed block">{{ q.content }}</text>
                <view class="flex items-center justify-between mt-2.5 text-xs text-muted-foreground">
                  <view class="flex items-center gap-2">
                    <text class="flex items-center gap-0.5"><text>🕐</text>{{ q.askedAt }}</text>
                    <text v-if="q.views" class="flex items-center gap-0.5"><text></text>{{ q.views }}</text>
                  </view>
                  <text class="font-medium text-primary">{{ q.cost }}</text>
                </view>
              </view>
            </view>
          </view>

          <!-- 展开的答案 -->
          <view v-if="expandedIds.has(q.id)" class="px-4 pb-4 pt-0 border-t border-border">
            <view v-if="q.preview" class="mt-3">
              <view class="flex items-center gap-1.5 mb-2">
                <text class="text-xs font-medium text-muted-foreground"> 专家回答：</text>
              </view>
              <view class="bg-background rounded-xl p-3.5">
                <text class="text-sm text-foreground leading-relaxed block">{{ q.preview }}</text>
              </view>
              <text class="text-[10px] text-muted-foreground block mt-1.5">回复于 {{ q.answeredAt }}</text>
              <!-- 操作按钮 -->
              <view class="flex gap-2 mt-3">
                <view @click="followUp(q)" class="flex-1 py-2 rounded-lg bg-primary/10 text-primary text-xs text-center font-medium">
                  追问
                </view>
                <view @click="deleteQuestion(q)" class="flex-1 py-2 rounded-lg bg-red-50 text-red-500 text-xs text-center font-medium">
                  删除
                </view>
              </view>
            </view>
            <view v-else class="mt-4 text-center">
              <text class="text-sm text-muted-foreground block mb-3">专家正在准备回答...</text>
              <view class="flex gap-2 justify-center">
                <view @click="followUp(q)" class="px-4 py-2 rounded-lg bg-primary/10 text-primary text-xs font-medium">
                  催回答
                </view>
                <view @click="deleteQuestion(q)" class="px-4 py-2 rounded-lg bg-red-50 text-red-500 text-xs font-medium">
                  取消提问
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 空状态 -->
        <view v-if="filtered.length === 0" class="flex flex-col items-center justify-center py-20">
          <text class="text-5xl mb-4"></text>
          <text class="text-sm text-muted-foreground mb-2">暂无问答记录</text>
          <text class="text-xs text-[#ccc]">去咨询专家吧</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const loading = ref(true)

onMounted(() => {
  setTimeout(() => { loading.value = false }, 600)
})

type QFilter = 'all' | 'answered' | 'pending'

interface Question {
  id: string
  content: string
  expert: string
  avatar: string
  specialty: string
  status: 'answered' | 'pending'
  askedAt: string
  answeredAt?: string
  cost: string
  preview?: string
  views?: number
}

const mockQs: Question[] = [
  { id: '1', content: '我是1985年10月15日午时生，想知道今年的财运走势和投资方向，是否适合做生意？', expert: '周易大师', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80', specialty: '八字命理', status: 'answered', askedAt: '2024-01-20', answeredAt: '2024-01-20', cost: '¥50.00', views: 128, preview: '您的命局中财星得地，今年丙午流年走食伤生财之运，财运亨通。特别是农历三月、七月有不错的机会，适合在文化教育、咨询类行业发展。建议投资以稳健为主，不宜冒进。' },
  { id: '2', content: '请问我的八字日主身强还是身弱？用神是什么？近两年感情方面有没有好的发展机会？', expert: '张玄风', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80', specialty: '紫微斗数', status: 'answered', askedAt: '2024-01-15', answeredAt: '2024-01-16', cost: '¥30.00', views: 95, preview: '从您提供的生辰来看，日主甲木生于丑月，天气寒凉，需火暖局。用神为火，喜神为木。明年起感情宫有吉星入位，春夏之际易有良缘，多参加文化类活动可提升缘分。' },
  { id: '3', content: '想问一下我的事业宫，今年是否有升职加薪的机会，需要注意什么？', expert: '李玄机', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80', specialty: '易经', status: 'pending', askedAt: '2024-01-22', cost: '¥80.00', views: 45 },
  { id: '4', content: '请帮我看看新办公室的朝向和布局，是否有利于事业发展和财运？', expert: '王德华', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80', specialty: '风水', status: 'answered', askedAt: '2024-01-10', answeredAt: '2024-01-11', cost: '¥120.00', views: 67, preview: '您的新办公室坐北朝南，采光充足，格局不错。建议办公桌背靠实墙，面向门口，形成"明堂开阔"的格局。在东南角放置绿植或水景有助财运。避免背对窗户或门。' },
  { id: '5', content: '请问奇门遁甲中的八门在择吉中如何应用？什么时候适合出行？', expert: '林奇门', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=80', specialty: '奇门遁甲', status: 'answered', askedAt: '2024-01-08', answeredAt: '2024-01-09', cost: '¥45.00', views: 156, preview: '八门中开、休、生为三门，宜出行、求财、嫁娶。特别是开门利于开业，休门利于休息养身，生门利于求财。您本月出行宜选在巳时或申时，开门在东南，生门在正北。' },
  { id: '6', content: '六爻占卜测感情，摇得火风鼎变山风蛊，请老师帮忙解卦。', expert: '赵六爻', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80', specialty: '六爻', status: 'pending', askedAt: '2024-01-06', cost: '¥60.00', views: 32 },
]

const filter = ref<QFilter>('all')
const expandedIds = ref<Set<string>>(new Set())
const filterOptions = [
  { key: 'all', label: '全部' },
  { key: 'answered', label: '已回答' },
  { key: 'pending', label: '待回答' },
]

const filtered = computed(() => filter.value === 'all' ? mockQs : mockQs.filter(q => q.status === filter.value))

function toggleExpand(id: string) {
  if (expandedIds.value.has(id)) {
    expandedIds.value.delete(id)
  } else {
    expandedIds.value.add(id)
  }
  // 触发响应式
  expandedIds.value = new Set(expandedIds.value)
}

function followUp(q: Question) {
  uni.navigateTo({ url: `/pages/circles/id-detail/consult/ask/index?questionId=${q.id}` })
}

function deleteQuestion(q: Question) {
  uni.showModal({
    title: '删除确认',
    content: '确定要删除这条提问吗？',
    success: (res) => {
      if (res.confirm) {
        const idx = mockQs.indexOf(q)
        if (idx > -1) mockQs.splice(idx, 1)
        uni.showToast({ title: '已删除', icon: 'success' })
      }
    }
  })
}

function goBack() { uni.navigateBack() }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
