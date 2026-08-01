<script setup lang="ts">
/**
 * 我的达人设置 — 达人自助配置提问价/围观价/连麦价/响应时限（2026-07-14）
 * 补齐既有缺口：后端 setExpertConfig 早已备好，前端一直无入口，达人只能靠后台/种子塞价格。
 *
 * 定价权归收款方：提问/围观价一律以达人本人此处的配置为准，后端 ask() 忽略提问者传值
 * （见 question.service.ts:43-49），所以这页是这些价格的唯一真源。
 *
 * 权限：后端要求 role ∈ OWNER/PARTNER/GUEST（圈主/合伙人/嘉宾），否则 403。
 *   前端用 /circles/my 的原始 role 过滤出「我有达人资格的圈」；注意 MyCircle.role 的三档
 *   归并会把 GUEST 压成 member，必须用 rawRole，见 circle-data.ts 的 isExpertRole。
 * 每圈独立定价：同一个人在不同圈子价格互不影响，故先选圈再配置。
 *
 * 保存是全量覆盖（POST config 一次提交四个字段），后端漏传即重置，故本页始终整体提交。
 */
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { circleApi, isExpertRole, type MyCircle } from '@/lib/circle-data'
import { expertConfigApi, getCurrentUserId, type ExpertConfig } from '@/lib/circle-consult-data'

const loading = ref(true)
const error = ref('')
const saving = ref(false)

/** 我有达人资格的圈子（role ∈ OWNER/PARTNER/GUEST） */
const expertCircles = ref<MyCircle[]>([])
const currentId = ref('')
const cfg = ref<ExpertConfig | null>(null)

const currentCircle = computed(() => expertCircles.value.find((c) => c.id === currentId.value))
const ROLE_LABEL: Record<string, string> = { OWNER: '圈主', PARTNER: '合伙人', GUEST: '嘉宾' }
const roleLabel = computed(() => ROLE_LABEL[cfg.value?.role || ''] || '达人')

const askOpen = computed(() => (cfg.value?.questionPriceCoin ?? 0) > 0)
const callOpen = computed(() => (cfg.value?.callPricePerMinuteCoin ?? 0) > 0)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const mine = await circleApi.getMyCircles()
    expertCircles.value = mine.filter((c) => isExpertRole(c.rawRole))
    if (!expertCircles.value.length) {
      cfg.value = null
      return
    }
    // 带参进入（圈子详情/圈主后台）时定位到该圈，否则默认第一个
    const wanted = expertCircles.value.find((c) => c.id === currentId.value)
    currentId.value = (wanted || expertCircles.value[0]).id
    await loadConfig()
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function loadConfig() {
  const uid = getCurrentUserId()
  if (!uid || !currentId.value) { error.value = '请先登录'; return }
  cfg.value = await expertConfigApi.get(currentId.value, uid)
}

/** 切换圈子（每圈独立定价，切换即重新读回该圈配置） */
function switchCircle() {
  if (expertCircles.value.length < 2) return
  uni.showActionSheet({
    itemList: expertCircles.value.map((c) => c.name || '未命名圈子'),
    success: async ({ tapIndex }) => {
      const c = expertCircles.value[tapIndex]
      if (!c || c.id === currentId.value) return
      currentId.value = c.id
      cfg.value = null
      loading.value = true
      try {
        await loadConfig()
      } catch (e) {
        error.value = (e as Error)?.message || '加载失败'
      } finally {
        loading.value = false
      }
    },
  })
}

/** 数值选择：预设档位 + 自定义输入（后端仅校验 >=0 整数，时限 1-720） */
function pickNumber(
  title: string,
  opts: { label: string; value: number }[],
  onPick: (v: number) => void,
  custom?: { placeholder: string; min: number; max: number },
) {
  const items = opts.map((o) => o.label)
  if (custom) items.push('自定义…')
  uni.showActionSheet({
    itemList: items,
    success: ({ tapIndex }) => {
      if (custom && tapIndex === items.length - 1) {
        uni.showModal({
          title,
          editable: true,
          placeholderText: custom.placeholder,
          success: ({ confirm, content }) => {
            if (!confirm) return
            const n = Number(String(content || '').trim())
            if (!Number.isInteger(n) || n < custom.min || n > custom.max) {
              uni.showToast({ title: `请填 ${custom.min}-${custom.max} 的整数`, icon: 'none' })
              return
            }
            onPick(n)
          },
        })
        return
      }
      const o = opts[tapIndex]
      if (o) onPick(o.value)
    },
  })
}

