<!--
  收益分配设置（从原型 app/circles/[id]/distribution/page.tsx 高保真迁移）
  分配方案/嘉宾个性化双Tab + 方案编辑弹窗(slider比例+设为默认) + 帮助说明弹窗
-->
<template>
  <view class="page">
    <!-- Header -->
    <view class="hdr" :style="{ paddingTop: statusBarH + 'px' }">
      <view class="hdr-bar">
        <view class="hdr-btn" @tap="goBack"><app-icon name="arrow-left" :size="44" color="#1A1A1A" /></view>
        <text class="hdr-title">收益分配设置</text>
        <view class="hdr-btn" @tap="showHelp = true"><app-icon name="help-circle" :size="36" color="#999999" /></view>
      </view>
      <view class="tabs">
        <view class="tab" :class="{ on: activeTab === 'plans' }" @tap="activeTab = 'plans'">分配方案</view>
        <view class="tab" :class="{ on: activeTab === 'guests' }" @tap="activeTab = 'guests'">嘉宾个性化</view>
      </view>
    </view>

    <scroll-view scroll-y class="scroll">
      <!-- 说明卡片 -->
      <view class="info-card">
        <app-icon name="info" :size="32" color="#D97706" />
        <view class="info-text">
          <text class="info-title">分配说明</text>
          <text class="info-desc">收益分配顺序：平台抽成 → 圈子收益 → 创作者（嘉宾/老师）收益。您可以为不同内容类型设置不同方案，也可以为特定嘉宾设置个性化分成比例。</text>
        </view>
      </view>

      <!-- 分配方案列表 -->
      <view v-if="activeTab === 'plans'" class="list">
        <view v-for="plan in plans" :key="plan.id" class="plan-card">
          <view class="plan-head">
            <view class="plan-info">
              <view class="plan-name-row">
                <text class="plan-name">{{ plan.name }}</text>
                <text v-if="plan.isDefault" class="plan-default">默认</text>
              </view>
              <text class="plan-desc">{{ plan.description }}</text>
            </view>
            <view class="plan-edit" @tap="openEdit(plan.id)"><app-icon name="edit" :size="30" color="#999999" /></view>
          </view>

          <view class="plan-types">
            <view v-for="type in plan.contentTypes" :key="type" class="type-chip" :style="chipStyle(type)">
              <app-icon :name="typeIcon(type)" :size="22" :color="typeColor(type)" />
              <text class="type-chip-t" :style="{ color: typeColor(type) }">{{ typeLabel(type) }}</text>
            </view>
          </view>

          <view class="plan-ratio">
            <view class="ratio-bar">
              <view class="ratio-seg" :style="{ width: plan.rules.platform + '%', background: '#999999' }"><text v-if="plan.rules.platform > 8" class="ratio-seg-t">{{ plan.rules.platform }}%</text></view>
              <view class="ratio-seg" :style="{ width: plan.rules.circle + '%', background: '#C9A96E' }"><text class="ratio-seg-t">{{ plan.rules.circle }}%</text></view>
              <view class="ratio-seg" :style="{ width: plan.rules.creator + '%', background: '#C41E3A' }"><text class="ratio-seg-t">{{ plan.rules.creator }}%</text></view>
            </view>
            <view class="ratio-legend">
              <view class="legend"><view class="dot" style="background:#999999" /><text class="legend-t">平台 {{ plan.rules.platform }}%</text></view>
              <view class="legend"><view class="dot" style="background:#C9A96E" /><text class="legend-t">圈子 {{ plan.rules.circle }}%</text></view>
              <view class="legend"><view class="dot" style="background:#C41E3A" /><text class="legend-t">创作者 {{ plan.rules.creator }}%</text></view>
            </view>
          </view>
        </view>

        <view v-if="plans.length === 0" class="empty">
          <app-icon name="pie-chart" :size="72" color="#D9D4C8" />
          <text class="empty-t">还没有分配方案</text>
          <text class="empty-sub">点击下方按钮创建你的第一个收益分配方案</text>
        </view>

        <view class="add-btn" @tap="openCreate"><app-icon name="plus" :size="36" color="#999999" /><text class="add-btn-t">添加分配方案</text></view>
      </view>

      <!-- 嘉宾个性化 -->
      <view v-else class="list">
        <text class="guests-hint">为特定嘉宾/老师设置个性化分成比例，覆盖默认方案</text>
        <view v-for="g in guestOverrides" :key="g.guestId" class="guest-card">
          <image lazy-load class="guest-avatar" :src="g.avatar" mode="aspectFill" />
          <view class="guest-info">
            <text class="guest-name">{{ g.guestName }}</text>
            <view class="guest-types">
              <text v-for="type in g.contentTypes" :key="type" class="guest-type" :style="chipStyle(type)">{{ typeLabel(type) }}</text>
            </view>
          </view>
          <view class="guest-share">
            <text class="guest-pct">{{ g.sharePercent }}%</text>
            <text class="guest-share-t">创作者分成</text>
          </view>
          <app-icon name="chevron-right" :size="34" color="#999999" />
        </view>
        <view v-if="guestOverrides.length === 0" class="empty">
          <app-icon name="users" :size="72" color="#D9D4C8" />
          <text class="empty-t">暂无个性化分成设置</text>
          <text class="empty-sub">所有嘉宾使用默认分配方案</text>
        </view>
        <view class="add-btn" @tap="toastComingSoon"><app-icon name="plus" :size="36" color="#999999" /><text class="add-btn-t">添加个性化分成</text></view>
      </view>
      <view style="height: 40rpx;" />
    </scroll-view>

    <!-- 创建/编辑方案弹窗 -->
    <view v-if="showEditor" class="mask" @tap="closeEditor">
      <view class="sheet" @tap.stop>
        <view class="sheet-hdr">
          <text class="sheet-cancel" @tap="closeEditor">取消</text>
          <text class="sheet-title">{{ editingId ? '编辑方案' : '创建方案' }}</text>
          <text class="sheet-save" @tap="handleSave">保存</text>
        </view>
        <scroll-view scroll-y class="sheet-body">
          <view v-if="error" class="err"><app-icon name="alert-circle" :size="28" color="#DC2626" /><text class="err-t">{{ error }}</text></view>

          <view class="field">
            <text class="field-label">方案名称</text>
            <input v-model="f.name" class="field-input" placeholder="如：课程专属方案" @input="error = ''" />
          </view>
          <view class="field">
            <text class="field-label">方案描述（可选）</text>
            <input v-model="f.description" class="field-input" placeholder="简要描述此方案的用途" />
          </view>

          <view class="field">
            <text class="field-label">适用内容类型</text>
            <view class="type-picker">
              <view v-for="t in contentTypes" :key="t.key" class="type-opt" :class="{ on: f.selectedTypes.includes(t.key) }" :style="f.selectedTypes.includes(t.key) ? { background: t.color } : {}" @tap="toggleType(t.key)">
                <app-icon :name="t.icon" :size="26" :color="f.selectedTypes.includes(t.key) ? '#ffffff' : '#999999'" />
                <text class="type-opt-t" :style="{ color: f.selectedTypes.includes(t.key) ? '#ffffff' : '#999999' }">{{ t.label }}</text>
              </view>
            </view>
          </view>

          <view class="field">
            <text class="field-label">分配比例</text>
            <view class="slider-row">
              <view class="slider-head"><text class="slider-name">平台抽成</text><text class="slider-val">{{ f.platform }}%</text></view>
              <slider :value="f.platform" :min="5" :max="30" activeColor="#999999" block-size="20" @changing="onPlatform" @change="onPlatform" />
              <text class="slider-hint">平台技术服务费，固定比例5%-30%</text>
            </view>
            <view class="slider-row">
              <view class="slider-head"><text class="slider-name">圈子收益</text><text class="slider-val gold">{{ f.circle }}%</text></view>
              <slider :value="f.circle" :min="0" :max="50" activeColor="#C9A96E" block-size="20" @changing="onCircle" @change="onCircle" />
              <text class="slider-hint">归圈主所有，用于圈子运营</text>
            </view>
            <view class="slider-row">
              <view class="slider-head"><text class="slider-name">创作者收益</text><text class="slider-val red">{{ f.creator }}%</text></view>
              <view class="creator-bar"><view class="creator-fill" :style="{ width: f.creator + '%' }" /></view>
              <text class="slider-hint">归内容创作者（嘉宾/老师）所有</text>
            </view>
            <view class="total" :class="total === 100 ? 'ok' : 'bad'">
              <text class="total-label">比例总和</text>
              <text class="total-val">{{ total }}% {{ total === 100 ? '✓' : '(需为100%)' }}</text>
            </view>
          </view>

          <view class="default-row">
            <view>
              <text class="default-name">设为默认方案</text>
              <text class="default-sub">新内容将自动使用此方案</text>
            </view>
            <view class="switch" :class="{ on: f.isDefault }" @tap="f.isDefault = !f.isDefault"><view class="switch-knob" /></view>
          </view>
          <view style="height: 20rpx;" />
        </scroll-view>
      </view>
    </view>

    <!-- 帮助说明弹窗 -->
    <view v-if="showHelp" class="mask center" @tap="showHelp = false">
      <view class="help" @tap.stop>
        <view class="help-hdr"><text class="help-title">收益分配说明</text><text class="help-close" @tap="showHelp = false">关闭</text></view>
        <scroll-view scroll-y class="help-body">
          <view class="help-sec">
            <text class="help-h">分配流程</text>
            <text class="help-p">1. 用户付费购买内容</text>
            <text class="help-p">2. 平台扣除技术服务费</text>
            <text class="help-p">3. 圈子获得运营收益</text>
            <text class="help-p">4. 创作者获得内容收益</text>
          </view>
          <view class="help-sec">
            <text class="help-h">角色说明</text>
            <text class="help-p"><text class="help-b">平台</text>：提供技术服务，收取固定比例服务费</text>
            <text class="help-p"><text class="help-b">圈子</text>：圈主获得的运营收益，用于圈子建设</text>
            <text class="help-p"><text class="help-b">创作者</text>：内容创作者（嘉宾/老师）的收益</text>
          </view>
          <view class="help-sec">
            <text class="help-h">注意事项</text>
            <text class="help-p">• 分配比例总和必须为100%</text>
            <text class="help-p">• 可为不同内容类型设置不同方案</text>
            <text class="help-p">• 可为特定嘉宾设置个性化比例</text>
            <text class="help-p">• 修改方案不影响已结算的收益</text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 收益分配设置页
 */
