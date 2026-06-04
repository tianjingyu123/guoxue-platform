<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="header">
      <view class="header-inner">
        <text
          class="back-btn"
          @click="goBack"
        >
          ←
        </text>
        <text class="header-title">
          邀请记录
        </text>
        <text
          class="header-share"
          @click="showLinkSheet = true"
        >
          📤
        </text>
      </view>
    </view>

    <view class="content">
      <!-- 统计卡片 -->
      <view class="stats-card">
        <view class="stats-grid">
          <view
            v-for="s in statItems"
            :key="s.label"
            class="stats-item"
          >
            <view class="stats-icon-wrap">
              <text class="stats-icon">
                {{ s.icon }}
              </text>
            </view>
            <text class="stats-value">
              {{ s.value }}
            </text>
            <text class="stats-label">
              {{ s.label }}
            </text>
          </view>
        </view>
        <view
          v-if="pendingEarnings > 0"
          class="stats-pending"
        >
          <text class="stats-pending-label">
            待结算收益
          </text>
          <text class="stats-pending-value">
            ¥{{ pendingEarnings.toFixed(2) }}
          </text>
        </view>
      </view>

      <!-- 邀请链接快捷入口 -->
      <view
        class="link-entry"
        @click="showLinkSheet = true"
      >
        <view class="link-entry-icon-wrap">
          <text class="link-entry-icon">
            🔗
          </text>
        </view>
        <view class="link-entry-info">
          <text class="link-entry-title">
            我的邀请链接
          </text>
          <text class="link-entry-code">
            邀请码：{{ linkInfo.inviteCode }}
          </text>
        </view>
        <text class="link-entry-arrow">
          →
        </text>
      </view>

      <!-- 筛选 -->
      <view class="filter-tabs">
        <view
          v-for="f in filters"
          :key="f.value"
          class="filter-tab"
          :class="{ active: filter === f.value }"
          @click="switchFilter(f.value)"
        >
          {{ f.label }}
        </view>
      </view>

      <!-- 邀请记录列表 -->
      <DataState
        :is-loading="loading"
        :error="loadError"
        :is-empty="!loading && records.length === 0"
        empty-icon="👥"
        empty-title="暂无邀请记录"
        skeleton-type="list"
        @retry="loadData"
      >
        <view class="records-list">
          <view
            v-for="record in records"
            :key="record.id"
            class="record-item"
          >
            <image
              v-if="record.invitee.avatar"
              :src="record.invitee.avatar"
              class="record-avatar"
              mode="aspectFill"
            />
            <view
              v-else
              class="record-avatar-placeholder"
            >
              <text class="record-avatar-text">
                {{ (record.invitee.nickname || '?').slice(0, 1) }}
              </text>
            </view>
            <view class="record-info">
              <view class="record-name-row">
                <text class="record-name">
                  {{ record.invitee.nickname }}
                </text>
                <text
                  v-if="record.status === 'vip'"
                  class="record-crown"
                >
                  👑
                </text>
              </view>
              <text class="record-phone">
                {{ record.invitee.phone }}
              </text>
              <text class="record-date">
                注册：{{ record.registeredAt }}
              </text>
              <text
                v-if="record.paidAt"
                class="record-paid"
              >
                首付：{{ record.paidAt }} · 累计 ¥{{ record.paidAmount }}
              </text>
            </view>
            <view class="record-right">
              <text
                class="record-status-badge"
                :class="'rsb-' + record.status"
              >
                {{ statusLabel(record.status) }}
              </text>
              <text
                v-if="record.commission > 0"
                class="record-commission"
              >
                +¥{{ record.commission.toFixed(2) }}
              </text>
              <text
                v-if="record.pendingCommission > 0"
                class="record-pending-commission"
              >
                待结算 ¥{{ record.pendingCommission.toFixed(2) }}
              </text>
            </view>
          </view>
        </view>
      </DataState>
    </view>

    <!-- 邀请链接弹窗 -->
    <view
      v-if="showLinkSheet"
      class="sheet-overlay"
      @click="showLinkSheet = false"
    >
      <view
        class="sheet-content"
        @click.stop
      >
        <view class="sheet-header">
          <text class="sheet-title">
            邀请好友
          </text>
          <text
            class="sheet-close"
            @click="showLinkSheet = false"
          >
            ✕
          </text>
        </view>

        <!-- 二维码 -->
        <view class="qrcode-area">
          <view class="qrcode-box">
            <text class="qrcode-placeholder-icon">
              📱
            </text>
          </view>
        </view>

        <!-- 邀请码 -->
        <view class="invite-code-area">
          <text class="invite-code-label">
            我的邀请码
          </text>
          <text class="invite-code-value">
            {{ linkInfo.inviteCode }}
          </text>
        </view>

        <!-- 邀请链接 -->
        <view class="invite-link-box">
          <text class="invite-link-label">
            邀请链接
          </text>
          <text class="invite-link-text">
            {{ linkInfo.inviteLink }}
          </text>
        </view>

        <!-- 操作按钮 -->
        <view class="sheet-buttons">
          <view
            class="sheet-btn-outline"
            :class="{ disabled: regenerating }"
            @click="handleRegenerate"
          >
            {{ regenerating ? '生成中...' : '🔄 重新生成' }}
          </view>
          <view
            class="sheet-btn-primary"
            @click="handleCopy"
          >
            {{ copied ? '✅ 已复制' : '📋 复制链接' }}
          </view>
        </view>

        <text class="sheet-rule">
          好友通过链接注册并付费后，您将获得相应佣金奖励
        </text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import DataState from '../../components/DataState.vue'

