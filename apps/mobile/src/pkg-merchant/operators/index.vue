<!--
  B8 · 操作员管理（新增页 · V0 视觉稿 1:1 还原 · uni-app Vue3）
  规格红线：操作员以【店铺身份】操作，归属仍记店主账户，系统仅做鉴权与审计，不改分佣归属；仅官方旗舰店 / 大商家可用。
  对应后端 MerchantMember：GET /merchant-backend/members · POST members · DELETE members/:memberId · GET members/audit（未实现则诚实占位）
-->
<template>
  <view class="page">
    <!-- 顶部导航（朱红渐变） -->
    <view class="nav" :style="{ paddingTop: statusBarH + 'px' }">
      <view class="nav-inner">
        <view class="nav-back" @tap="onBack">
          <AppIcon name="arrow-left" :size="20" color="#ffffff" />
        </view>
        <text class="nav-title">操作员管理</text>
        <view class="nav-ph" />
      </view>
    </view>

    <!-- 加载 -->
    <view v-if="loading" class="state">
      <text class="state-t">加载中…</text>
    </view>
    <!-- 错误 -->
    <view v-else-if="error" class="state">
      <AppIcon name="alert-circle" :size="40" color="#c41e3a" />
      <text class="state-t">{{ error }}</text>
      <view class="state-btn" @tap="load"><text class="state-btn-t">重试</text></view>
    </view>

    <template v-else>
      <scroll-view scroll-y class="scroll" :style="{ top: navH + 'px' }">
        <view class="body">
          <!-- 说明条 -->
          <view class="tip">
            <text class="tip-t">操作员以【店铺身份】发布与管理商品、处理订单，所有操作归属仍记店主账户；系统仅做鉴权与审计，不改变分佣归属。仅官方旗舰店 / 大商家可添加。</text>
          </view>

          <!-- 成员区标题 + 审计入口 -->
          <view class="sect-t">
            <view class="sect-lft">
              <view class="sect-bar" />
              <text class="sect-txt">店铺成员（{{ members.length }}）</text>
            </view>
            <view class="sect-audit" @tap="openAudit">
              <text class="sect-audit-t">操作审计</text>
              <AppIcon name="chevron-right" :size="14" color="#c9a96e" />
            </view>
          </view>

          <!-- 空态（理论上至少有店主，防御性处理） -->
          <view v-if="members.length === 0" class="empty">
            <text class="empty-t">暂无成员</text>
          </view>

          <!-- 成员卡列表 -->
          <view v-for="m in members" :key="m.id" class="mcard">
            <image v-if="m.avatar" :src="m.avatar" class="mavatar" mode="aspectFill" />
            <view v-else class="mavatar placeholder"><text class="mavatar-ch">{{ firstChar(m.nickname) }}</text></view>
            <view class="minfo">
              <view class="mname-row">
                <text class="mname">{{ m.nickname }}</text>
                <view v-if="m.role === 'OWNER'" class="owner-tag"><text class="owner-tag-t">店主</text></view>
              </view>
              <text class="mrole">{{ roleLine(m) }}</text>
              <view class="mperm">
                <view v-if="m.role === 'OWNER'" class="perm-chip"><text class="perm-chip-t">全部权限</text></view>
                <template v-else>
                  <view v-for="p in m.permissions" :key="p" class="perm-chip">
                    <text class="perm-chip-t">{{ permLabel(p) }}</text>
                  </view>
                  <view v-if="!m.permissions || m.permissions.length === 0" class="perm-chip">
                    <text class="perm-chip-t">无权限</text>
                  </view>
                </template>
              </view>
            </view>
            <view v-if="m.role !== 'OWNER'" class="mdel" @tap="onRemove(m)">
              <text class="mdel-t">移除</text>
            </view>
          </view>

          <view class="note">
            <text class="note-t">移除为危险操作，需二次确认；操作审计记录谁在何时做了什么。</text>
          </view>
        </view>
      </scroll-view>

      <!-- 底部 CTA -->
      <view class="cta-bar" :style="{ paddingBottom: 'calc(14px + ' + safeBottom + 'px)' }">
        <view class="cta" @tap="openAdd">
          <AppIcon name="plus" :size="18" color="#ffffff" />
          <text class="cta-t">添加操作员</text>
        </view>
      </view>
    </template>

    <!-- 态B · 添加操作员半屏弹层 -->
    <view v-if="showAdd" class="mask" @tap="closeAdd">
      <view class="sheet" @tap.stop>
        <view class="sheet-handle" />
        <text class="sheet-t">添加操作员</text>

        <view class="field">
          <text class="field-label">对方平台账号（手机号 / 用户ID）</text>
          <input
            v-model="account"
            class="inp"
            type="text"
            placeholder="请输入已注册平台用户的手机号"
            placeholder-class="inp-ph"
          />
        </view>

        <view class="field">
          <text class="field-label">授予权限</text>
          <view class="perms">
            <view v-for="p in permConfig" :key="p.key" class="perm-item" @tap="togglePerm(p.key)">
              <view class="cbox" :class="{ on: checked[p.key] }">
                <AppIcon v-if="checked[p.key]" name="check" :size="12" color="#ffffff" />
              </view>
              <text class="perm-item-label">{{ p.label }}</text>
              <text v-if="p.sub" class="perm-item-sub">（{{ p.sub }}）</text>
            </view>
          </view>
        </view>

        <view class="sheet-cta" :class="{ disabled: submitting }" @tap="onConfirmAdd">
          <text class="sheet-cta-t">{{ submitting ? '添加中…' : '确认添加' }}</text>
        </view>
      </view>
    </view>

    <!-- 操作审计弹层 -->
    <view v-if="showAudit" class="mask" @tap="closeAudit">
      <view class="sheet audit-sheet" @tap.stop>
        <view class="sheet-handle" />
        <text class="sheet-t">操作审计</text>

        <view v-if="auditLoading" class="audit-state"><text class="audit-state-t">加载中…</text></view>
        <view v-else-if="auditUnavailable" class="audit-state">
          <AppIcon name="info" :size="28" color="#c9a96e" />
          <text class="audit-state-t">审计明细开发中</text>
          <text class="audit-state-sub">后端审计接口就绪后此处将展示操作员的操作记录（谁·何时·做了什么）。</text>
        </view>
        <view v-else-if="audits.length === 0" class="audit-state">
          <text class="audit-state-t">暂无操作记录</text>
        </view>
        <scroll-view v-else scroll-y class="audit-list">
          <view v-for="a in audits" :key="a.id" class="audit-item">
            <view class="audit-dot" />
            <view class="audit-body">
              <view class="audit-top">
                <text class="audit-op">{{ a.operatorName }}</text>
                <text class="audit-time">{{ fmt(a.createdAt) }}</text>
              </view>
              <text class="audit-act">{{ a.action }}<text v-if="a.target"> · {{ a.target }}</text></text>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import {
  merchantBackendApi,
  memberPermConfig,
  memberPermLabel,
  type MerchantMember,
  type MerchantMemberPerm,
  type MerchantMemberAudit,
} from '@/lib/merchant-data'

