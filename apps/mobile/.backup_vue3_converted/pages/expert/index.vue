<template>
  <!-- 专家详情页 -->
  <view class="min-h-screen bg-background flex flex-col">
    <!-- 导航栏 -->
    <view class="flex items-center justify-between px-4 h-12 bg-white border-b border-border shrink-0">
      <view class="p-1" @click="goBack"><text class="text-xl text-foreground">←</text></view>
      <text class="text-base font-semibold text-foreground">专家详情</text>
      <view class="w-7 flex justify-end">
        <text class="text-base text-muted-foreground" @click="shareExpert"></text>
      </view>
    </view>

    <!-- 加载骨架屏 -->
    <view v-if="isLoading" class="flex-1 p-4">
      <!-- 头部骨架 -->
      <view class="bg-white rounded-xl p-6 mb-4 animate-pulse shadow-sm">
        <view class="flex items-center gap-4 mb-4">
          <view class="w-20 h-20 bg-[#E8E0D5] rounded-full shrink-0" />
          <view class="flex-1 space-y-2">
            <view class="h-5 w-28 bg-[#E8E0D5] rounded" />
            <view class="h-4 w-36 bg-[#E8E0D5] rounded" />
          </view>
        </view>
        <view class="flex gap-2">
          <view v-for="i in 3" :key="i" class="h-6 w-16 bg-[#E8E0D5] rounded-lg" />
        </view>
      </view>
      <!-- 数据骨架 -->
      <view class="flex gap-3 mb-4">
        <view v-for="i in 3" :key="i" class="flex-1 bg-white rounded-xl p-4 animate-pulse shadow-sm">
          <view class="h-6 w-full bg-[#E8E0D5] rounded mb-2" />
          <view class="h-3 w-12 bg-[#E8E0D5] rounded mx-auto" />
        </view>
      </view>
      <!-- 评价骨架 -->
      <view v-for="i in 2" :key="i" class="bg-white rounded-xl p-4 mb-3 animate-pulse shadow-sm">
        <view class="flex items-center gap-3 mb-3">
          <view class="w-8 h-8 bg-[#E8E0D5] rounded-full" />
          <view class="flex-1 space-y-1.5">
            <view class="h-4 w-20 bg-[#E8E0D5] rounded" />
            <view class="h-3 w-32 bg-[#E8E0D5] rounded" />
          </view>
        </view>
        <view class="h-4 w-full bg-[#E8E0D5] rounded" />
      </view>
    </view>

    <!-- 错误状态 -->
    <view v-else-if="isError" class="flex-1 flex flex-col items-center justify-center p-8">
      <text class="text-5xl mb-4">⚠</text>
      <text class="text-base text-foreground font-medium mb-2">加载失败</text>
      <text class="text-sm text-muted-foreground mb-4">无法获取专家信息</text>
      <view class="px-6 py-2 bg-primary text-white rounded-2xl text-sm" @click="loadData">重新加载</view>
    </view>

    <!-- 主体内容 -->
    <scroll-view v-else scroll-y class="flex-1">
      <!-- 专家头部信息 -->
      <view class="bg-white mx-4 mt-4 rounded-xl p-5 shadow-sm">
        <view class="flex items-center gap-4">
          <view class="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-[#E74C3C] text-white flex items-center justify-center text-3xl font-bold shrink-0">
            {{ expert.name[0] }}
          </view>
          <view class="flex-1">
            <text class="text-lg font-bold text-foreground block">{{ expert.name }}</text>
            <text class="text-xs text-muted-foreground block mt-0.5">{{ expert.title }}</text>
            <view class="flex items-center gap-2 mt-1.5">
              <view class="flex items-center">
                <text class="text-sm text-yellow-500"></text>
                <text class="text-xs text-foreground font-medium ml-0.5">{{ expert.rating }}</text>
              </view>
              <text class="text-[10px] text-muted-foreground">|</text>
              <text class="text-xs text-muted-foreground">{{ expert.serviceCount }} 人咨询</text>
            </view>
          </view>
        </view>

        <!-- 擅长领域标签 -->
        <view class="flex flex-wrap gap-2 mt-4">
          <view
            v-for="tag in expert.tags"
            :key="tag"
            class="px-2.5 py-1 bg-primary/5 text-primary rounded-lg text-xs"
          >
            {{ tag }}
          </view>
        </view>

        <!-- 简介 -->
        <view class="mt-4 pt-4 border-t border-border">
          <text class="text-xs font-semibold text-foreground block mb-2">个人简介</text>
          <text class="text-xs text-[#555] leading-6 block">{{ expert.bio }}</text>
        </view>
      </view>

      <!-- 数据卡片 -->
      <view class="flex gap-3 mx-4 mt-3">
        <view class="flex-1 bg-white rounded-xl p-4 text-center shadow-sm">
          <text class="text-xl font-bold text-primary block">¥{{ expert.price }}</text>
          <text class="text-xs text-muted-foreground mt-1">咨询价格/次</text>
        </view>
        <view class="flex-1 bg-white rounded-xl p-4 text-center shadow-sm">
          <text class="text-xl font-bold text-primary block">{{ expert.serviceCount }}</text>
          <text class="text-xs text-muted-foreground mt-1">服务人次</text>
        </view>
        <view class="flex-1 bg-white rounded-xl p-4 text-center shadow-sm">
          <text class="text-xl font-bold text-primary block">{{ expert.years }}</text>
          <text class="text-xs text-muted-foreground mt-1">从业年限</text>
        </view>
      </view>

      <!-- 用户评价 -->
      <view class="mx-4 mt-4">
        <view class="flex items-center justify-between mb-3">
          <text class="text-sm font-semibold text-foreground">用户评价</text>
          <view class="flex items-center gap-1">
            <text class="text-xs text-muted-foreground">好评率 {{ expert.praiseRate }}%</text>
            <text class="text-base text-[#ccc]">›</text>
          </view>
        </view>

        <!-- 空评价 -->
        <view v-if="reviews.length === 0" class="bg-white rounded-xl p-6 flex flex-col items-center shadow-sm">
          <text class="text-4xl mb-2"></text>
          <text class="text-xs text-muted-foreground">暂无评价</text>
        </view>

        <!-- 评价列表 -->
        <view v-else class="space-y-2">
          <view
            v-for="review in reviews"
            :key="review.id"
            class="bg-white rounded-xl p-4 shadow-sm"
          >
            <view class="flex items-center gap-2.5 mb-2">
              <view class="w-7 h-7 rounded-full flex items-center justify-center text-xs text-white font-medium shrink-0" :class="review.gender === 'male' ? 'bg-blue-400' : 'bg-pink-400'">
                {{ review.userName[0] }}
              </view>
              <view class="flex-1">
                <text class="text-xs font-medium text-foreground block">{{ review.userName }}</text>
                <text class="text-[10px] text-muted-foreground">{{ review.date }}</text>
              </view>
              <text class="text-xs text-yellow-500">{{ ''.repeat(review.rating) }}</text>
            </view>
            <text class="text-xs text-[#555] leading-5 block">{{ review.content }}</text>
          </view>
        </view>
      </view>

      <!-- 底部操作栏 -->
      <view class="sticky bottom-0 bg-white px-4 py-3 border-t border-border flex items-center gap-3 mt-3 shadow-lg">
        <view class="flex-1 flex items-center gap-4">
          <view class="flex flex-col items-center" @click="collectExpert">
            <text class="text-base">{{ expert.isCollected ? '' : '🔖' }}</text>
            <text class="text-[10px] text-muted-foreground">{{ expert.isCollected ? '已收藏' : '收藏' }}</text>
          </view>
          <view class="flex flex-col items-center" @click="contactExpert">
            <text class="text-base"></text>
            <text class="text-[10px] text-muted-foreground">私信</text>
          </view>
        </view>
        <view
          class="flex-1 h-10 bg-primary text-white rounded-2xl flex items-center justify-center text-sm font-medium"
          @click="bookExpert"
        >
          预约咨询
        </view>
      </view>

      <view class="h-4" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface Review {
  id: string
  userName: string
  gender: 'male' | 'female'
  rating: number
  date: string
  content: string
}

