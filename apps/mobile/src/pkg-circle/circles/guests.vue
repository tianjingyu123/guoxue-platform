<script setup lang="ts">
/**
 * 圈子「嘉宾管理」页（真连后端，去除原型臆想功能）
 *
 * 数据：circleGuestsApi.list() —— GET /circle-backend/guests（后端自动取当前圈主/管理员的圈子，不传 circleId）。
 * 写操作：
 *  - 设分账比例 PUT /circle-backend/guests/:userId/share-rate（saving 防重复，0-100 校验）
 *  - 移除嘉宾   DELETE /circles/:circleId/members/:userId（acting 防重复，需 circleId；拿不到则隐藏该操作）
 *
 * 相较原型已【降级去除】（后端无支撑）：
 *  - 老师/teacher 角色（后端成员角色仅 OWNER/ADMIN/GUEST/MEMBER/PARTNER，无 teacher）
 *  - article/course/live/qa 细粒度发布权限（后端无此模型）
 *  - 待审核嘉宾 Tab/通过·拒绝（后端无嘉宾申请审核端点，嘉宾即 role=GUEST 直接存在）
 *  - 文章/课程/直播/本月收益 四宫格统计（后端 getGuests 不返回这些字段）
 *  - 二维码邀请 → 保留 toastComingSoon 占位
 * 真实展示：头像/昵称、分账比例(shareRate%)、累计收益(totalEarned，单位元)。
 */
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import AppLoading from '@/components/common/app-loading.vue'
import { goBack, toastComingSoon } from '@/utils/router'
import { circleGuestsApi, type CircleGuest } from '@/lib/circle-guests-data'

// onLoad 取 circleId（仅用于「移除嘉宾」端点；列表接口不需要）。拿不到则隐藏移除操作。
const circleId = ref('')
onLoad((opt) => { circleId.value = (opt?.id || opt?.circleId || '') as string })
const canRemove = computed(() => !!circleId.value)

// ─── 列表三态 ───
const guests = ref<CircleGuest[]>([])
const loading = ref(false)
const errMsg = ref('')

