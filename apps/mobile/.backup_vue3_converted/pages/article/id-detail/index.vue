<template>
  <view class="min-h-screen bg-background pb-36">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border" style="padding-top: var(--status-bar-height);">
      <view class="flex items-center justify-between h-14 px-4 max-w-3xl mx-auto">
        <view @click="goBack" class="p-2 -ml-2 rounded-full">
          <text class="text-foreground text-lg">←</text>
        </view>
        <view class="flex items-center gap-2">
          <view class="w-10 h-10 flex items-center justify-center" @click="handleShare">
            <text class="text-foreground"></text>
          </view>
          <view class="w-10 h-10 flex items-center justify-center">
            <text class="text-foreground">⋯</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 文章内容 -->
    <scroll-view scroll-y class="px-4 py-6 max-w-3xl mx-auto">
      <!-- 文章标题 -->
      <text class="text-2xl font-bold text-foreground leading-tight block">{{ articleData.title }}</text>

      <!-- 作者信息 -->
      <view class="flex items-center gap-3 mt-5">
        <view class="w-11 h-11 rounded-full bg-secondary flex items-center justify-center">
          <text class="text-foreground">{{ articleData.author.name[0] }}</text>
        </view>
        <view class="flex-1">
          <view class="flex items-center gap-1">
            <text class="text-sm font-medium text-foreground">{{ articleData.author.name }}</text>
            <text v-if="articleData.author.isVerified" class="text-primary text-xs">✓</text>
          </view>
          <text class="text-xs text-muted-foreground block">{{ articleData.author.title }} · {{ articleData.publishTime }}</text>
        </view>
        <view class="px-4 py-1.5 text-sm font-medium rounded-full border border-primary text-primary" @click="handleFollow">
          <text>关注</text>
        </view>
      </view>

      <!-- 阅读数据 -->
      <view class="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
        <text>阅读 {{ articleData.readCount }}</text>
        <text>点赞 {{ likeCount }}</text>
        <text>评论 {{ articleData.commentCount }}</text>
      </view>

      <!-- 分隔线 -->
      <view class="h-px bg-border my-6" />

      <!-- 文章正文 -->
      <view class="article-content">
        <view v-for="(block, index) in articleData.content" :key="index">
          <!-- 标题 -->
          <text v-if="block.type === 'heading'" class="text-lg font-bold text-foreground mt-8 mb-4 block">{{ block.content }}</text>

          <!-- 文字 -->
          <text v-else-if="block.type === 'text'" class="text-foreground/90 leading-relaxed mb-4 text-[15px] block">{{ block.content }}</text>

          <!-- 图片 -->
          <view v-else-if="block.type === 'image'" class="my-6">
            <view class="aspect-video rounded-xl bg-secondary flex items-center justify-center">
              <text class="text-muted-foreground text-sm">{{ block.caption || '图片' }}</text>
            </view>
            <text v-if="block.caption" class="text-center text-sm text-muted-foreground mt-2 block">{{ block.caption }}</text>
          </view>

          <!-- 嵌入内容 -->
          <view v-else-if="block.type === 'embed'">
            <!-- 圈子嵌入 -->
            <view v-if="block.embedType === 'circle'" class="p-4 my-4 rounded-xl bg-secondary/30 border border-border/50">
              <view class="flex items-start gap-3">
                <view class="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                  <text class="text-primary text-2xl"></text>
                </view>
                <view class="flex-1 min-w-0">
                  <view class="flex items-center gap-2">
                    <text class="font-semibold text-foreground">{{ block.data.name }}</text>
                    <view class="text-[10px] bg-primary/10 text-primary px-1.5 py-0 rounded">圈子</view>
                  </view>
                  <text class="text-sm text-muted-foreground mt-1 line-clamp-2 block">{{ block.data.description }}</text>
                  <view class="flex items-center justify-between mt-3">
                    <text class="text-xs text-muted-foreground">{{ block.data.memberCount }} 成员</text>
                    <view @click.stop="toggleJoinCircle(block.data.id)" :class="['px-4 py-1.5 text-sm font-medium rounded-full transition-all', joinedCircle ? 'bg-secondary text-muted-foreground' : 'bg-primary text-white']">
                      <text>{{ joinedCircle ? '已加入' : '加入圈子' }}</text>
                    </view>
                  </view>
                </view>
              </view>
            </view>

            <!-- 课程嵌入 -->
            <view v-if="block.embedType === 'course'" class="p-4 my-4 rounded-xl bg-secondary/30 border border-border/50">
              <view class="flex gap-3">
                <view class="w-24 h-16 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0">
                  <text class="text-primary text-2xl">▶️</text>
                </view>
                <view class="flex-1 min-w-0">
                  <view class="flex items-center gap-2">
                    <view class="text-[10px] bg-accent/20 text-accent px-1.5 py-0 rounded">课程</view>
                  </view>
                  <text class="font-semibold text-foreground mt-1 line-clamp-1 block">{{ block.data.title }}</text>
                  <view class="flex items-center justify-between mt-2">
                    <view class="flex items-baseline gap-2">
                      <text class="text-primary font-bold">¥{{ block.data.price }}</text>
                      <text class="text-xs text-muted-foreground line-through">¥{{ block.data.originalPrice }}</text>
                    </view>
                    <text class="text-xs text-muted-foreground">{{ block.data.students }}人学习</text>
                  </view>
                </view>
                <text class="text-muted-foreground self-center shrink-0">→</text>
              </view>
            </view>

            <!-- 商品嵌入 -->
            <view v-if="block.embedType === 'product'" class="p-4 my-4 rounded-xl bg-secondary/30 border border-border/50">
              <view class="flex gap-3">
                <view class="w-20 h-20 rounded-lg bg-gradient-to-br from-accent/20 to-primary/20 flex items-center justify-center shrink-0">
                  <text class="text-accent text-2xl">️</text>
                </view>
                <view class="flex-1 min-w-0">
                  <view class="flex items-center gap-2">
                    <view class="text-[10px] bg-orange-500/20 text-orange-400 px-1.5 py-0 rounded">商品</view>
                  </view>
                  <text class="font-semibold text-foreground mt-1 line-clamp-2 block">{{ block.data.name }}</text>
                  <view class="flex items-center justify-between mt-2">
                    <view class="flex items-baseline gap-2">
                      <text class="text-primary font-bold">¥{{ block.data.price }}</text>
                      <text class="text-xs text-muted-foreground line-through">¥{{ block.data.originalPrice }}</text>
                    </view>
                    <view class="px-3 py-1 text-xs font-medium rounded-full bg-primary text-white">
                      <text>立即购买</text>
                    </view>
                  </view>
                </view>
              </view>
            </view>

            <!-- 排盘工具嵌入 -->
            <view v-if="block.embedType === 'paipan'" class="p-4 my-4 rounded-xl bg-gradient-to-br from-primary/15 via-background to-accent/10 border border-primary/30">
              <view class="flex items-center gap-4">
                <view class="w-14 h-14 rounded-full bg-primary flex items-center justify-center">
                  <text class="text-white text-2xl">🧭</text>
                </view>
                <view class="flex-1">
                  <text class="font-semibold text-foreground block">{{ block.data.title }}</text>
                  <text class="text-sm text-muted-foreground mt-0.5 block">{{ block.data.description }}</text>
                </view>
                <view class="px-4 py-2 text-sm font-medium rounded-full bg-primary text-white">
                  <text>免费排盘</text>
                </view>
              </view>
            </view>

            <!-- 智能体嵌入 -->
            <view v-if="block.embedType === 'agent'" class="p-4 my-4 rounded-xl bg-gradient-to-br from-accent/10 to-primary/10 border border-accent/30">
              <view class="flex items-center gap-4">
                <view class="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center">
                  <text class="text-foreground text-xl">🤖</text>
                </view>
                <view class="flex-1">
                  <view class="flex items-center gap-2">
                    <text class="font-semibold text-foreground">{{ block.data.name }}</text>
                    <view class="text-[10px] bg-accent/20 text-accent px-1.5 py-0 rounded">AI</view>
                  </view>
                  <text class="text-sm text-muted-foreground mt-0.5 block">{{ block.data.description }}</text>
                </view>
                <view class="px-4 py-2 text-sm font-medium rounded-full bg-accent text-foreground">
                  <text>立即体验</text>
                </view>
              </view>
            </view>
          </view>

          <!-- 其他 -->
          <view v-else />
        </view>
      </view>
    </scroll-view>

    <!-- 底部来源圈子引流区 -->
    <view class="fixed bottom-16 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-border px-4 py-3" style="padding-bottom: env(safe-area-inset-bottom);">
      <view class="max-w-3xl mx-auto">
        <view class="flex items-center gap-3">
          <view class="flex items-center gap-3 flex-1">
            <view class="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
              <text></text>
            </view>
            <view>
              <view class="flex items-center gap-2">
                <text class="text-sm font-medium text-foreground">{{ articleData.sourceCircle.name }}</text>
                <text class="text-[10px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded">{{ articleData.sourceCircle.memberCount }}成员</text>
              </view>
              <text class="text-xs text-muted-foreground mt-0.5 line-clamp-1 block">{{ articleData.sourceCircle.description }}</text>
            </view>
          </view>
          <view
            @click="joinedCircle = !joinedCircle"
            :class="['px-5 py-2 text-sm font-medium rounded-full transition-all shrink-0', joinedCircle ? 'bg-secondary text-muted-foreground' : 'bg-primary text-white']"
          >
            <text>{{ joinedCircle ? '已加入' : '加入圈子' }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部互动区 -->
    <view class="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-4 py-2" style="padding-bottom: env(safe-area-inset-bottom);">
      <view class="max-w-3xl mx-auto flex items-center justify-around">
        <view @click="handleLike" class="flex flex-col items-center gap-0.5 py-1">
          <text>{{ liked ? '' : '🤍' }}</text>
          <text :class="['text-xs', liked ? 'text-primary' : 'text-muted-foreground']">{{ likeCount }}</text>
        </view>
        <view class="flex flex-col items-center gap-0.5 py-1">
          <text></text>
          <text class="text-xs text-muted-foreground">{{ articleData.commentCount }}</text>
        </view>
        <view @click="handleCollect" class="flex flex-col items-center gap-0.5 py-1">
          <text>{{ collected ? '' : '📕' }}</text>
          <text :class="['text-xs', collected ? 'text-accent' : 'text-muted-foreground']">{{ collectCount }}</text>
        </view>
        <view @click="handleShare" class="flex flex-col items-center gap-0.5 py-1">
          <text></text>
          <text class="text-xs text-muted-foreground">分享</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

// 导航辅助
function goBack() { uni.navigateBack() }
function goTo(url: string) { uni.navigateTo({ url }) }

// Mock 数据
const articleData = {
  id: 1,
  title: "八字入门：如何正确排出你的生辰八字",
  author: {
    name: "玄微子",
    avatar: "",
    isVerified: true,
    title: "易学传承人",
    followers: 12680,
  },
  publishTime: "2024-01-15",
  readCount: 8520,
  likeCount: 1256,
  commentCount: 328,
  collectCount: 892,
  sourceCircle: {
    id: 1, name: "八字命理研究社", avatar: "", memberCount: 3280,
    description: "专注八字命理研究，分享实战案例与学习心得",
  },
  content: [
    { type: "text", content: "八字，又称四柱，是中国传统命理学的核心方法之一。它以一个人出生的年、月、日、时四个时间点，各配以天干地支，形成八个字，故称「八字」。", caption: "" },
    { type: "heading", content: "一、什么是八字？", caption: "" },
    { type: "text", content: "八字命理学认为，一个人出生时的天干地支，蕴含着其一生的命运信息。通过分析八字中的五行生克、十神关系、神煞等要素，可以推断一个人的性格、事业、婚姻、财运等方面的情况。", caption: "" },
    { type: "image", content: "", caption: "八字排盘示例图" },
    { type: "text", content: "学习八字，首先要掌握天干地支的基础知识。天干有十个：甲、乙、丙、丁、戊、己、庚、辛、壬、癸；地支有十二个：子、丑、寅、卯、辰、巳、午、未、申、酉、戌、亥。", caption: "" },
    { type: "embed", content: "", caption: "", embedType: "paipan", data: { title: "AI智能排盘", description: "输入生辰，一键生成专业八字命盘" } },
    { type: "heading", content: "二、如何排八字？", caption: "" },
    { type: "text", content: "排八字的第一步是确定出生的准确时间。需要注意的是，八字使用的是真太阳时，而非北京时间。不同地区需要根据经度进行时差校正。", caption: "" },
    { type: "text", content: "年柱以立春为界，月柱以节气为准，日柱以子时为分界，时柱则根据出生时辰确定。这些都需要查阅万年历或使用专业的排盘工具来计算。", caption: "" },
    { type: "embed", content: "", caption: "", embedType: "course", data: { id: 1, title: "八字命理系统课程", cover: "", price: 299, originalPrice: 599, students: 1580 } },
    { type: "heading", content: "三、八字的基本构成", caption: "" },
    { type: "text", content: "八字由四柱组成，每柱包含一个天干和一个地支。年柱代表祖上和童年，月柱代表父母和青年，日柱代表自己和配偶，时柱代表子女和晚年。", caption: "" },
    { type: "text", content: "日干是八字的核心，称为「日主」或「日元」，代表命主本人。其他七个字与日干的关系，决定了十神的配置，这是八字分析的关键。", caption: "" },
    { type: "embed", content: "", caption: "", embedType: "circle", data: { id: 1, name: "八字入门学习圈", avatar: "", memberCount: 2156, description: "零基础入门，系统学习八字命理" } },
    { type: "heading", content: "四、学习建议", caption: "" },
    { type: "text", content: "学习八字需要循序渐进，建议从基础概念开始，先熟悉天干地支、五行生克、十神含义，再逐步深入到格局、用神、大运流年等高级内容。", caption: "" },
    { type: "embed", content: "", caption: "", embedType: "product", data: { id: 1, name: "《渊海子平》精装典藏版", image: "", price: 128, originalPrice: 168, sales: 892 } },
    { type: "text", content: "实践是最好的老师。建议多分析真实案例，与同好交流探讨，在实践中不断验证和修正自己的理解。加入专业的学习圈子，可以获得更系统的指导和更多的交流机会。", caption: "" },
    { type: "embed", content: "", caption: "", embedType: "agent", data: { id: 1, name: "八字智能解读", icon: "bot", description: "AI智能分析你的八字命盘，给出专业解读" } },
  ],
}

// 组件逻辑
const liked = ref(false)
const collected = ref(false)
const joinedCircle = ref(false)
const likeCount = ref(articleData.likeCount)
const collectCount = ref(articleData.collectCount)

const handleLike = () => {
  liked.value = !liked.value
  likeCount.value = liked.value ? likeCount.value + 1 : likeCount.value - 1
}

const handleCollect = () => {
  collected.value = !collected.value
  collectCount.value = collected.value ? collectCount.value + 1 : collectCount.value - 1
}

const handleFollow = () => {
  uni.showToast({ title: '已关注', icon: 'success' })
}

const handleShare = () => {
  uni.showToast({ title: '分享功能开发中', icon: 'none' })
}

const toggleJoinCircle = (circleId: number) => {
  joinedCircle.value = !joinedCircle.value
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
