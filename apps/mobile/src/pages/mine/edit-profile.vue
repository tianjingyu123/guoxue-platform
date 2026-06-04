<template>
  <view class="page">
    <!-- 导航栏 -->
    <view class="nav-bar">
      <view class="nav-back" @click="goBack">
        <text class="nav-back-icon">‹</text>
      </view>
      <text class="nav-title">编辑资料</text>
      <text class="nav-save" :class="{ disabled: !changed }" @click="save">保存</text>
    </view>

    <view class="form">
      <!-- 头像 -->
      <view class="form-row avatar-row" @click="changeAvatar">
        <text class="form-label">头像</text>
        <view class="avatar-wrap">
          <image
            :src="avatar || '/static/default-avatar.png'"
            class="avatar-img"
            mode="aspectFill"
          />
          <text class="avatar-edit">📷</text>
        </view>
      </view>

      <!-- 昵称 -->
      <view class="form-row">
        <text class="form-label">昵称</text>
        <input
          v-model="nickname"
          class="form-input"
          placeholder="请输入昵称"
          maxlength="20"
          @input="onChange"
        />
      </view>

      <!-- 简介 -->
      <view class="form-row textarea-row">
        <text class="form-label">简介</text>
        <textarea
          v-model="bio"
          class="form-textarea"
          placeholder="写一句话介绍自己"
          maxlength="100"
          @input="onChange"
        />
      </view>

      <!-- 性别 -->
      <view class="form-row">
        <text class="form-label">性别</text>
        <view class="gender-group">
          <text
            class="gender-option"
            :class="{ active: gender === 1 }"
            @click="gender = 1; onChange()"
          >男</text>
          <text
            class="gender-option"
            :class="{ active: gender === 2 }"
            @click="gender = 2; onChange()"
          >女</text>
          <text
            class="gender-option"
            :class="{ active: gender === 0 }"
            @click="gender = 0; onChange()"
          >保密</text>
        </view>
      </view>

      <!-- 生日 -->
      <view class="form-row">
        <text class="form-label">生日</text>
        <picker
          mode="date"
          :value="birthday"
          :start="'1900-01-01'"
          :end="today"
          @change="onBirthdayChange"
        >
          <text class="form-value" :class="{ placeholder: !birthday }">
            {{ birthday || '选择生日' }}
          </text>
        </picker>
      </view>

      <!-- 邮箱 -->
      <view class="form-row">
        <text class="form-label">邮箱</text>
        <input
          v-model="email"
          class="form-input"
          placeholder="请输入邮箱（选填）"
          type="text"
          @input="onChange"
        />
      </view>

      <!-- 个人主页背景 -->
      <view class="form-row" @click="changeBanner">
        <text class="form-label">主页背景</text>
        <view class="banner-preview" v-if="banner">
          <image :src="banner" mode="aspectFill" class="banner-img" />
        </view>
        <text v-else class="form-action">更换 ›</text>
      </view>
    </view>

    <!-- 保存按钮（固定底部） -->
    <view class="bottom-bar" v-if="changed">
      <button class="save-btn" :loading="saving" :disabled="saving" @click="save">
        保存修改
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '../../store/user'
import { uploadApi } from '../../api'

const userStore = useUserStore()
const saving = ref(false)
const changed = ref(false)

// 表单数据
const avatar = ref('')
const nickname = ref('')
const bio = ref('')
const gender = ref(0)
const birthday = ref('')
const email = ref('')
const banner = ref('')

// 原始数据（用于判断是否修改）
const original = ref('')

const today = computed(() => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})

onMounted(() => {
  loadProfile()
})

function loadProfile() {
  const u = userStore.user
  if (!u) return
  avatar.value = u.avatar || ''
  nickname.value = u.nickname || ''
  bio.value = (u as any).signature || ''
  gender.value = u.gender ?? 0
  birthday.value = (u as any).birthday || ''
  email.value = (u as any).email || ''
  banner.value = (u as any).banner || ''
  original.value = JSON.stringify(getFormData())
}

function getFormData() {
  return { nickname: nickname.value, bio: bio.value, gender: gender.value, birthday: birthday.value, email: email.value }
}

function onChange() {
  changed.value = original.value !== JSON.stringify(getFormData())
}

/** 选择头像 */
async function changeAvatar() {
  try {
    const res = await uni.chooseImage({ count: 1, sizeType: ['compressed'] })
    if (res.tempFilePaths.length > 0) {
      uni.showLoading({ title: '上传中...' })
      const uploadRes: any = await uploadApi.image(res.tempFilePaths[0])
      uni.hideLoading()
      const url = uploadRes?.url || uploadRes?.data?.url || ''
      if (url) {
        avatar.value = url
        changed.value = true
      }
    }
  } catch {
    uni.showToast({ title: '取消选择', icon: 'none' })
  }
}

