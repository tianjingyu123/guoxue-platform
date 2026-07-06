<template>
  <view class="cd-page">
    <app-nav-bar title="客户详情" :show-back="true" background="#C41E3A" color="#ffffff" :no-border="true" />

    <scroll-view scroll-y class="cd-scroll">
      <!-- 三态 -->
      <view v-if="loading" class="cd-state"><text class="cd-state-txt">加载中...</text></view>
      <view v-else-if="error" class="cd-state">
        <text class="cd-state-txt">{{ error }}</text>
        <view class="cd-retry" @tap="load"><text class="cd-retry-txt">重试</text></view>
      </view>

      <template v-else-if="client">
        <!-- 档案卡 -->
        <view class="cd-card">
          <view class="cd-head">
            <view class="cd-avatar"><text class="cd-avatar-txt">{{ client.name.slice(0, 1) }}</text></view>
            <view class="cd-head-main">
              <view class="cd-name-row">
                <text class="cd-name">{{ client.name }}</text>
                <view class="cd-tier" :class="client.tier.toLowerCase()"><text class="cd-tier-txt">{{ tierLabel[client.tier] }}</text></view>
              </view>
              <text class="cd-source">{{ sourceLabel[client.source] || client.source }}{{ client.gender ? ' · ' + (client.gender === 'male' ? '男' : '女') : '' }}</text>
            </view>
            <view class="cd-edit-btn" @tap="navigateTo(`/pkg-mine/crm/edit?id=${client.id}`)"><text class="cd-edit-btn-txt">编辑</text></view>
          </view>

          <view v-if="client.phone" class="cd-row" @tap="copy(client.phone)">
            <text class="cd-row-label">联系电话</text>
            <text class="cd-row-value">{{ client.phone }}</text>
            <text class="cd-row-op">复制</text>
          </view>
          <view v-if="client.birth" class="cd-row">
            <text class="cd-row-label">生辰</text>
            <text class="cd-row-value">{{ client.birth }}</text>
            <text class="cd-row-op muted">仅用于提醒</text>
          </view>
          <view v-if="client.tags.length" class="cd-tags">
            <view v-for="tag in client.tags" :key="tag" class="cd-tag"><text class="cd-tag-txt">{{ tag }}</text></view>
          </view>
          <text v-if="client.notes" class="cd-notes">{{ client.notes }}</text>
        </view>

        <!-- RFM 统计 -->
        <view class="cd-card cd-stats">
          <view class="cd-stat"><text class="cd-stat-val">{{ client.serveCount }}</text><text class="cd-stat-label">服务次数</text></view>
          <view class="cd-stat"><text class="cd-stat-val">¥{{ client.totalSpend }}</text><text class="cd-stat-label">累计消费</text></view>
          <view class="cd-stat"><text class="cd-stat-val">{{ client.lastServeAt ? fmtDate(client.lastServeAt) : '—' }}</text><text class="cd-stat-label">最近服务</text></view>
        </view>

        <!-- 待办提醒 -->
        <view v-if="client.reminders.length" class="cd-card">
          <text class="cd-card-title">待跟进</text>
          <view v-for="r in client.reminders" :key="r.id" class="cd-rem-item">
            <text class="cd-rem-kind">{{ kindLabel[r.kind] || r.kind }}</text>
            <text class="cd-rem-due">{{ fmtDate(r.dueAt) }}</text>
          </view>
        </view>

        <!-- 服务记录 -->
        <view class="cd-card">
          <view class="cd-log-head">
            <text class="cd-card-title">服务记录</text>
            <view class="cd-add-log" @tap="openLogForm"><text class="cd-add-log-txt">＋ 记一笔</text></view>
          </view>
          <view v-if="client.serveLogs.length === 0" class="cd-log-empty"><text class="cd-log-empty-txt">还没有服务记录，服务后记一笔，分层更精准</text></view>
          <view v-for="log in client.serveLogs" :key="log.id" class="cd-log-item">
            <view class="cd-log-top">
              <view class="cd-log-type"><text class="cd-log-type-txt">{{ serveTypeLabel[log.type] || log.type }}</text></view>
              <text v-if="log.amount !== null" class="cd-log-amount">¥{{ log.amount }}</text>
              <text class="cd-log-date">{{ fmtDate(log.servedAt) }}</text>
            </view>
            <text class="cd-log-summary">{{ log.summary }}</text>
          </view>
        </view>

        <!-- 删除（客户可要求删除·硬删+审计留痕） -->
        <view class="cd-delete" :class="{ disabled: submitting }" @tap="onDelete">
          <text class="cd-delete-txt">删除客户档案</text>
        </view>
        <text class="cd-delete-note">客户要求删除时使用：档案与全部服务记录、提醒将被永久删除</text>
        <view class="cd-bottom-pad" />
      </template>
    </scroll-view>

    <!-- 记服务弹层 -->
    <view v-if="showLogForm" class="cd-mask" @tap.self="showLogForm = false">
      <view class="cd-sheet">
        <text class="cd-sheet-title">添加服务记录</text>
        <view class="cd-kinds">
          <view v-for="(label, key) in serveTypeLabel" :key="key" class="cd-kind" :class="{ active: logForm.type === key }" @tap="logForm.type = key">
            <text class="cd-kind-txt" :class="{ active: logForm.type === key }">{{ label }}</text>
          </view>
        </view>
        <input v-model="logForm.amount" class="cd-input" type="digit" placeholder="金额（选填·元）" placeholder-class="cd-ph" />
        <textarea v-model="logForm.summary" class="cd-textarea" :maxlength="200" placeholder="服务摘要，如：流年运势咨询1小时，聊了事业方向" placeholder-class="cd-ph" />
        <view class="cd-sheet-btn" :class="{ disabled: submitting }" @tap="onAddLog">
          <text class="cd-sheet-btn-txt">{{ submitting ? '保存中...' : '保存' }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import AppNavBar from '@/components/common/app-nav-bar.vue'
import { navigateTo } from '@/utils/router'
import { crmApi, RFM_TIER_LABEL, SERVE_TYPE_LABEL, type CrmClientDetail } from '@/lib/crm-data'

const tierLabel = RFM_TIER_LABEL
const serveTypeLabel = SERVE_TYPE_LABEL
const kindLabel: Record<string, string> = { BIRTHDAY: '生日关怀', LICHUN: '立春流年', REPURCHASE: '复购关怀', DAYUN: '大运切换' }
const sourceLabel: Record<string, string> = { manual: '手工录入', card: '名片来源', order: '订单归因入库' }

const clientId = ref('')
const loading = ref(true)
const error = ref('')
const client = ref<CrmClientDetail | null>(null)
const submitting = ref(false)
const showLogForm = ref(false)
const logForm = reactive<{ type: string; amount: string; summary: string }>({ type: 'consult', amount: '', summary: '' })

onLoad((options) => {
  clientId.value = String(options?.id || '')
})

onShow(() => {
  // 缺参落错误态而非白屏（真机走查教训）
  if (!clientId.value) {
    loading.value = false
    error.value = '缺少客户ID'
    return
  }
  load()
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    client.value = await crmApi.getClient(clientId.value)
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

function copy(text: string) {
  uni.setClipboardData({ data: text, success: () => uni.showToast({ title: '已复制', icon: 'success' }) })
}

function openLogForm() {
  logForm.type = 'consult'
  logForm.amount = ''
  logForm.summary = ''
  showLogForm.value = true
}

async function onAddLog() {
  if (submitting.value) return
  const summary = logForm.summary.trim()
  if (!summary) {
    uni.showToast({ title: '请填写服务摘要', icon: 'none' })
    return
  }
  const amountNum = logForm.amount.trim() === '' ? undefined : Number(logForm.amount)
  if (amountNum !== undefined && (!Number.isFinite(amountNum) || amountNum < 0)) {
    uni.showToast({ title: '金额格式不正确', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    await crmApi.addServeLog(clientId.value, { type: logForm.type, amount: amountNum, summary })
    showLogForm.value = false
    uni.showToast({ title: '已记录', icon: 'success' })
    await load()
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '保存失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

function onDelete() {
  if (submitting.value || !client.value) return
  uni.showModal({
    title: '删除客户档案',
    content: `确定永久删除「${client.value.name}」的档案吗？服务记录与提醒将一并删除，不可恢复。`,
    confirmColor: '#c41e3a',
    success: async (res) => {
      if (!res.confirm) return
      submitting.value = true
      try {
        await crmApi.deleteClient(clientId.value)
        uni.showToast({ title: '已删除', icon: 'success' })
        setTimeout(() => uni.navigateBack(), 600)
      } catch (e) {
        uni.showToast({ title: (e as Error)?.message || '删除失败', icon: 'none' })
      } finally {
        submitting.value = false
      }
    },
  })
}

function fmtDate(s: string) {
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
</script>

<style scoped lang="scss">
/* iOS Safari flex bug：用固定 height 才能让 flex:1 滚动子项正确填充(min-height:100vh 会算出高度0致内容空白) */
.cd-page { height: 100vh; background: #f5f2ee; display: flex; flex-direction: column; }
.cd-scroll { flex: 1; height: 0; min-height: 0; }

.cd-state { padding: 120rpx 0; display: flex; flex-direction: column; align-items: center; gap: 24rpx; }
.cd-state-txt { font-size: 26rpx; color: #999; }
.cd-retry { padding: 12rpx 48rpx; border-radius: 999rpx; background: #c41e3a; }
.cd-retry-txt { font-size: 26rpx; color: #fff; }

.cd-card { margin: 24rpx 24rpx 0; padding: 28rpx; border-radius: 24rpx; background: #fff; }
.cd-card-title { font-size: 30rpx; font-weight: 700; color: #1a1a1a; }

.cd-head { display: flex; align-items: center; gap: 20rpx; }
.cd-avatar { width: 96rpx; height: 96rpx; border-radius: 50%; background: #f3e2e5; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.cd-avatar-txt { font-size: 40rpx; font-weight: 700; color: #c41e3a; }
.cd-head-main { flex: 1; min-width: 0; }
.cd-name-row { display: flex; align-items: center; gap: 12rpx; }
.cd-name { font-size: 34rpx; font-weight: 700; color: #1a1a1a; }
.cd-tier { padding: 2rpx 12rpx; border-radius: 8rpx;
  &.high_value { background: #fef3c7; }
  &.active { background: #dcfce7; }
  &.at_risk { background: #ffedd5; }
  &.dormant { background: #f3f4f6; }
}
.cd-tier-txt { font-size: 20rpx; font-weight: 600;
  .cd-tier.high_value & { color: #b45309; }
  .cd-tier.active & { color: #15803d; }
  .cd-tier.at_risk & { color: #c2410c; }
  .cd-tier.dormant & { color: #6b7280; }
}
.cd-source { display: block; margin-top: 8rpx; font-size: 22rpx; color: #999; }
.cd-edit-btn { padding: 8rpx 28rpx; border-radius: 999rpx; border: 1rpx solid #c41e3a; }
.cd-edit-btn-txt { font-size: 24rpx; color: #c41e3a; }

.cd-row { display: flex; align-items: center; gap: 16rpx; margin-top: 24rpx; }
.cd-row-label { font-size: 24rpx; color: #999; width: 130rpx; }
.cd-row-value { flex: 1; font-size: 26rpx; color: #333; }
.cd-row-op { font-size: 22rpx; color: #c41e3a;
  &.muted { color: #bbb; }
}
.cd-tags { display: flex; flex-wrap: wrap; gap: 12rpx; margin-top: 24rpx; }
.cd-tag { padding: 4rpx 16rpx; border-radius: 8rpx; background: #f5f2ee; }
.cd-tag-txt { font-size: 22rpx; color: #8a6f4d; }
.cd-notes { display: block; margin-top: 20rpx; padding: 16rpx 20rpx; border-radius: 12rpx; background: #fafafa; font-size: 24rpx; line-height: 1.6; color: #666; }

.cd-stats { display: flex; }
.cd-stat { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8rpx; }
.cd-stat-val { font-size: 32rpx; font-weight: 700; color: #1a1a1a; }
.cd-stat-label { font-size: 22rpx; color: #999; }

.cd-rem-item { display: flex; align-items: center; justify-content: space-between; margin-top: 20rpx; padding: 16rpx 20rpx; border-radius: 12rpx; background: #fff7ed; }
.cd-rem-kind { font-size: 24rpx; font-weight: 600; color: #9a3412; }
.cd-rem-due { font-size: 22rpx; color: #999; }

.cd-log-head { display: flex; align-items: center; justify-content: space-between; }
.cd-add-log { padding: 6rpx 24rpx; border-radius: 999rpx; background: #c41e3a; }
.cd-add-log-txt { font-size: 22rpx; color: #fff; }
.cd-log-empty { padding: 40rpx 0; display: flex; justify-content: center; }
.cd-log-empty-txt { font-size: 24rpx; color: #bbb; }
.cd-log-item { margin-top: 20rpx; padding: 20rpx; border-radius: 16rpx; background: #fafafa; }
.cd-log-top { display: flex; align-items: center; gap: 12rpx; }
.cd-log-type { padding: 2rpx 14rpx; border-radius: 8rpx; background: #ede9fe; }
.cd-log-type-txt { font-size: 20rpx; font-weight: 600; color: #6d28d9; }
.cd-log-amount { font-size: 24rpx; font-weight: 600; color: #c41e3a; }
.cd-log-date { margin-left: auto; font-size: 22rpx; color: #999; }
.cd-log-summary { display: block; margin-top: 12rpx; font-size: 24rpx; line-height: 1.5; color: #555; }

.cd-delete { margin: 40rpx 24rpx 0; padding: 22rpx; border-radius: 24rpx; background: #fff; display: flex; justify-content: center;
  &.disabled { opacity: 0.5; }
}
.cd-delete-txt { font-size: 28rpx; color: #dc2626; }
.cd-delete-note { display: block; margin: 12rpx 48rpx 0; font-size: 20rpx; color: #bbb; text-align: center; line-height: 1.5; }
.cd-bottom-pad { height: 80rpx; }

.cd-mask { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: flex-end; z-index: 100; }
.cd-sheet { width: 100%; padding: 40rpx 32rpx calc(40rpx + env(safe-area-inset-bottom)); border-radius: 32rpx 32rpx 0 0; background: #fff; box-sizing: border-box; }
.cd-sheet-title { font-size: 32rpx; font-weight: 700; color: #1a1a1a; }
.cd-kinds { display: flex; gap: 16rpx; margin-top: 28rpx; }
.cd-kind { flex: 1; padding: 14rpx 0; border-radius: 12rpx; background: #f5f5f5; display: flex; justify-content: center;
  &.active { background: #c41e3a; }
}
.cd-kind-txt { font-size: 24rpx; color: #666;
  &.active { color: #fff; font-weight: 600; }
}
.cd-input { margin-top: 24rpx; padding: 20rpx 24rpx; border-radius: 12rpx; background: #f8f8f8; font-size: 26rpx; }
.cd-textarea { margin-top: 24rpx; padding: 20rpx 24rpx; border-radius: 12rpx; background: #f8f8f8; font-size: 26rpx; width: 100%; height: 160rpx; box-sizing: border-box; }
.cd-ph { color: #bbb; }
.cd-sheet-btn { margin-top: 32rpx; padding: 24rpx; border-radius: 999rpx; background: #c41e3a; display: flex; justify-content: center;
  &.disabled { opacity: 0.5; }
}
.cd-sheet-btn-txt { font-size: 28rpx; font-weight: 600; color: #fff; }
</style>
