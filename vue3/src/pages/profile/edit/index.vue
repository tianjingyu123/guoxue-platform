<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-inner">
        <view class="back-btn" @tap="goBack">
          <AppIcon name="arrow-left" :size="24" color="#2c2c2c" />
        </view>
        <text class="nav-title">编辑资料</text>
        <view class="save-btn" :class="{ 'save-done': saved }" @tap="handleSave">
          <view v-if="isSaving" class="spin-mini" />
          <view v-else-if="saved" class="save-done-row">
            <AppIcon name="check" :size="14" color="#22c55e" />
            <text class="save-done-text">已保存</text>
          </view>
          <text v-else class="save-text">保存</text>
        </view>
      </view>
    </view>

    <!-- 头像编辑区 -->
    <view class="avatar-section">
      <view class="avatar-wrap">
        <image v-if="form.avatar" class="avatar-img" :src="form.avatar" mode="aspectFill" />
        <view v-else class="avatar-fallback">
          <text class="avatar-fallback-text">{{ form.nickname.charAt(0) }}</text>
        </view>
        <view class="avatar-cam" @tap="showAvatarMenu = true">
          <AppIcon name="camera" :size="16" color="#ffffff" />
        </view>
      </view>
      <text class="avatar-tip">点击更换头像</text>
    </view>

    <!-- 表单区 -->
    <view class="form">
      <!-- 昵称 -->
      <view class="card">
        <text class="card-label">昵称</text>
        <view class="input-row">
          <input
            class="text-input"
            :value="form.nickname"
            placeholder="请输入昵称"
            placeholder-class="ph"
            :maxlength="20"
            @input="onNicknameInput"
          />
          <text class="count">{{ form.nickname.length }}/20</text>
        </view>
      </view>

      <!-- 简介 -->
      <view class="card">
        <text class="card-label">简介</text>
        <textarea
          class="textarea"
          :value="form.bio"
          placeholder="介绍一下自己吧"
          placeholder-class="ph"
          :maxlength="100"
          @input="onBioInput"
        />
        <view class="count-row">
          <text class="count">{{ form.bio.length }}/100</text>
        </view>
      </view>

      <!-- 性别 -->
      <view class="card card-row" @tap="showGenderPicker = true">
        <text class="row-label">性别</text>
        <view class="row-value">
          <text class="row-text">{{ genderLabel }}</text>
          <AppIcon name="chevron-right" :size="16" color="#999999" />
        </view>
      </view>

      <!-- 生日 -->
      <view class="card card-row" @tap="showDatePicker = true">
        <text class="row-label">生日</text>
        <view class="row-value">
          <text class="row-text">{{ form.birthday || '未设置' }}</text>
          <AppIcon name="chevron-right" :size="16" color="#999999" />
        </view>
      </view>

      <!-- 所在地 -->
      <view class="card card-row" @tap="showLocationPicker = true">
        <text class="row-label">所在地</text>
        <view class="row-value">
          <text class="row-text">{{ form.province && form.city ? form.province + ' ' + form.city : '未设置' }}</text>
          <AppIcon name="chevron-right" :size="16" color="#999999" />
        </view>
      </view>

      <!-- 兴趣标签 -->
      <view class="card">
        <view class="tag-head">
          <text class="row-label">兴趣标签</text>
          <text class="count">{{ form.tags.length }}/5</text>
        </view>
        <view class="tag-wrap">
          <view v-for="tag in form.tags" :key="tag" class="tag-chip">
            <text class="tag-chip-text">{{ tag }}</text>
            <view class="tag-del" @tap="toggleTag(tag)">
              <AppIcon name="x" :size="12" color="#c41e3a" />
            </view>
          </view>
          <view v-if="form.tags.length < 5" class="tag-add" @tap="showTagPicker = true">
            <AppIcon name="plus" :size="12" color="#999999" />
            <text class="tag-add-text">添加标签</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 头像菜单 -->
    <view v-if="showAvatarMenu" class="mask" @tap="showAvatarMenu = false">
      <view class="sheet" @tap.stop>
        <view class="sheet-list">
          <view class="sheet-item" @tap="showAvatarMenu = false"><text class="sheet-item-text">拍照</text></view>
          <view class="sheet-item" @tap="showAvatarMenu = false"><text class="sheet-item-text">从相册选择</text></view>
          <view class="sheet-item" @tap="showAvatarMenu = false"><text class="sheet-item-text">查看大图</text></view>
        </view>
        <view class="sheet-cancel" @tap="showAvatarMenu = false"><text class="sheet-cancel-text">取消</text></view>
      </view>
    </view>

    <!-- 性别选择器 -->
    <view v-if="showGenderPicker" class="mask" @tap="showGenderPicker = false">
      <view class="sheet" @tap.stop>
        <view class="sheet-title-bar"><text class="sheet-title">选择性别</text></view>
        <view class="sheet-list">
          <view
            v-for="opt in genderOptions"
            :key="opt.value"
            class="sheet-opt"
            :class="{ 'sheet-opt-active': form.gender === opt.value }"
            @tap="selectGender(opt.value)"
          >
            <text class="sheet-opt-text" :class="{ 'sheet-opt-text-active': form.gender === opt.value }">{{ opt.label }}</text>
            <AppIcon v-if="form.gender === opt.value" name="check" :size="16" color="#c41e3a" />
          </view>
        </view>
        <view class="sheet-cancel" @tap="showGenderPicker = false"><text class="sheet-cancel-text">取消</text></view>
      </view>
    </view>

    <!-- 生日选择器 -->
    <view v-if="showDatePicker" class="mask" @tap="showDatePicker = false">
      <view class="sheet" @tap.stop>
        <view class="picker-head">
          <text class="picker-cancel" @tap="showDatePicker = false">取消</text>
          <text class="picker-title">选择生日</text>
          <text class="picker-confirm" @tap="showDatePicker = false">确定</text>
        </view>
        <view class="date-body">
          <picker mode="date" :value="form.birthday" @change="onDateChange">
            <view class="date-display">{{ form.birthday }}</view>
          </picker>
        </view>
      </view>
    </view>

    <!-- 地区选择器 -->
    <view v-if="showLocationPicker" class="mask" @tap="showLocationPicker = false">
      <view class="sheet" @tap.stop>
        <view class="picker-head">
          <text class="picker-cancel" @tap="showLocationPicker = false">取消</text>
          <text class="picker-title">选择所在地</text>
          <text class="picker-confirm" @tap="showLocationPicker = false">确定</text>
        </view>
        <view class="loc-body">
          <view class="loc-col">
            <text class="loc-label">省份</text>
            <scroll-view scroll-y class="loc-scroll">
              <view
                v-for="p in provinces"
                :key="p"
                class="loc-opt"
                :class="{ 'loc-opt-active': form.province === p }"
                @tap="selectProvince(p)"
              >
                <text class="loc-opt-text" :class="{ 'loc-opt-text-active': form.province === p }">{{ p }}</text>
              </view>
            </scroll-view>
          </view>
          <view class="loc-col">
            <text class="loc-label">城市</text>
            <scroll-view scroll-y class="loc-scroll">
              <view
                v-for="c in (cities[form.province] || [])"
                :key="c"
                class="loc-opt"
                :class="{ 'loc-opt-active': form.city === c }"
                @tap="form.city = c"
              >
                <text class="loc-opt-text" :class="{ 'loc-opt-text-active': form.city === c }">{{ c }}</text>
              </view>
            </scroll-view>
          </view>
        </view>
      </view>
    </view>

    <!-- 标签选择器 -->
    <view v-if="showTagPicker" class="mask" @tap="showTagPicker = false">
      <view class="sheet sheet-tall" @tap.stop>
        <view class="picker-head">
          <text class="picker-cancel" @tap="showTagPicker = false">取消</text>
          <text class="picker-title">选择标签 ({{ form.tags.length }}/5)</text>
          <text class="picker-confirm" @tap="showTagPicker = false">完成</text>
        </view>
        <scroll-view scroll-y class="tag-scroll">
          <view v-for="cat in tagCategories" :key="cat.name" class="tag-cat">
            <text class="tag-cat-name">{{ cat.name }}</text>
            <view class="tag-cat-wrap">
              <view
                v-for="tag in cat.tags"
                :key="tag"
                class="tag-opt"
                :class="{ 'tag-opt-active': form.tags.includes(tag), 'tag-opt-disabled': !form.tags.includes(tag) && form.tags.length >= 5 }"
                @tap="toggleTag(tag)"
              >
                <text
                  class="tag-opt-text"
                  :class="{ 'tag-opt-text-active': form.tags.includes(tag), 'tag-opt-text-disabled': !form.tags.includes(tag) && form.tags.length >= 5 }"
                >{{ tag }}</text>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { editTagCategories, editProvinces, editCities, editProfileDefault } from '@/lib/mine-data'

