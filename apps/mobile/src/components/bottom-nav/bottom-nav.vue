<script setup lang="ts">
import { onActivated, onDeactivated, onMounted, onUnmounted, ref } from 'vue'
import { onHide, onShow } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { redirectTo } from '@/utils/router'

/** active: home | circle | paipan | discover | profile */
const props = defineProps<{ active: string }>()

const BRAND_RED = '#c41e3a'
const MUTED = '#999999'
const visible = ref(true)
const NAV_ACTIVE_EVENT = 'gx-bottom-nav-active'

// H5 使用 Teleport 挂到 body。主页面之间切换时广播唯一 active，避免路由栈同时残留两套导航。
function syncActive(active: string) {
  visible.value = active === props.active
}
function activateCurrent() {
  uni.$emit(NAV_ACTIVE_EVENT, props.active)
}
onMounted(() => {
  uni.$on(NAV_ACTIVE_EVENT, syncActive)
  activateCurrent()
})
onUnmounted(() => {
  uni.$off(NAV_ACTIVE_EVENT, syncActive)
})
onActivated(activateCurrent)
onDeactivated(() => { visible.value = false })
onShow(activateCurrent)
onHide(() => { visible.value = false })

// 合规收敛：中间 tab 统一用中性「工具」表述（避免「排盘/占卜」敏感表达·路由不变·全端一致）
const paipanLabel = '工具'

const tabs = [
  { id: 'home', label: '首页', icon: 'home', url: '/pages/index/index' },
  { id: 'circle', label: '圈子', icon: 'users', url: '/pages/circles/index' },
  { id: 'paipan', label: paipanLabel, icon: '', url: '/pages/paipan/index' },
  { id: 'discover', label: '发现', icon: 'compass', url: '/pages/discover/index' },
  { id: 'profile', label: '我的', icon: 'user', url: '/pages/profile/index' },
]

const isActive = (id: string) => props.active === id
function go(url: string, id: string) {
  if (isActive(id)) return
  redirectTo(url)
}

function onNavKeydown(event: KeyboardEvent, url: string, id: string) {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  go(url, id)
}
</script>

<template>
  <!-- H5 挂到 body，避免桌面限宽容器的 transform 改变 fixed 定位基准。 -->
  <!-- #ifdef H5 -->
  <Teleport to="body">
  <!-- #endif -->
  <view v-if="visible" class="bottom-nav" role="navigation" aria-label="主导航">
    <view class="nav-inner">
      <view
        v-for="tab in tabs"
        :key="tab.id"
        class="nav-item"
        role="link"
        :aria-label="tab.label"
        :aria-current="isActive(tab.id) ? 'page' : undefined"
        tabindex="0"
        @tap="go(tab.url, tab.id)"
        @keydown="onNavKeydown($event, tab.url, tab.id)"
      >
        <!-- 排盘居中凸起太极按钮 -->
        <view v-if="tab.id === 'paipan'" class="paipan">
          <view class="taiji-wrap" :class="{ 'taiji-breathing-glow': isActive('paipan') }">
            <image lazy-load
              src="/static/taiji.svg"
              class="taiji"
              :class="{ 'taiji-slow-rotate': isActive('paipan') }"
            />
          </view>
          <text class="label bold" :class="isActive('paipan') ? 'on' : 'off'">{{ tab.label }}</text>
        </view>
        <!-- 普通项 -->
        <view v-else class="normal">
          <app-icon
            :name="tab.icon"
            :size="44"
            :color="isActive(tab.id) ? BRAND_RED : MUTED"
            :stroke-width="isActive(tab.id) ? 2.5 : 1.5"
          />
          <text class="label bold" :class="isActive(tab.id) ? 'on' : 'off'">{{ tab.label }}</text>
        </view>
      </view>
    </view>
  </view>
  <!-- #ifdef H5 -->
  </Teleport>
  <!-- #endif -->
</template>

<style scoped lang="scss">
.bottom-nav {
  position: fixed;
  left: 0; right: 0; bottom: 0;
  z-index: 50;
  background: rgba(250, 248, 245, 0.95);
  backdrop-filter: blur(10rpx);
  border-top: 2rpx solid var(--line-nav, #e8e3db);
  box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.05);
  padding-bottom: env(safe-area-inset-bottom);
}
.nav-inner {
  display: flex;
  align-items: center;
  justify-content: space-around;
  height: 112rpx;
  max-width: 800rpx;
  margin: 0 auto;
}
.nav-item { width: 128rpx; height: 100%; display: flex; align-items: center; justify-content: center; }
.normal { display: flex; flex-direction: column; align-items: center; gap: 4rpx; }
.label { font-size: 22rpx; margin-top: 4rpx; }
.label.bold { font-weight: 700; }
.label.on { color: var(--brand, var(--brand)); }
.label.off { color: var(--text-soft, #999); }

.paipan { display: flex; flex-direction: column; align-items: center; margin-top: -40rpx; }
.taiji-wrap {
  position: relative;
  width: 88rpx; height: 88rpx;
  display: flex; align-items: center; justify-content: center;
  border-radius: 50%;
  background: var(--card, #fff);
  box-shadow: 0 4rpx 24rpx rgba(196, 30, 58, 0.25);
}
.taiji { width: 64rpx; height: 64rpx; }

/* H5 桌面壳保持 480px 居中；移动端仍贴合完整视口。 */
/* #ifdef H5 */
@media screen and (min-width: 600px) {
  .bottom-nav {
    left: 50%;
    right: auto;
    width: 480px;
    transform: translateX(-50%);
  }
}
/* #endif */
</style>
