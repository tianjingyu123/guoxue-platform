<template>
  <view v-if="isLoading" class="quota-page">
    <view style="padding: 24rpx;">
      <AppSkeleton width="100%" height="88rpx" radius="0" mb="24rpx" />
      <AppSkeleton width="100%" height="200rpx" radius="24rpx" mb="24rpx" />
      <AppSkeleton width="100%" height="60rpx" radius="0" mb="24rpx" />
      <AppSkeleton width="100%" height="300rpx" radius="24rpx" />
    </view>
  </view>
  <AppError v-else-if="loadError" :desc="loadError" @retry="reload" />
  <AppEmpty v-else-if="isEmpty" title="暂无数据" />
  <view v-else class="quota-page">
    <app-nav-bar
      title="名额管理"
      :show-back="true"
      background="#7c3aed"
      color="#ffffff"
      :no-border="true"
    />

    <!-- 名额概览 -->
    <view class="quota-sec quota-overview-wrap">
      <view class="quota-overview-card">
        <view class="quota-ov-head">
          <view class="quota-ov-title">
            <app-icon
              name="layers"
              :size="28"
              color="#ffffff"
            /><text class="quota-ov-title-txt">
              分站名额
            </text>
          </view>
          <text class="quota-ov-badge">
            ¥{{ data.price }}/个
          </text>
        </view>
        <view class="quota-ov-grid">
          <view class="quota-ov-item">
            <text class="quota-ov-num">
              {{ data.total }}
            </text><text class="quota-ov-sub">
              总名额
            </text>
          </view>
          <view class="quota-ov-item">
            <text class="quota-ov-num">
              {{ data.used }}
            </text><text class="quota-ov-sub">
              自用
            </text>
          </view>
          <view class="quota-ov-item">
            <text class="quota-ov-num c-success">
              {{ data.sold }}
            </text><text class="quota-ov-sub">
              已售
            </text>
          </view>
          <view class="quota-ov-item">
            <text class="quota-ov-num c-gold">
              {{ data.gifted }}
            </text><text class="quota-ov-sub">
              已赠
            </text>
          </view>
          <view class="quota-ov-item">
            <text class="quota-ov-num c-gold">
              {{ data.available }}
            </text><text class="quota-ov-sub">
              可用
            </text>
          </view>
        </view>
        <view class="quota-ov-income">
          <text class="quota-ov-income-txt">
            已售名额收入：<text class="c-success bold">
              ¥{{ data.sold * data.price }}
            </text>
          </text>
        </view>
      </view>
    </view>

    <!-- 操作区 -->
    <view class="quota-sec">
      <view class="quota-card">
        <text class="quota-card-title">
          分配名额
        </text>
        <view class="quota-actions">
          <view
            class="quota-action-btn success-btn"
            @tap="showQrDialog = true"
          >
            <view class="quota-action-icon success-icon">
              <app-icon
                name="link-2"
                :size="30"
                color="#16a34a"
              />
            </view>
            <text class="quota-action-label">
              分享购买链接
            </text>
            <text class="quota-action-desc">
              用户付费¥{{ data.price }}购买
            </text>
          </view>
          <view
            class="quota-action-btn"
            :class="data.available > 0 ? 'gold-btn' : 'disabled-btn'"
            @tap="onGiftClick"
          >
            <view
              class="quota-action-icon"
              :class="data.available > 0 ? 'gold-icon' : 'disabled-icon'"
            >
              <app-icon
                name="gift"
                :size="30"
                :color="data.available > 0 ? '#C9A96E' : '#bbb'"
              />
            </view>
            <text
              class="quota-action-label"
              :class="{ disabled: data.available === 0 }"
            >
              免费赠送
            </text>
            <text class="quota-action-desc">
              {{ data.available > 0 ? `剩余${data.available}个可赠送` : '暂无可用名额' }}
            </text>
          </view>
        </view>
      </view>
    </view>

    <!-- Tab -->
    <view class="quota-sec">
      <view class="quota-tabs">
        <view
          class="quota-tab"
          :class="{ active: activeTab === 'manage' }"
          @tap="activeTab = 'manage'"
        >
          <text class="quota-tab-txt">
            名额记录
          </text>
        </view>
        <view
          class="quota-tab"
          :class="{ active: activeTab === 'rules' }"
          @tap="activeTab = 'rules'"
        >
          <text class="quota-tab-txt">
            使用规则
          </text>
        </view>
      </view>
    </view>

    <!-- 名额记录 -->
    <view
      v-if="activeTab === 'manage'"
      class="quota-sec quota-list"
    >
      <view
        v-for="r in records"
        :key="r.id"
        class="quota-card quota-record"
      >
        <view
          class="quota-record-icon"
          :class="recordIconBg(r.type)"
        >
          <app-icon
            :name="recordIcon(r.type)"
            :size="30"
            :color="recordIconColor(r.type)"
          />
        </view>
        <view class="quota-record-info">
          <view class="quota-record-name-row">
            <text class="quota-record-name">
              {{ r.name }}
            </text>
            <text
              class="quota-badge"
              :class="recordBadgeClass(r.type)"
            >
              {{ recordTypeLabel(r.type) }}
            </text>
          </view>
          <text class="quota-record-meta">
            {{ r.phone ? r.phone + ' · ' : '' }}{{ r.date }}
          </text>
        </view>
        <view
          v-if="r.type === 'sold' && r.amount"
          class="quota-record-income"
        >
          <text class="quota-record-amount c-success">
            +¥{{ r.amount }}
          </text>
          <text class="quota-record-income-label">
            收入
          </text>
        </view>
      </view>
      <view
        v-if="data.available > 0"
        class="quota-empty-card"
      >
        <text class="quota-empty-txt">
          剩余 {{ data.available }} 个名额待分配
        </text>
      </view>
    </view>

    <!-- 使用规则 -->
    <view
      v-if="activeTab === 'rules'"
      class="quota-sec"
    >
      <view class="quota-card">
        <view class="quota-rule">
          <view class="quota-rule-num bg-operator">
            <text class="quota-rule-num-txt c-operator">
              1
            </text>
          </view>
          <view class="quota-rule-body">
            <text class="quota-rule-title">
              名额来源
            </text><text class="quota-rule-desc">
              成为运营商时获赠6个分站名额，其中1个自用，5个可分配给他人
            </text>
          </view>
        </view>
        <view class="quota-rule">
          <view class="quota-rule-num bg-success">
            <text class="quota-rule-num-txt c-success">
              2
            </text>
          </view>
          <view class="quota-rule-body">
            <text class="quota-rule-title">
              分享销售
            </text><text class="quota-rule-desc">
              分享购买链接，用户支付¥{{ data.price }}后自动开通站长权益，款项100%归您所有
            </text>
          </view>
        </view>
        <view class="quota-rule">
          <view class="quota-rule-num bg-gold">
            <text class="quota-rule-num-txt c-gold">
              3
            </text>
          </view>
          <view class="quota-rule-body">
            <text class="quota-rule-title">
              免费赠送
            </text><text class="quota-rule-desc">
              可选择免费赠送给指定用户，用于团队激励或合作伙伴
            </text>
          </view>
        </view>
        <view class="quota-rule">
          <view class="quota-rule-num bg-info">
            <text class="quota-rule-num-txt c-info">
              4
            </text>
          </view>
          <view class="quota-rule-body">
            <text class="quota-rule-title">
              团队奖励
            </text><text class="quota-rule-desc">
              通过您分配的名额开通的站长，其产生的入圈分佣，您额外获得5%管理奖励
            </text>
          </view>
        </view>
        <view class="quota-warn">
          <app-icon
            name="alert-circle"
            :size="28"
            color="#b45309"
          />
          <text class="quota-warn-txt">
            名额一经分配无法收回，请谨慎操作。如需更多名额，可联系平台客服购买。
          </text>
        </view>
      </view>
    </view>

    <!-- 分享链接弹窗 -->
    <view
      v-if="showQrDialog"
      class="quota-mask"
      @tap.self="showQrDialog = false"
    >
      <view class="quota-dialog">
        <text class="quota-dialog-title">
          分享购买链接
        </text>
        <text class="quota-dialog-desc">
          用户通过此链接购买后自动成为您团队的站长
        </text>
        <view class="quota-link-box">
          <text class="quota-link-txt">
            {{ saleLink }}
          </text>
        </view>
        <view class="quota-qr-box">
          <app-icon
            name="qr-code"
            :size="100"
            color="#ccc"
          />
          <text class="quota-qr-hint">
            购买二维码
          </text>
        </view>
        <view class="quota-price-info">
          <text class="quota-price-txt">
            购买价格：<text class="c-primary">
              ¥{{ data.price }}
            </text>
          </text>
          <text class="quota-price-sub">
            款项100%归您所有
          </text>
        </view>
        <view class="quota-dialog-footer">
          <view
            class="quota-dialog-btn outline"
            @tap="copyLink"
          >
            <app-icon
              :name="copied ? 'check' : 'copy'"
              :size="26"
              color="#333"
            /><text class="quota-dialog-btn-txt">
              复制链接
            </text>
          </view>
          <view
            class="quota-dialog-btn operator"
            @tap="toastShare"
          >
            <app-icon
              name="send"
              :size="26"
              color="#ffffff"
            /><text class="quota-dialog-btn-txt light">
              分享
            </text>
          </view>
        </view>
      </view>
    </view>

    <!-- 免费赠送弹窗 -->
    <view
      v-if="showGiftDialog"
      class="quota-mask"
      @tap.self="closeGift"
    >
      <view class="quota-dialog">
        <text class="quota-dialog-title">
          免费赠送名额
        </text>
        <text class="quota-dialog-desc">
          输入用户手机号，将站长名额免费赠送给TA
        </text>
        <view class="quota-form-field">
          <text class="quota-form-label">
            用户手机号
          </text>
          <view class="quota-search-row">
            <input
              v-model="giftPhone"
              class="quota-input"
              placeholder="请输入手机号"
              placeholder-class="quota-input-ph"
              type="number"
              maxlength="11"
            >
            <view
              class="quota-search-btn"
              :class="{ disabled: isSearching || giftPhone.length < 11 }"
              @tap="doSearch"
            >
              <text class="quota-search-btn-txt">
                {{ isSearching ? '搜索中...' : '搜索' }}
              </text>
            </view>
          </view>
        </view>
        <view
          v-if="searchResult"
          class="quota-result"
        >
          <view class="quota-result-row">
            <view class="quota-result-avatar">
              <app-icon
                name="user"
                :size="32"
                color="#C9A96E"
              />
            </view>
            <view class="quota-result-info">
              <text class="quota-result-name">
                {{ searchResult.name }}
              </text><text class="quota-result-phone">
                {{ searchResult.phone }}
              </text>
            </view>
            <text class="quota-badge badge-success">
              已找到
            </text>
          </view>
          <view
            class="quota-form-field"
            style="margin-top: 20rpx;"
          >
            <text class="quota-form-label sm">
              赠送备注（选填）
            </text>
            <input
              v-model="giftName"
              class="quota-input full"
              placeholder="例如：合作伙伴激励"
              placeholder-class="quota-input-ph"
            >
          </view>
        </view>
        <view class="quota-warn">
          <app-icon
            name="alert-circle"
            :size="28"
            color="#b45309"
          />
          <text class="quota-warn-txt">
            赠送后名额无法收回，对方将立即获得1年站长权益
          </text>
        </view>
        <view class="quota-dialog-footer">
          <view
            class="quota-dialog-btn outline"
            @tap="closeGift"
          >
            <text class="quota-dialog-btn-txt">
              取消
            </text>
          </view>
          <view
            class="quota-dialog-btn gold"
            :class="{ disabled: !searchResult }"
            @tap="doGift"
          >
            <app-icon
              name="gift"
              :size="26"
              color="#ffffff"
            /><text class="quota-dialog-btn-txt light">
              确认赠送
            </text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import AppSkeleton from '@/components/common/app-skeleton.vue'
