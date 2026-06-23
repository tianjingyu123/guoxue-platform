<script setup lang="ts">
/** 六爻排盘入口页（输入）——参照八字排盘 bazi/index.vue 模式 */
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import Disclaimer from '@/components/compliance/disclaimer.vue'
import { navigateBack, navigateTo } from '@/utils/router'

// 占问事项
const question = ref('')

// 起卦方式：manual = 手动摇卦，time = 时间起卦
const method = ref<'manual' | 'time'>('manual')

// 硬币数组（6枚，1=正面阳，0=反面阴）
const coins = ref<number[]>([1, 1, 1, 1, 1, 1])

// 时间起卦参数
const timeInput = ref({ year: 2026, month: 6, day: 23, hour: 12, minute: 0 })

// 摇卦动画状态
const shaking = ref(false)
const shakeIndex = ref(-1)

function pad(n: number) { return String(n).padStart(2, '0') }

/** 获取当前显示的时间字符串 */
const timeDisplay = computed(() => {
  const t = timeInput.value
  return `${t.year}-${pad(t.month)}-${pad(t.day)} ${pad(t.hour)}:${pad(t.minute)}`
})

/** 设置当前时间 */
function setNow() {
  const now = new Date()
  timeInput.value = {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
    hour: now.getHours(),
    minute: now.getMinutes(),
  }
}

/** 硬币显示文字 */
function coinLabel(v: number) {
  return v === 1 ? '阳' : '阴'
}

/** 切换单枚硬币 */
function toggleCoin(index: number) {
  coins.value[index] = coins.value[index] === 1 ? 0 : 1
}

/** 模拟摇卦：6枚硬币全部随机翻转 */
function shakeAll() {
  if (shaking.value) return
  shaking.value = true
  let i = 0
  const timer = setInterval(() => {
    shakeIndex.value = i
    coins.value[i] = Math.random() > 0.5 ? 1 : 0
    i++
    if (i >= 6) {
      clearInterval(timer)
      shakeIndex.value = -1
      shaking.value = false
    }
  }, 150)
}

/** 提交排盘 */
function handleSubmit() {
  const q: string[] = [`question=${encodeURIComponent(question.value || '占问')}`]
  q.push(`method=${method.value}`)

  if (method.value === 'manual') {
    q.push(`coins=${coins.value.join(',')}`)
  } else {
    const t = timeInput.value
    q.push(`year=${t.year}`, `month=${t.month}`, `day=${t.day}`, `hour=${t.hour}`, `minute=${t.minute}`)
  }

  navigateTo(`/paipan/liuyao/result?${q.join('&')}`)
}
</script>

