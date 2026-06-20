<script setup lang="ts">
/**
 * 我的圈子（从原型 app/circles/mine/page.tsx 高保真迁移）
 * 已加入/我创建 双Tab + 圈子卡片列表 + 创建新圈子入口 + 空态。
 */
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { circleApi, type Circle } from '@/lib/circle-data'

type Tab = 'joined' | 'created'
const activeTab = ref<Tab>('joined')
const loading = ref(false)
const joinedCircles = ref<Circle[]>([])
const createdCircles = ref<Circle[]>([])

const displayCircles = computed<Circle[]>(() =>
  activeTab.value === 'joined' ? joinedCircles.value : createdCircles.value,
)

onMounted(async () => {
  loading.value = true
  try {
    const [joined, created] = await Promise.all([
      circleApi.my(),
      circleApi.myCreated(),
    ])
    joinedCircles.value = joined as Circle[]
    createdCircles.value = created as Circle[]
  } catch (e) {
    console.error('Failed to load circles', e)
  } finally {
    loading.value = false
  }
})

function roleOf(c: Circle, index: number): 'owner' | 'admin' | '' {
  if (activeTab.value === 'created') return 'owner'
  // 已加入列表中第一项示意为管理员
  return index === 0 ? 'admin' : ''
}

function fmt(n: number) { return (n || 0).toLocaleString() }
function openCircle(id: string) { navigateTo(`/pkg-circle/circles/detail?id=${id}`) }
function goCreate() { navigateTo('/pkg-circle/circles/create') }
function goDiscover() { navigateTo('/pages/circles/index') }
</script>

