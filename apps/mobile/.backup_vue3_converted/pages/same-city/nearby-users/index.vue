<template>
  <view class="min-h-screen bg-background">
    <!-- 顶部导航 -->
    <header class="sticky top-0 z-10 bg-white border-b border-border">
      <view class="px-4 py-3">
        <view class="flex items-center justify-between">
          <view class="flex items-center gap-3">
            <view @click="goBack" class="p-1 -ml-1">
              <text class="text-xl text-foreground">←</text>
            </view>
            <text class="text-lg font-semibold text-foreground">附近的人</text>
          </view>
          <view class="flex items-center gap-2">
            <view @click="loadUsers(true)" :class="'p-2 ' + (refreshing ? 'animate-spin' : '')">
              <text class="text-lg"></text>
            </view>
            <view @click="showSettings=true" class="p-2">
              <text class="text-lg">⚙️</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 搜索框 -->
      <view class="px-4 pb-3">
        <view class="relative">
          <text class="absolute left-3 top-1/2" style="transform:translateY(-50%)"></text>
          <input
            placeholder="搜索用户名、兴趣..."
            :value="searchKeyword"
            @input="e => searchKeyword=e.detail.value"
            class="w-full h-10 pl-9 pr-3 rounded-lg text-sm bg-background/50 text-foreground"
            style="outline:none;border:none"
          />
        </view>
      </view>

      <!-- 类型筛选 -->
      <view class="px-4 pb-3">
        <view class="flex gap-2" style="overflow-x:auto;white-space:nowrap">
          <view v-for="ut in userTypes" :key="ut.value" @click="selectedType=ut.value" :class="'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm ' + (selectedType===ut.value ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground')">
            <text class="text-xs">{{ut.icon}}</text>
            <text>{{ut.label}}</text>
          </view>
        </view>
      </view>
    </header>

    <!-- 用户列表 -->
    <view class="p-4">
      <!-- Loading skeleton -->
      <view v-if="loading" class="space-y-3">
        <view v-for="i in 4" :key="i" class="bg-white rounded-xl p-4 border border-border">
          <view class="flex gap-3">
            <view class="w-14 h-14 rounded-full bg-[#E8E0D5] animate-pulse" style="flex-shrink:0" />
            <view class="flex-1 space-y-2">
              <view class="h-5 bg-[#E8E0D5] rounded animate-pulse" style="width:96rpx" />
              <view class="h-4 bg-[#E8E0D5] rounded animate-pulse" style="width:100%" />
              <view class="flex gap-2">
                <view class="h-5 bg-[#E8E0D5] rounded-full animate-pulse" style="width:96rpx" />
                <view class="h-5 bg-[#E8E0D5] rounded-full animate-pulse" style="width:128rpx" />
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- Empty state -->
      <view v-else-if="filteredUsers.length===0" class="flex flex-col items-center justify-center py-20">
        <text class="text-3xl text-muted-foreground mb-4">📍</text>
        <text class="text-sm text-muted-foreground text-center">{{searchKeyword ? '没有找到匹配的用户' : '附近暂无用户'}}</text>
      </view>

      <!-- User list -->
      <view v-else class="space-y-3">
        <view v-for="user in filteredUsers" :key="user.id" class="bg-white rounded-xl p-4 border border-border">
          <view class="flex gap-3">
            <!-- 头像 -->
            <view @click="navigateToUser(user.id)" class="relative" style="flex-shrink:0">
              <image :src="user.avatar" class="w-14 h-14 rounded-full" mode="aspectFill" />
              <view v-if="user.isOnline" class="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white" style="background-color:#22c55e" />
            </view>

            <!-- 信息 -->
            <view class="flex-1" style="min-width:0">
              <view class="flex items-center gap-2 mb-1">
                <view @click="navigateToUser(user.id)" class="font-medium text-foreground">
                  <text>{{user.name}}</text>
                </view>
                <text v-if="user.verified" class="text-primary text-sm">✓</text>
                <text :class="'flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs ' + getUserTypeColor(user.type)">
                  {{getUserTypeIcon(user.type)}} {{getUserTypeLabel(user.type)}}
                </text>
              </view>

              <!-- 认证标题 -->
              <text v-if="user.verifiedTitle" class="text-xs text-primary mb-1" style="display:block">{{user.verifiedTitle}}</text>

              <!-- 简介 -->
              <text v-if="user.bio" class="text-sm text-muted-foreground mb-2" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;display:block">{{user.bio}}</text>

              <!-- 兴趣标签 -->
              <view class="flex flex-wrap gap-1.5 mb-2">
                <text v-for="interest in user.commonInterests" :key="interest" class="px-2 py-0.5 text-xs rounded-full" style="background-color:#C41E3A/10;color:#C41E3A">{{interest}}</text>
                <text v-for="interest in user.interests.filter((i:string)=>!user.commonInterests?.includes(i)).slice(0,2)" :key="interest" class="px-2 py-0.5 text-xs rounded-full bg-secondary text-muted-foreground">{{interest}}</text>
              </view>

              <!-- 底部信息 -->
              <view class="flex items-center justify-between">
                <view class="flex items-center gap-3 text-xs text-muted-foreground">
                  <text class="flex items-center gap-1">📍 {{formatUserDistance(user.distance, user.showExactDistance)}}</text>
                  <text>{{user.followerCount}} 粉丝</text>
                  <text v-if="user.lastActiveAt">{{user.lastActiveAt}}</text>
                </view>

                <!-- 操作按钮 -->
                <view class="flex items-center gap-2">
                  <view @click="navigateToChat(user.id)" class="w-8 h-8 rounded-full flex items-center justify-center">
                    <text class="text-sm"></text>
                  </view>
                  <view @click="handleToggleFollow(user.id)" :class="'h-8 px-3 rounded-full text-xs font-medium flex items-center gap-1 ' + (followingIds.includes(user.id) ? 'border border-border text-foreground' : 'bg-primary text-white')">
                    <text>{{followingIds.includes(user.id) ? '✓ 已关注' : '+ 关注'}}</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 隐私设置弹窗 -->
    <view v-if="showSettings" class="fixed inset-0 z-50 bg-black/50" @click="showSettings=false">
      <view class="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl" style="max-height:70vh;overflow-y:auto" @click.stop>
        <view class="sticky top-0 bg-white border-b border-border px-4 py-3">
          <view class="flex items-center justify-between">
            <text class="font-semibold text-foreground">位置隐私设置</text>
            <view @click="showSettings=false" class="text-muted-foreground">
              <text>关闭</text>
            </view>
          </view>
        </view>

        <view class="p-4 space-y-4">
          <!-- 附近可见开关 -->
          <view class="flex items-center justify-between py-3 border-b border-border">
            <view class="flex items-center gap-3">
              <text class="text-lg">{{privacySetting.visibleToNearby ? '' : '‍🗨'}}</text>
              <view>
                <text class="font-medium text-foreground" style="display:block">对附近的人可见</text>
                <text class="text-sm text-muted-foreground" style="display:block">开启后，附近的人可以发现你</text>
              </view>
            </view>
            <switch :checked="privacySetting.visibleToNearby" @change="e => handlePrivacyChange('visibleToNearby', e.detail.value)" />
          </view>

          <!-- 距离精度 -->
          <view class="py-3 border-b border-border">
            <text class="font-medium text-foreground mb-2" style="display:block">距离显示精度</text>
            <view class="flex gap-2">
              <view @click="handlePrivacyChange('distancePrecision','fuzzy')" :class="'flex-1 py-2 px-3 rounded-lg text-sm text-center ' + (privacySetting.distancePrecision==='fuzzy' ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground')">
                <text>模糊（推荐）</text>
              </view>
              <view @click="handlePrivacyChange('distancePrecision','exact')" :class="'flex-1 py-2 px-3 rounded-lg text-sm text-center ' + (privacySetting.distancePrecision==='exact' ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground')">
                <text>精确</text>
              </view>
            </view>
            <text class="text-xs text-muted-foreground mt-2" style="display:block">模糊模式下，1km内统一显示"附近"</text>
          </view>

          <!-- 可见范围 -->
          <view class="py-3">
            <text class="font-medium text-foreground mb-2" style="display:block">可见范围</text>
            <view class="flex gap-2 flex-wrap">
              <view v-for="range in [1,3,5,10,20]" :key="range" @click="handlePrivacyChange('visibleRange',range)" :class="'py-2 px-4 rounded-lg text-sm ' + (privacySetting.visibleRange===range ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground')">
                <text>{{range}}km</text>
              </view>
            </view>
            <text class="text-xs text-muted-foreground mt-2" style="display:block">只有在此范围内的用户才能看到你</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const userTypes = [
  { value: 'all', label: '全部', icon: '' },
  { value: 'enthusiast', label: '爱好者', icon: '' },
  { value: 'teacher', label: '老师', icon: '🎓' },
  { value: 'inheritor', label: '传承人', icon: '' },
]

