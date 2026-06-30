<template>
  <view class="ma-page">
    <!-- 顶部导航 -->
    <view class="ma-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="ma-header-inner">
        <view class="ma-back" @tap="go('/merchant/join')">
          <AppIcon name="arrow-left" :size="20" color="#1a1a1a" />
        </view>
        <text class="ma-title">商家入驻申请</text>
      </view>
    </view>

    <scroll-view scroll-y class="ma-scroll" :style="{ paddingTop: statusBarHeight + 44 + 'px' }">
      <!-- 进度条 -->
      <view class="ma-progress-sec">
        <view class="ma-steps">
          <view v-for="(step, index) in steps" :key="step.id" class="ma-step-wrap">
            <view class="ma-step-col">
              <view class="ma-step-circle" :class="{ 'ma-step-on': currentStep >= step.id }">
                <AppIcon v-if="currentStep > step.id" name="check" :size="16" color="#ffffff" />
                <text v-else>{{ step.id }}</text>
              </view>
              <text class="ma-step-name" :class="{ 'ma-step-name-on': currentStep >= step.id }">{{ step.name }}</text>
            </view>
            <view v-if="index < steps.length - 1" class="ma-step-line" :class="{ 'ma-step-line-on': currentStep > step.id }" />
          </view>
        </view>

        <!-- 完成度 -->
        <view class="ma-completeness">
          <view class="ma-comp-head">
            <text class="ma-comp-label">表单完成度</text>
            <text class="ma-comp-pct">{{ completeness.percentage }}%</text>
          </view>
          <view class="ma-comp-bar">
            <view class="ma-comp-fill" :style="{ width: completeness.percentage + '%' }" />
          </view>
          <text class="ma-comp-hint">已填写 {{ completeness.filled }}/{{ completeness.total }} 项必填信息</text>
        </view>
      </view>

      <view class="ma-body">
        <!-- 店铺信息 -->
        <view class="ma-card">
          <view class="ma-card-head">
            <AppIcon name="store" :size="20" color="#c41e3a" />
            <text class="ma-card-title">店铺信息</text>
          </view>
          <view class="ma-logo-row">
            <view class="ma-logo-box" @tap="comingSoon">
              <view class="ma-logo-upload">
                <AppIcon name="camera" :size="24" color="#999" />
                <text class="ma-logo-txt">上传Logo</text>
              </view>
              <view class="ma-logo-plus">
                <AppIcon name="plus" :size="16" color="#ffffff" />
              </view>
            </view>
            <text class="ma-logo-tip">建议尺寸 200x200px</text>
          </view>

          <view class="ma-field">
            <text class="ma-label">店铺名称 <text class="ma-req">*</text></text>
            <input
              class="ma-input"
              :class="{ 'ma-input-err': fieldError('shopName') }"
              placeholder="请输入店铺名称（2-20字符）"
              placeholder-class="ma-ph"
              :maxlength="20"
              v-model="formData.shopName"
              @blur="markTouched('shopName')"
            />
            <view class="ma-count-row">
              <text class="ma-count">{{ formData.shopName.length }}/20</text>
            </view>
            <view v-if="fieldError('shopName')" class="ma-err">
              <AppIcon name="alert-circle" :size="12" color="#dc2626" />
              <text>{{ fieldError('shopName') }}</text>
            </view>
          </view>

          <view class="ma-field">
            <text class="ma-label">店铺简介</text>
            <textarea
              class="ma-textarea"
              placeholder="介绍您的店铺特色"
              placeholder-class="ma-ph"
              :maxlength="200"
              v-model="formData.shopDesc"
            />
            <view class="ma-count-row">
              <text class="ma-count">{{ formData.shopDesc.length }}/200</text>
            </view>
          </view>
        </view>

        <!-- 联系人信息 -->
        <view class="ma-card">
          <view class="ma-card-head">
            <AppIcon name="phone" :size="20" color="#c41e3a" />
            <text class="ma-card-title">联系人信息</text>
          </view>

          <view class="ma-field">
            <text class="ma-label">联系人姓名 <text class="ma-req">*</text></text>
            <input
              class="ma-input"
              :class="{ 'ma-input-err': fieldError('contactName') }"
              placeholder="请输入真实姓名"
              placeholder-class="ma-ph"
              v-model="formData.contactName"
              @blur="markTouched('contactName')"
            />
            <view v-if="fieldError('contactName')" class="ma-err">
              <AppIcon name="alert-circle" :size="12" color="#dc2626" />
              <text>{{ fieldError('contactName') }}</text>
            </view>
          </view>

          <view class="ma-field">
            <text class="ma-label">手机号码 <text class="ma-req">*</text></text>
            <input
              class="ma-input"
              :class="{ 'ma-input-err': fieldError('contactPhone') }"
              placeholder="请输入手机号"
              placeholder-class="ma-ph"
              type="text"
              :maxlength="11"
              v-model="formData.contactPhone"
              @blur="markTouched('contactPhone')"
            />
            <view v-if="fieldError('contactPhone')" class="ma-err">
              <AppIcon name="alert-circle" :size="12" color="#dc2626" />
              <text>{{ fieldError('contactPhone') }}</text>
            </view>
          </view>

          <view class="ma-field">
            <text class="ma-label">身份证号 <text class="ma-req">*</text></text>
            <input
              class="ma-input"
              :class="{ 'ma-input-err': fieldError('idNumber') }"
              placeholder="请输入身份证号码"
              placeholder-class="ma-ph"
              :maxlength="18"
              v-model="formData.idNumber"
              @blur="markTouched('idNumber')"
            />
            <view v-if="fieldError('idNumber')" class="ma-err">
              <AppIcon name="alert-circle" :size="12" color="#dc2626" />
              <text>{{ fieldError('idNumber') }}</text>
            </view>
          </view>

          <view class="ma-field">
            <text class="ma-label">身份证照片 <text class="ma-opt">（选填，可后台补充）</text></text>
            <view class="ma-id-grid">
              <view class="ma-id-upload" @tap="comingSoon">
                <AppIcon name="upload" :size="24" color="#999" />
                <text class="ma-upload-txt">人像面</text>
              </view>
              <view class="ma-id-upload" @tap="comingSoon">
                <AppIcon name="upload" :size="24" color="#999" />
                <text class="ma-upload-txt">国徽面</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 资质材料 -->
        <view class="ma-card">
          <view class="ma-card-head">
            <AppIcon name="file-text" :size="20" color="#c41e3a" />
            <text class="ma-card-title">资质材料</text>
          </view>
          <view class="ma-field">
            <text class="ma-label">营业执照 <text class="ma-opt">（选填，企业商家建议提供）</text></text>
            <view class="ma-license-upload" @tap="comingSoon">
              <AppIcon name="upload" :size="32" color="#999" />
              <text class="ma-license-txt">点击上传营业执照</text>
              <text class="ma-license-tip">支持 jpg、png 格式，小于 5MB</text>
            </view>
          </view>
        </view>

        <!-- 经营类目 -->
        <view class="ma-card">
          <view class="ma-card-head ma-card-head-between">
            <view class="ma-card-head-left">
              <AppIcon name="shield" :size="20" color="#c41e3a" />
              <text class="ma-card-title">经营类目</text>
            </view>
            <text class="ma-cat-count">已选 {{ formData.categories.length }}/5</text>
          </view>
          <view class="ma-cats">
            <view
              v-for="cat in categories"
              :key="cat.id"
              class="ma-cat"
              :class="{ 'ma-cat-on': formData.categories.includes(cat.id) }"
              @tap="toggleCategory(cat.id)"
            >
              <text>{{ cat.name }}</text>
              <AppIcon v-if="formData.categories.includes(cat.id)" name="check" :size="14" color="#ffffff" />
            </view>
          </view>
          <view v-if="fieldError('categories')" class="ma-err ma-err-mt">
            <AppIcon name="alert-circle" :size="14" color="#dc2626" />
            <text>{{ fieldError('categories') }}</text>
          </view>
          <view v-if="formData.categories.length >= 5" class="ma-warn ma-err-mt">
            <AppIcon name="alert-circle" :size="14" color="#d97706" />
            <text>最多选择5个经营类目</text>
          </view>
        </view>

        <!-- 协议同意 -->
        <view class="ma-agree">
          <view class="ma-checkbox" :class="{ 'ma-checkbox-on': agreedToTerms }" @tap="agreedToTerms = !agreedToTerms">
            <AppIcon v-if="agreedToTerms" name="check" :size="12" color="#ffffff" />
          </view>
          <view class="ma-agree-txt">
            <text class="ma-agree-normal">我已阅读并同意</text>
            <text class="ma-agree-link" @tap="go('/merchant/terms')">《商家入驻协议》</text>
            <text class="ma-agree-normal">和</text>
            <text class="ma-agree-link" @tap="go('/merchant/terms')">《平台服务条款》</text>
          </view>
        </view>
      </view>

      <view class="ma-bottom-placeholder" />
    </scroll-view>

    <!-- 底部提交 -->
    <view class="ma-footer">
      <view class="ma-footer-back" @tap="go('/merchant/join')">
        <text>返回</text>
      </view>
      <view class="ma-footer-submit" :class="{ 'ma-footer-submit-disabled': isSubmitting || !agreedToTerms }" @tap="handleSubmit">
        <template v-if="isSubmitting">
          <view class="ma-spin"><AppIcon name="loader-2" :size="16" color="#ffffff" /></view>
          <text>提交中...</text>
        </template>
        <template v-else>
          <AppIcon name="check-circle-2" :size="16" color="#ffffff" />
          <text>提交申请</text>
        </template>
      </view>
    </view>

    <!-- 提交进度弹窗 -->
    <view v-if="isSubmitting" class="ma-modal-mask">
      <view class="ma-modal">
        <text class="ma-modal-title">正在提交申请</text>
        <view class="ma-modal-steps">
          <view v-for="s in progressSteps" :key="s.id" class="ma-modal-step">
            <view class="ma-modal-circle" :class="submitStep > s.id ? 'ma-modal-done' : submitStep === s.id ? 'ma-modal-active' : 'ma-modal-idle'">
              <AppIcon v-if="submitStep > s.id" name="check" :size="16" color="#ffffff" />
              <view v-else-if="submitStep === s.id" class="ma-spin"><AppIcon name="loader-2" :size="16" color="#ffffff" /></view>
              <text v-else>{{ s.id }}</text>
            </view>
            <text class="ma-modal-name" :class="{ 'ma-modal-name-on': submitStep >= s.id }">{{ s.name }}</text>
            <text v-if="submitStep > s.id" class="ma-modal-ok">完成</text>
          </view>
        </view>
        <text class="ma-modal-hint">请勿关闭页面，正在处理中...</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import { merchantApi, productCategories } from '@/lib/merchant-data'

