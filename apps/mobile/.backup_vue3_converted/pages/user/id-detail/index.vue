<template>
  <view>
    <!-- ===== 骨架屏加载态 ===== -->
    <view v-if="loading" class="min-h-screen bg-background pb-6">
      <view class="relative">
        <view class="h-40 w-full bg-secondary animate-pulse" />
        <view class="absolute -bottom-12 left-4">
          <view class="w-24 h-24 rounded-full bg-secondary animate-pulse" />
        </view>
      </view>
      <view class="px-4 pt-14">
        <view class="space-y-4">
          <view class="h-6 w-32 bg-secondary animate-pulse rounded" />
          <view class="h-16 w-full bg-secondary animate-pulse rounded" />
          <view class="flex gap-8 justify-around py-4">
            <view class="h-12 w-16 bg-secondary animate-pulse rounded" />
            <view class="h-12 w-16 bg-secondary animate-pulse rounded" />
            <view class="h-12 w-16 bg-secondary animate-pulse rounded" />
          </view>
          <view class="flex gap-3">
            <view class="h-10 flex-1 bg-secondary animate-pulse rounded-full" />
            <view class="h-10 flex-1 bg-secondary animate-pulse rounded-full" />
          </view>
        </view>
      </view>
    </view>

    <!-- ===== 错误态 ===== -->
    <view v-else-if="error" class="min-h-screen bg-background flex items-center justify-center px-4">
      <view class="text-center">
        <text class="text-sm text-muted-foreground">{{ error }}</text>
        <view class="mt-4">
          <view
            class="inline-block px-6 py-2 bg-primary text-white rounded-full text-sm"
            @click="loadUserProfile"
          >
            重新加载
          </view>
        </view>
      </view>
    </view>

    <!-- ===== 空态（用户不存在） ===== -->
    <view v-else-if="!profileData" class="min-h-screen bg-background flex items-center justify-center">
      <text class="text-sm text-muted-foreground">用户不存在</text>
    </view>

    <!-- ===== 用户主页正常内容 ===== -->
    <view v-else class="min-h-screen bg-background pb-6">
      <!-- ==================== 顶部封面区 ==================== -->
      <view class="relative">
        <!-- 封面背景（渐变/图片） -->
        <view
          class="h-40 bg-gradient-to-br from-primary/30 via-[#C9A96E]/20 to-[#F5F1EB]"
          :style="profileData.profile.coverImage ? {
            backgroundImage: 'url(' + profileData.profile.coverImage + ')',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          } : {}"
        />

        <!-- 顶部导航栏：返回 + 分享/更多 -->
        <view
          class="absolute top-0 left-0 right-0 flex items-center justify-between px-4"
          :style="{ paddingTop: safeTop + 12 + 'px' }"
        >
          <!-- 返回按钮 -->
          <view class="w-9 h-9 rounded-full bg-black/20 flex items-center justify-center" @click="goBack">
            <text class="text-white text-lg leading-none">←</text>
          </view>

          <!-- 右侧操作 -->
          <view class="flex items-center gap-2">
            <!-- 分享 -->
            <view class="w-9 h-9 rounded-full bg-black/20 flex items-center justify-center" @click="handleShare">
              <text class="text-white text-base leading-none"></text>
            </view>
            <!-- 更多 -->
            <view class="relative">
              <view class="w-9 h-9 rounded-full bg-black/20 flex items-center justify-center" @click="showMoreMenu = !showMoreMenu">
                <text class="text-white text-lg leading-none">⋯</text>
              </view>
              <!-- 更多下拉菜单 -->
              <view v-if="showMoreMenu">
                <!-- 遮罩层 -->
                <view class="fixed inset-0 z-40" @click="showMoreMenu = false" />
                <!-- 菜单面板 -->
                <view class="absolute right-0 top-full mt-2 w-32 py-1 z-50 bg-white rounded-lg shadow-lg overflow-hidden">
                  <view
                    class="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-foreground"
                    hover-class="bg-secondary"
                    @click="onReport"
                  >
                    <text>举报</text>
                  </view>
                  <view
                    class="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-500"
                    hover-class="bg-secondary"
                    @click="onBlock"
                  >
                    <text>拉黑</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 头像 + 认证徽章 -->
        <view class="absolute -bottom-12 left-4">
          <view class="w-24 h-24 rounded-full border-4 border-[#FAF8F5] overflow-hidden bg-secondary flex items-center justify-center">
            <image
              v-if="profileData.profile.avatar"
              :src="profileData.profile.avatar"
              class="w-full h-full"
              mode="aspectFill"
            />
            <text v-else class="text-2xl text-primary font-medium">{{ profileData.profile.nickname.charAt(0) }}</text>
          </view>
          <!-- 认证勾 -->
          <view
            v-if="profileData.profile.verified"
            class="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-accent flex items-center justify-center border-2 border-[#FAF8F5]"
          >
            <text class="text-white text-xs leading-none"></text>
          </view>
        </view>
      </view>

      <!-- ==================== 用户信息区 ==================== -->
      <view class="px-4 pt-14">
        <!-- 昵称 + 认证标识 -->
        <view class="flex items-start justify-between">
          <view class="flex-1 min-w-0">
            <view class="flex items-center gap-2">
              <text class="text-xl font-bold text-foreground truncate">{{ profileData.profile.nickname }}</text>
              <view
                v-if="profileData.profile.verified"
                class="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary"
              >
                <text>{{ profileData.profile.verifiedTitle }}</text>
              </view>
            </view>
            <!-- 个人简介 -->
            <text v-if="profileData.profile.bio" class="text-sm text-muted-foreground mt-2 block leading-relaxed">
              {{ profileData.profile.bio }}
            </text>
            <!-- 等级 + 互关徽章 -->
            <view class="flex items-center gap-2 mt-2 flex-wrap">
              <view class="text-xs px-2 py-0.5 rounded border bg-accent/10 text-accent border-accent/30">
                <text>Lv.{{ profileData.profile.level }} {{ profileData.profile.levelName }}</text>
              </view>
              <view
                v-if="profileData.isMutualFollow"
                class="text-xs px-2 py-0.5 rounded border bg-pink-50 text-pink-500 border-pink-200"
              >
                <text>互相关注</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 数据看板：关注 / 粉丝 / 获赞 -->
        <view class="flex items-center justify-around py-4 mt-4 bg-secondary/30 rounded-xl">
          <view class="text-center flex-1 py-1" @click="navigateTo('/pages/user/' + userId + '/following')">
            <text class="text-lg font-bold text-foreground block">{{ formatNumber(profileData.stats.followingCount) }}</text>
            <text class="text-xs text-muted-foreground">关注</text>
          </view>
          <view class="w-px h-8 bg-[#E8E0D5]" />
          <view class="text-center flex-1 py-1" @click="navigateTo('/pages/user/' + userId + '/followers')">
            <text class="text-lg font-bold text-foreground block">{{ formatNumber(profileData.stats.followerCount) }}</text>
            <text class="text-xs text-muted-foreground">粉丝</text>
          </view>
          <view class="w-px h-8 bg-[#E8E0D5]" />
          <view class="text-center flex-1 py-1">
            <text class="text-lg font-bold text-foreground block">{{ formatNumber(profileData.stats.likeCount) }}</text>
            <text class="text-xs text-muted-foreground">获赞</text>
          </view>
        </view>

        <!-- 操作按钮：关注 + 私信（非本人可见） -->
        <view v-if="!profileData.isSelf" class="flex gap-3 mt-4">
          <button
            @click="handleFollow"
            :disabled="followLoading"
            :class="[
              'flex-1 py-2.5 rounded-full text-sm font-medium border-none',
              profileData.isFollowing
                ? 'bg-secondary text-muted-foreground'
                : 'bg-primary text-white'
            ]"
          >
            {{ profileData.isFollowing ? '已关注' : '+ 关注' }}
          </button>
          <view class="flex-1" @click="navigateTo('/pages/chat/chat?userId=' + userId)">
            <button class="w-full py-2.5 rounded-full text-sm font-medium border border-border text-foreground bg-transparent">
              发私信
            </button>
          </view>
        </view>
      </view>

      <!-- ==================== 内容Tab栏（sticky 吸顶） ==================== -->
      <view
        class="sticky top-0 z-30 bg-background/95 mt-6 border-b border-border"
        :style="{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }"
      >
        <view class="flex items-center px-4 overflow-x-auto" style="-ms-overflow-style:none;scrollbar-width:none">
          <view
            v-for="tab in contentTabs"
            :key="tab.id"
            class="px-4 py-3 text-sm font-medium whitespace-nowrap relative transition-colors"
            :class="activeTab === tab.id ? 'text-primary' : 'text-muted-foreground'"
            @click="activeTab = tab.id"
          >
            <text>{{ tab.label }}</text>
            <!-- 当前tab下划线 -->
            <view
              v-if="activeTab === tab.id"
              class="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full"
            />
          </view>
        </view>
      </view>

      <!-- ==================== 内容列表 ==================== -->
      <view class="px-4 py-4">
        <!-- 内容加载骨架 -->
        <view v-if="postsLoading" class="space-y-3">
          <view v-for="i in 3" :key="i" class="h-32 bg-secondary animate-pulse rounded-lg" />
        </view>

        <!-- 内容为空 -->
        <view v-else-if="filteredPosts.length === 0" class="py-12 text-center">
          <text class="text-sm text-muted-foreground">暂无内容</text>
        </view>

        <!-- ===== 视频Tab：两列网格 ===== -->
        <view v-else-if="activeTab === 'videos'" class="grid grid-cols-2 gap-3">
          <view
            v-for="video in filteredPosts"
            :key="video.id"
            class="bg-white rounded-lg overflow-hidden"
            hover-class="opacity-90"
            @click="navigateToContent(video)"
          >
            <!-- 视频封面 -->
            <view class="relative aspect-[9/16] bg-secondary overflow-hidden">
              <image
                v-if="video.cover"
                :src="video.cover"
                class="w-full h-full"
                mode="aspectFill"
              />
              <text v-else class="text-[40px] text-muted-foreground/40 w-full h-full flex items-center justify-center"></text>
              <!-- 播放按钮 -->
              <view class="absolute inset-0 flex items-center justify-center">
                <view class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <text class="text-white text-lg leading-none">▶</text>
                </view>
              </view>
            </view>
            <!-- 视频信息 -->
            <view class="p-2">
              <text class="text-xs text-foreground line-clamp-2">{{ video.title || video.content }}</text>
              <view class="flex items-center gap-2 mt-1">
                <text class="text-[10px] text-muted-foreground"> {{ video.likeCount }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- ===== 其他Tab：流式布局 ===== -->
        <view v-else class="space-y-3">
          <template v-for="item in filteredPosts" :key="item.id">
            <!-- 视频卡片（混合Tab中纵向排列） -->
            <view
              v-if="item.type === 'video'"
              class="bg-white rounded-lg overflow-hidden"
              hover-class="opacity-90"
              @click="navigateToContent(item)"
            >
              <view class="relative aspect-[9/16] bg-secondary overflow-hidden rounded-lg">
                <image
                  v-if="item.cover"
                  :src="item.cover"
                  class="w-full h-full"
                  mode="aspectFill"
                />
                <text v-else class="text-[40px] text-muted-foreground/40 w-full h-full flex items-center justify-center"></text>
                <view class="absolute inset-0 flex items-center justify-center">
                  <view class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <text class="text-white text-lg leading-none">▶</text>
                  </view>
                </view>
              </view>
              <view class="p-2">
                <text class="text-xs text-foreground line-clamp-2">{{ item.title || item.content }}</text>
                <view class="flex items-center gap-2 mt-1">
                  <text class="text-[10px] text-muted-foreground"> {{ item.likeCount }}</text>
                </view>
              </view>
            </view>

            <!-- 文章卡片 -->
            <view
              v-else-if="item.type === 'article'"
              class="flex gap-3 p-3 bg-white rounded-lg"
              hover-class="opacity-90"
              @click="navigateToContent(item)"
            >
              <view class="w-24 h-16 shrink-0 bg-secondary rounded-lg overflow-hidden flex items-center justify-center">
                <image
                  v-if="item.cover"
                  :src="item.cover"
                  class="w-full h-full"
                  mode="aspectFill"
                />
                <text v-else class="text-2xl text-muted-foreground/40"></text>
              </view>
              <view class="flex-1 min-w-0">
                <text class="font-medium text-sm text-foreground line-clamp-2 block">{{ item.title }}</text>
                <view class="flex items-center gap-3 mt-1.5">
                  <text class="text-xs text-muted-foreground"> {{ item.likeCount }}</text>
                  <text class="text-xs text-muted-foreground">{{ item.createdAt }}</text>
                </view>
              </view>
            </view>

            <!-- 帖子卡片 -->
            <view
              v-else
              class="p-3 bg-white rounded-lg"
              hover-class="opacity-90"
              @click="navigateToContent(item)"
            >
              <!-- 文字内容 -->
              <text class="text-sm text-foreground line-clamp-3">{{ item.content }}</text>
              <!-- 图片网格 -->
              <view
                v-if="item.images && item.images.length > 0"
                :class="['mt-2 gap-1', item.images.length === 1 ? 'grid grid-cols-1' : 'grid grid-cols-2']"
              >
                <view
                  v-for="(img, idx) in item.images.slice(0, 4)"
                  :key="idx"
                  class="aspect-square bg-secondary rounded-lg overflow-hidden"
                >
                  <image :src="img" class="w-full h-full" mode="aspectFill" />
                </view>
              </view>
              <!-- 底部时间 / 交互统计 -->
              <view class="flex items-center justify-between mt-3">
                <text class="text-xs text-muted-foreground">{{ item.createdAt }}</text>
                <view class="flex items-center gap-4">
                  <view
                    class="flex items-center gap-1"
                    :class="item.isLiked ? 'text-primary' : 'text-muted-foreground'"
                  >
                    <text class="text-xs"></text>
                    <text class="text-xs">{{ item.likeCount }}</text>
                  </view>
                  <view class="flex items-center gap-1 text-muted-foreground">
                    <text class="text-xs"></text>
                    <text class="text-xs">{{ item.commentCount }}</text>
                  </view>
                </view>
              </view>
            </view>
          </template>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

// ============================================================
// 类型定义（基于 V0 React 源数据结构）
// ============================================================
interface UserProfileInfo {
  nickname: string
  avatar: string
  verified: boolean
  verifiedTitle: string
  bio: string
  level: number
  levelName: string
  coverImage: string
}

interface UserProfileStats {
  followingCount: number
  followerCount: number
  likeCount: number
}

interface ProfileData {
  profile: UserProfileInfo
  stats: UserProfileStats
  isSelf: boolean
  isFollowing: boolean
  isMutualFollow: boolean
}

interface PostItem {
  id: number
  type: 'post' | 'article' | 'video'
  content: string
  title?: string
  cover?: string
  images?: string[]
  createdAt: string
  likeCount: number
  commentCount: number
  isLiked: boolean
}

// ============================================================
// Tab 配置
// ============================================================
const contentTabs = [
  { id: 'all', label: '动态' },
  { id: 'posts', label: '帖子' },
  { id: 'articles', label: '文章' },
  { id: 'videos', label: '短视频' },
] as const

// ============================================================
// Mock 数据
// ============================================================
const mockProfileData: ProfileData = {
  profile: {
    nickname: '国学大师',
    avatar: 'https://picsum.photos/200/200?random=1',
    verified: true,
    verifiedTitle: '知名国学博主',
    bio: '传承中华文化，弘扬国学经典。每日分享易经、道德经、论语等经典智慧。',
    level: 8,
    levelName: '国学达人',
    coverImage: '',
  },
  stats: {
    followingCount: 328,
    followerCount: 15800,
    likeCount: 89600,
  },
  isSelf: false,
  isFollowing: false,
  isMutualFollow: false,
}

const mockPosts: PostItem[] = [
  {
    id: 1,
    type: 'post',
    content:
      '《道德经》云："上善若水，水善利万物而不争。"今日读到这一句，深感古人之智慧。水之德，柔而不弱，处下不争，却能滋养万物。',
    images: [
      'https://picsum.photos/400/400?random=2',
      'https://picsum.photos/400/400?random=3',
    ],
    createdAt: '2024-01-15',
    likeCount: 128,
    commentCount: 23,
    isLiked: false,
  },
  {
    id: 2,
    type: 'article',
    title: '易经入门：八卦起源与象征意义',
    content: '八卦是易经的核心符号，每一卦都代表着自然界的某种现象和人事的某种状态...',
    cover: 'https://picsum.photos/400/300?random=4',
    createdAt: '2024-01-14',
    likeCount: 256,
    commentCount: 45,
    isLiked: true,
  },
  {
    id: 3,
    type: 'video',
    content: '书法入门：如何正确握笔',
    title: '书法入门：如何正确握笔',
    cover: 'https://picsum.photos/400/700?random=5',
    createdAt: '2024-01-13',
    likeCount: 512,
    commentCount: 78,
    isLiked: false,
  },
  {
    id: 4,
    type: 'post',
    content:
      '今日读到《论语》子罕篇："子曰：三军可夺帅也，匹夫不可夺志也。"志气之重要，古今皆然。',
    images: [],
    createdAt: '2024-01-12',
    likeCount: 89,
    commentCount: 12,
    isLiked: false,
  },
  {
    id: 5,
    type: 'post',
    content:
      '分享一首苏轼的《定风波》：莫听穿林打叶声，何妨吟啸且徐行。竹杖芒鞋轻胜马，谁怕？一蓑烟雨任平生。',
    images: ['https://picsum.photos/400/400?random=6'],
    createdAt: '2024-01-11',
    likeCount: 345,
    commentCount: 56,
    isLiked: true,
  },
  {
    id: 6,
    type: 'article',
    title: '《黄帝内经》四季养生法',
    content: '春生夏长，秋收冬藏，四时有序...',
    cover: '',
    createdAt: '2024-01-10',
    likeCount: 189,
    commentCount: 34,
    isLiked: false,
  },
]

// ============================================================
// 响应式状态
// ============================================================
const userId = ref(1)
const profileData = ref<ProfileData | null>(null)
const posts = ref<PostItem[]>([])
const loading = ref(true)
const postsLoading = ref(false)
const error = ref<string | null>(null)
const activeTab = ref<string>('all')
const followLoading = ref(false)
const showMoreMenu = ref(false)
const safeTop = ref(20)

// ============================================================
// 计算属性
// ============================================================
const filteredPosts = computed(() => {
  if (activeTab.value === 'all') return posts.value
  const typeMap: Record<string, string> = {
    posts: 'post',
    articles: 'article',
    videos: 'video',
  }
  return posts.value.filter((p) => p.type === typeMap[activeTab.value])
})

// ============================================================
// 生命周期
// ============================================================
onMounted(() => {
  // 获取状态栏高度（安全区域）
  try {
    const sys = uni.getSystemInfoSync()
    safeTop.value = sys.statusBarHeight || 20
  } catch {
    safeTop.value = 20
  }

  // 从页面栈获取路由参数 id
  try {
    const pages = getCurrentPages()
    const page = pages[pages.length - 1] as any
    if (page?.options?.id) {
      userId.value = Number(page.options.id)
    } else if (page?.$page?.options?.id) {
      userId.value = Number(page.$page.options.id)
    }
  } catch {
    // fallback to default userId = 1
  }

  loadUserProfile()
})

// ============================================================
// 方法
// ============================================================

/** 返回上一页 */
function goBack() {
  uni.navigateBack()
}

/** UniApp 页面跳转封装 */
function navigateTo(url: string) {
  uni.navigateTo({ url })
}

/** 加载用户资料 */
async function loadUserProfile() {
  loading.value = true
  error.value = null
  try {
    // TODO: 替换为真实 API 调用 const res = await getUserProfile(userId.value)
    await new Promise((resolve) => setTimeout(resolve, 800))
    profileData.value = { ...mockProfileData }
    await loadUserPosts()
  } catch {
    error.value = '网络错误，请重试'
  } finally {
    loading.value = false
  }
}

/** 加载用户内容列表 */
async function loadUserPosts() {
  postsLoading.value = true
  try {
    // TODO: 替换为真实 API 调用 const res = await getUserPosts(userId.value, activeTab.value)
    await new Promise((resolve) => setTimeout(resolve, 500))
    posts.value = [...mockPosts]
  } catch {
    // 静默失败
  } finally {
    postsLoading.value = false
  }
}

/**
 * 关注/取关（乐观更新 + 自动回滚）
 * 先更新本地状态提升响应速度，API 失败时回滚
 */
async function handleFollow() {
  if (!profileData.value || followLoading.value) return
  followLoading.value = true

  const wasFollowing = profileData.value.isFollowing

  // 乐观更新 UI
  profileData.value = {
    ...profileData.value,
    isFollowing: !wasFollowing,
    stats: {
      ...profileData.value.stats,
      followerCount:
        profileData.value.stats.followerCount + (wasFollowing ? -1 : 1),
    },
  }

  try {
    // TODO: 替换为真实 API const res = wasFollowing ? await unfollowUser(userId.value) : await followUser(userId.value)
    await new Promise((resolve) => setTimeout(resolve, 300))

    // 模拟成功响应
    const res = { code: 200, data: { isMutualFollow: !wasFollowing } }

    if (res.code === 200) {
      uni.showToast({
        title: wasFollowing ? '已取消关注' : '关注成功',
        icon: 'success',
      })

      // 如果关注成功且对方也关注了你
      if (!wasFollowing && res.data.isMutualFollow) {
        profileData.value = {
          ...profileData.value,
          isMutualFollow: true,
        }
        uni.showToast({ title: '你们已互相关注', icon: 'success' })
      }
    } else {
      // API 返回错误 → 回滚
      rollbackFollow(wasFollowing)
      uni.showToast({ title: '操作失败，请重试', icon: 'none' })
    }
  } catch {
    // 网络异常 → 回滚
    rollbackFollow(wasFollowing)
    uni.showToast({ title: '网络错误', icon: 'none' })
  } finally {
    followLoading.value = false
  }
}

/** 回滚关注状态 */
function rollbackFollow(wasFollowing: boolean) {
  if (!profileData.value) return
  profileData.value = {
    ...profileData.value,
    isFollowing: wasFollowing,
    stats: {
      ...profileData.value.stats,
      followerCount:
        profileData.value.stats.followerCount + (wasFollowing ? 1 : -1),
    },
  }
}

/** 分享 */
function handleShare() {
  // #ifdef H5
  try {
    if (navigator.share) {
      navigator.share({
        title: profileData.value?.profile.nickname,
        url: window.location.href,
      })
      return
    }
  } catch {
    // fallback to clipboard
  }
  // #endif

  // App / 小程序 / H5降级 → 复制链接
  uni.setClipboardData({
    data: profileData.value?.profile.nickname || '',
    success: () => uni.showToast({ title: '链接已复制', icon: 'success' }),
  })
}

/** 跳转到内容详情页 */
function navigateToContent(item: PostItem) {
  const routeMap: Record<string, string> = {
    post: `/pages/post/detail?id=${item.id}`,
    article: `/pages/article/detail?id=${item.id}`,
    video: `/pages/video/detail?id=${item.id}`,
  }
  const url = routeMap[item.type] || routeMap.post
  uni.navigateTo({ url })
}

/** 举报 */
function onReport() {
  showMoreMenu.value = false
  uni.navigateTo({ url: `/pages/report/index?id=${userId.value}` })
}

/** 拉黑 */
function onBlock() {
  showMoreMenu.value = false
  uni.navigateTo({ url: '/pages/mine/blacklist' })
}

/** 格式化数字（万单位） */
function formatNumber(num: number): string {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万'
  }
  return num.toString()
}
</script>
