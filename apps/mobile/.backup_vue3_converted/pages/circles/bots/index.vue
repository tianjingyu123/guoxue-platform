<template>
  <view class="min-h-screen bg-background">
    <!-- 顶部导航 -->
    <view class="bg-gradient-to-br from-primary to-primary/70 text-white px-4 pt-12 pb-6">
      <view class="flex items-center justify-between mb-4">
        <view class="w-10 h-10 flex items-center justify-center" @click="goBack">
          <text class="text-white text-xl">←</text>
        </view>
        <text class="text-lg font-bold">智能体广场</text>
        <view class="w-10" />
      </view>
      <!-- 统计 -->
      <view class="flex items-center gap-4 justify-center">
        <view class="text-center">
          <text class="text-2xl font-bold block">{{ stats.total }}</text>
          <text class="text-xs text-white/70">智能体</text>
        </view>
        <view class="w-px h-8 bg-white/20" />
        <view class="text-center">
          <text class="text-2xl font-bold block">{{ stats.totalUsers }}</text>
          <text class="text-xs text-white/70">使用人次</text>
        </view>
        <view class="w-px h-8 bg-white/20" />
        <view class="text-center">
          <text class="text-2xl font-bold block">{{ stats.categories }}</text>
          <text class="text-xs text-white/70">分类</text>
        </view>
      </view>
    </view>

    <!-- 圈子信息摘要 -->
    <view v-if="circleInfo" class="bg-white/10 rounded-xl p-3 mx-4">
      <view class="flex items-center gap-3">
        <view class="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
          <text class="text-white text-xl">{{ circleInfo.name?.[0] || '' }}</text>
        </view>
        <view class="flex-1 min-w-0">
          <view class="flex items-center gap-2">
            <text class="font-bold text-white truncate">{{ circleInfo.name }}</text>
            <text v-if="circleInfo.isOwner" class="bg-accent text-white text-xs px-1.5 py-0.5 rounded">圈主</text>
          </view>
          <text class="text-sm text-white/70 truncate block">{{ circleInfo.description }}</text>
        </view>
        <view class="text-center">
          <text class="text-lg font-bold text-white block">{{ stats.total }}</text>
          <text class="text-xs text-white/70">智能体</text>
        </view>
      </view>
    </view>

    <!-- 搜索和排序 -->
    <view class="sticky top-0 z-10 bg-background border-b border-[#E8E4DE] px-4 py-3">
      <view class="flex gap-2 mb-3">
        <view class="flex-1 relative">
          <text class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></text>
          <input
            v-model="keyword"
            type="text"
            placeholder="搜索智能体"
            class="w-full h-9 pl-9 pr-3 rounded-lg bg-white border border-[#E8E4DE] text-sm"
            @confirm="handleSearch"
          />
        </view>
        <view class="px-4 py-2 bg-primary text-white text-sm rounded-lg" @click="handleSearch">
          <text>搜索</text>
        </view>
      </view>

      <!-- 排序选项 -->
      <scroll-view class="flex gap-2 whitespace-nowrap" scroll-x>
        <view
          v-for="opt in sortOptions"
          :key="opt.value"
          class="inline-flex px-3 py-1.5 rounded-full text-xs"
          :class="sortBy === opt.value ? 'bg-primary text-white' : 'bg-white text-gray-600 border border-[#E8E4DE]'"
          @click="sortBy = opt.value"
        >
          <text>{{ opt.label }}</text>
        </view>
      </scroll-view>
    </view>

    <!-- 分类标签 -->
    <view class="px-4 pt-3">
      <scroll-view class="flex gap-2 whitespace-nowrap" scroll-x>
        <view
          v-for="cat in categories"
          :key="cat.id"
          class="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs"
          :class="selectedCategory === cat.id ? 'bg-primary text-white' : 'bg-white text-gray-600 border border-[#E8E4DE]'"
          @click="selectedCategory = cat.id"
        >
          <text>{{ cat.icon }}</text>
          <text>{{ cat.name }}</text>
        </view>
      </scroll-view>
    </view>

    <!-- 管理员创建入口 -->
    <view v-if="isAdmin" class="px-4 pt-4">
      <view @click="goCreateBot" class="flex items-center gap-3 p-4 rounded-xl border border-dashed border-accent" style="background:linear-gradient(90deg,rgba(201,169,110,0.1),rgba(196,30,58,0.1))">
        <view class="w-12 h-12 rounded-xl flex items-center justify-center" style="background:linear-gradient(135deg,#C9A96E,#C41E3A)">
          <text class="text-white text-xl">+</text>
        </view>
        <view class="flex-1">
          <text class="font-medium text-foreground block">创建圈子专属智能体</text>
          <text class="text-sm text-muted-foreground">为圈友打造定制化AI助手</text>
        </view>
        <text class="text-lg text-[#ccc]">›</text>
      </view>
    </view>

    <!-- Bot 网格列表 -->
    <view class="px-4 py-4">
      <view v-if="loading" class="grid grid-cols-2 gap-3">
        <view v-for="i in 6" :key="i" class="bg-white rounded-xl p-3 animate-pulse">
          <view class="w-14 h-14 rounded-xl bg-[#F2EFEA] mx-auto mb-2" />
          <view class="h-4 bg-[#F2EFEA] rounded w-3/4 mx-auto mb-2" />
          <view class="h-3 bg-[#F2EFEA] rounded w-1/2 mx-auto" />
        </view>
      </view>
      <view v-else-if="filteredBots.length === 0" class="flex flex-col items-center justify-center py-16">
        <text class="text-4xl mb-4">🤖</text>
        <text class="text-gray-500 text-sm mb-2">暂无智能体</text>
        <text class="text-gray-400 text-xs">该分类下还没有智能体</text>
      </view>
      <view v-else class="grid grid-cols-2 gap-3">
        <view v-for="bot in filteredBots" :key="bot.id" class="bg-white rounded-xl border border-[#E8E4DE] overflow-hidden" @click="goBotDetail(bot.id)">
          <!-- 头像和标签 -->
          <view class="relative p-4 pb-2">
            <view class="absolute top-2 right-2 flex flex-col gap-1">
              <view v-if="bot.isPinned" class="bg-primary text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-0.5">
                <text>📌 置顶</text>
              </view>
              <view v-if="bot.isOfficial" class="bg-accent text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-0.5">
                <text>👑 官方</text>
              </view>
              <view v-if="bot.isNew && !bot.isPinned && !bot.isOfficial" class="bg-green-500 text-white text-xs px-1.5 py-0.5 rounded">
                <text>NEW</text>
              </view>
            </view>
            <view class="w-14 h-14 rounded-xl overflow-hidden mx-auto mb-2 ring-2 ring-[#C9A96E]/30">
              <image :src="bot.avatar" class="w-full h-full object-cover" />
            </view>
            <text class="font-bold text-[#333] text-center block truncate">{{ bot.name }}</text>
          </view>
          <!-- 描述 -->
          <view class="px-3 pb-2">
            <text class="text-xs text-gray-500 line-clamp-2 block h-8">{{ bot.description }}</text>
          </view>
          <!-- 标签 -->
          <view class="px-3 pb-2 flex flex-wrap gap-1">
            <text v-for="tag in bot.tags.slice(0, 3)" :key="tag" class="text-xs px-1.5 py-0.5 bg-background text-ink-soft rounded">{{ tag }}</text>
          </view>
          <!-- 底部信息 -->
          <view class="px-3 py-2 border-t border-[#F0EDE8] flex items-center justify-between">
            <view class="flex items-center gap-1 text-xs text-gray-500">
              <text class="text-accent"></text>
              <text>{{ bot.rating }}</text>
            </view>
            <view class="flex items-center gap-1 text-xs text-gray-500">
              <text>⚡</text>
              <text>{{ formatUsageCount(bot.usageCount) }}</text>
            </view>
            <text v-if="bot.price > 0" class="text-xs font-medium text-primary">{{ bot.price }}币/次</text>
            <text v-else class="text-xs text-green-600">免费</text>
          </view>
          <!-- 创建者 -->
          <view class="px-3 py-2 bg-background flex items-center gap-2">
            <image :src="bot.creator.avatar" class="w-5 h-5 rounded-full" />
            <text class="text-xs text-gray-500 truncate">{{ bot.creator.nickname }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 加载完成 -->
    <view v-if="!loading && filteredBots.length > 0" class="text-center py-4">
      <text class="text-xs text-gray-400">— 已经到底了 —</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface BotCreator {
  avatar: string
  nickname: string
}

interface BotItem {
  id: number
  name: string
  avatar: string
  description: string
  tags: string[]
  rating: number
  usageCount: number
  price: number
  isPinned: boolean
  isOfficial: boolean
  isNew: boolean
  creator: BotCreator
}

const keyword = ref('')
const sortBy = ref<'hot' | 'new' | 'usage'>('hot')
const selectedCategory = ref('all')
const loading = ref(true)
const allBots = ref<BotItem[]>([])

const sortOptions = [
  { value: 'hot', label: ' 最热' },
  { value: 'new', label: '🆕 最新' },
  { value: 'usage', label: '📊 使用量' },
]

const categories = [
  { id: 'all', name: '全部', icon: '🌐' },
  { id: 'bazi', name: '八字命理', icon: '📜' },
  { id: 'ziwei', name: '紫微斗数', icon: '' },
  { id: 'fengshui', name: '风水堪舆', icon: '🏠' },
  { id: 'yijing', name: '易经占卜', icon: '' },
  { id: 'qimen', name: '奇门遁甲', icon: '🔮' },
  { id: 'nameology', name: '姓名学', icon: '✍️' },
  { id: 'daily', name: '生活助手', icon: '' },
]

const stats = ref({
  total: 128,
  totalUsers: '12.6万',
  categories: '8',
})

const circleInfo = ref({ name: '八字命理研习社', description: '专注八字命理学习交流', isOwner: true })
const isAdmin = ref(true)
function goCreateBot() { uni.navigateTo({ url: '/pages/circles/bots/create/index' }) }

const mockBots: BotItem[] = [
  { id: 1, name: '八字排盘大师', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bazi', description: 'AI八字排盘，精准分析命理格局，帮你了解命运轨迹', tags: ['八字', '命理', '排盘'], rating: 4.9, usageCount: 56800, price: 0, isPinned: true, isOfficial: true, isNew: false, creator: { avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin', nickname: '平台官方' } },
  { id: 2, name: '紫微斗数顾问', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ziwei', description: '紫微斗数排盘解盘，十二宫位深度解读', tags: ['紫微斗数', '命盘'], rating: 4.8, usageCount: 32500, price: 1, isPinned: true, isOfficial: true, isNew: false, creator: { avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin', nickname: '平台官方' } },
  { id: 3, name: '风水布局助手', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=fengshui', description: '居家办公风水布局建议，助你趋吉避凶', tags: ['风水', '布局'], rating: 4.7, usageCount: 21800, price: 0, isPinned: false, isOfficial: false, isNew: false, creator: { avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user1', nickname: '风水先生' } },
  { id: 4, name: '起名大师', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=naming', description: '结合八字五行，为你推荐吉祥好名', tags: ['起名', '改名', '五行'], rating: 4.8, usageCount: 45600, price: 0, isPinned: false, isOfficial: true, isNew: false, creator: { avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin', nickname: '平台官方' } },
  { id: 5, name: '易经占卜师', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=yijing', description: '六十四卦占卜解惑，指引人生方向', tags: ['易经', '占卜', '六十四卦'], rating: 4.6, usageCount: 18200, price: 1, isPinned: false, isOfficial: false, isNew: true, creator: { avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user2', nickname: '易学居士' } },
  { id: 6, name: '奇门遁甲推算', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=qimen', description: '奇门遁甲择吉预测，出行决策好帮手', tags: ['奇门遁甲', '择吉'], rating: 4.5, usageCount: 9600, price: 2, isPinned: false, isOfficial: false, isNew: true, creator: { avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user3', nickname: '奇门居士' } },
  { id: 7, name: '每日运势播报', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=horoscope', description: '每日生肖星座运势，黄历宜忌早知道', tags: ['运势', '星座', '黄历'], rating: 4.4, usageCount: 78900, price: 0, isPinned: false, isOfficial: true, isNew: false, creator: { avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin', nickname: '平台官方' } },
  { id: 8, name: '姓名评分测算', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=name', description: '五格数理姓名评分，分析姓名吉凶', tags: ['姓名学', '五格', '数理'], rating: 4.3, usageCount: 12300, price: 0, isPinned: false, isOfficial: false, isNew: false, creator: { avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user4', nickname: '王文昌' } },
  { id: 9, name: '六爻占卜助手', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=liuyao', description: '六爻起卦断卦，一事一占最灵验', tags: ['六爻', '占卜'], rating: 4.7, usageCount: 15600, price: 1, isPinned: false, isOfficial: false, isNew: false, creator: { avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user5', nickname: '六爻居士' } },
  { id: 10, name: '面相分析助手', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=face', description: 'AI面相分析，上传照片即可获取面相解读', tags: ['面相', '相学'], rating: 4.2, usageCount: 8900, price: 2, isPinned: false, isOfficial: false, isNew: true, creator: { avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user6', nickname: '相面先生' } },
]