const statusBarHeight = ref(0)
const tagCategories = editTagCategories
const provinces = editProvinces
const cities = editCities

// 表单数据(默认预填,实际值由 @/lib 层注入)
const form = reactive({ ...editProfileDefault })

// UI 临时状态
const showAvatarMenu = ref(false)
const showGenderPicker = ref(false)
const showDatePicker = ref(false)
const showLocationPicker = ref(false)
const showTagPicker = ref(false)
const isSaving = ref(false)
const saved = ref(false)

const genderOptions = [
  { value: 'male' as const, label: '男' },
  { value: 'female' as const, label: '女' },
  { value: 'unknown' as const, label: '未设置' },
]
const genderLabel = computed(() =>
  form.gender === 'male' ? '男' : form.gender === 'female' ? '女' : '未设置',
)

function onNicknameInput(e: any) {
  form.nickname = String(e.detail.value).slice(0, 20)
}
function onBioInput(e: any) {
  form.bio = String(e.detail.value).slice(0, 100)
}
function selectGender(v: 'male' | 'female' | 'unknown') {
  form.gender = v
  showGenderPicker.value = false
}
function onDateChange(e: any) {
  form.birthday = e.detail.value
}
function selectProvince(p: string) {
  form.province = p
  form.city = ''
}
function toggleTag(tag: string) {
  if (form.tags.includes(tag)) {
    form.tags = form.tags.filter((t) => t !== tag)
  } else if (form.tags.length < 5) {
    form.tags = [...form.tags, tag]
  }
}

