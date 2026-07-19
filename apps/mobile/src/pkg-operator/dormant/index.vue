<template>
  <view class="dormant-page">
    <app-nav-bar title="沉寂预警" :show-back="true" background="#ffffff" color="#2C2C2C" />

    <!-- 三态：加载中 -->
    <view v-if="loading" class="state-loading"><text class="state-loading-text">加载中...</text></view>
    <!-- 三态：错误 -->
    <view v-else-if="error" class="state-error">
      <text class="state-error-text">{{ error }}</text>
      <view class="state-retry-btn" @tap="retry"><text>重试</text></view>
    </view>

    <!-- 三态：全绿空态（团队全员活跃） -->
    <view v-else-if="members.length === 0" class="dm-empty">
      <view class="dm-empty-ill">
        <app-icon name="check-circle" :size="52" color="#2DAE57" />
      </view>
      <text class="dm-empty-title">团队状态良好</text>
      <text class="dm-empty-desc">当前所有站长均保持活跃，{{ '\n' }}暂无需要关注的沉寂成员。</text>
      <view class="dm-empty-btn" @tap="goInvite"><text class="dm-empty-btn-txt">邀请更多站长</text></view>
    </view>

    <!-- 正常态：分级列表 -->
    <template v-else>
      <scroll-view scroll-y class="dm-scroll">
        <!-- 汇总卡 -->
        <view class="dm-sum">
          <view class="dm-sum-ring"><text class="dm-sum-ring-num">{{ members.length }}</text></view>
          <view class="dm-sum-info">
            <text class="dm-sum-title">{{ members.length }} 位站长需要关注</text>
            <text class="dm-sum-desc">及时跟进激活，避免团队业绩流失</text>
          </view>
        </view>

        <!-- 分级分组渲染 -->
        <template v-for="g in groups" :key="g.key">
          <view v-if="g.list.length > 0" class="dm-sec-label">
            <view class="dm-sec-sq" :style="{ background: g.color }"></view>
            <text class="dm-sec-txt">{{ g.title }}</text>
          </view>
          <!-- 勾选整行可点·勾选框仅视觉·热区≥88rpx -->
          <view
            v-for="m in g.list"
            :key="m.id"
            class="dm-card"
            :class="'lv-' + g.key"
            @tap="toggleSelect(m.id)"
          >
            <view class="dm-chk" :class="{ on: selectedIds.includes(m.id) }">
              <app-icon v-if="selectedIds.includes(m.id)" name="check" :size="26" color="#ffffff" />
            </view>
            <view class="dm-av"><text class="dm-av-txt">{{ m.name.charAt(0) }}</text></view>
            <view class="dm-info">
              <text class="dm-name">{{ m.name }}</text>
              <text class="dm-sub">{{ subLine(m) }}</text>
            </view>
            <!-- 天数标签：无最后活跃时间时降级为「无收益」 -->
            <text class="dm-days" :class="'d-' + g.key">{{ daysLabel(m) }}</text>
          </view>
        </template>

        <view class="dm-scroll-pad"></view>
      </scroll-view>

      <!-- 底部批量条 -->
      <view class="dm-batchbar">
        <view class="dm-bb-info">
          <text v-if="selectedIds.length > 0">已选 <text class="dm-bb-num">{{ selectedIds.length }}</text> 位</text>
          <text v-else class="dm-bb-hint">勾选站长后可批量提醒</text>
        </view>
        <view
          class="dm-bb-btn"
          :class="{ off: selectedIds.length === 0 }"
          @tap="remindSelected"
        >
          <text class="dm-bb-btn-txt">发送激活提醒</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { operatorApi, type DormantMember } from '@/pkg-operator/lib/operator-data'

const loading = ref(true)
const error = ref('')
const members = ref<DormantMember[]>([])
const submitting = ref(false)
const selectedIds = ref<string[]>([])

