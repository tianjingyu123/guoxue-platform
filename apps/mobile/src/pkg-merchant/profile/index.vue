<!--
  B7 · 店铺资料（商家板块 · V0 重构版）
  态A 资料编辑：logo1:1 + 店名 + 简介 + 客服/营业(展示) + 只读分销渠道
  态B 对外预览：合并原 shop-preview（买家视角店铺展示，仅预览不可下单）
  规格红线：商家不做店铺装修/流量投放，仅基础资料；分销渠道由平台配置（只读）
  可写字段：仅 shopName / shopLogo / shopIntro（updateProfile）
-->
<template>
  <view class="page">
    <!-- 顶部导航（朱红渐变） -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-back" @tap="onNavBack">
          <app-icon name="arrow-left" :size="20" color="#ffffff" />
        </view>
        <text class="nav-title">{{ mode === 'preview' ? '店铺预览' : '店铺资料' }}</text>
        <view v-if="mode === 'edit'" class="nav-pv" @tap="openPreview">
          <text class="nav-pv-text">预览</text>
          <app-icon name="chevron-right" :size="14" color="#ffffff" />
        </view>
        <view v-else class="nav-pv nav-pv-ghost" />
      </view>
    </view>

    <!-- Loading -->
    <view v-if="loading" class="state" :style="{ paddingTop: navHeight + 'px' }">
      <text class="state-txt">加载中…</text>
    </view>
    <!-- Error -->
    <view v-else-if="error" class="state" :style="{ paddingTop: navHeight + 'px' }">
      <app-icon name="alert-circle" :size="44" color="#c41e3a" />
      <text class="state-txt">{{ error }}</text>
      <view class="state-btn" @tap="load"><text class="state-btn-txt">重试</text></view>
    </view>

    <template v-else-if="profile">
      <!-- ══════════ 态A · 资料编辑 ══════════ -->
      <scroll-view v-if="mode === 'edit'" scroll-y class="scroll" :style="{ paddingTop: navHeight + 'px' }">
        <view class="body">
          <view class="qualification-card" :class="`qualification-card--${profile.qualificationStatus || 'DRAFT'}`">
            <view class="qualification-head">
              <view>
                <text class="qualification-kicker">商户风控档案</text>
                <text class="qualification-title">{{ qualificationTitle }}</text>
              </view>
              <view class="qualification-badge"><text>{{ qualificationBadge }}</text></view>
            </view>
            <view class="qualification-progress">
              <view v-for="item in qualificationChecklist" :key="item.label" class="qualification-step">
                <view class="qualification-dot" :class="{ done: item.done }">
                  <app-icon :name="item.done ? 'check' : 'clock'" :size="12" :color="item.done ? '#ffffff' : '#9b7b45'" />
                </view>
                <text>{{ item.label }}</text>
              </view>
            </view>
            <text v-if="profile.qualificationRejectReason" class="qualification-reason">
              需补正：{{ profile.qualificationRejectReason }}
            </text>
            <text v-else class="qualification-next">{{ qualificationNextReview }}</text>
            <view v-if="profile.viewerRole !== 'OPERATOR'" class="qualification-action" @tap="openQualification">
              <text>{{ profile.qualificationStatus === 'APPROVED' ? '查看与更新资质' : '补齐资质并提交审核' }}</text>
              <app-icon name="chevron-right" :size="15" color="#ffffff" />
            </view>
            <view v-else class="qualification-action qualification-action--locked">
              <app-icon name="lock" :size="14" color="#ffffff" />
              <text>仅店铺主体负责人可更新资质</text>
            </view>
          </view>

          <!-- 店铺基本信息 -->
          <view class="group">
            <view class="group-t"><text class="group-t-txt">店铺基本信息</text></view>

            <!-- Logo 1:1 -->
            <view class="field">
              <text class="field-label">店铺 Logo（1:1）</text>
              <view class="logo-row">
                <view
                  class="logo-box"
                  :class="{ 'logo-box-done': !!form.shopLogo, 'logo-box-busy': logoUploading }"
                  @tap="onUploadLogo"
                >
                  <image lazy-load v-if="form.shopLogo" :src="form.shopLogo" class="logo-img" mode="aspectFill" />
                  <view v-else class="logo-ph">
                    <app-icon :name="logoUploading ? 'loader-2' : 'plus'" :size="18" color="#8a7a60" />
                    <text class="logo-ph-txt">{{ logoUploading ? '上传中' : '上传' }}</text>
                  </view>
                  <view v-if="logoUploading && form.shopLogo" class="logo-busy">
                    <app-icon name="loader-2" :size="18" color="#ffffff" />
                    <text>上传中</text>
                  </view>
                </view>
                <view class="logo-copy">
                  <text class="logo-tip">建议使用 400×400 的正方形品牌图，JPG / PNG / WebP，最大 10MB</text>
                  <text class="logo-state">{{ form.shopLogo ? '已上传 · 点击可预览、更换或移除' : '尚未上传 · 店铺将使用默认标识' }}</text>
                </view>
              </view>
            </view>

            <!-- 店铺名称 -->
            <view class="field">
              <text class="field-label">店铺名称</text>
              <input v-model="form.shopName" class="field-input" placeholder="请输入店铺名称" placeholder-class="ph" :maxlength="20" />
            </view>

            <!-- 店铺简介 -->
            <view class="field">
              <text class="field-label">店铺简介</text>
              <textarea
                v-model="form.shopIntro"
                class="field-textarea"
                placeholder="详细介绍您的店铺（正品保障、主营品类等）"
                placeholder-class="ph"
                :maxlength="120"
              />
              <text class="field-count">{{ (form.shopIntro || '').length }}/120</text>
            </view>
          </view>

          <!-- 客服与营业（展示态） -->
          <view class="group">
            <view class="group-t"><text class="group-t-txt">客服与营业</text></view>
            <view class="field">
              <text class="field-label">客服联系方式</text>
              <text class="field-val">{{ profile.contactPhone || '下单后买家可见' }}</text>
            </view>
            <view class="field">
              <text class="field-label">联系人</text>
              <text class="field-val">{{ profile.contactName || '—' }}</text>
            </view>
          </view>

          <!-- 分销渠道（只读） -->
          <view class="group">
            <view class="group-t"><text class="group-t-txt">分销渠道（只读）</text></view>
            <view class="readonly">
              <text class="ro-t">你的商品当前接入以下平台分销渠道：</text>
              <view class="chan">
                <view class="chan-item" v-for="c in channels" :key="c"><text class="chan-txt">{{ c }}</text></view>
              </view>
              <text class="lock-note">◈ 分销由平台侧统一配置，商家无需也无法自行绑定/装修</text>
            </view>
          </view>

          <view style="height: 40rpx" />
        </view>
      </scroll-view>

      <!-- ══════════ 态B · 对外预览 ══════════ -->
      <scroll-view v-else scroll-y class="scroll" :style="{ paddingTop: navHeight + 'px' }">
        <!-- 店铺身份页眉：只使用后端真实可写字段，不伪造店招 -->
        <view class="pv-hero">
          <view class="pv-hero-ring pv-hero-ring-a" />
          <view class="pv-hero-ring pv-hero-ring-b" />
          <text class="pv-hero-kicker">热卜国学 · 品质商家</text>
          <view class="pv-head">
            <view class="pv-logo">
              <image lazy-load v-if="form.shopLogo" :src="form.shopLogo" class="pv-logo-img" mode="aspectFill" />
              <app-icon v-else name="store" :size="24" color="#8a7a60" />
            </view>
            <view class="pv-head-info">
              <text class="pv-name">{{ form.shopName || '未命名店铺' }}</text>
              <text class="pv-meta">官方认证 · 综合评分 {{ ratingText }} · 在售 {{ products.length }} 件</text>
            </view>
          </view>
        </view>

        <!-- 简介 -->
        <text v-if="form.shopIntro" class="pv-desc">{{ form.shopIntro }}</text>

        <!-- 标签栏 -->
        <view class="pv-tabs">
          <text class="pv-tab pv-tab-on">全部商品</text>
          <text class="pv-tab">新品</text>
          <text class="pv-tab">热销</text>
        </view>

        <!-- 商品栅格 -->
        <view v-if="products.length" class="pv-grid">
          <view class="pv-prod" v-for="p in products" :key="p.id">
            <view class="pv-prod-cover">
              <image lazy-load v-if="p.images && p.images.length" :src="p.images[0]" class="pv-prod-cover-img" mode="aspectFill" />
              <view v-else class="pv-prod-cover-ph"><app-icon name="package" :size="28" color="#8a7a60" /></view>
            </view>
            <text class="pv-prod-title">{{ p.title }}</text>
            <text class="pv-prod-price">¥{{ Number(p.price).toFixed(2) }}</text>
          </view>
        </view>
        <view v-else class="pv-empty">
          <app-icon name="package" :size="40" color="#c9bba0" />
          <text class="pv-empty-txt">暂无在售商品</text>
        </view>

        <text class="pv-note">◈ 此为对外展示预览，数据实时取自编辑态，不可在此下单</text>
        <view style="height: 40rpx" />
      </scroll-view>
    </template>

    <!-- 底部保存栏（仅编辑态） -->
    <view
      v-if="mode === 'edit' && profile && !loading && !error"
      class="cta-bar"
      :style="{ paddingBottom: 'calc(14px + env(safe-area-inset-bottom))' }"
    >
      <view class="cta" :class="{ saving: submitting || logoUploading }" @tap="onSave">
        <text class="cta-text">{{ logoUploading ? 'Logo 上传中…' : (submitting ? '保存中…' : '保存资料') }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { merchantBackendApi, type MerchantProfile, type MerchantProduct } from '@/pkg-merchant/lib/merchant-data'
import { chooseAndUploadImage } from '@/utils/request'

const statusBarHeight = ref(0)
const navHeight = ref(44)

const sys = uni.getSystemInfoSync()
statusBarHeight.value = sys.statusBarHeight || 0
navHeight.value = (sys.statusBarHeight || 0) + 44

// edit=资料编辑 / preview=对外预览
const mode = ref<'edit' | 'preview'>('edit')

const loading = ref(true)
const error = ref('')
const submitting = ref(false)
const logoUploading = ref(false)
const profile = ref<MerchantProfile | null>(null)
const products = ref<MerchantProduct[]>([])

// 后端真实可写字段，仅保留 shopName / shopLogo / shopIntro
const form = ref({
  shopName: '',
  shopLogo: '' as string,
  shopIntro: '',
})

// 分销渠道（平台配置·只读展示）
const channels = ['商城', '圈子推荐', '线下驿站', '站长主推位']

const ratingText = computed(() => Number(profile.value?.rating ?? 0).toFixed(1))
const qualificationBadge = computed(() => ({
  APPROVED: '已核验',
  PENDING: '审核中',
  REJECTED: '待补正',
  EXPIRED: '已到期',
  DRAFT: '待完善',
}[profile.value?.qualificationStatus || 'DRAFT']))
const qualificationTitle = computed(() => ({
  APPROVED: '主体资质持续有效',
  PENDING: '平台正在核验材料',
  REJECTED: '部分材料需要补正',
  EXPIRED: '资质到期，请尽快复核',
  DRAFT: '完成认证后再发布商品',
}[profile.value?.qualificationStatus || 'DRAFT']))
const qualificationChecklist = computed(() => {
  const p = profile.value
  return [
    { label: '主体证照', done: !!p?.businessLicense && !!p?.unifiedSocialCreditCode },
    { label: '经营者核验', done: !!p?.idCardFront && !!p?.idCardBack },
    { label: '平台复核', done: p?.qualificationStatus === 'APPROVED' },
  ]
})
const qualificationNextReview = computed(() => {
  const next = profile.value?.qualificationNextReviewAt
  if (!next) return '完成核验后，平台将每 6 个月提醒复核'
  return `下次资质复核：${new Date(next).toLocaleDateString('zh-CN')}`
})

function openQualification() {
  navigateTo('/pkg-merchant/apply/index')
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [p, list] = await Promise.all([
      merchantBackendApi.getProfile(),
      merchantBackendApi.getProducts({ status: 'ON_SALE' }).catch(() => ({ items: [] as MerchantProduct[] })),
    ])
    profile.value = p
    products.value = list.items
    form.value = {
      shopName: p.shopName || '',
      shopLogo: p.shopLogo || '',
      shopIntro: p.shopIntro || '',
    }
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

function onNavBack() {
  // 预览态返回编辑态；编辑态返回上一页
  if (mode.value === 'preview') {
    mode.value = 'edit'
    return
  }
  goBack()
}

function openPreview() {
  mode.value = 'preview'
}

async function chooseLogo() {
  if (logoUploading.value) return
  logoUploading.value = true
  try {
    form.value.shopLogo = await chooseAndUploadImage()
  } catch (e) {
    const message = (e as Error)?.message || ''
    if (message && message !== '已取消') uni.showToast({ title: message, icon: 'none' })
  } finally {
    logoUploading.value = false
  }
}

function onUploadLogo() {
  if (logoUploading.value) return
  const url = form.value.shopLogo
  if (!url) {
    chooseLogo()
    return
  }
  uni.showActionSheet({
    itemList: ['预览 Logo', '重新上传', '移除 Logo'],
    success: ({ tapIndex }) => {
      if (tapIndex === 0) uni.previewImage({ urls: [url], current: url })
      if (tapIndex === 1) chooseLogo()
      if (tapIndex === 2) form.value.shopLogo = ''
    },
  })
}

async function onSave() {
  if (submitting.value || logoUploading.value) return
  if (!form.value.shopName.trim()) {
    uni.showToast({ title: '请填写店铺名称', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    const updated = await merchantBackendApi.updateProfile({
      shopName: form.value.shopName.trim(),
      shopIntro: form.value.shopIntro.trim(),
      shopLogo: form.value.shopLogo,
    })
    profile.value = updated
    uni.showToast({ title: '保存成功', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '保存失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

load()
</script>

<style lang="scss" scoped>
$paper: #faf8f5;
$card: #ffffff;
$brand: #c41e3a;
$gold: #c9a96e;
$ink: #2c2c2c;
$ink-2: #6e6e73;
$ink-3: #999999;
$line: #edeae4;

.page {
  min-height: 100vh;
  background: $paper;
}

/* 顶部导航（朱红渐变） */
.nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  background: linear-gradient(135deg, $brand, #a01830);
}
.nav-bar {
  position: relative;
  display: flex;
  align-items: center;
  height: 44px;
  padding: 0 20rpx;
}
.nav-back {
  width: 88rpx;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-title {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  max-width: 50%;
  white-space: nowrap;
  text-align: center;
  font-size: 34rpx;
  font-weight: 700;
  color: #ffffff;
}
.nav-pv {
  display: flex;
  align-items: center;
  margin-left: auto;
  justify-content: center;
  gap: 4rpx;
  min-width: 88rpx;
  height: 88rpx;
  padding: 0 18rpx;
  box-sizing: border-box;
  border-radius: 30rpx;
  background: rgba(255, 255, 255, 0.18);
}
.nav-pv-ghost {
  background: transparent;
  width: 88rpx;
  padding: 0;
}
.nav-pv-text {
  font-size: 24rpx;
  color: #ffffff;
}

/* 状态 */
.scroll {
  height: 100vh;
  box-sizing: border-box;
}
.state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
  padding: 160rpx 48rpx;
}
.state-txt {
  font-size: 27rpx;
  color: $ink-3;
  text-align: center;
}
.state-btn {
  margin-top: 8rpx;
  border: 1rpx solid $brand;
  padding: 14rpx 48rpx;
  border-radius: 999rpx;
}
.state-btn-txt {
  font-size: 27rpx;
  color: $brand;
}

/* ══════════ 态A · 资料编辑 ══════════ */
.body {
  padding: 32rpx 40rpx 200rpx;
}
.qualification-card {
  position: relative;
  overflow: hidden;
  margin-bottom: 38rpx;
  padding: 30rpx;
  border: 1rpx solid rgba(172, 129, 55, 0.22);
  border-radius: 30rpx;
  color: #fff;
  background:
    radial-gradient(circle at 88% 12%, rgba(255,255,255,.2), transparent 32%),
    linear-gradient(135deg, #3d3021, #8b6232 62%, #b88b4f);
  box-shadow: 0 16rpx 40rpx rgba(74, 50, 24, .16);
}
.qualification-card--PENDING { background: linear-gradient(135deg, #173d54, #2d7181 65%, #58a6a6); }
.qualification-card--REJECTED,
.qualification-card--EXPIRED { background: linear-gradient(135deg, #611f2b, #a63b4e 65%, #c96b64); }
.qualification-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 20rpx; }
.qualification-kicker { display: block; font-size: 20rpx; letter-spacing: 4rpx; color: rgba(255,255,255,.65); }
.qualification-title { display: block; margin-top: 8rpx; font-size: 32rpx; font-weight: 700; }
.qualification-badge { padding: 8rpx 18rpx; border-radius: 999rpx; background: rgba(255,255,255,.16); border: 1rpx solid rgba(255,255,255,.22); }
.qualification-badge text { font-size: 22rpx; color: #fff; }
.qualification-progress { display: flex; margin: 30rpx 0 22rpx; }
.qualification-step { position: relative; flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8rpx; font-size: 20rpx; color: rgba(255,255,255,.72); }
.qualification-step:not(:last-child)::after { content: ''; position: absolute; top: 18rpx; left: 64%; width: 72%; height: 1rpx; background: rgba(255,255,255,.28); }
.qualification-dot { position: relative; z-index: 1; width: 36rpx; height: 36rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: #f5ead5; }
.qualification-dot.done { background: #55a678; }
.qualification-reason,
.qualification-next { display: block; font-size: 22rpx; line-height: 1.5; color: rgba(255,255,255,.78); }
.qualification-action { margin-top: 22rpx; height: 72rpx; border-radius: 999rpx; display: flex; align-items: center; justify-content: center; gap: 8rpx; background: rgba(255,255,255,.16); border: 1rpx solid rgba(255,255,255,.2); }
.qualification-action text { color: #fff; font-size: 24rpx; font-weight: 600; }
.qualification-action--locked { opacity: .76; }
.group {
  margin-bottom: 36rpx;
}
.group-t {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
}
.group-t::before {
  content: '';
  width: 6rpx;
  height: 30rpx;
  background: $brand;
  border-radius: 4rpx;
  margin-right: 16rpx;
}
.group-t-txt {
  font-size: 28rpx;
  font-weight: 600;
  color: $ink;
}


/* 字段卡片 */
.field {
  background: $card;
  border-radius: 28rpx;
  padding: 24rpx 28rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 16rpx rgba(44, 38, 30, 0.03);
}
.field:last-child {
  margin-bottom: 0;
}
.field-label {
  display: block;
  font-size: 22rpx;
  color: $ink-3;
  margin-bottom: 12rpx;
}
.field-val {
  display: block;
  font-size: 28rpx;
  color: $ink;
}
.field-input {
  width: 100%;
  box-sizing: border-box;
  height: 56rpx;
  font-size: 28rpx;
  color: $ink;
  background: transparent;
}
.field-textarea {
  width: 100%;
  box-sizing: border-box;
  height: 140rpx;
  font-size: 28rpx;
  color: $ink;
  line-height: 1.6;
  background: transparent;
}
.field-count {
  display: block;
  text-align: right;
  font-size: 20rpx;
  color: $ink-3;
  margin-top: 6rpx;
}
.ph {
  color: $ink-3;
}

/* Logo 行 */
.logo-row {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.logo-box {
  width: 128rpx;
  height: 128rpx;
  position: relative;
  border: 1rpx dashed rgba(138, 122, 96, 0.5);
  border-radius: 28rpx;
  background: linear-gradient(135deg, #e8dfd3, #d8ccb8);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}
.logo-box-done { border-style: solid; border-color: rgba(128, 94, 44, 0.28); }
.logo-box-busy { pointer-events: none; }
.logo-img {
  width: 128rpx;
  height: 128rpx;
}
.logo-ph {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
}
.logo-ph-txt {
  font-size: 20rpx;
  color: #8a7a60;
}
.logo-busy {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  color: #ffffff;
  font-size: 20rpx;
  background: rgba(44, 35, 25, 0.68);
}
.logo-copy { flex: 1; min-width: 0; }
.logo-tip {
  display: block;
  font-size: 22rpx;
  line-height: 1.55;
  color: $ink-3;
}
.logo-state {
  display: block;
  margin-top: 8rpx;
  font-size: 21rpx;
  line-height: 1.5;
  color: #8a6d2f;
}

/* 只读分销渠道 */
.readonly {
  background: #fbf7ef;
  border-radius: 28rpx;
  padding: 28rpx;
}
.ro-t {
  display: block;
  font-size: 24rpx;
  color: #8a6d2f;
  margin-bottom: 16rpx;
}
.chan {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.chan-item {
  border: 1rpx solid #e0d0a8;
  border-radius: 30rpx;
  padding: 6rpx 24rpx;
  background: #ffffff;
}
.chan-txt {
  font-size: 22rpx;
  color: #8a6d2f;
}
.lock-note {
  display: block;
  font-size: 22rpx;
  color: $gold;
  margin-top: 16rpx;
  line-height: 1.5;
}

/* 底部保存栏 */
.cta-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 40;
  background: $card;
  border-top: 1rpx solid $line;
  padding: 28rpx 40rpx;
}
.cta {
  height: 92rpx;
  border-radius: 999rpx;
  background: $brand;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 30rpx rgba(196, 30, 58, 0.25);
}
.cta.saving {
  opacity: 0.7;
}
.cta-text {
  font-size: 30rpx;
  font-weight: 600;
  color: #ffffff;
}

/* ══════════ 态B · 对外预览 ══════════ */
.pv-hero {
  position: relative;
  overflow: hidden;
  padding: 34rpx 40rpx 40rpx;
  background:
    radial-gradient(circle at 86% 12%, rgba(255, 247, 225, 0.64), transparent 32%),
    linear-gradient(135deg, #d7c5a4, #b89e72);
}
.pv-hero-ring {
  position: absolute;
  border: 1rpx solid rgba(255, 255, 255, 0.32);
  border-radius: 50%;
  pointer-events: none;
}
.pv-hero-ring-a { width: 260rpx; height: 260rpx; right: -80rpx; top: -116rpx; }
.pv-hero-ring-b { width: 170rpx; height: 170rpx; right: 24rpx; top: -80rpx; }
.pv-hero-kicker {
  display: block;
  margin-bottom: 28rpx;
  font-size: 20rpx;
  letter-spacing: 5rpx;
  color: rgba(74, 53, 25, 0.68);
}
.pv-head {
  display: flex;
  align-items: center;
  gap: 24rpx;
  position: relative;
  z-index: 2;
}
.pv-logo {
  width: 120rpx;
  height: 120rpx;
  border-radius: 28rpx;
  background: linear-gradient(135deg, #e8dfd3, #d8ccb8);
  border: 6rpx solid $paper;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}
.pv-logo-img {
  width: 120rpx;
  height: 120rpx;
}
.pv-head-info {
  flex: 1;
  min-width: 0;
}
.pv-name {
  display: block;
  font-size: 34rpx;
  font-weight: 700;
  color: $ink;
}
.pv-meta {
  display: block;
  font-size: 22rpx;
  color: $gold;
  margin-top: 4rpx;
}
.pv-desc {
  display: block;
  padding: 24rpx 40rpx 0;
  font-size: 24rpx;
  color: $ink-2;
  line-height: 1.6;
}
.pv-tabs {
  display: flex;
  gap: 36rpx;
  padding: 28rpx 40rpx;
  border-bottom: 1rpx solid $line;
}
.pv-tab {
  font-size: 26rpx;
  color: $ink-3;
}
.pv-tab-on {
  color: $brand;
  font-weight: 600;
}
.pv-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24rpx;
  padding: 28rpx 40rpx;
}
.pv-prod {
  background: $card;
  border-radius: 28rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 16rpx rgba(44, 38, 30, 0.04);
}
.pv-prod-cover {
  width: 100%;
  height: 0;
  padding-top: 100%;
  position: relative;
  background: linear-gradient(135deg, #e8dfd3, #d8ccb8);
  overflow: hidden;
}
.pv-prod-cover-img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
.pv-prod-cover-ph {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.pv-prod-title {
  display: block;
  font-size: 24rpx;
  color: $ink;
  padding: 16rpx 20rpx 4rpx;
  line-height: 1.4;
}
.pv-prod-price {
  display: block;
  font-size: 26rpx;
  font-weight: 700;
  color: $brand;
  padding: 0 20rpx 20rpx;
}
.pv-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  padding: 96rpx 0;
}
.pv-empty-txt {
  font-size: 24rpx;
  color: $ink-3;
}
.pv-note {
  display: block;
  text-align: center;
  font-size: 22rpx;
  color: $gold;
  padding: 12rpx 40rpx 40rpx;
}
</style>
