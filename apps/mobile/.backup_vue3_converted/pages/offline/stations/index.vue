<template>
  <view class="min-h-screen bg-background">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-50 bg-white border-b border-border">
      <view class="flex items-center justify-between px-4 h-14">
        <view class="flex items-center gap-3">
          <view class="p-1" hover-class="opacity-70" @click="goBack">
            <text class="text-lg" style="color:#2C2C2C">←</text>
          </view>
          <text class="text-lg font-semibold" style="color:#2C2C2C">线下驿站</text>
        </view>
        <view class="p-2 rounded-full" hover-class="bg-secondary" @click="toggleViewMode">
          <text class="text-base" style="color:#999">{{ viewMode === 'list' ? '🗺️' : '' }}</text>
        </view>
      </view>

      <!-- 搜索栏 -->
      <view class="px-4 pb-3">
        <view class="relative">
          <text class="absolute left-3 top-1/2 text-sm" style="color:#999;transform:translateY(-50%)"></text>
          <input
            class="w-full h-10 pl-10 pr-4 rounded-full text-sm placeholder-[#999]"
            style="background-color:#F5F1EB;color:#2C2C2C"
            placeholder="搜索驿站名称或地址"
            :value="searchKeyword"
            @input="onSearchInput"
          />
        </view>
      </view>

      <!-- 类型筛选 -->
      <view class="px-4 pb-3 flex gap-2 overflow-x-auto" style="white-space:nowrap">
        <view
          v-for="type in stationTypes"
          :key="type.value"
          class="inline-block px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors flex-shrink-0"
          :style="{
            backgroundColor: selectedType === type.value ? '#C41E3A' : '#F5F1EB',
            color: selectedType === type.value ? '#fff' : '#2C2C2C'
          }"
          hover-class="opacity-80"
          @click="selectedType = type.value; loadStations()"
        >
          <text>{{ type.label }}</text>
        </view>
      </view>
    </view>

    <!-- 内容区 -->
    <view class="p-4 space-y-6">
      <!-- 附近推荐（非搜索状态时显示） -->
      <view v-if="nearbyStations.length > 0 && !searchKeyword && selectedType === 'all'">
        <view class="flex items-center justify-between mb-3">
          <text class="font-semibold flex items-center gap-2" style="color:#2C2C2C">📍 附近驿站</text>
        </view>
        <scroll-view scroll-x class="flex gap-3 pb-2" enhanced show-scrollbar="false">
          <view
            v-for="station in nearbyStations"
            :key="station.id"
            class="inline-block w-64 flex-shrink-0 bg-white rounded-xl overflow-hidden"
            style="border:1px solid #E8E0D5"
            hover-class="opacity-95"
            @click="goToDetail(station.id)"
          >
            <view class="relative h-32" style="background-color:#F5F1EB">
              <image :src="station.cover" mode="aspectFill" class="w-full h-full" />
              <view
                class="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] text-white"
                style="background-color:rgba(196,30,58,0.9)"
              >
                <text>{{ formatDistance(station.distance) }}</text>
              </view>
            </view>
            <view class="p-3">
              <text class="font-medium text-sm block truncate" style="color:#2C2C2C">{{ station.name }}</text>
              <text class="text-xs mt-1 block truncate" style="color:#999">{{ station.address }}</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 驿站列表 -->
      <view>
        <text class="font-semibold block mb-3" style="color:#2C2C2C">
          {{ searchKeyword ? '搜索结果' : '全部驿站' }}
          <text class="font-normal text-sm ml-1" style="color:#999">({{ stations.length }})</text>
        </text>

        <!-- 加载骨架屏 -->
        <view v-if="isLoading" class="space-y-4">
          <view v-for="i in 3" :key="i" class="bg-white rounded-xl overflow-hidden" style="border:1px solid #E8E0D5">
            <view class="flex gap-4 p-4">
              <view class="w-24 h-24 rounded-lg flex-shrink-0" style="background-color:#F5F1EB;animation:pulse 1.5s infinite" />
              <view class="flex-1 space-y-2">
                <view class="h-5 rounded" style="background-color:#F5F1EB;width:75%;animation:pulse 1.5s infinite" />
                <view class="h-4 rounded" style="background-color:#F5F1EB;width:100%;animation:pulse 1.5s infinite" />
                <view class="h-4 rounded" style="background-color:#F5F1EB;width:50%;animation:pulse 1.5s infinite" />
              </view>
            </view>
          </view>
        </view>

        <!-- 空状态 -->
        <view v-else-if="stations.length === 0" class="text-center py-12">
          <text class="text-4xl block mb-3" style="color:rgba(153,153,153,0.3)">📍</text>
          <text class="text-sm block" style="color:#999">暂无驿站</text>
        </view>

        <!-- 驿站卡片列表 -->
        <view v-else class="space-y-4">
          <view
            v-for="station in stations"
            :key="station.id"
            class="bg-white rounded-xl overflow-hidden"
            style="border:1px solid #E8E0D5"
            hover-class="opacity-95"
            @click="goToDetail(station.id)"
          >
            <view class="flex">
              <!-- 封面图 -->
              <view class="relative w-28 h-28 flex-shrink-0" style="background-color:#F5F1EB">
                <image v-if="station.cover" :src="station.cover" mode="aspectFill" class="w-full h-full" />
                <text v-else class="text-3xl flex items-center justify-center w-full h-full" style="color:rgba(153,153,153,0.3)">🏛️</text>
                <!-- 状态覆盖层 -->
                <view v-if="station.status !== 'open'" class="absolute inset-0 flex items-center justify-center" style="background-color:rgba(0,0,0,0.5)">
                  <text class="text-white text-xs">{{ station.status === 'closed' ? '暂停营业' : '装修中' }}</text>
                </view>
              </view>

              <!-- 信息 -->
              <view class="flex-1 p-3 flex flex-col" style="min-width:0">
                <view class="flex items-start justify-between gap-2">
                  <view class="flex-1 min-w-0">
                    <view class="flex items-center gap-2">
                      <text class="font-medium text-sm truncate" style="color:#2C2C2C">{{ station.name }}</text>
                      <view class="px-1.5 py-0.5 rounded text-[10px] flex-shrink-0" style="background-color:#F5F1EB;color:#999">
                        <text>{{ getStationTypeLabel(station.type) }}</text>
                      </view>
                    </view>
                    <view class="flex items-center gap-1 mt-1 text-xs" style="color:#C9A96E">
                      <text></text>
                      <text>{{ station.rating }}</text>
                      <text style="color:#999">({{ station.reviewCount }}评价)</text>
                    </view>
                  </view>
                  <!-- 收藏按钮 -->
                  <view class="p-1 flex-shrink-0" @click.stop="toggleFavorite(station.id)">
                    <text :style="{ color: station.isFavorited ? '#EF4444' : '#999' }">
                      {{ station.isFavorited ? '' : '🤍' }}
                    </text>
                  </view>
                </view>

                <text class="text-xs mt-1 truncate flex items-center gap-1" style="color:#999">
                  📍 {{ station.address }}
                </text>

                <!-- 设施图标 -->
                <view class="flex items-center gap-2 mt-2">
                  <text
                    v-for="(f, fi) in station.facilities.slice(0, 4)"
                    :key="fi"
                    class="text-sm"
                    style="color:#999"
                    :title="f"
                  >
                    {{ getFacilityIcon(f) }}
                  </text>
                  <text v-if="station.facilities.length > 4" class="text-xs" style="color:#999">
                    +{{ station.facilities.length - 4 }}
                  </text>
                </view>

                <!-- 底部操作 -->
                <view class="flex items-center justify-between mt-auto pt-2">
                  <text v-if="station.distance" class="text-xs" style="color:#C41E3A">
                    {{ formatDistance(station.distance) }}
                  </text>
                  <view
                    class="flex items-center gap-1 text-xs"
                    style="color:#C41E3A"
                    hover-class="opacity-80"
                    @click.stop="handleNavigate(station)"
                  >
                    <text>🧭 导航</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

