<script setup lang="ts">
/**
 * 邀请码管理页（从原型 app/circles/[id]/invite-codes/page.tsx 438行高保真迁移）
 * 4统计卡 + 邀请码列表(状态徽章/操作菜单禁用·删除/使用进度条/复制·分享/使用记录展开) + 创建底部弹窗 + 骨架屏
 * 复制/分享改用 uni.setClipboardData 跨端
 */
import { ref, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'

interface UsedUser { id: string; name: string; avatar: string; usedAt: string }
interface InviteCode {
  id: string
  code: string
  maxUses: number
  usedCount: number
  status: 'active' | 'disabled' | 'expired'
  createdAt: string
  expiresAt?: string
  usedBy?: UsedUser[]
}

const mockStats = { totalInvited: 156, usedCodes: 12, pendingCodes: 5, thisWeek: 23 }
const mockInviteCodes: InviteCode[] = [
  { id: '1', code: 'GUOXUE2024A', maxUses: 10, usedCount: 8, status: 'active', createdAt: '2024-01-15T10:00:00Z', usedBy: [
    { id: '1', name: '张三', avatar: '/static/avatars/u1.png', usedAt: '2024-01-16' },
    { id: '2', name: '李四', avatar: '/static/avatars/u2.png', usedAt: '2024-01-17' },
  ] },
  { id: '2', code: 'GUOXUE2024B', maxUses: 5, usedCount: 5, status: 'expired', createdAt: '2024-01-10T10:00:00Z', expiresAt: '2024-01-20T10:00:00Z' },
  { id: '3', code: 'VIP888', maxUses: 100, usedCount: 45, status: 'active', createdAt: '2024-01-01T10:00:00Z' },
  { id: '4', code: 'TEST123', maxUses: 3, usedCount: 1, status: 'disabled', createdAt: '2024-01-05T10:00:00Z' },
]

const isLoading = ref(true)
const stats = ref({ ...mockStats })
const inviteCodes = ref<InviteCode[]>([])
const showCreateModal = ref(false)
const newCodeMaxUses = ref(10)
const creating = ref(false)
const expandedCode = ref<string | null>(null)
const activeMenu = ref<string | null>(null)
const copiedCode = ref<string | null>(null)

onMounted(() => {
  setTimeout(() => { inviteCodes.value = mockInviteCodes; isLoading.value = false }, 800)
})

function statusLabel(s: string) { return s === 'active' ? '有效' : s === 'disabled' ? '已禁用' : '已过期' }
function statusCls(s: string) { return s === 'active' ? 'ic-st-active' : s === 'disabled' ? 'ic-st-disabled' : 'ic-st-expired' }
function formatDate(s: string) { const d = new Date(s); return `${d.getMonth() + 1}/${d.getDate()}` }

async function createCode() {
  creating.value = true
  await new Promise((r) => setTimeout(r, 1000))
  const newCode: InviteCode = {
    id: Date.now().toString(),
    code: `NEW${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    maxUses: newCodeMaxUses.value,
    usedCount: 0,
    status: 'active',
    createdAt: new Date().toISOString(),
  }
  inviteCodes.value = [newCode, ...inviteCodes.value]
  stats.value.pendingCodes += 1
  showCreateModal.value = false
  creating.value = false
}

function copyCode(code: string) {
  uni.setClipboardData({ data: code, success: () => { copiedCode.value = code; setTimeout(() => (copiedCode.value = null), 2000) } })
}
function shareCode(code: string) {
  // #ifdef MP-WEIXIN
  uni.showToast({ title: '请点击右上角分享', icon: 'none' })
  // #endif
  // #ifndef MP-WEIXIN
  const url = `https://rebugx.com/circles/join?code=${code}`
  uni.setClipboardData({ data: url, success: () => { copiedCode.value = code; setTimeout(() => (copiedCode.value = null), 2000); uni.showToast({ title: '邀请链接已复制', icon: 'none' }) } })
  // #endif
}
function disableCode(id: string) {
  inviteCodes.value = inviteCodes.value.map((c) => (c.id === id ? { ...c, status: 'disabled' as const } : c))
  activeMenu.value = null
}
function deleteCode(id: string) {
  inviteCodes.value = inviteCodes.value.filter((c) => c.id !== id)
  activeMenu.value = null
}
</script>

<template>
  <view class="ic">
    <!-- 顶部导航 -->
    <view class="ic-nav">
      <view
        class="ic-back"
        @tap="goBack"
      >
        <app-icon
          name="arrow-left"
          :size="40"
          color="#2C2C2C"
        />
      </view>
      <text class="ic-title">
        邀请码管理
      </text>
      <view
        class="ic-add"
        @tap="showCreateModal = true"
      >
        <app-icon
          name="plus"
          :size="40"
          color="#C41E3A"
        />
      </view>
    </view>

    <!-- 骨架屏 -->
    <view
      v-if="isLoading"
      class="ic-body"
    >
      <view class="ic-stats">
        <view
          v-for="i in 4"
          :key="i"
          class="ic-skel-stat"
        />
      </view>
      <view class="ic-skel-list">
        <view
          v-for="i in 3"
          :key="i"
          class="ic-skel-card"
        />
      </view>
    </view>

    <template v-else>
      <!-- 统计卡片 -->
      <view class="ic-body">
        <view class="ic-stats">
          <view class="ic-stat ic-stat-primary">
            <view class="ic-stat-head">
              <app-icon
                name="users"
                :size="26"
                color="#ffffff"
              /><text class="ic-stat-label ic-light">
                总邀请人数
              </text>
            </view>
            <text class="ic-stat-num ic-light">
              {{ stats.totalInvited }}
            </text>
          </view>
          <view class="ic-stat">
            <view class="ic-stat-head">
              <app-icon
                name="gift"
                :size="26"
                color="#C9A96E"
              /><text class="ic-stat-label">
                本周新增
              </text>
            </view>
            <text class="ic-stat-num">
              {{ stats.thisWeek }}
            </text>
          </view>
          <view class="ic-stat">
            <view class="ic-stat-head">
              <app-icon
                name="check"
                :size="26"
                color="#22C55E"
              /><text class="ic-stat-label">
                已使用码
              </text>
            </view>
            <text class="ic-stat-num">
              {{ stats.usedCodes }}
            </text>
          </view>
          <view class="ic-stat">
            <view class="ic-stat-head">
              <app-icon
                name="clock"
                :size="26"
                color="#C41E3A"
              /><text class="ic-stat-label">
                待使用码
              </text>
            </view>
            <text class="ic-stat-num">
              {{ stats.pendingCodes }}
            </text>
          </view>
        </view>
      </view>

      <!-- 列表 -->
      <view class="ic-list">
        <text class="ic-list-title">
          邀请码列表
        </text>

        <view
          v-if="inviteCodes.length === 0"
          class="ic-empty"
        >
          <view class="ic-empty-icon">
            <app-icon
              name="gift"
              :size="56"
              color="#999999"
            />
          </view>
          <text class="ic-empty-text">
            还没有创建邀请码
          </text>
          <view
            class="ic-empty-btn"
            @tap="showCreateModal = true"
          >
            创建邀请码
          </view>
        </view>

        <view
          v-for="code in inviteCodes"
          :key="code.id"
          class="ic-card"
          :class="{ 'ic-card-disabled': code.status === 'disabled' }"
        >
          <view class="ic-card-body">
            <view class="ic-card-head">
              <view class="ic-code-info">
                <view class="ic-code-row">
                  <text class="ic-code">
                    {{ code.code }}
                  </text>
                  <text
                    class="ic-badge"
                    :class="statusCls(code.status)"
                  >
                    {{ statusLabel(code.status) }}
                  </text>
                </view>
                <text class="ic-code-date">
                  创建于 {{ formatDate(code.createdAt) }}<text v-if="code.expiresAt">
                    · 过期于 {{ formatDate(code.expiresAt) }}
                  </text>
                </text>
              </view>
              <view class="ic-menu-wrap">
                <view
                  class="ic-menu-btn"
                  @tap="activeMenu = activeMenu === code.id ? null : code.id"
                >
                  <app-icon
                    name="more-horizontal"
                    :size="36"
                    color="#666666"
                  />
                </view>
                <view
                  v-if="activeMenu === code.id"
                  class="ic-menu"
                >
                  <view
                    v-if="code.status === 'active'"
                    class="ic-menu-item"
                    @tap="disableCode(code.id)"
                  >
                    <app-icon
                      name="ban"
                      :size="26"
                      color="#666666"
                    /><text>禁用</text>
                  </view>
                  <view
                    class="ic-menu-item ic-menu-del"
                    @tap="deleteCode(code.id)"
                  >
                    <app-icon
                      name="trash-2"
                      :size="26"
                      color="#C41E3A"
                    /><text>删除</text>
                  </view>
                </view>
              </view>
            </view>

            <!-- 使用进度 -->
            <view class="ic-progress">
              <view class="ic-progress-row">
                <text class="ic-progress-label">
                  使用进度
                </text>
                <text class="ic-progress-val">
                  {{ code.usedCount }}/{{ code.maxUses }}
                </text>
              </view>
              <view class="ic-progress-track">
                <view
                  class="ic-progress-bar"
                  :style="{ width: (code.usedCount / code.maxUses) * 100 + '%' }"
                />
              </view>
            </view>

            <!-- 操作按钮 -->
            <view class="ic-actions">
              <view
                class="ic-act ic-act-copy"
                :class="{ 'ic-act-copied': copiedCode === code.code }"
                @tap="copyCode(code.code)"
              >
                <app-icon
                  :name="copiedCode === code.code ? 'check' : 'copy'"
                  :size="28"
                  :color="copiedCode === code.code ? '#16A34A' : '#666666'"
                />
                <text>{{ copiedCode === code.code ? '已复制' : '复制' }}</text>
              </view>
              <view
                class="ic-act ic-act-share"
                @tap="shareCode(code.code)"
              >
                <app-icon
                  name="share-2"
                  :size="28"
                  color="#ffffff"
                /><text>分享</text>
              </view>
            </view>
          </view>

          <!-- 使用记录 -->
          <view
            v-if="code.usedBy && code.usedBy.length > 0"
            class="ic-records"
          >
            <view
              class="ic-records-toggle"
              @tap="expandedCode = expandedCode === code.id ? null : code.id"
            >
              <text>查看使用记录 ({{ code.usedBy.length }})</text>
              <app-icon
                :name="expandedCode === code.id ? 'chevron-up' : 'chevron-down'"
                :size="28"
                color="#666666"
              />
            </view>
            <view
              v-if="expandedCode === code.id"
              class="ic-records-list"
            >
              <view
                v-for="u in code.usedBy"
                :key="u.id"
                class="ic-record"
              >
                <image
                  class="ic-record-avatar"
                  :src="u.avatar"
                  mode="aspectFill"
                />
                <view class="ic-record-info">
                  <text class="ic-record-name">
                    {{ u.name }}
                  </text><text class="ic-record-time">
                    {{ u.usedAt }}
                  </text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </template>

    <!-- 创建邀请码底部弹窗 -->
    <view
      v-if="showCreateModal"
      class="ic-modal-mask"
      @tap="showCreateModal = false"
    >
      <view
        class="ic-sheet"
        @tap.stop
      >
        <view class="ic-sheet-head">
          <text class="ic-sheet-title">
            生成新邀请码
          </text>
          <view @tap="showCreateModal = false">
            <app-icon
              name="x"
              :size="36"
              color="#666666"
            />
          </view>
        </view>
        <view class="ic-sheet-body">
          <text class="ic-field-label">
            最大使用次数
          </text>
          <view class="ic-uses">
            <view
              v-for="n in [5, 10, 20, 50, 100]"
              :key="n"
              class="ic-use"
              :class="{ 'ic-use-on': newCodeMaxUses === n }"
              @tap="newCodeMaxUses = n"
            >
              {{ n }}次
            </view>
          </view>
          <view class="ic-tip">
            邀请码生成后，被邀请人可通过邀请码直接加入圈子，无需审批
          </view>
        </view>
        <view class="ic-sheet-foot">
          <view
            class="ic-create-btn"
            :class="{ 'ic-create-disabled': creating }"
            @tap="!creating && createCode()"
          >
            {{ creating ? '生成中...' : '生成邀请码' }}
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.ic { min-height: 100vh; background: #FAF8F5; padding-bottom: 96rpx; }
.ic-nav { position: sticky; top: 0; z-index: 20; background: #fff; border-bottom: 1rpx solid #E8E3DB; height: 96rpx; display: flex; align-items: center; justify-content: space-between; padding: 0 24rpx; }
.ic-back, .ic-add { padding: 8rpx; }
.ic-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.ic-body { padding: 24rpx; }
.ic-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 18rpx; }
.ic-stat { background: #fff; border-radius: 20rpx; padding: 24rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.ic-stat-primary { background: linear-gradient(135deg, #C41E3A, #A01830); }
.ic-stat-head { display: flex; align-items: center; gap: 10rpx; margin-bottom: 14rpx; }
.ic-stat-label { font-size: 26rpx; color: #666666; }
.ic-light { color: rgba(255,255,255,0.85); }
.ic-stat-num { font-size: 44rpx; font-weight: 700; color: #2C2C2C; }
.ic-stat-primary .ic-stat-num { color: #fff; }
.ic-list { padding: 0 24rpx; display: flex; flex-direction: column; gap: 18rpx; }
.ic-list-title { font-size: 26rpx; font-weight: 500; color: #666666; }
.ic-empty { background: #fff; border-radius: 20rpx; padding: 56rpx 24rpx; text-align: center; display: flex; flex-direction: column; align-items: center; }
.ic-empty-icon { width: 120rpx; height: 120rpx; border-radius: 999rpx; background: #F5F0E8; display: flex; align-items: center; justify-content: center; margin-bottom: 24rpx; }
.ic-empty-text { font-size: 28rpx; color: #666666; margin-bottom: 24rpx; }
.ic-empty-btn { padding: 14rpx 48rpx; background: #C41E3A; color: #fff; border-radius: 999rpx; font-size: 26rpx; }
.ic-card { background: #fff; border-radius: 20rpx; overflow: hidden; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.ic-card-disabled { opacity: 0.6; }
.ic-card-body { padding: 24rpx; }
.ic-card-head { display: flex; align-items: flex-start; justify-content: space-between; }
.ic-code-row { display: flex; align-items: center; gap: 12rpx; }
.ic-code { font-family: monospace; font-weight: 700; font-size: 36rpx; color: #2C2C2C; }
.ic-badge { padding: 2rpx 12rpx; border-radius: 6rpx; font-size: 20rpx; }
.ic-st-active { background: #DCFCE7; color: #16A34A; }
.ic-st-disabled { background: #F3F4F6; color: #6B7280; }
.ic-st-expired { background: #FFEDD5; color: #EA580C; }
.ic-code-date { display: block; font-size: 24rpx; color: #999999; margin-top: 6rpx; }
.ic-menu-wrap { position: relative; }
.ic-menu-btn { padding: 8rpx; }
.ic-menu { position: absolute; right: 0; top: 100%; margin-top: 4rpx; background: #fff; border-radius: 14rpx; box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.15); border: 1rpx solid #E8E3DB; padding: 8rpx 0; z-index: 10; min-width: 180rpx; }
.ic-menu-item { display: flex; align-items: center; gap: 12rpx; padding: 16rpx 24rpx; font-size: 26rpx; color: #666666; }
.ic-menu-del { color: #C41E3A; }
.ic-progress { margin-top: 18rpx; }
.ic-progress-row { display: flex; align-items: center; justify-content: space-between; font-size: 26rpx; margin-bottom: 8rpx; }
.ic-progress-label { color: #666666; }
.ic-progress-val { color: #2C2C2C; font-weight: 500; }
.ic-progress-track { height: 12rpx; background: #F2EFEA; border-radius: 999rpx; overflow: hidden; }
.ic-progress-bar { height: 100%; background: linear-gradient(to right, #C41E3A, #E85A5A); border-radius: 999rpx; }
.ic-actions { display: flex; gap: 14rpx; margin-top: 24rpx; }
.ic-act { flex: 1; padding: 16rpx 0; border-radius: 14rpx; font-size: 26rpx; display: flex; align-items: center; justify-content: center; gap: 10rpx; }
.ic-act-copy { background: #F5F0E8; color: #666666; }
.ic-act-copied { background: #DCFCE7; color: #16A34A; }
.ic-act-share { background: #C41E3A; color: #fff; }
.ic-records { border-top: 1rpx solid #E8E3DB; }
.ic-records-toggle { display: flex; align-items: center; justify-content: space-between; padding: 22rpx 24rpx; font-size: 26rpx; color: #666666; }
.ic-records-list { padding: 0 24rpx 24rpx; display: flex; flex-direction: column; gap: 14rpx; }
.ic-record { display: flex; align-items: center; gap: 18rpx; background: #F5F0E8; border-radius: 14rpx; padding: 14rpx; }
.ic-record-avatar { width: 56rpx; height: 56rpx; border-radius: 999rpx; background: #E8E3DB; }
.ic-record-info { flex: 1; }
.ic-record-name { display: block; font-size: 26rpx; font-weight: 500; color: #2C2C2C; }
.ic-record-time { display: block; font-size: 22rpx; color: #999999; }
.ic-skel-stat { height: 140rpx; background: #fff; border-radius: 20rpx; }
.ic-stats .ic-skel-stat:nth-child(odd), .ic-stats .ic-skel-stat:nth-child(even) { animation: ic-pulse 1.4s ease-in-out infinite; }
.ic-skel-list { display: flex; flex-direction: column; gap: 18rpx; margin-top: 18rpx; }
.ic-skel-card { height: 260rpx; background: #fff; border-radius: 20rpx; animation: ic-pulse 1.4s ease-in-out infinite; }
@keyframes ic-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
.ic-modal-mask { position: fixed; inset: 0; z-index: 50; background: rgba(0,0,0,0.5); display: flex; align-items: flex-end; }
.ic-sheet { width: 100%; background: #fff; border-radius: 28rpx 28rpx 0 0; }
.ic-sheet-head { display: flex; align-items: center; justify-content: space-between; padding: 28rpx 24rpx; border-bottom: 1rpx solid #E8E3DB; }
.ic-sheet-title { font-size: 30rpx; font-weight: 600; color: #2C2C2C; }
.ic-sheet-body { padding: 28rpx 24rpx; }
.ic-field-label { display: block; font-size: 28rpx; font-weight: 500; color: #2C2C2C; margin-bottom: 18rpx; }
.ic-uses { display: flex; gap: 14rpx; }
.ic-use { flex: 1; padding: 16rpx 0; text-align: center; border-radius: 14rpx; font-size: 26rpx; background: #F5F0E8; color: #666666; }
.ic-use-on { background: #C41E3A; color: #fff; }
.ic-tip { margin-top: 24rpx; background: #FFF8E6; border-radius: 14rpx; padding: 18rpx; font-size: 26rpx; color: #8B6914; line-height: 1.6; }
.ic-sheet-foot { padding: 24rpx; border-top: 1rpx solid #E8E3DB; }
.ic-create-btn { padding: 24rpx 0; text-align: center; background: linear-gradient(to right, #C41E3A, #E85A5A); color: #fff; border-radius: 18rpx; font-size: 30rpx; font-weight: 500; }
.ic-create-disabled { opacity: 0.5; }
</style>
