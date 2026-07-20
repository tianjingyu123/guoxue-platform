<template>
  <view v-if="loading" class="q-page">
    <view class="q-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="q-nav-inner"><view class="q-nav-btn" @tap="goBack"><app-icon name="arrow-left" :size="44" color="#FFFFFF" /></view><text class="q-nav-title">名额管理</text><view class="q-nav-btn" /></view>
    </view>
    <view class="q-state"><view class="q-spinner" /><text class="q-state-txt">加载中...</text></view>
  </view>

  <view v-else-if="error" class="q-page">
    <view class="q-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="q-nav-inner"><view class="q-nav-btn" @tap="goBack"><app-icon name="arrow-left" :size="44" color="#FFFFFF" /></view><text class="q-nav-title">名额管理</text><view class="q-nav-btn" /></view>
    </view>
    <view class="q-state"><app-icon name="alert-circle" :size="96" color="#D8D2C8" /><text class="q-state-txt">{{ error }}</text><view class="q-state-btn" @tap="retry"><text class="q-state-btn-txt">重新加载</text></view></view>
  </view>

  <view v-else class="q-page">
    <view class="q-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="q-nav-inner"><view class="q-nav-btn" @tap="goBack"><app-icon name="arrow-left" :size="44" color="#FFFFFF" /></view><text class="q-nav-title">名额管理</text><view class="q-nav-btn" /></view>
    </view>

    <scroll-view scroll-y class="q-scroll">
      <view class="q-card">
        <view class="q-ring-wrap">
          <view class="q-ring" :style="{ background: ringGradient }">
            <view class="q-ring-inner"><text class="q-ring-n">{{ data.total }}</text><text class="q-ring-l">总名额</text></view>
          </view>
          <view class="q-legend-list">
            <view class="q-lg"><view class="q-dot" style="background:#C9A96E;" /><text class="q-lg-name">已占用</text><text class="q-lg-val">{{ data.used }}</text></view>
            <view class="q-lg"><view class="q-dot" style="background:#E8E2D8;" /><text class="q-lg-name">可邀请</text><text class="q-lg-val">{{ data.available }}</text></view>
          </view>
        </view>
      </view>

      <view class="q-rule-note">
        <app-icon name="info" :size="30" color="#97794a" />
        <text class="q-rule-txt">名额用于建立真实团队归属：1 个用于自有分站，其余用于邀请站长。被邀请人通过专属链接完成开站后自动占用 1 个名额；名额不可私下出售、转让或加购。</text>
      </view>

      <view class="q-btn-primary" :class="{ dis: data.available === 0 }" @tap="goInvite">
        <app-icon name="user-plus" :size="34" color="#FFFFFF" />
        <text class="q-btn-primary-txt">{{ data.available > 0 ? '邀请站长' : '名额已用完' }}</text>
      </view>

      <view class="q-card">
        <text class="q-card-title">名额占用记录（{{ records.length }}）</text>
        <view v-if="records.length > 0">
          <view v-for="r in records" :key="r.id" class="q-alloc">
            <view class="q-al-av" :style="{ background: avatarBg() }"><text class="q-al-av-txt">{{ avatarChar(r.name) }}</text></view>
            <view class="q-al-info"><text class="q-al-name">{{ r.name }}</text><text class="q-al-sub">{{ r.date }} · 邀请加入</text></view>
            <text class="q-al-tag tag-sold">{{ r.status }}</text>
          </view>
        </view>
        <view v-else class="q-empty">
          <app-icon name="inbox" :size="72" color="#D8D2C8" />
          <text class="q-empty-txt">尚无名额占用记录</text>
          <text class="q-empty-sub">通过专属邀请链接加入后会自动记录</text>
        </view>
      </view>
      <view style="height:48rpx" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { operatorApi, type QuotaRecord } from '@/pkg-operator/lib/operator-data'
import { navigateTo } from '@/utils/router'

