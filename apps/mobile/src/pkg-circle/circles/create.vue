<script setup lang="ts">
/**
 * 创建圈子页（从原型 app/circles/create/page.tsx 189行 1:1 高保真迁移）
 * 浅色国风主题。表单：封面/名称/简介/分类/标签/加入方式(免费/付费年费/审核)。
 */
import { ref, reactive } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, reLaunch } from '@/utils/router'
import { circleApi } from '@/lib/circle-data'

type JoinMethod = 'free' | 'paid' | 'approval'

const JOIN_OPTIONS: { value: JoinMethod; label: string; desc: string; icon: string }[] = [
  { value: 'free', label: '免费加入', desc: '任何人可自由加入圈子', icon: 'gift' },
  { value: 'paid', label: '付费加入', desc: '按年费制付费后加入', icon: 'coins' },
  { value: 'approval', label: '审核加入', desc: '申请后由圈主审核通过', icon: 'users' },
]

const CATEGORIES = ['八字命理', '紫微斗数', '奇门遁甲', '风水堪舆', '易经', '梅花易数', '面相手相', '国学文化', '其他']

const cover = ref('')
const name = ref('')
const desc = ref('')
const category = ref('')
const joinMethod = ref<JoinMethod>('free')
const yearlyPrice = ref('')
const tags = ref<string[]>([])
const tagInput = ref('')
const loading = ref(false)
const errors = reactive<Record<string, string>>({})

function uploadCover() {
  uni.chooseImage({ count: 1, success: (res) => { cover.value = res.tempFilePaths[0] } })
}

function addTag() {
  const t = tagInput.value.trim()
  if (t && !tags.value.includes(t) && tags.value.length < 5) {
    tags.value.push(t)
    tagInput.value = ''
  }
}

function removeTag(t: string) {
  tags.value = tags.value.filter((x) => x !== t)
}

function selectCategory(cat: string) {
  category.value = cat
  errors.category = ''
}

function selectJoin(v: JoinMethod) {
  joinMethod.value = v
  errors.price = ''
}

function validate() {
  const e: Record<string, string> = {}
  const n = name.value.trim()
  if (!n) e.name = '请输入圈子名称'
  else if (n.length < 2) e.name = '名称至少 2 个字'
  else if (n.length > 20) e.name = '名称不超过 20 字'
  const d = desc.value.trim()
  if (!d) e.desc = '请输入圈子简介'
  else if (d.length < 10) e.desc = '简介至少 10 个字'
  if (!category.value) e.category = '请选择分类'
  if (joinMethod.value === 'paid' && (!yearlyPrice.value || Number(yearlyPrice.value) <= 0)) e.price = '请设置年费价格'
  Object.keys(errors).forEach((k) => delete errors[k])
  Object.assign(errors, e)
  return Object.keys(e).length === 0
}

async function submit() {
  if (loading.value) return // 防重复提交
  if (!validate()) return
  loading.value = true
  try {
    // 真连后端创建圈子（付费=年费圈 YEARLY；审核加入暂按免费圈创建，圈主可在管理后台开启审批）
    // 分类作为首个标签并入 tags；封面为本地临时路径未上传，暂不提交避免存入无效路径
    const tagList = category.value ? [category.value, ...tags.value.filter((t) => t !== category.value)] : [...tags.value]
    const created = await circleApi.create({
      name: name.value.trim(),
      intro: desc.value.trim(),
      tags: tagList,
      type: joinMethod.value === 'paid' ? 'YEARLY' : 'FREE',
      price: joinMethod.value === 'paid' ? Number(yearlyPrice.value) : 0,
    })
    uni.showToast({ title: '创建成功', icon: 'success' })
    const newId = created?.id
    // 跳转到新圈子详情（拿不到 id 则回"我的圈子"，在"我创建的"分组可见）
    setTimeout(() => reLaunch(newId ? `/pkg-circle/circles/detail?id=${newId}` : '/my-circles'), 600)
  } catch (err) {
    uni.showToast({ title: (err as Error)?.message || '创建失败，请重试', icon: 'none' })
    loading.value = false
  }
}
</script>

