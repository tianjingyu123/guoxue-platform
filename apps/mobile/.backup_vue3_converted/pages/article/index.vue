<template>
  <view class="min-h-screen bg-background pb-36">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-50 bg-white/95 border-b border-border">
      <view class="flex items-center justify-between px-4 h-14">
        <view @click="goBack" class="p-1"><text class="text-xl text-foreground">←</text></view>
        <view class="flex items-center gap-2">
          <view class="w-10 h-10 flex items-center justify-center" @click="handleShare"><text class="text-lg"></text></view>
          <view class="w-10 h-10 flex items-center justify-center" @click="showMoreMenu = !showMoreMenu"><text class="text-lg">⋯</text></view>
        </view>
      </view>
    </view>

    <!-- 加载骨架 -->
    <view v-if="loading">
      <view class="animate-pulse px-4 py-6">
        <view class="h-7 bg-[#E8E0D5] rounded w-3/4 mb-5" />
        <view class="flex items-center gap-3 mb-4">
          <view class="w-11 h-11 rounded-full bg-[#E8E0D5]" />
          <view>
            <view class="h-4 w-24 bg-[#E8E0D5] rounded mb-1" />
            <view class="h-3 w-32 bg-[#E8E0D5] rounded" />
          </view>
        </view>
        <view class="h-px bg-[#E8E0D5] my-6" />
        <view v-for="i in 6" :key="i" class="h-4 bg-[#E8E0D5] rounded mb-3" :style="{ width: (60 + Math.random() * 40) + '%' }" />
        <view class="h-32 bg-[#E8E0D5] rounded-xl my-4" />
        <view v-for="i in 4" :key="i" class="h-4 bg-[#E8E0D5] rounded mb-3" :style="{ width: (60 + Math.random() * 40) + '%' }" />
      </view>
    </view>

    <!-- 文章内容 -->
    <view v-else class="px-4 py-6">
      <!-- 标题 -->
      <text class="text-2xl font-bold text-foreground leading-tight block">{{ article.title }}</text>

      <!-- 作者信息 -->
      <view class="flex items-center gap-3 mt-5">
        <view class="flex items-center gap-3 flex-1" @click="goAuthor">
          <view class="w-11 h-11 rounded-full bg-[#F0EDE8] flex items-center justify-center">
            <text class="text-foreground font-medium">{{ article.author.name[0] }}</text>
          </view>
          <view class="flex-1">
            <view class="flex items-center gap-2">
              <text class="font-medium text-foreground">{{ article.author.name }}</text>
              <text v-if="article.author.isVerified" class="text-primary text-sm">✓</text>
            </view>
            <view class="flex items-center gap-2 text-sm text-muted-foreground">
              <text>{{ article.author.title }}</text>
              <text>·</text>
              <text>{{ article.publishTime }}</text>
            </view>
          </view>
        </view>
        <view class="px-4 py-1.5 text-sm font-medium rounded-full border border-primary text-primary" @click="toggleFollow">
          <text>{{ followed ? '已关注' : '关注' }}</text>
        </view>
      </view>

      <!-- 阅读数据 -->
      <view class="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
        <text>阅读 {{ article.readCount }}</text>
        <text>点赞 {{ likeCount }}</text>
        <text>评论 {{ article.commentCount }}</text>
      </view>

      <!-- 分隔线 -->
      <view class="h-px bg-[#E8E0D5] my-6" />

      <!-- 文章正文（内容块渲染） -->
      <view>
        <template v-for="(block, idx) in article.content" :key="idx">
          <!-- 标题块 -->
          <text v-if="block.type === 'heading'" class="text-lg font-bold text-foreground mt-8 mb-4 block">{{ block.content }}</text>

          <!-- 文本块 -->
          <text v-else-if="block.type === 'text'" class="text-[#333] leading-relaxed mb-4 text-[15px] block">{{ block.content }}</text>

          <!-- 图片块 -->
          <view v-else-if="block.type === 'image'" class="my-6">
            <view class="aspect-video rounded-xl bg-[#F0EDE8] flex items-center justify-center">
              <text class="text-muted-foreground text-sm">{{ block.caption }}</text>
            </view>
            <text class="text-center text-sm text-muted-foreground mt-2 block">{{ block.caption }}</text>
          </view>

          <!-- 嵌入块 -->
          <view v-else-if="block.type === 'embed'">
            <!-- 圈子嵌入 -->
            <view v-if="block.embedType === 'circle'" class="p-4 my-4 bg-[#F0EDE8]/50 rounded-xl border border-border/50">
              <view class="flex items-start gap-3">
                <view class="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                  <text class="text-xl"></text>
                </view>
                <view class="flex-1 min-w-0">
                  <view class="flex items-center gap-2">
                    <text class="font-semibold text-foreground">{{ block.data.name }}</text>
                    <view class="px-1.5 py-0 bg-primary/10 text-primary text-[10px] rounded">圈子</view>
                  </view>
                  <text class="text-sm text-muted-foreground mt-1 line-clamp-2 block">{{ block.data.description }}</text>
                  <view class="flex items-center justify-between mt-3">
                    <text class="text-xs text-muted-foreground">{{ block.data.memberCount }} 成员</text>
                    <view :class="['px-4 py-1.5 text-sm font-medium rounded-full', circleJoined ? 'bg-[#F0EDE8] text-muted-foreground' : 'bg-primary text-white']" @click="circleJoined = !circleJoined">
                      <text>{{ circleJoined ? '已加入' : '加入圈子' }}</text>
                    </view>
                  </view>
                </view>
              </view>
            </view>

            <!-- 课程嵌入 -->
            <view v-else-if="block.embedType === 'course'" class="p-4 my-4 bg-[#F0EDE8]/50 rounded-xl border border-border/50" @click="goCourse(block.data.id)">
              <view class="flex gap-3">
                <view class="w-24 h-16 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0">
                  <text class="text-2xl">▶</text>
                </view>
                <view class="flex-1 min-w-0">
                  <view class="px-1.5 py-0 bg-accent/20 text-accent text-[10px] rounded inline-block">课程</view>
                  <text class="font-semibold text-foreground mt-1 line-clamp-1 block">{{ block.data.title }}</text>
                  <view class="flex items-center justify-between mt-2">
                    <view class="flex items-baseline gap-2">
                      <text class="text-primary font-bold">¥{{ block.data.price }}</text>
                      <text class="text-xs text-muted-foreground line-through">¥{{ block.data.originalPrice }}</text>
                    </view>
                    <text class="text-xs text-muted-foreground">{{ block.data.students }}人学习</text>
                  </view>
                </view>
                <text class="text-muted-foreground self-center">›</text>
              </view>
            </view>

            <!-- 商品嵌入 -->
            <view v-else-if="block.embedType === 'product'" class="p-4 my-4 bg-[#F0EDE8]/50 rounded-xl border border-border/50" @click="goProduct(block.data.id)">
              <view class="flex gap-3">
                <view class="w-20 h-20 rounded-lg bg-gradient-to-br from-accent/20 to-primary/10 flex items-center justify-center shrink-0">
                  <text class="text-2xl">️</text>
                </view>
                <view class="flex-1 min-w-0">
                  <view class="px-1.5 py-0 bg-orange-100 text-orange-500 text-[10px] rounded inline-block">商品</view>
                  <text class="font-semibold text-foreground mt-1 line-clamp-2 block">{{ block.data.name }}</text>
                  <view class="flex items-center justify-between mt-2">
                    <view class="flex items-baseline gap-2">
                      <text class="text-primary font-bold">¥{{ block.data.price }}</text>
                      <text class="text-xs text-muted-foreground line-through">¥{{ block.data.originalPrice }}</text>
                    </view>
                    <view class="px-3 py-1 text-xs font-medium rounded-full bg-primary text-white">立即购买</view>
                  </view>
                </view>
              </view>
            </view>

            <!-- 排盘工具嵌入 -->
            <view v-else-if="block.embedType === 'paipan'" class="p-4 my-4 rounded-xl bg-gradient-to-br from-primary/15 to-accent/10 border border-primary/30" @click="goPaipan">
              <view class="flex items-center gap-4">
                <view class="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg">
                  <text class="text-white text-xl">️</text>
                </view>
                <view class="flex-1">
                  <text class="font-semibold text-foreground block">{{ block.data.title }}</text>
                  <text class="text-sm text-muted-foreground mt-0.5 block">{{ block.data.description }}</text>
                </view>
                <view class="px-4 py-2 text-sm font-medium rounded-full bg-primary text-white">免费排盘</view>
              </view>
            </view>

            <!-- 智能体嵌入 -->
            <view v-else-if="block.embedType === 'agent'" class="p-4 my-4 rounded-xl bg-gradient-to-br from-accent/10 to-primary/10 border border-accent/30" @click="goAgent(block.data.id)">
              <view class="flex items-center gap-4">
                <view class="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center shadow-lg">
                  <text class="text-white text-lg">🤖</text>
                </view>
                <view class="flex-1">
                  <view class="flex items-center gap-2">
                    <text class="font-semibold text-foreground">{{ block.data.name }}</text>
                    <view class="px-1.5 py-0 bg-accent/20 text-accent text-[10px] rounded">AI</view>
                  </view>
                  <text class="text-sm text-muted-foreground mt-0.5 block">{{ block.data.description }}</text>
                </view>
                <view class="px-4 py-2 text-sm font-medium rounded-full bg-accent text-white">立即体验</view>
              </view>
            </view>
          </view>
        </template>
      </view>
    </view>

    <!-- 底部来源圈子栏 -->
    <view class="fixed bottom-16 left-0 right-0 bg-white/95 border-t border-border px-4 py-3 z-20">
      <view class="flex items-center gap-3">
        <view class="flex items-center gap-3 flex-1" @click="goCircle">
          <view class="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
            <text class="text-xl"></text>
          </view>
          <view class="flex-1 min-w-0">
            <view class="flex items-center gap-2">
              <text class="font-semibold text-foreground">{{ article.sourceCircle.name }}</text>
              <view class="px-1.5 py-0 bg-[#F0EDE8] text-muted-foreground text-[10px] rounded">{{ article.sourceCircle.memberCount }}成员</view>
            </view>
            <text class="text-sm text-muted-foreground line-clamp-1">{{ article.sourceCircle.description }}</text>
          </view>
        </view>
        <view :class="['px-5 py-2 text-sm font-medium rounded-full shrink-0', sourceJoined ? 'bg-[#F0EDE8] text-muted-foreground' : 'bg-primary text-white']" @click="sourceJoined = !sourceJoined">
          <text>{{ sourceJoined ? '已加入' : '加入圈子' }}</text>
        </view>
      </view>
    </view>

    <!-- 底部互动栏 -->
    <view class="fixed bottom-0 left-0 right-0 bg-white border-t border-border px-4 py-2 z-20">
      <view class="flex items-center justify-around">
        <view class="flex flex-col items-center gap-0.5 py-1" @click="handleLike">
          <text :class="['text-xl', liked ? 'text-primary' : 'text-muted-foreground']">{{ liked ? '' : '🤍' }}</text>
          <text :class="['text-xs', liked ? 'text-primary' : 'text-muted-foreground']">{{ likeCount }}</text>
        </view>
        <view class="flex flex-col items-center gap-0.5 py-1" @click="scrollToComment">
          <text class="text-xl text-muted-foreground"></text>
          <text class="text-xs text-muted-foreground">{{ article.commentCount }}</text>
        </view>
        <view class="flex flex-col items-center gap-0.5 py-1" @click="handleCollect">
          <text :class="['text-xl', collected ? 'text-accent' : 'text-muted-foreground']">{{ collected ? '' : '☆' }}</text>
          <text :class="['text-xs', collected ? 'text-accent' : 'text-muted-foreground']">{{ collectCount }}</text>
        </view>
        <view class="flex flex-col items-center gap-0.5 py-1" @click="handleShare">
          <text class="text-xl text-muted-foreground"></text>
          <text class="text-xs text-muted-foreground">分享</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface ContentBlock {
  type: 'heading' | 'text' | 'image' | 'embed'
  content?: string
  caption?: string
  embedType?: string
  data?: any
}

