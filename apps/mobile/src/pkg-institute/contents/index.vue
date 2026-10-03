<!--
  I5 · 研究院内容（V0 视觉稿 1:1 还原）
  职责：研究院产出内容聚合。
    - 内容知识库 getContents（ARTICLE/VIDEO/DOCUMENT · 国学币价 · 试读摘要 · 已购标）
    - 讲座回放 getLectures（吸收自 lectures 页 · 含封面/讲师等级徽章/元价 · 跳课程详情）
  Tab：全部 / 文章 / 视频 / 文档 —— 走 getContents（内容知识库，横向卡片）
       讲座回放 —— 走 getLectures（复用课程系统，横向卡片带封面/讲师徽章）
  设计 token：宣纸白 #FAF8F5 · 卡白 #FFF · 朱红 #C41E3A · 金 #C9A96E · 圆角 18px。
  真连铁律：仅渲染真实字段；contents 无封面 → 类型色块占位；两套数据结构各自分页。
-->
<template>
  <view class="page">
    <!-- 自绘导航栏 -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-back" @tap="goBack">
          <app-icon name="chevron-left" :size="20" color="#2C2C2C" />
        </view>
        <text class="nav-title serif">研究院内容</text>
        <view class="nav-placeholder" />
      </view>
    </view>

    <scroll-view scroll-y class="scroll" :style="{ paddingTop: navHeight + 'px' }" @scrolltolower="onScrollBottom">
      <view class="wrap">
        <!-- 类型 Tab -->
        <view class="tabs">
          <view
            v-for="t in tabs"
            :key="t.value"
            class="tab"
            :class="{ 'tab-on': activeTab === t.value }"
            @tap="switchTab(t.value)"
          >
            <text class="tab-text" :class="{ 'tab-text-on': activeTab === t.value }">{{ t.label }}</text>
          </view>
        </view>

        <!-- ============ 讲座回放 Tab（getLectures）============ -->
        <block v-if="activeTab === 'LECTURE'">
          <view v-if="lec.loading.value" class="state-box">
            <view class="spinner" />
            <text class="state-text">加载中…</text>
          </view>
          <view v-else-if="lec.error.value" class="state-box">
            <app-icon name="alert-circle" :size="40" color="#D9D2C6" />
            <text class="state-text">{{ lec.error.value }}</text>
            <view class="retry-btn" @tap="lec.refresh"><text class="retry-text">重试</text></view>
          </view>
          <view v-else-if="lec.isEmpty.value" class="state-box">
            <app-icon name="video" :size="46" color="#D9D2C6" />
            <text class="state-text">暂无讲座上架，敬请期待</text>
          </view>
          <view v-else class="list">
            <view v-for="l in lec.list.value" :key="l.id" class="ccard" @tap="goLecture(l.id)">
              <view class="ccard-main">
                <view class="ccard-tags">
                  <text class="tag tag-lecture">讲座回放</text>
                </view>
                <text class="ctitle">{{ l.title }}</text>
                <!-- 讲师行：昵称 + 等级徽章 + 认证头衔 -->
                <view class="lecturer-row">
                  <text class="lecturer-name">{{ l.lecturer.nickname }}</text>
                  <view
                    v-if="l.lecturer.lecturerLevel !== 'NONE'"
                    class="level-badge"
                    :style="{ color: lecturerLevelColor[l.lecturer.lecturerLevel].color, background: lecturerLevelColor[l.lecturer.lecturerLevel].bg }"
                  >
                    <app-icon name="badge-check" :size="10" :color="lecturerLevelColor[l.lecturer.lecturerLevel].color" />
                    <text class="level-badge-text" :style="{ color: lecturerLevelColor[l.lecturer.lecturerLevel].color }">{{ lecturerLevelLabel[l.lecturer.lecturerLevel] }}</text>
                  </view>
                  <text v-if="l.lecturer.verifiedTitle" class="verified-title">{{ l.lecturer.verifiedTitle }}</text>
                </view>
                <view class="cfoot">
                  <text v-if="l.price === 0" class="price-free">免费</text>
                  <text v-else class="price">¥{{ formatPrice(l.price) }}</text>
                  <text class="cmeta">{{ l.studentCount }} 人已学 · {{ fmtDate(l.createdAt) }}</text>
                </view>
              </view>
              <!-- 缩略图：讲座封面（无则朱红渐变占位 + 播放键） -->
              <view class="cov cov-lecture">
                <image v-if="l.cover" class="cov-img" :src="l.cover" mode="aspectFill" lazy-load @error="() => {}" />
                <view class="play">
                  <app-icon name="play" :size="12" color="#C41E3A" />
                </view>
              </view>
            </view>
            <app-load-more :status="lec.loadStatus.value" />
          </view>
        </block>

        <!-- ============ 内容知识库 Tab（getContents）============ -->
        <block v-else>
          <view v-if="con.loading.value" class="state-box">
            <view class="spinner" />
            <text class="state-text">加载中…</text>
          </view>
          <view v-else-if="con.error.value" class="state-box">
            <app-icon name="alert-circle" :size="40" color="#D9D2C6" />
            <text class="state-text">{{ con.error.value }}</text>
            <view class="retry-btn" @tap="con.refresh"><text class="retry-text">重试</text></view>
          </view>
          <view v-else-if="con.isEmpty.value" class="state-box">
            <app-icon name="book-open" :size="46" color="#D9D2C6" />
            <text class="state-text">暂无内容，敬请期待</text>
          </view>
          <view v-else class="list">
            <view v-for="c in con.list.value" :key="c.id" class="ccard" @tap="goContent(c.id)">
              <view class="ccard-main">
                <view class="ccard-tags">
                  <text class="tag" :style="{ color: contentTypeColor[c.contentType].color, background: contentTypeColor[c.contentType].bg }">{{ contentTypeLabel[c.contentType] }}</text>
                </view>
                <text class="ctitle">{{ c.title }}</text>
                <text v-if="c.summary" class="csummary">{{ c.summary }}</text>
                <view class="cfoot">
                  <text v-if="c.price === 0" class="price-free">免费</text>
                  <view v-else-if="c.purchased" class="owned-tag">
                    <app-icon name="badge-check" :size="12" color="#16a34a" />
                    <text class="owned-text">已购</text>
                  </view>
                  <text v-else class="price">{{ c.price }} 币</text>
                  <text class="cmeta">{{ c.purchaseCount }} 人已学 · {{ fmtDate(c.createdAt) }}</text>
                </view>
              </view>
              <!-- 缩略图：内容无封面 → 类型色块占位（VIDEO 带播放键）-->
              <view class="cov" :style="{ background: contentTypeColor[c.contentType].bg }">
                <app-icon :name="contentTypeIcon[c.contentType]" :size="26" :color="contentTypeColor[c.contentType].color" />
                <view v-if="c.contentType === 'VIDEO'" class="play">
                  <app-icon name="play" :size="12" color="#C41E3A" />
                </view>
              </view>
            </view>
            <app-load-more :status="con.loadStatus.value" />
          </view>
        </block>
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
import {
  instituteApi,
  contentTypeLabel, contentTypeColor, contentTypeIcon,
  lecturerLevelLabel, lecturerLevelColor,
  fmtDate,
  type InstituteContentType, type InstituteContentItem, type LectureItem,
} from '@/pkg-institute/lib/institute-data'
import { formatPrice } from '@/utils/format'

