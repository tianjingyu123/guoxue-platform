<template>
  <view class="page">
    <view class="header">
      <text class="back-btn" @click="goBack">‹</text>
      <text class="header-title">分账管理</text>
      <text class="header-action" @click="showAdd = true">+ 添加</text>
    </view>

    <scroll-view scroll-y class="content">
      <!-- 收益概览 -->
      <view class="stats-card">
        <view class="stats-item">
          <text class="stats-num">¥{{ totalRevenue }}</text>
          <text class="stats-label">总收益</text>
        </view>
        <view class="stats-item">
          <text class="stats-num">¥{{ platformTotal }}</text>
          <text class="stats-label">平台抽成</text>
        </view>
        <view class="stats-item">
          <text class="stats-num">¥{{ ownerTotal }}</text>
          <text class="stats-label">圈主实得</text>
        </view>
      </view>

      <!-- 分账方案 -->
      <view class="section">
        <text class="section-title">嘉宾分账方案</text>
        <view v-if="splits.length === 0" class="empty">
          <text>暂无分账方案，点击右上角添加</text>
        </view>
        <view v-for="s in splits" :key="s.id" class="split-item">
          <image :src="s.guest?.avatar || '/static/default-avatar.png'" class="guest-avatar" mode="aspectFill" />
          <view class="split-info">
            <text class="guest-name">{{ s.guest?.nickname || '未知嘉宾' }}</text>
            <text class="split-scene">{{ sceneLabel(s.scene) }}</text>
          </view>
          <text class="split-rate">{{ (s.splitRate * 100).toFixed(0) }}%</text>
          <text class="delete-btn" @click="doDelete(s)">×</text>
        </view>
      </view>

      <!-- 收益记录 -->
      <view class="section">
        <text class="section-title">收益记录</text>
        <view v-for="r in records" :key="r.id" class="record-item">
          <view class="record-left">
            <text class="record-type">{{ typeLabel(r.type) }}</text>
            <text class="record-time">{{ r.createdAt?.slice(0,10) }}</text>
          </view>
          <view class="record-right">
            <text class="record-amount">¥{{ r.amount }}</text>
            <text class="record-detail">平台 ¥{{ r.platformFee }} / 圈主 ¥{{ r.ownerShare }}</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 添加分账弹窗 -->
    <view v-if="showAdd" class="modal-mask" @click="showAdd = false">
      <view class="modal" @click.stop>
        <text class="modal-title">添加嘉宾分账</text>

        <text class="field-label">选择嘉宾</text>
        <picker :value="selectedGuestIdx" :range="guestNames" @change="onGuestPick">
          <view class="picker">{{ guestNames[selectedGuestIdx] || '请选择嘉宾' }}</view>
        </picker>

        <text class="field-label">分账场景</text>
        <view class="scene-group">
          <view v-for="sc in scenes" :key="sc.value" class="scene-item"
            :class="{ active: newScene === sc.value }" @click="newScene = sc.value">
            {{ sc.label }}
          </view>
        </view>

        <text class="field-label">分账比例（{{ newRate }}%）</text>
        <view class="slider-wrap">
          <slider :value="newRate" :min="0" :max="100" @change="e => newRate = e.detail.value"
            activeColor="#C41E3A" backgroundColor="#E8E3DB" block-size="20" />
        </view>

        <view class="modal-btns">
          <button class="btn-cancel" @click="showAdd = false">取消</button>
          <button class="btn-submit" @click="doAdd">确认</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const circleId = ref('')
const splits = ref<any[]>([])
const records = ref<any[]>([])
const guests = ref<any[]>([])
const showAdd = ref(false)
const newScene = ref('ALL')
const newRate = ref(30)

const scenes = [
  { value: 'ALL', label: '全部' },
  { value: 'COURSE', label: '课程' },
  { value: 'QUESTION', label: '问答' },
  { value: 'LIVE', label: '直播' },
  { value: 'BOT', label: '机器人' },
]
const selectedGuestIdx = ref(0)
const guestNames = computed(() => guests.value.map(g => g.nickname || g.id))

const totalRevenue = computed(() => records.value.reduce((s, r) => s + +r.amount, 0).toFixed(2))
const platformTotal = computed(() => records.value.reduce((s, r) => s + +r.platformFee, 0).toFixed(2))
const ownerTotal = computed(() => records.value.reduce((s, r) => s + +r.ownerShare, 0).toFixed(2))

function sceneLabel(s: string) { return scenes.find(sc => sc.value === s)?.label || s }
function typeLabel(t: string) { const m: Record<string,string> = { gift:'礼物',circle_join:'入圈',course:'课程',product:'商品',knowledge_revenue:'知识付费' }; return m[t]||t }

onMounted(async () => {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  circleId.value = page?.options?.circleId || ''
  await Promise.all([fetchSplits(), fetchRecords(), fetchGuests()])
})

async function fetchSplits() {
  try {
    const res = await uni.request({ url: `/api/v1/circles/${circleId.value}/revenue-splits`, method: 'GET',
      header: { Authorization: `Bearer ${uni.getStorageSync('token')}` } })
    splits.value = (res.data as any)?.data || []
  } catch { }
}

