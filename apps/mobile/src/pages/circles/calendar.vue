<script setup lang="ts">
/**
 * 活动日历（从原型 app/circles/calendar/page.tsx 156行高保真迁移）
 * 月份导航 + 日历网格(事件圆点) + 选中日活动列表
 */
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import ErrorState from '@/components/common/error-state.vue'
import { goBack } from '@/utils/router'
import { circleManageApi, type CalEvent } from '@/lib/circle-detail-data'

const circleId = ref('1')

onLoad((q) => { if (q?.id) circleId.value = q.id })
const loading = ref(true)
const error = ref('')
const EVENTS = ref<CalEvent[]>([])

onMounted(() => { loadData() })
async function loadData() {
  loading.value = true
  error.value = ''
  try {
    EVENTS.value = await circleManageApi.listCalendarEvents(circleId.value, year.value, month.value + 1)
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}
const TYPE_CFG = {
  live: { label: '直播', cls: 'red' },
  activity: { label: '活动', cls: 'blue' },
  offline: { label: '线下', cls: 'green' },
}
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

const today = new Date()
const todayStr = today.toISOString().slice(0, 10)
const year = ref(today.getFullYear())
const month = ref(today.getMonth())
const selected = ref(todayStr)

function prevMonth() { if (month.value === 0) { year.value--; month.value = 11 } else month.value-- }
function nextMonth() { if (month.value === 11) { year.value++; month.value = 0 } else month.value++ }

const cells = computed<(number | null)[]>(() => {
  const days = new Date(year.value, month.value + 1, 0).getDate()
  const firstWd = new Date(year.value, month.value, 1).getDay()
  return [...Array(firstWd).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]
})
const eventDates = computed(() => new Set(EVENTS.value.map(e => e.date)))
const dayEvents = computed(() => EVENTS.value.filter(e => e.date === selected.value))

function dateStr(day: number) { return `${year.value}-${String(month.value + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` }
function selDay(day: number) { selected.value = dateStr(day) }
const selLabel = computed(() => `${selected.value.slice(5, 7)}月${selected.value.slice(8, 10)}日`)
</script>

<template>
  <view class="cal">
    <view class="cal-header">
      <view @tap="goBack">
        <app-icon
          name="arrow-left"
          :size="40"
          color="#2C2C2C"
        />
      </view>
      <text class="cal-title">
        活动日历
      </text>
    </view>

    <view class="cal-body">
      <!-- 加载骨架 -->
      <view
        v-if="loading"
        class="cal-skeleton"
      >
        <view class="cal-sk-nav sk-anim" />
        <view class="cal-sk-grid">
          <view
            v-for="i in 35"
            :key="i"
            class="cal-sk-cell sk-anim"
          />
        </view>
        <view
          v-for="i in 2"
          :key="i"
          class="cal-sk-event sk-anim"
        />
      </view>

      <error-state
        v-else-if="error"
        :message="error"
        @retry="loadData"
      />

      <template v-else>
        <!-- 月份导航 -->
        <view class="cal-nav">
          <view
            class="cal-nav-btn"
            @tap="prevMonth"
          >
            <app-icon
              name="chevron-left"
              :size="36"
              color="#2C2C2C"
            />
          </view>
          <text class="cal-nav-label">
            {{ year }}年{{ month + 1 }}月
          </text>
          <view
            class="cal-nav-btn"
            @tap="nextMonth"
          >
            <app-icon
              name="chevron-right"
              :size="36"
              color="#2C2C2C"
            />
          </view>
        </view>

        <!-- 星期表头 -->
        <view class="cal-week">
          <view
            v-for="(d, i) in WEEKDAYS"
            :key="d"
            class="cal-week-cell"
          >
            <text
              class="cal-week-txt"
              :class="{ weekend: i === 0 || i === 6 }"
            >
              {{ d }}
            </text>
          </view>
        </view>

        <!-- 日历网格 -->
        <view class="cal-grid">
          <view
            v-for="(day, i) in cells"
            :key="i"
            class="cal-cell"
          >
            <view
              v-if="day"
              class="cal-day"
              :class="{ sel: dateStr(day) === selected, today: dateStr(day) === todayStr && dateStr(day) !== selected }"
              @tap="selDay(day)"
            >
              <text
                class="cal-day-txt"
                :class="{ sel: dateStr(day) === selected, today: dateStr(day) === todayStr && dateStr(day) !== selected }"
              >
                {{ day }}
              </text>
              <view
                v-if="eventDates.has(dateStr(day))"
                class="cal-dot"
                :class="{ sel: dateStr(day) === selected }"
              />
            </view>
          </view>
        </view>

        <!-- 选中日活动 -->
        <view class="cal-events">
          <text class="cal-events-title">
            {{ selLabel }} 的活动
          </text>
          <view
            v-if="dayEvents.length === 0"
            class="cal-events-empty"
          >
            <text class="cal-events-empty-txt">
              当日无活动
            </text>
          </view>
          <view
            v-else
            class="cal-events-list"
          >
            <view
              v-for="evt in dayEvents"
              :key="evt.id"
              class="cal-event"
            >
              <text class="cal-event-time">
                {{ evt.time }}
              </text>
              <view class="cal-event-main">
                <view class="cal-event-top">
                  <text class="cal-event-title">
                    {{ evt.title }}
                  </text>
                  <view
                    class="cal-event-tag"
                    :class="TYPE_CFG[evt.type].cls"
                  >
                    <text
                      class="cal-event-tag-txt"
                      :class="TYPE_CFG[evt.type].cls"
                    >
                      {{ TYPE_CFG[evt.type].label }}
                    </text>
                  </view>
                </view>
                <text class="cal-event-circle">
                  {{ evt.circle }}
                </text>
              </view>
            </view>
          </view>
        </view>
      </template>
    </view>
  </view>
</template>

<style scoped lang="scss">
.cal { min-height: 100vh; background: var(--bg-paper, #FAF8F5); }
.cal-header { position: sticky; top: 0; z-index: 10; background: var(--bg-paper, #FAF8F5); border-bottom: 2rpx solid var(--border, #EDE8E0); display: flex; align-items: center; gap: 24rpx; padding: 0 32rpx; height: 96rpx; padding-top: var(--status-bar-height, 0px); }
.cal-title { font-size: 32rpx; font-weight: 600; color: var(--text-ink, #2C2C2C); }
.cal-body { padding: 32rpx; }
.cal-nav { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32rpx; }
.cal-nav-btn { padding: 12rpx; border-radius: 16rpx; }
.cal-nav-label { font-size: 32rpx; font-weight: 600; color: var(--text-ink, #2C2C2C); }
.cal-week { display: flex; margin-bottom: 8rpx; }
.cal-week-cell { flex: 1; text-align: center; padding: 8rpx 0; }
.cal-week-txt { font-size: 24rpx; font-weight: 500; color: var(--text-ink, #2C2C2C); }
.cal-week-txt.weekend { color: #999; }
.cal-grid { display: flex; flex-wrap: wrap; }
.cal-cell { width: calc(100% / 7); display: flex; justify-content: center; padding: 4rpx 0; }
.cal-day { width: 72rpx; height: 80rpx; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 16rpx; position: relative; }
.cal-day.sel { background: var(--brand, #C41E3A); }
.cal-day.today { background: rgba(196,30,58,0.1); }
.cal-day-txt { font-size: 28rpx; font-weight: 500; color: var(--text-ink, #2C2C2C); }
.cal-day-txt.sel { color: #fff; }
.cal-day-txt.today { color: var(--brand, #C41E3A); }
.cal-dot { width: 12rpx; height: 12rpx; border-radius: 999rpx; background: var(--brand, #C41E3A); margin-top: 4rpx; }
.cal-dot.sel { background: #fff; }
.cal-events { margin-top: 48rpx; }
.cal-events-title { font-size: 28rpx; font-weight: 600; color: var(--text-ink, #2C2C2C); }
.cal-events-empty { text-align: center; padding: 64rpx 0; }
.cal-events-empty-txt { font-size: 26rpx; color: #999; }
.cal-events-list { display: flex; flex-direction: column; gap: 24rpx; margin-top: 24rpx; }
.cal-event { display: flex; gap: 24rpx; padding: 24rpx; background: var(--card, #fff); border: 2rpx solid var(--border, #EDE8E0); border-radius: 24rpx; }
.cal-event-time { font-size: 28rpx; font-weight: 700; color: var(--brand, #C41E3A); padding-top: 2rpx; }
.cal-event-main { flex: 1; min-width: 0; }
.cal-event-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 16rpx; }
.cal-event-title { font-size: 28rpx; font-weight: 500; color: var(--text-ink, #2C2C2C); }
.cal-event-tag { padding: 4rpx 12rpx; border-radius: 999rpx; flex-shrink: 0; }
.cal-event-tag.red { background: #FEE2E2; }
.cal-event-tag.blue { background: #DBEAFE; }
.cal-event-tag.green { background: #DCFCE7; }
.cal-event-tag-txt { font-size: 20rpx; }
.cal-event-tag-txt.red { color: #B91C1C; }
.cal-event-tag-txt.blue { color: #1D4ED8; }
.cal-event-tag-txt.green { color: #15803D; }
.cal-event-circle { display: block; font-size: 24rpx; color: #999; margin-top: 8rpx; }

/* 骨架屏 */
.cal-skeleton { display: flex; flex-direction: column; gap: 32rpx; }
.cal-sk-nav { height: 64rpx; border-radius: 16rpx; width: 60%; align-self: center; }
.cal-sk-grid { display: flex; flex-wrap: wrap; gap: 4rpx; }
.cal-sk-cell { width: 72rpx; height: 80rpx; border-radius: 16rpx; }
.cal-sk-event { height: 100rpx; border-radius: 24rpx; }
.sk-anim { background: linear-gradient(90deg, #E8E0D0 25%, #F0EDE6 50%, #E8E0D0 75%); background-size: 200% 100%; animation: sk-shimmer 1.5s infinite; }
@keyframes sk-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
</style>