const statusBarHeight = ref(20)
try { statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight || 20 } catch {}
const loading = ref(true)
const error = ref('')
const data = ref({ total: 0, used: 0, available: 0 })
const records = ref<QuotaRecord[]>([])
const ringGradient = computed(() => {
  const total = data.value.total || 1
  const usedPct = Math.min(100, (data.value.used / total) * 100)
  return `conic-gradient(#C9A96E 0% ${usedPct}%, #E8E2D8 ${usedPct}% 100%)`
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [d, r] = await Promise.all([operatorApi.getQuotaData(), operatorApi.getQuotaRecords()])
    data.value = d
    records.value = r
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally { loading.value = false }
}
onMounted(load)
function retry() { load() }
function goBack() { uni.navigateBack({ delta: 1, fail: () => uni.switchTab({ url: '/pages/index/index', fail: () => {} }) }) }
function goInvite() {
  if (data.value.available <= 0) { uni.showToast({ title: '暂无可邀请名额', icon: 'none' }); return }
  navigateTo('/pkg-operator/invite/index')
}
function avatarChar(name: string) { return name ? name.charAt(0) : '·' }
function avatarBg() { return 'linear-gradient(135deg,#C9A96E,#B08D4A)' }
</script>

<style scoped>
/* ===== token ===== */
.q-page { min-height: 100vh; background: #FAF8F5; display: flex; flex-direction: column; }

/* 自定义导航（朱红渐变） */
.q-nav { background: linear-gradient(135deg, #A01828, #C41E3A); }
.q-nav-inner { height: 88rpx; display: flex; align-items: center; padding: 0 38rpx; }
.q-nav-btn { width: 88rpx; height: 88rpx; display: flex; align-items: center; justify-content: center; }
.q-nav-title { flex: 1; text-align: center; font-size: 34rpx; font-weight: 600; color: #FFFFFF; font-family: 'Songti SC', serif; }

.q-scroll { flex: 1; padding: 34rpx 38rpx 60rpx; }

/* 卡片 */
.q-card { background: #FFFFFF; border-radius: 35rpx; padding: 38rpx 34rpx; box-shadow: 0 2rpx 20rpx rgba(44,38,30,0.05); margin-bottom: 30rpx; }

/* 环形图 */
.q-ring-wrap { display: flex; align-items: center; gap: 42rpx; }
.q-ring { width: 230rpx; height: 230rpx; border-radius: 50%; flex-shrink: 0; position: relative; }
.q-ring-inner { position: absolute; inset: 35rpx; background: #FFFFFF; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.q-ring-n { font-family: 'Songti SC', serif; font-size: 58rpx; font-weight: 700; color: #2C2C2C; line-height: 1; }
.q-ring-l { font-size: 20rpx; color: #999999; margin-top: 6rpx; }
.q-legend-list { flex: 1; display: flex; flex-direction: column; gap: 22rpx; }
.q-lg { display: flex; align-items: center; gap: 18rpx; }
.q-dot { width: 20rpx; height: 20rpx; border-radius: 6rpx; flex-shrink: 0; }
.q-lg-name { flex: 1; font-size: 26rpx; color: #6E6E73; }
.q-lg-val { font-family: 'Songti SC', serif; font-size: 30rpx; font-weight: 700; color: #2C2C2C; }

/* 规则提示 */
.q-rule-note { display: flex; align-items: flex-start; gap: 18rpx; background: #FBF6EE; border: 1rpx solid #EEE2CC; border-radius: 24rpx; padding: 24rpx 28rpx; margin-bottom: 30rpx; }
.q-rule-txt { flex: 1; font-size: 24rpx; color: #97794a; line-height: 1.6; }

/* 主按钮 */
.q-btn-primary { height: 96rpx; display: flex; align-items: center; justify-content: center; gap: 12rpx; background: linear-gradient(135deg, #A01828, #C41E3A); border-radius: 99rpx; box-shadow: 0 8rpx 20rpx rgba(196,30,58,0.26); margin-bottom: 30rpx; }
.q-btn-primary.dis { opacity: 0.45; box-shadow: none; }
.q-btn-primary-txt { font-size: 32rpx; font-weight: 600; color: #FFFFFF; }

/* 已分配列表 */
.q-card-title { display: block; font-size: 30rpx; font-weight: 600; color: #2C2C2C; margin-bottom: 22rpx; }
.q-alloc { display: flex; align-items: center; gap: 22rpx; padding: 22rpx 0; border-bottom: 1rpx solid #F4F0E9; }
.q-alloc:last-child { border-bottom: none; padding-bottom: 0; }
.q-al-av { width: 68rpx; height: 68rpx; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.q-al-av-txt { font-family: 'Songti SC', serif; font-size: 26rpx; color: #FFFFFF; }
.q-al-info { flex: 1; min-width: 0; }
.q-al-name { display: block; font-size: 26rpx; font-weight: 600; color: #2C2C2C; }
.q-al-sub { display: block; font-size: 22rpx; color: #999999; margin-top: 4rpx; }
.q-al-tag { font-size: 22rpx; font-weight: 600; padding: 6rpx 18rpx; border-radius: 12rpx; }
.tag-sold { background: rgba(196,30,58,0.1); color: #C41E3A; }


/* 空态 */
.q-empty { display: flex; flex-direction: column; align-items: center; padding: 40rpx 0 20rpx; }
.q-empty-txt { font-size: 26rpx; color: #6E6E73; margin-top: 16rpx; }
.q-empty-sub { font-size: 22rpx; color: #999999; margin-top: 8rpx; }

/* 三态 */
.q-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 120rpx 38rpx; }
.q-spinner { width: 64rpx; height: 64rpx; border: 6rpx solid #EFEAE2; border-top-color: #C41E3A; border-radius: 50%; animation: q-spin 0.8s linear infinite; }
@keyframes q-spin { to { transform: rotate(360deg); } }
.q-state-txt { font-size: 28rpx; color: #6E6E73; margin-top: 24rpx; text-align: center; }
.q-state-btn { margin-top: 32rpx; padding: 20rpx 60rpx; background: #C41E3A; border-radius: 99rpx; }
.q-state-btn-txt { font-size: 28rpx; color: #FFFFFF; }
</style>