import AppError from '@/components/common/app-error.vue'
import AppEmpty from '@/components/common/app-empty.vue'
import { useAsyncData } from '@/composables/useAsyncData'
import { operatorApi } from '@/lib/operator-data'
const quotaSaleLink = 'https://rebugx.com/buy/quota'

const { data: pageData, isLoading, loadError, reload } = useAsyncData(async () => {
  const station = await operatorApi.getMyStation()
  return { quotaData: (station as any)?.quotaData, records: (station as any)?.quotaRecords ?? [] }
})

const isEmpty = computed(() => !pageData.value?.quotaData)

const quotaInfo = computed(() => pageData.value?.quotaData ?? { total: 0, used: 0, sold: 0, gifted: 0, available: 0, price: 0, monthlyPrice: 0 })
const records = computed(() => pageData.value?.records ?? [])
const saleLink = quotaSaleLink
const data = quotaInfo

const activeTab = ref<'manage' | 'rules'>('manage')
const copied = ref(false)
const showQrDialog = ref(false)
const showGiftDialog = ref(false)
const giftPhone = ref('')
const giftName = ref('')
const isSearching = ref(false)
const searchResult = ref<{ name: string; phone: string } | null>(null)

function recordIcon(type: string) { return type === 'self' ? 'award' : type === 'sold' ? 'user' : 'gift' }
function recordIconColor(type: string) { return type === 'self' ? '#7c3aed' : type === 'sold' ? '#16a34a' : '#C9A96E' }
function recordIconBg(type: string) { return type === 'self' ? 'bg-operator-soft' : type === 'sold' ? 'bg-success-soft' : 'bg-gold-soft' }
function recordTypeLabel(type: string) { return type === 'self' ? '自用' : type === 'sold' ? '已售' : '已赠' }
function recordBadgeClass(type: string) { return type === 'self' ? 'badge-operator' : type === 'sold' ? 'badge-success' : 'badge-gold' }

