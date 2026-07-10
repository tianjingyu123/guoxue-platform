<template>
  <!-- 加载骨架屏 -->
  <view v-if="loading" class="skeleton-page">
    <view class="skeleton-nav" />
    <view class="skeleton-card" />
    <view class="skeleton-card" />
    <view class="skeleton-card skeleton-card-sm" />
  </view>
  <!-- 错误状态 -->
  <view v-else-if="error" class="error-state">
    <text class="error-text">{{ error }}</text>
    <view class="retry-btn" @tap="fetchData">重试</view>
  </view>
  <!-- 正常内容 -->
  <view v-else class="page">
    <!-- 顶部导航 -->
    <view class="nav">
      <view class="nav-btn" @tap="goBack">
        <AppIcon name="chevron-left" :size="48" color="#2C2C2C" />
      </view>
      <text class="nav-title">创建直播</text>
      <text class="nav-draft">存草稿</text>
    </view>

    <view class="body">
      <!-- 直播模式选择 -->
      <view class="card">
        <text class="label">直播模式 <text class="req">*</text></text>
        <view class="mode-grid">
          <view class="mode-card" :class="{ 'mode-active': liveMode === 'vertical' }" @tap="liveMode = 'vertical'">
            <view class="mode-badge">推荐</view>
            <view class="mode-icon" :class="{ 'mode-icon-active': liveMode === 'vertical' }">
              <AppIcon name="smartphone" :size="40" :color="liveMode === 'vertical' ? '#fff' : '#666'" />
            </view>
            <text class="mode-name" :class="{ 'mode-name-active': liveMode === 'vertical' }">手机竖屏</text>
            <text class="mode-desc">适合带货、聊天互动</text>
          </view>
          <view class="mode-card" :class="{ 'mode-active': liveMode === 'horizontal' }" @tap="liveMode = 'horizontal'">
            <view class="mode-icon" :class="{ 'mode-icon-active': liveMode === 'horizontal' }">
              <AppIcon name="monitor" :size="40" :color="liveMode === 'horizontal' ? '#fff' : '#666'" />
            </view>
            <text class="mode-name" :class="{ 'mode-name-active': liveMode === 'horizontal' }">OBS横屏</text>
            <text class="mode-desc">适合课程、课件讲解</text>
          </view>
        </view>
        <!-- OBS提示 -->
        <view v-if="liveMode === 'horizontal'" class="obs-tip">
          <AppIcon name="settings" :size="32" color="#d97706" />
          <view class="obs-tip-body">
            <text class="obs-tip-title">OBS推流设置</text>
            <text class="obs-tip-desc">创建后在「直播管理 → 推流配置」获取推流地址与串流密钥，填入 OBS 即可推流开播；观看端将按横屏画面呈现。</text>
            <view class="obs-tip-links">
              <text class="obs-tip-link" @tap="navigateTo('/pkg-live/stream-config/index')">获取推流地址</text>
              <text class="obs-tip-link" @tap="navigateTo('/pkg-live/obs-guide/index')">查看OBS配置教程</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 画质档位（C5 分档商业化） -->
      <view class="card">
        <view class="quality-head">
          <text class="label quality-label">画质档位 <text class="req">*</text></text>
          <text class="quality-buy-link" @tap="goBuyPackage">购买时长包</text>
        </view>
        <view class="type-grid quality-grid">
          <view
            v-for="q in qualityOptions"
            :key="q.value"
            class="type-card"
            :class="{ 'type-active': quality === q.value }"
            @tap="quality = q.value"
          >
            <text class="type-name" :class="{ 'type-name-active': quality === q.value }">{{ q.label }}</text>
            <text class="type-desc">{{ q.desc }}</text>
            <!-- 档位单价：由时长包真实价换算（金币/时），接口无数据则不显示，不编数字 -->
            <text v-if="q.value === 'basic'" class="quality-price quality-price-free">免费</text>
            <text v-else-if="hourRate(q.value)" class="quality-price">{{ hourRate(q.value) }} 金币<text class="quality-price-unit">/小时</text></text>
            <text v-if="q.value !== 'basic'" class="quality-quota">剩余 {{ q.value === 'hd' ? quota.hdMinutes : quota.uhdMinutes }} 分钟</text>
          </view>
        </view>
        <!-- 费用预估与额度（V0 quality-bill）：选择付费档后展开 -->
        <view v-if="quality !== 'basic'" class="quality-bill">
          <view v-if="hourRate(quality)" class="bill-row">
            <text class="bill-label">档位计费</text>
            <text class="bill-amt">{{ hourRate(quality) }} 金币/小时</text>
          </view>
          <view class="bill-row">
            <text class="bill-label">我的剩余额度</text>
            <text class="bill-amt" :class="{ 'bill-amt-warn': remainingForSelected <= 0 }">{{ formatMinutes(remainingForSelected) }}</text>
          </view>
          <view v-if="coinBalance !== null" class="bill-row">
            <text class="bill-label">金币余额</text>
            <view class="bill-balance-right">
              <text class="bill-amt">{{ coinBalance }} 金币</text>
              <text class="bill-recharge" @tap="navigateTo('/pkg-mine/wallet/recharge')">去充值</text>
            </view>
          </view>
          <!-- 额度不足：内联真实套餐购买（真价·真端点） -->
          <view v-if="remainingForSelected <= 0" class="bill-buy">
            <text class="bill-buy-title">额度不足，购买时长包后可选本档位开播</text>
            <view v-if="packagesForSelected.length" class="bill-pkg-list">
              <view v-for="pkg in packagesForSelected" :key="pkg.id" class="bill-pkg">
                <view class="bill-pkg-info">
                  <text class="bill-pkg-name">{{ pkg.name }}</text>
                  <text class="bill-pkg-minutes">{{ formatMinutes(pkg.minutes) }}转码时长</text>
                </view>
                <view class="bill-pkg-right">
                  <text class="bill-pkg-price">{{ pkg.priceCoin }} 金币</text>
                  <view class="bill-pkg-btn" :class="{ 'bill-pkg-btn-ing': buyingId === pkg.id }" @tap="onBuyPackage(pkg)">
                    <text class="bill-pkg-btn-txt">{{ buyingId === pkg.id ? '购买中…' : '购买' }}</text>
                  </view>
                </view>
              </view>
            </view>
            <text v-else class="bill-pkg-empty">套餐加载失败，可点右上角「购买时长包」前往购买</text>
          </view>
          <text class="bill-note">按实际开播时长核销额度，不足 1 分钟按 1 分钟计；开播时额度不足将自动降级为标清（免费）。画质额度与直播门票收入互不影响。</text>
        </view>
      </view>

      <!-- 封面上传 -->
      <view class="card">
        <text class="label">直播封面 <text class="req">*</text></text>
        <view class="cover-upload" @tap="uploadCover">
          <image v-if="cover" class="cover-preview" :src="cover" mode="aspectFill" />
          <template v-else>
            <AppIcon name="camera" :size="80" color="#999999" />
            <text class="cover-tip">{{ coverUploading ? '上传中...' : '点击上传封面' }}</text>
            <text class="cover-hint">建议尺寸 16:9，支持 JPG/PNG</text>
          </template>
        </view>
      </view>

      <!-- 基本信息 -->
      <view class="card card-gap">
        <!-- 标题 -->
        <view class="field">
          <text class="label">直播标题 <text class="req">*</text></text>
          <input v-model="title" class="input" placeholder="请输入直播标题，最多30字" placeholder-class="ph" maxlength="30" />
          <view class="field-foot">
            <text class="char-count">{{ title.length }}/30</text>
          </view>
        </view>
        <!-- 开播时间（不选=立即开播） -->
        <view class="field">
          <text class="label">开播时间 <text class="label-note">（不选则立即开播）</text></text>
          <view class="dt-row">
            <picker class="dt-flex" mode="date" :start="todayStr" :value="startDate" @change="onDateChange">
              <view class="picker-btn">
                <view class="picker-left">
                  <AppIcon name="calendar" :size="40" color="#999999" />
                  <text class="picker-ph" :class="{ 'picker-val': startDate }">{{ startDate || '选择日期' }}</text>
                </view>
              </view>
            </picker>
            <picker class="dt-flex" mode="time" :value="startClock" @change="onTimeChange">
              <view class="picker-btn">
                <view class="picker-left">
                  <AppIcon name="clock" :size="40" color="#999999" />
                  <text class="picker-ph" :class="{ 'picker-val': startClock }">{{ startClock || '选择时间' }}</text>
                </view>
              </view>
            </picker>
          </view>
        </view>
        <!-- 直播类型 -->
        <view class="field">
          <text class="label">直播类型</text>
          <view class="type-grid">
            <view
              v-for="item in typeOptions"
              :key="item.value"
              class="type-card"
              :class="{ 'type-active': liveType === item.value }"
              @tap="liveType = item.value"
            >
              <text class="type-name" :class="{ 'type-name-active': liveType === item.value }">{{ item.label }}</text>
              <text class="type-desc">{{ item.desc }}</text>
            </view>
          </view>
        </view>
        <!-- 分类 -->
        <view class="field">
          <text class="label">直播分类 <text class="req">*</text></text>
          <view class="picker-btn" @tap="showCategoryPicker = true">
            <text class="picker-ph">{{ selectedCategoryName || '请选择分类' }}</text>
            <AppIcon name="chevron-right" :size="40" color="#999999" />
          </view>
        </view>
      </view>

      <!-- 更多设置 -->
      <view class="card card-gap">
        <!-- 描述 -->
        <view class="field">
          <text class="label">直播简介</text>
          <textarea v-model="description" class="textarea" placeholder="介绍一下本场直播的内容..." placeholder-class="ph" maxlength="200" />
          <view class="field-foot">
            <text class="char-count">{{ description.length }}/200</text>
          </view>
        </view>
        <!-- 标签 -->
        <view class="field">
          <text class="label">直播标签 <text class="label-note">（最多5个）</text></text>
          <view class="tag-input-row">
            <input v-model="tagInput" class="tag-input" placeholder="输入标签后回车添加" placeholder-class="ph" maxlength="10" @confirm="addTag" />
            <view class="tag-add-btn" @tap="addTag">添加</view>
          </view>
        </view>
        <!-- 公开设置 -->
        <view class="switch-row">
          <view class="switch-info">
            <text class="switch-title">公开直播</text>
            <text class="switch-desc">关闭后仅粉丝可见</text>
          </view>
          <view class="switch" :class="{ 'switch-on': isPublic }" @tap="isPublic = !isPublic">
            <view class="switch-dot" :class="{ 'switch-dot-on': isPublic }" />
          </view>
        </view>
        <!-- 收费设置 -->
        <view class="field">
          <text class="label">收费设置</text>
          <view class="type-grid">
            <view class="type-card" :class="{ 'type-active': !isCharge }" @tap="isCharge = false">
              <text class="type-name" :class="{ 'type-name-active': !isCharge }">免费直播</text>
              <text class="type-desc">所有人可观看</text>
            </view>
            <view class="type-card" :class="{ 'type-active': isCharge }" @tap="isCharge = true">
              <text class="type-name" :class="{ 'type-name-active': isCharge }">付费直播</text>
              <text class="type-desc">购票后可观看</text>
            </view>
          </view>
          <input v-if="isCharge" v-model="chargePrice" class="input charge-input" type="digit" placeholder="请输入观看价格（元）" placeholder-class="ph" />
        </view>
      </view>

      <!-- 开放范围（visibility·后端 CreateRoomDto 已收） -->
      <view class="card">
        <text class="label">开放范围</text>
        <view class="scope-list">
          <view class="scope-option" :class="{ 'scope-active': visibility === 'CIRCLE_ONLY' }" @tap="visibility = 'CIRCLE_ONLY'">
            <view class="scope-radio" :class="{ 'scope-radio-on': visibility === 'CIRCLE_ONLY' }" />
            <view class="scope-main">
              <text class="scope-name">仅本圈</text>
              <text class="scope-desc">只有圈内成员可进入直播间</text>
            </view>
          </view>
          <view class="scope-option" :class="{ 'scope-active': visibility === 'PLATFORM' }" @tap="visibility = 'PLATFORM'">
            <view class="scope-radio" :class="{ 'scope-radio-on': visibility === 'PLATFORM' }" />
            <view class="scope-main">
              <text class="scope-name">全平台开放</text>
              <text class="scope-desc">全平台用户都能进入你的直播间</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 提示 -->
      <view class="info-tip">
        <AppIcon name="info" :size="32" color="#C9A96E" />
        <text class="info-tip-txt">直播开始前15分钟将推送通知给已预约的用户，请确保按时开播</text>
      </view>
    </view>

    <!-- 底部按钮 -->
    <view class="footer">
      <view class="submit-btn" @tap="onCreate">{{ submitting ? '创建中...' : '创建直播' }}</view>
    </view>

    <!-- 分类选择器 -->
    <view v-if="showCategoryPicker" class="sheet-mask" @tap="showCategoryPicker = false">
      <view class="sheet" @tap.stop>
        <view class="sheet-head">
          <text class="sheet-cancel" @tap="showCategoryPicker = false">取消</text>
          <text class="sheet-title">选择分类</text>
          <view class="sheet-placeholder" />
        </view>
        <view class="cat-grid">
          <view
            v-for="cat in categories"
            :key="cat.id"
            class="cat-item"
            :class="{ 'cat-item-active': categoryId === cat.id }"
            @tap="selectCategory(cat.id)"
          >
            {{ cat.name }}
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { liveApi, type LiveCategory, type LiveQuota, type LiveQualityPackage } from '@/lib/live-data'
import { getCoinBalance } from '@/lib/circle-consult-data'
import { uploadImage } from '@/utils/request'

