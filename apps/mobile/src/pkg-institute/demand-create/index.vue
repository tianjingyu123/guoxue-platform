<template>
  <view class="page">
    <!-- 成功页 -->
    <view v-if="success" class="success-page">
      <app-icon name="check-circle-2" :size="64" color="#16a34a" />
      <text class="success-title">师资需求已发布</text>
      <text class="success-desc">您的师资需求已发布，平台将向符合条件的讲师推送通知，请留意消息。</text>
      <view class="success-btn" @tap="goBack">
        <text class="success-btn-text">返回</text>
      </view>
    </view>

    <!-- 表单 -->
    <template v-else>
      <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
        <view class="nav-bar">
          <view class="nav-back" @tap="goBack">
            <app-icon name="arrow-left" :size="20" color="#1a1a1a" />
          </view>
          <text class="nav-title">发布师资需求</text>
          <view class="nav-placeholder" />
        </view>
      </view>

      <scroll-view scroll-y class="scroll" :style="{ height: scrollHeight + 'px' }">
        <view class="form">
          <!-- 职位标题 -->
          <view class="field">
            <text class="field-label">职位标题 <text class="star">*</text></text>
            <input v-model="form.title" class="input" placeholder="如：招募八字命理线上讲师" placeholder-class="ph" />
          </view>

          <!-- 专业方向 -->
          <view class="field">
            <text class="field-label">专业方向 <text class="star">*</text></text>
            <view class="chip-row">
              <view v-for="s in specialties" :key="s" class="chip" :class="{ 'chip-active': form.specialty === s }" @tap="form.specialty = s">
                <text class="chip-text" :class="{ 'chip-text-active': form.specialty === s }">{{ s }}</text>
              </view>
            </view>
          </view>

          <!-- 授课方式 -->
          <view class="field">
            <text class="field-label">授课方式 <text class="star">*</text></text>
            <view class="chip-row">
              <view v-for="t in teachTypes" :key="t" class="chip" :class="{ 'chip-active': form.teachType === t }" @tap="form.teachType = t">
                <text class="chip-text" :class="{ 'chip-text-active': form.teachType === t }">{{ t }}</text>
              </view>
            </view>
          </view>

          <!-- 薪酬范围 -->
          <view class="field">
            <text class="field-label">薪酬范围</text>
            <view class="chip-row">
              <view v-for="s in salaries" :key="s" class="chip" :class="{ 'chip-active': form.salary === s }" @tap="form.salary = s">
                <text class="chip-text" :class="{ 'chip-text-active': form.salary === s }">{{ s }}</text>
              </view>
            </view>
          </view>

          <!-- 人数 + 日期 -->
          <view class="grid-2">
            <view class="field">
              <text class="field-label">招募人数</text>
              <input v-model="form.count" class="input" placeholder="如：3 人" placeholder-class="ph" />
            </view>
            <view class="field">
              <text class="field-label">开始日期</text>
              <picker mode="date" :value="form.startDate" @change="form.startDate = $event.detail.value">
                <view class="input input-picker">
                  <text :class="form.startDate ? 'picker-val' : 'picker-ph'">{{ form.startDate || '请选择' }}</text>
                </view>
              </picker>
            </view>
          </view>

          <!-- 岗位要求 -->
          <view class="field">
            <view class="label-row">
              <text class="field-label">岗位要求 <text class="star">*</text></text>
              <text class="counter">{{ form.desc.length }}/500</text>
            </view>
            <textarea v-model="form.desc" class="textarea" placeholder="请描述对讲师的资质要求、经验要求、工作内容等" :maxlength="500" />
          </view>

          <!-- 联系方式 -->
          <view class="field">
            <text class="field-label">联系方式 <text class="star">*</text></text>
            <input v-model="form.contact" class="input" placeholder="手机号或微信号" placeholder-class="ph" />
          </view>
        </view>
        <view style="height: 88px" />
      </scroll-view>

      <view class="footer">
        <view class="submit-btn" :class="{ 'submit-disabled': !valid || loading }" @tap="handleSubmit">
          <app-icon v-if="loading" name="loader-2" :size="16" color="#fff" class="spin" />
          <text class="submit-text">{{ loading ? '发布中…' : '发布师资需求' }}</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { instituteApi, demandSpecialtyOptions as specialties, demandTeachTypes as teachTypes, demandSalaries as salaries } from '@/lib/institute-data'

