<!--
  I3 · 讲师/成员详情（书院研究院 V0 重构版）
  数据源：instituteApi.getMember(id) → MemberDetail（含 tasks / enrolledStations）
  态A 签约讲师（lecturerLevel==='SIGNED'）：朱红头部 + 驿站授课闭环区块（研究院→驿站供给）
  态B 分享会员（未签约）：金褐头部 + 成长通道提示
  真连铁律：仅用 MemberDetail 真实字段，mockup 虚构内容（简介/签约时间/研究产出/驿站在授课程数）诚实降级。
-->
<template>
  <view class="page">
    <!-- 自绘导航栏（透明浮于头部之上）-->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-back" @tap="goBack">
          <app-icon name="chevron-left" :size="22" color="#fff" />
        </view>
        <text class="nav-title">{{ signed ? '签约讲师' : '成员详情' }}</text>
        <view class="nav-placeholder" />
      </view>
    </view>

    <scroll-view scroll-y class="scroll">
      <!-- 加载态 -->
      <view v-if="loading" class="state-box" :style="{ paddingTop: navHeight + 'px' }">
        <view class="spinner" />
        <text class="state-text">加载中…</text>
      </view>

      <!-- 空/错误态 -->
      <view v-else-if="!detail" class="state-box" :style="{ paddingTop: navHeight + 'px' }">
        <app-icon name="user-x" :size="44" color="#d8cfc0" />
        <text class="state-text">{{ errMsg || '成员不存在' }}</text>
        <view class="retry-btn" @tap="goMembers"><text class="retry-text">返回成员名录</text></view>
      </view>

      <template v-else>
        <!-- 头部（签约=朱红渐变 / 未签约=金褐渐变）-->
        <view class="top" :class="{ 'top-share': !signed }">
          <view class="top-seal" />
          <view class="head" :style="{ paddingTop: navHeight + 'px' }">
            <view class="av-wrap">
              <image lazy-load v-if="detail.user.avatar" :src="detail.user.avatar" class="av-img" mode="aspectFill" />
              <view v-else class="av"><text class="av-char">{{ avatarChar }}</text></view>
            </view>
            <view class="head-info">
              <text class="hname">{{ memberName(detail.user) }}</text>
              <view class="chip-row">
                <text v-if="signed" class="chip chip-signed">签约讲师</text>
                <text v-else class="chip chip-share">{{ roleLabel[detail.role] }}</text>
                <text v-if="detail.lecturerLevel !== 'NONE' && !signed" class="chip chip-lv">{{ lecturerLevelLabel[detail.lecturerLevel] }}</text>
                <text v-if="signed && detail.role" class="chip chip-lv">{{ roleLabel[detail.role] }}</text>
              </view>
              <text class="hsub">{{ detail.joinYear }} 年加入研究院</text>
            </view>
          </view>
        </view>

        <view class="wrap">
          <!-- 会籍与分享任务 -->
          <text class="sec-t">会籍与分享任务</text>
          <view class="card">
            <view class="kv">
              <text class="k">研究院角色</text>
              <text class="v">{{ roleLabel[detail.role] }}{{ isManagement(detail.role) ? ' · 管理层' : '' }}</text>
            </view>
            <view class="kv">
              <text class="k">讲师等级</text>
              <text class="v">{{ lecturerLevelLabel[detail.lecturerLevel] }}</text>
            </view>
            <view class="kv">
              <text class="k">会籍状态</text>
              <text class="v" :style="{ color: memberStatusColor[detail.status].color }">{{ memberStatusLabel[detail.status] }}{{ detail.expireAt ? ' · ' + fmtDate(detail.expireAt) + ' 到期' : '' }}</text>
            </view>
            <view class="kv">
              <text class="k">年度任务</text>
              <text class="v">{{ detail.tasksCompleted }} / {{ detail.tasksRequired }} {{ taskAllDone ? '已完成' : '进行中' }}</text>
            </view>
            <!-- 任务进度条 -->
            <view class="kv-prog">
              <text class="prog-label">年度任务进度</text>
              <view class="bar"><view class="bar-i" :class="{ 'bar-share': !signed }" :style="{ width: progPct + '%' }" /></view>
            </view>
          </view>

          <!-- 态A · 驿站授课闭环（仅签约讲师渲染）-->
          <template v-if="signed">
            <text class="sec-t">驿站授课 · 已入驻</text>
            <view class="note">研究院筛人 → 驿站用人的闭环凭证：签约讲师入驻驿站讲师库，向线下驿站供给师资。</view>
            <view v-if="!enrolledStations.length" class="empty-card">
              <app-icon name="map-pin" :size="26" color="#d8cfc0" />
              <text class="empty-text">尚未入驻驿站讲师库</text>
            </view>
            <view v-else>
              <view v-for="s in enrolledStations" :key="s.stationId" class="card station" @tap="goStation(s.stationId)">
                <view class="slogo"><text class="slogo-char">{{ stationChar(s.name) }}</text></view>
                <view class="station-info">
                  <text class="sname">{{ s.name }}</text>
                  <text class="smeta">驿站讲师库 · 点击查看驿站</text>
                </view>
                <app-icon name="chevron-right" :size="18" color="#9B9B9B" />
              </view>
            </view>
          </template>

          <!-- 态B · 成长通道（未签约·非管理层显示）-->
          <template v-else-if="!isManagement(detail.role)">
            <text class="sec-t">成长通道</text>
            <view class="grow-card">
              <text class="grow-title">成长中 · 签约观察期</text>
              <text class="grow-desc">持续完成分享任务、参与研究院活动，平台观察评估后将主动发起签约邀约，进入驿站讲师库。</text>
            </view>
          </template>

          <!-- 分享任务记录 -->
          <text class="sec-t">分享任务记录</text>
          <view v-if="!tasks.length" class="empty-card">
            <app-icon name="inbox" :size="26" color="#d8cfc0" />
            <text class="empty-text">暂无分享任务记录</text>
          </view>
          <view v-else>
            <view v-for="t in tasks" :key="t.id" class="card task">
              <view class="task-top">
                <text class="task-title">{{ t.title }}</text>
                <text class="task-status" :style="{ color: taskStatusColor[t.status].color, background: taskStatusColor[t.status].bg }">{{ taskStatusLabel[t.status] }}</text>
              </view>
              <view class="task-meta">
                <text class="task-type" :style="{ color: taskTypeColor[t.taskType].color, background: taskTypeColor[t.taskType].bg }">{{ taskTypeLabel[t.taskType] }}</text>
                <text v-if="t.completedAt" class="task-date">完成于 {{ fmtDate(t.completedAt) }}</text>
              </view>
            </view>
          </view>

          <view class="bottom-safe" />
        </view>
      </template>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import {
  instituteApi, roleLabel, lecturerLevelLabel,
  memberStatusLabel, memberStatusColor, isManagement, memberName,
  taskTypeLabel, taskTypeColor, taskStatusLabel, taskStatusColor, fmtDate,
  type MemberDetail,
} from '@/lib/institute-data'

