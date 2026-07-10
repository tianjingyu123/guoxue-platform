<script setup lang="ts">
/**
 * 角色与权限矩阵 — V0 circle-admin-roles.html 还原（2026-07-10 批⑦·治理前端）
 * 结构：三角色（管理员/合伙人/嘉宾）× 9 权限位矩阵读写 → 嘉宾分账总览（只读·跳 manage 调整）
 * 数据：circleGovernanceApi.getPermissionMatrix / updatePermissionMatrix（真连
 *      GET/PUT /circle-governance/:circleId/permission-matrix·仅圈主）+ circleGuestsApi.list（分账真实 shareRate）。
 * 铁律（与后端 circle-governance.constants 一致）：member.remove / funds.manage 为锁定位（金锁）——
 *      后端硬编码仅圈主、覆盖位抬不动，前端置灰不可改；「能禁言的不能碰钱」。
 * 降级（记台账）：
 * - V0「成员成长阶梯五级」区块：自动晋升后端明确缓做（实现记录 TODO#7）→ 本页不放，待后端建成后补；
 * - V0 分账总览的固定比例（圈主80%/成员40%/平台20%）：平台分成走 CommissionConfig 配置驱动非固定值 →
 *   不写编造比例，只展示嘉宾真实 shareRate/totalEarned（复用 manage.vue 同源数据）。
 */
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { circleGovernanceApi, type PermissionMatrix } from '@/lib/circle-governance-data'
import { circleGuestsApi, type CircleGuest } from '@/lib/circle-guests-data'

const circleId = ref('')

const loading = ref(true)
const error = ref('')
const saving = ref(false)

const matrix = ref<PermissionMatrix | null>(null)
const guests = ref<CircleGuest[]>([])
const guestsFailed = ref(false)
const dirty = ref(false)

const ROLE_LABEL: Record<string, string> = { ADMIN: '管理员', PARTNER: '合伙人', GUEST: '嘉宾' }

/** 按 group 分组（保持后端展示顺序） */
const groupedPermissions = computed(() => {
  const out: { group: string; rows: PermissionMatrix['permissions'] }[] = []
  for (const p of matrix.value?.permissions ?? []) {
    const last = out[out.length - 1]
    if (last && last.group === p.group) last.rows.push(p)
    else out.push({ group: p.group, rows: [p] })
  }
  return out
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    matrix.value = await circleGovernanceApi.getPermissionMatrix(circleId.value)
    dirty.value = false
    // 嘉宾分账（独立降级·不阻塞矩阵）
    circleGuestsApi
      .list()
      .then((gs) => { guests.value = gs; guestsFailed.value = false })
      .catch(() => { guestsFailed.value = true })
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败（权限矩阵仅圈主可管理）'
  } finally {
    loading.value = false
  }
}

function toggleCell(key: string, role: string, locked: boolean) {
  if (locked || saving.value || !matrix.value) return
  const row = matrix.value.permissions.find((p) => p.key === key)
  if (!row) return
  row.values[role] = !row.values[role]
  dirty.value = true
}

