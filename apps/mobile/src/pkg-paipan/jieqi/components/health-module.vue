<script setup lang="ts">
/**
 * 节气 · 养生（自 V0 components/jieqi/health-module.tsx 还原）
 * 通用养生（起居/饮食宜忌）+ 运动导引 + 情志调节 + 应季食材 + 九种体质个性化 + AI 养生问答
 * 合规：养生内容非医疗建议，页尾固定提示；AI 侧后端 prompt 已设红线（不开方、不诊断）。
 */
import { ref, computed } from 'vue'
import { apiPost } from '@/utils/request'
import type { JieqiInfo } from '@/pkg-paipan/lib/jieqi-data'
import { CONSTITUTIONS, personalizedAdvice, type ConstitutionKey } from '@/pkg-paipan/lib/constitution'
import { SEASON_EXERCISE, SEASON_EMOTION, type Season } from '@/pkg-paipan/lib/jieqi-recommend'

const props = defineProps<{
  detail: JieqiInfo
  meta: { color: string; bg: string; desc: string }
}>()

const consKey = ref<ConstitutionKey | null>(null)
const season = computed(() => props.detail.season as Season)
const exercise = computed(() => SEASON_EXERCISE[season.value])
const emotion = computed(() => SEASON_EMOTION[season.value])
const advice = computed(() => (consKey.value ? personalizedAdvice(props.detail.name, consKey.value) : null))

const question = ref('')
const aiAnswer = ref('')
const aiLoading = ref(false)
const aiError = ref('')

async function askAI() {
  const q = question.value.trim()
  if (!q || aiLoading.value) return
  aiLoading.value = true
  aiError.value = ''
  aiAnswer.value = ''
  try {
    const cons = consKey.value ? CONSTITUTIONS.find((c) => c.key === consKey.value)?.name : undefined
    const res = await apiPost<{ text: string }>('/solar-term/ai', {
      mode: 'health',
      jieqi: props.detail.name,
      constitution: cons,
      question: q,
    })
    aiAnswer.value = res.text
  } catch (e) {
    aiError.value = e instanceof Error ? e.message : '服务暂不可用'
  } finally {
    aiLoading.value = false
  }
}
</script>

