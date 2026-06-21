<script setup lang="ts">
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { toastComingSoon } from '@/utils/router'
import { appPermissions, type AppPermission, type PermissionStatus } from '@/lib/mine-data'

const permissions = ref<AppPermission[]>(appPermissions.map((p) => ({ ...p })))

const selected = ref<AppPermission | null>(null)
const showAuthSheet = ref(false)
const showAuthorizedDialog = ref(false)

const authorizedSet: PermissionStatus[] = ['authorized', 'always', 'while_using']

const authorizedCount = computed(
  () => permissions.value.filter((p) => authorizedSet.includes(p.status)).length,
)
const summaryAvatars = computed(() =>
  permissions.value.filter((p) => authorizedSet.includes(p.status)).slice(0, 4),
)

function statusText(s: PermissionStatus) {
  return { authorized: '已授权', always: '始终允许', while_using: '使用时允许', denied: '已拒绝', not_determined: '未设置' }[s]
}
function isAuthorized(s: PermissionStatus) {
  return authorizedSet.includes(s)
}

function onRowTap(p: AppPermission) {
  selected.value = p
  if (p.status === 'denied' || p.status === 'not_determined') {
    showAuthSheet.value = true
  } else {
    showAuthorizedDialog.value = true
  }
}

function authorize(type: 'always' | 'while_using' | 'authorized' | 'deny') {
  if (!selected.value) return
  const id = selected.value.id
  permissions.value = permissions.value.map((p) =>
    p.id === id ? { ...p, status: type === 'deny' ? 'denied' : type } : p,
  )
  showAuthSheet.value = false
  selected.value = null
}
</script>

