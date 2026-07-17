<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo, toastComingSoon } from '@/utils/router'
import { clearToken, clearRefreshToken, clearUserInfo } from '@/utils/storage'
import { mineApi, type SettingNotifyItem } from '@/lib/mine-data'

/**
 * 应用版本号。与 src/manifest.json 的 versionName 保持一致。
 * uni-app 无现成的编译期常量注入机制（tsconfig 未开 resolveJsonModule，无法直接 import manifest.json），
 * 🔴 发版时改 manifest.json versionName 必须同步改这里。
 */
const APP_VERSION = 'v0.1.0'

const loading = ref(true)
const error = ref('')
const notifyItems = ref<SettingNotifyItem[]>([])

// 账号安全预览值（与 /mine/security 同一接口 getSecurityItems，避免两页口径打架）
const securityScore = ref(0)
const phoneDisplay = ref('')
const payPwdSet = ref(false)

// 通知开关
const notifications = ref<Record<string, boolean>>({})
const notifySaving = ref<Record<string, boolean>>({})
async function toggleNotify(key: string) {
  if (notifySaving.value[key]) return
  const next = !notifications.value[key]
  notifications.value[key] = next
  notifySaving.value[key] = true
  try {
    await mineApi.updateNotifySetting(key, next)
  } catch (e) {
    // 失败回滚，保证开关状态与后端一致
    notifications.value[key] = !next
    uni.showToast({ title: (e as Error)?.message || '设置失败', icon: 'none' })
  } finally {
    notifySaving.value[key] = false
  }
}

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const [data] = await Promise.all([
      mineApi.getNotifySettings(),
      // 安全预览值独立容错：拉取失败不阻塞整页，仅令预览降级为默认值
      loadSecurityPreview(),
    ])
    notifyItems.value = data
    notifications.value = Object.fromEntries(data.map((i) => [i.key, i.value]))
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

/** 读取账号安全预览（安全分/手机尾号/支付密码状态），复用 security 页同一接口 */
async function loadSecurityPreview() {
  try {
    const s = await mineApi.getSecurityItems()
    const doneCount = s.score.filter((i) => i.done).length
    securityScore.value = s.score.length > 0 ? Math.round((doneCount / s.score.length) * 100) : 0
    phoneDisplay.value = s.login.find((i) => i.id === 'phone')?.value || '未绑定'
    payPwdSet.value = s.payment.find((i) => i.id === 'pay-password')?.status === 'set'
  } catch {
    // 诚实降级：接口异常时不展示伪造的安全分/尾号
    phoneDisplay.value = ''
  }
}

function retry() {
  fetchData()
}

onMounted(() => {
  fetchData()
  calcCacheSize()
})

/* —— 隐私开关（谁可以看我的收藏/浏览记录可见）与字体大小已整组下架 ——
 * 原实现是纯本地 ref：开关拨了不落库、字体选了不生效（个保法层面属误导用户）。
 * 后端用户偏好端点上线后恢复，恢复时连同下方模板注释块一起放开。
 * const fontSize = ref('medium')
 * const collectVisible = ref('public')
 * const historyVisible = ref(true)
 */
const cacheCleared = ref(false)

// 弹窗状态
const showLogout = ref(false)
const showClearCache = ref(false)

/* ═══ 清除缓存（真实现·就地实现，不再引用 mine-data 的假容量常量）═══
 * 白名单原则：宁可少清，绝不清掉登录态/用户偏好/用户本地数据。
 * 全项目 storage key 盘点（2026-07-17 grep src 全量 setStorage/getStorage 调用点）：
 * - 登录凭证类：auth_token / auth_refresh_token / userInfo / login:redirect / wx_oa_openid / temp_referrer
 * - 用户偏好类：user_interest_themes(兴趣标记) / classics_reader_pref(阅读器偏好) / mine_app_permissions / 搜索历史
 * - 用户数据类（前缀）：rebu:*(排盘记录/收藏/工具偏好) / draft:*(创作草稿) / live_replay_pos_*(回放进度)
 * 以上全部保留；白名单外的（feed:home:cache / circles:home:cache / discover:home:cache 等列表缓存）才清。 */
