<!--
  B9 · 消息中心（V0 重构版）
  合并原 notices / inquiries / violations 三页为单页三态 Tab：
    ①平台通知(getNotices) ②客户咨询(getInquiries·后端未实现→诚实空态) ③违规处置(getViolations·只读+申诉 appealViolation)
  Tab 上带未读红点角标。违规记录由平台后台产生，商家侧只读，可申诉。
  设计token：页底#FAF8F5 / 卡片#FFF / 朱红#C41E3A / 金#C9A96E / 描边#EDEAE4 / 圆角18px / 胶囊999px
-->
<template>
  <view class="page">
    <!-- 顶部导航（朱红渐变） -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-back" @tap="goBack">
          <app-icon name="arrow-left" :size="22" color="#ffffff" />
        </view>
        <text class="nav-title">消息中心</text>
        <view class="nav-placeholder" />
      </view>
    </view>

    <!-- 三态 Tab（带未读红点角标） -->
    <view class="segs" :style="{ top: navHeight + 'px' }">
      <view
        v-for="tab in tabs"
        :key="tab.key"
        class="seg"
        :class="{ on: active === tab.key }"
        @tap="switchTab(tab.key)"
      >
        <text class="seg-text">{{ tab.label }}</text>
        <view v-if="badgeOf(tab.key) > 0" class="seg-rd">
          <text class="seg-rd-text">{{ badgeOf(tab.key) > 99 ? '99+' : badgeOf(tab.key) }}</text>
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="scroll" :style="{ paddingTop: scrollTop + 'px' }">
      <!-- ══════════ 态A 平台通知 ══════════ -->
      <template v-if="active === 'notices'">
        <view v-if="noticeState.loading" class="state"><text class="state-text">加载中…</text></view>
        <view v-else-if="noticeState.error" class="state">
          <app-icon name="alert-circle" :size="40" color="#dc2626" />
          <text class="state-text">{{ noticeState.error }}</text>
          <view class="state-btn" @tap="loadNotices"><text class="state-btn-text">重试</text></view>
        </view>
        <view v-else-if="notices.length === 0" class="state">
          <app-icon name="bell" :size="40" color="#C9A96E" />
          <text class="state-text">暂无平台通知</text>
        </view>
        <view v-else class="body">
          <view
            v-for="n in notices"
            :key="n.id"
            class="ncard"
            :class="{ unread: !n.read }"
            @tap="openNotice(n)"
          >
            <view class="nhead">
              <text class="ntag" :class="{ sys: n.type === 'system' || n.type === 'important' }">{{ n.category || typeLabel(n.type) }}</text>
              <text class="ntime">{{ formatTime(n.time) }}</text>
            </view>
            <text class="ntitle">{{ n.title }}</text>
            <text class="ntext">{{ n.content }}</text>
          </view>
        </view>
      </template>

      <!-- ══════════ 态B 客户咨询 ══════════ -->
      <template v-else-if="active === 'inquiries'">
        <view v-if="inquiryState.loading" class="state"><text class="state-text">加载中…</text></view>
        <view v-else-if="inquiryState.error" class="state">
          <app-icon name="alert-circle" :size="40" color="#dc2626" />
          <text class="state-text">{{ inquiryState.error }}</text>
          <view class="state-btn" @tap="loadInquiries"><text class="state-btn-text">重试</text></view>
        </view>
        <view v-else-if="inquiries.length === 0" class="state">
          <view class="ph-icon"><app-icon name="message-square" :size="36" color="#C41E3A" /></view>
          <text class="state-text">暂无客户咨询</text>
          <text class="state-sub">在线咨询功能正在建设中，当前客户沟通请通过「订单售后」处理。</text>
        </view>
        <view v-else class="body">
          <view
            v-for="q in inquiries"
            :key="String(q.id)"
            class="icard"
            :class="{ wait: !q.reply }"
          >
            <view class="iuser">
              <view class="iavatar" />
              <text class="iuser-name">{{ q.nickname || '匿名客户' }}</text>
              <text class="iuser-dot"> · </text>
              <text :class="q.reply ? 'st-done' : 'st-wait'">{{ q.reply ? '已回复' : '待回复' }}</text>
            </view>
            <view v-if="q.productTitle" class="iprod"><text class="iprod-text">关于商品：{{ q.productTitle }}</text></view>
            <text class="imsg">{{ q.content }}</text>
            <view v-if="q.reply" class="ianswer"><text class="ianswer-text">商家回复：{{ q.reply }}</text></view>
            <view v-else class="ibtn" @tap="onReply(q)"><text class="ibtn-text">回复</text></view>
          </view>
        </view>
      </template>

      <!-- ══════════ 态C 违规处置（只读+申诉） ══════════ -->
      <template v-else>
        <view v-if="violationState.loading" class="state"><text class="state-text">加载中…</text></view>
        <view v-else-if="violationState.error" class="state">
          <app-icon name="alert-circle" :size="40" color="#dc2626" />
          <text class="state-text">{{ violationState.error }}</text>
          <view class="state-btn" @tap="loadViolations"><text class="state-btn-text">重试</text></view>
        </view>
        <view v-else class="body">
          <view class="banner-warn">
            <text class="banner-warn-text">违规记录由平台管理后台产生，商家侧只读；如有异议可提交申诉。</text>
          </view>

          <view v-if="violations.length === 0" class="empty">
            <text class="empty-text">暂无违规记录 · 请继续保持合规经营</text>
          </view>

          <view v-else>
            <view v-for="v in violations" :key="v.id" class="vcard">
              <view class="vhead">
                <text class="vlevel">{{ typeConfig[v.type]?.label || v.type }}违规</text>
                <text class="ntime">{{ formatTime(v.createdAt) }}</text>
              </view>
              <text class="vtitle">{{ v.title }}</text>
              <text class="vtext">{{ v.description }}</text>
              <view class="vinfo">
                <view class="vinfo-row">
                  <text class="vinfo-label">当前状态：</text>
                  <text class="vinfo-val" :style="{ color: statusConfig[v.status]?.color }">{{ statusConfig[v.status]?.label || v.status }}</text>
                </view>
                <view v-if="Number(v.penalty) > 0" class="vinfo-row">
                  <text class="vinfo-label">罚款：</text>
                  <text class="vinfo-hl">¥{{ Number(v.penalty) }}</text>
                </view>
              </view>

              <!-- 已申诉：展示申诉内容 -->
              <view v-if="v.appeal" class="appeal-box">
                <view class="appeal-head">
                  <app-icon name="message-square" :size="14" color="#C41E3A" />
                  <text class="appeal-tag">我的申诉</text>
                  <text v-if="v.appealAt" class="appeal-time">{{ formatTime(v.appealAt) }}</text>
                </view>
                <text class="appeal-text">{{ v.appeal }}</text>
              </view>

              <!-- 待处理且未申诉：可申诉 -->
              <view
                v-else-if="v.status === 'PENDING'"
                class="vappeal"
                :class="{ 'vappeal-disabled': submittingId === v.id }"
                @tap="onAppeal(v)"
              >
                <text class="vappeal-text">{{ submittingId === v.id ? '提交中…' : '我要申诉' }}</text>
              </view>
            </view>
          </view>
        </view>
      </template>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import {
  merchantBackendApi,
  violationTypeConfig,
  violationStatusConfig,
  type MerchantNotice,
  type MerchantViolation,
} from '@/pkg-merchant/lib/merchant-data'

