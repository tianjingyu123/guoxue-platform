<script setup lang="ts">
/**
 * 统一评论吸底输入条
 * - 我的头像 + 圆角胶囊输入框「说点什么…」（真 input 直接做成胶囊：点击即 focus 弹键盘，
 *   免去伪输入框→真输入的焦点切换 bug；uni-app input 必须写显式 height，否则真机塌 0 高）
 * - 回复态：条上方「回复 @xx」+ 取消（emit cancel-reply）
 * - 发送只 emit('send', content)，成功/失败由父级处理；暴露 focus()/clear()/setText()
 * - 默认 fixed 吸底 + env(safe-area-inset-bottom)；半屏抽屉等 flex 布局场景传 :fixed="false"
 * - 具名 slot「actions」：右侧动作区（头条式底栏图标排）。无 slot 时行为与旧版完全一致；
 *   有 slot 时隐藏头像让胶囊变窄，图标排与发送按钮互斥切换（输入中显发送，否则显图标）
 */
import { ref, computed, useSlots } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import SmartAvatar from '@/components/common/smart-avatar.vue'
import { getUserInfo } from '@/utils/storage'

interface ReplyTarget {
  id: string
  nickname: string
}
interface Props {
  theme?: 'light' | 'dark'
  replyTo?: ReplyTarget | null
  sending?: boolean
  /** 默认 fixed 吸底；放进抽屉/自管布局时传 false 走静态流 */
  fixed?: boolean
  placeholder?: string
}
const props = withDefaults(defineProps<Props>(), {
  theme: 'light',
  replyTo: null,
  sending: false,
  fixed: true,
  placeholder: '说点什么…',
})

const emit = defineEmits<{
  (e: 'send', content: string): void
  (e: 'cancel-reply'): void
}>()

const isDark = computed(() => props.theme === 'dark')

const text = ref('')
const focusing = ref(false)

const myInfo = getUserInfo<{ nickname?: string; avatar?: string }>()
const myAvatar = myInfo?.avatar || ''
const myName = myInfo?.nickname || '我'

const canSend = computed(() => !!text.value.trim() && !props.sending)

// 右侧动作区 slot（头条式底栏）：有内容时胶囊变窄；输入态（聚焦/有字/发送中）切回发送按钮
const slots = useSlots()
const hasActions = computed(() => !!slots.actions)
const showSend = computed(
  () => !hasActions.value || focusing.value || !!text.value.trim() || props.sending,
)

function onSend() {
  if (!canSend.value) return
  emit('send', text.value.trim())
}

const cancelIconColor = computed(() => (isDark.value ? 'rgba(255,255,255,0.45)' : '#999999'))

defineExpose({
  /** 弹起键盘（回复某人时父级调用） */
  focus: () => { focusing.value = true },
  /** 清空输入（父级乐观发送后调用） */
  clear: () => { text.value = '' },
  /** 回填内容（发送失败还给用户改） */
  setText: (v: string) => { text.value = v },
})
</script>

<template>
  <view class="cib" :class="{ 'cib--dark': isDark, 'cib--fixed': fixed }">
    <view v-if="replyTo" class="cib__reply-bar">
      <text class="cib__reply-txt">回复 @{{ replyTo.nickname }}</text>
      <view class="cib__reply-cancel" @tap="emit('cancel-reply')">
        <app-icon name="x" :size="26" :color="cancelIconColor" />
      </view>
    </view>
    <view class="cib__row">
      <smart-avatar v-if="!hasActions" class="cib__avatar" :src="myAvatar" :name="myName" />
      <input
        class="cib__field"
        v-model="text"
        :focus="focusing"
        :placeholder="replyTo ? `回复 @${replyTo.nickname}…` : placeholder"
        placeholder-class="cib__ph"
        confirm-type="send"
        :disabled="sending"
        @blur="focusing = false"
        @confirm="onSend"
      />
      <view v-if="showSend" class="cib__send" :class="{ 'cib__send--on': canSend }" @tap="onSend">
        <text class="cib__send-txt">{{ sending ? '发送中' : '发送' }}</text>
      </view>
      <!-- 右侧动作区（头条式：点赞/评论/收藏/分享图标排·与发送按钮互斥） -->
      <view v-else class="cib__actions">
        <slot name="actions" />
      </view>
    </view>
  </view>
</template>

<style scoped>
.cib {
  background: rgba(255, 255, 255, 0.98);
  border-top: 1rpx solid #ececec;
  padding: 16rpx 28rpx;
  padding-bottom: calc(16rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
}
.cib--fixed { position: fixed; left: 0; right: 0; bottom: 0; z-index: 30; }

.cib__reply-bar { display: flex; align-items: center; justify-content: space-between; padding: 0 8rpx 12rpx; }
.cib__reply-txt { font-size: 22rpx; color: #999999; }
/* 触控热区：可视 44rpx 图标外扩 padding 至 ≥88rpx */
.cib__reply-cancel { padding: 22rpx; margin: -22rpx; display: flex; align-items: center; justify-content: center; }

.cib__row { display: flex; align-items: center; gap: 16rpx; }
.cib__avatar { width: 60rpx; height: 60rpx; border-radius: 999rpx; flex-shrink: 0; }
/* 🔴 uni-app input 必须写显式 height（只写 padding 真机塌 0 高点不了） */
.cib__field {
  flex: 1; height: 72rpx; padding: 0 28rpx; box-sizing: border-box;
  background: #f4f2ee; border-radius: 999rpx;
  font-size: 26rpx; color: #1f1f1f;
}
.cib__ph { color: #b0aba1; }

/* 右侧动作区：图标排容器（具体图标/热区样式由页面 slot 内容自带） */
.cib__actions { flex-shrink: 0; display: flex; align-items: center; }

.cib__send { flex-shrink: 0; padding: 16rpx 34rpx; border-radius: 999rpx; background: #e5e2dc; transition: background 0.2s; }
.cib__send--on { background: var(--brand, #c41e3a); }
.cib__send-txt { font-size: 26rpx; font-weight: 500; color: #ffffff; }

/* ───── 深色主题（配色对齐 pkg-video/detail cs-input） ───── */
.cib--dark { background: rgba(28, 25, 32, 0.97); border-top-color: rgba(255, 255, 255, 0.1); }
.cib--dark .cib__reply-txt { color: rgba(255, 255, 255, 0.5); }
.cib--dark .cib__field { background: rgba(255, 255, 255, 0.08); color: rgba(255, 255, 255, 0.92); }
.cib--dark .cib__ph { color: rgba(255, 255, 255, 0.35); }
.cib--dark .cib__send { background: rgba(255, 255, 255, 0.12); }
.cib--dark .cib__send--on { background: var(--brand, #c41e3a); }
</style>
