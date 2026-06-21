<script setup lang="ts">
/** 作业批改页 - 从原型 app/courses/work-review/page.tsx 迁移（默认列表态） */
import { ref, computed, watch } from 'vue'
import { goBack } from '@/utils/router'
import AppIcon from '@/components/common/app-icon.vue'
import AppSkeleton from '@/components/common/app-skeleton.vue'
import AppError from '@/components/common/app-error.vue'
import AppEmpty from '@/components/common/app-empty.vue'
import { useAsyncData } from '@/composables/useAsyncData'
// @data-needs: 作业提交列表, 参数 courseId, 返回 WorkSubmission[]
// mock 见 @/lib/course-data.ts，交付时由 Claude Code 替换为真实接口
import { workSubmissions as _workSubmissions } from '@/lib/course-data'

const { data: pageData, isLoading, loadError, reload } = useAsyncData(async () => {
  return { submissions: _workSubmissions }
})

type FilterKey = 'all' | 'pending' | 'graded'
const submissions = ref<any[]>([])
const isEmpty = computed(() => submissions.value.length === 0)

watch(() => pageData.value?.submissions, (v) => { if (v) submissions.value = v }, { immediate: true })
const filter = ref<FilterKey>('all')
const batchMode = ref(false)
const selectedIds = ref<Set<string>>(new Set())

const filtered = computed(() =>
  submissions.value.filter((s) => (filter.value === 'all' ? true : s.status === filter.value)),
)
const pendingCount = computed(() => submissions.value.filter((s) => s.status === 'pending').length)

const filterTabs: { key: FilterKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待批改' },
  { key: 'graded', label: '已批改' },
]
function statusLabel(s: string) {
  return s === 'pending' ? '待批改' : s === 'graded' ? '已批改' : '已退回'
}
function toggleSelect(id: string) {
  const next = new Set(selectedIds.value)
  next.has(id) ? next.delete(id) : next.add(id)
  selectedIds.value = next
}
</script>

