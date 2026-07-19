<!--
  M2 · 入驻申请（V0 视觉稿还原 · 暖纸 token）
  两态同页复用：
    态A 首次填写 → apply + submit → M3 审核中
    态B 驳回后重提 → onLoad getApplication 回填 → updateApplication + submit → M3
  一张表单四大分组：主体信息 / 资质证照 / 联系人 / 经营类目。
-->
<template>
  <view class="m2-page">
    <!-- 顶部导航 -->
    <view class="m2-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="m2-nav-inner">
        <view class="m2-back" @tap="goBack">
          <AppIcon name="arrow-left" :size="18" color="#2C2C2C" />
        </view>
        <text class="m2-nav-title">{{ isEdit ? '修改申请' : '入驻申请' }}</text>
      </view>
    </view>

    <!-- 加载态 -->
    <view v-if="loading" class="m2-state" :style="{ paddingTop: statusBarHeight + 52 + 'px' }">
      <text class="m2-state-txt">加载中…</text>
    </view>
    <!-- 错误态 -->
    <view v-else-if="error" class="m2-state" :style="{ paddingTop: statusBarHeight + 52 + 'px' }">
      <AppIcon name="alert-circle" :size="40" color="#C41E3A" />
      <text class="m2-state-txt">{{ error }}</text>
      <view class="m2-state-btn" @tap="load"><text>重试</text></view>
    </view>

    <template v-else>
      <scroll-view scroll-y class="m2-scroll" :style="{ paddingTop: statusBarHeight + 52 + 'px' }">
        <!-- 驳回原因提示条（态B） -->
        <view v-if="isEdit && rejectReason" class="m2-reject">
          <view class="m2-reject-ic">
            <AppIcon name="alert-circle" :size="18" color="#C41E3A" />
          </view>
          <text class="m2-reject-txt"><text class="m2-reject-b">申请被驳回：</text>{{ rejectReason }}</text>
        </view>

        <!-- 主体信息 -->
        <view class="m2-group">
          <view class="m2-group-t"><text>主体信息</text></view>

          <view class="m2-field">
            <text class="m2-label">主体类型 <text class="m2-req">*</text></text>
            <view class="m2-picker" @tap="openEntityPicker">
              <text class="m2-picker-txt" :class="{ 'm2-picker-on': !!form.entityType }">
                {{ entityTypeLabel || '请选择：个人 / 个体工商户 / 企业' }}
              </text>
              <AppIcon name="chevron-down" :size="16" color="#9A9A9A" />
            </view>
          </view>

          <view class="m2-field">
            <text class="m2-label">主体名称 / 店铺名 <text class="m2-req">*</text></text>
            <input
              class="m2-input"
              :class="{ 'm2-input-err': fieldErr('shopName') }"
              placeholder="对外展示的店铺名称，最多20字"
              placeholder-class="m2-ph"
              :maxlength="20"
              v-model="form.shopName"
              @blur="markTouched('shopName')"
            />
            <view v-if="fieldErr('shopName')" class="m2-err">
              <AppIcon name="alert-circle" :size="12" color="#C41E3A" />
              <text>{{ fieldErr('shopName') }}</text>
            </view>
          </view>
        </view>

        <!-- 资质证照 -->
        <view class="m2-group">
          <view class="m2-group-t"><text>资质证照</text></view>

          <view class="m2-field">
            <text class="m2-label">身份证号 <text class="m2-req">*</text></text>
            <input
              class="m2-input"
              :class="{ 'm2-input-err': fieldErr('idNumber') }"
              :placeholder="isEdit ? '如需修改请重新输入' : '请输入身份证号码'"
              placeholder-class="m2-ph"
              :maxlength="18"
              v-model="form.idNumber"
              @blur="markTouched('idNumber')"
            />
            <view v-if="fieldErr('idNumber')" class="m2-err">
              <AppIcon name="alert-circle" :size="12" color="#C41E3A" />
              <text>{{ fieldErr('idNumber') }}</text>
            </view>
          </view>

          <view class="m2-field">
            <text class="m2-label">营业执照 <text class="m2-opt">（企业/个体建议提供）</text></text>
            <view class="m2-upload" @tap="comingSoon">
              <AppIcon name="upload" :size="22" color="#C9A96E" />
              <text class="m2-upload-txt">点击上传</text>
              <text class="m2-upload-sz">图片/PDF · 清晰可辨</text>
            </view>
          </view>

          <view class="m2-field">
            <text class="m2-label">身份证（人像面 / 国徽面）<text class="m2-opt">（选填，可后台补充）</text></text>
            <view class="m2-up-row">
              <view class="m2-upload m2-upload-sm" @tap="comingSoon">
                <AppIcon name="upload" :size="18" color="#C9A96E" />
                <text class="m2-upload-txt">人像面</text>
              </view>
              <view class="m2-upload m2-upload-sm" @tap="comingSoon">
                <AppIcon name="upload" :size="18" color="#C9A96E" />
                <text class="m2-upload-txt">国徽面</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 联系人 -->
        <view class="m2-group">
          <view class="m2-group-t"><text>联系人</text></view>

          <view class="m2-field">
            <text class="m2-label">联系人姓名 <text class="m2-req">*</text></text>
            <input
              class="m2-input"
              :class="{ 'm2-input-err': fieldErr('contactName') }"
              placeholder="请输入真实姓名"
              placeholder-class="m2-ph"
              v-model="form.contactName"
              @blur="markTouched('contactName')"
            />
            <view v-if="fieldErr('contactName')" class="m2-err">
              <AppIcon name="alert-circle" :size="12" color="#C41E3A" />
              <text>{{ fieldErr('contactName') }}</text>
            </view>
          </view>

          <view class="m2-field">
            <text class="m2-label">联系电话 <text class="m2-req">*</text></text>
            <input
              class="m2-input"
              :class="{ 'm2-input-err': fieldErr('contactPhone') }"
              :placeholder="isEdit ? '如需修改请重新输入' : '请输入手机号'"
              placeholder-class="m2-ph"
              type="text"
              :maxlength="11"
              v-model="form.contactPhone"
              @blur="markTouched('contactPhone')"
            />
            <view v-if="fieldErr('contactPhone')" class="m2-err">
              <AppIcon name="alert-circle" :size="12" color="#C41E3A" />
              <text>{{ fieldErr('contactPhone') }}</text>
            </view>
          </view>
        </view>

        <!-- 经营类目 -->
        <view class="m2-group">
          <view class="m2-group-t m2-group-t-between">
            <text>经营类目</text>
            <text class="m2-cat-count">已选 {{ form.categories.length }}/5</text>
          </view>

          <view class="m2-field">
            <text class="m2-label">主营类目 <text class="m2-req">*</text></text>
            <view class="m2-cats">
              <view
                v-for="cat in categories"
                :key="cat.id"
                class="m2-cat"
                :class="{ 'm2-cat-on': form.categories.includes(cat.id) }"
                @tap="toggleCategory(cat.id)"
              >
                <text>{{ cat.name }}</text>
                <AppIcon v-if="form.categories.includes(cat.id)" name="check" :size="13" color="#FFFFFF" />
              </view>
            </view>
            <view v-if="fieldErr('categories')" class="m2-err m2-err-mt">
              <AppIcon name="alert-circle" :size="12" color="#C41E3A" />
              <text>{{ fieldErr('categories') }}</text>
            </view>
          </view>

          <view class="m2-field m2-field-last">
            <text class="m2-label">补充说明</text>
            <textarea
              class="m2-textarea"
              placeholder="选填，简述经营范围"
              placeholder-class="m2-ph"
              :maxlength="200"
              v-model="form.shopIntro"
            />
            <view class="m2-count-row"><text class="m2-count">{{ form.shopIntro.length }}/200</text></view>
          </view>
        </view>

        <view class="m2-bottom-ph" />
      </scroll-view>

      <!-- 底部提交 -->
      <view class="m2-foot">
        <view
          class="m2-cta"
          :class="{ 'm2-cta-loading': isSubmitting, 'm2-cta-disabled': !canSubmit }"
          @tap="handleSubmit"
        >
          <view v-if="isSubmitting" class="m2-spin" />
          <text>{{ isSubmitting ? '提交中…' : (isEdit ? '重新提交审核' : '提交审核') }}</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import { merchantApi, productCategories } from '@/pkg-merchant/lib/merchant-data'

