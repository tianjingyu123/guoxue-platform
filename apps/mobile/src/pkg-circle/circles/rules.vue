<script setup lang="ts">
/**
 * 圈规与治理 — V0 circle-admin-rules.html 还原（2026-07-10 批⑦·治理前端）
 * 结构：官方模板一键套用 → 圈规条文 CRUD+排序 → 违规三级阶梯（配置可改）→ 内容自动治理 → 治理记录（匿名留痕）
 * 数据：circleGovernanceApi（真连 /circle-governance/*·2026-07-10 治理后端）。
 * 权限：圈规编辑/治理配置=仅圈主（后端 checkOwnership）；管理员进入降级为只读（configDenied）。
 * 降级（如实·不造假）：
 * - V0「长按拖动排序」→ ⋯ 菜单上移/下移（PUT reorder 真连·uni-app 拖拽不做）；
 * - 模板 chips 按后端真实内容写（圈规 6 条/三级阶梯/加入须确认/新帖先审 7 天·V0 的成长阶梯五级/续费8折后端无）；
 * - 「新成员发帖先审」「被举报自动隐藏」配置可保存但后端链路本期未接 → 行内如实标注生效范围；
 * - 敏感词/刷屏限制已接发帖链路（checkPostGate）→ 正常读写。
 */
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import {
  circleGovernanceApi,
  type CircleRuleItem,
  type GovernanceConfig,
  type GovernanceLogItem,
} from '@/lib/circle-governance-data'

const circleId = ref('')

// ─── 三态 ───
const loading = ref(true)
const error = ref('')

// ─── 圈规条文 ───
const rules = ref<CircleRuleItem[]>([])
// ─── 治理配置（仅圈主可读写·管理员 configDenied 只读） ───
const cfg = ref<GovernanceConfig | null>(null)
const configDenied = ref(false)
const canEdit = computed(() => !configDenied.value && !!cfg.value)

// ─── 治理记录（成员可查·匿名） ───
const log = ref<GovernanceLogItem[]>([])
const logTotal = ref(0)
const logOpen = ref(false)
// 管理侧聚合角标（listViolations 需 member.discipline·失败静默隐藏）
const recent30 = ref<number | null>(null)
const pendingAppeals = ref(0)

// ─── 写操作状态 ───
const applying = ref(false)
const saving = ref(false)
const ruleSubmitting = ref(false)

// ─── 条文编辑弹层 ───
const ruleModal = ref<{ mode: 'add' | 'edit'; id?: string; text: string } | null>(null)
// ─── 敏感词弹层 ───
const wordsModal = ref(false)
const wordsEnabled = ref(true)
const wordsText = ref('')

const TYPE_LABEL: Record<string, string> = { WARNING: '警告', MUTE: '禁言', REMOVE: '移出' }
const LOG_STATUS: Record<string, string> = { ACTIVE: '生效中', EXPIRED: '已过期', LIFTED: '已解除', REVOKED: '已撤销' }

async function load() {
  loading.value = true
  error.value = ''
  try {
    const r = await circleGovernanceApi.getRules(circleId.value)
    rules.value = r.rules
    // 配置：仅圈主可读·管理员降级只读
    try {
      cfg.value = await circleGovernanceApi.getConfig(circleId.value)
      configDenied.value = false
    } catch {
      configDenied.value = true
      cfg.value = null
    }
    // 记录角标与匿名留痕（各自独立降级·不阻塞主流程）
    circleGovernanceApi
      .listViolations(circleId.value, 1, 50)
      .then((res) => {
        const now = Date.now()
        recent30.value = res.items.filter((v) => now - new Date(v.createdAt).getTime() <= 30 * 24 * 3600 * 1000).length
        pendingAppeals.value = res.items.filter((v) => v.appealStatus === 'PENDING').length
      })
      .catch(() => { recent30.value = null })
    circleGovernanceApi
      .getLog(circleId.value, 1, 20)
      .then((res) => { log.value = res.items; logTotal.value = res.total })
      .catch(() => { log.value = []; logTotal.value = 0 })
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function reloadRules() {
  try {
    const r = await circleGovernanceApi.getRules(circleId.value)
    rules.value = r.rules
  } catch { /* 保留旧列表 */ }
}

// ─── 官方模板一键套用（幂等·手改不覆盖） ───
async function applyTemplate() {
  if (applying.value || !canEdit.value) return
  applying.value = true
  try {
    const r = await circleGovernanceApi.applyTemplate(circleId.value)
    const parts: string[] = []
    if (r.created) parts.push(`新增 ${r.created} 条`)
    if (r.updated) parts.push(`同步 ${r.updated} 条`)
    if (r.skipped) parts.push(`跳过 ${r.skipped} 条手改`)
    uni.showToast({ title: parts.length ? parts.join('·') : '已是最新模板', icon: 'none' })
    await reloadRules()
    // 首次套用会落配置默认·重取
    try { cfg.value = await circleGovernanceApi.getConfig(circleId.value) } catch { /* 保持 */ }
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '套用失败', icon: 'none' })
  } finally {
    applying.value = false
  }
}

