<script setup lang="ts">
/**
 * 排盘案例库（同一真实经历 · 多术式交叉研习）
 *
 * 🔴 案例的「答案」是这个八字的**真实人生经历**，不是断语。
 *    列表页只给八字和身份，看答案得进去先断、再点「公布答案」。
 */
import { ref, computed, onMounted } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import ToolHeader from '@/components/paipan/tool-header.vue'
import PaperCard from '@/components/paipan/paper-card.vue'
import Disclaimer from '@/components/compliance/disclaimer.vue'
import { navigateTo } from '@/utils/router'
import {
  caseApi,
  CASE_METHODS,
  CASE_SOURCES,
  METHOD_LABEL,
  SOURCE_LABEL,
  type BaziCaseItem,
  type CaseMethod,
} from '@/pkg-paipan/lib/case-data'

const tab = ref<'lib' | 'rank'>('lib')

// 案例库
const list = ref<BaziCaseItem[]>([])
const total = ref(0)
const page = ref(1)
const loading = ref(true)
const failed = ref(false)
const noMore = ref(false)
const source = ref('')
const keyword = ref('')
const method = ref<CaseMethod>('ALL')

// 贡献榜
const rank = ref<any[]>([])
const rankLoading = ref(false)

// 我的投稿（称号）
const myBadge = ref<string | null>(null)
const myApproved = ref(0)

