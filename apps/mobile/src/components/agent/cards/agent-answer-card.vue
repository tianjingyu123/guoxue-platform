<script setup lang="ts">
/**
 * 智能体结构化图文答卷。
 *
 * 图片感来自可复用 UI 模板而非即时生成图片：不同专业分别使用册页、诗境、
 * 笔墨、礼序、路径、卦爻、罗盘和服务单视觉。模型只负责内容，组件负责把
 * 自然语言自动拆成摘要、要点、正文与下一步。
 */
import { computed, ref } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import type { AgentExperience } from '@/lib/agent-experience'

const props = defineProps<{
  content: string
  experience: AgentExperience
  agentName?: string
}>()

const expanded = ref(false)

function stripMarkdown(text: string) {
  return String(text || '')
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```[\w-]*\n?/g, '').replace(/```/g, ''))
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/^\s*[-*•]\s+/gm, '')
    .replace(/^\s*[①②③④⑤⑥⑦⑧⑨⑩\d]+[、.)：:\s]+/gm, '')
    .trim()
}

const paragraphs = computed(() => stripMarkdown(props.content)
  .split(/\n+/)
  .map((item) => item.trim())
  .filter(Boolean))

const lead = computed(() => {
  const first = paragraphs.value[0] || '我已经按这个领域的专业方法，为你整理好本次回答。'
  return first.length > 108 ? `${first.slice(0, 108)}…` : first
})

const points = computed(() => paragraphs.value
  .filter((item) => item !== paragraphs.value[0])
  .slice(0, 4)
  .map((item) => item.length > 68 ? `${item.slice(0, 68)}…` : item))

const detail = computed(() => stripMarkdown(props.content))
const themeKey = computed(() => props.experience.theme.key)
const profileMarks = computed(() => {
  const name = props.agentName || ''
  if (/智玄/.test(name)) return ['智', '导']
  if (/客服/.test(name)) return ['答', '助']
  if (/典故/.test(name)) return ['源', '考']
  if (/古籍|句读/.test(name)) return ['句', '读']
  if (/诗词/.test(name)) return ['诗', '境']
  if (/写作/.test(name)) return ['文', '章']
  if (/节气/.test(name)) return ['节', '候']
  if (/礼乐/.test(name)) return ['礼', '序']
  if (/亲子|蒙学/.test(name)) return ['童', '学']
  if (/规划/.test(name)) return ['路', '学']
  if (/象数/.test(name)) return ['数', '变']
  if (/易经|卦象/.test(name)) return ['易', '象']
  return [props.experience.theme.glyph, '答']
})
</script>

