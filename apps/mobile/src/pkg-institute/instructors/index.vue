<!--
  I2 · 精英讲师（书院研究院 · V0 视觉稿 1:1 还原）
  合并 instructors + talent-pool + rankings 呈现：讲师列表按 等级/签约态 tab 筛选，
  排序与维度取自 getRankings 四维透明计分（tasks/events/stations/seniority 加权 score）。
  只用真实 lecturerLevel / tasksCompleted / eventCount / stationCount / joinYear，无虚构评分星级学员数。
  气质：精英学府 / 庄重，金色点缀等级荣誉。
-->
<template>
  <view class="page">
    <!-- 自绘导航栏 -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-back" @tap="goBack">
          <app-icon name="chevron-left" :size="20" color="#2C2C2C" />
        </view>
        <text class="nav-title serif">精英讲师</text>
        <view class="nav-placeholder" />
      </view>
      <!-- 搜索 -->
      <view class="search-wrap">
        <view class="search-box">
          <app-icon name="search" :size="15" color="#9B9B9B" />
          <input v-model="keyword" class="search-input" placeholder="搜索讲师姓名" placeholder-class="search-ph" confirm-type="search" @confirm="applyFilter" />
          <view v-if="keyword" class="search-btn" @tap="applyFilter"><text class="search-btn-text">搜索</text></view>
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="scroll" :style="{ paddingTop: navHeight + 'px' }">
      <view class="wrap">
        <!-- 三档筛选 tab -->
        <view class="tabs">
          <view
            v-for="t in tabs"
            :key="t.id"
            class="tab"
            :class="{ 'tab-on': activeTab === t.id }"
            @tap="activeTab = t.id"
          >
            <text class="tab-text" :class="{ 'tab-text-on': activeTab === t.id }">{{ t.label }}</text>
          </view>
        </view>

        <!-- 成长评估维度说明卡 -->
        <view class="dim-card">
          <text class="dim-card-title">成长评估维度</text>
          <text class="dim-card-desc">讲师等级 · 年度任务完成量 · 签约状态 · 驿站入驻。排序取自任务完成排行（{{ dimHint }}），学术榜单不含收入、无虚构评分。</text>
        </view>

        <!-- 加载态 -->
        <view v-if="loading" class="state-box">
          <view class="spinner" />
          <text class="state-text">加载中…</text>
        </view>
        <!-- 错误态 -->
        <view v-else-if="errMsg" class="state-box">
          <app-icon name="alert-circle" :size="40" color="#d8d0c4" />
          <text class="state-text">{{ errMsg }}</text>
          <view class="retry-btn" @tap="load"><text class="retry-text">重试</text></view>
        </view>
        <!-- 空态 -->
        <view v-else-if="!filteredList.length" class="state-box">
          <app-icon name="users" :size="46" color="#d8d0c4" />
          <text class="state-text">{{ emptyText }}</text>
        </view>

        <!-- 讲师列表 -->
        <template v-else>
          <view
            v-for="ins in filteredList"
            :key="ins.userId"
            class="card"
            @tap="goDetail(ins.userId)"
          >
            <!-- 排名徽章（全部 tab 且当年榜单时显示，第一名朱红） -->
            <view v-if="showRank && ins.rank" class="rank" :class="{ 'rank-r1': ins.rank === 1 }">
              <text class="rank-text">{{ ins.rank }}</text>
            </view>
            <!-- 头像（smart-avatar：过滤 dicebear 外链，无图/失效兜底姓名首字色块） -->
            <view class="av-wrap">
              <smart-avatar class="av-img" :src="ins.avatar" :name="ins.nickname" />
            </view>
            <!-- 主信息 -->
            <view class="info">
              <view class="name-row">
                <text class="name">{{ ins.nickname }}</text>
                <!-- 签约徽章（SIGNED 专属）/ 分享会员 -->
                <text v-if="ins.lecturerLevel === 'SIGNED'" class="chip chip-signed">签约讲师</text>
                <text v-else class="chip chip-share">分享会员</text>
                <!-- 讲师等级 chip（金描边）：SIGNED 的等级标签文案即"签约讲师"，与上方签约徽章重复，故跳过 -->
                <text v-if="ins.lecturerLevel !== 'SIGNED'" class="chip chip-lv">{{ lecturerLevelLabel[ins.lecturerLevel] }}</text>
              </view>
              <text class="brief">{{ briefOf(ins) }}</text>
              <!-- 真实维度胶囊：年度任务 / 驿站入驻 / 授课场次 -->
              <view class="dims">
                <view class="dchip"><text class="dchip-text">年度任务 {{ ins.tasksCompleted }} 项</text></view>
                <view v-if="ins.stationCount > 0" class="dchip"><text class="dchip-text">已入驻 {{ ins.stationCount }} 家驿站</text></view>
                <view v-else-if="ins.lecturerLevel !== 'SIGNED'" class="dchip"><text class="dchip-text">签约观察中</text></view>
                <view v-if="ins.eventCount > 0" class="dchip"><text class="dchip-text">授课 {{ ins.eventCount }} 场</text></view>
              </view>
            </view>
            <app-icon name="chevron-right" :size="15" color="#c9bfae" />
          </view>

          <view class="loadmore"><text class="loadmore-text">—— 已展示全部上榜讲师 ——</text></view>
        </template>

        <!-- 讲师遴选机制引导卡 -->
        <view class="path">
          <text class="path-title serif">想成为签约讲师？</text>
          <text class="path-desc">讲师由平台观察评估后主动签约，不接受自荐填表。四维透明计分（任务 40% · 授课 30% · 驿站 20% · 资历 10%），达标者进入驿站讲师库。</text>
          <view class="path-go" @tap="goRankings">
            <text class="path-go-text">查看讲师影响力榜单</text>
            <app-icon name="chevron-right" :size="14" color="#fff" />
          </view>
        </view>
      </view>

      <view class="bottom-safe" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import SmartAvatar from '@/components/common/smart-avatar.vue'