const categories = productCategories

const steps = [
  { id: 1, name: '填写信息' },
  { id: 2, name: '提交审核' },
  { id: 3, name: '开通店铺' },
]

const progressSteps = [
  { id: 1, name: '创建申请' },
  { id: 2, name: '提交审核' },
  { id: 3, name: '处理完成' },
]

// 各校验器入参类型不一（string / string[]），由统一 Record 映射时形参逆变约束只能取 any
const validators: Record<string, (v: any) => string | null> = {
  shopName: (v: string) => {
    if (!v.trim()) return '请输入店铺名称'
    if (v.length < 2) return '店铺名称至少2个字符'
    if (v.length > 20) return '店铺名称不能超过20个字符'
    return null
  },
  contactName: (v: string) => {
    if (!v.trim()) return '请输入联系人姓名'
    if (v.length < 2) return '姓名至少2个字符'
    return null
  },
  contactPhone: (v: string) => {
    if (!v.trim()) return '请输入手机号码'
    if (!/^1[3-9]\d{9}$/.test(v)) return '请输入正确的手机号码'
    return null
  },
  idNumber: (v: string) => {
    if (!v.trim()) return '请输入身份证号码'
    if (!/^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/.test(v)) return '请输入正确的身份证号码'
    return null
  },
  categories: (v: string[]) => {
    if (v.length === 0) return '请至少选择一个经营类目'
    return null
  },
}

