<script setup lang="ts">
/**
 * 数字能量解读——自 V0 app/shuzi/page.tsx 还原（单页两相：输入→结果同页）
 * 三套体系：①数字八星磁场（东方）②生命灵数（西方毕达哥拉斯）③梅花易数起卦
 * 取舍：
 *  ① V0 四维雷达图是 SVG——小程序无 SVG，改为四维能量横条（低实现风险、信息等价）
 *  ② V0「AI 数字印象」段走 /api/shuzi/ai（gemini），本端无该后端端点，整段砍掉，
 *     保留三套体系结构化解读（诚实降级，不做假 AI）
 *  ③ 手机号等输入用 type="text" + watch 过滤非数字（uni input type=number 有精度/事件坑），提交时 extractDigits 再校验
 *  ④ 补测算历史弹层（本地 rebu:shuzi-history · 上限 50，沿用诸葛神数范式）
 *  ⑤ 梅花起卦数据用 ./meihua-lite（逐字复制自 pkg-paipan/lib/meihua-data 的展示所需子集，
 *     遵循分包自包含惯例——同 bazi-engine 双分包副本做法，不做跨分包 lib import）
 */
import { ref, computed, watch } from 'vue'
import ToolHeader from '@/components/paipan/tool-header.vue'
import PaperCard from '@/components/paipan/paper-card.vue'
import Disclaimer from '@/components/compliance/disclaimer.vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import {
  INPUT_KINDS,
  type InputKind,
  extractDigits,
  analyzeStars,
  radarScores,
  tailAnalysis,
  STAR_INFO,
  lifeNumber,
  type StarName,
} from '@/pkg-paipan2/lib/shuzi-data'
import {
  BAGUA_NAMES, BAGUA_WX, BAGUA_LINES, HEX_NAMES, GUACI,
  getTiyongRelation, TIYONG_JUDGE,
} from './meihua-lite'
import { loadShuziHistory, saveShuziHistory, clearShuziHistory, type ShuziHistoryRecord } from './history'

// ─── 梅花起卦（同 V0：前后两段求和取余·平台标准算法） ───
function meihuaFromDigits(digits: string) {
  const nums = digits.split('').map(Number)
  const half = Math.floor(nums.length / 2)
  const front = nums.slice(0, half)
  const back = nums.slice(half)
  const mod = (n: number, m: number) => (n % m === 0 ? m : n % m)
  const frontSum = front.reduce((a, b) => a + b, 0) || 1
  const backSum = back.reduce((a, b) => a + b, 0) || 1
  const upper = mod(frontSum, 8)
  const lower = mod(backSum, 8)
  const moving = mod(frontSum + backSum, 6)
  const name = HEX_NAMES[upper][lower]
  // 变卦：动爻翻转（此处仅展示本卦六爻与动爻）
  const lines = [...BAGUA_LINES[BAGUA_NAMES[lower]], ...BAGUA_LINES[BAGUA_NAMES[upper]]]
  // 体用：动爻在下卦则下为用上为体，反之亦然
  const movingInLower = moving <= 3
  const tiGua = movingInLower ? upper : lower
  const yongGua = movingInLower ? lower : upper
  const relation = getTiyongRelation(BAGUA_WX[BAGUA_NAMES[tiGua]], BAGUA_WX[BAGUA_NAMES[yongGua]])
  return {
    upper, lower, moving, name, lines,
    guaci: GUACI[name] as string | undefined,
    ti: BAGUA_NAMES[tiGua], yong: BAGUA_NAMES[yongGua],
    relation, judge: TIYONG_JUDGE[relation],
    formula: `前段和${frontSum}÷8 取余为上卦，后段和${backSum}÷8 取余为下卦，总和÷6 取余为动爻`,
  }
}

// ─── 输入状态 ───
const kind = ref<InputKind>('phone')
const input = ref('')
const error = ref<string | null>(null)
const digits = ref<string | null>(null)

const kindMeta = computed(() => INPUT_KINDS.find((k) => k.id === kind.value) ?? INPUT_KINDS[0])