import { goBack, navigateTo } from '@/utils/router'
import {
  instituteApi, lecturerLevelLabel,
  type RankingItem,
} from '@/pkg-institute/lib/institute-data'

const statusBarHeight = ref(0)
const navHeight = ref(44)
const sys = uni.getSystemInfoSync()
statusBarHeight.value = sys.statusBarHeight || 0
navHeight.value = (sys.statusBarHeight || 0) + 44

// 三档筛选：全部 / 签约讲师(SIGNED) / 分享会员(非 SIGNED 的有评级成员)
type TabId = 'all' | 'signed' | 'share'
const tabs: { id: TabId; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'signed', label: '签约讲师' },
  { id: 'share', label: '分享会员' },
]
const activeTab = ref<TabId>('all')

const loading = ref(true)
const errMsg = ref('')
const all = ref<RankingItem[]>([])
const keyword = ref('')
const searchTerm = ref('')

const dimHint = '任务 40% · 授课 30% · 驿站 20% · 资历 10%'

// 全部 tab 且无搜索/无筛选时展示后端榜单排名徽章
const showRank = computed(() => activeTab.value === 'all' && !searchTerm.value)

const emptyText = computed(() => {
  if (activeTab.value === 'signed') return '暂无签约讲师'
  if (activeTab.value === 'share') return '暂无分享会员'
  return searchTerm.value ? '未找到符合条件的讲师' : '暂无上榜讲师'
})

/** 讲师简介：后端 RankingItem 无擅长领域/自述字段，诚实降级为等级 + 资历年限描述 */
function briefOf(it: RankingItem): string {
  const lv = lecturerLevelLabel[it.lecturerLevel]
  const y = new Date().getFullYear() - (it.joinYear || new Date().getFullYear())
  const seniority = y > 0 ? `入院 ${y} 年` : '本年新入院'
  return `${lv} · ${seniority} · 研究院签约讲师体系成员`
}

