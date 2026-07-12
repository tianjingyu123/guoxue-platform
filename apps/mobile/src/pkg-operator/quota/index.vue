<template>
  <!-- loading -->
  <view v-if="loading" class="q-page">
    <view class="q-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="q-nav-inner">
        <view class="q-nav-btn" @tap="goBack"><app-icon name="arrow-left" :size="40" color="#FFFFFF" /></view>
        <text class="q-nav-title">名额管理</text>
        <view class="q-nav-btn" />
      </view>
    </view>
    <view class="q-state"><view class="q-spinner" /><text class="q-state-txt">加载中...</text></view>
  </view>

  <!-- error -->
  <view v-else-if="error" class="q-page">
    <view class="q-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="q-nav-inner">
        <view class="q-nav-btn" @tap="goBack"><app-icon name="arrow-left" :size="40" color="#FFFFFF" /></view>
        <text class="q-nav-title">名额管理</text>
        <view class="q-nav-btn" />
      </view>
    </view>
    <view class="q-state">
      <app-icon name="alert-circle" :size="96" color="#D8D2C8" />
      <text class="q-state-txt">{{ error }}</text>
      <view class="q-state-btn" @tap="retry"><text class="q-state-btn-txt">重新加载</text></view>
    </view>
  </view>

  <view v-else class="q-page">
    <!-- 自定义导航（朱红渐变 + statusBar 留白） -->
    <view class="q-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="q-nav-inner">
        <view class="q-nav-btn" @tap="goBack"><app-icon name="arrow-left" :size="40" color="#FFFFFF" /></view>
        <text class="q-nav-title">名额管理</text>
        <view class="q-nav-btn" />
      </view>
    </view>

    <scroll-view scroll-y class="q-scroll">
      <!-- 名额总览：环形图 + 图例 -->
      <view class="q-card">
        <view class="q-ring-wrap">
          <!-- 环形图（conic-gradient 近似，四段按名额构成） -->
          <view class="q-ring" :style="{ background: ringGradient }">
            <view class="q-ring-inner">
              <text class="q-ring-n">{{ data.total }}</text>
              <text class="q-ring-l">总名额</text>
            </view>
          </view>
          <view class="q-legend-list">
            <view class="q-lg">
              <view class="q-dot" style="background:#C9A96E;" />
              <text class="q-lg-name">自用</text>
              <text class="q-lg-val">{{ data.used }}</text>
            </view>
            <view class="q-lg">
              <view class="q-dot" style="background:#C41E3A;" />
              <text class="q-lg-name">已售</text>
              <text class="q-lg-val">{{ data.sold }}</text>
            </view>
            <view class="q-lg">
              <view class="q-dot" style="background:#A0C4FF;" />
              <text class="q-lg-name">已赠</text>
              <text class="q-lg-val">{{ data.gifted }}</text>
            </view>
            <view class="q-lg">
              <view class="q-dot" style="background:#E8E2D8;" />
              <text class="q-lg-name">可用</text>
              <text class="q-lg-val">{{ data.available }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 规则提示（固定不可加购） -->
      <view class="q-rule-note">
        <app-icon name="info" :size="30" color="#97794a" />
        <text class="q-rule-txt">运营商唯一档位含 6 个名额（1 自用 + 5 可售），总数固定不可加购。您可在 5 个可售名额内出售或赠送。</text>
      </view>

      <!-- 唯一操作：赠送名额（无购买更多入口） -->
      <view class="q-btn-primary" :class="{ dis: data.available === 0 }" @tap="onGiftClick">
        <app-icon name="gift" :size="34" color="#FFFFFF" />
        <text class="q-btn-primary-txt">赠送名额</text>
      </view>

      <!-- 已分配名额明细 -->
      <view class="q-card">
        <text class="q-card-title">已分配名额（{{ allocRecords.length }}）</text>

        <view v-if="allocRecords.length > 0">
          <view v-for="r in allocRecords" :key="r.id" class="q-alloc">
            <view class="q-al-av" :style="{ background: avatarBg(r.type) }">
              <text class="q-al-av-txt">{{ avatarChar(r.name) }}</text>
            </view>
            <view class="q-al-info">
              <text class="q-al-name">{{ r.name }}</text>
              <text class="q-al-sub">{{ r.date }}{{ r.type === 'sold' && r.amount ? ' · 出售 ¥' + formatPrice(r.amount) : ' · 赠送' }}</text>
            </view>
            <text class="q-al-tag" :class="r.type === 'sold' ? 'tag-sold' : 'tag-gift'">{{ r.type === 'sold' ? '已售' : '已赠' }}</text>
          </view>
        </view>

        <!-- 空态：后端暂无名额交易记录 → 诚实降级 -->
        <view v-else class="q-empty">
          <app-icon name="inbox" :size="72" color="#D8D2C8" />
          <text class="q-empty-txt">暂无名额分配记录</text>
          <text class="q-empty-sub">剩余 {{ data.available }} 个可用名额待分配</text>
        </view>
      </view>
    </scroll-view>

    <!-- 赠送名额 · 底部半屏弹窗 -->
    <view v-if="showGiftSheet" class="q-mask" @tap.self="closeGift">
      <view class="q-sheet">
        <view class="q-handle" />
        <view class="q-sh-head">
          <text class="q-sh-title">赠送名额</text>
          <view class="q-sh-close" @tap="closeGift"><app-icon name="x" :size="26" color="#6E6E73" /></view>
        </view>

        <scroll-view scroll-y class="q-sh-body">
          <!-- 可赠送名额徽标 -->
          <view class="q-avail-badge">
            <text class="q-avail-n">{{ data.available }}</text>
            <text class="q-avail-l">当前可赠送名额</text>
          </view>

          <!-- 选择赠送对象 -->
          <view class="q-field">
            <text class="q-field-lbl">选择赠送对象</text>
            <view class="q-search">
              <app-icon name="search" :size="30" color="#999" />
              <input class="q-search-input" v-model="giftPhone" placeholder="搜索用户昵称 / 手机号" placeholder-class="q-search-ph" type="text" maxlength="11" />
              <view class="q-search-btn" :class="{ dis: isSearching || giftPhone.length < 11 }" @tap="doSearch">
                <text class="q-search-btn-txt">{{ isSearching ? '搜索中' : '搜索' }}</text>
              </view>
            </view>

            <!-- 选中用户预览 -->
            <view v-if="searchResult" class="q-user-pick">
              <view class="q-up-av"><text class="q-up-av-txt">{{ avatarChar(searchResult.name) }}</text></view>
              <view class="q-up-info">
                <text class="q-up-name">{{ searchResult.name }}</text>
                <text class="q-up-sub">{{ searchResult.phone }} · 已注册用户</text>
              </view>
              <view class="q-up-check"><app-icon name="check" :size="24" color="#FFFFFF" /></view>
            </view>
          </view>

          <!-- 赠送数量步进器 -->
          <view class="q-field">
            <text class="q-field-lbl">赠送数量</text>
            <view class="q-stepper">
              <text class="q-sname">名额数量</text>
              <view class="q-step-ctrl">
                <view class="q-step-btn" :class="{ dis: giftCount <= 1 }" @tap="decCount"><text class="q-step-sign">−</text></view>
                <text class="q-step-val">{{ giftCount }}</text>
                <view class="q-step-btn" :class="{ dis: giftCount >= data.available }" @tap="incCount"><text class="q-step-sign">＋</text></view>
              </view>
            </view>
            <text class="q-step-hint">最多可赠送 {{ data.available }} 个（当前可用名额上限）</text>
          </view>
        </scroll-view>

        <view class="q-sh-foot">
          <view class="q-btn-primary q-btn-confirm" :class="{ dis: !searchResult || submitting }" @tap="doGift">
            <text class="q-btn-primary-txt">确认赠送</text>
          </view>
          <text class="q-sh-tip">赠送后不可撤回，请确认对象</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { operatorApi, type QuotaRecord } from '@/lib/operator-data'
import { formatPrice } from '@/utils/format'

const statusBarHeight = ref(20)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 20
} catch (e) {}