const statusBarHeight = ref(0)
const scrollHeight = ref(600)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 0
  scrollHeight.value = (info.windowHeight || 700) - statusBarHeight.value - 44
} catch (e) {}

const form = reactive({
  title: '', specialty: '', teachType: '', salary: '',
  count: '', startDate: '', desc: '', contact: '',
})
const loading = ref(false)
const success = ref(false)

const valid = computed(() => form.title && form.specialty && form.teachType && form.desc && form.contact)

function handleSubmit() {
  if (!valid.value || loading.value) return
  loading.value = true
  setTimeout(() => {
    loading.value = false
    success.value = true
  }, 1200)
}
</script>

<style scoped>
.page { min-height: 100vh; background: #f5f5f5; }
.nav { position: sticky; top: 0; z-index: 20; background: #fff; border-bottom: 1px solid #ededed; }
.nav-bar { display: flex; align-items: center; justify-content: space-between; height: 44px; padding: 0 12px; }
.nav-back { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; }
.nav-title { font-size: 16px; font-weight: 600; color: #1a1a1a; }
.nav-placeholder { width: 32px; }
.scroll { width: 100%; }

.form { padding: 24px 16px 0; display: flex; flex-direction: column; gap: 20px; }
.field { display: flex; flex-direction: column; }
.field-label { font-size: 14px; font-weight: 500; color: #1a1a1a; margin-bottom: 8px; }
.star { color: #dc2626; }
.label-row { display: flex; align-items: center; justify-content: space-between; }
.counter { font-size: 11px; color: #9ca3af; }
.input { width: 100%; box-sizing: border-box; height: 44px; padding: 0 12px; font-size: 14px; color: #1a1a1a; background: #fff; border: 1px solid #d1d5db; border-radius: 8px; }
.input-picker { display: flex; align-items: center; }
.picker-val { font-size: 14px; color: #1a1a1a; }
.picker-ph { font-size: 14px; color: #9ca3af; }
.ph { color: #9ca3af; }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.chip-row { display: flex; flex-wrap: wrap; gap: 8px; }
.chip { padding: 6px 12px; border-radius: 999px; border: 1px solid #d1d5db; background: #fff; }
.chip-active { background: #c41e3a; border-color: #c41e3a; }
.chip-text { font-size: 14px; color: #1a1a1a; }
.chip-text-active { color: #fff; }
.textarea { width: 100%; box-sizing: border-box; min-height: 110px; padding: 10px 12px; font-size: 14px; color: #1a1a1a; background: #fff; border: 1px solid #d1d5db; border-radius: 8px; }

.footer { position: fixed; bottom: 0; left: 0; right: 0; padding: 12px 16px; padding-bottom: calc(12px + env(safe-area-inset-bottom)); background: #fff; border-top: 1px solid #ededed; }
.submit-btn { height: 44px; background: #c41e3a; border-radius: 8px; display: flex; align-items: center; justify-content: center; gap: 8px; }
.submit-disabled { opacity: 0.5; }
.submit-text { font-size: 15px; color: #fff; font-weight: 600; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.success-page { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0 32px; text-align: center; }
.success-title { font-size: 20px; font-weight: 700; color: #1a1a1a; margin-top: 16px; margin-bottom: 8px; }
.success-desc { font-size: 13px; color: #6b7280; line-height: 1.6; margin-bottom: 32px; }
.success-btn { width: 100%; height: 44px; background: #c41e3a; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
.success-btn-text { font-size: 15px; color: #fff; font-weight: 600; }
</style>