async function fetchRecords() {
  try {
    const res = await uni.request({ url: `/api/v1/circles/${circleId.value}/revenue-records`, method: 'GET',
      header: { Authorization: `Bearer ${uni.getStorageSync('token')}` } })
    records.value = (res.data as any)?.data || []
  } catch { }
}

async function fetchGuests() {
  try {
    const res = await uni.request({ url: `/api/v1/circles/${circleId.value}/members?role=guest`, method: 'GET',
      header: { Authorization: `Bearer ${uni.getStorageSync('token')}` } })
    guests.value = (res.data as any)?.data || (res.data as any)?.list || []
  } catch { }
}

function onGuestPick(e: any) { selectedGuestIdx.value = e.detail.value }

async function doAdd() {
  const guest = guests.value[selectedGuestIdx.value]
  if (!guest) return
  try {
    await uni.request({
      url: `/api/v1/circles/${circleId.value}/revenue-splits`,
      method: 'POST',
      data: { guestId: guest.userId || guest.id, scene: newScene.value, splitRate: newRate.value / 100 },
      header: { 'Content-Type': 'application/json', Authorization: `Bearer ${uni.getStorageSync('token')}` },
    })
    uni.showToast({ title: '已添加', icon: 'success' })
    showAdd.value = false
    fetchSplits()
  } catch { uni.showToast({ title: '操作失败', icon: 'none' }) }
}

async function doDelete(s: any) {
  try {
    await uni.request({ url: `/api/v1/circles/${circleId.value}/revenue-splits/${s.id}`, method: 'DELETE',
      header: { Authorization: `Bearer ${uni.getStorageSync('token')}` } })
    splits.value = splits.value.filter(x => x.id !== s.id)
    uni.showToast({ title: '已删除', icon: 'success' })
  } catch { uni.showToast({ title: '操作失败', icon: 'none' }) }
}

function goBack() { uni.navigateBack() }
</script>

<style scoped>
.page { min-height:100vh; background:#F5F0E8; }
.header { display:flex; align-items:center; justify-content:space-between; padding:20rpx 24rpx; background:#fff; border-bottom:1rpx solid #E5E1DB; }
.back-btn { font-size:48rpx; color:#2C2C2C; }
.header-title { font-size:32rpx; font-weight:600; }
.header-action { font-size:28rpx; color:#C41E3A; }
.content { padding:20rpx; padding-bottom:60rpx; }

.stats-card { background:linear-gradient(135deg,#C41E3A,#8B0000); border-radius:16rpx; padding:24rpx; display:flex; justify-content:space-around; margin-bottom:20rpx; }
.stats-item { text-align:center; }
.stats-num { font-size:36rpx; font-weight:700; color:#fff; display:block; }
.stats-label { font-size:22rpx; color:rgba(255,255,255,.7); margin-top:4rpx; display:block; }

.section { background:#fff; border-radius:16rpx; padding:20rpx; margin-bottom:16rpx; }
.section-title { font-size:28rpx; font-weight:600; margin-bottom:16rpx; display:block; }

.split-item { display:flex; align-items:center; gap:16rpx; padding:16rpx 0; border-bottom:1rpx solid #F0EBE0; }
.guest-avatar { width:72rpx; height:72rpx; border-radius:36rpx; background:#EEE; }
.split-info { flex:1; }
.guest-name { font-size:28rpx; font-weight:500; display:block; }
.split-scene { font-size:22rpx; color:#999; }
.split-rate { font-size:32rpx; font-weight:700; color:#C41E3A; }
.delete-btn { font-size:40rpx; color:#CCC; padding:8rpx; }

.record-item { display:flex; justify-content:space-between; padding:14rpx 0; border-bottom:1rpx solid #F0EBE0; }
.record-type { font-size:26rpx; display:block; }
.record-time { font-size:20rpx; color:#CCC; }
.record-amount { font-size:28rpx; font-weight:600; color:#2C2C2C; text-align:right; display:block; }
.record-detail { font-size:20rpx; color:#999; }

.modal-mask { position:fixed; inset:0; background:rgba(0,0,0,.4); z-index:100; display:flex; align-items:flex-end; }
.modal { background:#fff; width:100%; border-radius:24rpx 24rpx 0 0; padding:32rpx 24rpx 48rpx; }
.modal-title { font-size:32rpx; font-weight:600; display:block; margin-bottom:24rpx; }
.field-label { font-size:26rpx; color:#666; margin-top:16rpx; margin-bottom:8rpx; display:block; }
.picker { height:80rpx; background:#F5F1EB; border-radius:10rpx; line-height:80rpx; padding:0 16rpx; font-size:28rpx; }
.scene-group { display:flex; flex-wrap:wrap; gap:12rpx; }
.scene-item { padding:12rpx 24rpx; background:#F5F1EB; border-radius:20rpx; font-size:24rpx; }
.scene-item.active { background:#C41E3A; color:#fff; }
.slider-wrap { padding:0 8rpx; margin:8rpx 0; }
.modal-btns { display:flex; gap:16rpx; margin-top:24rpx; }
.btn-cancel { flex:1; height:80rpx; background:#F5F1EB; border:none; border-radius:12rpx; font-size:28rpx; }
.btn-submit { flex:1; height:80rpx; background:#C41E3A; color:#fff; border:none; border-radius:12rpx; font-size:28rpx; }
.empty { text-align:center; color:#999; font-size:26rpx; padding:40rpx; }
</style>