// 咨询后端未实现（getInquiries 诚实降级返回空），结构未定 → 宽松记录类型
type MerchantInquiry = {
  id: string | number
  nickname?: string
  productTitle?: string
  content?: string
  reply?: string | null
  [k: string]: unknown
}

const statusBarHeight = ref(0)
const navHeight = ref(44)
const scrollTop = ref(0)

const sys = uni.getSystemInfoSync()
statusBarHeight.value = sys.statusBarHeight || 0
navHeight.value = (sys.statusBarHeight || 0) + 44
// segs 高度约 46px，scroll 内容起点 = nav + segs
scrollTop.value = navHeight.value + 46

const typeConfig = violationTypeConfig
const statusConfig = violationStatusConfig

type TabKey = 'notices' | 'inquiries' | 'violations'
const tabs: { key: TabKey; label: string }[] = [
  { key: 'notices', label: '平台通知' },
  { key: 'inquiries', label: '客户咨询' },
  { key: 'violations', label: '违规处置' },
]
const active = ref<TabKey>('notices')

// 各态数据
const notices = ref<MerchantNotice[]>([])
const inquiries = ref<MerchantInquiry[]>([])
const violations = ref<MerchantViolation[]>([])

// 各态独立加载/错误态
const noticeState = reactive({ loading: false, error: '', loaded: false })
const inquiryState = reactive({ loading: false, error: '', loaded: false })
const violationState = reactive({ loading: false, error: '', loaded: false })