// 类型定义
type StationType = 'center' | 'academy' | 'studio' | 'partner'
type StationStatus = 'open' | 'closed' | 'renovating'

interface Station {
  id: number
  name: string
  cover: string
  address: string
  type: StationType
  rating: number
  reviewCount: number
  distance: number
  status: StationStatus
  isFavorited: boolean
  facilities: string[]
  lat?: number
  lng?: number
}

// 状态
const viewMode = ref<'list' | 'map'>('list')
const selectedType = ref<StationType | 'all'>('all')
const searchKeyword = ref('')
const stations = ref<Station[]>([])
const nearbyStations = ref<Station[]>([])
const isLoading = ref(true)

// 驿站类型筛选
const stationTypes = [
  { value: 'all' as const, label: '全部' },
  { value: 'center' as const, label: '国学中心' },
  { value: 'academy' as const, label: '书院' },
  { value: 'studio' as const, label: '工作室' },
  { value: 'partner' as const, label: '合作点' },
]

// 设施图标映射
function getFacilityIcon(facility: string): string {
  const map: Record<string, string> = {
    wifi: '📶',
    parking: '🚗',
    tea: '🍵',
    library: '',
    classroom: '',
    consultation: '',
    meditation: '🧘',
  }
  return map[facility] || '📌'
}

