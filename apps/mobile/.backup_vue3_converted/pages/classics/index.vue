<template>
  <view class="min-h-screen pb-[72px]" style="background: linear-gradient(to bottom, rgba(255,248,240,0.5), #FAF8F5);">
    <!-- 顶部 - 古典书卷风格 -->
    <view style="position: sticky; top: 0; z-index: 40; background: linear-gradient(to right, #92400e, #78350f);" class="text-white">
      <view class="flex items-center gap-3 px-4 h-14">
        <view @click="goBack" class="p-1 -ml-1">
          <text class="text-white text-xl leading-none">←</text>
        </view>
        <view class="flex items-center gap-2">
          <text class="text-amber-300 text-lg leading-none"></text>
          <text class="text-lg" style="font-family: serif;">古籍典藏</text>
        </view>
        <view class="flex-1" />
        <view @click="goTo('/pages/classics/search/index')" class="p-2 text-amber-200">
          <text class="text-lg leading-none"></text>
        </view>
      </view>

      <!-- 搜索框 -->
      <view class="px-4 pb-3">
        <view style="position: relative;">
          <text style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-size: 14px; color: #fbbf24; z-index: 1;"></text>
          <input
            v-model="searchQuery"
            placeholder="搜索古籍、作者"
            class="w-full h-9 pl-9 pr-4 text-sm text-amber-100 placeholder:text-amber-400/60"
            style="background: rgba(120,53,15,0.5); border: 1px solid rgba(180,83,9,0.5); border-radius: 8px; outline: none;"
          />
        </view>
      </view>
    </view>

    <!-- 四库分类 -->
    <view class="px-4 py-4">
      <view class="grid grid-cols-4 gap-2">
        <view
          v-for="cat in mainCategories"
          :key="cat.id"
          @click="toggleMainCat(cat.id)"
          :class="['py-3 rounded-xl text-center transition-all', activeMainCat === cat.id ? 'text-white shadow-lg' : 'bg-white']"
          :style="activeMainCat === cat.id ? getCatGradientStyle(cat.color) : ''"
        >
          <text class="text-2xl block mb-1">{{ cat.icon }}</text>
          <text class="text-xs font-medium">{{ cat.name }}</text>
        </view>
      </view>
    </view>

    <!-- 推荐书单 -->
    <view class="px-4 mb-4">
      <view class="flex items-center justify-between mb-2">
        <view class="flex items-center gap-1.5">
          <text class="text-amber-600 text-sm leading-none">📑</text>
          <text class="font-semibold text-sm">精选书单</text>
        </view>
        <view @click="goTo('/pages/classics/lists/index')" class="text-xs flex items-center" style="color: #999;">
          <text>更多</text>
          <text class="text-xs ml-0.5">›</text>
        </view>
      </view>
      <scroll-view scroll-x class="pb-1" style="overflow-x: auto; white-space: nowrap; -ms-overflow-style: none; scrollbar-width: none;">
        <view class="flex gap-2" style="display: inline-flex;">
          <view
            v-for="list in bookLists"
            :key="list.id"
            @click="goTo('/pages/classics/collection/index?id=' + list.id)"
            class="flex-shrink-0"
            style="display: inline-block;"
          >
            <view
              class="px-4 py-3 flex items-center gap-3"
              style="background: white; border-radius: 12px; border: 1px solid rgba(232,224,213,0.5); box-shadow: 0 1px 3px rgba(0,0,0,0.05);"
            >
              <text class="text-2xl leading-none">{{ list.icon }}</text>
              <view style="text-align: left;">
                <text class="text-sm font-medium block">{{ list.title }}</text>
                <text class="text-xs block" style="color: #999;">{{ list.count }}本</text>
              </view>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 子分类 + 筛选 -->
    <view
      class="border-b"
      style="position: sticky; top: 56px; z-index: 30; background: rgba(250,248,245,0.95); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); border-color: #E8E0D5;"
    >
      <scroll-view scroll-x class="px-4 py-2" style="overflow-x: auto; white-space: nowrap; -ms-overflow-style: none; scrollbar-width: none;">
        <view class="flex gap-2" style="display: inline-flex;">
          <view
            v-for="cat in subCategories"
            :key="cat.id"
            @click="activeSubCat = cat.id"
            :class="['flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors', activeSubCat === cat.id ? 'bg-amber-600 text-white' : '']"
            :style="activeSubCat !== cat.id ? 'background: #F5F1EB; color: #999;' : ''"
            style="white-space: nowrap; display: inline-block;"
          >
            <text>{{ cat.name }}</text>
          </view>
        </view>
      </scroll-view>
      <view class="flex items-center justify-between px-4 py-2" style="border-top: 1px solid #E8E0D5;">
        <view class="flex items-center gap-3">
          <text
            @click="onlyFree = !onlyFree"
            :class="['text-xs', onlyFree ? 'text-amber-600 font-medium' : '']"
            :style="!onlyFree ? 'color: #999;' : ''"
          >免费</text>
          <text
            @click="onlyAI = !onlyAI"
            :class="['text-xs flex items-center gap-0.5', onlyAI ? 'text-purple-600 font-medium' : '']"
            :style="!onlyAI ? 'color: #999;' : ''"
          >
            <text class="text-xs mr-0.5"></text>AI智读
          </text>
        </view>
        <view class="flex items-center gap-1">
          <view
            @click="viewMode = 'grid'"
            :class="['p-1.5 rounded', viewMode === 'grid' ? '' : '']"
            :style="viewMode === 'grid' ? 'background: #F5F1EB;' : ''"
            class="flex items-center justify-center"
          >
            <text :style="{ fontSize: '16px', lineHeight: '1' }" :class="viewMode === 'grid' ? 'text-amber-600' : 'text-muted-foreground'">⊞</text>
          </view>
          <view
            @click="viewMode = 'list'"
            :class="['p-1.5 rounded', viewMode === 'list' ? '' : '']"
            :style="viewMode === 'list' ? 'background: #F5F1EB;' : ''"
            class="flex items-center justify-center"
          >
            <text :style="{ fontSize: '16px', lineHeight: '1' }" :class="viewMode === 'list' ? 'text-amber-600' : 'text-muted-foreground'">☰</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 古籍列表 -->
    <view class="p-4">
      <!-- 空状态 -->
      <view v-if="filteredClassics.length === 0" class="flex flex-col items-center justify-center py-20">
        <text class="text-6xl mb-4" style="color: rgba(153,153,153,0.2);"></text>
        <text style="color: #999;">暂无相关古籍</text>
      </view>

      <!-- 书架网格视图 -->
      <view v-else-if="viewMode === 'grid'" class="grid grid-cols-3 gap-3">
        <view
          v-for="classic in filteredClassics"
          :key="classic.id"
          @click="goTo('/pages/classics/reader/index?id=' + classic.id)"
          class="group"
        >
          <!-- 古籍封面 - 竖版书籍样式 -->
          <view
            class="aspect-[3/4] rounded-lg overflow-hidden relative shadow-md mb-2"
            :style="getCoverGradient(classic.cover) + '; box-shadow: 0 4px 6px rgba(0,0,0,0.1);'"
          >
            <!-- 书脊装饰 -->
            <view
              style="position: absolute; left: 0; top: 0; bottom: 0; width: 8px; background: linear-gradient(to right, rgba(217,119,6,0.3), transparent);"
            />
            <!-- 标签 -->
            <view style="position: absolute; top: 6px; right: 6px; display: flex; flex-direction: column; gap: 4px;">
              <view v-if="classic.hasAI" class="flex items-center text-white rounded-sm" style="background: rgba(168,85,247,0.9); font-size: 8px; padding: 1px 4px;">
                <text class="mr-0.5" style="font-size: 7px;"></text>
                <text>AI</text>
              </view>
              <view v-if="classic.isFree" class="text-white rounded-sm text-center" style="background: rgba(34,197,94,0.9); font-size: 8px; padding: 1px 4px;">
                <text>免费</text>
              </view>
            </view>
            <!-- 朝代标签 -->
            <view class="absolute top-2 left-2 text-white rounded-sm text-center" style="background: rgba(217,119,6,0.8); font-size: 8px; padding: 1px 6px;">
              <text>{{ classic.dynasty }}</text>
            </view>
            <!-- 书名 - 竖排文字 -->
            <view style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; padding: 12px;">
              <text
                class="text-lg font-bold tracking-wider"
                style="font-family: serif; writing-mode: vertical-rl; text-orientation: upright; color: #78350f;"
              >
                {{ classic.title }}
              </text>
            </view>
            <!-- 作者 -->
            <view style="position: absolute; bottom: 6px; left: 0; right: 0; text-align: center;">
              <text style="font-size: 10px; color: rgba(120,53,15,0.8);">{{ classic.author }}</text>
            </view>
          </view>
          <!-- 书籍信息 -->
          <view class="text-center">
            <text class="text-xs font-medium truncate block">{{ classic.title }}</text>
            <text class="text-xs block" style="color: #999; font-size: 10px;">{{ (classic.reads/10000).toFixed(1) }}万人读</text>
          </view>
        </view>
      </view>

      <!-- 列表视图 -->
      <view v-else class="flex flex-col gap-3">
        <view
          v-for="classic in filteredClassics"
          :key="classic.id"
          @click="goTo('/pages/classics/reader/index?id=' + classic.id)"
          class="flex gap-3 p-3"
          style="background: white; border-radius: 12px; border: 1px solid rgba(232,224,213,0.5); box-shadow: 0 1px 2px rgba(0,0,0,0.05);"
        >
          <!-- 封面 -->
          <view
            class="flex-shrink-0 relative overflow-hidden rounded"
            style="width: 64px; height: 88px; background: linear-gradient(to bottom, #fef3c7, #fffbeb); box-shadow: 0 1px 3px rgba(0,0,0,0.1);"
          >
            <view style="position: absolute; left: 0; top: 0; bottom: 0; width: 6px; background: rgba(217,119,6,0.3);" />
            <view style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; padding: 4px;">
              <text
                class="text-sm font-bold"
                style="font-family: serif; writing-mode: vertical-rl; text-orientation: upright; color: #78350f;"
              >
                {{ classic.title }}
              </text>
            </view>
            <text
              v-if="classic.hasAI"
              class="absolute"
              style="top: 2px; right: 2px; background: rgba(168,85,247,0.9); font-size: 7px; padding: 0 2px; border-radius: 2px;"
            ></text>
          </view>
          <!-- 信息 -->
          <view class="flex-1 min-w-0 flex flex-col justify-between" style="padding: 2px 0;">
            <view>
              <view class="flex items-center gap-2 mb-1">
                <text class="font-medium text-sm">{{ classic.title }}</text>
                <text style="background: #F5F1EB; font-size: 10px; padding: 1px 6px; border-radius: 4px; white-space: nowrap;">{{ classic.dynasty }}</text>
                <text v-if="classic.isFree" class="text-white" style="background: #22c55e; font-size: 10px; padding: 1px 6px; border-radius: 4px; white-space: nowrap;">免费</text>
              </view>
              <text class="text-xs block" style="color: #999;">{{ classic.author }} · {{ classic.chapters }}篇</text>
              <text class="text-xs block mt-1" style="color: rgba(153,153,153,0.8); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ classic.description }}</text>
            </view>
            <view class="flex items-center gap-3 text-xs mt-1" style="color: #999;">
              <text class="flex items-center gap-0.5">
                <text style="color: #fbbf24;"></text>
                <text>{{ classic.rating }}</text>
              </text>
              <text class="flex items-center gap-0.5">
                <text></text>
                <text>{{ (classic.reads/10000).toFixed(1) }}万</text>
              </text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部导航栏 -->
    <view class="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border flex items-start justify-around pt-1.5 pb-[env(safe-area-inset-bottom,0)]">
      <view
        v-for="tab in bottomTabs"
        :key="tab.id"
        class="flex flex-col items-center gap-0.5 py-1.5 min-w-[64px]"
        @click="onBottomTabTap(tab)"
      >
        <text class="text-xl leading-none">{{ tab.icon }}</text>
        <text :class="['text-[10px]', tab.active ? 'text-primary font-medium' : 'text-muted-foreground']">{{ tab.label }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface MainCategory {
  id: string
  name: string
  icon: string
  desc: string
  color: string
}

interface SubCategory {
  id: string
  name: string
}

interface Classic {
  id: number
  title: string
  author: string
  dynasty: string
  category: string
  subCategory: string
  chapters: number
  description: string
  reads: number
  rating: number
  hasAI: boolean
  isFree: boolean
  cover: string
}

interface BookList {
  id: number
  title: string
  count: number
  icon: string
}

interface BottomTab {
  id: string
  label: string
  icon: string
  page: string
  active: boolean
}

// 经部、史部、子部、集部 - 四库全书分类
const mainCategories: MainCategory[] = [
  { id: 'jing', name: '经部', icon: '📜', desc: '儒家经典', color: 'from-amber-500 to-orange-500' },
  { id: 'shi', name: '史部', icon: '', desc: '历史典籍', color: 'from-blue-500 to-indigo-500' },
  { id: 'zi', name: '子部', icon: '🔮', desc: '诸子百家', color: 'from-purple-500 to-violet-500' },
  { id: 'ji', name: '集部', icon: '✒️', desc: '文学作品', color: 'from-emerald-500 to-teal-500' },
]

// 子分类
const subCategories: SubCategory[] = [
  { id: 'all', name: '全部' },
  { id: 'yijing', name: '易学' },
  { id: 'mingli', name: '命理' },
  { id: 'fengshui', name: '风水' },
  { id: 'yixue', name: '医学' },
  { id: 'rujia', name: '儒家' },
  { id: 'daojia', name: '道家' },
  { id: 'foxue', name: '佛学' },
]

// 古籍数据
const classicsData: Classic[] = [
  { id: 1, title: '周易', author: '伏羲/周文王', dynasty: '周', category: 'jing', subCategory: 'yijing', chapters: 64, description: '群经之首，大道之源', reads: 128600, rating: 4.9, hasAI: true, isFree: true, cover: 'ancient' },
  { id: 2, title: '道德经', author: '老子', dynasty: '春秋', category: 'zi', subCategory: 'daojia', chapters: 81, description: '道法自然，无为而治', reads: 145600, rating: 4.9, hasAI: true, isFree: true, cover: 'ancient' },
  { id: 3, title: '论语', author: '孔子门人', dynasty: '春秋', category: 'jing', subCategory: 'rujia', chapters: 20, description: '仁义礼智，修身齐家', reads: 156800, rating: 4.9, hasAI: true, isFree: true, cover: 'ancient' },
  { id: 4, title: '滴天髓', author: '刘基', dynasty: '明', category: 'zi', subCategory: 'mingli', chapters: 52, description: '八字命理经典，字字珠玑', reads: 86200, rating: 4.8, hasAI: true, isFree: false, cover: 'classic' },
  { id: 5, title: '子平真诠', author: '沈孝瞻', dynasty: '清', category: 'zi', subCategory: 'mingli', chapters: 40, description: '格局用神，系统阐述', reads: 68500, rating: 4.9, hasAI: true, isFree: false, cover: 'classic' },
  { id: 6, title: '紫微斗数全书', author: '陈希夷', dynasty: '宋', category: 'zi', subCategory: 'mingli', chapters: 36, description: '紫微斗数权威典籍', reads: 52800, rating: 4.8, hasAI: true, isFree: false, cover: 'classic' },
  { id: 7, title: '葬书', author: '郭璞', dynasty: '晋', category: 'zi', subCategory: 'fengshui', chapters: 3, description: '风水学开山之作', reads: 38600, rating: 4.7, hasAI: true, isFree: true, cover: 'ancient' },
  { id: 8, title: '黄帝内经', author: '佚名', dynasty: '战国', category: 'zi', subCategory: 'yixue', chapters: 162, description: '中医学奠基之作', reads: 98500, rating: 4.9, hasAI: true, isFree: true, cover: 'ancient' },
  { id: 9, title: '穷通宝鉴', author: '余春台', dynasty: '清', category: 'zi', subCategory: 'mingli', chapters: 12, description: '调候用神专著', reads: 42600, rating: 4.7, hasAI: true, isFree: false, cover: 'classic' },
  { id: 10, title: '三命通会', author: '万民英', dynasty: '明', category: 'zi', subCategory: 'mingli', chapters: 12, description: '命理学集大成', reads: 56800, rating: 4.8, hasAI: true, isFree: false, cover: 'classic' },
]

// 推荐书单
const bookLists: BookList[] = [
  { id: 1, title: '八字入门必读', count: 5, icon: '' },
  { id: 2, title: '风水经典', count: 8, icon: '🏠' },
  { id: 3, title: '国学基础', count: 10, icon: '' },
]

// 底部导航
const bottomTabs = ref<BottomTab[]>([
  { id: 'home', label: '首页', icon: '🏠', page: '/pages/index/index', active: false },
  { id: 'discover', label: '发现', icon: '', page: '/pages/discover/index', active: false },
  { id: 'classics', label: '古籍', icon: '', page: '/pages/classics/index', active: true },
  { id: 'profile', label: '我的', icon: '', page: '/pages/profile/index', active: false },
])

const searchQuery = ref('')
const activeMainCat = ref<string | null>(null)
const activeSubCat = ref('all')
const viewMode = ref<'grid' | 'list'>('grid')
const onlyFree = ref(false)
const onlyAI = ref(false)

const filteredClassics = computed(() => {
  return classicsData.filter(classic => {
    const matchMainCat = !activeMainCat.value || classic.category === activeMainCat.value
    const matchSubCat = activeSubCat.value === 'all' || classic.subCategory === activeSubCat.value
    const matchSearch = !searchQuery.value || classic.title.includes(searchQuery.value) || classic.author.includes(searchQuery.value)
    const matchFree = !onlyFree.value || classic.isFree
    const matchAI = !onlyAI.value || classic.hasAI
    return matchMainCat && matchSubCat && matchSearch && matchFree && matchAI
  })
})

function getCatGradientStyle(color: string): string {
  const gradientMap: Record<string, string> = {
    'from-amber-500 to-orange-500': 'linear-gradient(135deg, #f59e0b, #f97316)',
    'from-blue-500 to-indigo-500': 'linear-gradient(135deg, #3b82f6, #6366f1)',
    'from-purple-500 to-violet-500': 'linear-gradient(135deg, #a855f7, #8b5cf6)',
    'from-emerald-500 to-teal-500': 'linear-gradient(135deg, #10b981, #14b8a6)',
  }
  return `background: ${gradientMap[color] || gradientMap['from-amber-500 to-orange-500']};`
}

function getCoverGradient(coverType: string): string {
  if (coverType === 'ancient') {
    return 'background: linear-gradient(to bottom, #fef3c7, #fffbeb, #fef3c7)'
  }
  return 'background: linear-gradient(to bottom, #e7e5e4, #f5f5f4, #e7e5e4)'
}

function toggleMainCat(id: string) {
  activeMainCat.value = activeMainCat.value === id ? null : id
}

function goBack() {
  uni.navigateBack()
}

function goTo(url: string) {
  uni.navigateTo({ url })
}

function onBottomTabTap(tab: BottomTab) {
  if (tab.active) return
  uni.switchTab({ url: tab.page })
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
