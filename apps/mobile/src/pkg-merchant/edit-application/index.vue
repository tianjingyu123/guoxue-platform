<template>
  <view class="ea-page">
    <!-- 顶部导航 -->
    <view class="ea-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="ea-header-inner">
        <view class="ea-back" @tap="go('/merchant/profile')">
          <AppIcon name="arrow-left" :size="20" color="#1a1a1a" />
        </view>
        <text class="ea-title">修改入驻资料</text>
      </view>
    </view>

    <scroll-view scroll-y class="ea-scroll" :style="{ paddingTop: statusBarHeight + 44 + 'px' }">
      <!-- 加载中 -->
      <view v-if="loading" class="ea-loading">
        <view class="ea-spin"><AppIcon name="loader-2" :size="24" color="#999" /></view>
        <text class="ea-loading-text">加载中...</text>
      </view>
      <!-- 错误 -->
      <view v-else-if="error" class="ea-error">
        <AppIcon name="alert-circle" :size="40" color="#dc2626" />
        <text class="ea-error-text">加载失败</text>
        <view class="ea-retry-btn" @tap="retry">重试</view>
      </view>
      <!-- 内容 -->
      <template v-else>
      <!-- 提示 -->
      <view class="ea-tip-wrap">
        <view class="ea-tip">
          <AppIcon name="alert-circle" :size="16" color="#d97706" />
          <view class="ea-tip-text">
            <text class="ea-tip-line">修改入驻资料需要重新审核，审核期间店铺正常营业。</text>
            <text class="ea-tip-line">部分敏感信息修改后可能影响店铺信用评级。</text>
          </view>
        </view>
      </view>

      <view class="ea-body">
        <!-- 店铺信息 -->
        <view class="ea-card">
          <view class="ea-card-head">
            <text class="ea-card-title">店铺信息</text>
            <text class="ea-badge">{{ formData.shopType }}</text>
          </view>
          <view class="ea-field">
            <text class="ea-label">店铺名称</text>
            <input class="ea-input" v-model="formData.shopName" />
            <text class="ea-hint">店铺名称每年只能修改1次</text>
          </view>
        </view>

        <!-- 资质材料 -->
        <view class="ea-card">
          <text class="ea-card-title ea-mb">资质材料</text>
          <view class="ea-field">
            <text class="ea-label">营业执照</text>
            <view class="ea-license-row">
              <view class="ea-uploaded ea-uploaded-sm">
                <AppIcon name="check" :size="20" color="#16a34a" />
                <text class="ea-uploaded-txt">已上传</text>
              </view>
              <view class="ea-reupload">
                <AppIcon name="upload" :size="16" color="#1a1a1a" />
                <text>重新上传</text>
              </view>
            </view>
          </view>
          <view class="ea-field">
            <text class="ea-label">法人身份证</text>
            <view class="ea-id-grid">
              <view class="ea-uploaded">
                <AppIcon name="check" :size="20" color="#16a34a" />
                <text class="ea-uploaded-txt">人像面</text>
              </view>
              <view class="ea-uploaded">
                <AppIcon name="check" :size="20" color="#16a34a" />
                <text class="ea-uploaded-txt">国徽面</text>
              </view>
            </view>
            <view class="ea-reupload-right">
              <view class="ea-reupload">
                <AppIcon name="upload" :size="16" color="#1a1a1a" />
                <text>重新上传</text>
              </view>
            </view>
          </view>
          <view class="ea-field">
            <text class="ea-label">法人姓名</text>
            <input class="ea-input" v-model="formData.legalPerson" />
          </view>
        </view>

        <!-- 联系人信息 -->
        <view class="ea-card">
          <text class="ea-card-title ea-mb">联系人信息</text>
          <view class="ea-field">
            <text class="ea-label">联系人姓名</text>
            <input class="ea-input" v-model="formData.contactName" />
          </view>
          <view class="ea-field">
            <text class="ea-label">联系电话</text>
            <input class="ea-input" type="number" v-model="formData.contactPhone" />
          </view>
          <view class="ea-field">
            <text class="ea-label">联系邮箱</text>
            <input class="ea-input" v-model="formData.contactEmail" />
          </view>
        </view>

        <!-- 经营类目 -->
        <view class="ea-card">
          <text class="ea-card-title ea-mb">经营类目</text>
          <view class="ea-cats">
            <text v-for="cat in formData.categories" :key="cat" class="ea-cat">{{ cat }}</text>
          </view>
          <view class="ea-cat-btn">
            <text>修改经营类目</text>
          </view>
          <text class="ea-hint">新增类目可能需要提供额外资质</text>
        </view>
      </view>

      <view class="ea-bottom-placeholder" />
      </template>
    </scroll-view>

    <!-- 底部提交 -->
    <view class="ea-footer">
      <view class="ea-submit" :class="{ 'ea-submit-disabled': isSubmitting }" @tap="handleSubmit">
        <view v-if="isSubmitting" class="ea-spin"><AppIcon name="loader-2" :size="16" color="#ffffff" /></view>
        <text>提交修改申请</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import { merchantApi } from '@/lib/merchant-data'

const formData = reactive({
  shopName: '',
  shopType: '',
  legalPerson: '',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  categories: [] as string[],
})

const isSubmitting = ref(false)
const loading = ref(true)
const error = ref(false)
const statusBarHeight = ref(0)

