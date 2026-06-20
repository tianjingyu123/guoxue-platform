<template>
  <view
    v-if="loading"
    class="invite-page"
  >
    <text>加载中...</text>
  </view>
  <view
    v-else-if="error"
    class="invite-page"
  >
    <text>{{ error }}</text>
    <view @tap="loadData">
      重试
    </view>
  </view>
  <view
    v-else
    class="invite-page"
  >
    <app-nav-bar
      title="邀请站长"
      :show-back="true"
    />

    <!-- 数据统计 -->
    <view class="inv-stats">
      <view
        v-for="s in statItems"
        :key="s.label"
        class="inv-stat-card"
      >
        <app-icon
          :name="s.icon"
          :size="32"
          color="#C41E3A"
        />
        <text class="inv-stat-val">
          {{ s.value }}
        </text>
        <text class="inv-stat-label">
          {{ s.label }}
        </text>
      </view>
    </view>

    <!-- 邀请奖励说明 -->
    <view class="inv-reward">
      <view class="inv-reward-head">
        <app-icon
          name="trending-up"
          :size="28"
          color="#C41E3A"
        />
        <text class="inv-reward-title">
          邀请奖励说明
        </text>
      </view>
      <rich-text
        class="inv-reward-desc"
        :nodes="rewardDesc"
      />
    </view>

    <view class="inv-body">
      <!-- 邀请链接 -->
      <view class="inv-block">
        <text class="inv-block-title">
          邀请链接
        </text>
        <view class="inv-link-row">
          <view class="inv-link-input">
            <text class="inv-link-txt">
              {{ inviteLink }}
            </text>
          </view>
          <view
            class="inv-copy-btn"
            :class="{ copied }"
            @tap="copy(inviteLink)"
          >
            <app-icon
              name="copy"
              :size="26"
              color="#ffffff"
            />
            <text class="inv-copy-txt">
              {{ copied ? '已复制' : '复制' }}
            </text>
          </view>
        </view>
      </view>

      <!-- 邀请码 -->
      <view class="inv-code-card">
        <view class="inv-code-left">
          <text class="inv-code-label">
            邀请码
          </text>
          <text class="inv-code-val">
            {{ inviteCode }}
          </text>
        </view>
        <view class="inv-code-actions">
          <view
            class="inv-code-act"
            @tap="copy(inviteCode)"
          >
            <app-icon
              name="copy"
              :size="28"
              color="#6b7280"
            />
          </view>
          <view class="inv-code-act">
            <app-icon
              name="share-2"
              :size="28"
              color="#6b7280"
            />
          </view>
        </view>
      </view>

      <!-- 邮件邀请 -->
      <view class="inv-block">
        <text class="inv-block-title">
          邮件邀请
        </text>
        <view class="inv-link-row">
          <input
            v-model="email"
            class="inv-email-input"
            type="text"
            placeholder="输入对方邮箱"
            placeholder-class="inv-email-ph"
          >
          <view
            class="inv-send-btn"
            :class="{ sent, disabled: !email || sent }"
            @tap="sendInvite"
          >
            <text class="inv-send-txt">
              {{ sent ? '已发送' : '发送' }}
            </text>
          </view>
        </view>
      </view>

      <!-- 已邀请站长 -->
      <view class="inv-block">
        <text class="inv-block-title">
          已邀请站长
        </text>
        <view class="inv-list">
          <view
            v-for="s in invited"
            :key="s.id"
            class="inv-item"
          >
            <view class="inv-item-left">
              <text class="inv-item-name">
                {{ s.name }}
              </text>
              <text class="inv-item-date">
                {{ s.joinedAt }} 加入
              </text>
            </view>
            <view class="inv-item-right">
              <text
                class="inv-item-status"
                :class="s.status"
              >
                {{ s.status === 'active' ? '已激活' : '待激活' }}
              </text>
              <text
                v-if="s.status === 'active'"
                class="inv-item-commission"
              >
                佣金 {{ s.commission }}
              </text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view class="inv-bottom-space" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { operatorApi, type InvitedStation } from '@/lib/operator-data'

const loading = ref(true)
const error = ref('')
const invited = ref<InvitedStation[]>([])
const inviteLink = ref('')
const inviteCode = ref('')

async function loadData() {
  loading.value = true; error.value = ''
  try {
    const res = await operatorApi.invite()
    invited.value = res.stations
    inviteLink.value = res.inviteLink
    inviteCode.value = res.inviteCode
  } catch (e: any) { error.value = e?.message || '加载失败' }
  finally { loading.value = false }
}
onMounted(() => { loadData() })

const copied = ref(false)
const email = ref('')
const sent = ref(false)

const statItems = computed(() => [
  { label: '已邀请', value: invited.value.length, icon: 'users' },
  { label: '已激活', value: invited.value.filter((s) => s.status === 'active').length, icon: 'check-circle-2' },
  { label: '累计佣金', value: `¥${totalCommission.value.toLocaleString()}`, icon: 'gift' },
])

const totalCommission = computed(() =>
  invited.value
    .filter((s) => s.status === 'active')
    .reduce((sum, s) => sum + parseFloat(s.commission.replace(/[¥,]/g, '')), 0),
)

