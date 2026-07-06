<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-back" @tap="goBack">
          <app-icon name="chevron-left" :size="22" color="#1a1a1a" />
        </view>
        <text class="nav-title">大师讲座</text>
        <view class="nav-placeholder" />
      </view>
    </view>

    <scroll-view scroll-y class="scroll" :style="{ paddingTop: navHeight + 'px' }" @scrolltolower="loadMore">
      <!-- 频道说明条 -->
      <view class="channel-intro">
        <app-icon name="landmark" :size="16" color="#c41e3a" />
        <text class="channel-intro-text">研究院分享回放沉淀 · 每一讲皆出自院内认证讲师</text>
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
        <app-icon name="video" :size="48" color="#d1d5db" />
        <text class="state-text">暂无讲座上架，敬请期待</text>
      </view>

      <!-- 讲座卡列表 -->
      <view v-else class="list">
        <view v-for="lec in list" :key="lec.id" class="card" @tap="goDetail(lec.id)">
          <view class="card-cover-wrap">
            <image v-if="lec.cover" class="card-cover" :src="lec.cover" mode="aspectFill" lazy-load @error="() => {}" />
            <view v-else class="card-cover card-cover-fallback">
              <app-icon name="video" :size="30" color="#d4b896" />
            </view>
            <view class="origin-badge">
              <app-icon name="landmark" :size="11" color="#fff" />
              <text class="origin-badge-text">研究院出品</text>
            </view>
          </view>
          <view class="card-body">
            <text class="card-title">{{ lec.title }}</text>
            <text v-if="lec.intro" class="card-intro">{{ lec.intro }}</text>
            <!-- 讲师行：头像 + 昵称 + 认证徽章 -->
            <view class="lecturer-row">
              <image v-if="lec.lecturer.avatar" class="lecturer-avatar" :src="lec.lecturer.avatar" mode="aspectFill" />
              <view v-else class="lecturer-avatar lecturer-avatar-fallback">
                <app-icon name="user" :size="12" color="#9ca3af" />
              </view>
              <text class="lecturer-name">{{ lec.lecturer.nickname }}</text>
              <view
                v-if="lec.lecturer.lecturerLevel !== 'NONE'"
                class="level-badge"
                :style="{ color: lecturerLevelColor[lec.lecturer.lecturerLevel].color, background: lecturerLevelColor[lec.lecturer.lecturerLevel].bg }"
              >
                <app-icon name="badge-check" :size="11" :color="lecturerLevelColor[lec.lecturer.lecturerLevel].color" />
                <text class="level-badge-text" :style="{ color: lecturerLevelColor[lec.lecturer.lecturerLevel].color }">{{ lecturerLevelLabel[lec.lecturer.lecturerLevel] }}</text>
              </view>
              <text v-if="lec.lecturer.verifiedTitle" class="verified-title">{{ lec.lecturer.verifiedTitle }}</text>
            </view>
            <view class="card-foot">
              <text v-if="lec.price === 0" class="price-free">免费</text>
              <text v-else class="price">¥{{ formatPrice(lec.price) }}</text>
              <view class="foot-right">
                <app-icon name="users" :size="13" color="#9ca3af" />
                <text class="foot-meta">{{ lec.studentCount }} 人已学 · {{ fmtDate(lec.createdAt) }}</text>
              </view>
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
import { instituteApi, lecturerLevelLabel, lecturerLevelColor, fmtDate, type LectureItem } from '@/lib/institute-data'
import { formatPrice } from '@/utils/format'

const statusBarHeight = ref(0)
const navHeight = ref(44)
const sys = uni.getSystemInfoSync()
statusBarHeight.value = sys.statusBarHeight || 0
navHeight.value = (sys.statusBarHeight || 0) + 44

const { list, loading, error, isEmpty, loadStatus, refresh, loadMore } = useList<LectureItem>({
  fetcher: (params) => instituteApi.getLectures(params),
})

onLoad(() => refresh())

/** 讲座=特殊课程（courseOrigin=INSTITUTE_LECTURE），详情复用现有课程详情页（播放/购买/评价全能力） */
function goDetail(id: string) {
  uni.navigateTo({ url: '/pkg-course/detail/index?id=' + encodeURIComponent(id) })
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

.channel-intro { display: flex; align-items: center; gap: 6px; padding: 10px 16px; background: rgba(196,30,58,0.05); border-bottom: 1px solid rgba(196,30,58,0.08); }
.channel-intro-text { font-size: 12px; color: #a4535f; }

.list { padding: 16px; display: flex; flex-direction: column; gap: 14px; }
.card { background: #fff; border: 1px solid #ececec; border-radius: 12px; overflow: hidden; }
.card-cover-wrap { position: relative; }
.card-cover { width: 100%; height: 170px; display: block; }
.card-cover-fallback { display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #f7f1e8, #efe3d0); }
.origin-badge { position: absolute; top: 10px; left: 10px; display: flex; align-items: center; gap: 4px; background: rgba(196,30,58,0.88); border-radius: 6px; padding: 3px 8px; }
.origin-badge-text { font-size: 11px; color: #fff; font-weight: 600; }

.card-body { padding: 12px 14px 14px; }
.card-title { display: block; font-size: 15px; font-weight: 600; color: #1a1a1a; line-height: 1.4; }
.card-intro { display: block; margin-top: 6px; font-size: 13px; color: #6b7280; line-height: 1.6; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }

.lecturer-row { display: flex; align-items: center; gap: 6px; margin-top: 10px; flex-wrap: wrap; }
.lecturer-avatar { width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0; }
.lecturer-avatar-fallback { display: flex; align-items: center; justify-content: center; background: #f3f4f6; }
.lecturer-name { font-size: 13px; color: #374151; font-weight: 500; }
.level-badge { display: flex; align-items: center; gap: 3px; border-radius: 4px; padding: 1px 6px; }
.level-badge-text { font-size: 11px; }
.verified-title { font-size: 11px; color: #b8860b; background: rgba(212,160,23,0.12); border-radius: 4px; padding: 1px 6px; }

.card-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 10px; padding-top: 10px; border-top: 1px solid #f3f4f6; }
.price { font-size: 16px; font-weight: 700; color: var(--brand); }
.price-free { font-size: 13px; font-weight: 600; color: #16a34a; }
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