// 三态UI
const loading = ref(true)
const error = ref('')

// 发布归属圈子：从圈子发布入口带来则归该圈子（后端 CreateRoomDto.circleId 可选）
const circleId = ref('')
onLoad((q) => { circleId.value = (q as Record<string, string> | undefined)?.circleId || '' })

// 开播方式（orientation·后端已收）：手机竖屏（默认）/ OBS 推流横屏
const liveMode = ref<'vertical' | 'horizontal'>('vertical')

// 开放范围（visibility·后端已收，默认仅本圈；全平台创建即生效，机审后台异步）
const visibility = ref<'CIRCLE_ONLY' | 'PLATFORM'>('CIRCLE_ONLY')

// 画质档位（C5）
const quality = ref<'basic' | 'hd' | 'uhd'>('basic')
const quota = ref<LiveQuota>({ hdMinutes: 0, uhdMinutes: 0 })
const qualityOptions = [
  { value: 'basic' as const, label: '标清', desc: '免费·延时2-3s' },
  { value: 'hd' as const, label: '高清 720P', desc: '转码·消耗额度' },
  { value: 'uhd' as const, label: '超清 1080P', desc: '转码·消耗额度' },
]
const remainingForSelected = computed(() =>
  quality.value === 'hd' ? quota.value.hdMinutes : quality.value === 'uhd' ? quota.value.uhdMinutes : Infinity,
)
// 时长包真实数据（GET /live/quality-packages）：档位单价与内联购买均由此换算，不硬编码金额
const packages = ref<LiveQualityPackage[]>([])
const coinBalance = ref<number | null>(null)
/** 档位单价（金币/时）：取该档最优惠时长包换算；无数据返回 0（模板不渲染，不编数字） */
function hourRate(q: 'basic' | 'hd' | 'uhd'): number {
  if (q === 'basic') return 0
  const rates = packages.value
    .filter((p) => p.quality === q && p.minutes > 0 && p.priceCoin > 0)
    .map((p) => (p.priceCoin / p.minutes) * 60)
  return rates.length ? Math.round(Math.min(...rates)) : 0
}
const packagesForSelected = computed(() =>
  quality.value === 'basic' ? [] : packages.value.filter((p) => p.quality === quality.value),
)
function formatMinutes(m: number): string {
  if (!Number.isFinite(m) || m <= 0) return '0 分钟'
  if (m >= 60) {
    const h = Math.floor(m / 60)
    const rest = m % 60
    return rest ? `${h}小时${rest}分` : `${h}小时`
  }
  return `${m} 分钟`
}
// 内联购买时长包（POST /live/quality-packages/:id/purchase 真实端点，返回购买后额度）
const buyingId = ref('')
async function onBuyPackage(pkg: LiveQualityPackage) {
  if (buyingId.value) return
  buyingId.value = pkg.id
  try {
    quota.value = await liveApi.purchaseQualityPackage(pkg.id)
    coinBalance.value = await getCoinBalance()
    uni.showToast({ title: '购买成功', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '购买失败', icon: 'none' })
  } finally {
    buyingId.value = ''
  }
}
function goBuyPackage() {
  navigateTo('/pkg-live/quality-packages/index')
}
const liveType = ref<'knowledge' | 'ecommerce'>('knowledge')
const title = ref('')
const description = ref('')
const tagInput = ref('')
const isPublic = ref(true)
const categoryId = ref('')
const showCategoryPicker = ref(false)
const categories = ref<LiveCategory[]>([])

