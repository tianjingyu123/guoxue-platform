<template>
  <view class="min-h-screen bg-background pb-24">
    <!-- 顶部导航 -->
    <header class="sticky top-0 z-50 bg-primary text-white">
      <view class="flex items-center justify-between px-4 h-11">
        <view @click="goBack" class="flex items-center">
          <text class="text-white text-lg">←</text>
        </view>
        <text class="font-medium">赛事详情</text>
        <view>
          <text class="text-white text-lg"></text>
        </view>
      </view>
    </header>

    <!-- 赛事头图 -->
    <view class="relative h-48 bg-gradient-to-br from-primary via-primary to-primary/80">
      <view class="absolute inset-0 flex items-center justify-center">
        <text class="text-6xl text-white/20"></text>
      </view>
      <view class="absolute top-4 left-4 flex items-center gap-2">
        <text :class="['text-white text-xs px-2 py-0.5 rounded', statusConfig[competition.status as keyof typeof statusConfig]?.color || 'bg-green-500']">
          {{ statusConfig[competition.status as keyof typeof statusConfig]?.label || '' }}
        </text>
        <text class="bg-white/20 text-white text-xs px-2 py-0.5 rounded">平台赛事</text>
      </view>
    </view>

    <!-- 基本信息卡片 -->
    <view class="mx-4 -mt-8 relative z-10 bg-white rounded-xl p-4 border border-border/50">
      <text class="text-lg font-bold text-foreground block mb-2">{{ competition.title }}</text>
      <view class="flex items-center gap-2 text-sm text-muted-foreground mb-3">
        <text class="flex items-center gap-1">
          <text class="text-primary"></text>{{ competition.organizer }}
        </text>
      </view>
      <view class="mb-3">
        <view class="flex items-center justify-between text-sm mb-1">
          <text class="text-muted-foreground">报名人数</text>
          <text class="font-medium">{{ competition.participants }}/{{ competition.maxParticipants }}</text>
        </view>
        <view class="h-2 bg-secondary rounded-full overflow-hidden">
          <view class="h-full bg-primary rounded-full" :style="{width: progress + '%'}" />
        </view>
      </view>
      <view class="grid grid-cols-2 gap-3 text-sm">
        <view class="flex items-center gap-2">
          <text class="text-muted-foreground"></text>
          <view>
            <text class="text-muted-foreground text-xs block">比赛时间</text>
            <text class="font-medium">{{ competition.startTime }} - {{ competition.endTime }}</text>
          </view>
        </view>
        <view class="flex items-center gap-2">
          <text class="text-muted-foreground">🕐</text>
          <view>
            <text class="text-muted-foreground text-xs block">报名截止</text>
            <text class="font-medium text-primary">{{ competition.registrationDeadline }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- Tab切换 -->
    <view class="px-4 mt-4">
      <view class="flex bg-secondary/50 rounded-lg p-0.5 mb-4">
        <text v-for="tab in tabs" :key="tab.id" @click="activeTab = tab.id"
          :class="['flex-1 text-center py-2 text-xs rounded-md transition-colors', activeTab === tab.id ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground']">
          {{ tab.label }}
        </text>
      </view>

      <!-- 介绍 -->
      <view v-if="activeTab === 'intro'" class="space-y-4">
        <view class="bg-white rounded-xl p-4 border border-border/50">
          <text class="font-medium block mb-2">赛事简介</text>
          <text class="text-sm text-muted-foreground whitespace-pre-line block">{{ competition.description }}</text>
        </view>

        <view class="bg-white rounded-xl p-4 border border-border/50">
          <text class="font-medium block mb-3">评委阵容</text>
          <view class="flex gap-4">
            <view v-for="judge in competition.judges" :key="judge.id" class="text-center">
              <view class="w-14 h-14 rounded-full bg-secondary mx-auto mb-1 flex items-center justify-center">
                <text class="text-muted-foreground text-lg"></text>
              </view>
              <text class="text-sm font-medium block">{{ judge.name }}</text>
              <text class="text-xs text-muted-foreground block">{{ judge.title }}</text>
            </view>
          </view>
        </view>

        <view class="bg-white rounded-xl p-4 border border-border/50">
          <text class="font-medium block mb-3">比赛规则</text>
          <view class="space-y-2">
            <view v-for="(rule, i) in competition.rules" :key="i" class="flex items-start gap-2 text-sm text-muted-foreground">
              <text class="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0 mt-0.5">{{ i + 1 }}</text>
              <text>{{ rule }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 赛程 -->
      <view v-if="activeTab === 'schedule'" class="space-y-3">
        <view v-for="(round, index) in competition.rounds" :key="round.id" class="bg-white rounded-xl p-4 border border-border/50">
          <view class="flex items-start gap-3">
            <view :class="['w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0', round.status === 'ended' ? 'bg-green-100 text-green-600' : round.status === 'ongoing' ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground']">
              <text class="text-base">{{ round.icon }}</text>
            </view>
            <view class="flex-1">
              <view class="flex items-center justify-between mb-1">
                <text class="font-medium">{{ round.name }}</text>
                <text :class="['text-xs px-2 py-0.5 rounded', round.status === 'ongoing' ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground']">
                  {{ round.status === 'ended' ? '已结束' : round.status === 'ongoing' ? '进行中' : '未开始' }}
                </text>
              </view>
              <text class="text-sm text-muted-foreground block mb-2">{{ round.description }}</text>
              <view class="flex items-center gap-4 text-xs text-muted-foreground">
                <text class="flex items-center gap-1">
                  <text></text>{{ round.startTime }}
                </text>
              </view>
              <text class="text-xs text-primary block mt-2">{{ round.passRule }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 奖品 -->
      <view v-if="activeTab === 'prizes'" class="space-y-3">
        <view v-for="(prize, index) in competition.prizes" :key="index" class="bg-white rounded-xl p-4 border border-border/50">
          <view class="flex items-center gap-3">
            <view :class="['w-12 h-12 rounded-full flex items-center justify-center', index === 0 ? 'bg-amber-100' : index === 1 ? 'bg-gray-100' : index === 2 ? 'bg-amber-50' : 'bg-secondary']">
              <text :class="['text-xl', prize.color]">{{ prize.icon }}</text>
            </view>
            <view class="flex-1">
              <view class="flex items-center gap-2">
                <text class="font-bold">{{ prize.title }}</text>
                <text class="text-xs text-muted-foreground">第{{ prize.rank }}名</text>
              </view>
              <text class="text-sm text-muted-foreground block mt-1">{{ prize.reward }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 排行榜 -->
      <view v-if="activeTab === 'ranking'" class="space-y-4">
        <view class="bg-white rounded-xl p-4 border border-border/50">
          <view class="flex items-center justify-between mb-4">
            <text class="font-medium">当前排行</text>
            <text @click="goTo('/pages/competition/result/index?id=' + competition.id)" class="text-sm text-primary">查看完整榜单</text>
          </view>
          <view class="space-y-3">
            <view v-for="(item, index) in competition.rankings" :key="item.userId" class="flex items-center gap-3">
              <view :class="['w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold', index === 0 ? 'bg-amber-100 text-amber-600' : index === 1 ? 'bg-gray-100 text-gray-600' : index === 2 ? 'bg-amber-50 text-amber-700' : 'bg-secondary text-muted-foreground']">
                {{ item.rank }}
              </view>
              <view class="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                <text class="text-muted-foreground"></text>
              </view>
              <view class="flex-1">
                <text class="font-medium">{{ item.name }}</text>
              </view>
              <text v-if="item.score !== null" class="font-bold text-primary">{{ item.score }}分</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部报名按钮 -->
    <view class="fixed bottom-0 left-0 right-0 bg-white border-t border-border p-4 z-50">
      <view class="flex items-center gap-3">
        <view class="flex-1">
          <text class="text-sm text-muted-foreground block">报名费</text>
          <text class="text-lg font-bold text-primary">{{ competition.registrationFee === 0 ? '免费' : '¥' + competition.registrationFee }}</text>
        </view>
        <view v-if="competition.isJoined" class="flex-1 bg-secondary text-center py-2.5 rounded-lg text-sm opacity-70">
          <text>已报名</text>
        </view>
        <view v-else @click="goTo('/pages/competition/register/index?id=' + competition.id)" class="flex-1 bg-primary text-white text-center py-2.5 rounded-lg text-sm">
          <text>立即报名</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const tabs = [{ id: "intro", label: "介绍" }, { id: "schedule", label: "赛程" }, { id: "prizes", label: "奖品" }, { id: "ranking", label: "排行" }]

const statusConfig: Record<string, { label: string; color: string }> = {
  registering: { label: "报名中", color: "bg-green-500" },
  ongoing: { label: "进行中", color: "bg-primary" },
  ended: { label: "已结束", color: "bg-gray-400" },
  upcoming: { label: "即将开始", color: "bg-amber-500" },
}

const competition = {
  id: "1", title: "2024热卜杯·八字命理大赛", type: "platform", status: "registering",
  startTime: "2024-04-01", endTime: "2024-04-30", registrationDeadline: "2024-03-25",
  registrationFee: 0, participants: 1286, maxParticipants: 2000,
  description: "为发掘和培养八字命理领域的实战高手，热卜平台特举办本届八字命理大赛。\n本次比赛采用线上+线下相结合的形式，通过初赛、复赛、决赛三轮角逐，选拔出真正具有实战能力的命理高手。\n获奖选手将获得丰厚奖金、平台认证、课程推广等多重福利。\n",
  organizer: "热卜平台", circle: null, isJoined: false,
  rounds: [
    { id: "r1", name: "初赛", type: "quiz", status: "upcoming", startTime: "2024-04-01 09:00", endTime: "2024-04-07 18:00", description: "线上答题，100道选择题，限时90分钟", passRule: "前500名晋级复赛", icon: "" },
    { id: "r2", name: "复赛", type: "case", status: "upcoming", startTime: "2024-04-15 09:00", endTime: "2024-04-20 18:00", description: "真实案例分析，提交书面报告", passRule: "专家评审，前50名晋级决赛", icon: "" },
    { id: "r3", name: "决赛", type: "live", status: "upcoming", startTime: "2024-04-28 14:00", endTime: "2024-04-28 18:00", description: "直播PK，现场盲排实战", passRule: "评委打分，决出冠亚季军", icon: "▶" },
  ],
  prizes: [
    { rank: 1, title: "冠军", reward: "奖金10000元 + 平台金牌认证 + 首页推荐位1个月", icon: "👑", color: "text-amber-500" },
    { rank: 2, title: "亚军", reward: "奖金5000元 + 平台银牌认证 + 课程推广资格", icon: "", color: "text-gray-400" },
    { rank: 3, title: "季军", reward: "奖金3000元 + 平台铜牌认证", icon: "", color: "text-amber-700" },
    { rank: "4-10", title: "优秀奖", reward: "奖金500元 + 优秀选手认证", icon: "", color: "text-primary" },
    { rank: "11-50", title: "入围奖", reward: "平台会员1个月 + 参赛证书", icon: "🎁", color: "text-muted-foreground" },
  ],
  rules: [
    "参赛者需完成实名认证", "每人限报名一次，不可重复参赛", "初赛答题期间不得切换页面，否则视为作弊",
    "复赛案例分析需为原创，禁止抄袭", "决赛直播期间需保持网络稳定", "获奖者需配合平台进行赛后经验分享", "平台对本次比赛拥有最终解释权",
  ],
  judges: [
    { id: "j1", name: "周易大师", avatar: "", title: "资深命理师" },
    { id: "j2", name: "陈风水", avatar: "", title: "易学研究员" },
    { id: "j3", name: "李玄机", avatar: "", title: "八字名师" },
  ],
  rankings: [
    { rank: 1, userId: "u1", name: "张**", score: null },
    { rank: 2, userId: "u2", name: "李**", score: null },
    { rank: 3, userId: "u3", name: "王**", score: null },
  ],
}

const activeTab = ref("intro")
const progress = (competition.participants / competition.maxParticipants) * 100

function goBack() { uni.navigateBack() }
function goTo(url: string) { uni.navigateTo({ url }) }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
