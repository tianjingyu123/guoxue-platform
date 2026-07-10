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
import { circleDetailApi } from '@/lib/circle-detail-data'
import { articleApi } from '@/lib/article-data'
import { courseApi } from '@/lib/course-data'
import { uploadImage } from '@/utils/request'

const circleId = ref('1')
const circle = reactive({ id: '1', name: '', members: 0, role: 'owner' as 'owner' | 'admin' })

const selectedType = ref<string | null>(null)

const contentTypes = [
  { id: 'article', name: '文章', icon: 'file-text', desc: '发布图文内容' },
  { id: 'video', name: '短视频', icon: 'video', desc: '发布短视频作品' },
  { id: 'course', name: '课程', icon: 'book-open', desc: '上传视频课程' },
  { id: 'live', name: '直播', icon: 'radio', desc: '发起在线直播' },
]

onLoad((q) => {
  if (q?.circleId) { circleId.value = q.circleId; circle.id = q.circleId }
  // 支持从发布 sheet 直达指定表单（type=article/course），免二次选类型
  if (q?.type === 'article' || q?.type === 'course') selectedType.value = q.type
  loadCircle()
})

/** 加载真实圈子信息（名称/成员数/当前用户角色） */
async function loadCircle() {
  try {
    const d = await circleDetailApi.detail(circleId.value)
    circle.id = d.id
    circle.name = d.name
    circle.members = d.members
    circle.role = d.myRole === 'OWNER' ? 'owner' : 'admin'
  } catch {
    // 圈子信息加载失败：保留默认值，模板按 circle.name 为空时降级显示
  }
}

function selectType(t: typeof contentTypes[0]) {
  if (t.id === 'live') { navigateTo(`/pkg-live/create/index?circleId=${circleId.value}`); return }
  // 短视频复用独立发布页（已支持 circleId 入参，发布后归属当前圈子）
  if (t.id === 'video') { navigateTo(`/pkg-video/publish/index?circleId=${circleId.value}`); return }
  selectedType.value = t.id
}

// ─── 文章表单 ───
const a = reactive({
  title: '', content: '', cover: '',
  isPushHome: false,
  // 开放范围（后端 CreateArticleDto.visibility 已收）：文章特例——默认仍仅本圈，但"全平台开放"作为推荐选项引导（文章是圈子对外窗口）
  scope: 'CIRCLE_ONLY' as 'CIRCLE_ONLY' | 'PLATFORM',
})
const aErr = reactive<{ title?: string; content?: string }>({})
const aSubmitting = ref(false)

// 封面真上传（COS 图片端点·原实现把本地临时路径当 URL 提交，后端存不了）
const coverUploading = ref(false)
function uploadCover(target: 'a' | 'c') {
  if (coverUploading.value) return
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    success: async (res) => {
      const path = res.tempFilePaths[0]
      if (!path) return
      coverUploading.value = true
      uni.showLoading({ title: '上传中' })
      try {
        const url = await uploadImage(path)
        if (target === 'a') a.cover = url
        else c.cover = url
      } catch (e) {
        uni.showToast({ title: (e as Error)?.message || '封面上传失败', icon: 'none' })
      } finally {
        coverUploading.value = false
        uni.hideLoading()
      }
    },
  })
}

/** 发布成功后的去向：全平台开放 → 提示平台审核并可跳发布审核台账；仅本圈 → 回圈子详情 */
function afterPublishSuccess(scope: 'CIRCLE_ONLY' | 'PLATFORM', successText: string) {
  if (scope === 'PLATFORM') {
    uni.showModal({
      title: successText,
      content: '已提交平台审核，可在 圈子·我的 → 发布审核 查看进度',
      confirmText: '查看进度',
      cancelText: '返回圈子',
      success: (r) => {
        if (r.confirm) reLaunch('/pkg-circle/circles/my-audits')
        else reLaunch(`/pkg-circle/circles/detail?id=${circleId.value}`)
      },
    })
  } else {
    uni.showToast({ title: successText, icon: 'success' })
    setTimeout(() => reLaunch(`/pkg-circle/circles/detail?id=${circleId.value}`), 600)
  }
}

