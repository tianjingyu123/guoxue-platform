<template>
  <view class="min-h-screen bg-background pb-20">
    <!-- 顶部搜索栏 -->
    <view class="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border/50" style="padding-top: env(safe-area-inset-top)">
      <view class="flex items-center gap-2 px-4 h-14">
        <view class="flex-1 relative">
          <text class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm"></text>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索圈子"
            class="w-full h-9 pl-10 pr-4 rounded-full bg-[#F2EFEA] text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <view v-if="searchQuery" class="absolute right-3 top-1/2 -translate-y-1/2" @click="searchQuery = ''">
            <text class="text-muted-foreground">✕</text>
          </view>
        </view>
        <view class="w-9 h-9 rounded-full bg-primary flex items-center justify-center" @click="openAISearch">
          <text class="text-white text-sm">🤖</text>
        </view>
      </view>
    </view>

    <!-- 分类标签 -->
    <view class="bg-background border-b border-border/50">
      <scroll-view class="flex gap-2 overflow-x-auto py-3 px-4 whitespace-nowrap" scroll-x>
        <view
          v-for="cat in circleCategories"
          :key="cat.id"
          class="inline-flex px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-all flex-shrink-0"
          :class="selectedCategory === cat.id ? 'bg-primary text-white shadow-sm' : 'bg-white text-ink-soft border border-border'"
          @click="selectedCategory = cat.id"
        >
          <text>{{ cat.name }}</text>
        </view>
      </scroll-view>
    </view>

    <view class="px-4 py-4">
      <!-- 我的圈子 -->
      <view class="mb-5">
        <view class="flex items-center justify-between mb-3">
          <view class="flex items-center gap-1 bg-[#F2EFEA] rounded-full p-0.5">
            <view
              class="px-3 py-1.5 text-[13px] font-medium rounded-full transition-all"
              :class="myCircleTab === 'joined' ? 'bg-white text-foreground shadow-sm' : 'text-ink-soft'"
              @click="myCircleTab = 'joined'"
            >
              <text>我加入的</text>
            </view>
            <view
              class="px-3 py-1.5 text-[13px] font-medium rounded-full transition-all"
              :class="myCircleTab === 'created' ? 'bg-white text-foreground shadow-sm' : 'text-ink-soft'"
              @click="myCircleTab = 'created'"
            >
              <text>我创建的</text>
            </view>
          </view>
          <view class="text-[12px] text-primary flex items-center font-medium" @click="goAllMyCircles">
            <text>全部 </text><text class="text-base">›</text>
          </view>
        </view>

        <scroll-view v-if="myCircles.length > 0" class="flex gap-2.5 pb-2 whitespace-nowrap" scroll-x>
          <view v-for="circle in myCircles" :key="circle.id" class="inline-flex flex-shrink-0 w-[140px]" @click="goCircleDetail(circle.id)">
            <view class="overflow-hidden rounded-[12px] shadow-[0_2px_12px_rgba(0,0,0,0.08)] bg-white">
              <view class="relative aspect-[4/3] overflow-hidden">
                <image :src="circle.cover" class="w-full h-full object-cover" />
                <view v-if="circle.unread > 0" class="absolute top-2 right-2 min-w-[20px] h-[20px] px-1.5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center shadow-md">
                  <text>{{ circle.unread > 99 ? '99+' : circle.unread }}</text>
                </view>
              </view>
              <view class="p-2.5">
                <text class="text-[13px] font-bold text-foreground line-clamp-1 block">{{ circle.name }}</text>
                <text class="text-[10px] text-muted-foreground mt-1 block">{{ formatMemberCount(circle.members) }} 成员</text>
                <text class="text-[10px] text-ink-soft line-clamp-1 mt-1 block">{{ circle.lastPost }}</text>
              </view>
            </view>
          </view>
        </scroll-view>
        <view v-else class="py-6 text-center bg-[#F2EFEA] rounded-[12px]">
          <text class="text-[13px] text-ink-soft">{{ myCircleTab === 'created' ? '你还没有创建任何圈子' : '你还没有加入任何圈子' }}</text>
        </view>
      </view>

      <!-- 创建圈子入口 -->
      <view class="mb-5" @click="goCreate">
        <view class="overflow-hidden border-2 border-primary/20 rounded-[14px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] bg-white relative">
          <view class="flex items-center gap-4 p-4">
            <view class="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-[#E02D4A] flex items-center justify-center shadow-lg shadow-primary/25">
              <text class="text-white text-2xl font-bold">+</text>
            </view>
            <view class="flex-1">
              <text class="text-[17px] font-bold text-primary block">创建你的圈子</text>
              <text class="text-[13px] text-ink-soft mt-0.5 block">打造专属国学交流社区，聚集志同道合的朋友</text>
            </view>
            <view class="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
              <text class="text-primary text-lg">›</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 热门圈子 -->
      <view class="mb-5">
        <view class="flex items-center justify-between mb-3">
          <view class="flex items-center gap-2">
            <text class="text-primary text-lg"></text>
            <text class="text-[17px] font-bold text-foreground">热门圈子</text>
          </view>
          <text class="text-[11px] text-muted-foreground bg-[#F2EFEA] px-2 py-0.5 rounded-full">精选优质社群</text>
        </view>

        <view v-for="(circle, index) in displayedHotCircles" :key="circle.id" class="mb-3" @click="goCircleDetail(circle.id)">
          <view class="bg-white rounded-[14px] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
            <view class="relative">
              <image :src="circle.cover" class="w-full h-[140px] object-cover" />
              <view class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <view class="absolute bottom-3 left-3 right-3">
                <view class="flex items-center gap-2 mb-1">
                  <view :class="'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white ' + getRankBadge(index)">
                    <text>{{ index + 1 }}</text>
                  </view>
                  <text class="text-white font-bold text-[16px]">{{ circle.name }}</text>
                </view>
                <text class="text-white/80 text-[12px] line-clamp-1">{{ circle.highlight }}</text>
              </view>
              <view class="absolute top-3 left-3 flex gap-1.5">
                <view v-for="tag in circle.tags" :key="tag" class="px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded text-white text-[10px]">
                  <text>{{ tag }}</text>
                </view>
              </view>
            </view>
            <view class="p-3">
              <view class="flex items-center justify-between mb-2">
                <view class="flex items-center gap-2">
                  <image :src="circle.ownerAvatar" class="w-6 h-6 rounded-full" />
                  <text class="text-[12px] text-ink-soft">{{ circle.owner }}</text>
                  <text class="text-[10px] text-accent bg-accent/10 px-1.5 py-0.5 rounded">{{ circle.ownerTitle }}</text>
                  <text v-if="circle.isVerified" class="text-primary text-[10px]">✓ 认证</text>
                </view>
                <view class="flex items-center gap-1">
                  <text class="text-accent text-sm"></text>
                  <text class="text-[12px] font-medium text-foreground">{{ circle.rating }}</text>
                  <text class="text-[10px] text-muted-foreground">({{ circle.ratingCount }})</text>
                </view>
              </view>
              <view class="flex items-center gap-3 text-[11px] text-muted-foreground">
                <text> {{ formatMemberCount(circle.members) }}</text>
                <text> {{ circle.posts }}帖子</text>
                <text> 今日{{ circle.todayPosts }}</text>
              </view>
              <view v-if="circle.hotPosts && circle.hotPosts.length > 0" class="mt-2 pt-2 border-t border-[#F5F0E8]">
                <text class="text-[11px] text-primary mb-1 block"> 热门讨论</text>
                <text v-for="(post, pi) in circle.hotPosts" :key="pi" class="text-[11px] text-ink-soft line-clamp-1 block">• {{ post }}</text>
              </view>
              <view class="mt-3 flex items-center justify-between">
                <view class="flex items-center gap-1">
                  <view v-for="(joiner, ji) in circle.recentJoiners.slice(0, 3)" :key="ji" class="w-6 h-6 rounded-full border-2 border-white -ml-2 first:ml-0">
                    <image :src="joiner" class="w-full h-full rounded-full" />
                  </view>
                  <text class="text-[10px] text-muted-foreground ml-1">{{ circle.recentJoiners.length }}人最近加入</text>
                </view>
                <view class="flex items-center gap-2">
                  <text v-if="circle.price > 0" class="text-primary font-bold text-sm">{{ circle.price }}币</text>
                  <text v-else class="text-green-600 text-xs font-medium">免费</text>
                  <view
                    class="px-3 py-1 rounded-full text-xs font-medium"
                    :class="joinedCircles.includes(circle.id) ? 'bg-[#F5F0E8] text-muted-foreground' : 'bg-primary text-white'"
                    @click.stop="toggleJoin(circle.id)"
                  >
                    <text>{{ joinedCircles.includes(circle.id) ? '已加入' : '加入' }}</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>

        <view v-if="hotCircles.length > 5" class="w-full mt-3 py-3 flex items-center justify-center gap-1.5 text-[13px] font-medium text-primary bg-white rounded-[12px] shadow-[0_2px_12px_rgba(0,0,0,0.06)]" @click="hotExpanded = !hotExpanded">
          <text>{{ hotExpanded ? '收起' : '查看更多热门圈子 (' + (hotCircles.length - 5) + ')' }}</text>
          <text :class="'text-base transition-transform ' + (hotExpanded ? 'rotate-180' : '')">▼</text>
        </view>
      </view>

      <!-- 发现更多 -->
      <view>
        <view class="flex items-center gap-2 mb-3">
          <text class="text-accent text-lg"></text>
          <text class="text-[17px] font-bold text-foreground">发现更多</text>
        </view>
        <view class="grid grid-cols-2 gap-3">
          <view v-for="circle in recommendCircles" :key="circle.id" class="bg-white rounded-xl overflow-hidden shadow-sm border border-border" @click="goCircleDetail(circle.id)">
            <view class="relative aspect-[4/3]">
              <image :src="circle.cover" class="w-full h-full object-cover" />
              <view class="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              <view class="absolute bottom-2 left-2 right-2">
                <view class="flex items-center gap-1 mb-0.5">
                  <text v-for="tag in circle.tags" :key="tag" class="px-1.5 py-0.5 bg-white/90 rounded text-[9px] text-ink-soft inline">{{ tag }}</text>
                </view>
                <text class="text-white font-bold text-[13px] line-clamp-1 block">{{ circle.name }}</text>
              </view>
            </view>
            <view class="p-2.5">
              <text class="text-[11px] text-muted-foreground line-clamp-1 block mb-1.5">{{ circle.description }}</text>
              <view class="flex items-center justify-between">
                <view class="flex items-center gap-1">
                  <text class="text-accent text-xs"></text>
                  <text class="text-[11px] text-ink-soft">{{ circle.rating }}</text>
                </view>
                <text class="text-[10px] text-muted-foreground">{{ formatMemberCount(circle.members) }}人</text>
              </view>
              <view class="mt-2 pt-2 border-t border-[#F5F0E8] flex items-center justify-between">
                <text v-if="circle.price > 0" class="text-primary font-medium text-xs">{{ circle.price }}币</text>
                <text v-else class="text-green-600 text-xs">免费</text>
                <view
                  class="px-2.5 py-0.5 rounded-full text-[10px] font-medium"
                  :class="joinedCircles.includes(circle.id) ? 'bg-[#F5F0E8] text-muted-foreground' : 'bg-primary text-white'"
                  @click.stop="toggleJoin(circle.id)"
                >
                  <text>{{ joinedCircles.includes(circle.id) ? '已加入' : '加入' }}</text>
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
import { ref, computed } from 'vue'

