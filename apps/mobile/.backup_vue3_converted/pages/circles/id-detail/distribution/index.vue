<template>
  <view class="min-h-screen bg-background">
    <!-- Header -->
    <view class="sticky top-0 z-10 bg-white border-b border-border">
      <view class="flex items-center justify-between px-4 h-14">
        <view class="p-2 -ml-2" @click="goBack">
          <text class="text-xl text-foreground">←</text>
        </view>
        <text class="font-semibold text-foreground">收益分配设置</text>
        <view class="p-2 -mr-2 text-muted-foreground" @click="showHelp = true">
          <text class="text-xl">❓</text>
        </view>
      </view>

      <!-- Tabs -->
      <view class="flex border-b border-border">
        <view
          class="flex-1 py-3 text-sm font-medium border-b-2 text-center"
          :class="activeTab === 'plans' ? 'text-primary border-primary' : 'text-muted-foreground border-transparent'"
          @click="activeTab = 'plans'"
        >
          <text>分配方案</text>
        </view>
        <view
          class="flex-1 py-3 text-sm font-medium border-b-2 text-center"
          :class="activeTab === 'guests' ? 'text-primary border-primary' : 'text-muted-foreground border-transparent'"
          @click="activeTab = 'guests'"
        >
          <text>嘉宾个性化</text>
        </view>
      </view>
    </view>

    <!-- 说明卡片 -->
    <view class="mx-4 mt-4 p-4 bg-[#FFFBEB] border border-[#FDE68A] rounded-2xl">
      <view class="flex gap-3">
        <text class="text-xl text-[#D97706] shrink-0">ℹ️</text>
        <view class="text-sm text-[#92400E]">
          <text class="font-medium block mb-1">分配说明</text>
          <text class="text-xs text-[#B45309] leading-relaxed block">
            收益分配顺序：平台抽成 → 圈子收益 → 创作者（嘉宾/老师）收益。
            您可以为不同内容类型设置不同方案，也可以为特定嘉宾设置个性化分成比例。
          </text>
        </view>
      </view>
    </view>

    <!-- 分配方案列表 -->
    <view v-if="activeTab === 'plans'" class="p-4 space-y-3">
      <view
        v-for="plan in plans"
        :key="plan.id"
        class="bg-white rounded-2xl p-4"
        style="box-shadow: 0 2px 12px rgba(0,0,0,0.04)"
      >
        <view class="flex items-start justify-between">
          <view class="flex-1">
            <view class="flex items-center gap-2">
              <text class="font-medium text-foreground">{{ plan.name }}</text>
              <text v-if="plan.isDefault" class="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                默认
              </text>
            </view>
            <text class="text-xs text-muted-foreground mt-1 block">{{ plan.description }}</text>
          </view>
          <view class="p-2 text-muted-foreground" @click="openEditor(plan.id)">
            <text class="text-base">✏️</text>
          </view>
        </view>

        <!-- 适用内容类型 -->
        <view class="mt-3 flex flex-wrap gap-1.5">
          <text
            v-for="type in plan.contentTypes"
            :key="type"
            class="text-[10px] px-2 py-1 rounded-full inline-flex items-center gap-1"
            :style="getTypeStyle(type)"
          >
            <text>{{ getTypeIcon(type) }}</text>
            <text>{{ getTypeLabel(type) }}</text>
          </text>
        </view>

        <!-- 分配比例可视化 -->
        <view class="mt-3 pt-3 border-t border-border">
          <view class="flex h-8 rounded-lg overflow-hidden">
            <view
              class="flex items-center justify-center text-white text-[10px] font-medium"
              :style="{
                width: plan.rules.platform + '%',
                backgroundColor: '#999',
                minWidth: plan.rules.platform > 5 ? 'auto' : '20px'
              }"
            >
              <text v-if="plan.rules.platform > 8">{{ plan.rules.platform }}%</text>
            </view>
            <view
              class="flex items-center justify-center text-white text-[10px] font-medium"
              :style="{
                width: plan.rules.circle + '%',
                backgroundColor: '#C9A96E'
              }"
            >
              <text>{{ plan.rules.circle }}%</text>
            </view>
            <view
              class="flex items-center justify-center text-white text-[10px] font-medium"
              :style="{
                width: plan.rules.creator + '%',
                backgroundColor: '#C41E3A'
              }"
            >
              <text>{{ plan.rules.creator }}%</text>
            </view>
          </view>
          <view class="flex justify-between mt-2 text-[10px] text-muted-foreground">
            <text class="flex items-center gap-1">
              <text class="w-2 h-2 rounded-full bg-[#999] inline-block"></text>
              平台 {{ plan.rules.platform }}%
            </text>
            <text class="flex items-center gap-1">
              <text class="w-2 h-2 rounded-full bg-accent inline-block"></text>
              圈子 {{ plan.rules.circle }}%
            </text>
            <text class="flex items-center gap-1">
              <text class="w-2 h-2 rounded-full bg-primary inline-block"></text>
              创作者 {{ plan.rules.creator }}%
            </text>
          </view>
        </view>
      </view>

      <!-- 添加方案按钮 -->
      <view
        class="w-full py-4 border-2 border-dashed border-border rounded-2xl flex items-center justify-center gap-2 text-muted-foreground"
        @click="openCreateModal"
      >
        <text class="text-xl">➕</text>
        <text class="text-sm">添加分配方案</text>
      </view>
    </view>

    <!-- 嘉宾个性化分成 -->
    <view v-if="activeTab === 'guests'" class="p-4 space-y-3">
      <text class="text-xs text-muted-foreground block mb-2">为特定嘉宾/老师设置个性化分成比例，覆盖默认方案</text>

      <template v-if="mockGuestOverrides.length > 0">
        <view
          v-for="guest in mockGuestOverrides"
          :key="guest.guestId"
          class="bg-white rounded-2xl p-4"
          style="box-shadow: 0 2px 12px rgba(0,0,0,0.04)"
        >
          <view class="flex items-center gap-3">
            <image
              :src="guest.avatar"
              mode="aspectFill"
              class="w-10 h-10 rounded-xl"
            />
            <view class="flex-1">
              <text class="font-medium text-foreground block">{{ guest.guestName }}</text>
              <view class="flex flex-wrap gap-1 mt-1">
                <text
                  v-for="type in guest.contentTypes"
                  :key="type"
                  class="text-[10px] px-1.5 py-0.5 rounded"
                  :style="getTypeStyle(type)"
                >
                  {{ getTypeLabel(type) }}
                </text>
              </view>
            </view>
            <view class="text-right">
              <text class="text-lg font-bold text-primary">{{ guest.sharePercent }}%</text>
              <text class="text-[10px] text-muted-foreground block">创作者分成</text>
            </view>
            <text class="text-xl text-muted-foreground">›</text>
          </view>
        </view>
      </template>
      <template v-else>
        <view class="text-center py-8">
          <text class="text-4xl text-[#E8E0D5] block mb-3"></text>
          <text class="text-muted-foreground text-sm block">暂无个性化分成设置</text>
          <text class="text-xs text-muted-foreground mt-1 block">所有嘉宾使用默认分配方案</text>
        </view>
      </template>

      <view class="w-full py-4 border-2 border-dashed border-border rounded-2xl flex items-center justify-center gap-2 text-muted-foreground">
        <text class="text-xl">➕</text>
        <text class="text-sm">添加个性化分成</text>
      </view>
    </view>

    <!-- 创建/编辑方案弹窗 -->
    <view v-if="showCreateModal || editingPlan" class="fixed inset-0 z-50 flex items-end">
      <view class="absolute inset-0 bg-black/40" @click="closeEditor" />
      <view class="relative w-full bg-white rounded-t-3xl overflow-hidden" style="max-height: 90vh;">
        <view class="flex items-center justify-between p-4 border-b border-border">
          <view class="text-muted-foreground" @click="closeEditor">
            <text>取消</text>
          </view>
          <text class="font-medium text-foreground">{{ editingPlan ? '编辑方案' : '创建方案' }}</text>
          <view class="text-primary font-medium" @click="handleSave">
            <text>保存</text>
          </view>
        </view>

        <scroll-view scroll-y class="p-4" style="max-height: 75vh;">
          <!-- 错误提示 -->
          <view v-if="formError" class="flex items-center gap-2 p-3 bg-[#FEF2F2] text-[#DC2626] text-sm rounded-xl mb-4">
            <text></text>
            <text>{{ formError }}</text>
          </view>

          <!-- 方案名称 -->
          <view class="mb-4">
            <text class="block text-sm font-medium text-foreground mb-2">方案名称</text>
            <input
              type="text"
              v-model="formName"
              placeholder="如：课程专属方案"
              class="w-full px-4 py-3 bg-background rounded-xl text-sm"
              @input="formError = ''"
            />
          </view>

          <!-- 方案描述 -->
          <view class="mb-4">
            <text class="block text-sm font-medium text-foreground mb-2">方案描述（可选）</text>
            <input
              type="text"
              v-model="formDescription"
              placeholder="简要描述此方案的用途"
              class="w-full px-4 py-3 bg-background rounded-xl text-sm"
            />
          </view>

          <!-- 适用内容类型 -->
          <view class="mb-4">
            <text class="block text-sm font-medium text-foreground mb-2">适用内容类型</text>
            <view class="flex flex-wrap gap-2">
              <view
                v-for="type in contentTypes"
                :key="type.key"
                class="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm"
                :class="formSelectedTypes.includes(type.key) ? 'text-white' : 'bg-background text-muted-foreground'"
                :style="formSelectedTypes.includes(type.key) ? { backgroundColor: type.color } : {}"
                @click="toggleType(type.key)"
              >
                <text>{{ type.icon }}</text>
                <text>{{ type.label }}</text>
              </view>
            </view>
          </view>

          <!-- 分配比例设置 -->
          <view class="mb-4">
            <text class="block text-sm font-medium text-foreground mb-3">分配比例</text>

            <!-- 平台抽成 -->
            <view class="mb-4">
              <view class="flex items-center justify-between mb-2">
                <text class="text-sm text-muted-foreground">平台抽成</text>
                <text class="text-sm font-medium text-foreground">{{ formPlatform }}%</text>
              </view>
              <slider
                min="5"
                max="30"
                :value="formPlatform"
                @change="onPlatformChange"
                activeColor="#999"
                backgroundColor="#E8E0D5"
                block-size="16"
                class="w-full"
              />
              <text class="text-[10px] text-muted-foreground mt-1 block">平台技术服务费，固定比例5%-30%</text>
            </view>

            <!-- 圈子收益 -->
            <view class="mb-4">
              <view class="flex items-center justify-between mb-2">
                <text class="text-sm text-muted-foreground">圈子收益</text>
                <text class="text-sm font-medium text-accent">{{ formCircle }}%</text>
              </view>
              <slider
                min="0"
                max="50"
                :value="formCircle"
                @change="onCircleChange"
                activeColor="#C9A96E"
                backgroundColor="#E8E0D5"
                block-size="16"
                class="w-full"
              />
              <text class="text-[10px] text-muted-foreground mt-1 block">归圈主所有，用于圈子运营</text>
            </view>

            <!-- 创作者收益 -->
            <view class="mb-4">
              <view class="flex items-center justify-between mb-2">
                <text class="text-sm text-muted-foreground">创作者收益</text>
                <text class="text-sm font-medium text-primary">{{ formCreator }}%</text>
              </view>
              <view class="w-full h-2 bg-background rounded-full overflow-hidden">
                <view
                  class="h-full bg-primary transition-all"
                  :style="{ width: formCreator + '%' }"
                />
              </view>
              <text class="text-[10px] text-muted-foreground mt-1 block">归内容创作者（嘉宾/老师）所有</text>
            </view>

            <!-- 比例校验 -->
            <view
              class="flex items-center justify-between p-3 rounded-xl"
              :class="formTotal === 100 ? 'bg-[#F0FDF4]' : 'bg-[#FEF2F2]'"
            >
              <text
                class="text-sm"
                :class="formTotal === 100 ? 'text-[#16A34A]' : 'text-[#DC2626]'"
              >比例总和</text>
              <text
                class="font-medium"
                :class="formTotal === 100 ? 'text-[#16A34A]' : 'text-[#DC2626]'"
              >
                {{ formTotal }}%
                <text v-if="formTotal === 100"> </text>
                <text v-else> (需为100%)</text>
              </text>
            </view>
          </view>

          <!-- 设为默认 -->
          <view class="flex items-center justify-between p-3 bg-background rounded-xl mb-4">
            <view>
              <text class="text-sm font-medium text-foreground block">设为默认方案</text>
              <text class="text-[10px] text-muted-foreground mt-0.5 block">新内容将自动使用此方案</text>
            </view>
            <view
              class="w-11 h-6 rounded-full relative"
              :class="formIsDefault ? 'bg-primary' : 'bg-[#E8E0D5]'"
              @click="formIsDefault = !formIsDefault"
            >
              <view
                class="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
                :class="formIsDefault ? 'translate-x-5' : 'translate-x-0.5'"
              />
            </view>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 帮助说明弹窗 -->
    <view v-if="showHelp" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <view class="absolute inset-0 bg-black/40" @click="showHelp = false" />
      <view class="relative w-full max-w-md bg-white rounded-2xl overflow-hidden" style="max-height: 80vh;">
        <view class="flex items-center justify-between p-4 border-b border-border">
          <text class="font-medium text-foreground">收益分配说明</text>
          <view class="text-muted-foreground" @click="showHelp = false">
            <text>关闭</text>
          </view>
        </view>
        <scroll-view scroll-y class="p-4 space-y-4" style="max-height: 60vh;">
          <view>
            <text class="font-medium text-foreground block mb-2">分配流程</text>
            <view class="space-y-2 text-sm text-muted-foreground">
              <text class="block">1. 用户付费购买内容</text>
              <text class="block">2. 平台扣除技术服务费</text>
              <text class="block">3. 圈子获得运营收益</text>
              <text class="block">4. 创作者获得内容收益</text>
            </view>
          </view>
          <view>
            <text class="font-medium text-foreground block mb-2">角色说明</text>
            <view class="space-y-2 text-sm text-muted-foreground">
              <text class="block"><text class="font-semibold">平台</text>：提供技术服务，收取固定比例服务费</text>
              <text class="block"><text class="font-semibold">圈子</text>：圈主获得的运营收益，用于圈子建设</text>
              <text class="block"><text class="font-semibold">创作者</text>：内容创作者（嘉宾/老师）的收益</text>
            </view>
          </view>
          <view>
            <text class="font-medium text-foreground block mb-2">注意事项</text>
            <view class="space-y-2 text-sm text-muted-foreground">
              <text class="block">&bull; 分配比例总和必须为100%</text>
              <text class="block">&bull; 可为不同内容类型设置不同方案</text>
              <text class="block">&bull; 可为特定嘉宾设置个性化比例</text>
              <text class="block">&bull; 修改方案不影响已结算的收益</text>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

