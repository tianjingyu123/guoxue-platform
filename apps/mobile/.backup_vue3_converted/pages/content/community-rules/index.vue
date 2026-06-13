<template>
  <view class="min-h-screen bg-background">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
      <view @click="goBack">
        <text class="text-foreground">←</text>
      </view>
      <text class="text-base font-semibold text-foreground">社区规范</text>
    </view>

    <!-- 加载骨架屏 -->
    <view v-if="loading" class="px-4 py-6 space-y-4">
      <view class="flex items-center gap-3 mb-6">
        <view class="w-12 h-12 rounded-xl bg-muted animate-pulse" />
        <view class="space-y-2">
          <view class="h-5 w-24 bg-muted rounded animate-pulse" />
          <view class="h-3 w-36 bg-muted rounded animate-pulse" />
        </view>
      </view>
      <view v-for="i in 3" :key="i" class="space-y-3">
        <view class="h-4 w-28 bg-muted rounded animate-pulse mb-3" />
        <view v-for="j in 3" :key="j" class="h-12 w-full bg-muted rounded-lg animate-pulse" />
      </view>
    </view>

    <view v-else class="px-4 py-6 pb-20">
      <!-- 头部 -->
      <view class="flex items-center gap-3 mb-6">
        <view class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <text class="text-2xl">🛡</text>
        </view>
        <view>
          <text class="text-lg font-bold text-foreground block">社区规范</text>
          <text class="text-xs text-muted-foreground">维护健康的国学文化交流环境</text>
        </view>
      </view>

      <!-- 规范导航 -->
      <view class="flex gap-2 mb-6 overflow-x-auto whitespace-nowrap scrollbar-hide">
        <view
          v-for="section in ruleSections"
          :key="section.id"
          @click="activeRuleSection = section.id"
          class="px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
          :class="activeRuleSection === section.id ? 'bg-primary text-white border-primary' : 'bg-white text-foreground border-border'"
        >
          {{ section.icon }} {{ section.label }}
        </view>
      </view>

      <!-- 总则 -->
      <view v-if="activeRuleSection === 'preamble'">
        <text class="text-sm text-muted-foreground leading-relaxed mb-6 block">
          儒布社区是国学爱好者学习与交流的家园。为维护良好的社区环境，请所有成员遵守以下规范。我们鼓励高质量的学术讨论和友好互动，共同营造一个开放、包容、专业的学习氛围。
        </text>
        <view class="bg-primary/5 rounded-xl p-4 border border-primary/10 mb-4">
          <text class="text-xs text-foreground leading-relaxed">
            本规范适用于儒布平台所有用户，包括但不限于圈子、问答、评论、私信等功能模块。违反规范将根据情节轻重受到相应处理。
          </text>
        </view>
      </view>

      <!-- 鼓励的行为 -->
      <view v-if="activeRuleSection === 'allowed'">
        <view class="flex items-center gap-2 mb-4">
          <text class="text-green-600">✓</text>
          <text class="text-sm font-semibold text-foreground">鼓励的行为</text>
        </view>
        <view class="space-y-3">
          <view v-for="(item, idx) in allowed" :key="idx" class="p-3 bg-green-50 border border-green-100 rounded-xl">
            <view class="flex items-start gap-2.5">
              <text class="text-green-600 flex-shrink-0 mt-0.5">✓</text>
              <view class="flex-1">
                <text class="text-sm font-medium text-foreground block">{{ item.title }}</text>
                <text class="text-xs text-muted-foreground mt-0.5 block">{{ item.desc }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 禁止的行为 -->
      <view v-if="activeRuleSection === 'prohibited'">
        <view class="flex items-center gap-2 mb-4">
          <text class="text-red-500"></text>
          <text class="text-sm font-semibold text-foreground">禁止的行为</text>
        </view>
        <view class="space-y-3">
          <view v-for="(item, idx) in prohibited" :key="idx" class="p-3 bg-red-50 border border-red-100 rounded-xl">
            <view class="flex items-start gap-2.5">
              <text class="text-red-500 flex-shrink-0 mt-0.5"></text>
              <view class="flex-1">
                <text class="text-sm font-medium text-foreground block">{{ item.title }}</text>
                <text class="text-xs text-muted-foreground mt-0.5 block">{{ item.desc }}</text>
                <view v-if="item.example" class="mt-2 p-2 bg-red-100/50 rounded-lg border border-red-100">
                  <text class="text-[10px] text-red-600 block">违规案例：{{ item.example }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 处罚规则 -->
      <view v-if="activeRuleSection === 'punishment'">
        <view class="flex items-center gap-2 mb-4">
          <text class="text-orange-500"></text>
          <text class="text-sm font-semibold text-foreground">违规处理</text>
        </view>
        <view class="space-y-3">
          <view v-for="p in punishments" :key="p.level" class="p-3 rounded-xl border" :class="[p.bg, p.border]">
            <view class="flex items-center gap-3">
              <view class="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0" :class="[p.color, p.bg]">
                <text class="text-sm">{{ p.icon }}</text>
              </view>
              <view class="flex-1">
                <text class="text-sm font-medium block" :class="p.level === '永久封禁' ? 'text-white' : 'text-foreground'">{{ p.level }}</text>
                <text class="text-xs mt-0.5 block leading-relaxed" :class="p.level === '永久封禁' ? 'text-white/80' : 'text-muted-foreground'">{{ p.desc }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 举报入口 -->
      <view class="mt-6 p-4 bg-white rounded-xl border border-border">
        <view class="flex items-center gap-3 mb-3">
          <text class="text-lg"></text>
          <view>
            <text class="text-sm font-semibold text-foreground block">举报违规内容</text>
            <text class="text-xs text-muted-foreground">遇到违规内容请及时举报</text>
          </view>
        </view>
        <view
          class="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-medium text-center"
          @click="report"
        >
          <text>我要举报</text>
        </view>
      </view>

      <!-- 声明 -->
      <text class="text-xs text-muted-foreground mt-6 text-center block">
        感谢您共同维护社区环境。平台保留对本规范的最终解释权。
      </text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

// 加载状态
const loading = ref(true)
setTimeout(() => { loading.value = false }, 500)

// 规范导航
const activeRuleSection = ref('preamble')
const ruleSections = [
  { id: 'preamble', icon: '', label: '总则' },
  { id: 'allowed', icon: '✓', label: '鼓励行为' },
  { id: 'prohibited', icon: '', label: '禁止行为' },
  { id: 'punishment', icon: '', label: '处罚规则' },
]

// 鼓励的行为
const allowed = [
  { title: '分享原创命理知识和学习心得', desc: '鼓励用户分享自己在国学、命理方面的学习体会和实战经验，帮助其他成员共同进步' },
  { title: '提出有建设性的命理问题和讨论', desc: '提出具有学术价值和讨论意义的问题，引发高质量的交流探讨' },
  { title: '分享真实的学习经历和体验', desc: '如实分享自己在传统文化学习道路上的历程，包括成功经验和失败教训' },
  { title: '参与友好的国学文化交流', desc: '以开放包容的心态参与讨论，尊重不同流派的观点和见解' },
  { title: '尊重他人，文明互动', desc: '在交流中保持礼貌和尊重，不因意见不同而进行人身攻击' },
]

// 禁止的行为
const prohibited = [
  {
    title: '发布封建迷信、宣扬不科学内容',
    desc: '禁止发布明显违背科学常识、虚构神灵鬼怪、承诺"包治百病"等极端迷信内容',
    example: '"保证做完这个法事，你的财运立刻翻倍"',
  },
  {
    title: '对他人进行人身攻击或辱骂',
    desc: '禁止以任何形式辱骂、诽谤、威胁、骚扰其他用户',
    example: '在评论区使用侮辱性词汇咒骂其他用户',
  },
  {
    title: '未经授权转载他人内容',
    desc: '转载他人原创内容须获得授权，并注明原作者和出处',
    example: '直接复制其他平台大V的付费内容发布到社区',
  },
  {
    title: '发布广告、营销或诈骗信息',
    desc: '禁止发布商业广告、推广链接、代购信息以及各类诈骗信息',
    example: '"加微信xxxx，免费算命，仅限前50名"',
  },
  {
    title: '散布谣言或虚假信息',
    desc: '禁止编造和传播未经证实的消息、谣言、虚假案例',
    example: '编造"某知名大师预测某事件"等虚假信息',
  },
  {
    title: '涉及政治敏感话题',
    desc: '禁止讨论和国家法律法规相违背的内容，禁止传播政治敏感信息',
    example: '借命理之名讨论政治敏感话题',
  },
  {
    title: '发布色情、暴力等违规内容',
    desc: '禁止发布任何色情、暴力、血腥、恐怖等违规内容',
    example: '在帖子中附带不当图片或不当暗示的文字',
  },
]

// 处罚规则
const punishments = [
  { level: '口头警告', icon: '', color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', desc: '首次轻微违规，给予口头警告，提醒规范行为' },
  { level: '内容删除+限言', icon: '', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', desc: '删除违规内容，限制发言24小时。累计违规自动升级处罚' },
  { level: '禁言+扣分', icon: '⛔', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', desc: '禁言7天，扣除平台积分100分。多次违规者加倍处罚' },
  { level: '永久封禁', icon: '', color: 'text-gray-100', bg: 'bg-gray-700', border: 'border-gray-600', desc: '情节严重或屡教不改者永久封禁账号，不可申诉解封' },
]

function report() {
  uni.showModal({
    title: '举报内容',
    content: '请选择举报类型：违规内容 / 违规用户 / 其他',
    success: (r: any) => {
      if (r.confirm) uni.showToast({ title: '举报已提交，我们将尽快处理', icon: 'none' })
    },
  })
}

function goBack() { uni.navigateBack() }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
.scrollbar-hide::-webkit-scrollbar { display: none; }
</style>