const currentStep = ref(1)
const isSubmitting = ref(false)
const submitStep = ref(0)
const agreedToTerms = ref(false)
const statusBarHeight = ref(0)
const touched = reactive<Record<string, boolean>>({})

const formData = reactive({
  shopName: '',
  shopLogo: '',
  shopDesc: '',
  contactName: '',
  contactPhone: '',
  idNumber: '',
  categories: [] as string[],
})

function fieldError(field: string): string | null {
  if (!touched[field]) return null
  const validator = validators[field]
  if (!validator) return null
  return validator((formData as Record<string, unknown>)[field])
}

function markTouched(field: string) {
  touched[field] = true
}

const completeness = computed(() => {
  const required = ['shopName', 'contactName', 'contactPhone', 'idNumber']
  const filled = required.filter((f) => {
    const v = (formData as Record<string, unknown>)[f]
    return typeof v === 'string' && v.trim() !== ''
  })
  return {
    filled: filled.length,
    total: required.length,
    percentage: Math.round((filled.length / required.length) * 100),
  }
})

function comingSoon() {
  uni.showToast({ title: '图片上传功能即将开放', icon: 'none' })
}

function toggleCategory(id: string) {
  const idx = formData.categories.indexOf(id)
  if (idx >= 0) {
    formData.categories.splice(idx, 1)
  } else if (formData.categories.length < 5) {
    formData.categories.push(id)
  }
  markTouched('categories')
}

