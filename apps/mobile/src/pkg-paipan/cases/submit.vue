<script setup lang="ts">
/**
 * 投稿案例
 *
 * 🔴 案例的价值在于**真实人生经历**（尤其大事年表 —— 能验应期）。
 *    所以这里引导用户填经历，而不是填「大师断语」。
 *
 * 合规：真人经历是敏感信息，投稿的往往还是别人的八字。
 *   授权勾选是硬门槛（后端也会拒收未授权的），姓名一律不收（后端强制匿名）。
 */
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import ToolHeader from '@/components/paipan/tool-header.vue'
import PaperCard from '@/components/paipan/paper-card.vue'
import SectionTitle from '@/components/paipan/section-title.vue'
import { navigateBack } from '@/utils/router'
import { caseApi, LIFE_DIMENSIONS, type CaseRewardPlan, type LifeEvent } from '@/pkg-paipan/lib/case-data'
import { computeBazi } from '@/pkg-paipan/lib/bazi-engine'

const GANS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const ZHIS = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

const submitting = ref(false)

/** 录入方式：填生辰自动起四柱（推荐，不易错）／直接填四柱（古籍案例常常只有四柱） */
const mode = ref<'birth' | 'pillars'>('birth')

const gender = ref<'male' | 'female'>('male')
const title = ref('')
const era = ref('')

// 生辰
const birth = ref({ year: 1990, month: 1, day: 1, hour: 0 })
const CURRENT_YEAR = new Date().getFullYear()
const BIRTH_YEARS = Array.from({ length: CURRENT_YEAR - 1900 + 1 }, (_, index) => 1900 + index)
const BIRTH_MONTHS = Array.from({ length: 12 }, (_, index) => index + 1)
const BIRTH_HOURS = Array.from({ length: 24 }, (_, index) => index)

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

function birthToPickerValue() {
  const yearIndex = Math.max(0, BIRTH_YEARS.indexOf(birth.value.year))
  return [
    yearIndex,
    Math.max(0, Math.min(11, birth.value.month - 1)),
    Math.max(0, birth.value.day - 1),
    Math.max(0, Math.min(23, birth.value.hour)),
  ]
}

/** 多列滚轮的临时位置；取消选择时恢复到已确认的生辰。 */
const birthPickerValue = ref(birthToPickerValue())
const birthPickerRange = computed(() => {
  const year = BIRTH_YEARS[birthPickerValue.value[0]] ?? birth.value.year
  const month = BIRTH_MONTHS[birthPickerValue.value[1]] ?? birth.value.month
  const days = Array.from({ length: daysInMonth(year, month) }, (_, index) => index + 1)
  return [
    BIRTH_YEARS.map((item) => `${item}年`),
    BIRTH_MONTHS.map((item) => `${item}月`),
    days.map((item) => `${item}日`),
    BIRTH_HOURS.map((item) => `${String(item).padStart(2, '0')}时`),
  ]
})
const birthDisplay = computed(() => {
  const { year, month, day, hour } = birth.value
  return `${year}年${String(month).padStart(2, '0')}月${String(day).padStart(2, '0')}日 ${String(hour).padStart(2, '0')}:00`
})

function onBirthPickerColumnChange(event: any) {
  const next = [...birthPickerValue.value]
  next[Number(event.detail.column)] = Number(event.detail.value)

  const year = BIRTH_YEARS[next[0]] ?? birth.value.year
  const month = BIRTH_MONTHS[next[1]] ?? birth.value.month
  const maxDayIndex = daysInMonth(year, month) - 1
  next[2] = Math.min(next[2], maxDayIndex)
  birthPickerValue.value = next
}

function onBirthPickerChange(event: any) {
  const value = (event.detail.value as number[]).map(Number)
  const year = BIRTH_YEARS[value[0]] ?? birth.value.year
  const month = BIRTH_MONTHS[value[1]] ?? birth.value.month
  const day = Math.min((value[2] ?? 0) + 1, daysInMonth(year, month))
  const hour = BIRTH_HOURS[value[3]] ?? birth.value.hour

  birth.value = { year, month, day, hour }
  birthPickerValue.value = birthToPickerValue()
}