const PROTECTED_KEYS = [
  'auth_token', 'auth_refresh_token', 'userInfo', 'login:redirect', 'wx_oa_openid', 'temp_referrer',
  'user_interest_themes', 'classics_reader_pref', 'mine_app_permissions',
  'circle_search_history', 'video_search_history',
]
const PROTECTED_PREFIXES = ['rebu:', 'draft:', 'live_replay_pos_']
function isProtectedKey(k: string) {
  return PROTECTED_KEYS.includes(k) || PROTECTED_PREFIXES.some((p) => k.startsWith(p))
}
function formatKb(kb: number) {
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.max(0, Math.round(kb))} KB`
}
// 本地存储真实占用（uni.getStorageInfoSync().currentSize 单位 KB；H5 端为估算值）
const cacheSizeText = ref('0 KB')
function calcCacheSize() {
  try {
    cacheSizeText.value = formatKb(uni.getStorageInfoSync().currentSize || 0)
  } catch {
    cacheSizeText.value = '0 KB'
  }
}
function handleClearCache() {
  let before = 0
  let keys: string[] = []
  try {
    const info = uni.getStorageInfoSync()
    before = info.currentSize || 0
    keys = info.keys || []
  } catch { /* 读不到存储信息时按空处理，不阻断 */ }
  for (const k of keys) {
    if (!isProtectedKey(k)) {
      try { uni.removeStorageSync(k) } catch { /* 单 key 清除失败跳过 */ }
    }
  }
  let after = 0
  try { after = uni.getStorageInfoSync().currentSize || 0 } catch { /* 忽略 */ }
  const freed = Math.max(0, before - after)
  calcCacheSize()
  showClearCache.value = false
  cacheCleared.value = true
  setTimeout(() => (cacheCleared.value = false), 3000)
  uni.showToast({ title: freed > 0 ? `已清理 ${formatKb(freed)}` : '已清理', icon: 'none' })
}
function handleLogout() {
  showLogout.value = false
  // 退出必须清空本地登录凭证，否则「退出」只是跳页、登录态仍在 → 换账号会串号（安全事故）。
  // 与 request.ts 的 handleUnauthorized 同一范式：清 token + refreshToken + 用户缓存，再 reLaunch 登录页。
  clearToken()
  clearRefreshToken()
  clearUserInfo()
  // SWR 首页 feed 缓存（个性化推荐内容）也必须清：只清 token 不清它 → 换账号登录后
  // 首页会先闪现上一账号的推荐流（跨账号残留）。login 成功侧也清一次，双保险。
  try { uni.removeStorageSync('feed:home:cache') } catch { /* 清缓存失败不阻断退出 */ }
  uni.reLaunch({ url: '/pkg-auth/login/index' })
}

/* —— 选项弹窗通用处理（随字体大小/收藏可见性一起下架，后端用户偏好端点上线后恢复）——
 * type OptionDialogState = { title: string; options: { label: string; value: string }[]; current: string; onPick: (v: string) => void } | null
 * const optionDialog = ref<OptionDialogState>(null)
 * function openFont() {
 *   optionDialog.value = { title: '字体大小', options: settingFontOptions, current: fontSize.value, onPick: (v) => (fontSize.value = v) }
 * }
 * function openCollect() {
 *   optionDialog.value = { title: '谁可以看我的收藏', options: settingCollectOptions, current: collectVisible.value, onPick: (v) => (collectVisible.value = v) }
 * }
 * function pickOption(v: string) {
 *   optionDialog.value?.onPick(v)
 *   optionDialog.value = null
 * }
 */
</script>

<template>
  <view class="page">
    <!-- 顶部导航 -->
    <app-nav-bar title="设置" />

    <view v-if="loading" class="loading"><text>加载中...</text></view>
    <view v-else-if="error" class="error-state">
      <text>{{ error }}</text>
      <view class="retry-btn" @tap="retry">重试</view>
    </view>
    <scroll-view v-else scroll-y class="scroll">
      <!-- 账号安全 -->
      <view class="group">
        <text class="group-title">账号安全</text>
        <view class="card">
          <view class="row" @tap="navigateTo('/mine/security')">
            <AppIcon name="shield" :size="18" color="#C41E3A" />
            <text class="row-label">账号安全中心</text>
            <text class="row-badge">安全分 {{ securityScore }}</text>
            <AppIcon name="chevron-right" :size="16" color="#C9A96E" />
          </view>
          <view class="row" @tap="navigateTo('/mine/change-password')">
            <AppIcon name="lock" :size="18" color="#666" />
            <text class="row-label">修改密码</text>
            <!-- 「上次修改：30天前」系硬编码假文案已删——后端无该字段，只留入口 -->
            <AppIcon name="chevron-right" :size="16" color="#C9A96E" />
          </view>
          <view class="row" @tap="navigateTo('/mine/change-phone')">
            <AppIcon name="phone" :size="18" color="#666" />
            <text class="row-label">修改手机号</text>
            <text v-if="phoneDisplay" class="row-sub">{{ phoneDisplay }}</text>
            <AppIcon name="chevron-right" :size="16" color="#C9A96E" />
          </view>
          <view class="row list-press" @tap="navigateTo('/mine/payment-password')">
            <AppIcon name="credit-card" :size="18" color="#666" />
            <text class="row-label">支付密码</text>
            <text class="row-sub">{{ payPwdSet ? '已设置' : '未设置' }}</text>
            <AppIcon name="chevron-right" :size="16" color="#C9A96E" />
          </view>
          <view class="row list-press" @tap="navigateTo('/mine/delete-account')">
            <AppIcon name="trash-2" :size="18" color="#ef4444" />
            <text class="row-label danger-label">账号注销</text>
          </view>
        </view>
      </view>

      <!-- 通知设置 -->
      <view class="group">
        <text class="group-title">通知设置</text>
        <view class="card">
          <view v-for="item in notifyItems" :key="item.key" class="row">
            <AppIcon :name="item.icon" :size="18" color="#999" />
            <text class="row-label">{{ item.label }}</text>
            <view class="switch" :class="{ on: notifications[item.key] }" @tap="toggleNotify(item.key)">
              <view class="switch-dot" :class="{ on: notifications[item.key] }" />
            </view>
          </view>
        </view>
      </view>

      <!-- 隐私设置 -->
      <view class="group">
        <text class="group-title">隐私设置</text>
        <view class="card">
          <view class="row" @tap="navigateTo('/mine/blacklist')">
            <AppIcon name="user-x" :size="18" color="#666" />
            <text class="row-label">黑名单管理</text>
            <AppIcon name="chevron-right" :size="16" color="#C9A96E" />
          </view>
          <!-- 隐私开关整组下架：原实现为纯本地 ref 不落库（拨了开关实际什么都没改，个保法层面误导用户）。
               后端用户偏好端点上线后恢复以下两行（连同 script 中注释掉的 collectVisible/historyVisible/openCollect）。
          <view class="row" @tap="openCollect">
            <AppIcon name="eye" :size="18" color="#666" />
            <text class="row-label">谁可以看我的收藏</text>
            <text class="row-sub">{{ labelOf(settingCollectOptions, collectVisible) }}</text>
            <AppIcon name="chevron-right" :size="16" color="#C9A96E" />
          </view>
          <view class="row">
            <AppIcon name="eye-off" :size="18" color="#999" />
            <text class="row-label">浏览记录可见</text>
            <view class="switch" :class="{ on: historyVisible }" @tap="historyVisible = !historyVisible">
              <view class="switch-dot" :class="{ on: historyVisible }" />
            </view>
          </view>
          -->
          <view class="row" @tap="toastComingSoon">
            <AppIcon name="history" :size="18" color="#666" />
            <text class="row-label">清除浏览历史</text>
            <AppIcon name="chevron-right" :size="16" color="#C9A96E" />
          </view>
        </view>
      </view>

      <!-- 通用 -->
      <view class="group">
        <text class="group-title">通用</text>
        <view class="card">
          <view class="row" @tap="showClearCache = true">
            <AppIcon name="hard-drive" :size="18" color="#666" />
            <text class="row-label">清除缓存</text>
            <text class="row-sub" :style="{ color: cacheCleared ? '#22c55e' : '#999' }">{{ cacheCleared ? '已清除' : cacheSizeText }}</text>
            <AppIcon name="chevron-right" :size="16" color="#C9A96E" />
          </view>
          <!-- 字体大小下架：原实现选了不生效（本地 ref 无任何应用逻辑）。全局字号阶梯已是平台标准，
               用户级缩放待长辈模式专项，届时恢复以下入口（连同 script 中注释的 fontSize/openFont）。
          <view class="row" @tap="openFont">
            <AppIcon name="type" :size="18" color="#666" />
            <text class="row-label">字体大小</text>
            <text class="row-sub">{{ labelOf(settingFontOptions, fontSize) }}</text>
            <AppIcon name="chevron-right" :size="16" color="#C9A96E" />
          </view>
          -->
        </view>
      </view>

      <!-- 其他 -->
      <view class="group">
        <text class="group-title">其他</text>
        <view class="card">
          <view class="row list-press" @tap="navigateTo('/feedback')">
            <AppIcon name="help-circle" :size="18" color="#666" />
            <text class="row-label">帮助与反馈</text>
            <AppIcon name="chevron-right" :size="16" color="#C9A96E" />
          </view>
          <view class="row list-press" @tap="navigateTo('/about')">
            <AppIcon name="info" :size="18" color="#666" />
            <text class="row-label">关于我们</text>
            <text class="row-sub">{{ APP_VERSION }}</text>
            <AppIcon name="chevron-right" :size="16" color="#C9A96E" />
          </view>
        </view>
      </view>

      <!-- 退出登录 -->
      <view class="logout-wrap">
        <view class="logout-btn" @tap="showLogout = true">
          <text class="logout-text">退出登录</text>
        </view>
      </view>
      <view class="safe-bottom" />
    </scroll-view>

    <!-- 退出登录弹窗 -->
    <view v-if="showLogout" class="mask end mask-fade-in" @tap="showLogout = false">
      <view class="dialog sheet-slide-up" @tap.stop>
        <text class="dialog-title">确认退出登录？</text>
        <text class="dialog-desc">退出后需重新登录才能使用完整功能</text>
        <view class="dialog-actions">
          <view class="dlg-btn ghost btn-press" @tap="showLogout = false"><text class="dlg-btn-text ghost-text">取消</text></view>
          <view class="dlg-btn danger btn-press" @tap="handleLogout"><text class="dlg-btn-text danger-text">退出登录</text></view>
        </view>
      </view>
    </view>

    <!-- 清除缓存弹窗 -->
    <view v-if="showClearCache" class="mask end mask-fade-in" @tap="showClearCache = false">
      <view class="dialog sheet-slide-up" @tap.stop>
        <text class="dialog-title">清除缓存</text>
        <text class="dialog-desc">当前本地存储占用 <text class="hl">{{ cacheSizeText }}</text>，将清理其中的临时缓存</text>
        <text class="dialog-desc sm">不影响登录状态、草稿和排盘记录</text>
        <view class="dialog-actions">
          <view class="dlg-btn ghost btn-press" @tap="showClearCache = false"><text class="dlg-btn-text ghost-text">取消</text></view>
          <view class="dlg-btn primary btn-press" @tap="handleClearCache"><text class="dlg-btn-text primary-text">确认清除</text></view>
        </view>
      </view>
    </view>

    <!-- 选项弹窗（字体/收藏可见性）——随两组假设置一起下架，后端用户偏好端点上线后恢复
    <view v-if="optionDialog" class="mask end mask-fade-in" @tap="optionDialog = null">
      <view class="sheet sheet-slide-up" @tap.stop>
        <text class="sheet-title">{{ optionDialog.title }}</text>
        <view
          v-for="opt in optionDialog.options"
          :key="opt.value"
          class="sheet-opt"
          @tap="pickOption(opt.value)"
        >
          <text class="sheet-opt-text" :class="{ active: optionDialog.current === opt.value }">{{ opt.label }}</text>
          <AppIcon v-if="optionDialog.current === opt.value" name="check" :size="16" color="#C41E3A" />
        </view>
        <view class="sheet-cancel" @tap="optionDialog = null"><text class="sheet-cancel-text">取消</text></view>
      </view>
    </view>
    -->
  </view>
</template>

<style scoped>
.page {
  /* iOS Safari flexbox bug：min-height 容器里的 flex:1 子项(scroll-view)会算出高度0导致内容
     空白(安卓正常)。改用固定 height:100vh，flex:1 才能正确填充剩余高度。 */
  height: 100vh;
  background: #faf8f5;
  display: flex;
  flex-direction: column;
}
.scroll {
  flex: 1;
  min-height: 0;
  height: 0;
}
.group {
  margin-top: 24rpx;
}
.group-title {
  display: block;
  padding: 0 32rpx;
  margin-bottom: 16rpx;
  font-size: 24rpx;
  color: #999;
  font-weight: 500;
}
.card {
  background: #fff;
}
.row {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid #e8e3db;
  transition: background-color 0.15s ease;
}
.row:active {
  background: #faf8f5;
}
.row:last-child {
  border-bottom: none;
}
.row-label {
  flex: 1;
  font-size: 28rpx;
  color: #2c2c2c;
}
.danger-label {
  color: #ef4444;
}
.logout-btn {
  transition: transform 0.12s ease;
}
.logout-btn:active {
  transform: scale(0.98);
}
.sheet-opt {
  transition: background-color 0.15s ease;
}
.sheet-opt:active {
  background: #faf8f5;
}
.row-sub {
  font-size: 24rpx;
  color: #999;
}
.row-badge {
  font-size: 24rpx;
  color: #d97706;
}
.switch {
  position: relative;
  width: 88rpx;
  height: 48rpx;
  border-radius: 999rpx;
  background: #e5e7eb;
  transition: background 0.2s;
}
.switch.on {
  background: var(--brand);
}
.switch-dot {
  position: absolute;
  top: 4rpx;
  left: 4rpx;
  width: 40rpx;
  height: 40rpx;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.15);
  transition: transform 0.2s;
}
.switch-dot.on {
  transform: translateX(40rpx);
}
.logout-wrap {
  padding: 32rpx;
}
.logout-btn {
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx 0;
  text-align: center;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}
.logout-text {
  font-size: 28rpx;
  color: #ef4444;
  font-weight: 500;
}
.safe-bottom {
  height: calc(40rpx + env(safe-area-inset-bottom));
}
.mask {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}
.mask.end {
  align-items: flex-end;
}
.dialog {
  width: 100%;
  background: #fff;
  border-radius: 28rpx 28rpx 0 0;
  padding: 48rpx 40rpx calc(48rpx + env(safe-area-inset-bottom));
}
.dialog-title {
  display: block;
  text-align: center;
  font-size: 32rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.dialog-desc {
  display: block;
  text-align: center;
  font-size: 26rpx;
  color: #999;
  margin-top: 8rpx;
}
.dialog-desc.sm {
  font-size: 22rpx;
}
.hl {
  color: var(--brand);
  font-weight: 500;
}
.dialog-actions {
  display: flex;
  gap: 24rpx;
  margin-top: 40rpx;
}
.dlg-btn {
  flex: 1;
  height: 80rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.dlg-btn.ghost {
  border: 1rpx solid #e8e3db;
}
.dlg-btn.danger {
  background: #ef4444;
}
.dlg-btn.primary {
  background: var(--brand);
}
.dlg-btn-text {
  font-size: 28rpx;
}
.ghost-text {
  color: #666;
}
.danger-text,
.primary-text {
  color: #fff;
  font-weight: 500;
}
.sheet {
  width: 100%;
  background: #fff;
  border-radius: 28rpx 28rpx 0 0;
  overflow: hidden;
  padding-bottom: env(safe-area-inset-bottom);
}
.sheet-title {
  display: block;
  text-align: center;
  font-size: 26rpx;
  color: #999;
  padding: 28rpx 0;
  border-bottom: 1rpx solid #e8e3db;
}
.sheet-opt {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx 48rpx;
  border-bottom: 1rpx solid #e8e3db;
}
.sheet-opt-text {
  font-size: 28rpx;
  color: #2c2c2c;
}
.sheet-opt-text.active {
  color: var(--brand);
  font-weight: 500;
}
.sheet-cancel {
  padding: 32rpx 0;
  text-align: center;
  border-top: 8rpx solid #faf8f5;
}
.sheet-cancel-text {
  font-size: 28rpx;
  color: #999;
}
.loading { flex: 1; display: flex; align-items: center; justify-content: center; padding-top: 200rpx; font-size: 28rpx; color: #8a8178; }
.error-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding-top: 200rpx; gap: 24rpx; }
.error-state text { font-size: 28rpx; color: #8a8178; }
.retry-btn { padding: 16rpx 48rpx; background: var(--brand); color: #fff; border-radius: 12rpx; font-size: 26rpx; }
</style>