// 数字过滤（车牌保留字母；uni input 的 keypress 事件不可靠，用 watch 回写）
const KIND_MAX: Record<InputKind, number> = { phone: 11, plate: 8, birth: 8, custom: 20 }
watch(input, (v) => {
  const clean = kind.value === 'plate'
    ? v.replace(/[^0-9a-zA-Z一-龥·]/g, '').slice(0, KIND_MAX.plate)
    : v.replace(/\D/g, '').slice(0, KIND_MAX[kind.value])
  if (clean !== v) input.value = clean
})

function setKind(id: InputKind) {
  if (kind.value === id) return
  kind.value = id
  input.value = ''
  digits.value = null
  error.value = null
}

function analyze() {
  const r = extractDigits(kind.value, input.value)
  if (!r.ok) {
    error.value = r.error ?? '输入有误'
    digits.value = null
    return
  }
  error.value = null
  digits.value = r.digits
  saveShuziHistory({ kind: kind.value, kindLabel: kindMeta.value.label, raw: input.value, digits: r.digits })
}

// ─── 结果（本地纯计算，同 V0 useMemo） ───
const result = computed(() => {
  if (!digits.value) return null
  const hits = analyzeStars(digits.value, kind.value === 'phone')
  return {
    hits,
    radar: radarScores(hits),
    tail: kind.value === 'phone' ? tailAnalysis(digits.value) : null,
    life: lifeNumber(digits.value),
    gua: meihuaFromDigits(digits.value),
  }
})

/** 四维能量条（替代 V0 SVG 雷达图） */
const radarDims = computed(() => {
  if (!result.value) return []
  const r = result.value.radar
  return [
    { label: '财富', v: r.wealth },
    { label: '事业', v: r.career },
    { label: '健康', v: r.health },
    { label: '贵人', v: r.noble },
  ]
})

/** 命中星去重取前 3 展示详情（同 V0） */
const topStars = computed<StarName[]>(() => {
  if (!result.value) return []
  return [...new Set(result.value.hits.map((h) => h.star))].slice(0, 3)
})

/** 人生启示文案（同 V0 的断言弱化替换） */
const guaAdvice = computed(() => {
  if (!result.value) return ''
  return result.value.gua.judge.text
    .replace(/主有|主所|主谋|主耗|主受制于人，?/g, '')
    .replace(/防有祸患损失，宜守不宜进。/, '宜稳扎稳打、谋定后动。')
})

function chipTone(star: StarName): string {
  const nature = STAR_INFO[star].nature
  return nature === '吉' ? 'chip-good' : nature === '煞' ? 'chip-bad' : 'chip-flat'
}

// ─── 测算历史（本地存储弹层） ───
const showHistory = ref(false)
const records = ref<ShuziHistoryRecord[]>([])

function openHistory() {
  records.value = loadShuziHistory()
  showHistory.value = true
}
function onClearHistory() {
  clearShuziHistory()
  records.value = []
}
function openRecord(r: ShuziHistoryRecord) {
  showHistory.value = false
  kind.value = r.kind
  input.value = r.raw
  analyze()
}
</script>