interface InviteeInfo {
  nickname: string
  avatar?: string
  phone: string
}

interface InviteRecord {
  id: string
  invitee: InviteeInfo
  status: 'registered' | 'paid' | 'vip'
  registeredAt: string
  paidAt?: string
  paidAmount?: number
  commission: number
  pendingCommission: number
}

interface InviteLinkInfo {
  inviteCode: string
  inviteLink: string
  qrCodeUrl?: string
}

const loading = ref(true)
const loadError = ref<string | null>(null)
const records = ref<InviteRecord[]>([])
const filter = ref<'all' | 'registered' | 'paid' | 'vip'>('all')
const showLinkSheet = ref(false)
const copied = ref(false)
const regenerating = ref(false)

const totalInvited = ref(0)
const registeredCount = ref(0)
const paidCount = ref(0)
const totalEarnings = ref(0)
const pendingEarnings = ref(0)

const linkInfo = ref<InviteLinkInfo>({
  inviteCode: 'GX2024ABC',
  inviteLink: 'https://guoxue.cn/invite/GX2024ABC',
})

const filters = [
  { label: '全部', value: 'all' },
  { label: '已注册', value: 'registered' },
  { label: '已付费', value: 'paid' },
  { label: '会员', value: 'vip' },
]

const statItems = [
  { icon: '👥', label: '邀请人数', value: ref(0) },
  { icon: '✅', label: '已注册', value: ref(0) },
  { icon: '💳', label: '已付费', value: ref(0) },
  { icon: '💰', label: '总收益', value: ref(0) },
]

function statusLabel(status: string): string {
  const map: Record<string, string> = { registered: '已注册', paid: '已付费', vip: '会员' }
  return map[status] || status
}

function switchFilter(val: string) {
  filter.value = val as any
  loadData()
}

