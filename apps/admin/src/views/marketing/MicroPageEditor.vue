<template>
  <div class="page">
    <div class="toolbar">
      <h3>微页面管理</h3>
      <el-button type="primary" @click="openCreate">创建微页面</el-button>
    </div>
    <el-table v-loading="loading" :data="list" stripe>
      <el-table-column prop="title" label="页面标题" min-width="150" />
      <el-table-column label="组件数" width="80">
        <template #default="{ row }">{{ row.components?.length || 0 }}</template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="row.status === 'PUBLISHED' ? 'success' : 'info'" size="small">
            {{ row.status === 'PUBLISHED' ? '已发布' : '草稿' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="版本" width="70">
        <template #default="{ row }">v{{ row.version || 1 }}</template>
      </el-table-column>
      <el-table-column label="创建时间" width="170">
        <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="480" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="openEdit(row)">编辑</el-button>
          <el-button size="small" type="primary" @click="openVisualEditor(row)">可视化编辑</el-button>
          <el-button size="small" @click="openComponents(row)">列表</el-button>
          <el-button size="small" @click="openVersions(row)">版本</el-button>
          <el-button v-if="row.status !== 'PUBLISHED'" size="small" type="success" @click="doPublish(row)">发布</el-button>
          <el-button size="small" type="danger" @click="del(row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div v-if="total > 20" style="margin-top:16px;display:flex;justify-content:flex-end">
      <el-pagination v-model:current-page="page" :total="total" :page-size="20" layout="total, prev, pager, next" @current-change="fetchList" />
    </div>

    <!-- 页面编辑弹窗 -->
    <el-dialog v-model="vis" :title="editingId ? '编辑微页面' : '创建微页面'" width="500px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="标题" required><el-input v-model="form.title" /></el-form-item>
        <el-form-item label="路径"><el-input v-model="form.path" placeholder="如 /promo/spring" /></el-form-item>
        <el-form-item label="描述"><el-input v-model="form.description" type="textarea" :rows="2" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="vis = false">取消</el-button><el-button type="primary" :loading="saving" @click="save">保存</el-button></template>
    </el-dialog>

    <!-- 组件管理弹窗（列表模式） -->
    <el-dialog v-model="compVis" title="页面组件" width="750px">
      <div style="margin-bottom:12px;display:flex;gap:8px">
        <el-button size="small" type="primary" @click="openCompCreate">添加组件</el-button>
        <el-button size="small" :disabled="components.length < 2" @click="doSort">保存排序</el-button>
      </div>
      <el-table :data="components" stripe max-height="400" row-key="id">
        <el-table-column label="排序" width="70">
          <template #default="{ $index }">
            <el-button-group size="small">
              <el-button :disabled="$index === 0" @click="moveComp($index, -1)">↑</el-button>
              <el-button :disabled="$index === components.length - 1" @click="moveComp($index, 1)">↓</el-button>
            </el-button-group>
          </template>
        </el-table-column>
        <el-table-column prop="type" label="组件类型" width="110">
          <template #default="{ row }">{{ compTypeMap[row.type] || row.type }}</template>
        </el-table-column>
        <el-table-column prop="title" label="标题" min-width="120" />
        <el-table-column label="展示时段" min-width="170">
          <template #default="{ row }">
            <span v-if="row.startTime || row.endTime">{{ row.startTime ? formatDate(row.startTime) : '不限' }} ~ {{ row.endTime ? formatDate(row.endTime) : '不限' }}</span>
            <span v-else style="color:#ccc">一直展示</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="140">
          <template #default="{ row }">
            <el-button size="small" @click="openCompEdit(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="delComp(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div v-if="components.length === 0" style="text-align:center;padding:40px;color:#ccc">暂无组件，点击"添加组件"开始</div>
    </el-dialog>

    <!-- 组件编辑弹窗 -->
    <el-dialog v-model="compFormVis" :title="compEditingId ? '编辑组件' : '添加组件'" width="550px">
      <el-form :model="compForm" label-width="80px">
        <el-form-item label="类型" required>
          <el-select v-model="compForm.type" style="width:100%">
            <el-option v-for="(label, value) in compTypeMap" :key="value" :label="label" :value="value" />
          </el-select>
        </el-form-item>
        <el-form-item label="标题"><el-input v-model="compForm.title" /></el-form-item>
        <el-form-item label="配置JSON">
          <el-input v-model="compForm.configStr" type="textarea" :rows="4" placeholder='如 {"productIds":["id1"],"showPrice":true}' />
        </el-form-item>
        <el-form-item label="开始时间">
          <el-date-picker v-model="compForm.startTime" type="datetime" placeholder="选择开始时间（可选）" style="width:100%" value-format="YYYY-MM-DD HH:mm:ss" />
        </el-form-item>
        <el-form-item label="结束时间">
          <el-date-picker v-model="compForm.endTime" type="datetime" placeholder="选择结束时间（可选）" style="width:100%" value-format="YYYY-MM-DD HH:mm:ss" />
        </el-form-item>
        <el-form-item label="定向人群">
          <el-input v-model="compForm.audienceStr" type="textarea" :rows="2" placeholder='可选，如 {"userTags":["vip"],"memberLevels":[2,3]}' />
        </el-form-item>
      </el-form>
      <template #footer><el-button @click="compFormVis = false">取消</el-button><el-button type="primary" :loading="compSaving" @click="saveComp">保存</el-button></template>
    </el-dialog>

    <!-- ═══════════════════════════════════════ -->
    <!-- 可视化编辑器（全屏对话框） -->
    <!-- ═══════════════════════════════════════ -->
    <el-dialog v-model="veVis" title="" fullscreen destroy-on-close class="visual-editor-dlg">
      <!-- 顶部工具栏 -->
      <div class="ve-toolbar">
        <div class="ve-tbar-left">
          <el-button text @click="veVis = false">← 返回列表</el-button>
          <span class="ve-page-name">{{ vePageTitle || '未命名页面' }}</span>
        </div>
        <div class="ve-tbar-right">
          <el-button :loading="veSaving" @click="veSave">保存</el-button>
          <el-button type="success" @click="vePublish">发布</el-button>
        </div>
      </div>

      <div class="ve-body">
        <!-- 左侧：组件库 -->
        <div class="ve-left">
          <div class="ve-left-title">组件库</div>
          <div class="ve-comp-lib">
            <div
              v-for="(label, type) in compTypeMap"
              :key="type"
              class="ve-comp-item"
              draggable="true"
              @dragstart="onDragStart($event, type)"
              @click="veAddComp(type)"
            >
              <span class="ve-comp-icon">{{ compIcon(type) }}</span>
              <span class="ve-comp-label">{{ label }}</span>
            </div>
          </div>
        </div>

        <!-- 中间：手机预览 -->
        <div class="ve-center">
          <div class="ve-phone-frame">
            <div class="ve-phone-status">微页面预览</div>
            <div
              class="ve-phone-body"
              @drop="onDrop"
              @dragover.prevent
              @dragenter="dragOver = true"
              @dragleave="dragOver = false"
              :class="{ 've-drag-over': dragOver }"
            >
              <!-- 拖入此处提示 -->
              <div v-if="!veComponents.length" class="ve-drop-hint">
                <span>从左侧拖入组件到此处<br>或点击组件库中的组件添加</span>
              </div>

              <!-- 渲染组件 -->
              <div
                v-for="(comp, idx) in veComponents"
                :key="comp._key || idx"
                class="ve-render-comp"
                :class="{ 've-selected': veSelectedIdx === idx }"
                :draggable="true"
                @dragstart="onCompDragStart($event, idx)"
                @dragover.prevent="onCompDragOver($event, idx)"
                @drop.stop="onCompDrop($event, idx)"
                @click.stop="veSelectComp(idx)"
              >
                <!-- 序号和操作按钮 -->
                <div class="ve-comp-actions">
                  <span class="ve-comp-idx">{{ idx + 1 }}</span>
                  <span class="ve-comp-type-tag">{{ compTypeMap[comp.type] || comp.type }}</span>
                  <el-button size="small" type="danger" circle :icon="'Delete'" @click.stop="veDeleteComp(idx)" style="width:22px;height:22px" />
                </div>
                <!-- 组件可视化渲染 -->
                <div class="ve-comp-body">
                  <component :is="veRenderComp(comp)" :comp="comp" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧：属性面板 -->
        <div class="ve-right">
          <template v-if="veSelectedIdx !== null && veComponents[veSelectedIdx]">
            <div class="ve-right-title">组件属性</div>
            <el-form :model="vePropForm" label-width="70px" size="small">
              <el-form-item label="类型">
                <el-select v-model="vePropForm.type" style="width:100%">
                  <el-option v-for="(label, value) in compTypeMap" :key="value" :label="label" :value="value" />
                </el-select>
              </el-form-item>
              <el-form-item label="标题">
                <el-input v-model="vePropForm.title" />
              </el-form-item>
              <el-form-item label="配置JSON">
                <el-input v-model="vePropForm.configStr" type="textarea" :rows="5" />
              </el-form-item>
              <el-form-item label="开始时间">
                <el-date-picker v-model="vePropForm.startTime" type="datetime" style="width:100%" value-format="YYYY-MM-DD HH:mm:ss" placeholder="可选" />
              </el-form-item>
              <el-form-item label="结束时间">
                <el-date-picker v-model="vePropForm.endTime" type="datetime" style="width:100%" value-format="YYYY-MM-DD HH:mm:ss" placeholder="可选" />
              </el-form-item>
              <el-form-item label="定向人群">
                <el-input v-model="vePropForm.audienceStr" type="textarea" :rows="2" placeholder='可选JSON' />
              </el-form-item>
            </el-form>
            <el-alert title="属性实时生效，点击上方保存按钮提交" type="info" :closable="false" style="margin-top:12px" />
          </template>
          <div v-else class="ve-right-hint">点击预览中的组件<br>编辑其属性</div>
        </div>
      </div>
    </el-dialog>

    <!-- 版本历史弹窗 -->
    <el-dialog v-model="verVis" title="版本历史" width="700px">
      <el-table :data="versions" stripe max-height="400">
        <el-table-column label="版本号" width="80"><template #default="{ row }">v{{ row.version }}</template></el-table-column>
        <el-table-column prop="comment" label="说明" min-width="150" />
        <el-table-column label="时间" width="170"><template #default="{ row }">{{ formatDate(row.createdAt) }}</template></el-table-column>
        <el-table-column label="操作" width="180">
          <template #default="{ row }">
            <el-button size="small" @click="previewVersion(row)">预览</el-button>
            <el-popconfirm title="确认回滚到此版本？" @confirm="doRollback(row.id)">
              <template #reference><el-button size="small" type="warning">回滚</el-button></template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
      <div v-if="versions.length === 0" style="text-align:center;padding:40px;color:#ccc">暂无历史版本</div>
    </el-dialog>

    <!-- 版本预览 -->
    <el-dialog v-model="prevVis" title="版本预览" width="600px">
      <div style="margin-bottom:12px;color:#8b4513">版本 v{{ previewVer?.version }} — {{ previewVer?.comment }}</div>
      <el-table :data="previewComponents" stripe max-height="400" size="small">
        <el-table-column label="#" width="50"><template #default="{ $index }">{{ $index + 1 }}</template></el-table-column>
        <el-table-column label="类型" width="110"><template #default="{ row }">{{ compTypeMap[row.type] || row.type }}</template></el-table-column>
        <el-table-column prop="title" label="标题" min-width="120" />
      </el-table>
      <div v-if="previewComponents.length === 0" style="text-align:center;padding:40px;color:#ccc">此版本无组件</div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, h } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { marketingApi } from '@/api'

const loading = ref(false); const saving = ref(false); const list = ref<any[]>([]); const total = ref(0); const page = ref(1)
const vis = ref(false); const editingId = ref('')
const form = reactive({ title: '', path: '', description: '' })

const compVis = ref(false); const compFormVis = ref(false); const compEditingId = ref(''); const compSaving = ref(false)
const components = ref<any[]>([]); const currentPageId = ref('')
const compForm = reactive({ type: 'CAROUSEL', title: '', configStr: '{}', startTime: '' as string, endTime: '' as string, audienceStr: '' })

const verVis = ref(false); const versions = ref<any[]>([])
const prevVis = ref(false); const previewVer = ref<any>(null); const previewComponents = ref<any[]>([])

// 可视化编辑器状态
const veVis = ref(false); const veSaving = ref(false); const vePageTitle = ref('')
const veComponents = ref<any[]>([]); const veSelectedIdx = ref<number | null>(null); const dragOver = ref(false)
const vePropForm = reactive({ type: 'CAROUSEL', title: '', configStr: '{}', startTime: '' as string, endTime: '' as string, audienceStr: '' })

const compTypeMap: Record<string, string> = {
  CAROUSEL: '轮播图', COUNTDOWN: '倒计时', FLASHSALE: '秒杀专区',
  GROUPBUY: '拼团专区', COUPON: '优惠券', PRODUCT_LIST: '商品列表',
  RECOMMEND: '推荐', IMAGE: '图片', TEXT: '文本', TABS: '选项卡',
}

function compIcon(type: string): string {
  const icons: Record<string, string> = {
    CAROUSEL: '🖼️', COUNTDOWN: '⏰', FLASHSALE: '⚡', GROUPBUY: '👥',
    COUPON: '🎫', PRODUCT_LIST: '🛍️', RECOMMEND: '⭐', IMAGE: '📷',
    TEXT: '📝', TABS: '📑',
  }
  return icons[type] || '📦'
}

let veCompKey = 0

onMounted(() => fetchList())
function formatDate(d: string) { return d ? new Date(d).toLocaleString() : '-' }

async function fetchList() {
  loading.value = true
  try { const { data } = await marketingApi.listPages(); list.value = data.pages || data.data || []; total.value = data.total || 0 } catch { list.value = [] } finally { loading.value = false }
}

function openCreate() { editingId.value = ''; Object.assign(form, { title: '', path: '', description: '' }); vis.value = true }
function openEdit(row: any) { editingId.value = row.id; Object.assign(form, { title: row.title, path: row.path || '', description: row.description || '' }); vis.value = true }

async function save() {
  if (!form.title) { ElMessage.warning('标题必填'); return }
  saving.value = true
  try {
    if (editingId.value) { await marketingApi.updatePage(editingId.value, form) } else { await marketingApi.createPage(form) }
    ElMessage.success('已保存'); vis.value = false; fetchList()
  } catch { } finally { saving.value = false }
}

async function doPublish(row: any) {
  try { await marketingApi.publishPage(row.id); ElMessage.success('已发布'); fetchList() } catch { }
}

async function del(id: string) {
  try { await ElMessageBox.confirm('确定删除？', '提示', { type: 'warning' }); await marketingApi.deletePage(id); ElMessage.success('已删除'); fetchList() } catch { }
}

// ───────── 组件管理（列表模式） ─────────
async function openComponents(row: any) {
  currentPageId.value = row.id
  try { const { data } = await marketingApi.getPage(row.id); components.value = data.components || [] } catch { components.value = [] }
  compVis.value = true
}

function openCompCreate() {
  compEditingId.value = ''
  Object.assign(compForm, { type: 'CAROUSEL', title: '', configStr: '{}', startTime: '', endTime: '', audienceStr: '' })
  compFormVis.value = true
}

function formatDateTime(d: string) {
  if (!d) return ''
  const dt = new Date(d)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`
}

function openCompEdit(row: any) {
  compEditingId.value = row.id
  Object.assign(compForm, {
    type: row.type, title: row.title || '',
    configStr: JSON.stringify(row.config || {}, null, 2),
    startTime: formatDateTime(row.startTime),
    endTime: formatDateTime(row.endTime),
    audienceStr: row.audience ? JSON.stringify(row.audience, null, 2) : '',
  })
  compFormVis.value = true
}

async function saveComp() {
  let config: any = {}
  try { config = JSON.parse(compForm.configStr) } catch { ElMessage.warning('配置JSON格式错误'); return }
  let audience: any = null
  if (compForm.audienceStr.trim()) {
    try { audience = JSON.parse(compForm.audienceStr) } catch { ElMessage.warning('定向人群JSON格式错误'); return }
  }
  compSaving.value = true
  const payload = {
    type: compForm.type, title: compForm.title, config,
    startTime: compForm.startTime ? new Date(compForm.startTime).toISOString() : undefined,
    endTime: compForm.endTime ? new Date(compForm.endTime).toISOString() : undefined,
    audience: audience || undefined,
  }
  try {
    if (compEditingId.value) {
      await marketingApi.updatePageComponent(currentPageId.value, compEditingId.value, payload)
    } else {
      await marketingApi.addPageComponent(currentPageId.value, { ...payload, sortOrder: components.value.length })
    }
    ElMessage.success('已保存'); compFormVis.value = false
    const { data } = await marketingApi.getPage(currentPageId.value)
    components.value = data.components || []
  } catch { } finally { compSaving.value = false }
}

async function delComp(compId: string) {
  try {
    await ElMessageBox.confirm('删除该组件？', '提示', { type: 'warning' })
    await marketingApi.deletePageComponent(currentPageId.value, compId)
    ElMessage.success('已删除')
    const { data } = await marketingApi.getPage(currentPageId.value)
    components.value = data.components || []
  } catch { }
}

function moveComp(index: number, dir: number) {
  const arr = [...components.value]
  const target = index + dir
  if (target < 0 || target >= arr.length) return;
  [arr[index], arr[target]] = [arr[target], arr[index]]
  components.value = arr
}

async function doSort() {
  const ids = components.value.map(c => c.id)
  try { await marketingApi.sortPageComponents(currentPageId.value, { componentIds: ids }); ElMessage.success('排序已保存') } catch { }
}

// ───────── 可视化编辑器 ─────────
async function openVisualEditor(row: any) {
  currentPageId.value = row.id
  vePageTitle.value = row.title
  try {
    const { data } = await marketingApi.getPage(row.id)
    veComponents.value = ((data.components || []) as any[]).map((c: any) => ({ ...c, _key: `comp_${veCompKey++}` }))
  } catch { veComponents.value = [] }
  veSelectedIdx.value = null
  veVis.value = true
}

function veAddComp(type: string) {
  const comp = { type, title: '', config: {}, sortOrder: veComponents.value.length, _key: `comp_${veCompKey++}` }
  veComponents.value.push(comp)
  veSelectComp(veComponents.value.length - 1)
}

function veSelectComp(idx: number) {
  veSelectedIdx.value = idx
  const comp = veComponents.value[idx]
  if (!comp) return
  Object.assign(vePropForm, {
    type: comp.type, title: comp.title || '',
    configStr: JSON.stringify(comp.config || {}, null, 2),
    startTime: formatDateTime(comp.startTime),
    endTime: formatDateTime(comp.endTime),
    audienceStr: comp.audience ? JSON.stringify(comp.audience, null, 2) : '',
  })
}

// 属性面板实时同步到组件数据
function veSyncProps() {
  if (veSelectedIdx.value === null) return
  const comp = veComponents.value[veSelectedIdx.value]
  if (!comp) return
  comp.type = vePropForm.type
  comp.title = vePropForm.title
  try { comp.config = JSON.parse(vePropForm.configStr) } catch { /* keep old */ }
  comp.startTime = vePropForm.startTime || null
  comp.endTime = vePropForm.endTime || null
  try { comp.audience = vePropForm.audienceStr.trim() ? JSON.parse(vePropForm.audienceStr) : null } catch { /* keep old */ }
}

// 监听属性表单变化实时同步
import { watch } from 'vue'
watch([() => vePropForm.type, () => vePropForm.title, () => vePropForm.configStr,
  () => vePropForm.startTime, () => vePropForm.endTime, () => vePropForm.audienceStr], () => {
  veSyncProps()
})

function veDeleteComp(idx: number) {
  veComponents.value.splice(idx, 1)
  if (veSelectedIdx.value === idx) veSelectedIdx.value = null
  else if (veSelectedIdx.value !== null && veSelectedIdx.value > idx) veSelectedIdx.value!--
}

// 拖拽：从组件库拖入
function onDragStart(e: DragEvent, type: string) {
  e.dataTransfer!.setData('text/plain', type)
  e.dataTransfer!.effectAllowed = 'copy'
}

function onDrop(e: DragEvent) {
  dragOver.value = false
  const type = e.dataTransfer!.getData('text/plain')
  if (type && compTypeMap[type]) veAddComp(type)
}

// 拖拽：组件排序
let dragSrcIdx: number | null = null

function onCompDragStart(e: DragEvent, idx: number) {
  dragSrcIdx = idx
  e.dataTransfer!.effectAllowed = 'move'
}

function onCompDragOver(_e: DragEvent, _idx: number) {
  // visual indicator
}

function onCompDrop(e: DragEvent, targetIdx: number) {
  if (dragSrcIdx === null || dragSrcIdx === targetIdx) return
  const arr = [...veComponents.value]
  const [moved] = arr.splice(dragSrcIdx, 1)
  arr.splice(targetIdx, 0, moved)
  veComponents.value = arr
  if (veSelectedIdx.value === dragSrcIdx) veSelectedIdx.value = targetIdx
  dragSrcIdx = null
}

async function veSave() {
  veSaving.value = true
  try {
    // 删除所有现有组件，重新创建
    const { data: page } = await marketingApi.getPage(currentPageId.value)
    const existingComps = page.components || []
    for (const c of existingComps) {
      await marketingApi.deletePageComponent(currentPageId.value, c.id).catch(() => {})
    }
    for (let i = 0; i < veComponents.value.length; i++) {
      const c = veComponents.value[i]
      await marketingApi.addPageComponent(currentPageId.value, {
        type: c.type, title: c.title, config: c.config || {},
        sortOrder: i,
        startTime: c.startTime ? new Date(c.startTime).toISOString() : undefined,
        endTime: c.endTime ? new Date(c.endTime).toISOString() : undefined,
        audience: c.audience || undefined,
      })
    }
    ElMessage.success('已保存')
  } catch { ElMessage.error('保存失败') } finally { veSaving.value = false }
}

async function vePublish() {
  await veSave()
  try { await marketingApi.publishPage(currentPageId.value); ElMessage.success('已发布'); fetchList() } catch { }
}

// 渲染预览组件
function veRenderComp(comp: any) {
  const type = comp.type
  if (type === 'CAROUSEL') return veCarouselComp
  if (type === 'COUNTDOWN') return veCountdownComp
  if (type === 'IMAGE') return veImageComp
  if (type === 'TEXT') return veTextComp
  if (type === 'TABS') return veTabsComp
  return veGenericComp
}

const veCarouselComp = { render() { return h('div', { class: 've-mock ve-mock-carousel' }, [h('span', '轮播图 — Banner轮播')]) } }
const veCountdownComp = { render() { return h('div', { class: 've-mock ve-mock-countdown' }, [h('span', '⏰ 倒计时组件')]) } }
const veImageComp = { render() { return h('div', { class: 've-mock ve-mock-image' }, [h('span', '📷 图片组件')]) } }
const veTextComp = { render() { return h('div', { class: 've-mock ve-mock-text' }, [h('span', '📝 文本内容区域')]) } }
const veTabsComp = { render() { return h('div', { class: 've-mock ve-mock-tabs' }, [h('span', '📑 选项卡切换')]) } }
const veGenericComp: any = {
  props: ['comp'],
  render(ctx: any) {
    const label = compTypeMap[ctx.comp?.type] || ctx.comp?.type || '未知组件'
    return h('div', { class: 've-mock ve-mock-generic' }, [
      h('span', `${compIcon(ctx.comp?.type || '')} ${label}`),
      h('span', { style: { fontSize: '10px', color: '#999', display: 'block' } }, ctx.comp?.title || ''),
    ])
  },
}

// ───────── 版本管理 ─────────
async function openVersions(row: any) {
  currentPageId.value = row.id
  try { const { data } = await marketingApi.getPageVersions(row.id); versions.value = data || [] } catch { versions.value = [] }
  verVis.value = true
}

function previewVersion(row: any) {
  previewVer.value = row
  previewComponents.value = row.value?.components || []
  prevVis.value = true
}

async function doRollback(versionId: string) {
  try {
    await marketingApi.rollbackPage(currentPageId.value, versionId)
    ElMessage.success('已回滚'); verVis.value = false; fetchList()
  } catch { }
}
</script>

<style scoped>
.page { padding: 16px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.toolbar h3 { margin: 0; font-size: 18px; color: #8b4513; }

/* ═══ 可视化编辑器 ═══ */
.ve-toolbar { display: flex; justify-content: space-between; align-items: center; padding: 8px 16px; background: #fff; border-bottom: 1px solid #eee; position: sticky; top: 0; z-index: 10; }
.ve-tbar-left { display: flex; align-items: center; gap: 12px; }
.ve-page-name { font-size: 16px; font-weight: 600; color: #8b4513; }
.ve-tbar-right { display: flex; gap: 8px; }

.ve-body { display: flex; height: calc(100vh - 56px); overflow: hidden; }

/* 左侧组件库 */
.ve-left { width: 180px; background: #fafafa; border-right: 1px solid #eee; overflow-y: auto; flex-shrink: 0; }
.ve-left-title { padding: 12px 12px 8px; font-size: 13px; color: #999; font-weight: 500; }
.ve-comp-lib { padding: 0 8px; }
.ve-comp-item { display: flex; align-items: center; gap: 8px; padding: 10px 8px; margin-bottom: 4px; border-radius: 6px; cursor: grab; background: #fff; border: 1px solid #eee; transition: all 0.15s; user-select: none; }
.ve-comp-item:hover { border-color: #8b4513; box-shadow: 0 2px 8px rgba(139,69,19,0.1); }
.ve-comp-item:active { cursor: grabbing; }
.ve-comp-icon { font-size: 18px; }
.ve-comp-label { font-size: 12px; color: #666; }

/* 中间预览区 */
.ve-center { flex: 1; display: flex; justify-content: center; align-items: flex-start; padding: 20px; background: #f0f0f0; overflow-y: auto; }
.ve-phone-frame { width: 375px; background: #fff; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); overflow: hidden; }
.ve-phone-status { background: #8b4513; color: #fff; text-align: center; padding: 8px; font-size: 12px; }
.ve-phone-body { min-height: 500px; padding: 0; position: relative; }
.ve-phone-body.ve-drag-over { outline: 2px dashed #8b4513; outline-offset: -2px; background: rgba(139,69,19,0.03); }
.ve-drop-hint { display: flex; align-items: center; justify-content: center; height: 400px; color: #ccc; font-size: 13px; text-align: center; line-height: 1.8; }

.ve-render-comp { position: relative; border-bottom: 1px dashed #eee; cursor: pointer; transition: all 0.15s; }
.ve-render-comp:hover { background: rgba(139,69,19,0.02); }
.ve-render-comp.ve-selected { outline: 2px solid #8b4513; outline-offset: -2px; background: rgba(139,69,19,0.05); }
.ve-comp-actions { display: flex; align-items: center; gap: 6px; padding: 4px 8px; background: rgba(0,0,0,0.03); }
.ve-comp-idx { width: 18px; height: 18px; border-radius: 50%; background: #8b4513; color: #fff; font-size: 11px; display: flex; align-items: center; justify-content: center; }
.ve-comp-type-tag { font-size: 11px; color: #999; flex: 1; }
.ve-comp-body { padding: 0; }

/* 预览组件 mock */
.ve-mock { padding: 20px 16px; text-align: center; color: #999; font-size: 13px; }
.ve-mock-carousel { background: linear-gradient(135deg, #f5f0e8, #e8d5c4); height: 100px; display: flex; align-items: center; justify-content: center; }
.ve-mock-countdown { background: linear-gradient(135deg, #C41E3A, #E85D75); color: #fff; padding: 16px; }
.ve-mock-image { background: #e8e0d5; height: 120px; display: flex; align-items: center; justify-content: center; }
.ve-mock-text { background: #fff; min-height: 60px; display: flex; align-items: center; justify-content: center; }
.ve-mock-tabs { background: #fafafa; border-top: 3px solid #8b4513; }
.ve-mock-generic { background: #fafafa; min-height: 60px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; }

/* 右侧属性面板 */
.ve-right { width: 300px; background: #fff; border-left: 1px solid #eee; overflow-y: auto; padding: 12px; flex-shrink: 0; }
.ve-right-title { font-size: 14px; font-weight: 600; color: #8b4513; margin-bottom: 12px; }
.ve-right-hint { display: flex; align-items: center; justify-content: center; height: 200px; color: #ccc; font-size: 13px; text-align: center; line-height: 1.8; }
</style>

<!-- global styles for fullscreen dialog -->
<style>
.visual-editor-dlg .el-dialog__header { display: none; }
.visual-editor-dlg .el-dialog__body { padding: 0; }
</style>