/** 选择背景 */
async function changeBanner() {
  try {
    const res = await uni.chooseImage({ count: 1, sizeType: ['compressed'] })
    if (res.tempFilePaths.length > 0) {
      uni.showLoading({ title: '上传中...' })
      const uploadRes: any = await uploadApi.image(res.tempFilePaths[0])
      uni.hideLoading()
      const url = uploadRes?.url || uploadRes?.data?.url || ''
      if (url) {
        banner.value = url
        changed.value = true
      }
    }
  } catch {
    uni.showToast({ title: '取消选择', icon: 'none' })
  }
}

/** 选择生日 */
function onBirthdayChange(e: any) {
  birthday.value = e.detail.value
  onChange()
}

/** 保存 */
async function save() {
  if (!changed.value || saving.value) return
  saving.value = true
  try {
    await userStore.updateProfile({
      nickname: nickname.value,
      avatar: avatar.value,
      signature: bio.value,
      gender: gender.value,
      birthday: birthday.value,
      email: email.value,
    } as any)
    changed.value = false
    original.value = JSON.stringify(getFormData())
    uni.showToast({ title: '保存成功', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 1000)
  } catch (e: any) {
    uni.showToast({ title: e.message || '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

function goBack() {
  if (changed.value) {
    uni.showModal({
      title: '提示',
      content: '有未保存的修改，确定退出吗？',
      success: (res) => {
        if (res.confirm) uni.navigateBack()
      },
    })
  } else {
    uni.navigateBack()
  }
}
</script>

<style scoped>
.page {
  background: $bg;
  min-height: 100vh;
  padding-bottom: 120rpx;
}

/* ── 导航栏 ── */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 24rpx;
  background: #fff;
}
.nav-back {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
}
.nav-back-icon {
  font-size: 48rpx;
  color: $text;
  font-weight: 300;
}
.nav-title {
  font-size: 32rpx;
  font-weight: bold;
  color: $text;
}
.nav-save {
  font-size: 26rpx;
  color: $gold;
  font-weight: 500;
  padding: 8rpx 16rpx;
}
.nav-save.disabled {
  color: $text-tertiary;
}

/* ── 表单 ── */
.form {
  margin: 24rpx;
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
}
.form-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 24rpx;
  border-bottom: 1rpx solid $border-light;
}
.form-row:last-child {
  border-bottom: none;
}
.form-label {
  font-size: 26rpx;
  color: $text;
  font-weight: 500;
  min-width: 120rpx;
}
.form-input {
  flex: 1;
  text-align: right;
  font-size: 26rpx;
  color: $text;
  padding: 8rpx 0;
}
.form-textarea {
  flex: 1;
  text-align: right;
  font-size: 24rpx;
  color: $text;
  min-height: 80rpx;
  padding: 8rpx 0;
}
.form-value {
  font-size: 26rpx;
  color: $text;
}
.form-value.placeholder {
  color: $text-tertiary;
}
.form-action {
  font-size: 24rpx;
  color: $gold;
}

/* ── 头像 ── */
.avatar-row {
  padding: 24rpx 24rpx;
}
.avatar-wrap {
  position: relative;
  width: 100rpx;
  height: 100rpx;
}
.avatar-img {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background: $border;
}
.avatar-edit {
  position: absolute;
  bottom: 0;
  right: 0;
  font-size: 28rpx;
}

/* ── 性别 ── */
.gender-group {
  display: flex;
  gap: 16rpx;
}
.gender-option {
  padding: 8rpx 24rpx;
  border-radius: 24rpx;
  font-size: 24rpx;
  border: 2rpx solid $border;
  color: $text-secondary;
}
.gender-option.active {
  background: $gold;
  border-color: $gold;
  color: #fff;
}

/* ── 背景 ── */
.banner-preview {
  width: 120rpx;
  height: 72rpx;
  border-radius: 8rpx;
  overflow: hidden;
}
.banner-img {
  width: 100%;
  height: 100%;
}

/* ── 底部 ── */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20rpx 24rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1rpx solid $border;
}
.save-btn {
  width: 100%;
  height: 80rpx;
  background: linear-gradient(135deg, $gold, $gold-light);
  color: #fff;
  border: none;
  border-radius: 40rpx;
  font-size: 28rpx;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
}
.save-btn:active {
  transform: scale(0.98);
}
.save-btn[disabled] {
  opacity: 0.5;
}
</style>
