<template>
  <view class="min-h-screen bg-background">

    <!-- 顶部搜索栏 -->
    <view class="sticky top-0 z-50 bg-background/95 border-b border-border">
      <view class="flex items-center gap-2 px-3 py-3">
        <!-- 返回 -->
        <view
          class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted flex-shrink-0"
          @tap="goBack"
        >
          <svg class="w-5 h-5 text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </view>

        <!-- 搜索输入框 -->
        <view class="flex-1 relative">
          <view class="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg class="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
          </view>
          <input
            type="text"
            v-model="keyword"
            placeholder="搜索圈子、课程、商品..."
            placeholder-class="text-muted-foreground"
            class="w-full h-10 pl-9 pr-9 bg-muted rounded-full text-sm text-foreground focus:outline-none"
            @input="onInput"
            @confirm="doSearch()"
            focus
          />
          <view
            v-if="keyword"
            class="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center"
            @tap="clearKeyword"
          >
            <svg class="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </view>
        </view>

        <!-- 搜索/取消按钮 -->
        <view
          class="px-3 py-2 flex-shrink-0"
          @tap="keyword ? doSearch() : goBack()"
        >
          <text :class="['text-sm font-medium', keyword ? 'text-primary' : 'text-muted-foreground']">
            {{ keyword ? '搜索' : '取消' }}
          </text>
        </view>
      </view>

      <!-- 结果 Tab 栏 -->
      <scroll-view v-if="hasResults" scroll-x show-scrollbar="false" class="px-3 pb-2">
        <view class="flex items-center gap-1 whitespace-nowrap">
          <view
            v-for="tab in resultTabs"
            :key="tab.id"
            :class="[
              'flex items-center gap-1 px-3 py-1.5 text-sm rounded-full transition-all flex-shrink-0',
              activeTab === tab.id
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted'
            ]"
            @tap="activeTab = tab.id"
          >
            <view v-html="tab.svg" class="w-3.5 h-3.5" />
            <text>{{ tab.label }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 内容区 -->
    <scroll-view scroll-y class="flex-1">
      <view class="p-4">

        <!-- 搜索中 -->
        <view v-if="isSearching" class="flex items-center justify-center py-12 gap-2">
          <view class="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <text class="text-sm text-muted-foreground">搜索中...</text>
        </view>

        <!-- 搜索结果 -->
        <view v-else-if="hasResults">
          <!-- 全部 Tab -->
          <view v-if="activeTab === 'all'" class="space-y-4">
            <!-- 圈子 -->
            <view>
              <view class="flex items-center justify-between mb-2">
                <text class="text-sm font-medium text-foreground">圈子</text>
                <text class="text-xs text-primary" @tap="activeTab = 'circles'">查看全部</text>
              </view>
              <view
                v-for="c in mockResults.circles.slice(0, 2)"
                :key="c.id"
                class="flex items-center gap-3 p-3 bg-card rounded-xl mb-2"
              >
                <view class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <svg class="w-6 h-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </view>
                <view class="flex-1 min-w-0">
                  <text class="text-sm font-medium text-foreground">{{ c.name }}</text>
                  <text class="text-xs text-muted-foreground line-clamp-1 mt-0.5">{{ c.highlight }}</text>
                  <text class="text-xs text-muted-foreground mt-0.5">{{ c.members.toLocaleString() }}人</text>
                </view>
                <view class="px-3 py-1 border border-primary text-primary text-xs rounded-full flex-shrink-0">
                  <text>加入</text>
                </view>
              </view>
            </view>

            <!-- 课程 -->
            <view>
              <view class="flex items-center justify-between mb-2">
                <text class="text-sm font-medium text-foreground">课程</text>
                <text class="text-xs text-primary" @tap="activeTab = 'courses'">查看全部</text>
              </view>
              <view
                v-for="c in mockResults.courses.slice(0, 2)"
                :key="c.id"
                class="flex gap-3 p-3 bg-card rounded-xl mb-2"
                @tap="navigateTo(`/pages/courses/detail?id=${c.id}`)"
              >
                <view class="w-24 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <svg class="w-8 h-8 text-muted-foreground/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                  </svg>
                </view>
                <view class="flex-1 min-w-0">
                  <text class="text-sm font-medium text-foreground line-clamp-1">{{ c.title }}</text>
                  <text class="text-xs text-muted-foreground mt-0.5">{{ c.instructor }} · {{ c.students }}人学习</text>
                  <view class="flex items-baseline gap-2 mt-1">
                    <text class="text-primary font-semibold">¥{{ c.price }}</text>
                    <text class="text-xs text-muted-foreground line-through">¥{{ c.originalPrice }}</text>
                  </view>
                </view>
              </view>
            </view>

            <!-- 商品 -->
            <view>
              <view class="flex items-center justify-between mb-2">
                <text class="text-sm font-medium text-foreground">商品</text>
                <text class="text-xs text-primary" @tap="activeTab = 'products'">查看全部</text>
              </view>
              <view
                v-for="p in mockResults.products.slice(0, 2)"
                :key="p.id"
                class="flex gap-3 p-3 bg-card rounded-xl mb-2"
                @tap="navigateTo(`/pages/mall/product?id=${p.id}`)"
              >
                <view class="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <svg class="w-6 h-6 text-muted-foreground/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                    <line x1="3" y1="6" x2="21" y2="6"/>
                    <path d="M16 10a4 4 0 0 1-8 0"/>
                  </svg>
                </view>
                <view class="flex-1 min-w-0">
                  <text class="text-sm font-medium text-foreground line-clamp-2">{{ p.name }}</text>
                  <view class="flex items-baseline gap-2 mt-1">
                    <text class="text-primary font-semibold">¥{{ p.price }}</text>
                    <text class="text-xs text-muted-foreground line-through">¥{{ p.originalPrice }}</text>
                  </view>
                  <text class="text-xs text-muted-foreground">已售 {{ p.sales }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 搜索联想 -->
        <view v-else-if="keyword && suggestions.length" class="space-y-0.5">
          <view
            v-for="(s, i) in suggestions"
            :key="i"
            class="flex items-center justify-between px-3 py-3 rounded-lg hover:bg-muted/50 transition-colors"
            @tap="doSearch(s.keyword)"
          >
            <view class="flex items-center gap-3">
              <svg class="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
              <text class="text-sm text-foreground">
                <text class="text-primary">{{ keyword }}</text>{{ s.keyword.slice(keyword.length) }}
              </text>
            </view>
            <text class="text-xs text-muted-foreground">约{{ (s.count / 1000).toFixed(1) }}k条</text>
          </view>
        </view>

        <!-- 初始态 -->
        <view v-else class="space-y-6">
          <!-- 搜索历史 -->
          <view v-if="searchHistory.length">
            <view class="flex items-center justify-between mb-3">
              <text class="text-sm font-medium text-foreground">搜索历史</text>
              <view
                class="p-1 rounded-full hover:bg-muted"
                @tap="searchHistory = []"
              >
                <svg class="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
              </view>
            </view>
            <view class="flex flex-wrap gap-2">
              <view
                v-for="(h, i) in searchHistory"
                :key="i"
                class="px-3 py-1.5 bg-muted text-sm text-foreground rounded-full"
                @tap="doSearch(h)"
              >
                <text>{{ h }}</text>
              </view>
            </view>
          </view>

          <!-- 热门搜索 -->
          <view>
            <text class="text-sm font-medium text-foreground mb-3 block">热门搜索</text>
            <view class="space-y-0.5">
              <view
                v-for="(item, i) in hotSearches"
                :key="i"
                class="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors"
                @tap="doSearch(item.keyword)"
              >
                <view
                  :class="[
                    'w-5 h-5 rounded text-xs font-bold flex items-center justify-center flex-shrink-0',
                    item.rank <= 3
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  ]"
                >
                  <text>{{ item.rank }}</text>
                </view>
                <text class="text-sm text-foreground flex-1">{{ item.keyword }}</text>
                <view v-if="item.isHot">
                  <svg class="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
                  </svg>
                </view>
              </view>
            </view>
          </view>

          <!-- 猜你想搜 -->
          <view>
            <text class="text-sm font-medium text-foreground mb-3 block">猜你想搜</text>
            <view class="grid grid-cols-2 gap-2">
              <view
                v-for="(g, i) in guessItems"
                :key="i"
                class="flex items-center gap-3 p-3 bg-card rounded-xl"
                @tap="doSearch(g.label)"
              >
                <view class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <view v-html="g.svg" class="w-5 h-5 text-primary" />
                </view>
                <view>
                  <text class="text-sm font-medium text-foreground">{{ g.label }}</text>
                  <text class="text-xs text-muted-foreground block mt-0.5">{{ g.desc }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>

      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const keyword = ref('')
const isSearching = ref(false)
const hasResults = ref(false)
const activeTab = ref('all')
const searchHistory = ref(['八字排盘', '紫微斗数入门', '风水课程', '易经'])
const suggestions = ref<{ keyword: string; count: number }[]>([])

const resultTabs = [
  {
    id: 'all', label: '全部',
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>'
  },
  {
    id: 'circles', label: '圈子',
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>'
  },
  {
    id: 'courses', label: '课程',
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>'
  },
  {
    id: 'products', label: '商品',
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>'
  },
  {
    id: 'articles', label: '文章',
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>'
  },
  {
    id: 'users', label: '用户',
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
  },
]

const hotSearches = [
  { keyword: '八字入门', isHot: true, rank: 1 },
  { keyword: '紫微斗数', isHot: true, rank: 2 },
  { keyword: '风水布局', isHot: false, rank: 3 },
  { keyword: '奇门遁甲', isHot: true, rank: 4 },
  { keyword: '六爻预测', isHot: false, rank: 5 },
  { keyword: '梅花易数', isHot: false, rank: 6 },
  { keyword: '姓名学', isHot: false, rank: 7 },
  { keyword: '面相手相', isHot: false, rank: 8 },
]

const guessItems = [
  {
    label: 'AI八字分析', desc: '智能命盘解读',
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M12 11V5"/><circle cx="12" cy="4" r="1"/><path d="M7 16h.01M12 16h.01M17 16h.01"/></svg>'
  },
  {
    label: '入门必读', desc: '新手推荐课程',
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>'
  },
  {
    label: '热门圈子', desc: '万人交流社区',
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>'
  },
  {
    label: '经典古籍', desc: '传世典藏好书',
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>'
  },
]

const mockResults = {
  circles: [
    { id: 1, name: '八字命理研习社', highlight: '每日案例解析，从入门到精通的八字学习社区', members: 12800 },
    { id: 2, name: '紫微斗数爱好者', highlight: '紫微斗数系统学习，命盘解读、案例分析', members: 8560 },
  ],
  courses: [
    { id: 1, title: '八字命理入门精讲', instructor: '李明远', price: 299, originalPrice: 599, students: 1820 },
    { id: 2, title: '八字高级实战课程', instructor: '王易山', price: 599, originalPrice: 999, students: 986 },
  ],
  products: [
    { id: 1, name: '渊海子平（精装典藏版）', price: 128, originalPrice: 168, sales: 2680 },
    { id: 2, name: '命理学基础工具套装', price: 299, originalPrice: 399, sales: 1520 },
  ],
}

const allSuggestions: Record<string, { keyword: string; count: number }[]> = {
  '八': [{ keyword: '八字排盘', count: 12800 }, { keyword: '八字入门教程', count: 8560 }, { keyword: '八字看婚姻', count: 6280 }],
  '紫': [{ keyword: '紫微斗数', count: 15600 }, { keyword: '紫微斗数入门', count: 8920 }],
  '风': [{ keyword: '风水学', count: 18200 }, { keyword: '风水布局', count: 12800 }],
}

watch(keyword, (val) => {
  if (val && !hasResults.value) {
    const first = val[0]
    suggestions.value = (allSuggestions[first] || []).filter(s => s.keyword.includes(val))
  } else {
    suggestions.value = []
  }
})

function onInput() {}

function doSearch(kw?: string) {
  const q = kw || keyword.value
  if (!q.trim()) return
  keyword.value = q
  if (!searchHistory.value.includes(q)) searchHistory.value = [q, ...searchHistory.value.slice(0, 9)]
  isSearching.value = true
  setTimeout(() => { isSearching.value = false; hasResults.value = true }, 500)
}

function clearKeyword() { keyword.value = ''; hasResults.value = false }
function goBack() { uni.navigateBack() }
function navigateTo(url: string) { uni.navigateTo({ url }) }
</script>