const statusBarHeight = ref(0)
const navHeight = ref(44)
const sys = uni.getSystemInfoSync()
statusBarHeight.value = sys.statusBarHeight || 0
navHeight.value = (sys.statusBarHeight || 0) + 44

const loading = ref(true)
const errMsg = ref('')
const detail = ref<MemberDetail | null>(null)

// ── 派生（全部基于 MemberDetail 真实字段）──
const signed = computed(() => detail.value?.lecturerLevel === 'SIGNED')
const tasks = computed(() => detail.value?.tasks || [])
const enrolledStations = computed(() => detail.value?.enrolledStations || [])
const taskAllDone = computed(() => {
  const d = detail.value
  return !!d && d.tasksRequired > 0 && d.tasksCompleted >= d.tasksRequired
})
const progPct = computed(() => {
  const d = detail.value
  if (!d || d.tasksRequired <= 0) return 0
  return Math.min(100, Math.round((d.tasksCompleted / d.tasksRequired) * 100))
})
const avatarChar = computed(() => memberName(detail.value?.user).charAt(0) || '员')

function stationChar(name: string) {
  return (name || '驿').charAt(0)
}

async function load(id?: string) {
  if (!id) { loading.value = false; errMsg.value = '缺少成员参数'; return }
  loading.value = true
  errMsg.value = ''
  try {
    detail.value = await instituteApi.getMember(id)
  } catch (e) {
    errMsg.value = (e as Error)?.message || '加载失败'
    detail.value = null
  } finally {
    loading.value = false
  }
}
onLoad((q) => load(q && q.id ? String(q.id) : undefined))