const statusBarH = ref(20)
const navH = ref(64)
const safeBottom = ref(0)

const loading = ref(true)
const error = ref('')
const members = ref<MerchantMember[]>([])

const permConfig = memberPermConfig

// —— 添加弹层态 ——
const showAdd = ref(false)
const account = ref('')
const submitting = ref(false)
const checked = reactive<Record<MerchantMemberPerm, boolean>>({
  PRODUCT: true,
  ORDER: true,
  REVIEW: false,
  MESSAGE: false,
  SETTLEMENT: false,
})

// —— 审计弹层态 ——
const showAudit = ref(false)
const auditLoading = ref(false)
const auditUnavailable = ref(false)
const audits = ref<MerchantMemberAudit[]>([])

function firstChar(t?: string): string {
  return (t || '·').trim().charAt(0)
}
function permLabel(k: MerchantMemberPerm): string {
  return memberPermLabel(k)
}
function fmt(t?: string | null): string {
  if (!t) return ''
  return String(t).replace('T', ' ').slice(0, 16)
}
function roleLine(m: MerchantMember): string {
  const phone = m.phone ? `平台账号 ${m.phone}` : '平台账号'
  if (m.role === 'OWNER') return phone
  const added = m.createdAt ? ` · 添加于 ${String(m.createdAt).slice(5, 10)}` : ''
  return `${phone}${added}`
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await merchantBackendApi.getMembers()
    // 店主排在最前
    members.value = (res || []).slice().sort((a, b) => (a.role === 'OWNER' ? -1 : b.role === 'OWNER' ? 1 : 0))
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

// —— 添加 ——
function openAdd() {
  account.value = ''
  checked.PRODUCT = true
  checked.ORDER = true
  checked.REVIEW = false
  checked.MESSAGE = false
  checked.SETTLEMENT = false
  showAdd.value = true
}
function closeAdd() {
  if (submitting.value) return
  showAdd.value = false
}
function togglePerm(k: MerchantMemberPerm) {
  checked[k] = !checked[k]
}
async function onConfirmAdd() {
  if (submitting.value) return
  const acc = account.value.trim()
  if (!acc) {
    uni.showToast({ title: '请输入对方平台账号', icon: 'none' })
    return
  }
  const perms = (Object.keys(checked) as MerchantMemberPerm[]).filter((k) => checked[k])
  if (perms.length === 0) {
    uni.showToast({ title: '请至少授予一项权限', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    await merchantBackendApi.addMember(acc, perms)
    uni.showToast({ title: '已添加操作员', icon: 'success' })
    showAdd.value = false
    await load()
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '添加失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

// —— 移除（危险级二次确认） ——
function onRemove(m: MerchantMember) {
  uni.showModal({
    title: '移除操作员',
    content: `确定移除「${m.nickname}」？移除后其将无法以店铺身份操作，已产生的记录仍归属店主。`,
    confirmText: '移除',
    confirmColor: '#c41e3a',
    success: async (r) => {
      if (!r.confirm) return
      try {
        await merchantBackendApi.removeMember(m.id)
        uni.showToast({ title: '已移除', icon: 'success' })
        await load()
      } catch (e) {
        uni.showToast({ title: (e as Error)?.message || '移除失败', icon: 'none' })
      }
    },
  })
}

// —— 审计 ——
async function openAudit() {
  showAudit.value = true
  auditLoading.value = true
  auditUnavailable.value = false
  audits.value = []
  try {
    const res = await merchantBackendApi.getMemberAudit({ page: 1, pageSize: 50 })
    audits.value = res.items || []
  } catch (e) {
    // 后端未实现（404/未找到）→ 诚实占位；其余错误也统一降级为占位说明
    auditUnavailable.value = true
  } finally {
    auditLoading.value = false
  }
}
function closeAudit() {
  showAudit.value = false
}

function onBack() {
  goBack()
}

onLoad(() => {
  try {
    const info = uni.getSystemInfoSync()
    statusBarH.value = info.statusBarHeight || 20
    navH.value = (info.statusBarHeight || 20) + 44
    safeBottom.value = info.safeAreaInsets?.bottom || 0
  } catch (e) {
    statusBarH.value = 20
    navH.value = 64
    safeBottom.value = 0
  }
  load()
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #faf8f5;
}

/* 导航（朱红渐变） */
.nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: linear-gradient(135deg, #c41e3a, #a01830);
}
.nav-inner {
  height: 88rpx;
  display: flex;
  align-items: center;
  padding: 0 24rpx;
}
.nav-back {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-title {
  flex: 1;
  text-align: center;
  font-size: 34rpx;
  font-weight: 700;
  color: #ffffff;
  font-family: 'Songti SC', serif;
}
.nav-ph {
  width: 64rpx;
}

/* 状态区 */
.state {
  padding-top: 300rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
}
.state-t {
  font-size: 27rpx;
  color: #999999;
}
.state-btn {
  padding: 14rpx 44rpx;
  border: 1rpx solid #c41e3a;
  border-radius: 999rpx;
}
.state-btn-t {
  font-size: 27rpx;
  color: #c41e3a;
}

/* 滚动主体 */
.scroll {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
}
.body {
  padding: 30rpx 40rpx 200rpx;
}

/* 说明条 */
.tip {
  background: #fbf7ef;
  border-radius: 28rpx;
  padding: 24rpx 28rpx;
  margin-bottom: 28rpx;
}
.tip-t {
  font-size: 22rpx;
  color: #8a6d2f;
  line-height: 1.7;
}

/* 成员区标题 */
.sect-t {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}
.sect-lft {
  display: flex;
  align-items: center;
  gap: 14rpx;
}
.sect-bar {
  width: 6rpx;
  height: 30rpx;
  background: #c41e3a;
  border-radius: 4rpx;
}
.sect-txt {
  font-size: 30rpx;
  font-weight: 600;
  color: #2c2c2c;
  font-family: 'Songti SC', serif;
}
.sect-audit {
  display: flex;
  align-items: center;
  gap: 4rpx;
}
.sect-audit-t {
  font-size: 24rpx;
  color: #c9a96e;
}

/* 成员卡 */
.mcard {
  background: #ffffff;
  border-radius: 36rpx;
  padding: 28rpx;
  margin-bottom: 24rpx;
  display: flex;
  align-items: center;
  gap: 24rpx;
  box-shadow: 0 4rpx 20rpx rgba(44, 38, 30, 0.04);
}
.mavatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  flex-shrink: 0;
  background: linear-gradient(135deg, #e8dfd3, #d8ccb8);
}
.mavatar.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
}
.mavatar-ch {
  font-size: 38rpx;
  color: #ffffff;
  font-family: 'Songti SC', serif;
}
.minfo {
  flex: 1;
  min-width: 0;
}
.mname-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.mname {
  font-size: 28rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.owner-tag {
  background: #c41e3a;
  border-radius: 8rpx;
  padding: 2rpx 14rpx;
}
.owner-tag-t {
  font-size: 20rpx;
  color: #ffffff;
}
.mrole {
  font-size: 22rpx;
  color: #999999;
  margin-top: 6rpx;
  display: block;
}
.mperm {
  margin-top: 12rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}
.perm-chip {
  border: 1rpx solid #e0d8cc;
  border-radius: 24rpx;
  padding: 2rpx 16rpx;
  background: #fbf7ef;
}
.perm-chip-t {
  font-size: 20rpx;
  color: #8a6d2f;
}
.mdel {
  flex-shrink: 0;
  border: 1rpx solid #c41e3a;
  border-radius: 32rpx;
  padding: 10rpx 28rpx;
  background: #ffffff;
}
.mdel-t {
  font-size: 24rpx;
  color: #c41e3a;
}

.empty {
  padding: 80rpx 0;
  display: flex;
  justify-content: center;
}
.empty-t {
  font-size: 26rpx;
  color: #999999;
}

.note {
  margin-top: 12rpx;
  text-align: center;
}
.note-t {
  font-size: 22rpx;
  color: #c9a96e;
  line-height: 1.6;
}

/* 底部 CTA */
.cta-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 90;
  background: #ffffff;
  border-top: 1rpx solid #edeae4;
  padding: 28rpx 40rpx;
}
.cta {
  height: 92rpx;
  background: #c41e3a;
  border-radius: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  box-shadow: 0 8rpx 30rpx rgba(196, 30, 58, 0.25);
}
.cta-t {
  font-size: 30rpx;
  font-weight: 600;
  color: #ffffff;
}

/* 遮罩 + 半屏弹层 */
.mask {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: flex-end;
}
.sheet {
  width: 100%;
  background: #faf8f5;
  border-radius: 48rpx 48rpx 0 0;
  padding: 20rpx 40rpx 60rpx;
}
.sheet-handle {
  width: 80rpx;
  height: 8rpx;
  background: #dddddd;
  border-radius: 4rpx;
  margin: 0 auto 32rpx;
}
.sheet-t {
  display: block;
  text-align: center;
  font-size: 34rpx;
  font-weight: 700;
  color: #2c2c2c;
  font-family: 'Songti SC', serif;
  margin-bottom: 36rpx;
}

.field {
  margin-bottom: 32rpx;
}
.field-label {
  display: block;
  font-size: 24rpx;
  color: #6e6e73;
  margin-bottom: 12rpx;
}
.inp {
  background: #ffffff;
  border: 1rpx solid #e0d8cc;
  border-radius: 24rpx;
  height: 88rpx;
  padding: 0 28rpx;
  font-size: 26rpx;
  color: #2c2c2c;
  box-sizing: border-box;
}
.inp-ph {
  color: #999999;
  font-size: 26rpx;
}

.perms {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.perm-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.cbox {
  width: 40rpx;
  height: 40rpx;
  border: 3rpx solid #c9a96e;
  border-radius: 12rpx;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cbox.on {
  background: #c41e3a;
  border-color: #c41e3a;
}
.perm-item-label {
  font-size: 26rpx;
  color: #2c2c2c;
}
.perm-item-sub {
  font-size: 22rpx;
  color: #999999;
}

.sheet-cta {
  margin-top: 40rpx;
  height: 92rpx;
  background: #c41e3a;
  border-radius: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sheet-cta.disabled {
  opacity: 0.6;
}
.sheet-cta-t {
  font-size: 30rpx;
  font-weight: 600;
  color: #ffffff;
}

/* 审计弹层 */
.audit-sheet {
  max-height: 80vh;
}
.audit-state {
  padding: 80rpx 20rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
}
.audit-state-t {
  font-size: 28rpx;
  color: #6e6e73;
}
.audit-state-sub {
  font-size: 22rpx;
  color: #999999;
  text-align: center;
  line-height: 1.6;
  padding: 0 40rpx;
}
.audit-list {
  max-height: 56vh;
}
.audit-item {
  display: flex;
  gap: 18rpx;
  padding: 22rpx 0;
  border-bottom: 1rpx solid #edeae4;
}
.audit-dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  background: #c41e3a;
  margin-top: 10rpx;
  flex-shrink: 0;
}
.audit-body {
  flex: 1;
  min-width: 0;
}
.audit-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.audit-op {
  font-size: 26rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.audit-time {
  font-size: 22rpx;
  color: #999999;
}
.audit-act {
  font-size: 24rpx;
  color: #6e6e73;
  margin-top: 8rpx;
  display: block;
  line-height: 1.5;
}
</style>
