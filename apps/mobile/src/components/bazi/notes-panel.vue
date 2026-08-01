<script setup lang="ts">
/**
 * 断事笔记面板（从原型 components/paipan/bazi/notes-panel.tsx 666 行 1:1 高保真迁移）
 * 全屏覆盖面板：顶栏 + 命主反馈/师傅点评双 Tab + 关键事件时间轴 + 显示设置弹窗
 * 录音/选图/播放经 use-media-notes composable 跨端适配。
 */
import { ref, reactive, computed, watch } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import AttachmentBar from './attachment-bar.vue'
import { useOverlayScrollLock } from '@/composables/use-overlay-scroll-lock'
import { useMediaNotes } from '@/composables/use-media-notes'

/** recordId：本盘的落盘标识（后端记录 id 或本地生辰指纹），笔记按盘隔离存取 */
const props = defineProps<{ open: boolean; recordId?: string }>()
useOverlayScrollLock(() => props.open)
const emit = defineEmits<{ (e: 'close'): void }>()

const media = useMediaNotes()

const CLIENT_ITEMS = [
  { key: 'career', label: '职业', type: 'expand' },
  { key: 'education', label: '学历', type: 'expand' },
  { key: 'wealth', label: '财富', type: 'expand' },
  { key: 'marriage', label: '婚姻', type: 'expand' },
  { key: 'health', label: '健康状态', type: 'input' },
  { key: 'relatives', label: '六亲状况', type: 'input' },
  { key: 'personality', label: '性情描述', type: 'input' },
] as const
const MASTER_ITEMS = [
  { key: 'wangShuai', label: '旺衰' }, { key: 'geJu1', label: '格局(一)' },
  { key: 'geJu2', label: '格局(二)' }, { key: 'geJu3', label: '格局(三)' },
  { key: 'xi1', label: '喜(一)' }, { key: 'xi2', label: '喜(二)' }, { key: 'xi3', label: '喜(三)' },
  { key: 'ji1', label: '忌(一)' }, { key: 'ji2', label: '忌(二)' }, { key: 'ji3', label: '忌(三)' },
] as const

const activeTab = ref<'client' | 'master'>('client')
const showSettings = ref(false)
const expandedItem = ref<string | null>(null)
const notes = reactive<Record<string, string>>({})
const clientVisible = reactive<Record<string, boolean>>({ career: true, education: true, wealth: true, marriage: true, health: true, relatives: true, personality: false })
const masterVisible = reactive<Record<string, boolean>>({ wangShuai: true, geJu1: true, geJu2: false, geJu3: false, xi1: true, xi2: false, xi3: false, ji1: true, ji2: false, ji3: false })

function toggleVisibility(key: string, role: 'client' | 'master') {
  const target = role === 'client' ? clientVisible : masterVisible
  target[key] = !target[key]
}
function switchTab(tab: 'client' | 'master') { activeTab.value = tab; expandedItem.value = null }

const visibleClientItems = computed(() => CLIENT_ITEMS.filter(i => clientVisible[i.key]))
const visibleMasterItems = computed(() => MASTER_ITEMS.filter(i => masterVisible[i.key]))

// 师傅点评合并同类项（格局/喜/忌 一二三 -> 分组）
const masterGroups = computed(() => {
  const groups: { key: string; label: string; subItems: { key: string; label: string }[] }[] = []
  const processed = new Set<string>()
  for (const item of visibleMasterItems.value) {
    if (processed.has(item.key)) continue
    const push = (gkey: string, glabel: string, prefix: string) => {
      const related = visibleMasterItems.value.filter(i => i.key.startsWith(prefix))
      groups.push({ key: gkey, label: glabel, subItems: related.map(r => ({ key: r.key, label: r.label })) })
      related.forEach(r => processed.add(r.key))
    }
    if (item.key === 'wangShuai') { groups.push({ key: 'wangShuai', label: '旺衰', subItems: [{ key: item.key, label: item.label }] }); processed.add(item.key) }
    else if (item.key.startsWith('geJu')) push('geJu', '格局', 'geJu')
    else if (item.key.startsWith('xi')) push('xi', '喜', 'xi')
    else if (item.key.startsWith('ji')) push('ji', '忌', 'ji')
  }
  return groups
})

