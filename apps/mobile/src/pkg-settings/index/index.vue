<template>
  <view class="page">
    <app-nav-bar title="设置" :back-icon="'arrow-left'" :back-size="40" :title-size="32" :title-weight="600" :bar-height="112" />

    <scroll-view scroll-y class="scroll">
      <view class="content">
        <!-- 账号与安全 -->
        <view class="card">
          <view class="card-hd"><text class="card-hd-text">账号与安全</text></view>
          <view class="rows">
            <view class="row" @tap="go('/settings/phone')">
              <view class="row-l">
                <view class="row-ic"><app-icon name="smartphone" :size="16" color="#8a8278" /></view>
                <text class="row-label">手机号</text>
              </view>
              <view class="row-r">
                <text class="row-val">138****8888</text>
                <app-icon name="chevron-right" :size="16" color="#c9c2b8" />
              </view>
            </view>
            <view class="row" @tap="go('/settings/password')">
              <view class="row-l">
                <view class="row-ic"><app-icon name="lock" :size="16" color="#8a8278" /></view>
                <text class="row-label">登录密码</text>
              </view>
              <view class="row-r">
                <text class="row-val">修改</text>
                <app-icon name="chevron-right" :size="16" color="#c9c2b8" />
              </view>
            </view>
            <view class="row">
              <view class="row-l">
                <view class="row-ic"><app-icon name="shield" :size="16" color="#8a8278" /></view>
                <text class="row-label">二次验证</text>
              </view>
              <switch :checked="twoFactor" color="#c41e3a" style="transform:scale(0.8)" @change="(e: any) => twoFactor = e.detail.value" />
            </view>
          </view>
        </view>

        <!-- 隐私设置 -->
        <view class="card">
          <view class="card-hd"><text class="card-hd-text">隐私设置</text></view>
          <view class="rows">
            <view class="row">
              <view class="row-l">
                <view class="row-ic"><app-icon name="eye" :size="16" color="#8a8278" /></view>
                <text class="row-label">公开展示我的收藏</text>
              </view>
              <switch :checked="showFavorites" color="#c41e3a" style="transform:scale(0.8)" @change="(e: any) => showFavorites = e.detail.value" />
            </view>
            <view class="row">
              <view class="row-l">
                <view class="row-ic"><app-icon name="history" :size="16" color="#8a8278" /></view>
                <text class="row-label">记录浏览历史</text>
              </view>
              <switch :checked="recordHistory" color="#c41e3a" style="transform:scale(0.8)" @change="(e: any) => recordHistory = e.detail.value" />
            </view>
          </view>
        </view>

        <!-- 通知设置 -->
        <view class="card">
          <view class="card-hd"><text class="card-hd-text">通知设置</text></view>
          <view class="rows">
            <view class="row">
              <view class="row-l">
                <view class="row-ic"><app-icon name="bell" :size="16" color="#8a8278" /></view>
                <text class="row-label">推送通知</text>
              </view>
              <switch :checked="pushEnabled" color="#c41e3a" style="transform:scale(0.8)" @change="(e: any) => pushEnabled = e.detail.value" />
            </view>
            <view class="row" @tap="openSelect('消息免打扰时段', ['关闭','22:00-08:00','23:00-07:00','00:00-08:00'], quietHours, v => quietHours = v)">
              <view class="row-l">
                <view class="row-ic"><app-icon name="moon" :size="16" color="#8a8278" /></view>
                <text class="row-label">消息免打扰时段</text>
              </view>
              <view class="row-r">
                <text class="row-val">{{ quietHours }}</text>
                <app-icon name="chevron-right" :size="16" color="#c9c2b8" />
              </view>
            </view>
          </view>
        </view>

        <!-- 外观主题 -->
        <view class="card">
          <view class="card-hd"><text class="card-hd-text">外观主题</text></view>
          <view class="theme-wrap">
            <view class="theme-seg">
              <view
                v-for="opt in themeOptions"
                :key="opt.value"
                class="theme-opt"
                :class="{ active: theme === opt.value }"
                @tap="setTheme(opt.value)"
              >
                <app-icon :name="opt.icon" :size="16" :color="theme === opt.value ? '#c41e3a' : '#8a8278'" />
                <text class="theme-label" :class="{ active: theme === opt.value }">{{ opt.label }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 通用设置 -->
        <view class="card">
          <view class="card-hd"><text class="card-hd-text">通用设置</text></view>
          <view class="rows">
            <view class="row" @tap="openSelect('默认阅读背景', ['宣纸色','护眼黄','夜间黑','纯白'], readingBg, v => readingBg = v)">
              <view class="row-l">
                <view class="row-ic"><app-icon name="eye" :size="16" color="#8a8278" /></view>
                <text class="row-label">默认阅读背景</text>
              </view>
              <view class="row-r">
                <text class="row-val">{{ readingBg }}</text>
                <app-icon name="chevron-right" :size="16" color="#c9c2b8" />
              </view>
            </view>
            <view class="row" @tap="openSelect('字体大小', ['小','中','大'], fontSize, v => fontSize = v)">
              <view class="row-l">
                <view class="row-ic"><app-icon name="type" :size="16" color="#8a8278" /></view>
                <text class="row-label">字体大小</text>
              </view>
              <view class="row-r">
                <text class="row-val">{{ fontSize }}</text>
                <app-icon name="chevron-right" :size="16" color="#c9c2b8" />
              </view>
            </view>
            <view class="row" @tap="openSelect('视频自动播放', ['仅Wi-Fi','始终','关闭'], autoPlay, v => autoPlay = v)">
              <view class="row-l">
                <view class="row-ic"><app-icon name="wifi" :size="16" color="#8a8278" /></view>
                <text class="row-label">视频自动播放</text>
              </view>
              <view class="row-r">
                <text class="row-val">{{ autoPlay }}</text>
                <app-icon name="chevron-right" :size="16" color="#c9c2b8" />
              </view>
            </view>
          </view>
        </view>

        <!-- 缓存管理 -->
        <view class="card">
          <view class="card-hd"><text class="card-hd-text">缓存管理</text></view>
          <view class="cache-row">
            <view class="row-l">
              <view class="row-ic"><app-icon name="trash-2" :size="16" color="#8a8278" /></view>
              <view>
                <text class="row-label">缓存数据</text>
                <text class="cache-size">{{ isClearing ? '清理中...' : cacheSize }}</text>
              </view>
            </view>
            <view class="cache-btn" :class="{ disabled: isClearing }" @tap="clearCache">
              <text class="cache-btn-text">{{ isClearing ? '清理中' : '清理缓存' }}</text>
            </view>
          </view>
        </view>

        <!-- 关于我们 -->
        <view class="card">
          <view class="card-hd"><text class="card-hd-text">关于我们</text></view>
          <view class="rows">
            <view class="row" @tap="go('/terms/service')">
              <view class="row-l">
                <view class="row-ic"><app-icon name="file-text" :size="16" color="#8a8278" /></view>
                <text class="row-label">用户协议</text>
              </view>
              <app-icon name="chevron-right" :size="16" color="#c9c2b8" />
            </view>
            <view class="row" @tap="go('/policy/privacy')">
              <view class="row-l">
                <view class="row-ic"><app-icon name="shield" :size="16" color="#8a8278" /></view>
                <text class="row-label">隐私政策</text>
              </view>
              <app-icon name="chevron-right" :size="16" color="#c9c2b8" />
            </view>
            <view class="row">
              <view class="row-l">
                <view class="row-ic"><app-icon name="info" :size="16" color="#8a8278" /></view>
                <text class="row-label">版本号</text>
              </view>
              <text class="row-val">v1.0.0</text>
            </view>
          </view>
        </view>

        <!-- 退出登录 -->
        <view class="logout-btn" @tap="showLogout = true">
          <text class="logout-text">退出登录</text>
        </view>
      </view>
    </scroll-view>

    <!-- 选择弹窗 -->
    <view v-if="selectModal" class="mask mask-bottom" @tap="selectModal = null">
      <view class="sheet" @tap.stop>
        <view class="sheet-hd"><text class="sheet-title">{{ selectModal.title }}</text></view>
        <view class="sheet-body">
          <view
            v-for="opt in selectModal.options"
            :key="opt"
            class="sheet-opt"
            :class="{ active: opt === selectModal.current }"
            @tap="chooseOption(opt)"
          >
            <text class="sheet-opt-text" :class="{ active: opt === selectModal.current }">{{ opt }}</text>
            <app-icon v-if="opt === selectModal.current" name="check" :size="16" color="#c41e3a" />
          </view>
        </view>
        <view class="sheet-ft">
          <view class="sheet-cancel" @tap="selectModal = null"><text class="sheet-cancel-text">取消</text></view>
        </view>
      </view>
    </view>

    <!-- 退出确认 -->
    <view v-if="showLogout" class="mask mask-center" @tap="showLogout = false">
      <view class="dialog" @tap.stop>
        <view class="dialog-body">
          <text class="dialog-title">确认退出登录？</text>
          <text class="dialog-desc">退出后将需要重新登录才能使用完整功能</text>
        </view>
        <view class="dialog-actions">
          <view class="dialog-btn" @tap="showLogout = false"><text class="dialog-btn-text">取消</text></view>
          <view class="dialog-btn" @tap="handleLogout"><text class="dialog-btn-text primary">确认退出</text></view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { navigateTo } from '@/utils/router'

const twoFactor = ref(false)
const showFavorites = ref(true)
const recordHistory = ref(true)
const pushEnabled = ref(true)
const quietHours = ref('22:00-08:00')
const readingBg = ref('宣纸色')
const fontSize = ref('中')
const autoPlay = ref('仅Wi-Fi')
const cacheSize = ref('128.5MB')
const isClearing = ref(false)
const showLogout = ref(false)
const theme = ref('light')

const themeOptions = [
  { value: 'light', label: '浅色', icon: 'sun' },
  { value: 'dark', label: '深色', icon: 'moon' },
  { value: 'system', label: '跟随系统', icon: 'monitor' },
]

type SelectModal = { title: string; options: string[]; current: string; onSelect: (v: string) => void }
const selectModal = ref<SelectModal | null>(null)

function go(path: string) {
  navigateTo(path)
}
function setTheme(v: string) {
  theme.value = v
}
function openSelect(title: string, options: string[], current: string, onSelect: (v: string) => void) {
  selectModal.value = { title, options, current, onSelect }
}
function chooseOption(opt: string) {
  selectModal.value?.onSelect(opt)
  selectModal.value = null
}
function clearCache() {
  if (isClearing.value) return
  isClearing.value = true
  setTimeout(() => { isClearing.value = false }, 1500)
}
function handleLogout() {
  showLogout.value = false
}
</script>

<style scoped>
.page { min-height: 100vh; background: #faf8f5; display: flex; flex-direction: column; }
.scroll { flex: 1; height: 0; }
.content { padding: 24rpx; padding-bottom: 160rpx; }

.card { background: #ffffff; border-radius: 24rpx; overflow: hidden; margin-bottom: 24rpx; }
.card-hd { padding: 20rpx 28rpx; border-bottom: 1rpx solid #f0ece4; }
.card-hd-text { font-size: 22rpx; color: #a39a8c; font-weight: 500; }
.rows { display: flex; flex-direction: column; }

.row { display: flex; align-items: center; justify-content: space-between; padding: 26rpx 28rpx; border-bottom: 1rpx solid #f5f1ea; }
.row:last-child { border-bottom: none; }
.row-l { display: flex; align-items: center; gap: 22rpx; }
.row-ic { width: 56rpx; height: 56rpx; border-radius: 14rpx; background: #f5f1ea; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.row-label { font-size: 28rpx; color: #2c2c2c; }
.row-r { display: flex; align-items: center; gap: 10rpx; }
.row-val { font-size: 26rpx; color: #a39a8c; }

.theme-wrap { padding: 28rpx; }
.theme-seg { display: flex; align-items: center; gap: 8rpx; padding: 8rpx; border-radius: 18rpx; background: #f5f1ea; }
.theme-opt { flex: 1; display: flex; align-items: center; justify-content: center; gap: 10rpx; padding: 18rpx 0; border-radius: 14rpx; }
.theme-opt.active { background: #ffffff; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.06); }
.theme-label { font-size: 26rpx; font-weight: 500; color: #8a8278; }
.theme-label.active { color: #c41e3a; }

.cache-row { display: flex; align-items: center; justify-content: space-between; padding: 28rpx; }
.cache-size { display: block; font-size: 22rpx; color: #a39a8c; margin-top: 4rpx; }
.cache-btn { padding: 12rpx 24rpx; border-radius: 14rpx; background: rgba(196,30,58,0.1); }
.cache-btn.disabled { background: #f0ece4; }
.cache-btn-text { font-size: 22rpx; font-weight: 500; color: #c41e3a; }
.cache-btn.disabled .cache-btn-text { color: #a39a8c; }

.logout-btn { background: #ffffff; border-radius: 20rpx; padding: 28rpx; display: flex; align-items: center; justify-content: center; }
.logout-text { font-size: 28rpx; font-weight: 500; color: #c41e3a; }

.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 100; display: flex; }
.mask-bottom { align-items: flex-end; justify-content: center; }
.mask-center { align-items: center; justify-content: center; padding: 32rpx; }

.sheet { width: 100%; background: #ffffff; border-radius: 28rpx 28rpx 0 0; overflow: hidden; }
.sheet-hd { padding: 32rpx; border-bottom: 1rpx solid #f0ece4; }
.sheet-title { font-size: 30rpx; font-weight: 600; color: #2c2c2c; text-align: center; display: block; }
.sheet-body { padding: 12rpx 0; }
.sheet-opt { display: flex; align-items: center; justify-content: space-between; padding: 28rpx 32rpx; }
.sheet-opt.active { background: rgba(196,30,58,0.05); }
.sheet-opt-text { font-size: 28rpx; color: #2c2c2c; }
.sheet-opt-text.active { color: #c41e3a; }
.sheet-ft { padding: 24rpx 32rpx; border-top: 1rpx solid #f0ece4; }
.sheet-cancel { padding: 24rpx; border-radius: 18rpx; background: #f5f1ea; display: flex; align-items: center; justify-content: center; }
.sheet-cancel-text { font-size: 28rpx; color: #8a8278; }

.dialog { width: 560rpx; background: #ffffff; border-radius: 28rpx; overflow: hidden; }
.dialog-body { padding: 48rpx 40rpx; display: flex; flex-direction: column; align-items: center; gap: 16rpx; }
.dialog-title { font-size: 32rpx; font-weight: 600; color: #2c2c2c; }
.dialog-desc { font-size: 26rpx; color: #a39a8c; text-align: center; }
.dialog-actions { display: flex; border-top: 1rpx solid #f0ece4; }
.dialog-btn { flex: 1; padding: 28rpx; display: flex; align-items: center; justify-content: center; }
.dialog-btn:first-child { border-right: 1rpx solid #f0ece4; }
.dialog-btn-text { font-size: 28rpx; font-weight: 500; color: #2c2c2c; }
.dialog-btn-text.primary { color: #c41e3a; }
</style>
