<template>
  <view class="page">
    <!-- 顶栏 -->
    <view
      class="topbar"
      :style="{ paddingTop: statusBarHeight + 'px' }"
    >
      <view class="tb-inner">
        <view
          class="tb-back"
          @tap="goBack"
        >
          <app-icon
            name="arrow-left"
            :size="40"
            color="#2b2b2b"
          />
        </view>
        <text class="tb-title">
          智能体排行
        </text>
        <view class="tb-placeholder" />
      </view>
    </view>

    <view class="body">
      <!-- 分类筛选 -->
      <scroll-view
        class="cat-scroll"
        scroll-x
        :show-scrollbar="false"
      >
        <view class="cat-row">
          <view
            class="cat-chip"
            :class="{ 'cat-chip-on': selectedCategory === null }"
            @tap="selectedCategory = null"
          >
            全部
          </view>
          <view
            v-for="cat in categories"
            :key="cat"
            class="cat-chip"
            :class="{ 'cat-chip-on': selectedCategory === cat }"
            @tap="selectedCategory = cat"
          >
            {{ cat }}
          </view>
        </view>
      </scroll-view>

      <!-- 排行榜 -->
      <view class="rank-list">
        <view
          v-for="(agent, idx) in filteredAgents"
          :key="agent.id"
          class="rank-card"
          @tap="goChat(agent.id)"
        >
          <view class="rc-head">
            <view class="rc-avatar-wrap">
              <image
                class="rc-avatar"
                :src="agent.avatar"
                mode="aspectFill"
              />
              <view
                v-if="agent.verified"
                class="rc-verified"
              >
                <app-icon
                  name="check"
                  :size="20"
                  color="#ffffff"
                />
              </view>
            </view>
            <view class="rc-info">
              <view class="rc-title-row">
                <text class="rc-rank">
                  #{{ idx + 1 }}
                </text>
                <text class="rc-name">
                  {{ agent.name }}
                </text>
                <text class="rc-cat">
                  {{ agent.category }}
                </text>
              </view>
              <text class="rc-desc">
                {{ agent.description }}
              </text>
            </view>
          </view>

          <view class="rc-stats">
            <view class="rc-stat">
              <text class="rc-stat-num">
                {{ agent.users.toLocaleString() }}
              </text>
              <text class="rc-stat-label">
                用户
              </text>
            </view>
            <view class="rc-stat">
              <text class="rc-stat-num">
                {{ agent.sessions.toLocaleString() }}
              </text>
              <text class="rc-stat-label">
                对话
              </text>
            </view>
            <view class="rc-stat rc-stat-rating">
              <text class="rc-stat-num rc-rating-num">
                {{ agent.rating }} 分
              </text>
              <text class="rc-stat-label">
                评分
              </text>
            </view>
          </view>

          <view
            class="rc-btn"
            @tap.stop="goChat(agent.id)"
          >
            <app-icon
              name="message-circle"
              :size="30"
              color="#ffffff"
            />
            <text class="rc-btn-txt">
              立即对话
            </text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import { agentsSquareApi, type RankingAgent } from '@/lib/agents-square-data'

const statusBarHeight = ref(0)
uni.getSystemInfo({
  success: (e) => {
    statusBarHeight.value = e.statusBarHeight || 0
  },
})

const list = ref<RankingAgent[]>([])
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    loading.value = true
    list.value = await agentsSquareApi.ranking()
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
})

const selectedCategory = ref<string | null>(null)

const categories = computed(() => Array.from(new Set(list.value.map((a) => a.category))))
const filteredAgents = computed(() =>
  selectedCategory.value ? list.value.filter((a) => a.category === selectedCategory.value) : list.value,
)

function goChat(id: string) {
  navigateTo(`/agent/${id}`)
}

function goBack() {
  // #ifdef H5
  if (window.history.length > 1) {
    uni.navigateBack()
    return
  }
  // #endif
  const pages = getCurrentPages()
  if (pages.length > 1) uni.navigateBack()
  else uni.reLaunch({ url: '/pkg-agent/agents/index' })
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f5f5f5;
}
.topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #ffffff;
  border-bottom: 1rpx solid #ececec;
}
.tb-inner {
  height: 88rpx;
  display: flex;
  align-items: center;
  padding: 0 24rpx;
}
.tb-back {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: -12rpx;
}
.tb-title {
  flex: 1;
  text-align: center;
  font-size: 34rpx;
  font-weight: 600;
  color: #2b2b2b;
}
.tb-placeholder {
  width: 56rpx;
}
.body {
  padding: 28rpx 24rpx calc(40rpx + env(safe-area-inset-bottom));
}
.cat-scroll {
  white-space: nowrap;
  margin-bottom: 28rpx;
}
.cat-row {
  display: inline-flex;
  gap: 16rpx;
  padding-bottom: 4rpx;
}
.cat-chip {
  flex-shrink: 0;
  padding: 12rpx 28rpx;
  border-radius: 999rpx;
  background: #ececec;
  color: #2b2b2b;
  font-size: 26rpx;
}
.cat-chip-on {
  background: #c41e3a;
  color: #ffffff;
}
.rank-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.rank-card {
  background: #ffffff;
  border: 1rpx solid #ececec;
  border-radius: 24rpx;
  padding: 28rpx 24rpx;
}
.rc-head {
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
  margin-bottom: 24rpx;
}
.rc-avatar-wrap {
  position: relative;
  flex-shrink: 0;
}
.rc-avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: #f0f0f0;
}
.rc-verified {
  position: absolute;
  right: -4rpx;
  bottom: -4rpx;
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: #c41e3a;
  border: 4rpx solid #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
}
.rc-info {
  flex: 1;
  min-width: 0;
}
.rc-title-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 8rpx;
}
.rc-rank {
  font-size: 40rpx;
  font-weight: 700;
  color: #c41e3a;
}
.rc-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #2b2b2b;
}
.rc-cat {
  font-size: 20rpx;
  padding: 2rpx 14rpx;
  border-radius: 999rpx;
  background: #f0f0f0;
  color: #888888;
}
.rc-desc {
  font-size: 24rpx;
  color: #999999;
  line-height: 1.4;
}
.rc-stats {
  display: flex;
  gap: 12rpx;
  margin-bottom: 24rpx;
}
.rc-stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  padding: 16rpx 8rpx;
  background: #f7f7f7;
  border-radius: 12rpx;
}
.rc-stat-rating {
  flex: 2;
  background: rgba(196, 30, 58, 0.08);
}
.rc-stat-num {
  font-size: 26rpx;
  font-weight: 700;
  color: #2b2b2b;
}
.rc-rating-num {
  color: #c41e3a;
}
.rc-stat-label {
  font-size: 20rpx;
  color: #999999;
}
.rc-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  height: 72rpx;
  background: #c41e3a;
  border-radius: 16rpx;
}
.rc-btn-txt {
  font-size: 28rpx;
  font-weight: 500;
  color: #ffffff;
}
</style>
