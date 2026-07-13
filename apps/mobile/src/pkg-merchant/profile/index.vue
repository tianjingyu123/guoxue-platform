<!--
  B7 · 店铺资料（商家板块 · V0 重构版）
  态A 资料编辑：店招16:9 + logo1:1 + 店名 + 简介 + 客服/营业(展示) + 只读分销渠道
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
          <!-- 店招头图 16:9 -->
          <view class="group">
            <view class="group-t"><text class="group-t-txt">店招头图（16:9）</text></view>
            <view class="banner" @tap="onUploadBanner">
              <image
                lazy-load
                v-if="form.shopBanner"
                :src="form.shopBanner"
                class="banner-img"
                mode="aspectFill"
              />
              <view v-else class="banner-ph">
                <app-icon name="image" :size="26" color="#8a7a60" />
                <text class="banner-ph-txt">＋ 点击上传店招</text>
                <text class="banner-ph-sz">建议 1280×720</text>
              </view>
            </view>
          </view>

          <!-- 店铺基本信息 -->
          <view class="group">
            <view class="group-t"><text class="group-t-txt">店铺基本信息</text></view>

            <!-- Logo 1:1 -->
            <view class="field">
              <text class="field-label">店铺 Logo（1:1）</text>
              <view class="logo-row">
                <view class="logo-box" @tap="onUploadLogo">
                  <image lazy-load v-if="form.shopLogo" :src="form.shopLogo" class="logo-img" mode="aspectFill" />
                  <view v-else class="logo-ph">
                    <app-icon name="plus" :size="18" color="#8a7a60" />
                    <text class="logo-ph-txt">上传</text>
                  </view>
                </view>
                <text class="logo-tip">建议 400×400</text>
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
        <!-- 店招 16:9 -->
        <view class="pv-banner">
          <image lazy-load v-if="form.shopBanner" :src="form.shopBanner" class="pv-banner-img" mode="aspectFill" />
          <view v-else class="pv-banner-ph"><text class="pv-banner-ph-txt">店招 16:9</text></view>
        </view>

        <!-- 店铺头部（logo 上浮） -->
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
      <view class="cta" :class="{ saving: submitting }" @tap="onSave">
        <text class="cta-text">{{ submitting ? '保存中…' : '保存资料' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { merchantBackendApi, type MerchantProfile, type MerchantProduct } from '@/lib/merchant-data'

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
const profile = ref<MerchantProfile | null>(null)
const products = ref<MerchantProduct[]>([])

// 可写字段（shopBanner 为前端占位·后端 updateProfile 暂不含·上传功能待开放）
const form = ref({
  shopName: '',
  shopLogo: '' as string,
  shopBanner: '' as string,
  shopIntro: '',
})

// 分销渠道（平台配置·只读展示）
const channels = ['商城', '圈子推荐', '线下驿站', '站长主推位']

const ratingText = computed(() => Number(profile.value?.rating ?? 0).toFixed(1))

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
      shopBanner: '',
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

function onUploadBanner() {
  uni.showToast({ title: '店招上传即将开放', icon: 'none' })
}
function onUploadLogo() {
  uni.showToast({ title: 'Logo 上传即将开放', icon: 'none' })
}

async function onSave() {
  if (submitting.value) return
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
  display: flex;
  align-items: center;
  height: 44px;
  padding: 0 20rpx;
}
.nav-back {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-title {
  flex: 1;
  text-align: center;
  font-size: 34rpx;
  font-weight: 700;
  color: #ffffff;
}
.nav-pv {
  display: flex;
  align-items: center;
  gap: 4rpx;
  height: 52rpx;
  padding: 0 20rpx;
  border-radius: 30rpx;
  background: rgba(255, 255, 255, 0.18);
}
.nav-pv-ghost {
  background: transparent;
  width: 64rpx;
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

/* 店招 16:9 比例框（padding-top 56.25%） */
.banner {
  width: 100%;
  height: 0;
  padding-top: 56.25%;
  position: relative;
  border-radius: 28rpx;
  background: linear-gradient(135deg, #e8dfd3, #d8ccb8);
  overflow: hidden;
}
.banner-img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
.banner-ph {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
}
.banner-ph-txt {
  font-size: 24rpx;
  color: #8a7a60;
}
.banner-ph-sz {
  font-size: 20rpx;
  color: #8a7a60;
  opacity: 0.7;
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
  border-radius: 28rpx;
  background: linear-gradient(135deg, #e8dfd3, #d8ccb8);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}
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
.logo-tip {
  font-size: 22rpx;
  color: $ink-3;
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
.pv-banner {
  width: 100%;
  height: 0;
  padding-top: 56.25%;
  position: relative;
  background: linear-gradient(135deg, #c9bba0, #b0a088);
  overflow: hidden;
}
.pv-banner-img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
.pv-banner-ph {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.pv-banner-ph-txt {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.85);
}
.pv-head {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 0 40rpx;
  margin-top: -56rpx;
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
  padding-top: 56rpx;
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
