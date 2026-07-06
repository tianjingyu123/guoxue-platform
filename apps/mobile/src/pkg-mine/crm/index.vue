<template>
  <view class="crm-page">
    <app-nav-bar title="客户经营" :show-back="true" background="#C41E3A" color="#ffffff" :no-border="true" />

    <scroll-view scroll-y class="crm-scroll">
      <!-- 三态 -->
      <view v-if="loading" class="crm-state"><text class="crm-state-txt">加载中...</text></view>
      <view v-else-if="error" class="crm-state">
        <text class="crm-state-txt">{{ error }}</text>
        <view class="crm-retry" @tap="loadAll"><text class="crm-retry-txt">重试</text></view>
      </view>

      <template v-else>
        <!-- 经营洞察入口（课-P4·统计聚合·无个体名单） -->
        <view class="crm-ins-entry" @tap="navigateTo('/pkg-mine/crm/insights')">
          <text class="crm-ins-entry-icon">📊</text>
          <view class="crm-ins-entry-main">
            <text class="crm-ins-entry-title">经营洞察</text>
            <text class="crm-ins-entry-sub">服务结构 · 客群节律 · 商机雷达 · AI 建议</text>
          </view>
          <text class="crm-ins-entry-arrow">›</text>
        </view>

        <!-- 提醒待办 -->
        <view v-if="reminders.length" class="crm-card">
          <view class="crm-card-head">
            <text class="crm-card-title">今日待跟进</text>
            <view class="crm-badge"><text class="crm-badge-txt">{{ reminders.length }}</text></view>
          </view>
          <view v-for="r in visibleReminders" :key="r.id" class="crm-rem-item">
            <view class="crm-rem-main">
              <view class="crm-rem-top">
                <view class="crm-rem-kind" :class="r.kind.toLowerCase()"><text class="crm-rem-kind-txt">{{ r.kindLabel }}</text></view>
                <text class="crm-rem-name">{{ r.clientName }}</text>
                <text class="crm-rem-due">{{ fmtDate(r.dueAt) }}</text>
              </view>
              <text v-if="r.aiDraft" class="crm-rem-draft">{{ r.aiDraft }}</text>
            </view>
            <view class="crm-rem-actions">
              <view class="crm-mini-btn primary" :class="{ disabled: submittingId === r.id }" @tap="onDraft(r)">
                <text class="crm-mini-btn-txt primary">{{ r.aiDraft ? '复制话术' : 'AI话术' }}</text>
              </view>
              <view class="crm-mini-btn" :class="{ disabled: submittingId === r.id }" @tap="onDone(r)">
                <text class="crm-mini-btn-txt">完成</text>
              </view>
            </view>
          </view>
          <view v-if="reminders.length > 3" class="crm-rem-more" @tap="showAllReminders = !showAllReminders">
            <text class="crm-rem-more-txt">{{ showAllReminders ? '收起' : `展开全部 ${reminders.length} 条` }}</text>
          </view>
        </view>

        <!-- 订单归因入库询问（尊重双方·不自动入库） -->
        <view v-if="suggested.length" class="crm-card">
          <view class="crm-card-head">
            <text class="crm-card-title">可入库的成交客户</text>
            <text class="crm-card-sub">近30天经你推荐成交</text>
          </view>
          <view v-for="s in suggested" :key="s.orderId" class="crm-sug-item">
            <view class="crm-sug-main">
              <text class="crm-sug-name">{{ s.nickname }}</text>
              <text class="crm-sug-meta">{{ s.orderCount }} 单 · ¥{{ s.totalAmount }}</text>
            </view>
            <view class="crm-mini-btn primary" :class="{ disabled: submittingId === s.orderId }" @tap="onArchive(s)">
              <text class="crm-mini-btn-txt primary">入库建档</text>
            </view>
          </view>
        </view>

        <!-- 体验档配额提示（入角色钩子） -->
        <view v-if="quota.limit !== null" class="crm-quota">
          <text class="crm-quota-txt">体验档客户档案 {{ quota.used }}/{{ quota.limit }}，成为站长/商家/驿站/研究院成员即无限量</text>
        </view>

        <!-- 分层 tab -->
        <scroll-view scroll-x class="crm-tabs" :show-scrollbar="false">
          <view
            v-for="t in tabs"
            :key="t.key"
            class="crm-tab"
            :class="{ active: activeTier === t.key }"
            @tap="switchTier(t.key)"
          >
            <text class="crm-tab-txt" :class="{ active: activeTier === t.key }">{{ t.label }} {{ t.count }}</text>
          </view>
        </scroll-view>

        <!-- 客户列表 -->
        <view v-if="clients.length === 0" class="crm-state">
          <text class="crm-state-txt">{{ activeTier ? '该分层暂无客户' : '还没有客户档案，点右下角添加' }}</text>
        </view>
        <view v-else class="crm-list">
          <view v-for="c in clients" :key="c.id" class="crm-cli-item" @tap="goDetail(c.id)">
            <view class="crm-cli-avatar"><text class="crm-cli-avatar-txt">{{ c.name.slice(0, 1) }}</text></view>
            <view class="crm-cli-main">
              <view class="crm-cli-top">
                <text class="crm-cli-name">{{ c.name }}</text>
                <view class="crm-tier" :class="c.tier.toLowerCase()"><text class="crm-tier-txt">{{ tierLabel[c.tier] }}</text></view>
              </view>
              <text class="crm-cli-meta">
                {{ c.serveCount }} 次服务 · 累计 ¥{{ c.totalSpend }}{{ c.lastServeAt ? ' · 最近 ' + fmtDate(c.lastServeAt) : ' · 未服务' }}
              </text>
              <view v-if="c.tags.length" class="crm-cli-tags">
                <view v-for="tag in c.tags.slice(0, 3)" :key="tag" class="crm-cli-tag"><text class="crm-cli-tag-txt">{{ tag }}</text></view>
              </view>
            </view>
            <text class="crm-cli-arrow">›</text>
          </view>
        </view>
        <view class="crm-bottom-pad" />
      </template>
    </scroll-view>

    <!-- 添加客户 FAB -->
    <view class="crm-fab" @tap="navigateTo('/pkg-mine/crm/edit')"><text class="crm-fab-txt">＋</text></view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import AppNavBar from '@/components/common/app-nav-bar.vue'