const categories = productCategories

// 主体类型（前端配置，随主体名称一并进备注/后端保留字段）
const entityTypes = [
  { id: 'personal', name: '个人' },
  { id: 'individual', name: '个体工商户' },
  { id: 'company', name: '企业' },
]

const statusBarHeight = ref(0)
const loading = ref(true)
const error = ref('')
const isEdit = ref(false)        // 是否为「驳回后重提」态（已有申请）
const rejectReason = ref('')     // 驳回原因
const isSubmitting = ref(false)
const touched = reactive<Record<string, boolean>>({})

const form = reactive({
  entityType: '',
  shopName: '',
  shopIntro: '',
  contactName: '',
  contactPhone: '',
  idNumber: '',
  categories: [] as string[],
})

const entityTypeLabel = computed(() => entityTypes.find((e) => e.id === form.entityType)?.name || '')

// ───────── 校验 ─────────
// 各校验器入参类型不一（string / string[]），统一 Record 映射形参逆变只能取 any
const validators: Record<string, (v: any) => string | null> = {
  shopName: (v: string) => {
    if (!v.trim()) return '请输入主体名称 / 店铺名'
    if (v.trim().length < 2) return '名称至少2个字符'
    return null
  },
  contactName: (v: string) => {
    if (!v.trim()) return '请输入联系人姓名'
    if (v.trim().length < 2) return '姓名至少2个字符'
    return null
  },
  contactPhone: (v: string) => {
    // 态B 脱敏留空时不强制（提交时按需覆盖），态A 必填
    if (!v.trim()) return isEdit.value ? null : '请输入联系电话'
    if (!/^1[3-9]\d{9}$/.test(v.trim())) return '请输入正确的手机号'
    return null
  },
  idNumber: (v: string) => {
    if (!v.trim()) return isEdit.value ? null : '请输入身份证号码'
    if (!/^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/.test(v.trim()))
      return '请输入正确的身份证号码'
    return null
  },
  categories: (v: string[]) => {
    if (!v || v.length === 0) return '请至少选择一个经营类目'
    return null
  },
}