interface MyCircle {
  id: number
  name: string
  cover: string
  members: number
  unread: number
  lastPost: string
}

interface HotCircle {
  id: number
  name: string
  cover: string
  description: string
  highlight: string
  members: number
  posts: number
  todayPosts: number
  category: string
  price: number
  owner: string
  ownerAvatar: string
  ownerTitle: string
  isVerified: boolean
  tags: string[]
  hotPosts: string[]
  rating: number
  ratingCount: number
  recentJoiners: string[]
}

interface RecommendCircle {
  id: number
  name: string
  cover: string
  description: string
  highlight: string
  members: number
  price: number
  category: string
  ownerAvatar: string
  owner: string
  ownerTitle: string
  isVerified: boolean
  tags: string[]
  rating: number
  todayPosts: number
  recentJoiners: string[]
}

const searchQuery = ref('')
const selectedCategory = ref('all')
const myCircleTab = ref<'joined' | 'created'>('joined')
const hotExpanded = ref(false)
const joinedCircles = ref<number[]>([1, 2, 3, 5])

const circleCategories = [
  { id: 'all', name: '全部' },
  { id: 'bazi', name: '八字命理' },
  { id: 'ziwei', name: '紫微斗数' },
  { id: 'fengshui', name: '风水堪舆' },
  { id: 'liuyao', name: '六爻占卜' },
  { id: 'meihua', name: '梅花易数' },
  { id: 'qimen', name: '奇门遁甲' },
  { id: 'xiangshu', name: '相学' },
  { id: 'dao', name: '道家文化' },
  { id: 'guoxue', name: '国学经典' },
]

