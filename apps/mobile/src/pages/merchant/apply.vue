<template>
  <view class="page">
    <view class="header">
      <view class="back-btn" @click="goBack"><text class="back-arrow">←</text></view>
      <text class="header-title">商家入驻</text>
      <view class="header-spacer" />
    </view>

    <!-- 步骤条 -->
    <view class="steps-bar">
      <view class="step" :class="{ active: step >= 1, done: step > 1 }">
        <view class="step-num"><text>{{ step > 1 ? '✓' : '1' }}</text></view>
        <text class="step-label">填写资料</text>
      </view>
      <view class="step-line" :class="{ done: step > 1 }" />
      <view class="step" :class="{ active: step >= 2, done: step > 2 }">
        <view class="step-num"><text>{{ step > 2 ? '✓' : '2' }}</text></view>
        <text class="step-label">签署协议</text>
      </view>
      <view class="step-line" :class="{ done: step > 2 }" />
      <view class="step" :class="{ active: step >= 3 }">
        <view class="step-num"><text>3</text></view>
        <text class="step-label">缴纳保证金</text>
      </view>
    </view>

    <!-- Step 1: 资料填写 -->
    <scroll-view v-if="step === 1" scroll-y class="form-body">
      <view class="form-section">
        <text class="section-label">店铺信息</text>
        <view class="form-item">
          <text class="field-label">店铺名称 <text class="req">*</text></text>
          <input v-model="form.shopName" class="field-input" placeholder="请输入店铺名称" maxlength="30" />
        </view>
        <view class="form-item">
          <text class="field-label">店铺简介</text>
          <textarea v-model="form.shopIntro" class="field-textarea" placeholder="简单介绍一下您的店铺（选填）" maxlength="500" />
        </view>
      </view>

      <view class="form-section">
        <text class="section-label">联系人信息</text>
        <view class="form-item">
          <text class="field-label">姓名 <text class="req">*</text></text>
          <input v-model="form.contactName" class="field-input" placeholder="请输入联系人姓名" />
        </view>
        <view class="form-item">
          <text class="field-label">手机号 <text class="req">*</text></text>
          <input v-model="form.contactPhone" class="field-input" type="number" maxlength="11" placeholder="请输入手机号" />
        </view>
        <view class="form-item">
          <text class="field-label">身份证号 <text class="req">*</text></text>
          <input v-model="form.idCardNumber" class="field-input" placeholder="请输入身份证号" maxlength="18" />
        </view>
      </view>

      <view class="form-section">
        <text class="section-label">资质文件（选填）</text>
        <view class="upload-row">
          <view class="upload-item" @click="uploadFile('idCardFront')">
            <text class="upload-icon">📷</text>
            <text class="upload-label">{{ form.idCardFront ? '已上传' : '身份证正面' }}</text>
          </view>
          <view class="upload-item" @click="uploadFile('idCardBack')">
            <text class="upload-icon">📷</text>
            <text class="upload-label">{{ form.idCardBack ? '已上传' : '身份证反面' }}</text>
          </view>
          <view class="upload-item" @click="uploadFile('businessLicense')">
            <text class="upload-icon">📄</text>
            <text class="upload-label">{{ form.businessLicense ? '已上传' : '营业执照' }}</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- Step 2: 协议签署 -->
    <scroll-view v-if="step === 2" scroll-y class="form-body">
      <view class="agreement-box">
        <text class="agreement-title">商家入驻协议</text>
        <view class="agreement-content">
          <text class="agreement-text">{{ agreementText }}</text>
        </view>
      </view>
      <view class="agree-row" @click="agreed = !agreed">
        <view class="agree-check" :class="{ checked: agreed }">
          <text v-if="agreed" class="check-mark">✓</text>
        </view>
        <text class="agree-text">我已阅读并同意《商家入驻协议》</text>
      </view>
    </scroll-view>

    <!-- Step 3: 保证金 -->
    <scroll-view v-if="step === 3" scroll-y class="form-body">
      <view class="deposit-card">
        <text class="deposit-amount">¥ {{ depositAmount }}</text>
        <text class="deposit-label">应缴保证金</text>
        <text class="deposit-desc">保证金将在您退出平台时全额退还</text>
      </view>
      <view class="pay-methods">
        <text class="section-label">支付方式</text>
        <view class="pay-option" :class="{ active: payMethod === 'WECHAT' }" @click="payMethod = 'WECHAT'">
          <text class="pay-icon">💚</text>
          <text class="pay-name">微信支付</text>
        </view>
        <view class="pay-option" :class="{ active: payMethod === 'ALIPAY' }" @click="payMethod = 'ALIPAY'">
          <text class="pay-icon">💙</text>
          <text class="pay-name">支付宝</text>
        </view>
      </view>
    </scroll-view>

    <!-- 底部按钮 -->
    <view class="bottom-bar">
      <view v-if="step > 1" class="btn-prev" @click="step--"><text>上一步</text></view>
      <view class="btn-next" @click="doNext">
        <text>{{ nextLabel }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { merchantApi } from '@/api'

const step = ref(1)
const agreed = ref(false)
const payMethod = ref('WECHAT')
const depositAmount = ref(2000)
const submitting = ref(false)

const form = reactive({
  shopName: '',
  shopIntro: '',
  contactName: '',
  contactPhone: '',
  idCardNumber: '',
  idCardFront: '',
  idCardBack: '',
  businessLicense: '',
})

const agreementText = `本协议由您与国学传统文化综合平台（以下简称"平台"）共同缔结。

一、定义
1.1 商家：指在平台注册并完成入驻流程，通过平台向用户提供商品/服务的法人或个体工商户。
1.2 平台：指国学传统文化综合平台的运营主体。

二、入驻条件
2.1 商家应具备合法经营主体资格，提供真实有效的营业执照及法定代表人身份证明。
2.2 商家应缴纳平台规定的保证金。

三、商家权利义务
3.1 商家有权在平台发布商品、管理订单、查看经营数据。
3.2 商家应保证所售商品/服务合法合规，不得侵犯第三方知识产权。
3.3 商家应遵守平台运营规则，接受平台监督管理。

四、平台权利义务
4.1 平台有权对商家资质、商品进行审核。
4.2 平台有权对违规商家进行处罚，包括但不限于警告、罚款、暂停营业、清退。

五、保证金
5.1 保证金用于保证商家履行义务，商家退出时无息退还。
5.2 商家违规导致扣除保证金的，应在7日内补足。

六、结算
6.1 平台按约定周期为商家结算货款，扣除平台服务费和分佣。
6.2 结算金额以平台系统记录为准。

七、其他
7.1 本协议解释权归平台所有。
7.2 因本协议产生的争议，双方协商解决；协商不成的，提交平台所在地人民法院管辖。`

const nextLabel = computed(() => {
  if (step.value === 1) return '下一步'
  if (step.value === 2) return '确认签署'
  return '确认支付'
})

async function doNext() {
  if (step.value === 1) {
    if (!form.shopName) { uni.showToast({ title: '请输入店铺名称', icon: 'none' }); return }
    if (!form.contactName) { uni.showToast({ title: '请输入联系人姓名', icon: 'none' }); return }
    if (!form.contactPhone || !/^1[3-9]\d{9}$/.test(form.contactPhone)) { uni.showToast({ title: '请输入正确的手机号', icon: 'none' }); return }
    if (!form.idCardNumber || !/^[1-9]\d{5}(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/.test(form.idCardNumber)) { uni.showToast({ title: '请输入正确的身份证号', icon: 'none' }); return }

    try {
      submitting.value = true
      await merchantApi.apply({ ...form })
      step.value = 2
    } catch { uni.showToast({ title: '提交失败，请重试', icon: 'none' }) }
    finally { submitting.value = false }
  } else if (step.value === 2) {
    if (!agreed.value) { uni.showToast({ title: '请先阅读并同意入驻协议', icon: 'none' }); return }
    try {
      await merchantApi.submitForReview()
      step.value = 3
    } catch { uni.showToast({ title: '提交失败，请重试', icon: 'none' }) }
  } else if (step.value === 3) {
    try {
      submitting.value = true
      await merchantApi.payDeposit({ payMethod: payMethod.value })
      uni.showToast({ title: '入驻申请已提交，等待审核', icon: 'success' })
      setTimeout(() => uni.redirectTo({ url: '/pages/merchant/status' }), 1500)
    } catch { uni.showToast({ title: '支付失败，请重试', icon: 'none' }) }
    finally { submitting.value = false }
  }
}

function uploadFile(field: string) {
  uni.chooseImage({
    count: 1,
    success: (res) => {
      const fp = res.tempFilePaths[0]
      // Mock: set file path directly (in production, upload to cloud first)
      ;(form as any)[field] = fp
      uni.showToast({ title: '上传成功', icon: 'success' })
    },
  })
}

function goBack() {
  if (step.value > 1) { step.value-- }
  else { uni.navigateBack() }
}
</script>

<style scoped>
.page { min-height: 100vh; background: #F5F0E8; display: flex; flex-direction: column; }

.header { display: flex; align-items: center; padding: 24rpx 32rpx; background: #fff; border-bottom: 1rpx solid #E8E0D5; }
.back-btn { padding: 8rpx 16rpx 8rpx 0; }
.back-arrow { font-size: 40rpx; color: #3C2415; }
.header-title { flex: 1; font-size: 32rpx; font-weight: 600; color: #3C2415; text-align: center; }
.header-spacer { width: 60rpx; }

/* 步骤条 */
.steps-bar { display: flex; align-items: center; justify-content: center; padding: 32rpx 48rpx; background: #fff; gap: 0; }
.step { display: flex; flex-direction: column; align-items: center; gap: 8rpx; }
.step-num { width: 48rpx; height: 48rpx; border-radius: 50%; background: #e8e0d5; display: flex; align-items: center; justify-content: center; }
.step-num text { font-size: 24rpx; color: #999; }
.step.active .step-num { background: #5a3a1a; }
.step.active .step-num text { color: #fff; }
.step.done .step-num { background: #52C41A; }
.step.done .step-num text { color: #fff; }
.step-label { font-size: 22rpx; color: #999; }
.step.active .step-label { color: #5a3a1a; font-weight: 600; }
.step.done .step-label { color: #52C41A; }
.step-line { flex: 1; height: 3rpx; background: #e8e0d5; margin-bottom: 24rpx; max-width: 80rpx; }
.step-line.done { background: #52C41A; }

/* 表单 */
.form-body { flex: 1; padding: 24rpx; }
.form-section { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; }
.section-label { font-size: 28rpx; font-weight: 600; color: #3C2415; display: block; margin-bottom: 16rpx; padding-left: 8rpx; border-left: 4rpx solid #8b6914; }
.form-item { margin-bottom: 20rpx; }
.field-label { font-size: 26rpx; color: #666; display: block; margin-bottom: 8rpx; }
.req { color: #C41E3A; }
.field-input { height: 80rpx; background: #F5F0E8; border-radius: 12rpx; padding: 0 20rpx; font-size: 28rpx; border: 2rpx solid transparent; }
.field-input:focus { border-color: #8b6914; background: #fff; }
.field-textarea { width: 100%; height: 160rpx; background: #F5F0E8; border-radius: 12rpx; padding: 16rpx 20rpx; font-size: 26rpx; border: 2rpx solid transparent; box-sizing: border-box; }
.field-textarea:focus { border-color: #8b6914; background: #fff; }

.upload-row { display: flex; gap: 16rpx; }
.upload-item { flex: 1; height: 140rpx; background: #F5F0E8; border-radius: 12rpx; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8rpx; border: 2rpx dashed #E8E0D5; }
.upload-icon { font-size: 36rpx; }
.upload-label { font-size: 20rpx; color: #999; }

/* 协议 */
.agreement-box { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; }
.agreement-title { font-size: 28rpx; font-weight: 600; color: #3C2415; display: block; margin-bottom: 16rpx; text-align: center; }
.agreement-content { max-height: 600rpx; overflow-y: auto; padding: 16rpx; background: #FAFAF8; border-radius: 8rpx; }
.agreement-text { font-size: 24rpx; color: #666; line-height: 1.8; white-space: pre-wrap; }
.agree-row { display: flex; align-items: center; gap: 16rpx; padding: 16rpx 24rpx; background: #fff; border-radius: 16rpx; }
.agree-check { width: 40rpx; height: 40rpx; border-radius: 8rpx; border: 2rpx solid #E8E0D5; display: flex; align-items: center; justify-content: center; }
.agree-check.checked { background: #5a3a1a; border-color: #5a3a1a; }
.check-mark { font-size: 24rpx; color: #fff; }
.agree-text { font-size: 26rpx; color: #3C2415; }

/* 保证金 */
.deposit-card { background: linear-gradient(135deg, #5a3a1a, #8b6914); border-radius: 16rpx; padding: 40rpx; text-align: center; margin-bottom: 24rpx; }
.deposit-amount { font-size: 56rpx; font-weight: bold; color: #fff; display: block; }
.deposit-label { font-size: 26rpx; color: rgba(255,255,255,0.8); display: block; margin-top: 8rpx; }
.deposit-desc { font-size: 22rpx; color: rgba(255,255,255,0.6); display: block; margin-top: 12rpx; }
.pay-methods { background: #fff; border-radius: 16rpx; padding: 24rpx; }
.pay-option { display: flex; align-items: center; gap: 16rpx; padding: 24rpx; background: #F5F0E8; border-radius: 12rpx; margin-top: 16rpx; border: 2rpx solid transparent; }
.pay-option.active { border-color: #8b6914; background: #FEF3C7; }
.pay-icon { font-size: 36rpx; }
.pay-name { font-size: 28rpx; color: #3C2415; }

/* 底部 */
.bottom-bar { display: flex; gap: 16rpx; padding: 16rpx 24rpx; background: #fff; border-top: 1rpx solid #E8E0D5; flex-shrink: 0; }
.btn-prev { flex: 0 0 160rpx; height: 80rpx; background: #F5F0E8; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; }
.btn-prev text { font-size: 28rpx; color: #666; }
.btn-next { flex: 1; height: 80rpx; background: linear-gradient(135deg, #5a3a1a, #8b6914); border-radius: 16rpx; display: flex; align-items: center; justify-content: center; }
.btn-next text { font-size: 28rpx; color: #fff; font-weight: 600; }
.btn-next:active { opacity: 0.9; }
</style>