interface ArticleData {
  id: number
  title: string
  author: { name: string; avatar: string; isVerified: boolean; title: string; followers: number }
  publishTime: string
  readCount: number
  likeCount: number
  commentCount: number
  collectCount: number
  sourceCircle: { id: number; name: string; avatar: string; memberCount: number; description: string }
  content: ContentBlock[]
}

const loading = ref(true)
const liked = ref(false)
const collected = ref(false)
const followed = ref(false)
const circleJoined = ref(false)
const sourceJoined = ref(false)
const likeCount = ref(0)
const collectCount = ref(0)
const showMoreMenu = ref(false)

const article = ref<ArticleData>({
  id: 1,
  title: '八字入门：如何正确排出你的生辰八字',
  author: { name: '玄微子', avatar: '', isVerified: true, title: '易学传承人', followers: 12680 },
  publishTime: '2024-01-15',
  readCount: 8520,
  likeCount: 1256,
  commentCount: 328,
  collectCount: 892,
  sourceCircle: { id: 1, name: '八字命理研究社', avatar: '', memberCount: 3280, description: '专注八字命理研究，分享实战案例与学习心得' },
  content: [
    { type: 'text', content: '八字，又称四柱，是中国传统命理学的核心方法之一。它以一个人出生的年、月、日、时四个时间点，各配以天干地支，形成八个字，故称「八字」。' },
    { type: 'heading', content: '一、什么是八字？' },
    { type: 'text', content: '八字命理学认为，一个人出生时的天干地支，蕴含着其一生的命运信息。通过分析八字中的五行生克、十神关系、神煞等要素，可以推断一个人的性格、事业、婚姻、财运等方面的情况。' },
    { type: 'image', caption: '八字排盘示例图' },
    { type: 'text', content: '学习八字，首先要掌握天干地支的基础知识。天干有十个：甲、乙、丙、丁、戊、己、庚、辛、壬、癸；地支有十二个：子、丑、寅、卯、辰、巳、午、未、申、酉、戌、亥。' },
    { type: 'embed', embedType: 'paipan', data: { title: 'AI智能排盘', description: '输入生辰，一键生成专业八字命盘' } },
    { type: 'heading', content: '二、如何排八字？' },
    { type: 'text', content: '排八字的第一步是确定出生的准确时间。需要注意的是，八字使用的是真太阳时，而非北京时间。不同地区需要根据经度进行时差校正。' },
    { type: 'text', content: '年柱以立春为界，月柱以节气为准，日柱以子时为分界，时柱则根据出生时辰确定。这些都需要查阅万年历或使用专业的排盘工具来计算。' },
    { type: 'embed', embedType: 'course', data: { id: 1, title: '八字命理系统课程', price: 299, originalPrice: 599, students: 1580 } },
    { type: 'heading', content: '三、八字的基本构成' },
    { type: 'text', content: '八字由四柱组成，每柱包含一个天干和一个地支。年柱代表祖上和童年，月柱代表父母和青年，日柱代表自己和配偶，时柱代表子女和晚年。' },
    { type: 'embed', embedType: 'circle', data: { id: 1, name: '八字入门学习圈', memberCount: 2156, description: '零基础入门，系统学习八字命理' } },
    { type: 'heading', content: '四、学习建议' },
    { type: 'text', content: '学习八字需要循序渐进，建议从基础概念开始，先熟悉天干地支、五行生克、十神含义，再逐步深入到格局、用神、大运流年等高级内容。' },
    { type: 'embed', embedType: 'product', data: { id: 1, name: '《渊海子平》精装典藏版', price: 128, originalPrice: 168, sales: 892 } },
    { type: 'text', content: '实践是最好的老师。建议多分析真实案例，与同好交流探讨，在实践中不断验证和修正自己的理解。加入专业的学习圈子，可以获得更系统的指导和更多的交流机会。' },
    { type: 'embed', embedType: 'agent', data: { id: 1, name: '八字智能解读', description: 'AI智能分析你的八字命盘，给出专业解读' } },
  ],
})

