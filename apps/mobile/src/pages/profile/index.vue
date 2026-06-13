<!-- 我的主页 - 100% 对照 app/profile/page.tsx -->
<template>
  <view class="min-h-screen pb-20" style="background: var(--color-background);">

    <!-- ===== 第一层：个人信息区 ===== -->
    <view class="relative">
      <!-- 背景渐变 -->
      <view class="absolute inset-0" style="height: 192rpx; background: linear-gradient(to bottom, #F5F1EB, #FAF8F5, #FAF8F5);" />

      <!-- 顶部操作栏 -->
      <view class="relative flex items-center justify-between px-4 pt-12 pb-2">
        <view class="p-2 rounded-full" style="background: rgba(255,255,255,0.6); backdrop-filter: blur(4px);" @click="showQrCode">
          <text class="text-lg text-foreground">◻</text>
        </view>
        <view class="flex items-center gap-2">
          <!-- 消息通知 -->
          <navigator url="/pages/messages/index" class="relative p-2 rounded-full" style="background: rgba(255,255,255,0.6); backdrop-filter: blur(4px);">
            <view class="text-lg text-foreground"><svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg></view>
            <view
              v-if="totalMessages > 0"
              class="absolute flex items-center justify-center rounded-full"
              style="top: -2rpx; right: -2rpx; width: 16rpx; height: 16rpx; background: var(--color-primary); min-width: 32rpx; height: 32rpx; padding: 0 4rpx;"
            >
              <text class="text-white font-bold" style="font-size: 10rpx;">{{ totalMessages }}</text>
            </view>
          </navigator>
          <navigator url="/pages/settings/index" class="p-2 rounded-full" style="background: rgba(255,255,255,0.6); backdrop-filter: blur(4px);">
            <view class="text-lg text-foreground"><svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg></view>
          </navigator>
        </view>
      </view>

      <!-- 用户信息 -->
      <view class="relative px-4 pb-4">
        <view class="flex items-start gap-4">
          <!-- 大头像 -->
          <navigator url="/pages/profile/edit" class="relative">
            <view
              class="w-20 h-20 rounded-full flex items-center justify-center"
              style="background: var(--color-primary); ring: 4px solid white; box-shadow: 0 4px 16px rgba(0,0,0,0.12);"
            >
              <image
                v-if="userData.avatar"
                :src="userData.avatar"
                class="w-20 h-20 rounded-full"
                mode="aspectFill"
              />
              <text v-else class="text-2xl font-bold" style="color: var(--color-primary-foreground); font-family: serif;">
                {{ userData.name[0] }}
              </text>
            </view>
          </navigator>

          <view class="flex-1 pt-1">
            <!-- 问候语 -->
            <text class="text-xs text-muted-foreground block mb-1">{{ greeting }}，{{ userData.name }}</text>

            <!-- 昵称 + 认证 + VIP -->
            <view class="flex items-center gap-2 flex-wrap">
              <text class="text-xl font-bold text-foreground" style="font-family: serif;">{{ userData.name }}</text>
              <view v-if="userData.isVerified" class="text-base" style="color: #4A90D9;"><svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></view>
              <view
                v-if="userData.isVip"
                class="flex items-center px-1.5 rounded"
                style="background: linear-gradient(to right, var(--color-accent), #D4B87D);"
              >
                <svg class="w-3 h-3 text-white mr-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7z"/></svg>
                <text class="text-white font-bold" style="font-size: 10rpx;">{{ userData.vipLevel }}</text>
              </view>
            </view>

            <!-- 关注/粉丝/获赞 -->
            <view class="flex items-center gap-4 mt-2">
              <navigator url="/pages/follows/index?tab=following" class="text-center">
                <text class="text-base font-bold text-foreground">{{ userData.stats.following }}</text>
                <text class="text-xs text-muted-foreground ml-1">关注</text>
              </navigator>
              <view class="w-px h-3 bg-border" />
              <navigator url="/pages/follows/index?tab=followers" class="text-center">
                <text class="text-base font-bold text-foreground">{{ userData.stats.followers }}</text>
                <text class="text-xs text-muted-foreground ml-1">粉丝</text>
              </navigator>
              <view class="w-px h-3 bg-border" />
              <navigator url="/pages/likes/index" class="text-center">
                <text class="text-base font-bold text-foreground">{{ userData.stats.likes }}</text>
                <text class="text-xs text-muted-foreground ml-1">获赞</text>
              </navigator>
            </view>

            <!-- 编辑资料按钮 -->
            <navigator url="/pages/profile/edit">
              <view class="mt-3 h-7 px-3 rounded-full border border-border bg-card flex items-center justify-center" style="width: fit-content;">
                <text class="text-xs text-foreground"><svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> 编辑资料</text>
              </view>
            </navigator>
          </view>
        </view>
      </view>
    </view>

    <!-- ===== 第二层：资产核心区 ===== -->
    <view class="px-4 mt-2">
      <view class="rounded-2xl overflow-hidden border card-shadow" style="background: linear-gradient(to right, var(--color-background), #F8F4EC); border-color: rgba(201,169,110,0.2);">
        <view class="p-4">
          <view class="grid grid-cols-3" style="border-right: none;">
            <navigator url="/pages/wallet/index" class="flex flex-col items-center py-1 border-r border-accent/20">
              <view class="flex items-center gap-1">
                <svg class="w-5 h-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                <text class="text-2xl font-bold" style="color: var(--color-accent);">{{ userData.coins }}</text>
              </view>
              <text class="text-xs text-muted-foreground mt-1">国学币</text>
            </navigator>
            <navigator url="/pages/coupons/index" class="flex flex-col items-center py-1 border-r border-accent/20">
              <view class="flex items-center gap-1">
                <view class="text-lg" style="color: var(--color-accent);"><svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z"/></svg></view>
                <text class="text-2xl font-bold" style="color: var(--color-accent);">{{ userData.coupons }}</text>
              </view>
              <text class="text-xs text-muted-foreground mt-1">优���券</text>
            </navigator>
            <navigator url="/pages/points/index" class="flex flex-col items-center py-1">
              <view class="flex items-center gap-1">
                <svg class="w-5 h-5 text-accent" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                <text class="text-2xl font-bold" style="color: var(--color-accent);">{{ userData.points }}</text>
              </view>
              <text class="text-xs text-muted-foreground mt-1">积分</text>
            </navigator>
          </view>
        </view>
      </view>
    </view>

    <!-- ===== 第三层：订单与售后区 ===== -->
    <view class="px-4 mt-4">
      <view class="bg-card rounded-2xl overflow-hidden card-shadow">
        <view class="flex items-center justify-between px-4 py-3 border-b border-border">
          <text class="font-medium text-foreground">我的订单</text>
          <navigator url="/pages/orders/index" class="flex items-center">
            <text class="text-xs text-muted-foreground">查看全部订单 ></text>
          </navigator>
        </view>
        <view class="grid grid-cols-4 py-4">
          <navigator
            v-for="item in orderStatus"
            :key="item.key"
            :url="`/pages/orders/index?status=${item.key}`"
            class="flex flex-col items-center gap-1.5 relative"
          >
            <view class="w-10 h-10 rounded-full flex items-center justify-center bg-secondary/50">
              <!-- CreditCard: pending -->
              <svg v-if="item.key === 'pending'" class="w-5 h-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
              <!-- Package: shipped -->
              <svg v-else-if="item.key === 'shipped'" class="w-5 h-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
              <!-- Truck: received -->
              <svg v-else-if="item.key === 'received'" class="w-5 h-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
              <!-- RefreshCw: refund -->
              <svg v-else class="w-5 h-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/></svg>
            </view>
            <text class="text-xs text-foreground">{{ item.label }}</text>
            <view
              v-if="item.count > 0"
              class="absolute flex items-center justify-center rounded-full"
              style="top: 0; right: 25%; width: 16rpx; height: 16rpx; background: var(--color-primary); min-width: 32rpx; height: 32rpx; padding: 0 4rpx;"
            >
              <text class="text-white font-bold" style="font-size: 10rpx;">{{ item.count }}</text>
            </view>
          </navigator>
        </view>
      </view>
    </view>

    <!-- ===== 第四层：功能入口区 ===== -->
    <view class="px-4 mt-4">
      <view class="bg-card rounded-2xl overflow-hidden card-shadow">
        <view class="px-4 py-3 border-b border-border">
          <text class="font-medium text-foreground">常用功能</text>
        </view>
        <view class="grid grid-cols-4 gap-y-4 py-4">
          <navigator
            v-for="item in quickFunctions"
            :key="item.label"
            :url="item.href"
            class="flex flex-col items-center gap-1.5"
          >
            <view class="w-10 h-10 rounded-xl flex items-center justify-center bg-secondary/50">
              <component :is="item.iconComponent" class="w-5 h-5" :style="{ color: item.color }" />
            </view>
            <text class="text-xs text-foreground">{{ item.label }}</text>
          </navigator>
        </view>
      </view>
    </view>

    <!-- ===== 第五层：身份切换区 ===== -->
    <view v-if="userData.roles.length > 0" class="px-4 mt-4">
      <view class="bg-card rounded-2xl overflow-hidden card-shadow">
        <view class="px-4 py-3 border-b border-border">
          <text class="font-medium text-foreground">身份切换</text>
        </view>
        <view class="p-3 grid grid-cols-2 gap-2">
          <navigator
            v-for="role in userData.roles"
            :key="`${role.type}-${role.id}`"
            :url="getRoleHref(role.type, role.id)"
            class="flex items-center gap-3 p-3 rounded-xl border border-border active:bg-secondary/30"
          >
            <view
              class="w-10 h-10 rounded-xl flex items-center justify-center"
              :style="{ background: roleConfig[role.type].bgColor }"
            >
              <component :is="roleConfig[role.type].iconComponent" class="w-5 h-5" :style="{ color: roleConfig[role.type].color }" />
            </view>
            <view class="flex-1 min-w-0">
              <text class="text-sm font-medium text-foreground block" style="overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">
                {{ roleConfig[role.type].label }}
              </text>
              <text class="text-xs text-muted-foreground block" style="overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">
                {{ role.name }}
              </text>
            </view>
            <text class="text-muted-foreground flex-shrink-0">›</text>
          </navigator>
        </view>
      </view>
    </view>

    <!-- ===== 签到入口 ===== -->
    <view class="px-4 mt-4">
      <navigator url="/pages/check-in/index">
        <view class="rounded-2xl p-3 flex items-center justify-between border card-shadow" style="background: linear-gradient(to right, rgba(196,30,58,0.05), rgba(201,169,110,0.05)); border-color: rgba(196,30,58,0.2);">
          <view class="flex items-center gap-3">
            <view class="w-10 h-10 rounded-xl flex items-center justify-center" style="background: linear-gradient(135deg, var(--color-primary), var(--color-accent));">
              <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M9 16l2 2 4-4"/></svg>
            </view>
            <view>
              <view class="flex items-center gap-2">
                <text class="text-sm font-medium text-foreground">每日签到</text>
                <view
                  v-if="userData.checkIn.todayChecked"
                  class="px-1.5 rounded"
                  style="background: rgba(82,196,26,0.1);"
                >
                  <text style="font-size: 10rpx; color: var(--color-chart-4);">已签到</text>
                </view>
                <view
                  v-else
                  class="px-1.5 rounded animate-pulse"
                  style="background: var(--color-primary);"
                >
                  <text style="font-size: 10rpx; color: var(--color-primary-foreground);">待签到</text>
                </view>
              </view>
              <text class="text-xs text-muted-foreground mt-0.5 block">
                已连续签到
                <text style="color: var(--color-primary); font-weight: 500;">{{ userData.checkIn.continuousDays }}</text>
                天，累计
                <text style="color: var(--color-accent); font-weight: 500;">{{ userData.checkIn.totalPoints }}</text>
                积分
              </text>
            </view>
          </view>
          <text class="text-muted-foreground">›</text>
        </view>
      </navigator>
    </view>

    <!-- ===== 继续学习卡片 ===== -->
    <view v-if="userData.continueLearning" class="px-4 mt-4">
      <navigator :url="`/pages/learn/detail?id=${userData.continueLearning.id}`">
        <view class="bg-card rounded-2xl overflow-hidden card-shadow card-shadow-hover p-3 flex items-center gap-3">
          <view class="w-16 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style="background: linear-gradient(135deg, rgba(196,30,58,0.1), rgba(201,169,110,0.1));">
            <text class="text-2xl text-primary">▶</text>
          </view>
          <view class="flex-1 min-w-0">
            <text class="text-xs text-muted-foreground block">继续学习</text>
            <text class="text-sm font-medium text-foreground block" style="overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">
              {{ userData.continueLearning.title }}
            </text>
            <text class="text-xs text-muted-foreground block" style="overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">
              {{ userData.continueLearning.lastLesson }}
            </text>
          </view>
          <view class="flex flex-col items-end">
            <text class="text-sm font-bold text-primary">{{ userData.continueLearning.progress }}%</text>
            <view class="w-12 h-1 rounded-full overflow-hidden mt-1 bg-secondary">
              <view class="h-full rounded-full bg-primary" :style="{ width: userData.continueLearning.progress + '%' }" />
            </view>
          </view>
        </view>
      </navigator>
    </view>

    <!-- ===== 猜你喜欢 ===== -->
    <view class="px-4 mt-4 mb-6">
      <view class="flex items-center justify-between mb-3">
        <text class="font-medium text-foreground">猜你喜欢</text>
        <navigator url="/pages/discover/index" class="flex items-center">
          <text class="text-xs text-muted-foreground">更多 ›</text>
        </navigator>
      </view>
      <scroll-view scroll-x class="flex gap-3 pb-1">
        <navigator
          v-for="item in recommendations"
          :key="item.id"
          :url="item.type === 'course' ? `/pages/courses/detail?id=${item.id}` : `/pages/mall/product?id=${item.id}`"
          class="flex-shrink-0 w-32"
        >
          <view class="rounded-lg relative flex items-center justify-center card-shadow" style="aspect-ratio: 3/4; background: linear-gradient(135deg, rgba(196,30,58,0.05), rgba(201,169,110,0.05));">
            <svg v-if="item.type === 'course'" class="w-8 h-8 text-primary/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            <svg v-else class="w-8 h-8 text-accent/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
            <view v-if="item.tag" class="absolute top-1.5 left-1.5 px-1.5 rounded bg-primary">
              <text class="text-white" style="font-size: 10rpx;">{{ item.tag }}</text>
            </view>
          </view>
          <text class="text-xs font-medium mt-2 leading-relaxed text-foreground block line-clamp-2">{{ item.title }}</text>
          <view class="flex items-baseline gap-1 mt-1">
            <text class="text-sm font-bold text-primary">¥{{ item.price }}</text>
            <text class="text-xs text-muted-foreground line-through">¥{{ item.originalPrice }}</text>
          </view>
        </navigator>
      </scroll-view>
    </view>

    <!-- 会员到期提醒 -->
    <view
      v-if="userData.isVip && userData.vipDaysLeft <= 30"
      class="fixed left-4 right-4 max-w-lg mx-auto"
      style="bottom: 80rpx;"
    >
      <view class="p-3 flex items-center justify-between rounded-2xl card-shadow" style="background: linear-gradient(to right, var(--color-accent), #D4B87D);">
        <view class="flex items-center gap-2">
          <svg class="w-5 h-5 text-white mr-1" viewBox="0 0 24 24" fill="currentColor"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7z"/></svg>
          <text class="text-white text-sm">会员还剩 {{ userData.vipDaysLeft }} 天到期</text>
        </view>
        <navigator url="/pages/vip/index" class="px-3 py-1 bg-white rounded-full">
          <text class="text-xs font-medium" style="color: var(--color-accent);">立即续费</text>
        </navigator>
      </view>
    </view>

    <!-- 底部导航 -->
    <bottom-tab-bar active-tab="mine" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, defineComponent, h } from 'vue'