// @data-needs: 保存用户资料, 参数 {avatar,nickname,bio,gender,birthday,province,city,tags}, 返回 {code,message}
function handleSave() {
  if (isSaving.value) return
  isSaving.value = true
  setTimeout(() => {
    isSaving.value = false
    saved.value = true
    setTimeout(() => (saved.value = false), 2000)
  }, 1000)
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #faf8f5;
  padding-bottom: 64rpx;
}

/* 导航栏 */
.navbar {
  position: sticky;
  top: 0;
  z-index: 40;
  background: rgba(250, 248, 245, 0.95);
  border-bottom: 2rpx solid #e8e3db;
}
.nav-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 112rpx;
  padding: 0 32rpx;
}
.back-btn {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: -16rpx;
}
.nav-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.save-btn {
  min-width: 96rpx;
  height: 60rpx;
  padding: 0 28rpx;
  border-radius: 999rpx;
  background: #c41e3a;
  display: flex;
  align-items: center;
  justify-content: center;
}
.save-done {
  background: rgba(34, 197, 94, 0.2);
}
.save-text {
  font-size: 26rpx;
  font-weight: 500;
  color: #ffffff;
}
.save-done-row {
  display: flex;
  align-items: center;
  gap: 6rpx;
}
.save-done-text {
  font-size: 26rpx;
  font-weight: 500;
  color: #22c55e;
}
.spin-mini {
  width: 24rpx;
  height: 24rpx;
  border: 4rpx solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 头像区 */
.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 64rpx 0;
  background: linear-gradient(to bottom, rgba(232, 227, 219, 0.5), #faf8f5);
}
.avatar-wrap {
  position: relative;
  width: 192rpx;
  height: 192rpx;
}
.avatar-img {
  width: 192rpx;
  height: 192rpx;
  border-radius: 50%;
  border: 8rpx solid #faf8f5;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.1);
}
.avatar-fallback {
  width: 192rpx;
  height: 192rpx;
  border-radius: 50%;
  border: 8rpx solid #faf8f5;
  background: rgba(196, 30, 58, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.1);
}
.avatar-fallback-text {
  font-size: 56rpx;
  color: #c41e3a;
}
.avatar-cam {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: #c41e3a;
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
  padding: 0 32rpx;
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}
.card {
  padding: 32rpx;
  background: #ffffff;
  border-radius: 24rpx;
  border: 2rpx solid #f0ece5;
}
.card-label {
  display: block;
  font-size: 22rpx;
  color: #999999;
  margin-bottom: 16rpx;
}
.input-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.text-input {
  flex: 1;
  font-size: 30rpx;
  color: #2c2c2c;
}
.ph {
  color: rgba(153, 153, 153, 0.5);
}
.count {
  font-size: 22rpx;
  color: #999999;
}
.textarea {
  width: 100%;
  height: 132rpx;
  font-size: 30rpx;
  color: #2c2c2c;
  box-sizing: border-box;
}
.count-row {
  display: flex;
  justify-content: flex-end;
}
.card-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.row-label {
  font-size: 28rpx;
  color: #2c2c2c;
}
.row-value {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.row-text {
  font-size: 28rpx;
  color: #999999;
}

/* 标签 */
.tag-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}
.tag-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.tag-chip {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 12rpx 8rpx 20rpx;
  border-radius: 999rpx;
  background: rgba(196, 30, 58, 0.1);
}
.tag-chip-text {
  font-size: 26rpx;
  color: #c41e3a;
}
.tag-del {
  width: 32rpx;
  height: 32rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.tag-add {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 24rpx;
  border-radius: 999rpx;
  border: 2rpx dashed rgba(153, 153, 153, 0.3);
}
.tag-add-text {
  font-size: 26rpx;
  color: #999999;
}

/* 弹窗通用 */
.mask {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.sheet {
  width: 100%;
  background: #ffffff;
  border-radius: 32rpx 32rpx 0 0;
  overflow: hidden;
}
.sheet-tall {
  max-height: 70vh;
  display: flex;
  flex-direction: column;
}
.sheet-list {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.sheet-item {
  height: 104rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 24rpx;
}
.sheet-item-text {
  font-size: 30rpx;
  color: #2c2c2c;
}
.sheet-cancel {
  height: 104rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-top: 2rpx solid #f0ece5;
}
.sheet-cancel-text {
  font-size: 30rpx;
  color: #999999;
}
.sheet-title-bar {
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 2rpx solid #f0ece5;
}
.sheet-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.sheet-opt {
  height: 104rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  border-radius: 24rpx;
}
.sheet-opt-active {
  background: rgba(196, 30, 58, 0.1);
}
.sheet-opt-text {
  font-size: 30rpx;
  color: #2c2c2c;
}
.sheet-opt-text-active {
  color: #c41e3a;
}

/* picker头部 */
.picker-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx;
  border-bottom: 2rpx solid #f0ece5;
}
.picker-cancel {
  font-size: 28rpx;
  color: #999999;
}
.picker-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.picker-confirm {
  font-size: 28rpx;
  font-weight: 500;
  color: #c41e3a;
}
.date-body {
  padding: 32rpx;
}
.date-display {
  height: 104rpx;
  background: #f0ece5;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
  color: #2c2c2c;
}

/* 地区 */
.loc-body {
  display: flex;
  padding: 32rpx;
  gap: 32rpx;
}
.loc-col {
  flex: 1;
}
.loc-label {
  display: block;
  font-size: 22rpx;
  color: #999999;
  margin-bottom: 16rpx;
}
.loc-scroll {
  height: 384rpx;
}
.loc-opt {
  padding: 16rpx 24rpx;
  border-radius: 16rpx;
}
.loc-opt-active {
  background: rgba(196, 30, 58, 0.1);
}
.loc-opt-text {
  font-size: 28rpx;
  color: #2c2c2c;
}
.loc-opt-text-active {
  color: #c41e3a;
}

/* 标签选择 */
.tag-scroll {
  flex: 1;
  padding: 32rpx;
}
.tag-cat {
  margin-bottom: 48rpx;
}
.tag-cat-name {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
  margin-bottom: 24rpx;
}
.tag-cat-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.tag-opt {
  padding: 12rpx 24rpx;
  border-radius: 999rpx;
  background: #f0ece5;
}
.tag-opt-active {
  background: #c41e3a;
}
.tag-opt-disabled {
  opacity: 0.5;
}
.tag-opt-text {
  font-size: 26rpx;
  color: #2c2c2c;
}
.tag-opt-text-active {
  color: #ffffff;
}
.tag-opt-text-disabled {
  color: rgba(153, 153, 153, 0.5);
}
</style>
