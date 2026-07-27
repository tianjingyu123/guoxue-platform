<script setup lang="ts">
/**
 * 案例详情 · 练手（先断 → 公布答案 → 逐维度对照）
 *
 * 🔴 答案 = 真实人生经历（六维度 + 大事年表）。断语只是参考。
 *    答案在后端只有一个出口（reveal），详情接口根本不下发 —— 所以这里也别想提前拿到。
 *
 * 断中几项由用户自己判：命理没有机器裁决对错的余地，平台不做这个判官。
 */
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import ToolHeader from '@/components/paipan/tool-header.vue'
import PaperCard from '@/components/paipan/paper-card.vue'
import SectionTitle from '@/components/paipan/section-title.vue'
import Disclaimer from '@/components/compliance/disclaimer.vue'
import { navigateTo } from '@/utils/router'
import {
  caseApi,
  LIFE_DIMENSIONS,
  SOURCE_LABEL,
  type BaziCaseItem,
  type CaseAnswer,
  type CaseMethod,
  type LifeKey,
} from '@/pkg-paipan/lib/case-data'

const id = ref('')
const loading = ref(true)
const failed = ref(false)
const c = ref<BaziCaseItem | null>(null)
const requestedMethod = ref<CaseMethod>('BAZI')
const activeMethod = ref<Exclude<CaseMethod, 'ALL'>>('BAZI')
const availableMethods = computed<Exclude<CaseMethod, 'ALL'>[]>(() => c.value?.availableMethods ?? ['BAZI', 'MINGLI'])

/** 我的断语（六维度） */
const guess = ref<Record<string, string>>({})
const saving = ref(false)
const revealing = ref(false)

/** 答案（只有 reveal 之后才有） */
const answer = ref<CaseAnswer | null>(null)
const revealed = computed(() => !!answer.value)

const selfScore = ref<number | null>(null)

const guessedCount = computed(() => LIFE_DIMENSIONS.filter((d) => (guess.value[d.key] || '').trim()).length)

onLoad(async (q: Record<string, string> = {}) => {
  id.value = q.id || ''
  const method = String(q.method || 'BAZI').toUpperCase() as CaseMethod
  requestedMethod.value = ['BAZI', 'ZIWEI', 'MINGLI'].includes(method) ? method : 'BAZI'
  if (!id.value) {
    failed.value = true
    loading.value = false
    return
  }
  await load()
})

