<script setup lang="ts">
/**
 * 圈子搜索（视觉层沿用原型 app/circles/search/page.tsx；逻辑层重写为真连后端）
 * 搜索栏 + 历史(本地存储)/热门(运营引导词) + 骨架(搜索中) + 结果列表/空/错误三态
 * 真连 GET /circles?keyword=（circleApi.list）。
 */
import { ref } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { circleApi, type Circle } from '@/lib/circle-data'

// 热门搜索：运营引导词（非冒充统计的假数据）
const hotSearches = ['八字命理', '紫微斗数', '风水堪舆', '易经', '六爻', '奇门遁甲', '四柱', '国学']
const HISTORY_KEY = 'circle_search_history'

const keyword = ref('')
const hasSearched = ref(false)
const history = ref<string[]>((uni.getStorageSync(HISTORY_KEY) as string[]) || [])
const results = ref<Circle[]>([])
const searching = ref(false)
const error = ref('')

function formatCount(n: number) { return n >= 10000 ? `${(n / 10000).toFixed(1)}万` : String(n) }

function saveHistory(k: string) {
  history.value = [k, ...history.value.filter(h => h !== k)].slice(0, 10)
  uni.setStorageSync(HISTORY_KEY, history.value)
}

async function doSearch(kw: string) {
  const k = kw.trim()
  if (!k) return
  keyword.value = k
  hasSearched.value = true
  searching.value = true
  error.value = ''
  saveHistory(k)
  try {
    const res = await circleApi.list({ keyword: k })
    results.value = res.data
  } catch {
    results.value = []
    error.value = '搜索失败，请重试'
  } finally {
    searching.value = false
  }
}
function clearHistory() { history.value = []; uni.removeStorageSync(HISTORY_KEY) }
function clearKeyword() { keyword.value = ''; hasSearched.value = false; results.value = [] }
function openCircle(id: string) { navigateTo(`/pkg-circle/circles/detail?id=${id}`) }
</script>