const statusBarHeight = ref(0)
const navHeight = ref(44)
const sys = uni.getSystemInfoSync()
statusBarHeight.value = sys.statusBarHeight || 0
navHeight.value = (sys.statusBarHeight || 0) + 44

// Tab：前四走内容知识库（'all' 即全部三类），末位走讲座回放
type TabValue = 'all' | InstituteContentType | 'LECTURE'
const tabs: { value: TabValue; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'ARTICLE', label: '文章' },
  { value: 'VIDEO', label: '视频' },
  { value: 'DOCUMENT', label: '文档' },
  { value: 'LECTURE', label: '讲座回放' },
]
const activeTab = ref<TabValue>('all')

// 内容知识库分页（保留原有 getContents 数据接线）
const con = useList<InstituteContentItem, { type?: InstituteContentType }>({
  fetcher: (params) => instituteApi.getContents(params),
  getParams: () => (activeTab.value === 'all' || activeTab.value === 'LECTURE' ? {} : { type: activeTab.value }),
})

// 讲座回放分页（吸收自 lectures 页 getLectures 数据接线）
const lec = useList<LectureItem>({
  fetcher: (params) => instituteApi.getLectures(params),
})

let lecLoaded = false

function switchTab(t: TabValue) {
  if (activeTab.value === t) return
  activeTab.value = t
  if (t === 'LECTURE') {
    if (!lecLoaded) { lecLoaded = true; lec.refresh() }
  } else {
    con.refresh()
  }
}

// 上拉触底：按当前 Tab 分发到对应分页
function onScrollBottom() {
  if (activeTab.value === 'LECTURE') lec.loadMore()
  else con.loadMore()
}

onLoad(() => con.refresh())

