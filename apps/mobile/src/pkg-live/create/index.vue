<template>
  <!-- 加载骨架屏 -->
  <view v-if="loading" class="sk-page">
    <view class="sk-cover" />
    <view class="sk-sec"><view class="sk-line sk-w80" /><view class="sk-block sk-h88" /></view>
    <view class="sk-sec"><view class="sk-line sk-w80" /><view class="sk-pills"><view class="sk-block sk-h80 sk-pill" /><view class="sk-block sk-h80 sk-pill" /></view></view>
    <view class="sk-sec"><view class="sk-line sk-w80" /><view class="sk-cards3"><view class="sk-block sk-h152 sk-card" /><view class="sk-block sk-h152 sk-card" /><view class="sk-block sk-h152 sk-card" /></view></view>
    <view class="sk-sec"><view class="sk-block sk-h104" /></view>
    <view class="sk-sec"><view class="sk-block sk-h100 sk-cta" /></view>
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
        <AppIcon name="chevron-left" :size="44" color="#2C2C2C" />
      </view>
      <text class="nav-title">{{ isEdit ? '编辑直播' : '创建直播' }}</text>
      <view class="nav-placeholder" />
    </view>

    <scroll-view scroll-y class="scroll">
      <!-- 封面（9:16 竖版，占屏上部，X5 用固定高度不用 aspect-ratio） -->
      <view class="cover" @tap="uploadCover">
        <template v-if="coverUploading">
          <view class="cover-ring">{{ uploadPct }}%</view>
          <text class="cover-uploading">封面上传中…</text>
        </template>
        <template v-else-if="cover">
          <image class="cover-img" :src="cover" mode="aspectFill" />
          <text class="cover-change">更换封面</text>
        </template>
        <template v-else>
          <view class="cover-plus">+</view>
          <text class="cover-tip">上传直播封面</text>
          <text class="cover-sub">建议 9:16 竖版 · 会展示在直播广场</text>
        </template>
      </view>

      <!-- 推流失败态（创建成功但推流建连失败） -->
      <view v-if="pushFailed" class="sec">
        <view class="pushfail">
          <view class="pushfail-head">
            <view class="pushfail-icon">!</view>
            <text class="pushfail-title">{{ pushFailMsg }}</text>
          </view>
          <text class="pushfail-desc">直播间已创建成功，仅推流未建立，重试不会重复扣时长。若持续失败可稍后到「我的直播」重新开播。</text>
          <view class="pushfail-btns">
            <view class="pushfail-retry" @tap="retryPush">{{ retrying ? '重试中…' : '重试开播' }}</view>
            <view class="pushfail-later" @tap="goManageLater">稍后再播</view>
          </view>
        </view>
      </view>

      <!-- 直播标题 -->
      <view class="sec">
        <view class="label">直播标题 <text class="label-sm">{{ title.length }}/30</text></view>
        <input v-model="title" class="input" :class="{ ph: !title }" placeholder="起个吸引人的标题，如「紫微斗数入门第一课」" placeholder-class="input-ph" maxlength="30" />
      </view>

      <!-- 直播形态 -->
      <view class="sec">
        <view class="label">直播形态</view>
        <view class="pills">
          <view class="pill" :class="{ sel: liveMode === 'vertical' }" @tap="liveMode = 'vertical'">竖屏手机直播</view>
          <view class="pill" :class="{ sel: liveMode === 'obs' }" @tap="liveMode = 'obs'">OBS 电脑直播</view>
        </view>
        <!-- 选 OBS 时出现引导条 → 跳 L2 OBS 流程 -->
        <view v-if="liveMode === 'obs'" class="guide" @tap="navigateTo('/pkg-live/obs/index')">
          <text class="guide-txt">需要电脑推流，创建后按流程配置 OBS</text>
          <text class="guide-link">查看 OBS 开播流程 ›</text>
        </view>
      </view>

      <!-- 付费设置 -->
      <view class="sec">
        <view class="label">付费设置</view>
        <view class="pills">
          <view class="pill" :class="{ sel: !isCharge }" @tap="isCharge = false">免费</view>
          <view class="pill" :class="{ sel: isCharge }" @tap="isCharge = true">付费观看</view>
        </view>
        <view v-if="isCharge" class="charge-input">
          <text class="charge-symbol">¥</text>
          <input v-model="chargePrice" class="charge-field" type="digit" placeholder="0.00" placeholder-class="input-ph" />
          <text class="charge-unit">/ 人</text>
        </view>
      </view>

      <!-- 带货商品（可选，最多 5 件挂车） -->
      <view class="sec">
        <view class="label">带货商品 <text class="label-sm">可选 · 最多 {{ MAX_LIVE_PRODUCTS }} 件</text></view>
        <!-- 未选：入口条 -->
        <view v-if="!selectedProducts.length" class="goods-entry" @tap="openProductSheet">
          <AppIcon name="shopping-bag" :size="32" color="#999999" />
          <text class="goods-entry-txt">从商品库选择要挂车的商品</text>
          <view class="goods-entry-go">
            <text class="goods-entry-go-txt">去选择</text>
            <AppIcon name="chevron-right" :size="28" color="#B8B2A8" />
          </view>
        </view>
        <!-- 已选：横滑小卡 -->
        <scroll-view v-else scroll-x class="goods-strip" :show-scrollbar="false">
          <view class="goods-strip-inner">
            <view v-for="p in selectedProducts" :key="p.id" class="goods-card">
              <view class="goods-card-rm" @tap.stop="removeProduct(p.id)">×</view>
              <image class="goods-card-img" :src="p.cover" mode="aspectFill" />
              <text class="goods-card-name">{{ p.name }}</text>
              <text class="goods-card-price">¥{{ formatPrice(p.price) }}</text>
            </view>
            <view v-if="selectedProducts.length < MAX_LIVE_PRODUCTS" class="goods-card goods-card-add" @tap="openProductSheet">
              <view class="goods-add-plus">+</view>
              <text class="goods-add-txt">添加</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 画质档 -->
      <view class="sec">
        <view class="label">画质档 <text class="label-sm">高清/超清消耗时长包</text></view>
        <view class="cards3">
          <view
            v-for="q in qualityOptions"
            :key="q.value"
            class="qcard"
            :class="{ sel: quality === q.value }"
            @tap="quality = q.value"
          >
            <view v-if="q.value !== 'basic' && lowBalance(q.value)" class="corner" @tap.stop="openBuySheet">去购买</view>
            <text class="qcard-t">{{ q.label }}</text>
            <text v-if="q.value === 'basic'" class="qcard-d">免费</text>
            <text v-else-if="hourRate(q.value)" class="qcard-d"><text class="gold">{{ hourRate(q.value) }}金币</text>/小时</text>
            <text v-else class="qcard-d">转码画质</text>
          </view>
        </view>
        <!-- 剩余时长提示 -->
        <text v-if="quality === 'basic'" class="hint">标清免费，延时约 2-3 秒</text>
        <text v-else-if="remainingForSelected > 0" class="hint">我的剩余时长：<text class="gold">{{ remainingForSelected }} 分钟</text>{{ playableHours }}</text>
        <text v-else class="hint warn" @tap="openBuySheet">剩余时长不足，无法以本档开播，点此购买时长包或改用标清</text>
      </view>

      <!-- 所属圈子 + 开播时间 -->
      <view class="sec">
        <view class="rows">
          <view class="row" :class="{ 'row-locked': isEdit }" @tap="isEdit ? undefined : openCirclePicker()">
            <text class="row-k">所属圈子{{ isEdit ? '（不可更改）' : '' }}</text>
            <view class="row-v">
              <text class="row-v-txt">{{ selectedCircleName || '默认：我的圈子' }}</text>
              <AppIcon v-if="!isEdit" name="chevron-right" :size="32" color="#B8B2A8" />
            </view>
          </view>
          <view class="row" @tap="toggleTimePicker">
            <text class="row-k">开播时间</text>
            <view class="row-v">
              <text class="row-v-txt">{{ startTimeLabel }}</text>
              <AppIcon name="chevron-right" :size="32" color="#B8B2A8" />
            </view>
          </view>
          <!-- 展开的日期/时间选择 -->
          <view v-if="showTimePicker" class="time-expand">
            <picker class="time-pick" mode="date" :start="todayStr" :value="startDate" @change="onDateChange">
              <view class="time-pick-btn">
                <AppIcon name="calendar" :size="34" color="#999999" />
                <text :class="startDate ? 'time-val' : 'time-ph'">{{ startDate || '选择日期' }}</text>
              </view>
            </picker>
            <picker class="time-pick" mode="time" :value="startClock" @change="onTimeChange">
              <view class="time-pick-btn">
                <AppIcon name="clock" :size="34" color="#999999" />
                <text :class="startClock ? 'time-val' : 'time-ph'">{{ startClock || '选择时间' }}</text>
              </view>
            </picker>
            <text class="time-clear" @tap="clearTime">清除（立即开播）</text>
          </view>
        </view>
      </view>

      <view class="foot-space" />
    </scroll-view>

    <!-- 底部主按钮（双文案 + 置灰） -->
    <view class="footer">
      <view class="cta" :class="{ dis: primaryDisabled }" @tap="onPrimary">{{ primaryText }}</view>
    </view>

    <!-- 时长包购买半屏弹层 -->
    <view v-if="showBuySheet" class="mask" @tap="showBuySheet = false">
      <view class="sheet" @tap.stop>
        <view class="sheet-h">
          <text class="sheet-title">购买直播时长包</text>
          <text class="sheet-x" @tap="showBuySheet = false">×</text>
        </view>
        <view v-if="buyPackages.length" class="pkgs">
          <view
            v-for="pkg in buyPackages"
            :key="pkg.id"
            class="pkgc"
            :class="{ sel: selectedPkgId === pkg.id }"
            @tap="selectedPkgId = pkg.id"
          >
            <text class="pkgc-n">{{ pkg.priceCoin }} <text class="pkgc-unit">金币</text></text>
            <text class="pkgc-s">¥{{ pkg.priceYuan }} · {{ pkg.quality === 'hd' ? '高清' : '超清' }}约 {{ formatMinutes(pkg.minutes) }}</text>
          </view>
        </view>
        <text v-else class="pkg-empty">暂无可购买的时长包</text>
        <view class="sheet-note">
          <text class="sheet-note-l">· 国学币充值比例 1 元 = 10 金币（人民币预充值）</text>
          <text class="sheet-note-l">· 时长包按分钟核销，未用完不过期；耗尽自动降标清不中断直播</text>
          <text class="sheet-note-l">· 当前金币余额：<text class="gold">{{ coinBalance ?? '—' }}</text> 金币</text>
        </view>
        <view v-if="selectedPkg" class="cta sheet-cta" :class="{ dis: buyingId !== '' }" @tap="onBuySelected">
          {{ buyBtnText }}
        </view>
      </view>
    </view>

    <!-- 圈子选择弹层 -->
    <view v-if="showCirclePicker" class="mask" @tap="showCirclePicker = false">
      <view class="sheet" @tap.stop>
        <view class="sheet-h">
          <text class="sheet-title">选择所属圈子</text>
          <text class="sheet-x" @tap="showCirclePicker = false">×</text>
        </view>
        <scroll-view scroll-y class="circle-list">
          <view class="circle-item" :class="{ sel: circleId === '' }" @tap="selectCircle('')">
            <text class="circle-name">默认：我的圈子</text>
            <AppIcon v-if="circleId === ''" name="check" :size="34" color="#C41E3A" />
          </view>
          <view
            v-for="c in myOwnedCircles"
            :key="c.id"
            class="circle-item"
            :class="{ sel: circleId === c.id }"
            @tap="selectCircle(c.id)"
          >
            <text class="circle-name">{{ c.name }}</text>
            <AppIcon v-if="circleId === c.id" name="check" :size="34" color="#C41E3A" />
          </view>
          <text v-if="!myOwnedCircles.length" class="circle-empty">暂无可开播的圈子</text>
        </scroll-view>
      </view>
    </view>

    <!-- 带货选品抽屉（半屏 · 多选 · 上限 5 件） -->
    <view v-if="showProductSheet" class="mask" @tap="showProductSheet = false">
      <view class="sheet" @tap.stop>
        <view class="sheet-h">
          <text class="sheet-title">选择带货商品</text>
          <text class="sheet-x" @tap="showProductSheet = false">×</text>
        </view>
        <!-- 搜索 -->
        <view class="goods-search">
          <AppIcon name="search" :size="32" color="#999999" />
          <input
            v-model="productKeyword"
            class="goods-search-field"
            placeholder="搜索商品名称"
            placeholder-class="input-ph"
            confirm-type="search"
            @confirm="searchProducts"
            @input="onKeywordInput"
          />
        </view>
        <!-- 商品列表（多选） -->
        <scroll-view scroll-y class="goods-list">
          <text v-if="poolLoading" class="goods-list-empty">商品加载中…</text>
          <text v-else-if="!productPool.length" class="goods-list-empty">暂无可带货商品</text>
          <view
            v-for="p in productPool"
            :key="p.id"
            class="goods-item"
            @tap="togglePick(p)"
          >
            <image class="goods-item-img" :src="p.cover" mode="aspectFill" />
            <view class="goods-item-info">
              <text class="goods-item-name">{{ p.name }}</text>
              <text class="goods-item-price">¥{{ formatPrice(p.price) }}</text>
            </view>
            <view class="goods-check" :class="{ on: isPicked(p.id) }">
              <AppIcon v-if="isPicked(p.id)" name="check" :size="26" color="#FFFFFF" />
            </view>
          </view>
        </scroll-view>
        <!-- 确认 -->
        <view class="cta sheet-cta" :class="{ dis: !pendingProducts.length }" @tap="confirmPick">
          {{ pendingProducts.length ? `确认挂车（已选 ${pendingProducts.length}/${MAX_LIVE_PRODUCTS} 件）` : '请选择商品（可不选直接关闭）' }}
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { liveApi, type LiveQuota, type LiveQualityPackage, type LivePickerProduct } from '@/lib/live-data'
import { circleApi, type MyCircle } from '@/lib/circle-data'
import { getCoinBalance } from '@/lib/circle-consult-data'
import { uploadImage } from '@/utils/request'