<template>
  <view class="sr">
    <!-- 搜索栏 -->
    <view class="sr-bar">
      <view @tap="goBack" class="sr-back"><app-icon name="arrow-left" :size="44" color="#2C2C2C" /></view>
      <view class="sr-input-wrap">
        <app-icon name="search" :size="28" color="#999999" class="sr-input-icon" />
        <input v-model="keyword" class="sr-input" placeholder="搜索圈子名称、分类..." placeholder-class="sr-ph" confirm-type="search" @confirm="doSearch(keyword)" />
        <view v-if="keyword" class="sr-clear" @tap="clearKeyword"><app-icon name="x" :size="28" color="#999999" /></view>
      </view>
      <text class="sr-cancel" @tap="goBack">取消</text>
    </view>

    <view class="sr-body">
      <!-- 未搜索 -->
      <view v-if="!hasSearched" class="sr-pre">
        <view v-if="history.length" class="sr-sec">
          <view class="sr-sec-head">
            <text class="sr-sec-title">搜索历史</text>
            <text class="sr-sec-clear" @tap="clearHistory">清空</text>
          </view>
          <view class="sr-tags">
            <view v-for="(kw, i) in history" :key="i" class="sr-tag" @tap="doSearch(kw)"><text class="sr-tag-txt">{{ kw }}</text></view>
          </view>
        </view>
        <view class="sr-sec">
          <view class="sr-sec-head start">
            <app-icon name="trending-up" :size="28" color="#C41E3A" />
            <text class="sr-sec-title">热门搜索</text>
          </view>
          <view class="sr-tags">
            <view v-for="(kw, i) in hotSearches" :key="i" class="sr-tag" @tap="doSearch(kw)">
              <text v-if="i < 3" class="sr-tag-rank">{{ i + 1 }}</text>
              <text class="sr-tag-txt">{{ kw }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 搜索中骨架 -->
      <view v-else-if="searching" class="sr-skeleton">
        <view v-for="i in 3" :key="i" class="sr-sk-row">
          <view class="sr-sk-avatar" />
          <view class="sr-sk-main">
            <view class="sr-sk-line w75" />
            <view class="sr-sk-line w50" />
            <view class="sr-sk-line w66" />
          </view>
        </view>
      </view>

      <!-- 错误态 -->
      <view v-else-if="error" class="sr-empty">
        <view class="sr-empty-icon"><app-icon name="search" :size="56" color="#999999" /></view>
        <text class="sr-empty-title">{{ error }}</text>
        <view class="sr-retry" @tap="doSearch(keyword)"><text class="sr-retry-txt">重试</text></view>
      </view>

      <!-- 无结果 -->
      <view v-else-if="results.length === 0" class="sr-empty">
        <view class="sr-empty-icon"><app-icon name="search" :size="56" color="#999999" /></view>
        <text class="sr-empty-title">没有找到相关圈子</text>
        <text class="sr-empty-sub">换个关键词试试？</text>
      </view>

      <!-- 结果 -->
      <view v-else class="sr-results">
        <text class="sr-count">找到 <text class="sr-count-num">{{ results.length }}</text> 个相关圈子</text>
        <view v-for="c in results" :key="c.id" class="sr-result" @tap="openCircle(c.id)">
          <image lazy-load :src="c.cover" class="sr-result-avatar" mode="aspectFill" />
          <view class="sr-result-main">
            <view class="sr-result-top">
              <text class="sr-result-name">{{ c.name }}</text>
              <text v-if="c.isPaid" class="sr-result-paid">付费</text>
            </view>
            <text class="sr-result-desc">{{ c.description }}</text>
            <view class="sr-result-bottom">
              <view class="sr-result-members"><app-icon name="users" :size="24" color="#999999" /><text class="sr-result-members-txt">{{ formatCount(c.members) }} 成员</text></view>
              <text v-if="c.isJoined" class="sr-result-joined">已加入</text>
              <text v-else class="sr-result-price">{{ c.isPaid ? `¥${c.price}/年` : '免费加入' }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.sr { min-height: 100vh; background: var(--bg-paper, #FAF8F5); }
.sr-bar { position: sticky; top: 0; z-index: 10; background: var(--bg-paper, #FAF8F5); border-bottom: 2rpx solid var(--border, #EDE8E0); display: flex; align-items: center; gap: 16rpx; padding: 16rpx 32rpx; padding-top: calc(16rpx + var(--status-bar-height, 0px)); }
.sr-back { flex-shrink: 0; }
.sr-input-wrap { flex: 1; position: relative; display: flex; align-items: center; }
.sr-input-icon { position: absolute; left: 24rpx; z-index: 1; }
.sr-input { width: 100%; padding: 16rpx 64rpx; background: #F0EBE3; border-radius: 999rpx; font-size: 28rpx; color: var(--text-ink, #2C2C2C); box-sizing: border-box; }
.sr-ph { color: #999; }
.sr-clear { position: absolute; right: 24rpx; }
.sr-cancel { font-size: 28rpx; color: #999; flex-shrink: 0; }
.sr-body { padding-bottom: 160rpx; }
.sr-pre { padding: 40rpx 32rpx 0; display: flex; flex-direction: column; gap: 48rpx; }
.sr-sec-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24rpx; }
.sr-sec-head.start { justify-content: flex-start; gap: 16rpx; }
.sr-sec-title { font-size: 28rpx; font-weight: 600; color: var(--text-ink, #2C2C2C); }
.sr-sec-clear { font-size: 24rpx; color: #999; }
.sr-tags { display: flex; flex-wrap: wrap; gap: 16rpx; }
.sr-tag { display: flex; align-items: center; gap: 8rpx; padding: 12rpx 24rpx; background: #F0EBE3; border-radius: 999rpx; }
.sr-tag-rank { font-size: 24rpx; font-weight: 700; color: var(--brand, var(--brand)); }
.sr-tag-txt { font-size: 28rpx; color: var(--text-ink, #2C2C2C); }
/* 骨架 */
.sr-skeleton { padding: 40rpx 32rpx 0; display: flex; flex-direction: column; gap: 24rpx; }
.sr-sk-row { display: flex; gap: 24rpx; }
.sr-sk-avatar { width: 128rpx; height: 128rpx; border-radius: 24rpx; background: #F0EBE3; flex-shrink: 0; }
.sr-sk-main { flex: 1; display: flex; flex-direction: column; gap: 16rpx; padding-top: 8rpx; }
.sr-sk-line { height: 28rpx; background: #F0EBE3; border-radius: 8rpx; }
.sr-sk-line.w75 { width: 75%; }
.sr-sk-line.w50 { width: 50%; }
.sr-sk-line.w66 { width: 66%; }
/* 空态/错误态 */
.sr-empty { display: flex; flex-direction: column; align-items: center; padding-top: 192rpx; }
.sr-empty-icon { width: 128rpx; height: 128rpx; border-radius: 999rpx; background: #F0EBE3; display: flex; align-items: center; justify-content: center; margin-bottom: 32rpx; }
.sr-empty-title { font-size: 28rpx; font-weight: 500; color: var(--text-ink, #2C2C2C); margin-bottom: 8rpx; }
.sr-empty-sub { font-size: 26rpx; color: #999; }
.sr-retry { margin-top: 24rpx; padding: 12rpx 48rpx; border-radius: 999rpx; background: var(--brand, var(--brand)); }
.sr-retry-txt { font-size: 26rpx; color: #fff; }
/* 结果 */
.sr-results { padding: 32rpx; display: flex; flex-direction: column; gap: 24rpx; }
.sr-count { font-size: 26rpx; color: #999; }
.sr-count-num { color: var(--brand, var(--brand)); font-weight: 500; }
.sr-result { display: flex; gap: 24rpx; padding: 24rpx; border: 2rpx solid var(--border, #EDE8E0); background: var(--card, #fff); border-radius: 24rpx; }
.sr-result-avatar { width: 128rpx; height: 128rpx; border-radius: 24rpx; flex-shrink: 0; }
.sr-result-main { flex: 1; min-width: 0; }
.sr-result-top { display: flex; align-items: center; gap: 16rpx; margin-bottom: 4rpx; }
.sr-result-name { font-size: 28rpx; font-weight: 600; color: var(--text-ink, #2C2C2C); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 320rpx; }
.sr-result-paid { font-size: 20rpx; padding: 2rpx 12rpx; background: #FEF3C7; color: #92400E; border-radius: 8rpx; flex-shrink: 0; }
.sr-result-desc { display: block; font-size: 24rpx; color: #999; margin-bottom: 16rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sr-result-bottom { display: flex; align-items: center; justify-content: space-between; }
.sr-result-members { display: flex; align-items: center; gap: 8rpx; }
.sr-result-members-txt { font-size: 24rpx; color: #999; }
.sr-result-joined { font-size: 24rpx; color: #999; }
.sr-result-price { font-size: 24rpx; color: var(--brand, var(--brand)); font-weight: 500; }
</style>