onMounted(async () => {
  try {
    const res = await merchantApi.getApplication()
    formData.shopName = res.shopName || ''
    formData.shopType = res.shopType || ''
    formData.legalPerson = res.legalPerson || ''
    formData.contactName = res.contactName || ''
    formData.contactPhone = res.contactPhone || ''
    formData.contactEmail = res.contactEmail || ''
    formData.categories = res.categories || []
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
})

async function handleSubmit() {
  if (isSubmitting.value) return
  isSubmitting.value = true
  try {
    await merchantApi.updateApplication({
      shopName: formData.shopName,
      legalPerson: formData.legalPerson,
      contactName: formData.contactName,
      contactPhone: formData.contactPhone,
      contactEmail: formData.contactEmail,
      categories: formData.categories,
    })
    navigateTo('/merchant/application-status')
  } catch (e: any) {
    uni.showToast({ title: e?.message || '提交失败，请重试', icon: 'none' })
  } finally {
    isSubmitting.value = false
  }
}

function retry() {
  loading.value = true
  error.value = false
  // 重新触发 onMounted 逻辑
  merchantApi.getApplication().then((res) => {
    formData.shopName = res.shopName || ''
    formData.shopType = res.shopType || ''
    formData.legalPerson = res.legalPerson || ''
    formData.contactName = res.contactName || ''
    formData.contactPhone = res.contactPhone || ''
    formData.contactEmail = res.contactEmail || ''
    formData.categories = res.categories || []
  }).catch(() => {
    error.value = true
  }).finally(() => {
    loading.value = false
  })
}

function go(url: string) {
  navigateTo(url)
}

uni.getSystemInfo({
  success: (res) => {
    statusBarHeight.value = res.statusBarHeight || 0
  },
})
</script>

<style scoped>
.ea-page { min-height: 100vh; background: #f5f5f5; }

.ea-header { position: fixed; top: 0; left: 0; right: 0; z-index: 50; background: #fff; border-bottom: 1px solid rgba(0,0,0,0.06); }
.ea-header-inner { display: flex; align-items: center; height: 44px; padding: 0 16px; }
.ea-back { margin-right: 12px; }
.ea-title { font-size: 18px; font-weight: 600; color: #1a1a1a; }

.ea-scroll { height: 100vh; box-sizing: border-box; }

/* 提示 */
.ea-tip-wrap { padding: 16px 16px 0; }
.ea-tip { display: flex; align-items: flex-start; gap: 8px; padding: 12px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; }
.ea-tip-text { flex: 1; }
.ea-tip-line { display: block; font-size: 12px; color: #999; line-height: 1.5; }

/* Body */
.ea-body { padding: 16px; display: flex; flex-direction: column; gap: 16px; }
.ea-card { background: #fff; border-radius: 12px; padding: 16px; }
.ea-card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.ea-card-title { font-size: 15px; font-weight: 500; color: #1a1a1a; }
.ea-mb { display: block; margin-bottom: 16px; }
.ea-badge { font-size: 12px; padding: 2px 8px; background: #f0f0f0; border-radius: 4px; color: #666; }

/* Field */
.ea-field { margin-bottom: 16px; }
.ea-field:last-child { margin-bottom: 0; }
.ea-label { display: block; font-size: 14px; color: #1a1a1a; margin-bottom: 8px; }
.ea-input { height: 44px; background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 0 12px; font-size: 14px; color: #1a1a1a; box-sizing: border-box; width: 100%; }
.ea-hint { display: block; font-size: 12px; color: #999; margin-top: 8px; }

/* 已上传 */
.ea-license-row { display: flex; align-items: center; gap: 12px; }
.ea-uploaded { aspect-ratio: 3 / 2; flex: 1; background: #f5f5f5; border: 2px dashed #ddd; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.ea-uploaded-sm { width: 96px; height: 64px; aspect-ratio: auto; flex: none; }
.ea-uploaded-txt { font-size: 12px; color: #999; margin-top: 2px; }
.ea-id-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.ea-reupload { display: inline-flex; align-items: center; gap: 4px; height: 32px; padding: 0 12px; border: 1px solid #ddd; border-radius: 6px; }
.ea-reupload text { font-size: 13px; color: #1a1a1a; }
.ea-reupload-right { display: flex; justify-content: flex-end; margin-top: 12px; }

/* 类目 */
.ea-cats { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
.ea-cat { font-size: 12px; padding: 4px 10px; background: #f0f0f0; border-radius: 4px; color: #666; }
.ea-cat-btn { height: 36px; border: 1px solid #ddd; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
.ea-cat-btn text { font-size: 14px; color: #1a1a1a; }

.ea-bottom-placeholder { height: 88px; }

/* Footer */
.ea-footer { position: fixed; bottom: 0; left: 0; right: 0; padding: 12px 16px calc(12px + env(safe-area-inset-bottom)); background: #fff; border-top: 1px solid rgba(0,0,0,0.06); }
.ea-submit { height: 44px; background: #c41e3a; border-radius: 8px; display: flex; align-items: center; justify-content: center; gap: 8px; }
.ea-submit text { font-size: 15px; font-weight: 500; color: #fff; }
.ea-submit-disabled { opacity: 0.5; }
.ea-spin { display: inline-flex; animation: ea-spin 1s linear infinite; }
@keyframes ea-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

/* Loading / Error */
.ea-loading { padding: 80px 16px; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.ea-loading-text { font-size: 14px; color: #999; }
.ea-error { padding: 80px 16px; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.ea-error-text { font-size: 14px; color: #dc2626; }
.ea-retry-btn { height: 36px; padding: 0 24px; border: 1px solid #ddd; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px; color: #1a1a1a; }
</style>