<template>
  <view v-if="isLoading" class="page">
    <view style="padding: 24rpx;">
      <AppSkeleton width="100%" height="100rpx" radius="24rpx" mb="24rpx" />
      <AppSkeleton width="100%" height="180rpx" radius="24rpx" mb="24rpx" />
      <AppSkeleton width="100%" height="180rpx" radius="24rpx" mb="24rpx" />
      <AppSkeleton width="100%" height="180rpx" radius="24rpx" />
    </view>
  </view>
  <AppError v-else-if="loadError" :desc="loadError" @retry="reload" />
  <AppEmpty v-else-if="isEmpty" title="暂无作业" desc="还没有学生提交作业" />
  <view v-else class="page">
    <!-- 导航栏 -->
    <view class="nav">
      <view class="nav-l">
        <view
          class="nav-back"
          @tap="goBack"
        >
          <app-icon
            name="arrow-left"
            :size="36"
            color="#2C2C2C"
          />
        </view>
        <text class="nav-title">
          作业批改
        </text>
      </view>
      <view
        class="batch-btn"
        :class="{ on: batchMode }"
        @tap="batchMode = !batchMode"
      >
        <text
          class="batch-txt"
          :class="{ on: batchMode }"
        >
          {{ batchMode ? '取消批量' : '批量批改' }}
        </text>
      </view>
    </view>

    <!-- 统计和筛选 -->
    <view class="filter-bar">
      <view class="stat-row">
        <view class="stat-item">
          <app-icon
            name="users"
            :size="28"
            color="#999999"
          />
          <text class="stat-txt">
            共 {{ submissions.length }} 份作业
          </text>
        </view>
        <view class="stat-item">
          <app-icon
            name="clock"
            :size="28"
            color="#f97316"
          />
          <text class="stat-txt orange">
            {{ pendingCount }} 份待批改
          </text>
        </view>
      </view>
      <view class="tabs">
        <view
          v-for="t in filterTabs"
          :key="t.key"
          class="tab"
          :class="{ on: filter === t.key }"
          @tap="filter = t.key"
        >
          <text
            class="tab-txt"
            :class="{ on: filter === t.key }"
          >
            {{ t.label }}
          </text>
        </view>
      </view>
    </view>

    <!-- 列表 -->
    <view class="body">
      <view
        v-if="filtered.length === 0"
        class="empty"
      >
        <view class="empty-ico">
          <app-icon
            name="file-text"
            :size="56"
            color="#999999"
          />
        </view>
        <text class="empty-txt">
          暂无作业
        </text>
      </view>
      <view
        v-else
        class="list"
      >
        <view
          v-for="work in filtered"
          :key="work.id"
          class="item-wrap"
        >
          <view
            v-if="batchMode"
            class="check"
            :class="{ on: selectedIds.has(work.id) }"
            @tap="toggleSelect(work.id)"
          >
            <app-icon
              v-if="selectedIds.has(work.id)"
              name="check-circle"
              :size="28"
              color="#ffffff"
            />
          </view>
          <view class="card">
            <view class="card-top">
              <view class="stu">
                <view class="avatar">
                  <text class="avatar-txt">
                    {{ work.student.name.charAt(0) }}
                  </text>
                </view>
                <view class="stu-info">
                  <text class="stu-name">
                    {{ work.student.name }}
                  </text>
                  <text class="stu-chap">
                    {{ work.chapterTitle }}
                  </text>
                </view>
              </view>
              <view
                class="badge"
                :class="work.status"
              >
                <text
                  class="badge-txt"
                  :class="work.status"
                >
                  {{ statusLabel(work.status) }}
                </text>
              </view>
            </view>
            <text class="card-content">
              {{ work.content }}
            </text>
            <view class="card-foot">
              <view class="meta">
                <view class="meta-item">
                  <app-icon
                    name="file-text"
                    :size="22"
                    color="#999999"
                  /><text class="meta-txt">
                    {{ work.wordCount }}字
                  </text>
                </view>
                <view
                  v-if="work.images.length > 0"
                  class="meta-item"
                >
                  <app-icon
                    name="image"
                    :size="22"
                    color="#999999"
                  /><text class="meta-txt">
                    {{ work.images.length }}图
                  </text>
                </view>
              </view>
              <text class="meta-time">
                {{ work.submittedAt }}
              </text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page { min-height: 100vh; background: #FAF8F5; padding-bottom: 160rpx; }

.nav { position: sticky; top: 0; z-index: 40; display: flex; align-items: center; justify-content: space-between; height: 112rpx; padding: 0 32rpx; background: #fff; border-bottom: 1rpx solid #E8E3DB; }
.nav-l { display: flex; align-items: center; gap: 24rpx; }
.nav-back { padding: 8rpx; }
.nav-title { font-size: 30rpx; font-weight: 500; color: #2C2C2C; }
.batch-btn { padding: 8rpx 24rpx; border-radius: 999rpx; background: #F2EFEA; }
.batch-btn.on { background: #C41E3A; }
.batch-txt { font-size: 26rpx; color: #666; }
.batch-txt.on { color: #fff; }

.filter-bar { padding: 24rpx 32rpx; background: #fff; border-bottom: 1rpx solid #E8E3DB; }
.stat-row { display: flex; align-items: center; gap: 32rpx; margin-bottom: 24rpx; }
.stat-item { display: flex; align-items: center; gap: 8rpx; }
.stat-txt { font-size: 26rpx; color: #666; }
.stat-txt.orange { color: #ea580c; }
.tabs { display: flex; gap: 16rpx; }
.tab { padding: 12rpx 24rpx; border-radius: 999rpx; background: #F2EFEA; }
.tab.on { background: #C41E3A; }
.tab-txt { font-size: 26rpx; color: #666; }
.tab-txt.on { color: #fff; }

.body { padding: 32rpx; }
.empty { padding: 160rpx 0; display: flex; flex-direction: column; align-items: center; }
.empty-ico { width: 128rpx; height: 128rpx; border-radius: 999rpx; background: #F2EFEA; display: flex; align-items: center; justify-content: center; margin-bottom: 32rpx; }
.empty-txt { font-size: 28rpx; color: #999; }

.list { display: flex; flex-direction: column; gap: 24rpx; }
.item-wrap { position: relative; }
.check { position: absolute; left: -16rpx; top: 32rpx; width: 48rpx; height: 48rpx; border-radius: 999rpx; border: 4rpx solid #E8E3DB; background: #fff; display: flex; align-items: center; justify-content: center; z-index: 10; }
.check.on { background: #C41E3A; border-color: #C41E3A; }

.card { background: #fff; border-radius: 24rpx; padding: 32rpx; }
.card-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24rpx; }
.stu { display: flex; align-items: center; gap: 24rpx; }
.avatar { width: 80rpx; height: 80rpx; border-radius: 999rpx; background: linear-gradient(135deg, rgba(196,30,58,0.2), rgba(201,169,110,0.2)); display: flex; align-items: center; justify-content: center; }
.avatar-txt { font-size: 28rpx; font-weight: 500; color: #C41E3A; }
.stu-info { display: flex; flex-direction: column; gap: 4rpx; }
.stu-name { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.stu-chap { font-size: 22rpx; color: #999; }
.badge { padding: 2rpx 16rpx; border-radius: 999rpx; }
.badge.pending { background: #fff7ed; }
.badge.graded { background: #f0fdf4; }
.badge.returned { background: #fef2f2; }
.badge-txt { font-size: 22rpx; font-weight: 500; }
.badge-txt.pending { color: #ea580c; }
.badge-txt.graded { color: #16a34a; }
.badge-txt.returned { color: #dc2626; }

.card-content { display: block; font-size: 28rpx; color: #666; line-height: 1.5; margin-bottom: 16rpx; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.card-foot { display: flex; align-items: center; justify-content: space-between; }
.meta { display: flex; align-items: center; gap: 24rpx; }
.meta-item { display: flex; align-items: center; gap: 6rpx; }
.meta-txt { font-size: 22rpx; color: #999; }
.meta-time { font-size: 22rpx; color: #999; }
</style>