const rewardDesc =
  '每成功邀请一位站长，可获得其首月收益的 <span style="color:#C41E3A;font-weight:600">10%</span> 作为佣金奖励。站长持续运营期间，每月额外享受 <span style="color:#C41E3A;font-weight:600">2%</span> 的持续佣金。'

function copy(text: string) {
  uni.setClipboardData({
    data: text,
    success: () => {
      copied.value = true
      setTimeout(() => (copied.value = false), 2000)
    },
  })
}

function sendInvite() {
  if (!email.value || sent.value) return
  sent.value = true
  email.value = ''
  uni.showToast({ title: '邀请已发送', icon: 'none' })
  setTimeout(() => (sent.value = false), 3000)
}
</script>

<style lang="scss" scoped>
.invite-page {
  min-height: 100vh;
  background: #faf8f5;
}

.inv-stats {
  margin: 24rpx 32rpx 0;
  display: flex;
  gap: 24rpx;
}
.inv-stat-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24rpx 0;
  background: #ffffff;
  border: 1rpx solid #f0e9e0;
  border-radius: 24rpx;
}
.inv-stat-val {
  font-size: 32rpx;
  font-weight: 700;
  color: #1f2937;
  margin-top: 8rpx;
}
.inv-stat-label {
  font-size: 22rpx;
  color: #9ca3af;
  margin-top: 4rpx;
}

.inv-reward {
  margin: 24rpx 32rpx 0;
  padding: 28rpx;
  background: rgba(196, 30, 58, 0.05);
  border: 1rpx solid rgba(196, 30, 58, 0.2);
  border-radius: 24rpx;
}
.inv-reward-head {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 12rpx;
}
.inv-reward-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #1f2937;
}
.inv-reward-desc {
  font-size: 24rpx;
  color: #6b7280;
  line-height: 1.6;
}

.inv-body {
  padding: 24rpx 32rpx 0;
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}
.inv-block {
  display: flex;
  flex-direction: column;
}
.inv-block-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 16rpx;
}

.inv-link-row {
  display: flex;
  gap: 16rpx;
  align-items: center;
}
.inv-link-input {
  flex: 1;
  height: 72rpx;
  padding: 0 20rpx;
  background: #f3f0eb;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  overflow: hidden;
}
.inv-link-txt {
  font-size: 22rpx;
  color: #6b7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.inv-copy-btn {
  flex-shrink: 0;
  height: 72rpx;
  padding: 0 24rpx;
  background: #c41e3a;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.inv-copy-btn.copied {
  background: #16a34a;
}
.inv-copy-txt {
  font-size: 24rpx;
  color: #ffffff;
}

.inv-code-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  background: #ffffff;
  border: 1rpx solid #f0e9e0;
  border-radius: 24rpx;
}
.inv-code-left {
  display: flex;
  flex-direction: column;
}
.inv-code-label {
  font-size: 22rpx;
  color: #9ca3af;
}
.inv-code-val {
  font-size: 36rpx;
  font-weight: 900;
  color: #1f2937;
  letter-spacing: 4rpx;
  margin-top: 4rpx;
}
.inv-code-actions {
  display: flex;
  gap: 16rpx;
}
.inv-code-act {
  width: 64rpx;
  height: 64rpx;
  border-radius: 16rpx;
  background: #f3f0eb;
  display: flex;
  align-items: center;
  justify-content: center;
}

.inv-email-input {
  flex: 1;
  height: 72rpx;
  padding: 0 20rpx;
  background: #ffffff;
  border: 1rpx solid #e5ddd2;
  border-radius: 16rpx;
  font-size: 26rpx;
  color: #1f2937;
}
.inv-email-ph {
  color: #b9b3a8;
}
.inv-send-btn {
  flex-shrink: 0;
  height: 72rpx;
  padding: 0 32rpx;
  background: #c41e3a;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
}
.inv-send-btn.sent {
  background: #16a34a;
}
.inv-send-btn.disabled {
  opacity: 0.5;
}
.inv-send-txt {
  font-size: 26rpx;
  color: #ffffff;
}

.inv-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.inv-item {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 24rpx;
  background: #ffffff;
  border: 1rpx solid #f0e9e0;
  border-radius: 24rpx;
}
.inv-item-left {
  flex: 1;
  min-width: 0;
}
.inv-item-name {
  font-size: 26rpx;
  font-weight: 500;
  color: #1f2937;
}
.inv-item-date {
  display: block;
  font-size: 22rpx;
  color: #9ca3af;
  margin-top: 4rpx;
}
.inv-item-right {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}
.inv-item-status {
  font-size: 20rpx;
  font-weight: 500;
  padding: 2rpx 12rpx;
  border-radius: 999rpx;
}
.inv-item-status.active {
  background: rgba(22, 163, 74, 0.15);
  color: #16a34a;
}
.inv-item-status.pending {
  background: #f3f0eb;
  color: #9ca3af;
}
.inv-item-commission {
  font-size: 22rpx;
  color: #c41e3a;
  font-weight: 600;
  margin-top: 8rpx;
}

.inv-bottom-space {
  height: 80rpx;
}
</style>