function validateForm(): boolean {
  const fields = ['shopName', 'contactName', 'contactPhone', 'idNumber', 'categories']
  fields.forEach((f) => markTouched(f))
  for (const field of fields) {
    const validator = validators[field]
    if (validator && validator((formData as Record<string, unknown>)[field])) return false
  }
  return true
}

async function handleSubmit() {
  if (isSubmitting.value) return
  if (!agreedToTerms.value) {
    uni.showToast({ title: '请先同意入驻协议', icon: 'none' })
    return
  }
  if (!validateForm()) {
    uni.showToast({ title: '请完善必填信息', icon: 'none' })
    return
  }
  isSubmitting.value = true
  submitStep.value = 1
  try {
    // 1. 创建入驻申请（PENDING_REVIEW）
    await merchantApi.apply({
      shopName: formData.shopName.trim(),
      shopIntro: formData.shopDesc.trim() || undefined,
      contactName: formData.contactName.trim(),
      contactPhone: formData.contactPhone.trim(),
      idCardNumber: formData.idNumber.trim(),
      categoryIds: formData.categories,
    })
    submitStep.value = 2
    // 2. 提交审核（开启自动审核时直接进入待缴保证金）
    await merchantApi.submit()
    submitStep.value = 3
    await new Promise((r) => setTimeout(r, 400))
    navigateTo('/merchant/application-status')
  } catch (e) {
    const msg = (e as Error)?.message || '提交失败'
    if (msg.includes('已提交') || msg.includes('已存在')) {
      uni.showToast({ title: '您已提交过入驻申请', icon: 'none' })
      setTimeout(() => navigateTo('/merchant/application-status'), 800)
    } else {
      uni.showToast({ title: msg, icon: 'none' })
    }
  } finally {
    isSubmitting.value = false
  }
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
.ma-page { min-height: 100vh; background: #f5f5f5; }

.ma-header { position: fixed; top: 0; left: 0; right: 0; z-index: 50; background: #fff; border-bottom: 1px solid rgba(0,0,0,0.06); }
.ma-header-inner { display: flex; align-items: center; height: 44px; padding: 0 16px; }
.ma-back { margin-right: 12px; }
.ma-title { font-size: 18px; font-weight: 600; color: #1a1a1a; }

.ma-scroll { height: 100vh; box-sizing: border-box; }

/* 进度条 */
.ma-progress-sec { padding: 16px; background: linear-gradient(90deg, rgba(196,30,58,0.05), rgba(196,30,58,0.1)); }
.ma-steps { display: flex; align-items: center; justify-content: space-between; }
.ma-step-wrap { display: flex; align-items: center; }
.ma-step-col { display: flex; flex-direction: column; align-items: center; }
.ma-step-circle { width: 32px; height: 32px; border-radius: 50%; background: #e5e5e5; color: #999; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 500; }
.ma-step-circle text { color: #999; }
.ma-step-on { background: var(--brand); }
.ma-step-on text { color: #fff; }
.ma-step-name { font-size: 12px; color: #999; margin-top: 4px; }
.ma-step-name-on { color: var(--brand); font-weight: 500; }
.ma-step-line { width: 48px; height: 2px; margin: 0 8px; background: #e5e5e5; margin-bottom: 18px; }
.ma-step-line-on { background: var(--brand); }

.ma-completeness { margin-top: 16px; padding: 12px; background: #fff; border-radius: 8px; border: 1px solid rgba(0,0,0,0.06); }
.ma-comp-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.ma-comp-label { font-size: 14px; color: #999; }
.ma-comp-pct { font-size: 14px; font-weight: 500; color: #1a1a1a; }
.ma-comp-bar { height: 8px; background: #eee; border-radius: 4px; overflow: hidden; }
.ma-comp-fill { height: 100%; background: var(--brand); border-radius: 4px; transition: width 0.5s; }
.ma-comp-hint { display: block; font-size: 12px; color: #999; margin-top: 8px; }

/* Body */
.ma-body { padding: 16px; display: flex; flex-direction: column; gap: 16px; }
.ma-card { background: #fff; border-radius: 12px; padding: 16px; }
.ma-card-head { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
.ma-card-head-between { justify-content: space-between; }
.ma-card-head-left { display: flex; align-items: center; gap: 8px; }
.ma-card-title { font-size: 16px; font-weight: 600; color: #1a1a1a; }

/* Logo */
.ma-logo-row { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
.ma-logo-box { position: relative; }
.ma-logo-upload { width: 80px; height: 80px; border-radius: 12px; background: #f5f5f5; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 2px dashed #ddd; }
.ma-logo-txt { font-size: 12px; color: #999; margin-top: 4px; }
.ma-logo-plus { position: absolute; bottom: -4px; right: -4px; width: 24px; height: 24px; border-radius: 50%; background: var(--brand); display: flex; align-items: center; justify-content: center; }
.ma-logo-tip { font-size: 14px; color: #999; }

/* Field */
.ma-field { margin-bottom: 16px; }
.ma-field:last-child { margin-bottom: 0; }
.ma-label { display: block; font-size: 14px; font-weight: 500; color: #1a1a1a; margin-bottom: 8px; }
.ma-req { color: #dc2626; }
.ma-opt { color: #999; font-weight: normal; font-size: 12px; }
.ma-input { height: 44px; background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 0 12px; font-size: 14px; color: #1a1a1a; box-sizing: border-box; width: 100%; }
.ma-input-err { border-color: #dc2626; }
.ma-ph { color: #bbb; }
.ma-textarea { width: 100%; min-height: 72px; background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 10px 12px; font-size: 14px; color: #1a1a1a; box-sizing: border-box; }
.ma-count-row { display: flex; justify-content: flex-end; margin-top: 4px; }
.ma-count { font-size: 12px; color: #999; }
.ma-err { display: flex; align-items: center; gap: 4px; margin-top: 6px; }
.ma-err text { font-size: 12px; color: #dc2626; }
.ma-err-mt { margin-top: 8px; }
.ma-warn { display: flex; align-items: center; gap: 4px; }
.ma-warn text { font-size: 12px; color: #d97706; }

/* Phone row */
.ma-phone-row { display: flex; gap: 8px; }
.ma-input-flex { flex: 1; }
.ma-code-btn { width: 112px; flex-shrink: 0; height: 44px; border: 1px solid #ddd; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
.ma-code-btn text { font-size: 14px; color: #1a1a1a; }
.ma-code-btn-disabled { opacity: 0.5; }

/* ID photos */
.ma-id-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.ma-id-upload { aspect-ratio: 3 / 2; border-radius: 8px; background: #f5f5f5; border: 2px dashed #ddd; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.ma-upload-txt { font-size: 12px; color: #999; margin-top: 4px; }

/* License */
.ma-license-upload { aspect-ratio: 4 / 3; border-radius: 8px; background: #f5f5f5; border: 2px dashed #ddd; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.ma-license-txt { font-size: 14px; color: #999; margin-top: 8px; }
.ma-license-tip { font-size: 12px; color: #bbb; margin-top: 4px; }

/* Categories */
.ma-cat-count { font-size: 12px; color: #999; }
.ma-cats { display: flex; flex-wrap: wrap; gap: 8px; }
.ma-cat { display: flex; align-items: center; gap: 6px; padding: 8px 12px; border-radius: 8px; background: #f0f0f0; }
.ma-cat text { font-size: 14px; font-weight: 500; color: #666; }
.ma-cat-on { background: var(--brand); }
.ma-cat-on text { color: #fff; }

/* Agree */
.ma-agree { display: flex; align-items: flex-start; gap: 8px; padding: 0 4px; }
.ma-checkbox { width: 20px; height: 20px; border-radius: 4px; border: 2px solid #999; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px; }
.ma-checkbox-on { background: var(--brand); border-color: var(--brand); }
.ma-agree-txt { flex: 1; line-height: 1.5; }
.ma-agree-normal { font-size: 14px; color: #999; }
.ma-agree-link { font-size: 14px; color: var(--brand); }

.ma-bottom-placeholder { height: 96px; }

/* Footer */
.ma-footer { position: fixed; bottom: 0; left: 0; right: 0; padding: 12px 16px calc(12px + env(safe-area-inset-bottom)); background: #fff; border-top: 1px solid rgba(0,0,0,0.06); display: flex; align-items: center; gap: 12px; }
.ma-footer-back { flex: 1; height: 48px; border: 1px solid #ddd; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
.ma-footer-back text { font-size: 16px; color: #1a1a1a; }
.ma-footer-submit { flex: 2; height: 48px; background: var(--brand); border-radius: 8px; display: flex; align-items: center; justify-content: center; gap: 8px; }
.ma-footer-submit text { font-size: 16px; font-weight: 500; color: #fff; }
.ma-footer-submit-disabled { opacity: 0.5; }

/* Spin animation */
.ma-spin { display: inline-flex; animation: ma-spin 1s linear infinite; }
@keyframes ma-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

/* Modal */
.ma-modal-mask { position: fixed; inset: 0; z-index: 60; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; padding: 16px; }
.ma-modal { width: 100%; max-width: 320px; background: #fff; border-radius: 12px; padding: 24px; }
.ma-modal-title { display: block; font-size: 16px; font-weight: 600; color: #1a1a1a; text-align: center; margin-bottom: 24px; }
.ma-modal-steps { display: flex; flex-direction: column; gap: 16px; }
.ma-modal-step { display: flex; align-items: center; gap: 12px; }
.ma-modal-circle { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 500; }
.ma-modal-idle { background: #eee; color: #999; }
.ma-modal-idle text { color: #999; }
.ma-modal-active { background: var(--brand); }
.ma-modal-done { background: #22c55e; }
.ma-modal-name { flex: 1; font-size: 14px; color: #999; }
.ma-modal-name-on { color: #1a1a1a; font-weight: 500; }
.ma-modal-ok { font-size: 12px; color: #16a34a; }
.ma-modal-hint { display: block; font-size: 12px; color: #999; text-align: center; margin-top: 24px; }
</style>