function pickQuestionPrice() {
  if (!cfg.value) return
  pickNumber(
    '图文提问价',
    [
      { label: '不接提问（关闭）', value: 0 },
      { label: '30 金币/次', value: 30 },
      { label: '50 金币/次', value: 50 },
      { label: '100 金币/次', value: 100 },
      { label: '200 金币/次', value: 200 },
      { label: '500 金币/次', value: 500 },
    ],
    (v) => { if (cfg.value) cfg.value.questionPriceCoin = v },
    { placeholder: '输入提问价（金币）', min: 0, max: 100000 },
  )
}

function pickPeekPrice() {
  if (!cfg.value) return
  pickNumber(
    '围观价',
    [
      { label: '不开放围观（关闭）', value: 0 },
      { label: '5 金币/次', value: 5 },
      { label: '10 金币/次', value: 10 },
      { label: '20 金币/次', value: 20 },
      { label: '50 金币/次', value: 50 },
    ],
    (v) => { if (cfg.value) cfg.value.peekPriceCoin = v },
    { placeholder: '输入围观价（金币）', min: 0, max: 100000 },
  )
}

function pickTimeout() {
  if (!cfg.value) return
  pickNumber(
    '响应时限',
    [
      { label: '24 小时', value: 24 },
      { label: '48 小时', value: 48 },
      { label: '72 小时（默认）', value: 72 },
      { label: '5 天', value: 120 },
      { label: '7 天', value: 168 },
    ],
    (v) => { if (cfg.value) cfg.value.questionTimeoutHours = v },
    { placeholder: '输入小时数（1-720）', min: 1, max: 720 },
  )
}

function pickCallPrice() {
  if (!cfg.value) return
  pickNumber(
    '连麦价',
    [
      { label: '不接连麦（关闭）', value: 0 },
      { label: '10 金币/分钟', value: 10 },
      { label: '20 金币/分钟', value: 20 },
      { label: '50 金币/分钟', value: 50 },
      { label: '100 金币/分钟', value: 100 },
    ],
    (v) => { if (cfg.value) cfg.value.callPricePerMinuteCoin = v },
    { placeholder: '输入连麦价（金币/分钟）', min: 0, max: 100000 },
  )
}

