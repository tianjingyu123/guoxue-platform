<template>
  <view class="min-h-screen bg-background flex flex-col">
    <!-- 顶部导航栏 -->
    <view class="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-border">
      <view class="flex items-center justify-between px-4 h-14">
        <view class="flex items-center gap-2">
          <view class="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <text class="text-white font-bold text-sm">热卜</text>
          </view>
          <text class="font-medium text-sm text-foreground">国学知识平台</text>
        </view>
        <view @click="handleOpenApp" class="px-3 py-1.5 bg-primary text-white rounded-lg text-sm flex items-center gap-1">
          <text>打开App</text>
          <text class="text-xs">›</text>
        </view>
      </view>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="flex-1 px-4 py-6 space-y-4 animate-pulse">
      <view class="aspect-video bg-muted rounded-xl" />
      <view class="h-6 bg-muted rounded w-3/4" />
      <view class="h-4 bg-muted rounded w-1/2" />
      <view class="h-20 bg-muted rounded" />
    </view>

    <!-- 内容区域 -->
    <main v-else class="flex-1 px-4 py-6 pb-24">
      <!-- 类型标签 -->
      <view class="flex items-center gap-2 mb-4">
        <view class="px-2 py-0.5 border border-border rounded flex items-center gap-1">
          <text class="text-xs">{{ typeIcon }}</text>
          <text class="text-xs text-muted-foreground">{{ typeLabel }}分享</text>
        </view>
      </view>

      <!-- 课程预览 -->
      <view v-if="type === 'course' && content" class="space-y-4">
        <view class="relative aspect-video rounded-xl overflow-hidden bg-secondary">
          <image :src="content.cover" mode="aspectFill" class="w-full h-full" />
          <view class="absolute inset-0 bg-black/30 flex items-center justify-center">
            <view class="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
              <text class="text-2xl text-primary ml-1">▶</text>
            </view>
          </view>
          <view class="absolute top-3 left-3 bg-primary text-white text-xs px-2 py-0.5 rounded">精品课程</view>
        </view>
        <text class="text-xl font-bold text-foreground block">{{ content.title }}</text>
        <view class="flex items-center gap-3">
          <image :src="content.teacher?.avatar" mode="aspectFill" class="w-10 h-10 rounded-full" />
          <view>
            <text class="text-sm font-medium text-foreground block">{{ content.teacher?.name }}</text>
            <text class="text-xs text-muted-foreground">{{ content.teacher?.title }}</text>
          </view>
        </view>
        <view class="flex items-center gap-4 text-sm text-muted-foreground">
          <text class="flex items-center gap-1"> {{ content.studentCount?.toLocaleString() }}人学习</text>
          <text class="flex items-center gap-1"> {{ content.rating }}分</text>
          <text class="flex items-center gap-1"> {{ content.lessons }}节</text>
        </view>
        <view class="flex items-baseline gap-2">
          <text class="text-2xl font-bold text-primary">¥{{ content.price }}</text>
          <text class="text-sm text-muted-foreground line-through">¥{{ content.originalPrice }}</text>
        </view>
        <view class="bg-secondary/30 rounded-xl p-4">
          <text class="text-sm text-muted-foreground line-clamp-3">{{ content.description }}</text>
        </view>
      </view>

      <!-- 文章预览 -->
      <view v-if="type === 'article' && content" class="space-y-4">
        <view class="aspect-[2/1] rounded-xl overflow-hidden">
          <image :src="content.cover" mode="aspectFill" class="w-full h-full" />
        </view>
        <text class="text-xl font-bold text-foreground block leading-tight">{{ content.title }}</text>
        <view class="flex items-center justify-between">
          <view class="flex items-center gap-2">
            <image :src="content.author?.avatar" mode="aspectFill" class="w-8 h-8 rounded-full" />
            <text class="text-sm text-foreground">{{ content.author?.name }}</text>
          </view>
          <text class="text-xs text-muted-foreground">{{ content.publishedAt }}</text>
        </view>
        <view class="flex items-center gap-4 text-sm text-muted-foreground">
          <text class="flex items-center gap-1"> {{ content.readCount?.toLocaleString() }}阅读</text>
          <text class="flex items-center gap-1"> {{ content.likeCount }}点赞</text>
        </view>
        <view class="bg-secondary/30 rounded-xl p-4">
          <text class="text-sm text-muted-foreground">{{ content.summary }}</text>
          <view class="mt-3 pt-3 border-t border-border">
            <text class="text-xs text-muted-foreground text-center block">打开App查看完整内容</text>
          </view>
        </view>
      </view>

      <!-- 直播预览 -->
      <view v-if="type === 'live' && content" class="space-y-4">
        <view class="relative aspect-video rounded-xl overflow-hidden">
          <image :src="content.cover" mode="aspectFill" class="w-full h-full" />
          <view class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <view class="absolute top-3 left-3 bg-orange-500 text-white text-xs px-2 py-0.5 rounded flex items-center gap-1">
            <text>📻 即将开播</text>
          </view>
        </view>
        <text class="text-xl font-bold text-foreground block">{{ content.title }}</text>
        <view class="flex items-center gap-3">
          <view class="w-10 h-10 rounded-full ring-2 ring-primary">
            <image :src="content.host?.avatar" mode="aspectFill" class="w-full h-full rounded-full" />
          </view>
          <view>
            <text class="text-sm font-medium text-foreground block">{{ content.host?.name }}</text>
            <text class="text-xs text-muted-foreground">{{ content.host?.title }}</text>
          </view>
        </view>
        <view class="bg-primary/5 border border-primary/20 rounded-xl p-4">
          <view class="flex items-center gap-2 text-primary">
            <text>🕐</text>
            <text class="font-medium text-sm">开播时间：{{ content.startTime }}</text>
          </view>
          <text class="text-sm text-muted-foreground mt-2 block">已有 {{ content.reserveCount?.toLocaleString() }} 人预约</text>
        </view>
      </view>

      <!-- 商品预览 -->
      <view v-if="type === 'product' && content" class="space-y-4">
        <view class="aspect-square rounded-xl overflow-hidden bg-secondary">
          <image :src="content.cover" mode="aspectFit" class="w-full h-full" />
        </view>
        <text class="text-xl font-bold text-foreground block">{{ content.title }}</text>
        <view class="flex items-baseline gap-2">
          <text class="text-2xl font-bold text-primary">¥{{ content.price }}</text>
          <text class="text-sm text-muted-foreground line-through">¥{{ content.originalPrice }}</text>
        </view>
        <view class="flex items-center gap-4 text-sm text-muted-foreground">
          <text class="flex items-center gap-1"> 已售{{ content.sales }}件</text>
          <text class="flex items-center gap-1"> {{ content.rating }}分</text>
        </view>
        <view class="bg-secondary/30 rounded-xl p-4">
          <text class="text-sm text-muted-foreground">{{ content.description }}</text>
        </view>
      </view>

      <!-- 讲师预览 -->
      <view v-if="type === 'teacher' && content" class="space-y-4 text-center">
        <view class="w-24 h-24 mx-auto ring-4 ring-primary/20 rounded-full">
          <image :src="content.avatar" mode="aspectFill" class="w-full h-full rounded-full" />
        </view>
        <view>
          <text class="text-xl font-bold text-foreground block">{{ content.name }}</text>
          <text class="text-sm text-muted-foreground mt-1 block">{{ content.title }}</text>
        </view>
        <view class="flex justify-center gap-8">
          <view class="text-center">
            <text class="text-xl font-bold text-primary block">{{ (content.followers / 1000).toFixed(1) }}k</text>
            <text class="text-xs text-muted-foreground">粉丝</text>
          </view>
          <view class="text-center">
            <text class="text-xl font-bold text-primary block">{{ content.courses }}</text>
            <text class="text-xs text-muted-foreground">课程</text>
          </view>
          <view class="text-center">
            <text class="text-xl font-bold text-primary block">{{ (content.students / 1000).toFixed(1) }}k</text>
            <text class="text-xs text-muted-foreground">学员</text>
          </view>
        </view>
        <view class="bg-secondary/30 rounded-xl p-4 text-left">
          <text class="text-sm text-muted-foreground">{{ content.intro }}</text>
        </view>
      </view>

      <!-- 邀请预览 -->
      <view v-if="type === 'invite' && content" class="space-y-6 text-center">
        <view class="py-6">
          <view class="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <text class="text-2xl text-primary">{{ content.inviter?.name?.[0] || '邀' }}</text>
          </view>
          <text class="text-sm text-muted-foreground">
            <text class="font-medium text-foreground">{{ content.inviter?.name }}</text> 邀请您加入
          </text>
        </view>
        <view>
          <text class="text-2xl font-bold text-foreground block">{{ content.title }}</text>
          <text class="text-muted-foreground mt-2 block">{{ content.subtitle }}</text>
        </view>
        <view class="bg-primary/5 border border-primary/20 rounded-xl p-4">
          <text class="text-sm font-medium text-primary block mb-3">新用户专属福利</text>
          <view class="space-y-2">
            <view v-for="(benefit, index) in content.benefits" :key="index" class="flex items-center gap-2 text-sm">
              <view class="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                <text class="text-xs text-primary font-medium">{{ index + 1 }}</text>
              </view>
              <text class="text-foreground">{{ benefit }}</text>
            </view>
          </view>
        </view>
      </view>
    </main>

    <!-- 底部固定栏 -->
    <view class="fixed bottom-0 left-0 right-0 bg-white border-t border-border px-4 py-3">
      <view @click="handleOpenApp" class="w-full py-3 bg-primary text-white rounded-xl text-base text-center flex items-center justify-center gap-2">
        <text></text>
        <text>打开App查看完整内容</text>
      </view>
      <text class="text-xs text-center text-muted-foreground mt-2 block">下载热卜App，解锁更多国学内容</text>
    </view>

    <!-- 下载提示弹窗 -->
    <view v-if="showDownloadTip" class="fixed inset-0 z-50 bg-black/50 flex items-end justify-center">
      <view class="w-full max-w-lg bg-white rounded-t-2xl p-6">
        <view class="flex items-center justify-between mb-4">
          <text class="text-lg font-bold text-foreground">下载热卜App</text>
          <view @click="showDownloadTip = false" class="p-1"><text class="text-lg text-muted-foreground">✕</text></view>
        </view>
        <view class="flex items-center gap-4 mb-6">
          <view class="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center">
            <text class="text-white font-bold text-xl">热卜</text>
          </view>
          <view>
            <text class="font-medium text-foreground block">热卜 - 国学知识平台</text>
            <text class="text-sm text-muted-foreground">探索国学智慧，开启命理之旅</text>
          </view>
        </view>
        <view class="space-y-3">
          <view @click="handleDownload" class="w-full py-3 bg-primary text-white rounded-xl text-center flex items-center justify-center gap-2">
            <text>💾</text>
            <text class="font-medium">立即下载</text>
          </view>
          <view @click="showDownloadTip = false" class="w-full py-3 border border-border rounded-xl text-center">
            <text class="text-foreground">继续浏览</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'

