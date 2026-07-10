<script setup lang="ts">
/**
 * 违规处理通知 · 被处理者视角 — V0 circle-sanction-notice.html 还原（2026-07-10 批⑦·治理前端）
 * 讲清四件事：违了哪条规 / 证据是什么 / 处理是什么 / 怎么申诉。语气克制不羞辱。
 * 结构：我的处理通知列表（警告/禁言/移出三态卡）→ 累计进度 x/N → 72h 申诉入口（表单弹层）→ 申诉结果展示。
 * 数据：circleGovernanceApi.mySanctions / createAppeal / getRules（真连 /circle-governance/*）。
 * 口径（与后端一致·不编造）：申诉 72h 内一次·平台仲裁 48h 答复·成立=撤销并清记录；
 * 禁言仅暂停发帖与评论（后端本期未拦提问·文案如实写「发帖、评论」）。
 * 入参：?circleId= 可选（按圈过滤·默认跨圈全量）。
 */
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { circleGovernanceApi, type MySanction, type CircleRuleItem } from '@/lib/circle-governance-data'

const filterCircleId = ref('')

const loading = ref(true)
const error = ref('')
const list = ref<MySanction[]>([])

// ─── 申诉表单弹层 ───
const appealTarget = ref<MySanction | null>(null)
const appealText = ref('')
const appealSubmitting = ref(false)

// ─── 查看圈规弹层（按圈懒取·缓存） ───
const rulesSheet = ref<{ circleName: string; rules: CircleRuleItem[]; loading: boolean } | null>(null)
const rulesCache = new Map<string, CircleRuleItem[]>()