const users = ref<any[]>([])
const loading = ref(true)
const refreshing = ref(false)
const selectedType = ref<string>('all')
const searchKeyword = ref('')
const showSettings = ref(false)
const privacySetting = ref<any>({
  visibleToNearby: true,
  distancePrecision: 'fuzzy',
  visibleRange: 5
})
const followingIds = ref<number[]>([])
const location = ref({ latitude: 39.9087, longitude: 116.4716 })

onMounted(() => {
  loadUsers()
})

function loadUsers(showRefresh = false) {
  if (showRefresh) refreshing.value = true
  else loading.value = true

  setTimeout(() => {
    // Mock data
    users.value = [
      { id: 1, name: '易学大师', avatar: '', isOnline: true, verified: true, verifiedTitle: '认证命理师', type: 'teacher', bio: '专注八字命理研究20年', interests: ['八字命理', '紫微斗数'], commonInterests: ['八字命理'], distance: 500, showExactDistance: false, followerCount: 1280, lastActiveAt: '最近在线' },
      { id: 2, name: '风水实践派', avatar: '', isOnline: true, verified: true, type: 'inheritor', bio: '杨公风水第38代传人', interests: ['风水堪舆', '阳宅布局'], commonInterests: [], distance: 1200, showExactDistance: false, followerCount: 856, lastActiveAt: '1小时前' },
      { id: 3, name: '国学爱好者小王', avatar: '', isOnline: false, verified: false, type: 'enthusiast', bio: '刚入门，请多关照', interests: ['八字命理', '梅花易数', '国学经典'], commonInterests: ['八字命理'], distance: 2500, showExactDistance: false, followerCount: 56, lastActiveAt: '昨天' },
      { id: 4, name: '玄学研究员', avatar: '', isOnline: true, verified: false, type: 'enthusiast', bio: '万物皆数，探索宇宙奥秘', interests: ['奇门遁甲', '六爻占卜'], commonInterests: [], distance: 800, showExactDistance: false, followerCount: 234, lastActiveAt: '10分钟前' },
    ]
    loading.value = false
    refreshing.value = false
  }, 500)
}

