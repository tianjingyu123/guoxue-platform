<template>
  <view class="partner-page">
    <view class="header-sticky">
      <view class="header-row">
        <text class="header-back" @click="uni.navigateBack()">‹</text>
        <text class="header-title">成为合作伙伴</text>
      </view>
    </view>

    <!-- Hero -->
    <view class="hero-area">
      <text class="hero-icon">🤝</text>
      <text class="hero-title">欢迎加入国学平台合伙人计划</text>
      <text class="hero-desc">与我们一起传播中华优秀传统文化，共创价值、共享收益</text>
    </view>

    <!-- 合伙人类型 -->
    <view class="section">
      <text class="section-title">合作方式</text>
      <view class="type-cards">
        <view class="type-card" :class="{ sel: partnerType === 'content' }" @click="partnerType = 'content'">
          <text class="tc-icon">✍️</text>
          <text class="tc-name">内容创作者</text>
          <text class="tc-desc">发布课程/文章/视频获取收益</text>
          <text v-if="partnerType === 'content'" class="tc-check">✓</text>
        </view>
        <view class="type-card" :class="{ sel: partnerType === 'expert' }" @click="partnerType = 'expert'">
          <text class="tc-icon">🎓</text>
          <text class="tc-name">命理专家</text>
          <text class="tc-desc">提供咨询/排盘/教学服务</text>
          <text v-if="partnerType === 'expert'" class="tc-check">✓</text>
        </view>
        <view class="type-card" :class="{ sel: partnerType === 'shop' }" @click="partnerType = 'shop'">
          <text class="tc-icon">🛍</text>
          <text class="tc-name">商家入驻</text>
          <text class="tc-desc">销售文创/书籍/法器产品</text>
          <text v-if="partnerType === 'shop'" class="tc-check">✓</text>
        </view>
      </view>
    </view>

    <!-- 权益 -->
    <view class="section">
      <text class="section-title">合伙人权益</text>
      <view class="benefits-list">
        <view v-for="b in benefits" :key="b.title" class="benefit-item">
          <text class="bi-icon">{{ b.icon }}</text>
          <view class="bi-text">
            <text class="bi-title">{{ b.title }}</text>
            <text class="bi-desc">{{ b.desc }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 申请表单 -->
    <view class="section">
      <text class="section-title">提交申请</text>
      <view class="form-card">
        <view class="form-field">
          <text class="ff-label">姓名 <text class="required">*</text></text>
          <input v-model="form.name" class="ff-input" placeholder="请输入真实姓名" />
        </view>
        <view class="form-field">
          <text class="ff-label">手机号 <text class="required">*</text></text>
          <input v-model="form.phone" class="ff-input" type="number" placeholder="请输入手机号" maxlength="11" />
        </view>
        <view class="form-field">
          <text class="ff-label">擅长领域</text>
          <view class="ff-tags">
            <text v-for="t in skillTags" :key="t" class="ff-tag" :class="{ sel: form.skills.includes(t) }" @click="toggleSkill(t)">{{ t }}</text>
          </view>
        </view>
        <view class="form-field">
          <text class="ff-label">个人简介 <text class="required">*</text></text>
          <textarea v-model="form.intro" class="ff-textarea" placeholder="请介绍您的从业经验、专业资质等信息（200字以内）" maxlength="200" />
          <text class="ff-count">{{ form.intro.length }}/200</text>
        </view>
        <view class="form-field">
          <text class="ff-label">微信/联系方式</text>
          <input v-model="form.wechat" class="ff-input" placeholder="方便我们联系您" />
        </view>

        <view class="agree-row">
          <view class="agree-check" :class="{ on: agreed }" @click="agreed = !agreed"><text v-if="agreed">✓</text></view>
          <text class="agree-text">我已阅读并同意 <text class="agree-link">《合伙人协议》</text></text>
        </view>

        <view class="submit-btn" :class="{ off: !canSubmit || submitting }" @click="submit">
          <text>{{ submitting ? '提交中...' : '提交申请' }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'

const partnerType = ref('content')
const agreed = ref(false)
const submitting = ref(false)

const form = reactive({ name: '', phone: '', skills: [] as string[], intro: '', wechat: '' })
const skillTags = ['八字命理', '紫微斗数', '风水堪舆', '六爻占卜', '奇门遁甲', '姓名学', '面相手相', '择日', '国学教育', '国学文创']

const benefits = [
  { icon: '💰', title: '丰厚分成', desc: '内容创作者可获70%收益分成，专家咨询享80%分成' },
  { icon: '📢', title: '流量扶持', desc: '新入驻合伙人享首页推荐、搜索加权等流量资源' },
  { icon: '🛠', title: '工具赋能', desc: '免费使用平台排盘系统、AI辅助等专业工具' },
  { icon: '🎓', title: '培训支持', desc: '定期举办合伙人培训，提升运营和创作能力' },
]

const canSubmit = computed(() => form.name && form.phone.length === 11 && form.intro && agreed.value)

function toggleSkill(t: string) {
  const i = form.skills.indexOf(t)
  if (i >= 0) form.skills.splice(i, 1)
  else if (form.skills.length < 3) form.skills.push(t)
}

function submit() {
  if (!canSubmit.value || submitting.value) return
  submitting.value = true
  setTimeout(() => {
    submitting.value = false
    uni.showToast({ title: '申请已提交，我们会尽快审核', icon: 'success' })
  }, 1200)
}
</script>

<style scoped>
.partner-page { min-height: 100vh; background: #FAF8F5; padding-bottom: 60rpx; }
.header-sticky { position: sticky; top: 0; z-index: 30; background: rgba(250,248,245,0.95); backdrop-filter: blur(12rpx); border-bottom: 1px solid #E8E0D5; }
.header-row { display: flex; align-items: center; padding: 0 24rpx; height: 88rpx; }
.header-back { font-size: 48rpx; color: #333; width: 64rpx; }
.header-title { font-size: 34rpx; font-weight: 700; color: #2C2C2C; }

.hero-area { text-align: center; padding: 48rpx 48rpx 40rpx; background: linear-gradient(180deg, rgba(196,30,58,0.04), transparent); }
.hero-icon { font-size: 96rpx; display: block; margin-bottom: 20rpx; }
.hero-title { font-size: 36rpx; font-weight: 700; color: #2C2C2C; display: block; margin-bottom: 12rpx; }
.hero-desc { font-size: 26rpx; color: #999; line-height: 1.5; }

.section { padding: 0 24rpx; margin-bottom: 32rpx; }
.section-title { font-size: 30rpx; font-weight: 700; color: #2C2C2C; margin-bottom: 20rpx; display: block; }

.type-cards { display: flex; gap: 12rpx; }
.type-card { flex: 1; text-align: center; padding: 28rpx 12rpx; background: #fff; border-radius: 16rpx; position: relative; border: 2rpx solid transparent; }
.type-card.sel { border-color: #C41E3A; background: rgba(196,30,58,0.02); }
.tc-icon { font-size: 48rpx; display: block; margin-bottom: 8rpx; }
.tc-name { font-size: 26rpx; font-weight: 600; color: #333; display: block; }
.tc-desc { font-size: 20rpx; color: #999; margin-top: 4rpx; display: block; }
.tc-check { position: absolute; top: 8rpx; right: 12rpx; color: #C41E3A; font-size: 24rpx; }

.benefits-list { background: #fff; border-radius: 20rpx; padding: 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }
.benefit-item { display: flex; gap: 16rpx; padding: 16rpx 0; }
.benefit-item + .benefit-item { border-top: 1px solid #F5F1EB; }
.bi-icon { font-size: 36rpx; flex-shrink: 0; }
.bi-text { flex: 1; }
.bi-title { font-size: 26rpx; font-weight: 500; color: #333; display: block; }
.bi-desc { font-size: 22rpx; color: #999; margin-top: 4rpx; display: block; line-height: 1.4; }

.form-card { background: #fff; border-radius: 20rpx; padding: 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }
.form-field { margin-bottom: 24rpx; }
.ff-label { font-size: 26rpx; color: #666; display: block; margin-bottom: 12rpx; }
.required { color: #C41E3A; }
.ff-input { height: 88rpx; background: #F5F1EB; border-radius: 16rpx; padding: 0 24rpx; font-size: 28rpx; color: #2C2C2C; width: 100%; box-sizing: border-box; }
.ff-textarea { height: 200rpx; background: #F5F1EB; border-radius: 16rpx; padding: 20rpx 24rpx; font-size: 28rpx; color: #2C2C2C; width: 100%; box-sizing: border-box; }
.ff-count { font-size: 22rpx; color: #999; text-align: right; display: block; margin-top: 8rpx; }
.ff-tags { display: flex; flex-wrap: wrap; gap: 12rpx; }
.ff-tag { font-size: 24rpx; color: #666; background: #F5F1EB; padding: 10rpx 20rpx; border-radius: 32rpx; }
.ff-tag.sel { background: rgba(196,30,58,0.08); color: #C41E3A; border: 1px solid #C41E3A; }

.agree-row { display: flex; align-items: center; gap: 12rpx; margin-bottom: 32rpx; }
.agree-check { width: 36rpx; height: 36rpx; border-radius: 8rpx; border: 3rpx solid #CCC; display: flex; align-items: center; justify-content: center; font-size: 24rpx; color: #fff; }
.agree-check.on { background: #C41E3A; border-color: #C41E3A; }
.agree-text { font-size: 24rpx; color: #999; }
.agree-link { color: #C41E3A; }

.submit-btn { width: 100%; padding: 24rpx 0; border-radius: 40rpx; background: #C41E3A; color: #fff; font-size: 30rpx; font-weight: 500; text-align: center; }
.submit-btn.off { opacity: 0.5; background: #CCC; }
</style>