// 内容详情（保留原路由，不动 contents/detail）
function goContent(id: string) {
  uni.navigateTo({ url: '/pkg-institute/contents/detail?id=' + encodeURIComponent(id) })
}
// 讲座 = 特殊课程（courseOrigin=INSTITUTE_LECTURE），跳课程详情复用播放/购买全能力
function goLecture(id: string) {
  uni.navigateTo({ url: '/pkg-course/detail/index?id=' + encodeURIComponent(id) })
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
.nav { position: fixed; top: 0; left: 0; right: 0; z-index: 20; background: $paper; border-bottom: 2rpx solid $line; }
.nav-bar { height: 88rpx; display: flex; align-items: center; padding: 0 24rpx; }
.nav-back { width: 60rpx; height: 60rpx; border-radius: 50%; background: #fff; border: 2rpx solid $line; display: flex; align-items: center; justify-content: center; }
.nav-title { flex: 1; text-align: center; font-size: 34rpx; font-weight: 700; color: $ink; }
.nav-placeholder { width: 60rpx; }
.scroll { height: 100vh; box-sizing: border-box; }
.wrap { padding: 40rpx; }

/* 类型 Tab */
.tabs { display: flex; gap: 14rpx; margin-bottom: 28rpx; }
.tab { flex: 1; height: 64rpx; border-radius: 999px; border: 2rpx solid $line; background: #fff; display: flex; align-items: center; justify-content: center; }
.tab-on { background: $red; border-color: $red; }
.tab-text { font-size: 22rpx; color: $sub; }
.tab-text-on { color: #fff; font-weight: 700; }

/* 内容卡（横向：左文右缩略图）*/
.list { display: flex; flex-direction: column; }
.ccard { display: flex; gap: 24rpx; padding: 28rpx; margin-bottom: 24rpx; background: $card; border: 2rpx solid $line; border-radius: 18px; box-shadow: 0 8rpx 32rpx rgba(140,120,90,0.06); }
.ccard-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.ccard-tags { display: flex; }
.tag { display: inline-block; font-size: 18rpx; border-radius: 8rpx; padding: 4rpx 14rpx; }
.tag-lecture { color: #fff; background: $red; }

.ctitle { font-size: 27rpx; font-weight: 700; color: $ink; line-height: 1.45; margin: 12rpx 0 10rpx; }
.csummary { font-size: 23rpx; color: $sub; line-height: 1.6; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }

/* 讲师行 */
.lecturer-row { display: flex; align-items: center; gap: 10rpx; flex-wrap: wrap; margin-bottom: 4rpx; }
.lecturer-name { font-size: 22rpx; color: #55555a; font-weight: 500; }
.level-badge { display: flex; align-items: center; gap: 4rpx; border-radius: 8rpx; padding: 2rpx 10rpx; }
.level-badge-text { font-size: 18rpx; }
.verified-title { font-size: 18rpx; color: #b8860b; background: rgba(201,169,110,0.16); border-radius: 8rpx; padding: 2rpx 10rpx; }

.cfoot { display: flex; align-items: center; gap: 16rpx; margin-top: auto; padding-top: 14rpx; }
.price { font-size: 27rpx; font-weight: 800; color: $red; }
.price-free { font-size: 23rpx; font-weight: 700; color: #16a34a; }
.owned-tag { display: flex; align-items: center; gap: 5rpx; background: #f0fdf4; border-radius: 8rpx; padding: 3rpx 12rpx; }
.owned-text { font-size: 21rpx; color: #16a34a; }
.cmeta { font-size: 20rpx; color: $faint; margin-left: auto; }

/* 缩略图色块 */
.cov { width: 176rpx; height: 128rpx; border-radius: 20rpx; flex-shrink: 0; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; }
.cov-lecture { background: linear-gradient(135deg, #C41E3A, #8f1327); }
.cov-img { width: 100%; height: 100%; display: block; }
.play { position: absolute; width: 48rpx; height: 48rpx; border-radius: 50%; background: rgba(255,255,255,0.92); display: flex; align-items: center; justify-content: center; }

/* 三态 */
.state-box { padding: 160rpx 0; display: flex; flex-direction: column; align-items: center; gap: 24rpx; }
.state-text { font-size: 25rpx; color: $faint; }
.spinner { width: 56rpx; height: 56rpx; border: 6rpx solid #f0ece4; border-top-color: $red; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.retry-btn { margin-top: 8rpx; padding: 12rpx 40rpx; border: 2rpx solid $red; border-radius: 999px; }
.retry-text { font-size: 25rpx; color: $red; }
.bottom-safe { height: 48rpx; }
</style>