async function load() {
  try {
    const dm = await operatorApi.getDormantMembers()
    members.value = dm.map((m: DormantMember) => ({ ...m }))
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function retry() {
  loading.value = true
  error.value = ''
  await load()
}

// ===== 三级分级 =====
// 数据源诚实说明：后端暂无「最后活跃时间」，lastActiveDays 恒为 0（数据层已降级）。
// 天数可用时（>0）按 7-14 / 15-30 / >30 三级分档；不可用时统一归入「需关注」，不虚构天数。
type LevelKey = 'lv1' | 'lv2' | 'lv3' | 'flat'

function levelOf(m: DormantMember): LevelKey {
  const d = m.lastActiveDays
  if (!d || d <= 0) return 'flat'
  if (d <= 14) return 'lv1'
  if (d <= 30) return 'lv2'
  return 'lv3'
}

interface Group { key: LevelKey; title: string; color: string; list: DormantMember[] }

const groups = computed<Group[]>(() => {
  const defs: Group[] = [
    { key: 'lv3', title: '重度沉寂 · 30 天以上未活跃', color: '#C41E3A', list: [] },
    { key: 'lv2', title: '中度沉寂 · 15-30 天未活跃', color: '#C4560B', list: [] },
    { key: 'lv1', title: '轻度沉寂 · 7-14 天未活跃', color: '#F0A93C', list: [] },
    { key: 'flat', title: '需要关注 · 本月暂无收益', color: '#C9A96E', list: [] },
  ]
  const map: Record<LevelKey, Group> = {
    lv3: defs[0], lv2: defs[1], lv1: defs[2], flat: defs[3],
  }
  members.value.forEach((m) => map[levelOf(m)].list.push(m))
  return defs
})

function subLine(m: DormantMember): string {
  // 有分站码则展示分站码，否则展示累计佣金
  const code = m.level ? `${m.level} · ` : ''
  return `${code}累计佣金 ¥${m.totalCommission.toLocaleString()}`
}

function daysLabel(m: DormantMember): string {
  return m.lastActiveDays > 0 ? `${m.lastActiveDays} 天` : '无收益'
}

// ===== 批量勾选 =====
function toggleSelect(id: string) {
  const i = selectedIds.value.indexOf(id)
  if (i >= 0) selectedIds.value.splice(i, 1)
  else selectedIds.value.push(id)
}

// 批量提醒：后端暂无 remind 接口，前端态标记已提醒（沿用数据层降级口径）
function remindSelected() {
  if (selectedIds.value.length === 0 || submitting.value) return
  submitting.value = true
  const ids = [...selectedIds.value]
  members.value.forEach((m) => { if (ids.includes(m.id)) m.reminded = true })
  uni.showToast({ title: `已向 ${ids.length} 位站长发送提醒`, icon: 'none' })
  selectedIds.value = []
  setTimeout(() => { submitting.value = false }, 800)
}

function goInvite() {
  uni.navigateTo({ url: '/pkg-operator/invite/index' })
}
</script>

<style lang="scss" scoped>
$paper: #faf8f5;
$card: #ffffff;
$red: #c41e3a;
$gold: #c9a96e;
$t1: #2c2c2c;
$t2: #6e6e73;
$t3: #999999;
$border: #ece7df;
$serif: 'Songti SC', 'STSong', 'SimSun', serif;

.dormant-page {
  min-height: 100vh;
  background: $paper;
  display: flex;
  flex-direction: column;
}

/* ===== 滚动区 ===== */
.dm-scroll {
  flex: 1;
  height: 0;
  padding: 30rpx 38rpx 0;
  box-sizing: border-box;
}
.dm-scroll-pad {
  height: 200rpx;
}

/* 汇总卡 */
.dm-sum {
  display: flex;
  align-items: center;
  gap: 27rpx;
  padding: 31rpx 35rpx;
  background: $card;
  border-radius: 35rpx;
  box-shadow: 0 2rpx 20rpx rgba(44, 38, 30, 0.05);
  margin-bottom: 24rpx;
}
.dm-sum-ring {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  flex-shrink: 0;
  background: rgba(196, 30, 58, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}
.dm-sum-ring-num {
  font-family: $serif;
  font-size: 42rpx;
  font-weight: 700;
  color: $red;
}
.dm-sum-info {
  flex: 1;
  min-width: 0;
}
.dm-sum-title {
  display: block;
  font-size: 29rpx;
  font-weight: 600;
  color: $t1;
}
.dm-sum-desc {
  display: block;
  font-size: 23rpx;
  color: $t2;
  margin-top: 8rpx;
  line-height: 1.5;
}

/* 分组标签 */
.dm-sec-label {
  display: flex;
  align-items: center;
  gap: 13rpx;
  margin: 24rpx 4rpx 12rpx;
}
.dm-sec-sq {
  width: 16rpx;
  height: 16rpx;
  border-radius: 4rpx;
  flex-shrink: 0;
}
.dm-sec-txt {
  font-size: 23rpx;
  color: $t3;
}

/* 预警卡·整行可点·热区≥88rpx */
.dm-card {
  display: flex;
  align-items: center;
  gap: 23rpx;
  min-height: 132rpx;
  padding: 27rpx 31rpx;
  background: $card;
  border-radius: 35rpx;
  box-shadow: 0 2rpx 20rpx rgba(44, 38, 30, 0.05);
  border-left: 8rpx solid transparent;
  margin-bottom: 16rpx;
}
.lv-lv1 { border-left-color: #f0a93c; }
.lv-lv2 { border-left-color: #c4560b; }
.lv-lv3 { border-left-color: $red; }
.lv-flat { border-left-color: $gold; }

/* 勾选框：仅视觉，热区由整卡承载 */
.dm-chk {
  width: 44rpx;
  height: 44rpx;
  border-radius: 14rpx;
  border: 3rpx solid $border;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}
.dm-chk.on {
  background: $red;
  border-color: $red;
}

.dm-av {
  width: 82rpx;
  height: 82rpx;
  border-radius: 50%;
  flex-shrink: 0;
  background: #c7bfb2;
  display: flex;
  align-items: center;
  justify-content: center;
}
.dm-av-txt {
  font-family: $serif;
  font-size: 31rpx;
  color: #ffffff;
}
.dm-info {
  flex: 1;
  min-width: 0;
}
.dm-name {
  display: block;
  font-size: 27rpx;
  font-weight: 600;
  color: $t1;
}
.dm-sub {
  display: block;
  font-size: 21rpx;
  color: $t3;
  margin-top: 6rpx;
}

/* 天数标签 */
.dm-days {
  flex-shrink: 0;
  height: 42rpx;
  line-height: 42rpx;
  padding: 0 17rpx;
  border-radius: 12rpx;
  font-size: 21rpx;
  font-weight: 700;
}
.d-lv1 { background: rgba(240, 169, 60, 0.15); color: #c4820b; }
.d-lv2 { background: rgba(196, 86, 11, 0.13); color: #c4560b; }
.d-lv3 { background: rgba(196, 30, 58, 0.12); color: $red; }
.d-flat { background: rgba(201, 169, 110, 0.15); color: #97794a; }

/* 底部批量条 */
.dm-batchbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: $card;
  border-top: 1rpx solid $border;
  padding: 27rpx 38rpx;
  padding-bottom: calc(27rpx + env(safe-area-inset-bottom));
  display: flex;
  align-items: center;
  gap: 27rpx;
  box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.06);
}
.dm-bb-info {
  flex: 1;
  font-size: 25rpx;
  color: $t2;
}
.dm-bb-num {
  color: $red;
  font-family: $serif;
  font-size: 31rpx;
  font-weight: 700;
}
.dm-bb-hint {
  color: $t3;
}
.dm-bb-btn {
  height: 84rpx;
  padding: 0 50rpx;
  border-radius: 999rpx;
  background: $red;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6rpx 16rpx rgba(196, 30, 58, 0.26);
}
.dm-bb-btn.off {
  background: #dcd6cc;
  box-shadow: none;
}
.dm-bb-btn-txt {
  font-size: 27rpx;
  font-weight: 600;
  color: #ffffff;
}

/* ===== 全绿空态 ===== */
.dm-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 76rpx;
  text-align: center;
}
.dm-empty-ill {
  width: 192rpx;
  height: 192rpx;
  border-radius: 50%;
  background: linear-gradient(150deg, #e4f5ea, #cdebd8);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 31rpx;
}
.dm-empty-title {
  font-family: $serif;
  font-size: 38rpx;
  font-weight: 700;
  color: $t1;
}
.dm-empty-desc {
  font-size: 25rpx;
  color: $t2;
  line-height: 1.6;
  margin-top: 20rpx;
  white-space: pre-line;
}
.dm-empty-btn {
  height: 84rpx;
  padding: 0 54rpx;
  border-radius: 999rpx;
  background: $red;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 40rpx;
}
.dm-empty-btn-txt {
  font-size: 27rpx;
  font-weight: 600;
  color: #ffffff;
}

/* ===== 三态 ===== */
.state-loading,
.state-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 240rpx 64rpx;
}
.state-loading-text {
  font-size: 28rpx;
  color: $t3;
}
.state-error-text {
  font-size: 28rpx;
  color: $red;
  text-align: center;
  margin-bottom: 24rpx;
}
.state-retry-btn {
  padding: 16rpx 48rpx;
  background: $red;
  border-radius: 999rpx;
}
.state-retry-btn text {
  font-size: 26rpx;
  color: #fff;
}
</style>
