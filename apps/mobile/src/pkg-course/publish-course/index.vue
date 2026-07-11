<template>
  <view class="pc-page">
    <!-- ══ 自定义导航顶栏（paddingTop 让位状态栏）══ -->
    <view class="pc-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="pc-nav-back" hover-class="pc-press" @tap="back">
        <AppIcon name="chevron-left" :size="36" color="#2C2C2C" />
      </view>
      <text class="pc-nav-title serif">发布课程</text>
      <view class="pc-nav-back" />
    </view>

    <!-- ══ 加载中骨架 ══ -->
    <view v-if="loading" class="pc-body">
      <view class="pc-card">
        <view class="pc-sk pc-sk-head" />
        <view class="pc-sk pc-sk-cover" />
      </view>
      <view class="pc-card">
        <view class="pc-sk pc-sk-head" />
        <view class="pc-sk pc-sk-line" style="width:70%" />
        <view class="pc-sk pc-sk-line" style="width:50%" />
        <view class="pc-sk pc-sk-line" style="width:60%" />
      </view>
    </view>

    <!-- ══ 资格门控：非认证讲师 ══ -->
    <view v-else-if="!isTeacher" class="pc-gate">
      <view class="pc-gate-art">
        <AppIcon name="award" :size="72" color="#C41E3A" />
      </view>
      <text class="pc-gate-title serif">
        {{ certStatus === 'pending' ? '认证审核中' : '需先成为认证讲师' }}
      </text>
      <text class="pc-gate-desc">
        {{ certStatus === 'pending'
          ? '您的讲师认证正在审核，通过后即可发布课程。'
          : '只有通过讲师认证的用户才能发布线上课程。' }}
      </text>
      <view class="pc-gate-btn" hover-class="pc-press" @tap="goCertify">
        <text class="pc-gate-btn-txt">{{ certStatus === 'pending' ? '查看进度' : '去认证' }}</text>
      </view>
    </view>

    <!-- ══ 发课表单（分区块白卡）══ -->
    <view v-else class="pc-body">

      <!-- ── 卡1 封面（16:9 上传位）── -->
      <view class="pc-card">
        <view class="pc-card-head">
          <text class="pc-card-title">课程封面 <text class="pc-req">*</text></text>
        </view>
        <view class="pc-cover" hover-class="pc-press" @tap="chooseCover">
          <view class="pc-cover-ratio">
            <image v-if="form.cover" class="pc-cover-img" :src="form.cover" mode="aspectFill" lazy-load />
            <view v-else class="pc-cover-empty">
              <AppIcon :name="uploadingCover ? 'loader' : 'image-plus'" :size="44" :color="uploadingCover ? '#C41E3A' : '#C9C3B8'" />
              <text class="pc-cover-text">{{ uploadingCover ? '上传中…' : '点击上传封面' }}</text>
            </view>
            <view v-if="form.cover && !uploadingCover" class="pc-cover-replace">
              <text class="pc-cover-replace-txt">替换封面</text>
            </view>
          </view>
        </view>
        <text class="pc-hint">建议尺寸 16:9，JPG/PNG</text>
      </view>

      <!-- ── 卡2 基本信息 ── -->
      <view class="pc-card">
        <view class="pc-card-head">
          <text class="pc-card-title">基本信息 <text class="pc-req">*</text></text>
        </view>

        <view class="pc-field">
          <text class="pc-field-label">课程标题</text>
          <input
            class="pc-field-input"
            placeholder="请输入课程标题"
            placeholder-class="pc-ph"
            :value="form.title"
            @input="(e: any) => form.title = e.detail.value"
            :maxlength="50"
          />
        </view>

        <view class="pc-field">
          <text class="pc-field-label">课程类型</text>
          <view class="pc-pills">
            <view
              v-for="(label, i) in typeLabels" :key="i"
              class="pc-pill" :class="{ on: typeIndex === i }"
              hover-class="pc-press"
              @tap="typeIndex = i"
            >
              <text class="pc-pill-txt" :class="{ on: typeIndex === i }">{{ label }}</text>
            </view>
          </view>
        </view>

        <view class="pc-field">
          <text class="pc-field-label">所属品类</text>
          <picker mode="selector" :range="categoryLabels" :value="categoryIndex" @change="onCategoryChange">
            <view class="pc-select">
              <text class="pc-select-txt" :class="{ ph: categoryIndex === 0 }">{{ categoryLabels[categoryIndex] }}</text>
              <AppIcon name="chevron-right" :size="30" color="#999999" />
            </view>
          </picker>
        </view>

        <view class="pc-field pc-field-col">
          <text class="pc-field-label">课程简介</text>
          <textarea
            class="pc-textarea"
            placeholder="介绍课程内容、亮点与适合人群"
            placeholder-class="pc-ph"
            :value="form.intro"
            @input="(e: any) => form.intro = e.detail.value"
            :maxlength="500"
          />
        </view>
      </view>

      <!-- ── 卡3 定价 ── -->
      <view class="pc-card">
        <view class="pc-card-head">
          <text class="pc-card-title">定价</text>
        </view>

        <view class="pc-field">
          <text class="pc-field-label">售价（元）</text>
          <view class="pc-price-wrap">
            <text class="pc-price-unit">¥</text>
            <input
              class="pc-price-input num"
              type="digit"
              placeholder="0 表示免费"
              placeholder-class="pc-ph"
              :value="form.price"
              @input="(e: any) => form.price = e.detail.value"
            />
          </view>
        </view>

        <!-- T3 定价参考卡（供给侧·仅类目维度·平台不干预定价） -->
        <PricingReferenceCard
          bizType="COURSE"
          :categoryLevel1="form.categoryLevel1"
          :currentPrice="Number(form.price) || undefined"
          @adopt="onAdoptPrice"
        />

        <view class="pc-field">
          <view class="pc-field-main">
            <text class="pc-field-label">有效期（天）</text>
            <text class="pc-sub-note">填 0 为永久有效</text>
          </view>
          <view class="pc-price-wrap">
            <input
              class="pc-price-input num"
              type="number"
              placeholder="0"
              placeholder-class="pc-ph"
              :value="form.validityDays"
              @input="(e: any) => form.validityDays = e.detail.value"
            />
          </view>
        </view>
      </view>

      <!-- ── 卡4 开放范围（纯 UI 单选）── -->
      <view class="pc-card">
        <view class="pc-card-head">
          <text class="pc-card-title">开放范围</text>
        </view>
        <view
          v-for="opt in scopeOptions" :key="opt.value"
          class="pc-radio-row" hover-class="pc-press"
          @tap="scope = opt.value"
        >
          <view class="pc-radio" :class="{ on: scope === opt.value }" />
          <text class="pc-radio-label">{{ opt.label }}</text>
        </view>
        <view v-if="scope === 'platform'" class="pc-audit-note">
          <text class="pc-audit-txt">全平台发布需平台审核，审核通过后自动上架</text>
        </view>
      </view>

      <text class="pc-tail-hint">发布后即可在课程管理台上架并添加章节。</text>
    </view>

    <!-- ══ 吸底发布按钮 ══ -->
    <view v-if="!loading && isTeacher" class="pc-bottom">
      <view
        class="pc-submit"
        :class="{ disabled: submitting || !form.title.trim() }"
        hover-class="pc-press"
        @tap="onSubmit"
      >
        <text class="pc-submit-txt">{{ submitting ? '发布中…' : '发布课程' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import PricingReferenceCard from '@/components/pricing-reference-card.vue'
import { goBack, navigateTo } from '@/utils/router'
import { chooseAndUploadImage } from '@/utils/request'
import { teacherApi, type CertStatus } from '@/lib/teacher-data'
import { courseApi } from '@/lib/course-data'

const statusBarHeight = ref(0)
const loading = ref(true)
const submitting = ref(false)

const certStatus = ref<CertStatus>('none')
const isTeacher = computed(() => certStatus.value === 'approved')

const typeValues = ['VIDEO', 'AUDIO', 'TEXT', 'EBOOK', 'COMBO']
const typeLabels = ['视频课程', '音频课程', '图文课程', '电子书', '组合课程']
const typeIndex = ref(0)

// 课程分类（一级品类 categoryLevel1）：首项为空占位，选空则不触发定价参考。
// 为纯 UI 配置常量（同 productCategories），非 mock 业务数据。
const categoryValues = ['', '国学经典', '诗词歌赋', '易经命理', '书法国画', '茶道香道', '中医养生', '传统礼仪', '历史哲学']
const categoryLabels = ['请选择分类', '国学经典', '诗词歌赋', '易经命理', '书法国画', '茶道香道', '中医养生', '传统礼仪', '历史哲学']
const categoryIndex = ref(0)

const form = reactive({
  title: '',
  cover: '',
  price: '',
  validityDays: '',
  intro: '',
  categoryLevel1: '',
})

const uploadingCover = ref(false)

// 开放范围（纯 UI 单选·委托书 P6 第 6 项）：仅前端展示状态，
// 现有 courseApi.create 暂无对应入参，故不写入提交体（不造假接口参数）。
const scopeOptions = [
  { value: 'circle', label: '仅圈子内' },
  { value: 'platform', label: '全平台' },
] as const
const scope = ref<'circle' | 'platform'>('platform')

function onCategoryChange(e: { detail: { value: string } }) {
  categoryIndex.value = Number(e.detail.value)
  form.categoryLevel1 = categoryValues[categoryIndex.value]
}

// 采纳定价参考的中位价（仅填入售价，不自动提交，定价权仍在用户）
function onAdoptPrice(median: number) {
  form.price = String(median)
  uni.showToast({ title: `已填入 ¥${median}`, icon: 'none' })
}

async function chooseCover() {
  if (uploadingCover.value) return
  uploadingCover.value = true
  try {
    form.cover = await chooseAndUploadImage()
  } catch (e) {
    if ((e as Error)?.message && (e as Error).message !== '已取消') uni.showToast({ title: (e as Error).message, icon: 'none' })
  } finally {
    uploadingCover.value = false
  }
}

async function loadCert() {
  loading.value = true
  try {
    const cert = await teacherApi.getMyCertification()
    certStatus.value = cert
      ? (cert.status === 'APPROVED' ? 'approved' : cert.status === 'PENDING' ? 'pending' : cert.status === 'REJECTED' ? 'rejected' : 'none')
      : 'none'
  } catch (e) {
    certStatus.value = 'none'
  } finally {
    loading.value = false
  }
}

async function onSubmit() {
  if (submitting.value || !form.title.trim()) return
  submitting.value = true
  try {
    await courseApi.create({
      title: form.title.trim(),
      type: typeValues[typeIndex.value],
      price: form.price ? Number(form.price) : 0,
      intro: form.intro.trim() || undefined,
      cover: form.cover || undefined,
      categoryLevel1: form.categoryLevel1 || undefined,
      validityDays: form.validityDays ? Number(form.validityDays) : 0,
    })
    // 审核无感化（20260711 第八节）：发布即可见，机审后台异步完成，无任何审核提示
    uni.showToast({ title: '发布成功', icon: 'success' })
    setTimeout(() => goBack(), 800)
  } catch (e) {
    const err = e as { message?: string; errMsg?: string }
    const msg = err?.message || err?.errMsg || ''
    if (msg.includes('讲师认证')) {
      uni.showModal({
        title: '需讲师认证',
        content: '请先通过讲师认证后再发布课程。',
        confirmText: '去认证',
        success: (r) => { if (r.confirm) goCertify() },
      })
    } else {
      uni.showToast({ title: msg || '发布失败，请重试', icon: 'none' })
    }
  } finally {
    submitting.value = false
  }
}

function goCertify() {
  navigateTo('/pkg-creator/teacher-certification/index')
}

function back() {
  goBack()
}

onLoad(() => {
  try {
    const info = uni.getWindowInfo ? uni.getWindowInfo() : uni.getSystemInfoSync()
    statusBarHeight.value = info.statusBarHeight || 0
  } catch (e) {
    statusBarHeight.value = 0
  }
  loadCert()
})
</script>

<style scoped>
/* ── 视觉 token（V0 委托书第七节）── */
.pc-page {
  min-height: 100vh;
  background: #FAF8F5;
  padding-bottom: calc(160rpx + env(safe-area-inset-bottom));
}
.serif { font-family: "Songti SC", "STSong", "SimSun", serif; }
.num { font-family: "SF Mono", "Roboto Mono", monospace; }
.pc-press { opacity: 0.6; }

/* ── 自定义导航顶栏 ── */
.pc-nav {
  position: sticky; top: 0; z-index: 20;
  display: flex; align-items: center; justify-content: space-between;
  padding: 20rpx 32rpx 20rpx;
  background: #FAF8F5;
}
.pc-nav-back {
  width: 72rpx; height: 72rpx; border-radius: 999rpx;
  display: flex; align-items: center; justify-content: center;
  background: #FFFFFF;
  box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.04);
}
.pc-nav-title { font-size: 40rpx; font-weight: 700; letter-spacing: 2rpx; color: #2C2C2C; }

/* ── 主体间距 ── */
.pc-body { padding: 24rpx 40rpx 40rpx; display: flex; flex-direction: column; gap: 24rpx; }

/* ── 白卡 ── */
.pc-card {
  background: #FFFFFF; border-radius: 36rpx; padding: 32rpx;
  box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.04);
}
.pc-card-head { margin-bottom: 24rpx; }
.pc-card-title { font-size: 30rpx; font-weight: 700; color: #2C2C2C; }
.pc-req { color: #C41E3A; }
.pc-hint { display: block; font-size: 24rpx; color: #999999; margin-top: 20rpx; line-height: 1.5; }

/* ── 卡1 封面（16:9 padding 撑高）── */
.pc-cover { width: 100%; border-radius: 16rpx; overflow: hidden; background: #F8F4EC; }
.pc-cover-ratio { position: relative; width: 100%; padding-top: 56.25%; }
.pc-cover-img { position: absolute; inset: 0; width: 100%; height: 100%; }
.pc-cover-empty {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16rpx;
}
.pc-cover-text { font-size: 26rpx; color: #999999; }
.pc-cover-replace {
  position: absolute; right: 20rpx; bottom: 20rpx;
  background: rgba(0,0,0,0.55); border-radius: 999rpx; padding: 10rpx 24rpx;
}
.pc-cover-replace-txt { font-size: 24rpx; color: #FFFFFF; }

/* ── 字段行（横排 label + 控件）── */
.pc-field {
  padding: 26rpx 0;
  display: flex; align-items: center; justify-content: space-between; gap: 20rpx;
}
.pc-field + .pc-field { border-top: 2rpx solid #EDE7DD; }
.pc-field-col { flex-direction: column; align-items: stretch; gap: 16rpx; }
.pc-field-main { display: flex; flex-direction: column; gap: 6rpx; }
.pc-field-label { font-size: 26rpx; color: #999999; flex-shrink: 0; }
.pc-field-col .pc-field-label { color: #999999; }
.pc-sub-note { font-size: 24rpx; color: #999999; }

/* 单行输入（右对齐随内容）*/
.pc-field-input {
  flex: 1; text-align: right;
  font-size: 30rpx; color: #2C2C2C;
}
.pc-ph { color: #999999; }

/* 类型胶囊单选 */
.pc-pills { display: flex; gap: 16rpx; flex-wrap: wrap; justify-content: flex-end; flex: 1; }
.pc-pill { padding: 12rpx 28rpx; border-radius: 999rpx; background: #F8F4EC; }
.pc-pill.on { background: rgba(196,30,58,0.08); }
.pc-pill-txt { font-size: 26rpx; color: #6E6E73; }
.pc-pill-txt.on { color: #C41E3A; font-weight: 600; }

/* 品类选择器 */
.pc-select { flex: 1; display: flex; align-items: center; justify-content: flex-end; gap: 8rpx; }
.pc-select-txt { font-size: 30rpx; color: #2C2C2C; }
.pc-select-txt.ph { color: #999999; }

/* 简介多行 */
.pc-textarea {
  width: 100%; min-height: 180rpx; box-sizing: border-box;
  padding: 20rpx 24rpx; background: #F8F4EC; border-radius: 16rpx;
  font-size: 28rpx; color: #2C2C2C; line-height: 1.6;
}

/* 定价输入 */
.pc-price-wrap { flex: 1; display: flex; align-items: baseline; justify-content: flex-end; gap: 8rpx; }
.pc-price-unit { font-size: 30rpx; color: #2C2C2C; }
.pc-price-input {
  min-width: 200rpx; text-align: right;
  font-size: 36rpx; font-weight: 700; color: #2C2C2C;
}

/* ── 卡4 开放范围 ── */
.pc-radio-row {
  display: flex; align-items: center; gap: 20rpx; padding: 26rpx 0;
}
.pc-radio-row + .pc-radio-row { border-top: 2rpx solid #EDE7DD; }
.pc-radio {
  position: relative; width: 40rpx; height: 40rpx; border-radius: 50%;
  border: 4rpx solid #D9D3C8; box-sizing: border-box; flex-shrink: 0;
}
.pc-radio.on { border-color: #C41E3A; }
.pc-radio.on::after {
  content: ""; position: absolute; inset: 8rpx; border-radius: 50%; background: #C41E3A;
}
.pc-radio-label { font-size: 30rpx; color: #2C2C2C; }
.pc-audit-note {
  margin-top: 16rpx; background: #F8F4EC; border-radius: 16rpx; padding: 20rpx 24rpx;
}
.pc-audit-txt { font-size: 24rpx; color: #999999; line-height: 1.5; }

/* 尾部提示 */
.pc-tail-hint { display: block; font-size: 24rpx; color: #999999; line-height: 1.6; text-align: center; margin-top: 8rpx; }

/* ── 门控态 ── */
.pc-gate {
  display: flex; flex-direction: column; align-items: center; text-align: center;
  padding: 140rpx 60rpx; gap: 24rpx;
}
.pc-gate-art {
  width: 200rpx; height: 200rpx; border-radius: 50%; background: #F8F4EC;
  display: flex; align-items: center; justify-content: center;
}
.pc-gate-title { font-size: 36rpx; font-weight: 700; color: #2C2C2C; }
.pc-gate-desc { font-size: 26rpx; color: #999999; line-height: 1.6; }
.pc-gate-btn {
  margin-top: 8rpx; height: 88rpx; padding: 0 60rpx; border-radius: 999rpx;
  background: #C41E3A; display: flex; align-items: center;
}
.pc-gate-btn-txt { font-size: 30rpx; font-weight: 600; color: #FFFFFF; }

/* ── 吸底发布按钮 ── */
.pc-bottom {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 30;
  background: #FFFFFF; border-top: 2rpx solid #EDE7DD;
  padding: 20rpx 40rpx calc(24rpx + env(safe-area-inset-bottom));
}
.pc-submit {
  height: 88rpx; border-radius: 999rpx; background: #C41E3A;
  display: flex; align-items: center; justify-content: center;
}
.pc-submit.disabled { opacity: 0.5; }
.pc-submit-txt { font-size: 30rpx; font-weight: 600; color: #FFFFFF; }

/* ── 骨架屏（#F0EBE2 微光 1.4s）── */
.pc-sk { position: relative; overflow: hidden; background: #F0EBE2; border-radius: 12rpx; }
.pc-sk::after {
  content: ""; position: absolute; inset: 0; transform: translateX(-100%);
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent);
  animation: pc-shimmer 1.4s infinite;
}
@keyframes pc-shimmer { 100% { transform: translateX(100%); } }
.pc-sk-head { width: 200rpx; height: 34rpx; margin-bottom: 24rpx; }
.pc-sk-cover { width: 100%; padding-top: 56.25%; border-radius: 16rpx; }
.pc-sk-line { height: 30rpx; margin-bottom: 20rpx; }
</style>