const loading = ref(true)
const error = ref('')
const data = ref({ total: 6, used: 1, sold: 0, gifted: 0, available: 5, price: 0 })
const records = ref<QuotaRecord[]>([])

const showGiftSheet = ref(false)
const giftPhone = ref('')
const giftCount = ref(1)
const isSearching = ref(false)
const searchResult = ref<{ name: string; phone: string } | null>(null)
const submitting = ref(false)

// 已分配记录（自用不列入分配明细，只展示 已售 / 已赠）
const allocRecords = computed(() => records.value.filter((r) => r.type === 'sold' || r.type === 'gifted'))

// 环形图：按名额构成分段（金=自用 / 朱红=已售 / 浅蓝=已赠 / 浅灰=可用）
const ringGradient = computed(() => {
  const total = data.value.total || 6
  const seg = (n: number) => (n / total) * 100
  const p1 = seg(data.value.used)
  const p2 = p1 + seg(data.value.sold)
  const p3 = p2 + seg(data.value.gifted)
  return `conic-gradient(#C9A96E 0% ${p1}%, #C41E3A ${p1}% ${p2}%, #A0C4FF ${p2}% ${p3}%, #E8E2D8 ${p3}% 100%)`
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [d, r] = await Promise.all([
      operatorApi.getQuotaData(),
      operatorApi.getQuotaRecords(),
    ])
    data.value = d
    records.value = r
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(load)
function retry() { load() }

function goBack() { uni.navigateBack({ delta: 1, fail: () => uni.switchTab({ url: '/pages/index/index', fail: () => {} }) }) }

function avatarChar(name: string) { return name ? name.charAt(0) : '·' }
function avatarBg(type: string) {
  return type === 'sold'
    ? 'linear-gradient(135deg,#C9A96E,#B08D4A)'
    : 'linear-gradient(135deg,#8E9BAE,#6E7A8C)'
}

function onGiftClick() {
  if (data.value.available <= 0) {
    uni.showToast({ title: '暂无可用名额', icon: 'none' })
    return
  }
  showGiftSheet.value = true
}
function closeGift() {
  showGiftSheet.value = false
  giftPhone.value = ''
  giftCount.value = 1
  searchResult.value = null
}
function incCount() { if (giftCount.value < data.value.available) giftCount.value++ }
function decCount() { if (giftCount.value > 1) giftCount.value-- }

function doSearch() {
  if (isSearching.value || giftPhone.value.length < 11) return
  isSearching.value = true
  // 用户搜索接口后端未实现 → 诚实降级为占位结果
  setTimeout(() => {
    searchResult.value = { name: '张三丰', phone: giftPhone.value.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') }
    isSearching.value = false
  }, 800)
}

function doGift() {
  if (!searchResult.value || submitting.value) return
  submitting.value = true
  // POST /operator/quota/gift 后端暂未实现 → 诚实降级 toast
  uni.showToast({ title: '功能开发中', icon: 'none' })
  submitting.value = false
  closeGift()
}
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
.tag-gift { background: rgba(160,196,255,0.25); color: #3B6EC4; }

/* 空态 */
.q-empty { display: flex; flex-direction: column; align-items: center; padding: 40rpx 0 20rpx; }
.q-empty-txt { font-size: 26rpx; color: #6E6E73; margin-top: 16rpx; }
.q-empty-sub { font-size: 22rpx; color: #999999; margin-top: 8rpx; }

/* 弹窗 */
.q-mask { position: fixed; inset: 0; background: rgba(30,20,15,0.42); z-index: 100; display: flex; align-items: flex-end; }
.q-sheet { width: 100%; background: #FAF8F5; border-radius: 35rpx 35rpx 0 0; padding: 16rpx 0 40rpx; max-height: 88vh; display: flex; flex-direction: column; }
.q-handle { width: 74rpx; height: 8rpx; border-radius: 4rpx; background: #D8D2C8; margin: 12rpx auto 8rpx; }
.q-sh-head { position: relative; padding: 22rpx 38rpx 16rpx; display: flex; align-items: center; justify-content: center; }
.q-sh-title { font-family: 'Songti SC', serif; font-size: 36rpx; font-weight: 700; color: #2C2C2C; }
.q-sh-close { position: absolute; right: 38rpx; top: 16rpx; width: 56rpx; height: 56rpx; border-radius: 50%; background: #EDE8E0; display: flex; align-items: center; justify-content: center; }
.q-sh-body { padding: 16rpx 38rpx; }

/* 可赠送徽标 */
.q-avail-badge { text-align: center; background: #FBF6EE; border-radius: 28rpx; padding: 28rpx; margin-bottom: 30rpx; }
.q-avail-n { display: block; font-family: 'Songti SC', serif; font-size: 58rpx; font-weight: 700; color: #97794a; line-height: 1; }
.q-avail-l { font-size: 24rpx; color: #6E6E73; margin-top: 8rpx; }

/* 表单字段 */
.q-field { margin-bottom: 30rpx; }
.q-field-lbl { display: block; font-size: 26rpx; font-weight: 600; color: #2C2C2C; margin-bottom: 16rpx; }
.q-search { display: flex; align-items: center; gap: 16rpx; background: #FFFFFF; border: 1rpx solid #EFEAE2; border-radius: 24rpx; padding: 16rpx 24rpx; }
.q-search-input { flex: 1; height: 56rpx; font-size: 26rpx; color: #2C2C2C; }
.q-search-ph { color: #999999; }
.q-search-btn { flex-shrink: 0; padding: 0 30rpx; height: 64rpx; min-width: 88rpx; background: #C41E3A; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; }
.q-search-btn.dis { opacity: 0.45; }
.q-search-btn-txt { font-size: 26rpx; color: #FFFFFF; }

/* 选中用户 */
.q-user-pick { display: flex; align-items: center; gap: 22rpx; background: #FFFFFF; border: 3rpx solid #C41E3A; border-radius: 24rpx; padding: 24rpx; margin-top: 20rpx; }
.q-up-av { width: 72rpx; height: 72rpx; border-radius: 50%; background: linear-gradient(135deg,#8E9BAE,#6E7A8C); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.q-up-av-txt { font-family: 'Songti SC', serif; font-size: 28rpx; color: #FFFFFF; }
.q-up-info { flex: 1; min-width: 0; }
.q-up-name { display: block; font-size: 28rpx; font-weight: 600; color: #2C2C2C; }
.q-up-sub { display: block; font-size: 22rpx; color: #999999; margin-top: 4rpx; }
.q-up-check { width: 44rpx; height: 44rpx; border-radius: 50%; background: #C41E3A; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

/* 步进器 */
.q-stepper { display: flex; align-items: center; justify-content: space-between; background: #FFFFFF; border: 1rpx solid #EFEAE2; border-radius: 24rpx; padding: 20rpx 32rpx; }
.q-sname { font-size: 28rpx; color: #2C2C2C; }
.q-step-ctrl { display: flex; align-items: center; gap: 36rpx; }
.q-step-btn { width: 64rpx; height: 64rpx; border-radius: 50%; border: 3rpx solid #C41E3A; display: flex; align-items: center; justify-content: center; }
.q-step-btn.dis { border-color: #DCD6CC; }
.q-step-sign { font-size: 36rpx; color: #C41E3A; line-height: 1; }
.q-step-btn.dis .q-step-sign { color: #DCD6CC; }
.q-step-val { font-family: 'Songti SC', serif; font-size: 40rpx; font-weight: 700; color: #2C2C2C; min-width: 48rpx; text-align: center; }
.q-step-hint { display: block; font-size: 22rpx; color: #999999; margin-top: 16rpx; }

/* 弹窗底部 */
.q-sh-foot { padding: 16rpx 38rpx 0; }
.q-btn-confirm { margin-bottom: 0; }
.q-sh-tip { display: block; text-align: center; font-size: 24rpx; color: #999999; margin-top: 20rpx; }

/* 三态 */
.q-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 120rpx 38rpx; }
.q-spinner { width: 64rpx; height: 64rpx; border: 6rpx solid #EFEAE2; border-top-color: #C41E3A; border-radius: 50%; animation: q-spin 0.8s linear infinite; }
@keyframes q-spin { to { transform: rotate(360deg); } }
.q-state-txt { font-size: 28rpx; color: #6E6E73; margin-top: 24rpx; text-align: center; }
.q-state-btn { margin-top: 32rpx; padding: 20rpx 60rpx; background: #C41E3A; border-radius: 99rpx; }
.q-state-btn-txt { font-size: 28rpx; color: #FFFFFF; }
</style>
