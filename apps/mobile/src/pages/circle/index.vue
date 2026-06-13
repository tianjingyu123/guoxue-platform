<script setup lang="ts">
import { ref, computed } from 'vue'

// =============================================
// 数据定义（与 React 版本完全一致）
// =============================================
const myJoinedCircles = [
  { id: 1, name: '八字命理研习社', cover: '/static/placeholder.svg', members: 12800, unread: 12, lastPost: '今日话题：如何看流年大运' },
  { id: 2, name: '紫微斗数精研会', cover: '/static/placeholder.svg', members: 8560, unread: 3, lastPost: '紫微斗数案例分析第56期' },
  { id: 3, name: '风水堪舆学院', cover: '/static/placeholder.svg', members: 6280, unread: 0, lastPost: '办公室风水布局要点' },
  { id: 5, name: '道家养生圈', cover: '/static/placeholder.svg', members: 9800, unread: 8, lastPost: '道家呼吸法入门教程' },
]
const myCreatedCircles = [
  { id: 101, name: '易学初学者交流群', cover: '/static/placeholder.svg', members: 128, unread: 5, lastPost: '刚才有人问了八字入门的问题...' },
  { id: 102, name: '本地风水爱好者', cover: '/static/placeholder.svg', members: 56, unread: 0, lastPost: '周末约着看房的朋友们...' },
]
const hotCircles = [
  { id: 1, name: '八字命理研习社', cover: '/static/placeholder.svg', description: '专注八字命理学习与实践的高质量社群', members: 12800, price: 99, owner: '周易大师', ownerAvatar: '/static/placeholder.svg', ownerTitle: '20年命理研究', isVerified: true, tags: ['TOP1', '活跃'], rating: 4.9, todayPosts: 128, recentJoiners: ['/static/placeholder.svg', '/static/placeholder.svg', '/static/placeholder.svg'] },
  { id: 2, name: '紫微斗数精研会', cover: '/static/placeholder.svg', description: '深入研究紫微斗数，探索命运密码', members: 8560, price: 0, owner: '张玄风', ownerAvatar: '/static/placeholder.svg', ownerTitle: '紫微传承人', isVerified: true, tags: ['免费', '新手友好'], rating: 4.8, todayPosts: 86, recentJoiners: [] },
  { id: 3, name: '风水堪舆学院', cover: '/static/placeholder.svg', description: '实战派风水知识分享与交流', members: 6280, price: 199, owner: '陈风水', ownerAvatar: '/static/placeholder.svg', ownerTitle: '实战派风水师', isVerified: true, tags: ['大咖入驻', '实战派'], rating: 4.7, todayPosts: 45, recentJoiners: [] },
  { id: 4, name: '姓名学研究所', cover: '/static/placeholder.svg', description: '姓名与命运的关系研究', members: 4560, price: 0, owner: '王文昌', ownerAvatar: '/static/placeholder.svg', ownerTitle: '姓名学专家', isVerified: true, tags: ['免费'], rating: 4.8, todayPosts: 32, recentJoiners: [] },
  { id: 5, name: '道家养生圈', cover: '/static/placeholder.svg', description: '道家养生功法与理论', members: 9800, price: 68, owner: '李道长', ownerAvatar: '/static/placeholder.svg', ownerTitle: '武当道士', isVerified: true, tags: ['活跃', '干货多'], rating: 4.9, todayPosts: 98, recentJoiners: [] },
  { id: 6, name: '中医经络研习', cover: '/static/placeholder.svg', description: '中医经络与穴位养生', members: 7200, price: 0, owner: '张仲景传人', ownerAvatar: '/static/placeholder.svg', ownerTitle: '中医师', isVerified: false, tags: ['免费', '科普'], rating: 4.6, todayPosts: 56, recentJoiners: [] },
  { id: 7, name: '周易六爻研习', cover: '/static/placeholder.svg', description: '六爻预测技法研讨', members: 3280, price: 58, owner: '六爻居士', ownerAvatar: '/static/placeholder.svg', ownerTitle: '六爻研究者', isVerified: true, tags: ['进阶'], rating: 4.7, todayPosts: 28, recentJoiners: [] },
  { id: 8, name: '梅花易数交流', cover: '/static/placeholder.svg', description: '梅花易数入门与提高', members: 2560, price: 0, owner: '梅花仙子', ownerAvatar: '/static/placeholder.svg', ownerTitle: '梅花易数传人', isVerified: false, tags: ['免费', '入门'], rating: 4.5, todayPosts: 18, recentJoiners: [] },
  { id: 9, name: '奇门遁甲秘境', cover: '/static/placeholder.svg', description: '古代兵法预测术', members: 1980, price: 198, owner: '奇门居士', ownerAvatar: '/static/placeholder.svg', ownerTitle: '奇门传人', isVerified: true, tags: ['高阶', '稀缺'], rating: 4.8, todayPosts: 12, recentJoiners: [] },
  { id: 10, name: '面相手相研究', cover: '/static/placeholder.svg', description: '相学入门与提高', members: 5680, price: 0, owner: '相面先生', ownerAvatar: '/static/placeholder.svg', ownerTitle: '相学研究者', isVerified: false, tags: ['免费', '图文多'], rating: 4.6, todayPosts: 42, recentJoiners: [] },
]
const circleCategories = [
  { id: 'all', name: '全部' }, { id: 'bazi', name: '八字命理' }, { id: 'ziwei', name: '紫微斗数' },
  { id: 'fengshui', name: '风水堪舆' }, { id: 'liuyao', name: '六爻占卜' }, { id: 'meihua', name: '梅花易数' },
  { id: 'qimen', name: '奇门遁甲' }, { id: 'xiangshu', name: '相学' }, { id: 'dao', name: '道家文化' },
  { id: 'guoxue', name: '国学经典' },
]