// 三态 UI
const loading = ref(true)
const error = ref('')

// 发布归属圈子：从圈子发布入口带来则默认归该圈子
const editRoomId = ref('')
const isEdit = computed(() => !!editRoomId.value)
const editCircleName = ref('')
const circleId = ref('')

// 直播形态：竖屏手机直播（默认）/ OBS 电脑直播
const liveMode = ref<'vertical' | 'obs'>('vertical')

// 开放范围：V0 未在开播台暴露，统一默认「仅本圈」（后端 CreateRoomDto 默认值）
const visibility = ref<'CIRCLE_ONLY' | 'PLATFORM'>('CIRCLE_ONLY')

// 画质档位（C5 分档商业化）
const quality = ref<'basic' | 'hd' | 'uhd'>('basic')
const quota = ref<LiveQuota>({ hdMinutes: 0, uhdMinutes: 0 })
const qualityOptions = [
  { value: 'basic' as const, label: '标清' },
  { value: 'hd' as const, label: '高清 720P' },
  { value: 'uhd' as const, label: '超清 1080P' },
]
const remainingForSelected = computed(() =>
  quality.value === 'hd' ? quota.value.hdMinutes : quality.value === 'uhd' ? quota.value.uhdMinutes : 0,
)
// 可播时长辅助文案（约 N 小时）
const playableHours = computed(() => {
  const m = remainingForSelected.value
  if (m < 60) return ''
  return `（约可播 ${(m / 60).toFixed(1)} 小时）`
})

