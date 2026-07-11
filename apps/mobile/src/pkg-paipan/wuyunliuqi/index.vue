<script setup lang="ts">
/**
 * 五运六气助手——自 V0 app/wuyunliuqi/page.tsx + components/wuyunliuqi/{qi-ring,ai-panel} 还原
 * 年份切换 → 岁运（太过/不及）· 司天在泉 · 运气相合 · 六气六步（主/客气 + 当令）· 气步养生详情
 * 取舍：
 *  ① V0 qi-ring 是 SVG 双环（外客内主）——小程序无 SVG，改为六列双排色带
 *     （上排客气实色块 / 下排主气浅色块，选中金框、当令描金），信息等价且实现风险最低
 *  ② V0 AiPanel 三模式（年度解读/体质适配/运气问答，走 gemini API）——砍掉 AI 调用，
 *     保留「体质适配」为纯静态九体质要点（constitution.ts 真数据非 AI），并按当前气步
 *     气性 × 体质敏感因子做规则化提示；年度解读改用引擎 summary 纯文本；问答模式删除
 *  ③ 「研习与调养」推荐卡引导至 coming-soon 占位页（平台无对应真实课程/商品可挂）
 *  ④ R4 合规：小程序端标题条件编译为「运气学说研究」
 */
import { ref, computed, watch } from 'vue'
import ToolHeader from '@/components/paipan/tool-header.vue'
import PaperCard from '@/components/paipan/paper-card.vue'
import SectionTitle from '@/components/paipan/section-title.vue'
import Disclaimer from '@/components/compliance/disclaimer.vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import { computeWuyun, currentStepIndex } from '@/pkg-paipan/lib/wuyunliuqi-engine'
import { COMPLIANCE_TEXT } from '@/pkg-paipan/lib/wuyunliuqi-data'
import { CONSTITUTIONS, constitutionOf, type ConstitutionKey, type ClimateTag } from '@/pkg-paipan/lib/constitution'

// R4 合规：小程序端无占卜类目，标题改文化研究表述（仅展示文案）
let hdrTitle = '五运六气助手'
// #ifdef MP-WEIXIN
hdrTitle = '运气学说研究'
// #endif

// ─── 年份切换（节气表由天文算法逐年计算，限定常用安全区间） ───
const YEAR_MIN = 1900
const YEAR_MAX = 2100
const nowYear = new Date().getFullYear()
const year = ref(nowYear)

function shiftYear(delta: number) {
  const next = year.value + delta
  if (next < YEAR_MIN || next > YEAR_MAX) {
    uni.showToast({ title: `仅支持 ${YEAR_MIN} — ${YEAR_MAX} 年`, icon: 'none' })
    return
  }
  year.value = next
}

const result = computed(() => computeWuyun(year.value, new Date()))

// ─── 气步选择：当年默认当令气步，其余年份默认三之气（司天） ───
const selectedStep = ref(1)
function resetStep() {
  selectedStep.value = year.value === nowYear ? (currentStepIndex(result.value) ?? 3) : 3
}
resetStep()
watch(year, resetStep)

const step = computed(() => result.value.steps.find((s) => s.step === selectedStep.value) ?? result.value.steps[2])

function prevStep() {
  selectedStep.value = selectedStep.value > 1 ? selectedStep.value - 1 : 6
}
function nextStep() {
  selectedStep.value = selectedStep.value < 6 ? selectedStep.value + 1 : 1
}

// ─── 体质适配（静态九体质要点·非 AI） ───
const consKey = ref<ConstitutionKey>('pinghe')
const cons = computed(() => constitutionOf(consKey.value))

/** 六气气性 → 气候因子（用于体质敏感提示的规则化匹配） */
const QI_CLIMATE_TAG: Record<string, ClimateTag> = {
  风: '风', 君火: '热', 相火: '热', 湿: '湿', 燥: '燥', 寒: '寒',
}
const consCaution = computed(() => {
  const tag = QI_CLIMATE_TAG[step.value.guest.qi]
  if (tag && cons.value.sensitive.includes(tag)) {
    return `${step.value.label}客气为${step.value.guest.name}（主${tag}），正是${cons.value.name}的敏感时段，需格外注意防护。`
  }
  return null
})

