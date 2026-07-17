<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav">
      <view class="nav-back" @tap="goBack">
        <AppIcon name="chevron-left" :size="40" color="#666666" />
        <text class="nav-back-text">返回</text>
      </view>
      <text class="nav-title">编辑资料</text>
      <view class="nav-save" :class="{ 'nav-save-disabled': saving }" @tap="handleSave">
        <AppIcon v-if="saving" name="loader-2" :size="36" color="#c41e3a" class="spin" />
        <text v-else class="nav-save-text">保存</text>
      </view>
    </view>

    <!-- 加载骨架 -->
    <view v-if="loading" class="skeleton-wrap">
      <view class="skeleton-avatar" />
      <view class="skeleton-field" />
      <view class="skeleton-field tall" />
    </view>

    <!-- 错误态 -->
    <view v-else-if="loadError" class="load-error">
      <text class="load-error-text">{{ loadError }}</text>
      <view class="load-error-btn" @tap="loadProfile">重试</view>
    </view>

    <template v-else>
      <!-- 头像区 -->
      <view class="avatar-section">
        <view class="avatar-btn" @tap="showAvatarSheet = true">
          <view class="avatar-box">
            <smart-avatar :src="profile.avatar" :name="profile.nickname" class="avatar-img" />
          </view>
          <view class="avatar-camera">
            <AppIcon name="camera" :size="32" color="#ffffff" />
          </view>
        </view>
        <text class="avatar-tip">点击更换头像</text>
      </view>

      <!-- 表单 -->
      <view class="form">
        <!-- 昵称 -->
        <view class="card">
          <text class="label">昵称</text>
          <view class="input-wrap">
            <input
              class="input"
              :class="{ 'input-error': errors.nickname }"
              :value="profile.nickname"
              placeholder="请输入昵称"
              placeholder-class="ph"
              :maxlength="20"
              @input="onNicknameInput"
            />
            <text class="input-count">{{ profile.nickname.length }}/20</text>
          </view>
          <text v-if="errors.nickname" class="err-text">{{ errors.nickname }}</text>
        </view>

        <!-- 个人简介 -->
        <view class="card">
          <text class="label">个人简介</text>
          <view class="textarea-wrap">
            <textarea
              class="textarea"
              :class="{ 'input-error': errors.bio }"
              :value="profile.bio"
              placeholder="介绍一下自己吧..."
              placeholder-class="ph"
              :maxlength="200"
              @input="onBioInput"
            />
            <text class="textarea-count">{{ profile.bio.length }}/200</text>
          </view>
          <text v-if="errors.bio" class="err-text">{{ errors.bio }}</text>
        </view>

        <!-- 兴趣标签 -->
        <view class="card">
          <view class="label-row">
            <text class="label">兴趣标签</text>
            <text class="label-hint">已选 {{ profile.interests.length }}/5</text>
          </view>
          <view class="tag-wrap">
            <view
              v-for="interest in defaultInterests"
              :key="interest"
              class="tag"
              :class="tagClass(interest)"
              @tap="toggleInterest(interest)"
            >
              <AppIcon v-if="profile.interests.includes(interest)" name="check" :size="20" color="#ffffff" />
              <text class="tag-text" :class="{ 'tag-text-selected': profile.interests.includes(interest) }">{{ interest }}</text>
            </view>
          </view>
          <text class="tag-tip">选择你感兴趣的领域，我们将为你推荐相关内容</text>
        </view>
      </view>
    </template>

    <!-- 头像操作弹层 -->
    <view v-if="showAvatarSheet" class="mask" @tap="showAvatarSheet = false" />
    <view v-if="showAvatarSheet" class="sheet">
      <view class="sheet-handle" />
      <view class="sheet-body">
        <view class="sheet-btn" @tap="handleChooseAvatar">
          <text class="sheet-btn-text">拍照</text>
        </view>
        <view class="sheet-btn" @tap="handleChooseAvatar">
          <text class="sheet-btn-text">从相册选择</text>
        </view>
      </view>
      <view class="sheet-cancel" @tap="showAvatarSheet = false">
        <text class="sheet-cancel-text">取消</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import SmartAvatar from '@/components/common/smart-avatar.vue'
import { mineApi } from '@/lib/mine-data'
import { getUserInfo, setUserInfo } from '@/utils/storage'

interface UserProfile {
  avatar: string
  nickname: string
  bio: string
  interests: string[]
}

