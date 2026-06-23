<template>
  <view class="page">
    <!-- 导航栏 -->
    <view class="header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-back" @tap="goBack">
          <app-icon name="chevron-left" :size="44" color="#2C2C2C" />
        </view>
        <text class="nav-title">{{ isEdit ? '编辑地址' : '新增地址' }}</text>
        <view class="nav-placeholder" />
      </view>
    </view>

    <scroll-view scroll-y class="scroll-area" :style="{ paddingTop: navHeight + 'px' }">
      <view v-if="loading" class="loading-state">加载中...</view>
      <view v-else-if="error" class="error-state">
        <text>{{ error }}</text>
        <view @tap="goBack">返回</view>
      </view>
      <template v-else>
      <!-- 表单卡片 -->
      <view class="form-card">
        <!-- 收货人 -->
        <view class="field">
          <view class="field-row">
            <view class="field-label">
              <app-icon name="user" :size="30" color="#C41E3A" />
              <text class="field-label-text">收货人</text>
            </view>
            <input
              v-model="name"
              class="field-input"
              placeholder="填写收货人姓名"
              placeholder-class="field-ph"
              @input="errors.name = ''"
            />
          </view>
          <text v-if="errors.name" class="field-err">{{ errors.name }}</text>
        </view>

        <!-- 手机号 -->
        <view class="field">
          <view class="field-row">
            <view class="field-label">
              <app-icon name="phone" :size="30" color="#C41E3A" />
              <text class="field-label-text">手机号</text>
            </view>
            <input
              v-model="phone"
              class="field-input"
              type="number"
              maxlength="11"
              placeholder="填写收货人手机号"
              placeholder-class="field-ph"
              @input="errors.phone = ''"
            />
          </view>
          <text v-if="errors.phone" class="field-err">{{ errors.phone }}</text>
        </view>

        <!-- 所在地区 -->
        <view class="field">
          <view class="field-row" @tap="openPicker">
            <view class="field-label">
              <app-icon name="map-pin" :size="30" color="#C41E3A" />
              <text class="field-label-text">所在地区</text>
            </view>
            <text class="field-select" :class="{ placeholder: !regionText }">
              {{ regionText || '选择省 / 市 / 区' }}
            </text>
            <app-icon name="chevron-right" :size="28" color="#C0B8B0" />
          </view>
          <text v-if="errors.region" class="field-err">{{ errors.region }}</text>
        </view>

        <!-- 详细地址 -->
        <view class="field last">
          <view class="field-row align-top">
            <view class="field-label">
              <app-icon name="map-pin" :size="30" color="#C41E3A" />
              <text class="field-label-text">详细地址</text>
            </view>
            <textarea
              v-model="address"
              class="field-textarea"
              placeholder="街道、楼牌号等"
              placeholder-class="field-ph"
              :maxlength="-1"
              @input="errors.address = ''"
            />
          </view>
          <text v-if="errors.address" class="field-err">{{ errors.address }}</text>
        </view>
      </view>

      <!-- 设为默认 -->
      <view class="default-card" @tap="isDefault = !isDefault">
        <text class="default-text">设为默认地址</text>
        <view class="switch" :class="{ on: isDefault }">
          <view class="switch-dot" />
        </view>
      </view>
      </template>
    </scroll-view>

    <!-- 保存按钮 -->
    <view class="footer" :style="{ paddingBottom: safeBottom + 'px' }">
      <view class="save-btn" :class="{ disabled: saving }" @tap="handleSave">
        <text class="save-btn-text">{{ saving ? '保存中...' : '保存地址' }}</text>
      </view>
    </view>

    <!-- 省市区选择弹窗 -->
    <view v-if="showPicker" class="picker-mask" @tap="closePicker">
      <view class="picker-panel" @tap.stop>
        <view class="picker-head">
          <text class="picker-cancel" @tap="pickerBack">{{ pickerStep === 'province' ? '取消' : '返回' }}</text>
          <view class="picker-steps">
            <text class="picker-step" :class="{ active: pickerStep === 'province' }">省份</text>
            <text class="picker-sep">/</text>
            <text class="picker-step" :class="{ active: pickerStep === 'city' }">城市</text>
            <text class="picker-sep">/</text>
            <text class="picker-step" :class="{ active: pickerStep === 'district' }">区县</text>
          </view>
          <view class="picker-ph" />
        </view>

        <scroll-view scroll-y class="picker-list">
          <template v-if="pickerStep === 'province'">
            <view
              v-for="p in provinces"
              :key="p"
              class="picker-item"
              :class="{ active: tempProvince === p }"
              @tap="selectProvince(p)"
            >
              <text class="picker-item-text" :class="{ active: tempProvince === p }">{{ p }}</text>
              <app-icon v-if="tempProvince === p" name="check" :size="30" color="#C41E3A" />
            </view>
          </template>
          <template v-else-if="pickerStep === 'city'">
            <view
              v-for="c in pickerCities"
              :key="c"
              class="picker-item"
              :class="{ active: tempCity === c }"
              @tap="selectCity(c)"
            >
              <text class="picker-item-text" :class="{ active: tempCity === c }">{{ c }}</text>
              <app-icon v-if="tempCity === c" name="check" :size="30" color="#C41E3A" />
            </view>
          </template>
          <template v-else>
            <view
              v-for="d in pickerDistricts"
              :key="d"
              class="picker-item"
              @tap="selectDistrict(d)"
            >
              <text class="picker-item-text">{{ d }}</text>
            </view>
          </template>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { goBack } from '@/utils/router'
