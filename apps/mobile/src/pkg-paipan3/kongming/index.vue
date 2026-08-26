<script setup lang="ts">
/**
 * 孔明神卦——自 V0 app/kongming/page.tsx 还原
 * 摇卦仪式（5 枚铜钱）→ 真随机六爻定卦 → 六十四卦金钱课签辞（题辞/签诗/诗曰/断曰/解卦/分类论断）
 * 取舍：V0 铜钱实拍图（coin-front/back.png）改为纯 CSS 铜钱（多端无图片依赖）；AI 深断区块本批不还原
 */
import { ref, computed, onUnmounted } from 'vue'
import ToolHeader from '@/components/paipan/tool-header.vue'
import PaperCard from '@/components/paipan/paper-card.vue'
import SectionTitle from '@/components/paipan/section-title.vue'
import Disclaimer from '@/components/compliance/disclaimer.vue'
import AppIcon from '@/components/common/app-icon.vue'
import {
  QIAN_DB, castToHexName, LEVEL_LABEL, CAT_META, GUACI, getPalace,
  type CoinCast,
} from '../lib/jinqianke-data'

type Phase = 'idle' | 'shaking' | 'done'

const phase = ref<Phase>('idle')
// 展示 5 枚铜钱作为摇卦仪式（true=字面阳 false=背面阴 null=未掷）
const coins = ref<(boolean | null)[]>([null, null, null, null, null])
const castResult = ref<CoinCast | null>(null)
let timer: ReturnType<typeof setInterval> | null = null

onUnmounted(() => { if (timer) clearInterval(timer) })

/** 随机布尔序列：优先 crypto 真随机（与 V0 一致），端上无 crypto 时退化 Math.random */
function randomBools(n: number): boolean[] {
  try {
    const c = (globalThis as { crypto?: { getRandomValues?: (b: Uint8Array) => void } }).crypto
    if (c?.getRandomValues) {
      const buf = new Uint8Array(n)
      c.getRandomValues(buf)
      return Array.from(buf, (b) => b % 2 === 0)
    }
  } catch { /* 降级 */ }
  return Array.from({ length: n }, () => Math.random() > 0.5)
}

function startShake() {
  phase.value = 'shaking'
  castResult.value = null
  timer = setInterval(() => {
    coins.value = Array.from({ length: 5 }, () => Math.random() > 0.5)
  }, 110)
}

function stopShake() {
  if (timer) { clearInterval(timer); timer = null }
  // 铜钱定格（5 枚），另取真随机六爻定卦（自下而上爻位一至六）
  coins.value = randomBools(5)
  castResult.value = randomBools(6) as CoinCast
  phase.value = 'done'
}

function reset() {
  phase.value = 'idle'
  coins.value = [null, null, null, null, null]
  castResult.value = null
}

const hexName = computed(() => (castResult.value ? castToHexName(castResult.value) : null))
const entry = computed(() => (hexName.value ? QIAN_DB[hexName.value] : null))
const guaci = computed(() => (hexName.value ? GUACI[hexName.value] : null))
const palaceName = computed(() => (hexName.value ? getPalace(hexName.value) : ''))

/** 题辞行：「题辞＋吉凶等级」，全角空格（U+3000）以码点生成，避免不规则空白告警 */
const FULLWIDTH_SPACE = String.fromCharCode(0x3000)
const titleLine = computed(() => (entry.value ? `${entry.value.title}${FULLWIDTH_SPACE}${LEVEL_LABEL[entry.value.level]}` : ''))

const levelColor = computed(() => {
  const e = entry.value
  if (!e) return 'var(--text-ink)'
  return e.level >= 4 ? '#1a7f4b' : e.level === 3 ? 'var(--text-ink)' : '#c2413b'
})

const tipText = computed(() => {
  if (phase.value === 'idle') return '请集中精力默想所想之事，点击「开始摇卦」。'
  if (phase.value === 'shaking') return '心念所问，觉得时机到了就点「停止摇卦」。'
  return hexName.value ? `得【${hexName.value}】，签辞如下。` : ''
})
</script>