const myJoinedCircles = ref<MyCircle[]>([
  { id: 1, name: '八字命理研习社', cover: '/images/circles/circle-1.jpg', members: 12800, unread: 12, lastPost: '今日话题：如何看流年大运' },
  { id: 2, name: '紫微斗数精研会', cover: '/images/circles/circle-2.jpg', members: 8560, unread: 3, lastPost: '紫微斗数案例分析第56期' },
  { id: 3, name: '风水堪舆学院', cover: '/images/circles/circle-3.jpg', members: 6280, unread: 0, lastPost: '办公室风水布局要点' },
  { id: 5, name: '道家养生圈', cover: '/images/circles/circle-2.jpg', members: 9800, unread: 8, lastPost: '道家呼吸法入门教程' },
])

const myCreatedCircles = ref<MyCircle[]>([
  { id: 101, name: '易学初学者交流群', cover: '/images/circles/circle-1.jpg', members: 128, unread: 5, lastPost: '刚才有人问了八字入门的问题...' },
  { id: 102, name: '本地风水爱好者', cover: '/images/circles/circle-2.jpg', members: 56, unread: 0, lastPost: '周末约着看房的朋友们...' },
])

const hotCircles: HotCircle[] = [
  { id: 1, name: '八字命理研习社', cover: '/images/circles/circle-1.jpg', description: '专注八字命理学习与实践的高质量社群', highlight: '周易大师亲授，每周直播答疑，已有3000+学员受益', members: 12800, posts: 3560, todayPosts: 128, category: '八字命理', price: 99, owner: '周易大师', ownerAvatar: '/images/experts/expert-1.jpg', ownerTitle: '20年命理研究', isVerified: true, tags: ['TOP1', '活跃'], hotPosts: ['如何看流年大运的吉凶？', '八字看婚姻的三个关键点'], rating: 4.9, ratingCount: 1286, recentJoiners: ['/images/avatars/avatar-1.jpg', '/images/avatars/avatar-2.jpg', '/images/avatars/avatar-3.jpg'] },
  { id: 2, name: '紫微斗数精研会', cover: '/images/circles/circle-2.jpg', description: '深入研究紫微斗数，探索命运密码', highlight: '紫微斗数第四代传人坐镇，从入门到精通完整体系', members: 8560, posts: 2180, todayPosts: 86, category: '紫微斗数', price: 0, owner: '张玄风', ownerAvatar: '/images/experts/expert-2.jpg', ownerTitle: '紫微传承人', isVerified: true, tags: ['免费', '新手友好'], hotPosts: ['命宫主星性格详解', '紫微斗数排盘基础教程'], rating: 4.8, ratingCount: 856, recentJoiners: ['/images/avatars/avatar-1.jpg', '/images/avatars/avatar-2.jpg', '/images/avatars/avatar-3.jpg'] },
  { id: 3, name: '风水堪舆学院', cover: '/images/circles/circle-3.jpg', description: '实战派风水知识分享与交流', highlight: '1000+真实案例解析，学完就能自己看风水', members: 6280, posts: 1890, todayPosts: 45, category: '风水堪舆', price: 199, owner: '陈风水', ownerAvatar: '/images/experts/expert-1.jpg', ownerTitle: '实战派风水师', isVerified: true, tags: ['大咖入驻', '实战派'], hotPosts: ['客厅沙发摆放禁忌', '办公室旺财风水布局'], rating: 4.7, ratingCount: 628, recentJoiners: ['/images/avatars/avatar-2.jpg', '/images/avatars/avatar-3.jpg', '/images/avatars/avatar-1.jpg'] },
  { id: 4, name: '姓名学研究所', cover: '/images/circles/circle-1.jpg', description: '姓名与命运的关系研究', highlight: '起名改名5000+案例，五格三才数理详解', members: 4560, posts: 980, todayPosts: 32, category: '姓名学', price: 0, owner: '王文昌', ownerAvatar: '/images/experts/expert-2.jpg', ownerTitle: '姓名学专家', isVerified: true, tags: ['免费'], hotPosts: ['2024龙宝宝起名大全'], rating: 4.8, ratingCount: 456, recentJoiners: ['/images/avatars/avatar-3.jpg', '/images/avatars/avatar-1.jpg', '/images/avatars/avatar-2.jpg'] },
  { id: 5, name: '道家养生圈', cover: '/images/circles/circle-2.jpg', description: '道家养生功法与理论', highlight: '武当山道长亲授，道家内丹功法，修身养性', members: 9800, posts: 2560, todayPosts: 98, category: '道家文化', price: 68, owner: '李道长', ownerAvatar: '/images/experts/expert-1.jpg', ownerTitle: '武当道士', isVerified: true, tags: ['活跃', '干货多'], hotPosts: ['道家呼吸吐纳法', '站桩功入门教程'], rating: 4.9, ratingCount: 980, recentJoiners: ['/images/avatars/avatar-1.jpg', '/images/avatars/avatar-3.jpg', '/images/avatars/avatar-2.jpg'] },
  { id: 6, name: '中医经络研习', cover: '/images/circles/circle-3.jpg', description: '中医经络与穴位养生', highlight: '中医世家传承，经络穴位图解，日常保健必备', members: 7200, posts: 1680, todayPosts: 56, category: '中医养生', price: 0, owner: '张仲景传人', ownerAvatar: '/images/experts/expert-2.jpg', ownerTitle: '中医师', isVerified: false, tags: ['免费', '科普'], hotPosts: ['常用穴位按摩指南'], rating: 4.6, ratingCount: 420, recentJoiners: ['/images/avatars/avatar-2.jpg', '/images/avatars/avatar-1.jpg', '/images/avatars/avatar-3.jpg'] },
  { id: 7, name: '周易六爻研习', cover: '/images/circles/circle-1.jpg', description: '六爻预测技法研讨', highlight: '铜钱起卦、断卦技法，实战案例每日更新', members: 3280, posts: 890, todayPosts: 28, category: '八字命理', price: 58, owner: '六爻居士', ownerAvatar: '/images/experts/expert-1.jpg', ownerTitle: '六爻研究者', isVerified: true, tags: ['进阶'], hotPosts: ['六爻断卦基本流程'], rating: 4.7, ratingCount: 320, recentJoiners: ['/images/avatars/avatar-3.jpg', '/images/avatars/avatar-2.jpg', '/images/avatars/avatar-1.jpg'] },
  { id: 8, name: '梅花易数交流', cover: '/images/circles/circle-2.jpg', description: '梅花易数入门与提高', highlight: '随时随地起卦断卦，日常预测必备技能', members: 2560, posts: 720, todayPosts: 18, category: '八字命理', price: 0, owner: '梅花仙子', ownerAvatar: '/images/experts/expert-2.jpg', ownerTitle: '梅花易数传人', isVerified: false, tags: ['免费', '入门'], hotPosts: ['梅花易数快速入门'], rating: 4.5, ratingCount: 256, recentJoiners: ['/images/avatars/avatar-1.jpg', '/images/avatars/avatar-2.jpg', '/images/avatars/avatar-3.jpg'] },
  { id: 9, name: '奇门遁甲秘境', cover: '/images/circles/circle-3.jpg', description: '古代兵法预测术', highlight: '帝王之术，择吉避凶，人生重大决策必备', members: 1980, posts: 560, todayPosts: 12, category: '道家文化', price: 198, owner: '奇门居士', ownerAvatar: '/images/experts/expert-1.jpg', ownerTitle: '奇门传人', isVerified: true, tags: ['高阶', '稀缺'], hotPosts: ['奇门遁甲入门概述'], rating: 4.8, ratingCount: 198, recentJoiners: ['/images/avatars/avatar-2.jpg', '/images/avatars/avatar-3.jpg', '/images/avatars/avatar-1.jpg'] },
  { id: 10, name: '面相手相研究', cover: '/images/circles/circle-1.jpg', description: '相学入门与提高', highlight: '观人识面，掌握命运，社交识人必备技能', members: 5680, posts: 1230, todayPosts: 42, category: '相学', price: 0, owner: '相面先生', ownerAvatar: '/images/experts/expert-2.jpg', ownerTitle: '相学研究者', isVerified: false, tags: ['免费', '图文多'], hotPosts: ['面相看性格基础'], rating: 4.6, ratingCount: 568, recentJoiners: ['/images/avatars/avatar-3.jpg', '/images/avatars/avatar-1.jpg', '/images/avatars/avatar-2.jpg'] },
]

