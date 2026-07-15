<script setup lang="ts">
/**
 * 圈子成员列表页（2026-07-10·UX 重排批）
 * 来源：详情页原「成员」Tab 内容原样迁出为独立页（Tab 与顶部成员信息重复·董事长反馈）。
 * 入口：详情页身份区「N 成员 + 头像叠排」。数据 circleDetailApi.listMembers，三态齐全。
 */
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import SmartAvatar from '@/components/common/smart-avatar.vue'
import { goBack, navigateTo } from '@/utils/router'
import { circleDetailApi, type CircleMember } from '@/lib/circle-detail-data'

const circleId = ref('')
const members = ref<CircleMember[]>([])
const total = ref(0)
const isLoading = ref(true)
const error = ref('')

onLoad((q) => {
  if (q?.id) circleId.value = q.id
  load()
})

async function load() {
  isLoading.value = true
  error.value = ''
  try {
    const r = await circleDetailApi.listMembers(circleId.value)
    members.value = r.data
    total.value = r.total
  } catch {
    error.value = '加载失败，请重试'
  } finally {
    isLoading.value = false
  }
}

function openUser(id: string) { navigateTo(`/pkg-circle/user/profile?id=${id}`) }
</script>

<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav">
      <view class="nav-back" @tap="goBack"><app-icon name="arrow-left" :size="44" color="#1A1A1A" /></view>
      <text class="nav-title">圈子成员<text v-if="total" class="nav-count">（{{ total }}）</text></text>
    </view>

    <!-- 加载态 -->
    <view v-if="isLoading" class="state">
      <view class="sk-row" v-for="i in 6" :key="i" />
    </view>

    <!-- 错误态 -->
    <view v-else-if="error" class="state center">
      <text class="state-txt">{{ error }}</text>
      <view class="retry" @tap="load"><text class="retry-txt">重试</text></view>
    </view>

    <!-- 空态 -->
    <view v-else-if="!members.length" class="state center">
      <app-icon name="users" :size="88" color="#E8E3DB" />
      <text class="state-txt">暂无成员</text>
    </view>

    <!-- 成员列表（原详情页成员 Tab 原样迁入） -->
    <scroll-view v-else scroll-y class="body">
      <view class="member-list">
        <view v-for="m in members" :key="m.id" class="member" @tap="openUser(m.id)">
          <smart-avatar :src="m.avatar" :name="m.name" class="member-avatar" />
          <view class="member-main">
            <view class="member-name-row">
              <text class="member-name">{{ m.name }}</text>
              <view v-if="m.role === 'owner'" class="role-badge"><app-icon name="crown" :size="20" color="#C9A96E" /><text class="role-txt owner">圈主</text></view>
              <view v-else-if="m.role === 'admin'" class="role-badge"><app-icon name="shield" :size="20" color="#D4B87D" /><text class="role-txt admin">管理员</text></view>
            </view>
            <view class="member-meta">
              <text v-if="m.title" class="member-meta-txt">{{ m.title }}</text>
              <text class="member-meta-txt">发帖 {{ m.posts }}</text>
            </view>
          </view>
        </view>
      </view>
      <view class="safe-bottom" />
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: var(--bg-page, #faf8f5); display: flex; flex-direction: column; }

.nav {
  position: sticky; top: 0; z-index: 20;
  display: flex; align-items: center; gap: 16rpx; height: 88rpx; padding: 0 24rpx;
  padding-top: var(--status-bar-height, 0px);
  background: rgba(250, 248, 245, 0.92); backdrop-filter: blur(20rpx);
}
.nav-back { width: 60rpx; height: 60rpx; display: flex; align-items: center; justify-content: center; margin-left: -8rpx; }
.nav-title { flex: 1; font-size: 32rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); }
.nav-count { font-size: 26rpx; font-weight: 400; color: var(--text-tertiary, #999); }

.body { flex: 1; }

/* 状态 */
.state { padding: 32rpx; }
.state.center { display: flex; flex-direction: column; align-items: center; gap: 24rpx; padding: 160rpx 32rpx; }
.state-txt { font-size: 27rpx; color: var(--text-tertiary, #999); }
.sk-row { height: 120rpx; background: #f2efea; border-radius: 24rpx; margin-bottom: 16rpx; }
.retry { padding: 16rpx 56rpx; background: var(--brand, #c41e3a); border-radius: 24rpx; }
.retry-txt { font-size: 27rpx; color: #fff; }

/* 成员列表（样式与原详情页成员 Tab 一致） */
.member-list { padding: 24rpx 32rpx 0; display: flex; flex-direction: column; gap: 8rpx; }
.member { display: flex; align-items: center; gap: 20rpx; padding: 20rpx; background: var(--bg-card, #fff); border-radius: 24rpx; }
.member:active { background: var(--bg-warm, #f8f4ec); }
.member-avatar { width: 80rpx; height: 80rpx; border-radius: 999rpx; flex-shrink: 0; }
.member-main { flex: 1; min-width: 0; }
.member-name-row { display: flex; align-items: center; gap: 12rpx; }
.member-name { font-size: 28rpx; font-weight: 500; color: var(--text-primary, #2c2c2c); }
.role-badge { display: flex; align-items: center; gap: 4rpx; padding: 2rpx 10rpx; border-radius: 6rpx; background: var(--gold-soft, rgba(201, 169, 110, 0.14)); }
.role-txt { font-size: 20rpx; }
.role-txt.owner { color: var(--gold, #c9a96e); }
.role-txt.admin { color: var(--gold-2, #d4b87d); }
.member-meta { display: flex; align-items: center; gap: 16rpx; margin-top: 4rpx; }
.member-meta-txt { font-size: 23rpx; color: var(--text-tertiary, #999); }

.safe-bottom { height: calc(40rpx + env(safe-area-inset-bottom)); }
</style>
