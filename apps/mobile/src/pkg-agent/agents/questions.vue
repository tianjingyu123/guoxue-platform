<template>
  <view v-if="loading" class="load-state"><text class="load-state-text">加载中...</text></view>
  <view v-else-if="error" class="load-state">
    <text class="load-state-text">{{ error }}</text>
    <view class="retry-btn" @tap="loadData"><text class="retry-text">重试</text></view>
  </view>
  <view v-else class="page">
    <!-- 顶栏 -->
    <view class="topbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="tb-inner">
        <view class="tb-back" @tap="goBack">
          <app-icon name="arrow-left" :size="40" color="#2b2b2b" />
        </view>
        <text class="tb-title">常见问题</text>
        <view class="tb-placeholder" />
      </view>
    </view>

    <view class="body">
      <!-- 搜索 -->
      <view class="search-box">
        <app-icon name="search" :size="32" color="#999999" />
        <input
          v-model="search"
          class="search-input"
          type="text"
          placeholder="搜索问题"
          placeholder-class="search-ph"
        />
      </view>

      <!-- 分类筛选 -->
      <scroll-view class="cat-scroll" scroll-x :show-scrollbar="false">
        <view class="cat-row">
          <view
            v-for="cat in allCategories"
            :key="cat"
            class="cat-chip"
            :class="{ 'cat-chip-on': activeCategory === cat }"
            @tap="activeCategory = cat"
          >{{ cat }}</view>
        </view>
      </scroll-view>

      <!-- 空状态 -->
      <view v-if="filtered.length === 0" class="empty">
        <app-icon name="help-circle" :size="80" color="#d8d8d8" />
        <text class="empty-txt">未找到相关问题</text>
      </view>

      <!-- FAQ 列表 -->
      <view v-else class="faq-list">
        <view v-for="faq in filtered" :key="faq.id" class="faq-card">
          <view class="faq-q" @tap="toggle(faq.id)">
            <view class="faq-q-left">
              <app-icon name="help-circle" :size="32" color="#c41e3a" />
              <text class="faq-q-txt">{{ faq.question }}</text>
            </view>
            <app-icon :name="openId === faq.id ? 'chevron-up' : 'chevron-down'" :size="30" color="#999999" />
          </view>
          <view v-if="openId === faq.id" class="faq-a">
            <text class="faq-a-txt">{{ faq.answer }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { agentsSquareApi, type AgentFAQ } from '@/lib/agents-square-data'

const loading = ref(true)
const error = ref('')
const statusBarHeight = ref(0)
const faqs = ref<AgentFAQ[]>([])
const search = ref('')
const openId = ref<string | null>(null)
const activeCategory = ref('全部')

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const data = await agentsSquareApi.getFaqs()
    faqs.value = data || []
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => { loadData() })

uni.getSystemInfo({
  success: (e) => {
    statusBarHeight.value = e.statusBarHeight || 0
  },
})

const allCategories = computed(() => ['全部', ...Array.from(new Set(faqs.value.map((f) => f.category)))])

const filtered = computed(() =>
  faqs.value.filter((f) => {
    const matchCategory = activeCategory.value === '全部' || f.category === activeCategory.value
    const matchSearch = !search.value || f.question.includes(search.value) || f.answer.includes(search.value)
    return matchCategory && matchSearch
  }),
)

function toggle(id: string) {
  openId.value = openId.value === id ? null : id
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
.load-state { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; gap: 24rpx; }
.load-state-text { font-size: 28rpx; color: #8a8178; }
.retry-btn { padding: 16rpx 48rpx; background: var(--brand); border-radius: 999rpx; }
.retry-text { font-size: 28rpx; color: #fff; }

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
  font-size: 34rpx;
  font-weight: 600;
  color: #2b2b2b;
  margin-left: 8rpx;
}
.tb-placeholder {
  width: 44rpx;
}
.body {
  padding: 28rpx 24rpx calc(40rpx + env(safe-area-inset-bottom));
}
.search-box {
  display: flex;
  align-items: center;
  gap: 12rpx;
  height: 72rpx;
  padding: 0 24rpx;
  background: #ffffff;
  border: 1rpx solid #ececec;
  border-radius: 999rpx;
  margin-bottom: 24rpx;
}
.search-input {
  flex: 1;
  font-size: 28rpx;
  color: #2b2b2b;
}
.search-ph {
  color: #aaaaaa;
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
  font-weight: 500;
}
.cat-chip-on {
  background: var(--brand);
  color: #ffffff;
}
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 120rpx;
  gap: 20rpx;
}
.empty-txt {
  font-size: 26rpx;
  color: #999999;
}
.faq-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.faq-card {
  background: #ffffff;
  border: 1rpx solid #ececec;
  border-radius: 24rpx;
  overflow: hidden;
}
.faq-q {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
  padding: 28rpx 24rpx;
}
.faq-q-left {
  display: flex;
  align-items: flex-start;
  gap: 14rpx;
  flex: 1;
  min-width: 0;
}
.faq-q-txt {
  font-size: 28rpx;
  font-weight: 500;
  color: #2b2b2b;
  line-height: 1.4;
}
.faq-a {
  padding: 24rpx 24rpx 28rpx;
  border-top: 1rpx solid #f0f0f0;
}
.faq-a-txt {
  font-size: 26rpx;
  color: #888888;
  line-height: 1.6;
}
</style>