function fieldErr(field: string): string | null {
  if (!touched[field]) return null
  const fn = validators[field]
  if (!fn) return null
  return fn((form as Record<string, unknown>)[field])
}

function markTouched(field: string) {
  touched[field] = true
}

// 提交按钮可点判断（态A 必填齐全；态B 至少店名齐全）
const canSubmit = computed(() => {
  if (isSubmitting.value) return false
  if (isEdit.value) return !!form.shopName.trim()
  return (
    !!form.shopName.trim() &&
    !!form.contactName.trim() &&
    /^1[3-9]\d{9}$/.test(form.contactPhone.trim()) &&
    !!form.idNumber.trim() &&
    form.categories.length > 0
  )
})

// ───────── 数据加载（判定 A/B 态） ─────────
async function load() {
  loading.value = true
  error.value = ''
  try {
    const app = await merchantApi.getApplication()
    // 已有申请 → 态B 驳回重提，回填表单
    isEdit.value = true
    rejectReason.value = app.rejectReason || ''
    form.shopName = app.shopName || ''
    form.shopIntro = app.shopIntro || ''
    form.contactName = app.contactName || ''
    form.categories = [...(app.categoryIds || [])]
    // 身份证号 / 手机号后端脱敏返回，不回填输入框，留空按需重填（提交时仅覆盖有值字段）
    form.idNumber = ''
    form.contactPhone = ''
    form.entityType = ''
  } catch (e) {
    // 404 = 未申请 → 态A 首次填写（这是正常路径，非错误）
    const msg = (e as Error)?.message || ''
    if (msg.includes('404') || msg.includes('未申请') || msg.includes('不存在') || msg.includes('Not Found')) {
      isEdit.value = false
    } else if (msg) {
      // 其他错误才真正报错
      error.value = msg
    } else {
      isEdit.value = false
    }
  } finally {
    loading.value = false
  }
}

function openEntityPicker() {
  uni.showActionSheet({
    itemList: entityTypes.map((e) => e.name),
    success: (res) => {
      form.entityType = entityTypes[res.tapIndex].id
    },
  })
}

function toggleCategory(id: string) {
  const idx = form.categories.indexOf(id)
  if (idx >= 0) form.categories.splice(idx, 1)
  else if (form.categories.length < 5) form.categories.push(id)
  else uni.showToast({ title: '最多选择5个类目', icon: 'none' })
  markTouched('categories')
}

function comingSoon() {
  uni.showToast({ title: '图片上传功能即将开放', icon: 'none' })
}

function validateForm(): boolean {
  const fields = isEdit.value
    ? ['shopName', 'contactPhone', 'idNumber', 'categories']  // 态B：脱敏字段留空放行
    : ['shopName', 'contactName', 'contactPhone', 'idNumber', 'categories']
  fields.forEach((f) => markTouched(f))
  for (const f of fields) {
    const fn = validators[f]
    if (fn && fn((form as Record<string, unknown>)[f])) return false
  }
  if (form.categories.length === 0) {
    markTouched('categories')
    return false
  }
  return true
}