<template>
  <view class="page">
    <tool-header
      title="孔明神卦"
      subtitle="所想之事 · 皆可提示"
      share
      share-title="孔明神卦"
    >
      <template #actions>
        <view
          v-if="phase === 'done'"
          class="hdr-reset"
          @tap="reset"
        >
          <app-icon
            name="refresh-cw"
            :size="34"
            color="var(--text-ink)"
          />
        </view>
      </template>
    </tool-header>

    <scroll-view
      scroll-y
      class="body"
    >
      <view class="inner">
        <!-- 摇卦区（5 枚铜钱横排） -->
        <paper-card padding="md">
          <view class="coins">
            <view
              v-for="(h, i) in coins"
              :key="i"
              class="coin"
              :class="{ 'coin-spin': phase === 'shaking', 'coin-back': h === false, 'coin-idle': h === null }"
            >
              <view class="coin-hole" />
              <text class="coin-mark">
                {{ h === null ? '' : h ? '字' : '背' }}
              </text>
            </view>
          </view>
          <view class="coins-tip">
            <text class="coins-tip-text">
              {{ tipText }}
            </text>
          </view>
        </paper-card>

        <!-- 主按钮 -->
        <view
          v-if="phase !== 'done'"
          class="main-btn"
          @tap="phase === 'idle' ? startShake() : stopShake()"
        >
          <text class="main-btn-text">
            {{ phase === 'idle' ? '开始摇卦' : '停止摇卦' }}
          </text>
        </view>

        <!-- 结果区 -->
        <template v-if="phase === 'done' && entry && hexName">
          <!-- 卦名卦象 -->
          <paper-card padding="md">
            <section-title title="卦名卦象" />
            <view class="hex-center">
              <text class="hex-name">
                {{ hexName }}
              </text>
              <text
                class="hex-title"
                :style="{ color: levelColor }"
              >
                {{ titleLine }}
              </text>
              <text class="hex-meta">
                {{ palaceName }}宫 · {{ guaci ? guaci.slice(0, 24) : '' }}
              </text>
              <!-- 定格铜钱 -->
              <view class="coins coins-sm">
                <view
                  v-for="(h, i) in coins"
                  :key="i"
                  class="coin coin-sm"
                  :class="{ 'coin-back': h === false }"
                >
                  <view class="coin-hole coin-hole-sm" />
                  <text class="coin-mark coin-mark-sm">
                    {{ h ? '字' : '背' }}
                  </text>
                </view>
              </view>
              <!-- 签诗（金色签诗匣） -->
              <view class="poem-box">
                <text
                  v-for="line in entry.poem"
                  :key="line"
                  class="poem-line"
                >
                  {{ line }}
                </text>
              </view>
            </view>
          </paper-card>

          <!-- 相关论断 -->
          <paper-card padding="md">
            <section-title title="相关论断" />
            <view class="verdicts">
              <view class="verdict">
                <text class="verdict-label">
                  诗曰：
                </text>
                <text class="verdict-text">
                  {{ entry.shiyue }}
                </text>
              </view>
              <view class="verdict">
                <text class="verdict-label">
                  断曰：
                </text>
                <text class="verdict-text">
                  {{ entry.duanyue }}
                </text>
              </view>
              <view class="verdict">
                <text class="verdict-label">
                  解卦：
                </text>
                <text class="verdict-text">
                  {{ entry.jie }}
                </text>
              </view>
            </view>
            <!-- 分类论断 -->
            <view class="cats">
              <view
                v-for="c in CAT_META"
                :key="c.key"
                class="cat"
              >
                <text class="cat-label">
                  {{ c.label }}
                </text>
                <text class="cat-text">
                  {{ entry.cat[c.key] }}
                </text>
              </view>
            </view>
          </paper-card>

          <!-- 再摇一卦 -->
          <view
            class="again-btn"
            @tap="reset"
          >
            <text class="again-btn-text">
              再摇一卦
            </text>
          </view>
        </template>

        <!-- 说明与合规 -->
        <view class="footnote">
          <text class="footnote-text">
            《孔明神卦》相传为武侯所著，所想之事皆可提示，签辞源于古书。签辞仅提供一种启示，或作为其他工具的辅助参考，切不可太过依赖、迷信，内容仅供参考。
          </text>
        </view>
        <disclaimer
          variant="custom"
          tone="subtle"
          text="以上内容为传统签辞白话整理，仅供传统文化研习参考，不构成任何预测或建议。"
        />
      </view>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: var(--bg-paper); display: flex; flex-direction: column; }
.body { flex: 1; height: 0; }
.inner { padding: 24rpx 32rpx 96rpx; display: flex; flex-direction: column; gap: 28rpx; }

.hdr-reset {
  width: 72rpx; height: 72rpx; display: flex; align-items: center; justify-content: center;
  border-radius: 50%;
  &:active { background: rgba(0, 0, 0, 0.05); }
}