type ShareType = 'course' | 'article' | 'live' | 'product' | 'teacher' | 'invite'

const type = ref<ShareType>('course')
const id = ref('1')
const content = ref<any>(null)
const loading = ref(true)
const showDownloadTip = ref(false)

const typeIcons: Record<ShareType, string> = {
  course: '', article: '', live: '📻', product: '', teacher: '', invite: ''
}
const typeLabels: Record<ShareType, string> = {
  course: '课程', article: '文章', live: '直播', product: '商品', teacher: '讲师', invite: '邀请'
}
const typeIcon = computed(() => typeIcons[type.value])
const typeLabel = computed(() => typeLabels[type.value])

onLoad((options: any) => {
  type.value = (options?.type as ShareType) || 'course'
  id.value = options?.id || '1'
})

// 模拟获取分享内容
async function getShareContent(t: ShareType, i: string) {
  const contents: Record<string, any> = {
    course: {
      title: '八字命理精讲：从入门到精通',
      cover: '/static/placeholder.png',
      teacher: { name: '张明德', avatar: '/static/avatar-placeholder.png', title: '资深命理师' },
      price: 299, originalPrice: 599, studentCount: 3256, rating: 4.9, lessons: 48,
      description: '系统讲解八字命理基础知识，从天干地支到排盘解读，由浅入深，适合零基础学员...',
    },
    article: {
      title: '如何看懂自己的八字命盘？一文读懂命理学入门',
      cover: '/static/placeholder.png',
      author: { name: '易学研究院', avatar: '/static/avatar-placeholder.png' },
      readCount: 12580, likeCount: 856, publishedAt: '2026-06-01',
      summary: '八字命理是中国传统文化中的重要组成部分...',
    },
    live: {
      title: '今日八字运势解析 - 互动答疑专场',
      cover: '/static/placeholder.png',
      host: { name: '王老师', avatar: '/static/avatar-placeholder.png', title: '首席讲师' },
      startTime: '2026-06-05 20:00', reserveCount: 1280,
    },
    product: {
      title: '专业风水罗盘 - 纯铜精制',
      cover: '/static/placeholder.png',
      price: 688, originalPrice: 998, sales: 526, rating: 4.8,
      description: '纯铜精制，做工精细，适合专业风水师使用...',
    },
    teacher: {
      name: '张明德', avatar: '/static/avatar-placeholder.png',
      title: '资深命理师 · 风水大师', followers: 12800, courses: 15, students: 8600,
      intro: '从事命理研究30余年，师从多位名师...',
    },
    invite: {
      inviter: { name: '国学爱好者', avatar: '/static/avatar-placeholder.png' },
      title: '邀请您加入热卜',
      subtitle: '探索国学智慧，开启命理之旅',
      benefits: ['新用户注册送100积分', '首次购课享9折优惠', '专属学习礼包'],
    },
  }
  return contents[t] || contents.course
}

function handleOpenApp() {
  // 尝试唤起 App（通过 URL Scheme）
  const scheme = `rebu://share?type=${type.value}&id=${id.value}`
  const startTime = Date.now()
  window.location.href = scheme
  // 如果2秒后还在页面，说明没有安装App，显示下载提示
  setTimeout(() => {
    if (Date.now() - startTime < 2500) {
      showDownloadTip.value = true
    }
  }, 2000)
}

function handleDownload() {
  // 设备检测：iOS vs Android
  const ua = navigator.userAgent.toLowerCase()
  if (/iphone|ipad|ipod/.test(ua)) {
    window.location.href = 'https://apps.apple.com/app/rebu'
  } else {
    window.location.href = 'https://play.google.com/store/apps/details?id=com.rebu.app'
  }
}

onMounted(async () => {
  loading.value = true
  content.value = await getShareContent(type.value, id.value)
  loading.value = false
})
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