async function load() {
  loading.value = true
  error.value = ''
  try {
    list.value = await circleGovernanceApi.mySanctions(filterCircleId.value || undefined)
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

// ─── 展示辅助 ───

function fmtTime(s: string | null) {
  if (!s) return ''
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

/** 禁言天数（expiresAt-createdAt 反推） */
function muteDays(v: MySanction) {
  if (!v.expiresAt || !v.createdAt) return 0
  const ms = new Date(v.expiresAt).getTime() - new Date(v.createdAt).getTime()
  return Math.max(1, Math.round(ms / (24 * 3600 * 1000)))
}

function cardTitle(v: MySanction) {
  if (v.type === 'WARNING') return '你收到一次警告'
  if (v.type === 'MUTE') return `你已被禁言 ${muteDays(v)} 天`
  return '你已被移出圈子'
}

function timeLine(v: MySanction) {
  let line = `${v.circleName} · ${fmtTime(v.createdAt)}`
  if (v.type === 'MUTE' && v.status === 'ACTIVE' && v.expiresAt) line += ` · ${fmtTime(v.expiresAt)} 自动解除`
  return line
}

/** 非生效态徽章（生效中不显·V0 单态卡无徽章） */
function statusBadge(v: MySanction) {
  if (v.status === 'REVOKED') return '已撤销 · 申诉成立'
  if (v.status === 'LIFTED') return v.type === 'MUTE' ? '已提前解除' : v.type === 'REMOVE' ? '禁入已解除' : '已解除'
  if (v.status === 'EXPIRED') {
    if (v.type === 'WARNING') return '已清零'
    if (v.type === 'MUTE') return '已解除'
    return '记录在案'
  }
  return ''
}

function strikeSegments(v: MySanction) {
  const total = Math.max(v.warningThreshold, 1)
  const hit = Math.min(Math.max(v.strikeCount, 0), total)
  return Array.from({ length: total }, (_, i) => i < hit)
}

// ─── 申诉 ───

function openAppeal(v: MySanction) {
  appealTarget.value = v
  appealText.value = ''
}

async function submitAppeal() {
  const v = appealTarget.value
  if (!v || appealSubmitting.value) return
  const content = appealText.value.trim()
  if (content.length < 5) { uni.showToast({ title: '申诉理由至少 5 个字', icon: 'none' }); return }
  if (content.length > 1000) { uni.showToast({ title: '申诉理由最多 1000 字', icon: 'none' }); return }
  appealSubmitting.value = true
  try {
    const r = await circleGovernanceApi.createAppeal(v.id, content)
    appealTarget.value = null
    uni.showToast({ title: `申诉已提交，平台将在 ${r.replyHours ?? 48} 小时内答复`, icon: 'none' })
    await load()
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '提交失败', icon: 'none' })
  } finally {
    appealSubmitting.value = false
  }
}

// ─── 查看圈规 ───

async function openRules(v: MySanction) {
  rulesSheet.value = { circleName: v.circleName, rules: rulesCache.get(v.circleId) ?? [], loading: !rulesCache.has(v.circleId) }
  if (rulesCache.has(v.circleId)) return
  try {
    const r = await circleGovernanceApi.getRules(v.circleId)
    rulesCache.set(v.circleId, r.rules)
    if (rulesSheet.value) { rulesSheet.value.rules = r.rules; rulesSheet.value.loading = false }
  } catch {
    if (rulesSheet.value) rulesSheet.value.loading = false
  }
}

onLoad((query) => {
  filterCircleId.value = String((query as Record<string, string>)?.circleId || '')
  load()
})
</script>

<template>
  <view class="page">
    <!-- 顶栏 -->
    <view class="navbar">
      <view class="nav-back" @tap="goBack"><app-icon name="chevron-left" :size="40" color="#2C2C2C" /></view>
      <text class="nav-title">违规处理通知</text>
      <view class="nav-ph" />
    </view>

    <!-- 加载态 -->
    <view v-if="loading" class="state">
      <view class="skel" /><view class="skel" />
    </view>
    <!-- 错误态 -->
    <view v-else-if="error" class="state center">
      <text class="state-t">{{ error }}</text>
      <view class="retry" @tap="load"><text class="retry-t">重试</text></view>
    </view>
    <!-- 空态 -->
    <view v-else-if="!list.length" class="state center">
      <view class="empty-icon"><app-icon name="shield-check" :size="52" color="#5B8A5E" /></view>
      <text class="empty-title">暂无违规处理记录</text>
      <text class="empty-sub">你在各圈子均保持良好记录。若圈主对你作出警告、禁言或移出处理，通知与申诉入口会显示在这里。</text>
    </view>

    <!-- 通知卡列表 -->
    <template v-else>
      <view v-for="v in list" :key="v.id" class="notice-card">
        <!-- 顶部色带 -->
        <view class="notice-head" :class="v.type === 'WARNING' ? 'warn-level' : 'mute-level'">
          <view class="notice-icon" :class="v.type === 'WARNING' ? 'warn' : 'mute'">
            <app-icon v-if="v.type === 'WARNING'" name="alert-triangle" :size="32" color="#C28E2E" />
            <app-icon v-else-if="v.type === 'MUTE'" name="ban" :size="32" color="#C41E3A" />
            <app-icon v-else name="user-x" :size="32" color="#C41E3A" />
          </view>
          <view class="notice-title-group">
            <text class="notice-title" :class="v.type === 'WARNING' ? 'warn' : 'mute'">{{ cardTitle(v) }}</text>
            <text class="notice-time">{{ timeLine(v) }}</text>
          </view>
          <view v-if="statusBadge(v)" class="notice-status"><text class="notice-status-t">{{ statusBadge(v) }}</text></view>
        </view>

        <view class="notice-body">
          <!-- 违反圈规 -->
          <view v-if="v.ruleText" class="notice-item">
            <text class="k">违反圈规</text>
            <text class="v">{{ v.ruleText }}</text>
          </view>
          <!-- 处理原因/说明 -->
          <view v-if="v.reason" class="notice-item">
            <text class="k">处理{{ v.auto ? '原因' : '说明' }}</text>
            <text class="v">{{ v.reason }}</text>
          </view>
          <!-- 涉及内容（证据） -->
          <view v-if="v.evidence" class="notice-item">
            <text class="k">涉及内容</text>
            <view class="quote"><text class="quote-t">「{{ v.evidence }}」</text></view>
          </view>
          <!-- 累计进度 x/N -->
          <view class="notice-item">
            <text class="k">累计{{ v.type === 'WARNING' ? '警告' : '记录' }}</text>
            <view class="strike-track">
              <view
                v-for="(hit, i) in strikeSegments(v)" :key="i"
                class="strike" :class="{ hit, mute: hit && v.type !== 'WARNING' }"
              />
            </view>
            <text v-if="v.type === 'WARNING'" class="strike-note">
              累计警告 {{ v.strikeCount }}/{{ v.warningThreshold }} 次，满 {{ v.warningThreshold }} 次将自动升级为禁言。警告记录 90 天后自动清零，期间保持良好记录即可。
            </text>
            <text v-else-if="v.type === 'MUTE'" class="strike-note">
              禁言期满自动恢复发言 · 若禁言期内再次违规，圈主可按阶梯移出圈子（付费圈按退款规则结算，费用不没收）。
            </text>
            <text v-else class="strike-note">
              付费成员剩余费用按圈子退款规则结算（不没收），可在「我的圈子退款」入口申请。
            </text>
          </view>
          <!-- 禁言期间可做什么：不是全剥夺 -->
          <view v-if="v.type === 'MUTE' && v.status === 'ACTIVE'" class="notice-item">
            <text class="k">禁言期间你仍然可以</text>
            <view class="during-note">
              <text class="during-note-t">浏览圈内全部内容 · 观看直播与回放 · 学习已购课程——仅暂停发帖与评论。</text>
            </view>
          </view>
        </view>

        <!-- 申诉状态（已提交/已裁决） -->
        <view v-if="v.appeal" class="appeal-status" :class="v.appeal.status.toLowerCase()">
          <app-icon
            :name="v.appeal.status === 'PENDING' ? 'clock' : v.appeal.status === 'UPHELD' ? 'check-circle' : 'x-circle'"
            :size="28"
            :color="v.appeal.status === 'REJECTED' ? '#999999' : v.appeal.status === 'UPHELD' ? '#5B8A5E' : '#C9A96E'"
          />
          <text class="appeal-status-t" :class="v.appeal.status.toLowerCase()">
            <template v-if="v.appeal.status === 'PENDING'">申诉已提交（{{ fmtTime(v.appeal.createdAt) }}）· 平台仲裁复核中，预计 48 小时内答复</template>
            <template v-else-if="v.appeal.status === 'UPHELD'">申诉成立 · 处理已撤销并清除记录{{ v.appeal.resolution ? ` · 仲裁说明：${v.appeal.resolution}` : '' }}</template>
            <template v-else>申诉未通过 · 处理维持{{ v.appeal.resolution ? ` · 仲裁说明：${v.appeal.resolution}` : '' }}</template>
          </text>
        </view>

        <!-- 操作区 -->
        <view class="notice-actions">
          <view v-if="v.appealable" class="btn-appeal" @tap="openAppeal(v)"><text class="btn-appeal-t">我要申诉</text></view>
          <view class="btn-rules" @tap="openRules(v)"><text class="btn-rules-t">查看圈规</text></view>
        </view>
        <text v-if="v.appealable" class="appeal-note">
          对处理有异议可在 <text class="appeal-note-b">72 小时内申诉</text>，由平台仲裁复核（不经圈主自审）；申诉期间处理照常生效。
        </text>
        <text v-else-if="v.appeal && v.appeal.status === 'PENDING'" class="appeal-note">
          若申诉成立，处理将撤销并清除本次记录；若不成立，处理维持，仲裁说明将同步给你。
        </text>
      </view>
      <view class="bottom-pad" />
    </template>

    <!-- 申诉表单弹层 -->
    <view v-if="appealTarget" class="mask" @tap="appealTarget = null">
      <view class="sheet" @tap.stop>
        <text class="sheet-title">申诉 · {{ cardTitle(appealTarget) }}</text>
        <text class="sheet-sub">{{ appealTarget.circleName }} · 每次处理仅可申诉一次，由平台仲裁复核（不经圈主自审），48 小时内答复。</text>
        <textarea
          v-model="appealText" class="sheet-input" :maxlength="1000"
          placeholder="请说明你认为处理有误的理由与事实依据（5-1000 字）"
        />
        <text class="sheet-count">{{ appealText.length }}/1000</text>
        <view class="sheet-btns">
          <view class="sheet-btn ghost" @tap="appealTarget = null"><text class="sheet-btn-t ghost">再想想</text></view>
          <view class="sheet-btn primary" :class="{ disabled: appealSubmitting }" @tap="submitAppeal">
            <text class="sheet-btn-t primary">{{ appealSubmitting ? '提交中…' : '提交申诉' }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 查看圈规弹层 -->
    <view v-if="rulesSheet" class="mask" @tap="rulesSheet = null">
      <view class="sheet" @tap.stop>
        <text class="sheet-title">{{ rulesSheet.circleName }} · 圈规</text>
        <view v-if="rulesSheet.loading" class="sheet-loading"><text class="sheet-loading-t">加载中…</text></view>
        <view v-else-if="!rulesSheet.rules.length" class="sheet-loading"><text class="sheet-loading-t">该圈子暂未设置圈规条文</text></view>
        <scroll-view v-else scroll-y class="rules-scroll">
          <view v-for="(r, i) in rulesSheet.rules" :key="r.id" class="rule-row">
            <view class="rule-no"><text class="rule-no-t">{{ i + 1 }}</text></view>
            <text class="rule-text">{{ r.text }}</text>
          </view>
        </scroll-view>
        <view class="sheet-btn primary solo" @tap="rulesSheet = null"><text class="sheet-btn-t primary">知道了</text></view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: var(--bg-page, #faf8f5); padding-bottom: 80rpx; }

/* 顶栏 */
.navbar {
  position: sticky; top: 0; z-index: 20;
  display: flex; align-items: center;
  padding: 24rpx 32rpx;
  padding-top: calc(var(--status-bar-height, 0px) + 24rpx);
  background: rgba(250, 248, 245, 0.92); backdrop-filter: blur(24rpx);
  border-bottom: 1rpx solid var(--separator, #ede7dd);
}
.nav-back { width: 64rpx; display: flex; align-items: center; }
.nav-title { flex: 1; text-align: center; font-size: 32rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); }
.nav-ph { width: 64rpx; }

/* 三态 */
.state { padding: 32rpx; }
.state.center { padding: 160rpx 80rpx; display: flex; flex-direction: column; align-items: center; gap: 16rpx; }
.skel { height: 420rpx; border-radius: 36rpx; background: #fff; margin-bottom: 32rpx; }
.state-t { font-size: 28rpx; color: var(--text-tertiary, #999); }
.retry { margin-top: 12rpx; padding: 14rpx 56rpx; border-radius: 999rpx; background: var(--brand, #c41e3a); }
.retry-t { font-size: 26rpx; color: #fff; }
.empty-icon {
  width: 128rpx; height: 128rpx; border-radius: 50%;
  background: rgba(91, 138, 94, 0.1);
  display: flex; align-items: center; justify-content: center;
}
.empty-title { font-size: 32rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); margin-top: 20rpx; }
.empty-sub { font-size: 25rpx; color: var(--text-tertiary, #999); line-height: 1.7; text-align: center; }

/* 通知卡 */
.notice-card {
  margin: 32rpx 32rpx 0; background: var(--bg-card, #ffffff);
  border-radius: 36rpx; box-shadow: 0 2rpx 12rpx rgba(44, 44, 44, 0.05);
  overflow: hidden;
}
.notice-head { display: flex; align-items: center; gap: 20rpx; padding: 28rpx 32rpx; }
.notice-head.warn-level { background: rgba(194, 142, 46, 0.08); }
.notice-head.mute-level { background: rgba(196, 30, 58, 0.06); }
.notice-icon {
  width: 68rpx; height: 68rpx; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.notice-icon.warn { background: rgba(194, 142, 46, 0.14); }
.notice-icon.mute { background: rgba(196, 30, 58, 0.1); }
.notice-title-group { flex: 1; min-width: 0; }
.notice-title { display: block; font-size: 30rpx; font-weight: 600; }
.notice-title.warn { color: #c28e2e; }
.notice-title.mute { color: var(--brand, #c41e3a); }
.notice-time { display: block; font-size: 22rpx; color: var(--text-tertiary, #999999); margin-top: 4rpx; line-height: 1.5; }
.notice-status {
  flex-shrink: 0; padding: 4rpx 16rpx; border-radius: 18rpx;
  background: rgba(44, 44, 44, 0.06);
}
.notice-status-t { font-size: 20rpx; color: var(--text-secondary, #6e6e73); }

/* 内容段 */
.notice-body { padding: 8rpx 32rpx 32rpx; }
.notice-item { padding: 24rpx 0 0; }
.notice-item + .notice-item { margin-top: 24rpx; border-top: 1rpx solid var(--separator, #ede7dd); }
.k { display: block; font-size: 22rpx; color: var(--text-tertiary, #999999); }
.v { display: block; font-size: 26rpx; color: var(--text-primary, #2c2c2c); line-height: 1.7; margin-top: 8rpx; }
.quote {
  margin-top: 12rpx; padding: 20rpx 24rpx;
  background: var(--bg-warm, #f8f4ec); border-radius: 20rpx;
  border-left: 4rpx solid var(--separator, #ede7dd);
}
.quote-t { font-size: 24rpx; color: var(--text-secondary, #6e6e73); line-height: 1.7; }

/* 累计进度 */
.strike-track { display: flex; gap: 10rpx; margin-top: 16rpx; }
.strike { flex: 1; height: 10rpx; border-radius: 6rpx; background: var(--separator, #ede7dd); }
.strike.hit { background: #c28e2e; }
.strike.hit.mute { background: var(--brand, #c41e3a); }
.strike-note { display: block; font-size: 22rpx; color: var(--text-tertiary, #999999); margin-top: 12rpx; line-height: 1.6; }

/* 禁言期间可做什么 */
.during-note {
  margin-top: 12rpx; padding: 20rpx 24rpx;
  background: var(--bg-warm, #f8f4ec); border-radius: 20rpx;
}
.during-note-t { font-size: 24rpx; color: var(--text-secondary, #6e6e73); line-height: 1.8; }

/* 申诉状态 */
.appeal-status {
  display: flex; align-items: flex-start; gap: 16rpx;
  margin: 0 32rpx 32rpx; padding: 22rpx 28rpx;
  background: rgba(201, 169, 110, 0.07); border-radius: 28rpx;
}
.appeal-status.upheld { background: rgba(91, 138, 94, 0.08); }
.appeal-status.rejected { background: var(--bg-warm, #f8f4ec); }
.appeal-status-t { flex: 1; font-size: 24rpx; color: var(--gold, #c9a96e); line-height: 1.6; }
.appeal-status-t.upheld { color: #5b8a5e; }
.appeal-status-t.rejected { color: var(--text-secondary, #6e6e73); }

/* 操作区 */
.notice-actions { display: flex; gap: 20rpx; padding: 0 32rpx 32rpx; }
.btn-appeal {
  flex: 1; height: 80rpx;
  border: 2rpx solid var(--gold, #c9a96e); border-radius: 40rpx;
  display: flex; align-items: center; justify-content: center;
}
.btn-appeal-t { font-size: 26rpx; font-weight: 600; color: var(--gold, #c9a96e); }
.btn-rules {
  flex: 1; height: 80rpx;
  border: 2rpx solid var(--separator, #ede7dd); border-radius: 40rpx;
  display: flex; align-items: center; justify-content: center;
}
.btn-rules-t { font-size: 26rpx; color: var(--text-secondary, #6e6e73); }
.appeal-note {
  display: block; padding: 0 36rpx 32rpx; font-size: 22rpx;
  color: var(--text-tertiary, #999999); line-height: 1.7; text-align: center;
}
.appeal-note-b { color: var(--text-secondary, #6e6e73); font-weight: 500; }

.bottom-pad { height: 40rpx; }

/* 弹层 */
.mask {
  position: fixed; inset: 0; z-index: 50;
  background: rgba(44, 44, 44, 0.45);
  display: flex; align-items: flex-end;
}
.sheet {
  width: 100%; background: #ffffff;
  border-radius: 36rpx 36rpx 0 0;
  padding: 40rpx 36rpx calc(32rpx + env(safe-area-inset-bottom));
}
.sheet-title { display: block; font-size: 32rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); text-align: center; }
.sheet-sub { display: block; margin-top: 16rpx; font-size: 24rpx; color: var(--text-tertiary, #999999); line-height: 1.7; }
.sheet-input {
  width: 100%; height: 260rpx; margin-top: 24rpx;
  padding: 20rpx 24rpx; box-sizing: border-box;
  background: var(--bg-warm, #f8f4ec); border-radius: 20rpx;
  font-size: 28rpx; line-height: 1.6; color: var(--text-primary, #2c2c2c);
}
.sheet-count { display: block; margin-top: 8rpx; font-size: 22rpx; color: var(--text-tertiary, #999999); text-align: right; }
.sheet-btns { display: flex; gap: 20rpx; margin-top: 28rpx; }
.sheet-btn {
  flex: 1; height: 84rpx; border-radius: 42rpx;
  display: flex; align-items: center; justify-content: center;
}
.sheet-btn.ghost { border: 1rpx solid var(--separator, #ede7dd); }
.sheet-btn.primary { background: var(--brand, #c41e3a); }
.sheet-btn.disabled { opacity: 0.6; }
.sheet-btn.solo { margin-top: 28rpx; }
.sheet-btn-t { font-size: 28rpx; }
.sheet-btn-t.ghost { color: var(--text-secondary, #6e6e73); }
.sheet-btn-t.primary { color: #ffffff; font-weight: 600; }
.sheet-loading { padding: 60rpx 0; display: flex; justify-content: center; }
.sheet-loading-t { font-size: 26rpx; color: var(--text-tertiary, #999999); }
.rules-scroll { max-height: 50vh; margin-top: 20rpx; }
.rule-row { display: flex; align-items: flex-start; gap: 20rpx; padding: 20rpx 0; }
.rule-row + .rule-row { border-top: 1rpx solid var(--separator, #ede7dd); }
.rule-no {
  width: 40rpx; height: 40rpx; border-radius: 50%; flex-shrink: 0; margin-top: 2rpx;
  background: var(--bg-warm, #f8f4ec);
  display: flex; align-items: center; justify-content: center;
}
.rule-no-t { font-size: 22rpx; font-weight: 600; color: var(--text-secondary, #6e6e73); }
.rule-text { flex: 1; font-size: 28rpx; line-height: 1.6; color: var(--text-primary, #2c2c2c); }
</style>