// 封面上传（后端 LiveRoom.cover 支持）
const cover = ref('')
const coverUploading = ref(false)
function uploadCover() {
  if (coverUploading.value) return
  uni.chooseImage({ count: 1, success: async (res) => {
    coverUploading.value = true
    uni.showLoading({ title: '上传中' })
    try { cover.value = await uploadImage(res.tempFilePaths[0]) }
    catch (e) { uni.showToast({ title: (e as Error)?.message || '封面上传失败', icon: 'none' }) }
    finally { coverUploading.value = false; uni.hideLoading() }
  } })
}

// 开播时间（不选则立即开播；后端 createRoom 支持 startTime）
const startDate = ref('')
const startClock = ref('')
const todayStr = (() => { const d = new Date(); const p = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` })()
function onDateChange(e: any) { startDate.value = e.detail.value }
function onTimeChange(e: any) { startClock.value = e.detail.value }
const startTime = computed(() => (startDate.value && startClock.value ? `${startDate.value} ${startClock.value}` : ''))

// 收费设置（后端 chargeType/chargePrice 支持）
const isCharge = ref(false)
const chargePrice = ref('')

const typeOptions = [
  { value: 'knowledge' as const, label: '知识授课', desc: '适合课程讲解' },
  { value: 'ecommerce' as const, label: '电商带货', desc: '适合商品销售' },
]

const selectedCategoryName = computed(() => categories.value.find((c) => c.id === categoryId.value)?.name || '')

async function fetchData() {
  loading.value = true
  error.value = ''
  // 分类/额度加载失败一律降级为空，绝不因接口异常把整个表单挡在三态之外
  //（原实现：getCategories 抛错→error 被设→表单永远出不来，是「填不了直播信息」的根因）
  categories.value = await liveApi.getCategories().catch(() => [])
  quota.value = await liveApi.getQuota().catch(() => ({ hdMinutes: 0, uhdMinutes: 0 }))
  // 时长包/金币余额：辅助信息降级为空，不挡表单（金额一律用后端返回值）
  packages.value = await liveApi.getQualityPackages().catch(() => [])
  coinBalance.value = await getCoinBalance()
  loading.value = false
}

onMounted(() => { fetchData() })

function selectCategory(id: string) {
  categoryId.value = id
  showCategoryPicker.value = false
}
function addTag() {}

// 创建直播（写操作，防重复）。description/tags/liveType/liveMode 后端 LiveRoom 暂无对应字段，仅提交核心字段
const submitting = ref(false)
async function onCreate() {
  if (submitting.value) return
  if (!title.value.trim()) {
    uni.showToast({ title: '请输入直播标题', icon: 'none' })
    return
  }
  const price = isCharge.value ? Number(chargePrice.value) : 0
  if (isCharge.value && !(price > 0)) {
    uni.showToast({ title: '请输入正确的收费金额', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    await liveApi.createRoom({
      circleId: circleId.value || undefined,
      title: title.value.trim(),
      cover: cover.value || undefined,
      startTime: startTime.value || undefined,
      chargeType: isCharge.value ? 'PAID' : 'FREE',
      chargePrice: isCharge.value ? price : undefined,
      quality: quality.value,
      orientation: liveMode.value === 'horizontal' ? 'landscape' : 'portrait',
      visibility: visibility.value,
    })
    // 审核无感化（20260711 第八节）：创建即生效，机审后台异步完成，无任何审核提示
    uni.showToast({ title: '创建成功', icon: 'success' })
    setTimeout(() => goBack(), 800)
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '创建失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
/* 骨架屏 */
.skeleton-page {
  min-height: 100vh;
  background: #FAF8F5;
  padding: 32rpx;
}
.skeleton-nav {
  height: 96rpx;
  background: #fff;
  border-radius: 16rpx;
  margin-bottom: 32rpx;
}
.skeleton-card {
  height: 320rpx;
  background: #fff;
  border-radius: 32rpx;
  margin-bottom: 32rpx;
}
.skeleton-card-sm {
  height: 200rpx;
}

/* 错误状态 */
.error-state {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #FAF8F5;
  padding: 48rpx;
}
.error-text {
  font-size: 28rpx;
  color: #999;
  margin-bottom: 32rpx;
}
.retry-btn {
  padding: 20rpx 64rpx;
  background: var(--brand);
  color: #fff;
  border-radius: 24rpx;
  font-size: 28rpx;
}

.page {
  min-height: 100vh;
  background: #FAF8F5;
  padding-bottom: 192rpx;
}

/* 导航 */
.nav {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #fff;
  border-bottom: 1rpx solid #E8E3DB;
  height: 96rpx;
  padding: 0 32rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.nav-btn {
  margin-left: -8rpx;
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
}
.nav-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #2C2C2C;
}
.nav-draft {
  font-size: 26rpx;
  color: #666666;
}

.body {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}

/* 卡片 */
.card {
  background: #fff;
  border-radius: 32rpx;
  padding: 32rpx;
}
.card-gap {
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}
.label {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #2C2C2C;
  margin-bottom: 24rpx;
}
.label-note {
  font-size: 24rpx;
  color: #999999;
  font-weight: 400;
}
.req {
  color: var(--brand);
}

/* 直播模式 */
.mode-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24rpx;
}
.mode-card {
  position: relative;
  padding: 32rpx;
  border-radius: 24rpx;
  border: 4rpx solid #E8E3DB;
  background: #FAF8F5;
}
.mode-active {
  border-color: var(--brand);
  background: #fef2f2;
}
.mode-badge {
  position: absolute;
  top: 16rpx;
  right: 16rpx;
  background: var(--brand);
  color: #fff;
  font-size: 20rpx;
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
}
.mode-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 16rpx;
  background: #E8E3DB;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16rpx;
}
.mode-icon-active {
  background: var(--brand);
}
.mode-name {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #2C2C2C;
}
.mode-name-active {
  color: var(--brand);
}
.mode-desc {
  display: block;
  font-size: 20rpx;
  color: #999;
  margin-top: 8rpx;
}
.obs-tip {
  margin-top: 24rpx;
  padding: 24rpx;
  background: #fffbeb;
  border: 1rpx solid #fde68a;
  border-radius: 24rpx;
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
}
.obs-tip-body {
  flex: 1;
}
.obs-tip-title {
  display: block;
  font-size: 24rpx;
  color: #92400e;
  font-weight: 500;
}
.obs-tip-desc {
  display: block;
  font-size: 20rpx;
  color: #b45309;
  margin-top: 8rpx;
}
.obs-tip-links { display: flex; gap: 32rpx; margin-top: 8rpx; }
.obs-tip-link {
  display: inline-block;
  font-size: 20rpx;
  color: #92400e;
  text-decoration: underline;
}

/* 画质档位（C5） */
.quality-head { display: flex; align-items: center; justify-content: space-between; }
.quality-label { margin-bottom: 24rpx; }
.quality-buy-link { font-size: 24rpx; color: var(--brand); }
.quality-grid { grid-template-columns: 1fr 1fr 1fr; }
.quality-quota { display: block; font-size: 20rpx; color: #C9A96E; margin-top: 8rpx; }
/* 档位单价（真实时长包换算·金） */
.quality-price { display: block; font-size: 24rpx; font-weight: 600; color: #C9A96E; margin-top: 8rpx; }
.quality-price-unit { font-size: 20rpx; font-weight: 400; color: #999999; }
.quality-price-free { color: #5B8A5E; }
/* 费用预估卡（V0 quality-bill 暖底） */
.quality-bill {
  margin-top: 24rpx; padding: 24rpx 28rpx;
  background: #F8F4EC; border-radius: 20rpx;
}
.bill-row { display: flex; align-items: center; justify-content: space-between; }
.bill-row + .bill-row { margin-top: 12rpx; }
.bill-label { font-size: 24rpx; color: #6E6E73; }
.bill-amt { font-size: 24rpx; font-weight: 600; color: #C9A96E; }
.bill-amt-warn { color: var(--brand); }
.bill-balance-right { display: flex; align-items: center; gap: 16rpx; }
.bill-recharge {
  padding: 6rpx 24rpx; border: 1rpx solid #C9A96E; border-radius: 26rpx;
  font-size: 22rpx; font-weight: 600; color: #C9A96E;
}
.bill-buy { margin-top: 20rpx; padding-top: 20rpx; border-top: 1rpx solid #EDE7DD; }
.bill-buy-title { display: block; font-size: 22rpx; color: var(--brand); margin-bottom: 16rpx; }
.bill-pkg-list { display: flex; flex-direction: column; gap: 16rpx; }
.bill-pkg {
  display: flex; align-items: center; justify-content: space-between;
  background: #ffffff; border-radius: 16rpx; padding: 20rpx 24rpx;
}
.bill-pkg-info { display: flex; flex-direction: column; gap: 6rpx; min-width: 0; }
.bill-pkg-name { font-size: 24rpx; font-weight: 500; color: #2C2C2C; }
.bill-pkg-minutes { font-size: 20rpx; color: #999999; }
.bill-pkg-right { display: flex; align-items: center; gap: 20rpx; flex-shrink: 0; }
.bill-pkg-price { font-size: 24rpx; font-weight: 700; color: var(--brand); }
.bill-pkg-btn { padding: 10rpx 32rpx; border-radius: 999rpx; background: linear-gradient(to right, var(--brand), #E85D75); }
.bill-pkg-btn-ing { opacity: 0.6; }
.bill-pkg-btn-txt { font-size: 22rpx; color: #ffffff; font-weight: 500; }
.bill-pkg-empty { display: block; font-size: 22rpx; color: #999999; }
.bill-note { display: block; margin-top: 16rpx; font-size: 20rpx; color: #999999; line-height: 1.6; }

/* 开放范围（V0 scope-option） */
.scope-list { display: flex; flex-direction: column; }
.scope-option { display: flex; align-items: flex-start; gap: 24rpx; padding: 24rpx 0; }
.scope-option + .scope-option { border-top: 1rpx solid #EDE7DD; }
.scope-radio {
  width: 40rpx; height: 40rpx; border-radius: 50%; flex-shrink: 0; margin-top: 2rpx;
  border: 3rpx solid #E8E3DB; box-sizing: border-box; position: relative;
}
.scope-radio-on { border-color: var(--brand); }
.scope-radio-on::after {
  content: ""; position: absolute; top: 8rpx; left: 8rpx; right: 8rpx; bottom: 8rpx;
  border-radius: 50%; background: var(--brand);
}
.scope-main { flex: 1; }
.scope-name { display: block; font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.scope-desc { display: block; font-size: 24rpx; color: #999999; margin-top: 4rpx; line-height: 1.5; }

/* 封面上传 */
.cover-upload {
  aspect-ratio: 16 / 9;
  border-radius: 24rpx;
  border: 4rpx dashed #E8E3DB;
  background: #FAF8F5;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
}
.cover-tip {
  font-size: 28rpx;
  color: #999999;
}
.cover-hint {
  font-size: 24rpx;
  color: #999999;
}

/* 字段 */
.field {
  display: flex;
  flex-direction: column;
}
.field .label {
  margin-bottom: 16rpx;
}
.input {
  width: 100%;
  box-sizing: border-box;
  padding: 24rpx 32rpx;
  border-radius: 24rpx;
  border: 1rpx solid #E8E3DB;
  background: #FAF8F5;
  font-size: 28rpx;
  color: #2C2C2C;
}
.ph {
  color: #999999;
}
.field-foot {
  display: flex;
  justify-content: flex-end;
  margin-top: 8rpx;
}
.char-count {
  font-size: 24rpx;
  color: #999999;
}
.picker-btn {
  width: 100%;
  box-sizing: border-box;
  padding: 24rpx 32rpx;
  border-radius: 24rpx;
  border: 1rpx solid #E8E3DB;
  background: #FAF8F5;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.picker-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.picker-ph {
  font-size: 28rpx;
  color: #999999;
}

/* 类型 */
.type-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24rpx;
}
.type-card {
  padding: 32rpx;
  border-radius: 24rpx;
  border: 4rpx solid #E8E3DB;
  background: #FAF8F5;
}
.type-active {
  border-color: var(--brand);
  background: #fef2f2;
}
.type-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #2C2C2C;
}
.type-name-active {
  color: var(--brand);
}
.type-desc {
  display: block;
  font-size: 24rpx;
  color: #999999;
  margin-top: 8rpx;
}

/* 标签 */
.tag-input-row {
  display: flex;
  gap: 16rpx;
}
.tag-input {
  flex: 1;
  box-sizing: border-box;
  padding: 16rpx 32rpx;
  border-radius: 24rpx;
  border: 1rpx solid #E8E3DB;
  background: #FAF8F5;
  font-size: 28rpx;
  color: #2C2C2C;
}
.tag-add-btn {
  padding: 16rpx 32rpx;
  background: var(--brand);
  color: #fff;
  border-radius: 24rpx;
  font-size: 28rpx;
  display: flex;
  align-items: center;
}

/* 开关 */
.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 0;
}
.switch-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #2C2C2C;
}
.switch-desc {
  display: block;
  font-size: 24rpx;
  color: #999999;
  margin-top: 4rpx;
}
.switch {
  width: 96rpx;
  height: 56rpx;
  border-radius: 999rpx;
  background: #d1d5db;
  position: relative;
  flex-shrink: 0;
}
.switch-on {
  background: var(--brand);
}
.switch-dot {
  position: absolute;
  top: 6rpx;
  left: 8rpx;
  width: 40rpx;
  height: 40rpx;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.15);
  transition: transform 0.2s;
}
.switch-dot-on {
  transform: translateX(40rpx);
}

/* 提示 */
.info-tip {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  padding: 0 16rpx;
}
.info-tip-txt {
  flex: 1;
  font-size: 24rpx;
  color: #999999;
  line-height: 1.5;
}

/* 底部按钮 */
.footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  border-top: 1rpx solid #E8E3DB;
  padding: 32rpx;
}
.submit-btn {
  width: 100%;
  box-sizing: border-box;
  padding: 28rpx 0;
  background: linear-gradient(to right, var(--brand), #E85D75);
  color: #fff;
  border-radius: 24rpx;
  font-size: 30rpx;
  font-weight: 500;
  text-align: center;
}

/* 弹层 */
.sheet-mask {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
}
.sheet {
  width: 100%;
  background: #fff;
  border-radius: 48rpx 48rpx 0 0;
  max-height: 60vh;
  overflow: hidden;
}
.sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx;
  border-bottom: 1rpx solid #E8E3DB;
}
.sheet-cancel {
  font-size: 28rpx;
  color: #666666;
}
.sheet-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #2C2C2C;
}
.sheet-placeholder {
  width: 64rpx;
}
.cat-grid {
  padding: 32rpx;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 24rpx;
}
.cat-item {
  padding: 24rpx;
  border-radius: 24rpx;
  border: 4rpx solid #E8E3DB;
  background: #FAF8F5;
  color: #2C2C2C;
  text-align: center;
  font-size: 26rpx;
}
.cat-item-active {
  border-color: var(--brand);
  background: #fef2f2;
  color: var(--brand);
}

/* 封面预览 */
.cover-preview { width: 100%; height: 100%; border-radius: 20rpx; }
/* 开播时间：日期 + 时间并排 */
.dt-row { display: flex; gap: 16rpx; }
.dt-flex { flex: 1; }
.picker-val { color: #2C2C2C; }
/* 收费价格 */
.charge-input { margin-top: 24rpx; }
</style>