const submittingId = ref('')

// 未读红点角标（真实数据聚合）
function badgeOf(key: TabKey): number {
  if (key === 'notices') return notices.value.filter((n) => !n.read).length
  if (key === 'inquiries') return inquiries.value.filter((q) => !q.reply).length
  return violations.value.filter((v) => v.status === 'PENDING' && !v.appeal).length
}

function typeLabel(type: string): string {
  const map: Record<string, string> = {
    system: '系统',
    important: '重要',
    activity: '活动',
    warning: '提醒',
  }
  return map[type] || '通知'
}

function formatTime(t?: string | null): string {
  if (!t) return ''
  return String(t).replace('T', ' ').slice(0, 16)
}

function switchTab(key: TabKey) {
  if (active.value === key) return
  active.value = key
  ensureLoaded(key)
}

function ensureLoaded(key: TabKey) {
  if (key === 'notices' && !noticeState.loaded) loadNotices()
  else if (key === 'inquiries' && !inquiryState.loaded) loadInquiries()
  else if (key === 'violations' && !violationState.loaded) loadViolations()
}

async function loadNotices() {
  noticeState.loading = true
  noticeState.error = ''
  try {
    notices.value = await merchantBackendApi.getNotices()
    noticeState.loaded = true
  } catch (e) {
    noticeState.error = (e as Error)?.message || '加载失败'
  } finally {
    noticeState.loading = false
  }
}

async function loadInquiries() {
  inquiryState.loading = true
  inquiryState.error = ''
  try {
    const res = await merchantBackendApi.getInquiries({ page: 1, pageSize: 100 })
    inquiries.value = (res.items || []) as MerchantInquiry[]
    inquiryState.loaded = true
  } catch (e) {
    inquiryState.error = (e as Error)?.message || '加载失败'
  } finally {
    inquiryState.loading = false
  }
}

async function loadViolations() {
  violationState.loading = true
  violationState.error = ''
  try {
    const res = await merchantBackendApi.getViolations({ page: 1, pageSize: 100 })
    violations.value = res.items
    violationState.loaded = true
  } catch (e) {
    violationState.error = (e as Error)?.message || '加载失败'
  } finally {
    violationState.loading = false
  }
}

function openNotice(n: MerchantNotice) {
  // 通知详情弹窗展示（本页无独立详情路由，复用系统弹窗，避免造假跳转）
  uni.showModal({
    title: n.title,
    content: n.content,
    showCancel: false,
    confirmText: '知道了',
  })
  if (!n.read) n.read = true
}

function onReply(q: MerchantInquiry) {
  uni.showModal({
    title: '回复客户',
    editable: true,
    placeholderText: '请输入回复内容…',
    success: (r) => {
      if (!r.confirm) return
      const text = (r.content || '').trim()
      if (!text) {
        uni.showToast({ title: '请输入回复内容', icon: 'none' })
        return
      }
      // 咨询回复端点后端未实现，暂本地占位提示（不造假成功写库）
      uni.showToast({ title: '回复功能建设中', icon: 'none' })
    },
  })
}