/** 推荐卡（V0 商业转化区，改引导 coming-soon 占位） */
function goComingSoon(name: string) {
  navigateTo('/pkg-paipan/tools/coming-soon?name=' + encodeURIComponent(name))
}
const dietNames = computed(() => step.value.guest.diets.map((d) => d.name.replace(/（.*）/, '')).join(' · '))
</script>

<template>
  <view class="page">
    <tool-header
      :title="hdrTitle"
      subtitle="基于《黄帝内经》的运气学研习"
      share
      :share-title="hdrTitle"
    />

    <scroll-view
      scroll-y
      class="body"
    >
      <view class="inner">
        <!-- 年份切换 -->
        <view class="year-bar">
          <view
            class="year-btn"
            @tap="shiftYear(-1)"
          >
            <app-icon
              name="minus"
              :size="32"
              color="#ffffff"
            />
          </view>
          <view class="year-center">
            <text class="year-text">{{ result.year }} · {{ result.ganzhi }}年</text>
            <text
              v-if="year === nowYear"
              class="year-now"
            >
              今年
            </text>
          </view>
          <view
            class="year-btn"
            @tap="shiftYear(1)"
          >
            <app-icon
              name="plus"
              :size="32"
              color="#ffffff"
            />
          </view>
        </view>

        <!-- 岁运 Hero -->
        <paper-card padding="md">
          <view class="hero">
            <view
              class="hero-elem"
              :style="{ backgroundColor: result.suiyun.info.soft }"
            >
              <text
                class="hero-elem-label"
                :style="{ color: result.suiyun.info.color }"
              >
                岁运
              </text>
              <text
                class="hero-elem-char"
                :style="{ color: result.suiyun.info.color }"
              >
                {{ result.suiyun.info.element }}
              </text>
              <view
                class="hero-state"
                :style="{ backgroundColor: result.suiyun.info.color }"
              >
                <text class="hero-state-text">{{ result.suiyun.stateLabel }}</text>
              </view>
            </view>
            <view class="hero-desc">
              <text class="hero-title">
                {{ result.suiyun.info.element }}运{{ result.suiyun.stateLabel }} · {{ result.suiyun.stateName }}
              </text>
              <text class="hero-trait">{{ result.suiyun.trait }}</text>
            </view>
          </view>

          <!-- 司天在泉 -->
          <view class="st-grid">
            <view
              class="st-cell"
              :style="{ backgroundColor: result.sitian.soft }"
            >
              <text class="st-label">司天 · 主上半年</text>
              <text
                class="st-name"
                :style="{ color: result.sitian.color }"
              >
                {{ result.sitian.name }}
              </text>
            </view>
            <view
              class="st-cell"
              :style="{ backgroundColor: result.zaiquan.soft }"
            >
              <text class="st-label">在泉 · 主下半年</text>
              <text
                class="st-name"
                :style="{ color: result.zaiquan.color }"
              >
                {{ result.zaiquan.name }}
              </text>
            </view>
          </view>

          <!-- 运气相合 -->
          <view
            v-if="result.combinations.length > 0"
            class="combos"
          >
            <view
              v-for="c in result.combinations"
              :key="c.name"
              class="combo"
            >
              <view class="combo-tag">
                <text class="combo-tag-text">{{ c.name }}</text>
              </view>
              <text class="combo-meaning">{{ c.meaning }}</text>
            </view>
          </view>
        </paper-card>

        <!-- 六气分步（双排色带替代 SVG 双环：上客下主） -->
        <view class="sec">
          <section-title
            title="六气分步"
            subtitle="上排客气 · 下排主气 · 点击查看详情"
          />
          <paper-card
            padding="md"
            class="sec-card"
          >
            <view class="qi-band">
              <view
                v-for="s in result.steps"
                :key="s.step"
                class="qb-col"
                :class="{ 'qb-col-active': s.step === selectedStep, 'qb-col-current': s.isCurrent && s.step !== selectedStep }"
                @tap="selectedStep = s.step"
              >
                <view
                  class="qb-guest"
                  :style="{ backgroundColor: s.guest.color, opacity: s.step === selectedStep ? 1 : 0.82 }"
                >
                  <text class="qb-guest-qi">{{ s.guest.qi }}</text>
                  <text class="qb-guest-yy">{{ s.guest.yinyang }}</text>
                </view>
                <view
                  class="qb-host"
                  :style="{ backgroundColor: s.host.soft }"
                >
                  <text
                    class="qb-host-qi"
                    :style="{ color: s.host.color }"
                  >
                    {{ s.host.qi }}
                  </text>
                </view>
                <text
                  class="qb-label"
                  :class="{ 'qb-label-active': s.step === selectedStep }"
                >
                  {{ s.label.replace('之气', '') }}
                </text>
                <text
                  v-if="s.isCurrent"
                  class="qb-now"
                >
                  当令
                </text>
              </view>
            </view>
          </paper-card>
        </view>

        <!-- 气步详情 -->
        <paper-card padding="md">
          <view class="sd-hdr">
            <view class="sd-hdr-left">
              <text class="sd-title">{{ step.label }}</text>
              <view
                v-if="step.isCurrent"
                class="sd-now"
              >
                <text class="sd-now-text">当令</text>
              </view>
            </view>
            <view class="sd-range">
              <app-icon
                name="calendar-days"
                :size="26"
                color="var(--text-soft)"
              />
              <text class="sd-range-text">{{ step.dateRange }}</text>
            </view>
          </view>

          <!-- 主客气 -->
          <view class="hg-grid">
            <view class="hg-cell hg-cell-line">
              <text class="hg-label">主气（恒定地气）</text>
              <text
                class="hg-name"
                :style="{ color: step.host.color }"
              >
                {{ step.host.name }}
              </text>
            </view>
            <view
              class="hg-cell"
              :style="{ backgroundColor: step.guest.soft }"
            >
              <text class="hg-label">客气（随司天）</text>
              <text
                class="hg-name"
                :style="{ color: step.guest.color }"
              >
                {{ step.guest.name }}
              </text>
            </view>
          </view>

          <!-- 客主关系 -->
          <view
            class="rel"
            :class="step.relation === 'conflict' ? 'rel-bad' : step.relation === 'same' ? 'rel-flat' : 'rel-good'"
          >
            <text class="rel-text">客主之气：{{ step.relationText }}</text>
          </view>

          <!-- 气候 / 易发病 / 养生 / 饮食 -->
          <view class="rows">
            <view class="row">
              <view class="row-tag"><text class="row-tag-text">气候特点</text></view>
              <text class="row-text">{{ step.guest.climate }}</text>
            </view>
            <view class="row">
              <view class="row-tag"><text class="row-tag-text">易发病症</text></view>
              <text class="row-text">{{ step.guest.ailments }}</text>
            </view>
            <view class="row">
              <view class="row-tag"><text class="row-tag-text">养生原则</text></view>
              <text class="row-text">{{ step.guest.principle }}</text>
            </view>
            <view class="row">
              <view class="row-tag"><text class="row-tag-text">饮食建议</text></view>
              <text class="row-text">{{ step.guest.favorFoods }}</text>
            </view>
          </view>

          <!-- 应季药膳 -->
          <view class="diets">
            <view class="diets-hdr">
              <app-icon
                name="leaf"
                :size="28"
                color="var(--brand)"
              />
              <text class="diets-title">应季药膳</text>
            </view>
            <view
              v-for="d in step.guest.diets"
              :key="d.name"
              class="diet"
            >
              <view class="diet-dot" />
              <view class="diet-main">
                <text class="diet-name">{{ d.name }}</text>
                <text class="diet-desc">{{ d.desc }}</text>
              </view>
            </view>
          </view>

          <!-- 上/下气步切换 -->
          <view class="step-nav">
            <view
              class="step-btn"
              @tap="prevStep"
            >
              <app-icon
                name="chevron-left"
                :size="28"
                color="var(--text-ink)"
              />
              <text class="step-btn-text">上一气</text>
            </view>
            <view
              class="step-btn"
              @tap="nextStep"
            >
              <text class="step-btn-text">下一气</text>
              <app-icon
                name="chevron-right"
                :size="28"
                color="var(--text-ink)"
              />
            </view>
          </view>
        </paper-card>

        <!-- 全年气化总述（引擎纯文本，替代 V0「年度 AI 解读」） -->
        <paper-card
          padding="md"
          gold
        >
          <view class="sum-hdr">
            <app-icon
              name="scroll-text"
              :size="30"
              color="var(--gold)"
            />
            <text class="sum-title">全年气化总述</text>
          </view>
          <text class="sum-text">{{ result.summary }}</text>
        </paper-card>

        <!-- 体质适配（静态九体质要点·真数据非 AI） -->
        <paper-card
          padding="md"
          gold
        >
          <view class="sum-hdr">
            <app-icon
              name="user"
              :size="30"
              color="var(--gold)"
            />
            <text class="sum-title">体质适配养生</text>
          </view>
          <text class="cons-note">依《中医体质分类与判定》九分法，选择体质查看调养要点</text>

          <view class="cons-chips">
            <view
              v-for="c in CONSTITUTIONS"
              :key="c.key"
              class="cons-chip"
              :class="{ 'cons-chip-active': consKey === c.key }"
              @tap="consKey = c.key"
            >
              <text
                class="cons-chip-text"
                :class="{ 'cons-chip-text-active': consKey === c.key }"
              >
                {{ c.name }}
              </text>
            </view>
          </view>

          <view class="cons-body">
            <text class="cons-summary">{{ cons.name }}：{{ cons.summary }}</text>
            <view class="cons-traits">
              <view
                v-for="t in cons.traits"
                :key="t"
                class="cons-trait"
              >
                <text class="cons-trait-text">{{ t }}</text>
              </view>
            </view>

            <view
              v-if="consCaution"
              class="cons-caution"
            >
              <text class="cons-caution-text">{{ consCaution }}</text>
            </view>

            <view class="rows cons-rows">
              <view class="row">
                <view class="row-tag"><text class="row-tag-text">调养总则</text></view>
                <text class="row-text">{{ cons.principle }}</text>
              </view>
              <view class="row">
                <view class="row-tag"><text class="row-tag-text">宜食</text></view>
                <text class="row-text">{{ cons.favorFoods.join('、') }}</text>
              </view>
              <view class="row">
                <view class="row-tag"><text class="row-tag-text">忌食</text></view>
                <text class="row-text">{{ cons.avoidFoods.join('、') }}</text>
              </view>
              <view class="row">
                <view class="row-tag"><text class="row-tag-text">起居</text></view>
                <text class="row-text">{{ cons.lifestyle }}</text>
              </view>
              <view class="row">
                <view class="row-tag"><text class="row-tag-text">运动</text></view>
                <text class="row-text">{{ cons.exercise }}</text>
              </view>
              <view class="row">
                <view class="row-tag"><text class="row-tag-text">情志</text></view>
                <text class="row-text">{{ cons.emotion }}</text>
              </view>
            </view>
          </view>
        </paper-card>

        <!-- 研习与调养 -->
        <view class="sec">
          <section-title
            title="研习与调养"
            subtitle="精选课程与应季好物"
          />
          <view class="rec-list">
            <view
              class="rec-card"
              @tap="goComingSoon('《黄帝内经》五运六气精讲')"
            >
              <view class="rec-icon">
                <app-icon
                  name="book-open"
                  :size="40"
                  color="var(--brand)"
                />
              </view>
              <view class="rec-main">
                <view class="rec-title-row">
                  <view class="rec-tag"><text class="rec-tag-text">课程</text></view>
                  <text class="rec-title">《黄帝内经》五运六气精讲</text>
                </view>
                <text class="rec-desc">从入门到实战，系统掌握运气推演与养生应用</text>
              </view>
              <text class="rec-price">查看</text>
            </view>
            <view
              class="rec-card"
              @tap="goComingSoon(step.guest.qi + '气应季好物')"
            >
              <view class="rec-icon">
                <app-icon
                  name="shopping-bag"
                  :size="40"
                  color="var(--brand)"
                />
              </view>
              <view class="rec-main">
                <view class="rec-title-row">
                  <view class="rec-tag"><text class="rec-tag-text">商城</text></view>
                  <text class="rec-title">{{ step.guest.qi }}气应季好物</text>
                </view>
                <text class="rec-desc">{{ dietNames }}</text>
              </view>
              <text class="rec-price">查看</text>
            </view>
          </view>
        </view>

        <disclaimer
          variant="custom"
          tone="subtle"
          :text="COMPLIANCE_TEXT"
        />
      </view>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: var(--bg-paper); display: flex; flex-direction: column; }