function resetBirthPicker() {
  birthPickerValue.value = birthToPickerValue()
}
// 四柱（直接填）
const pillars = ref({ year: '', month: '', day: '', hour: '' })

const life = ref<Record<string, string>>({})
const events = ref<LifeEvent[]>([])
const commentary = ref('')
const consent = ref(false)

/** 由生辰真算四柱（与排盘同一个引擎，不另造口径） */
const computed4 = computed(() => {
  if (mode.value !== 'birth') return null
  try {
    const r: any = computeBazi({
      year: birth.value.year,
      month: birth.value.month,
      day: birth.value.day,
      hour: birth.value.hour,
      minute: 0,
      gender: gender.value === 'female' ? '女' : '男',
    } as any)
    const sz = r?.siZhu ?? r?.sizhu
    if (!sz) return null
    return {
      year: `${sz.year.gan}${sz.year.zhi}`,
      month: `${sz.month.gan}${sz.month.zhi}`,
      day: `${sz.day.gan}${sz.day.zhi}`,
      hour: `${sz.hour.gan}${sz.hour.zhi}`,
    }
  } catch {
    return null
  }
})

const finalPillars = computed(() => (mode.value === 'birth' ? computed4.value : pillars.value))

/** 质量预估（与后端 scoreQuality 同口径：年表最值钱） */
const quality = computed(() => {
  const dims = LIFE_DIMENSIONS.filter((d) => (life.value[d.key] || '').trim()).length
  const evs = events.value.filter((e) => e.year && e.event.trim()).length
  let s = Math.min(dims, 6) * 8 + Math.min(evs, 5) * 8
  if (evs > 0 && dims >= 3) s += 12
  return Math.max(0, Math.min(100, s))
})
const tier = computed(() => (quality.value >= 80 ? '精品档' : quality.value >= 50 ? '良好档' : '基础档'))
const rewardPlan = ref<CaseRewardPlan | null>(null)
const reward = computed<number | null>(() => {
  if (!rewardPlan.value?.enabled) return null
  const ordered = [...rewardPlan.value.tiers].sort((a, b) => b.minQuality - a.minQuality)
  return ordered.find((item) => quality.value >= item.minQuality)?.amount ?? null
})

onMounted(async () => {
  try {
    rewardPlan.value = await caseApi.rewardPlan()
  } catch {
    rewardPlan.value = {
      enabled: false,
      tiers: [],
      note: '奖励方案暂时无法确认，当前页面不承诺国学币奖励',
    }
  }
})

const rewardHint = computed(() => reward.value == null
  ? (rewardPlan.value?.note || '奖励方案读取中，最终以审核通过时的平台配置为准')
  : `当前方案约 ${reward.value} 国学币，最终以审核通过时的平台配置为准。`,
)

const canSubmit = computed(() => {
  const p = finalPillars.value
  return (
    !!title.value.trim() &&
    !!p?.year && !!p?.month && !!p?.day && !!p?.hour &&
    consent.value &&
    (Object.values(life.value).some((v) => v?.trim()) || events.value.some((e) => e.event?.trim()))
  )
})

function addEvent() {
  events.value.push({ year: new Date().getFullYear(), event: '' })
}
function removeEvent(i: number) {
  events.value.splice(i, 1)
}

function onGan(which: 'year' | 'month' | 'day' | 'hour', e: any) {
  const g = GANS[e.detail.value]
  const cur = pillars.value[which]
  pillars.value[which] = g + (cur.slice(1) || '')
}
function onZhi(which: 'year' | 'month' | 'day' | 'hour', e: any) {
  const z = ZHIS[e.detail.value]
  const cur = pillars.value[which]
  pillars.value[which] = (cur.slice(0, 1) || '') + z
}