const recommendCircles: RecommendCircle[] = [
  { id: 11, name: '易经智慧应用', cover: '/images/circles/circle-1.jpg', description: '易经智慧在现代生活中的应用', highlight: '易经64卦实战应用，职场决策、人生规划必备', members: 4280, price: 0, category: '国学经典', ownerAvatar: '/images/experts/expert-1.jpg', owner: '易学居士', ownerTitle: '易学研究者', isVerified: true, tags: ['免费', '干货多'], rating: 4.7, todayPosts: 28, recentJoiners: ['/images/avatars/avatar-1.jpg', '/images/avatars/avatar-2.jpg', '/images/avatars/avatar-3.jpg'] },
  { id: 12, name: '塔罗牌占卜交流', cover: '/images/circles/circle-2.jpg', description: '塔罗牌解读与交流', highlight: '78张塔罗牌详解，每日牌阵练习与解读', members: 3560, price: 38, category: '西方占卜', ownerAvatar: '/images/experts/expert-2.jpg', owner: '塔罗师Luna', ownerTitle: '塔罗占卜师', isVerified: true, tags: ['活跃', '新手友好'], rating: 4.8, todayPosts: 45, recentJoiners: ['/images/avatars/avatar-2.jpg', '/images/avatars/avatar-3.jpg', '/images/avatars/avatar-1.jpg'] },
  { id: 13, name: '星座运势分析', cover: '/images/circles/circle-3.jpg', description: '十二星座每日运势分享', highlight: '每日星座运势更新，星盘解读教学', members: 8920, price: 0, category: '星座', ownerAvatar: '/images/experts/expert-1.jpg', owner: '星座达人', ownerTitle: '占星师', isVerified: false, tags: ['免费', '活跃'], rating: 4.6, todayPosts: 68, recentJoiners: ['/images/avatars/avatar-3.jpg', '/images/avatars/avatar-1.jpg', '/images/avatars/avatar-2.jpg'] },
  { id: 14, name: '佛学禅修静心', cover: '/images/circles/circle-1.jpg', description: '佛学经典解读，禅修入门指导', highlight: '心经金刚经解读，每日禅修打卡', members: 6780, price: 0, category: '佛学', ownerAvatar: '/images/experts/expert-2.jpg', owner: '净心居士', ownerTitle: '佛学爱好者', isVerified: true, tags: ['免费', '精华多'], rating: 4.9, todayPosts: 32, recentJoiners: ['/images/avatars/avatar-1.jpg', '/images/avatars/avatar-3.jpg', '/images/avatars/avatar-2.jpg'] },
  { id: 15, name: '古典诗词赏析', cover: '/images/circles/circle-2.jpg', description: '唐诗宋词元曲鉴赏交流', highlight: '每日一首经典诗词，品味古人智慧', members: 5230, price: 0, category: '国学经典', ownerAvatar: '/images/experts/expert-1.jpg', owner: '诗词大家', ownerTitle: '国学讲师', isVerified: true, tags: ['免费', '干货多'], rating: 4.7, todayPosts: 22, recentJoiners: ['/images/avatars/avatar-2.jpg', '/images/avatars/avatar-1.jpg', '/images/avatars/avatar-3.jpg'] },
  { id: 16, name: '书法练习打卡', cover: '/images/circles/circle-3.jpg', description: '每日书法练习，互相监督进步', highlight: '楷书行书草书教学，每日打卡互相进步', members: 2890, price: 28, category: '书法', ownerAvatar: '/images/experts/expert-2.jpg', owner: '墨香斋主', ownerTitle: '书法爱好者', isVerified: false, tags: ['进阶'], rating: 4.5, todayPosts: 18, recentJoiners: ['/images/avatars/avatar-3.jpg', '/images/avatars/avatar-2.jpg', '/images/avatars/avatar-1.jpg'] },
]

