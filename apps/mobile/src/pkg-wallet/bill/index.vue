<template>
  <view class="page">
    <!-- 顶部红色渐变导航 -->
    <view class="topbar" :style="{ paddingTop: statusBar + 'px' }">
      <view class="topbar-inner">
        <view class="tb-btn" @tap="goBack">
          <app-icon name="chevron-left" :size="44" color="#FFFFFF" />
        </view>
        <text class="tb-title">账单详情</text>
        <view class="tb-btn" @tap="exportBill">
          <app-icon name="download" :size="36" color="#FFFFFF" />
        </view>
      </view>
    </view>

    <!-- 周期选择 -->
    <view class="period-bar">
      <view class="seg">
        <text class="seg-item" :class="{ active: viewType === 'month' }" @tap="viewType = 'month'">月账单</text>
        <text class="seg-item" :class="{ active: viewType === 'year' }" @tap="viewType = 'year'">年账单</text>
      </view>
      <view class="period-nav">
        <view class="pn-btn" @tap="prevPeriod"><app-icon name="chevron-left" :size="36" color="#666666" /></view>
        <text class="pn-label">{{ periodLabel }}</text>
        <view class="pn-btn" @tap="nextPeriod"><app-icon name="chevron-right" :size="36" color="#666666" /></view>
      </view>
    </view>

    <scroll-view scroll-y class="scroll">
      <!-- 收支概览 -->
      <view class="overview-card">
        <view class="ring-wrap">
          <view class="ring" :style="ringStyle">
            <view class="ring-hole">
              <text class="ring-label">结余</text>
              <text class="ring-val" :class="{ neg: balance < 0 }">{{ balance >= 0 ? '+' : '' }}{{ balance }}</text>
            </view>
          </view>
        </view>
        <view class="ov-data">
          <view class="ov-row">
            <view class="ov-left"><view class="dot income" /><text class="ov-name">收入</text></view>
            <text class="ov-amt income">+{{ totalIncome.toFixed(2) }}</text>
          </view>
          <view class="ov-row">
            <view class="ov-left"><view class="dot expense" /><text class="ov-name">支出</text></view>
            <text class="ov-amt expense">-{{ totalExpense.toFixed(2) }}</text>
          </view>
        </view>
      </view>

      <!-- 支出分类 -->
      <view class="cat-card">
        <view class="cat-head"><text class="cat-head-title">支出分类</text></view>
        <view
          v-for="(cat, i) in expenseCategories"
          :key="cat.category"
          class="cat-item"
          :class="{ noborder: i === expenseCategories.length - 1 }"
        >
          <view class="cat-row" @tap="toggle(cat.category)">
            <view class="cat-left">
              <view class="cat-icon" :style="{ background: cat.color + '22', color: cat.color }">
                <app-icon :name="cat.icon" :size="32" :color="cat.color" />
              </view>
              <view>
                <text class="cat-name">{{ cat.name }}</text>
                <text class="cat-count">{{ cat.count }}笔交易</text>
              </view>
            </view>
            <view class="cat-right">
              <view class="cat-amt-box">
                <text class="cat-amt">-{{ cat.amount.toFixed(2) }}</text>
                <text class="cat-percent">占比{{ cat.percent }}%</text>
              </view>
              <app-icon :name="expanded.includes(cat.category) ? 'chevron-up' : 'chevron-down'" :size="28" color="#999999" />
            </view>
          </view>
          <view v-if="expanded.includes(cat.category)" class="sub-list">
            <view
              v-for="(it, idx) in cat.items"
              :key="it.id"
              class="sub-item"
              :class="{ noborder: idx === cat.items.length - 1 }"
            >
              <view>
                <text class="sub-title">{{ it.title }}</text>
                <text class="sub-time">{{ it.createdAt }}</text>
              </view>
              <text class="sub-amt">-{{ it.amount.toFixed(2) }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 收入分类 -->
      <view class="cat-card">
        <view class="cat-head"><text class="cat-head-title">收入分类</text></view>
        <view
          v-for="(cat, i) in incomeCategories"
          :key="cat.category"
          class="cat-item"
          :class="{ noborder: i === incomeCategories.length - 1 }"
        >
          <view class="cat-row" @tap="toggle(cat.category)">
            <view class="cat-left">
              <view class="cat-icon" :style="{ background: cat.color + '22', color: cat.color }">
                <app-icon :name="cat.icon" :size="32" :color="cat.color" />
              </view>
              <view>
                <text class="cat-name">{{ cat.name }}</text>
                <text class="cat-count">{{ cat.count }}笔交易</text>
              </view>
            </view>
            <view class="cat-right">
              <view class="cat-amt-box">
                <text class="cat-amt income">+{{ cat.amount.toFixed(2) }}</text>
                <text class="cat-percent">占比{{ cat.percent }}%</text>
              </view>
              <app-icon :name="expanded.includes(cat.category) ? 'chevron-up' : 'chevron-down'" :size="28" color="#999999" />
            </view>
          </view>
          <view v-if="expanded.includes(cat.category)" class="sub-list">
            <view
              v-for="(it, idx) in cat.items"
              :key="it.id"
              class="sub-item"
              :class="{ noborder: idx === cat.items.length - 1 }"
            >
              <view>
                <text class="sub-title">{{ it.title }}</text>
                <text class="sub-time">{{ it.createdAt }}</text>
              </view>
              <text class="sub-amt income">+{{ it.amount.toFixed(2) }}</text>
            </view>
          </view>
        </view>
      </view>

      <view style="height: 160rpx" />
    </scroll-view>

    <!-- 底部导出按钮 -->
    <view class="footer">
      <view class="export-btn" @tap="exportBill">
        <app-icon name="download" :size="36" color="#FFFFFF" />
        <text class="export-txt">导出账单PDF</text>
      </view>
    </view>
  </view>

  </view>
  </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface BillItem { id: string; title: string; amount: number; createdAt: string }
interface BillCategory { category: string; name: string; icon: string; color: string; amount: number; percent: number; type: 'income' | 'expense'; count: number; items: BillItem[] }

const statusBar = ref(0)
try {
  const info = uni.getSystemInfoSync()
  statusBar.value = info.statusBarHeight || 0
} catch (e) {}

const viewType = ref<'month' | 'year'>('month')
const cur = ref(new Date(2024, 0, 1))
const expanded = ref<string[]>(['course'])

const totalIncome = 2580
const totalExpense = 1890
const balance = computed(() => totalIncome - totalExpense)

const categories = ref<BillCategory[]>([
  { category: 'course', name: '课程学习', icon: 'book-open', color: '#C41E3A', amount: 680, percent: 36, type: 'expense', count: 3, items: [
    { id: '1', title: '周易六十四卦详解', amount: 298, createdAt: '2024-01-15 14:30' },
    { id: '2', title: '紫微斗数入门到精通', amount: 198, createdAt: '2024-01-12 10:20' },
    { id: '3', title: '奇门遁甲实战课程', amount: 184, createdAt: '2024-01-08 16:45' },
  ] },
  { category: 'shopping', name: '商品购物', icon: 'shopping-bag', color: '#E85D04', amount: 520, percent: 28, type: 'expense', count: 2, items: [
    { id: '4', title: '罗盘专业版', amount: 320, createdAt: '2024-01-20 09:15' },
    { id: '5', title: '风水入门书籍套装', amount: 200, createdAt: '2024-01-05 11:30' },
  ] },
  { category: 'group', name: '拼团活动', icon: 'users', color: '#2196F3', amount: 380, percent: 20, type: 'expense', count: 2, items: [
    { id: '6', title: '八字命理精讲(拼团)', amount: 199, createdAt: '2024-01-18 20:00' },
    { id: '7', title: '梅花易数入门(拼团)', amount: 181, createdAt: '2024-01-10 15:30' },
  ] },
  { category: 'recharge', name: '充值', icon: 'credit-card', color: '#4CAF50', amount: 2000, percent: 78, type: 'income', count: 2, items: [
    { id: '8', title: '学习币充值', amount: 1000, createdAt: '2024-01-01 10:00' },
    { id: '9', title: '学习币充值', amount: 1000, createdAt: '2024-01-15 10:00' },
  ] },
  { category: 'reward', name: '奖励收入', icon: 'gift', color: '#C9A96E', amount: 580, percent: 22, type: 'income', count: 5, items: [
    { id: '10', title: '邀请好友奖励', amount: 200, createdAt: '2024-01-22 12:00' },
    { id: '11', title: '签到奖励', amount: 100, createdAt: '2024-01-20 08:00' },
    { id: '12', title: '创作收益', amount: 280, createdAt: '2024-01-18 16:00' },
  ] },
])

const expenseCategories = computed(() => categories.value.filter((c) => c.type === 'expense'))
const incomeCategories = computed(() => categories.value.filter((c) => c.type === 'income'))

const incomePercent = computed(() => {
  const total = totalIncome + totalExpense
  return total > 0 ? (totalIncome / total) * 100 : 50
})

const ringStyle = computed(() => {
  const deg = incomePercent.value * 3.6
  return { background: `conic-gradient(#4CAF50 0deg ${deg}deg, #C41E3A ${deg}deg 360deg)` }
})

const periodLabel = computed(() =>
  viewType.value === 'month'
    ? `${cur.value.getFullYear()}年${cur.value.getMonth() + 1}月`
    : `${cur.value.getFullYear()}年`,
)

function prevPeriod() {
  const d = new Date(cur.value)
  if (viewType.value === 'month') d.setMonth(d.getMonth() - 1)
  else d.setFullYear(d.getFullYear() - 1)
  cur.value = d
}

function nextPeriod() {
  const d = new Date(cur.value)
  if (viewType.value === 'month') d.setMonth(d.getMonth() + 1)
  else d.setFullYear(d.getFullYear() + 1)
  if (d <= new Date()) cur.value = d
}

function toggle(cat: string) {
  const i = expanded.value.indexOf(cat)
  if (i >= 0) expanded.value.splice(i, 1)
  else expanded.value.push(cat)
}

function exportBill() {
  uni.showToast({ title: '账单导出成功', icon: 'none' })
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
.page { min-height: 100vh; background: #FAF8F5; display: flex; flex-direction: column; }

.topbar { background: linear-gradient(90deg, #C41E3A 0%, #A01830 100%); }
.topbar-inner { height: 88rpx; display: flex; align-items: center; justify-content: space-between; padding: 0 16rpx; }
.tb-btn { width: 64rpx; height: 64rpx; display: flex; align-items: center; justify-content: center; }
.tb-title { font-size: 32rpx; font-weight: 600; color: #FFFFFF; }

.period-bar { background: #FFFFFF; padding: 20rpx 32rpx; border-bottom: 1rpx solid #E8E3DB; display: flex; align-items: center; justify-content: space-between; }
.seg { display: flex; gap: 16rpx; }
.seg-item { font-size: 26rpx; color: #666666; background: #FAF8F5; padding: 10rpx 28rpx; border-radius: 999rpx; }
.seg-item.active { background: #C41E3A; color: #FFFFFF; }
.period-nav { display: flex; align-items: center; gap: 12rpx; }
.pn-btn { width: 48rpx; height: 48rpx; display: flex; align-items: center; justify-content: center; }
.pn-label { font-size: 28rpx; font-weight: 500; color: #2C2C2C; min-width: 160rpx; text-align: center; }

.scroll { flex: 1; }

.overview-card { margin: 32rpx; background: #FFFFFF; border-radius: 24rpx; padding: 48rpx 40rpx; display: flex; align-items: center; gap: 48rpx; box-shadow: 0 2rpx 16rpx rgba(0,0,0,0.04); }
.ring-wrap { flex-shrink: 0; }
.ring { width: 200rpx; height: 200rpx; border-radius: 999rpx; display: flex; align-items: center; justify-content: center; }
.ring-hole { width: 140rpx; height: 140rpx; background: #FFFFFF; border-radius: 999rpx; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.ring-label { font-size: 22rpx; color: #999999; }
.ring-val { font-size: 34rpx; font-weight: 700; color: #4CAF50; }
.ring-val.neg { color: #C41E3A; }
.ov-data { flex: 1; display: flex; flex-direction: column; gap: 32rpx; }
.ov-row { display: flex; align-items: center; justify-content: space-between; }
.ov-left { display: flex; align-items: center; gap: 12rpx; }
.dot { width: 20rpx; height: 20rpx; border-radius: 999rpx; }
.dot.income { background: #4CAF50; }
.dot.expense { background: #C41E3A; }
.ov-name { font-size: 26rpx; color: #666666; }
.ov-amt { font-size: 30rpx; font-weight: 600; }
.ov-amt.income { color: #4CAF50; }
.ov-amt.expense { color: #C41E3A; }

.cat-card { margin: 0 32rpx 32rpx; background: #FFFFFF; border-radius: 24rpx; overflow: hidden; box-shadow: 0 2rpx 16rpx rgba(0,0,0,0.04); }
.cat-head { padding: 24rpx 32rpx; border-bottom: 1rpx solid #E8E3DB; }
.cat-head-title { font-size: 30rpx; font-weight: 600; color: #2C2C2C; }
.cat-item { border-bottom: 1rpx solid #E8E3DB; }
.cat-item.noborder { border-bottom: none; }
.cat-row { padding: 24rpx 32rpx; display: flex; align-items: center; justify-content: space-between; }
.cat-left { display: flex; align-items: center; gap: 24rpx; }
.cat-icon { width: 72rpx; height: 72rpx; border-radius: 999rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.cat-name { font-size: 28rpx; font-weight: 500; color: #2C2C2C; display: block; }
.cat-count { font-size: 22rpx; color: #999999; display: block; margin-top: 4rpx; }
.cat-right { display: flex; align-items: center; gap: 12rpx; }
.cat-amt-box { text-align: right; }
.cat-amt { font-size: 28rpx; font-weight: 600; color: #2C2C2C; display: block; }
.cat-amt.income { color: #4CAF50; }
.cat-percent { font-size: 22rpx; color: #999999; display: block; margin-top: 4rpx; }
.sub-list { background: #FAF8F5; padding: 8rpx 32rpx; }
.sub-item { padding: 20rpx 0; display: flex; align-items: center; justify-content: space-between; border-bottom: 1rpx solid #E8E3DB; }
.sub-item.noborder { border-bottom: none; }
.sub-title { font-size: 26rpx; color: #2C2C2C; display: block; }
.sub-time { font-size: 22rpx; color: #999999; display: block; margin-top: 4rpx; }
.sub-amt { font-size: 26rpx; font-weight: 500; color: #2C2C2C; }
.sub-amt.income { color: #4CAF50; }

.footer { background: #FFFFFF; border-top: 1rpx solid #E8E3DB; padding: 24rpx 32rpx calc(24rpx + env(safe-area-inset-bottom)); }
.export-btn { height: 96rpx; background: #C41E3A; border-radius: 20rpx; display: flex; align-items: center; justify-content: center; gap: 12rpx; }
.export-txt { font-size: 30rpx; font-weight: 600; color: #FFFFFF; }
</style>
