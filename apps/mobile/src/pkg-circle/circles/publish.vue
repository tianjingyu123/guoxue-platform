<script setup lang="ts">
/**
 * 发布内容页（从原型 app/circles/[id]/publish/page.tsx 1:1 高保真迁移）
 * 深色主题。流程：选择内容类型(文章/课程/直播) → 对应表单(文章/课程)。
 * 音视频课程为高级功能，未开通弹申请提示（原型 FeatureApplyModal 子系统后续单独迁移）。
 */
import { ref, reactive } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import VisibilitySettings, { type Visibility, type PaymentType } from '@/components/circle/visibility-settings.vue'
import { goBack, navigateTo, reLaunch } from '@/utils/router'

const circleId = ref('1')
const circle = reactive({ id: '1', name: '八字命理研习社', members: 12580, role: 'owner' as 'owner' | 'admin' })

const selectedType = ref<string | null>(null)

const contentTypes = [
  { id: 'article', name: '文章', icon: 'file-text', desc: '发布图文内容' },
  { id: 'course', name: '课程', icon: 'book-open', desc: '上传视频课程' },
  { id: 'live', name: '直播', icon: 'radio', desc: '发起在线直播' },
]

onLoad((q) => { if (q?.circleId) { circleId.value = q.circleId; circle.id = q.circleId } })

function selectType(t: typeof contentTypes[0]) {
  if (t.id === 'live') { navigateTo(`/pkg-live/create/index?circleId=${circleId.value}`); return }
  selectedType.value = t.id
}

// ─── 文章表单 ───
const a = reactive({
  title: '', content: '', cover: '',
  visibility: 'platform_wide' as Visibility,
  paymentType: 'free' as PaymentType,
  price: 0,
})
const aErr = reactive<{ title?: string; content?: string; price?: string }>({})
const aSubmitting = ref(false)

function uploadCover(target: 'a' | 'c') {
  uni.chooseImage({
    count: 1,
    success: (res) => {
      const path = res.tempFilePaths[0]
      if (target === 'a') a.cover = path
      else c.cover = path
    },
  })
}

async function submitArticle() {
  aErr.title = a.title.trim() ? '' : '请输入文章标题'
  aErr.content = a.content.trim() ? '' : '请输入文章内容'
  aErr.price = (a.paymentType !== 'free' && a.price <= 0) ? '请设置价格' : ''
  if (aErr.title || aErr.content || aErr.price) return
  aSubmitting.value = true
  await new Promise((r) => setTimeout(r, 800))
  uni.showToast({ title: '发布成功', icon: 'success' })
  setTimeout(() => reLaunch(`/pkg-circle/circles/detail?id=${circleId.value}`), 600)
}

// ─── 课程表单 ───
const c = reactive({
  title: '', description: '', cover: '',
  format: 'text' as 'text' | 'av',
  visibility: 'platform_wide' as Visibility,
  paymentType: 'paid' as PaymentType,
  price: 99,
})
const cErr = reactive<{ title?: string; description?: string; price?: string }>({})
const cSubmitting = ref(false)
const avUnlocked = ref(false) // 音视频课程高级功能未开通

function selectAV() {
  if (avUnlocked.value) { c.format = 'av' }
  else uni.showModal({
    title: '音视频课程',
    content: '音视频课程为高级功能，需申请开通后使用。是否提交申请？',
    confirmText: '提交申请',
    success: (r) => { if (r.confirm) uni.showToast({ title: '申请已提交，待审核', icon: 'none' }) },
  })
}

async function submitCourse() {
  cErr.title = c.title.trim() ? '' : '请输入课程名称'
  cErr.description = c.description.trim() ? '' : '请输入课程简介'
  cErr.price = (c.paymentType !== 'free' && c.price <= 0) ? '请设置价格' : ''
  if (cErr.title || cErr.description || cErr.price) return
  cSubmitting.value = true
  await new Promise((r) => setTimeout(r, 800))
  uni.showToast({ title: '创建成功', icon: 'success' })
  setTimeout(() => reLaunch(`/pkg-circle/circles/detail?id=${circleId.value}`), 600)
}
</script>