import { ref, reactive, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, toastComingSoon } from '@/utils/router'

const statusBarH = uni.getSystemInfoSync().statusBarHeight || 20

const contentTypes = [
  { key: 'article', label: '文章', icon: 'file-text', color: '#4A90D9' },
  { key: 'course', label: '课程', icon: 'book-open', color: '#C9A96E' },
  { key: 'live', label: '直播', icon: 'radio', color: '#C41E3A' },
  { key: 'qa', label: '问答', icon: 'message-circle', color: '#10B981' },
]

interface Plan { id: string; name: string; isDefault: boolean; description: string; rules: { platform: number; circle: number; creator: number }; contentTypes: string[]; createdAt: string }
interface GuestOverride { guestId: string; guestName: string; avatar: string; sharePercent: number; contentTypes: string[] }

// 分配方案属圈主自定义配置，暂无「方案列表」后端端点，故起始为空 —— 圈主通过下方「添加分配方案」自建。
// 此前内联的假方案（含过期 createdAt 2024-xx）与假嘉宾（张玄风/李易安）已移除，杜绝穿帮。
const plans = ref<Plan[]>([])

const guestOverrides = ref<GuestOverride[]>([])

const activeTab = ref<'plans' | 'guests'>('plans')
const showHelp = ref(false)
const showEditor = ref(false)
const editingId = ref<string | null>(null)
const error = ref('')