/* ── 铜钱（纯 CSS 乾隆通宝意象：铜底圆钱 + 方孔） ── */
.coins { display: flex; justify-content: center; gap: 16rpx; }
.coins-sm { margin-top: 32rpx; }
.coin {
  position: relative;
  width: 104rpx; height: 104rpx; border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #e8c87c, #c9a353 55%, #9a7532);
  border: 4rpx solid #8a6828;
  box-shadow: inset 0 2rpx 8rpx rgba(255, 255, 255, 0.5), 0 4rpx 10rpx rgba(0, 0, 0, 0.15);
  display: flex; align-items: center; justify-content: center;
}
.coin-back {
  background: radial-gradient(circle at 35% 30%, #c4a464, #a07f3d 55%, #6f5322);
  border-color: #5f471d;
}
.coin-idle { opacity: 0.45; }
.coin-spin { animation: coin-flip 0.44s linear infinite; }
@keyframes coin-flip {
  0% { transform: rotateY(0deg); }
  100% { transform: rotateY(360deg); }
}
.coin-hole {
  position: absolute; top: 50%; left: 50%;
  width: 28rpx; height: 28rpx; transform: translate(-50%, -50%);
  background: var(--bg-paper); border: 3rpx solid #8a6828; border-radius: 4rpx;
}
.coin-mark {
  position: absolute; right: 8rpx; bottom: 6rpx;
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
  font-size: 24rpx; font-weight: 700; color: #5f471d;
}
.coin-sm { width: 88rpx; height: 88rpx; }
.coin-hole-sm { width: 24rpx; height: 24rpx; }
.coin-mark-sm { font-size: 22rpx; }

.coins-tip { margin-top: 32rpx; padding-top: 24rpx; border-top: 1rpx solid var(--line); }
.coins-tip-text { display: block; text-align: center; font-size: 26rpx; line-height: 1.7; color: var(--text-soft); }

/* ── 主按钮 ── */
.main-btn {
  padding: 28rpx; background: var(--brand); border-radius: 20rpx;
  box-shadow: 0 6rpx 20rpx rgba(196, 30, 58, 0.28);
  &:active { opacity: 0.8; }
}
.main-btn-text {
  display: block; text-align: center;
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
  font-size: 34rpx; font-weight: 700; color: #fff;
}

/* ── 卦名卦象 ── */
.hex-center { margin-top: 24rpx; display: flex; flex-direction: column; align-items: center; text-align: center; }
.hex-name {
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
  font-size: 48rpx; font-weight: 700; color: var(--brand);
}
.hex-title {
  margin-top: 16rpx;
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
  font-size: 34rpx; font-weight: 700;
}
.hex-meta { margin-top: 8rpx; font-size: 26rpx; color: var(--text-soft); }

.poem-box {
  margin-top: 40rpx; width: 100%; box-sizing: border-box;
  padding: 32rpx; border-radius: 20rpx;
  background: rgba(201, 169, 110, 0.16);
  display: flex; flex-direction: column; gap: 8rpx;
}
.poem-line {
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
  font-size: 34rpx; font-weight: 700; line-height: 1.9; color: var(--gold, #8a6d3b);
  text-align: center;
}

/* ── 相关论断 ── */
.verdicts { margin-top: 24rpx; display: flex; flex-direction: column; gap: 20rpx; }
.verdict { line-height: 1.7; }
.verdict-label { font-size: 26rpx; font-weight: 700; color: var(--brand); }
.verdict-text { font-size: 26rpx; line-height: 1.7; color: var(--text-soft); }

.cats { margin-top: 28rpx; display: grid; grid-template-columns: repeat(2, 1fr); gap: 18rpx; }
.cat { padding: 22rpx; border-radius: 14rpx; background: rgba(0, 0, 0, 0.03); }
.cat-label { display: block; font-size: 24rpx; font-weight: 700; color: var(--text-ink); }
.cat-text { display: block; margin-top: 8rpx; font-size: 24rpx; line-height: 1.6; color: var(--text-soft); }

/* ── 再摇一卦 ── */
.again-btn {
  padding: 26rpx; background: var(--card); border: 1rpx solid var(--line); border-radius: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
  &:active { opacity: 0.8; }
}
.again-btn-text {
  display: block; text-align: center;
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
  font-size: 30rpx; font-weight: 700; color: var(--text-ink);
}

/* ── 说明 ── */
.footnote { margin-top: 8rpx; }
.footnote-text { font-size: 24rpx; line-height: 1.7; color: var(--text-soft); }
</style>