async function load() {
  loading.value = true
  errMsg.value = ''
  try {
    // 用榜单接口拿排名 + 四维 + 真实任务/驿站/授课数（当年）
    const res = await instituteApi.getRankings()
    all.value = res?.items || []
  } catch (e) {
    errMsg.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onLoad((q) => {
  if (q && q.keyword) {
    keyword.value = decodeURIComponent(q.keyword)
    searchTerm.value = keyword.value
  }
  load()
})

function applyFilter() {
  searchTerm.value = keyword.value.trim()
}

const filteredList = computed(() => {
  return all.value.filter((t) => {
    if (activeTab.value === 'signed' && t.lecturerLevel !== 'SIGNED') return false
    if (activeTab.value === 'share' && t.lecturerLevel === 'SIGNED') return false
    if (searchTerm.value && !(t.nickname || '').toLowerCase().includes(searchTerm.value.toLowerCase())) return false
    return true
  })
})

function goDetail(userId: string) {
  navigateTo('/institute/instructors/' + userId)
}

function goRankings() {
  navigateTo('/pkg-institute/rankings/index')
}
</script>

<style lang="scss" scoped>
$paper: #FAF8F5;
$card: #FFFFFF;
$red: #C41E3A;
$gold: #C9A96E;
$ink: #2C2C2C;
$sub: #6E6E73;
$faint: #999999;
$line: #EDEAE4;

.page { min-height: 100vh; background: $paper; }
.serif { font-family: "Songti SC", "STSong", "SimSun", serif; }

/* 自绘导航栏 */
.nav { position: fixed; top: 0; left: 0; right: 0; z-index: 20; background: $paper; border-bottom: 1px solid $line; }
.nav-bar { height: 44px; display: flex; align-items: center; padding: 0 12px; }
/* 触控热区≥44px：外容器扩大+负margin，30px 视觉圆形由 ::before 保持不变 */
.nav-back { width: 44px; height: 44px; margin: 0 -7px; position: relative; display: flex; align-items: center; justify-content: center; }
.nav-back::before { content: ''; position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 30px; height: 30px; border-radius: 50%; background: #fff; border: 1px solid $line; z-index: -1; box-sizing: border-box; }
.nav-title { flex: 1; text-align: center; font-size: 17px; font-weight: 700; color: $ink; }
.nav-placeholder { width: 30px; }
.search-wrap { padding: 0 20rpx 16rpx; }
.search-box { display: flex; align-items: center; height: 72rpx; background: #fff; border: 1px solid $line; border-radius: 999px; padding: 0 12rpx 0 24rpx; gap: 12rpx; }
.search-input { flex: 1; height: 72rpx; font-size: 26rpx; color: $ink; }
.search-ph { color: $faint; }
.search-btn { background: $red; border-radius: 999px; padding: 8rpx 24rpx; }
.search-btn-text { font-size: 24rpx; color: #fff; }

.scroll { height: 100vh; box-sizing: border-box; }
.wrap { padding: 24rpx 20rpx 0; }

/* 三档 tab */
.tabs { display: flex; gap: 16rpx; margin-bottom: 24rpx; }
.tab { flex: 1; height: 68rpx; border-radius: 999px; border: 1px solid $line; background: #fff; display: flex; align-items: center; justify-content: center; }
.tab-on { background: $red; border-color: $red; }
.tab-text { font-size: 24rpx; color: $sub; }
.tab-text-on { color: #fff; font-weight: 700; }

/* 成长评估维度说明卡（金色宣纸底） */
.dim-card { background: #F5EFE6; border: 1px solid #ECE0CD; border-radius: 28rpx; padding: 24rpx; margin-bottom: 24rpx; }
.dim-card-title { display: block; font-size: 24rpx; font-weight: 700; color: #8A6D2F; margin-bottom: 8rpx; }
.dim-card-desc { display: block; font-size: 22rpx; color: #9C8656; line-height: 1.6; }

/* 讲师卡片 */
.card { background: $card; border: 1px solid $line; border-radius: 36rpx; box-shadow: 0 4px 16px rgba(140,120,90,0.06); display: flex; gap: 24rpx; padding: 24rpx; margin-bottom: 20rpx; align-items: flex-start; }
.rank { width: 44rpx; height: 44rpx; border-radius: 14rpx; background: $gold; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 28rpx; }
.rank-r1 { background: $red; }
.rank-text { font-size: 24rpx; font-weight: 700; color: #fff; font-family: "Songti SC", serif; }
.av-wrap { flex-shrink: 0; }
.av-img { width: 100rpx; height: 100rpx; border-radius: 50%; }
.av { width: 100rpx; height: 100rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.av-fallback { background: linear-gradient(135deg, #E9DDC9, #D8C4A0); }
.av-char { font-size: 40rpx; color: #fff; }
.info { flex: 1; min-width: 0; }
.name-row { display: flex; align-items: center; flex-wrap: wrap; gap: 10rpx; }
.name { font-size: 28rpx; font-weight: 700; color: $ink; }
.chip { font-size: 18rpx; border-radius: 999px; padding: 3rpx 14rpx; line-height: 1.6; }
.chip-signed { background: $red; color: #fff; }
.chip-share { background: #F3ECE0; color: #A8791F; border: 1px solid #E7D6B3; }
.chip-lv { background: #fff; border: 1px solid $gold; color: #A5854A; }
.brief { display: block; font-size: 22rpx; color: $sub; margin-top: 8rpx; line-height: 1.5; }
.dims { display: flex; gap: 12rpx; margin-top: 16rpx; flex-wrap: wrap; }
.dchip { background: $paper; border: 1px solid $line; border-radius: 12rpx; padding: 6rpx 16rpx; }
.dchip-text { font-size: 20rpx; color: $sub; }

.loadmore { text-align: center; padding: 20rpx; }
.loadmore-text { font-size: 22rpx; color: $faint; }

/* 遴选机制引导卡 */
.path { background: $card; border: 1px solid $red; border-radius: 36rpx; padding: 28rpx; margin-top: 8rpx; }
.path-title { display: block; font-size: 28rpx; font-weight: 700; color: $ink; margin-bottom: 8rpx; }
.path-desc { display: block; font-size: 22rpx; color: $sub; line-height: 1.7; }
.path-go { margin-top: 20rpx; display: flex; align-items: center; justify-content: center; gap: 8rpx; height: 76rpx; background: $red; border-radius: 999px; }
.path-go-text { font-size: 24rpx; font-weight: 700; color: #fff; }

/* 三态 */
.state-box { padding: 120rpx 0; display: flex; flex-direction: column; align-items: center; gap: 20rpx; }
.state-text { font-size: 24rpx; color: $faint; }
.spinner { width: 52rpx; height: 52rpx; border: 5rpx solid #ECE7DF; border-top-color: $gold; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.retry-btn { margin-top: 8rpx; padding: 12rpx 40rpx; border: 1px solid $gold; border-radius: 999px; }
.retry-text { font-size: 24rpx; color: $gold; }
.bottom-safe { height: 48rpx; }
</style>
