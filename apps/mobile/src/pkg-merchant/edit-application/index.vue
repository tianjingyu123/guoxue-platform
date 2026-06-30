<template>
  <view class="ea-page">
    <!-- 顶部导航 -->
    <view class="ea-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="ea-header-inner">
        <view class="ea-back" @tap="go('/merchant/application-status')">
          <AppIcon name="arrow-left" :size="20" color="#1a1a1a" />
        </view>
        <text class="ea-title">修改入驻资料</text>
      </view>
    </view>

    <scroll-view scroll-y class="ea-scroll" :style="{ paddingTop: statusBarHeight + 44 + 'px' }">
      <!-- Loading -->
      <view v-if="loading" class="ea-state"><text class="ea-state-txt">加载中…</text></view>
      <!-- Error -->
      <view v-else-if="error" class="ea-state">
        <AppIcon name="alert-circle" :size="40" color="#dc2626" />
        <text class="ea-state-txt">{{ error }}</text>
        <view class="ea-cat-btn ea-state-btn" @tap="load"><text>重试</text></view>
      </view>

      <template v-else>
      <!-- 提示 -->
      <view class="ea-tip-wrap">
        <view class="ea-tip">
          <AppIcon name="alert-circle" :size="16" color="#d97706" />
          <view class="ea-tip-text">
            <text class="ea-tip-line">修改入驻资料后将重新进入审核流程。</text>
            <text class="ea-tip-line">请确保所填信息真实有效，以免影响审核。</text>
          </view>
        </view>
      </view>

      <view class="ea-body">
        <!-- 店铺信息 -->
        <view class="ea-card">
          <text class="ea-card-title ea-mb">店铺信息</text>
          <view class="ea-field">
            <text class="ea-label">店铺名称</text>
            <input class="ea-input" v-model="formData.shopName" placeholder="请输入店铺名称" />
          </view>
          <view class="ea-field">
            <text class="ea-label">店铺简介</text>
            <textarea class="ea-textarea" v-model="formData.shopIntro" :maxlength="200" placeholder="介绍您的店铺特色" />
          </view>
        </view>

        <!-- 资质材料 -->
        <view class="ea-card">
          <text class="ea-card-title ea-mb">资质材料</text>
          <view class="ea-field">
            <text class="ea-label">身份证号</text>
            <input class="ea-input" v-model="formData.idCardNumber" :maxlength="18" placeholder="请输入身份证号" />
          </view>
          <view class="ea-field">
            <text class="ea-label">证件照片 <text class="ea-opt">（图片上传即将开放）</text></text>
            <view class="ea-license-row">
              <view class="ea-uploaded ea-uploaded-sm" @tap="comingSoon">
                <AppIcon name="upload" :size="20" color="#999" />
                <text class="ea-uploaded-txt">营业执照</text>
              </view>
              <view class="ea-uploaded ea-uploaded-sm" @tap="comingSoon">
                <AppIcon name="upload" :size="20" color="#999" />
                <text class="ea-uploaded-txt">身份证</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 联系人信息 -->
        <view class="ea-card">
          <text class="ea-card-title ea-mb">联系人信息</text>
          <view class="ea-field">
            <text class="ea-label">联系人姓名</text>
            <input class="ea-input" v-model="formData.contactName" placeholder="请输入联系人姓名" />
          </view>
          <view class="ea-field">
            <text class="ea-label">联系电话</text>
            <input class="ea-input" type="text" :maxlength="11" v-model="formData.contactPhone" placeholder="请输入联系电话" />
          </view>
        </view>

        <!-- 经营类目 -->
        <view class="ea-card">
          <text class="ea-card-title ea-mb">经营类目</text>
          <view class="ea-cats">
            <view
              v-for="cat in allCategories"
              :key="cat.id"
              class="ea-cat-chip"
              :class="{ 'ea-cat-on': formData.categoryIds.includes(cat.id) }"
              @tap="toggleCategory(cat.id)"
            >
              <text>{{ cat.name }}</text>
            </view>
          </view>
          <text class="ea-hint">最多选择 5 个经营类目</text>
        </view>
      </view>

      <view class="ea-bottom-placeholder" />
      </template>
    </scroll-view>

    <!-- 底部提交 -->
    <view v-if="!loading && !error" class="ea-footer">
      <view class="ea-submit" :class="{ 'ea-submit-disabled': isSubmitting }" @tap="handleSubmit">
        <view v-if="isSubmitting" class="ea-spin"><AppIcon name="loader-2" :size="16" color="#ffffff" /></view>
        <text>{{ isSubmitting ? '提交中…' : '提交修改' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import { merchantApi, productCategories } from '@/lib/merchant-data'

const allCategories = productCategories

const loading = ref(true)
const error = ref('')
const isSubmitting = ref(false)
const statusBarHeight = ref(0)

const formData = reactive({
  shopName: '',
  shopIntro: '',
  idCardNumber: '',
  contactName: '',
  contactPhone: '',
  categoryIds: [] as string[],
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const app = await merchantApi.getApplication()
    formData.shopName = app.shopName || ''
    formData.shopIntro = app.shopIntro || ''
    // 身份证号后端已脱敏返回（如 110***1234），不回填到输入框，留空让用户按需重填
    formData.idCardNumber = ''
    formData.contactName = app.contactName || ''
    // 联系电话同样可能脱敏，留空
    formData.contactPhone = ''
    formData.categoryIds = [...(app.categoryIds || [])]
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function toggleCategory(id: string) {
  const idx = formData.categoryIds.indexOf(id)
  if (idx >= 0) formData.categoryIds.splice(idx, 1)
  else if (formData.categoryIds.length < 5) formData.categoryIds.push(id)
  else uni.showToast({ title: '最多选择5个类目', icon: 'none' })
}

function comingSoon() {
  uni.showToast({ title: '图片上传功能即将开放', icon: 'none' })
}

async function handleSubmit() {
  if (isSubmitting.value) return
  if (!formData.shopName.trim()) {
    uni.showToast({ title: '请填写店铺名称', icon: 'none' })
    return
  }
  isSubmitting.value = true
  try {
    // 仅提交有值的字段（脱敏留空字段不覆盖原值）
    const payload: Record<string, any> = {
      shopName: formData.shopName.trim(),
      shopIntro: formData.shopIntro.trim() || undefined,
      contactName: formData.contactName.trim() || undefined,
      categoryIds: formData.categoryIds,
    }
    if (formData.idCardNumber.trim()) payload.idCardNumber = formData.idCardNumber.trim()
    if (formData.contactPhone.trim()) payload.contactPhone = formData.contactPhone.trim()
    await merchantApi.updateApplication(payload)
    uni.showToast({ title: '修改成功', icon: 'success' })
    setTimeout(() => navigateTo('/merchant/application-status'), 800)
  } catch (e: any) {
    uni.showToast({ title: e?.message || '提交失败', icon: 'none' })
  } finally {
    isSubmitting.value = false
  }
}

function go(url: string) {
  navigateTo(url)
}

onMounted(() => {
  uni.getSystemInfo({ success: (res) => { statusBarHeight.value = res.statusBarHeight || 0 } })
  load()
})
</script>

<style scoped>
.ea-page { min-height: 100vh; background: #f5f5f5; }

.ea-header { position: fixed; top: 0; left: 0; right: 0; z-index: 50; background: #fff; border-bottom: 1px solid rgba(0,0,0,0.06); }
.ea-header-inner { display: flex; align-items: center; height: 44px; padding: 0 16px; }
.ea-back { margin-right: 12px; }
.ea-title { font-size: 18px; font-weight: 600; color: #1a1a1a; }

.ea-scroll { height: 100vh; box-sizing: border-box; }

/* 三态 */
.ea-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 24px; gap: 12px; }
.ea-state-txt { font-size: 14px; color: #999; }
.ea-state-btn { width: 160px; margin-top: 8px; }

/* 提示 */
.ea-tip-wrap { padding: 16px 16px 0; }
.ea-tip { display: flex; align-items: flex-start; gap: 8px; padding: 12px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; }
.ea-tip-text { flex: 1; }
.ea-tip-line { display: block; font-size: 12px; color: #999; line-height: 1.5; }

/* Body */
.ea-body { padding: 16px; display: flex; flex-direction: column; gap: 16px; }
.ea-card { background: #fff; border-radius: 12px; padding: 16px; }
.ea-card-title { font-size: 15px; font-weight: 500; color: #1a1a1a; }
.ea-mb { display: block; margin-bottom: 16px; }

/* Field */
.ea-field { margin-bottom: 16px; }
.ea-field:last-child { margin-bottom: 0; }
.ea-label { display: block; font-size: 14px; color: #1a1a1a; margin-bottom: 8px; }
.ea-opt { color: #999; font-size: 12px; }
.ea-input { height: 44px; background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 0 12px; font-size: 14px; color: #1a1a1a; box-sizing: border-box; width: 100%; }
.ea-textarea { width: 100%; min-height: 72px; background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 10px 12px; font-size: 14px; color: #1a1a1a; box-sizing: border-box; }
.ea-hint { display: block; font-size: 12px; color: #999; margin-top: 8px; }

/* 上传占位 */
.ea-license-row { display: flex; align-items: center; gap: 12px; }
.ea-uploaded { aspect-ratio: 3 / 2; flex: 1; background: #f5f5f5; border: 2px dashed #ddd; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.ea-uploaded-sm { height: 64px; aspect-ratio: auto; }
.ea-uploaded-txt { font-size: 12px; color: #999; margin-top: 2px; }

/* 类目 chips */
.ea-cats { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
.ea-cat-chip { padding: 8px 12px; background: #f0f0f0; border-radius: 8px; }
.ea-cat-chip text { font-size: 14px; font-weight: 500; color: #666; }
.ea-cat-on { background: var(--brand); }
.ea-cat-on text { color: #fff; }
.ea-cat-btn { height: 36px; border: 1px solid #ddd; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
.ea-cat-btn text { font-size: 14px; color: #1a1a1a; }

.ea-bottom-placeholder { height: 88px; }

/* Footer */
.ea-footer { position: fixed; bottom: 0; left: 0; right: 0; padding: 12px 16px calc(12px + env(safe-area-inset-bottom)); background: #fff; border-top: 1px solid rgba(0,0,0,0.06); }
.ea-submit { height: 44px; background: var(--brand); border-radius: 8px; display: flex; align-items: center; justify-content: center; gap: 8px; }
.ea-submit text { font-size: 15px; font-weight: 500; color: #fff; }
.ea-submit-disabled { opacity: 0.5; }
.ea-spin { display: inline-flex; animation: ea-spin 1s linear infinite; }
@keyframes ea-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
</style>