function goMembers() {
  navigateTo('/institute/members')
}
function goStation(stationId: string) {
  // 研究院→驿站闭环：跳线下驿站详情
  navigateTo(`/pkg-offline/station-detail/index?id=${stationId}`)
}
</script>

<style lang="scss" scoped>
$paper: #FAF8F5;
$card: #FFFFFF;
$red: #C41E3A;
$red-deep: #9E1730;
$gold: #C9A96E;
$ink: #2C2C2C;
$sub: #6E6E73;
$faint: #999999;
$line: #EDEAE4;

.page { min-height: 100vh; background: $paper; }
.scroll { height: 100vh; box-sizing: border-box; }

/* 自绘导航栏（浮于渐变头部之上）*/
.nav { position: fixed; top: 0; left: 0; right: 0; z-index: 20; }
.nav-bar { height: 88rpx; display: flex; align-items: center; padding: 0 24rpx; }
.nav-back { width: 60rpx; height: 60rpx; display: flex; align-items: center; justify-content: center; margin-left: -8rpx; }
.nav-title { flex: 1; text-align: center; font-size: 34rpx; font-weight: 600; color: #fff; }
.nav-placeholder { width: 60rpx; }

/* 状态态 */
.state-box { padding: 200rpx 0 100rpx; display: flex; flex-direction: column; align-items: center; gap: 24rpx; }
.state-text { font-size: 26rpx; color: $faint; }
.spinner { width: 56rpx; height: 56rpx; border: 6rpx solid $line; border-top-color: $red; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.retry-btn { margin-top: 8rpx; padding: 16rpx 44rpx; border: 2rpx solid $red; border-radius: 999px; }
.retry-text { font-size: 26rpx; color: $red; }

/* 头部渐变 */
.top {
  position: relative; overflow: hidden;
  padding: 0 40rpx 52rpx;
  background: linear-gradient(150deg, $red, $red-deep);
  &.top-share { background: linear-gradient(150deg, #8a6d2f, #6d5522); }
}
.top-seal {
  position: absolute; right: -40rpx; top: 40rpx;
  width: 240rpx; height: 240rpx;
  border: 2rpx solid rgba(201,169,110,0.35); border-radius: 50%;
}
.head { display: flex; gap: 28rpx; align-items: center; position: relative; z-index: 1; }
.av-wrap { flex-shrink: 0; }
.av, .av-img {
  width: 148rpx; height: 148rpx; border-radius: 50%;
  border: 4rpx solid rgba(255,255,255,0.5);
}
.av {
  background: linear-gradient(135deg, #f0e6d3, #d8c4a0);
  display: flex; align-items: center; justify-content: center;
}
.av-char { font-size: 60rpx; color: #8a6d2f; font-weight: 700; }
.head-info { flex: 1; min-width: 0; }
.hname { font-size: 40rpx; font-weight: 800; color: #fff; }
.chip-row { display: flex; flex-wrap: wrap; gap: 10rpx; margin-top: 12rpx; }
.chip { font-size: 20rpx; border-radius: 999px; padding: 4rpx 18rpx; line-height: 1.6; }
.chip-signed { background: $gold; color: #3a2c10; font-weight: 700; }
.chip-share { background: rgba(255,255,255,0.22); color: #fff; }
.chip-lv { background: rgba(255,255,255,0.14); color: #fff; border: 2rpx solid rgba(255,255,255,0.3); }
.hsub { display: block; font-size: 22rpx; color: rgba(255,255,255,0.82); margin-top: 16rpx; }

/* 内容区 */
.wrap { padding: 32rpx 40rpx; }
.sec-t { display: block; font-size: 32rpx; font-weight: 700; color: $ink; margin: 40rpx 0 20rpx; }
.sec-t:first-child { margin-top: 0; }

.card {
  background: $card; border: 2rpx solid $line; border-radius: 18px;
  box-shadow: 0 8rpx 32rpx rgba(140,120,90,0.06);
  overflow: hidden;
}

/* kv 列表 */
.kv { display: flex; align-items: center; justify-content: space-between; padding: 24rpx 32rpx; border-bottom: 2rpx solid $line; }
.kv .k { font-size: 24rpx; color: $faint; }
.kv .v { font-size: 24rpx; color: $ink; font-weight: 600; text-align: right; }
.kv-prog { padding: 24rpx 32rpx; }
.prog-label { display: block; font-size: 22rpx; color: $faint; margin-bottom: 14rpx; }
.bar { height: 16rpx; border-radius: 999px; background: $line; overflow: hidden; }
.bar-i { height: 100%; border-radius: 999px; background: linear-gradient(90deg, $gold, $red); }
.bar-i.bar-share { background: linear-gradient(90deg, #d8c4a0, #8a6d2f); }

/* 驿站授课闭环 */
.note {
  background: #F5EFE6; border: 2rpx solid #ece0cd; border-radius: 12px;
  padding: 22rpx 26rpx; font-size: 22rpx; color: #9c8656; line-height: 1.6; margin-bottom: 20rpx;
}
.station { display: flex; gap: 24rpx; align-items: center; padding: 26rpx 28rpx; margin-bottom: 20rpx; }
.slogo {
  width: 92rpx; height: 92rpx; border-radius: 12px; flex-shrink: 0;
  background: linear-gradient(135deg, $gold, #a5854a);
  display: flex; align-items: center; justify-content: center;
}
.slogo-char { font-size: 34rpx; color: #fff; font-weight: 600; }
.station-info { flex: 1; min-width: 0; }
.sname { display: block; font-size: 26rpx; font-weight: 700; color: $ink; }
.smeta { display: block; font-size: 21rpx; color: $faint; margin-top: 6rpx; }

/* 成长通道 */
.grow-card {
  background: $card; border: 2rpx solid $gold; border-radius: 18px; padding: 32rpx;
}
.grow-title { display: block; font-size: 27rpx; font-weight: 700; color: $ink; margin-bottom: 10rpx; }
.grow-desc { display: block; font-size: 23rpx; color: $sub; line-height: 1.7; }

/* 分享任务卡 */
.task { padding: 26rpx 28rpx; margin-bottom: 20rpx; }
.task-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 16rpx; }
.task-title { flex: 1; font-size: 27rpx; font-weight: 600; color: $ink; line-height: 1.4; }
.task-status { font-size: 20rpx; padding: 4rpx 16rpx; border-radius: 999px; white-space: nowrap; }
.task-meta { display: flex; align-items: center; gap: 18rpx; margin-top: 16rpx; }
.task-type { font-size: 20rpx; padding: 4rpx 16rpx; border-radius: 6rpx; }
.task-date { font-size: 22rpx; color: $faint; }

/* 空态卡 */
.empty-card {
  background: $card; border: 2rpx solid $line; border-radius: 18px;
  padding: 56rpx 0; display: flex; flex-direction: column; align-items: center; gap: 16rpx;
}
.empty-text { font-size: 24rpx; color: $faint; }

.bottom-safe { height: 48rpx; }
</style>