// SVG Icon components
const CompassIcon = defineComponent({ render: () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [h('circle', { cx: '12', cy: '12', r: '10' }), h('polygon', { points: '16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76' })]) })
const BookOpenIcon = defineComponent({ render: () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [h('path', { d: 'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z' }), h('path', { d: 'M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z' })]) })
const UsersIcon = defineComponent({ render: () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [h('path', { d: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2' }), h('circle', { cx: '9', cy: '7', r: '4' }), h('path', { d: 'M23 21v-2a4 4 0 0 0-3-3.87' }), h('path', { d: 'M16 3.13a4 4 0 0 1 0 7.75' })]) })
const StickyNoteIcon = defineComponent({ render: () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [h('path', { d: 'M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z' }), h('polyline', { points: '14 2 14 8 20 8' })]) })
const HeartIcon = defineComponent({ render: () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [h('path', { d: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z' })]) })
const FileTextIcon = defineComponent({ render: () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [h('path', { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' }), h('polyline', { points: '14 2 14 8 20 8' }), h('line', { x1: '16', y1: '13', x2: '8', y2: '13' }), h('line', { x1: '16', y1: '17', x2: '8', y2: '17' }), h('polyline', { points: '10 9 9 9 8 9' })]) })
const HistoryIcon = defineComponent({ render: () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [h('polyline', { points: '1 4 1 10 7 10' }), h('path', { d: 'M3.51 15a9 9 0 1 0 .49-3.51' })]) })
const HelpCircleIcon = defineComponent({ render: () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [h('circle', { cx: '12', cy: '12', r: '10' }), h('path', { d: 'M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3' }), h('line', { x1: '12', y1: '17', x2: '12.01', y2: '17' })]) })
// Role icons
const CrownIcon = defineComponent({ render: () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [h('path', { d: 'M2 4l3 12h14l3-12-6 7-4-7-4 7z' }), h('line', { x1: '2', y1: '20', x2: '22', y2: '20' })]) })
const GraduationIcon = defineComponent({ render: () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [h('path', { d: 'M22 10v6M2 10l10-5 10 5-10 5z' }), h('path', { d: 'M6 12v5c3 3 9 3 12 0v-5' })]) })
const AwardIcon = defineComponent({ render: () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [h('circle', { cx: '12', cy: '8', r: '7' }), h('polyline', { points: '8.21 13.89 7 23 12 20 17 23 15.79 13.88' })]) })
const RadioIcon = defineComponent({ render: () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [h('circle', { cx: '12', cy: '12', r: '2' }), h('path', { d: 'M4.93 4.93a10 10 0 0 0 0 14.14M19.07 4.93a10 10 0 0 1 0 14.14' })]) })
const VideoIcon = defineComponent({ render: () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [h('polygon', { points: '23 7 16 12 23 17 23 7' }), h('rect', { x: '1', y: '5', width: '15', height: '14', rx: '2', ry: '2' })]) })
import BottomTabBar from '@/components/base/BottomTabBar.vue'

type UserRole = 'user' | 'circle_owner' | 'teacher' | 'station_owner' | 'streamer' | 'creator'

// --- 用户数据（与 React 版本完全一致）---
const userData = {
  name: '张三丰',
  avatar: '',
  isVip: true,
  vipLevel: '黄金会员',
  vipDaysLeft: 234,
  isVerified: true,
  roles: [
    { type: 'circle_owner' as UserRole, name: '张氏命理研习社', id: 1 },
    { type: 'teacher' as UserRole, name: '八字入门精讲', id: 1 },
    { type: 'streamer' as UserRole, name: '直播间', id: 1 },
  ],
  messages: { system: 2, interaction: 5, transaction: 1 },
  checkIn: { todayChecked: false, continuousDays: 7, totalPoints: 350 },
  stats: { following: 128, followers: 1024, likes: 3680 },
  coins: 520,
  coupons: 3,
  points: 1280,
  orders: { pending: 2, shipped: 1, received: 3, refund: 0 },
  continueLearning: { id: 1, title: '八字入门实战课', progress: 45, lastLesson: '第三章：天干地支详解' },
}

// --- 状态 ---
const greeting = ref('')

// --- 计算属性 ---
const totalMessages = computed(() =>
  userData.messages.system + userData.messages.interaction + userData.messages.transaction
)

// --- 订单状态配置 ---
const orderStatus = [
  { key: 'pending', label: '待付款', count: userData.orders.pending },
  { key: 'shipped', label: '待发货', count: userData.orders.shipped },
  { key: 'received', label: '待收货', count: userData.orders.received },
  { key: 'refund', label: '售后', count: userData.orders.refund },
]

// --- 常用功能 ---
const quickFunctions = [
  { iconComponent: CompassIcon, label: '排盘记录', href: '/pages/paipan/history', color: 'var(--color-primary)' },
  { iconComponent: BookOpenIcon, label: '我的课程', href: '/pages/learning/index', color: '#4A90D9' },
  { iconComponent: UsersIcon, label: '我的圈子', href: '/pages/my-circles/index', color: '#722ED1' },
  { iconComponent: StickyNoteIcon, label: '我的笔记', href: '/pages/notes/index', color: 'var(--color-accent)' },
  { iconComponent: HeartIcon, label: '我的收藏', href: '/pages/favorites/index', color: 'var(--color-primary)' },
  { iconComponent: FileTextIcon, label: '我的电子书', href: '/pages/downloads/index', color: 'var(--color-chart-4)' },
  { iconComponent: HistoryIcon, label: '浏览历史', href: '/pages/history/index', color: '#64748B' },
  { iconComponent: HelpCircleIcon, label: '帮助中心', href: '/pages/help/index', color: 'var(--color-muted-foreground)' },
]

// --- 猜你喜欢 ---
const recommendations = [
  { id: 1, type: 'course', title: '紫微斗数入门精讲', price: 199, originalPrice: 399, tag: '热门' },
  { id: 2, type: 'product', title: '专业罗盘套装', price: 298, originalPrice: 598, tag: '特惠' },
  { id: 3, type: 'course', title: '六爻预测实战班', price: 299, originalPrice: 499, tag: '新课' },
  { id: 4, type: 'product', title: '渊海子平精装版', price: 68, originalPrice: 128, tag: '' },
]

// --- 角色配置 ---
const roleConfig: Record<UserRole, { label: string; iconComponent: any; color: string; bgColor: string }> = {
  user: { label: '普通用户', iconComponent: UsersIcon, color: 'var(--color-muted-foreground)', bgColor: 'var(--color-muted)' },
  circle_owner: { label: '圈主后台', iconComponent: CrownIcon, color: 'var(--color-accent)', bgColor: 'rgba(201,169,110,0.1)' },
  teacher: { label: '讲师后台', iconComponent: GraduationIcon, color: '#4A90D9', bgColor: 'rgba(74,144,217,0.1)' },
  station_owner: { label: '站长后台', iconComponent: AwardIcon, color: 'var(--color-chart-4)', bgColor: 'rgba(82,196,26,0.1)' },
  streamer: { label: '主播中心', iconComponent: RadioIcon, color: 'var(--color-primary)', bgColor: 'rgba(196,30,58,0.1)' },
  creator: { label: '创作中心', iconComponent: VideoIcon, color: '#722ED1', bgColor: 'rgba(114,46,209,0.1)' },
}

// --- 方法 ---
function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了'
  if (hour < 12) return '早上好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
}

function getRoleHref(type: UserRole, id: number): string {
  switch (type) {
    case 'circle_owner': return `/pages/circle/settings?id=${id}`
    case 'teacher': return '/pages/manage/my-courses'
    case 'streamer': return '/pages/creator/live/console'
    case 'creator': return '/pages/videos/creator'
    default: return '/pages/profile/index'
  }
}

function showQrCode() {
  uni.showToast({ title: '二维码', icon: 'none' })
}

onMounted(() => {
  greeting.value = getGreeting()
})
</script>
