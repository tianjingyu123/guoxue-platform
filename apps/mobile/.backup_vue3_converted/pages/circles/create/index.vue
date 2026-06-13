<template>
  <view class="min-h-screen bg-background">
    <!-- Header -->
    <view class="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
      <view @click="goBack" class="p-1">
        <text class="text-foreground text-lg">←</text>
      </view>
      <text class="text-base font-semibold text-foreground">创建圈子</text>
    </view>

    <view class="px-4 pt-6 pb-28 space-y-6">
      <!-- Cover -->
      <view class="flex flex-col items-center gap-2">
        <view class="w-24 h-24 rounded-2xl bg-muted border-2 border-dashed border-border flex flex-col items-center justify-center gap-1">
          <text class="text-muted-foreground text-lg"></text>
          <text class="text-xs text-muted-foreground">添加封面</text>
        </view>
        <text class="text-xs text-muted-foreground">建议尺寸 600×600px</text>
      </view>

      <!-- Name -->
      <view>
        <view class="flex items-baseline mb-1.5">
          <text class="text-sm font-medium text-foreground">圈子名称</text>
          <text class="text-danger ml-0.5">*</text>
        </view>
        <input
          v-model="form.name"
          placeholder="2-20 个字符"
          maxlength="20"
          :class="['w-full px-3 py-2.5 bg-background border rounded-xl text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors', errors.name ? 'border-destructive' : 'border-border']"
        />
        <view class="flex justify-between mt-1">
          <text v-if="errors.name" class="text-xs text-danger">{{ errors.name }}</text>
          <text v-else class="text-xs" />
          <text class="text-xs text-muted-foreground">{{ form.name.length }}/20</text>
        </view>
      </view>

      <!-- Description -->
      <view>
        <view class="flex items-baseline mb-1.5">
          <text class="text-sm font-medium text-foreground">圈子简介</text>
          <text class="text-danger ml-0.5">*</text>
        </view>
        <textarea
          v-model="form.desc"
          placeholder="介绍圈子的主题、目标和特色，吸引更多志同道合的人加入"
          maxlength="200"
          :class="['w-full rounded-xl border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors resize-none', errors.desc ? 'border-destructive' : 'border-border']"
          style="min-height: 100px;"
        />
        <view class="flex justify-between mt-1">
          <text v-if="errors.desc" class="text-xs text-danger">{{ errors.desc }}</text>
          <text v-else class="text-xs" />
          <text class="text-xs text-muted-foreground">{{ form.desc.length }}/200</text>
        </view>
      </view>

      <!-- Category -->
      <view>
        <view class="flex items-baseline mb-2">
          <text class="text-sm font-medium text-foreground">分类</text>
          <text class="text-danger ml-0.5">*</text>
        </view>
        <view class="flex gap-2 flex-wrap">
          <view
            v-for="cat in CATEGORIES"
            :key="cat"
            @click="form.category = cat; errors.category = ''"
            :class="[
              'px-3 py-1.5 rounded-full text-sm transition-colors border',
              form.category === cat
                ? 'bg-primary text-white border-primary'
                : 'bg-background text-foreground border-border'
            ]"
          >
            <text>{{ cat }}</text>
          </view>
        </view>
        <text v-if="errors.category" class="text-xs text-danger mt-1 block">{{ errors.category }}</text>
      </view>

      <!-- Tags -->
      <view>
        <text class="text-sm font-medium text-foreground mb-1.5 block">标签（最多 5 个）</text>
        <view class="flex gap-2 mb-2 flex-wrap">
          <view
            v-for="t in form.tags"
            :key="t"
            class="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full"
          >
            <text>{{ t }}</text>
            <text @click="removeTag(t)" class="text-primary/60">×</text>
          </view>
        </view>
        <view v-if="form.tags.length < 5" class="flex gap-2">
          <input
            v-model="tagInput"
            @confirm="addTag"
            placeholder="输入标签后按回车"
            class="flex-1 px-3 py-2 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          <view @click="addTag" class="px-3 py-2 bg-background border border-border rounded-xl text-sm text-foreground flex items-center">
            <text>添加</text>
          </view>
        </view>
      </view>

      <!-- Privacy -->
      <view>
        <text class="text-sm font-medium text-foreground mb-2 block">加入方式</text>
        <view class="space-y-2">
          <view
            v-for="opt in PRIVACY_OPTIONS"
            :key="opt.value"
            @click="form.privacy = opt.value"
            :class="[
              'w-full flex items-center gap-3 p-3 rounded-xl border transition-colors',
              form.privacy === opt.value ? 'border-primary bg-primary/5' : 'border-border bg-white'
            ]"
          >
            <view :class="[
              'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
              form.privacy === opt.value ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
            ]">
              <text>{{ opt.icon }}</text>
            </view>
            <view class="flex-1 min-w-0">
              <text class="text-sm font-medium text-foreground block">{{ opt.label }}</text>
              <text class="text-xs text-muted-foreground block">{{ opt.desc }}</text>
            </view>
            <view :class="['w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center', form.privacy === opt.value ? 'border-primary' : 'border-border']">
              <view v-if="form.privacy === opt.value" class="w-2 h-2 rounded-full bg-primary" />
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- Submit -->
    <view class="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3 bg-background border-t border-border">
      <view
        @click="doCreate"
        :class="['w-full h-12 text-base rounded-lg flex items-center justify-center', loading ? 'bg-muted text-muted-foreground' : 'bg-primary text-white']"
      >
        <text v-if="loading">创建中…</text>
        <text v-else>创建圈子</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'

type Privacy = 'public' | 'approval' | 'private'

const PRIVACY_OPTIONS: { value: Privacy; label: string; desc: string; icon: string }[] = [
  { value: 'public',   label: '公开圈子', desc: '任何人都可以直接加入', icon: '🌐' },
  { value: 'approval', label: '审核加入', desc: '申请后由圈主审核通过', icon: '' },
  { value: 'private',  label: '私密圈子', desc: '仅受邀请的人可加入',   icon: '' },
]

const CATEGORIES = ['八字命理', '紫微斗数', '奇门遁甲', '风水堪舆', '易经', '梅花易数', '面相手相', '国学文化', '其他']

const form = reactive({
  name: '',
  desc: '',
  category: '',
  privacy: 'public' as Privacy,
  tags: [] as string[],
})
const tagInput = ref('')
const loading = ref(false)
const errors = reactive<Record<string, string>>({})

function addTag() {
  const t = tagInput.value.trim()
  if (t && !form.tags.includes(t) && form.tags.length < 5) {
    form.tags.push(t)
    tagInput.value = ''
  }
}

function removeTag(t: string) {
  form.tags = form.tags.filter(x => x !== t)
}

function validate(): boolean {
  Object.keys(errors).forEach(k => delete (errors as any)[k])
  if (!form.name.trim()) errors.name = '请输入圈子名称'
  if (form.name.length > 20) errors.name = '名称不超过 20 字'
  if (!form.desc.trim()) errors.desc = '请输入圈子简介'
  if (!form.category) errors.category = '请选择分类'
  return Object.keys(errors).length === 0
}

function doCreate() {
  if (!validate()) return
  loading.value = true
  setTimeout(() => {
    loading.value = false
    uni.showToast({ title: '圈子创建成功', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 800)
  }, 1200)
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
