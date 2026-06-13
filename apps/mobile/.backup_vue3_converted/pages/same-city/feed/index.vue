<template>
  <view class="min-h-screen bg-background">
    <!-- 头部 -->
    <view class="sticky top-0 z-10 bg-background border-b border-border">
      <!-- 顶部行：返回、城市选择、刷新 -->
      <view class="flex items-center gap-3 px-4 py-3">
        <view class="p-1" @click="goBack">
          <text class="text-xl text-foreground">&larr;</text>
        </view>
        <view class="flex items-center gap-1" @click="showCitySelector = true">
          <text class="text-base">📍</text>
          <text class="font-medium text-foreground">{{ locating ? '定位中...' : currentCity }}</text>
          <text class="text-sm text-muted-foreground">▼</text>
        </view>
        <view class="flex-1" />
        <view
          :class="['p-2', refreshing ? 'opacity-50' : '']"
          @click="!refreshing && loadData(true)"
        >
          <text :class="refreshing ? 'inline-block animate-spin' : ''"></text>
        </view>
      </view>

      <!-- 定位失败提示 -->
      <view
        v-if="locationError"
        class="px-4 py-2 flex items-center justify-between"
        style="background-color: #FFFBEB;"
      >
        <text class="text-sm" style="color: #B45309;">定位失败，请手动选择城市</text>
        <text class="text-xs text-primary" @click="requestLocation">重试</text>
      </view>

      <!-- 筛选 Tab -->
      <scroll-view scroll-x class="px-4 py-2" style="white-space: nowrap;">
        <view
          v-for="tab in filterTabs"
          :key="tab.key"
          :class="[
            'inline-flex items-center justify-center px-4 py-1.5 rounded-full text-sm mr-2',
            activeTab === tab.key
              ? 'bg-primary text-white'
              : 'bg-secondary text-muted-foreground'
          ]"
          @click="activeTab = tab.key"
        >
          <text>{{ tab.label }}</text>
        </view>
      </scroll-view>
    </view>

    <!-- 内容区域 -->
    <view class="p-4">
      <!-- 加载状态 -->
      <view v-if="loading && items.length === 0" class="space-y-4">
        <view
          v-for="i in 3"
          :key="i"
          class="bg-secondary rounded-lg animate-pulse"
          style="height: 256px;"
        />
      </view>

      <!-- 空状态 -->
      <view v-else-if="items.length === 0" class="flex flex-col items-center justify-center py-16">
        <text class="text-4xl opacity-50 mb-3">🧭</text>
        <text class="text-sm text-muted-foreground">暂无附近内容</text>
        <text class="text-xs text-muted-foreground mt-1">换个城市或类型试试</text>
      </view>

      <!-- 内容卡片列表 -->
      <view v-else class="space-y-4">
        <view
          v-for="item in items"
          :key="item.id"
          class="bg-white rounded-lg overflow-hidden border border-border transition-transform"
          hover-class="scale-[0.98]"
          @click="handleItemClick(item)"
        >
          <!-- 封面 -->
          <view class="relative" style="aspect-ratio: 16 / 9;">
            <image
              :src="item.cover"
              mode="aspectFill"
              class="w-full h-full"
            />
            <!-- 类型标签 -->
            <view
              :class="[
                'absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-medium',
                getContentTypeColor(item.type)
              ]"
            >
              <text>{{ getContentTypeLabel(item.type) }}</text>
            </view>
            <!-- 距离标签 -->
            <view
              v-if="item.location.distance !== undefined"
              class="absolute top-2 right-2 px-2 py-0.5 rounded text-white text-xs flex items-center gap-1"
              style="background-color: rgba(0, 0, 0, 0.6);"
              @click.stop="handleNavigateClick(item)"
            >
              <text>🧭</text>
              <text>{{ formatDistance(item.location.distance) }}</text>
            </view>
            <!-- 视频播放按钮 -->
            <view
              v-if="item.type === 'video'"
              class="absolute inset-0 flex items-center justify-center"
            >
              <view class="w-12 h-12 rounded-full flex items-center justify-center" style="background-color: rgba(0, 0, 0, 0.5);">
                <text class="text-white text-2xl">▶</text>
              </view>
            </view>
            <!-- 价格/免费标签 -->
            <view
              v-if="item.price !== undefined || item.isFree"
              class="absolute bottom-2 right-2 px-2 py-0.5 rounded text-white text-xs font-medium bg-primary"
            >
              <text>{{ item.isFree ? '免费' : '¥' + item.price }}</text>
            </view>
          </view>

          <!-- 内容 -->
          <view class="p-3">
            <text class="font-medium text-foreground line-clamp-2 mb-1 block">{{ item.title }}</text>
            <text
              v-if="item.description"
              class="text-sm text-muted-foreground line-clamp-2 mb-2 block"
            >{{ item.description }}</text>

            <!-- 时间信息 -->
            <view v-if="item.startTime" class="flex items-center gap-1 text-xs text-muted-foreground mb-2">
              <text></text>
              <text>{{ item.startTime.split(' ')[0] }}</text>
              <text v-if="item.status" class="text-primary ml-1">· {{ item.status }}</text>
            </view>

            <!-- 位置 -->
            <view class="flex items-center gap-1 text-xs text-muted-foreground mb-2">
              <text>📍</text>
              <text class="truncate">{{ item.location.name }}</text>
            </view>

            <!-- 统计和作者 -->
            <view class="flex items-center justify-between">
              <view class="flex items-center gap-3 text-xs text-muted-foreground">
                <text v-if="item.participantCount !== undefined" class="flex items-center gap-0.5">
                   {{ item.participantCount }}人
                </text>
                <text v-if="item.viewCount !== undefined" class="flex items-center gap-0.5">
                   {{ item.viewCount }}
                </text>
                <text v-if="item.likeCount !== undefined" class="flex items-center gap-0.5">
                  ♥ {{ item.likeCount }}
                </text>
                <text v-if="item.commentCount !== undefined" class="flex items-center gap-0.5">
                   {{ item.commentCount }}
                </text>
              </view>
              <view v-if="item.author" class="flex items-center gap-1">
                <image
                  :src="item.author.avatar"
                  class="w-4 h-4 rounded-full"
                  mode="aspectFill"
                />
                <text class="text-xs text-muted-foreground">{{ item.author.name }}</text>
              </view>
            </view>

            <!-- 标签 -->
            <view v-if="item.tags && item.tags.length > 0" class="flex flex-wrap gap-1 mt-2">
              <text
                v-for="(tag, tagIndex) in item.tags.slice(0, 3)"
                :key="tagIndex"
                class="px-1.5 py-0.5 text-xs bg-secondary text-muted-foreground rounded"
              >{{ tag }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 城市选择器弹窗 -->
    <view v-if="showCitySelector" class="fixed inset-0 z-50 bg-background">
      <!-- 头部搜索 -->
      <view class="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
        <view class="flex items-center gap-3">
          <view class="p-1" @click="showCitySelector = false">
            <text class="text-lg">✕</text>
          </view>
          <view class="flex-1 relative">
            <text class="absolute left-3 top-1/2 text-muted-foreground" style="transform: translateY(-50%);"></text>
            <input
              v-model="cityKeyword"
              placeholder="搜索城市"
              class="w-full h-9 pl-9 pr-3 rounded-lg bg-secondary text-sm text-foreground"
              style="box-sizing: border-box;"
            />
          </view>
        </view>
      </view>

      <view class="p-4 pb-20 overflow-y-auto" style="height: calc(100vh - 116px);">
        <!-- 加载中 -->
        <view v-if="cityLoading" class="space-y-4">
          <view class="bg-secondary rounded-lg animate-pulse" style="height: 80px;" />
          <view class="bg-secondary rounded-lg animate-pulse" style="height: 160px;" />
        </view>
        <view v-else>
          <!-- 当前定位 -->
          <view class="mb-4">
            <text class="text-sm text-muted-foreground mb-2 block">当前定位</text>
            <view
              class="flex items-center gap-2 p-3 rounded-lg"
              style="background-color: rgba(196, 30, 58, 0.05);"
            >
              <text class="text-base">📍</text>
              <text class="text-sm font-medium text-foreground">{{ currentCity || '定位中...' }}</text>
            </view>
          </view>

          <!-- 热门城市 -->
          <view v-if="!cityKeyword && hotCities.length > 0" class="mb-4">
            <text class="text-sm text-muted-foreground mb-2 block">热门城市</text>
            <view class="grid grid-cols-4 gap-2">
              <view
                v-for="city in hotCities"
                :key="city.code"
                :class="[
                  'p-2 text-sm rounded-lg border text-center',
                  currentCity === city.name
                    ? 'border-primary text-primary'
                    : 'border-border text-foreground bg-white'
                ]"
                @click="selectCity({ code: city.code, name: city.name, pinyin: '', firstLetter: '' })"
              >
                <text>{{ city.name }}</text>
              </view>
            </view>
          </view>

          <!-- 城市列表 -->
          <view>
            <text class="text-sm text-muted-foreground mb-2 block">
              {{ cityKeyword ? '搜索结果' : '全部城市' }}
            </text>
            <view
              v-for="[letter, cities] in groupedCityEntries"
              :key="letter"
              class="mb-3"
            >
              <text class="text-xs text-muted-foreground mb-1 block">{{ letter }}</text>
              <view class="grid grid-cols-4 gap-2">
                <view
                  v-for="city in cities"
                  :key="city.code"
                  :class="[
                    'p-2 text-sm rounded-lg border text-center',
                    currentCity === city.name
                      ? 'border-primary text-primary'
                      : 'border-border text-foreground bg-white'
                  ]"
                  @click="selectCity(city)"
                >
                  <text>{{ city.name }}</text>
                </view>
              </view>
            </view>
            <view
              v-if="cityKeyword && searchResults.length === 0"
              class="text-center text-muted-foreground py-8"
            >
              <text>未找到相关城市</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'