import { navigateTo } from '@/utils/router'
import {
  crmApi, RFM_TIER_LABEL,
  type CrmClient, type CrmReminder, type CrmSuggestedClient, type RfmTier,
} from '@/lib/crm-data'

const tierLabel = RFM_TIER_LABEL

const loading = ref(true)
const error = ref('')
const clients = ref<CrmClient[]>([])
const tierCounts = ref<Record<RfmTier, number>>({ HIGH_VALUE: 0, ACTIVE: 0, AT_RISK: 0, DORMANT: 0 })
const quota = ref<{ used: number; limit: number | null }>({ used: 0, limit: null })
const reminders = ref<CrmReminder[]>([])
const suggested = ref<CrmSuggestedClient[]>([])
const activeTier = ref<RfmTier | ''>('')
const showAllReminders = ref(false)
const submittingId = ref('')

const visibleReminders = computed(() => (showAllReminders.value ? reminders.value : reminders.value.slice(0, 3)))

const tabs = computed(() => {
  const total = Object.values(tierCounts.value).reduce((a, b) => a + b, 0)
  return [
    { key: '' as const, label: '全部', count: total },
    { key: 'HIGH_VALUE' as const, label: tierLabel.HIGH_VALUE, count: tierCounts.value.HIGH_VALUE },
    { key: 'ACTIVE' as const, label: tierLabel.ACTIVE, count: tierCounts.value.ACTIVE },
    { key: 'AT_RISK' as const, label: tierLabel.AT_RISK, count: tierCounts.value.AT_RISK },
    { key: 'DORMANT' as const, label: tierLabel.DORMANT, count: tierCounts.value.DORMANT },
  ]
})

// 洞察页商机雷达跳转带 tier 参数 → 直落对应分层 tab（洞察只挂数字，名单在本页）
onLoad((query?: Record<string, string>) => {
  const tier = query?.tier
  if (tier && tier in RFM_TIER_LABEL) activeTier.value = tier as RfmTier
})

onShow(() => {
  loadAll()
})

