<template>
  <view class="min-h-screen bg-background pb-8">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-40 bg-white/95 border-b border-border">
      <view class="flex items-center justify-between px-4 h-14">
        <view @click="goBack" class="p-2 -ml-2">
          <text class="text-lg text-foreground">←</text>
        </view>
        <text class="font-semibold text-base text-foreground">圈子设置</text>
        <view class="w-9" />
      </view>
    </view>

    <view class="px-4 py-4 space-y-4">
      <!-- 基础信息设置 -->
      <view>
        <text class="text-sm text-muted-foreground mb-2 px-1 block">基础信息</text>
        <view class="bg-white rounded-xl divide-y divide-border">
          <!-- 圈子封面 -->
          <view class="flex items-center justify-between p-4" @click="changeCover">
            <view class="flex items-center gap-3">
              <text class="text-base"></text>
              <text class="text-sm text-foreground">圈子封面</text>
            </view>
            <view class="flex items-center gap-2">
              <view class="w-16 h-10 rounded-lg bg-background flex items-center justify-center">
                <text class="text-[#CCC]"></text>
              </view>
              <text class="text-muted-foreground">›</text>
            </view>
          </view>

          <!-- 圈子名称（内联编辑） -->
          <view class="flex items-center justify-between p-4">
            <view class="flex items-center gap-3">
              <text class="text-base">✏️</text>
              <text class="text-sm text-foreground">圈子名称</text>
            </view>
            <view v-if="editingField === 'name'" class="flex items-center gap-2">
              <input
                v-model="tempValue"
                class="w-32 px-2 py-1 text-sm bg-background rounded border-0 outline-none text-foreground"
                :focus="true"
              />
              <view @click="handleSave('name')" class="p-1 text-primary"><text>✓</text></view>
              <view @click="editingField = null" class="p-1 text-muted-foreground"><text>✕</text></view>
            </view>
            <view v-else @click="handleEdit('name', settings.name)" class="flex items-center gap-2 text-muted-foreground">
              <text class="text-sm">{{ settings.name }}</text>
              <text>›</text>
            </view>
          </view>

          <!-- 圈子简介 -->
          <view class="flex items-center justify-between p-4" @click="handleEdit('description', settings.description)">
            <view class="flex items-center gap-3">
              <text class="text-base"></text>
              <text class="text-sm text-foreground">圈子简介</text>
            </view>
            <view class="flex items-center gap-2 text-muted-foreground">
              <text class="text-sm max-w-[120px] truncate">{{ settings.description }}</text>
              <text>›</text>
            </view>
          </view>

          <!-- 圈子标签 -->
          <view class="flex items-center justify-between p-4" @click="handleEdit('tags', settings.tags.join(','))">
            <view class="flex items-center gap-3">
              <text class="text-base"></text>
              <text class="text-sm text-foreground">圈子标签</text>
            </view>
            <view class="flex items-center gap-2">
              <view class="flex gap-1">
                <text v-for="tag in settings.tags.slice(0, 2)" :key="tag" class="text-[10px] px-1.5 py-0 bg-background rounded">{{ tag }}</text>
                <text v-if="settings.tags.length > 2" class="text-[10px] px-1.5 py-0 bg-background rounded">+{{ settings.tags.length - 2 }}</text>
              </view>
              <text class="text-muted-foreground">›</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 入圈规则设置 -->
      <view>
        <text class="text-sm text-muted-foreground mb-2 px-1 block">入圈规则</text>
        <view class="bg-white rounded-xl divide-y divide-border">
          <!-- 圈子类型 -->
          <view class="flex items-center justify-between p-4" @click="showTypePicker = true">
            <view class="flex items-center gap-3">
              <text class="text-base"></text>
              <text class="text-sm text-foreground">圈子类型</text>
            </view>
            <view class="flex items-center gap-2">
              <text class="text-xs px-1.5 py-0.5 bg-accent/20 text-accent rounded">
                {{ settings.type === 'free' ? '免费' : settings.type === 'paid' ? '付费' : '年费' }}
              </text>
              <text class="text-muted-foreground">›</text>
            </view>
          </view>

          <!-- 付费价格 -->
          <view v-if="settings.type !== 'free'" class="flex items-center justify-between p-4" @click="handleEdit('price', String(settings.type === 'yearly' ? settings.yearlyPrice : settings.price))">
            <view class="flex items-center gap-3">
              <text class="text-base">🎁</text>
              <text class="text-sm text-foreground">{{ settings.type === 'yearly' ? '年费价格' : '入圈价格' }}</text>
            </view>
            <view class="flex items-center gap-2 text-muted-foreground">
              <text class="text-sm text-primary font-medium">¥{{ settings.type === 'yearly' ? settings.yearlyPrice : settings.price }}</text>
              <text>›</text>
            </view>
          </view>

          <!-- 加入方式 -->
          <view class="flex items-center justify-between p-4" @click="showJoinMethodPicker = true">
            <view class="flex items-center gap-3">
              <text class="text-base"></text>
              <text class="text-sm text-foreground">加入方式</text>
            </view>
            <view class="flex items-center gap-2 text-muted-foreground">
              <text class="text-sm">
                {{ settings.joinMethod === 'direct' ? '直接加入' : settings.joinMethod === 'approval' ? '需要审批' : '仅限邀请' }}
              </text>
              <text>›</text>
            </view>
          </view>

          <!-- 欢迎语 -->
          <view class="flex items-center justify-between p-4" @click="handleEdit('welcomeMessage', settings.welcomeMessage)">
            <view class="flex items-center gap-3">
              <text class="text-base"></text>
              <text class="text-sm text-foreground">自动欢迎语</text>
            </view>
            <view class="flex items-center gap-2 text-muted-foreground">
              <text class="text-sm max-w-[100px] truncate">{{ settings.welcomeMessage }}</text>
              <text>›</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 成员权限设置 -->
      <view>
        <text class="text-sm text-muted-foreground mb-2 px-1 block">成员权限</text>
        <view class="bg-white rounded-xl divide-y divide-border">
          <!-- 发帖权限 -->
          <view class="flex items-center justify-between p-4" @click="togglePostPermission">
            <view class="flex items-center gap-3">
              <text class="text-base">✏️</text>
              <text class="text-sm text-foreground">发帖权限</text>
            </view>
            <view class="flex items-center gap-2 text-muted-foreground">
              <text class="text-sm">{{ settings.postPermission === 'all' ? '所有成员' : '仅管理员' }}</text>
              <text>›</text>
            </view>
          </view>

          <!-- 评论权限 -->
          <view class="flex items-center justify-between p-4" @click="toggleCommentPermission">
            <view class="flex items-center gap-3">
              <text class="text-base"></text>
              <text class="text-sm text-foreground">评论权限</text>
            </view>
            <view class="flex items-center gap-2 text-muted-foreground">
              <text class="text-sm">{{ settings.commentPermission === 'all' ? '所有成员' : '仅管理员' }}</text>
              <text>›</text>
            </view>
          </view>

          <!-- 分享权限 -->
          <view class="flex items-center justify-between p-4">
            <view class="flex items-center gap-3">
              <text class="text-base"></text>
              <text class="text-sm text-foreground">允许分享到圈外</text>
            </view>
            <view
              @click="handleToggle('sharePermission')"
              :class="['relative w-11 h-6 rounded-full transition-colors', settings.sharePermission ? 'bg-primary' : 'bg-[#E8E0D5]']"
            >
              <view :class="['absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform', settings.sharePermission ? 'left-6' : 'left-1']" />
            </view>
          </view>

          <!-- 成员列表可见性 -->
          <view class="flex items-center justify-between p-4">
            <view class="flex items-center gap-3">
              <text class="text-base">{{ settings.memberListVisible ? '' : '' }}</text>
              <text class="text-sm text-foreground">成员列表对外公开</text>
            </view>
            <view
              @click="handleToggle('memberListVisible')"
              :class="['relative w-11 h-6 rounded-full transition-colors', settings.memberListVisible ? 'bg-primary' : 'bg-[#E8E0D5]']"
            >
              <view :class="['absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform', settings.memberListVisible ? 'left-6' : 'left-1']" />
            </view>
          </view>
        </view>
      </view>

      <!-- 内容保护设置 -->
      <view>
        <text class="text-sm text-muted-foreground mb-2 px-1 block">内容保护</text>
        <view class="bg-white rounded-xl p-4">
          <view class="flex items-center justify-between">
            <view class="flex items-center gap-3">
              <text class="text-base">🛡</text>
              <view>
                <text class="text-sm text-foreground block">内容保护模式</text>
                <text class="text-xs text-muted-foreground mt-0.5">开启后禁止截图和复制</text>
              </view>
            </view>
            <view
              @click="handleToggle('contentProtection')"
              :class="['relative w-11 h-6 rounded-full transition-colors', settings.contentProtection ? 'bg-primary' : 'bg-[#E8E0D5]']"
            >
              <view :class="['absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform', settings.contentProtection ? 'left-6' : 'left-1']" />
            </view>
          </view>
        </view>
      </view>

      <!-- 圈主助理设置 -->
      <view>
        <text class="text-sm text-muted-foreground mb-2 px-1 block">圈主助理</text>
        <view class="bg-white rounded-xl divide-y divide-border">
          <!-- 开启/关闭 -->
          <view class="flex items-center justify-between p-4">
            <view class="flex items-center gap-3">
              <text class="text-base">🤖</text>
              <view>
                <text class="text-sm text-foreground block">启用圈主助理</text>
                <text class="text-xs text-muted-foreground mt-0.5">AI助理自动回复成员问题</text>
              </view>
            </view>
            <view
              @click="handleToggle('assistantEnabled')"
              :class="['relative w-11 h-6 rounded-full transition-colors', settings.assistantEnabled ? 'bg-primary' : 'bg-[#E8E0D5]']"
            >
              <view :class="['absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform', settings.assistantEnabled ? 'left-6' : 'left-1']" />
            </view>
          </view>

          <template v-if="settings.assistantEnabled">
            <!-- 助理欢迎语 -->
            <view class="flex items-center justify-between p-4" @click="handleEdit('assistantWelcome', settings.assistantWelcome)">
              <text class="text-sm text-foreground">助理欢迎语</text>
              <view class="flex items-center gap-2 text-muted-foreground">
                <text class="text-sm max-w-[120px] truncate">{{ settings.assistantWelcome }}</text>
                <text>›</text>
              </view>
            </view>

            <!-- 知识库管理 -->
            <view class="flex items-center justify-between p-4" @click="goKnowledge">
              <text class="text-sm text-foreground">知识库管理</text>
              <view class="flex items-center gap-2 text-muted-foreground">
                <text class="text-[10px] px-1.5 py-0 bg-background rounded">12篇文档</text>
                <text>›</text>
              </view>
            </view>
          </template>
        </view>
      </view>

      <!-- 搜索可见性 -->
      <view>
        <text class="text-sm text-muted-foreground mb-2 px-1 block">搜索可见性</text>
        <view class="bg-white rounded-xl p-4">
          <view class="flex items-center justify-between">
            <view class="flex items-center gap-3">
              <text class="text-base"></text>
              <view>
                <text class="text-sm text-foreground block">平台搜索中可见</text>
                <text class="text-xs text-muted-foreground mt-0.5">关闭后仅通过链接可访问</text>
              </view>
            </view>
            <view
              @click="handleToggle('searchVisible')"
              :class="['relative w-11 h-6 rounded-full transition-colors', settings.searchVisible ? 'bg-primary' : 'bg-[#E8E0D5]']"
            >
              <view :class="['absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform', settings.searchVisible ? 'left-6' : 'left-1']" />
            </view>
          </view>
        </view>
      </view>

      <!-- 分享有赏 -->
      <view>
        <text class="text-sm text-muted-foreground mb-2 px-1 block">分享有赏</text>
        <view class="bg-white rounded-xl divide-y divide-border">
          <view class="flex items-center justify-between p-4">
            <view class="flex items-center gap-3">
              <text class="text-base">🎁</text>
              <view>
                <text class="text-sm text-foreground block">启用分享有赏</text>
                <text class="text-xs text-muted-foreground mt-0.5">成员邀请新人可获得佣金</text>
              </view>
            </view>
            <view
              @click="handleToggle('shareRewardEnabled')"
              :class="['relative w-11 h-6 rounded-full transition-colors', settings.shareRewardEnabled ? 'bg-primary' : 'bg-[#E8E0D5]']"
            >
              <view :class="['absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform', settings.shareRewardEnabled ? 'left-6' : 'left-1']" />
            </view>
          </view>

          <view v-if="settings.shareRewardEnabled" class="flex items-center justify-between p-4" @click="handleEdit('shareRewardRate', String(settings.shareRewardRate))">
            <text class="text-sm text-foreground">佣金比例</text>
            <view class="flex items-center gap-2 text-muted-foreground">
              <text class="text-sm text-accent font-medium">{{ settings.shareRewardRate }}%</text>
              <text>›</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 危险操作 -->
      <view>
        <text class="text-sm text-danger mb-2 px-1 block">危险操作</text>
        <view class="bg-white rounded-xl divide-y divide-border">
          <view @click="showDangerModal = 'transfer'" class="flex items-center justify-between p-4 w-full">
            <view class="flex items-center gap-3">
              <text class="text-base"></text>
              <view>
                <text class="text-sm text-foreground block">转让圈主</text>
                <text class="text-xs text-muted-foreground mt-0.5">将圈主身份转让给其他成员</text>
              </view>
            </view>
            <text class="text-muted-foreground">›</text>
          </view>

          <view @click="showDangerModal = 'dissolve'" class="flex items-center justify-between p-4 w-full">
            <view class="flex items-center gap-3">
              <text class="text-base">🗑</text>
              <view>
                <text class="text-sm text-danger block">解散圈子</text>
                <text class="text-xs text-muted-foreground mt-0.5">此操作不可逆，请谨慎操作</text>
              </view>
            </view>
            <text class="text-muted-foreground">›</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 类型选择弹窗 -->
    <view v-if="showTypePicker" class="fixed inset-0 z-50 flex items-end justify-center bg-black/60" @click="showTypePicker = false">
      <view class="w-full bg-white rounded-t-2xl" @click.stop>
        <view class="flex items-center justify-between px-4 h-12 border-b border-border">
          <text class="text-sm text-muted-foreground" @click="showTypePicker = false">取消</text>
          <text class="font-medium text-foreground">选择圈子类型</text>
          <view class="w-8" />
        </view>
        <view class="p-4 space-y-2">
          <view v-for="opt in typeOptions" :key="opt.value"
            @click="settings.type = opt.value; showTypePicker = false"
            :class="['p-4 rounded-xl flex items-center justify-between', settings.type === opt.value ? 'bg-primary/5 border border-primary/30' : 'bg-background']"
          >
            <view>
              <text class="text-sm text-foreground font-medium block">{{ opt.label }}</text>
              <text class="text-xs text-muted-foreground">{{ opt.desc }}</text>
            </view>
            <text v-if="settings.type === opt.value" class="text-primary">✓</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 加入方式选择弹窗 -->
    <view v-if="showJoinMethodPicker" class="fixed inset-0 z-50 flex items-end justify-center bg-black/60" @click="showJoinMethodPicker = false">
      <view class="w-full bg-white rounded-t-2xl" @click.stop>
        <view class="flex items-center justify-between px-4 h-12 border-b border-border">
          <text class="text-sm text-muted-foreground" @click="showJoinMethodPicker = false">取消</text>
          <text class="font-medium text-foreground">选择加入方式</text>
          <view class="w-8" />
        </view>
        <view class="p-4 space-y-2">
          <view v-for="opt in joinMethodOptions" :key="opt.value"
            @click="settings.joinMethod = opt.value; showJoinMethodPicker = false"
            :class="['p-4 rounded-xl flex items-center justify-between', settings.joinMethod === opt.value ? 'bg-primary/5 border border-primary/30' : 'bg-background']"
          >
            <view>
              <text class="text-sm text-foreground font-medium block">{{ opt.label }}</text>
              <text class="text-xs text-muted-foreground">{{ opt.desc }}</text>
            </view>
            <text v-if="settings.joinMethod === opt.value" class="text-primary">✓</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 内联编辑弹窗 -->
    <view v-if="editingField && (editingField === 'description' || editingField === 'welcomeMessage' || editingField === 'assistantWelcome' || editingField === 'price' || editingField === 'shareRewardRate' || editingField === 'tags')" class="fixed inset-0 z-50 flex items-end justify-center bg-black/60" @click="editingField = null">
      <view class="w-full bg-white rounded-t-2xl" @click.stop>
        <view class="flex items-center justify-between px-4 h-12 border-b border-border">
          <text class="text-sm text-muted-foreground" @click="editingField = null">取消</text>
          <text class="font-medium text-foreground">
            {{ editingField === 'description' ? '编辑简介' : editingField === 'welcomeMessage' ? '编辑欢迎语' : editingField === 'assistantWelcome' ? '编辑助理欢迎语' : editingField === 'price' ? '编辑价格' : editingField === 'shareRewardRate' ? '编辑佣金比例' : '编辑标签' }}
          </text>
          <text class="text-sm text-primary font-medium" @click="handleSave(editingField)">保存</text>
        </view>
        <view class="p-4">
          <textarea
            v-if="editingField === 'description' || editingField === 'welcomeMessage' || editingField === 'assistantWelcome'"
            v-model="tempValue"
            :placeholder="editingField === 'description' ? '请输入圈子简介' : '请输入欢迎语'"
            rows="4"
            class="w-full px-3 py-2.5 bg-background rounded-lg text-sm resize-none text-foreground"
          />
          <input
            v-else-if="editingField === 'price' || editingField === 'shareRewardRate'"
            v-model="tempValue"
            type="number"
            :placeholder="editingField === 'price' ? '请输入价格' : '请输入佣金比例(%)'"
            class="w-full px-3 py-2.5 bg-background rounded-lg text-sm text-foreground"
          />
          <input
            v-else-if="editingField === 'tags'"
            v-model="tempValue"
            placeholder="用逗号分隔标签"
            class="w-full px-3 py-2.5 bg-background rounded-lg text-sm text-foreground"
          />
        </view>
      </view>
    </view>

    <!-- 危险操作确认弹窗 -->
    <view v-if="showDangerModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <view class="w-full max-w-sm bg-white rounded-2xl overflow-hidden">
        <view class="p-6 text-center">
          <view :class="['w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center', showDangerModal === 'dissolve' ? 'bg-red-500/10' : 'bg-amber-500/10']">
            <text class="text-3xl">{{ showDangerModal === 'dissolve' ? '' : '' }}</text>
          </view>
          <text class="text-lg font-semibold text-foreground block mb-2">
            {{ showDangerModal === 'transfer' ? '确认转让圈主？' : '确认解散圈子？' }}
          </text>
          <text class="text-sm text-muted-foreground block mb-4">
            {{ showDangerModal === 'transfer' ? '转让后你将失去圈主权限，成为普通成员' : '解散后所有内容将被删除，此操作不可撤销' }}
          </text>

          <view class="mb-4">
            <text class="text-xs text-muted-foreground block mb-2">
              请输入「{{ showDangerModal === 'transfer' ? '确认转让' : '确认解散' }}」以继续
            </text>
            <input
              v-model="confirmText"
              :placeholder="showDangerModal === 'transfer' ? '确认转让' : '确认解散'"
              class="w-full px-4 py-2 bg-background rounded-lg border-0 outline-none text-sm text-foreground text-center"
            />
          </view>
        </view>

        <view class="flex border-t border-border">
          <view @click="showDangerModal = null; confirmText = ''" class="flex-1 py-4 text-sm font-medium text-foreground text-center">
            取消
          </view>
          <view
            @click="handleDangerConfirm"
            :class="['flex-1 py-4 text-sm font-medium border-l border-border text-center', canConfirmDanger ? (showDangerModal === 'dissolve' ? 'text-red-500' : 'text-amber-500') : 'text-[#CCC]']"
          >
            确认
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'

