<script setup lang="ts">
/** 分站微页面装修器（P2-b）— 站长像装修店铺一样自建分站首页：
 *  楼层式增删改排序 + 草稿即时保存 + 一键发布。复用后端 MarketingPage 引擎（站长自服务端点）。 */
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import {
  microPageApi,
  COMPONENT_LIBRARY,
  findBlueprint,
  componentIcon,
  type MicroPage,
  type MicroComponent,
  type ComponentBlueprint,
} from '@/lib/station-micro-page-data'

const loading = ref(true)
const error = ref('')
const notOpened = ref(false)
const submitting = ref(false)

const page = ref<MicroPage | null>(null)
const components = ref<MicroComponent[]>([])

const published = computed(() => page.value?.status === 'PUBLISHED')

onLoad((q: Record<string, string> = {}) => {
  loadData(q.id)
})

async function loadData(preferId?: string) {
  loading.value = true
  error.value = ''
  notOpened.value = false
  try {
    let target: MicroPage | null = null
    const list = await microPageApi.getMy()
    if (preferId) target = list.find((p) => p.id === preferId) || null
    if (!target) target = list[0] || null
    // 没有任何微页面 → 自动创建一个「分站首页」
    if (!target) {
      target = await microPageApi.create('分站首页')
    }
    // 列表项不含 components，拉详情
    const detail = await microPageApi.getDetail(target.id)
    page.value = detail
    components.value = [...(detail.components || [])].sort((a, b) => a.sortOrder - b.sortOrder)
  } catch (e) {
    const msg = (e as Error)?.message || ''
    if (/没有开通|未开通|FORBIDDEN|403/.test(msg)) notOpened.value = true
    else error.value = msg || '加载失败'
  } finally {
    loading.value = false
  }
}
async function retry() { await loadData() }

// ───────── 添加组件 ─────────
const showLibrary = ref(false)
function openLibrary() { showLibrary.value = true }
function closeLibrary() { showLibrary.value = false }