async function handleSubmit() {
  if (isSubmitting.value) return
  if (!validateForm()) {
    uni.showToast({ title: '请完善必填信息', icon: 'none' })
    return
  }
  isSubmitting.value = true
  try {
    if (isEdit.value) {
      // 态B：仅提交有值字段（脱敏留空不覆盖原值）
      const payload: Record<string, string | string[] | undefined> = {
        shopName: form.shopName.trim(),
        shopIntro: form.shopIntro.trim() || undefined,
        categoryIds: form.categories,
      }
      if (form.contactName.trim()) payload.contactName = form.contactName.trim()
      if (form.idNumber.trim()) payload.idCardNumber = form.idNumber.trim()
      if (form.contactPhone.trim()) payload.contactPhone = form.contactPhone.trim()
      await merchantApi.updateApplication(payload)
    } else {
      // 态A：创建申请
      await merchantApi.apply({
        shopName: form.shopName.trim(),
        shopIntro: form.shopIntro.trim() || undefined,
        contactName: form.contactName.trim(),
        contactPhone: form.contactPhone.trim(),
        idCardNumber: form.idNumber.trim(),
        categoryIds: form.categories,
      })
    }
    // 统一提交审核 → 进入待审核态
    await merchantApi.submit()
    uni.showToast({ title: '提交成功', icon: 'success' })
    setTimeout(() => navigateTo('/pkg-merchant/application-status/index'), 700)
  } catch (e) {
    const msg = (e as Error)?.message || '提交失败'
    if (msg.includes('已提交') || msg.includes('已存在')) {
      uni.showToast({ title: '您已提交过入驻申请', icon: 'none' })
      setTimeout(() => navigateTo('/pkg-merchant/application-status/index'), 800)
    } else {
      uni.showToast({ title: msg, icon: 'none' })
    }
  } finally {
    isSubmitting.value = false
  }
}

function goBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) uni.navigateBack()
  else navigateTo('/pkg-merchant/application-status/index')
}

onMounted(() => {
  uni.getSystemInfo({ success: (res) => { statusBarHeight.value = res.statusBarHeight || 0 } })
  load()
})
</script>

<style lang="scss" scoped>
$paper: #FAF8F5;
$card: #FFF;
$red: #C41E3A;
$gold: #C9A96E;
$ink: #2C2C2C;
$ink2: #6E6E73;
$ink3: #9A9A9A;
$line: #EDEAE4;
$wash: #F5F1EA;
$green: #2E8B57;

.m2-page { min-height: 100vh; background: $paper; }

/* 顶部导航 */
.m2-nav {
  position: fixed; top: 0; left: 0; right: 0; z-index: 20;
  background: rgba(250, 248, 245, 0.94);
  border-bottom: 1px solid $line;
}
.m2-nav-inner {
  position: relative; height: 88rpx;
  display: flex; align-items: center; justify-content: center;
}
.m2-back {
  position: absolute; left: 36rpx;
  width: 60rpx; height: 60rpx; border-radius: 50%;
  background: $card; border: 1px solid $line;
  display: flex; align-items: center; justify-content: center;
}
.m2-nav-title { font-size: 34rpx; font-weight: 700; color: $ink; }