async function submitArticle() {
  aErr.title = a.title.trim() ? '' : '请输入文章标题'
  aErr.content = a.content.trim() ? '' : '请输入文章内容'
  if (aErr.title || aErr.content) return
  if (aSubmitting.value) return
  aSubmitting.value = true
  try {
    await articleApi.create(circleId.value, {
      title: a.title.trim(),
      content: a.content,
      cover: a.cover || undefined,
      excerpt: a.content.trim().slice(0, 80),
      tags: [],
      isPushHome: a.isPushHome,
      visibility: a.scope,
    })
    afterPublishSuccess(a.scope, '发布成功')
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '发布失败', icon: 'none' })
  } finally {
    aSubmitting.value = false
  }
}

// ─── 课程表单 ───
const c = reactive({
  title: '', description: '', cover: '',
  format: 'text' as 'text' | 'av',
  visibility: 'platform_wide' as Visibility,
  paymentType: 'paid' as PaymentType,
  price: 99,
  // 介绍详情图（后端 Course.detailImages·最多6张·展示在课程详情页介绍区）
  detailImages: [] as string[],
  // 开放范围（后端 CreateCourseDto.visibility 已收·默认仅圈子）
  scope: 'CIRCLE_ONLY' as 'CIRCLE_ONLY' | 'PLATFORM',
})
const cErr = reactive<{ title?: string; description?: string; price?: string }>({})
const cSubmitting = ref(false)

