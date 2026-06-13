<template>
  <view class="min-h-screen bg-background flex flex-col">
    <!-- 顶部导航 -->
    <view class="flex items-center justify-between px-4 h-12 bg-white border-b border-border flex-shrink-0">
      <view @click="goBack" class="flex items-center gap-1">
        <text class="text-xl leading-none text-foreground">←</text>
      </view>
      <text class="text-base font-semibold text-foreground font-serif">排盘工具</text>
      <view class="flex items-center gap-1">
        <text class="text-base px-1" @click="showSearch=!showSearch"></text>
      </view>
    </view>

    <!-- 搜索栏 -->
    <view v-if="showSearch" class="px-4 py-2 bg-white border-b border-border">
      <view class="relative">
        <text class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"></text>
        <input v-model="searchQuery" placeholder="搜索排盘工具名称或描述..." class="w-full pl-9 h-10 bg-background rounded-xl text-sm text-foreground placeholder:text-muted-foreground outline-none px-4 pr-9" />
        <text v-if="searchQuery" class="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground" @click="searchQuery=''">✕</text>
      </view>
      <view v-if="searchQuery && filteredTools.length > 0" class="mt-2 text-xs text-muted-foreground">
        <text>找到 {{ filteredTools.length }} 个匹配工具</text>
      </view>
    </view>

    <!-- 加载骨架 -->
    <view v-if="loading" class="flex-1 p-4">
      <view class="animate-pulse">
        <view class="flex gap-2 mb-3">
          <view v-for="i in 5" :key="i" class="h-7 w-16 bg-[#E8E0D5] rounded-full" />
        </view>
        <view v-for="i in 5" :key="i" class="flex items-center gap-3 bg-white rounded-xl p-3.5 mb-2.5">
          <view class="w-12 h-12 bg-[#E8E0D5] rounded-xl" />
          <view class="flex-1">
            <view class="h-4 bg-[#E8E0D5] rounded w-1/3 mb-1.5" />
            <view class="h-3 bg-[#E8E0D5] rounded w-2/3 mb-1" />
            <view class="h-3 bg-[#E8E0D5] rounded w-1/4" />
          </view>
        </view>
      </view>
    </view>

    <scroll-view v-else scroll-y class="flex-1 px-4 py-4">
      <!-- 分类标签 -->
      <scroll-view scroll-x class="flex gap-2 mb-4" show-scrollbar="false">
        <view v-for="c in categories" :key="c.key" :class="'px-3.5 py-1.5 rounded-full text-xs shrink-0 '+(activeCat===c.key?'bg-primary text-white shadow-sm':'bg-white text-foreground border border-border')" @click="activeCat=c.key">
          <text>{{ c.label }}</text>
        </view>
      </scroll-view>

      <!-- Banner 推荐 -->
      <view v-if="!searchQuery && activeCat==='all'" class="bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl p-4 mb-4 flex items-center gap-3">
        <view class="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
          <text class="text-xl">🧮</text>
        </view>
        <view class="flex-1 min-w-0">
          <text class="text-sm font-semibold text-foreground block">八字排盘 · 最受欢迎</text>
          <text class="text-xs text-muted-foreground block mt-0.5">12580 人使用 · 评分 4.9</text>
        </view>
        <text class="text-xs text-primary font-medium" @click="goTool(tools[0])">开始 ›</text>
      </view>

      <!-- 工具统计 -->
      <view v-if="!searchQuery && filteredTools.length > 0" class="flex items-center justify-between mb-3 px-1">
        <view class="flex items-center gap-2">
          <text class="text-xs text-muted-foreground">共 {{ tools.length }} 个工具</text>
          <text class="text-xs text-accent"> {{ hotCount }} 个热门</text>
        </view>
      </view>

      <!-- 工具列表 -->
      <view v-for="t in filteredTools" :key="t.path" @click="goTool(t)" class="bg-white rounded-xl mb-3 shadow-sm border border-border overflow-hidden active:bg-background transition-colors">
        <view class="flex items-center gap-3.5 p-4">
          <view class="w-14 h-14 rounded-xl flex items-center justify-center text-3xl relative shrink-0" :class="t.bg || 'bg-primary/10'">
            <text>{{ t.icon }}</text>
            <view v-if="t.isHot" class="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gradient-to-br from-primary to-[#E74C3C] rounded-full flex items-center justify-center shadow-sm">
              <text class="text-[9px] text-white"></text>
            </view>
          </view>
          <view class="flex-1 min-w-0">
            <view class="flex items-center gap-2 mb-0.5">
              <text class="text-sm font-semibold text-foreground">{{ t.name }}</text>
              <text v-if="t.isNew" class="px-1.5 py-0.5 bg-gradient-to-r from-green-400 to-green-500 text-white text-[9px] rounded-full font-medium">NEW</text>
              <text v-if="t.isHot && !t.isNew" class="px-1.5 py-0.5 bg-primary/10 text-primary text-[9px] rounded-full font-medium">HOT</text>
            </view>
            <text class="text-xs text-muted-foreground block mt-0.5 line-clamp-1">{{ t.desc }}</text>
            <view class="flex items-center gap-3 mt-1.5">
              <view class="flex items-center gap-0.5">
                <text class="text-accent text-[10px]"></text>
                <text class="text-[10px] text-muted-foreground">{{ t.rating }}</text>
              </view>
              <view class="flex items-center gap-0.5">
                <text class="text-[10px] text-muted-foreground"></text>
                <text class="text-[10px] text-muted-foreground">{{ formatNum(t.users) }}</text>
              </view>
            </view>
          </view>
          <view class="shrink-0">
            <text class="text-base text-[#ccc]">›</text>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="filteredTools.length === 0" class="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <text class="text-5xl mb-3 opacity-40"></text>
        <text class="text-sm font-medium text-foreground mb-1">未找到匹配工具</text>
        <text class="text-xs">尝试其他关键词或分类</text>
      </view>

      <view class="h-6" />
    </scroll-view>
  </view>
