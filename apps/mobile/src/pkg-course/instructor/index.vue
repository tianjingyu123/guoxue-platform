<script setup lang="ts">
/** 讲师主页 F1 - V0 阶段二视觉稿 f1-instructor.html 还原（头部讲师卡 + TA 的课程）。
 *  script 真连保留：instructorApi.getDetail（聚合 users/:id + stats + is-following）。
 *  featuredCourses 后端暂无来源恒空 → 走「暂无公开课程」空态，绝不回退假数据。 */
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { navigateTo, goBack } from '@/utils/router'
import AppIcon from '@/components/common/app-icon.vue'
import SmartCover from '@/components/common/smart-cover.vue'
import SmartAvatar from '@/components/common/smart-avatar.vue'
import { instructorApi, getInstructorLevelLabel } from '@/lib/instructor-data'

const statusBarHeight = ref(0)
const loading = ref(true)
const error = ref('')
const instructorId = ref('')

// 讲师详情对象，模板裸访问字段，保留 any 避免 null 链式报错
const detail = ref<any>(null)

// 认证头衔胶囊文案：优先 title，回退等级标签
const badgeLabel = computed(() => {
  if (!detail.value) return ''
  if (detail.value.title) return `认证 · ${detail.value.title}`
  if (detail.value.verified || detail.value.level) return getInstructorLevelLabel(detail.value.level)
  return ''
})

// 简介两行截断 + 展开
const bioExpanded = ref(false)
function toggleBio() { bioExpanded.value = !bioExpanded.value }

function openCourse(id: string) { navigateTo(`/course/${id}`) }

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const res = await instructorApi.getDetail(instructorId.value)
    detail.value = res
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onLoad((options) => {
  uni.getSystemInfo({ success: (e) => { statusBarHeight.value = e.statusBarHeight || 0 } })
  instructorId.value = options?.id || '1'
})

onMounted(() => {
  loadData()
})
</script>