const myCircles = computed(() => myCircleTab.value === 'joined' ? myJoinedCircles.value : myCreatedCircles.value)

const displayedHotCircles = computed(() => hotExpanded.value ? hotCircles : hotCircles.slice(0, 5))

function formatMemberCount(members: number): string {
  return members >= 10000 ? (members / 10000).toFixed(1) + '万' : String(members)
}

function getRankBadge(index: number): string {
  if (index === 0) return 'bg-gradient-to-br from-yellow-400 to-orange-500'
  if (index === 1) return 'bg-gradient-to-br from-gray-300 to-gray-400'
  if (index === 2) return 'bg-gradient-to-br from-orange-300 to-orange-400'
  return 'bg-[#999]'
}

function toggleJoin(id: number) {
  const idx = joinedCircles.value.indexOf(id)
  if (idx > -1) joinedCircles.value.splice(idx, 1)
  else joinedCircles.value.push(id)
}

function openAISearch() { /* AI搜索弹窗 */ }
function goAllMyCircles() { uni.navigateTo({ url: '/pages/circles/mine/index' }) }
function goCircleDetail(id: number) { uni.navigateTo({ url: '/pages/circles/id-detail/index?id=' + id }) }
function goCreate() { uni.navigateTo({ url: '/pages/circles/create/index' }) }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