// ========== 类型定义 ==========
type SameCityContentType = 'activity' | 'course' | 'circle' | 'station' | 'article' | 'video'

interface SameCityItem {
  id: string
  type: SameCityContentType
  title: string
  description?: string
  cover: string
  location: {
    name: string
    distance?: number
    latitude: number
    longitude: number
  }
  startTime?: string
  status?: string
  price?: number
  isFree?: boolean
  participantCount?: number
  viewCount?: number
  likeCount?: number
  commentCount?: number
  author?: {
    name: string
    avatar: string
  }
  tags?: string[]
}

interface City {
  code: string
  name: string
  pinyin: string
  firstLetter: string
}

interface HotCity {
  code: string
  name: string
}

// ========== Mock 数据 ==========
const mockItems: SameCityItem[] = [
  {
    id: '1',
    type: 'activity',
    title: '周末易经读书会 — 乾卦精讲',
    description: '本周六下午两点，我们一起研读易经乾卦，探讨「天行健，君子以自强不息」的现代意义。',
    cover: 'https://picsum.photos/seed/gxactivity1/400/225',
    location: { name: '朝阳区国学馆', distance: 1.2, latitude: 39.92, longitude: 116.46 },
    startTime: '2026-06-13 14:00',
    status: '报名中',
    price: 0,
    isFree: true,
    participantCount: 23,
    viewCount: 156,
    likeCount: 12,
    commentCount: 5,
    author: { name: '国学君', avatar: 'https://picsum.photos/seed/gxavatar1/100/100' },
    tags: ['易经', '乾卦', '读书会']
  },
  {
    id: '2',
    type: 'course',
    title: '八字命理基础班（零基础可入）',
    description: '零基础学会排八字，掌握十神、五行生克基础概念，结课可排简单命盘。',
    cover: 'https://picsum.photos/seed/gxcourses1/400/225',
    location: { name: '海淀区文化中心', distance: 3.5, latitude: 39.95, longitude: 116.32 },
    startTime: '2026-06-14 09:00',
    status: '即将开始',
    price: 299,
    isFree: false,
    participantCount: 15,
    viewCount: 289,
    likeCount: 8,
    commentCount: 3,
    author: { name: '李老师', avatar: 'https://picsum.photos/seed/gxavatar2/100/100' },
    tags: ['八字', '命理', '基础']
  },
  {
    id: '3',
    type: 'circle',
    title: '北京周易爱好者圈子',
    description: '易友交流、每周线上共修、线下活动通知，欢迎各阶段易友加入。',
    cover: 'https://picsum.photos/seed/gxcircle1/400/225',
    location: { name: '线上 + 线下', distance: 0, latitude: 39.90, longitude: 116.40 },
    participantCount: 87,
    viewCount: 1024,
    likeCount: 45,
    commentCount: 23,
    tags: ['周易', '交流', '共修']
  },
  {
    id: '4',
    type: 'station',
    title: '朝阳分站 — 国学体验空间',
    description: '免费提供国学书籍借阅、茶道体验、静坐空间，欢迎来访。',
    cover: 'https://picsum.photos/seed/gxstation1/400/225',
    location: { name: '朝阳区建国路88号', distance: 2.1, latitude: 39.91, longitude: 116.47 },
    participantCount: 156,
    viewCount: 456,
    likeCount: 32,
    tags: ['驿站', '免费', '体验']
  },
  {
    id: '5',
    type: 'article',
    title: '《梅花易数》占卜实例：今日出行吉凶',
    description: '以今天日期起卦，解析出行注意事项，附带占卜全过程讲解。',
    cover: 'https://picsum.photos/seed/gxarticle1/400/225',
    location: { name: '线上', distance: 0, latitude: 0, longitude: 0 },
    viewCount: 892,
    likeCount: 67,
    commentCount: 34,
    author: { name: '张先生', avatar: 'https://picsum.photos/seed/gxavatar3/100/100' },
    tags: ['梅花易数', '占卜', '出行']
  },
  {
    id: '6',
    type: 'video',
    title: '六爻占卜入门教程：如何起卦',
    description: '详细讲解六爻起卦全流程，附带三个实例演示，包教包会。',
    cover: 'https://picsum.photos/seed/gxvideo1/400/225',
    location: { name: '线上', distance: 0, latitude: 0, longitude: 0 },
    viewCount: 2340,
    likeCount: 128,
    commentCount: 56,
    author: { name: '王道长', avatar: 'https://picsum.photos/seed/gxavatar4/100/100' },
    tags: ['六爻', '教程', '起卦']
  }
]