const filteredBots = computed(() => {
  let result = [...allBots.value]
  if (keyword.value.trim()) {
    const kw = keyword.value.trim().toLowerCase()
    result = result.filter(b =>
      b.name.toLowerCase().includes(kw) ||
      b.description.toLowerCase().includes(kw) ||
      b.tags.some(t => t.toLowerCase().includes(kw))
    )
  }
  if (sortBy.value === 'hot') result.sort((a, b) => b.usageCount - a.usageCount)
  else if (sortBy.value === 'new') result.sort((a, b) => a.isNew === b.isNew ? 0 : a.isNew ? -1 : 1)
  else if (sortBy.value === 'usage') result.sort((a, b) => b.usageCount - a.usageCount)
  return result
})

onMounted(() => {
  setTimeout(() => {
    allBots.value = mockBots
    loading.value = false
  }, 300)
})

function handleSearch() {
  // computed handles filtering
}

function formatUsageCount(count: number): string {
  if (count >= 10000) return (count / 10000).toFixed(1) + '万'
  if (count >= 1000) return (count / 1000).toFixed(1) + 'k'
  return String(count)
}

function goBack() { uni.navigateBack() }
function goBotDetail(id: number) { uni.navigateTo({ url: '/pages/bots/chat/id-detail/index?id=' + id }) }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
