<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-back" @tap="goBack">
          <app-icon name="arrow-left" :size="20" color="#1a1a1a" />
        </view>
        <text class="nav-title">店铺设置</text>
        <view class="nav-preview" @tap="goPreview">
          <app-icon name="eye" :size="16" color="#4b5563" />
          <text class="nav-preview-text">预览</text>
        </view>
      </view>
    </view>

    <!-- Loading -->
    <view v-if="loading" class="state" :style="{ paddingTop: navHeight + 'px' }">
      <text class="state-txt">加载中…</text>
    </view>
    <!-- Error -->
    <view v-else-if="error" class="state" :style="{ paddingTop: navHeight + 'px' }">
      <app-icon name="alert-circle" :size="44" color="#dc2626" />
      <text class="state-txt">{{ error }}</text>
      <view class="state-btn" @tap="load"><text class="state-btn-txt">重试</text></view>
    </view>

    <template v-else-if="profile">
      <scroll-view scroll-y class="scroll" :style="{ paddingTop: navHeight + 'px' }">
        <!-- 店铺形象 -->
        <view class="card">
          <text class="card-title">店铺形象</text>
          <view class="logo-row">
            <view class="logo-box" @tap="onUploadLogo">
              <image lazy-load v-if="form.shopLogo" :src="form.shopLogo" class="logo-img" mode="aspectFill" />
              <app-icon v-else name="store" :size="40" color="#9ca3af" />
              <view class="logo-cam">
                <app-icon name="camera" :size="16" color="#ffffff" />
              </view>
            </view>
            <view class="logo-info">
              <text class="logo-title">店铺Logo</text>
              <text class="logo-desc">建议尺寸200x200px，支持JPG、PNG格式</text>
            </view>
          </view>
        </view>

        <!-- 基本信息（可编辑） -->
        <view class="card">
          <text class="card-title">基本信息</text>
          <view class="field">
            <text class="label">店铺名称</text>
            <input v-model="form.shopName" class="input" placeholder="请输入店铺名称" :maxlength="20" />
          </view>
          <view class="field">
            <text class="label">店铺简介</text>
            <textarea v-model="form.shopIntro" class="textarea" placeholder="详细介绍您的店铺" />
          </view>
        </view>

        <!-- 经营数据（只读） -->
        <view class="card">
          <text class="card-title">经营数据</text>
          <view class="ro-grid">
            <view class="ro-item">
              <text class="ro-num">{{ Number(profile.rating ?? 0).toFixed(1) }}</text>
              <text class="ro-label">店铺评分</text>
            </view>
            <view class="ro-item">
              <text class="ro-num">{{ profile.totalOrders ?? 0 }}</text>
              <text class="ro-label">累计订单</text>
            </view>
            <view class="ro-item">
              <text class="ro-num">¥{{ money(profile.totalSales) }}</text>
              <text class="ro-label">累计销售</text>
            </view>
          </view>
          <view v-if="categoryText" class="ro-row">
            <text class="ro-row-label">经营类目</text>
            <text class="ro-row-val">{{ categoryText }}</text>
          </view>
          <view v-if="profile.contactName" class="ro-row">
            <text class="ro-row-label">联系人</text>
            <text class="ro-row-val">{{ profile.contactName }}</text>
          </view>
        </view>

        <!-- 其他设置 -->
        <view class="card">
          <view class="link-row" @tap="goEditApplication">
            <view>
              <text class="link-title">修改入驻资料</text>
              <text class="link-desc">修改营业执照、法人信息等</text>
            </view>
            <app-icon name="chevron-right" :size="20" color="#9ca3af" />
          </view>
        </view>
        <view style="height: 90px" />
      </scroll-view>

      <!-- 底部保存 -->
      <view class="footer" :style="{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }">
        <view class="save-btn" :class="{ saving: submitting }" @tap="onSave">
          <text class="save-text">{{ submitting ? '保存中...' : '保存修改' }}</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { merchantBackendApi, categoryName, type MerchantProfile } from '@/lib/merchant-data'

const statusBarHeight = ref(0)
const navHeight = ref(44)

const sys = uni.getSystemInfoSync()
statusBarHeight.value = sys.statusBarHeight || 0
navHeight.value = (sys.statusBarHeight || 0) + 44