async function load(reset = false) {
  if (reset) {
    page.value = 1
    noMore.value = false
  }
  loading.value = true
  failed.value = false
  try {
    const res = await caseApi.list({
      page: page.value,
      pageSize: 20,
      source: source.value || undefined,
      keyword: keyword.value.trim() || undefined,
      method: method.value,
    })
    const items = res?.items ?? []
    list.value = reset ? items : [...list.value, ...items]
    total.value = res?.total ?? 0
    noMore.value = list.value.length >= total.value
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
}

async function loadRank() {
  if (rank.value.length) return
  rankLoading.value = true
  try {
    rank.value = (await caseApi.leaderboard(20)) ?? []
  } catch {
    rank.value = []
  } finally {
    rankLoading.value = false
  }
}

async function loadMine() {
  try {
    const r = await caseApi.mine()
    myBadge.value = r?.badge ?? null
    myApproved.value = r?.approved ?? 0
  } catch {
    // 未登录：不显示称号，不报错
  }
}

onMounted(() => {
  load(true)
  loadMine()
})
// 投稿回来刷新我的称号
onShow(loadMine)
onLoad((q: Record<string, string> = {}) => {
  const requested = String(q.method || '').toUpperCase() as CaseMethod
  if (CASE_METHODS.some((item) => item.key === requested)) method.value = requested
})

function onTab(k: 'lib' | 'rank') {
  tab.value = k
  if (k === 'rank') loadRank()
}

function onSource(k: string) {
  source.value = k
  load(true)
}

function onMethod(k: CaseMethod) {
  method.value = k
  load(true)
}

function more() {
  if (noMore.value || loading.value) return
  page.value += 1
  load()
}

function open(c: BaziCaseItem) {
  navigateTo(`/pkg-paipan/cases/detail?id=${c.id}&method=${method.value}`)
}

function goSubmit() {
  navigateTo('/pkg-paipan/cases/submit')
}

function goMine() {
  navigateTo('/mine/submissions')
}

const emptyText = computed(() =>
  keyword.value || source.value || method.value !== 'ALL' ? '没有匹配的案例' : '案例库还在积累中',
)
</script>

<template>
  <view class="cs">
    <ToolHeader title="排盘案例库" subtitle="一份经历 · 多术式交叉印证" />

    <view class="cs-tabs">
      <view class="cs-tab" :class="{ 'cs-tab--on': tab === 'lib' }" @tap="onTab('lib')">
        <text class="cs-tab-txt" :class="{ 'cs-tab-txt--on': tab === 'lib' }">案例库</text>
      </view>
      <view class="cs-tab" :class="{ 'cs-tab--on': tab === 'rank' }" @tap="onTab('rank')">
        <text class="cs-tab-txt" :class="{ 'cs-tab-txt--on': tab === 'rank' }">贡献榜</text>
      </view>
    </view>

    <scroll-view class="cs-body" scroll-y :show-scrollbar="false" @scrolltolower="more">
      <!-- ── 案例库 ── -->
      <template v-if="tab === 'lib'">
        <!-- 玩法说明：一句话讲清楚这里是干嘛的 -->
        <PaperCard padding="lg">
          <view class="cs-intro">
            <AppIcon name="lightbulb" :size="20" color="#C41E3A" />
            <text class="cs-intro-txt">同一份真实人生档案，由八字、紫微与命理研习共享。先自己判断，再换一种术式交叉印证；真实经历才是答案。</text>
          </view>
        </PaperCard>

        <scroll-view class="cs-methods" scroll-x :show-scrollbar="false">
          <view class="cs-methods-inner">
            <view v-for="item in CASE_METHODS" :key="item.key" class="cs-method" :class="{ 'cs-method--on': method === item.key }" @tap="onMethod(item.key)">
              <text class="cs-method-name" :class="{ 'cs-method-name--on': method === item.key }">{{ item.label }}</text>
              <text class="cs-method-desc" :class="{ 'cs-method-desc--on': method === item.key }">{{ item.description }}</text>
            </view>
          </view>
        </scroll-view>

        <view class="cs-bar">
          <view class="cs-search">
            <AppIcon name="search" :size="16" color="#B8AA9A" />
            <input
              v-model="keyword"
              class="cs-search-input"
              placeholder="搜案例 / 年代"
              placeholder-class="cs-ph"
              confirm-type="search"
              @confirm="load(true)"
            />
          </view>
          <view class="cs-submit" @tap="goSubmit">
            <AppIcon name="plus" :size="16" color="#fff" />
            <text class="cs-submit-txt">投稿</text>
          </view>
        </view>

        <view class="cs-mine" @tap="goMine">
          <view class="cs-mine-icon"><AppIcon name="file-text" :size="18" color="#A6342C" /></view>
          <view class="cs-mine-copy">
            <text class="cs-mine-title">{{ myBadge ? `${myBadge} · 已收录 ${myApproved} 篇` : '我的投稿' }}</text>
            <text class="cs-mine-sub">查看审核进度、收录结果与审核说明</text>
          </view>
          <AppIcon name="chevron-right" :size="18" color="#9A8C7E" />
        </view>

        <scroll-view class="cs-srcs" scroll-x :show-scrollbar="false">
          <view class="cs-srcs-inner">
            <view
              v-for="s in CASE_SOURCES"
              :key="s.key"
              class="cs-src"
              :class="{ 'cs-src--on': source === s.key }"
              @tap="onSource(s.key)"
            >
              <text class="cs-src-txt" :class="{ 'cs-src-txt--on': source === s.key }">{{ s.label }}</text>
            </view>
          </view>
        </scroll-view>

        <view v-if="loading && !list.length" class="cs-skeleton" />

        <PaperCard v-else-if="failed" padding="lg">
          <view class="cs-empty" @tap="load(true)">
            <text class="cs-empty-txt">加载失败，点击重试</text>
          </view>
        </PaperCard>

        <PaperCard v-else-if="!list.length" padding="lg">
          <view class="cs-empty">
            <AppIcon name="book-open" :size="40" color="#D5C9B8" />
            <text class="cs-empty-txt">{{ emptyText }}</text>
            <text class="cs-empty-sub">你手上若有真实经历的八字，欢迎投稿 —— 采纳后有国学币</text>
            <view class="cs-empty-btn" @tap="goSubmit">
              <text class="cs-empty-btn-txt">去投稿</text>
            </view>
          </view>
        </PaperCard>

        <view v-else class="cs-list">
          <view v-for="c in list" :key="c.id" class="cs-item" @tap="open(c)">
            <view class="cs-item-head">
              <text class="cs-item-title">{{ c.title }}</text>
              <text v-if="c.isPremium" class="cs-item-premium">精品</text>
              <text class="cs-item-src">{{ SOURCE_LABEL[c.source] || c.source }}</text>
            </view>
            <view class="cs-pillars">
              <text class="cs-pillar">{{ c.yearPillar }}</text>
              <text class="cs-pillar">{{ c.monthPillar }}</text>
              <text class="cs-pillar cs-pillar--day">{{ c.dayPillar }}</text>
              <text class="cs-pillar">{{ c.hourPillar }}</text>
            </view>
            <view class="cs-method-tags">
              <text v-for="item in c.availableMethods" :key="item" class="cs-method-tag">{{ METHOD_LABEL[item] || item }}</text>
            </view>
            <view class="cs-item-foot">
              <text class="cs-item-meta">{{ c.gender === 'female' ? '女命' : '男命' }}{{ c.era ? ` · ${c.era}` : '' }}</text>
              <text class="cs-item-meta">{{ c.attemptCount }} 人练过</text>
            </view>
          </view>

          <view v-if="loading" class="cs-more"><text class="cs-more-txt">加载中…</text></view>
          <view v-else-if="noMore" class="cs-more"><text class="cs-more-txt">共 {{ total }} 例</text></view>
        </view>
      </template>

      <!-- ── 贡献榜 ── -->
      <template v-else>
        <PaperCard padding="lg">
          <view class="cs-intro">
            <AppIcon name="award" :size="20" color="#B8912F" />
            <text class="cs-intro-txt">案例库靠同好共建。投稿通过后匿名进入案例库，累计收录可得称号（铜 5 · 银 20 · 金 50）；奖励以审核通过时的平台方案为准。</text>
          </view>
        </PaperCard>

        <view v-if="rankLoading" class="cs-skeleton" />

        <PaperCard v-else-if="!rank.length" padding="lg">
          <view class="cs-empty">
            <text class="cs-empty-txt">还没有人投稿</text>
            <text class="cs-empty-sub">第一个投稿的人，会排在这里</text>
            <view class="cs-empty-btn" @tap="goSubmit">
              <text class="cs-empty-btn-txt">去投稿</text>
            </view>
          </view>
        </PaperCard>

        <PaperCard v-else padding="none">
          <view v-for="(r, i) in rank" :key="r.rank" class="cs-rank" :class="{ 'cs-rank--line': i !== rank.length - 1 }">
            <text class="cs-rank-no" :class="{ 'cs-rank-no--top': r.rank <= 3 }">{{ r.rank }}</text>
            <image v-if="r.avatar" class="cs-rank-av" :src="r.avatar" mode="aspectFill" />
            <view v-else class="cs-rank-av cs-rank-av--ph">{{ (r.nickname || '同').slice(0, 1) }}</view>
            <view class="cs-rank-info">
              <text class="cs-rank-name">{{ r.nickname }}</text>
              <text v-if="r.badge" class="cs-rank-badge">{{ r.badge }}</text>
            </view>
            <text class="cs-rank-num">{{ r.count }} 篇</text>
          </view>
        </PaperCard>
      </template>

      <view class="cs-disc">
        <Disclaimer variant="fortune" tone="subtle" />
      </view>
      <view class="cs-space" />
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.cs {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f7f3ec;
}

.cs-tabs {
  display: flex;
  gap: 24rpx;
  padding: 16rpx 24rpx 0;
}
.cs-tab {
  padding: 12rpx 0;
  border-bottom: 4rpx solid transparent;
}
.cs-tab--on {
  border-bottom-color: #c41e3a;
}
.cs-tab-txt {
  font-size: 28rpx;
  color: #9a8c7e;
}
.cs-tab-txt--on {
  color: #3a2a1e;
  font-weight: 700;
}

.cs-body {
  flex: 1;
  min-height: 0;
  padding: 20rpx 24rpx;
  box-sizing: border-box;
}
.cs-body > view {
  margin-bottom: 20rpx;
}

.cs-intro {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
}
.cs-intro-txt {
  flex: 1;
  font-size: 24rpx;
  line-height: 1.7;
  color: #7a6c5e;
}

.cs-methods { white-space: nowrap; }
.cs-methods-inner { display: inline-flex; gap: 14rpx; }
.cs-method { width: 260rpx; padding: 18rpx 20rpx; box-sizing: border-box; border-radius: 16rpx; background: #fff; border: 1rpx solid rgba(58, 42, 30, 0.08); }
.cs-method--on { background: linear-gradient(135deg, #7f1830, #c41e3a); box-shadow: 0 10rpx 24rpx rgba(127, 24, 48, 0.16); }
.cs-method-name { display: block; font-size: 25rpx; font-weight: 700; color: #3a2a1e; }
.cs-method-name--on { color: #fff; }
.cs-method-desc { display: block; margin-top: 6rpx; font-size: 19rpx; color: #9a8c7e; }
.cs-method-desc--on { color: rgba(255, 255, 255, 0.76); }

.cs-bar {
  display: flex;
  gap: 16rpx;
}
.cs-search {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10rpx;
  height: 76rpx;
  padding: 0 20rpx;
  border-radius: 38rpx;
  background: #fdfaf4;
  border: 1rpx solid rgba(58, 42, 30, 0.1);
}
.cs-search-input {
  flex: 1;
  height: 76rpx;
  font-size: 26rpx;
  color: #3a2a1e;
}
.cs-ph {
  color: #c4b8a8;
}
.cs-submit {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 0 26rpx;
  height: 76rpx;
  border-radius: 38rpx;
  background: #c41e3a;
}
.cs-submit-txt {
  font-size: 26rpx;
  color: #fff;
  font-weight: 600;
}

.cs-mine {
  display: flex;
  align-items: center;
  gap: 14rpx;
  min-height: 88rpx;
  padding: 12rpx 20rpx;
  box-sizing: border-box;
  border-radius: 14rpx;
  background: #fffaf2;
  border: 1rpx solid rgba(166, 52, 44, 0.14);
}
.cs-mine-icon {
  width: 54rpx;
  height: 54rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12rpx 8rpx 14rpx 9rpx;
  background: rgba(166, 52, 44, 0.08);
}
.cs-mine-copy { flex: 1; min-width: 0; }
.cs-mine-title { display: block; font-size: 24rpx; color: #3a2a1e; font-weight: 700; }
.cs-mine-sub { display: block; margin-top: 3rpx; font-size: 20rpx; color: #9a8c7e; }

.cs-srcs {
  white-space: nowrap;
}
.cs-srcs-inner {
  display: inline-flex;
  gap: 12rpx;
}
.cs-src {
  padding: 10rpx 24rpx;
  border-radius: 30rpx;
  background: rgba(154, 140, 126, 0.1);
}
.cs-src--on {
  background: #c41e3a;
}
.cs-src-txt {
  font-size: 23rpx;
  color: #7a6c5e;
}
.cs-src-txt--on {
  color: #fff;
  font-weight: 600;
}

.cs-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.cs-item {
  padding: 24rpx;
  border-radius: 14rpx;
  background: #fff;
  border: 1rpx solid rgba(58, 42, 30, 0.08);
}
.cs-item-head {
  display: flex;
  align-items: center;
  gap: 10rpx;
}
.cs-item-title {
  flex: 1;
  font-size: 29rpx;
  font-weight: 700;
  color: #3a2a1e;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cs-item-premium {
  flex-shrink: 0;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  background: #d4af37;
  color: #fff;
  font-size: 18rpx;
}
.cs-item-src {
  flex-shrink: 0;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  background: rgba(154, 140, 126, 0.12);
  color: #7a6c5e;
  font-size: 18rpx;
}

.cs-pillars {
  display: flex;
  gap: 12rpx;
  margin-top: 16rpx;
}
.cs-pillar {
  flex: 1;
  height: 64rpx;
  line-height: 64rpx;
  text-align: center;
  border-radius: 8rpx;
  background: #fdfaf4;
  border: 1rpx solid rgba(58, 42, 30, 0.08);
  font-size: 26rpx;
  color: #3a2a1e;
}
/* 日柱 = 命主自身，标出来（同类八字也是按它匹配的） */
.cs-pillar--day {
  border-color: rgba(196, 30, 58, 0.35);
  background: rgba(196, 30, 58, 0.05);
  color: #c41e3a;
  font-weight: 700;
}

.cs-method-tags { display: flex; gap: 8rpx; margin-top: 14rpx; }
.cs-method-tag { padding: 4rpx 12rpx; border-radius: 999rpx; background: rgba(196, 30, 58, 0.07); border: 1rpx solid rgba(196, 30, 58, 0.14); font-size: 18rpx; color: #9d2c41; }

.cs-item-foot {
  display: flex;
  justify-content: space-between;
  margin-top: 14rpx;
}
.cs-item-meta {
  font-size: 21rpx;
  color: #b8aa9a;
}

.cs-more {
  padding: 24rpx;
  text-align: center;
}
.cs-more-txt {
  font-size: 22rpx;
  color: #b8aa9a;
}

/* 贡献榜 */
.cs-rank {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 22rpx 24rpx;
}
.cs-rank--line {
  border-bottom: 1rpx solid rgba(58, 42, 30, 0.06);
}
.cs-rank-no {
  width: 44rpx;
  font-size: 26rpx;
  font-weight: 700;
  color: #b8aa9a;
}
.cs-rank-no--top {
  color: #c41e3a;
}
.cs-rank-av {
  width: 68rpx;
  height: 68rpx;
  border-radius: 50%;
  flex-shrink: 0;
}
.cs-rank-av--ph {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(196, 30, 58, 0.08);
  color: #c41e3a;
  font-size: 26rpx;
  font-weight: 700;
}
.cs-rank-info {
  flex: 1;
  min-width: 0;
}
.cs-rank-name {
  display: block;
  font-size: 27rpx;
  color: #3a2a1e;
  font-weight: 600;
}
.cs-rank-badge {
  display: block;
  margin-top: 2rpx;
  font-size: 20rpx;
  color: #b8912f;
}
.cs-rank-num {
  font-size: 24rpx;
  color: #7a6c5e;
}

.cs-skeleton {
  height: 400rpx;
  border-radius: 14rpx;
  background: rgba(154, 140, 126, 0.08);
}

.cs-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  padding: 56rpx 24rpx 24rpx;
}
.cs-empty-txt {
  font-size: 28rpx;
  color: #7a6c5e;
}
.cs-empty-sub {
  font-size: 22rpx;
  color: #b8aa9a;
  text-align: center;
  line-height: 1.6;
}
.cs-empty-btn {
  margin-top: 12rpx;
  padding: 0 48rpx;
  height: 76rpx;
  display: flex;
  align-items: center;
  border-radius: 38rpx;
  border: 1rpx solid rgba(196, 30, 58, 0.4);
}
.cs-empty-btn-txt {
  font-size: 26rpx;
  color: #c41e3a;
  font-weight: 600;
}

.cs-disc {
  margin-top: 8rpx;
}
.cs-space {
  height: 40rpx;
}
</style>
