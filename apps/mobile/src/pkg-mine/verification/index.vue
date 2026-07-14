<script setup lang="ts">
/**
 * 实名认证（二要素核验）— 2026-07-14 接线新建
 *
 * 背景：后端 identity 模块（OCR / 二要素核验 / 人脸核身 + admin 审核）**整套早已做完**，
 *   前端却从未调用；唯一的实名表单页在已退役的 pkg-settings 里且是纯假页
 *   （上传写死 '/images/id-front.jpg'、提交是 setTimeout 不发请求），
 *   而账号安全页的「实名认证」href 指向页面自己 → 点了原地跳回，**死循环**。
 *   实名是【提现 / 发布课程 / 讲师认证】的前置 —— 讲师认证提示"请先实名"，跳过去又转回来。
 *
 * 本页接【二要素核验】：姓名 + 身份证号 → 腾讯云 CheckIdCardInformation。
 *   不依赖 OCR 图片上传与活体配置，是最短可用路径；通过后后端置 user.identityVerified=true。
 *   后端限每日 3 次（防撞库），已认证用户重复提交会被拒（需联系客服改身份信息）。
 */
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { mineApi, identityApi } from '@/lib/mine-data'

const loading = ref(true)
const error = ref('')
const submitting = ref(false)
const verified = ref(false)

const name = ref('')
const idCard = ref('')