import { accountApi, REGIONS, PROVINCES } from '@/lib/account-data'

const statusBarHeight = ref(20)
const navHeight = ref(64)
const safeBottom = ref(0)

const isEdit = ref(false)
const name = ref('')
const phone = ref('')
const province = ref('')
const city = ref('')
const district = ref('')
const address = ref('')
const isDefault = ref(false)
const saving = ref(false)
const loading = ref(false)
const error = ref('')
const errors = ref<Record<string, string>>({})

const provinces = PROVINCES

const regionText = computed(() => {
  if (!province.value) return ''
  return [province.value !== city.value ? province.value : '', city.value, district.value]
    .filter(Boolean)
    .join(' ')
})

// 省市区选择弹窗
const showPicker = ref(false)
const pickerStep = ref<'province' | 'city' | 'district'>('province')
const tempProvince = ref('')
const tempCity = ref('')

const pickerCities = computed(() => (tempProvince.value ? Object.keys(REGIONS[tempProvince.value] || {}) : []))
const pickerDistricts = computed(() =>
  tempProvince.value && tempCity.value ? REGIONS[tempProvince.value]?.[tempCity.value] || [] : [],
)

onLoad(async (query) => {
  try {
    const info = uni.getSystemInfoSync()
    statusBarHeight.value = info.statusBarHeight || 20
    navHeight.value = statusBarHeight.value + 44
    safeBottom.value = info.safeAreaInsets?.bottom || 0
  } catch (e) {
    statusBarHeight.value = 20
    navHeight.value = 64
  }
  if (query && query.id) {
    isEdit.value = true
    loading.value = true
    try {
      const detail = await accountApi.addressDetail(query.id)
      name.value = detail.name
      phone.value = detail.phone
      province.value = detail.province
      city.value = detail.city
      district.value = detail.district
      address.value = detail.address
      isDefault.value = detail.isDefault
    } catch (e: any) {
      error.value = e?.message || '加载地址信息失败'
    } finally {
      loading.value = false
    }
  }
})

function validate() {
  const e: Record<string, string> = {}
  if (!name.value.trim()) e.name = '请填写收货人姓名'
  else if (name.value.trim().length < 2) e.name = '姓名至少2个字'
  if (!phone.value.trim()) e.phone = '请填写手机号'
  else if (!/^1[3-9]\d{9}$/.test(phone.value.trim())) e.phone = '请输入有效的手机号'
  if (!province.value) e.region = '请选择省市区'
  if (!address.value.trim()) e.address = '请填写详细地址'
  else if (address.value.trim().length < 5) e.address = '详细地址至少5个字'
  errors.value = e
  return Object.keys(e).length === 0
}