async function load() {
  loading.value = true
  failed.value = false
  try {
    c.value = await caseApi.detail(id.value)
    activeMethod.value = availableMethods.value.includes(requestedMethod.value as any)
      ? requestedMethod.value as Exclude<CaseMethod, 'ALL'>
      : 'BAZI'
    // 登录用户：拉我的练手状态（已公布过答案的，直接回显答案）
    try {
      const mine = await caseApi.myAttempt(id.value)
      guess.value = { ...(mine?.guess ?? {}) }
      selfScore.value = mine?.selfScore ?? null
      if (mine?.revealed && mine.life) {
        answer.value = {
          life: mine.life as CaseAnswer['life'],
          events: (mine.events as CaseAnswer['events']) ?? [],
          commentary: mine.commentary,
          commentarySrc: mine.commentarySrc,
          myGuess: mine.guess as CaseAnswer['myGuess'],
        }
      }
    } catch {
      // 未登录：能看八字，不能练手（点公布答案时会走登录）
    }
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
}

async function saveGuess() {
  if (saving.value) return
  saving.value = true
  try {
    await caseApi.saveGuess(id.value, guess.value)
    uni.showToast({ title: '断语已存', icon: 'none' })
  } catch (e: any) {
    uni.showToast({ title: e?.message || '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

function confirmReveal() {
  const n = guessedCount.value
  uni.showModal({
    title: '公布答案',
    content:
      n === 0
        ? '你还没写任何断语。直接看答案也可以，但练手的价值在于先断后看 —— 确定现在就看？'
        : `你断了 ${n} 项。公布后断语将锁定，不能再改。确定？`,
    confirmText: '公布答案',
    success: (r) => {
      if (r.confirm) doReveal()
    },
  })
}

async function doReveal() {
  if (revealing.value) return
  revealing.value = true
  try {
    // 先把断语落库，再公布 —— 否则用户填了没点保存，断语就丢了
    if (guessedCount.value > 0) await caseApi.saveGuess(id.value, guess.value)
    answer.value = await caseApi.reveal(id.value)
  } catch (e: any) {
    uni.showModal({ title: '未能公布答案', content: e?.message || '请稍后再试', showCancel: false })
  } finally {
    revealing.value = false
  }
}

async function setScore(n: number) {
  selfScore.value = n
  try {
    await caseApi.selfScore(id.value, n)
  } catch {
    // 自评存不上不影响看答案
  }
}

/** 用当前术式重新起这份真实档案；不同视角共享同一案例答案。 */
function goPaipan() {
  if (!c.value) return
  const b = c.value
  if (!b.birthYear || !b.birthMonth || !b.birthDay || b.birthHour === null) {
    uni.showToast({ title: '该案例未留完整生辰', icon: 'none' })
    return
  }
  if (activeMethod.value === 'ZIWEI') {
    const payload = encodeURIComponent(JSON.stringify({
      name: b.title, gender: b.gender === 'female' ? '女' : '男',
      y: b.birthYear, m: b.birthMonth, d: b.birthDay, hour: b.birthHour, minute: 0,
    }))
    navigateTo(`/pkg-paipan/ziwei/result?payload=${payload}`)
    return
  }
  if (activeMethod.value === 'MINGLI') {
    const payload = encodeURIComponent(JSON.stringify({
      name: b.title, gender: b.gender, year: b.birthYear, month: b.birthMonth,
      day: b.birthDay, hour: b.birthHour, minute: 0, trueSolar: false, earlyZi: false,
    }))
    navigateTo(`/pkg-paipan/yinpan-mingli/result?payload=${payload}`)
    return
  }
  navigateTo(`/paipan/bazi/result?gender=${b.gender === 'female' ? '女' : '男'}&year=${b.birthYear}&month=${b.birthMonth}&day=${b.birthDay}&hour=${b.birthHour}&minute=0`)
}

function methodLabel(method: string) {
  return method === 'ZIWEI' ? '紫微视角' : method === 'MINGLI' ? '命理研习' : '八字视角'
}

function labelOf(k: string) {
  return LIFE_DIMENSIONS.find((d) => d.key === k)?.label ?? k
}
</script>

<template>
  <view class="cd">
    <ToolHeader title="案例练手" subtitle="先断 · 后看真实经历" />

    <scroll-view class="cd-body" scroll-y :show-scrollbar="false">
      <view v-if="loading" class="cd-skeleton" />

      <PaperCard v-else-if="failed || !c" padding="lg">
        <view class="cd-empty" @tap="load">
          <text class="cd-empty-txt">案例加载失败，点击重试</text>
        </view>
      </PaperCard>

      <template v-else>
        <!-- 盘面 -->
        <PaperCard padding="lg">
          <view class="cd-head">
            <text class="cd-title">{{ c.title }}</text>
            <text v-if="c.isPremium" class="cd-premium">精品</text>
            <text class="cd-src">{{ SOURCE_LABEL[c.source] || c.source }}</text>
          </view>
          <text class="cd-meta">
            {{ c.gender === 'female' ? '女命' : '男命' }}{{ c.era ? ` · ${c.era}` : '' }} · {{ c.attemptCount }} 人练过
          </text>

          <view class="cd-methods">
            <view v-for="item in availableMethods" :key="item" class="cd-method" :class="{ 'cd-method--on': activeMethod === item }" @tap="activeMethod = item">
              <text class="cd-method-txt" :class="{ 'cd-method-txt--on': activeMethod === item }">{{ methodLabel(item) }}</text>
            </view>
          </view>

          <view v-if="activeMethod !== 'ZIWEI'" class="cd-pillars">
            <view v-for="p in [
              { k: '年', v: c.yearPillar },
              { k: '月', v: c.monthPillar },
              { k: '日', v: c.dayPillar },
              { k: '时', v: c.hourPillar },
            ]" :key="p.k" class="cd-pillar" :class="{ 'cd-pillar--day': p.k === '日' }">
              <text class="cd-pillar-k" :class="{ 'cd-pillar-k--day': p.k === '日' }">{{ p.k }}</text>
              <text class="cd-pillar-v" :class="{ 'cd-pillar-v--day': p.k === '日' }">{{ p.v }}</text>
            </view>
          </view>

          <view v-if="activeMethod === 'ZIWEI'" class="cd-ziwei-note">
            <text class="cd-ziwei-title">十二宫视角已就绪</text>
            <text class="cd-ziwei-copy">以同一出生资料重起紫微盘，再与下方真实人生经历交叉印证。</text>
          </view>

          <view v-if="c.birthYear" class="cd-go" @tap="goPaipan">
            <AppIcon name="compass" :size="16" color="#C41E3A" />
            <text class="cd-go-txt">用{{ methodLabel(activeMethod) }}起这一盘</text>
          </view>
        </PaperCard>

        <!-- ① 先断 -->
        <PaperCard v-if="!revealed" padding="lg">
          <SectionTitle title="你的判断" subtitle="逐项写下你断的，写不出的可留空" />
          <view class="cd-dims">
            <view v-for="d in LIFE_DIMENSIONS" :key="d.key" class="cd-dim">
              <view class="cd-dim-head">
                <text class="cd-dim-label">{{ d.label }}</text>
                <text class="cd-dim-hint">{{ d.hint }}</text>
              </view>
              <textarea
                v-model="guess[d.key as LifeKey]"
                class="cd-dim-input"
                :placeholder="`你断此人的${d.label}…`"
                placeholder-class="cd-ph"
                :maxlength="500"
                auto-height
              />
            </view>
          </view>

          <view class="cd-actions">
            <view class="cd-btn cd-btn--ghost" @tap="saveGuess">
              <text class="cd-btn-txt cd-btn-txt--ghost">{{ saving ? '保存中…' : '先存草稿' }}</text>
            </view>
            <view class="cd-btn cd-btn--primary" @tap="confirmReveal">
              <AppIcon name="eye" :size="18" color="#fff" />
              <text class="cd-btn-txt cd-btn-txt--primary">{{ revealing ? '公布中…' : '公布答案' }}</text>
            </view>
          </view>
          <text class="cd-tip">公布后断语锁定，不能再改 —— 看过答案再改断语，练手就没意义了</text>
        </PaperCard>

        <!-- ② 答案：真实人生经历 -->
        <template v-else>
          <PaperCard gold padding="lg">
            <SectionTitle title="真实人生经历" subtitle="这才是答案" />

            <view class="cd-answer">
              <view
                v-for="d in LIFE_DIMENSIONS"
                :key="d.key"
                class="cd-cmp"
              >
                <text class="cd-cmp-label">{{ d.label }}</text>

                <view class="cd-cmp-row">
                  <text class="cd-cmp-tag cd-cmp-tag--mine">我断</text>
                  <text class="cd-cmp-txt cd-cmp-txt--mine">{{ (answer?.myGuess?.[d.key as LifeKey] || guess[d.key]) || '—（未断）' }}</text>
                </view>
                <view class="cd-cmp-row">
                  <text class="cd-cmp-tag cd-cmp-tag--real">实况</text>
                  <text class="cd-cmp-txt cd-cmp-txt--real">{{ answer?.life?.[d.key as LifeKey] || '—（该案例未载）' }}</text>
                </view>
              </view>
            </view>
          </PaperCard>

          <!-- 大事年表：验应期的硬标准 -->
          <PaperCard v-if="answer?.events?.length" padding="lg">
            <SectionTitle title="大事年表" subtitle="应期对不对，看这里" />
            <view class="cd-events">
              <view v-for="(e, i) in answer.events" :key="i" class="cd-event">
                <view class="cd-event-year">
                  <text class="cd-event-y">{{ e.year }}</text>
                  <text v-if="e.ganzhi" class="cd-event-gz">{{ e.ganzhi }}</text>
                </view>
                <view class="cd-event-dot" />
                <text class="cd-event-txt">{{ e.event }}</text>
              </view>
            </view>
          </PaperCard>

          <!-- 断语：明确标注只是参考 -->
          <PaperCard v-if="answer?.commentary" padding="lg">
            <SectionTitle title="前人断语" subtitle="仅供参考 · 不是答案" />
            <text class="cd-commentary">{{ answer.commentary }}</text>
            <text v-if="answer.commentarySrc" class="cd-commentary-src">—— {{ answer.commentarySrc }}</text>
          </PaperCard>

          <!-- 自评 -->
          <PaperCard padding="lg">
            <SectionTitle title="自评" subtitle="六项里你断中了几项？由你自己判" />
            <view class="cd-scores">
              <view
                v-for="n in [0, 1, 2, 3, 4, 5, 6]"
                :key="n"
                class="cd-score"
                :class="{ 'cd-score--on': selfScore === n }"
                @tap="setScore(n)"
              >
                <text class="cd-score-txt" :class="{ 'cd-score-txt--on': selfScore === n }">{{ n }}</text>
              </view>
            </view>
            <text class="cd-tip">命理没有机器裁决对错的余地，平台不做这个判官 —— 断得准不准，你心里有数。</text>
          </PaperCard>
        </template>

        <view class="cd-disc">
          <Disclaimer variant="fortune" tone="card" />
        </view>
      </template>

      <view class="cd-space" />
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.cd {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f7f3ec;
}
.cd-body {
  flex: 1;
  min-height: 0;
  padding: 24rpx;
  box-sizing: border-box;
}
.cd-body > * {
  margin-bottom: 24rpx;
}

/* 头 */
.cd-head {
  display: flex;
  align-items: center;
  gap: 10rpx;
}
.cd-title {
  flex: 1;
  font-size: 32rpx;
  font-weight: 700;
  color: #3a2a1e;
}
.cd-premium {
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  background: #d4af37;
  color: #fff;
  font-size: 18rpx;
}
.cd-src {
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  background: rgba(154, 140, 126, 0.12);
  color: #7a6c5e;
  font-size: 18rpx;
}
.cd-meta {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #9a8c7e;
}

.cd-methods { display: flex; gap: 10rpx; margin-top: 20rpx; padding: 8rpx; border-radius: 999rpx; background: #f3ede4; }
.cd-method { flex: 1; min-width: 0; height: 58rpx; display: flex; align-items: center; justify-content: center; border-radius: 999rpx; }
.cd-method--on { background: #fff; box-shadow: 0 6rpx 16rpx rgba(58, 42, 30, 0.08); }
.cd-method-txt { font-size: 22rpx; color: #9a8c7e; }
.cd-method-txt--on { color: #c41e3a; font-weight: 700; }
.cd-ziwei-note { margin-top: 20rpx; padding: 22rpx; border-radius: 14rpx; background: linear-gradient(135deg, #edf4ff, #f5eeff); border: 1rpx solid rgba(82, 111, 190, 0.18); }
.cd-ziwei-title { display: block; font-size: 27rpx; font-weight: 700; color: #374c79; }
.cd-ziwei-copy { display: block; margin-top: 8rpx; font-size: 22rpx; line-height: 1.6; color: #7180a1; }
/* 四柱 */
.cd-pillars {
  display: flex;
  gap: 14rpx;
  margin-top: 24rpx;
}
.cd-pillar {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
  padding: 18rpx 0;
  border-radius: 10rpx;
  background: #fdfaf4;
  border: 1rpx solid rgba(58, 42, 30, 0.08);
}
.cd-pillar--day {
  border-color: rgba(196, 30, 58, 0.35);
  background: rgba(196, 30, 58, 0.05);
}
.cd-pillar-k {
  font-size: 20rpx;
  color: #b8aa9a;
}
.cd-pillar-k--day {
  color: #c41e3a;
}
.cd-pillar-v {
  font-size: 30rpx;
  font-weight: 700;
  color: #3a2a1e;
}
.cd-pillar-v--day {
  color: #c41e3a;
}

.cd-go {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  margin-top: 20rpx;
  height: 72rpx;
  border-radius: 36rpx;
  border: 1rpx solid rgba(196, 30, 58, 0.3);
}
.cd-go-txt {
  font-size: 25rpx;
  color: #c41e3a;
  font-weight: 600;
}

/* 断 */
.cd-dims {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  margin-top: 24rpx;
}
.cd-dim-head {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
}
.cd-dim-label {
  font-size: 27rpx;
  font-weight: 700;
  color: #3a2a1e;
}
.cd-dim-hint {
  font-size: 20rpx;
  color: #b8aa9a;
}
.cd-dim-input {
  width: 100%;
  min-height: 96rpx;
  margin-top: 10rpx;
  padding: 16rpx;
  box-sizing: border-box;
  border-radius: 10rpx;
  background: #fdfaf4;
  border: 1rpx solid rgba(58, 42, 30, 0.1);
  font-size: 26rpx;
  line-height: 1.6;
  color: #3a2a1e;
}
.cd-ph {
  color: #c4b8a8;
}

.cd-actions {
  display: flex;
  gap: 16rpx;
  margin-top: 32rpx;
}
.cd-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  height: 92rpx;
  border-radius: 46rpx;
}
.cd-btn--primary {
  background: #c41e3a;
}
.cd-btn--ghost {
  border: 1rpx solid rgba(196, 30, 58, 0.4);
}
.cd-btn-txt {
  font-size: 28rpx;
  font-weight: 600;
}
.cd-btn-txt--primary {
  color: #fff;
}
.cd-btn-txt--ghost {
  color: #c41e3a;
}
.cd-tip {
  display: block;
  margin-top: 16rpx;
  font-size: 21rpx;
  line-height: 1.6;
  color: #b8aa9a;
}

/* 答案对照 */
.cd-answer {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  margin-top: 24rpx;
}
.cd-cmp {
  padding-bottom: 20rpx;
  border-bottom: 1rpx dashed rgba(58, 42, 30, 0.1);
}
.cd-cmp-label {
  display: block;
  font-size: 27rpx;
  font-weight: 700;
  color: #3a2a1e;
  margin-bottom: 12rpx;
}
.cd-cmp-row {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  margin-top: 8rpx;
}
.cd-cmp-tag {
  flex-shrink: 0;
  padding: 3rpx 12rpx;
  border-radius: 6rpx;
  font-size: 19rpx;
}
.cd-cmp-tag--mine {
  background: rgba(154, 140, 126, 0.15);
  color: #7a6c5e;
}
.cd-cmp-tag--real {
  background: rgba(196, 30, 58, 0.1);
  color: #c41e3a;
}
.cd-cmp-txt {
  flex: 1;
  font-size: 25rpx;
  line-height: 1.7;
}
.cd-cmp-txt--mine {
  color: #9a8c7e;
}
.cd-cmp-txt--real {
  color: #3a2a1e;
  font-weight: 500;
}

/* 大事年表 */
.cd-events {
  margin-top: 24rpx;
}
.cd-event {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  padding-bottom: 24rpx;
}
.cd-event-year {
  width: 110rpx;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}
.cd-event-y {
  font-size: 27rpx;
  font-weight: 700;
  color: #c41e3a;
}
.cd-event-gz {
  font-size: 19rpx;
  color: #b8aa9a;
}
.cd-event-dot {
  width: 14rpx;
  height: 14rpx;
  margin-top: 8rpx;
  border-radius: 50%;
  background: #d4af37;
  flex-shrink: 0;
}
.cd-event-txt {
  flex: 1;
  font-size: 26rpx;
  line-height: 1.7;
  color: #3a2a1e;
}

/* 断语 */
.cd-commentary {
  display: block;
  margin-top: 20rpx;
  font-size: 26rpx;
  line-height: 1.9;
  color: #7a6c5e;
}
.cd-commentary-src {
  display: block;
  margin-top: 12rpx;
  text-align: right;
  font-size: 22rpx;
  color: #b8aa9a;
}

/* 自评 */
.cd-scores {
  display: flex;
  gap: 12rpx;
  margin-top: 24rpx;
}
.cd-score {
  flex: 1;
  height: 76rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10rpx;
  background: rgba(154, 140, 126, 0.1);
}
.cd-score--on {
  background: #c41e3a;
}
.cd-score-txt {
  font-size: 27rpx;
  color: #7a6c5e;
}
.cd-score-txt--on {
  color: #fff;
  font-weight: 700;
}

.cd-skeleton {
  height: 500rpx;
  border-radius: 14rpx;
  background: rgba(154, 140, 126, 0.08);
}
.cd-empty {
  padding: 56rpx 24rpx;
  text-align: center;
}
.cd-empty-txt {
  font-size: 26rpx;
  color: #c41e3a;
}
.cd-disc {
  margin-top: 8rpx;
}
.cd-space {
  height: 40rpx;
}
</style>
