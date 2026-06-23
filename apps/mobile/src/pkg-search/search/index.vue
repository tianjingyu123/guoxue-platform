<template>
  <view class="search-page">
    <!-- 顶部搜索栏 -->
    <view class="search-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="search-bar-row">
        <view class="back-btn" @click="goBack">
          <app-icon name="arrow-left" :size="40" color="var(--text-main)" />
        </view>
        <view class="search-input-wrap">
          <app-icon name="search" :size="32" color="var(--text-soft)" />
          <input
            class="search-input"
            v-model="keyword"
            placeholder="搜索国学课程、文章、命理师"
            placeholder-class="search-input-ph"
            confirm-type="search"
            :focus="autoFocus"
            @confirm="doSearch(keyword)"
          />
          <view v-if="keyword" class="clear-btn" @click="keyword = ''">
            <app-icon name="x" :size="28" color="var(--text-soft)" />
          </view>
        </view>
        <view class="search-action" @click="doSearch(keyword)">
          <text class="search-action-text">搜索</text>
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="search-body">
      <!-- AI 智能搜索入口 -->
      <view class="ai-entry" @click="aiModalOpen = true">
        <view class="ai-entry-icon">
          <app-icon name="sparkles" :size="36" color="#ffffff" />
        </view>
        <view class="ai-entry-text">
          <text class="ai-entry-title">AI智能搜索</text>
          <text class="ai-entry-desc">用自然语言提问，获取精准答案</text>
        </view>
        <app-icon name="arrow-right" :size="32" color="var(--gold)" />
      </view>

      <!-- 搜索历史 -->
      <view v-if="historyList.length" class="sec">
        <view class="sec-head">
          <text class="sec-title">搜索历史</text>
          <view class="sec-clear" @click="clearHistory">
            <app-icon name="trash-2" :size="28" color="var(--text-soft)" />
          </view>
        </view>
        <view class="tag-wrap">
          <view
            v-for="(h, i) in historyList"
            :key="i"
            class="tag tag--history"
            @click="doSearch(h)"
          >
            <text class="tag-text">{{ h }}</text>
          </view>
        </view>
      </view>

      <!-- 热门搜索 -->
      <view class="sec">
        <view class="sec-head">
          <view class="sec-title-row">
            <app-icon name="flame" :size="32" color="#e8743b" />
            <text class="sec-title">热门搜索</text>
          </view>
        </view>
        <view class="hot-list">
          <view
            v-for="(item, idx) in hotList"
            :key="item.keyword"
            class="hot-item"
            @click="doSearch(item.keyword)"
          >
            <text class="hot-rank" :class="{ 'hot-rank--top': idx < 3 }">{{ idx + 1 }}</text>
            <text class="hot-keyword">{{ item.keyword }}</text>
            <view v-if="item.hot" class="hot-badge">
              <app-icon name="trending-up" :size="22" color="#e8743b" />
              <text class="hot-badge-text">热</text>
            </view>
            <text class="hot-count">{{ item.count }}</text>
          </view>
        </view>
      </view>

      <!-- 猜你想搜 -->
      <view class="sec">
        <view class="sec-head">
          <text class="sec-title">猜你想搜</text>
        </view>
        <view class="tag-wrap">
          <view
            v-for="(g, i) in guessList"
            :key="i"
            class="tag tag--guess"
            @click="doSearch(g)"
          >
            <text class="tag-text tag-text--guess">{{ g }}</text>
          </view>
        </view>
      </view>

      <view class="bottom-gap" />
    </scroll-view>

    <!-- AI 搜索弹窗 -->
    <ai-search-modal :is-open="aiModalOpen" @close="aiModalOpen = false" />
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import AiSearchModal from '@/components/common/ai-search-modal.vue'
import { navigateTo, navigateBack } from '@/utils/router'

// ===== UI 状态 =====
const statusBarHeight = ref(0)
const autoFocus = ref(false)
const aiModalOpen = ref(false)
const keyword = ref('')

// ===== Mock 数据（照抄原型 lib/api/search.ts，交接后由 Claude Code 接入接口）=====
// @data-needs: GET /api/search/history → string[]
const historyList = ref<string[]>(['八字命理', '紫微斗数', '风水布局', '梅花易数'])