const loading = ref(true)
const error = ref('')
const submitting = ref(false)
const profile = ref<MerchantProfile | null>(null)

// 仅 shopName / shopLogo / shopIntro 可改
const form = ref({
  shopName: '',
  shopLogo: '' as string,
  shopIntro: '',
})

const categoryText = computed(() =>
  (profile.value?.categoryIds || []).map((id) => categoryName(id)).join('、'),
)

function money(v?: string | number | null): string {
  return Number(v ?? 0).toFixed(2)
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const p = await merchantBackendApi.getProfile()
    profile.value = p
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

function onUploadLogo() {
  uni.showToast({ title: '图片上传功能即将开放', icon: 'none' })
}
function goPreview() {
  navigateTo('/merchant/shop-preview')
}
function goEditApplication() {
  navigateTo('/merchant/edit-application')
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

<style scoped>
.page { min-height: 100vh; background: #f5f5f5; }
.nav { position: fixed; top: 0; left: 0; right: 0; z-index: 50; background: #ffffff; border-bottom: 1px solid #ededed; }
.nav-bar { display: flex; align-items: center; height: 44px; padding: 0 16px; }
.nav-back { width: 32px; height: 32px; display: flex; align-items: center; }
.nav-title { flex: 1; font-size: 17px; font-weight: 600; color: #1a1a1a; }
.nav-preview { display: flex; align-items: center; gap: 4px; padding: 6px 8px; }
.nav-preview-text { font-size: 14px; color: #4b5563; }
.scroll { height: 100vh; box-sizing: border-box; }

.card { background: #ffffff; border-radius: 12px; margin: 12px 16px 0; padding: 16px; }
.card-title { display: block; font-size: 15px; font-weight: 600; color: #1a1a1a; margin-bottom: 16px; }

.logo-row { display: flex; align-items: center; gap: 16px; }
.logo-box { position: relative; width: 80px; height: 80px; border-radius: 12px; background: #f3f4f6; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.logo-img { width: 80px; height: 80px; border-radius: 12px; }
.logo-cam { position: absolute; bottom: -4px; right: -4px; width: 28px; height: 28px; border-radius: 50%; background: var(--brand); display: flex; align-items: center; justify-content: center; }
.logo-info { flex: 1; }
.logo-title { display: block; font-size: 14px; font-weight: 500; color: #1a1a1a; }
.logo-desc { display: block; font-size: 12px; color: #9ca3af; margin-top: 4px; }

.field { margin-bottom: 16px; }
.field:last-child { margin-bottom: 0; }
.label { font-size: 14px; color: #374151; }
.input { margin-top: 8px; width: 100%; box-sizing: border-box; height: 40px; padding: 0 12px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px; background: #ffffff; }
.textarea { margin-top: 8px; width: 100%; box-sizing: border-box; height: 88px; padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px; background: #ffffff; }

.ro-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 8px; }
.ro-item { display: flex; flex-direction: column; align-items: center; }
.ro-num { font-size: 18px; font-weight: 700; color: #1a1a1a; }
.ro-label { font-size: 12px; color: #9ca3af; margin-top: 2px; }
.ro-row { display: flex; align-items: center; justify-content: space-between; padding-top: 12px; margin-top: 12px; border-top: 1px solid #f3f4f6; }
.ro-row-label { font-size: 14px; color: #6b7280; }
.ro-row-val { font-size: 14px; color: #1a1a1a; }

.link-row { display: flex; align-items: center; justify-content: space-between; padding: 4px 0; }
.link-title { display: block; font-size: 14px; font-weight: 500; color: #1a1a1a; }
.link-desc { display: block; font-size: 12px; color: #9ca3af; margin-top: 2px; }

.footer { position: fixed; bottom: 0; left: 0; right: 0; padding: 12px 16px; background: #ffffff; border-top: 1px solid #ededed; }
.save-btn { height: 46px; border-radius: 10px; background: var(--brand); display: flex; align-items: center; justify-content: center; gap: 8px; }
.save-btn.saving { opacity: 0.7; }
.save-text { font-size: 15px; font-weight: 500; color: #ffffff; }
</style>
