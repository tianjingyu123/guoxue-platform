<template>
  <view
    v-if="loading"
    class="dormant-page"
  >
    <text>加载中...</text>
  </view>
  <view
    v-else-if="error"
    class="dormant-page"
  >
    <text>{{ error }}</text>
    <view @tap="loadData">
      重试
    </view>
  </view>
  <view
    v-else
    class="dormant-page"
  >
    <app-nav-bar
      title="沉寂站长预警"
      :show-back="true"
      background="#ffffff"
      color="#1f2937"
    />

    <!-- 统计卡 -->
    <view class="dm-stat-wrap">
      <view class="dm-stat-card">
        <view class="dm-stat-top">
          <view class="dm-stat-icon">
            <app-icon
              name="clock"
              :size="32"
              color="#d97706"
            />
          </view>
          <view class="dm-stat-info">
            <text class="dm-stat-label">
              超过 30 天无推广动作
            </text>
            <text class="dm-stat-value">
              {{ members.length }} <text class="dm-stat-unit">
                位站长
              </text>
            </text>
          </view>
        </view>
        <text class="dm-stat-tip">
          及时唤醒沉寂站长有助于提升团队整体活跃度与佣金产出，建议定期推送关怀提醒。
        </text>
      </view>
    </view>

    <!-- 列表 -->
    <view
      v-if="members.length > 0"
      class="dm-list"
    >
      <view
        v-for="m in members"
        :key="m.id"
        class="dm-item"
      >
        <view class="dm-avatar">
          <text class="dm-avatar-txt">
            {{ m.name.charAt(0) }}
          </text>
        </view>
        <view class="dm-item-info">
          <view class="dm-item-head">
            <text class="dm-item-name">
              {{ m.name }}
            </text>
            <text class="dm-item-level">
              {{ m.level }}
            </text>
          </view>
          <text class="dm-item-meta">
            已沉寂 {{ m.lastActiveDays }} 天 · 累计佣金 ¥{{ m.totalCommission }}
          </text>
        </view>
        <view
          class="dm-btn"
          :class="{ reminded: m.reminded }"
          @tap="remindOne(m.id)"
        >
          <app-icon
            :name="m.reminded ? 'check' : 'bell'"
            :size="24"
            :color="m.reminded ? '#9ca3af' : '#ffffff'"
          />
          <text
            class="dm-btn-txt"
            :class="{ reminded: m.reminded }"
          >
            {{ m.reminded ? '已提醒' : '提醒' }}
          </text>
        </view>
      </view>
    </view>

    <!-- 空态 -->
    <view
      v-else
      class="dm-empty"
    >
      <view class="dm-empty-icon">
        <app-icon
          name="users"
          :size="48"
          color="#16a34a"
        />
      </view>
      <text class="dm-empty-title">
        暂无沉寂站长
      </text>
      <text class="dm-empty-desc">
        您的团队都很活跃，继续保持！
      </text>
    </view>

    <!-- 一键推送 -->
    <view
      v-if="pendingCount > 0"
      class="dm-bottom"
    >
      <view
        class="dm-bottom-btn"
        @tap="remindAll"
      >
        <app-icon
          :name="batchReminded ? 'check' : 'message-circle'"
          :size="28"
          color="#ffffff"
        />
        <text class="dm-bottom-txt">
          {{ batchReminded ? '已全部推送' : `一键提醒全部（${pendingCount}）` }}
        </text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { operatorApi, type DormantMember } from '@/lib/operator-data'

const loading = ref(true)
const error = ref('')
const members = ref<DormantMember[]>([])

async function loadData() {
  loading.value = true; error.value = ''
  try {
    const res = await operatorApi.dormant()
    members.value = res.members.map((m: typeof res.members[number]) => ({ ...m }))
  } catch (e: any) { error.value = e?.message || '加载失败' }
  finally { loading.value = false }
}
onMounted(() => { loadData() })
const batchReminded = ref(false)

const pendingCount = computed(() => members.value.filter((m) => !m.reminded).length)

function remindOne(id: string) {
  const m = members.value.find((x) => x.id === id)
  if (m && !m.reminded) {
    m.reminded = true
    uni.showToast({ title: '已发送提醒', icon: 'none' })
  }
}

function remindAll() {
  members.value.forEach((m) => (m.reminded = true))
  batchReminded.value = true
  uni.showToast({ title: '已全部推送', icon: 'none' })
  setTimeout(() => (batchReminded.value = false), 2000)
}
</script>

<style lang="scss" scoped>
.dormant-page {
  min-height: 100vh;
  background: #faf8f5;
  padding-bottom: 180rpx;
}

.dm-stat-wrap {
  padding: 32rpx;
}
.dm-stat-card {
  padding: 32rpx;
  background: linear-gradient(135deg, #fffbeb, rgba(255, 251, 235, 0.4));
  border: 1rpx solid #fde68a;
  border-radius: 24rpx;
}
.dm-stat-top {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.dm-stat-icon {
  width: 88rpx;
  height: 88rpx;
  border-radius: 24rpx;
  background: #fef3c7;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.dm-stat-info {
  flex: 1;
}
.dm-stat-label {
  font-size: 26rpx;
  color: #6b7280;
  display: block;
}
.dm-stat-value {
  font-size: 48rpx;
  font-weight: 700;
  color: #1f2937;
  margin-top: 4rpx;
}
.dm-stat-unit {
  font-size: 26rpx;
  font-weight: 400;
  color: #9ca3af;
}
.dm-stat-tip {
  display: block;
  font-size: 22rpx;
  color: #b45309;
  margin-top: 24rpx;
  line-height: 1.6;
}

.dm-list {
  padding: 0 32rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.dm-item {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 32rpx;
  background: #ffffff;
  border: 1rpx solid #f0e9e0;
  border-radius: 24rpx;
}
.dm-avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 24rpx;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.dm-avatar-txt {
  font-size: 36rpx;
  font-weight: 700;
  color: #9ca3af;
}
.dm-item-info {
  flex: 1;
  min-width: 0;
}
.dm-item-head {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.dm-item-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #1f2937;
}
.dm-item-level {
  font-size: 20rpx;
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
  background: #f3f4f6;
  color: #9ca3af;
}
.dm-item-meta {
  display: block;
  font-size: 22rpx;
  color: #d97706;
  margin-top: 6rpx;
}
.dm-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6rpx;
  height: 64rpx;
  padding: 0 24rpx;
  border-radius: 16rpx;
  background: #f59e0b;
}
.dm-btn.reminded {
  background: transparent;
  border: 1rpx solid #e5ddd2;
}
.dm-btn-txt {
  font-size: 24rpx;
  color: #ffffff;
}
.dm-btn-txt.reminded {
  color: #9ca3af;
}

.dm-empty {
  padding: 128rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.dm-empty-icon {
  width: 128rpx;
  height: 128rpx;
  border-radius: 50%;
  background: rgba(22, 163, 74, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24rpx;
}
.dm-empty-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #1f2937;
}
.dm-empty-desc {
  font-size: 24rpx;
  color: #9ca3af;
  margin-top: 8rpx;
}

.dm-bottom {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #ffffff;
  border-top: 1rpx solid #f0e9e0;
  padding: 24rpx 32rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
}
.dm-bottom-btn {
  height: 88rpx;
  border-radius: 20rpx;
  background: #f59e0b;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}
.dm-bottom-txt {
  font-size: 28rpx;
  font-weight: 500;
  color: #ffffff;
}
</style>