<template>
  <view class="hm" :style="{ backgroundColor: meta.bg, borderColor: meta.color + '33' }">
    <text class="h3">节气养生 · 通用</text>
    <view class="box">
      <text class="box-t">起居</text>
      <text class="box-p">{{ detail.healthDaily }}</text>
    </view>
    <view class="two">
      <view class="box flex1">
        <text class="box-t" style="color: #3f7d3a">饮食宜</text>
        <text class="box-p">{{ detail.dietYi }}</text>
      </view>
      <view class="box flex1">
        <text class="box-t" style="color: #b5432a">饮食忌</text>
        <text class="box-p">{{ detail.dietJi }}</text>
      </view>
    </view>

    <text class="h3 mt">运动导引 · {{ exercise.title }}</text>
    <view class="box">
      <view v-for="it in exercise.items" :key="it" class="li">
        <text class="dot" :style="{ backgroundColor: meta.color }" />
        <text class="li-t">{{ it }}</text>
      </view>
      <text class="box-p">{{ exercise.note }}</text>
    </view>

    <text class="h3 mt">情志调节 · {{ emotion.title }}</text>
    <view class="chips">
      <text v-for="it in emotion.items" :key="it" class="chip">{{ it }}</text>
    </view>

    <text class="h3 mt">应季食材</text>
    <view class="chips">
      <text
        v-for="f in detail.foods"
        :key="f"
        class="chip chip-o"
        :style="{ borderColor: meta.color + '55', color: meta.color }"
      >{{ f }}</text>
    </view>

    <!-- 体质个性化 -->
    <view class="card">
      <text class="h3">一人一方 · 体质个性化</text>
      <text class="hint">选择你的中医体质，获得贴合本节气的调养建议</text>
      <view class="chips">
        <text
          v-for="c in CONSTITUTIONS"
          :key="c.key"
          class="chip chip-o"
          :style="consKey === c.key
            ? { backgroundColor: meta.color, color: '#fff', borderColor: meta.color }
            : { borderColor: '#e7e0d5', color: '#3d2f22' }"
          @tap="consKey = consKey === c.key ? null : c.key"
        >{{ c.name }}</text>
      </view>
      <view v-if="advice" class="advice">
        <text v-if="advice.caution" class="caution" :style="{ backgroundColor: meta.color + '14', color: meta.color }">
          {{ advice.caution }}
        </text>
        <view class="box box-sec"><text class="box-t">饮食</text><text class="box-p">{{ advice.diet }}</text></view>
        <view class="box box-sec"><text class="box-t">起居</text><text class="box-p">{{ advice.daily }}</text></view>
        <view class="box box-sec"><text class="box-t">运动</text><text class="box-p">{{ advice.exercise }}</text></view>
        <view class="box box-sec"><text class="box-t">情志</text><text class="box-p">{{ advice.emotion }}</text></view>
      </view>
    </view>

    <!-- AI 养生问答 -->
    <view class="card">
      <text class="h3" :style="{ color: meta.color }">✦ AI 养生问答</text>
      <text class="hint">
        结合「{{ detail.name }}」{{ consKey ? '与你的体质' : '' }}提问，如「这个节气适合怎么进补？」
      </text>
      <view class="ask">
        <input v-model="question" class="ask-input" type="text" placeholder="输入你的养生问题" placeholder-class="ph" @confirm="askAI" />
        <view
          class="ask-btn"
          :style="{ backgroundColor: meta.color, opacity: aiLoading || !question.trim() ? 0.5 : 1 }"
          @tap="askAI"
        >
          <text class="ask-btn-t">{{ aiLoading ? '…' : '提问' }}</text>
        </view>
      </view>
      <view v-if="aiAnswer" class="box box-sec"><text class="box-p">{{ aiAnswer }}</text></view>
      <view v-if="aiError" class="box box-sec">
        <text class="box-p">{{ aiError }}</text>
        <text class="box-p">你仍可参考上方通用养生与体质个性化建议。</text>
      </view>
      <text class="tip">养生内容仅供参考，不构成医疗建议。身体不适请及时就医。</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.hm {
  padding: 28rpx;
  border: 1rpx solid;
  border-radius: 32rpx;
}
.h3 {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: #3d2f22;
}
.h3.mt {
  margin-top: 28rpx;
}
.hint {
  display: block;
  margin-top: 4rpx;
  font-size: 21rpx;
  color: #8a7a68;
}
.box {
  margin-top: 14rpx;
  padding: 18rpx;
  border-radius: 14rpx;
  background: #fff;
}
.box-sec {
  background: #f5f1ea;
}
.box-t {
  display: block;
  font-size: 24rpx;
  font-weight: 700;
  color: #3d2f22;
}
.box-p {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  line-height: 1.8;
  color: #8a7a68;
  white-space: pre-wrap;
}
.two {
  display: flex;
  gap: 14rpx;
}
.flex1 {
  flex: 1;
}
.li {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  margin-bottom: 10rpx;
}
.dot {
  width: 8rpx;
  height: 8rpx;
  margin-top: 14rpx;
  flex-shrink: 0;
  border-radius: 50%;
}
.li-t {
  flex: 1;
  font-size: 22rpx;
  line-height: 1.7;
  color: #3d2f22;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
  margin-top: 14rpx;
}
.chip {
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  background: #fff;
  font-size: 22rpx;
  color: #3d2f22;
}
.chip-o {
  background: transparent;
  border: 1rpx solid;
}
.card {
  margin-top: 32rpx;
  padding: 22rpx;
  border-radius: 20rpx;
  background: #fff;
}
.advice {
  margin-top: 8rpx;
}
.caution {
  display: block;
  margin-top: 14rpx;
  padding: 14rpx 18rpx;
  border-radius: 14rpx;
  font-size: 22rpx;
  line-height: 1.7;
  font-weight: 500;
}
.ask {
  display: flex;
  gap: 12rpx;
  margin-top: 14rpx;
}
.ask-input {
  flex: 1;
  height: 72rpx;
  padding: 0 20rpx;
  border: 1rpx solid #e7e0d5;
  border-radius: 14rpx;
  background: #faf8f5;
  font-size: 26rpx;
  color: #3d2f22;
}
.ph {
  color: #b0a494;
}
.ask-btn {
  flex-shrink: 0;
  padding: 0 28rpx;
  height: 72rpx;
  border-radius: 14rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ask-btn-t {
  font-size: 26rpx;
  font-weight: 700;
  color: #fff;
}
.tip {
  display: block;
  margin-top: 16rpx;
  font-size: 20rpx;
  line-height: 1.7;
  color: #a89b8a;
}
</style>