<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="hdr">
      <view class="hdr-inner">
        <view class="hdr-back" @tap="navigateBack()">
          <app-icon name="chevron-left" :size="36" color="rgba(255,255,255,0.85)" />
          <text class="hdr-back-text">返回</text>
        </view>
        <text class="hdr-title">六爻排盘</text>
        <view class="hdr-spacer" />
      </view>
    </view>

    <!-- 主体 -->
    <scroll-view scroll-y class="body">
      <view class="body-inner">
        <!-- 占问事项卡片 -->
        <view class="card">
          <view class="card-title">
            <app-icon name="edit-3" :size="28" color="#2d5a87" />
            <text class="card-title-text">占问事项</text>
          </view>
          <view class="card-body">
            <textarea
              v-model="question"
              class="question-input"
              placeholder="请输入您要占问的事项，如：问事业前程如何？"
              :maxlength="200"
              auto-height
            />
            <text class="question-count">{{ question.length }}/200</text>
          </view>
        </view>

        <!-- 起卦方式切换 -->
        <view class="card">
          <view class="method-tabs">
            <view
              class="method-tab"
              :class="{ 'method-tab-on': method === 'manual' }"
              @tap="method = 'manual'"
            >
              <text class="method-tab-text" :class="{ 'method-tab-text-on': method === 'manual' }">手动摇卦</text>
            </view>
            <view
              class="method-tab"
              :class="{ 'method-tab-on': method === 'time' }"
              @tap="method = 'time'"
            >
              <text class="method-tab-text" :class="{ 'method-tab-text-on': method === 'time' }">时间起卦</text>
            </view>
          </view>

          <!-- 手动摇卦区 -->
          <view v-if="method === 'manual'" class="card-body">
            <!-- 6枚硬币模拟器 -->
            <view class="coins-container">
              <view
                v-for="(coin, i) in coins"
                :key="i"
                class="coin-item"
                :class="{
                  'coin-shaking': shaking && shakeIndex === i,
                  'coin-yang': coin === 1,
                  'coin-yin': coin === 0,
                }"
                @tap="toggleCoin(i)"
              >
                <view class="coin-face">
                  <text class="coin-num">{{ i + 1 }}</text>
                  <text class="coin-val">{{ coinLabel(coin) }}</text>
                </view>
                <text class="coin-pos">{{ ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'][i] }}</text>
              </view>
            </view>

            <!-- 操作按钮 -->
            <view class="coins-actions">
              <view class="btn-shake" :class="{ 'btn-disabled': shaking }" @tap="shakeAll">
                <app-icon name="refresh-cw" :size="24" color="#fff" />
                <text class="btn-shake-text">{{ shaking ? '摇卦中...' : '随机摇卦' }}</text>
              </view>
            </view>

            <!-- 摇卦说明 -->
            <view class="coins-tip">
              <text class="tip-text">六次摇卦，从下往上对应初爻至上爻。阳面为阳爻"—"，阴面为阴爻"- -"。点击硬币可手动翻转。</text>
            </view>

            <!-- 当前卦象预览 -->
            <view class="gua-preview">
              <text class="gua-preview-title">当前卦象</text>
              <view class="gua-lines">
                <view
                  v-for="(coin, i) in [...coins].reverse()"
                  :key="i"
                  class="gua-line"
                >
                  <text class="gua-line-pos">{{ ['上', '五', '四', '三', '二', '初'][i] }}</text>
                  <view class="gua-line-yao">
                    <template v-if="coin === 1">
                      <text class="yao-text">—————</text>
                    </template>
                    <template v-else>
                      <text class="yao-text yao-yin">—— —</text>
                    </template>
                  </view>
                </view>
              </view>
            </view>
          </view>

          <!-- 时间起卦区 -->
          <view v-if="method === 'time'" class="card-body">
            <text class="time-hint">根据您选择的公历时间自动计算卦象</text>

            <view class="time-grid">
              <view class="time-item">
                <text class="time-label">年</text>
                <input
                  v-model.number="timeInput.year"
                  type="number"
                  class="time-input"
                  placeholder="2026"
                >
              </view>
              <view class="time-item">
                <text class="time-label">月</text>
                <input
                  v-model.number="timeInput.month"
                  type="number"
                  class="time-input"
                  placeholder="6"
                >
              </view>
              <view class="time-item">
                <text class="time-label">日</text>
                <input
                  v-model.number="timeInput.day"
                  type="number"
                  class="time-input"
                  placeholder="23"
                >
              </view>
              <view class="time-item">
                <text class="time-label">时</text>
                <input
                  v-model.number="timeInput.hour"
                  type="number"
                  class="time-input"
                  placeholder="12"
                >
              </view>
              <view class="time-item">
                <text class="time-label">分</text>
                <input
                  v-model.number="timeInput.minute"
                  type="number"
                  class="time-input"
                  placeholder="0"
                >
              </view>
            </view>

            <view class="time-display">
              <text class="time-display-text">选择时间：{{ timeDisplay }}</text>
              <view class="btn-now" @tap="setNow">
                <app-icon name="clock" :size="22" color="#2d5a87" />
                <text class="btn-now-text">现在</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 开始排盘按钮 -->
        <view class="submit-wrap">
          <view class="submit" @tap="handleSubmit">
            <text class="submit-text">开始排盘</text>
          </view>
        </view>

        <!-- 合规声明 -->
        <Disclaimer
          variant="custom"
          tone="subtle"
          text="本工具仅供传统文化爱好者研究学习使用，占卜结果不构成任何预测或建议。"
        />
      </view>
    </scroll-view>
  </view>

  </view>
</template>

<style scoped lang="scss">
/* 页面结构 */
.page { min-height: 100vh; background: var(--bg-paper); display: flex; flex-direction: column; }

/* 顶部导航 */
.hdr { position: sticky; top: 0; z-index: 50; background: var(--brand); box-shadow: 0 4rpx 12rpx rgba(196,30,58,0.1); padding-top: var(--status-bar-height, 0); }
.hdr-inner { height: 88rpx; display: flex; align-items: center; justify-content: space-between; padding: 0 32rpx; }
.hdr-back { display: flex; align-items: center; gap: 2rpx; }
.hdr-back-text { font-size: 26rpx; color: rgba(255,255,255,0.85); }
.hdr-title { font-size: 32rpx; font-weight: 700; color: #fff; letter-spacing: 4rpx; }
.hdr-spacer { width: 100rpx; }

/* 主体 */
.body { flex: 1; }
.body-inner { padding: 32rpx; display: flex; flex-direction: column; gap: 28rpx; }

/* 卡片 */
.card { background: var(--card); border-radius: 32rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); border: 2rpx solid rgba(0,0,0,0.06); overflow: hidden; }
.card-title { display: flex; align-items: center; gap: 12rpx; padding: 28rpx 32rpx 0; }
.card-title-text { font-size: 28rpx; font-weight: 600; color: var(--text-ink); }
.card-body { padding: 24rpx 32rpx 32rpx; }

/* 占问事项 */
.question-input { width: 100%; font-size: 28rpx; color: var(--text-ink); line-height: 1.6; min-height: 120rpx; background: rgba(0,0,0,0.02); border-radius: 16rpx; padding: 20rpx; border: 2rpx solid rgba(0,0,0,0.06); box-sizing: border-box; }
.question-count { display: block; text-align: right; font-size: 22rpx; color: var(--text-soft); margin-top: 12rpx; }

/* 起卦方式切换 */
.method-tabs { display: flex; margin: 16rpx 24rpx; background: rgba(0,0,0,0.04); border-radius: 16rpx; padding: 6rpx; }
.method-tab { flex: 1; padding: 20rpx 0; text-align: center; border-radius: 12rpx; }
.method-tab-on { background: var(--card); box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.08); }
.method-tab-text { font-size: 28rpx; font-weight: 500; color: var(--text-soft); }
.method-tab-text-on { color: var(--brand); font-weight: 600; }

/* 硬币模拟器 */
.coins-container { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20rpx; margin-bottom: 24rpx; }
.coin-item { display: flex; flex-direction: column; align-items: center; gap: 8rpx; padding: 20rpx 12rpx; border-radius: 20rpx; border: 3rpx solid rgba(0,0,0,0.08); background: var(--bg-paper); transition: all 0.2s; }
.coin-shaking { transform: rotateY(180deg); }
.coin-yang { border-color: #c41e3a; background: rgba(196,30,58,0.05); }
.coin-yin { border-color: #2d5a87; background: rgba(45,90,135,0.05); }
.coin-face { display: flex; flex-direction: column; align-items: center; gap: 4rpx; }
.coin-num { font-size: 24rpx; color: var(--text-soft); }
.coin-val { font-size: 44rpx; font-weight: 700; }
.coin-yang .coin-val { color: var(--brand); }
.coin-yin .coin-val { color: #2d5a87; }
.coin-pos { font-size: 20rpx; color: var(--text-soft); }

/* 摇卦按钮 */
.coins-actions { margin-bottom: 20rpx; }
.btn-shake { display: flex; align-items: center; justify-content: center; gap: 12rpx; padding: 24rpx; background: linear-gradient(135deg, #c41e3a, #a01830); border-radius: 20rpx; }
.btn-disabled { opacity: 0.5; pointer-events: none; }
.btn-shake-text { font-size: 28rpx; font-weight: 600; color: #fff; }

/* 提示 */
.coins-tip { margin-bottom: 24rpx; padding: 16rpx 20rpx; background: rgba(0,0,0,0.02); border-radius: 12rpx; }
.tip-text { font-size: 22rpx; color: var(--text-soft); line-height: 1.5; }

/* 卦象预览 */
.gua-preview { background: var(--bg-paper); border-radius: 16rpx; padding: 24rpx; border: 2rpx solid rgba(0,0,0,0.06); }
.gua-preview-title { font-size: 24rpx; font-weight: 600; color: var(--text-ink); margin-bottom: 16rpx; text-align: center; }
.gua-lines { display: flex; flex-direction: column; align-items: center; gap: 12rpx; }
.gua-line { display: flex; align-items: center; gap: 16rpx; }
.gua-line-pos { width: 40rpx; font-size: 20rpx; color: var(--text-soft); text-align: center; }
.gua-line-yao { min-width: 140rpx; text-align: center; }
.yao-text { font-size: 36rpx; font-weight: 700; color: var(--brand); letter-spacing: 4rpx; }
.yao-yin { color: #2d5a87; letter-spacing: 2rpx; }

/* 时间起卦 */
.time-hint { font-size: 24rpx; color: var(--text-soft); display: block; margin-bottom: 24rpx; }
.time-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16rpx; margin-bottom: 24rpx; }
.time-item { display: flex; flex-direction: column; gap: 8rpx; }
.time-label { font-size: 22rpx; color: var(--text-soft); text-align: center; }
.time-input { background: rgba(0,0,0,0.03); border-radius: 12rpx; padding: 16rpx 8rpx; font-size: 28rpx; color: var(--text-ink); text-align: center; border: 2rpx solid rgba(0,0,0,0.08); }
.time-display { display: flex; align-items: center; justify-content: space-between; padding: 20rpx; background: rgba(0,0,0,0.02); border-radius: 12rpx; }
.time-display-text { font-size: 24rpx; color: var(--text-soft); }
.btn-now { display: flex; align-items: center; gap: 6rpx; padding: 10rpx 24rpx; background: var(--card); border-radius: 999rpx; border: 2rpx solid rgba(0,0,0,0.08); }
.btn-now-text { font-size: 24rpx; color: #2d5a87; font-weight: 500; }

/* 提交按钮 */
.submit-wrap { padding: 0; }
.submit { padding: 28rpx; background: var(--brand); border-radius: 24rpx; box-shadow: 0 8rpx 20rpx rgba(196,30,58,0.3); }
.submit-text { display: block; text-align: center; font-size: 32rpx; font-weight: 700; color: #fff; }
</style>
