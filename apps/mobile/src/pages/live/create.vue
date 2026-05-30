<template>
  <view class="page">
    <!-- 顶栏 -->
    <view class="nav-bar">
      <view class="nav-left" @click="goBack">
        <text class="nav-back">‹</text>
      </view>
      <text class="nav-title">创建直播间</text>
      <view class="nav-right">
        <text class="submit-btn" :class="{ disabled: submitting || !canSubmit }" @click="submit">
          {{ submitting ? '创建中...' : '创建' }}
        </text>
      </view>
    </view>

    <!-- 表单 -->
    <view class="form">
      <!-- 标题 -->
      <view class="form-row">
        <text class="form-label">标题 <text class="required">*</text></text>
        <input
          v-model="title"
          class="form-input"
          placeholder="输入直播标题..."
          maxlength="50"
        />
      </view>

      <!-- 封面 -->
      <view class="form-row">
        <text class="form-label">封面</text>
        <view class="cover-row">
          <view v-if="cover" class="cover-preview-wrap">
            <image :src="cover" class="cover-preview" mode="aspectFill" />
            <text class="cover-remove" @click="cover = ''">×</text>
          </view>
          <view v-else class="cover-add" @click="chooseCover">
            <text class="cover-add-icon">🖼</text>
            <text class="cover-add-text">添加封面</text>
          </view>
        </view>
      </view>

      <!-- 圈子 -->
      <view class="form-row">
        <text class="form-label">发布到圈子</text>
        <picker
          v-if="circles.length > 0"
          mode="selector"
          :range="circleNames"
          :value="circleIndex"
          @change="onCircleChange"
        >
          <view class="picker-val">
            <text :class="{ placeholder: circleIndex < 0 }">
              {{ circleIndex >= 0 ? circleNames[circleIndex] : '不限于圈子' }}
            </text>
            <text class="picker-arrow">›</text>
          </view>
        </picker>
        <text v-else class="form-hint">暂无已加入的圈子</text>
      </view>

      <!-- 收费类型 -->
      <view class="form-row">
        <text class="form-label">收费类型</text>
        <picker
          mode="selector"
          :range="chargeTypes"
          :value="chargeIndex"
          @change="onChargeChange"
        >
          <view class="picker-val">
            <text>{{ chargeTypes[chargeIndex] }}</text>
            <text class="picker-arrow">›</text>
          </view>
        </picker>
      </view>

      <!-- 收费价格 -->
      <view class="form-row" v-if="chargeIndex > 0">
        <text class="form-label">价格（元）</text>
        <input
          v-model.number="chargePrice"
          class="form-input"
          type="digit"
          placeholder="输入价格"
        />
      </view>
    </view>

    <view class="bottom-safe" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue"
import { liveApi, circleApi, uploadApi } from "../../api"

const title = ref("")
const cover = ref("")
const circleIndex = ref(-1)
const circles = ref<any[]>([])
const chargeIndex = ref(0)
const chargePrice = ref(0)
const submitting = ref(false)

const chargeTypes = ["免费", "付费", "仅圈子", "会员免费"]
const chargeTypeValues = ["FREE", "PAID", "CIRCLE_ONLY", "MEMBER_FREE"]

const circleNames = computed(() => circles.value.map((c: any) => c.circle?.name || c.name || ""))

const canSubmit = computed(() => !!title.value.trim())

onMounted(() => {
  fetchMyCircles()
})

async function fetchMyCircles() {
  try {
    const res = await circleApi.my()
    circles.value = Array.isArray(res) ? res : []
  } catch { /* 静默 */ }
}

function chooseCover() {
  uni.chooseImage({
    count: 1,
    sizeType: ["compressed"],
    sourceType: ["album", "camera"],
    success: async (res) => {
      const fp = res.tempFilePaths?.[0]
      if (!fp) return
      try {
        const uploadRes: any = await uploadApi.image(fp)
        const url = uploadRes?.data?.url || uploadRes?.url || ""
        if (url) cover.value = url
        else uni.showToast({ title: "上传失败", icon: "none" })
      } catch {
        uni.showToast({ title: "上传失败", icon: "none" })
      }
    },
  })
}

function onCircleChange(e: any) {
  circleIndex.value = e.detail.value
}

function onChargeChange(e: any) {
  chargeIndex.value = e.detail.value
}

async function submit() {
  if (!canSubmit.value || submitting.value) return
  submitting.value = true
  try {
    const data: any = {
      title: title.value.trim(),
    }
    if (cover.value) data.cover = cover.value
    if (circleIndex.value >= 0) {
      data.circleId = circles.value[circleIndex.value]?.circle?.id || circles.value[circleIndex.value]?.id
    }
    if (chargeIndex.value > 0) {
      data.chargeType = chargeTypeValues[chargeIndex.value]
      data.chargePrice = chargePrice.value || 0
    }

    await liveApi.createRoom(data)
    uni.showToast({ title: "直播间创建成功", icon: "success" })
    setTimeout(() => {
      uni.navigateBack()
    }, 800)
  } catch (e: any) {
    uni.showToast({ title: e?.errMsg || "创建失败", icon: "none" })
  } finally {
    submitting.value = false
  }
}

function goBack() {
  uni.navigateBack()
}
</script>

<style>
.page {
  background: #F5F0E8;
  min-height: 100vh;
  padding-bottom: 40px;
}

.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  padding-top: calc(10px + env(safe-area-inset-top));
  background: #fff;
  border-bottom: 1px solid #E8E0D5;
}
.nav-left { width: 44px; }
.nav-back { font-size: 32px; color: #333; line-height: 1; }
.nav-title { font-size: 16px; font-weight: bold; color: #2C2C2C; }
.nav-right { display: flex; gap: 12px; align-items: center; }
.submit-btn {
  font-size: 13px; color: #fff; background: #C41E3A;
  padding: 6px 16px; border-radius: 14px; font-weight: 500;
}
.submit-btn.disabled { opacity: 0.4; }

.form { margin: 10px; background: #fff; border-radius: 10px; overflow: hidden; }
.form-row { padding: 14px 16px; border-bottom: 1px solid #F5F0E8; }
.form-label { font-size: 13px; color: #999; margin-bottom: 8px; display: block; }
.required { color: #C41E3A; }
.form-input {
  width: 100%; height: 38px; border: 1px solid #E8E0D5;
  border-radius: 6px; padding: 0 10px; font-size: 14px; color: #2C2C2C;
  box-sizing: border-box;
}
.form-hint { font-size: 13px; color: #ccc; }

.cover-row { display: flex; }
.cover-preview-wrap {
  position: relative; width: 100px; height: 60px;
  border-radius: 6px; overflow: hidden;
}
.cover-preview { width: 100%; height: 100%; }
.cover-remove {
  position: absolute; top: -4px; right: -4px; width: 20px; height: 20px;
  background: #C41E3A; color: #fff; border-radius: 50%;
  text-align: center; line-height: 18px; font-size: 14px; font-weight: bold;
}
.cover-add {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  width: 100px; height: 60px; border: 2px dashed #C9A96E;
  border-radius: 6px; background: #F5F0E8;
}
.cover-add-icon { font-size: 20px; }
.cover-add-text { font-size: 10px; color: #C9A96E; margin-top: 2px; }

.picker-val {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 10px; border: 1px solid #E8E0D5; border-radius: 6px;
  font-size: 14px; color: #2C2C2C;
}
.picker-val .placeholder { color: #ccc; }
.picker-arrow { font-size: 20px; color: #ccc; }

.bottom-safe { height: calc(40px + env(safe-area-inset-bottom)); }
</style>