<template>
  <view class="answer-art" :class="`theme-${themeKey.toLowerCase()}`">
    <view class="answer-visual">
      <view class="visual-meta">
        <text class="visual-kicker">{{ experience.answerKicker }}</text>
        <text class="visual-agent">{{ agentName || experience.theme.label }}</text>
      </view>

      <!-- 学习向导：文脉罗盘 -->
      <view v-if="themeKey === 'GUIDE'" class="motif motif-guide" aria-hidden="true">
        <view class="guide-ring ring-a" />
        <view class="guide-ring ring-b" />
        <view class="guide-axis axis-x" />
        <view class="guide-axis axis-y" />
        <view class="guide-route route-a" />
        <view class="guide-route route-b" />
        <text class="motif-main">{{ profileMarks[0] }}</text>
        <text class="motif-side">{{ profileMarks[1] }}</text>
      </view>

      <!-- 客服：解决路径面板 -->
      <view v-else-if="themeKey === 'SERVICE'" class="motif motif-service" aria-hidden="true">
        <view class="service-line line-1"><text>01</text><view /></view>
        <view class="service-line line-2"><text>02</text><view /></view>
        <view class="service-line line-3"><text>✓</text><view /></view>
        <text class="motif-main">{{ profileMarks[0] }}</text>
        <text class="motif-side">{{ profileMarks[1] }}</text>
      </view>

      <!-- 古籍：册页与句读 -->
      <view v-else-if="themeKey === 'CLASSICS_READING'" class="motif motif-classics" aria-hidden="true">
        <view v-for="n in 5" :key="n" class="classic-line" :style="{ width: `${72 - n * 6}%` }" />
        <view class="classic-thread">
          <view v-for="n in 3" :key="n" class="classic-thread-dot" />
        </view>
        <text class="motif-main">{{ profileMarks[0] }}</text>
        <text class="motif-side">{{ profileMarks[1] }}</text>
      </view>

      <!-- 诗词：月、山与诗行 -->
      <view v-else-if="themeKey === 'POETRY_ART'" class="motif motif-poetry" aria-hidden="true">
        <view class="poetry-moon" />
        <view class="poetry-mountain mountain-a" />
        <view class="poetry-mountain mountain-b" />
        <view class="poetry-ripple ripple-a" />
        <view class="poetry-ripple ripple-b" />
        <text class="motif-main">{{ profileMarks[0] }}</text>
        <text class="motif-side">{{ profileMarks[1] }}</text>
      </view>

      <!-- 写作：笔墨轨迹 -->
      <view v-else-if="themeKey === 'WRITING_STUDIO'" class="motif motif-writing" aria-hidden="true">
        <view class="ink-stroke stroke-a" />
        <view class="ink-stroke stroke-b" />
        <view class="ink-dot dot-a" />
        <view class="ink-dot dot-b" />
        <text class="motif-main">{{ profileMarks[0] }}</text>
        <text class="motif-side">{{ profileMarks[1] }}</text>
      </view>

      <!-- 礼乐：礼序同心环 -->
      <view v-else-if="themeKey === 'RITES_CULTURE'" class="motif motif-rites" aria-hidden="true">
        <view class="rites-ring rites-a" />
        <view class="rites-ring rites-b" />
        <view v-for="n in 8" :key="n" class="rites-node" :style="{ transform: `rotate(${n * 45}deg) translateY(-72rpx)` }" />
        <text class="motif-main">{{ profileMarks[0] }}</text>
        <text class="motif-side">{{ profileMarks[1] }}</text>
      </view>

      <!-- 学习成长：阶段路径 -->
      <view v-else-if="themeKey === 'LEARNING_GROWTH'" class="motif motif-growth" aria-hidden="true">
        <view class="growth-path" />
        <view class="growth-step step-a"><text>起</text></view>
        <view class="growth-step step-b"><text>读</text></view>
        <view class="growth-step step-c"><text>成</text></view>
        <text class="motif-main">{{ profileMarks[0] }}</text>
        <text class="motif-side">{{ profileMarks[1] }}</text>
      </view>

      <!-- 易学：六爻结构图 -->
      <view v-else class="motif motif-yijing" aria-hidden="true">
        <view v-for="n in 6" :key="n" class="yao" :class="{ broken: n % 3 === 0 }">
          <view class="yao-mark" />
          <view class="yao-mark" />
        </view>
        <view class="yijing-orbit" />
        <text class="motif-main">{{ profileMarks[0] }}</text>
        <text class="motif-side">{{ profileMarks[1] }}</text>
      </view>
    </view>

    <view class="answer-body">
      <text class="answer-title">{{ experience.answerTitle }}</text>
      <text class="answer-lead">{{ lead }}</text>

      <view v-if="points.length" class="answer-points">
        <view v-for="(point, index) in points" :key="index" class="answer-point">
          <text class="point-index">0{{ index + 1 }}</text>
          <text class="point-text">{{ point }}</text>
        </view>
      </view>

      <view v-if="detail.length > lead.length + 28" class="answer-toggle" @tap="expanded = !expanded">
        <text class="answer-toggle-text">{{ expanded ? experience.detailClose : experience.detailOpen }}</text>
        <AppIcon :name="expanded ? 'chevron-up' : 'chevron-down'" :size="26" :color="experience.theme.ink" />
      </view>
      <text v-if="expanded" class="answer-detail">{{ detail }}</text>

      <view class="answer-next">
        <view class="next-seal"><text>{{ experience.theme.glyph }}</text></view>
        <view class="next-copy">
          <text class="next-label">{{ experience.nextLabel }}</text>
          <text class="next-text">{{ experience.nextText }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.answer-art {
  width: 100%;
  overflow: hidden;
  border: 1rpx solid rgba(73, 86, 126, .14);
  border-radius: 28rpx;
  background: #fff;
  box-shadow: 0 14rpx 38rpx rgba(41, 48, 79, .09);
}
.answer-visual {
  position: relative;
  height: 224rpx;
  overflow: hidden;
  color: #fff;
  background: linear-gradient(145deg, var(--agent-deep), var(--agent-accent));
}
.answer-visual::after {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 78% 16%, rgba(255,255,255,.2), transparent 34%);
  pointer-events: none;
}
.visual-meta { position: absolute; z-index: 3; left: 24rpx; top: 21rpx; }
.visual-kicker { display: block; font-size: 18rpx; letter-spacing: 4rpx; color: rgba(255,255,255,.72); }
.visual-agent { display: block; margin-top: 5rpx; font-size: 23rpx; font-weight: 700; color: #fff; }
.motif { position: absolute; inset: 0; }
.motif-main {
  position: absolute;
  z-index: 2;
  right: 76rpx;
  top: 70rpx;
  font-family: "Songti SC", "STSong", serif;
  font-size: 72rpx;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 8rpx 24rpx rgba(0,0,0,.18);
}
.motif-side { position: absolute; z-index: 2; right: 38rpx; bottom: 26rpx; font-size: 22rpx; letter-spacing: 4rpx; color: rgba(255,255,255,.78); }

/* 文脉罗盘 */
.guide-ring { position: absolute; right: 42rpx; top: 32rpx; border: 1rpx solid rgba(255,255,255,.34); border-radius: 50%; }
.guide-ring.ring-a { width: 154rpx; height: 154rpx; }
.guide-ring.ring-b { right: 16rpx; top: 6rpx; width: 206rpx; height: 206rpx; border-style: dashed; animation: motif-spin 24s linear infinite; }
.guide-axis { position: absolute; right: 30rpx; top: 110rpx; width: 184rpx; height: 1rpx; background: rgba(255,255,255,.24); }
.guide-axis.axis-y { transform: rotate(90deg); }
.guide-route { position: absolute; left: 28rpx; bottom: 36rpx; width: 148rpx; height: 38rpx; border-top: 2rpx solid rgba(255,255,255,.36); border-radius: 50%; transform: rotate(-8deg); }
.guide-route.route-b { left: 72rpx; bottom: 18rpx; width: 92rpx; transform: rotate(12deg); }

/* 服务解决单 */
.motif-service { padding: 78rpx 250rpx 0 28rpx; }
.service-line { height: 34rpx; display: flex; align-items: center; gap: 11rpx; color: rgba(255,255,255,.78); font-size: 16rpx; }
.service-line view { height: 7rpx; flex: 1; border-radius: 9rpx; background: rgba(255,255,255,.24); }
.service-line.line-2 view { flex: .72; }
.service-line.line-3 view { flex: .46; background: rgba(255,255,255,.52); }

/* 册页 */
.motif-classics { padding: 80rpx 240rpx 0 34rpx; }
.classic-line { height: 3rpx; margin-bottom: 22rpx; background: rgba(255,255,255,.28); }
.classic-thread { position: absolute; left: 24rpx; top: 70rpx; bottom: 24rpx; width: 1rpx; background: rgba(255,255,255,.38); }
.classic-thread-dot { display: block; width: 8rpx; height: 8rpx; margin: 28rpx 0 0 -3rpx; border-radius: 50%; background: #fff; }

/* 诗境 */
.poetry-moon { position: absolute; right: 34rpx; top: 28rpx; width: 94rpx; height: 94rpx; border-radius: 50%; background: rgba(255,255,255,.78); box-shadow: 0 0 42rpx rgba(255,255,255,.44); }
.poetry-mountain { position: absolute; bottom: -78rpx; width: 310rpx; height: 180rpx; background: rgba(35,12,55,.32); transform: rotate(38deg); }
.mountain-a { left: -46rpx; }
.mountain-b { left: 142rpx; bottom: -96rpx; transform: rotate(48deg); opacity: .64; }
.poetry-ripple { position: absolute; right: 18rpx; bottom: 28rpx; width: 156rpx; height: 22rpx; border-top: 1rpx solid rgba(255,255,255,.42); border-radius: 50%; }
.ripple-b { right: 54rpx; bottom: 12rpx; width: 102rpx; }

/* 笔墨 */
.ink-stroke { position: absolute; left: 20rpx; bottom: 45rpx; width: 250rpx; height: 22rpx; border-radius: 60% 10% 60% 12%; background: rgba(255,255,255,.2); transform: rotate(-12deg); filter: blur(1rpx); }
.stroke-b { left: 82rpx; bottom: 80rpx; width: 154rpx; height: 11rpx; transform: rotate(18deg); opacity: .66; }
.ink-dot { position: absolute; border-radius: 50%; background: rgba(255,255,255,.3); }
.dot-a { left: 52rpx; top: 88rpx; width: 18rpx; height: 18rpx; }
.dot-b { left: 92rpx; top: 112rpx; width: 9rpx; height: 9rpx; }

/* 礼序 */
.rites-ring { position: absolute; right: 42rpx; top: 34rpx; border: 1rpx solid rgba(255,255,255,.3); border-radius: 50%; }
.rites-a { width: 150rpx; height: 150rpx; }
.rites-b { right: 72rpx; top: 64rpx; width: 90rpx; height: 90rpx; }
.rites-node { position: absolute; right: 112rpx; top: 106rpx; width: 8rpx; height: 8rpx; border-radius: 50%; background: #fff; transform-origin: 4rpx 76rpx; }

/* 学习路径 */
.growth-path { position: absolute; left: 42rpx; right: 188rpx; bottom: 56rpx; height: 2rpx; background: rgba(255,255,255,.32); }
.growth-step { position: absolute; bottom: 38rpx; width: 40rpx; height: 40rpx; border: 1rpx solid rgba(255,255,255,.52); border-radius: 14rpx; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,.14); }
.growth-step text { font-size: 18rpx; color: #fff; }
.step-a { left: 30rpx; }
.step-b { left: 124rpx; bottom: 64rpx; }
.step-c { left: 216rpx; bottom: 92rpx; }

/* 六爻 */
.motif-yijing { padding: 54rpx 270rpx 0 34rpx; }
.yao { width: 170rpx; height: 14rpx; margin-bottom: 11rpx; display: flex; gap: 0; }
.yao-mark { display: block; width: 100%; height: 100%; border-radius: 4rpx; background: rgba(255,255,255,.42); }
.yao.broken { gap: 24rpx; }
.yijing-orbit { position: absolute; right: 30rpx; top: 20rpx; width: 184rpx; height: 184rpx; border: 1rpx dashed rgba(255,255,255,.28); border-radius: 50%; animation: motif-spin 28s linear infinite reverse; }

.answer-body { padding: 24rpx 26rpx 0; background: linear-gradient(145deg, #fff 25%, var(--agent-wash)); }
.answer-title { display: block; font-family: "Songti SC", "STSong", serif; font-size: 35rpx; font-weight: 700; color: #252a34; }
.answer-lead { display: block; margin-top: 13rpx; font-size: 30rpx; line-height: 1.72; color: #303744; font-weight: 600; }
.answer-points { margin-top: 18rpx; border-top: 1rpx solid rgba(42,48,63,.08); }
.answer-point { padding: 16rpx 0; display: flex; gap: 14rpx; border-bottom: 1rpx solid rgba(42,48,63,.07); }
.point-index { flex-shrink: 0; padding-top: 2rpx; font-size: 18rpx; letter-spacing: 1rpx; color: var(--agent-ink); font-weight: 700; }
.point-text { flex: 1; font-size: 27rpx; line-height: 1.58; color: #555d69; }
.answer-toggle { height: 68rpx; margin-top: 18rpx; display: flex; align-items: center; justify-content: center; gap: 8rpx; border-radius: 18rpx; background: var(--agent-soft); }
.answer-toggle-text { font-size: 25rpx; color: var(--agent-ink); font-weight: 700; }
.answer-detail { display: block; margin-top: 18rpx; padding-top: 18rpx; border-top: 1rpx solid rgba(42,48,63,.08); white-space: pre-wrap; font-size: 28rpx; line-height: 1.78; color: #3f4652; }
.answer-next { margin: 22rpx -26rpx 0; padding: 20rpx 26rpx 22rpx; display: flex; align-items: center; gap: 14rpx; background: var(--agent-soft); }
.next-seal { width: 50rpx; height: 50rpx; flex-shrink: 0; border: 2rpx solid var(--agent-accent); border-radius: 16rpx 8rpx 15rpx 9rpx; display: flex; align-items: center; justify-content: center; transform: rotate(-3deg); }
.next-seal text { font-family: "Songti SC", "STSong", serif; font-size: 23rpx; color: var(--agent-ink); font-weight: 700; }
.next-copy { min-width: 0; }
.next-label { display: block; font-size: 21rpx; color: var(--agent-ink); font-weight: 700; }
.next-text { display: block; margin-top: 3rpx; font-size: 23rpx; line-height: 1.48; color: var(--agent-ink); opacity: .86; }
@keyframes motif-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  .guide-ring.ring-b, .yijing-orbit { animation: none; }
}
</style>