async function loadGuests() {
  loading.value = true
  errMsg.value = ''
  try {
    guests.value = await circleGuestsApi.list()
  } catch (e) {
    errMsg.value = (e as Error)?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}
loadGuests()

// ─── 搜索 ───
const searchQuery = ref('')
const filteredGuests = computed(() => {
  const kw = searchQuery.value.trim()
  if (!kw) return guests.value
  return guests.value.filter((g) => g.user.nickname.includes(kw))
})

// ─── 操作菜单 ───
const showActionMenu = ref<string | null>(null)
function toggleMenu(id: string) { showActionMenu.value = showActionMenu.value === id ? null : id }

// ─── 编辑分账弹窗 ───
const showEditModal = ref<string | null>(null)
const editShare = ref(50)
const saving = ref(false)
const editingGuest = computed(() => guests.value.find((g) => g.userId === showEditModal.value) || null)

function openEdit(g: CircleGuest) {
  showEditModal.value = g.userId
  showActionMenu.value = null
  editShare.value = g.shareRate || 50
}
function closeEdit() { if (saving.value) return; showEditModal.value = null }

async function saveShareRate() {
  if (saving.value) return
  const g = editingGuest.value
  if (!g) return
  const rate = Math.round(Number(editShare.value))
  if (!(rate >= 0 && rate <= 100)) {
    uni.showToast({ title: '比例需在 0-100 之间', icon: 'none' })
    return
  }
  saving.value = true
  try {
    await circleGuestsApi.setShareRate(g.userId, rate)
    uni.showToast({ title: '分账比例已更新', icon: 'none' })
    showEditModal.value = null
    await loadGuests()
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

// ─── 移除嘉宾 ───
const acting = ref(false)
function confirmRemove(g: CircleGuest) {
  if (!canRemove.value || acting.value) return
  showActionMenu.value = null
  uni.showModal({
    title: '移除嘉宾',
    content: `确定将「${g.user.nickname}」移出圈子？`,
    confirmColor: '#C41E3A',
    success: (r) => { if (r.confirm) doRemove(g) },
  })
}
async function doRemove(g: CircleGuest) {
  if (acting.value) return
  acting.value = true
  try {
    await circleGuestsApi.remove(circleId.value, g.userId)
    uni.showToast({ title: '已移除', icon: 'none' })
    await loadGuests()
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '移除失败', icon: 'none' })
  } finally {
    acting.value = false
  }
}
</script>

<template>
  <view class="gt">
    <!-- Header -->
    <view class="gt-nav">
      <view class="gt-nav-bar">
        <view class="gt-back" @tap="goBack"><app-icon name="arrow-left" :size="44" color="#1A1A1A" /></view>
        <text class="gt-title">嘉宾管理</text>
        <view class="gt-invite-btn" @tap="toastComingSoon()"><app-icon name="user-plus" :size="40" color="#C41E3A" /></view>
      </view>
      <!-- 搜索 -->
      <view class="gt-search-wrap">
        <view class="gt-search">
          <app-icon name="search" :size="28" color="#999999" />
          <input v-model="searchQuery" class="gt-search-input" placeholder="搜索嘉宾昵称" placeholder-class="gt-ph" />
        </view>
      </view>
    </view>

    <!-- 列表 -->
    <view class="gt-list">
      <!-- loading -->
      <view v-if="loading" class="gt-empty">
        <AppLoading />
      </view>

      <!-- error -->
      <view v-else-if="errMsg" class="gt-empty">
        <app-icon name="user-plus" :size="56" color="#D9D9D9" />
        <text class="gt-empty-text">{{ errMsg }}</text>
        <view class="gt-empty-btn" @tap="loadGuests">重试</view>
      </view>

      <!-- empty -->
      <view v-else-if="filteredGuests.length === 0" class="gt-empty">
        <app-icon name="user-plus" :size="56" color="#D9D9D9" />
        <text class="gt-empty-text">{{ searchQuery ? '未找到匹配的嘉宾' : '暂无嘉宾' }}</text>
      </view>

      <!-- cards -->
      <view v-for="g in filteredGuests" :key="g.id" class="gt-card">
        <view class="gt-card-head">
          <image lazy-load class="gt-avatar" :src="g.user.avatar" mode="aspectFill" />
          <view class="gt-info">
            <view class="gt-name-row">
              <text class="gt-name">{{ g.user.nickname }}</text>
              <text class="gt-role gt-role-guest">嘉宾</text>
            </view>
          </view>
          <view class="gt-more" @tap="toggleMenu(g.id)"><app-icon name="more-vertical" :size="36" color="#999999" /></view>
        </view>

        <!-- 操作菜单 -->
        <view v-if="showActionMenu === g.id" class="gt-menu">
          <view class="gt-menu-item" @tap="openEdit(g)"><app-icon name="edit" :size="26" color="#666666" /><text>设分账</text></view>
          <view v-if="canRemove" class="gt-menu-item gt-menu-del" @tap="confirmRemove(g)"><app-icon name="trash-2" :size="26" color="#EF4444" /><text>移除</text></view>
        </view>

        <!-- 分账 / 收益 -->
        <view class="gt-stats">
          <view class="gt-share-row">
            <text class="gt-share-txt">分账比例：{{ g.shareRate }}%</text>
            <text class="gt-share-txt">累计收益：¥{{ g.totalEarned.toFixed(2) }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 编辑分账底部弹窗 -->
    <view v-if="showEditModal && editingGuest" class="gt-modal-mask" @tap="closeEdit">
      <view class="gt-sheet" @tap.stop>
        <view class="gt-sheet-head">
          <text class="gt-sheet-cancel" @tap="closeEdit">取消</text>
          <text class="gt-sheet-title">设置 {{ editingGuest.user.nickname }} 分账</text>
          <text class="gt-sheet-ok" :style="{ opacity: saving ? 0.5 : 1 }" @tap="saveShareRate">{{ saving ? '保存中' : '保存' }}</text>
        </view>
        <scroll-view scroll-y class="gt-sheet-body">
          <text class="gt-field-label">收益分成比例</text>
          <view class="gt-slider-row">
            <slider class="gt-slider" :value="editShare" :min="0" :max="100" :step="5" activeColor="#C41E3A" block-size="20" @changing="editShare = $event.detail.value" @change="editShare = $event.detail.value" />
            <text class="gt-slider-val">{{ editShare }}%</text>
          </view>
          <text class="gt-slider-hint">嘉宾获得 {{ editShare }}%，圈子获得 {{ 100 - editShare }}%</text>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.gt { min-height: 100vh; background: #FAF8F5; }
.gt-nav { position: sticky; top: 0; z-index: 10; background: #fff; border-bottom: 1rpx solid #F2EFEA; }
.gt-nav-bar { display: flex; align-items: center; justify-content: space-between; padding: 0 24rpx; height: 96rpx; }
.gt-back, .gt-invite-btn { padding: 8rpx; }
.gt-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.gt-search-wrap { padding: 0 24rpx 18rpx; }
.gt-search { display: flex; align-items: center; gap: 10rpx; background: #FAF8F5; border-radius: 16rpx; padding: 16rpx 20rpx; }
.gt-search-input { flex: 1; font-size: 28rpx; color: #2C2C2C; }
.gt-ph { color: #999999; }
.gt-tabs { display: flex; gap: 14rpx; padding: 0 24rpx 18rpx; }
.gt-tab { padding: 10rpx 28rpx; border-radius: 999rpx; font-size: 28rpx; background: #FAF8F5; color: #999999; }
.gt-tab-on { background: var(--brand); color: #fff; }
.gt-tab-count { font-size: 22rpx; }
.gt-list { padding: 24rpx; display: flex; flex-direction: column; gap: 18rpx; }
.gt-empty { display: flex; flex-direction: column; align-items: center; padding: 80rpx 0; gap: 18rpx; }
.gt-empty-text { font-size: 26rpx; color: #999999; }
.gt-empty-btn { margin-top: 8rpx; padding: 14rpx 48rpx; background: var(--brand); color: #fff; border-radius: 16rpx; font-size: 26rpx; }
.gt-card { background: #fff; border-radius: 28rpx; padding: 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.gt-card-head { display: flex; align-items: flex-start; gap: 18rpx; }
.gt-avatar { width: 88rpx; height: 88rpx; border-radius: 16rpx; background: #F2EFEA; flex-shrink: 0; }
.gt-info { flex: 1; min-width: 0; }
.gt-name-row { display: flex; align-items: center; gap: 10rpx; flex-wrap: wrap; }
.gt-name { font-size: 30rpx; font-weight: 500; color: #2C2C2C; }
.gt-role { font-size: 20rpx; padding: 2rpx 10rpx; border-radius: 6rpx; }
.gt-role-teacher { background: rgba(37,99,235,0.1); color: #2563EB; }
.gt-role-guest { background: rgba(201,169,110,0.1); color: #C9A96E; }
.gt-role-pending { background: #FFEDD5; color: #EA580C; }
.gt-titletxt { display: block; font-size: 24rpx; color: #999999; margin-top: 4rpx; }
.gt-joined { display: block; font-size: 20rpx; color: #999999; margin-top: 6rpx; }
.gt-more { padding: 8rpx; margin-right: -8rpx; }
.gt-menu { margin-top: 18rpx; padding-top: 18rpx; border-top: 1rpx solid #F2EFEA; display: flex; gap: 14rpx; }
.gt-menu-item { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8rpx; padding: 16rpx 0; font-size: 26rpx; color: #666666; background: #FAF8F5; border-radius: 12rpx; }
.gt-menu-del { color: #EF4444; background: #FEF2F2; }
.gt-perms { margin-top: 18rpx; display: flex; flex-wrap: wrap; align-items: center; gap: 10rpx; }
.gt-perms-label { font-size: 20rpx; color: #999999; }
.gt-perm { font-size: 20rpx; padding: 2rpx 10rpx; border-radius: 6rpx; background: #FAF8F5; color: #999999; }
.gt-stats { margin-top: 18rpx; padding-top: 18rpx; border-top: 1rpx solid #F2EFEA; }
.gt-stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12rpx; }
.gt-stat { text-align: center; }
.gt-stat-top { display: flex; align-items: center; justify-content: center; gap: 6rpx; }
.gt-stat-num { font-size: 28rpx; font-weight: 500; color: #666666; }
.gt-gold { color: #C9A96E; }
.gt-stat-label { display: block; font-size: 20rpx; color: #999999; margin-top: 4rpx; }
.gt-share-row { display: flex; align-items: center; justify-content: space-between; margin-top: 14rpx; }
.gt-share-txt { font-size: 24rpx; color: #999999; }
.gt-pending-actions { margin-top: 18rpx; padding-top: 18rpx; border-top: 1rpx solid #F2EFEA; display: flex; gap: 14rpx; }
.gt-pa { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8rpx; padding: 18rpx 0; border-radius: 16rpx; font-size: 28rpx; }
.gt-pa-ok { background: var(--brand); color: #fff; }
.gt-pa-no { background: #FAF8F5; color: #666666; }
/* 弹窗 */
.gt-modal-mask { position: fixed; inset: 0; z-index: 50; background: rgba(0,0,0,0.4); display: flex; align-items: flex-end; }
.gt-sheet { width: 100%; background: #fff; border-radius: 36rpx 36rpx 0 0; max-height: 85vh; overflow: hidden; }
.gt-sheet-head { display: flex; align-items: center; justify-content: space-between; padding: 28rpx 24rpx; border-bottom: 1rpx solid #F2EFEA; }
.gt-sheet-cancel { font-size: 28rpx; color: #999999; }
.gt-sheet-title { font-size: 30rpx; font-weight: 500; color: #2C2C2C; }
.gt-sheet-ok { font-size: 28rpx; color: var(--brand); font-weight: 500; }
.gt-sheet-body { padding: 28rpx 24rpx; max-height: 70vh; }
.gt-seg { display: flex; gap: 14rpx; margin-bottom: 24rpx; }
.gt-seg-btn { flex: 1; padding: 18rpx 0; text-align: center; border-radius: 16rpx; font-size: 28rpx; background: #FAF8F5; color: #999999; }
.gt-seg-on { background: var(--brand); color: #fff; }
.gt-seg-on-gold { background: #C9A96E; color: #fff; }
.gt-seg-on-info { background: #2563EB; color: #fff; }
.gt-field-label { display: block; font-size: 28rpx; font-weight: 500; color: #2C2C2C; margin: 12rpx 0 16rpx; }
.gt-roles { display: flex; gap: 14rpx; }
.gt-role-card { flex: 1; padding: 22rpx; border-radius: 16rpx; border: 3rpx solid #F2EFEA; }
.gt-role-card-on { border-color: var(--brand); background: rgba(196,30,58,0.05); }
.gt-role-card-head { display: flex; align-items: center; gap: 10rpx; }
.gt-role-card-name { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.gt-role-card-desc { display: block; font-size: 20rpx; color: #999999; margin-top: 6rpx; }
.gt-perm-pills { display: flex; flex-wrap: wrap; gap: 14rpx; }
.gt-perm-pill { padding: 14rpx 32rpx; border-radius: 16rpx; font-size: 28rpx; background: #FAF8F5; color: #999999; }
.gt-perm-pill-on { background: var(--brand); color: #fff; }
.gt-slider-row { display: flex; align-items: center; gap: 24rpx; }
.gt-slider { flex: 1; }
.gt-slider-val { font-size: 34rpx; font-weight: 700; color: var(--brand); width: 100rpx; text-align: right; }
.gt-slider-hint { display: block; font-size: 24rpx; color: #999999; margin-top: 10rpx; }
.gt-link-row { display: flex; gap: 14rpx; }
.gt-link { flex: 1; padding: 18rpx 20rpx; background: #FAF8F5; border-radius: 16rpx; font-size: 26rpx; color: #999999; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gt-link-btn { padding: 0 28rpx; display: flex; align-items: center; justify-content: center; background: var(--brand); border-radius: 16rpx; }
.gt-link-btn-ghost { background: #FAF8F5; }
.gt-search-modal { margin-top: 4rpx; }
</style>