<template>
  <view class="cc">
    <!-- 顶栏 -->
    <view class="cc-hdr">
      <view class="cc-hdr-btn" @tap="goBack"><app-icon name="arrow-left" :size="40" color="#1a1a1a" /></view>
      <text class="cc-hdr-title">创建圈子</text>
      <view class="cc-hdr-btn" />
    </view>

    <scroll-view scroll-y class="cc-body">
      <!-- 封面 -->
      <view class="cc-cover-wrap">
        <view class="cc-cover-btn" @tap="uploadCover">
          <image lazy-load v-if="cover" :src="cover" class="cc-cover-img" mode="aspectFill" />
          <template v-else>
            <app-icon name="camera" :size="48" color="#8a8378" />
            <text class="cc-cover-tip">添加封面</text>
          </template>
        </view>
        <text class="cc-cover-hint">建议尺寸 600×600px</text>
      </view>

      <!-- 圈子名称 -->
      <view class="cc-field">
        <text class="cc-label">圈子名称 <text class="cc-req">*</text></text>
        <input
          v-model="name"
          class="cc-input"
          :class="{ err: errors.name }"
          placeholder="2-20 个字符"
          placeholder-class="cc-ph"
          :maxlength="20"
          @input="errors.name = ''"
        />
        <view class="cc-row">
          <text v-if="errors.name" class="cc-err">{{ errors.name }}</text>
          <text v-else class="cc-spacer" />
          <text class="cc-count">{{ name.length }}/20</text>
        </view>
      </view>

      <!-- 圈子简介 -->
      <view class="cc-field">
        <text class="cc-label">圈子简介 <text class="cc-req">*</text></text>
        <textarea
          v-model="desc"
          class="cc-textarea"
          :class="{ err: errors.desc }"
          placeholder="介绍圈子的主题、目标和特色，吸引更多志同道合的人加入"
          placeholder-class="cc-ph"
          :maxlength="200"
          @input="errors.desc = ''"
        />
        <view class="cc-row">
          <text v-if="errors.desc" class="cc-err">{{ errors.desc }}</text>
          <text v-else class="cc-spacer" />
          <text class="cc-count">{{ desc.length }}/200</text>
        </view>
      </view>

      <!-- 分类 -->
      <view class="cc-field">
        <text class="cc-label">分类 <text class="cc-req">*</text></text>
        <view class="cc-cats">
          <view
            v-for="cat in CATEGORIES"
            :key="cat"
            class="cc-cat"
            :class="{ on: category === cat }"
            @tap="selectCategory(cat)"
          >
            <text class="cc-cat-t" :class="{ on: category === cat }">{{ cat }}</text>
          </view>
        </view>
        <text v-if="errors.category" class="cc-err">{{ errors.category }}</text>
      </view>

      <!-- 标签 -->
      <view class="cc-field">
        <text class="cc-label">标签（最多 5 个）</text>
        <view v-if="tags.length" class="cc-tags">
          <view v-for="t in tags" :key="t" class="cc-tag">
            <text class="cc-tag-t">{{ t }}</text>
            <text class="cc-tag-x" @tap="removeTag(t)">×</text>
          </view>
        </view>
        <view v-if="tags.length < 5" class="cc-tag-add">
          <input
            v-model="tagInput"
            class="cc-input cc-tag-input"
            placeholder="输入标签后按回车"
            placeholder-class="cc-ph"
            confirm-type="done"
            @confirm="addTag"
          />
          <view class="cc-tag-btn" @tap="addTag"><text class="cc-tag-btn-t">添加</text></view>
        </view>
      </view>

      <!-- 加入方式 -->
      <view class="cc-field">
        <text class="cc-label">加入方式</text>
        <view class="cc-joins">
          <view
            v-for="opt in JOIN_OPTIONS"
            :key="opt.value"
            class="cc-join"
            :class="{ on: joinMethod === opt.value }"
            @tap="selectJoin(opt.value)"
          >
            <view class="cc-join-icon" :class="{ on: joinMethod === opt.value }">
              <app-icon :name="opt.icon" :size="28" :color="joinMethod === opt.value ? '#c41e3a' : '#8a8378'" />
            </view>
            <view class="cc-join-main">
              <text class="cc-join-label">{{ opt.label }}</text>
              <text class="cc-join-desc">{{ opt.desc }}</text>
            </view>
            <view class="cc-radio" :class="{ on: joinMethod === opt.value }">
              <view v-if="joinMethod === opt.value" class="cc-radio-dot" />
            </view>
          </view>
        </view>

        <!-- 付费加入 - 年费价格 -->
        <view v-if="joinMethod === 'paid'" class="cc-paid">
          <text class="cc-label">年费价格 <text class="cc-req">*</text></text>
          <view class="cc-price-row">
            <text class="cc-price-sym">¥</text>
            <input
              v-model="yearlyPrice"
              type="number"
              class="cc-input cc-price-input"
              :class="{ err: errors.price }"
              placeholder="如 199"
              placeholder-class="cc-ph"
              @input="errors.price = ''"
            />
            <text class="cc-price-unit">元 / 年</text>
          </view>
          <text v-if="errors.price" class="cc-err">{{ errors.price }}</text>
          <text class="cc-paid-hint">成员按年付费加入，到期需续费。价格可在圈子设置中修改，修改后不影响已加入成员。</text>
        </view>

        <!-- 审核加入 - 说明 -->
        <view v-if="joinMethod === 'approval'" class="cc-approval">
          <text class="cc-approval-t">用户点击"申请加入"后提交申请，你可在圈子管理后台的"入圈申请审批"中同意或拒绝。</text>
        </view>
      </view>
    </scroll-view>

    <!-- 提交 -->
    <view class="cc-submit-bar">
      <view class="cc-submit" :class="{ disabled: loading }" @tap="submit">
        <text class="cc-submit-t">{{ loading ? '创建中…' : '创建圈子' }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.cc { display: flex; flex-direction: column; height: 100vh; background: #faf6f0; }
.cc-hdr { display: flex; align-items: center; justify-content: space-between; height: 88rpx; padding: 0 24rpx; background: #faf6f0; border-bottom: 2rpx solid rgba(0,0,0,0.08); padding-top: var(--status-bar-height, 0); flex-shrink: 0; }
.cc-hdr-btn { width: 72rpx; padding: 8rpx; }
.cc-hdr-title { flex: 1; text-align: center; font-size: 32rpx; font-weight: 600; color: #1a1a1a; }
.cc-body { flex: 1; overflow: hidden; padding: 32rpx 32rpx 48rpx; box-sizing: border-box; }
/* 封面 */
.cc-cover-wrap { display: flex; flex-direction: column; align-items: center; gap: 12rpx; margin-bottom: 40rpx; }
.cc-cover-btn { width: 192rpx; height: 192rpx; border-radius: 28rpx; background: #f0ebe3; border: 4rpx dashed rgba(0,0,0,0.15); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8rpx; overflow: hidden; }
.cc-cover-img { width: 100%; height: 100%; }
.cc-cover-tip { font-size: 22rpx; color: #8a8378; }
.cc-cover-hint { font-size: 22rpx; color: #8a8378; }
/* 字段 */
.cc-field { margin-bottom: 40rpx; }
.cc-label { display: block; font-size: 28rpx; font-weight: 500; color: #1a1a1a; margin-bottom: 16rpx; }
.cc-req { color: var(--brand); }
/* 显式 height + line-height：uni-app <input> 无固定高度时在真机会塌陷/文字裁切致"文字显示不全" */
.cc-input { width: 100%; height: 88rpx; line-height: 44rpx; padding: 22rpx 24rpx; border-radius: 16rpx; border: 2rpx solid rgba(0,0,0,0.12); background: #fff; color: #1a1a1a; font-size: 28rpx; box-sizing: border-box; }
.cc-input.err { border-color: var(--brand); }
.cc-textarea { width: 100%; min-height: 200rpx; padding: 22rpx 24rpx; border-radius: 16rpx; border: 2rpx solid rgba(0,0,0,0.12); background: #fff; color: #1a1a1a; font-size: 28rpx; box-sizing: border-box; }
.cc-textarea.err { border-color: var(--brand); }
.cc-ph { color: #b5aea3; }
.cc-row { display: flex; align-items: center; justify-content: space-between; margin-top: 10rpx; }
.cc-spacer { flex: 1; }
.cc-err { font-size: 22rpx; color: var(--brand); }
.cc-count { font-size: 22rpx; color: #8a8378; }
/* 分类 */
.cc-cats { display: flex; flex-wrap: wrap; gap: 16rpx; }
.cc-cat { padding: 12rpx 24rpx; border-radius: 999rpx; border: 2rpx solid rgba(0,0,0,0.12); background: #fff; }
.cc-cat.on { background: var(--brand); border-color: var(--brand); }
.cc-cat-t { font-size: 26rpx; color: #1a1a1a; }
.cc-cat-t.on { color: #fff; }
/* 标签 */
.cc-tags { display: flex; flex-wrap: wrap; gap: 12rpx; margin-bottom: 16rpx; }
.cc-tag { display: flex; align-items: center; gap: 8rpx; background: rgba(196,30,58,0.1); padding: 8rpx 18rpx; border-radius: 999rpx; }
.cc-tag-t { font-size: 22rpx; color: var(--brand); }
.cc-tag-x { font-size: 26rpx; color: rgba(196,30,58,0.6); line-height: 1; }
.cc-tag-add { display: flex; gap: 16rpx; }
.cc-tag-input { flex: 1; }
.cc-tag-btn { padding: 0 32rpx; display: flex; align-items: center; border-radius: 16rpx; border: 2rpx solid rgba(0,0,0,0.12); background: #fff; }
.cc-tag-btn-t { font-size: 26rpx; color: #1a1a1a; }
/* 加入方式 */
.cc-joins { display: flex; flex-direction: column; gap: 16rpx; }
.cc-join { display: flex; align-items: center; gap: 20rpx; padding: 24rpx; border-radius: 20rpx; border: 2rpx solid rgba(0,0,0,0.12); background: #fff; }
.cc-join.on { border-color: var(--brand); background: rgba(196,30,58,0.05); }
.cc-join-icon { width: 64rpx; height: 64rpx; border-radius: 999rpx; background: #f0ebe3; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.cc-join-icon.on { background: rgba(196,30,58,0.1); }
.cc-join-main { flex: 1; }
.cc-join-label { display: block; font-size: 28rpx; font-weight: 500; color: #1a1a1a; }
.cc-join-desc { display: block; font-size: 22rpx; color: #8a8378; margin-top: 4rpx; }
.cc-radio { width: 36rpx; height: 36rpx; border-radius: 999rpx; border: 4rpx solid rgba(0,0,0,0.18); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.cc-radio.on { border-color: var(--brand); }
.cc-radio-dot { width: 16rpx; height: 16rpx; border-radius: 999rpx; background: var(--brand); }
/* 付费 */
.cc-paid { margin-top: 24rpx; padding: 24rpx; border-radius: 20rpx; border: 2rpx solid rgba(196,30,58,0.2); background: rgba(196,30,58,0.05); }
.cc-price-row { display: flex; align-items: center; gap: 16rpx; }
.cc-price-sym { font-size: 36rpx; font-weight: 700; color: var(--brand); }
.cc-price-input { flex: 1; }
.cc-price-unit { font-size: 26rpx; color: #8a8378; white-space: nowrap; }
.cc-paid-hint { display: block; font-size: 22rpx; color: #8a8378; margin-top: 16rpx; line-height: 1.5; }
/* 审核 */
.cc-approval { margin-top: 24rpx; padding: 24rpx; border-radius: 20rpx; border: 2rpx solid rgba(0,0,0,0.1); background: rgba(0,0,0,0.03); }
.cc-approval-t { font-size: 22rpx; color: #8a8378; line-height: 1.6; }
/* 提交 */
.cc-submit-bar { padding: 20rpx 32rpx calc(20rpx + env(safe-area-inset-bottom)); background: #faf6f0; border-top: 2rpx solid rgba(0,0,0,0.08); flex-shrink: 0; }
.cc-submit { padding: 26rpx 0; border-radius: 999rpx; background: var(--brand); text-align: center; box-shadow: 0 8rpx 24rpx rgba(196,30,58,0.25); }
.cc-submit.disabled { opacity: 0.5; }
.cc-submit-t { font-size: 30rpx; font-weight: 600; color: #fff; }
</style>
