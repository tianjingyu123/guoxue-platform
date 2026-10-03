<script setup lang="ts">
/**
 * 节气 · 文化百科（自 V0 components/jieqi/culture-module.tsx 还原）
 * 四个子 Tab：物候（三候+气候） / 民俗（习俗+典故+农谚） / 诗词（原诗+赏析+AI 深度赏析） / 字源
 */
import { ref, computed } from 'vue'
import { apiPost } from '@/utils/request'
import type { JieqiInfo } from '@/pkg-paipan/lib/jieqi-data'
import { jieqiCultureOf } from '@/pkg-paipan/lib/jieqi-culture'

const props = defineProps<{
  detail: JieqiInfo
  meta: { color: string; bg: string; desc: string }
  isCurrentTerm: boolean
  curHouIndex?: number
}>()

type Sub = 'wuhou' | 'minsu' | 'shici' | 'ziyuan'
const SUBS: { key: Sub; label: string }[] = [
  { key: 'wuhou', label: '物候' },
  { key: 'minsu', label: '民俗' },
  { key: 'shici', label: '诗词' },
  { key: 'ziyuan', label: '字源' },
]
const sub = ref<Sub>('wuhou')
const culture = computed(() => jieqiCultureOf(props.detail.name))

// AI 深度赏析
const aiText = ref('')
const aiLoading = ref(false)
const aiError = ref('')

async function askAppreciation() {
  if (aiLoading.value) return
  aiLoading.value = true
  aiError.value = ''
  aiText.value = ''
  try {
    const res = await apiPost<{ text: string }>('/solar-term/ai', { mode: 'poem', jieqi: props.detail.name })
    aiText.value = res.text
  } catch (e) {
    aiError.value = e instanceof Error ? e.message : '服务暂不可用'
  } finally {
    aiLoading.value = false
  }
}
</script>