/* 三态 */
.m2-state {
  min-height: 100vh; box-sizing: border-box;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 20rpx; padding-left: 48rpx; padding-right: 48rpx;
}
.m2-state-txt { font-size: 28rpx; color: $ink3; }
.m2-state-btn {
  margin-top: 12rpx; height: 72rpx; width: 280rpx;
  border-radius: 999px; background: $red;
  display: flex; align-items: center; justify-content: center;
}
.m2-state-btn text { font-size: 28rpx; color: #FFF; }

/* 滚动区 */
.m2-scroll { height: 100vh; box-sizing: border-box; }

/* 驳回提示条 */
.m2-reject {
  margin: 28rpx 40rpx 0;
  border: 1px solid rgba(196, 30, 58, 0.3);
  background: rgba(196, 30, 58, 0.05);
  border-radius: 24rpx; padding: 24rpx 28rpx;
  display: flex; align-items: flex-start; gap: 18rpx;
}
.m2-reject-ic { flex: none; line-height: 1; margin-top: 2rpx; }
.m2-reject-txt { flex: 1; font-size: 24rpx; color: $ink2; line-height: 1.6; }
.m2-reject-b { color: $red; font-weight: 600; }

/* 分组 */
.m2-group { margin: 36rpx 40rpx 0; }
.m2-group-t {
  font-size: 30rpx; font-weight: 700; color: $ink;
  margin-bottom: 24rpx;
  display: flex; align-items: center;
  padding-left: 20rpx; position: relative;
}
.m2-group-t::before {
  content: ''; position: absolute; left: 0;
  width: 8rpx; height: 30rpx; background: $red; border-radius: 4rpx;
}
.m2-group-t-between { justify-content: space-between; }
.m2-cat-count { font-size: 24rpx; font-weight: 400; color: $ink3; }

/* 字段 */
.m2-field { margin-bottom: 26rpx; }
.m2-field-last { margin-bottom: 0; }
.m2-label {
  display: block; font-size: 24rpx; color: $ink2; margin-bottom: 12rpx;
}
.m2-req { color: $red; }
.m2-opt { color: $ink3; font-size: 22rpx; }

.m2-input {
  height: 88rpx; width: 100%; box-sizing: border-box;
  background: $card; border: 1px solid $line; border-radius: 24rpx;
  padding: 0 28rpx; font-size: 26rpx; color: $ink;
}
.m2-input-err { border-color: $red; }
.m2-ph { color: $ink3; }

.m2-textarea {
  width: 100%; box-sizing: border-box;
  height: 140rpx; min-height: 140rpx;
  background: $card; border: 1px solid $line; border-radius: 24rpx;
  padding: 20rpx 28rpx; font-size: 26rpx; color: $ink;
}
.m2-count-row { display: flex; justify-content: flex-end; margin-top: 8rpx; }
.m2-count { font-size: 22rpx; color: $ink3; }

/* 下拉选择 */
.m2-picker {
  height: 88rpx; box-sizing: border-box;
  background: $card; border: 1px solid $line; border-radius: 24rpx;
  padding: 0 28rpx;
  display: flex; align-items: center; justify-content: space-between;
}
.m2-picker-txt { font-size: 26rpx; color: $ink3; }
.m2-picker-on { color: $ink; font-weight: 500; }

/* 上传占位 */
.m2-upload {
  background: $wash; border: 1.5px dashed #D8CFC2; border-radius: 24rpx;
  height: 184rpx;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 10rpx;
}
.m2-upload-sm { height: 140rpx; }
.m2-upload-txt { font-size: 24rpx; color: $ink2; }
.m2-upload-sz { font-size: 20rpx; color: $ink3; }
.m2-up-row { display: flex; gap: 22rpx; }
.m2-up-row .m2-upload { flex: 1; }

/* 类目 chips */
.m2-cats { display: flex; flex-wrap: wrap; gap: 16rpx; }
.m2-cat {
  display: flex; align-items: center; gap: 8rpx;
  padding: 14rpx 24rpx; border-radius: 999px;
  background: $wash; border: 1px solid $line;
}
.m2-cat text { font-size: 26rpx; font-weight: 500; color: $ink2; }
.m2-cat-on { background: $red; border-color: $red; }
.m2-cat-on text { color: #FFF; }

/* 错误提示 */
.m2-err { display: flex; align-items: center; gap: 8rpx; margin-top: 12rpx; }
.m2-err text { font-size: 22rpx; color: $red; }
.m2-err-mt { margin-top: 16rpx; }

.m2-bottom-ph { height: 200rpx; }

/* 底部提交 */
.m2-foot {
  position: fixed; left: 0; right: 0; bottom: 0;
  padding: 28rpx 40rpx calc(36rpx + env(safe-area-inset-bottom));
  background: rgba(250, 248, 245, 0.96);
  border-top: 1px solid $line;
}
.m2-cta {
  height: 100rpx; border-radius: 999px;
  background: $red;
  display: flex; align-items: center; justify-content: center; gap: 18rpx;
  box-shadow: 0 6px 16px rgba(196, 30, 58, 0.28);
}
.m2-cta text { font-size: 32rpx; font-weight: 600; color: #FFF; }
.m2-cta-loading { opacity: 0.7; box-shadow: none; }
.m2-cta-disabled { background: #D8D2C8; box-shadow: none; }

/* 提交菊花 */
.m2-spin {
  width: 34rpx; height: 34rpx;
  border: 5rpx solid rgba(255, 255, 255, 0.4);
  border-top-color: #FFF; border-radius: 50%;
  animation: m2-spin 0.7s linear infinite;
}
@keyframes m2-spin { to { transform: rotate(360deg); } }
</style>