// ---- 关键事件时间轴 ----
// 2026-07-17 修复：删掉原型带来的 3 条假预填事件（升职加薪/购置房产/住院检查）——
// 用户的盘上凭空躺着别人的「人生大事」，比空着更糟。现在初始为空，读本地存储回填。
interface EventItem { id: number; date: string; content: string }
const events = reactive<EventItem[]>([])
const showAddEvent = ref(false)
const newEventDate = ref('')
const newEventContent = ref('')
const newEventDateType = ref<'year' | 'month' | 'day'>('month')
const editingEventId = ref<number | null>(null)
function nextId() { return events.length ? Math.max(...events.map(e => e.id)) + 1 : 1 }
function sortEvents() { events.sort((a, b) => a.date.localeCompare(b.date)) }
function openAddEvent() { showAddEvent.value = true; newEventDate.value = ''; newEventContent.value = ''; newEventDateType.value = 'month' }
function confirmAddEvent() {
  if (!newEventDate.value || !newEventContent.value.trim()) return
  events.push({ id: nextId(), date: newEventDate.value, content: newEventContent.value.trim() })
  sortEvents()
  showAddEvent.value = false; newEventDate.value = ''; newEventContent.value = ''
}
function deleteEvent(id: number) { const i = events.findIndex(e => e.id === id); if (i >= 0) events.splice(i, 1) }
function finishEdit() { editingEventId.value = null; sortEvents() }
function formatEventDate(d: string) {
  if (d.length === 4) return `${d}年`
  if (d.length === 7) return `${d.replace('-', '年')}月`
  return d.replace(/(\d{4})-(\d{2})-(\d{2})/, '$1年$2月$3日')
}
const dateTypes = [{ key: 'year', label: '年' }, { key: 'month', label: '年月' }, { key: 'day', label: '年月日' }] as const

// ---- 真保存：按盘落本地存储（2026-07-17 修复；此前 onSave 只 toast「已保存」，关面板即丢） ----
interface NotesStorePayload {
  /** 命主反馈/师傅点评各栏文字（key 与 CLIENT_ITEMS/MASTER_ITEMS/summary 对应） */
  notes: Record<string, string>
  /** 关键事件时间轴 */
  events: EventItem[]
  savedAt: number
}
const storageKey = () => `rebu:bazi-notes:${props.recordId || 'default'}`

/** 打开面板时读回本盘已存的笔记（recordId 变化也重读，防串盘） */
function loadNotes() {
  // 先清空再回填：切换到没存过笔记的盘时不能残留上一盘的内容
  for (const k of Object.keys(notes)) delete notes[k]
  events.splice(0, events.length)
  try {
    const raw = uni.getStorageSync(storageKey()) as NotesStorePayload | ''
    if (raw && typeof raw === 'object') {
      if (raw.notes && typeof raw.notes === 'object') Object.assign(notes, raw.notes)
      if (Array.isArray(raw.events)) {
        for (const e of raw.events) {
          if (e && typeof e.id === 'number' && typeof e.date === 'string' && typeof e.content === 'string') {
            events.push({ id: e.id, date: e.date, content: e.content })
          }
        }
      }
    }
  } catch {
    // 存储损坏按无笔记处理，不阻断面板
  }
}
watch(() => [props.open, props.recordId] as const, ([open]) => { if (open) loadNotes() }, { immediate: true })

function onSave() {
  try {
    const payload: NotesStorePayload = { notes: { ...notes }, events: events.map(e => ({ ...e })), savedAt: Date.now() }
    uni.setStorageSync(storageKey(), payload)
    uni.showToast({ title: '已保存', icon: 'success' })
  } catch {
    uni.showToast({ title: '保存失败，请重试', icon: 'none' })
  }
}
</script>

