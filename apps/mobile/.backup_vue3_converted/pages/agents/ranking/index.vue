<template>
  <view class="min-h-screen bg-background flex flex-col">
    <!-- 骨架屏 -->
    <template v-if="loading">
      <view class="sticky top-0 z-10 bg-background border-b border-border flex items-center justify-between px-4 h-12 flex-shrink-0">
        <view class="w-7 h-7 bg-gray-200 rounded" />
        <view class="w-20 h-4 bg-gray-200 rounded" />
        <view class="w-7" />
      </view>
      <view class="flex gap-2 px-4 pt-4 pb-2">
        <view v-for="i in 4" :key="i" class="h-8 w-16 bg-gray-200 rounded-full" />
      </view>
      <view class="flex-1 px-4 pt-2 space-y-3">
        <view v-for="i in 3" :key="i" class="h-32 bg-gray-200 rounded-xl" />
      </view>
    </template>

    <template v-else>
      <!-- 顶部导航 -->
      <view class="sticky top-0 z-10 bg-background border-b border-border flex items-center justify-between px-4 h-12 flex-shrink-0">
        <view @click="goBack" class="p-1">
          <text class="text-xl text-foreground">←</text>
        </view>
        <text class="text-base font-semibold text-foreground">智能体排行</text>
        <view class="w-7" />
      </view>

      <!-- 排行分类Tab -->
      <view class="flex gap-2 px-4 pt-3 pb-2 overflow-x-auto bg-background border-b border-border">
        <view v-for="t in tabs" :key="t.id" @click="activeTab = t.id"
          class="px-3.5 py-1.5 rounded-full text-xs whitespace-nowrap font-medium transition-colors"
          :class="activeTab === t.id ? 'bg-primary text-white' : 'bg-muted text-foreground'">
          {{ t.icon }} {{ t.label }}
        </view>
      </view>

      <!-- Top3 特殊展示 -->
      <view v-if="filteredList.length > 0" class="px-4 pt-4 pb-3">
        <view class="flex items-end gap-2">
          <!-- 第2名 -->
          <view v-if="filteredList[1]" class="flex-1 bg-white rounded-xl p-3 border border-border text-center" @click="goDetail(filteredList[1].id)">
            <text class="text-xl block mb-1"></text>
            <view class="w-10 h-10 rounded-full bg-gradient-to-br from-[#A8A8A8] to-[#D0D0D0] flex items-center justify-center text-white text-base mx-auto mb-1">
              <text>{{ filteredList[1].name[0] }}</text>
            </view>
            <text class="text-xs font-semibold text-foreground block">{{ filteredList[1].name }}</text>
            <text class="text-[10px] text-muted-foreground"> {{ filteredList[1].score }}</text>
          </view>
          <!-- 第1名 -->
          <view v-if="filteredList[0]" class="flex-1 bg-white rounded-xl p-4 border-2 border-yellow-300 text-center -mt-2" @click="goDetail(filteredList[0].id)">
            <text class="text-2xl block mb-1"></text>
            <view class="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-white text-lg mx-auto mb-1 shadow-lg shadow-yellow-200">
              <text>{{ filteredList[0].name[0] }}</text>
            </view>
            <text class="text-sm font-bold text-foreground block">{{ filteredList[0].name }}</text>
            <text class="text-[10px] text-yellow-600"> {{ filteredList[0].score }}</text>
            <text class="text-[10px] text-muted-foreground block mt-0.5">{{ filteredList[0].users.toLocaleString() }} 次使用</text>
          </view>
          <!-- 第3名 -->
          <view v-if="filteredList[2]" class="flex-1 bg-white rounded-xl p-3 border border-border text-center" @click="goDetail(filteredList[2].id)">
            <text class="text-xl block mb-1"></text>
            <view class="w-10 h-10 rounded-full bg-gradient-to-br from-[#CD7F32] to-[#E8A87C] flex items-center justify-center text-white text-base mx-auto mb-1">
              <text>{{ filteredList[2].name[0] }}</text>
            </view>
            <text class="text-xs font-semibold text-foreground block">{{ filteredList[2].name }}</text>
            <text class="text-[10px] text-muted-foreground"> {{ filteredList[2].score }}</text>
          </view>
        </view>
      </view>

      <!-- 排行列表 -->
      <scroll-view scroll-y class="flex-1 px-4 pb-6 overflow-y-auto">
        <view class="space-y-2.5">
          <view v-for="(a, i) in filteredList.slice(3)" :key="a.id"
            class="bg-white border border-border rounded-xl p-3.5"
            @click="goDetail(a.id)">
            <view class="flex items-start gap-3">
              <view class="flex-shrink-0 w-8 text-center">
                <text class="text-lg font-bold" :class="getRankColor(i + 4)">#{{ i + 4 }}</text>
              </view>
              <view class="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg flex-shrink-0">
                <text>{{ a.icon }}</text>
              </view>
              <view class="flex-1 min-w-0">
                <view class="flex items-center gap-2">
                  <text class="text-sm font-semibold text-foreground">{{ a.name }}</text>
                  <text class="text-[10px] px-1.5 py-0.5 bg-muted text-muted-foreground rounded-full">{{ a.category }}</text>
                </view>
                <text class="text-xs text-muted-foreground block mt-0.5 line-clamp-1">{{ a.desc }}</text>
                <view class="flex items-center gap-3 mt-1.5">
                  <text class="text-xs flex items-center gap-0.5"> <text class="text-primary font-semibold">{{ a.score }}</text></text>
                  <text class="text-xs text-muted-foreground"> {{ a.users.toLocaleString() }}</text>
                  <text class="text-xs text-muted-foreground"> {{ a.chats.toLocaleString() }}</text>
                </view>
              </view>
              <text class="text-lg text-muted-foreground flex-shrink-0 self-center">›</text>
            </view>
          </view>
        </view>

        <!-- 空状态 -->
        <view v-if="filteredList.length === 0"
          class="flex flex-col items-center justify-center py-16">
          <text class="text-4xl mb-4"></text>
          <text class="text-muted-foreground text-sm">该分类暂无排行</text>
        </view>

        <view class="h-5" />
      </scroll-view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const loading = ref(true)