// ─── 条文 CRUD 与排序 ───
function openAddRule() {
  if (!canEdit.value) return
  ruleModal.value = { mode: 'add', text: '' }
}

function ruleMenu(rule: CircleRuleItem, index: number) {
  if (!canEdit.value) return
  const items = ['编辑', '上移', '下移', '删除']
  uni.showActionSheet({
    itemList: items,
    success: ({ tapIndex }) => {
      if (tapIndex === 0) ruleModal.value = { mode: 'edit', id: rule.id, text: rule.text }
      else if (tapIndex === 1) moveRule(index, -1)
      else if (tapIndex === 2) moveRule(index, 1)
      else if (tapIndex === 3) confirmDeleteRule(rule)
    },
  })
}

async function moveRule(index: number, dir: -1 | 1) {
  const to = index + dir
  if (to < 0 || to >= rules.value.length || ruleSubmitting.value) return
  const ids = rules.value.map((r) => r.id)
  ;[ids[index], ids[to]] = [ids[to], ids[index]]
  ruleSubmitting.value = true
  try {
    await circleGovernanceApi.reorderRules(circleId.value, ids)
    await reloadRules()
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '排序失败', icon: 'none' })
  } finally {
    ruleSubmitting.value = false
  }
}

function confirmDeleteRule(rule: CircleRuleItem) {
  uni.showModal({
    title: '删除条文',
    content: `确定删除「${rule.text.slice(0, 20)}${rule.text.length > 20 ? '…' : ''}」？`,
    confirmColor: '#C41E3A',
    success: async ({ confirm }) => {
      if (!confirm || ruleSubmitting.value) return
      ruleSubmitting.value = true
      try {
        await circleGovernanceApi.deleteRule(circleId.value, rule.id)
        await reloadRules()
      } catch (e) {
        uni.showToast({ title: (e as Error)?.message || '删除失败', icon: 'none' })
      } finally {
        ruleSubmitting.value = false
      }
    },
  })
}

async function submitRuleModal() {
  const m = ruleModal.value
  if (!m || ruleSubmitting.value) return
  const text = m.text.trim()
  if (text.length < 2) { uni.showToast({ title: '条文至少 2 个字', icon: 'none' }); return }
  if (text.length > 200) { uni.showToast({ title: '条文最多 200 字', icon: 'none' }); return }
  ruleSubmitting.value = true
  try {
    if (m.mode === 'add') await circleGovernanceApi.createRule(circleId.value, text)
    else if (m.id) await circleGovernanceApi.updateRule(circleId.value, m.id, text)
    ruleModal.value = null
    await reloadRules()
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '保存失败', icon: 'none' })
  } finally {
    ruleSubmitting.value = false
  }
}

// ─── 阶梯配置（本地改·吸底保存统一 PUT config） ───
function pickThreshold() {
  if (!canEdit.value || !cfg.value) return
  const opts = [1, 2, 3, 5, 10]
  uni.showActionSheet({
    itemList: opts.map((n) => `累计 ${n} 次警告自动禁言`),
    success: ({ tapIndex }) => { if (cfg.value) cfg.value.warningThreshold = opts[tapIndex] },
  })
}

function pickMuteDays() {
  if (!canEdit.value || !cfg.value) return
  const opts = [1, 3, 7, 30]
  uni.showActionSheet({
    itemList: opts.map((n) => `默认禁言 ${n} 天`),
    success: ({ tapIndex }) => { if (cfg.value) cfg.value.muteDays = opts[tapIndex] },
  })
}

function pickBanRejoin() {
  if (!canEdit.value || !cfg.value) return
  uni.showActionSheet({
    itemList: ['移出后禁止重新加入（可单独解除）', '移出后允许重新加入（仅记录在案）'],
    success: ({ tapIndex }) => { if (cfg.value) cfg.value.removeBanRejoin = tapIndex === 0 },
  })
}

function pickPostInterval() {
  if (!canEdit.value || !cfg.value) return
  const opts: { label: string; sec: number }[] = [
    { label: '不限制', sec: 0 },
    { label: '1 分钟/条', sec: 60 },
    { label: '5 分钟/条', sec: 300 },
    { label: '10 分钟/条', sec: 600 },
    { label: '30 分钟/条', sec: 1800 },
  ]
  uni.showActionSheet({
    itemList: opts.map((o) => o.label),
    success: ({ tapIndex }) => { if (cfg.value) cfg.value.postIntervalSeconds = opts[tapIndex].sec },
  })
}

