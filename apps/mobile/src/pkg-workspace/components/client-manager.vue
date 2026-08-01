<script setup lang="ts">
/**
 * 客户管理（对应 V0 client-manager.tsx）
 *
 * 🔴 直接复用 CRM 的 ClientBook（/crm/clients），**不另建客户表**：
 * 那边已有 ownerId 隔离、生辰/手机 AES-256-GCM 加密、RFM 分层、服务记录、回访提醒。
 * 再开一张就是两份客户数据，注定不一致。
 *
 * 🔴 V0 的客户卡上有「日主/喜用神/忌神/五行占比」——这些**不落库**，也不在这里算：
 * 它们是排盘引擎的产物，引擎一升级库里的旧值就成了错值。这里只存生辰，
 * 想看命理就点「用八字看」跳真工具页现算——全平台只有一个算命的地方。
 *
 * 合规：客户档案存的是**他人**的生辰与电话，属敏感个人信息。列表只显示脱敏手机，
 * 详情才解密；CRM 侧不提供任何导出端点（防数据贩卖）。
 */
import { ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useOverlayScrollLock } from '@/composables/use-overlay-scroll-lock'
import AppIcon from '@/components/common/app-icon.vue'
import PaperCard from '@/components/paipan/paper-card.vue'
import { wsApi } from '../lib/workspace-api'

const loading = ref(true)
const failed = ref(false)
const list = ref<any[]>([])
const keyword = ref('')

/** 详情弹层（进来才解密生辰/手机） */
const detail = ref<any>(null)
const detailLoading = ref(false)

/** 建档/编辑弹层 */
const formOpen = ref(false)
useOverlayScrollLock(() => formOpen.value || Boolean(detail.value))
const editingId = ref('')
const fName = ref('')
const fPhone = ref('')
const fBirth = ref('')
const fBirthPlace = ref('')
const fGender = ref('')
const fTags = ref('')
const fNotes = ref('')
const saving = ref(false)

const TIER_LABEL: Record<string, string> = {
  VIP: '重点客户', ACTIVE: '活跃', SLEEPING: '沉睡', NEW: '新客', LOST: '流失',
}