.body { flex: 1; height: 0; }
.inner { padding: 24rpx 32rpx 96rpx; display: flex; flex-direction: column; gap: 28rpx; }

.sec { display: flex; flex-direction: column; gap: 20rpx; }
.sec-card { display: block; }

/* ── 年份切换 ── */
.year-bar {
  display: flex; align-items: center; justify-content: space-between;
  border-radius: 20rpx; background: var(--card);
  border: 1rpx solid var(--line);
  padding: 16rpx 24rpx;
}
.year-btn {
  width: 64rpx; height: 64rpx;
  display: flex; align-items: center; justify-content: center;
  border-radius: 16rpx; background: var(--brand);
  &:active { opacity: 0.8; }
}
.year-center { display: flex; flex-direction: column; align-items: center; }
.year-text {
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
  font-size: 34rpx; font-weight: 700; color: var(--text-ink);
}
.year-now { font-size: 22rpx; color: var(--brand); }

/* ── 岁运 Hero ── */
.hero { display: flex; align-items: stretch; gap: 24rpx; }
.hero-elem {
  width: 176rpx; flex-shrink: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  border-radius: 20rpx; padding: 24rpx 0;
}
.hero-elem-label { font-size: 22rpx; font-weight: 500; }
.hero-elem-char {
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
  font-size: 60rpx; font-weight: 700; line-height: 1.3;
}
.hero-state { margin-top: 8rpx; border-radius: 999rpx; padding: 2rpx 16rpx; }
.hero-state-text { font-size: 22rpx; font-weight: 700; color: #fff; }
.hero-desc { flex: 1; min-width: 0; }
.hero-title { display: block; font-size: 28rpx; font-weight: 700; color: var(--text-ink); }
.hero-trait { display: block; margin-top: 8rpx; font-size: 24rpx; line-height: 1.7; color: var(--text-soft); }

/* ── 司天在泉 ── */
.st-grid {
  margin-top: 24rpx;
  display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16rpx;
}
.st-cell { border-radius: 20rpx; padding: 20rpx; }
.st-label { display: block; font-size: 22rpx; color: var(--text-soft); }
.st-name { display: block; margin-top: 4rpx; font-size: 28rpx; font-weight: 700; }

/* ── 运气相合 ── */
.combos { margin-top: 24rpx; display: flex; flex-direction: column; gap: 12rpx; }
.combo {
  display: flex; align-items: flex-start; gap: 12rpx;
  border: 1rpx solid rgba(201, 169, 110, 0.4);
  background: rgba(201, 169, 110, 0.12);
  border-radius: 16rpx; padding: 16rpx 24rpx;
}
.combo-tag { flex-shrink: 0; border-radius: 999rpx; background: var(--gold); padding: 4rpx 16rpx; }
.combo-tag-text { font-size: 22rpx; font-weight: 700; color: var(--gold-foreground); }
.combo-meaning { flex: 1; font-size: 22rpx; line-height: 1.7; color: var(--text); }

/* ── 六气分步双排色带 ── */
.qi-band {
  display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 8rpx;
}
.qb-col {
  display: flex; flex-direction: column; align-items: stretch;
  border-radius: 12rpx; padding: 6rpx;
  border: 2rpx solid transparent;
  &:active { opacity: 0.85; }
}
.qb-col-active { border-color: var(--gold); background: rgba(201, 169, 110, 0.1); }
.qb-col-current { border-color: rgba(201, 169, 110, 0.5); }
.qb-guest {
  height: 112rpx; border-radius: 10rpx 10rpx 0 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
}
.qb-guest-qi { font-size: 26rpx; font-weight: 700; color: #fff; text-align: center; line-height: 1.2; }
.qb-guest-yy { margin-top: 4rpx; font-size: 18rpx; color: rgba(255, 255, 255, 0.85); }
.qb-host {
  height: 56rpx; border-radius: 0 0 10rpx 10rpx;
  display: flex; align-items: center; justify-content: center;
}
.qb-host-qi { font-size: 22rpx; font-weight: 500; }
.qb-label {
  margin-top: 8rpx; text-align: center;
  font-size: 20rpx; font-weight: 700; color: var(--text);
}
.qb-label-active { color: var(--text-ink); }
.qb-now { text-align: center; font-size: 18rpx; color: var(--gold); font-weight: 700; }

/* ── 气步详情 ── */
.sd-hdr { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; }
.sd-hdr-left { display: flex; align-items: center; gap: 16rpx; }
.sd-title {
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
  font-size: 34rpx; font-weight: 700; color: var(--text-ink);
}
.sd-now { border-radius: 999rpx; background: var(--gold); padding: 2rpx 16rpx; }
.sd-now-text { font-size: 20rpx; font-weight: 700; color: var(--gold-foreground); }
.sd-range { display: flex; align-items: center; gap: 8rpx; flex-shrink: 0; }
.sd-range-text { font-size: 22rpx; color: var(--text-soft); }

.hg-grid {
  margin-top: 24rpx;
  display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16rpx;
}
.hg-cell { border-radius: 20rpx; padding: 20rpx; }
.hg-cell-line { border: 1rpx solid var(--line); }
.hg-label { display: block; font-size: 22rpx; color: var(--text-soft); }
.hg-name { display: block; margin-top: 4rpx; font-size: 28rpx; font-weight: 700; }

.rel { margin-top: 16rpx; border-radius: 16rpx; padding: 16rpx 24rpx; }
.rel-good { background: rgba(82, 196, 26, 0.12); .rel-text { color: #3f9714; } }
.rel-bad { background: rgba(196, 30, 58, 0.1); .rel-text { color: var(--brand); } }
.rel-flat { background: var(--surface-sunken); .rel-text { color: var(--text); } }
.rel-text { font-size: 24rpx; font-weight: 500; line-height: 1.6; }

.rows { margin-top: 24rpx; display: flex; flex-direction: column; gap: 20rpx; }
.row { display: flex; align-items: flex-start; gap: 16rpx; }
.row-tag {
  flex-shrink: 0; margin-top: 2rpx;
  border-radius: 8rpx; background: var(--muted);
  padding: 4rpx 12rpx;
}
.row-tag-text { font-size: 20rpx; font-weight: 700; color: var(--text-soft); }
.row-text { flex: 1; font-size: 24rpx; line-height: 1.7; color: var(--text-ink); }

/* ── 应季药膳 ── */
.diets { margin-top: 24rpx; }
.diets-hdr { display: flex; align-items: center; gap: 12rpx; margin-bottom: 12rpx; }
.diets-title { font-size: 24rpx; font-weight: 700; color: var(--text-ink); }
.diet {
  display: flex; align-items: flex-start; gap: 16rpx;
  border-radius: 16rpx; background: var(--surface-sunken);
  padding: 16rpx 24rpx;
  & + & { margin-top: 12rpx; }
}
.diet-dot {
  width: 12rpx; height: 12rpx; border-radius: 50%;
  background: var(--brand); flex-shrink: 0; margin-top: 14rpx;
}
.diet-main { flex: 1; min-width: 0; }
.diet-name { display: block; font-size: 24rpx; font-weight: 700; color: var(--text-ink); }
.diet-desc { display: block; margin-top: 4rpx; font-size: 22rpx; line-height: 1.7; color: var(--text-soft); }

/* ── 上/下气步切换 ── */
.step-nav { margin-top: 24rpx; display: flex; align-items: center; justify-content: space-between; }
.step-btn {
  display: flex; align-items: center; gap: 8rpx;
  border-radius: 999rpx; border: 1rpx solid var(--line);
  background: var(--card); padding: 12rpx 24rpx;
  &:active { background: rgba(0, 0, 0, 0.03); }
}
.step-btn-text { font-size: 24rpx; font-weight: 500; color: var(--text-ink); }

/* ── 总述 / 体质适配 ── */
.sum-hdr { display: flex; align-items: center; gap: 12rpx; }
.sum-title {
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
  font-size: 30rpx; font-weight: 700; color: var(--text-ink);
}
.sum-text { display: block; margin-top: 16rpx; font-size: 24rpx; line-height: 1.8; color: var(--text); }

.cons-note { display: block; margin-top: 8rpx; font-size: 22rpx; color: var(--text-soft); }
.cons-chips { margin-top: 20rpx; display: flex; flex-wrap: wrap; gap: 12rpx; }
.cons-chip {
  border-radius: 999rpx; border: 1rpx solid var(--line);
  padding: 8rpx 24rpx;
  &:active { opacity: 0.8; }
}
.cons-chip-active { border-color: var(--brand); background: var(--brand-soft); }
.cons-chip-text { font-size: 24rpx; font-weight: 500; color: var(--text-soft); }
.cons-chip-text-active { color: var(--brand); }

.cons-body { margin-top: 24rpx; }
.cons-summary { display: block; font-size: 26rpx; font-weight: 700; line-height: 1.6; color: var(--text-ink); }
.cons-traits { margin-top: 12rpx; display: flex; flex-wrap: wrap; gap: 10rpx; }
.cons-trait { border-radius: 8rpx; background: var(--surface-sunken); padding: 4rpx 14rpx; }
.cons-trait-text { font-size: 22rpx; color: var(--text); }
.cons-caution {
  margin-top: 16rpx; border-radius: 16rpx;
  border: 1rpx solid rgba(250, 140, 22, 0.4);
  background: rgba(250, 140, 22, 0.08);
  padding: 16rpx 24rpx;
}
.cons-caution-text { font-size: 22rpx; line-height: 1.7; color: #b45309; }
.cons-rows { margin-top: 20rpx; }

/* ── 研习与调养 ── */
.rec-list { display: flex; flex-direction: column; gap: 16rpx; }
.rec-card {
  display: flex; align-items: center; gap: 24rpx;
  border-radius: 20rpx; border: 1rpx solid var(--line);
  background: var(--card); padding: 24rpx;
  &:active { border-color: rgba(196, 30, 58, 0.4); }
}
.rec-icon {
  width: 88rpx; height: 88rpx; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  border-radius: 16rpx; background: var(--brand-soft);
}
.rec-main { flex: 1; min-width: 0; }
.rec-title-row { display: flex; align-items: center; gap: 12rpx; }
.rec-tag { flex-shrink: 0; border-radius: 8rpx; background: var(--secondary); padding: 2rpx 12rpx; }
.rec-tag-text { font-size: 20rpx; font-weight: 700; color: var(--text); }
.rec-title {
  font-size: 26rpx; font-weight: 700; color: var(--text-ink);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.rec-desc {
  display: block; margin-top: 4rpx;
  font-size: 22rpx; color: var(--text-soft);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.rec-price { flex-shrink: 0; font-size: 26rpx; font-weight: 700; color: var(--brand); }
</style>