async function save() {
  if (saving.value || !matrix.value) return
  saving.value = true
  try {
    // 全量非锁定位作为覆盖位提交（锁定项后端静默忽略）
    const permissions: Record<string, Record<string, boolean>> = {}
    for (const role of matrix.value.roles) {
      permissions[role] = {}
      for (const p of matrix.value.permissions) {
        if (p.locked) continue
        permissions[role][p.key] = !!p.values[role]
      }
    }
    matrix.value = await circleGovernanceApi.updatePermissionMatrix(circleId.value, permissions)
    dirty.value = false
    uni.showToast({ title: '权限矩阵已保存', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

function goAdjustShare() {
  navigateTo(`/pkg-circle/circles/manage?id=${circleId.value}&tab=members`)
}

onLoad((query) => {
  circleId.value = String((query as Record<string, string>)?.id || '')
  if (!circleId.value) {
    loading.value = false
    error.value = '缺少圈子参数'
    return
  }
  load()
})
</script>

<template>
  <view class="page">
    <!-- 顶栏 -->
    <view class="topbar">
      <view class="back-btn" @tap="goBack"><app-icon name="chevron-left" :size="40" color="#2C2C2C" /></view>
      <text class="topbar-title">角色与权限</text>
      <view v-if="matrix" class="save-btn" :class="{ disabled: saving || !dirty }" @tap="save">
        <text class="save-btn-t">{{ saving ? '保存中…' : '保存' }}</text>
      </view>
    </view>

    <!-- 加载态 -->
    <view v-if="loading" class="state">
      <view class="skel" /><view class="skel tall" /><view class="skel" />
    </view>
    <!-- 错误态 -->
    <view v-else-if="error" class="state center">
      <text class="state-t">{{ error }}</text>
      <view class="retry" @tap="load"><text class="retry-t">重试</text></view>
    </view>

    <template v-else-if="matrix">
      <!-- 权限矩阵：管理员/合伙人/嘉宾 逐项授予 -->
      <text class="section-label">管理权限矩阵 · 权责透明</text>
      <view class="matrix">
        <view class="matrix-head">
          <text class="perm-col">权限项</text>
          <text v-for="r in matrix.roles" :key="r" class="role-col">{{ ROLE_LABEL[r] || r }}</text>
        </view>

        <template v-for="g in groupedPermissions" :key="g.group">
          <text class="matrix-group">{{ g.group }}</text>
          <view v-for="p in g.rows" :key="p.key" class="matrix-row">
            <view class="perm-name">
              <text class="perm-name-t">{{ p.label }}</text>
              <text v-if="p.key === 'member.remove'" class="perm-sub">付费成员按退款规则结算 · 仅圈主</text>
              <text v-else-if="p.key === 'funds.manage'" class="perm-sub">资金操作永远仅归圈主</text>
              <text v-else-if="p.key === 'content.moderate'" class="perm-sub">处理记录圈内可查</text>
              <text v-else-if="p.key === 'member.discipline'" class="perm-sub">按圈规阶梯执行</text>
            </view>
            <view
              v-for="r in matrix.roles" :key="r"
              class="cell"
              @tap="toggleCell(p.key, r, p.locked)"
            >
              <app-icon v-if="p.locked" name="lock" :size="26" color="#C9A96E" />
              <app-icon v-else-if="p.values[r]" name="check" :size="30" color="#5B8A5E" />
              <app-icon v-else name="minus" :size="26" color="#EDE7DD" />
            </view>
          </view>
        </template>

        <view class="matrix-note">
          <text class="matrix-note-t">金色锁 = 仅圈主可操作，不可授予。<text class="matrix-note-b">能禁言的不能碰钱，能碰钱的只有圈主</text>——权责分离是治理可信的底线。其余权限位点按格子即可授予/收回，保存后即时生效；所有管理操作留痕，成员可在圈规页查看治理记录。</text>
        </view>
      </view>

      <!-- 分账总览：嘉宾真实 shareRate（只读·调整跳成员管理） -->
      <text class="section-label">嘉宾分账总览 · 贡献有回报</text>
      <view class="split-card">
        <view v-if="guestsFailed" class="split-empty">
          <text class="split-empty-t">分账信息加载失败，可稍后重试或前往成员管理查看</text>
        </view>
        <view v-else-if="!guests.length" class="split-empty">
          <text class="split-empty-t">暂无嘉宾。在成员管理中把成员设为嘉宾后，可按人设置其内容收入的分账比例。</text>
        </view>
        <template v-else>
          <view v-for="g in guests" :key="g.userId" class="split-row">
            <image v-if="g.user.avatar" class="split-avatar" :src="g.user.avatar" mode="aspectFill" />
            <view v-else class="split-avatar fallback"><app-icon name="user" :size="30" color="#999999" /></view>
            <view class="split-who">
              <text class="split-name">{{ g.user.nickname }}</text>
              <text class="split-src">咨询 / 内容收入分账 · 累计实得 ¥{{ g.totalEarned.toFixed(2) }}</text>
            </view>
            <text class="split-pct">{{ g.shareRate }}%</text>
          </view>
        </template>
        <view class="split-note">
          <text class="split-note-t"><text class="split-note-b">分账比例按人设置</text>，作用于嘉宾名下内容与咨询收入；调整分账、退款审核与收益提现均为圈主专属操作。</text>
        </view>
        <view class="split-adjust" @tap="goAdjustShare">
          <text class="split-adjust-t">调整分账比例 · 前往成员管理</text>
          <app-icon name="chevron-right" :size="28" color="#C9A96E" />
        </view>
      </view>

      <view class="bottom-pad" />
    </template>
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: var(--bg-page, #faf8f5); padding-bottom: 80rpx; }

/* 顶栏 */
.topbar {
  position: sticky; top: 0; z-index: 20;
  display: flex; align-items: center; gap: 20rpx;
  padding: 24rpx 32rpx;
  padding-top: calc(var(--status-bar-height, 0px) + 24rpx);
  background: rgba(250, 248, 245, 0.92); backdrop-filter: blur(24rpx);
  border-bottom: 1rpx solid var(--separator, #ede7dd);
}
.back-btn { display: flex; align-items: center; }
.topbar-title { font-size: 34rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); flex: 1; }
.save-btn { padding: 8rpx 16rpx; }
.save-btn.disabled { opacity: 0.45; }
.save-btn-t { font-size: 28rpx; font-weight: 600; color: var(--brand, #c41e3a); }

/* 三态 */
.state { padding: 32rpx; }
.state.center { padding: 160rpx 80rpx; display: flex; flex-direction: column; align-items: center; gap: 16rpx; }
.skel { height: 120rpx; border-radius: 36rpx; background: #fff; margin-bottom: 24rpx; }
.skel.tall { height: 480rpx; }
.state-t { font-size: 28rpx; color: var(--text-tertiary, #999); text-align: center; line-height: 1.6; }
.retry { margin-top: 12rpx; padding: 14rpx 56rpx; border-radius: 999rpx; background: var(--brand, #c41e3a); }
.retry-t { font-size: 26rpx; color: #fff; }

.section-label { display: block; margin: 40rpx 36rpx 16rpx; font-size: 24rpx; color: var(--text-tertiary, #999999); letter-spacing: 2rpx; }

/* 权限矩阵 */
.matrix {
  margin: 0 32rpx; background: var(--bg-card, #ffffff);
  border-radius: 36rpx; box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05); overflow: hidden;
}
.matrix-head {
  display: flex; align-items: center;
  padding: 24rpx 32rpx; border-bottom: 1rpx solid var(--separator, #ede7dd);
  background: var(--bg-warm, #f8f4ec);
}
.perm-col { flex: 1; font-size: 22rpx; color: var(--text-tertiary, #999999); }
.role-col { width: 112rpx; text-align: center; font-size: 22rpx; font-weight: 600; flex-shrink: 0; color: var(--text-primary, #2c2c2c); }
.matrix-group { display: block; padding: 20rpx 32rpx 8rpx; font-size: 22rpx; color: var(--text-tertiary, #999999); letter-spacing: 1rpx; }
.matrix-row {
  display: flex; align-items: center;
  padding: 20rpx 32rpx; border-bottom: 1rpx solid var(--separator, #ede7dd);
}
.matrix-row:last-of-type { border-bottom: none; }
.perm-name { flex: 1; min-width: 0; }
.perm-name-t { display: block; font-size: 26rpx; color: var(--text-primary, #2c2c2c); }
.perm-sub { display: block; font-size: 20rpx; color: var(--text-tertiary, #999999); margin-top: 2rpx; }
.cell {
  width: 112rpx; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  padding: 12rpx 0;
}
.matrix-note {
  padding: 24rpx 32rpx; background: var(--bg-warm, #f8f4ec);
}
.matrix-note-t { font-size: 22rpx; color: var(--text-tertiary, #999999); line-height: 1.7; }
.matrix-note-b { color: var(--brand, #c41e3a); font-weight: 600; }

/* 分账总览 */
.split-card {
  margin: 0 32rpx; padding: 32rpx;
  background: var(--bg-card, #ffffff); border-radius: 36rpx;
  box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
}
.split-empty { padding: 12rpx 0 4rpx; }
.split-empty-t { font-size: 24rpx; color: var(--text-tertiary, #999999); line-height: 1.7; }
.split-row {
  display: flex; align-items: center; gap: 20rpx;
  padding: 20rpx 0; border-bottom: 1rpx solid var(--separator, #ede7dd);
}
.split-avatar {
  width: 72rpx; height: 72rpx; border-radius: 50%; flex-shrink: 0;
  background: var(--bg-warm, #f8f4ec);
}
.split-avatar.fallback { display: flex; align-items: center; justify-content: center; }
.split-who { flex: 1; min-width: 0; }
.split-name { display: block; font-size: 26rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); }
.split-src { display: block; font-size: 22rpx; color: var(--text-tertiary, #999999); margin-top: 2rpx; }
.split-pct { font-size: 30rpx; font-weight: 700; color: var(--gold, #c9a96e); flex-shrink: 0; }
.split-note {
  margin-top: 24rpx; padding: 20rpx 24rpx; border-radius: 16rpx;
  background: var(--bg-warm, #f8f4ec);
}
.split-note-t { font-size: 22rpx; color: var(--text-secondary, #6e6e73); line-height: 1.7; }
.split-note-b { color: var(--text-primary, #2c2c2c); font-weight: 600; }
.split-adjust {
  margin-top: 20rpx; height: 76rpx;
  border: 2rpx solid var(--gold, #c9a96e); border-radius: 38rpx;
  display: flex; align-items: center; justify-content: center; gap: 8rpx;
}
.split-adjust-t { font-size: 26rpx; font-weight: 600; color: var(--gold, #c9a96e); }

.bottom-pad { height: 40rpx; }
</style>