function onAppeal(v: MerchantViolation) {
  if (submittingId.value) return
  uni.showModal({
    title: '提交申诉',
    editable: true,
    placeholderText: '请输入申诉理由…',
    success: async (r) => {
      if (!r.confirm) return
      const text = (r.content || '').trim()
      if (!text) {
        uni.showToast({ title: '请输入申诉理由', icon: 'none' })
        return
      }
      submittingId.value = v.id
      try {
        await merchantBackendApi.appealViolation(v.id, text)
        uni.showToast({ title: '申诉已提交', icon: 'success' })
        violationState.loaded = false
        await loadViolations()
      } catch (e) {
        uni.showToast({ title: (e as Error)?.message || '提交失败', icon: 'none' })
      } finally {
        submittingId.value = ''
      }
    },
  })
}

onMounted(() => loadNotices())
</script>

<style lang="scss" scoped>
$paper: #faf8f5;
$card: #ffffff;
$red: #c41e3a;
$gold: #c9a96e;
$t1: #2c2c2c;
$t2: #6e6e73;
$t3: #999999;
$line: #edeae4;

.page {
  min-height: 100vh;
  background: $paper;
}

/* 顶部导航 */
.nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 60;
  background: linear-gradient(135deg, #c41e3a, #a01830);
}
.nav-bar {
  display: flex;
  align-items: center;
  height: 44px;
  padding: 0 16px;
}
.nav-back {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
}
.nav-title {
  flex: 1;
  text-align: center;
  font-size: 34rpx;
  font-weight: 700;
  color: #ffffff;
}
.nav-placeholder {
  width: 32px;
}

/* 三态 Tab */
.segs {
  position: fixed;
  left: 0;
  right: 0;
  z-index: 55;
  display: flex;
  background: $card;
  border-bottom: 1px solid $line;
}
.seg {
  flex: 1;
  position: relative;
  padding: 26rpx 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.seg-text {
  font-size: 26rpx;
  color: $t2;
}
.seg.on .seg-text {
  color: $red;
  font-weight: 600;
}
.seg.on::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 56rpx;
  height: 6rpx;
  background: $red;
  border-radius: 4rpx;
}
.seg-rd {
  position: absolute;
  top: 12rpx;
  right: 40rpx;
  min-width: 30rpx;
  height: 30rpx;
  padding: 0 8rpx;
  border-radius: 999px;
  background: $red;
  display: flex;
  align-items: center;
  justify-content: center;
}
.seg-rd-text {
  font-size: 18rpx;
  color: #ffffff;
  line-height: 1;
}

/* 滚动区 */
.scroll {
  height: 100vh;
  box-sizing: border-box;
  padding-bottom: 40rpx;
}
.body {
  padding: 28rpx 40rpx 60rpx;
}

/* ── 态A 通知卡 ── */
.ncard {
  background: $card;
  border-radius: 18px;
  padding: 28rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
}
.ncard.unread {
  border-left: 6rpx solid $red;
}
.nhead {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}
.ntag {
  font-size: 20rpx;
  color: $t2;
  border: 1px solid #dddddd;
  border-radius: 8rpx;
  padding: 2rpx 16rpx;
}
.ntag.sys {
  color: #8a6d2f;
  border-color: $gold;
  background: #fbf7ef;
}
.ntime {
  font-size: 22rpx;
  color: $t3;
}
.ntitle {
  font-size: 28rpx;
  font-weight: 600;
  color: $t1;
  display: block;
  margin-bottom: 8rpx;
}
.ntext {
  font-size: 24rpx;
  color: $t2;
  line-height: 1.6;
  display: block;
}