</template>
<script setup lang="ts">
import { ref, computed } from 'vue'

const loading = ref(true)
const showSearch = ref(false)
const searchQuery = ref('')
const activeCat = ref('all')

const categories = ref([
  { key: 'all', label: ' 全部' },
  { key: 'bazi', label: '🧮 八字' },
  { key: 'ziwei', label: ' 紫微' },
  { key: 'qimen', label: '🏛️ 奇门' },
  { key: 'liuyao', label: ' 六爻' },
  { key: 'fengshui', label: '🧭 风水' },
  { key: 'zeri', label: ' 择日' },
])

const tools = ref([
  { name: '八字排盘', icon: '🧮', cat: 'bazi', desc: '四柱八字、十神、格局、大运流年排盘分析', path: 'bazi', rating: 4.9, users: 12580, isHot: true, isNew: false, bg: 'bg-red-50' },
  { name: '紫微斗数', icon: '', cat: 'ziwei', desc: '十二宫、四化星、命盘详解、星曜解读', path: 'ziwei', rating: 4.8, users: 9830, isHot: true, isNew: false, bg: 'bg-purple-50' },
  { name: '奇门遁甲', icon: '🏛️', cat: 'qimen', desc: '时家奇门、日家奇门、转盘飞盘多种排盘', path: 'qimen', rating: 4.7, users: 7650, isHot: false, isNew: true, bg: 'bg-indigo-50' },
  { name: '阳盘排盘', icon: '', cat: 'qimen', desc: '奇门阳盘专业排盘、暗干暗神详细分析', path: 'yangpan', rating: 4.6, users: 4320, isHot: false, isNew: false, bg: 'bg-amber-50' },
  { name: '六爻排盘', icon: '', cat: 'liuyao', desc: '铜钱卦、六爻装卦、纳甲装卦、世应分析', path: 'liuyao', rating: 4.7, users: 6540, isHot: false, isNew: false, bg: 'bg-yellow-50' },
  { name: '梅花易数', icon: '🌸', cat: 'liuyao', desc: '时间卦、数字卦、方位卦起卦及详细解读', path: 'meihua', rating: 4.6, users: 5430, isHot: false, isNew: false, bg: 'bg-pink-50' },
  { name: '风水罗盘', icon: '🧭', cat: 'fengshui', desc: '二十四山、玄空飞星、八宅风水布局分析', path: 'fengshui', rating: 4.5, users: 3210, isHot: false, isNew: false, bg: 'bg-green-50' },
  { name: '择日通书', icon: '', cat: 'zeri', desc: '嫁娶、开业、搬家、出行等吉日吉时查询', path: 'zeri', rating: 4.4, users: 2890, isHot: false, isNew: false, bg: 'bg-blue-50' },
  { name: '大六壬占卜', icon: '🔮', cat: 'qimen', desc: '大六壬课式排盘、三传四课、神煞分析', path: 'daliuren', rating: 4.3, users: 1560, isHot: false, isNew: false, bg: 'bg-teal-50' },
  { name: '更多工具', icon: '🔜', cat: 'all', desc: '更多排盘工具正在开发中，点击查看预告', path: 'coming-soon', rating: 0, users: 0, isHot: false, isNew: false, bg: 'bg-gray-50' },
])

const hotCount = computed(() => tools.value.filter(t => t.isHot).length)

const filteredTools = computed(() => {
  let result = tools.value
  if (activeCat.value !== 'all') {
    result = result.filter(t => t.cat === activeCat.value || t.path === 'coming-soon')
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(t => t.name.includes(q) || t.desc.includes(q))
  }
  return result
})

function formatNum(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + '万'
  return String(n)
}

setTimeout(() => { loading.value = false }, 500)

function goBack() { uni.navigateBack() }
function goTool(t: any) {
  if (t.path === 'coming-soon') {
    uni.navigateTo({ url: '/pages/paipan/tools/coming-soon/index' })
    return
  }
  uni.navigateTo({ url: `/pages/paipan/${t.path}/index` })
}
</script>
<style scoped>
/* 样式由 Tailwind 处理 */
</style>