// 内容类型配置
const contentTypes = [
  { key: 'article', label: '文章', icon: '', color: '#4A90D9' },
  { key: 'course', label: '课程', icon: '', color: '#C9A96E' },
  { key: 'live', label: '直播', icon: '📡', color: '#C41E3A' },
  { key: 'qa', label: '问答', icon: '', color: '#10B981' },
] as const

// Mock: 当前分配方案
const mockDistributionPlans = [
  {
    id: 'default',
    name: '默认分配方案',
    isDefault: true,
    description: '适用于所有内容类型的通用分配方案',
    rules: { platform: 10, circle: 20, creator: 70 },
    contentTypes: ['article', 'course', 'live', 'qa'],
    createdAt: '2024-01-01',
  },
  {
    id: 'course-special',
    name: '课程专属方案',
    isDefault: false,
    description: '针对付费课程的特殊分配比例',
    rules: { platform: 15, circle: 15, creator: 70 },
    contentTypes: ['course'],
    createdAt: '2024-02-15',
  },
  {
    id: 'live-tips',
    name: '直播打赏方案',
    isDefault: false,
    description: '直播打赏收益的分配规则',
    rules: { platform: 20, circle: 10, creator: 70 },
    contentTypes: ['live'],
    createdAt: '2024-03-01',
  },
]