async function handleSave() {
  if (saving.value) return
  if (!validate()) return
  saving.value = true
  try {
    await accountApi.saveAddress({
      id: isEdit.value ? undefined : undefined, // 新增时不传 id
      name: name.value.trim(),
      phone: phone.value.trim(),
      province: province.value,
      city: city.value,
      district: district.value,
      address: address.value.trim(),
      isDefault: isDefault.value,
    })
    uni.showToast({ title: '保存成功', icon: 'success' })
    setTimeout(() => goBack(), 600)
  } catch (e: any) {
    uni.showToast({ title: e?.message || '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

function openPicker() {
  tempProvince.value = province.value || ''
  tempCity.value = city.value || ''
  pickerStep.value = 'province'
  showPicker.value = true
}
function closePicker() {
  showPicker.value = false
  pickerStep.value = 'province'
}
function pickerBack() {
  if (pickerStep.value === 'district') pickerStep.value = 'city'
  else if (pickerStep.value === 'city') pickerStep.value = 'province'
  else closePicker()
}
function selectProvince(p: string) {
  tempProvince.value = p
  tempCity.value = ''
  pickerStep.value = 'city'
}
function selectCity(c: string) {
  tempCity.value = c
  pickerStep.value = 'district'
}
function selectDistrict(d: string) {
  province.value = tempProvince.value
  city.value = tempCity.value
  district.value = d
  errors.value.region = ''
  closePicker()
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #FAF8F5;
}
.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: #FFFFFF;
  border-bottom: 1rpx solid #F0EAE2;
}
.nav-bar {
  height: 44px;
  display: flex;
  align-items: center;
  padding: 0 12rpx;
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
  font-weight: 600;
  color: #2C2C2C;
}
.nav-placeholder {
  width: 64rpx;
}
.scroll-area {
  height: 100vh;
  box-sizing: border-box;
}

.form-card {
  margin: 24rpx;
  background: #FFFFFF;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.04);
}
.field {
  padding: 28rpx;
  border-bottom: 1rpx solid #F5F0EA;
}
.field.last {
  border-bottom: none;
}
.field-row {
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.field-row.align-top {
  align-items: flex-start;
}
.field-label {
  display: flex;
  align-items: center;
  gap: 10rpx;
  width: 160rpx;
  flex-shrink: 0;
}
.field-label-text {
  font-size: 28rpx;
  color: #2C2C2C;
}
.field-input {
  flex: 1;
  font-size: 28rpx;
  color: #2C2C2C;
}
.field-select {
  flex: 1;
  font-size: 28rpx;
  color: #2C2C2C;
}
.field-select.placeholder {
  color: #C0B8B0;
}
.field-textarea {
  flex: 1;
  height: 120rpx;
  font-size: 28rpx;
  color: #2C2C2C;
  line-height: 1.6;
}
.field-ph {
  color: #C0B8B0;
}
.field-err {
  display: block;
  margin-top: 12rpx;
  margin-left: 180rpx;
  font-size: 22rpx;
  color: #C41E3A;
}

.default-card {
  margin: 0 24rpx;
  padding: 28rpx;
  background: #FFFFFF;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.04);
}
.default-text {
  font-size: 28rpx;
  color: #2C2C2C;
}
.switch {
  width: 88rpx;
  height: 48rpx;
  border-radius: 24rpx;
  background: #E0D8D0;
  padding: 4rpx;
  transition: background 0.2s;
}
.switch.on {
  background: #C41E3A;
}
.switch-dot {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: #FFFFFF;
  transition: transform 0.2s;
}
.switch.on .switch-dot {
  transform: translateX(40rpx);
}

.footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #FFFFFF;
  border-top: 1rpx solid #F0EAE2;
  padding: 20rpx 24rpx;
}
.save-btn {
  height: 92rpx;
  background: #C41E3A;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.save-btn.disabled {
  opacity: 0.6;
}
.save-btn-text {
  font-size: 32rpx;
  font-weight: 600;
  color: #FFFFFF;
}

.picker-mask {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}
.picker-panel {
  background: #FFFFFF;
  border-radius: 32rpx 32rpx 0 0;
  overflow: hidden;
  max-height: 70vh;
}
.picker-head {
  padding: 28rpx 28rpx 24rpx;
  border-bottom: 1rpx solid #F0EAE2;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.picker-cancel {
  font-size: 28rpx;
  color: #666666;
  width: 80rpx;
}
.picker-steps {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.picker-step {
  font-size: 28rpx;
  font-weight: 600;
  color: #999999;
}
.picker-step.active {
  color: #C41E3A;
}
.picker-sep {
  color: #C0B8B0;
}
.picker-ph {
  width: 80rpx;
}
.picker-list {
  max-height: calc(70vh - 120rpx);
}
.picker-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 36rpx;
  border-bottom: 1rpx solid #F5F0EA;
}
.picker-item.active {
  background: #FEF5F6;
}
.picker-item-text {
  font-size: 28rpx;
  color: #2C2C2C;
}
.picker-item-text.active {
  color: #C41E3A;
  font-weight: 600;
}
</style>