/* ── 态B 咨询卡 ── */
.icard {
  background: $card;
  border-radius: 18px;
  padding: 28rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
}
.icard.wait {
  border: 1px solid #f0d0d5;
}
.iuser {
  display: flex;
  align-items: center;
  font-size: 24rpx;
  color: $t2;
  margin-bottom: 16rpx;
}
.iavatar {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #e8dfd3, #d8ccb8);
  margin-right: 16rpx;
}
.iuser-name {
  color: $t2;
}
.iuser-dot {
  color: $t3;
}
.st-wait {
  color: $red;
}
.st-done {
  color: $t3;
}
.iprod {
  background: #fbf7ef;
  border-radius: 10rpx;
  padding: 12rpx 20rpx;
  margin-bottom: 16rpx;
}
.iprod-text {
  font-size: 22rpx;
  color: #8a6d2f;
}
.imsg {
  font-size: 26rpx;
  color: $t1;
  line-height: 1.6;
  display: block;
  margin-bottom: 20rpx;
}
.ianswer {
  background: #f5f1ea;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
}
.ianswer-text {
  font-size: 24rpx;
  color: $t2;
  line-height: 1.6;
}
.ibtn {
  display: inline-flex;
  align-self: flex-start;
  border-radius: 999px;
  padding: 12rpx 36rpx;
  background: $red;
}
.ibtn-text {
  font-size: 24rpx;
  color: #ffffff;
}

/* ── 态C 违规卡 ── */
.banner-warn {
  background: #fbeff0;
  border-radius: 12px;
  padding: 20rpx 28rpx;
  margin-bottom: 28rpx;
}
.banner-warn-text {
  font-size: 22rpx;
  color: $red;
  line-height: 1.6;
}
.vcard {
  background: $card;
  border: 1px solid #f0d0d5;
  border-radius: 18px;
  padding: 28rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
}
.vhead {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}
.vlevel {
  font-size: 22rpx;
  font-weight: 600;
  color: #ffffff;
  background: $red;
  border-radius: 8rpx;
  padding: 4rpx 20rpx;
}
.vtitle {
  font-size: 28rpx;
  font-weight: 600;
  color: $t1;
  display: block;
  margin-bottom: 12rpx;
}
.vtext {
  font-size: 24rpx;
  color: $t2;
  line-height: 1.6;
  display: block;
  margin-bottom: 16rpx;
}
.vinfo {
  border-top: 1px dashed $line;
  padding-top: 16rpx;
}
.vinfo-row {
  display: flex;
  align-items: center;
  line-height: 1.8;
}
.vinfo-label {
  font-size: 22rpx;
  color: $t3;
}
.vinfo-val {
  font-size: 22rpx;
}
.vinfo-hl {
  font-size: 22rpx;
  color: $red;
  font-weight: 600;
}
.appeal-box {
  margin-top: 16rpx;
  background: #f5f1ea;
  border-radius: 12rpx;
  padding: 16rpx 20rpx;
}
.appeal-head {
  display: flex;
  align-items: center;
  margin-bottom: 8rpx;
}
.appeal-tag {
  font-size: 22rpx;
  color: $red;
  font-weight: 500;
  margin-left: 8rpx;
}
.appeal-time {
  font-size: 20rpx;
  color: $t3;
  margin-left: auto;
}
.appeal-text {
  font-size: 24rpx;
  color: $t1;
  line-height: 1.6;
}
.vappeal {
  margin-top: 20rpx;
  display: inline-flex;
  align-self: flex-start;
  border: 1px solid $t2;
  border-radius: 999px;
  padding: 12rpx 36rpx;
  background: #ffffff;
}
.vappeal-disabled {
  opacity: 0.5;
}
.vappeal-text {
  font-size: 24rpx;
  color: $t2;
}
.empty {
  text-align: center;
  padding: 48rpx;
}
.empty-text {
  font-size: 24rpx;
  color: $gold;
}

/* ── 状态态 ── */
.state {
  padding: 160rpx 48rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
}
.ph-icon {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: rgba(196, 30, 58, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
}
.state-text {
  font-size: 28rpx;
  color: $t2;
  text-align: center;
}
.state-sub {
  font-size: 24rpx;
  color: $t3;
  line-height: 1.6;
  text-align: center;
}
.state-btn {
  margin-top: 8rpx;
  padding: 16rpx 48rpx;
  border: 1px solid #d1d5db;
  border-radius: 12rpx;
}
.state-btn-text {
  font-size: 26rpx;
  color: #4b5563;
}
</style>