// @data-needs: GET /api/search/hot → { keyword, count, hot }[]
const hotList = ref([
  { keyword: '八字入门教程', count: '12.8万', hot: true },
  { keyword: '紫微斗数排盘', count: '9.6万', hot: true },
  { keyword: '六爻预测', count: '7.2万', hot: true },
  { keyword: '奇门遁甲', count: '5.4万', hot: false },
  { keyword: '风水罗盘使用', count: '4.1万', hot: false },
  { keyword: '手相面相', count: '3.5万', hot: false },
  { keyword: '塔罗牌占卜', count: '2.9万', hot: false },
  { keyword: '黄历择吉', count: '2.3万', hot: false },
])

// @data-needs: GET /api/search/guess → string[]
const guessList = ref<string[]>([
  '今日运势', '生肖配对', '姓名测试', '周公解梦', '星座运程', '财运分析',
])

onLoad((opt) => {
  try {
    const sys = uni.getSystemInfoSync()
    statusBarHeight.value = sys.statusBarHeight || 0
  } catch (e) {
    statusBarHeight.value = 0
  }
  if (opt && opt.keyword) {
    keyword.value = decodeURIComponent(opt.keyword)
  } else {
    autoFocus.value = true
  }
})

function goBack() {
  navigateBack()
}

function clearHistory() {
  historyList.value = []
}

function doSearch(kw: string) {
  const q = (kw || '').trim()
  if (!q) return
  // 记录历史（UI 临时，交接后由后端持久化）
  if (!historyList.value.includes(q)) {
    historyList.value = [q, ...historyList.value].slice(0, 10)
  }
  navigateTo(`/search/result?keyword=${encodeURIComponent(q)}`)
}
</script>

<style scoped>
.search-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--background);
}

/* 顶部搜索栏 */
.search-header {
  background: var(--surface);
  border-bottom: 2rpx solid var(--line);
}
.search-bar-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 24rpx;
}
.back-btn {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.search-input-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12rpx;
  height: 72rpx;
  padding: 0 24rpx;
  background: var(--background);
  border-radius: 36rpx;
}
.search-input {
  flex: 1;
  font-size: 28rpx;
  color: var(--text-main);
}
.search-input-ph {
  color: var(--text-soft);
}
.clear-btn {
  width: 36rpx;
  height: 36rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.search-action {
  flex-shrink: 0;
  padding: 0 8rpx;
}
.search-action-text {
  font-size: 30rpx;
  color: var(--gold);
  font-weight: 500;
  white-space: nowrap;
}

/* 主体 */
.search-body {
  flex: 1;
  overflow: hidden;
}

/* AI 入口 */
.ai-entry {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin: 24rpx;
  padding: 28rpx 24rpx;
  background: linear-gradient(135deg, rgba(201, 169, 110, 0.14), rgba(201, 169, 110, 0.04));
  border: 2rpx solid rgba(201, 169, 110, 0.3);
  border-radius: 20rpx;
}
.ai-entry-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 18rpx;
  background: linear-gradient(135deg, #c9a96e, #b8935a);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.ai-entry-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.ai-entry-title {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--text-main);
}
.ai-entry-desc {
  font-size: 24rpx;
  color: var(--text-soft);
}

/* 区块 */
.sec {
  padding: 8rpx 24rpx 24rpx;
}
.sec-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 72rpx;
}
.sec-title-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
}
.sec-title {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--text-main);
}
.sec-clear {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 标签云 */
.tag-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.tag {
  padding: 12rpx 28rpx;
  border-radius: 32rpx;
  background: var(--surface);
  border: 2rpx solid var(--line);
}
.tag--guess {
  background: rgba(201, 169, 110, 0.08);
  border-color: rgba(201, 169, 110, 0.2);
}
.tag-text {
  font-size: 26rpx;
  color: var(--text-main);
  white-space: nowrap;
}
.tag-text--guess {
  color: var(--gold);
}

/* 热门列表 */
.hot-list {
  display: flex;
  flex-direction: column;
}
.hot-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  height: 88rpx;
}
.hot-rank {
  width: 40rpx;
  font-size: 30rpx;
  font-weight: 600;
  color: var(--text-soft);
  text-align: center;
  flex-shrink: 0;
}
.hot-rank--top {
  color: #e8743b;
}
.hot-keyword {
  flex: 1;
  font-size: 28rpx;
  color: var(--text-main);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.hot-badge {
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 2rpx 12rpx;
  border-radius: 16rpx;
  background: rgba(232, 116, 59, 0.12);
  flex-shrink: 0;
}
.hot-badge-text {
  font-size: 20rpx;
  color: #e8743b;
}
.hot-count {
  font-size: 24rpx;
  color: var(--text-soft);
  flex-shrink: 0;
}

.bottom-gap {
  height: 40rpx;
}
</style>