interface CircleSettings {
  name: string
  cover: string
  description: string
  tags: string[]
  type: 'free' | 'paid' | 'yearly'
  price: number
  yearlyPrice: number
  joinMethod: 'direct' | 'approval' | 'invite'
  welcomeMessage: string
  postPermission: 'all' | 'admin'
  commentPermission: 'all' | 'admin'
  sharePermission: boolean
  memberListVisible: boolean
  contentProtection: boolean
  assistantEnabled: boolean
  assistantWelcome: string
  searchVisible: boolean
  shareRewardEnabled: boolean
  shareRewardRate: number
}

const settings = reactive<CircleSettings>({
  name: '八字命理研习社',
  cover: '',
  description: '专注八字命理学习与实践的高质量社群',
  tags: ['八字', '命理', '易学', '排盘'],
  type: 'paid',
  price: 199,
  yearlyPrice: 99,
  joinMethod: 'direct',
  welcomeMessage: '欢迎加入八字命理研习社！请先阅读圈规，有问题可以@管理员。',
  postPermission: 'all',
  commentPermission: 'all',
  sharePermission: true,
  memberListVisible: true,
  contentProtection: true,
  assistantEnabled: true,
  assistantWelcome: '你好，我是圈主助理小卜，有任何问题都可以问我~',
  searchVisible: true,
  shareRewardEnabled: true,
  shareRewardRate: 10,
})