const mockHotCities: HotCity[] = [
  { code: '110000', name: '北京' },
  { code: '310000', name: '上海' },
  { code: '440100', name: '广州' },
  { code: '440305', name: '深圳' },
  { code: '330100', name: '杭州' },
  { code: '510100', name: '成都' },
  { code: '420100', name: '武汉' },
  { code: '610100', name: '西安' }
]

const mockAllCities: City[] = [
  { code: '110000', name: '北京', pinyin: 'beijing', firstLetter: 'B' },
  { code: '430100', name: '长沙', pinyin: 'changsha', firstLetter: 'C' },
  { code: '510100', name: '成都', pinyin: 'chengdu', firstLetter: 'C' },
  { code: '500000', name: '重庆', pinyin: 'chongqing', firstLetter: 'C' },
  { code: '210200', name: '大连', pinyin: 'dalian', firstLetter: 'D' },
  { code: '441900', name: '东莞', pinyin: 'dongguan', firstLetter: 'D' },
  { code: '350100', name: '福州', pinyin: 'fuzhou', firstLetter: 'F' },
  { code: '440100', name: '广州', pinyin: 'guangzhou', firstLetter: 'G' },
  { code: '520100', name: '贵阳', pinyin: 'guiyang', firstLetter: 'G' },
  { code: '330100', name: '杭州', pinyin: 'hangzhou', firstLetter: 'H' },
  { code: '230100', name: '哈尔滨', pinyin: 'haerbin', firstLetter: 'H' },
  { code: '370100', name: '济南', pinyin: 'jinan', firstLetter: 'J' },
  { code: '530100', name: '昆明', pinyin: 'kunming', firstLetter: 'K' },
  { code: '620100', name: '兰州', pinyin: 'lanzhou', firstLetter: 'L' },
  { code: '540100', name: '拉萨', pinyin: 'lasa', firstLetter: 'L' },
  { code: '320100', name: '南京', pinyin: 'nanjing', firstLetter: 'N' },
  { code: '360100', name: '南昌', pinyin: 'nanchang', firstLetter: 'N' },
  { code: '370200', name: '青岛', pinyin: 'qingdao', firstLetter: 'Q' },
  { code: '310000', name: '上海', pinyin: 'shanghai', firstLetter: 'S' },
  { code: '210100', name: '沈阳', pinyin: 'shenyang', firstLetter: 'S' },
  { code: '440305', name: '深圳', pinyin: 'shenzhen', firstLetter: 'S' },
  { code: '320500', name: '苏州', pinyin: 'suzhou', firstLetter: 'S' },
  { code: '120000', name: '天津', pinyin: 'tianjin', firstLetter: 'T' },
  { code: '140100', name: '太原', pinyin: 'taiyuan', firstLetter: 'T' },
  { code: '420100', name: '武汉', pinyin: 'wuhan', firstLetter: 'W' },
  { code: '330300', name: '温州', pinyin: 'wenzhou', firstLetter: 'W' },
  { code: '350200', name: '厦门', pinyin: 'xiamen', firstLetter: 'X' },
  { code: '610100', name: '西安', pinyin: 'xian', firstLetter: 'X' },
  { code: '410100', name: '郑州', pinyin: 'zhengzhou', firstLetter: 'Z' },
  { code: '442000', name: '中山', pinyin: 'zhongshan', firstLetter: 'Z' }
]