async function loadData() {
  loading.value = true
  loadError.value = null
  try {
    await new Promise((r) => setTimeout(r, 500))
    totalInvited.value = 12
    registeredCount.value = 10
    paidCount.value = 5
    totalEarnings.value = 1280
    pendingEarnings.value = 360

    records.value = [
      {
        id: '1', status: 'paid',
        invitee: { nickname: '学习者小王', avatar: '', phone: '138****1234' },
        registeredAt: '2026-05-20', paidAt: '2026-05-21', paidAmount: 299,
        commission: 59.8, pendingCommission: 0,
      },
      {
        id: '2', status: 'vip',
        invitee: { nickname: '传统文化粉', avatar: '', phone: '139****5678' },
        registeredAt: '2026-05-15', paidAt: '2026-05-16', paidAmount: 999,
        commission: 199.8, pendingCommission: 0,
      },
      {
        id: '3', status: 'registered',
        invitee: { nickname: '易学爱好者', avatar: '', phone: '136****9012' },
        registeredAt: '2026-05-25',
        commission: 0, pendingCommission: 0,
      },
    ]
  } catch (e: any) {
    loadError.value = e?.errMsg || e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function handleCopy() {
  uni.setClipboardData({ data: linkInfo.value.inviteLink })
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
  uni.showToast({ title: '已复制', icon: 'success' })
}

async function handleRegenerate() {
  regenerating.value = true
  await new Promise((r) => setTimeout(r, 1000))
  linkInfo.value = {
    inviteCode: 'GX' + Math.random().toString(36).slice(2, 8).toUpperCase(),
    inviteLink: 'https://guoxue.cn/invite/' + linkInfo.value.inviteCode,
  }
  regenerating.value = false
  uni.showToast({ title: '已重新生成', icon: 'success' })
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; }
.header { background: #F5F0E8; border-bottom: 1rpx solid #E8E3DB; }
.header-inner { display: flex; align-items: center; justify-content: space-between; height: 88rpx; padding: 0 24rpx; }
.back-btn { font-size: 36rpx; color: #2C2C2C; padding: 8rpx; }
.header-title { font-size: 34rpx; font-weight: 600; color: #2C2C2C; }
.header-share { font-size: 36rpx; padding: 8rpx; }

.content { padding: 24rpx; }

/* 统计卡片 */
.stats-card { background: linear-gradient(135deg, #C41E3A, #A01830); border-radius: 24rpx; padding: 32rpx 24rpx; margin-bottom: 24rpx; box-shadow: 0 4rpx 20rpx rgba(196,30,58,0.3); }
.stats-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8rpx; }
.stats-item { text-align: center; }
.stats-icon-wrap { width: 56rpx; height: 56rpx; border-radius: 50%; background: rgba(255,255,255,0.15); display: flex; align-items: center; justify-content: center; margin: 0 auto 8rpx; }
.stats-icon { font-size: 28rpx; }
.stats-value { font-size: 36rpx; font-weight: 700; color: #fff; display: block; }
.stats-label { font-size: 18rpx; color: rgba(255,255,255,0.7); display: block; margin-top: 4rpx; }
.stats-pending { display: flex; justify-content: space-between; align-items: center; margin-top: 16rpx; padding-top: 16rpx; border-top: 1rpx solid rgba(255,255,255,0.2); }
.stats-pending-label { font-size: 22rpx; color: rgba(255,255,255,0.7); }
.stats-pending-value { font-size: 26rpx; font-weight: 600; color: #C9A96E; }

/* 链接快捷入口 */
.link-entry { display: flex; align-items: center; gap: 16rpx; background: #fff; border-radius: 20rpx; padding: 24rpx; margin-bottom: 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.link-entry-icon-wrap { width: 72rpx; height: 72rpx; border-radius: 14rpx; background: #FDE8E8; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.link-entry-icon { font-size: 32rpx; }
.link-entry-info { flex: 1; }
.link-entry-title { font-size: 26rpx; font-weight: 500; color: #2C2C2C; display: block; }
.link-entry-code { font-size: 22rpx; color: #999; margin-top: 4rpx; display: block; }
.link-entry-arrow { font-size: 32rpx; color: #B8B0A4; }

/* 筛选 */
.filter-tabs { display: flex; gap: 12rpx; margin-bottom: 20rpx; }
.filter-tab { padding: 10rpx 28rpx; border-radius: 28rpx; font-size: 22rpx; background: #fff; color: #666; border: 1rpx solid #E8E3DB; }
.filter-tab.active { background: #C41E3A; color: #fff; border-color: #C41E3A; font-weight: 500; }

/* 记录列表 */
.records-list { display: flex; flex-direction: column; gap: 12rpx; }
.record-item { display: flex; gap: 16rpx; background: #fff; border-radius: 20rpx; padding: 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.record-avatar { width: 72rpx; height: 72rpx; border-radius: 50%; flex-shrink: 0; }
.record-avatar-placeholder { width: 72rpx; height: 72rpx; border-radius: 50%; background: #F5F0E8; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.record-avatar-text { font-size: 24rpx; color: #C9A96E; font-weight: 500; }
.record-info { flex: 1; min-width: 0; }
.record-name-row { display: flex; align-items: center; gap: 6rpx; }
.record-name { font-size: 26rpx; font-weight: 500; color: #2C2C2C; }
.record-crown { font-size: 24rpx; }
.record-phone { font-size: 20rpx; color: #B8B0A4; display: block; margin-top: 4rpx; }
.record-date { font-size: 20rpx; color: #B8B0A4; display: block; margin-top: 4rpx; }
.record-paid { font-size: 20rpx; color: #B8B0A4; display: block; }
.record-right { text-align: right; flex-shrink: 0; }
.record-status-badge { font-size: 18rpx; padding: 4rpx 16rpx; border-radius: 16rpx; display: inline-block; }
.rsb-registered { background: #E3F2FD; color: #1976D2; }
.rsb-paid { background: #E8F5E9; color: #22C55E; }
.rsb-vip { background: #FFF8E1; color: #F59E0B; }
.record-commission { font-size: 28rpx; font-weight: 700; color: #C41E3A; display: block; margin-top: 8rpx; }
.record-pending-commission { font-size: 18rpx; color: #B8B0A4; display: block; margin-top: 4rpx; }

/* 底部弹窗 */
.sheet-overlay { position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,0.5); }
.sheet-content { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-radius: 32rpx 32rpx 0 0; padding: 24rpx 32rpx 48rpx; animation: slideUp 0.3s ease; }
.sheet-header { display: flex; align-items: center; justify-content: center; position: relative; margin-bottom: 24rpx; }
.sheet-title { font-size: 30rpx; font-weight: 600; color: #2C2C2C; }
.sheet-close { position: absolute; right: 0; font-size: 28rpx; color: #999; padding: 8rpx; }

.qrcode-area { display: flex; justify-content: center; margin-bottom: 24rpx; }
.qrcode-box { width: 320rpx; height: 320rpx; background: #fff; border-radius: 16rpx; border: 1rpx solid #E8E3DB; display: flex; align-items: center; justify-content: center; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }
.qrcode-placeholder-icon { font-size: 96rpx; color: #D0C8B8; }

.invite-code-area { text-align: center; margin-bottom: 24rpx; }
.invite-code-label { font-size: 22rpx; color: #999; display: block; margin-bottom: 8rpx; }
.invite-code-value { font-size: 48rpx; font-weight: 700; color: #C41E3A; letter-spacing: 4rpx; }

.invite-link-box { background: #FAF8F5; border-radius: 16rpx; padding: 20rpx; margin-bottom: 24rpx; }
.invite-link-label { font-size: 20rpx; color: #999; display: block; margin-bottom: 8rpx; }
.invite-link-text { font-size: 22rpx; color: #2C2C2C; word-break: break-all; }

.sheet-buttons { display: grid; grid-template-columns: 1fr 1fr; gap: 16rpx; margin-bottom: 24rpx; }
.sheet-btn-outline { height: 80rpx; border-radius: 16rpx; border: 1rpx solid #C9A96E; color: #C9A96E; font-size: 24rpx; font-weight: 500; display: flex; align-items: center; justify-content: center; }
.sheet-btn-outline.disabled { opacity: 0.5; }
.sheet-btn-primary { height: 80rpx; border-radius: 16rpx; background: #C41E3A; color: #fff; font-size: 24rpx; font-weight: 500; display: flex; align-items: center; justify-content: center; }

.sheet-rule { font-size: 20rpx; color: #B8B0A4; text-align: center; display: block; }

@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
</style>