async function load() {
  loading.value = true
  failed.value = false
  try {
    const res = await wsApi.listClients({ keyword: keyword.value || undefined })
    list.value = res?.items ?? res?.list ?? (Array.isArray(res) ? res : [])
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
}

onMounted(load)
onShow(() => {
  if (!loading.value) load()
})

async function openDetail(id: string) {
  detailLoading.value = true
  detail.value = { id }
  try {
    detail.value = await wsApi.getClient(id)
  } catch (e: any) {
    detail.value = null
    uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
  } finally {
    detailLoading.value = false
  }
}

function openCreate() {
  editingId.value = ''
  fName.value = ''
  fPhone.value = ''
  fBirth.value = ''
  fBirthPlace.value = ''
  fGender.value = ''
  fTags.value = ''
  fNotes.value = ''
  formOpen.value = true
}

function openEdit(c: any) {
  editingId.value = c.id
  fName.value = c.name || ''
  fPhone.value = c.phone || ''
  fBirth.value = c.birth || ''
  fBirthPlace.value = c.birthPlace || ''
  fGender.value = c.gender || ''
  fTags.value = (c.tags || []).join('、')
  fNotes.value = c.notes || ''
  detail.value = null
  formOpen.value = true
}

async function saveClient() {
  if (!fName.value.trim()) {
    uni.showToast({ title: '请填客户称呼', icon: 'none' })
    return
  }
  // 后端校验：生辰须为 YYYY-MM-DD 或 YYYY-MM-DD HH:mm，先在前端拦一道，省一次往返
  if (fBirth.value && !/^\d{4}-\d{2}-\d{2}( \d{2}:\d{2})?$/.test(fBirth.value.trim())) {
    uni.showToast({ title: '生辰格式：1985-07-05 或 1985-07-05 06:12', icon: 'none' })
    return
  }
  saving.value = true
  const payload: Record<string, unknown> = {
    name: fName.value.trim(),
    phone: fPhone.value.trim() || undefined,
    birth: fBirth.value.trim() || undefined,
    birthPlace: fBirthPlace.value.trim() || undefined,
    gender: fGender.value || undefined,
    tags: fTags.value ? fTags.value.split(/[、,，]/).map((t) => t.trim()).filter(Boolean) : [],
    notes: fNotes.value.trim() || undefined,
  }
  try {
    if (editingId.value) await wsApi.updateClient(editingId.value, payload)
    else await wsApi.createClient(payload)
    formOpen.value = false
    await load()
    uni.showToast({ title: '已保存', icon: 'success' })
  } catch (e: any) {
    uni.showToast({ title: e?.message || '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

function confirmDelete(c: any) {
  uni.showModal({
    title: '删除客户档案',
    content: `确定删除「${c.name}」？档案与服务记录将一并硬删，不可恢复。`,
    success: async (r) => {
      if (!r.confirm) return
      try {
        await wsApi.deleteClient(c.id)
        detail.value = null
        await load()
      } catch (e: any) {
        uni.showToast({ title: e?.message || '删除失败', icon: 'none' })
      }
    },
  })
}

/** 用客户的生辰去八字工具页现算（不在这里算，全平台只有一个算命的地方） */
function goPaipan(c: any) {
  if (!c.birth) {
    uni.showToast({ title: '该客户还没填生辰', icon: 'none' })
    return
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})(?: (\d{2}):(\d{2}))?$/.exec(c.birth)
  if (!m) {
    uni.navigateTo({ url: '/pkg-paipan/bazi/index' })
    return
  }
  const q = [
    `name=${encodeURIComponent(c.name || '')}`,
    `year=${m[1]}`,
    `month=${Number(m[2])}`,
    `day=${Number(m[3])}`,
    `hour=${Number(m[4] ?? 0)}`,
    `minute=${Number(m[5] ?? 0)}`,
    c.gender ? `gender=${c.gender === 'female' ? '女' : '男'}` : '',
    c.birthPlace ? `city=${encodeURIComponent(c.birthPlace)}` : '',
  ]
    .filter(Boolean)
    .join('&')
  detail.value = null
  // 🔴 原来写的是 /pkg-paipan/paipan/bazi（多了一层 paipan）→ 页面不存在，
  //    工作台里点客户「去排盘」直接跳不动。真实页是 /pkg-paipan/bazi/index。
  uni.navigateTo({ url: `/pkg-paipan/bazi/index?${q}` })
}

function dateText(iso?: string | null): string {
  if (!iso) return '从未服务'
  const d = new Date(iso)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}
</script>

<template>
  <view class="cm">
    <!-- 搜索 + 建档 -->
    <view class="cm-bar">
      <view class="cm-search">
        <AppIcon name="search" :size="16" color="#B8AA9A" />
        <input
          v-model="keyword"
          class="cm-search-input"
          placeholder="搜客户"
          placeholder-class="cm-ph"
          confirm-type="search"
          @confirm="load"
        />
      </view>
      <view class="cm-add" @tap="openCreate">
        <AppIcon name="user-plus" :size="16" color="#fff" />
        <text class="cm-add-txt">建档</text>
      </view>
    </view>

    <view v-if="loading" class="cm-skeleton" />

    <PaperCard v-else-if="!list.length" padding="lg">
      <view class="cm-empty">
        <AppIcon name="users" :size="40" color="#D5C9B8" />
        <text class="cm-empty-txt">还没有客户档案</text>
        <text class="cm-empty-sub">建档后，客户的生日与流年会自动生成回访提醒</text>
      </view>
    </PaperCard>

    <PaperCard v-else padding="none">
      <view
        v-for="(c, i) in list"
        :key="c.id"
        class="cm-item"
        :class="{ 'cm-item--line': i !== list.length - 1 }"
        @tap="openDetail(c.id)"
      >
        <view class="cm-avatar">{{ (c.name || '客').slice(0, 1) }}</view>
        <view class="cm-info">
          <view class="cm-row">
            <text class="cm-name">{{ c.name }}</text>
            <text v-if="c.tier" class="cm-tier" :class="`cm-tier--${c.tier}`">{{ TIER_LABEL[c.tier] || c.tier }}</text>
          </view>
          <view class="cm-meta">
            <text class="cm-meta-txt">服务 {{ c.serveCount || 0 }} 次</text>
            <text class="cm-meta-txt">{{ dateText(c.lastServeAt) }}</text>
            <text v-if="c.phoneMasked" class="cm-meta-txt">{{ c.phoneMasked }}</text>
          </view>
          <view v-if="c.tags?.length" class="cm-tags">
            <text v-for="t in c.tags" :key="t" class="cm-tag">{{ t }}</text>
          </view>
        </view>
        <AppIcon name="chevron-right" :size="16" color="#B8AA9A" />
      </view>
    </PaperCard>

    <view v-if="failed" class="cm-failed" @tap="load">
      <text class="cm-failed-txt">加载失败，点击重试</text>
    </view>

    <!-- 客户详情 -->
    <view v-if="detail" class="cm-mask" @tap="detail = null" @touchmove.self.prevent>
      <view class="cm-sheet" @tap.stop @touchmove.stop>
        <view v-if="detailLoading" class="cm-sheet-loading">
          <text class="cm-sheet-loading-txt">载入中…</text>
        </view>
        <template v-else>
          <view class="cm-detail-head">
            <view class="cm-avatar cm-avatar--lg">{{ (detail.name || '客').slice(0, 1) }}</view>
            <view class="cm-detail-info">
              <text class="cm-detail-name">{{ detail.name }}</text>
              <text class="cm-detail-sub">
                服务 {{ detail.serveCount || 0 }} 次 · 累计 ¥{{ detail.totalSpend || 0 }}
              </text>
            </view>
          </view>

          <view class="cm-fields">
            <view v-if="detail.phone" class="cm-field">
              <text class="cm-field-k">电话</text>
              <text class="cm-field-v">{{ detail.phone }}</text>
            </view>
            <view class="cm-field">
              <text class="cm-field-k">生辰</text>
              <text class="cm-field-v">{{ detail.birth || '未填' }}</text>
            </view>
            <view v-if="detail.birthPlace" class="cm-field">
              <text class="cm-field-k">出生地</text>
              <text class="cm-field-v">{{ detail.birthPlace }}</text>
            </view>
            <view v-if="detail.notes" class="cm-field">
              <text class="cm-field-k">备注</text>
              <text class="cm-field-v">{{ detail.notes }}</text>
            </view>
          </view>

          <!-- 命理不在这里算：跳真工具页 -->
          <view class="cm-btn cm-btn--primary" @tap="goPaipan(detail)">
            <AppIcon name="compass" :size="16" color="#fff" />
            <text class="cm-btn-txt cm-btn-txt--primary">用八字排盘看这位客户</text>
          </view>

          <view class="cm-ops">
            <view class="cm-btn cm-btn--ghost" @tap="openEdit(detail)">
              <text class="cm-btn-txt cm-btn-txt--ghost">编辑</text>
            </view>
            <view class="cm-btn cm-btn--ghost" @tap="confirmDelete(detail)">
              <text class="cm-btn-txt cm-btn-txt--ghost">删除</text>
            </view>
          </view>

          <!-- 服务记录 -->
          <view v-if="detail.serveLogs?.length" class="cm-logs">
            <text class="cm-logs-title">服务记录</text>
            <view v-for="l in detail.serveLogs" :key="l.id" class="cm-log">
              <text class="cm-log-type">{{ l.type }}</text>
              <text class="cm-log-note">{{ l.note || '—' }}</text>
              <text v-if="l.amount" class="cm-log-amount">¥{{ l.amount }}</text>
            </view>
          </view>
        </template>
      </view>
    </view>

    <!-- 建档 / 编辑 -->
    <view v-if="formOpen" class="cm-mask" @tap="formOpen = false" @touchmove.self.prevent>
      <view class="cm-sheet" @tap.stop @touchmove.stop>
        <text class="cm-sheet-title">{{ editingId ? '编辑客户' : '新建客户档案' }}</text>

        <text class="cm-label">称呼 *</text>
        <input v-model="fName" class="cm-input" placeholder="如：陈女士" placeholder-class="cm-ph" />

        <text class="cm-label">性别</text>
        <view class="cm-chips">
          <view
            v-for="g in [{ k: 'male', l: '男' }, { k: 'female', l: '女' }]"
            :key="g.k"
            class="cm-chip"
            :class="{ 'cm-chip--on': fGender === g.k }"
            @tap="fGender = fGender === g.k ? '' : g.k"
          >
            <text class="cm-chip-txt" :class="{ 'cm-chip-txt--on': fGender === g.k }">{{ g.l }}</text>
          </view>
        </view>

        <text class="cm-label">电话</text>
        <input v-model="fPhone" class="cm-input" type="number" placeholder="选填" placeholder-class="cm-ph" />

        <text class="cm-label">生辰（排盘与生日提醒用）</text>
        <input v-model="fBirth" class="cm-input" placeholder="1985-07-05 06:12" placeholder-class="cm-ph" />

        <text class="cm-label">出生地（真太阳时校正用）</text>
        <input v-model="fBirthPlace" class="cm-input" placeholder="如：杭州" placeholder-class="cm-ph" />

        <text class="cm-label">标签（顿号分隔）</text>
        <input v-model="fTags" class="cm-input" placeholder="如：事业、复购" placeholder-class="cm-ph" />

        <text class="cm-label">私人备注</text>
        <textarea v-model="fNotes" class="cm-textarea" placeholder="只有你能看到" placeholder-class="cm-ph" />

        <view class="cm-privacy">
          <AppIcon name="lock" :size="14" color="#9A8C7E" />
          <text class="cm-privacy-txt">
            电话与生辰加密存储，仅你可见。请在征得客户同意后录入，本平台不提供任何客户名单导出。
          </text>
        </view>

        <view class="cm-btn cm-btn--primary" @tap="saveClient">
          <text class="cm-btn-txt cm-btn-txt--primary">{{ saving ? '保存中…' : '保存' }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.cm {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  padding: 24rpx 24rpx 48rpx;
}

.cm-bar {
  display: flex;
  gap: 16rpx;
}

.cm-search {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10rpx;
  height: 76rpx;
  padding: 0 20rpx;
  border-radius: 38rpx;
  background: #FDFAF4;
  border: 1rpx solid rgba(58, 42, 30, 0.1);
}

.cm-search-input {
  flex: 1;
  height: 76rpx;
  font-size: 26rpx;
  color: #3A2A1E;
}

.cm-add {
  display: flex;
  align-items: center;
  gap: 6rpx;
  height: 76rpx;
  padding: 0 24rpx;
  border-radius: 38rpx;
  background: #C41E3A;
  flex-shrink: 0;
}

.cm-add-txt {
  font-size: 26rpx;
  font-weight: 600;
  color: #fff;
}

/* 列表 */
.cm-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 24rpx;
}

.cm-item--line {
  border-bottom: 1rpx solid rgba(58, 42, 30, 0.08);
}

.cm-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80rpx;
  height: 80rpx;
  flex-shrink: 0;
  border-radius: 50%;
  background: rgba(196, 30, 58, 0.08);
  font-size: 30rpx;
  font-weight: 700;
  color: #C41E3A;
}

.cm-avatar--lg {
  width: 104rpx;
  height: 104rpx;
  font-size: 40rpx;
}

.cm-info {
  flex: 1;
  min-width: 0;
}

.cm-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.cm-name {
  font-size: 28rpx;
  font-weight: 700;
  color: #3A2A1E;
}

.cm-tier {
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  font-size: 18rpx;
  background: rgba(154, 140, 126, 0.14);
  color: #7A6C5E;
}

.cm-tier--VIP {
  background: rgba(184, 134, 11, 0.14);
  color: #B8860B;
}

.cm-tier--ACTIVE {
  background: rgba(45, 122, 78, 0.12);
  color: #2D7A4E;
}

.cm-tier--LOST {
  background: rgba(196, 30, 58, 0.08);
  color: #C41E3A;
}

.cm-meta {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 6rpx;
}

.cm-meta-txt {
  font-size: 21rpx;
  color: #9A8C7E;
}

.cm-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-top: 8rpx;
}

.cm-tag {
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  background: rgba(196, 30, 58, 0.06);
  font-size: 18rpx;
  color: #C41E3A;
}

/* 空/骨架/失败 */
.cm-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  padding: 56rpx 24rpx;
}

.cm-empty-txt {
  font-size: 28rpx;
  color: #7A6C5E;
}

.cm-empty-sub {
  font-size: 22rpx;
  color: #B8AA9A;
  text-align: center;
}

.cm-skeleton {
  height: 400rpx;
  border-radius: 16rpx;
  background: rgba(154, 140, 126, 0.1);
}

.cm-failed {
  padding: 24rpx;
  text-align: center;
}

.cm-failed-txt {
  font-size: 24rpx;
  color: #C41E3A;
}

/* 弹层 */
.cm-mask {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: flex-end;
}

.cm-sheet {
  width: 100%;
  max-height: 86vh;
  overflow-y: auto;
  padding: 32rpx 32rpx calc(48rpx + env(safe-area-inset-bottom));
  border-radius: 24rpx 24rpx 0 0;
  background: #FDFAF4;
}

.cm-sheet-loading {
  padding: 80rpx;
  text-align: center;
}

.cm-sheet-loading-txt {
  font-size: 26rpx;
  color: #9A8C7E;
}

.cm-sheet-title {
  display: block;
  margin-bottom: 8rpx;
  font-size: 32rpx;
  font-weight: 700;
  color: #3A2A1E;
  text-align: center;
}

.cm-detail-head {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.cm-detail-name {
  display: block;
  font-size: 34rpx;
  font-weight: 700;
  color: #3A2A1E;
}

.cm-detail-sub {
  display: block;
  margin-top: 4rpx;
  font-size: 24rpx;
  color: #9A8C7E;
}

.cm-fields {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-top: 28rpx;
  padding: 24rpx;
  border-radius: 12rpx;
  background: rgba(154, 140, 126, 0.07);
}

.cm-field {
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
}

.cm-field-k {
  width: 100rpx;
  flex-shrink: 0;
  font-size: 24rpx;
  color: #9A8C7E;
}

.cm-field-v {
  flex: 1;
  font-size: 25rpx;
  line-height: 1.6;
  color: #3A2A1E;
}

.cm-ops {
  display: flex;
  gap: 16rpx;
  margin-top: 16rpx;
}

.cm-ops .cm-btn {
  flex: 1;
  margin-top: 0;
}

.cm-logs {
  margin-top: 32rpx;
}

.cm-logs-title {
  display: block;
  margin-bottom: 16rpx;
  font-size: 26rpx;
  font-weight: 700;
  color: #3A2A1E;
}

.cm-log {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 0;
  border-bottom: 1rpx solid rgba(58, 42, 30, 0.06);
}

.cm-log-type {
  width: 100rpx;
  flex-shrink: 0;
  font-size: 22rpx;
  color: #C41E3A;
}

.cm-log-note {
  flex: 1;
  font-size: 24rpx;
  color: #3A2A1E;
}

.cm-log-amount {
  flex-shrink: 0;
  font-size: 24rpx;
  font-weight: 700;
  color: #3A2A1E;
}

/* 表单 */
.cm-label {
  display: block;
  margin: 24rpx 0 12rpx;
  font-size: 22rpx;
  color: #9A8C7E;
}

.cm-input {
  height: 80rpx;
  padding: 0 20rpx;
  border: 1rpx solid rgba(58, 42, 30, 0.14);
  border-radius: 12rpx;
  background: #fff;
  font-size: 26rpx;
  color: #3A2A1E;
}

.cm-textarea {
  width: 100%;
  height: 140rpx;
  padding: 20rpx;
  box-sizing: border-box;
  border: 1rpx solid rgba(58, 42, 30, 0.14);
  border-radius: 12rpx;
  background: #fff;
  font-size: 26rpx;
  line-height: 1.6;
  color: #3A2A1E;
}

.cm-ph {
  color: #C4B8A8;
}

.cm-chips {
  display: flex;
  gap: 12rpx;
}

.cm-chip {
  padding: 10rpx 28rpx;
  border: 1rpx solid rgba(58, 42, 30, 0.14);
  border-radius: 30rpx;
}

.cm-chip--on {
  border-color: #C41E3A;
  background: #C41E3A;
}

.cm-chip-txt {
  font-size: 24rpx;
  color: #3A2A1E;
}

.cm-chip-txt--on {
  color: #fff;
}

.cm-privacy {
  display: flex;
  align-items: flex-start;
  gap: 10rpx;
  margin-top: 24rpx;
  padding: 16rpx;
  border-radius: 12rpx;
  background: rgba(154, 140, 126, 0.08);
}

.cm-privacy-txt {
  flex: 1;
  font-size: 21rpx;
  line-height: 1.6;
  color: #7A6C5E;
}

/* 按钮 */
.cm-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  height: 88rpx;
  margin-top: 28rpx;
  border-radius: 12rpx;
}

.cm-btn--primary {
  background: #C41E3A;
}

.cm-btn--ghost {
  border: 1rpx solid rgba(196, 30, 58, 0.4);
}

.cm-btn-txt {
  font-size: 26rpx;
  font-weight: 600;
}

.cm-btn-txt--primary {
  color: #fff;
}

.cm-btn-txt--ghost {
  color: #C41E3A;
}
</style>