const editingField = ref<string | null>(null)
const tempValue = ref('')
const showDangerModal = ref<'transfer' | 'dissolve' | null>(null)
const confirmText = ref('')
const showTypePicker = ref(false)
const showJoinMethodPicker = ref(false)

const typeOptions = [
  { value: 'free' as const, label: '免费', desc: '所有用户可免费加入' },
  { value: 'paid' as const, label: '付费', desc: '用户需支付费用后加入' },
  { value: 'yearly' as const, label: '年费', desc: '用户按年付费加入' },
]

const joinMethodOptions = [
  { value: 'direct' as const, label: '直接加入', desc: '付费或满足条件后直接成为成员' },
  { value: 'approval' as const, label: '需要审批', desc: '用户申请后需管理员审批' },
  { value: 'invite' as const, label: '仅限邀请', desc: '只能通过邀请链接加入' },
]

const canConfirmDanger = computed(() => {
  if (showDangerModal.value === 'transfer') return confirmText.value === '确认转让'
  return confirmText.value === '确认解散'
})

function handleEdit(field: string, value: string) {
  editingField.value = field
  tempValue.value = value
}

function handleSave(field: string) {
  if (field === 'name') {
    settings.name = tempValue.value || settings.name
  } else if (field === 'description') {
    settings.description = tempValue.value || settings.description
  } else if (field === 'welcomeMessage') {
    settings.welcomeMessage = tempValue.value || settings.welcomeMessage
  } else if (field === 'assistantWelcome') {
    settings.assistantWelcome = tempValue.value || settings.assistantWelcome
  } else if (field === 'price') {
    const price = parseInt(tempValue.value)
    if (!isNaN(price) && price > 0) {
      if (settings.type === 'yearly') settings.yearlyPrice = price
      else settings.price = price
    }
  } else if (field === 'shareRewardRate') {
    const rate = parseInt(tempValue.value)
    if (!isNaN(rate) && rate >= 0 && rate <= 100) settings.shareRewardRate = rate
  } else if (field === 'tags') {
    settings.tags = tempValue.value.split(',').map(t => t.trim()).filter(Boolean)
  }
  editingField.value = null
}

function handleToggle(field: keyof CircleSettings) {
  ;(settings as any)[field] = !(settings as any)[field]
}

function togglePostPermission() {
  settings.postPermission = settings.postPermission === 'all' ? 'admin' : 'all'
}

function toggleCommentPermission() {
  settings.commentPermission = settings.commentPermission === 'all' ? 'admin' : 'all'
}

function handleDangerConfirm() {
  if (!canConfirmDanger.value) return
  if (showDangerModal.value === 'dissolve') {
    uni.showToast({ title: '圈子已解散', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 800)
  } else {
    uni.showToast({ title: '已转让圈主', icon: 'success' })
  }
  showDangerModal.value = null
  confirmText.value = ''
}

function changeCover() {
  uni.showToast({ title: '更换封面(Mock)', icon: 'none' })
}

function goKnowledge() {
  uni.navigateTo({ url: '/pages/circles/id-detail/settings/knowledge/index' })
}

function goBack() { uni.navigateBack() }
</script>