<template>
  <view class="page">
    <!-- ══ 顶栏（自定义状态栏高度）══ -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-back" hover-class="btn-press" @tap="goBack">
        <app-icon name="chevron-left" :size="36" color="#2C2C2C" />
      </view>
    </view>

    <!-- ══ Error 态 ══ -->
    <view v-if="error" class="state-wrap">
      <text class="state-text">{{ error }}</text>
      <view class="retry-btn" hover-class="btn-press" @tap="loadData"><text class="retry-text">重试</text></view>
    </view>

    <!-- ══ Loading 骨架屏（头部卡 + 标题 + 课程卡占位）══ -->
    <view v-else-if="loading" class="body-pad">
      <view class="sk sk-profile" />
      <view class="sk sk-title" />
      <view class="sk sk-course" />
    </view>

    <!-- ══ Content ══ -->
    <view v-else class="body-pad">
      <!-- ── 区块1 头部讲师卡 ── -->
      <view class="profile">
        <smart-avatar :src="detail.avatar" :name="detail.name" class="p-avatar" />
        <text class="p-name serif">{{ detail.name }}</text>
        <text v-if="badgeLabel" class="p-badge">{{ badgeLabel }}</text>
        <text
          v-if="detail.introduction"
          class="p-bio"
          :class="{ expanded: bioExpanded }"
        >{{ detail.introduction }}</text>
        <view v-if="detail.introduction" class="p-expand" hover-class="btn-press" @tap="toggleBio">
          <text class="p-expand-txt">{{ bioExpanded ? '收起' : '展开' }}</text>
          <app-icon :name="bioExpanded ? 'chevron-up' : 'chevron-down'" :size="20" color="#999999" />
        </view>

        <view class="p-stats">
          <view class="p-stat">
            <text class="p-stat-num">{{ detail.courseCount }}</text>
            <text class="p-stat-label">课程</text>
          </view>
          <view class="p-stat">
            <text class="p-stat-num">{{ detail.followerCount }}</text>
            <text class="p-stat-label">学员</text>
          </view>
          <view v-if="detail.rating" class="p-stat">
            <text class="p-stat-num gold">{{ detail.rating }}</text>
            <text class="p-stat-label">综合评分</text>
          </view>
        </view>
      </view>

      <!-- ── 区块2 TA 的课程 ── -->
      <text class="section-title serif">TA 的课程</text>

      <view v-if="detail.featuredCourses.length" class="course-list">
        <view
          v-for="c in detail.featuredCourses"
          :key="c.id"
          class="card"
          hover-class="card-press"
          @tap="openCourse(String(c.id))"
        >
          <view class="card-cover">
            <view class="ratio-169">
              <smart-cover class="card-cover-img" :src="c.cover" :title="c.title" type="course" />
            </view>
            <text class="type-tag">课程</text>
          </view>
          <view class="card-body">
            <text class="card-title serif">{{ c.title }}</text>
            <view class="bottom-row">
              <view class="meta">
                <text v-if="c.studentCount" class="meta-txt">{{ c.studentCount }} 人在学</text>
                <view v-if="c.rating" class="rating">
                  <app-icon name="star" :size="26" color="#C9A96E" :fill="true" />
                  <text class="rating-num">{{ c.rating }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 空态：后端无公开课程数据源恒空态 -->
      <view v-else class="empty">
        <view class="empty-art">
          <app-icon name="book-open" :size="56" color="#C9A96E" />
        </view>
        <text class="empty-title serif">暂无公开课程</text>
        <text class="empty-desc">这位老师还没有发布公开课程</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
/* ── 视觉 token（V0 委托书第七节）── */
.page { min-height: 100vh; background: #FAF8F5; }
.serif { font-family: "Songti SC", "STSong", "SimSun", serif; }
.btn-press { opacity: 0.6; }
.card-press { transform: scale(0.98); }

/* ── 顶栏 ── */
.nav { display: flex; align-items: center; gap: 24rpx; padding: 32rpx 40rpx 24rpx; }
.nav-back {
  width: 72rpx; height: 72rpx; border-radius: 999rpx;
  background: #FFFFFF; display: flex; align-items: center; justify-content: center;
  box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.04);
}

/* ── 内容主体 ── */
.body-pad { padding: 0 40rpx 64rpx; display: flex; flex-direction: column; gap: 24rpx; }

/* ── 区块1 头部讲师卡 ── */
.profile {
  background: #FFFFFF; border-radius: 36rpx;
  padding: 48rpx 32rpx 36rpx;
  display: flex; flex-direction: column; align-items: center; gap: 20rpx;
  box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.04);
}
.p-avatar {
  width: 168rpx; height: 168rpx; border-radius: 50%;
  background: #F0EBE2; border: 6rpx solid rgba(201,169,110,0.14);
}
.p-name { font-size: 40rpx; font-weight: 700; color: #2C2C2C; }
.p-badge {
  background: rgba(201,169,110,0.14); color: #8A6D3B;
  font-size: 24rpx; font-weight: 600; padding: 8rpx 24rpx; border-radius: 999rpx;
}
.p-bio {
  font-size: 28rpx; color: #6E6E73; line-height: 1.7; text-align: center;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.p-bio.expanded { -webkit-line-clamp: unset; overflow: visible; }
.p-expand { display: flex; align-items: center; gap: 6rpx; }
.p-expand-txt { font-size: 26rpx; color: #999999; }
.p-stats {
  display: flex; width: 100%; margin-top: 16rpx; padding-top: 32rpx;
  border-top: 2rpx solid #EDE7DD;
}
.p-stat { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6rpx; }
.p-stat + .p-stat { border-left: 2rpx solid #EDE7DD; }
.p-stat-num { font-size: 40rpx; font-weight: 700; color: #2C2C2C; font-variant-numeric: tabular-nums; }
.p-stat-num.gold { color: #C9A96E; }
.p-stat-label { font-size: 24rpx; color: #999999; }

/* ── 区块2 标题 ── */
.section-title { font-size: 34rpx; font-weight: 700; color: #2C2C2C; margin-top: 12rpx; }

/* ── 课程卡（复用 P1 大卡）── */
.course-list { display: flex; flex-direction: column; gap: 24rpx; }
.card { background: #FFFFFF; border-radius: 36rpx; overflow: hidden; box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.04); }
.card-cover { position: relative; width: 100%; }
.ratio-169 { position: relative; width: 100%; padding-top: 56.25%; }
.card-cover-img { position: absolute; inset: 0; width: 100%; height: 100%; }
.type-tag { position: absolute; top: 20rpx; left: 20rpx; background: rgba(0,0,0,0.55); color: #fff; font-size: 22rpx; padding: 6rpx 16rpx; border-radius: 12rpx; }
.card-body { padding: 28rpx 32rpx 32rpx; display: flex; flex-direction: column; gap: 18rpx; }
.card-title { font-size: 34rpx; font-weight: 700; color: #2C2C2C; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.bottom-row { display: flex; align-items: center; justify-content: space-between; }
.meta { display: flex; align-items: center; gap: 20rpx; }
.meta-txt { font-size: 26rpx; color: #999999; }
.rating { display: flex; align-items: center; gap: 6rpx; }
.rating-num { font-size: 26rpx; font-weight: 600; color: #C9A96E; }

/* ── 空态 ── */
.empty { display: flex; flex-direction: column; align-items: center; gap: 24rpx; padding: 96rpx 60rpx; text-align: center; }
.empty-art { width: 200rpx; height: 200rpx; border-radius: 50%; background: #F8F4EC; display: flex; align-items: center; justify-content: center; }
.empty-title { font-size: 34rpx; font-weight: 700; color: #2C2C2C; }
.empty-desc { font-size: 26rpx; color: #999999; line-height: 1.5; }

/* ── 错误态 ── */
.state-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 200rpx 0; gap: 24rpx; }
.state-text { font-size: 28rpx; color: #6E6E73; }
.retry-btn { padding: 16rpx 48rpx; background: #C41E3A; border-radius: 999rpx; }
.retry-text { font-size: 28rpx; color: #fff; }

/* ── 骨架屏（#F0EBE2 微光 1.4s）── */
.sk { position: relative; overflow: hidden; background: #F0EBE2; border-radius: 12rpx; }
.sk::after { content: ""; position: absolute; inset: 0; transform: translateX(-100%); background: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent); animation: shimmer 1.4s infinite; }
@keyframes shimmer { 100% { transform: translateX(100%); } }
.sk-profile { height: 480rpx; border-radius: 36rpx; }
.sk-title { height: 40rpx; width: 180rpx; border-radius: 12rpx; margin-top: 12rpx; }
.sk-course { height: 600rpx; border-radius: 36rpx; }
</style>