<template>
  <view class="page">
    <app-nav-bar
      title="隐私授权管理"
      :back-size="40"
    />

    <scroll-view
      scroll-y
      class="scroll"
    >
      <!-- 隐私保护说明 -->
      <view class="banner">
        <view class="banner-icon">
          <AppIcon
            name="shield"
            :size="20"
            color="#C41E3A"
          />
        </view>
        <view class="banner-body">
          <text class="banner-title">
            隐私保护说明
          </text>
          <text class="banner-desc">
            我们重视您的隐私。以下权限仅在您主动使用相关功能时请求，您可以随时在此管理授权状态。
          </text>
        </view>
      </view>

      <!-- 授权概览 -->
      <view class="summary">
        <view class="summary-left">
          <text class="summary-label">
            已授权权限
          </text>
          <text class="summary-num">
            {{ authorizedCount }}<text class="summary-total">
              /{{ permissions.length }}
            </text>
          </text>
        </view>
        <view class="summary-avatars">
          <view
            v-for="p in summaryAvatars"
            :key="p.id"
            class="summary-avatar"
          >
            <AppIcon
              :name="p.icon"
              :size="18"
              color="#16a34a"
            />
          </view>
        </view>
      </view>

      <!-- 权限列表 -->
      <view class="card">
        <view class="card-head">
          <text class="card-head-title">
            权限列表
          </text>
        </view>
        <view
          v-for="p in permissions"
          :key="p.id"
          class="row"
          @tap="onRowTap(p)"
        >
          <view
            class="row-icon"
            :class="isAuthorized(p.status) ? 'icon-ok' : p.status === 'denied' ? 'icon-no' : 'icon-idle'"
          >
            <AppIcon
              :name="p.icon"
              :size="20"
              :color="isAuthorized(p.status) ? '#16a34a' : p.status === 'denied' ? '#ef4444' : '#9b948a'"
            />
          </view>
          <view class="row-body">
            <view class="row-name-line">
              <text class="row-name">
                {{ p.name }}
              </text>
              <text
                v-if="p.required"
                class="row-required"
              >
                必需
              </text>
            </view>
            <text class="row-desc">
              {{ p.description }}
            </text>
          </view>
          <view class="row-right">
            <text
              class="status-tag"
              :class="isAuthorized(p.status) ? 'tag-ok' : p.status === 'denied' ? 'tag-no' : 'tag-idle'"
            >
              {{ statusText(p.status) }}
            </text>
            <AppIcon
              name="chevron-right"
              :size="16"
              color="#C9A96E"
            />
          </view>
        </view>
      </view>

      <!-- 温馨提示 -->
      <view class="tips">
        <AppIcon
          name="info"
          :size="18"
          color="#C9A96E"
        />
        <view class="tips-body">
          <text class="tips-title">
            温馨提示
          </text>
          <text class="tips-item">
            · 拒绝授权不会影响基础功能使用
          </text>
          <text class="tips-item">
            · 部分功能需要对应权限才能正常工作
          </text>
          <text class="tips-item">
            · 您可以随时在系统设置中修改权限
          </text>
        </view>
      </view>

      <!-- 前往系统设置 -->
      <view
        class="card single"
        @tap="toastComingSoon"
      >
        <view class="row">
          <view class="row-icon icon-idle">
            <AppIcon
              name="settings"
              :size="20"
              color="#9b948a"
            />
          </view>
          <text class="row-name flex1">
            前往系统设置
          </text>
          <AppIcon
            name="chevron-right"
            :size="16"
            color="#C9A96E"
          />
        </view>
      </view>

      <view class="safe-bottom" />
    </scroll-view>

    <!-- 授权底部弹窗 -->
    <view
      v-if="showAuthSheet && selected"
      class="mask mask-fade-in"
      @tap="showAuthSheet = false"
    >
      <view
        class="sheet sheet-slide-up"
        @tap.stop
      >
        <view class="sheet-icon">
          <AppIcon
            :name="selected.icon"
            :size="28"
            color="#C41E3A"
          />
        </view>
        <text class="sheet-title">
          允许访问{{ selected.name }}？
        </text>
        <text class="sheet-purpose">
          {{ selected.purpose }}
        </text>

        <view class="promise">
          <AppIcon
            name="check-circle"
            :size="18"
            color="#16a34a"
          />
          <view class="promise-body">
            <text class="promise-title">
              数据安全承诺
            </text>
            <text class="promise-desc">
              我们仅在您使用相关功能时访问此权限，不会在后台收集或上传您的数据。
            </text>
          </view>
        </view>

        <view
          v-if="selected.degradedFeature"
          class="warn"
        >
          <AppIcon
            name="alert-circle"
            :size="16"
            color="#d97706"
          />
          <text class="warn-text">
            如果拒绝授权，{{ selected.degradedFeature }}
          </text>
        </view>

        <template v-if="selected.id === 'location'">
          <view
            class="btn-primary"
            @tap="authorize('always')"
          >
            <text class="btn-primary-text">
              始终允许
            </text>
          </view>
          <view
            class="btn-soft"
            @tap="authorize('while_using')"
          >
            <text class="btn-soft-text">
              仅在使用应用期间允许
            </text>
          </view>
        </template>
        <template v-else>
          <view
            class="btn-primary"
            @tap="authorize('authorized')"
          >
            <text class="btn-primary-text">
              允许
            </text>
          </view>
        </template>
        <view
          class="btn-text"
          @tap="authorize('deny')"
        >
          <text class="btn-text-label">
            不允许
          </text>
        </view>
      </view>
    </view>

    <!-- 已授权提示弹窗 -->
    <view
      v-if="showAuthorizedDialog && selected"
      class="mask center mask-fade-in"
      @tap="showAuthorizedDialog = false"
    >
      <view
        class="dialog dialog-pop-in"
        @tap.stop
      >
        <view class="dialog-icon">
          <AppIcon
            name="check-circle"
            :size="28"
            color="#16a34a"
          />
        </view>
        <text class="dialog-title">
          已授权 {{ selected.name }}
        </text>
        <text class="dialog-desc">
          如需修改权限状态，请前往系统设置中的应用权限管理进行修改。
        </text>
        <view class="dialog-actions">
          <view
            class="dialog-btn ghost"
            @tap="showAuthorizedDialog = false"
          >
            <text class="dialog-btn-text">
              取消
            </text>
          </view>
          <view
            class="dialog-btn solid"
            @tap="showAuthorizedDialog = false; toastComingSoon()"
          >
            <text class="dialog-btn-text solid-text">
              前往设置
            </text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page { min-height: 100vh; background: #FAF8F5; display: flex; flex-direction: column; }
.scroll { flex: 1; padding: 24rpx; box-sizing: border-box; }

.banner { display: flex; gap: 20rpx; background: #FBEDEF; border-radius: 24rpx; padding: 28rpx; margin-bottom: 24rpx; }
.banner-icon { width: 72rpx; height: 72rpx; border-radius: 50%; background: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.banner-body { flex: 1; display: flex; flex-direction: column; gap: 8rpx; }
.banner-title { font-size: 28rpx; font-weight: 600; color: #2C2C2C; }
.banner-desc { font-size: 24rpx; color: #8a8178; line-height: 1.6; }

.summary { background: #fff; border-radius: 24rpx; padding: 28rpx; margin-bottom: 24rpx; display: flex; align-items: center; justify-content: space-between; }
.summary-left { display: flex; flex-direction: column; gap: 6rpx; }
.summary-label { font-size: 24rpx; color: #8a8178; }
.summary-num { font-size: 44rpx; font-weight: 700; color: #2C2C2C; }
.summary-total { font-size: 26rpx; font-weight: 400; color: #b8b0a4; }
.summary-avatars { display: flex; }
.summary-avatar { width: 64rpx; height: 64rpx; border-radius: 50%; background: #E7F6EC; display: flex; align-items: center; justify-content: center; border: 4rpx solid #fff; margin-left: -16rpx; }

.card { background: #fff; border-radius: 24rpx; overflow: hidden; margin-bottom: 24rpx; }
.card.single { padding: 0; }
.card-head { padding: 28rpx; border-bottom: 1rpx solid #F2ECE1; }
.card-head-title { font-size: 28rpx; font-weight: 600; color: #2C2C2C; }
.row { display: flex; align-items: center; gap: 20rpx; padding: 24rpx 28rpx; border-bottom: 1rpx solid #F6F1E8; }
.row:last-child { border-bottom: none; }
.row-icon { width: 80rpx; height: 80rpx; border-radius: 20rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.icon-ok { background: #E7F6EC; }
.icon-no { background: #FCEBEB; }
.icon-idle { background: #F2ECE1; }
.row-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6rpx; }
.row-name-line { display: flex; align-items: center; gap: 12rpx; }
.row-name { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.row-name.flex1 { flex: 1; }
.row-required { font-size: 20rpx; color: #ef4444; background: #FCEBEB; padding: 2rpx 10rpx; border-radius: 8rpx; }
.row-desc { font-size: 24rpx; color: #8a8178; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.row-right { display: flex; align-items: center; gap: 12rpx; flex-shrink: 0; }
.status-tag { font-size: 22rpx; padding: 6rpx 16rpx; border-radius: 999rpx; }
.tag-ok { color: #16a34a; background: #E7F6EC; }
.tag-no { color: #ef4444; background: #FCEBEB; }
.tag-idle { color: #8a8178; background: #F2ECE1; }

.tips { display: flex; gap: 16rpx; background: #FBF4E6; border-radius: 24rpx; padding: 28rpx; margin-bottom: 24rpx; }
.tips-body { flex: 1; display: flex; flex-direction: column; gap: 8rpx; }
.tips-title { font-size: 26rpx; font-weight: 600; color: #8a6d3b; }
.tips-item { font-size: 24rpx; color: #a98a52; line-height: 1.5; }

.safe-bottom { height: 40rpx; }

.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 50; display: flex; align-items: flex-end; }
.mask.center { align-items: center; justify-content: center; padding: 0 48rpx; }
.sheet { width: 100%; background: #fff; border-radius: 40rpx 40rpx 0 0; padding: 48rpx 40rpx calc(40rpx + env(safe-area-inset-bottom)); box-sizing: border-box; }
.sheet-icon { width: 112rpx; height: 112rpx; border-radius: 28rpx; background: #FBEDEF; display: flex; align-items: center; justify-content: center; margin: 0 auto 28rpx; }
.sheet-title { display: block; font-size: 34rpx; font-weight: 700; color: #2C2C2C; text-align: center; margin-bottom: 12rpx; }
.sheet-purpose { display: block; font-size: 26rpx; color: #8a8178; text-align: center; line-height: 1.6; margin-bottom: 28rpx; }
.promise { display: flex; gap: 16rpx; background: #F6F1E8; border-radius: 20rpx; padding: 24rpx; margin-bottom: 24rpx; }
.promise-body { flex: 1; display: flex; flex-direction: column; gap: 6rpx; }
.promise-title { font-size: 26rpx; font-weight: 500; color: #2C2C2C; }
.promise-desc { font-size: 24rpx; color: #8a8178; line-height: 1.6; }
.warn { display: flex; gap: 12rpx; background: #FBF4E6; border-radius: 16rpx; padding: 18rpx 24rpx; margin-bottom: 24rpx; align-items: flex-start; }
.warn-text { flex: 1; font-size: 24rpx; color: #a98a52; line-height: 1.5; }
.btn-primary { height: 88rpx; background: #C41E3A; border-radius: 20rpx; display: flex; align-items: center; justify-content: center; margin-bottom: 20rpx; }
.btn-primary-text { font-size: 30rpx; font-weight: 600; color: #fff; }
.btn-soft { height: 88rpx; background: #FBEDEF; border-radius: 20rpx; display: flex; align-items: center; justify-content: center; margin-bottom: 20rpx; }
.btn-soft-text { font-size: 30rpx; font-weight: 600; color: #C41E3A; }
.btn-text { height: 88rpx; display: flex; align-items: center; justify-content: center; }
.btn-text-label { font-size: 30rpx; color: #8a8178; }

.dialog { width: 100%; max-width: 560rpx; background: #fff; border-radius: 28rpx; padding: 48rpx 40rpx 32rpx; box-sizing: border-box; }
.dialog-icon { width: 104rpx; height: 104rpx; border-radius: 50%; background: #E7F6EC; display: flex; align-items: center; justify-content: center; margin: 0 auto 24rpx; }
.dialog-title { display: block; font-size: 32rpx; font-weight: 700; color: #2C2C2C; text-align: center; margin-bottom: 12rpx; }
.dialog-desc { display: block; font-size: 26rpx; color: #8a8178; text-align: center; line-height: 1.6; margin-bottom: 32rpx; }
.dialog-actions { display: flex; gap: 20rpx; }
.dialog-btn { flex: 1; height: 84rpx; border-radius: 20rpx; display: flex; align-items: center; justify-content: center; }
.dialog-btn.ghost { background: #F2ECE1; }
.dialog-btn.solid { background: #C41E3A; }
.dialog-btn-text { font-size: 28rpx; color: #2C2C2C; font-weight: 500; }
.solid-text { color: #fff; }
</style>