<template>
  <view class="page">
    <tool-header
      title="数字能量解读"
      subtitle="八星磁场 · 生命灵数 · 梅花象数"
      share
      share-title="数字能量解读"
    >
      <template #actions>
        <view
          class="hdr-btn"
          @tap="openHistory"
        >
          <app-icon
            name="history"
            :size="36"
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
        <!-- 输入区 -->
        <paper-card padding="md">
          <view class="kind-tabs">
            <view
              v-for="k in INPUT_KINDS"
              :key="k.id"
              class="kind-tab"
              :class="{ 'kind-tab-active': kind === k.id }"
              @tap="setKind(k.id)"
            >
              <text
                class="kind-tab-text"
                :class="{ 'kind-tab-text-active': kind === k.id }"
              >
                {{ k.label }}
              </text>
            </view>
          </view>
          <view class="input-row">
            <input
              v-model="input"
              class="num-input"
              type="text"
              :maxlength="kind === 'plate' ? 8 : 20"
              :placeholder="kindMeta.placeholder"
              placeholder-class="num-input-ph"
              confirm-type="done"
              @confirm="analyze"
            >
            <view
              class="go-btn"
              @tap="analyze"
            >
              <text class="go-btn-text">
                解读
              </text>
            </view>
          </view>
          <text class="hint">
            {{ kindMeta.hint }}
          </text>
          <text
            v-if="error"
            class="err"
          >
            {{ error }}
          </text>
        </paper-card>

        <template v-if="result && digits">
          <!-- 体系一：八星磁场 -->
          <paper-card padding="md">
            <view class="sec-hdr">
              <text class="sec-title">数字八星磁场</text>
              <text class="sec-tag">东方 · 数字能量学</text>
            </view>

            <!-- 四维能量条（替代 SVG 雷达图） -->
            <view class="radar">
              <view
                v-for="d in radarDims"
                :key="d.label"
                class="radar-row"
              >
                <text class="radar-label">{{ d.label }}</text>
                <view class="radar-track">
                  <view
                    class="radar-fill"
                    :style="{ width: d.v + '%' }"
                  />
                </view>
                <text class="radar-val">{{ d.v }}</text>
              </view>
            </view>

            <text class="sub-label">磁场组合</text>
            <view class="chips">
              <view
                v-for="(h, i) in result.hits"
                :key="i"
                class="chip"
                :class="[chipTone(h.star), { 'chip-weak': h.weakened }]"
              >
                <text class="chip-pair">{{ h.pair }}</text>
                <text class="chip-name">{{ h.star }}</text>
                <text
                  v-if="h.weakened"
                  class="chip-weak-tag"
                >
                  弱
                </text>
              </view>
            </view>

            <view
              v-if="result.tail"
              class="tail-box"
            >
              <text class="tail-title">
                尾号重点 <text class="tail-num">{{ result.tail.tail }}</text>
              </text>
              <text class="tail-text">{{ result.tail.summary }}</text>
            </view>

            <view
              v-if="topStars.length > 0"
              class="star-list"
            >
              <view
                v-for="s in topStars"
                :key="s"
                class="star-item"
              >
                <text class="star-name">
                  {{ s }} <text class="star-alias">{{ STAR_INFO[s].alias }} · {{ STAR_INFO[s].keyword }}</text>
                </text>
                <text class="star-trait">{{ STAR_INFO[s].trait }}</text>
              </view>
            </view>
          </paper-card>

          <!-- 体系二：生命灵数 -->
          <paper-card
            v-if="result.life"
            padding="md"
          >
            <view class="sec-hdr">
              <text class="sec-title">生命灵数</text>
              <text class="sec-tag">西方 · 毕达哥拉斯数字学</text>
            </view>
            <view class="life-top">
              <view class="life-num-box">
                <text class="life-num">{{ result.life.master }}</text>
              </view>
              <view class="life-meta">
                <view class="life-title-row">
                  <text class="life-title">{{ result.life.info.title }}</text>
                  <view
                    v-if="result.life.isMaster"
                    class="life-master-tag"
                  >
                    <text class="life-master-text">卓越数</text>
                  </view>
                </view>
                <text class="life-keyword">{{ result.life.info.keyword }}</text>
                <text class="life-steps">{{ result.life.steps.join(' → ') }}</text>
              </view>
            </view>
            <text class="life-gift">{{ result.life.info.gift }}</text>
            <text class="life-lesson">
              <text class="life-lesson-b">人生课题：</text>{{ result.life.info.lesson }}
            </text>
            <view class="life-grid">
              <view class="lg-cell lg-good">
                <text class="lg-title lg-title-good">正面特质</text>
                <text class="lg-text">{{ result.life.info.positives.join(' · ') }}</text>
              </view>
              <view class="lg-cell lg-flat">
                <text class="lg-title">留意面向</text>
                <text class="lg-text">{{ result.life.info.negatives.join(' · ') }}</text>
              </view>
              <view class="lg-cell lg-line">
                <text class="lg-title">幸运色</text>
                <text class="lg-text">{{ result.life.info.luckyColor }}</text>
              </view>
              <view class="lg-cell lg-line">
                <text class="lg-title">幸运石</text>
                <text class="lg-text">{{ result.life.info.luckyStone }}</text>
              </view>
            </view>
            <text class="life-match">契合灵数：{{ result.life.info.match.join('、') }}</text>
          </paper-card>

          <!-- 体系三：梅花易数 -->
          <paper-card padding="md">
            <view class="sec-hdr">
              <text class="sec-title">梅花易数起卦</text>
              <text class="sec-tag">东方 · 周易象数</text>
            </view>
            <view class="gua-top">
              <!-- 卦象六爻图（自下而上） -->
              <view class="hex-fig">
                <view
                  v-for="(yang, i) in result.gua.lines"
                  :key="i"
                  class="hex-row"
                >
                  <view
                    v-if="yang"
                    class="hex-line"
                    :class="{ 'hex-line-moving': i === result.gua.moving - 1 }"
                  />
                  <view
                    v-else
                    class="hex-broken"
                  >
                    <view
                      class="hex-seg"
                      :class="{ 'hex-line-moving': i === result.gua.moving - 1 }"
                    />
                    <view
                      class="hex-seg"
                      :class="{ 'hex-line-moving': i === result.gua.moving - 1 }"
                    />
                  </view>
                  <text
                    v-if="i === result.gua.moving - 1"
                    class="hex-moving-tag"
                  >
                    动
                  </text>
                </view>
              </view>
              <view class="gua-meta">
                <text class="gua-name">{{ result.gua.name }}</text>
                <text class="gua-tiyong">体卦{{ result.gua.ti }} · 用卦{{ result.gua.yong }} · {{ result.gua.relation }}</text>
                <text class="gua-formula">{{ result.gua.formula }}</text>
              </view>
            </view>
            <view
              v-if="result.gua.guaci"
              class="guaci-box"
            >
              <text class="guaci-text">{{ result.gua.guaci }}</text>
            </view>
            <text class="gua-advice">
              <text class="gua-advice-b">人生启示：</text>{{ guaAdvice }}
            </text>
          </paper-card>

          <!-- 导流：数字文化课程 -->
          <paper-card padding="md">
            <view class="course-hdr">
              <app-icon
                name="graduation-cap"
                :size="32"
                color="var(--brand)"
              />
              <text class="course-hdr-text">想更深入了解数字文化？</text>
            </view>
            <view class="course-grid">
              <view
                class="course-card"
                @tap="navigateTo('/pkg-paipan/tools/coming-soon?name=' + encodeURIComponent('数字能量学课程'))"
              >
                <text class="course-name">《数字能量学》入门</text>
                <text class="course-desc">八星磁场系统课</text>
              </view>
              <view
                class="course-card"
                @tap="navigateTo('/pkg-paipan/tools/coming-soon?name=' + encodeURIComponent('姓名学课程'))"
              >
                <text class="course-name">《姓名学》精讲</text>
                <text class="course-desc">名字与数字的呼应</text>
              </view>
            </view>
          </paper-card>

          <!-- 合规声明 -->
          <disclaimer
            variant="custom"
            tone="subtle"
            text="本工具基于传统数字文化理论，分析结果仅供娱乐和文化研习参考，不构成任何预测或建议。请理性看待。"
          />
        </template>
      </view>
    </scroll-view>

    <!-- 测算历史弹层（本地存储） -->
    <view
      v-if="showHistory"
      class="mask"
      @tap="showHistory = false"
    >
      <view
        class="sheet"
        @tap.stop
      >
        <view class="sheet-hdr">
          <text
            class="sheet-cancel"
            @tap="showHistory = false"
          >
            关闭
          </text>
          <text class="sheet-title">
            测算历史
          </text>
          <text
            class="sheet-clear"
            :class="{ 'sheet-clear-off': records.length === 0 }"
            @tap="onClearHistory"
          >
            清空
          </text>
        </view>
        <scroll-view
          scroll-y
          class="history-list"
        >
          <view
            v-if="records.length === 0"
            class="history-empty"
          >
            <text class="history-empty-text">
              暂无测算记录，输入数字解读后自动留存
            </text>
          </view>
          <view
            v-for="r in records"
            :key="r.id"
            class="history-item"
            @tap="openRecord(r)"
          >
            <view class="history-item-main">
              <text class="history-input">
                {{ r.raw }}
              </text>
              <text class="history-kind">
                {{ r.kindLabel }}
              </text>
            </view>
            <text class="history-date">
              {{ r.dateText }}
            </text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: var(--bg-paper); display: flex; flex-direction: column; }