const f = reactive({ name: '', description: '', isDefault: false, selectedTypes: ['article'] as string[], platform: 10, circle: 20, creator: 70 })
const total = computed(() => f.platform + f.circle + f.creator)

function typeCfg(key: string) { return contentTypes.find(t => t.key === key) }
function typeIcon(key: string) { return typeCfg(key)?.icon || 'file-text' }
function typeLabel(key: string) { return typeCfg(key)?.label || key }
function typeColor(key: string) { return typeCfg(key)?.color || '#999999' }
function chipStyle(key: string) { const c = typeColor(key); return { backgroundColor: c + '26' } }

function resetForm(p?: Plan) {
  f.name = p?.name || ''
  f.description = p?.description || ''
  f.isDefault = p?.isDefault || false
  f.selectedTypes = p ? [...p.contentTypes] : ['article']
  f.platform = p?.rules.platform ?? 10
  f.circle = p?.rules.circle ?? 20
  f.creator = p?.rules.creator ?? 70
  error.value = ''
}
function openCreate() { editingId.value = null; resetForm(); showEditor.value = true }
function openEdit(id: string) { editingId.value = id; resetForm(plans.value.find(p => p.id === id)); showEditor.value = true }
function closeEditor() { showEditor.value = false; editingId.value = null }

function toggleType(key: string) {
  const i = f.selectedTypes.indexOf(key)
  if (i >= 0) f.selectedTypes.splice(i, 1)
  else f.selectedTypes.push(key)
  error.value = ''
}
function adjustCreator() { const r = 100 - f.platform - f.circle; if (r >= 0 && r <= 100) f.creator = r }
function onPlatform(e: { detail: { value: number } }) { f.platform = e.detail.value; adjustCreator(); error.value = '' }
function onCircle(e: { detail: { value: number } }) { f.circle = e.detail.value; adjustCreator(); error.value = '' }