// ========== 辅助函数 ==========
function getContentTypeLabel(type: SameCityContentType): string {
  const map: Record<SameCityContentType, string> = {
    activity: '活动',
    course: '课程',
    circle: '圈子',
    station: '驿站',
    article: '文章',
    video: '视频'
  }
  return map[type] || '其他'
}

function getContentTypeColor(type: SameCityContentType): string {
  const map: Record<SameCityContentType, string> = {
    activity: 'bg-[#3B82F6] text-white',
    course: 'bg-[#10B981] text-white',
    circle: 'bg-[#F59E0B] text-white',
    station: 'bg-[#8B5CF6] text-white',
    article: 'bg-[#6B7280] text-white',
    video: 'bg-[#EF4444] text-white'
  }
  return map[type] || 'bg-[#6B7280] text-white'
}

function formatDistance(distance: number): string {
  if (distance < 1) return '<1km'
  if (distance < 10) return distance + 'km'
  return '>10km'
}

function getNavigationUrl(location: SameCityItem['location']): string {
  return `https://uri.amap.com/marker?position=${location.longitude},${location.latitude}`
}

// ========== 页面主状态 ==========
const currentCity = ref('北京')
const location = ref<{ latitude: number; longitude: number } | null>(null)
const locating = ref(false)
const locationError = ref(false)
const showCitySelector = ref(false)

