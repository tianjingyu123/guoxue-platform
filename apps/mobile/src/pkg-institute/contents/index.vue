<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-back" @tap="goBack">
          <app-icon name="chevron-left" :size="22" color="#1a1a1a" />
        </view>
        <text class="nav-title">大师讲堂</text>
        <view class="nav-placeholder" />
      </view>
    </view>

    <scroll-view scroll-y class="scroll" :style="{ paddingTop: navHeight + 'px' }" @scrolltolower="loadMore">
      <!-- 类型筛选 tab -->
      <view class="filter-bar">
        <view
          v-for="t in typeTabs"
          :key="t.value"
          class="tab-btn"
          :class="{ 'tab-btn-active': selectedType === t.value }"
          @tap="switchType(t.value)"
        >
          <text class="tab-text" :class="{ 'tab-text-active': selectedType === t.value }">{{ t.label }}</text>
        </view>
      </view>

      <!-- 三态 -->
      <view v-if="loading" class="state-box">
        <view class="spinner" />
        <text class="state-text">加载中…</text>
      </view>
      <view v-else-if="error" class="state-box">
        <app-icon name="alert-circle" :size="40" color="#d1d5db" />
        <text class="state-text">{{ error }}</text>
        <view class="retry-btn" @tap="refresh"><text class="retry-text">重试</text></view>
      </view>
      <view v-else-if="isEmpty" class="state-box">
        <app-icon name="book-open" :size="48" color="#d1d5db" />
        <text class="state-text">暂无讲堂内容，敬请期待</text>
      </view>

      <!-- 内容卡列表 -->
      <view v-else class="list">
        <view v-for="c in list" :key="c.id" class="card" @tap="goDetail(c.id)">
          <view class="card-head">
            <text class="type-tag" :style="{ color: contentTypeColor[c.contentType].color, background: contentTypeColor[c.contentType].bg }">{{ contentTypeLabel[c.contentType] }}</text>
            <text class="card-title">{{ c.title }}</text>
          </view>
          <text v-if="c.summary" class="card-summary">{{ c.summary }}</text>
          <view class="card-foot">
            <view class="foot-left">
              <text v-if="c.price === 0" class="price-free">免费</text>
              <view v-else-if="c.purchased" class="owned-tag">
                <app-icon name="badge-check" :size="13" color="#16a34a" />
                <text class="owned-text">已购</text>
              </view>
              <text v-else class="price">{{ c.price }} 币</text>
            </view>
            <view class="foot-right">
              <app-icon name="users" :size="13" color="#9ca3af" />
              <text class="foot-meta">{{ c.purchaseCount }} 人已学 · {{ fmtDate(c.createdAt) }}</text>
            </view>
          </view>
        </view>
        <app-load-more :status="loadStatus" />
      </view>

      <view class="bottom-safe" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import AppLoadMore from '@/components/common/app-load-more.vue'
import { goBack } from '@/utils/router'
import { useList } from '@/composables/useList'
import { instituteApi, contentTypeLabel, contentTypeColor, fmtDate, type InstituteContentType, type InstituteContentItem } from '@/lib/institute-data'

const statusBarHeight = ref(0)
const navHeight = ref(44)
const sys = uni.getSystemInfoSync()
statusBarHeight.value = sys.statusBarHeight || 0
navHeight.value = (sys.statusBarHeight || 0) + 44

const typeTabs: { value: InstituteContentType | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'ARTICLE', label: '文章' },
  { value: 'VIDEO', label: '视频' },
  { value: 'DOCUMENT', label: '文档' },
]
const selectedType = ref<InstituteContentType | 'all'>('all')

const { list, loading, error, isEmpty, loadStatus, refresh, loadMore } = useList<InstituteContentItem, { type?: InstituteContentType }>({
  fetcher: (params) => instituteApi.getContents(params),
  getParams: () => (selectedType.value === 'all' ? {} : { type: selectedType.value }),
})

function switchType(t: InstituteContentType | 'all') {
  if (selectedType.value === t) return
  selectedType.value = t
  refresh()
}

onLoad(() => refresh())

function goDetail(id: string) {
  uni.navigateTo({ url: '/pkg-institute/contents/detail?id=' + encodeURIComponent(id) })
}
</script>

<style scoped>
.page { min-height: 100vh; background: #f5f5f5; }
.nav { position: fixed; top: 0; left: 0; right: 0; z-index: 20; background: rgba(255,255,255,0.95); backdrop-filter: blur(8px); border-bottom: 1px solid #ececec; }
.nav-bar { height: 44px; display: flex; align-items: center; padding: 0 12px; }
.nav-back { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; margin-left: -4px; }
.nav-title { flex: 1; text-align: center; font-size: 17px; font-weight: 600; color: #1a1a1a; }
.nav-placeholder { width: 32px; }
.scroll { height: 100vh; box-sizing: border-box; }

.filter-bar { display: flex; gap: 8px; padding: 12px 16px; background: #fff; border-bottom: 1px solid #ececec; }
.tab-btn { border: 1px solid #d1d5db; border-radius: 999px; padding: 5px 16px; background: #fff; }
.tab-btn-active { background: var(--brand); border-color: var(--brand); }
.tab-text { font-size: 13px; color: #4b5563; }
.tab-text-active { color: #fff; }

.list { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.card { background: #fff; border: 1px solid #ececec; border-radius: 12px; padding: 14px 16px; }
.card-head { display: flex; align-items: flex-start; gap: 8px; }
.type-tag { flex-shrink: 0; font-size: 11px; padding: 2px 8px; border-radius: 4px; margin-top: 2px; }
.card-title { flex: 1; font-size: 15px; font-weight: 600; color: #1a1a1a; line-height: 1.4; }
.card-summary { display: block; margin-top: 8px; font-size: 13px; color: #6b7280; line-height: 1.6; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }
.card-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 10px; padding-top: 10px; border-top: 1px solid #f3f4f6; }
.foot-left { display: flex; align-items: center; }
.price { font-size: 15px; font-weight: 700; color: var(--brand); }
.price-free { font-size: 13px; font-weight: 600; color: #16a34a; }
.owned-tag { display: flex; align-items: center; gap: 3px; background: #f0fdf4; border-radius: 4px; padding: 2px 8px; }
.owned-text { font-size: 12px; color: #16a34a; }
.foot-right { display: flex; align-items: center; gap: 4px; }
.foot-meta { font-size: 12px; color: #9ca3af; }

.state-box { padding: 80px 0; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.state-text { font-size: 13px; color: #9ca3af; }
.spinner { width: 28px; height: 28px; border: 3px solid #f0f0f0; border-top-color: var(--brand); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.retry-btn { margin-top: 4px; padding: 6px 20px; border: 1px solid var(--brand); border-radius: 999px; }
.retry-text { font-size: 13px; color: var(--brand); }
.bottom-safe { height: 24px; }
</style>