async function addComponent(bp: ComponentBlueprint) {
  if (submitting.value || !page.value) return
  submitting.value = true
  try {
    const created = await microPageApi.addComponent(page.value.id, {
      type: bp.type,
      title: bp.defaultTitle,
      config: { ...bp.defaultConfig },
      sortOrder: components.value.length,
    })
    components.value.push(created)
    closeLibrary()
    // 内容型组件直接进编辑
    if (bp.configurable) openEditor(created)
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '添加失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

// ───────── 排序（上移/下移） ─────────
async function move(index: number, dir: -1 | 1) {
  if (submitting.value || !page.value) return
  const target = index + dir
  if (target < 0 || target >= components.value.length) return
  const arr = [...components.value]
  ;[arr[index], arr[target]] = [arr[target], arr[index]]
  components.value = arr
  submitting.value = true
  try {
    await microPageApi.sortComponents(page.value.id, arr.map((c) => c.id))
  } catch (e) {
    uni.showToast({ title: '排序失败', icon: 'none' })
    await loadData(page.value.id)
  } finally {
    submitting.value = false
  }
}

// ───────── 删除 ─────────
async function removeComponent(comp: MicroComponent) {
  if (!page.value) return
  uni.showModal({
    title: '删除组件',
    content: `确定删除「${comp.title || componentLabel(comp.type)}」吗？`,
    confirmColor: '#C41E3A',
    success: async (r) => {
      if (!r.confirm || submitting.value || !page.value) return
      submitting.value = true
      try {
        await microPageApi.deleteComponent(page.value.id, comp.id)
        components.value = components.value.filter((c) => c.id !== comp.id)
      } catch (e) {
        uni.showToast({ title: '删除失败', icon: 'none' })
      } finally {
        submitting.value = false
      }
    },
  })
}

// ───────── 编辑组件配置 ─────────
const editing = ref<MicroComponent | null>(null)
const editTitle = ref('')
// 动态楼层配置对象，字段随组件类型变化，保留 any
const editConfig = ref<Record<string, any>>({})
const editBlueprint = computed(() => (editing.value ? findBlueprint(editing.value.type) : undefined))

function openEditor(comp: MicroComponent) {
  editing.value = comp
  editTitle.value = comp.title || ''
  editConfig.value = JSON.parse(JSON.stringify(comp.config || {}))
}
function closeEditor() { editing.value = null }
// 绑定到 uni <switch>，vue-tsc 按原生事件签名校验，保留 any
function onStatsChange(e: any) { editConfig.value.showStats = !!e?.detail?.value }

// banner 图片 URL 增删
function addBannerImage() {
  if (!Array.isArray(editConfig.value.images)) editConfig.value.images = []
  editConfig.value.images.push({ url: '', link: '' })
}
function removeBannerImage(i: number) {
  editConfig.value.images.splice(i, 1)
}

async function saveEditor() {
  if (submitting.value || !page.value || !editing.value) return
  submitting.value = true
  try {
    await microPageApi.updateComponent(page.value.id, editing.value.id, {
      title: editTitle.value,
      config: editConfig.value,
    })
    const idx = components.value.findIndex((c) => c.id === editing.value!.id)
    if (idx >= 0) {
      components.value[idx] = { ...components.value[idx], title: editTitle.value, config: { ...editConfig.value } }
    }
    closeEditor()
    uni.showToast({ title: '已保存', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '保存失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

// ───────── 发布 / 预览 ─────────
async function publish() {
  if (submitting.value || !page.value) return
  if (!components.value.length) { uni.showToast({ title: '请先添加至少一个楼层', icon: 'none' }); return }
  submitting.value = true
  try {
    await microPageApi.publish(page.value.id)
    if (page.value) page.value.status = 'PUBLISHED'
    uni.showToast({ title: '发布成功', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '发布失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}
function preview() { navigateTo('/pkg-operator/station-home/index') }
function goBack() { uni.navigateBack({ fail: () => navigateTo('/pages/index/index') }) }

function componentLabel(type: string) { return findBlueprint(type)?.name || type }
function summarize(comp: MicroComponent): string {
  const c = comp.config || {}
  switch (comp.type) {
    case 'richtext': return c.content ? String(c.content).slice(0, 24) : '未填写内容'
    case 'master-card': return c.intro ? String(c.intro).slice(0, 24) : '展示站长信息'
    case 'recommend': return '平台精选好课好物'
    case 'banner': return `${(c.images || []).length} 张图`
    case 'recommend-course': return `${(c.courseIds || []).length} 门课程`
    case 'recommend-agent': return `${(c.agentIds || []).length} 个智能体`
    default: return ''
  }
}
</script>

<template>
  <view class="mp">
    <!-- Header -->
    <view class="mp-header">
      <view class="mp-hbtn" @tap="goBack"><app-icon name="arrow-left" :size="40" color="#1f2937" /></view>
      <view class="mp-htitle">
        <text class="mp-htitle-txt">装修分站首页</text>
        <text class="mp-hstatus" :class="published ? 'on' : 'off'">{{ published ? '已发布' : '草稿' }}</text>
      </view>
      <view class="mp-hpreview" @tap="preview"><app-icon name="eye" :size="36" color="#C41E3A" /></view>
    </view>

    <!-- 三态 -->
    <view v-if="loading" class="mp-state">
      <view v-for="i in 4" :key="i" class="mp-sk" />
    </view>
    <view v-else-if="error" class="mp-state center">
      <app-icon name="alert-circle" :size="72" color="#ef4444" />
      <text class="mp-state-text">{{ error }}</text>
      <view class="mp-state-btn" @tap="retry"><text>重试</text></view>
    </view>
    <view v-else-if="notOpened" class="mp-state center">
      <app-icon name="store" :size="80" color="#C9A96E" />
      <text class="mp-state-title">你还没有开通分站</text>
      <text class="mp-state-desc">开通分站后即可装修你的专属首页</text>
      <view class="mp-state-btn" @tap="navigateTo('/pkg-operator/join-station/index')"><text>了解分站</text></view>
    </view>

    <template v-else>
      <scroll-view scroll-y class="mp-scroll">
        <view class="mp-tip">
          <app-icon name="info" :size="28" color="#C9A96E" />
          <text class="mp-tip-txt">像装修店铺一样搭建你的分站首页，添加楼层、调整顺序，满意后点击发布。</text>
        </view>

        <!-- 空态 -->
        <view v-if="!components.length" class="mp-empty">
          <app-icon name="layout" :size="96" color="#d6ccbb" />
          <text class="mp-empty-title">还没有楼层</text>
          <text class="mp-empty-desc">点击下方「添加楼层」开始装修</text>
        </view>

        <!-- 楼层列表 -->
        <view v-else class="mp-list">
          <view v-for="(comp, i) in components" :key="comp.id" class="mp-floor">
            <view class="mp-floor-icon"><app-icon :name="componentIcon(comp.type)" :size="40" color="#C41E3A" /></view>
            <view class="mp-floor-body" @tap="openEditor(comp)">
              <view class="mp-floor-top">
                <text class="mp-floor-name">{{ comp.title || componentLabel(comp.type) }}</text>
                <text class="mp-floor-type">{{ componentLabel(comp.type) }}</text>
              </view>
              <text class="mp-floor-sum">{{ summarize(comp) }}</text>
            </view>
            <view class="mp-floor-ops">
              <view class="mp-op" :class="{ disabled: i === 0 }" @tap.stop="move(i, -1)"><app-icon name="chevron-up" :size="32" :color="i === 0 ? '#d1d5db' : '#6b7280'" /></view>
              <view class="mp-op" :class="{ disabled: i === components.length - 1 }" @tap.stop="move(i, 1)"><app-icon name="chevron-down" :size="32" :color="i === components.length - 1 ? '#d1d5db' : '#6b7280'" /></view>
              <view class="mp-op" @tap.stop="removeComponent(comp)"><app-icon name="trash-2" :size="30" color="#ef4444" /></view>
            </view>
          </view>
        </view>

        <view class="mp-bottom-pad" />
      </scroll-view>

      <!-- 底部操作栏 -->
      <view class="mp-actionbar">
        <view class="mp-add" @tap="openLibrary">
          <app-icon name="plus" :size="34" color="#C41E3A" />
          <text class="mp-add-txt">添加楼层</text>
        </view>
        <view class="mp-publish" :style="{ opacity: submitting ? 0.7 : 1 }" @tap="publish">
          <text class="mp-publish-txt">{{ published ? '更新发布' : '发布' }}</text>
        </view>
      </view>
    </template>

    <!-- 组件库面板 -->
    <view v-if="showLibrary" class="mp-mask" @tap="closeLibrary">
      <view class="mp-sheet" @tap.stop>
        <view class="mp-sheet-head">
          <text class="mp-sheet-title">选择楼层组件</text>
          <view class="mp-sheet-close" @tap="closeLibrary"><app-icon name="x" :size="40" color="#666" /></view>
        </view>
        <view class="mp-lib">
          <view v-for="bp in COMPONENT_LIBRARY" :key="bp.type" class="mp-lib-item" @tap="addComponent(bp)">
            <view class="mp-lib-icon"><app-icon :name="bp.icon" :size="44" color="#C41E3A" /></view>
            <view class="mp-lib-body">
              <view class="mp-lib-name-row">
                <text class="mp-lib-name">{{ bp.name }}</text>
                <text v-if="!bp.configurable" class="mp-lib-soon">配置项完善中</text>
              </view>
              <text class="mp-lib-desc">{{ bp.desc }}</text>
            </view>
            <app-icon name="plus-circle" :size="40" color="#C41E3A" />
          </view>
        </view>
      </view>
    </view>

    <!-- 组件编辑弹层 -->
    <view v-if="editing" class="mp-mask" @tap="closeEditor">
      <view class="mp-sheet" @tap.stop>
        <view class="mp-sheet-head">
          <text class="mp-sheet-title">编辑 · {{ componentLabel(editing.type) }}</text>
          <view class="mp-sheet-close" @tap="closeEditor"><app-icon name="x" :size="40" color="#666" /></view>
        </view>
        <scroll-view scroll-y class="mp-edit">
          <!-- 通用：楼层标题 -->
          <view class="mp-field">
            <text class="mp-flabel">楼层标题</text>
            <input class="mp-input" v-model="editTitle" maxlength="20" placeholder="给这个楼层起个名字" />
          </view>

          <!-- 公告 richtext -->
          <view v-if="editing.type === 'richtext'" class="mp-field">
            <text class="mp-flabel">公告内容</text>
            <textarea class="mp-textarea" v-model="editConfig.content" maxlength="500" placeholder="输入公告 / 活动说明..." />
          </view>

          <!-- 站长名片 master-card -->
          <template v-else-if="editing.type === 'master-card'">
            <view class="mp-field">
              <text class="mp-flabel">个人简介</text>
              <textarea class="mp-textarea" v-model="editConfig.intro" maxlength="200" placeholder="介绍一下你自己..." />
            </view>
            <view class="mp-switch-row">
              <text class="mp-flabel">展示经营数据</text>
              <switch :checked="!!editConfig.showStats" color="#C41E3A" @change="onStatsChange" />
            </view>
          </template>

          <!-- 精选内容 recommend -->
          <view v-else-if="editing.type === 'recommend'" class="mp-hint-box">
            <app-icon name="grid" :size="40" color="#C9A96E" />
            <text class="mp-hint-txt">该楼层自动展示平台精选好课好物，无需额外配置。</text>
          </view>

          <!-- 轮播图 banner -->
          <template v-else-if="editing.type === 'banner'">
            <view class="mp-field">
              <view class="mp-banner-head">
                <text class="mp-flabel">轮播图（图片地址）</text>
                <text class="mp-banner-add" @tap="addBannerImage">+ 添加</text>
              </view>
              <view v-for="(img, bi) in (editConfig.images || [])" :key="bi" class="mp-banner-item">
                <input class="mp-input" v-model="img.url" placeholder="图片 URL" />
                <input class="mp-input" v-model="img.link" placeholder="跳转链接(可选)" />
                <view class="mp-banner-del" @tap="removeBannerImage(bi)"><app-icon name="trash-2" :size="28" color="#ef4444" /></view>
              </view>
              <text class="mp-banner-tip">图片上传功能即将开放，当前可先填图片地址</text>
            </view>
          </template>

          <!-- 推荐课程 / 智能体（配置项完善中） -->
          <view v-else class="mp-hint-box">
            <app-icon name="clock" :size="40" color="#C9A96E" />
            <text class="mp-hint-txt">「{{ componentLabel(editing.type) }}」的内容选择器即将开放，当前楼层会展示默认推荐。</text>
          </view>
        </scroll-view>
        <view class="mp-edit-foot">
          <view class="mp-save" :style="{ opacity: submitting ? 0.7 : 1 }" @tap="saveEditor"><text class="mp-save-txt">保存</text></view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.mp { min-height: 100vh; background: #FAF8F5; display: flex; flex-direction: column; }

.mp-header { display: flex; align-items: center; justify-content: space-between; height: 88rpx; padding: 0 24rpx; background: #fff; border-bottom: 1rpx solid #f0ece4; }
.mp-hbtn, .mp-hpreview { width: 64rpx; height: 64rpx; display: flex; align-items: center; justify-content: center; }
.mp-htitle { flex: 1; display: flex; align-items: center; justify-content: center; gap: 12rpx; }
.mp-htitle-txt { font-size: 34rpx; font-weight: 600; color: #1f2937; }
.mp-hstatus { font-size: 20rpx; padding: 2rpx 12rpx; border-radius: 8rpx; }
.mp-hstatus.on { background: #dcfce7; color: #16a34a; }
.mp-hstatus.off { background: #f3f4f6; color: #9ca3af; }

.mp-scroll { flex: 1; }
.mp-tip { display: flex; align-items: flex-start; gap: 12rpx; margin: 24rpx 32rpx 0; padding: 20rpx 24rpx; background: #FBF7EF; border-radius: 16rpx; }
.mp-tip-txt { flex: 1; font-size: 24rpx; color: #8a7a5c; line-height: 1.5; }

.mp-empty { display: flex; flex-direction: column; align-items: center; gap: 16rpx; padding: 140rpx 48rpx; }
.mp-empty-title { font-size: 30rpx; font-weight: 600; color: #6b7280; }
.mp-empty-desc { font-size: 26rpx; color: #9ca3af; }

.mp-list { padding: 24rpx 32rpx; display: flex; flex-direction: column; gap: 20rpx; }
.mp-floor { display: flex; align-items: center; gap: 20rpx; padding: 24rpx; background: #fff; border-radius: 20rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,.04); }
.mp-floor-icon { width: 80rpx; height: 80rpx; border-radius: 16rpx; background: rgba(196,30,58,0.08); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.mp-floor-body { flex: 1; min-width: 0; }
.mp-floor-top { display: flex; align-items: center; gap: 12rpx; }
.mp-floor-name { font-size: 28rpx; font-weight: 600; color: #1f2937; }
.mp-floor-type { font-size: 20rpx; color: #9ca3af; background: #f3f4f6; border-radius: 6rpx; padding: 2rpx 10rpx; }
.mp-floor-sum { display: block; margin-top: 6rpx; font-size: 24rpx; color: #9ca3af; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mp-floor-ops { display: flex; align-items: center; gap: 4rpx; flex-shrink: 0; }
.mp-op { width: 56rpx; height: 56rpx; display: flex; align-items: center; justify-content: center; }
.mp-op.disabled { opacity: 0.5; }

.mp-bottom-pad { height: 180rpx; }

.mp-actionbar { position: fixed; bottom: 0; left: 0; right: 0; display: flex; gap: 24rpx; padding: 20rpx 32rpx; padding-bottom: calc(20rpx + env(safe-area-inset-bottom)); background: #fff; border-top: 1rpx solid #f0ece4; }
.mp-add { flex: 1; height: 88rpx; border: 2rpx solid var(--brand); border-radius: 16rpx; display: flex; align-items: center; justify-content: center; gap: 8rpx; }
.mp-add-txt { font-size: 28rpx; color: var(--brand); font-weight: 500; }
.mp-publish { flex: 1; height: 88rpx; background: var(--brand); border-radius: 16rpx; display: flex; align-items: center; justify-content: center; }
.mp-publish-txt { font-size: 28rpx; color: #fff; font-weight: 600; }

/* 三态 */
.mp-state { padding: 32rpx; }
.mp-state.center { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24rpx; padding: 160rpx 48rpx; }
.mp-sk { height: 140rpx; border-radius: 20rpx; background: #EDE7DC; opacity: 0.6; margin-bottom: 20rpx; }
.mp-state-text { font-size: 28rpx; color: #ef4444; }
.mp-state-title { font-size: 30rpx; font-weight: 600; color: #1f2937; }
.mp-state-desc { font-size: 26rpx; color: #9ca3af; text-align: center; }
.mp-state-btn { padding: 16rpx 56rpx; background: var(--brand); border-radius: 16rpx; }
.mp-state-btn text { font-size: 28rpx; color: #fff; }

/* 弹层 */
.mp-mask { position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,0.5); display: flex; align-items: flex-end; }
.mp-sheet { width: 100%; max-height: 82vh; background: #fff; border-radius: 32rpx 32rpx 0 0; display: flex; flex-direction: column; }
.mp-sheet-head { display: flex; align-items: center; justify-content: space-between; padding: 32rpx; border-bottom: 1rpx solid #f5f1ea; }
.mp-sheet-title { font-size: 30rpx; font-weight: 600; color: #1f2937; }
.mp-sheet-close { width: 56rpx; height: 56rpx; display: flex; align-items: center; justify-content: center; }

/* 组件库 */
.mp-lib { padding: 16rpx 32rpx 48rpx; }
.mp-lib-item { display: flex; align-items: center; gap: 20rpx; padding: 24rpx 0; border-bottom: 1rpx solid #f5f1ea; }
.mp-lib-icon { width: 80rpx; height: 80rpx; border-radius: 16rpx; background: rgba(196,30,58,0.08); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.mp-lib-body { flex: 1; min-width: 0; }
.mp-lib-name-row { display: flex; align-items: center; gap: 12rpx; }
.mp-lib-name { font-size: 28rpx; font-weight: 600; color: #1f2937; }
.mp-lib-soon { font-size: 18rpx; color: #C9A96E; background: #FBF3E3; border-radius: 6rpx; padding: 2rpx 8rpx; }
.mp-lib-desc { display: block; margin-top: 4rpx; font-size: 22rpx; color: #9ca3af; }

/* 编辑 */
.mp-edit { padding: 24rpx 32rpx; max-height: 56vh; }
.mp-field { margin-bottom: 28rpx; }
.mp-flabel { font-size: 26rpx; color: #4b5563; margin-bottom: 12rpx; display: block; }
.mp-input { height: 76rpx; padding: 0 24rpx; background: #fff; border: 1rpx solid #e5e7eb; border-radius: 14rpx; font-size: 28rpx; color: #1f2937; box-sizing: border-box; margin-bottom: 12rpx; }
.mp-textarea { width: 100%; min-height: 180rpx; padding: 16rpx 24rpx; background: #fff; border: 1rpx solid #e5e7eb; border-radius: 14rpx; font-size: 28rpx; color: #1f2937; box-sizing: border-box; }
.mp-switch-row { display: flex; align-items: center; justify-content: space-between; padding: 8rpx 0; }
.mp-hint-box { display: flex; flex-direction: column; align-items: center; gap: 16rpx; padding: 48rpx 32rpx; }
.mp-hint-txt { font-size: 26rpx; color: #8a7a5c; text-align: center; line-height: 1.5; }
.mp-banner-head { display: flex; align-items: center; justify-content: space-between; }
.mp-banner-add { font-size: 26rpx; color: var(--brand); }
.mp-banner-item { display: flex; align-items: center; gap: 12rpx; margin-top: 12rpx; }
.mp-banner-item .mp-input { flex: 1; margin-bottom: 0; }
.mp-banner-del { width: 56rpx; height: 56rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.mp-banner-tip { display: block; margin-top: 12rpx; font-size: 22rpx; color: #C9A96E; }

.mp-edit-foot { padding: 20rpx 32rpx; padding-bottom: calc(20rpx + env(safe-area-inset-bottom)); border-top: 1rpx solid #f5f1ea; }
.mp-save { height: 88rpx; background: var(--brand); border-radius: 16rpx; display: flex; align-items: center; justify-content: center; }
.mp-save-txt { font-size: 30rpx; color: #fff; font-weight: 600; }
</style>