/** 身份证号：18 位（末位可为 X）。前端先挡明显错误，减少无谓消耗每日 3 次配额 */
const idCardOk = computed(() => /^\d{17}[\dXx]$/.test(idCard.value.trim()))
const nameOk = computed(() => name.value.trim().length >= 2)
const canSubmit = computed(() => nameOk.value && idCardOk.value && !submitting.value)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const me = await mineApi.getProfile()
    verified.value = !!me.identityVerified
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function submit() {
  if (!canSubmit.value) {
    if (!nameOk.value) uni.showToast({ title: '请填写真实姓名', icon: 'none' })
    else if (!idCardOk.value) uni.showToast({ title: '身份证号格式不正确', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    const r = await identityApi.verify(name.value.trim(), idCard.value.trim().toUpperCase())
    if (r.passed) {
      verified.value = true
      uni.showToast({ title: '实名认证通过', icon: 'success' })
      setTimeout(() => goBack(), 1500)
    } else {
      // 如实回显后端的失败原因（姓名与身份证号不匹配 / 号码非法等）
      uni.showModal({
        title: '认证未通过',
        content: r.description || '姓名与身份证号不匹配，请核对后重试（每日限 3 次）',
        showCancel: false,
        confirmColor: '#C41E3A',
      })
    }
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '认证失败，请稍后重试', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

onMounted(load)
</script>

<template>
  <view class="page">
    <view class="topbar">
      <view class="back" @tap="goBack"><app-icon name="chevron-left" :size="40" color="#2C2C2C" /></view>
      <text class="topbar-title">实名认证</text>
    </view>

    <view v-if="loading" class="state">
      <view class="skel" /><view class="skel" />
    </view>
    <view v-else-if="error" class="state center">
      <text class="state-t">{{ error }}</text>
      <view class="retry" @tap="load"><text class="retry-t">重试</text></view>
    </view>

    <!-- 已认证 -->
    <template v-else-if="verified">
      <view class="done">
        <view class="done-icon"><app-icon name="shield" :size="64" color="#C9A96E" /></view>
        <text class="done-t">已完成实名认证</text>
        <text class="done-s">如需变更身份信息，请联系平台客服</text>
      </view>
    </template>

    <!-- 未认证：二要素核验表单 -->
    <template v-else>
      <text class="group-label">实名信息 · 需与身份证一致</text>
      <view class="group">
        <view class="field">
          <text class="field-label">真实姓名</text>
          <input v-model="name" class="inp" type="text" placeholder="请输入身份证上的姓名" placeholder-class="ph" :maxlength="20" />
        </view>
        <view class="field">
          <text class="field-label">身份证号</text>
          <input v-model="idCard" class="inp" type="idcard" placeholder="请输入 18 位身份证号" placeholder-class="ph" :maxlength="18" />
        </view>
      </view>

      <view class="tips">
        <view class="tip">
          <app-icon name="shield" :size="24" color="#C9A96E" />
          <text class="tip-t">信息仅用于身份核验，加密存储，不对外展示</text>
        </view>
        <view class="tip">
          <app-icon name="info" :size="24" color="#C9A96E" />
          <text class="tip-t">实名后方可提现、发布课程与申请讲师认证</text>
        </view>
        <view class="tip">
          <app-icon name="alert-circle" :size="24" color="#C97B2D" />
          <text class="tip-t">每日最多核验 3 次，请仔细核对后提交</text>
        </view>
      </view>

      <view class="savebar">
        <view class="btn" :class="{ disabled: !canSubmit }" @tap="submit">
          <text class="btn-t">{{ submitting ? '核验中…' : '提交认证' }}</text>
        </view>
      </view>
    </template>
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: var(--bg-page, #faf8f5); padding-bottom: calc(176rpx + env(safe-area-inset-bottom)); }

.topbar {
  position: sticky; top: 0; z-index: 20;
  display: flex; align-items: center; gap: 20rpx;
  padding: 24rpx 32rpx; padding-top: calc(var(--status-bar-height, 0px) + 24rpx);
  background: rgba(250, 248, 245, 0.92); backdrop-filter: blur(24rpx);
  border-bottom: 1rpx solid var(--separator, #ede7dd);
}
.back { display: flex; align-items: center; }
.topbar-title { font-size: 34rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); flex: 1; }

.state { padding: 32rpx; }
.state.center { padding: 160rpx 80rpx; display: flex; flex-direction: column; align-items: center; gap: 16rpx; }
.skel { height: 120rpx; border-radius: 28rpx; background: #fff; margin-bottom: 24rpx; }
.state-t { font-size: 28rpx; color: var(--text-tertiary, #999); }
.retry { margin-top: 12rpx; padding: 14rpx 56rpx; border-radius: 999rpx; background: var(--brand, #c41e3a); }
.retry-t { font-size: 26rpx; color: #fff; }

/* 已认证 */
.done { padding: 140rpx 64rpx; display: flex; flex-direction: column; align-items: center; gap: 20rpx; }
.done-icon {
  width: 140rpx; height: 140rpx; border-radius: 999rpx;
  background: var(--gold-soft, rgba(201, 169, 110, 0.14));
  display: flex; align-items: center; justify-content: center;
}
.done-t { font-size: 34rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); }
.done-s { font-size: 24rpx; color: var(--text-tertiary, #999); text-align: center; line-height: 1.7; }

.group-label { display: block; margin: 36rpx 36rpx 16rpx; font-size: 24rpx; color: var(--text-tertiary, #999); }
.group {
  margin: 0 32rpx; background: var(--bg-card, #fff);
  border-radius: 32rpx; box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05); overflow: hidden;
}
.field { padding: 28rpx 32rpx; }
.field + .field { border-top: 1rpx solid var(--separator, #ede7dd); }
.field-label { display: block; font-size: 26rpx; color: var(--text-secondary, #6e6e73); margin-bottom: 12rpx; }
/* uni-app 坑：原生 input 只写 padding 不写 height 会塌成 0 高、真机点不了 */
.inp { width: 100%; height: 64rpx; font-size: 30rpx; color: var(--text-primary, #2c2c2c); }
.ph { color: #b9b3aa; }

.tips { margin: 28rpx 36rpx 0; display: flex; flex-direction: column; gap: 16rpx; }
.tip { display: flex; align-items: flex-start; gap: 12rpx; }
.tip-t { flex: 1; font-size: 22rpx; color: var(--text-tertiary, #999); line-height: 1.7; }

.savebar {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 30;
  padding: 24rpx 32rpx calc(24rpx + env(safe-area-inset-bottom));
  background: rgba(250, 248, 245, 0.92); backdrop-filter: blur(24rpx);
  border-top: 1rpx solid var(--separator, #ede7dd);
}
.btn {
  height: 92rpx; border-radius: 46rpx; background: var(--brand, #c41e3a);
  display: flex; align-items: center; justify-content: center;
}
.btn.disabled { opacity: 0.5; }
.btn-t { font-size: 32rpx; font-weight: 600; color: #fff; letter-spacing: 2rpx; }
</style>