<template>
  <view class="cr">
    <!-- 顶栏 -->
    <view class="cr-hdr">
      <view class="cr-hdr-btn" @tap="goBack"><app-icon name="chevron-left" :size="40" color="#ffffff" /></view>
      <text class="cr-hdr-title">发布内容</text>
      <view class="cr-hdr-btn" />
    </view>

    <scroll-view scroll-y class="cr-body">
      <!-- 圈子信息 -->
      <view class="cr-circle">
        <image :src="`https://api.dicebear.com/7.x/shapes/svg?seed=${circle.id}`" class="cr-circle-avatar" mode="aspectFill" />
        <view class="cr-circle-info">
          <text class="cr-circle-name">{{ circle.name }}</text>
          <text class="cr-circle-members">{{ circle.members.toLocaleString() }} 成员</text>
        </view>
        <text class="cr-circle-role" :class="circle.role">{{ circle.role === 'owner' ? '圈主' : '管理员' }}</text>
      </view>

      <!-- 选择内容类型 -->
      <view v-if="!selectedType" class="cr-panel">
        <text class="cr-panel-title">选择内容类型</text>
        <view class="cr-type-list">
          <view v-for="t in contentTypes" :key="t.id" class="cr-type" @tap="selectType(t)">
            <view class="cr-type-icon"><app-icon :name="t.icon" :size="32" color="#C41E3A" /></view>
            <view class="cr-type-main">
              <text class="cr-type-name">{{ t.name }}</text>
              <text class="cr-type-desc">{{ t.desc }}</text>
            </view>
            <app-icon name="chevron-right" :size="32" color="rgba(255,255,255,0.3)" />
          </view>
        </view>
      </view>

      <!-- 文章表单 -->
      <view v-else-if="selectedType === 'article'" class="cr-form">
        <view class="cr-form-head">
          <view class="cr-back" @tap="selectedType = null"><app-icon name="chevron-left" :size="28" color="rgba(255,255,255,0.6)" /><text class="cr-back-t">返回</text></view>
          <text class="cr-form-title">发布文章</text>
          <view class="cr-back-pad" />
        </view>

        <view class="cr-panel">
          <text class="cr-field-label">文章封面</text>
          <view class="cr-cover" @tap="uploadCover('a')">
            <image v-if="a.cover" :src="a.cover" class="cr-cover-img" mode="aspectFill" />
            <view v-else class="cr-cover-empty"><app-icon name="camera" :size="48" color="rgba(255,255,255,0.4)" /><text class="cr-cover-tip">点击上传封面</text></view>
            <view v-if="a.cover" class="cr-cover-del" @tap.stop="a.cover = ''"><app-icon name="x" :size="28" color="#ffffff" /></view>
          </view>
        </view>

        <view class="cr-panel">
          <text class="cr-field-label">文章标题 <text class="cr-req">*</text></text>
          <input v-model="a.title" class="cr-input" :class="{ err: aErr.title }" placeholder="请输入文章标题" placeholder-class="cr-ph" @input="aErr.title = ''" />
          <text v-if="aErr.title" class="cr-err">{{ aErr.title }}</text>
        </view>

        <view class="cr-panel">
          <text class="cr-field-label">文章内容 <text class="cr-req">*</text></text>
          <textarea v-model="a.content" class="cr-textarea" :class="{ err: aErr.content }" placeholder="请输入文章内容..." placeholder-class="cr-ph" :maxlength="-1" @input="aErr.content = ''" />
          <text v-if="aErr.content" class="cr-err">{{ aErr.content }}</text>
        </view>

        <view class="cr-panel">
          <visibility-settings
            v-model:visibility="a.visibility"
            v-model:payment-type="a.paymentType"
            v-model:price="a.price"
            :price-error="aErr.price"
            content-type="article"
          />
        </view>

        <view class="cr-submit" :class="{ disabled: aSubmitting }" @tap="submitArticle">
          <text class="cr-submit-t">{{ aSubmitting ? '发布中...' : '发布文章' }}</text>
        </view>
      </view>

      <!-- 课程表单 -->
      <view v-else-if="selectedType === 'course'" class="cr-form">
        <view class="cr-form-head">
          <view class="cr-back" @tap="selectedType = null"><app-icon name="chevron-left" :size="28" color="rgba(255,255,255,0.6)" /><text class="cr-back-t">返回</text></view>
          <text class="cr-form-title">发布课程</text>
          <view class="cr-back-pad" />
        </view>

        <view class="cr-panel">
          <text class="cr-field-label">课程类型</text>
          <view class="cr-grid2">
            <view class="cr-course-type" :class="{ on: c.format === 'text' }" @tap="c.format = 'text'">
              <app-icon name="file-text" :size="28" color="#C41E3A" />
              <text class="cr-course-type-name">图文课程</text>
              <text class="cr-course-type-desc">图文 + 资料形式</text>
            </view>
            <view class="cr-course-type" :class="{ on: c.format === 'av' && avUnlocked }" @tap="selectAV">
              <view class="cr-course-type-top">
                <app-icon name="audio-lines" :size="28" :color="avUnlocked ? '#C9A96E' : 'rgba(255,255,255,0.4)'" />
                <app-icon v-if="!avUnlocked" name="lock" :size="22" color="rgba(255,255,255,0.4)" />
              </view>
              <text class="cr-course-type-name" :class="{ off: !avUnlocked }">音视频课程</text>
              <text v-if="avUnlocked" class="cr-course-type-desc">音频 / 视频章节</text>
              <text v-else class="cr-course-type-badge">未开通</text>
            </view>
          </view>
          <text v-if="!avUnlocked" class="cr-course-hint">音视频课程为高级功能，需申请开通后使用</text>
        </view>

        <view class="cr-panel">
          <text class="cr-field-label">课程封面 <text class="cr-req">*</text></text>
          <view class="cr-cover" @tap="uploadCover('c')">
            <image v-if="c.cover" :src="c.cover" class="cr-cover-img" mode="aspectFill" />
            <view v-else class="cr-cover-empty"><app-icon name="video" :size="48" color="rgba(255,255,255,0.4)" /><text class="cr-cover-tip">点击上传封面</text></view>
            <view v-if="c.cover" class="cr-cover-del" @tap.stop="c.cover = ''"><app-icon name="x" :size="28" color="#ffffff" /></view>
          </view>
        </view>

        <view class="cr-panel">
          <text class="cr-field-label">课程名称 <text class="cr-req">*</text></text>
          <input v-model="c.title" class="cr-input" :class="{ err: cErr.title }" placeholder="请输入课程名称" placeholder-class="cr-ph" @input="cErr.title = ''" />
          <text v-if="cErr.title" class="cr-err">{{ cErr.title }}</text>
        </view>

        <view class="cr-panel">
          <text class="cr-field-label">课程简介 <text class="cr-req">*</text></text>
          <textarea v-model="c.description" class="cr-textarea sm" :class="{ err: cErr.description }" placeholder="请输入课程简介..." placeholder-class="cr-ph" :maxlength="-1" @input="cErr.description = ''" />
          <text v-if="cErr.description" class="cr-err">{{ cErr.description }}</text>
        </view>

        <view class="cr-panel">
          <visibility-settings
            v-model:visibility="c.visibility"
            v-model:payment-type="c.paymentType"
            v-model:price="c.price"
            :price-error="cErr.price"
            content-type="course"
          />
        </view>

        <view class="cr-tip-gold">
          <text class="cr-tip-gold-t">{{ c.format === 'av' ? '课程创建后，可在"课程管理"中上传音视频章节、设置目录结构' : '课程创建后，可在"课程管理"中上传图文内容与学习资料' }}</text>
        </view>

        <view class="cr-submit" :class="{ disabled: cSubmitting }" @tap="submitCourse">
          <text class="cr-submit-t">{{ cSubmitting ? '创建中...' : '创建课程' }}</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.cr { display: flex; flex-direction: column; height: 100vh; background: #1a1a1a; }
.cr-hdr { display: flex; align-items: center; justify-content: space-between; height: 88rpx; padding: 0 24rpx; background: rgba(26,26,26,0.95); border-bottom: 2rpx solid rgba(255,255,255,0.1); padding-top: var(--status-bar-height, 0); flex-shrink: 0; }
.cr-hdr-btn { width: 72rpx; padding: 8rpx; }
.cr-hdr-title { flex: 1; text-align: center; font-size: 32rpx; font-weight: 600; color: #fff; }
.cr-body { flex: 1; overflow: hidden; padding: 24rpx; box-sizing: border-box; }
/* 圈子信息 */
.cr-circle { display: flex; align-items: center; gap: 20rpx; background: #1a1a1a; border: 2rpx solid rgba(255,255,255,0.08); border-radius: 28rpx; padding: 28rpx; margin-bottom: 24rpx; }
.cr-circle-avatar { width: 88rpx; height: 88rpx; border-radius: 20rpx; }
.cr-circle-info { flex: 1; }
.cr-circle-name { display: block; font-size: 30rpx; font-weight: 500; color: #fff; }
.cr-circle-members { display: block; font-size: 22rpx; color: rgba(255,255,255,0.5); margin-top: 6rpx; }
.cr-circle-role { font-size: 22rpx; padding: 6rpx 16rpx; border-radius: 8rpx; }
.cr-circle-role.owner { background: rgba(201,169,110,0.2); color: #C9A96E; }
.cr-circle-role.admin { background: rgba(24,144,255,0.2); color: #1890FF; }
/* 内容类型选择 */
.cr-panel { background: #1a1a1a; border: 2rpx solid rgba(255,255,255,0.06); border-radius: 28rpx; padding: 28rpx; margin-bottom: 24rpx; }
.cr-panel-title { display: block; font-size: 28rpx; font-weight: 500; color: #fff; margin-bottom: 24rpx; }
.cr-type-list { display: flex; flex-direction: column; gap: 20rpx; }
.cr-type { display: flex; align-items: center; gap: 24rpx; padding: 28rpx; border-radius: 20rpx; border: 2rpx solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); }
.cr-type-icon { width: 72rpx; height: 72rpx; border-radius: 16rpx; background: rgba(196,30,58,0.1); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.cr-type-main { flex: 1; }
.cr-type-name { display: block; font-size: 30rpx; font-weight: 500; color: #fff; }
.cr-type-desc { display: block; font-size: 22rpx; color: rgba(255,255,255,0.5); margin-top: 6rpx; }
/* 表单 */
.cr-form-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24rpx; }
.cr-back { display: flex; align-items: center; gap: 6rpx; }
.cr-back-t { font-size: 26rpx; color: rgba(255,255,255,0.6); }
.cr-back-pad { width: 96rpx; }
.cr-form-title { font-size: 30rpx; font-weight: 500; color: #fff; }
.cr-field-label { display: block; font-size: 28rpx; font-weight: 500; color: #fff; margin-bottom: 20rpx; }
.cr-req { color: #C41E3A; }
.cr-cover { position: relative; width: 100%; aspect-ratio: 16/9; border-radius: 20rpx; overflow: hidden; border: 4rpx dashed rgba(255,255,255,0.2); background: rgba(255,255,255,0.05); }
.cr-cover-img { width: 100%; height: 100%; }
.cr-cover-empty { width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12rpx; }
.cr-cover-tip { font-size: 26rpx; color: rgba(255,255,255,0.6); }
.cr-cover-del { position: absolute; top: 16rpx; right: 16rpx; width: 56rpx; height: 56rpx; border-radius: 999rpx; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; }
.cr-input { width: 100%; padding: 24rpx 28rpx; border-radius: 16rpx; border: 2rpx solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: #fff; font-size: 28rpx; box-sizing: border-box; }
.cr-input.err { border-color: #C41E3A; }
.cr-textarea { width: 100%; min-height: 320rpx; padding: 24rpx 28rpx; border-radius: 16rpx; border: 2rpx solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: #fff; font-size: 28rpx; box-sizing: border-box; }
.cr-textarea.sm { min-height: 200rpx; }
.cr-textarea.err { border-color: #C41E3A; }
.cr-ph { color: rgba(255,255,255,0.3); }
.cr-err { display: block; font-size: 22rpx; color: #C41E3A; margin-top: 16rpx; }
/* 课程类型 */
.cr-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20rpx; }
.cr-course-type { padding: 24rpx; border-radius: 20rpx; border: 4rpx solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); }
.cr-course-type.on { border-color: #C41E3A; background: rgba(196,30,58,0.1); }
.cr-course-type-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16rpx; }
.cr-course-type-name { display: block; font-size: 28rpx; font-weight: 500; color: #fff; margin-top: 16rpx; }
.cr-course-type-name.off { color: rgba(255,255,255,0.6); margin-top: 0; }
.cr-course-type-desc { display: block; font-size: 20rpx; color: rgba(255,255,255,0.5); margin-top: 6rpx; }
.cr-course-type-badge { display: inline-block; font-size: 18rpx; color: #C9A96E; background: rgba(201,169,110,0.15); padding: 2rpx 12rpx; border-radius: 6rpx; margin-top: 10rpx; }
.cr-course-hint { display: block; font-size: 22rpx; color: #C9A96E; margin-top: 16rpx; }
/* 提示 */
.cr-tip-gold { background: rgba(201,169,110,0.1); border: 2rpx solid rgba(201,169,110,0.2); border-radius: 16rpx; padding: 20rpx; margin-bottom: 24rpx; }
.cr-tip-gold-t { font-size: 22rpx; color: #C9A96E; line-height: 1.5; }
/* 提交 */
.cr-submit { padding: 28rpx 0; border-radius: 999rpx; background: #C41E3A; text-align: center; box-shadow: 0 8rpx 24rpx rgba(196,30,58,0.25); margin-bottom: 40rpx; }
.cr-submit.disabled { opacity: 0.5; }
.cr-submit-t { font-size: 30rpx; font-weight: 600; color: #fff; }
</style>