function handleSave() {
  if (!f.name.trim()) { error.value = '请输入方案名称'; return }
  if (f.selectedTypes.length === 0) { error.value = '请选择至少一种内容类型'; return }
  if (total.value !== 100) { error.value = '分配比例总和必须为100%'; return }
  const payload = { name: f.name, description: f.description, isDefault: f.isDefault, contentTypes: [...f.selectedTypes], rules: { platform: f.platform, circle: f.circle, creator: f.creator } }
  if (editingId.value) {
    const idx = plans.value.findIndex(p => p.id === editingId.value)
    if (idx >= 0) plans.value[idx] = { ...plans.value[idx], ...payload }
  } else {
    plans.value.push({ ...payload, id: Date.now().toString(), createdAt: new Date().toISOString().split('T')[0] })
  }
  closeEditor()
  uni.showToast({ title: '已保存', icon: 'success' })
}
</script>

<style scoped lang="scss">
.page { min-height: 100vh; background: #F7F4EE; }
.hdr { background: #ffffff; position: sticky; top: 0; z-index: 10; border-bottom: 1rpx solid #ECE7DD; }
.hdr-bar { display: flex; align-items: center; justify-content: space-between; height: 100rpx; padding: 0 16rpx; }
.hdr-btn { width: 64rpx; height: 64rpx; display: flex; align-items: center; justify-content: center; }
.hdr-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.tabs { display: flex; border-bottom: 1rpx solid #ECE7DD; }
.tab { flex: 1; text-align: center; padding: 24rpx 0; font-size: 26rpx; color: #999999; border-bottom: 4rpx solid transparent; }
.tab.on { color: var(--brand); border-bottom-color: var(--brand); font-weight: 500; }
.scroll { height: calc(100vh - 200rpx); }

.info-card { display: flex; gap: 16rpx; margin: 28rpx 32rpx 0; padding: 28rpx; background: #FFFBEB; border: 1rpx solid #FDE68A; border-radius: 24rpx; }
.info-text { flex: 1; }
.info-title { display: block; font-size: 26rpx; font-weight: 500; color: #92400E; margin-bottom: 8rpx; }
.info-desc { font-size: 22rpx; color: #B45309; line-height: 1.7; }

.list { padding: 28rpx 32rpx; display: flex; flex-direction: column; gap: 20rpx; }
.plan-card { background: #ffffff; border-radius: 24rpx; padding: 28rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.plan-head { display: flex; align-items: flex-start; justify-content: space-between; }
.plan-info { flex: 1; }
.plan-name-row { display: flex; align-items: center; gap: 12rpx; }
.plan-name { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.plan-default { font-size: 18rpx; padding: 2rpx 10rpx; border-radius: 6rpx; background: rgba(196,30,58,0.1); color: var(--brand); }
.plan-desc { display: block; font-size: 22rpx; color: #999999; margin-top: 6rpx; }
.plan-edit { width: 56rpx; height: 56rpx; display: flex; align-items: center; justify-content: center; }
.plan-types { display: flex; flex-wrap: wrap; gap: 10rpx; margin-top: 20rpx; }
.type-chip { display: flex; align-items: center; gap: 6rpx; padding: 6rpx 16rpx; border-radius: 999rpx; }
.type-chip-t { font-size: 18rpx; }
.plan-ratio { margin-top: 20rpx; padding-top: 20rpx; border-top: 1rpx solid #F0EDE6; }
.ratio-bar { display: flex; height: 48rpx; border-radius: 12rpx; overflow: hidden; }
.ratio-seg { display: flex; align-items: center; justify-content: center; min-width: 32rpx; }
.ratio-seg-t { font-size: 18rpx; color: #ffffff; font-weight: 500; }
.ratio-legend { display: flex; justify-content: space-between; margin-top: 14rpx; }
.legend { display: flex; align-items: center; gap: 6rpx; }
.dot { width: 14rpx; height: 14rpx; border-radius: 999rpx; }
.legend-t { font-size: 18rpx; color: #999999; }

.add-btn { display: flex; align-items: center; justify-content: center; gap: 12rpx; padding: 32rpx 0; border: 3rpx dashed #D9D4C8; border-radius: 24rpx; }
.add-btn-t { font-size: 26rpx; color: #999999; }

.guests-hint { display: block; font-size: 22rpx; color: #999999; margin-bottom: 8rpx; }
.guest-card { display: flex; align-items: center; gap: 18rpx; background: #ffffff; border-radius: 24rpx; padding: 28rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.guest-avatar { width: 80rpx; height: 80rpx; border-radius: 20rpx; background: #F0EDE6; }
.guest-info { flex: 1; min-width: 0; }
.guest-name { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.guest-types { display: flex; flex-wrap: wrap; gap: 8rpx; margin-top: 8rpx; }
.guest-type { font-size: 18rpx; padding: 2rpx 10rpx; border-radius: 6rpx; }
.guest-share { text-align: right; }
.guest-pct { display: block; font-size: 34rpx; font-weight: 700; color: var(--brand); }
.guest-share-t { font-size: 18rpx; color: #999999; }
.empty { display: flex; flex-direction: column; align-items: center; padding: 60rpx 0; }
.empty-t { font-size: 26rpx; color: #999999; margin-top: 20rpx; }
.empty-sub { font-size: 22rpx; color: #BBBBBB; margin-top: 6rpx; }

/* 弹窗 */
.mask { position: fixed; inset: 0; z-index: 50; background: rgba(0,0,0,0.4); display: flex; align-items: flex-end; }
.mask.center { align-items: center; justify-content: center; padding: 32rpx; }
.sheet { width: 100%; background: #ffffff; border-radius: 32rpx 32rpx 0 0; max-height: 90vh; overflow: hidden; }
.sheet-hdr { display: flex; align-items: center; justify-content: space-between; padding: 28rpx; border-bottom: 1rpx solid #F0EDE6; }
.sheet-cancel { font-size: 28rpx; color: #999999; }
.sheet-title { font-size: 30rpx; font-weight: 500; color: #2C2C2C; }
.sheet-save { font-size: 28rpx; color: var(--brand); font-weight: 500; }
.sheet-body { padding: 28rpx; max-height: 75vh; }
.err { display: flex; align-items: center; gap: 10rpx; padding: 20rpx; background: #FEF2F2; border-radius: 16rpx; margin-bottom: 24rpx; }
.err-t { font-size: 24rpx; color: #DC2626; }
.field { margin-bottom: 28rpx; }
.field-label { display: block; font-size: 26rpx; font-weight: 500; color: #2C2C2C; margin-bottom: 16rpx; }
.field-input { width: 100%; padding: 24rpx; background: #F7F4EE; border-radius: 16rpx; font-size: 26rpx; color: #2C2C2C; box-sizing: border-box; }
.type-picker { display: flex; flex-wrap: wrap; gap: 16rpx; }
.type-opt { display: flex; align-items: center; gap: 10rpx; padding: 16rpx 28rpx; border-radius: 16rpx; background: #F7F4EE; }
.type-opt-t { font-size: 26rpx; }
.slider-row { margin-bottom: 28rpx; }
.slider-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8rpx; }
.slider-name { font-size: 26rpx; color: #999999; }
.slider-val { font-size: 26rpx; font-weight: 500; color: #2C2C2C; }
.slider-val.gold { color: #C9A96E; }
.slider-val.red { color: var(--brand); }
.slider-hint { display: block; font-size: 18rpx; color: #999999; margin-top: 8rpx; }
.creator-bar { width: 100%; height: 14rpx; background: #F7F4EE; border-radius: 999rpx; overflow: hidden; }
.creator-fill { height: 100%; background: var(--brand); }
.total { display: flex; align-items: center; justify-content: space-between; padding: 20rpx; border-radius: 16rpx; }
.total.ok { background: #F0FDF4; }
.total.bad { background: #FEF2F2; }
.total.ok .total-label, .total.ok .total-val { color: #16A34A; }
.total.bad .total-label, .total.bad .total-val { color: #DC2626; }
.total-label { font-size: 26rpx; }
.total-val { font-size: 26rpx; font-weight: 500; }
.default-row { display: flex; align-items: center; justify-content: space-between; padding: 24rpx; background: #F7F4EE; border-radius: 16rpx; }
.default-name { font-size: 26rpx; font-weight: 500; color: #2C2C2C; }
.default-sub { display: block; font-size: 18rpx; color: #999999; margin-top: 4rpx; }
.switch { width: 88rpx; height: 48rpx; border-radius: 999rpx; background: #D9D4C8; position: relative; transition: background 0.2s; }
.switch.on { background: var(--brand); }
.switch-knob { position: absolute; top: 4rpx; left: 4rpx; width: 40rpx; height: 40rpx; background: #ffffff; border-radius: 999rpx; box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.2); transition: transform 0.2s; }
.switch.on .switch-knob { transform: translateX(40rpx); }

.help { width: 100%; max-width: 640rpx; background: #ffffff; border-radius: 24rpx; max-height: 80vh; overflow: hidden; }
.help-hdr { display: flex; align-items: center; justify-content: space-between; padding: 28rpx; border-bottom: 1rpx solid #F0EDE6; }
.help-title { font-size: 30rpx; font-weight: 500; color: #2C2C2C; }
.help-close { font-size: 26rpx; color: #999999; }
.help-body { padding: 28rpx; max-height: 64vh; }
.help-sec { margin-bottom: 28rpx; }
.help-h { display: block; font-size: 28rpx; font-weight: 500; color: #2C2C2C; margin-bottom: 12rpx; }
.help-p { display: block; font-size: 26rpx; color: #999999; line-height: 1.8; }
.help-b { font-weight: 600; color: #666666; }
</style>