const filteredUsers = computed(() => {
  let list = users.value
  if (selectedType.value !== 'all') {
    list = list.filter(u => u.type === selectedType.value)
  }
  if (searchKeyword.value) {
    const kw = searchKeyword.value.toLowerCase()
    list = list.filter(u =>
      u.name.toLowerCase().includes(kw) ||
      (u.bio && u.bio.toLowerCase().includes(kw)) ||
      u.interests.some((i: string) => i.toLowerCase().includes(kw))
    )
  }
  return list
})

function getUserTypeColor(type: string) {
  switch (type) {
    case 'teacher': return 'bg-blue-100 text-blue-800'
    case 'inheritor': return 'bg-yellow-100 text-yellow-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

function getUserTypeLabel(type: string) {
  switch (type) {
    case 'teacher': return '老师'
    case 'inheritor': return '传承人'
    default: return '爱好者'
  }
}

function getUserTypeIcon(type: string) {
  switch (type) {
    case 'teacher': return '🎓'
    case 'inheritor': return ''
    default: return ''
  }
}

function formatUserDistance(distance: number, showExact?: boolean) {
  if (!showExact && distance < 1000) return '附近'
  if (distance < 1000) return `${distance}m`
  return `${(distance / 1000).toFixed(1)}km`
}

function handleToggleFollow(userId: number) {
  const idx = followingIds.value.indexOf(userId)
  if (idx > -1) {
    followingIds.value.splice(idx, 1)
  } else {
    followingIds.value.push(userId)
  }
}

function handlePrivacyChange(key: string, value: any) {
  privacySetting.value[key] = value
}

function navigateToUser(userId: number) {
  uni.navigateTo({ url: `/pages/user/${userId}/index` })
}

function navigateToChat(userId: number) {
  uni.navigateTo({ url: `/pages/message/chat/${userId}/index` })
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