// Mock: 嘉宾个性化分成
const mockGuestOverrides = [
  { guestId: '1', guestName: '张玄风', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhang', sharePercent: 75, contentTypes: ['article', 'course'] },
  { guestId: '2', guestName: '李易安', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=li', sharePercent: 65, contentTypes: ['course'] },
]

// UI State
const activeTab = ref<'plans' | 'guests'>('plans')
const plans = ref([...mockDistributionPlans])
const showCreateModal = ref(false)
const editingPlan = ref<string | null>(null)
const showHelp = ref(false)

// 表单状态
const formName = ref('')
const formDescription = ref('')
const formIsDefault = ref(false)
const formSelectedTypes = ref<string[]>(['article'])
const formPlatform = ref(10)
const formCircle = ref(20)
const formCreator = ref(70)
const formError = ref('')

// 计算属性
const formTotal = computed(() => formPlatform.value + formCircle.value + formCreator.value)

// 辅助函数
function getTypeStyle(type: string) {
  const cfg = contentTypes.find(t => t.key === type)
  if (!cfg) return {}
  return { backgroundColor: cfg.color + '15', color: cfg.color }
}

function getTypeIcon(type: string): string {
  const cfg = contentTypes.find(t => t.key === type)
  return cfg ? cfg.icon : ''
}

function getTypeLabel(type: string): string {
  const cfg = contentTypes.find(t => t.key === type)
  return cfg ? cfg.label : type
}

// 导航
function goBack() {
  uni.navigateBack()
}

// 打开编辑
function openEditor(planId: string) {
  const plan = plans.value.find(p => p.id === planId)
  if (plan) {
    formName.value = plan.name
    formDescription.value = plan.description
    formIsDefault.value = plan.isDefault
    formSelectedTypes.value = [...plan.contentTypes]
    formPlatform.value = plan.rules.platform
    formCircle.value = plan.rules.circle
    formCreator.value = plan.rules.creator
    formError.value = ''
    editingPlan.value = planId
  }
}

// 打开新建
function openCreateModal() {
  formName.value = ''
  formDescription.value = ''
  formIsDefault.value = false
  formSelectedTypes.value = ['article']
  formPlatform.value = 10
  formCircle.value = 20
  formCreator.value = 70
  formError.value = ''
  editingPlan.value = null
  showCreateModal.value = true
}

// 关闭编辑器
function closeEditor() {
  showCreateModal.value = false
  editingPlan.value = null
  formError.value = ''
}

// 切换内容类型
function toggleType(type: string) {
  const idx = formSelectedTypes.value.indexOf(type)
  if (idx >= 0) {
    formSelectedTypes.value.splice(idx, 1)
  } else {
    formSelectedTypes.value.push(type)
  }
  formError.value = ''
}

// 自动调整创作者比例（仅当新值有效时）
function adjustCreator(newPlatform: number, newCircle: number) {
  const remaining = 100 - newPlatform - newCircle
  if (remaining >= 0 && remaining <= 100) {
    formCreator.value = remaining
  }
}

// 平台抽成滑块变化
function onPlatformChange(e: any) {
  const val = Number(e.detail.value)
  formPlatform.value = val
  adjustCreator(val, formCircle.value)
  formError.value = ''
}

// 圈子收益滑块变化
function onCircleChange(e: any) {
  const val = Number(e.detail.value)
  formCircle.value = val
  adjustCreator(formPlatform.value, val)
  formError.value = ''
}

// 保存方案
function handleSave() {
  if (!formName.value.trim()) {
    formError.value = '请输入方案名称'
    return
  }
  if (formSelectedTypes.value.length === 0) {
    formError.value = '请选择至少一种内容类型'
    return
  }
  if (formTotal.value !== 100) {
    formError.value = '分配比例总和必须为100%'
    return
  }

  const newPlan = {
    name: formName.value,
    description: formDescription.value,
    isDefault: formIsDefault.value,
    contentTypes: [...formSelectedTypes.value],
    rules: { platform: formPlatform.value, circle: formCircle.value, creator: formCreator.value },
  }

  if (editingPlan.value) {
    plans.value = plans.value.map(p =>
      p.id === editingPlan.value ? { ...p, ...newPlan } : p
    )
  } else {
    plans.value = [
      ...plans.value,
      {
        ...newPlan,
        id: Date.now().toString(),
        createdAt: new Date().toISOString().split('T')[0],
      },
    ]
  }

  closeEditor()
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