// 驿站类型名称
function getStationTypeLabel(type: StationType): string {
  const labels: Record<StationType, string> = {
    center: '国学中心',
    academy: '书院',
    studio: '工作室',
    partner: '合作点',
  }
  return labels[type] || type
}

// 距离格式化
function formatDistance(distance: number): string {
  if (distance < 1) {
    return Math.round(distance * 1000) + 'm'
  }
  return distance.toFixed(1) + 'km'
}

// 模拟数据
const mockStations: Station[] = [
  { id: 1, name: '热卜国学·北京朝阳驿站', cover: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=400', address: '北京市朝阳区建国路88号', type: 'center', rating: 4.8, reviewCount: 126, distance: 1.2, status: 'open', isFavorited: true, facilities: ['wifi', 'parking', 'tea', 'library', 'classroom'] },
  { id: 2, name: '静安书院', cover: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400', address: '上海市静安区南京西路', type: 'academy', rating: 4.9, reviewCount: 89, distance: 3.5, status: 'open', isFavorited: false, facilities: ['wifi', 'tea', 'library'] },
  { id: 3, name: '天河国学工作室', cover: 'https://images.unsplash.com/photo-1517487881594-2787fef5ebf7?w=400', address: '广州市天河区体育西路', type: 'studio', rating: 4.7, reviewCount: 56, distance: 5.0, status: 'open', isFavorited: false, facilities: ['wifi', 'consultation'] },
  { id: 4, name: '成都合作教学点', cover: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=400', address: '成都市锦江区春熙路', type: 'partner', rating: 4.5, reviewCount: 32, distance: 8.2, status: 'closed', isFavorited: false, facilities: ['wifi', 'classroom'] },
  { id: 5, name: '杭州西湖文化驿站', cover: 'https://images.unsplash.com/photo-1560439513-74b037a25d84?w=400', address: '杭州市西湖区北山街', type: 'center', rating: 4.6, reviewCount: 78, distance: 15.0, status: 'open', isFavorited: false, facilities: ['wifi', 'parking', 'tea', 'library', 'consultation', 'meditation'] },
  { id: 6, name: '深圳南山国学馆', cover: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400', address: '深圳市南山区科技园', type: 'academy', rating: 4.4, reviewCount: 45, distance: 22.5, status: 'renovating', isFavorited: false, facilities: ['wifi', 'classroom'] },
]

// 搜索输入
function onSearchInput(e: any) {
  searchKeyword.value = e.detail.value
  loadStations()
}

// 加载驿站列表
function loadStations() {
  isLoading.value = true
  setTimeout(() => {
    let filtered = mockStations.filter(s => {
      const matchType = selectedType.value === 'all' || s.type === selectedType.value
      const matchKeyword = !searchKeyword.value ||
        s.name.includes(searchKeyword.value) ||
        s.address.includes(searchKeyword.value)
      return matchType && matchKeyword
    })
    stations.value = filtered
    isLoading.value = false
  }, 300)
}

// 加载附近驿站
function loadNearbyStations() {
  // 模拟获取附近驿站
  setTimeout(() => {
    nearbyStations.value = mockStations
      .filter(s => s.status === 'open' && s.distance <= 10)
      .slice(0, 3)
  }, 200)
}

// 收藏切换
function toggleFavorite(id: number) {
  const s = stations.value.find(s => s.id === id)
  if (s) {
    s.isFavorited = !s.isFavorited
    uni.showToast({
      title: s.isFavorited ? '已收藏' : '已取消收藏',
      icon: 'none',
    })
  }
}

// 导航
function handleNavigate(station: Station) {
  if (station.lat && station.lng) {
    uni.openLocation({
      latitude: station.lat,
      longitude: station.lng,
      name: station.name,
      address: station.address,
    })
  } else {
    uni.showToast({ title: '导航功能开发中', icon: 'none' })
  }
}

// 切换视图模式
function toggleViewMode() {
  viewMode.value = viewMode.value === 'list' ? 'map' : 'list'
  uni.showToast({
    title: viewMode.value === 'map' ? '地图模式开发中' : '列表模式',
    icon: 'none',
  })
}

// 跳转详情
function goToDetail(id: number) {
  uni.navigateTo({ url: '/pages/offline/stations/id-detail/index?id=' + id })
}

function goBack() {
  uni.navigateBack()
}

onMounted(() => {
  loadStations()
  loadNearbyStations()
})
</script>

<style scoped>
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