// 时长包真实数据：档位单价与内联购买均由此换算，不硬编码金额
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
/** 某档余量是否不足（不足 30 分钟视为不足以开播，对齐 B-01 现稿口径） */
function lowBalance(q: 'basic' | 'hd' | 'uhd'): boolean {
  if (q === 'basic') return false
  return (q === 'hd' ? quota.value.hdMinutes : quota.value.uhdMinutes) < 30
}
function formatMinutes(m: number): string {
  if (!Number.isFinite(m) || m <= 0) return '0 分钟'
  if (m >= 60) {
    const h = Math.floor(m / 60)
    const rest = m % 60
    return rest ? `${h}小时${rest}分` : `${h}小时`
  }
  return `${m} 分钟`
}

// ── 时长包购买弹层 ──
const showBuySheet = ref(false)
const selectedPkgId = ref('')
const buyingId = ref('')
const buyPackages = computed(() =>
  quality.value === 'uhd'
    ? packages.value.filter((p) => p.quality === 'uhd')
    : packages.value.filter((p) => p.quality === 'hd'),
)
const selectedPkg = computed(() => buyPackages.value.find((p) => p.id === selectedPkgId.value) || null)
const buyBtnText = computed(() => {
  if (!selectedPkg.value) return '请选择时长包'
  if (buyingId.value) return '购买中…'
  if (coinBalance.value !== null && coinBalance.value < selectedPkg.value.priceCoin) return '余额不足，去充值'
  return `支付 ${selectedPkg.value.priceCoin} 金币`
})
function openBuySheet() {
  selectedPkgId.value = buyPackages.value[0]?.id || ''
  showBuySheet.value = true
}
async function onBuySelected() {
  const pkg = selectedPkg.value
  if (!pkg || buyingId.value) return
  // 余额不足 → 跳充值
  if (coinBalance.value !== null && coinBalance.value < pkg.priceCoin) {
    navigateTo('/pkg-mine/wallet/recharge')
    return
  }
  buyingId.value = pkg.id
  try {
    quota.value = await liveApi.purchaseQualityPackage(pkg.id)
    coinBalance.value = await getCoinBalance()
    uni.showToast({ title: '购买成功', icon: 'success' })
    showBuySheet.value = false
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '购买失败', icon: 'none' })
  } finally {
    buyingId.value = ''
  }
}