.body { flex: 1; height: 0; }
.inner { padding: 24rpx 32rpx 96rpx; display: flex; flex-direction: column; gap: 28rpx; }

.hdr-btn {
  width: 72rpx; height: 72rpx; display: flex; align-items: center; justify-content: center;
  border-radius: 50%;
  &:active { background: rgba(0, 0, 0, 0.05); }
}

/* ── 输入区 ── */
.kind-tabs {
  display: flex; gap: 8rpx;
  padding: 8rpx; border-radius: 16rpx;
  background: var(--surface-sunken);
}
.kind-tab {
  flex: 1; display: flex; align-items: center; justify-content: center;
  padding: 12rpx 0; border-radius: 12rpx;
  &:active { opacity: 0.8; }
}
.kind-tab-active {
  background: var(--brand);
  box-shadow: 0 2rpx 8rpx rgba(196, 30, 58, 0.25);
}
.kind-tab-text { font-size: 26rpx; font-weight: 500; color: var(--text-soft); }
.kind-tab-text-active { color: #fff; font-weight: 700; }

.input-row { margin-top: 24rpx; display: flex; align-items: stretch; gap: 16rpx; }
.num-input {
  flex: 1; min-width: 0; box-sizing: border-box;
  height: 92rpx; padding: 0 28rpx;
  border-radius: 20rpx; border: 1rpx solid var(--line);
  background: var(--bg-paper);
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
  font-size: 32rpx; letter-spacing: 0.12em; color: var(--text-ink);
}
.num-input-ph { font-size: 26rpx; letter-spacing: 0; color: var(--text-soft); }
.go-btn {
  flex-shrink: 0; display: flex; align-items: center; justify-content: center;
  padding: 0 40rpx; border-radius: 20rpx;
  background: var(--brand);
  box-shadow: 0 6rpx 20rpx rgba(196, 30, 58, 0.28);
  &:active { opacity: 0.8; }
}
.go-btn-text { font-size: 28rpx; font-weight: 700; color: #fff; }
.hint { display: block; margin-top: 16rpx; font-size: 22rpx; color: var(--text-soft); }
.err { display: block; margin-top: 12rpx; font-size: 22rpx; color: var(--danger); }

/* ── 区块头 ── */
.sec-hdr { display: flex; align-items: baseline; justify-content: space-between; gap: 16rpx; }
.sec-title {
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
  font-size: 34rpx; font-weight: 700; color: var(--text-ink);
}
.sec-tag { font-size: 22rpx; color: var(--text-soft); flex-shrink: 0; }

/* ── 四维能量条 ── */
.radar { margin-top: 28rpx; display: flex; flex-direction: column; gap: 20rpx; }
.radar-row { display: flex; align-items: center; gap: 20rpx; }
.radar-label { width: 88rpx; flex-shrink: 0; font-size: 26rpx; font-weight: 700; color: var(--text-ink); }
.radar-track {
  flex: 1; height: 20rpx; border-radius: 999rpx;
  background: var(--surface-sunken); overflow: hidden;
}
.radar-fill {
  height: 100%; border-radius: 999rpx;
  background: linear-gradient(90deg, rgba(196, 30, 58, 0.55), var(--brand));
}
.radar-val { width: 56rpx; flex-shrink: 0; text-align: right; font-size: 24rpx; font-weight: 700; color: var(--brand); }

/* ── 磁场组合 chips ── */
.sub-label { display: block; margin-top: 28rpx; margin-bottom: 12rpx; font-size: 24rpx; font-weight: 700; color: var(--text-soft); }
.chips { display: flex; flex-wrap: wrap; gap: 12rpx; }
.chip {
  display: inline-flex; align-items: center; gap: 8rpx;
  border-radius: 12rpx; padding: 8rpx 16rpx;
}
.chip-good { background: rgba(82, 196, 26, 0.12); .chip-pair, .chip-name, .chip-weak-tag { color: #3f9714; } }
.chip-bad { background: rgba(196, 30, 58, 0.1); .chip-pair, .chip-name, .chip-weak-tag { color: var(--brand); } }
.chip-flat { background: var(--surface-sunken); .chip-pair, .chip-name, .chip-weak-tag { color: var(--text-soft); } }
.chip-weak { opacity: 0.6; }
.chip-pair { font-family: Georgia, 'Courier New', monospace; font-size: 24rpx; font-weight: 600; }
.chip-name { font-size: 24rpx; font-weight: 500; }
.chip-weak-tag { font-size: 20rpx; }

/* ── 尾号重点 ── */
.tail-box { margin-top: 24rpx; border-radius: 16rpx; background: var(--surface-sunken); padding: 24rpx; }
.tail-title { display: block; font-size: 24rpx; font-weight: 700; color: var(--text-ink); }
.tail-num { font-family: Georgia, 'Courier New', monospace; color: var(--brand); }
.tail-text { display: block; margin-top: 8rpx; font-size: 24rpx; line-height: 1.7; color: var(--text-soft); }

/* ── 主星详情 ── */
.star-list { margin-top: 24rpx; display: flex; flex-direction: column; gap: 16rpx; }
.star-item { border: 1rpx solid var(--line); border-radius: 16rpx; padding: 24rpx; }
.star-name { display: block; font-size: 26rpx; font-weight: 700; color: var(--text-ink); }
.star-alias { font-size: 22rpx; font-weight: 400; color: var(--text-soft); }
.star-trait { display: block; margin-top: 8rpx; font-size: 24rpx; line-height: 1.7; color: var(--text-soft); }

/* ── 生命灵数 ── */
.life-top { margin-top: 24rpx; display: flex; align-items: center; gap: 32rpx; }
.life-num-box {
  width: 160rpx; height: 160rpx; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  border-radius: 32rpx; border: 4rpx solid var(--brand);
  background: rgba(196, 30, 58, 0.08);
}
.life-num {
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
  font-size: 72rpx; font-weight: 700; color: var(--brand);
}
.life-meta { flex: 1; min-width: 0; }
.life-title-row { display: flex; align-items: center; gap: 12rpx; }
.life-title { font-size: 30rpx; font-weight: 700; color: var(--text-ink); }
.life-master-tag { border-radius: 8rpx; background: rgba(196, 30, 58, 0.1); padding: 2rpx 12rpx; }
.life-master-text { font-size: 20rpx; color: var(--brand); }
.life-keyword { display: block; margin-top: 4rpx; font-size: 24rpx; color: var(--text-soft); }
.life-steps {
  display: block; margin-top: 8rpx;
  font-family: Georgia, 'Courier New', monospace;
  font-size: 22rpx; color: var(--text-soft); opacity: 0.85;
}
.life-gift { display: block; margin-top: 24rpx; font-size: 28rpx; line-height: 1.7; color: var(--text-ink); }
.life-lesson { display: block; margin-top: 16rpx; font-size: 24rpx; line-height: 1.7; color: var(--text-soft); }
.life-lesson-b { font-weight: 700; }
.life-grid {
  margin-top: 24rpx;
  display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16rpx;
}
.lg-cell { border-radius: 16rpx; padding: 20rpx; }
.lg-good { background: rgba(82, 196, 26, 0.12); }
.lg-flat { background: var(--surface-sunken); }
.lg-line { border: 1rpx solid var(--line); }
.lg-title { display: block; font-size: 24rpx; font-weight: 700; color: var(--text-ink); }
.lg-title-good { color: #3f9714; }
.lg-text { display: block; margin-top: 8rpx; font-size: 24rpx; line-height: 1.6; color: var(--text-soft); }
.life-match { display: block; margin-top: 16rpx; font-size: 22rpx; color: var(--text-soft); }

/* ── 梅花易数 ── */
.gua-top { margin-top: 24rpx; display: flex; align-items: center; gap: 40rpx; }
.hex-fig { display: flex; flex-direction: column-reverse; gap: 12rpx; flex-shrink: 0; }
.hex-row { display: flex; align-items: center; gap: 12rpx; height: 12rpx; }
.hex-line { height: 12rpx; width: 112rpx; border-radius: 4rpx; background: var(--text-ink); }
.hex-broken { display: flex; width: 112rpx; gap: 12rpx; }
.hex-seg { height: 12rpx; flex: 1; border-radius: 4rpx; background: var(--text-ink); }
.hex-line-moving { background: var(--brand); }
.hex-moving-tag { font-size: 20rpx; font-weight: 700; color: var(--brand); }
.gua-meta { flex: 1; min-width: 0; }
.gua-name {
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
  font-size: 40rpx; font-weight: 700; color: var(--text-ink);
}
.gua-tiyong { display: block; margin-top: 4rpx; font-size: 24rpx; color: var(--text-soft); }
.gua-formula { display: block; margin-top: 8rpx; font-size: 22rpx; line-height: 1.6; color: var(--text-soft); opacity: 0.85; }
.guaci-box { margin-top: 24rpx; border-radius: 16rpx; background: var(--surface-sunken); padding: 24rpx; }
.guaci-text {
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
  font-size: 24rpx; line-height: 1.8; color: var(--text-ink);
}
.gua-advice { display: block; margin-top: 16rpx; font-size: 24rpx; line-height: 1.7; color: var(--text-soft); }
.gua-advice-b { font-weight: 700; color: var(--text-ink); }

/* ── 导流 ── */
.course-hdr { display: flex; align-items: center; gap: 12rpx; }
.course-hdr-text { font-size: 28rpx; font-weight: 700; color: var(--text-ink); }
.course-grid {
  margin-top: 24rpx;
  display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16rpx;
}
.course-card {
  border: 1rpx solid var(--line); border-radius: 16rpx; padding: 24rpx;
  &:active { background: rgba(0, 0, 0, 0.03); }
}
.course-name { display: block; font-size: 24rpx; font-weight: 700; color: var(--text-ink); }
.course-desc { display: block; margin-top: 8rpx; font-size: 22rpx; color: var(--text-soft); }

/* ── 历史弹层 ── */
.mask {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 100;
  display: flex; align-items: flex-end;
}
.sheet {
  width: 100%;
  background: var(--card);
  border-radius: 32rpx 32rpx 0 0;
  overflow: hidden;
  padding-bottom: env(safe-area-inset-bottom);
  max-height: 70vh;
  display: flex; flex-direction: column;
}
.sheet-hdr {
  display: flex; align-items: center; justify-content: space-between;
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid var(--line);
}
.sheet-cancel { font-size: 26rpx; font-weight: 500; color: var(--text-soft); }
.sheet-title { font-size: 30rpx; font-weight: 600; color: var(--text-ink); }
.sheet-clear { font-size: 26rpx; font-weight: 500; color: var(--brand); }
.sheet-clear-off { opacity: 0.4; }
.history-list { max-height: 56vh; }
.history-empty { padding: 80rpx 48rpx; }
.history-empty-text { display: block; text-align: center; font-size: 26rpx; color: var(--text-soft); line-height: 1.6; }
.history-item {
  display: flex; align-items: center; justify-content: space-between; gap: 20rpx;
  padding: 26rpx 32rpx;
  border-bottom: 1rpx solid var(--line);
  &:active { background: rgba(0, 0, 0, 0.03); }
}
.history-item-main { display: flex; align-items: baseline; gap: 16rpx; min-width: 0; flex: 1; }
.history-input {
  font-family: Georgia, 'Courier New', monospace;
  font-size: 28rpx; font-weight: 700; color: var(--text-ink);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.history-kind { font-size: 22rpx; color: var(--brand); flex-shrink: 0; }
.history-date { font-size: 22rpx; color: var(--text-soft); flex-shrink: 0; }
</style>