onMounted(() => {
  likeCount.value = article.value.likeCount
  collectCount.value = article.value.collectCount
  setTimeout(() => { loading.value = false }, 600)
})

function handleLike() {
  liked.value = !liked.value
  likeCount.value += liked.value ? 1 : -1
}
function handleCollect() {
  collected.value = !collected.value
  collectCount.value += collected.value ? 1 : -1
}
function toggleFollow() {
  followed.value = !followed.value
  uni.showToast({ title: followed.value ? '已关注' : '已取消关注', icon: 'none' })
}
function handleShare() {
  uni.showToast({ title: '分享功能已开启', icon: 'none' })
}
function scrollToComment() {
  uni.showToast({ title: '查看评论', icon: 'none' })
}
function goBack() { uni.navigateBack() }
function goAuthor() { uni.navigateTo({ url: '/pages/user/index' }) }
function goCircle() { uni.navigateTo({ url: '/pages/circles/id-detail/index' }) }
function goCourse(id: number) { uni.navigateTo({ url: `/pages/courses/courseId-detail/index?id=${id}` }) }
function goProduct(id: number) { uni.navigateTo({ url: `/pages/shop/id-detail/index?id=${id}` }) }
function goPaipan() { uni.navigateTo({ url: '/pages/paipan/index' }) }
function goAgent(id: number) { uni.navigateTo({ url: `/pages/agent/id-detail/index?id=${id}` }) }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