<template>
  <view class="mc">
    <!-- 顶栏 -->
    <view class="mc-hdr">
      <view
        class="mc-hdr-btn"
        @tap="goBack"
      >
        <app-icon
          name="arrow-left"
          :size="40"
          color="#1a1a1a"
        />
      </view>
      <text class="mc-hdr-title">
        我的圈子
      </text>
      <view
        class="mc-hdr-btn"
        @tap="goCreate"
      >
        <app-icon
          name="plus"
          :size="40"
          color="#1a1a1a"
        />
      </view>
    </view>

    <!-- Tab -->
    <view class="mc-tabs">
      <view
        class="mc-tab"
        :class="{ on: activeTab === 'joined' }"
        @tap="activeTab = 'joined'"
      >
        <text
          class="mc-tab-t"
          :class="{ on: activeTab === 'joined' }"
        >
          已加入
        </text>
      </view>
      <view
        class="mc-tab"
        :class="{ on: activeTab === 'created' }"
        @tap="activeTab = 'created'"
      >
        <text
          class="mc-tab-t"
          :class="{ on: activeTab === 'created' }"
        >
          我创建
        </text>
      </view>
    </view>

    <scroll-view
      scroll-y
      class="mc-body"
    >
      <!-- 空态 -->
      <view
        v-if="!loading && displayCircles.length === 0"
        class="mc-empty"
      >
        <view class="mc-empty-icon">
          <app-icon
            name="inbox"
            :size="64"
            color="#c9b8a0"
          />
        </view>
        <text class="mc-empty-title">
          {{ activeTab === 'joined' ? '还没有加入任何圈子' : '还没有创建圈子' }}
        </text>
        <text class="mc-empty-sub">
          这里还没有内容
        </text>
        <view
          class="mc-empty-btn"
          @tap="goDiscover"
        >
          <text class="mc-empty-btn-t">
            {{ activeTab === 'joined' ? '去发现圈子' : '立即创建' }}
          </text>
        </view>
      </view>

      <!-- 列表 -->
      <view
        v-else
        class="mc-list"
      >
        <view
          v-for="(c, i) in displayCircles"
          :key="c.id"
          class="mc-card"
          @tap="openCircle(c.id)"
        >
          <image
            :src="c.cover"
            class="mc-card-cover"
            mode="aspectFill"
          />
          <view class="mc-card-main">
            <view class="mc-card-name-row">
              <text class="mc-card-name">
                {{ c.name }}
              </text>
              <view
                v-if="roleOf(c, i) === 'owner'"
                class="mc-badge owner"
              >
                <app-icon
                  name="crown"
                  :size="20"
                  color="#b8860b"
                /><text class="mc-badge-t owner">
                  圈主
                </text>
              </view>
              <view
                v-else-if="roleOf(c, i) === 'admin'"
                class="mc-badge admin"
              >
                <text class="mc-badge-t admin">
                  管理员
                </text>
              </view>
            </view>
            <text class="mc-card-desc">
              {{ c.description || '国学文化交流圈子' }}
            </text>
            <view class="mc-card-meta">
              <view class="mc-card-stat">
                <app-icon
                  name="users"
                  :size="22"
                  color="#999999"
                /><text class="mc-card-stat-t">
                  {{ fmt(c.members) }} 成员
                </text>
              </view>
              <view
                v-if="i === 0"
                class="mc-card-stat new"
              >
                <app-icon
                  name="bell"
                  :size="22"
                  color="#c41e3a"
                /><text class="mc-card-stat-t new">
                  有新内容
                </text>
              </view>
            </view>
          </view>
          <app-icon
            name="chevron-right"
            :size="32"
            color="#cccccc"
          />
        </view>

        <!-- 创建新圈子入口 -->
        <view
          class="mc-create"
          @tap="goCreate"
        >
          <view class="mc-create-icon">
            <app-icon
              name="plus"
              :size="40"
              color="#8a8378"
            />
          </view>
          <text class="mc-create-t">
            创建一个新圈子
          </text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.mc { display: flex; flex-direction: column; height: 100vh; background: #faf6f0; }
.mc-hdr { display: flex; align-items: center; justify-content: space-between; height: 88rpx; padding: 0 24rpx; background: #faf6f0; border-bottom: 2rpx solid rgba(0,0,0,0.08); padding-top: var(--status-bar-height, 0); flex-shrink: 0; }
.mc-hdr-btn { width: 72rpx; padding: 8rpx; display: flex; align-items: center; justify-content: center; }
.mc-hdr-title { flex: 1; text-align: center; font-size: 34rpx; font-weight: 600; color: #1a1a1a; }
/* Tab */
.mc-tabs { display: flex; gap: 16rpx; padding: 24rpx 32rpx 8rpx; flex-shrink: 0; }
.mc-tab { padding: 14rpx 32rpx; border-radius: 999rpx; background: #f0ebe3; }
.mc-tab.on { background: #c41e3a; }
.mc-tab-t { font-size: 26rpx; font-weight: 500; color: #1a1a1a; }
.mc-tab-t.on { color: #fff; }
/* body */
.mc-body { flex: 1; overflow: hidden; padding: 24rpx 32rpx 48rpx; box-sizing: border-box; }
/* 空态 */
.mc-empty { display: flex; flex-direction: column; align-items: center; padding-top: 140rpx; }
.mc-empty-icon { width: 128rpx; height: 128rpx; border-radius: 999rpx; background: #f0ebe3; display: flex; align-items: center; justify-content: center; }
.mc-empty-title { font-size: 30rpx; font-weight: 600; color: #1a1a1a; margin-top: 32rpx; }
.mc-empty-sub { font-size: 24rpx; color: #b5aea3; margin-top: 12rpx; }
.mc-empty-btn { margin-top: 32rpx; padding: 20rpx 48rpx; border-radius: 999rpx; background: #c41e3a; }
.mc-empty-btn-t { font-size: 28rpx; font-weight: 600; color: #fff; }
/* 列表 */
.mc-list { display: flex; flex-direction: column; gap: 20rpx; }
.mc-card { display: flex; align-items: center; gap: 20rpx; padding: 24rpx; border-radius: 24rpx; border: 2rpx solid rgba(0,0,0,0.08); background: #fff; }
.mc-card-cover { width: 112rpx; height: 112rpx; border-radius: 20rpx; flex-shrink: 0; background: #f0ebe3; }
.mc-card-main { flex: 1; min-width: 0; }
.mc-card-name-row { display: flex; align-items: center; gap: 12rpx; margin-bottom: 8rpx; }
.mc-card-name { font-size: 30rpx; font-weight: 600; color: #1a1a1a; max-width: 280rpx; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.mc-badge { display: flex; align-items: center; gap: 4rpx; padding: 2rpx 12rpx; border-radius: 8rpx; flex-shrink: 0; }
.mc-badge.owner { background: #fdf0d5; }
.mc-badge.admin { background: #e3effb; }
.mc-badge-t { font-size: 18rpx; }
.mc-badge-t.owner { color: #b8860b; }
.mc-badge-t.admin { color: #2d6da3; }
.mc-card-desc { display: block; font-size: 24rpx; color: #8a8378; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; margin-bottom: 12rpx; }
.mc-card-meta { display: flex; align-items: center; gap: 24rpx; }
.mc-card-stat { display: flex; align-items: center; gap: 6rpx; }
.mc-card-stat-t { font-size: 22rpx; color: #999; }
.mc-card-stat.new .mc-card-stat-t.new { color: #c41e3a; }
/* 创建入口 */
.mc-create { display: flex; flex-direction: column; align-items: center; gap: 16rpx; padding: 40rpx 0; border-radius: 24rpx; border: 4rpx dashed rgba(0,0,0,0.15); background: #faf6f0; }
.mc-create-icon { width: 88rpx; height: 88rpx; border-radius: 999rpx; background: #f0ebe3; display: flex; align-items: center; justify-content: center; }
.mc-create-t { font-size: 26rpx; color: #8a8378; }
</style>