// 介绍详情图：多选补齐上传（复用 /upload/image COS 端点）
const detailUploading = ref(false)
function addDetailImages() {
  if (detailUploading.value) return
  const remain = 6 - c.detailImages.length
  if (remain <= 0) return
  uni.chooseImage({
    count: remain,
    sizeType: ['compressed'],
    success: async (res) => {
      const paths = (Array.isArray(res.tempFilePaths) ? res.tempFilePaths : [res.tempFilePaths]).slice(0, remain)
      if (!paths.length) return
      detailUploading.value = true
      uni.showLoading({ title: '上传中' })
      try {
        for (const p of paths) c.detailImages.push(await uploadImage(p))
      } catch (e) {
        uni.showToast({ title: (e as Error)?.message || '图片上传失败', icon: 'none' })
      } finally {
        detailUploading.value = false
        uni.hideLoading()
      }
    },
  })
}
function removeDetailImage(i: number) {
  c.detailImages.splice(i, 1)
}
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
  if (cSubmitting.value) return
  cSubmitting.value = true
  try {
    await courseApi.create({
      circleId: circleId.value,
      title: c.title.trim(),
      cover: c.cover || undefined,
      intro: c.description,
      type: c.format === 'av' ? 'VIDEO' : 'TEXT',
      price: c.paymentType === 'free' ? 0 : c.price,
      detailImages: c.detailImages.length ? c.detailImages : undefined,
      visibility: c.scope,
    })
    afterPublishSuccess(c.scope, '创建成功')
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '创建失败', icon: 'none' })
  } finally {
    cSubmitting.value = false
  }
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
        <image lazy-load :src="`https://api.dicebear.com/7.x/shapes/svg?seed=${circle.id}`" class="cr-circle-avatar" mode="aspectFill" />
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
            <image lazy-load v-if="a.cover" :src="a.cover" class="cr-cover-img" mode="aspectFill" />
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
          <view class="cr-switch-row" @tap="a.isPushHome = !a.isPushHome">
            <view class="cr-switch-main">
              <text class="cr-field-label">推荐到平台首页</text>
              <text class="cr-switch-tip">开启后文章有机会展示在平台首页信息流</text>
            </view>
            <view class="cr-switch" :class="{ on: a.isPushHome }">
              <view class="cr-switch-dot" :class="{ on: a.isPushHome }" />
            </view>
          </view>
        </view>

        <!-- 开放范围（文章特例：默认仅本圈，但全平台开放作为推荐选项引导——文章是圈子对外窗口） -->
        <view class="cr-panel">
          <text class="cr-field-label">开放范围</text>
          <view class="cr-scope" :class="{ on: a.scope === 'PLATFORM' }" @tap="a.scope = 'PLATFORM'">
            <view class="cr-radio" :class="{ on: a.scope === 'PLATFORM' }" />
            <view class="cr-scope-main">
              <view class="cr-scope-name-row">
                <text class="cr-scope-name">全平台开放</text>
                <text class="cr-scope-badge">推荐</text>
              </view>
              <text class="cr-scope-desc">文章是圈子对外的窗口，开放后圈外读者也能看到。全平台开放需平台审核，通过后进入公共池</text>
            </view>
          </view>
          <view class="cr-scope" :class="{ on: a.scope === 'CIRCLE_ONLY' }" @tap="a.scope = 'CIRCLE_ONLY'">
            <view class="cr-radio" :class="{ on: a.scope === 'CIRCLE_ONLY' }" />
            <view class="cr-scope-main">
              <text class="cr-scope-name">仅本圈</text>
              <text class="cr-scope-desc">只有圈内成员可阅读</text>
            </view>
          </view>
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
            <image lazy-load v-if="c.cover" :src="c.cover" class="cr-cover-img" mode="aspectFill" />
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

        <!-- 介绍详情图（V0 circle-publish-course：最多6张·4:3 预览+删除+追加·展示在课程详情页介绍区） -->
        <view class="cr-panel">
          <text class="cr-field-label">介绍详情图 <text class="cr-label-note">选填 · 最多 6 张 · 展示在课程详情页</text></text>
          <scroll-view scroll-x class="cr-dimgs" :show-scrollbar="false">
            <view class="cr-dimgs-row">
              <view v-for="(img, i) in c.detailImages" :key="img + i" class="cr-dimg">
                <image lazy-load :src="img" class="cr-dimg-img" mode="aspectFill" />
                <view class="cr-dimg-rm" @tap.stop="removeDetailImage(i)"><app-icon name="x" :size="22" color="#ffffff" /></view>
              </view>
              <view v-if="c.detailImages.length < 6" class="cr-dimg-add" @tap="addDetailImages">
                <app-icon name="plus" :size="32" color="#C9A96E" />
                <text class="cr-dimg-add-t">{{ detailUploading ? '上传中…' : `添加 ${c.detailImages.length}/6` }}</text>
              </view>
            </view>
          </scroll-view>
          <text class="cr-dimgs-note">展示课程大纲、授课现场、学员作业点评等实景，帮助学员购买前了解课程内容与质量。</text>
        </view>

        <view class="cr-panel">
          <visibility-settings
            v-model:visibility="c.visibility"
            v-model:payment-type="c.paymentType"
            v-model:price="c.price"
            :price-error="cErr.price"
            content-type="course"
            :show-visibility="false"
          />
        </view>

        <!-- 开放范围（谁可以买） -->
        <view class="cr-panel">
          <text class="cr-field-label">开放范围</text>
          <view class="cr-scope" :class="{ on: c.scope === 'CIRCLE_ONLY' }" @tap="c.scope = 'CIRCLE_ONLY'">
            <view class="cr-radio" :class="{ on: c.scope === 'CIRCLE_ONLY' }" />
            <view class="cr-scope-main">
              <text class="cr-scope-name">仅圈子开放</text>
              <text class="cr-scope-desc">只有圈内成员可购买学习，提交后即刻上架</text>
            </view>
          </view>
          <view class="cr-scope" :class="{ on: c.scope === 'PLATFORM' }" @tap="c.scope = 'PLATFORM'">
            <view class="cr-radio" :class="{ on: c.scope === 'PLATFORM' }" />
            <view class="cr-scope-main">
              <text class="cr-scope-name">向全平台开放</text>
              <text class="cr-scope-desc">全平台开放需平台审核，通过后进入公共池，圈外用户也可购买</text>
            </view>
          </view>
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
.cr-req { color: var(--brand); }
.cr-cover { position: relative; width: 100%; aspect-ratio: 16/9; border-radius: 20rpx; overflow: hidden; border: 4rpx dashed rgba(255,255,255,0.2); background: rgba(255,255,255,0.05); }
.cr-cover-img { width: 100%; height: 100%; }
.cr-cover-empty { width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12rpx; }
.cr-cover-tip { font-size: 26rpx; color: rgba(255,255,255,0.6); }
.cr-cover-del { position: absolute; top: 16rpx; right: 16rpx; width: 56rpx; height: 56rpx; border-radius: 999rpx; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; }
/* 显式 height + line-height：uni-app <input> 无固定高度时在真机会塌陷/文字裁切致"无法输入"观感 */
.cr-input { width: 100%; height: 92rpx; line-height: 44rpx; padding: 24rpx 28rpx; border-radius: 16rpx; border: 2rpx solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: #fff; font-size: 28rpx; box-sizing: border-box; }
.cr-input.err { border-color: var(--brand); }
.cr-textarea { width: 100%; min-height: 320rpx; padding: 24rpx 28rpx; border-radius: 16rpx; border: 2rpx solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: #fff; font-size: 28rpx; box-sizing: border-box; }
.cr-textarea.sm { min-height: 200rpx; }
.cr-textarea.err { border-color: var(--brand); }
.cr-ph { color: rgba(255,255,255,0.3); }
.cr-err { display: block; font-size: 22rpx; color: var(--brand); margin-top: 16rpx; }
/* 课程类型 */
.cr-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20rpx; }
.cr-course-type { padding: 24rpx; border-radius: 20rpx; border: 4rpx solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); }
.cr-course-type.on { border-color: var(--brand); background: rgba(196,30,58,0.1); }
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
.cr-submit { padding: 28rpx 0; border-radius: 999rpx; background: var(--brand); text-align: center; box-shadow: 0 8rpx 24rpx rgba(196,30,58,0.25); margin-bottom: 40rpx; }
.cr-submit.disabled { opacity: 0.5; }
.cr-submit-t { font-size: 30rpx; font-weight: 600; color: #fff; }
/* 开放范围（深色主题 radio 选项） */
.cr-scope { display: flex; align-items: flex-start; gap: 20rpx; padding: 20rpx 0; }
.cr-scope + .cr-scope { border-top: 2rpx solid rgba(255,255,255,0.06); }
.cr-radio { width: 36rpx; height: 36rpx; border-radius: 50%; flex-shrink: 0; margin-top: 4rpx; border: 3rpx solid rgba(255,255,255,0.25); box-sizing: border-box; position: relative; }
.cr-radio.on { border-color: var(--brand); }
.cr-radio.on::after { content: ""; position: absolute; top: 6rpx; left: 6rpx; right: 6rpx; bottom: 6rpx; border-radius: 50%; background: var(--brand); }
.cr-scope-main { flex: 1; }
.cr-scope-name-row { display: flex; align-items: center; gap: 12rpx; }
.cr-scope-name { font-size: 28rpx; font-weight: 500; color: #fff; }
.cr-scope-badge { font-size: 18rpx; color: #C9A96E; background: rgba(201,169,110,0.15); border: 2rpx solid rgba(201,169,110,0.35); padding: 2rpx 12rpx; border-radius: 8rpx; }
.cr-scope-desc { display: block; font-size: 22rpx; color: rgba(255,255,255,0.5); margin-top: 6rpx; line-height: 1.5; }
.cr-label-note { font-size: 22rpx; color: rgba(255,255,255,0.4); font-weight: 400; }
/* 介绍详情图（4:3 横滑） */
.cr-dimgs { width: 100%; white-space: nowrap; }
.cr-dimgs-row { display: flex; gap: 20rpx; }
.cr-dimg { position: relative; width: 208rpx; height: 156rpx; border-radius: 20rpx; overflow: hidden; flex-shrink: 0; }
.cr-dimg-img { width: 100%; height: 100%; }
.cr-dimg-rm { position: absolute; top: 8rpx; right: 8rpx; width: 40rpx; height: 40rpx; border-radius: 50%; background: rgba(0,0,0,0.55); display: flex; align-items: center; justify-content: center; }
.cr-dimg-add {
  width: 208rpx; height: 156rpx; border-radius: 20rpx; flex-shrink: 0;
  background: rgba(255,255,255,0.05); border: 3rpx dashed rgba(201,169,110,0.5);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8rpx;
  box-sizing: border-box;
}
.cr-dimg-add-t { font-size: 20rpx; color: rgba(255,255,255,0.4); }
.cr-dimgs-note { display: block; font-size: 22rpx; color: rgba(255,255,255,0.4); margin-top: 16rpx; line-height: 1.6; }
/* 推荐到首页开关 */
.cr-switch-row { display: flex; align-items: center; justify-content: space-between; gap: 24rpx; }
.cr-switch-main { flex: 1; }
.cr-switch-tip { display: block; font-size: 22rpx; color: rgba(255,255,255,0.5); margin-top: 8rpx; }
.cr-switch { width: 88rpx; height: 48rpx; border-radius: 999rpx; background: rgba(255,255,255,0.15); position: relative; flex-shrink: 0; transition: background 0.2s; }
.cr-switch.on { background: var(--brand); }
.cr-switch-dot { position: absolute; top: 4rpx; left: 4rpx; width: 40rpx; height: 40rpx; border-radius: 999rpx; background: #fff; transition: transform 0.2s; }
.cr-switch-dot.on { transform: translateX(40rpx); }
</style>