<template>
  <view v-if="open" class="np">
    <!-- 顶栏 -->
    <view class="np-hdr">
      <view class="np-icon" @tap="emit('close')"><app-icon name="x" :size="34" color="#666666" /></view>
      <text class="np-title">断事笔记</text>
      <view class="np-icon" @tap="showSettings = true"><app-icon name="settings" :size="34" color="#666666" /></view>
    </view>

    <!-- 角色 Tab -->
    <view class="np-tabs">
      <view v-for="t in ([{ key: 'client', label: '命主反馈' }, { key: 'master', label: '师傅点评' }] as const)" :key="t.key"
        class="np-tab" :class="{ on: activeTab === t.key }" @tap="switchTab(t.key)">
        <text class="np-tab-text" :class="{ on: activeTab === t.key }">{{ t.label }}</text>
      </view>
    </view>

    <!-- 内容区 -->
    <scroll-view scroll-y class="np-body">
      <!-- 命主反馈 -->
      <template v-if="activeTab === 'client'">
        <view v-for="item in visibleClientItems" :key="item.key" class="np-row">
          <template v-if="item.type === 'expand'">
            <view class="np-row-head" @tap="expandedItem = expandedItem === item.key ? null : item.key">
              <text class="np-row-label">{{ item.label }}</text>
              <view class="np-chev" :class="{ rot: expandedItem === item.key }"><app-icon name="chevron-right" :size="28" color="#9ca3af" /></view>
            </view>
            <view v-if="expandedItem === item.key" class="np-row-body">
              <textarea v-model="notes[item.key]" class="np-textarea" :placeholder="`记录命主${item.label}的实际情况，便于日后验证`" :auto-height="false" />
              <attachment-bar :note-key="item.key" :media="media" />
            </view>
          </template>
          <view v-else class="np-input-block">
            <text class="np-row-label sm">{{ item.label }}:</text>
            <input v-model="notes[item.key]" class="np-input" :placeholder="`简要记录命主的${item.label}`" />
            <attachment-bar :note-key="item.key" :media="media" />
          </view>
        </view>

        <!-- 关键事件时间轴 -->
        <view class="np-events">
          <view class="np-events-head">
            <text class="np-events-title">关键事件反馈记录</text>
            <view class="np-add-btn" @tap="openAddEvent"><app-icon name="plus" :size="24" color="#c41e3a" /><text class="np-add-text">添加事件</text></view>
          </view>

          <!-- 添加事件表单 -->
          <view v-if="showAddEvent" class="np-add-form">
            <text class="np-form-label">选择时间精度</text>
            <view class="np-type-row">
              <view v-for="t in dateTypes" :key="t.key" class="np-type" :class="{ on: newEventDateType === t.key }" @tap="newEventDateType = t.key; newEventDate = ''">
                <text class="np-type-text" :class="{ on: newEventDateType === t.key }">{{ t.label }}</text>
              </view>
            </view>
            <view class="np-date-input">
              <app-icon name="calendar" :size="28" color="#9ca3af" />
              <input v-model="newEventDate" class="np-input-fill"
                :placeholder="newEventDateType === 'year' ? '2024' : newEventDateType === 'month' ? '2024-06' : '2024-06-15'" />
            </view>
            <textarea v-model="newEventContent" class="np-textarea" placeholder="描述发生的关键事件..." />
            <attachment-bar note-key="new-event" :media="media" />
            <view class="np-form-actions">
              <view class="np-btn cancel" @tap="showAddEvent = false"><text class="np-btn-text soft">取消</text></view>
              <view class="np-btn confirm" :class="{ disabled: !newEventDate || !newEventContent.trim() }" @tap="confirmAddEvent"><text class="np-btn-text light">确认添加</text></view>
            </view>
          </view>

          <!-- 时间轴 -->
          <view v-if="!events.length" class="np-empty"><text class="np-empty-text">暂无记录，点击上方按钮添加关键事件</text></view>
          <view v-else class="np-timeline">
            <view class="np-tl-line" />
            <view v-for="evt in events" :key="evt.id" class="np-tl-item">
              <view class="np-tl-dot" />
              <view v-if="editingEventId === evt.id" class="np-tl-edit">
                <input v-model="evt.date" class="np-input-fill sm" />
                <textarea v-model="evt.content" class="np-textarea sm" />
                <view class="np-form-actions">
                  <view class="np-btn del" @tap="deleteEvent(evt.id)"><text class="np-btn-text brand">删除</text></view>
                  <view class="np-btn confirm" @tap="finishEdit"><text class="np-btn-text light">完成</text></view>
                </view>
              </view>
              <view v-else class="np-tl-view" @tap="editingEventId = evt.id">
                <text class="np-tl-date">{{ formatEventDate(evt.date) }}</text>
                <text class="np-tl-content">{{ evt.content }}</text>
              </view>
            </view>
          </view>
        </view>
      </template>

      <!-- 师傅点评 -->
      <template v-else>
        <view v-for="group in masterGroups" :key="group.key" class="np-row">
          <view class="np-row-head" @tap="expandedItem = expandedItem === group.key ? null : group.key">
            <text class="np-row-label">{{ group.label }}</text>
            <view class="np-chev" :class="{ rot: expandedItem === group.key }"><app-icon name="chevron-right" :size="28" color="#9ca3af" /></view>
          </view>
          <view v-if="expandedItem === group.key" class="np-row-body">
            <view v-for="sub in group.subItems" :key="sub.key" class="np-sub">
              <text v-if="group.subItems.length > 1" class="np-sub-label">{{ sub.label }}</text>
              <textarea v-model="notes[sub.key]" class="np-textarea sm" :placeholder="`写下你对${sub.label}的判断依据`" />
              <attachment-bar :note-key="sub.key" :media="media" />
            </view>
          </view>
        </view>
        <view class="np-summary">
          <text class="np-summary-title">总结:</text>
          <textarea v-model="notes['summary']" class="np-textarea lg" placeholder="综合各项点评，写下对此命局的整体结论" />
          <attachment-bar note-key="summary" :media="media" />
        </view>
      </template>
    </scroll-view>

    <!-- 底部保存栏 -->
    <view class="np-foot">
      <view class="np-save" @tap="onSave"><text class="np-save-text">保存</text></view>
      <view class="np-foot-set" @tap="showSettings = true"><app-icon name="settings" :size="34" color="#666666" /></view>
    </view>

    <!-- 显示设置弹窗 -->
    <view v-if="showSettings" class="np-mask" @tap="showSettings = false" @touchmove.self.prevent>
      <view class="np-sheet" @tap.stop @touchmove.stop>
        <view class="np-sheet-head">
          <text class="np-sheet-title">显示设置</text>
          <view class="np-sheet-done" @tap="showSettings = false"><text class="np-sheet-done-text">完成</text></view>
        </view>
        <view class="np-set-grid">
          <view class="np-set-col bd">
            <text class="np-set-col-h">命主反馈</text>
            <view v-for="item in CLIENT_ITEMS" :key="item.key" class="np-set-row">
              <text class="np-set-label">{{ item.label }}</text>
              <view class="np-switch" :class="{ on: clientVisible[item.key] }" @tap="toggleVisibility(item.key, 'client')"><view class="np-knob" :class="{ on: clientVisible[item.key] }" /></view>
            </view>
          </view>
          <view class="np-set-col">
            <text class="np-set-col-h">师傅点评</text>
            <view v-for="item in MASTER_ITEMS" :key="item.key" class="np-set-row">
              <text class="np-set-label">{{ item.label }}</text>
              <view class="np-switch" :class="{ on: masterVisible[item.key] }" @tap="toggleVisibility(item.key, 'master')"><view class="np-knob" :class="{ on: masterVisible[item.key] }" /></view>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.np { position: fixed; inset: 0; z-index: 50; display: flex; flex-direction: column; background: var(--bg-paper); padding-top: var(--status-bar-height, 0); }