const intervalLabel = computed(() => {
  const sec = cfg.value?.postIntervalSeconds ?? 0
  if (!sec) return '未限制'
  return sec % 60 === 0 ? `${sec / 60} 分钟/条` : `${sec} 秒/条`
})

function toggleCfg(key: 'requireRuleAck' | 'newMemberReviewEnabled' | 'reportAutoHideEnabled') {
  if (!canEdit.value || !cfg.value) return
  cfg.value[key] = !cfg.value[key]
}

// ─── 敏感词弹层 ───
function openWordsModal() {
  if (!canEdit.value || !cfg.value) return
  wordsEnabled.value = cfg.value.sensitiveWordsEnabled
  wordsText.value = cfg.value.sensitiveWords.join('，')
  wordsModal.value = true
}

function confirmWords() {
  if (!cfg.value) return
  const words = wordsText.value.split(/[,，、;；\s\n]+/).map((w) => w.trim()).filter(Boolean)
  if (words.length > 200) { uni.showToast({ title: '敏感词最多 200 个', icon: 'none' }); return }
  cfg.value.sensitiveWords = words
  cfg.value.sensitiveWordsEnabled = wordsEnabled.value
  wordsModal.value = false
}

// ─── 吸底保存（配置整体 PUT） ───
async function saveConfig() {
  if (saving.value || !canEdit.value || !cfg.value) return
  saving.value = true
  try {
    cfg.value = await circleGovernanceApi.updateConfig(circleId.value, {
      requireRuleAck: cfg.value.requireRuleAck,
      warningThreshold: cfg.value.warningThreshold,
      muteDays: cfg.value.muteDays,
      removeBanRejoin: cfg.value.removeBanRejoin,
      newMemberReviewEnabled: cfg.value.newMemberReviewEnabled,
      sensitiveWordsEnabled: cfg.value.sensitiveWordsEnabled,
      sensitiveWords: cfg.value.sensitiveWords,
      postIntervalSeconds: cfg.value.postIntervalSeconds,
      reportAutoHideEnabled: cfg.value.reportAutoHideEnabled,
    })
    uni.showToast({ title: '圈规设置已保存', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

function fmtDate(s: string) {
  if (!s) return ''
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
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
      <text class="topbar-title">圈规与治理</text>
    </view>

    <!-- 加载态 -->
    <view v-if="loading" class="state">
      <view class="skel" /><view class="skel tall" /><view class="skel tall" />
    </view>
    <!-- 错误态 -->
    <view v-else-if="error" class="state center">
      <text class="state-t">{{ error }}</text>
      <view class="retry" @tap="load"><text class="retry-t">重试</text></view>
    </view>

    <template v-else>
      <!-- 管理员只读提示 -->
      <view v-if="configDenied" class="readonly-note">
        <app-icon name="info" :size="26" color="#C97B2D" />
        <text class="readonly-note-t">圈规编辑与治理配置仅圈主可操作，当前为只读查看</text>
      </view>

      <!-- 圈规模板：一键套用（后端幂等·手改不覆盖） -->
      <template v-if="canEdit">
        <text class="group-label">推荐模板 · 新圈冷启动</text>
        <view class="tpl-card">
          <view class="tpl-head">
            <app-icon name="sparkles" :size="30" color="#C9A96E" />
            <text class="tpl-title">自运转圈子 · 官方规则模板</text>
          </view>
          <text class="tpl-desc">基于平台验证过的经营模型：清晰的圈规让交流有边界、治理阶梯让违规有成本。一键套用后每项均可修改。</text>
          <view class="tpl-items">
            <text class="tpl-item">圈规条文 6 条</text>
            <text class="tpl-item">违规三级阶梯</text>
            <text class="tpl-item">加入须确认圈规</text>
            <text class="tpl-item">新帖先审 7 天</text>
          </view>
          <view class="tpl-apply" :class="{ disabled: applying }" @tap="applyTemplate">
            <text class="tpl-apply-t">{{ applying ? '套用中…' : '一键套用模板' }}</text>
          </view>
          <text class="tpl-note">套用不会覆盖你已手动修改过的条目</text>
        </view>
      </template>

      <!-- 圈规条文 -->
      <text class="group-label">圈规条文 · 已设 {{ rules.length }} 条{{ canEdit ? ' · 通过条文菜单调整顺序' : '' }}</text>
      <view class="group">
        <view v-if="!rules.length" class="rules-empty">
          <text class="rules-empty-t">暂未设置圈规，建议先一键套用官方模板</text>
        </view>
        <view v-for="(r, i) in rules" :key="r.id" class="rule-row">
          <view class="rule-no"><text class="rule-no-t">{{ i + 1 }}</text></view>
          <view class="rule-main"><text class="rule-text">{{ r.text }}</text></view>
          <view v-if="canEdit" class="rule-more" @tap="ruleMenu(r, i)">
            <app-icon name="more-horizontal" :size="32" color="#999999" />
          </view>
        </view>
        <view v-if="canEdit" class="rule-add" @tap="openAddRule">
          <app-icon name="plus" :size="26" color="#C41E3A" />
          <text class="rule-add-t">添加条文</text>
        </view>
        <view class="rule-confirm">
          <view class="rule-confirm-main">
            <text class="rule-confirm-title">新成员加入时须确认圈规</text>
            <text class="rule-confirm-desc">加入流程中展示全部条文并勾选同意，违规处理时可引用</text>
          </view>
          <view
            class="switch" :class="{ on: cfg?.requireRuleAck, locked: !canEdit }"
            @tap="toggleCfg('requireRuleAck')"
          ><view class="switch-knob" /></view>
        </view>
      </view>

      <!-- 违规处理阶梯 -->
      <text class="group-label">违规处理阶梯 · 执行时须选择违反的条文</text>
      <view class="group">
        <view class="ladder">
          <view class="ladder-step">
            <view class="ladder-dot warn"><text class="ladder-dot-t warn">1</text></view>
            <view class="ladder-main">
              <text class="ladder-title">警告</text>
              <text class="ladder-desc">站内通知违规成员并引用条文，记录在案 · {{ cfg?.warningResetDays ?? 90 }} 天自动清零</text>
              <view class="ladder-config" @tap="pickThreshold">
                <text class="ladder-config-t">累计 <text class="ladder-config-b">{{ cfg?.warningThreshold ?? 3 }} 次警告</text> 自动升级为禁言</text>
                <text v-if="canEdit" class="ladder-chev">›</text>
              </view>
            </view>
          </view>
          <view class="ladder-step">
            <view class="ladder-dot mute"><text class="ladder-dot-t mute">2</text></view>
            <view class="ladder-main">
              <text class="ladder-title">禁言</text>
              <text class="ladder-desc">期间不可发帖、评论，可正常浏览学习</text>
              <view class="ladder-config" @tap="pickMuteDays">
                <text class="ladder-config-t">默认时长 <text class="ladder-config-b">{{ cfg?.muteDays ?? 7 }} 天</text>（可选 1/3/7/30 天）</text>
                <text v-if="canEdit" class="ladder-chev">›</text>
              </view>
            </view>
          </view>
          <view class="ladder-step last">
            <view class="ladder-dot out"><text class="ladder-dot-t out">3</text></view>
            <view class="ladder-main">
              <text class="ladder-title">移出圈子</text>
              <text class="ladder-desc">仅圈主可执行且须填写理由；付费成员剩余费用按圈子退款规则结算（不没收）</text>
              <view class="ladder-config" @tap="pickBanRejoin">
                <text class="ladder-config-t">移出后 <text class="ladder-config-b">{{ cfg?.removeBanRejoin !== false ? '禁止重新加入' : '允许重新加入' }}</text>（可单独解除）</text>
                <text v-if="canEdit" class="ladder-chev">›</text>
              </view>
            </view>
          </view>
        </view>
        <text class="ladder-note">每次处理成员均可申诉一次，申诉由平台仲裁（48 小时内答复）；处理记录成员本人可见，保证权责透明。</text>
      </view>

      <!-- 内容自动治理 -->
      <text class="group-label">内容自动治理</text>
      <view class="group">
        <view class="auto-row">
          <view class="auto-main">
            <text class="auto-title">新成员发帖先审后发</text>
            <text class="auto-desc">加入不满 {{ cfg?.newMemberReviewDays ?? 7 }} 天的成员，帖子经圈主/管理员审核后展示</text>
            <text class="auto-scope">生效范围：配置可保存 · 发帖先审链路随圈内审核队列上线后启用</text>
          </view>
          <view
            class="switch" :class="{ on: cfg?.newMemberReviewEnabled, locked: !canEdit }"
            @tap="toggleCfg('newMemberReviewEnabled')"
          ><view class="switch-knob" /></view>
        </view>
        <view class="auto-row" @tap="openWordsModal">
          <view class="auto-main">
            <text class="auto-title">圈内敏感词</text>
            <text class="auto-desc">命中的帖子自动转人工审核，不直接展示（发帖链路已生效）</text>
          </view>
          <view class="auto-value">
            <text class="auto-value-t">{{ cfg?.sensitiveWordsEnabled ? `已设 ${cfg?.sensitiveWords.length ?? 0} 个` : '未启用' }}</text>
            <text v-if="canEdit" class="auto-chev">›</text>
          </view>
        </view>
        <view class="auto-row" @tap="pickPostInterval">
          <view class="auto-main">
            <text class="auto-title">刷屏限制</text>
            <text class="auto-desc">同一成员发帖间隔限制，防止刷屏水贴（发帖链路已生效）</text>
          </view>
          <view class="auto-value">
            <text class="auto-value-t">{{ intervalLabel }}</text>
            <text v-if="canEdit" class="auto-chev">›</text>
          </view>
        </view>
        <view class="auto-row">
          <view class="auto-main">
            <text class="auto-title">被举报自动隐藏</text>
            <text class="auto-desc">同一内容被 {{ cfg?.reportAutoHideThreshold ?? 3 }} 人以上举报时先隐藏、转人工复核</text>
            <text class="auto-scope">生效范围：配置可保存 · 举报链路本期未接入</text>
          </view>
          <view
            class="switch" :class="{ on: cfg?.reportAutoHideEnabled, locked: !canEdit }"
            @tap="toggleCfg('reportAutoHideEnabled')"
          ><view class="switch-knob" /></view>
        </view>
      </view>

      <!-- 治理记录（匿名留痕·点击展开） -->
      <text class="group-label">治理记录</text>
      <view class="group">
        <view class="record-row" @tap="logOpen = !logOpen">
          <view class="record-icon"><app-icon name="file-text" :size="32" color="#6E6E73" /></view>
          <view class="record-main">
            <text class="record-title">违规处理记录</text>
            <text class="record-desc">
              <template v-if="recent30 !== null">近 30 天处理 {{ recent30 }} 起 · </template>全部记录可追溯，匿名留痕
            </text>
          </view>
          <view v-if="pendingAppeals" class="record-badge"><text class="record-badge-t">{{ pendingAppeals }} 起申诉待复核</text></view>
          <app-icon :name="logOpen ? 'chevron-up' : 'chevron-down'" :size="30" color="#999999" />
        </view>
        <template v-if="logOpen">
          <view v-if="!log.length" class="log-empty"><text class="log-empty-t">暂无治理记录，圈内风清气正</text></view>
          <view v-for="item in log" :key="item.id" class="log-row">
            <view class="log-type" :class="item.type.toLowerCase()"><text class="log-type-t" :class="item.type.toLowerCase()">{{ TYPE_LABEL[item.type] }}</text></view>
            <view class="log-main">
              <text class="log-text">{{ item.memberMasked }}{{ item.ruleText ? ` · 违反「${item.ruleText}」` : '' }}{{ item.auto ? ' · 系统自动升级' : '' }}</text>
              <text class="log-meta">{{ fmtDate(item.createdAt) }} · {{ LOG_STATUS[item.status] || item.status }}</text>
            </view>
          </view>
          <view v-if="logTotal > log.length" class="log-more"><text class="log-more-t">共 {{ logTotal }} 条，仅展示最近 {{ log.length }} 条</text></view>
        </template>
      </view>

      <text class="page-note">圈规与阶梯规则保存后即时生效；治理动作（警告/禁言/移出）全部留痕，成员与平台均可查证——规则透明是圈子长期经营的基础。</text>

      <view class="bottom-pad" />
    </template>

    <!-- 吸底保存 -->
    <view v-if="!loading && !error && canEdit" class="savebar">
      <view class="btn-save" :class="{ disabled: saving }" @tap="saveConfig">
        <text class="btn-save-t">{{ saving ? '保存中…' : '保存圈规设置' }}</text>
      </view>
    </view>

    <!-- 条文编辑弹层 -->
    <view v-if="ruleModal" class="mask" @tap="ruleModal = null">
      <view class="modal" @tap.stop>
        <text class="modal-title">{{ ruleModal.mode === 'add' ? '添加条文' : '编辑条文' }}</text>
        <textarea
          v-model="ruleModal.text" class="modal-input" :maxlength="200"
          placeholder="写下圈规条文（2-200 字），新成员加入时会看到"
        />
        <text class="modal-count">{{ ruleModal.text.length }}/200</text>
        <view class="modal-btns">
          <view class="modal-btn ghost" @tap="ruleModal = null"><text class="modal-btn-t ghost">取消</text></view>
          <view class="modal-btn primary" :class="{ disabled: ruleSubmitting }" @tap="submitRuleModal">
            <text class="modal-btn-t primary">{{ ruleSubmitting ? '保存中…' : '保存' }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 敏感词弹层 -->
    <view v-if="wordsModal" class="mask" @tap="wordsModal = false">
      <view class="modal" @tap.stop>
        <text class="modal-title">圈内敏感词</text>
        <view class="words-toggle">
          <text class="words-toggle-t">启用敏感词转审</text>
          <view class="switch" :class="{ on: wordsEnabled }" @tap="wordsEnabled = !wordsEnabled"><view class="switch-knob" /></view>
        </view>
        <textarea
          v-model="wordsText" class="modal-input tall"
          placeholder="多个词用逗号、顿号或换行分隔，最多 200 个。命中的帖子自动转人工审核。"
        />
        <view class="modal-btns">
          <view class="modal-btn ghost" @tap="wordsModal = false"><text class="modal-btn-t ghost">取消</text></view>
          <view class="modal-btn primary" @tap="confirmWords"><text class="modal-btn-t primary">确定</text></view>
        </view>
        <text class="modal-hint">确定后需点击底部「保存圈规设置」才会生效</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: var(--bg-page, #faf8f5); padding-bottom: calc(176rpx + env(safe-area-inset-bottom)); }

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

/* 三态 */
.state { padding: 32rpx; }
.state.center { padding: 160rpx 80rpx; display: flex; flex-direction: column; align-items: center; gap: 16rpx; }
.skel { height: 120rpx; border-radius: 36rpx; background: #fff; margin-bottom: 24rpx; }
.skel.tall { height: 300rpx; }
.state-t { font-size: 28rpx; color: var(--text-tertiary, #999); }
.retry { margin-top: 12rpx; padding: 14rpx 56rpx; border-radius: 999rpx; background: var(--brand, #c41e3a); }
.retry-t { font-size: 26rpx; color: #fff; }

/* 管理员只读提示 */
.readonly-note {
  margin: 24rpx 32rpx 0; padding: 18rpx 24rpx;
  display: flex; align-items: center; gap: 12rpx;
  background: rgba(201, 123, 45, 0.08); border-radius: 20rpx;
}
.readonly-note-t { font-size: 24rpx; color: #c97b2d; line-height: 1.6; flex: 1; }

.group-label { display: block; margin: 36rpx 36rpx 16rpx; font-size: 24rpx; color: var(--text-tertiary, #999999); }
.group {
  margin: 0 32rpx; background: var(--bg-card, #ffffff);
  border-radius: 36rpx; box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
  overflow: hidden;
}

/* 模板卡（金描边） */
.tpl-card {
  margin: 0 32rpx; padding: 28rpx 32rpx;
  background: var(--bg-card, #ffffff); border-radius: 36rpx;
  border: 2rpx solid var(--gold, #c9a96e);
}
.tpl-head { display: flex; align-items: center; gap: 16rpx; }
.tpl-title { font-size: 28rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); flex: 1; }
.tpl-desc { display: block; font-size: 24rpx; color: var(--text-secondary, #6e6e73); line-height: 1.7; margin-top: 12rpx; }
.tpl-items { display: flex; flex-wrap: wrap; gap: 12rpx; margin-top: 20rpx; }
.tpl-item {
  padding: 6rpx 20rpx; border-radius: 22rpx;
  background: var(--bg-warm, #f8f4ec); font-size: 22rpx; color: var(--text-secondary, #6e6e73);
}
.tpl-apply {
  margin-top: 24rpx; height: 76rpx;
  border: 2rpx solid var(--gold, #c9a96e); border-radius: 38rpx;
  display: flex; align-items: center; justify-content: center;
}
.tpl-apply.disabled { opacity: 0.5; }
.tpl-apply-t { font-size: 26rpx; font-weight: 600; color: var(--gold, #c9a96e); }
.tpl-note { display: block; margin-top: 16rpx; font-size: 20rpx; color: var(--text-tertiary, #999999); text-align: center; }

/* 圈规条文 */
.rules-empty { padding: 40rpx 32rpx; }
.rules-empty-t { font-size: 26rpx; color: var(--text-tertiary, #999999); }
.rule-row { display: flex; align-items: flex-start; gap: 20rpx; padding: 26rpx 32rpx; }
.rule-row + .rule-row { border-top: 1rpx solid var(--separator, #ede7dd); }
.rule-no {
  width: 40rpx; height: 40rpx; border-radius: 50%; flex-shrink: 0; margin-top: 2rpx;
  background: var(--bg-warm, #f8f4ec);
  display: flex; align-items: center; justify-content: center;
}
.rule-no-t { font-size: 22rpx; font-weight: 600; color: var(--text-secondary, #6e6e73); }
.rule-main { flex: 1; min-width: 0; }
.rule-text { font-size: 28rpx; line-height: 1.6; color: var(--text-primary, #2c2c2c); }
.rule-more { flex-shrink: 0; padding: 4rpx; }
.rule-add {
  display: flex; align-items: center; justify-content: center; gap: 12rpx;
  padding: 26rpx 32rpx; border-top: 1rpx solid var(--separator, #ede7dd);
}
.rule-add-t { font-size: 28rpx; color: var(--brand, #c41e3a); font-weight: 500; }
.rule-confirm {
  display: flex; align-items: center; gap: 24rpx; padding: 26rpx 32rpx;
  border-top: 1rpx solid var(--separator, #ede7dd); background: var(--bg-warm, #f8f4ec);
}
.rule-confirm-main { flex: 1; min-width: 0; }
.rule-confirm-title { display: block; font-size: 28rpx; font-weight: 500; color: var(--text-primary, #2c2c2c); }
.rule-confirm-desc { display: block; font-size: 22rpx; color: var(--text-tertiary, #999999); margin-top: 4rpx; line-height: 1.5; }

/* 开关 */
.switch {
  width: 88rpx; height: 52rpx; border-radius: 26rpx;
  background: var(--separator, #ede7dd); position: relative; flex-shrink: 0;
  transition: background 0.2s;
}
.switch.on { background: var(--brand, #c41e3a); }
.switch.locked { opacity: 0.55; }
.switch-knob {
  position: absolute; top: 4rpx; left: 4rpx;
  width: 44rpx; height: 44rpx; border-radius: 50%; background: #ffffff;
  box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.2);
  transition: left 0.2s;
}
.switch.on .switch-knob { left: 40rpx; }

/* 违规处理阶梯 */
.ladder { padding: 28rpx 32rpx; }
.ladder-step { display: flex; align-items: flex-start; gap: 24rpx; position: relative; padding-bottom: 36rpx; }
.ladder-step.last { padding-bottom: 0; }
.ladder-step::before {
  content: ""; position: absolute; left: 22rpx; top: 52rpx; bottom: 0;
  width: 3rpx; background: var(--separator, #ede7dd);
}
.ladder-step.last::before { display: none; }
.ladder-dot {
  width: 48rpx; height: 48rpx; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: var(--bg-warm, #f8f4ec);
  position: relative; z-index: 1;
}
.ladder-dot.warn { background: rgba(201, 123, 45, 0.12); }
.ladder-dot.mute { background: rgba(196, 30, 58, 0.08); }
.ladder-dot.out { background: var(--brand, #c41e3a); }
.ladder-dot-t { font-size: 22rpx; font-weight: 600; color: var(--text-secondary, #6e6e73); }
.ladder-dot-t.warn { color: #c97b2d; }
.ladder-dot-t.mute { color: var(--brand, #c41e3a); }
.ladder-dot-t.out { color: #ffffff; }
.ladder-main { flex: 1; min-width: 0; }
.ladder-title { display: block; font-size: 28rpx; font-weight: 500; color: var(--text-primary, #2c2c2c); }
.ladder-desc { display: block; font-size: 24rpx; color: var(--text-tertiary, #999999); margin-top: 4rpx; line-height: 1.6; }
.ladder-config {
  display: inline-flex; align-items: center; gap: 8rpx; margin-top: 12rpx;
  padding: 8rpx 20rpx; border-radius: 24rpx;
  background: var(--bg-warm, #f8f4ec);
}
.ladder-config-t { font-size: 24rpx; color: var(--text-secondary, #6e6e73); }
.ladder-config-b { color: var(--text-primary, #2c2c2c); font-weight: 600; }
.ladder-chev { font-size: 24rpx; color: var(--text-tertiary, #999999); }
.ladder-note { display: block; padding: 0 32rpx 28rpx; font-size: 22rpx; color: var(--text-tertiary, #999999); line-height: 1.6; }

/* 自动治理行 */
.auto-row { display: flex; align-items: center; gap: 24rpx; padding: 26rpx 32rpx; }
.auto-row + .auto-row { border-top: 1rpx solid var(--separator, #ede7dd); }
.auto-main { flex: 1; min-width: 0; }
.auto-title { display: block; font-size: 28rpx; font-weight: 500; color: var(--text-primary, #2c2c2c); }
.auto-desc { display: block; font-size: 22rpx; color: var(--text-tertiary, #999999); margin-top: 4rpx; line-height: 1.5; }
.auto-scope { display: block; font-size: 20rpx; color: #c97b2d; margin-top: 6rpx; line-height: 1.5; }
.auto-value { flex-shrink: 0; display: flex; align-items: center; gap: 8rpx; }
.auto-value-t { font-size: 26rpx; color: var(--text-secondary, #6e6e73); }
.auto-chev { font-size: 26rpx; color: var(--text-tertiary, #999999); }

/* 治理记录 */
.record-row { display: flex; align-items: center; gap: 24rpx; padding: 28rpx 32rpx; }
.record-icon {
  width: 68rpx; height: 68rpx; border-radius: 20rpx; flex-shrink: 0;
  background: var(--bg-warm, #f8f4ec);
  display: flex; align-items: center; justify-content: center;
}
.record-main { flex: 1; min-width: 0; }
.record-title { display: block; font-size: 28rpx; font-weight: 500; color: var(--text-primary, #2c2c2c); }
.record-desc { display: block; font-size: 22rpx; color: var(--text-tertiary, #999999); margin-top: 4rpx; }
.record-badge {
  padding: 4rpx 16rpx; border-radius: 18rpx; flex-shrink: 0;
  background: rgba(196, 30, 58, 0.08);
}
.record-badge-t { font-size: 22rpx; font-weight: 600; color: var(--brand, #c41e3a); }
.log-empty { padding: 32rpx; border-top: 1rpx solid var(--separator, #ede7dd); }
.log-empty-t { font-size: 24rpx; color: var(--text-tertiary, #999999); }
.log-row {
  display: flex; align-items: flex-start; gap: 20rpx;
  padding: 24rpx 32rpx; border-top: 1rpx solid var(--separator, #ede7dd);
}
.log-type { flex-shrink: 0; padding: 4rpx 16rpx; border-radius: 10rpx; background: var(--bg-warm, #f8f4ec); }
.log-type.warning { background: rgba(201, 123, 45, 0.1); }
.log-type.mute { background: rgba(196, 30, 58, 0.08); }
.log-type.remove { background: var(--brand, #c41e3a); }
.log-type-t { font-size: 22rpx; font-weight: 500; color: var(--text-secondary, #6e6e73); }
.log-type-t.warning { color: #c97b2d; }
.log-type-t.mute { color: var(--brand, #c41e3a); }
.log-type-t.remove { color: #ffffff; }
.log-main { flex: 1; min-width: 0; }
.log-text { display: block; font-size: 26rpx; color: var(--text-primary, #2c2c2c); line-height: 1.6; }
.log-meta { display: block; font-size: 22rpx; color: var(--text-tertiary, #999999); margin-top: 4rpx; }
.log-more { padding: 20rpx 32rpx; border-top: 1rpx solid var(--separator, #ede7dd); }
.log-more-t { font-size: 22rpx; color: var(--text-tertiary, #999999); }

.page-note { display: block; margin: 28rpx 36rpx 0; font-size: 22rpx; color: var(--text-tertiary, #999999); line-height: 1.7; }
.bottom-pad { height: 40rpx; }

/* 吸底保存 */
.savebar {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 30;
  padding: 24rpx 32rpx calc(24rpx + env(safe-area-inset-bottom));
  background: rgba(250, 248, 245, 0.92); backdrop-filter: blur(24rpx);
  border-top: 1rpx solid var(--separator, #ede7dd);
}
.btn-save {
  height: 92rpx; border-radius: 46rpx; background: var(--brand, #c41e3a);
  display: flex; align-items: center; justify-content: center;
}
.btn-save.disabled { opacity: 0.6; }
.btn-save-t { font-size: 32rpx; font-weight: 600; color: #ffffff; letter-spacing: 2rpx; }

/* 弹层 */
.mask {
  position: fixed; inset: 0; z-index: 50;
  background: rgba(44, 44, 44, 0.45);
  display: flex; align-items: center; justify-content: center;
  padding: 0 48rpx;
}
.modal {
  width: 100%; background: #ffffff; border-radius: 36rpx;
  padding: 40rpx 36rpx 32rpx;
}
.modal-title { display: block; font-size: 32rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); text-align: center; }
.modal-input {
  width: 100%; height: 180rpx; margin-top: 28rpx;
  padding: 20rpx 24rpx; box-sizing: border-box;
  background: var(--bg-warm, #f8f4ec); border-radius: 20rpx;
  font-size: 28rpx; line-height: 1.6; color: var(--text-primary, #2c2c2c);
}
.modal-input.tall { height: 260rpx; }
.modal-count { display: block; margin-top: 8rpx; font-size: 22rpx; color: var(--text-tertiary, #999999); text-align: right; }
.modal-btns { display: flex; gap: 20rpx; margin-top: 28rpx; }
.modal-btn {
  flex: 1; height: 80rpx; border-radius: 40rpx;
  display: flex; align-items: center; justify-content: center;
}
.modal-btn.ghost { border: 1rpx solid var(--separator, #ede7dd); }
.modal-btn.primary { background: var(--brand, #c41e3a); }
.modal-btn.disabled { opacity: 0.6; }
.modal-btn-t { font-size: 28rpx; }
.modal-btn-t.ghost { color: var(--text-secondary, #6e6e73); }
.modal-btn-t.primary { color: #ffffff; font-weight: 600; }
.modal-hint { display: block; margin-top: 20rpx; font-size: 22rpx; color: var(--text-tertiary, #999999); text-align: center; }
.words-toggle { display: flex; align-items: center; justify-content: space-between; margin-top: 24rpx; }
.words-toggle-t { font-size: 28rpx; color: var(--text-primary, #2c2c2c); }
</style>
