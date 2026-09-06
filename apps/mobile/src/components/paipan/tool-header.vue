<script setup lang="ts">
/**
 * 【排盘工具通用模板】工具页统一顶栏（自 V0 components/common/tool-header.tsx 还原）
 * 白卡底 sticky 顶栏：返回 + 居中衬线标题/副标题 + 右侧标准操作（说明/历史/分享）。
 * 右侧自定义操作用具名 slot「actions」（置于标准操作之前）。
 */
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo, navigateBack } from '@/utils/router'

const props = withDefaults(defineProps<{
  title: string
  subtitle?: string
  /** 返回目标；不传则回退上一页（无历史时回排盘首页） */
  backHref?: string
  /** 保留历史调用参数；私有预览仅在父级提供受控分享处理器时显示按钮。 */
  share?: boolean
  /** 分享标题（内置分享时使用） */
  shareTitle?: string
  /** 历史记录链接，传入才显示历史按钮 */
  historyHref?: string
  /** 显示使用说明按钮（点击 emit help） */
  help?: boolean
}>(), {})

const emit = defineEmits<{
  /** 自定义返回（如重置内部状态）；监听后覆盖默认返回逻辑 */
  (e: 'back'): void
  /** 自定义分享；监听后覆盖内置分享 */
  (e: 'share'): void
  (e: 'help'): void
}>()

// defineEmits 声明的事件不会进入 attrs，须从当前组件 VNode 读取父级监听器。
import { getCurrentInstance } from 'vue'
const instance = getCurrentInstance()
const hasCustomBack = () => !!instance?.vnode.props?.onBack
const hasCustomShare = () => !!instance?.vnode.props?.onShare

function handleBack() {
  if (hasCustomBack()) { emit('back'); return }
  if (props.backHref) { navigateTo(props.backHref); return }
  const pages = getCurrentPages()
  if (pages.length > 1) navigateBack()
  else navigateTo('/paipan')
}

function handleShare() {
  if (hasCustomShare()) { emit('share'); return }
  // 默认当前地址可能携带生辰/私有工具参数，不得绕过父页面资格核验进行分享。
  uni.showToast({ title: '当前工具暂不支持对外分享', icon: 'none' })
}
</script>

<template>
  <view class="th">
    <view class="th-inner">
      <view class="th-side th-left">
        <view class="th-btn" @tap="handleBack">
          <app-icon name="chevron-left" :size="40" color="var(--text-ink)" />
        </view>
      </view>
      <view class="th-center">
        <text class="th-title">{{ title }}</text>
        <text v-if="subtitle" class="th-subtitle">{{ subtitle }}</text>
      </view>
      <view class="th-side th-right">
        <slot name="actions" />
        <view v-if="help" class="th-btn" @tap="emit('help')">
          <app-icon name="info" :size="36" color="var(--text-ink)" />
        </view>
        <view v-if="historyHref" class="th-btn" @tap="navigateTo(historyHref!)">
          <app-icon name="history" :size="36" color="var(--text-ink)" />
        </view>
        <view v-if="hasCustomShare()" class="th-btn" @tap="handleShare">
          <app-icon name="share-2" :size="36" color="var(--text-ink)" />
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.th {
  position: sticky;
  top: 0;
  z-index: 50;
  background: var(--card);
  border-bottom: 1rpx solid var(--line);
  padding-top: var(--status-bar-height, 0);
}
.th-inner {
  height: 96rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 0 16rpx;
}
.th-side { display: flex; align-items: center; min-width: 80rpx; }
.th-left { justify-content: flex-start; }
.th-right { justify-content: flex-end; gap: 4rpx; }
.th-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  overflow: hidden;
}
.th-title {
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
  font-size: 32rpx;
  font-weight: 700;
  line-height: 1.25;
  color: var(--text-ink);
  max-width: 420rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.th-subtitle {
  font-size: 22rpx;
  color: var(--text-soft);
  max-width: 420rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.th-btn {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  &:active { background: rgba(0, 0, 0, 0.05); }
}
</style>