async function loadAll() {
  loading.value = true
  error.value = ''
  try {
    // 提醒/建议为辅助区块：失败静默为空，不阻断客户列表主流程
    const [list, rem, sug] = await Promise.all([
      crmApi.listClients({ tier: activeTier.value, pageSize: 100 }),
      crmApi.reminders('PENDING').catch(() => ({ items: [] as CrmReminder[] })),
      crmApi.suggestedClients().catch(() => ({ items: [] as CrmSuggestedClient[] })),
    ])
    clients.value = list.items
    tierCounts.value = list.tierCounts
    quota.value = list.quota
    reminders.value = rem.items
    suggested.value = sug.items
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

async function switchTier(tier: RfmTier | '') {
  if (activeTier.value === tier) return
  activeTier.value = tier
  try {
    const list = await crmApi.listClients({ tier, pageSize: 100 })
    clients.value = list.items
    tierCounts.value = list.tierCounts
  } catch {
    uni.showToast({ title: '加载失败，请重试', icon: 'none' })
  }
}

/** 话术：无草稿先 AI 生成（失败后端自动降级模板），有草稿直接复制 */
async function onDraft(r: CrmReminder) {
  if (submittingId.value) return
  if (r.aiDraft) {
    uni.setClipboardData({ data: r.aiDraft, success: () => uni.showToast({ title: '话术已复制', icon: 'success' }) })
    return
  }
  submittingId.value = r.id
  try {
    const res = await crmApi.draftReminder(r.id)
    r.aiDraft = res.aiDraft
    uni.setClipboardData({ data: res.aiDraft, success: () => uni.showToast({ title: '话术已生成并复制', icon: 'success' }) })
  } catch {
    uni.showToast({ title: '生成失败，请重试', icon: 'none' })
  } finally {
    submittingId.value = ''
  }
}

async function onDone(r: CrmReminder) {
  if (submittingId.value) return
  submittingId.value = r.id
  try {
    await crmApi.completeReminder(r.id)
    reminders.value = reminders.value.filter((it) => it.id !== r.id)
  } catch {
    uni.showToast({ title: '操作失败，请重试', icon: 'none' })
  } finally {
    submittingId.value = ''
  }
}

/** 订单归因一键入库（只取昵称建档·生辰手机号后续征得同意手补） */
async function onArchive(s: CrmSuggestedClient) {
  if (submittingId.value) return
  submittingId.value = s.orderId
  try {
    await crmApi.fromOrder(s.orderId)
    suggested.value = suggested.value.filter((it) => it.orderId !== s.orderId)
    uni.showToast({ title: '已入库', icon: 'success' })
    const list = await crmApi.listClients({ tier: activeTier.value, pageSize: 100 })
    clients.value = list.items
    tierCounts.value = list.tierCounts
    quota.value = list.quota
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '入库失败', icon: 'none' })
  } finally {
    submittingId.value = ''
  }
}

function goDetail(id: string) {
  navigateTo(`/pkg-mine/crm/detail?id=${id}`)
}

