<template>
  <view class="page">
    <view class="header">
      <view class="back-btn" @click="goBack"><text class="back-arrow">←</text></view>
      <text class="header-title">店铺信息</text>
      <view class="header-spacer" />
    </view>

    <view v-if="loading" class="loading-wrap"><text class="loading-text">加载中...</text></view>

    <template v-else>
      <view class="form-wrap">
        <!-- 店铺Logo -->
        <view class="form-group">
          <text class="form-label">店铺Logo</text>
          <view class="logo-upload" @click="chooseLogo">
            <image v-if="form.logo" :src="form.logo" class="logo-img" mode="aspectFill" />
            <text v-else class="logo-placeholder">+</text>
          </view>
        </view>

        <!-- 店铺名称 -->
        <view class="form-group">
          <text class="form-label">店铺名称</text>
          <input
            v-model="form.shopName"
            class="form-input"
            placeholder="请输入店铺名称"
            placeholder-class="placeholder"
          />
        </view>

        <!-- 联系电话 -->
        <view class="form-group">
          <text class="form-label">联系电话</text>
          <input
            v-model="form.phone"
            class="form-input"
            type="text"
            placeholder="请输入联系电话"
            placeholder-class="placeholder"
          />
        </view>

        <!-- 营业时间 -->
        <view class="form-group">
          <text class="form-label">营业时间</text>
          <input
            v-model="form.businessHours"
            class="form-input"
            placeholder="例如：09:00-21:00"
            placeholder-class="placeholder"
          />
        </view>

        <!-- 店铺简介 -->
        <view class="form-group">
          <text class="form-label">店铺简介</text>
          <textarea
            v-model="form.shopIntro"
            class="form-textarea"
            placeholder="请输入店铺简介"
            placeholder-class="placeholder"
            maxlength="500"
          />
          <text class="char-count">{{ (form.shopIntro || '').length }}/500</text>
        </view>
      </view>

      <!-- 底部按钮 -->
      <view class="bottom-bar">
        <view class="save-btn" @click="handleSave">
          <text class="save-btn-text">保存</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { merchantApi } from '@/api'

const loading = ref(true)
const saving = ref(false)

const form = ref({
  shopName: '',
  shopIntro: '',
  logo: '',
  phone: '',
  businessHours: '',
})

onMounted(async () => {
  try {
    const res = await merchantApi.getProfile()
    const data = res?.data || res || {}
    form.value.shopName = data.shopName || data.shop_name || ''
    form.value.shopIntro = data.shopIntro || data.shop_intro || ''
    form.value.logo = data.logo || data.shopLogo || ''
    form.value.phone = data.phone || data.contactPhone || ''
    form.value.businessHours = data.businessHours || data.business_hours || ''
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
})

function chooseLogo() {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      const tempPath = res.tempFilePaths[0]
      // 上传图片
      uni.uploadFile({
        url: (import.meta as any).env.VITE_API_BASE
          ? `${(import.meta as any).env.VITE_API_BASE}/api/v1/upload/image`
          : '/api/v1/upload/image',
        filePath: tempPath,
        name: 'file',
        header: {
          Authorization: `Bearer ${uni.getStorageSync('token')}`,
        },
        success: (uploadRes) => {
          try {
            const body = JSON.parse(uploadRes.data)
            const url = body?.data?.url || body?.url || body?.data || ''
            if (url) {
              form.value.logo = url
            } else {
              // 如果上传接口不返回标准格式，至少保留本地预览
              form.value.logo = tempPath
            }
          } catch {
            form.value.logo = tempPath
          }
        },
        fail: () => {
          uni.showToast({ title: '上传失败', icon: 'none' })
        },
      })
    },
  })
}

async function handleSave() {
  if (!form.value.shopName.trim()) {
    uni.showToast({ title: '请输入店铺名称', icon: 'none' })
    return
  }
  if (saving.value) return
  saving.value = true
  try {
    await merchantApi.updateProfile({
      shopName: form.value.shopName,
      shopIntro: form.value.shopIntro,
      logo: form.value.logo,
      phone: form.value.phone,
      businessHours: form.value.businessHours,
    })
    uni.showToast({ title: '保存成功', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 1500)
  } catch {
    uni.showToast({ title: '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

function goBack() { uni.navigateBack() }
</script>

<style scoped>
.page { min-height: 100vh; background: #F5F0E8; }

.header { display: flex; align-items: center; padding: 24rpx 32rpx; background: #fff; border-bottom: 1rpx solid #E8E0D5; }
.back-btn { padding: 8rpx 16rpx 8rpx 0; }
.back-arrow { font-size: 40rpx; color: #3C2415; }
.header-title { flex: 1; font-size: 32rpx; font-weight: 600; color: #3C2415; text-align: center; }
.header-spacer { width: 60rpx; }

.loading-wrap { display: flex; align-items: center; justify-content: center; height: 400rpx; }
.loading-text { font-size: 28rpx; color: #999; }

.form-wrap { padding: 24rpx; padding-bottom: 140rpx; }

.form-group { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; }
.form-label { font-size: 26rpx; font-weight: 600; color: #3C2415; display: block; margin-bottom: 12rpx; }

.form-input {
  background: #F5F0E8;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
  font-size: 26rpx;
  color: #3C2415;
  border: 2rpx solid transparent;
  transition: border-color 0.2s;
}
.form-input:focus { border-color: #8b6914; }

.form-textarea {
  background: #F5F0E8;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
  font-size: 26rpx;
  color: #3C2415;
  width: 100%;
  min-height: 160rpx;
  border: 2rpx solid transparent;
  transition: border-color 0.2s;
  box-sizing: border-box;
}
.form-textarea:focus { border-color: #8b6914; }

.char-count { font-size: 20rpx; color: #ccc; display: block; text-align: right; margin-top: 8rpx; }

.placeholder { color: #ccc; font-size: 26rpx; }

/* Logo上传 */
.logo-upload {
  width: 140rpx;
  height: 140rpx;
  border-radius: 16rpx;
  background: #F5F0E8;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2rpx dashed #d9d0c0;
  overflow: hidden;
}
.logo-img { width: 140rpx; height: 140rpx; border-radius: 16rpx; }
.logo-placeholder { font-size: 48rpx; color: #ccc; }

/* 底部按钮 */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16rpx 24rpx 40rpx;
  background: #F5F0E8;
  box-shadow: 0 -4rpx 16rpx rgba(0,0,0,0.04);
}
.save-btn {
  background: linear-gradient(135deg, #5a3a1a, #8b6914);
  border-radius: 16rpx;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.save-btn:active { opacity: 0.85; }
.save-btn-text { font-size: 30rpx; font-weight: 600; color: #fff; }
</style>