function onGiftClick() {
  if (data.value.available > 0) showGiftDialog.value = true
}
function closeGift() {
  showGiftDialog.value = false
  giftPhone.value = ''
  searchResult.value = null
}
function copyLink() {
  uni.setClipboardData({ data: saleLink, success: () => { copied.value = true; setTimeout(() => (copied.value = false), 2000) } })
}
function toastShare() { uni.showToast({ title: '功能开发中', icon: 'none' }) }
function doSearch() {
  if (isSearching.value || giftPhone.value.length < 11) return
  isSearching.value = true
  setTimeout(() => {
    searchResult.value = { name: '张三丰', phone: giftPhone.value.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') }
    isSearching.value = false
  }, 1000)
}
function doGift() {
  if (!searchResult.value) return
  uni.showToast({ title: '赠送成功', icon: 'success' })
  closeGift()
}
</script>

<style scoped>
.quota-page { min-height: 100vh; background: #f5f5f5; padding-bottom: 40rpx; }
.quota-sec { padding: 0 32rpx; margin-top: 32rpx; }
.quota-overview-wrap { margin-top: 24rpx; }
.quota-card { background: #fff; border-radius: 24rpx; padding: 28rpx; }
.c-success { color: #16a34a !important; }
.c-gold { color: #C9A96E !important; }
.c-operator { color: #7c3aed !important; }
.c-info { color: #2563eb !important; }
.c-primary { color: #C41E3A !important; }
.bold { font-weight: 700; }

/* 名额概览 */
.quota-overview-card { background: #7c3aed; border-radius: 24rpx; padding: 28rpx; }
.quota-ov-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 28rpx; }
.quota-ov-title { display: flex; align-items: center; gap: 10rpx; }
.quota-ov-title-txt { font-size: 28rpx; font-weight: 500; color: #fff; }
.quota-ov-badge { font-size: 22rpx; color: #fff; background: rgba(255,255,255,0.2); border-radius: 8rpx; padding: 4rpx 16rpx; }
.quota-ov-grid { display: flex; gap: 12rpx; }
.quota-ov-item { flex: 1; background: rgba(255,255,255,0.1); border-radius: 12rpx; padding: 16rpx 0; text-align: center; }
.quota-ov-num { display: block; font-size: 36rpx; font-weight: 700; color: #fff; }
.quota-ov-sub { font-size: 18rpx; color: rgba(255,255,255,0.7); }
.quota-ov-income { margin-top: 28rpx; padding: 24rpx; background: rgba(255,255,255,0.1); border-radius: 12rpx; }
.quota-ov-income-txt { font-size: 26rpx; color: #fff; }

/* 操作区 */
.quota-card-title { display: block; font-size: 28rpx; font-weight: 500; color: #1a1a1a; margin-bottom: 24rpx; }
.quota-actions { display: flex; gap: 20rpx; }
.quota-action-btn { flex: 1; border-radius: 20rpx; padding: 28rpx; border: 1rpx solid transparent; }
.success-btn { background: linear-gradient(135deg, rgba(22,163,74,0.1), rgba(22,163,74,0.05)); border-color: rgba(22,163,74,0.3); }
.gold-btn { background: linear-gradient(135deg, rgba(201,169,110,0.1), rgba(201,169,110,0.05)); border-color: rgba(201,169,110,0.3); }
.disabled-btn { background: #f5f5f5; border-color: #eee; }
.quota-action-icon { width: 64rpx; height: 64rpx; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; margin-bottom: 16rpx; }
.success-icon { background: rgba(22,163,74,0.2); }
.gold-icon { background: rgba(201,169,110,0.2); }
.disabled-icon { background: #eee; }
.quota-action-label { display: block; font-size: 26rpx; font-weight: 500; color: #1a1a1a; }
.quota-action-label.disabled { color: #999; }
.quota-action-desc { display: block; font-size: 18rpx; color: #999; margin-top: 4rpx; }

/* Tabs */
.quota-tabs { display: flex; background: rgba(0,0,0,0.05); border-radius: 16rpx; padding: 6rpx; }
.quota-tab { flex: 1; height: 68rpx; display: flex; align-items: center; justify-content: center; border-radius: 12rpx; }
.quota-tab.active { background: #fff; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.06); }
.quota-tab-txt { font-size: 26rpx; color: #666; }
.quota-tab.active .quota-tab-txt { color: #1a1a1a; font-weight: 600; }

/* 记录 */
.quota-list { display: flex; flex-direction: column; gap: 24rpx; }
.quota-record { display: flex; align-items: center; gap: 20rpx; }
.quota-record-icon { width: 80rpx; height: 80rpx; border-radius: 20rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.bg-operator-soft { background: rgba(124,58,237,0.1); }
.bg-success-soft { background: rgba(22,163,74,0.1); }
.bg-gold-soft { background: rgba(201,169,110,0.1); }
.quota-record-info { flex: 1; min-width: 0; }
.quota-record-name-row { display: flex; align-items: center; gap: 12rpx; }
.quota-record-name { font-size: 26rpx; font-weight: 500; color: #1a1a1a; }
.quota-badge { font-size: 18rpx; padding: 2rpx 12rpx; border-radius: 8rpx; }
.badge-operator { background: rgba(124,58,237,0.1); color: #7c3aed; }
.badge-success { background: rgba(22,163,74,0.1); color: #16a34a; }
.badge-gold { background: rgba(201,169,110,0.1); color: #C9A96E; }
.quota-record-meta { display: block; font-size: 22rpx; color: #999; margin-top: 6rpx; }
.quota-record-income { text-align: right; }
.quota-record-amount { display: block; font-size: 28rpx; font-weight: 700; }
.quota-record-income-label { font-size: 18rpx; color: #999; }
.quota-empty-card { border: 2rpx dashed #ddd; border-radius: 24rpx; padding: 28rpx; text-align: center; }
.quota-empty-txt { font-size: 26rpx; color: #999; }

/* 规则 */
.quota-rule { display: flex; gap: 20rpx; margin-bottom: 28rpx; }
.quota-rule-num { width: 44rpx; height: 44rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2rpx; }
.bg-operator { background: rgba(124,58,237,0.1); }
.bg-success { background: rgba(22,163,74,0.1); }
.bg-gold { background: rgba(201,169,110,0.1); }
.bg-info { background: rgba(37,99,235,0.1); }
.quota-rule-num-txt { font-size: 22rpx; font-weight: 700; }
.quota-rule-body { flex: 1; }
.quota-rule-title { display: block; font-size: 26rpx; font-weight: 500; color: #1a1a1a; }
.quota-rule-desc { display: block; font-size: 22rpx; color: #999; margin-top: 8rpx; line-height: 1.5; }
.quota-warn { display: flex; align-items: flex-start; gap: 12rpx; padding: 20rpx; background: #fffbeb; border-radius: 12rpx; margin-top: 8rpx; }
.quota-warn-txt { flex: 1; font-size: 22rpx; color: #b45309; line-height: 1.5; }

/* 弹窗 */
.quota-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 48rpx; }
.quota-dialog { width: 100%; max-width: 600rpx; background: #fff; border-radius: 24rpx; padding: 40rpx 32rpx; }
.quota-dialog-title { display: block; font-size: 32rpx; font-weight: 600; color: #1a1a1a; }
.quota-dialog-desc { display: block; font-size: 24rpx; color: #999; margin-top: 12rpx; margin-bottom: 28rpx; line-height: 1.5; }
.quota-link-box { background: rgba(0,0,0,0.04); border-radius: 12rpx; padding: 20rpx; margin-bottom: 24rpx; }
.quota-link-txt { font-size: 22rpx; color: #666; word-break: break-all; }
.quota-qr-box { width: 280rpx; height: 280rpx; margin: 0 auto; background: rgba(0,0,0,0.04); border-radius: 20rpx; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12rpx; }
.quota-qr-hint { font-size: 22rpx; color: #999; }
.quota-price-info { text-align: center; margin-top: 24rpx; }
.quota-price-txt { font-size: 26rpx; font-weight: 500; color: #1a1a1a; }
.quota-price-sub { display: block; font-size: 22rpx; color: #999; margin-top: 8rpx; }
.quota-dialog-footer { display: flex; gap: 20rpx; margin-top: 32rpx; }
.quota-dialog-btn { flex: 1; height: 80rpx; border-radius: 14rpx; display: flex; align-items: center; justify-content: center; gap: 8rpx; }
.quota-dialog-btn.outline { border: 1rpx solid #ddd; }
.quota-dialog-btn.operator { background: #7c3aed; }
.quota-dialog-btn.gold { background: #C9A96E; }
.quota-dialog-btn.disabled { opacity: 0.5; }
.quota-dialog-btn-txt { font-size: 26rpx; color: #333; }
.quota-dialog-btn-txt.light { color: #fff; }

/* 赠送表单 */
.quota-form-field { margin-bottom: 8rpx; }
.quota-form-label { display: block; font-size: 26rpx; font-weight: 500; color: #1a1a1a; margin-bottom: 14rpx; }
.quota-form-label.sm { font-size: 22rpx; color: #999; font-weight: 400; }
.quota-search-row { display: flex; gap: 16rpx; }
.quota-input { flex: 1; height: 76rpx; background: #f7f7f7; border-radius: 12rpx; padding: 0 20rpx; font-size: 26rpx; color: #1a1a1a; }
.quota-input.full { width: 100%; }
.quota-input-ph { color: #bbb; }
.quota-search-btn { flex-shrink: 0; padding: 0 32rpx; height: 76rpx; border: 1rpx solid #ddd; border-radius: 12rpx; display: flex; align-items: center; justify-content: center; }
.quota-search-btn.disabled { opacity: 0.5; }
.quota-search-btn-txt { font-size: 26rpx; color: #333; }
.quota-result { background: rgba(0,0,0,0.04); border-radius: 16rpx; padding: 24rpx; margin-bottom: 24rpx; }
.quota-result-row { display: flex; align-items: center; gap: 16rpx; }
.quota-result-avatar { width: 80rpx; height: 80rpx; border-radius: 50%; background: rgba(201,169,110,0.1); display: flex; align-items: center; justify-content: center; }
.quota-result-info { flex: 1; }
.quota-result-name { display: block; font-size: 28rpx; font-weight: 500; color: #1a1a1a; }
.quota-result-phone { font-size: 22rpx; color: #999; }
</style>