const searchQuery = ref('')
const selectedCategory = ref('all')
const myCircleTab = ref<'joined' | 'created'>('joined')
const hotExpanded = ref(false)
const joinedCircles = ref<number[]>([1, 2, 3, 5])

const myCircles = computed(() => myCircleTab.value === 'joined' ? myJoinedCircles : myCreatedCircles)
const displayedHotCircles = computed(() => hotExpanded.value ? hotCircles : hotCircles.slice(0, 5))

function formatMembers(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

function handleJoin(circleId: number, e: Event) {
  e.stopPropagation()
  if (joinedCircles.value.includes(circleId)) {
    joinedCircles.value = joinedCircles.value.filter(id => id !== circleId)
  } else {
    joinedCircles.value = [...joinedCircles.value, circleId]
  }
}
</script>

<template>
  <view class="min-h-screen bg-background pb-20">

    <!-- 顶部搜索栏 -->
    <view class="sticky top-0 z-40 bg-background/95 border-b border-border">
      <view class="flex items-center gap-2 px-4 h-14">
        <view class="flex-1 relative">
          <view class="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg class="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </view>
          <input
            v-model="searchQuery"
            placeholder="搜索圈子"
            class="w-full h-9 pl-10 pr-4 rounded-full bg-secondary text-sm text-foreground"
            placeholder-class="text-muted-foreground"
          />
          <view v-if="searchQuery" class="absolute right-3 top-1/2 -translate-y-1/2" @click="searchQuery = ''">
            <svg class="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </view>
        </view>
      </view>
    </view>

    <!-- 分类标签 -->
    <view class="bg-background border-b border-border">
      <scroll-view scroll-x class="py-3 px-4">
        <view class="flex gap-2">
          <view
            v-for="cat in circleCategories"
            :key="cat.id"
            class="px-3.5 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap flex-shrink-0"
            :class="selectedCategory === cat.id
              ? 'bg-primary text-primary-foreground'
              : 'bg-card text-muted-foreground border border-border'"
            @click="selectedCategory = cat.id"
          >
            <text>{{ cat.name }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <view class="px-4 py-4">

      <!-- 我的圈子 -->
      <view class="mb-5">
        <view class="flex items-center justify-between mb-3">
          <view class="flex items-center gap-1 bg-secondary rounded-full p-0.5">
            <view
              class="px-3 py-1.5 text-[13px] font-medium rounded-full transition-all"
              :class="myCircleTab === 'joined' ? 'bg-card text-foreground' : 'text-muted-foreground'"
              @click="myCircleTab = 'joined'"
            >
              <text>我加入的</text>
            </view>
            <view
              class="px-3 py-1.5 text-[13px] font-medium rounded-full transition-all"
              :class="myCircleTab === 'created' ? 'bg-card text-foreground' : 'text-muted-foreground'"
              @click="myCircleTab = 'created'"
            >
              <text>我创建的</text>
            </view>
          </view>
          <navigator url="/pages/circles/mine" class="flex items-center text-[12px] text-primary font-medium">
            <text>全部</text>
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </navigator>
        </view>

        <view v-if="myCircles.length > 0">
          <scroll-view scroll-x class="pb-2 -mx-4 px-4">
            <view class="flex gap-2.5">
              <navigator
                v-for="circle in myCircles"
                :key="circle.id"
                :url="`/pages/circle/detail?id=${circle.id}`"
                class="flex-shrink-0 w-[140px] bg-card rounded-[12px] overflow-hidden"
              >
                <view class="relative aspect-[4/3] overflow-hidden">
                  <image :src="circle.cover" class="w-full h-full" mode="aspectFill" />
                  <view
                    v-if="circle.unread > 0"
                    class="absolute top-2 right-2 min-w-[20px] h-[20px] px-1.5 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
                  >
                    <text class="text-[10px] font-bold">{{ circle.unread > 99 ? '99+' : circle.unread }}</text>
                  </view>
                </view>
                <view class="p-2.5">
                  <text class="text-[13px] font-bold text-foreground line-clamp-1 block">{{ circle.name }}</text>
                  <text class="text-[10px] text-muted-foreground block mt-1">{{ formatMembers(circle.members) }} 成员</text>
                  <text class="text-[10px] text-foreground/70 line-clamp-1 block mt-1">{{ circle.lastPost }}</text>
                </view>
              </navigator>
            </view>
          </scroll-view>
        </view>

        <view v-else class="py-6 text-center bg-secondary rounded-[12px]">
          <text class="text-[13px] text-muted-foreground">
            {{ myCircleTab === 'created' ? '你还没有创建任何圈子' : '你还没有加入任何圈子' }}
          </text>
        </view>
      </view>

      <!-- 创建圈子入口 -->
      <view class="mb-5">
        <navigator url="/pages/circles/create" class="block">
          <view class="flex items-center gap-4 p-4 bg-card border-2 border-primary/20 rounded-[14px]">
            <view class="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center flex-shrink-0">
              <svg class="w-8 h-8 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </view>
            <view class="flex-1">
              <text class="text-[17px] font-bold text-primary block">创建你的圈子</text>
              <text class="text-[13px] text-muted-foreground block mt-0.5">打造专属国学交流社区，聚集志同道合的朋友</text>
            </view>
            <view class="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
              <svg class="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </view>
          </view>
        </navigator>
      </view>

      <!-- 热门圈子 -->
      <view class="mb-5">
        <view class="flex items-center justify-between mb-3">
          <view class="flex items-center gap-2">
            <svg class="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
            </svg>
            <text class="text-[17px] font-bold text-foreground">热门圈子</text>
          </view>
          <view class="px-2 py-0.5 rounded-full bg-secondary">
            <text class="text-[11px] text-muted-foreground">精选优质社群</text>
          </view>
        </view>

        <view class="space-y-3">
          <navigator
            v-for="(circle, index) in displayedHotCircles"
            :key="circle.id"
            :url="`/pages/circle/detail?id=${circle.id}`"
            class="block bg-card rounded-[14px] overflow-hidden border border-border"
          >
            <view class="flex gap-3 p-3">
              <view class="relative w-[88px] h-[88px] rounded-xl overflow-hidden flex-shrink-0">
                <image :src="circle.cover" class="w-full h-full" mode="aspectFill" />
                <view
                  v-if="index < 3"
                  class="absolute top-1 left-1 w-6 h-6 rounded-full flex items-center justify-center"
                  :class="index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-amber-600'"
                >
                  <text class="text-white text-xs font-bold">{{ index + 1 }}</text>
                </view>
              </view>
              <view class="flex-1 min-w-0">
                <view class="flex items-start justify-between gap-2">
                  <text class="font-bold text-[15px] text-foreground line-clamp-1">{{ circle.name }}</text>
                  <view class="flex gap-1 flex-shrink-0">
                    <view
                      v-for="tag in circle.tags.slice(0, 1)"
                      :key="tag"
                      class="px-1.5 py-0.5 rounded-full bg-primary/10"
                    >
                      <text class="text-[10px] text-primary">{{ tag }}</text>
                    </view>
                  </view>
                </view>
                <text class="text-[13px] text-muted-foreground block mt-1 line-clamp-1">{{ circle.description }}</text>
                <view class="flex items-center justify-between mt-2">
                  <view class="flex items-center gap-3">
                    <text class="text-[12px] text-muted-foreground">{{ formatMembers(circle.members) }}成员</text>
                    <view class="flex items-center gap-0.5">
                      <svg class="w-3.5 h-3.5 text-accent" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                      </svg>
                      <text class="text-[12px] text-muted-foreground">{{ circle.rating }}</text>
                    </view>
                  </view>
                  <view
                    class="px-3 py-1 rounded-full text-[12px] font-medium"
                    :class="joinedCircles.includes(circle.id)
                      ? 'bg-secondary text-muted-foreground'
                      : 'bg-primary text-primary-foreground'"
                    @click="(e) => handleJoin(circle.id, e)"
                  >
                    <text>{{ joinedCircles.includes(circle.id) ? '已加入' : circle.price > 0 ? `¥${circle.price}` : '加入' }}</text>
                  </view>
                </view>
              </view>
            </view>
          </navigator>
        </view>

        <view
          v-if="hotCircles.length > 5"
          class="w-full mt-3 py-3 flex items-center justify-center gap-1.5 bg-card rounded-[12px] border border-border"
          @click="hotExpanded = !hotExpanded"
        >
          <text class="text-[13px] font-medium text-primary">
            {{ hotExpanded ? '收起' : `查看更多热门圈子 (${hotCircles.length - 5})` }}
          </text>
          <svg
            class="w-4 h-4 text-primary transition-transform"
            :class="hotExpanded ? 'rotate-180' : ''"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </view>
      </view>

    </view>

    <view class="h-4" />
  </view>
</template>