const activeTab = ref<SameCityContentType | 'all'>('all')
const items = ref<SameCityItem[]>([])
const loading = ref(true)
const refreshing = ref(false)

const filterTabs = [
  { key: 'all' as const, label: '全部' },
  { key: 'activity' as const, label: '活动' },
  { key: 'course' as const, label: '课程' },
  { key: 'circle' as const, label: '圈子' },
  { key: 'station' as const, label: '驿站' }
]

// ========== 定位 ==========
function requestLocation() {
  locating.value = true
  locationError.value = false

  if (typeof uni !== 'undefined' && uni.getLocation) {
    uni.getLocation({
      type: 'gcj02',
      success: (res) => {
        location.value = {
          latitude: res.latitude,
          longitude: res.longitude
        }
        locating.value = false
        currentCity.value = '北京'
      },
      fail: () => {
        locating.value = false
        locationError.value = true
      }
    })
  } else {
    // Mock 直接用北京
    setTimeout(() => {
      location.value = { latitude: 39.92, longitude: 116.46 }
      locating.value = false
      currentCity.value = '北京'
    }, 800)
  }
}

// ========== 数据加载 ==========
async function loadData(refresh = false) {
  if (refresh) refreshing.value = true
  else loading.value = true

  return new Promise<void>((resolve) => {
    setTimeout(() => {
      let filtered = [...mockItems]
      if (activeTab.value !== 'all') {
        filtered = filtered.filter(
          (item) => item.type === activeTab.value
        )
      }
      items.value = filtered
      loading.value = false
      refreshing.value = false
      resolve()
    }, 500)
  })
}

watch(
  [currentCity, activeTab, location],
  () => {
    loadData()
  },
  { immediate: true }
)

onMounted(() => {
  requestLocation()
})

// ========== 导航 ==========
function goBack() {
  uni.navigateBack()
}

function handleItemClick(item: SameCityItem) {
  const routes: Record<SameCityContentType, string> = {
    activity: '/pages/same-city/activities/index?id=' + item.id,
    course: '/pages/same-city/courses/index?id=' + item.id,
    circle: '/pages/same-city/circles/index?id=' + item.id,
    station: '/pages/same-city/stations/index?id=' + item.id,
    article: '/pages/same-city/articles/index?id=' + item.id,
    video: '/pages/same-city/videos/index?id=' + item.id
  }
  const url = routes[item.type] || '/pages/same-city/detail/index?id=' + item.id
  uni.navigateTo({ url })
}

function handleNavigateClick(item: SameCityItem) {
  const url = getNavigationUrl(item.location)
  uni.openLocation({
    latitude: item.location.latitude,
    longitude: item.location.longitude,
    name: item.location.name
  })
}

// ========== 城市选择 ==========
const cityKeyword = ref('')
const hotCities = ref<HotCity[]>([])
const allCities = ref<City[]>([])
const searchResults = ref<City[]>([])
const cityLoading = ref(true)

onMounted(() => {
  setTimeout(() => {
    hotCities.value = mockHotCities
    allCities.value = mockAllCities
    cityLoading.value = false
  }, 300)
})

watch(cityKeyword, (val) => {
  if (val) {
    setTimeout(() => {
      searchResults.value = allCities.value.filter(
        (c) =>
          c.name.includes(val) ||
          c.pinyin.toLowerCase().includes(val.toLowerCase())
      )
    }, 200)
  } else {
    searchResults.value = []
  }
})

const groupedCityEntries = computed(() => {
  const display = cityKeyword.value ? searchResults.value : allCities.value
  const groups: Record<string, City[]> = {}
  for (const city of display) {
    const letter = city.firstLetter.toUpperCase()
    if (!groups[letter]) groups[letter] = []
    groups[letter].push(city)
  }
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
})

function selectCity(city: City) {
  currentCity.value = city.name
  showCitySelector.value = false
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