<template>
  <view class="cm" :style="{ backgroundColor: meta.bg, borderColor: meta.color + '33' }">
    <view class="subs">
      <view
        v-for="s in SUBS"
        :key="s.key"
        class="sub"
        :style="sub === s.key ? { backgroundColor: meta.color, color: '#fff' } : {}"
        @tap="sub = s.key"
      >
        {{ s.label }}
      </view>
    </view>

    <!-- 物候 -->
    <view v-if="sub === 'wuhou'" class="body">
      <text class="h3">三候 · 七十二候</text>
      <text class="hint">出自《月令七十二候集解》，每候五日</text>
      <view
        v-for="(h, i) in detail.sanhou"
        :key="h.name"
        class="hou"
        :class="{ 'hou-on': isCurrentTerm && curHouIndex === i + 1 }"
      >
        <text class="hou-idx" :style="{ backgroundColor: meta.color }">{{ i + 1 }}</text>
        <view class="hou-main">
          <view class="hou-name-row">
            <text class="hou-name">{{ h.name }}</text>
            <text
              v-if="isCurrentTerm && curHouIndex === i + 1"
              class="hou-now"
              :style="{ backgroundColor: meta.color }"
            >当前</text>
          </view>
          <text class="hou-desc">{{ h.desc }}</text>
        </view>
      </view>
      <view class="box">
        <text class="box-t">气候特征</text>
        <text class="box-p">{{ detail.climate }}</text>
      </view>
    </view>

    <!-- 民俗 -->
    <view v-else-if="sub === 'minsu'" class="body">
      <text class="h3">传统习俗</text>
      <view class="chips">
        <text v-for="c in detail.customs" :key="c" class="chip">{{ c }}</text>
      </view>
      <view v-if="culture?.folkStory" class="box">
        <text class="box-t">民间故事 · 典故</text>
        <text class="box-p">{{ culture.folkStory }}</text>
      </view>
      <template v-if="culture?.proverbs?.length">
        <text class="h3 mt">农谚</text>
        <text v-for="p in culture.proverbs" :key="p" class="proverb">「{{ p }}」</text>
      </template>
    </view>

    <!-- 诗词 -->
    <view v-else-if="sub === 'shici'" class="body">
      <view class="poem">
        <text class="poem-src">《{{ detail.poem.title }}》 {{ detail.poem.author }}</text>
        <text v-for="l in detail.poem.lines" :key="l" class="poem-line">{{ l }}</text>
      </view>
      <view v-if="culture?.poemAppreciation" class="box">
        <text class="box-t" :style="{ color: meta.color }">赏析</text>
        <text class="box-p">{{ culture.poemAppreciation }}</text>
      </view>
      <view class="ai-btn" :style="{ backgroundColor: meta.color, opacity: aiLoading ? 0.6 : 1 }" @tap="askAppreciation">
        <text class="ai-btn-t">{{ aiLoading ? '正在生成深度赏析…' : '✦ AI 深度赏析' }}</text>
      </view>
      <view v-if="aiError" class="box box-dash">
        <text class="box-p">{{ aiError }}</text>
      </view>
      <view v-if="aiText" class="box">
        <text class="box-t" :style="{ color: meta.color }">AI 深度赏析</text>
        <text class="box-p">{{ aiText }}</text>
      </view>
    </view>

    <!-- 字源 -->
    <view v-else class="body">
      <text class="h3">汉字字源溯源</text>
      <text class="hint">从「{{ detail.name }}」二字看节气之名的由来</text>
      <view v-for="c in culture?.charOrigins ?? []" :key="c.char" class="origin">
        <text class="origin-char" :style="{ backgroundColor: meta.color }">{{ c.char }}</text>
        <view class="origin-main">
          <text class="origin-p"><text class="b">字形：</text>{{ c.form }}</text>
          <text class="origin-p"><text class="b">内涵：</text>{{ c.meaning }}</text>
        </view>
      </view>
      <text v-if="!culture?.charOrigins?.length" class="hint">暂无字源资料。</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.cm {
  padding: 28rpx;
  border: 1rpx solid;
  border-radius: 32rpx;
}
.subs {
  display: flex;
  gap: 10rpx;
  padding: 8rpx;
  border-radius: 20rpx;
  background: #fff;
}
.sub {
  flex: 1;
  height: 56rpx;
  line-height: 56rpx;
  text-align: center;
  border-radius: 14rpx;
  font-size: 24rpx;
  font-weight: 700;
  color: #8a7a68;
}
.body {
  margin-top: 24rpx;
}
.h3 {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: #3d2f22;
}
.h3.mt {
  margin-top: 24rpx;
}
.hint {
  display: block;
  margin-top: 4rpx;
  font-size: 21rpx;
  color: #8a7a68;
}
.hou {
  display: flex;
  gap: 14rpx;
  margin-top: 14rpx;
  padding: 16rpx;
  border-radius: 14rpx;
  background: rgba(255, 255, 255, 0.6);
}
.hou-on {
  background: #fff;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}
.hou-idx {
  width: 36rpx;
  height: 36rpx;
  flex-shrink: 0;
  border-radius: 50%;
  text-align: center;
  line-height: 36rpx;
  font-size: 20rpx;
  font-weight: 700;
  color: #fff;
}
.hou-main {
  flex: 1;
}
.hou-name-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
}
.hou-name {
  font-size: 26rpx;
  font-weight: 700;
  color: #3d2f22;
}
.hou-now {
  padding: 2rpx 10rpx;
  border-radius: 999rpx;
  font-size: 18rpx;
  color: #fff;
}
.hou-desc {
  display: block;
  margin-top: 4rpx;
  font-size: 22rpx;
  line-height: 1.7;
  color: #8a7a68;
}
.box {
  margin-top: 20rpx;
  padding: 20rpx;
  border-radius: 14rpx;
  background: #fff;
}
.box-dash {
  border: 1rpx dashed #e7e0d5;
  background: transparent;
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
.proverb {
  display: block;
  margin-top: 10rpx;
  padding: 12rpx 18rpx;
  border-radius: 14rpx;
  background: #fff;
  font-size: 22rpx;
  color: #3d2f22;
}
.poem {
  padding: 26rpx;
  border-radius: 20rpx;
  background: #fff;
  text-align: center;
}
.poem-src {
  display: block;
  font-size: 22rpx;
  color: #8a7a68;
}
.poem-line {
  display: block;
  margin-top: 10rpx;
  font-size: 26rpx;
  line-height: 1.8;
  color: #3d2f22;
}
.ai-btn {
  margin-top: 20rpx;
  height: 76rpx;
  border-radius: 14rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ai-btn-t {
  font-size: 24rpx;
  font-weight: 700;
  color: #fff;
}
.origin {
  display: flex;
  gap: 18rpx;
  margin-top: 14rpx;
  padding: 20rpx;
  border-radius: 14rpx;
  background: #fff;
}
.origin-char {
  width: 80rpx;
  height: 80rpx;
  flex-shrink: 0;
  border-radius: 14rpx;
  text-align: center;
  line-height: 80rpx;
  font-family: 'Songti SC', 'STSong', serif;
  font-size: 44rpx;
  font-weight: 700;
  color: #fff;
}
.origin-main {
  flex: 1;
}
.origin-p {
  display: block;
  font-size: 22rpx;
  line-height: 1.7;
  color: #8a7a68;
  margin-bottom: 6rpx;
}
.b {
  font-weight: 700;
  color: #3d2f22;
}
</style>
