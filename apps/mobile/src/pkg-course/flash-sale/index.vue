<script setup lang="ts">
/** 课程限时特惠页 - 从原型 app/courses/flash-sale/page.tsx 迁移 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { navigateTo, goBack } from '@/utils/router'
import AppIcon from '@/components/common/app-icon.vue'
import AppSkeleton from '@/components/common/app-skeleton.vue'
import AppError from '@/components/common/app-error.vue'
import AppEmpty from '@/components/common/app-empty.vue'
import { useAsyncData } from '@/composables/useAsyncData'
// @data-needs: 限时特惠聚合, 参数 无, 返回 { sessions:SaleSession[], courses:SaleCourse[] }
// mock 见 @/lib/course-data.ts，交付时由 Claude Code 替换为真实接口
import { saleSessions as _sessions, saleCourses as _courses } from '@/lib/course-data'

const { data: pageData, isLoading, loadError, reload } = useAsyncData(async () => {
  return { sessions: _sessions, courses: _courses }
})

const sessions = computed(() => pageData.value?.sessions ?? [])
const courses = computed(() => pageData.value?.courses ?? [])
const isEmpty = computed(() => sessions.value.length === 0)

const activeSession = ref('2')
const secs = ref(3600)
let timer: any = null
onMounted(() => { timer = setInterval(() => { secs.value = Math.max(0, secs.value - 1) }, 1000) })
onUnmounted(() => { if (timer) clearInterval(timer) })

const pad = (n: number) => String(n).padStart(2, '0')
const cd = computed(() => {
  const h = Math.floor(secs.value / 3600)
  const m = Math.floor((secs.value % 3600) / 60)
  const s = secs.value % 60
  return [pad(h), pad(m), pad(s)]
})
const session = computed(() => sessions.value.find((s) => s.id === activeSession.value))
const sessionCourses = computed(() => courses.value.filter((c) => c.sessionId === activeSession.value))

function sessionTip(status?: string) {
  return status === 'active' ? '距本场结束' : status === 'past' ? '本场已结束' : '本场即将开始'
}
function sessionState(status: string) {
  return status === 'past' ? '已结束' : status === 'active' ? '抢购中' : '即将开始'
}
</script>

<template>
  <view v-if="isLoading" class="page">
    <view style="padding: 24rpx;">
      <AppSkeleton width="100%" height="200rpx" radius="24rpx" mb="24rpx" />
      <AppSkeleton width="100%" height="320rpx" radius="24rpx" mb="24rpx" />
      <AppSkeleton width="100%" height="320rpx" radius="24rpx" />
    </view>
  </view>
  <AppError v-else-if="loadError" :desc="loadError" @retry="reload" />
  <AppEmpty v-else-if="isEmpty" title="暂无限时特惠" />
  <view v-else class="page">
    <!-- 顶部品牌渐变 -->
    <view class="header">
      <view class="nav">
        <view
          class="nav-back"
          @tap="goBack"
        >
          <app-icon
            name="arrow-left"
            :size="40"
            color="#ffffff"
          />
        </view>
        <view class="nav-title">
          <app-icon
            name="flame"
            :size="32"
            color="#d4b87d"
          />
          <text class="nav-title-txt">
            限时特惠
          </text>
        </view>
      </view>

      <!-- 倒计时条 -->
      <view class="cd-bar">
        <view class="cd-left">
          <text class="cd-sub">
            每日三场 · 错过再等一天
          </text>
          <text class="cd-main">
            限时抢购
          </text>
        </view>
        <view class="cd-right">
          <text class="cd-label">
            {{ sessionTip(session?.status) }}
          </text>
          <view
            v-if="session?.status === 'active'"
            class="cd-nums"
          >
            <template
              v-for="(v, i) in cd"
              :key="i"
            >
              <text class="cd-cell">
                {{ v }}
              </text>
              <text
                v-if="i < 2"
                class="cd-colon"
              >
                :
              </text>
            </template>
          </view>
          <text
            v-else
            class="cd-placeholder"
          >
            --:--:--
          </text>
        </view>
      </view>

      <!-- 场次切换 -->
      <view class="seg">
        <view
          v-for="s in sessions"
          :key="s.id"
          class="seg-item"
          :class="{ active: activeSession === s.id }"
          @tap="activeSession = s.id"
        >
          <text
            class="seg-time"
            :class="{ active: activeSession === s.id }"
          >
            {{ s.startTime }}
          </text>
          <text
            class="seg-state"
            :class="{ active: activeSession === s.id }"
          >
            {{ sessionState(s.status) }}
          </text>
        </view>
      </view>
    </view>

    <!-- 课程列表 -->
    <view class="list">
      <view
        v-for="course in sessionCourses"
        :key="course.id"
        class="card"
      >
        <view class="card-cover">
          <image
            class="cover-img"
            :src="course.cover"
            mode="aspectFill"
          />
          <view class="cover-tags">
            <view class="tag-discount">
              <app-icon
                name="tag"
                :size="20"
                color="#1a1815"
              />
              <text class="tag-discount-txt">
                {{ course.discount }}折
              </text>
            </view>
            <text class="tag-cat">
              {{ course.category }}
            </text>
          </view>
        </view>
        <view class="card-body">
          <text class="card-title">
            {{ course.title }}
          </text>
          <view class="card-meta">
            <text class="meta-ins">
              {{ course.instructor }}
            </text>
            <view class="meta-item">
              <app-icon
                name="star"
                :size="20"
                color="#d4b87d"
                :fill="true"
              /><text class="meta-txt">
                {{ course.rating }}
              </text>
            </view>
            <view class="meta-item">
              <app-icon
                name="users"
                :size="20"
                color="#9a8c80"
              /><text class="meta-txt">
                {{ (course.students / 1000).toFixed(1) }}k
              </text>
            </view>
          </view>
          <view class="card-price-row">
            <view class="price-group">
              <text class="price-now">
                ¥{{ course.salePrice }}
              </text>
              <text class="price-old">
                ¥{{ course.originalPrice }}
              </text>
            </view>
            <text
              class="price-stock"
              :class="{ low: (course.total - course.sold) > 0 && (course.total - course.sold) <= course.total * 0.2 }"
            >
              {{ session?.status === 'upcoming' ? `共 ${course.total} 名额` : `仅剩 ${course.total - course.sold} 名额` }}
            </text>
          </view>
          <view
            v-if="session?.status !== 'upcoming'"
            class="progress"
          >
            <view
              class="progress-fill"
              :style="{ width: Math.round((course.sold / course.total) * 100) + '%' }"
            />
            <text class="progress-txt">
              已抢 {{ Math.round((course.sold / course.total) * 100) }}%
            </text>
          </view>
          <view
            class="btn"
            :class="{ disabled: session?.status === 'upcoming' }"
            @tap="session?.status !== 'upcoming' && navigateTo(`/courses/${course.id}`)"
          >
            <app-icon
              :name="session?.status === 'upcoming' ? 'clock' : 'shopping-cart'"
              :size="28"
              :color="session?.status === 'upcoming' ? '#9a8c80' : '#ffffff'"
            />
            <text
              class="btn-txt"
              :class="{ disabled: session?.status === 'upcoming' }"
            >
              {{ session?.status === 'upcoming' ? '即将开抢' : '立即抢购' }}
            </text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page { min-height: 100vh; background: #FAF8F5; }

.header { position: sticky; top: 0; z-index: 20; background: linear-gradient(135deg, #a01830, #C41E3A 60%, #C41E3A); color: #fff; }
.nav { display: flex; align-items: center; gap: 24rpx; padding: 0 32rpx; height: 96rpx; }
.nav-title { display: flex; align-items: center; gap: 12rpx; flex: 1; }
.nav-title-txt { font-size: 32rpx; font-weight: 600; color: #fff; }

.cd-bar { display: flex; align-items: center; justify-content: space-between; padding: 0 32rpx 32rpx; }
.cd-sub { display: block; font-size: 22rpx; color: rgba(255,255,255,0.7); margin-bottom: 4rpx; }
.cd-main { display: block; font-size: 36rpx; font-weight: 700; color: #fff; }
.cd-right { display: flex; flex-direction: column; align-items: flex-end; gap: 8rpx; }
.cd-label { font-size: 22rpx; color: rgba(255,255,255,0.8); }
.cd-nums { display: flex; align-items: center; gap: 8rpx; }
.cd-cell { background: #2C2C2C; color: #FAF8F5; border-radius: 8rpx; padding: 6rpx 12rpx; font-size: 28rpx; font-weight: 700; font-family: monospace; }
.cd-colon { color: #fff; font-weight: 700; }
.cd-placeholder { background: rgba(44,44,44,0.2); border-radius: 8rpx; padding: 8rpx 16rpx; font-size: 28rpx; }

.seg { display: flex; }
.seg-item { flex: 1; padding: 20rpx 0; text-align: center; }
.seg-item.active { background: #FAF8F5; }
.seg-time { display: block; font-size: 28rpx; font-weight: 600; color: #fff; }
.seg-time.active { color: #C41E3A; }
.seg-state { display: block; font-size: 22rpx; color: rgba(255,255,255,0.8); }
.seg-state.active { color: #9a8c80; }

.list { padding: 32rpx 32rpx 160rpx; display: flex; flex-direction: column; gap: 32rpx; }
.card { background: #fff; border: 1rpx solid #E8E3DB; border-radius: 32rpx; overflow: hidden; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.card-cover { position: relative; }
.cover-img { width: 100%; height: 320rpx; background: #F2EFEA; }
.cover-tags { position: absolute; top: 16rpx; left: 16rpx; display: flex; gap: 12rpx; }
.tag-discount { display: flex; align-items: center; gap: 4rpx; background: #d4b87d; padding: 4rpx 16rpx; border-radius: 999rpx; }
.tag-discount-txt { font-size: 22rpx; font-weight: 700; color: #1a1815; }
.tag-cat { background: rgba(44,44,44,0.6); color: #FAF8F5; font-size: 22rpx; padding: 4rpx 16rpx; border-radius: 999rpx; }

.card-body { padding: 24rpx; }
.card-title { display: block; font-size: 28rpx; font-weight: 600; color: #2C2C2C; margin-bottom: 8rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.card-meta { display: flex; align-items: center; gap: 16rpx; margin-bottom: 16rpx; }
.meta-ins { font-size: 22rpx; color: #9a8c80; }
.meta-item { display: flex; align-items: center; gap: 4rpx; }
.meta-txt { font-size: 22rpx; color: #9a8c80; }
.card-price-row { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 16rpx; }
.price-group { display: flex; align-items: baseline; gap: 12rpx; }
.price-now { font-size: 40rpx; font-weight: 700; color: #C41E3A; }
.price-old { font-size: 22rpx; color: #9a8c80; text-decoration: line-through; }
.price-stock { font-size: 22rpx; color: #9a8c80; }
.price-stock.low { color: #C41E3A; font-weight: 500; }
.progress { position: relative; height: 32rpx; border-radius: 999rpx; background: #F2EFEA; overflow: hidden; margin-bottom: 24rpx; }
.progress-fill { position: absolute; top: 0; bottom: 0; left: 0; border-radius: 999rpx; background: linear-gradient(to right, #a01830, #C41E3A); }
.progress-txt { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 20rpx; font-weight: 500; color: #2C2C2C; }
.btn { height: 80rpx; border-radius: 16rpx; background: #C41E3A; display: flex; align-items: center; justify-content: center; gap: 12rpx; }
.btn.disabled { background: #F2EFEA; }
.btn-txt { font-size: 28rpx; font-weight: 600; color: #fff; }
.btn-txt.disabled { color: #9a8c80; }
</style>