interface Expert {
  id: string
  name: string
  title: string
  rating: string
  serviceCount: number
  price: number
  years: number
  praiseRate: number
  tags: string[]
  bio: string
  isCollected: boolean
}

const isLoading = ref(true)
const isError = ref(false)

const expert = ref<Expert>({
  id: '1',
  name: '曾仕明',
  title: '易学研究员 · 国学传承人 · 20年研易经验',
  rating: '4.9',
  serviceCount: 3280,
  price: 299,
  years: 20,
  praiseRate: 98,
  tags: ['八字命理', '紫微斗数', '风水布局', '周易占卜', '姓名学'],
  bio: '曾仕明老师，自幼受家庭熏陶研习易学，师从多位民间高人。专注易学应用研究二十余年，擅长将深奥的易学理论转化为通俗易懂的生活智慧。曾为多家企业提供风水咨询服务，累计服务客户超过3000人次。教学风格深入浅出，深受学员喜爱。',
  isCollected: false,
})

const reviews = ref<Review[]>([
  { id: '1', userName: '张学员', gender: 'male', rating: 5, date: '2026-05-28', content: '曾老师讲解非常透彻，让我对八字有了全新的认识。原本觉得命理很玄乎，老师的分析让我豁然开朗。' },
  { id: '2', userName: '李女士', gender: 'female', rating: 5, date: '2026-05-20', content: '咨询了风水布局问题，给出的建议非常实用。按照老师的方法调整后，确实感觉家中气场好了很多。强烈推荐！' },
  { id: '3', userName: '王同学', gender: 'male', rating: 4, date: '2026-05-15', content: '课程内容很充实，老师也很耐心解答问题。就是希望能多增加一些实际案例分析的环节。' },
  { id: '4', userName: '赵女士', gender: 'female', rating: 5, date: '2026-05-08', content: '第二次找老师咨询了，每次都能得到中肯的建议。老师不仅专业，而且非常负责任。' },
])

function collectExpert() {
  expert.value.isCollected = !expert.value.isCollected
  uni.showToast({
    title: expert.value.isCollected ? '已收藏' : '取消收藏',
    icon: 'none',
  })
}

function contactExpert() {
  uni.navigateTo({ url: '/pages/chat/index?expertId=' + expert.value.id })
}

function bookExpert() {
  uni.navigateTo({ url: '/pages/booking/index?expertId=' + expert.value.id })
}

function shareExpert() {
  uni.showToast({ title: '分享功能开发中', icon: 'none' })
}

function loadData() {
  isLoading.value = true
  isError.value = false
  setTimeout(() => {
    isLoading.value = false
  }, 700)
}

function goBack() {
  uni.navigateBack()
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