function fmtDate(s: string) {
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getMonth() + 1}月${d.getDate()}日`
}
</script>

<style scoped lang="scss">
/* iOS Safari flex bug：用固定 height 才能让 flex:1 滚动子项正确填充(min-height:100vh 会算出高度0致内容空白) */
.crm-page { height: 100vh; background: #f5f2ee; display: flex; flex-direction: column; }
.crm-scroll { flex: 1; height: 0; min-height: 0; }

.crm-state { padding: 120rpx 0; display: flex; flex-direction: column; align-items: center; gap: 24rpx; }
.crm-state-txt { font-size: 26rpx; color: #999; }
.crm-retry { padding: 12rpx 48rpx; border-radius: 999rpx; background: #c41e3a; }
.crm-retry-txt { font-size: 26rpx; color: #fff; }

.crm-ins-entry { margin: 24rpx 24rpx 0; padding: 24rpx 28rpx; border-radius: 24rpx; background: linear-gradient(135deg, #fff7f2 0%, #fff 60%); border: 1rpx solid #f3e2e5; display: flex; align-items: center; gap: 20rpx; }
.crm-ins-entry-icon { font-size: 40rpx; }
.crm-ins-entry-main { flex: 1; min-width: 0; }
.crm-ins-entry-title { font-size: 28rpx; font-weight: 700; color: #1a1a1a; }
.crm-ins-entry-sub { display: block; margin-top: 4rpx; font-size: 22rpx; color: #999; }
.crm-ins-entry-arrow { font-size: 36rpx; color: #c41e3a; }

.crm-card { margin: 24rpx 24rpx 0; padding: 28rpx; border-radius: 24rpx; background: #fff; }
.crm-card-head { display: flex; align-items: center; gap: 12rpx; margin-bottom: 8rpx; }
.crm-card-title { font-size: 30rpx; font-weight: 700; color: #1a1a1a; }
.crm-card-sub { font-size: 22rpx; color: #999; }
.crm-badge { min-width: 32rpx; height: 32rpx; padding: 0 8rpx; border-radius: 999rpx; background: #c41e3a; display: flex; align-items: center; justify-content: center; box-sizing: border-box; }
.crm-badge-txt { font-size: 20rpx; font-weight: 600; color: #fff; }

.crm-rem-item { margin-top: 20rpx; padding: 20rpx; border-radius: 16rpx; background: #fafafa; }
.crm-rem-top { display: flex; align-items: center; gap: 12rpx; }
.crm-rem-kind { padding: 2rpx 14rpx; border-radius: 8rpx; background: #ffedd5;
  &.birthday { background: #fee2e2; }
  &.lichun { background: #dcfce7; }
  &.repurchase { background: #dbeafe; }
}
.crm-rem-kind-txt { font-size: 20rpx; font-weight: 600; color: #9a3412; }
.crm-rem-name { font-size: 26rpx; font-weight: 600; color: #333; }
.crm-rem-due { margin-left: auto; font-size: 22rpx; color: #999; }
.crm-rem-draft { display: block; margin-top: 12rpx; font-size: 24rpx; line-height: 1.5; color: #666; }
.crm-rem-actions { display: flex; gap: 16rpx; margin-top: 16rpx; }
.crm-rem-more { padding-top: 20rpx; display: flex; justify-content: center; }
.crm-rem-more-txt { font-size: 24rpx; color: #c41e3a; }

.crm-mini-btn { padding: 8rpx 28rpx; border-radius: 999rpx; border: 1rpx solid #e5e5e5; background: #fff;
  &.primary { border-color: #c41e3a; background: #c41e3a; }
  &.disabled { opacity: 0.5; }
}
.crm-mini-btn-txt { font-size: 24rpx; color: #666;
  &.primary { font-weight: 600; color: #fff; }
}

.crm-sug-item { margin-top: 20rpx; display: flex; align-items: center; gap: 16rpx; }
.crm-sug-main { flex: 1; min-width: 0; }
.crm-sug-name { font-size: 26rpx; font-weight: 600; color: #333; }
.crm-sug-meta { display: block; margin-top: 4rpx; font-size: 22rpx; color: #999; }

.crm-quota { margin: 24rpx 24rpx 0; padding: 16rpx 24rpx; border-radius: 16rpx; background: #fff7ed; }
.crm-quota-txt { font-size: 22rpx; color: #9a3412; line-height: 1.5; }

.crm-tabs { margin-top: 24rpx; padding: 0 24rpx; white-space: nowrap; }
.crm-tab { display: inline-flex; margin-right: 16rpx; padding: 10rpx 28rpx; border-radius: 999rpx; background: #fff;
  &.active { background: #c41e3a; }
}
.crm-tab-txt { font-size: 24rpx; color: #666;
  &.active { color: #fff; font-weight: 600; }
}

.crm-list { margin: 24rpx 24rpx 0; border-radius: 24rpx; background: #fff; overflow: hidden; }
.crm-cli-item { display: flex; align-items: center; gap: 20rpx; padding: 28rpx; border-bottom: 1rpx solid #f5f5f5;
  &:last-child { border-bottom: none; }
}
.crm-cli-avatar { width: 80rpx; height: 80rpx; border-radius: 50%; background: #f3e2e5; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.crm-cli-avatar-txt { font-size: 32rpx; font-weight: 700; color: #c41e3a; }
.crm-cli-main { flex: 1; min-width: 0; }
.crm-cli-top { display: flex; align-items: center; gap: 12rpx; }
.crm-cli-name { font-size: 28rpx; font-weight: 600; color: #1a1a1a; }
.crm-tier { padding: 2rpx 12rpx; border-radius: 8rpx;
  &.high_value { background: #fef3c7; }
  &.active { background: #dcfce7; }
  &.at_risk { background: #ffedd5; }
  &.dormant { background: #f3f4f6; }
}
.crm-tier-txt { font-size: 20rpx; font-weight: 600;
  .crm-tier.high_value & { color: #b45309; }
  .crm-tier.active & { color: #15803d; }
  .crm-tier.at_risk & { color: #c2410c; }
  .crm-tier.dormant & { color: #6b7280; }
}
.crm-cli-meta { display: block; margin-top: 8rpx; font-size: 22rpx; color: #999; }
.crm-cli-tags { display: flex; gap: 8rpx; margin-top: 10rpx; }
.crm-cli-tag { padding: 2rpx 12rpx; border-radius: 8rpx; background: #f5f2ee; }
.crm-cli-tag-txt { font-size: 20rpx; color: #8a6f4d; }
.crm-cli-arrow { font-size: 36rpx; color: #ccc; }

.crm-bottom-pad { height: 160rpx; }

.crm-fab { position: fixed; right: 40rpx; bottom: 80rpx; width: 100rpx; height: 100rpx; border-radius: 50%; background: #c41e3a; display: flex; align-items: center; justify-content: center; box-shadow: 0 8rpx 24rpx rgba(196, 30, 58, 0.35); }
.crm-fab-txt { font-size: 48rpx; color: #fff; }
</style>