// ── 圈子选择 ──
const myCircles = ref<MyCircle[]>([])
// 仅列我能开播的圈子（owner / admin）
const myOwnedCircles = computed(() => myCircles.value.filter((c) => c.role === 'owner' || c.role === 'admin'))
const selectedCircleName = computed(() => myCircles.value.find((c) => c.id === circleId.value)?.name || editCircleName.value)
const showCirclePicker = ref(false)
function openCirclePicker() { showCirclePicker.value = true }
function selectCircle(id: string) {
  circleId.value = id
  showCirclePicker.value = false
}

// ── 标题 / 封面 ──
const title = ref('')
const cover = ref('')
const coverUploading = ref(false)
const uploadPct = ref(0)
function uploadCover() {
  if (coverUploading.value) return
  uni.chooseImage({ count: 1, success: async (res) => {
    coverUploading.value = true
    uploadPct.value = 20
    try {
      cover.value = await uploadImage(res.tempFilePaths[0])
      uploadPct.value = 100
    } catch (e) {
      uni.showToast({ title: (e as Error)?.message || '封面上传失败', icon: 'none' })
    } finally {
      coverUploading.value = false
    }
  } })
}

// ── 开播时间（不选=立即开播） ──
const startDate = ref('')
const startClock = ref('')
const showTimePicker = ref(false)
const todayStr = (() => { const d = new Date(); const p = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` })()
function onDateChange(e: any) { startDate.value = e.detail.value }
function onTimeChange(e: any) { startClock.value = e.detail.value }
function toggleTimePicker() { showTimePicker.value = !showTimePicker.value }
function clearTime() { startDate.value = ''; startClock.value = ''; showTimePicker.value = false }
const startTime = computed(() => {
  if (!startDate.value || !startClock.value) return ''
  const local = new Date(`${startDate.value}T${startClock.value}:00`)
  return Number.isNaN(local.getTime()) ? '' : local.toISOString()
})
const startTimeLabel = computed(() => (
  startDate.value && startClock.value ? `预约 · ${startDate.value} ${startClock.value}` : '立即开播'
))

// ── 付费设置 ──
const isCharge = ref(false)
const chargePrice = ref('')

// ── 带货商品（可选 · 挂车上限 5 件，对齐观看页购物袋容量口径；后端 DTO productIds 无硬上限，前端收口） ──
const MAX_LIVE_PRODUCTS = 5
const selectedProducts = ref<LivePickerProduct[]>([]) // 已确认挂车的商品
const showProductSheet = ref(false)
const pendingProducts = ref<LivePickerProduct[]>([]) // 抽屉内暂选（确认才生效）
const productPool = ref<LivePickerProduct[]>([]) // 商品库列表（GET /shop/products?status=ON_SALE）
const poolLoading = ref(false)
const productKeyword = ref('')
let keywordTimer: ReturnType<typeof setTimeout> | null = null

function formatPrice(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}
function isPicked(id: string): boolean {
  return pendingProducts.value.some((p) => p.id === id)
}
function openProductSheet() {
  pendingProducts.value = [...selectedProducts.value]
  showProductSheet.value = true
  if (!productPool.value.length && !poolLoading.value) searchProducts()
}
async function searchProducts() {
  poolLoading.value = true
  productPool.value = []
  try {
    productPool.value = await liveApi.getShopProductPool(productKeyword.value.trim() || undefined)
  } finally {
    poolLoading.value = false
  }
}
// 输入即搜（300ms 防抖，避免每键一次请求）
function onKeywordInput() {
  if (keywordTimer) clearTimeout(keywordTimer)
  keywordTimer = setTimeout(searchProducts, 300)
}
function togglePick(p: LivePickerProduct) {
  const idx = pendingProducts.value.findIndex((x) => x.id === p.id)
  if (idx >= 0) {
    pendingProducts.value.splice(idx, 1)
    return
  }
  if (pendingProducts.value.length >= MAX_LIVE_PRODUCTS) {
    uni.showToast({ title: `最多挂车 ${MAX_LIVE_PRODUCTS} 件商品`, icon: 'none' })
    return
  }
  pendingProducts.value.push(p)
}
function confirmPick() {
  if (!pendingProducts.value.length) return
  selectedProducts.value = [...pendingProducts.value]
  showProductSheet.value = false
}
function removeProduct(id: string) {
  selectedProducts.value = selectedProducts.value.filter((p) => p.id !== id)
}

// ── 数据加载 ──
function fillEditForm(room: Awaited<ReturnType<typeof liveApi.getRoomForEdit>>) {
  if (room.status !== 'WAITING') throw new Error('仅待开播的直播可以编辑')
  title.value = room.title
  cover.value = room.cover
  circleId.value = room.circleId
  editCircleName.value = room.circleName
  liveMode.value = room.orientation === 'landscape' ? 'obs' : 'vertical'
  quality.value = room.quality
  isCharge.value = room.chargeType === 'PAID'
  chargePrice.value = room.chargePrice > 0 ? String(room.chargePrice) : ''
  selectedProducts.value = room.products
  if (room.startTime) {
    const d = new Date(room.startTime)
    if (!Number.isNaN(d.getTime())) {
      const pad = (n: number) => String(n).padStart(2, '0')
      startDate.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
      startClock.value = `${pad(d.getHours())}:${pad(d.getMinutes())}`
    }
  }
}

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    // 辅助数据继续 fail-open；编辑主详情失败则进入可重试错误态，避免拿默认值覆盖线上配置。
    const roomPromise = editRoomId.value ? liveApi.getRoomForEdit(editRoomId.value) : Promise.resolve(null)
    const [quotaRes, packagesRes, balanceRes, circlesRes, editRoom] = await Promise.all([
      liveApi.getQuota().catch(() => ({ hdMinutes: 0, uhdMinutes: 0 })),
      liveApi.getQualityPackages().catch(() => []),
      getCoinBalance().catch(() => null),
      circleApi.getMyCircles().catch(() => []),
      roomPromise,
    ])
    quota.value = quotaRes
    packages.value = packagesRes
    coinBalance.value = balanceRes
    myCircles.value = circlesRes
    if (editRoom) fillEditForm(editRoom)
  } catch (e) {
    error.value = (e as Error)?.message || '加载直播信息失败，请重试'
  } finally {
    loading.value = false
  }
}

onLoad((q) => {
  const params = (q || {}) as Record<string, string>
  editRoomId.value = params.id || ''
  circleId.value = params.circleId || ''
  fetchData()
})

// ── 主按钮：双文案 + 置灰 ──
const primaryText = computed(() => {
  if (submitting.value) return isEdit.value ? '保存中…' : '创建中…'
  if (!isEdit.value && quality.value !== 'basic' && remainingForSelected.value <= 0) return '余量不足 · 请购买时长包'
  if (isEdit.value) return '保存修改'
  return liveMode.value === 'obs' || startTime.value ? '创建直播间' : '开始直播'
})
const primaryDisabled = computed(() =>
  !title.value.trim() ||
  coverUploading.value ||
  submitting.value ||
  (!isEdit.value && quality.value !== 'basic' && remainingForSelected.value <= 0),
)

// ── 创建 / 开播（写操作，防重复） ──
const submitting = ref(false)
const createdId = ref('')
const pushFailed = ref(false)
const pushFailMsg = ref('')
const retrying = ref(false)

async function onPrimary() {
  if (primaryDisabled.value) {
    if (!title.value.trim()) uni.showToast({ title: '请输入直播标题', icon: 'none' })
    else if (!isEdit.value && quality.value !== 'basic' && remainingForSelected.value <= 0) openBuySheet()
    return
  }
  const price = isCharge.value ? Number(chargePrice.value) : 0
  if (isCharge.value && !(price > 0)) {
    uni.showToast({ title: '请输入正确的收费金额', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    const common = {
      title: title.value.trim(),
      cover: cover.value || undefined,
      chargeType: (isCharge.value ? 'PAID' : 'FREE') as 'PAID' | 'FREE',
      chargePrice: isCharge.value ? price : null,
      quality: quality.value,
      orientation: (liveMode.value === 'obs' ? 'landscape' : 'portrait') as 'portrait' | 'landscape',
      productIds: selectedProducts.value.map((p) => p.id),
    }
    if (isEdit.value) {
      await liveApi.updateRoom(editRoomId.value, {
        ...common,
        startTime: startTime.value || null,
      })
      uni.showToast({ title: '修改已保存', icon: 'success' })
      setTimeout(() => uni.redirectTo({ url: '/pkg-live/manage/index' }), 700)
      return
    }

    const created = await liveApi.createRoom({
      circleId: circleId.value || undefined,
      ...common,
      startTime: startTime.value || undefined,
      chargePrice: isCharge.value ? price : undefined,
      visibility: visibility.value,
      productIds: common.productIds.length ? common.productIds : undefined,
    })
    createdId.value = created?.id || ''
    // 审核无感化：创建即生效，机审后台异步完成，无审核提示
    // OBS 场景 → 跳 L2 完成开播；预约 → 回我的直播；立即+竖屏 → 直接开播进控制台
    if (liveMode.value === 'obs') {
      uni.showToast({ title: '创建成功', icon: 'success' })
      setTimeout(() => uni.redirectTo({ url: `/pkg-live/obs/index?id=${created.id}` }), 600)
    } else if (startTime.value) {
      uni.showToast({ title: '预约成功', icon: 'success' })
      setTimeout(() => uni.redirectTo({ url: '/pkg-live/manage/index' }), 800)
    } else {
      await startLiveNow(created.id)
    }
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '创建失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

// 立即开播：成功进控制台；失败进推流失败态（A-06，可退化为通用文案）
async function startLiveNow(id: string) {
  try {
    await liveApi.startLive(id)
    uni.redirectTo({ url: `/pkg-live/console/index?id=${id}` })
  } catch (e) {
    pushFailMsg.value = (e as Error)?.message || '开播失败：推流未建立'
    pushFailed.value = true
  }
}
async function retryPush() {
  if (retrying.value || !createdId.value) return
  retrying.value = true
  try {
    await liveApi.startLive(createdId.value)
    uni.redirectTo({ url: `/pkg-live/console/index?id=${createdId.value}` })
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '仍未成功，可稍后到「我的直播」重试', icon: 'none' })
  } finally {
    retrying.value = false
  }
}
function goManageLater() {
  uni.redirectTo({ url: '/pkg-live/manage/index' })
}
</script>

<style scoped>
/* 骨架屏 */
.sk-page { min-height: 100vh; background: #FAF8F5; }
.sk-cover { height: 464rpx; background: #F0EBE2; }
.sk-sec { padding: 32rpx 40rpx 0; }
.sk-line { height: 28rpx; border-radius: 8rpx; margin-bottom: 20rpx; background: #EFEAE1; }
.sk-w80 { width: 160rpx; }
.sk-block { border-radius: 24rpx; background: linear-gradient(90deg, #EFEAE1 25%, #F7F4EE 50%, #EFEAE1 75%); background-size: 200% 100%; animation: sk 1.4s infinite; }
@keyframes sk { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.sk-h88 { height: 88rpx; }
.sk-h80 { height: 80rpx; }
.sk-h104 { height: 104rpx; }
.sk-h152 { height: 152rpx; }
.sk-h100 { height: 100rpx; }
.sk-pills { display: flex; gap: 24rpx; }
.sk-cards3 { display: flex; gap: 20rpx; }
.sk-pill { flex: 1; border-radius: 999rpx; }
.sk-card { flex: 1; border-radius: 36rpx; }
.sk-cta { border-radius: 999rpx; }

/* 错误状态 */
.error-state { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #FAF8F5; padding: 48rpx; }
.error-text { font-size: 28rpx; color: #999; margin-bottom: 32rpx; }
.retry-btn { padding: 20rpx 64rpx; background: #C41E3A; color: #fff; border-radius: 24rpx; font-size: 28rpx; }

/* 页面 */
.page { display: flex; flex-direction: column; height: 100vh; background: #FAF8F5; }

/* 导航 */
.nav { flex-shrink: 0; background: #FAF8F5; height: 96rpx; padding: 0 32rpx; display: flex; align-items: center; justify-content: space-between; }
.nav-btn { margin-left: -8rpx; width: 48rpx; height: 48rpx; display: flex; align-items: center; }
.nav-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.nav-placeholder { width: 48rpx; }

.scroll { flex: 1; }

/* 封面 9:16 竖版（固定高度，X5 安全） */
.cover { height: 464rpx; background: #F0EBE2; border-top: 1rpx solid #E8E2D8; border-bottom: 1rpx solid #E8E2D8; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12rpx; position: relative; overflow: hidden; }
.cover-img { width: 100%; height: 100%; }
.cover-change { position: absolute; right: 20rpx; bottom: 20rpx; background: rgba(0,0,0,.55); color: #fff; font-size: 22rpx; padding: 8rpx 20rpx; border-radius: 999rpx; }
.cover-plus { width: 88rpx; height: 88rpx; border-radius: 50%; background: #fff; border: 1rpx solid #E8E2D8; display: flex; align-items: center; justify-content: center; font-size: 48rpx; color: #C9A96E; }
.cover-tip { font-size: 26rpx; color: #6E6E73; }
.cover-sub { font-size: 22rpx; color: #B8B2A8; }
.cover-ring { width: 96rpx; height: 96rpx; border-radius: 50%; border: 6rpx solid #E8E2D8; border-top-color: #C41E3A; display: flex; align-items: center; justify-content: center; font-size: 22rpx; color: #6E6E73; }
.cover-uploading { font-size: 24rpx; color: #6E6E73; }

/* 分区 */
.sec { padding: 32rpx 40rpx 0; }
.label { font-size: 28rpx; font-weight: 600; color: #2C2C2C; margin-bottom: 16rpx; display: flex; align-items: baseline; gap: 12rpx; }
.label-sm { font-size: 24rpx; font-weight: 400; color: #999; }

/* 输入框 */
.input { height: 88rpx; box-sizing: border-box; border: 1rpx solid #E8E2D8; border-radius: 24rpx; padding: 0 28rpx; font-size: 28rpx; color: #2C2C2C; background: #fff; }
.input-ph { color: #B8B2A8; }

/* 胶囊单选 */
.pills { display: flex; gap: 24rpx; }
.pill { flex: 1; height: 80rpx; border: 1rpx solid #E8E2D8; background: #fff; border-radius: 999rpx; display: flex; align-items: center; justify-content: center; font-size: 28rpx; color: #6E6E73; }
.pill.sel { border: 1rpx solid #C41E3A; color: #C41E3A; font-weight: 600; background: #FBF0F2; }

/* OBS 引导条 */
.guide { margin-top: 20rpx; background: #FBF6EC; border: 1rpx solid #EDDFC6; border-radius: 24rpx; padding: 20rpx 24rpx; display: flex; justify-content: space-between; align-items: center; }
.guide-txt { font-size: 24rpx; color: #8A6D3B; flex: 1; }
.guide-link { font-size: 24rpx; color: #C41E3A; font-weight: 600; flex-shrink: 0; }

/* 付费金额 */
.charge-input { margin-top: 20rpx; height: 88rpx; box-sizing: border-box; border: 1rpx solid #E8E2D8; border-radius: 24rpx; padding: 0 28rpx; background: #fff; display: flex; align-items: center; }
.charge-symbol { font-size: 30rpx; font-weight: 700; color: #C41E3A; }
.charge-field { flex: 1; margin-left: 12rpx; font-size: 28rpx; color: #2C2C2C; }
.charge-unit { font-size: 24rpx; color: #B8B2A8; }

/* 画质三卡 */
.cards3 { display: flex; gap: 20rpx; }
.qcard { flex: 1; border: 1rpx solid #E8E2D8; background: #fff; border-radius: 36rpx; padding: 24rpx 8rpx; display: flex; flex-direction: column; align-items: center; gap: 8rpx; position: relative; }
.qcard.sel { border: 1rpx solid #C41E3A; background: #FBF0F2; }
.qcard-t { font-size: 26rpx; font-weight: 600; color: #2C2C2C; }
.qcard.sel .qcard-t { color: #C41E3A; }
.qcard-d { font-size: 22rpx; color: #999; }
.gold { color: #C9A96E; font-weight: 600; }
.corner { position: absolute; top: -12rpx; right: -8rpx; background: #C41E3A; color: #fff; font-size: 20rpx; padding: 4rpx 16rpx; border-radius: 999rpx; }
.hint { display: block; font-size: 24rpx; color: #999; margin-top: 16rpx; }
.hint.warn { color: #C41E3A; font-weight: 600; }

/* 行式设置 */
.rows { background: #fff; border-radius: 36rpx; border: 1rpx solid #F0EBE2; padding: 0 28rpx; }
.row { min-height: 104rpx; display: flex; align-items: center; justify-content: space-between; border-bottom: 1rpx solid #F5F1EA; }
.row:last-child { border-bottom: none; }
.row-k { font-size: 28rpx; color: #2C2C2C; }
.row-v { display: flex; align-items: center; gap: 8rpx; }
.row-locked { opacity: .72; }
.row-v-txt { font-size: 26rpx; color: #999; }
.time-expand { padding: 20rpx 0 24rpx; display: flex; flex-direction: column; gap: 16rpx; border-top: 1rpx solid #F5F1EA; }
.time-pick-btn { height: 80rpx; border: 1rpx solid #E8E2D8; border-radius: 20rpx; background: #FAF8F5; display: flex; align-items: center; gap: 12rpx; padding: 0 24rpx; }
.time-ph { font-size: 26rpx; color: #B8B2A8; }
.time-val { font-size: 26rpx; color: #2C2C2C; }
.time-clear { font-size: 24rpx; color: #C41E3A; text-align: center; }

/* 推流失败态 */
.pushfail { background: #FDF3F0; border: 1rpx solid #F0C9BE; border-radius: 24rpx; padding: 28rpx; }
.pushfail-head { display: flex; align-items: center; gap: 16rpx; margin-bottom: 12rpx; }
.pushfail-icon { width: 36rpx; height: 36rpx; border-radius: 50%; background: #C41E3A; color: #fff; font-size: 24rpx; display: flex; align-items: center; justify-content: center; }
.pushfail-title { font-size: 28rpx; font-weight: 600; color: #C41E3A; }
.pushfail-desc { font-size: 24rpx; color: #8A6D3B; line-height: 1.7; }
.pushfail-btns { display: flex; gap: 20rpx; margin-top: 24rpx; }
.pushfail-retry { flex: 1; height: 76rpx; border-radius: 999rpx; background: #C41E3A; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 28rpx; font-weight: 600; }
.pushfail-later { flex: 1; height: 76rpx; border-radius: 999rpx; border: 1rpx solid #E8E2D8; background: #fff; color: #6E6E73; display: flex; align-items: center; justify-content: center; font-size: 28rpx; }

.foot-space { height: 48rpx; }

/* 底部按钮 */
.footer { flex-shrink: 0; background: #FAF8F5; padding: 20rpx 40rpx calc(20rpx + env(safe-area-inset-bottom)); }
.cta { height: 100rpx; border-radius: 999rpx; background: #C41E3A; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 32rpx; font-weight: 600; box-shadow: 0 8rpx 24rpx rgba(196,30,58,.25); }
.cta.dis { background: #DDD5C8; box-shadow: none; }

/* 半屏弹层 */
.mask { position: fixed; inset: 0; z-index: 50; background: rgba(0,0,0,.45); display: flex; align-items: flex-end; }
.sheet { width: 100%; background: #FAF8F5; border-radius: 36rpx 36rpx 0 0; padding: 40rpx; box-sizing: border-box; }
.sheet-h { display: flex; align-items: center; justify-content: center; position: relative; margin-bottom: 32rpx; }
.sheet-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.sheet-x { position: absolute; right: 0; top: -8rpx; font-size: 40rpx; color: #999; line-height: 1; }

/* 时长包档卡 */
.pkgs { display: flex; gap: 20rpx; margin-bottom: 24rpx; }
.pkgc { flex: 1; border: 1rpx solid #E8E2D8; background: #fff; border-radius: 36rpx; padding: 28rpx 8rpx; display: flex; flex-direction: column; align-items: center; gap: 8rpx; }
.pkgc.sel { border: 1rpx solid #C9A96E; background: #FBF6EC; }
.pkgc-n { font-size: 34rpx; font-weight: 700; color: #C9A96E; font-family: "SF Mono", Menlo, Consolas, monospace; }
.pkgc-unit { font-size: 22rpx; font-weight: 400; color: #999; }
.pkgc-s { font-size: 22rpx; color: #999; text-align: center; }
.pkg-empty { display: block; text-align: center; font-size: 26rpx; color: #999; padding: 40rpx 0; }
.sheet-note { display: flex; flex-direction: column; gap: 8rpx; margin-bottom: 8rpx; }
.sheet-note-l { font-size: 22rpx; color: #999; line-height: 1.6; }
.sheet-cta { margin-top: 24rpx; }

/* 带货商品：入口条 */
.goods-entry { height: 88rpx; box-sizing: border-box; border: 1rpx solid #E8E2D8; border-radius: 24rpx; background: #fff; display: flex; align-items: center; gap: 16rpx; padding: 0 28rpx; }
.goods-entry-txt { flex: 1; font-size: 26rpx; color: #B8B2A8; }
.goods-entry-go { display: flex; align-items: center; gap: 4rpx; flex-shrink: 0; }
.goods-entry-go-txt { font-size: 24rpx; color: #C41E3A; font-weight: 600; }

/* 带货商品：已选横滑小卡 */
.goods-strip { width: 100%; white-space: nowrap; }
.goods-strip-inner { display: flex; gap: 20rpx; padding: 8rpx 4rpx 8rpx 0; }
.goods-card { width: 176rpx; flex-shrink: 0; background: #fff; border: 1rpx solid #E8E2D8; border-radius: 24rpx; padding: 12rpx; box-sizing: border-box; display: flex; flex-direction: column; gap: 8rpx; position: relative; }
.goods-card-rm { position: absolute; top: -12rpx; right: -12rpx; z-index: 2; width: 40rpx; height: 40rpx; border-radius: 50%; background: rgba(0,0,0,.55); color: #fff; font-size: 28rpx; line-height: 1; display: flex; align-items: center; justify-content: center; }
.goods-card-img { width: 152rpx; height: 152rpx; border-radius: 16rpx; background: #F0EBE2; }
.goods-card-name { font-size: 22rpx; color: #2C2C2C; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.goods-card-price { font-size: 24rpx; font-weight: 700; color: #C41E3A; }
.goods-card-add { align-items: center; justify-content: center; border-style: dashed; min-height: 232rpx; }
.goods-add-plus { font-size: 48rpx; color: #C9A96E; line-height: 1; }
.goods-add-txt { font-size: 22rpx; color: #999; }

/* 带货选品抽屉 */
.goods-search { height: 76rpx; box-sizing: border-box; border: 1rpx solid #E8E2D8; border-radius: 999rpx; background: #fff; display: flex; align-items: center; gap: 12rpx; padding: 0 28rpx; margin-bottom: 24rpx; }
.goods-search-field { flex: 1; font-size: 26rpx; color: #2C2C2C; }
.goods-list { max-height: 560rpx; }
.goods-list-empty { display: block; text-align: center; font-size: 26rpx; color: #999; padding: 48rpx 0; }
.goods-item { display: flex; align-items: center; gap: 20rpx; padding: 20rpx 8rpx; border-bottom: 1rpx solid #F0EBE2; }
.goods-item-img { width: 96rpx; height: 96rpx; border-radius: 16rpx; background: #F0EBE2; flex-shrink: 0; }
.goods-item-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6rpx; }
.goods-item-name { font-size: 26rpx; color: #2C2C2C; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.goods-item-price { font-size: 26rpx; font-weight: 700; color: #C41E3A; }
.goods-check { width: 40rpx; height: 40rpx; border-radius: 50%; border: 2rpx solid #D8D2C6; background: #fff; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.goods-check.on { border-color: #C41E3A; background: #C41E3A; }

/* 圈子选择 */
.circle-list { max-height: 640rpx; }
.circle-item { min-height: 104rpx; display: flex; align-items: center; justify-content: space-between; padding: 0 8rpx; border-bottom: 1rpx solid #F0EBE2; }
.circle-item.sel .circle-name { color: #C41E3A; font-weight: 600; }
.circle-name { font-size: 28rpx; color: #2C2C2C; }
.circle-empty { display: block; text-align: center; font-size: 26rpx; color: #999; padding: 48rpx 0; }
</style>