const defaultInterests = [
  '易经', '风水', '八字', '梅花易数', '六爻',
  '奇门遁甲', '紫微斗数', '面相', '手相', '姓名学',
  '择日', '阴宅', '阳宅', '命理', '占卜',
  '国学', '道学', '佛学', '儒学', '周易',
]

const profile = ref<UserProfile>({ avatar: '', nickname: '', bio: '', interests: [] })
const loading = ref(true)
const loadError = ref('')
const saving = ref(false)
const showAvatarSheet = ref(false)
const errors = ref<Record<string, string>>({})

onMounted(() => {
  loadProfile()
})

// 拉取当前用户资料 —— GET /auth/me（nickname/avatar/bio/兴趣品类）
async function loadProfile() {
  loading.value = true
  loadError.value = ''
  try {
    const me = await mineApi.getProfile()
    profile.value = {
      avatar: me.avatar || '',
      nickname: me.nickname || '',
      bio: me.bio || '',
      interests: Array.isArray(me.interests) ? me.interests.slice(0, 5) : [],
    }
  } catch (e) {
    loadError.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function goBack() {
  uni.navigateBack()
}

function onNicknameInput(e: any /* uni 表单事件经 vue-tsc 按原生签名校验，参数须 any */) {
  profile.value.nickname = e.detail.value
}
function onBioInput(e: any /* uni 表单事件经 vue-tsc 按原生签名校验，参数须 any */) {
  profile.value.bio = e.detail.value
}

function tagClass(interest: string) {
  const isSelected = profile.value.interests.includes(interest)
  const isDisabled = !isSelected && profile.value.interests.length >= 5
  return { 'tag-selected': isSelected, 'tag-disabled': isDisabled }
}

function toggleInterest(interest: string) {
  const list = profile.value.interests
  const idx = list.indexOf(interest)
  if (idx >= 0) {
    profile.value.interests = list.filter((i) => i !== interest)
  } else {
    if (list.length >= 5) return
    profile.value.interests = [...list, interest]
  }
}

function handleChooseAvatar() {
  showAvatarSheet.value = false
  uni.chooseImage({
    count: 1,
    success: (res) => {
      profile.value.avatar = res.tempFilePaths[0]
    },
  })
}

function validate() {
  const e: Record<string, string> = {}
  if (!profile.value.nickname.trim()) e.nickname = '请输入昵称'
  else if (profile.value.nickname.length > 20) e.nickname = '昵称不能超过20个字'
  if (profile.value.bio.length > 200) e.bio = '简介不能超过200个字'
  errors.value = e
  return Object.keys(e).length === 0
}

// 保存用户资料 —— PUT /users/profile（nickname/avatar/bio/兴趣品类）
async function handleSave() {
  if (saving.value) return
  if (!validate()) return
  saving.value = true
  try {
    await mineApi.updateProfile({
      nickname: profile.value.nickname,
      avatar: profile.value.avatar,
      bio: profile.value.bio,
      interestCategories: profile.value.interests,
    })
    // 回写本地 userInfo 缓存，使全站（海报/证书/IM/短视频等）用 getUserInfo() 的展示位即时同步新昵称/头像/简介
    setUserInfo({
      ...(getUserInfo() || {}),
      nickname: profile.value.nickname,
      avatar: profile.value.avatar,
      bio: profile.value.bio,
    })
    uni.showToast({ title: '保存成功', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 600)
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #faf8f5;
  padding-bottom: 160rpx;
}

/* 导航 */
.nav {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 112rpx;
  padding: 0 32rpx;
  background: #ffffff;
  border-bottom: 2rpx solid #e8e3db;
}
.nav-back {
  display: flex;
  align-items: center;
}
.nav-back-text {
  font-size: 30rpx;
  color: #666666;
}
.nav-title {
  font-size: 32rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.nav-save {
  min-width: 64rpx;
  display: flex;
  justify-content: flex-end;
}
.nav-save-disabled {
  opacity: 0.5;
}
.nav-save-text {
  font-size: 30rpx;
  font-weight: 500;
  color: var(--brand);
}
.spin {
  animation: rotate 0.8s linear infinite;
}
@keyframes rotate {
  to { transform: rotate(360deg); }
}

/* 骨架 */
.skeleton-wrap {
  padding: 48rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32rpx;
}
.skeleton-avatar {
  width: 192rpx;
  height: 192rpx;
  border-radius: 50%;
  background: #ece7df;
}
.skeleton-field {
  width: 100%;
  height: 112rpx;
  border-radius: 24rpx;
  background: #ece7df;
}
.skeleton-field.tall {
  height: 256rpx;
}

/* 头像区 */
.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 64rpx 0;
  background: #ffffff;
}
.avatar-btn {
  position: relative;
}
.avatar-box {
  width: 192rpx;
  height: 192rpx;
  border-radius: 50%;
  overflow: hidden;
  border: 8rpx solid #ffffff;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.12);
}
.avatar-img {
  width: 100%;
  height: 100%;
}
.avatar-fallback {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, var(--brand), #8b0000);
  display: flex;
  align-items: center;
  justify-content: center;
}
.avatar-fallback-text {
  font-size: 60rpx;
  font-weight: 700;
  color: #ffffff;
}
.avatar-camera {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: var(--brand);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.15);
}
.avatar-tip {
  font-size: 26rpx;
  color: #999999;
  margin-top: 24rpx;
}

/* 表单 */
.form {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}
.card {
  background: #ffffff;
  border-radius: 32rpx;
  padding: 32rpx;
}
.label {
  font-size: 28rpx;
  color: #666666;
}
.label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}
.label-hint {
  font-size: 24rpx;
  color: #999999;
}

/* 昵称 */
.input-wrap {
  position: relative;
  margin-top: 16rpx;
}
.input {
  width: 100%;
  height: 96rpx;
  padding: 0 96rpx 0 32rpx;
  font-size: 28rpx;
  color: #2c2c2c;
  background: #faf8f5;
  border: 2rpx solid #e8e3db;
  border-radius: 24rpx;
  box-sizing: border-box;
}
.input-error {
  border-color: #ef4444;
}
.input-count {
  position: absolute;
  right: 32rpx;
  top: 50%;
  transform: translateY(-50%);
  font-size: 22rpx;
  color: #999999;
}
.ph {
  color: #cccccc;
}
.err-text {
  font-size: 24rpx;
  color: #ef4444;
  margin-top: 8rpx;
}

/* 简介 */
.textarea-wrap {
  position: relative;
  margin-top: 16rpx;
}
.textarea {
  width: 100%;
  min-height: 220rpx;
  padding: 32rpx;
  font-size: 28rpx;
  color: #2c2c2c;
  background: #faf8f5;
  border: 2rpx solid #e8e3db;
  border-radius: 24rpx;
  box-sizing: border-box;
}
.textarea-count {
  position: absolute;
  right: 32rpx;
  bottom: 24rpx;
  font-size: 22rpx;
  color: #999999;
}

/* 兴趣标签 */
.tag-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.tag {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 16rpx 32rpx;
  border-radius: 999rpx;
  background: #faf8f5;
  border: 2rpx solid #e8e3db;
}
.tag-selected {
  background: var(--brand);
  border-color: var(--brand);
}
.tag-disabled {
  background: #f3f4f6;
  border-color: #f3f4f6;
}
.tag-text {
  font-size: 26rpx;
  color: #666666;
}
.tag-text-selected {
  color: #ffffff;
}
.tag-tip {
  display: block;
  font-size: 22rpx;
  color: #999999;
  margin-top: 24rpx;
}

/* 头像弹层 */
.mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 40;
}
.sheet {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 50;
  background: #ffffff;
  border-radius: 48rpx 48rpx 0 0;
  padding-bottom: env(safe-area-inset-bottom);
}
.sheet-handle {
  width: 96rpx;
  height: 8rpx;
  border-radius: 999rpx;
  background: #d1d5db;
  margin: 24rpx auto 0;
}
.sheet-body {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.sheet-btn {
  height: 112rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 24rpx;
}
.sheet-btn-text {
  font-size: 30rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.sheet-cancel {
  border-top: 2rpx solid #e8e3db;
  height: 112rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sheet-cancel-text {
  font-size: 30rpx;
  font-weight: 500;
  color: #666666;
}
.load-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
  padding-top: 200rpx;
}
.load-error-text {
  font-size: 28rpx;
  color: #8a8178;
}
.load-error-btn {
  padding: 16rpx 48rpx;
  background: var(--brand);
  color: #fff;
  border-radius: 12rpx;
  font-size: 26rpx;
}
</style>