async function submit() {
  if (!canSubmit.value || submitting.value) return
  const p = finalPillars.value!
  submitting.value = true
  try {
    const res = await caseApi.submit({
      gender: gender.value,
      yearPillar: p.year,
      monthPillar: p.month,
      dayPillar: p.day,
      hourPillar: p.hour,
      ...(mode.value === 'birth'
        ? { birthYear: birth.value.year, birthMonth: birth.value.month, birthDay: birth.value.day, birthHour: birth.value.hour }
        : {}),
      title: title.value.trim(),
      era: era.value.trim() || undefined,
      life: life.value,
      events: events.value.filter((e) => e.year && e.event.trim()),
      commentary: commentary.value.trim() || undefined,
      consent: true,
    })
    uni.showModal({
      title: '投稿已提交',
      content: `质量评级：${res.quality >= 80 ? '精品档' : res.quality >= 50 ? '良好档' : '基础档'}。\n平台将核验内容与授权信息，可在「我的投稿」查看进度。`,
      showCancel: false,
      success: () => navigateBack(),
    })
  } catch (e: any) {
    uni.showModal({ title: '投稿未成功', content: e?.message || '请稍后再试', showCancel: false })
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <view class="sb">
    <ToolHeader title="投稿案例" subtitle="真实经历 · 匿名收录" />

    <scroll-view class="sb-body" scroll-y :show-scrollbar="false">
      <!-- 收什么 -->
      <PaperCard padding="lg">
        <view class="sb-intro">
          <AppIcon name="lightbulb" :size="20" color="#C41E3A" />
          <view class="sb-intro-body">
            <text class="sb-intro-txt">案例库要的是这个八字的<text class="sb-em">真实人生经历</text> —— 尤其是哪一年发生了什么（能验应期）。断语和思路只是参考，不是答案。</text>
            <text class="sb-intro-sub">不收姓名、住址、联系方式。投稿一律匿名收录。</text>
          </view>
        </view>
      </PaperCard>

      <!-- 八字 -->
      <PaperCard padding="lg">
        <SectionTitle title="八字" subtitle="填生辰自动起盘，或直接填四柱" />

        <view class="sb-mode">
          <view class="sb-mode-item" :class="{ 'sb-mode-item--on': mode === 'birth' }" @tap="mode = 'birth'">
            <text class="sb-mode-txt" :class="{ 'sb-mode-txt--on': mode === 'birth' }">填生辰</text>
          </view>
          <view class="sb-mode-item" :class="{ 'sb-mode-item--on': mode === 'pillars' }" @tap="mode = 'pillars'">
            <text class="sb-mode-txt" :class="{ 'sb-mode-txt--on': mode === 'pillars' }">直接填四柱</text>
          </view>
        </view>

        <view class="sb-row">
          <text class="sb-label">性别</text>
          <view class="sb-genders">
            <view class="sb-gender" :class="{ 'sb-gender--on': gender === 'male' }" @tap="gender = 'male'">
              <text class="sb-gender-txt" :class="{ 'sb-gender-txt--on': gender === 'male' }">男</text>
            </view>
            <view class="sb-gender" :class="{ 'sb-gender--on': gender === 'female' }" @tap="gender = 'female'">
              <text class="sb-gender-txt" :class="{ 'sb-gender-txt--on': gender === 'female' }">女</text>
            </view>
          </view>
        </view>

        <!-- 填生辰 -->
        <template v-if="mode === 'birth'">
          <picker
            mode="multiSelector"
            :range="birthPickerRange"
            :value="birthPickerValue"
            @columnchange="onBirthPickerColumnChange"
            @change="onBirthPickerChange"
            @cancel="resetBirthPicker"
          >
            <view class="sb-birth-picker">
              <view class="sb-birth-icon">
                <AppIcon name="calendar" :size="24" color="#C41E3A" />
              </view>
              <view class="sb-birth-copy">
                <text class="sb-birth-label">公历出生时间</text>
                <text class="sb-birth-value">{{ birthDisplay }}</text>
              </view>
              <view class="sb-birth-action">
                <text class="sb-birth-action-txt">滚动选择</text>
                <AppIcon name="chevron-right" :size="20" color="#B8AA9A" />
              </view>
            </view>
          </picker>
          <text class="sb-hint">上下滚动选择年月日时，月底天数会自动校正。四柱仍由全站同一套排盘引擎计算。</text>

          <view v-if="computed4" class="sb-preview">
            <text v-for="(v, k) in computed4" :key="k" class="sb-preview-p">{{ v }}</text>
          </view>
        </template>

        <!-- 直接填四柱 -->
        <template v-else>
          <view v-for="(lab, key) in { year: '年柱', month: '月柱', day: '日柱', hour: '时柱' }" :key="key" class="sb-pillar">
            <text class="sb-label">{{ lab }}</text>
            <view class="sb-pillar-pick">
              <picker
                mode="selector"
                :range="GANS"
                @change="onGan(key as any, $event)"
              >
                <view class="sb-pick">
                  <text class="sb-pick-txt">{{ pillars[key as 'year'].slice(0, 1) || '干' }}</text>
                </view>
              </picker>
              <picker
                mode="selector"
                :range="ZHIS"
                @change="onZhi(key as any, $event)"
              >
                <view class="sb-pick">
                  <text class="sb-pick-txt">{{ pillars[key as 'year'].slice(1) || '支' }}</text>
                </view>
              </picker>
            </view>
          </view>
        </template>
      </PaperCard>

      <!-- 身份 -->
      <PaperCard padding="lg">
        <SectionTitle title="身份（脱敏）" subtitle="不要写真名 —— 写「某商界人士」这样的称呼" />
        <input v-model="title" class="sb-input" placeholder="如：某商界人士 / 某中学教师" placeholder-class="sb-ph" :maxlength="40" />
        <input v-model="era" class="sb-input" placeholder="年代（选填）：如 1970 年代生 / 清代" placeholder-class="sb-ph" :maxlength="20" />
      </PaperCard>

      <!-- 人生经历（答案） -->
      <PaperCard padding="lg">
        <SectionTitle title="真实人生经历" subtitle="这就是答案 · 知道多少写多少" />
        <view class="sb-dims">
          <view v-for="d in LIFE_DIMENSIONS" :key="d.key" class="sb-dim">
            <text class="sb-dim-label">{{ d.label }}</text>
            <textarea
              v-model="life[d.key]"
              class="sb-textarea"
              :placeholder="d.hint"
              placeholder-class="sb-ph"
              :maxlength="500"
              auto-height
            />
          </view>
        </view>
      </PaperCard>

      <!-- 大事年表（最值钱） -->
      <PaperCard padding="lg">
        <SectionTitle title="大事年表" subtitle="哪一年发生了什么 —— 这一项最值钱（能验应期）" />

        <view v-for="(e, i) in events" :key="i" class="sb-event">
          <input v-model.number="e.year" class="sb-event-year" type="number" placeholder="年份" placeholder-class="sb-ph" />
          <input v-model="e.event" class="sb-event-txt" placeholder="发生了什么（如：离异 / 创业失败 / 父故）" placeholder-class="sb-ph" :maxlength="60" />
          <view class="sb-event-del" @tap="removeEvent(i)">
            <AppIcon name="x" :size="16" color="#B8AA9A" />
          </view>
        </view>

        <view class="sb-add" @tap="addEvent">
          <AppIcon name="plus" :size="16" color="#C41E3A" />
          <text class="sb-add-txt">添加一条大事</text>
        </view>
      </PaperCard>

      <!-- 断语（参考） -->
      <PaperCard padding="lg">
        <SectionTitle title="断语 / 思路" subtitle="选填 · 仅供参考，不是答案" />
        <textarea
          v-model="commentary"
          class="sb-textarea"
          placeholder="若有前人断语或你的分析思路，可写在这里"
          placeholder-class="sb-ph"
          :maxlength="1000"
          auto-height
        />
      </PaperCard>

      <!-- 质量预估 -->
      <PaperCard gold padding="lg">
        <view class="sb-quality">
          <view class="sb-quality-left">
            <text class="sb-quality-num">{{ quality }}</text>
            <text class="sb-quality-lab">质量分</text>
          </view>
          <view class="sb-quality-body">
            <text class="sb-quality-tier">{{ tier }}</text>
            <text class="sb-quality-hint">{{ rewardHint }} 补上大事年表能显著提高评级。</text>
          </view>
        </view>
      </PaperCard>

      <!-- 授权（硬门槛） -->
      <PaperCard padding="lg">
        <view class="sb-consent" @tap="consent = !consent">
          <view class="sb-check" :class="{ 'sb-check--on': consent }">
            <AppIcon v-if="consent" name="check" :size="14" color="#fff" />
          </view>
          <text class="sb-consent-txt">
            我确认：所投稿的八字与人生经历<text class="sb-em">为本人，或已获得当事人同意</text>；内容中不含真实姓名、住址、联系方式等可识别个人身份的信息。
          </text>
        </view>
      </PaperCard>

      <view class="sb-btn" :class="{ 'sb-btn--off': !canSubmit }" @tap="submit">
        <text class="sb-btn-txt">{{ submitting ? '提交中…' : '提交投稿' }}</text>
      </view>
      <text class="sb-foot">提交后由平台审核，通过后匿名收录；奖励以审核通过时的平台方案为准</text>

      <view class="sb-space" />
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.sb {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f7f3ec;
}
.sb-body {
  flex: 1;
  min-height: 0;
  padding: 24rpx;
  box-sizing: border-box;
}
.sb-body > * {
  margin-bottom: 24rpx;
}

.sb-intro {
  display: flex;
  gap: 12rpx;
}
.sb-intro-body {
  flex: 1;
}
.sb-intro-txt {
  font-size: 24rpx;
  line-height: 1.7;
  color: #7a6c5e;
}
.sb-intro-sub {
  display: block;
  margin-top: 8rpx;
  font-size: 21rpx;
  color: #b8aa9a;
}
.sb-em {
  color: #c41e3a;
  font-weight: 700;
}

.sb-mode {
  display: flex;
  gap: 12rpx;
  margin-top: 24rpx;
}
.sb-mode-item {
  flex: 1;
  height: 68rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10rpx;
  background: rgba(154, 140, 126, 0.1);
}
.sb-mode-item--on {
  background: rgba(196, 30, 58, 0.1);
}
.sb-mode-txt {
  font-size: 25rpx;
  color: #7a6c5e;
}
.sb-mode-txt--on {
  color: #c41e3a;
  font-weight: 600;
}

.sb-row {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-top: 24rpx;
}
.sb-label {
  width: 90rpx;
  font-size: 26rpx;
  color: #7a6c5e;
}
.sb-genders {
  display: flex;
  gap: 12rpx;
}
.sb-gender {
  padding: 0 40rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  border-radius: 8rpx;
  background: rgba(154, 140, 126, 0.1);
}
.sb-gender--on {
  background: #c41e3a;
}
.sb-gender-txt {
  font-size: 26rpx;
  color: #7a6c5e;
}
.sb-gender-txt--on {
  color: #fff;
  font-weight: 600;
}

.sb-birth-picker {
  display: flex;
  align-items: center;
  min-height: 108rpx;
  margin-top: 20rpx;
  padding: 0 20rpx;
  box-sizing: border-box;
  border-radius: 14rpx;
  background: #fdfaf4;
  border: 1rpx solid rgba(196, 30, 58, 0.16);
}
.sb-birth-picker:active {
  background: rgba(196, 30, 58, 0.04);
}
.sb-birth-icon {
  width: 64rpx;
  height: 64rpx;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(196, 30, 58, 0.08);
}
.sb-birth-copy {
  flex: 1;
  min-width: 0;
  margin-left: 16rpx;
}
.sb-birth-label {
  display: block;
  font-size: 21rpx;
  color: #9b8b7c;
}
.sb-birth-value {
  display: block;
  margin-top: 6rpx;
  font-size: 29rpx;
  font-weight: 700;
  color: #3a2a1e;
  letter-spacing: 0.5rpx;
}
.sb-birth-action {
  display: flex;
  align-items: center;
  gap: 4rpx;
  margin-left: 12rpx;
}
.sb-birth-action-txt {
  font-size: 22rpx;
  color: #c41e3a;
}
.sb-hint {
  display: block;
  margin-top: 10rpx;
  font-size: 21rpx;
  color: #b8aa9a;
}
.sb-preview {
  display: flex;
  gap: 12rpx;
  margin-top: 16rpx;
}
.sb-preview-p {
  flex: 1;
  height: 66rpx;
  line-height: 66rpx;
  text-align: center;
  border-radius: 8rpx;
  background: rgba(196, 30, 58, 0.05);
  border: 1rpx solid rgba(196, 30, 58, 0.2);
  font-size: 26rpx;
  color: #c41e3a;
  font-weight: 700;
}

.sb-pillar {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-top: 20rpx;
}
.sb-pillar-pick {
  flex: 1;
  display: flex;
  gap: 12rpx;
}
.sb-pick {
  width: 120rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8rpx;
  background: #fdfaf4;
  border: 1rpx solid rgba(58, 42, 30, 0.1);
}
.sb-pick-txt {
  font-size: 27rpx;
  color: #3a2a1e;
}

.sb-input {
  width: 100%;
  height: 84rpx;
  box-sizing: border-box;
  margin-top: 16rpx;
  padding: 0 20rpx;
  border-radius: 10rpx;
  background: #fdfaf4;
  border: 1rpx solid rgba(58, 42, 30, 0.1);
  font-size: 26rpx;
  color: #3a2a1e;
}
.sb-ph {
  color: #c4b8a8;
}

.sb-dims {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  margin-top: 24rpx;
}
.sb-dim-label {
  display: block;
  font-size: 26rpx;
  font-weight: 700;
  color: #3a2a1e;
  margin-bottom: 8rpx;
}
.sb-textarea {
  width: 100%;
  min-height: 88rpx;
  box-sizing: border-box;
  padding: 16rpx;
  border-radius: 10rpx;
  background: #fdfaf4;
  border: 1rpx solid rgba(58, 42, 30, 0.1);
  font-size: 25rpx;
  line-height: 1.6;
  color: #3a2a1e;
}

.sb-event {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 16rpx;
}
.sb-event-year {
  width: 140rpx;
  height: 76rpx;
  box-sizing: border-box;
  padding: 0 14rpx;
  border-radius: 8rpx;
  background: #fdfaf4;
  border: 1rpx solid rgba(58, 42, 30, 0.1);
  font-size: 25rpx;
  color: #c41e3a;
  font-weight: 700;
}
.sb-event-txt {
  flex: 1;
  height: 76rpx;
  box-sizing: border-box;
  padding: 0 16rpx;
  border-radius: 8rpx;
  background: #fdfaf4;
  border: 1rpx solid rgba(58, 42, 30, 0.1);
  font-size: 25rpx;
  color: #3a2a1e;
}
.sb-event-del {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sb-add {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  margin-top: 20rpx;
  height: 76rpx;
  border-radius: 10rpx;
  border: 1rpx dashed rgba(196, 30, 58, 0.4);
}
.sb-add-txt {
  font-size: 25rpx;
  color: #c41e3a;
}

.sb-quality {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.sb-quality-left {
  width: 120rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
}
.sb-quality-num {
  font-size: 48rpx;
  font-weight: 700;
  color: #b8912f;
  line-height: 1.1;
}
.sb-quality-lab {
  font-size: 20rpx;
  color: #b8aa9a;
}
.sb-quality-body {
  flex: 1;
}
.sb-quality-tier {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: #3a2a1e;
}
.sb-quality-hint {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  line-height: 1.6;
  color: #7a6c5e;
}

.sb-consent {
  display: flex;
  align-items: flex-start;
  gap: 14rpx;
}
.sb-check {
  width: 36rpx;
  height: 36rpx;
  flex-shrink: 0;
  margin-top: 4rpx;
  border-radius: 6rpx;
  border: 1rpx solid rgba(58, 42, 30, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
}
.sb-check--on {
  background: #c41e3a;
  border-color: #c41e3a;
}
.sb-consent-txt {
  flex: 1;
  font-size: 23rpx;
  line-height: 1.75;
  color: #7a6c5e;
}

.sb-btn {
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 48rpx;
  background: #c41e3a;
}
.sb-btn--off {
  background: #d5c9b8;
}
.sb-btn-txt {
  font-size: 30rpx;
  font-weight: 700;
  color: #fff;
}
.sb-foot {
  display: block;
  margin-top: 14rpx;
  text-align: center;
  font-size: 21rpx;
  color: #b8aa9a;
}
.sb-space {
  height: 40rpx;
}
</style>