const activeTab = ref('comprehensive')

const tabs = [
  { id: 'comprehensive', label: '综合', icon: '' },
  { id: 'dialogue', label: '对话', icon: '' },
  { id: 'knowledge', label: '知识', icon: '' },
  { id: 'creative', label: '创意', icon: '' },
]

interface Agent {
  id: string
  name: string
  icon: string
  score: string
  users: number
  chats: number
  desc: string
  category: string
  rank: number
}

const allAgents: Agent[] = [
  { id: '1', name: '八字命理大师', icon: '🧮', score: '4.9', users: 23450, chats: 56780, desc: '精通八字命理，擅长十神分析和大运流年推断', category: '命理', rank: 1 },
  { id: '2', name: '紫微斗数分析师', icon: '', score: '4.8', users: 18760, chats: 42300, desc: '紫微斗数专家，精于十二宫位和四化飞星', category: '命理', rank: 2 },
  { id: '3', name: '六爻占卜师', icon: '', score: '4.8', users: 12340, chats: 34500, desc: '六爻预测高手，断卦精准，擅长感情事业预测', category: '占卜', rank: 3 },
  { id: '4', name: '风水实战派', icon: '🏠', score: '4.7', users: 9870, chats: 25600, desc: '实战风水大师，阳宅阴宅布局调整', category: '风水', rank: 4 },
  { id: '5', name: '奇门遁甲专家', icon: '🌀', score: '4.7', users: 7650, chats: 19800, desc: '奇门遁甲排盘预测，擅长择吉和方位决策', category: '占卜', rank: 5 },
  { id: '6', name: '易经通解', icon: '️', score: '4.6', users: 6540, chats: 18700, desc: '易经六十四卦深度解读，哲学与人生智慧', category: '经典', rank: 6 },
  { id: '7', name: '梅花易数大师', icon: '🌸', score: '4.6', users: 5430, chats: 15600, desc: '梅花易数起卦断卦，擅长象数理占综合分析', category: '占卜', rank: 7 },
  { id: '8', name: '诗词创作助手', icon: '📜', score: '4.5', users: 4320, chats: 12400, desc: '古体诗词创作辅助，对仗格律典故信手拈来', category: '创意', rank: 8 },
]

const filteredList = computed(() => {
  return allAgents.slice()
})

onMounted(() => {
  setTimeout(() => { loading.value = false }, 400)
})

function getRankColor(rank: number) {
  if (rank <= 3) return 'text-yellow-500'
  if (rank <= 5) return 'text-gray-400'
  return 'text-muted-foreground'
}

function goBack() { uni.navigateBack() }
function goDetail(id: string) { uni.navigateTo({ url: `/pages/agent/main/index?id=${id}` }) }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