.np-hdr { display: flex; align-items: center; justify-content: space-between; padding: 20rpx 32rpx; border-bottom: 2rpx solid var(--border, rgba(0,0,0,0.08)); }
.np-icon { padding: 4rpx; }
.np-title { font-size: 32rpx; font-weight: 600; color: var(--text-ink); }
.np-tabs { display: flex; justify-content: center; gap: 24rpx; padding: 24rpx 0; }
.np-tab { padding: 14rpx 48rpx; border-radius: 999rpx; background: var(--card); border: 2rpx solid var(--border, rgba(0,0,0,0.08)); }
.np-tab.on { background: var(--brand); border-color: var(--brand); }
.np-tab-text { font-size: 28rpx; font-weight: 500; color: var(--text-soft); }
.np-tab-text.on { color: #fff; }
.np-body { flex: 1; padding: 0 32rpx; }
.np-row { border-bottom: 2rpx solid var(--border, rgba(0,0,0,0.08)); }
.np-row-head { display: flex; align-items: center; justify-content: space-between; padding: 28rpx 0; }
.np-row-label { font-size: 32rpx; font-weight: 500; color: var(--text-ink); }
.np-row-label.sm { display: block; margin-bottom: 12rpx; }
.np-chev { transition: transform 0.2s; }
.np-chev.rot { transform: rotate(90deg); }
.np-row-body { padding-bottom: 24rpx; }
.np-input-block { padding: 28rpx 0; }
.np-textarea { width: 100%; box-sizing: border-box; background: var(--bg-soft, rgba(0,0,0,0.03)); border-radius: 12rpx; padding: 24rpx; font-size: 28rpx; color: var(--text-ink); min-height: 160rpx; border: 2rpx solid var(--border, rgba(0,0,0,0.08)); }
.np-textarea.sm { min-height: 120rpx; }
.np-textarea.lg { min-height: 200rpx; }
.np-input { width: 100%; box-sizing: border-box; font-size: 28rpx; color: var(--text-ink); padding: 4rpx 0; }
.np-sub { margin-bottom: 16rpx; }
.np-sub-label { display: block; font-size: 22rpx; color: var(--text-soft); margin-bottom: 8rpx; }
.np-summary { margin-top: 32rpx; padding-bottom: 32rpx; }
.np-summary-title { display: block; font-size: 32rpx; font-weight: 600; color: var(--text-ink); margin-bottom: 16rpx; }
/* 事件 */
.np-events { margin-top: 40rpx; padding-bottom: 180rpx; }
.np-events-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24rpx; }
.np-events-title { font-size: 32rpx; font-weight: 600; color: var(--text-ink); }
.np-add-btn { display: flex; align-items: center; gap: 6rpx; padding: 10rpx 24rpx; border-radius: 999rpx; background: rgba(196,30,58,0.1); }
.np-add-text { font-size: 22rpx; color: var(--brand); font-weight: 500; }
.np-add-form { margin-bottom: 32rpx; background: var(--bg-soft, rgba(0,0,0,0.02)); border-radius: 20rpx; padding: 28rpx; border: 2rpx solid var(--border, rgba(0,0,0,0.08)); }
.np-form-label { display: block; font-size: 28rpx; font-weight: 500; color: var(--text-ink); margin-bottom: 16rpx; }
.np-type-row { display: flex; gap: 16rpx; margin-bottom: 24rpx; }
.np-type { padding: 10rpx 24rpx; border-radius: 999rpx; background: var(--card); border: 2rpx solid var(--border, rgba(0,0,0,0.08)); }
.np-type.on { background: var(--brand); border-color: var(--brand); }
.np-type-text { font-size: 22rpx; color: var(--text-soft); }
.np-type-text.on { color: #fff; }
.np-date-input { display: flex; align-items: center; gap: 16rpx; margin-bottom: 24rpx; }
.np-input-fill { flex: 1; background: var(--card); border-radius: 12rpx; padding: 16rpx 24rpx; font-size: 28rpx; color: var(--text-ink); border: 2rpx solid var(--border, rgba(0,0,0,0.08)); box-sizing: border-box; }
.np-input-fill.sm { width: 100%; font-size: 24rpx; padding: 12rpx 24rpx; margin-bottom: 16rpx; }
.np-form-actions { display: flex; gap: 16rpx; margin-top: 16rpx; }
.np-btn { flex: 1; padding: 16rpx 0; border-radius: 999rpx; text-align: center; }
.np-btn.cancel { background: var(--bg-soft, rgba(0,0,0,0.05)); }
.np-btn.confirm { background: var(--brand); }
.np-btn.confirm.disabled { opacity: 0.4; }
.np-btn.del { flex: 0 0 auto; padding: 16rpx 32rpx; background: rgba(196,30,58,0.1); }
.np-btn-text { font-size: 24rpx; font-weight: 500; }
.np-btn-text.soft { color: var(--text-soft); }
.np-btn-text.light { color: #fff; }
.np-btn-text.brand { color: var(--brand); }
.np-empty { text-align: center; padding: 64rpx 0; }
.np-empty-text { font-size: 28rpx; color: var(--text-soft); }
.np-timeline { position: relative; padding-left: 40rpx; }
.np-tl-line { position: absolute; left: 14rpx; top: 16rpx; bottom: 16rpx; width: 2rpx; background: var(--border, rgba(0,0,0,0.1)); }
.np-tl-item { position: relative; padding-bottom: 32rpx; }
.np-tl-dot { position: absolute; left: -40rpx; top: 12rpx; width: 28rpx; height: 28rpx; border-radius: 999rpx; border: 4rpx solid var(--brand); background: var(--card); box-sizing: border-box; }
.np-tl-edit { background: var(--bg-soft, rgba(0,0,0,0.02)); border-radius: 20rpx; padding: 24rpx; border: 2rpx solid var(--border, rgba(0,0,0,0.08)); }
.np-tl-view { padding: 12rpx; border-radius: 16rpx; }
.np-tl-date { display: block; font-size: 22rpx; font-weight: 600; color: var(--brand); margin-bottom: 6rpx; }
.np-tl-content { font-size: 28rpx; color: var(--text-ink); line-height: 1.6; }
/* 底部 */
.np-foot { position: absolute; bottom: 0; left: 0; right: 0; background: var(--bg-paper); border-top: 2rpx solid var(--border, rgba(0,0,0,0.08)); padding: 20rpx 32rpx calc(20rpx + env(safe-area-inset-bottom)); display: flex; gap: 24rpx; align-items: center; }
.np-save { flex: 1; background: var(--brand); padding: 24rpx 0; border-radius: 999rpx; text-align: center; }
.np-save-text { font-size: 32rpx; font-weight: 600; color: #fff; }
.np-foot-set { width: 88rpx; height: 88rpx; border-radius: 999rpx; border: 2rpx solid var(--border, rgba(0,0,0,0.08)); display: flex; align-items: center; justify-content: center; }
/* 设置弹窗 */
.np-mask { position: fixed; inset: 0; z-index: 60; background: rgba(0,0,0,0.4); display: flex; align-items: flex-end; }
.np-sheet { width: 100%; background: var(--card); border-radius: 32rpx 32rpx 0 0; max-height: 70vh; overflow-y: auto; }
.np-sheet-head { display: flex; align-items: center; justify-content: space-between; padding: 28rpx 40rpx; border-bottom: 2rpx solid var(--border, rgba(0,0,0,0.08)); }
.np-sheet-title { font-size: 34rpx; font-weight: 600; color: var(--text-ink); }
.np-sheet-done { padding: 10rpx 32rpx; background: var(--brand); border-radius: 999rpx; }
.np-sheet-done-text { font-size: 26rpx; font-weight: 500; color: #fff; }
.np-set-grid { display: grid; grid-template-columns: 1fr 1fr; }
.np-set-col.bd { border-right: 2rpx solid var(--border, rgba(0,0,0,0.08)); }
.np-set-col-h { display: block; text-align: center; padding: 24rpx 0; font-weight: 600; color: var(--text-ink); font-size: 28rpx; }
.np-set-row { display: flex; align-items: center; justify-content: space-between; padding: 18rpx 32rpx; }
.np-set-label { font-size: 26rpx; color: var(--text-ink); }
.np-switch { width: 80rpx; height: 44rpx; border-radius: 999rpx; background: var(--border, #d1d5db); position: relative; transition: background 0.2s; }
.np-switch.on { background: var(--brand); }
.np-knob { width: 36rpx; height: 36rpx; background: #fff; border-radius: 999rpx; position: absolute; top: 4rpx; left: 4rpx; transition: transform 0.2s; box-shadow: 0 2rpx 4rpx rgba(0,0,0,0.15); }
.np-knob.on { transform: translateX(36rpx); }
</style>