async function save() {
  if (saving.value || !cfg.value || !currentId.value) return
  const c = cfg.value
  if (c.questionTimeoutHours < 1 || c.questionTimeoutHours > 720) {
    uni.showToast({ title: '响应时限需在 1-720 小时', icon: 'none' })
    return
  }
  saving.value = true
  try {
    await expertConfigApi.set(currentId.value, {
      questionPriceCoin: c.questionPriceCoin,
      peekPriceCoin: c.peekPriceCoin,
      questionTimeoutHours: c.questionTimeoutHours,
      callPricePerMinuteCoin: c.callPricePerMinuteCoin,
    })
    uni.showToast({ title: '已保存，立即生效', icon: 'success' })
    await loadConfig()
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

onLoad((query) => {
  currentId.value = String((query as Record<string, string>)?.circleId || (query as Record<string, string>)?.id || '')
  load()
})
</script>

<template>
  <view class="page">
    <!-- 顶栏 -->
    <view class="topbar">
      <view class="back-btn" @tap="goBack"><app-icon name="arrow-left" :size="44" color="#1A1A1A" /></view>
      <text class="topbar-title">我的达人设置</text>
    </view>

    <!-- 加载态 -->
    <view v-if="loading" class="state">
      <view class="skel" /><view class="skel tall" /><view class="skel tall" />
    </view>
    <!-- 错误态 -->
    <view v-else-if="error" class="state center">
      <text class="state-t">{{ error }}</text>
      <view class="retry" @tap="load"><text class="retry-t">重试</text></view>
    </view>
    <!-- 无达人资格：如实说明门槛，不给假入口 -->
    <view v-else-if="!expertCircles.length" class="state center">
      <app-icon name="user" :size="72" color="#C9A96E" />
      <text class="state-t">你还不是任何圈子的达人</text>
      <text class="state-sub">成为圈主，或被圈主设为合伙人/嘉宾后，即可在此设置咨询价格</text>
    </view>

    <template v-else-if="cfg">
      <!-- 圈子选择：每圈独立定价 -->
      <text class="group-label">配置圈子 · 每个圈子的价格独立设置</text>
      <view class="group">
        <view class="circle-row" @tap="switchCircle">
          <view class="circle-icon"><app-icon name="users" :size="32" color="#C9A96E" /></view>
          <view class="circle-main">
            <view class="circle-name-line">
              <text class="circle-name">{{ currentCircle?.name || '未命名圈子' }}</text>
              <text class="circle-role">{{ roleLabel }}</text>
            </view>
            <text class="circle-sub">
              {{ expertCircles.length > 1 ? `你在 ${expertCircles.length} 个圈子有达人资格，点击切换` : '你的达人资格仅在此圈' }}
            </text>
          </view>
          <text v-if="expertCircles.length > 1" class="circle-chev">›</text>
        </view>
      </view>

      <!-- 图文提问 -->
      <text class="group-label">图文提问</text>
      <view class="group">
        <view class="cfg-row" @tap="pickQuestionPrice">
          <view class="cfg-main">
            <text class="cfg-title">提问价</text>
            <text class="cfg-desc">提问者按此价付费，金币由平台托管；设为 0 则关闭付费提问</text>
          </view>
          <view class="cfg-value">
            <text class="cfg-value-t" :class="{ off: !askOpen }">{{ askOpen ? `${cfg.questionPriceCoin} 金币/次` : '未开通' }}</text>
            <text class="cfg-chev">›</text>
          </view>
        </view>
        <view class="cfg-row" @tap="pickTimeout">
          <view class="cfg-main">
            <text class="cfg-title">响应时限</text>
            <text class="cfg-desc">超过时限未回答，系统自动全额退款给提问者（你不获得收益）</text>
          </view>
          <view class="cfg-value">
            <text class="cfg-value-t">{{ cfg.questionTimeoutHours }} 小时</text>
            <text class="cfg-chev">›</text>
          </view>
        </view>
        <view class="rate-note">
          <app-icon name="info" :size="24" color="#C9A96E" />
          <text class="rate-note-t">回答后你获得提问金额的 <text class="rate-b">80%</text>，平台 20%</text>
        </view>
      </view>

      <!-- 付费围观 -->
      <text class="group-label">付费围观 · 一次回答可被多人付费查看</text>
      <view class="group">
        <view class="cfg-row" @tap="pickPeekPrice">
          <view class="cfg-main">
            <text class="cfg-title">围观价</text>
            <text class="cfg-desc">其他人付费查看你已回答的公开问答；设为 0 则公开问答免费可看</text>
          </view>
          <view class="cfg-value">
            <text class="cfg-value-t" :class="{ off: !cfg.peekPriceCoin }">{{ cfg.peekPriceCoin ? `${cfg.peekPriceCoin} 金币/次` : '不开放' }}</text>
            <text class="cfg-chev">›</text>
          </view>
        </view>
        <view class="rate-note">
          <app-icon name="info" :size="24" color="#C9A96E" />
          <text class="rate-note-t">每笔围观你得 <text class="rate-b">30%</text>，提问者得 30%（激励其公开），平台 40%</text>
        </view>
        <view v-if="cfg.peekPriceCoin > 0 && !askOpen" class="warn-note">
          <text class="warn-note-t">当前未开通付费提问，不会产生新的可围观问答——围观价要生效，需同时开通提问</text>
        </view>
      </view>

      <!-- 连麦咨询 -->
      <text class="group-label">连麦咨询</text>
      <view class="group">
        <view class="cfg-row" @tap="pickCallPrice">
          <view class="cfg-main">
            <text class="cfg-title">连麦价</text>
            <text class="cfg-desc">按分钟计费，通话中预扣、挂断后按实际时长结算；设为 0 则关闭连麦</text>
          </view>
          <view class="cfg-value">
            <text class="cfg-value-t" :class="{ off: !callOpen }">{{ callOpen ? `${cfg.callPricePerMinuteCoin} 金币/分钟` : '未开通' }}</text>
            <text class="cfg-chev">›</text>
          </view>
        </view>
        <view class="rate-note">
          <app-icon name="info" :size="24" color="#C9A96E" />
          <text class="rate-note-t">连麦你获得实付金额的 <text class="rate-b">50%</text>，平台 50%</text>
        </view>
      </view>

      <text class="page-note">
        价格保存后立即对新订单生效，已成交的订单按下单时的价格结算，不受影响。
        分成比例以平台结算规则为准，实际入账见「个人中心 · 钱包」。
        两项服务都关闭时，你不会出现在本圈的达人列表里。
      </text>
      <view class="bottom-pad" />
    </template>

    <!-- 吸底保存 -->
    <view v-if="!loading && !error && cfg" class="savebar">
      <view class="btn-save" :class="{ disabled: saving }" @tap="save">
        <text class="btn-save-t">{{ saving ? '保存中…' : '保存设置' }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: var(--bg-page, #faf8f5); padding-bottom: calc(176rpx + env(safe-area-inset-bottom)); }

/* 顶栏 */
.topbar {
  position: sticky; top: 0; z-index: 20;
  display: flex; align-items: center; gap: 20rpx;
  padding: 24rpx 32rpx;
  padding-top: calc(var(--status-bar-height, 0px) + 24rpx);
  background: rgba(250, 248, 245, 0.92); backdrop-filter: blur(24rpx);
  border-bottom: 1rpx solid var(--separator, #ede7dd);
}
.back-btn { display: flex; align-items: center; }
.topbar-title { font-size: 34rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); flex: 1; }

/* 三态 */
.state { padding: 32rpx; }
.state.center { padding: 140rpx 72rpx; display: flex; flex-direction: column; align-items: center; gap: 20rpx; }
.skel { height: 120rpx; border-radius: 36rpx; background: #fff; margin-bottom: 24rpx; }
.skel.tall { height: 260rpx; }
.state-t { font-size: 28rpx; color: var(--text-secondary, #6e6e73); }
.state-sub { font-size: 24rpx; color: var(--text-tertiary, #999); line-height: 1.7; text-align: center; }
.retry { margin-top: 12rpx; padding: 14rpx 56rpx; border-radius: 999rpx; background: var(--brand, #c41e3a); }
.retry-t { font-size: 26rpx; color: #fff; }

.group-label { display: block; margin: 36rpx 36rpx 16rpx; font-size: 24rpx; color: var(--text-tertiary, #999999); }
.group {
  margin: 0 32rpx; background: var(--bg-card, #ffffff);
  border-radius: 36rpx; box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
  overflow: hidden;
}

/* 圈子选择行 */
.circle-row { display: flex; align-items: center; gap: 24rpx; padding: 28rpx 32rpx; }
.circle-row:active { background: var(--bg-warm, #f8f4ec); }
.circle-icon {
  width: 72rpx; height: 72rpx; border-radius: 22rpx; flex-shrink: 0;
  background: var(--gold-soft, rgba(201, 169, 110, 0.14));
  display: flex; align-items: center; justify-content: center;
}
.circle-main { flex: 1; min-width: 0; }
.circle-name-line { display: flex; align-items: center; gap: 12rpx; }
.circle-name { font-size: 30rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); }
.circle-role {
  flex-shrink: 0; padding: 2rpx 14rpx; border-radius: 8rpx;
  border: 1rpx solid var(--gold, #c9a96e); color: var(--gold, #c9a96e);
  font-size: 20rpx; line-height: 1.7;
}
.circle-sub { display: block; font-size: 22rpx; color: var(--text-tertiary, #999999); margin-top: 6rpx; }
.circle-chev { flex-shrink: 0; font-size: 32rpx; color: var(--text-tertiary, #999999); }

/* 配置行 */
.cfg-row { display: flex; align-items: center; gap: 24rpx; padding: 28rpx 32rpx; }
.cfg-row + .cfg-row { border-top: 1rpx solid var(--separator, #ede7dd); }
.cfg-row:active { background: var(--bg-warm, #f8f4ec); }
.cfg-main { flex: 1; min-width: 0; }
.cfg-title { display: block; font-size: 28rpx; font-weight: 500; color: var(--text-primary, #2c2c2c); }
.cfg-desc { display: block; font-size: 22rpx; color: var(--text-tertiary, #999999); margin-top: 6rpx; line-height: 1.6; }
.cfg-value { flex-shrink: 0; display: flex; align-items: center; gap: 8rpx; }
.cfg-value-t { font-size: 28rpx; font-weight: 600; color: var(--gold, #c9a96e); }
.cfg-value-t.off { color: var(--text-tertiary, #999999); font-weight: 400; }
.cfg-chev { font-size: 28rpx; color: var(--text-tertiary, #999999); }

/* 分成说明 */
.rate-note {
  display: flex; align-items: center; gap: 12rpx;
  padding: 20rpx 32rpx; background: var(--bg-warm, #f8f4ec);
  border-top: 1rpx solid var(--separator, #ede7dd);
}
.rate-note-t { flex: 1; font-size: 22rpx; color: var(--text-secondary, #6e6e73); line-height: 1.6; }
.rate-b { color: var(--gold, #c9a96e); font-weight: 700; }

/* 冲突提示 */
.warn-note { padding: 18rpx 32rpx; background: rgba(201, 123, 45, 0.08); }
.warn-note-t { font-size: 22rpx; color: #c97b2d; line-height: 1.6; }

.page-note { display: block; margin: 32rpx 36rpx 0; font-size: 22rpx; color: var(--text-tertiary, #999999); line-height: 1.8; }
.bottom-pad { height: 40rpx; }

/* 吸底保存 */
.savebar {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 30;
  padding: 24rpx 32rpx calc(24rpx + env(safe-area-inset-bottom));
  background: rgba(250, 248, 245, 0.92); backdrop-filter: blur(24rpx);
  border-top: 1rpx solid var(--separator, #ede7dd);
}
.btn-save {
  height: 92rpx; border-radius: 46rpx; background: var(--brand, #c41e3a);
  display: flex; align-items: center; justify-content: center;
}
.btn-save.disabled { opacity: 0.6; }
.btn-save-t { font-size: 32rpx; font-weight: 600; color: #ffffff; letter-spacing: 2rpx; }
</style>
