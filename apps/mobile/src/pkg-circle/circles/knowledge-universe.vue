<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { onHide, onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import { circleDetailApi, type CircleShowcaseGraph } from '@/lib/circle-detail-data'
import { goBack } from '@/utils/router'
import { useAppSafeArea } from '@/pkg-live/use-app-safe-area'

const { safeTop } = useAppSafeArea()
const circleId = ref('')
const graphData = ref<CircleShowcaseGraph>({ nodes: [], links: [] })
const loading = ref(true)
const error = ref('')
const selectedId = ref('')
const selected = ref<CircleShowcaseGraph['nodes'][number] | null>(null)
const h5Ready = ref(false)
const h5Loading = ref(false)
let alive = true
let pageVisible = true

const relatedNames = ref<string[]>([])
function selectNode(id: string) {
  const node = graphData.value.nodes.find((item) => item.id === id)
  if (!node) return
  selectedId.value = id
  selected.value = node
  const relatedIds = graphData.value.links
    .filter((link) => link.source === id || link.target === id)
    .slice(0, 5)
    .map((link) => link.source === id ? link.target : link.source)
  relatedNames.value = relatedIds
    .map((otherId) => graphData.value.nodes.find((item) => item.id === otherId)?.name || '')
    .filter(Boolean)
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const result = await circleDetailApi.knowledgeShowcase(circleId.value)
    if (!alive) return
    graphData.value = {
      nodes: Array.isArray(result?.nodes) ? result.nodes.slice(0, 40) : [],
      links: Array.isArray(result?.links) ? result.links.slice(0, 80) : [],
    }
    loading.value = false
    if (graphData.value.nodes.length) {
      selectNode(graphData.value.nodes[0].id)
      h5Loading.value = true
      await nextTick()
      // #ifdef H5
      await initH5Graph()
      // #endif
      h5Loading.value = false
    }
  } catch {
    if (alive) error.value = '知识点暂时无法加载，请稍后重试'
  } finally {
    if (alive) loading.value = false
  }
}

onLoad((query) => {
  circleId.value = String(query?.id || '')
  if (!circleId.value) { loading.value = false; error.value = '缺少圈子信息'; return }
  void load()
})
onShow(() => {
  pageVisible = true
  // #ifdef H5
  graph?.resumeAnimation()
  // #endif
})
onHide(() => {
  pageVisible = false
  // #ifdef H5
  graph?.pauseAnimation()
  // #endif
})
onUnload(() => {
  alive = false
  pageVisible = false
  // #ifdef H5
  disposeH5Graph()
  // #endif
})

// #ifdef H5
type ForceNode = { id: string; name: string; summary: string; x?: number; y?: number; z?: number }
type ForceLink = { source: string | ForceNode; target: string | ForceNode; relation: string }
type Disposable = { dispose?: () => void }
type Material = Disposable & { map?: Disposable }
type ForceGraph = {
  graphData(data: { nodes: ForceNode[]; links: ForceLink[] }): ForceGraph
  backgroundColor(color: string): ForceGraph
  showNavInfo(value: boolean): ForceGraph
  enableNodeDrag(value: boolean): ForceGraph
  nodeLabel(value: () => string): ForceGraph
  nodeVal(value: number): ForceGraph
  nodeColor(value: (node: ForceNode) => string): ForceGraph
  linkColor(value: () => string): ForceGraph
  linkOpacity(value: number): ForceGraph
  linkDirectionalParticles(value: number): ForceGraph
  onNodeClick(value: (node: ForceNode) => void): ForceGraph
  cameraPosition(position: { x: number; y: number; z: number }, lookAt: { x: number; y: number; z: number }, duration?: number): ForceGraph
  pauseAnimation(): void
  resumeAnimation(): void
  renderer(): Disposable & { forceContextLoss?: () => void }
  controls(): Disposable
  scene(): { traverse: (visit: (object: { geometry?: Disposable; material?: Material | Material[] }) => void) => void }
}
let graph: ForceGraph | null = null
let libraryPromise: Promise<void> | null = null
function disposeH5Graph() {
  const old = graph
  graph = null
  if (!old) return
  // 组件的暂停接口不负责释放 WebGL；销毁页面时主动释放本页 renderer 与场景资源。
  try {
    old.pauseAnimation()
    old.graphData({ nodes: [], links: [] })
    old.scene().traverse((object) => {
      object.geometry?.dispose?.()
      for (const material of (Array.isArray(object.material) ? object.material : object.material ? [object.material] : [])) {
        material.map?.dispose?.()
        material.dispose?.()
      }
    })
    old.controls().dispose?.()
    old.renderer().dispose?.()
    old.renderer().forceContextLoss?.()
  } catch {
    // 卸载过程不能阻断页面退出；释放失败仍清除可见节点。
  } finally {
    document.getElementById('knowledge-graph-stage')?.replaceChildren()
  }
}
function loadLibrary(): Promise<void> {
  if ((window as Window & { ForceGraph3D?: unknown }).ForceGraph3D) return Promise.resolve()
  if (libraryPromise) return libraryPromise
  libraryPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/3d-force-graph@1.80.0/dist/3d-force-graph.min.js'
    script.crossOrigin = 'anonymous'
    script.onload = () => resolve()
    script.onerror = () => { script.remove(); libraryPromise = null; reject(new Error('图谱组件加载失败')) }
    document.head.appendChild(script)
  })
  return libraryPromise
}
async function initH5Graph() {
  try {
    await loadLibrary()
    if (!alive || !graphData.value.nodes.length) return
    const host = document.getElementById('knowledge-graph-stage')
    const factory = (window as Window & {
      ForceGraph3D?: (options: { controlType: string }) => (element: HTMLElement) => ForceGraph
    }).ForceGraph3D
    if (!host || !factory) return
    const ids = new Set(graphData.value.nodes.map((node) => node.id))
    const links = graphData.value.links.filter((link) => ids.has(link.source) && ids.has(link.target))
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    graph = factory({ controlType: 'orbit' })(host)
      .graphData({ nodes: graphData.value.nodes.map((node) => ({ ...node })), links: links.map((link) => ({ ...link })) })
      .backgroundColor('#07172b')
      .showNavInfo(false)
      .enableNodeDrag(false)
      .nodeLabel(() => '')
      .nodeVal(7)
      .nodeColor((node) => node.id === selectedId.value ? '#f4d58f' : '#7ad8e1')
      .linkColor(() => '#8ac9dc')
      .linkOpacity(0.35)
      .linkDirectionalParticles(reduced ? 0 : 1)
      .onNodeClick((node) => {
        selectNode(node.id)
        const x = node.x || 0; const y = node.y || 0; const z = node.z || 0
        graph?.cameraPosition({ x: x + 105, y: y + 75, z: z + 150 }, { x, y, z }, reduced ? 0 : 700)
      })
    graph.cameraPosition({ x: 0, y: 30, z: 380 }, { x: 0, y: 0, z: 0 })
    if (!pageVisible) graph.pauseAnimation()
    h5Ready.value = true
  } catch {
    // 第三方脚本不可用时，保留同一批公开知识点的等价列表；绝不退到私有内容。
    disposeH5Graph()
    h5Ready.value = false
  }
}
// #endif
</script>

<template>
  <view class="universe-page">
    <view class="universe-nav" :style="{ paddingTop: safeTop + 'px' }">
      <view class="back" @tap="goBack">‹</view>
      <text class="nav-name">知识星域</text>
    </view>
    <scroll-view scroll-y class="universe-body">
      <view class="universe-intro">
        <text class="universe-title">每颗星，都是一个知识点</text>
        <text class="universe-sub">只展示圈子确认可公开的简短介绍。点开知识点，看看它与什么相连。</text>
      </view>
      <view v-if="loading" class="state">正在寻找知识线索…</view>
      <view v-else-if="error" class="state">
        <text>{{ error }}</text><text class="retry" @tap="load">重新加载</text>
      </view>
      <view v-else-if="!graphData.nodes.length" class="state">这个圈子暂时没有公开展示的知识点</view>
      <template v-else>
        <!-- #ifdef H5 -->
        <view v-show="h5Ready || h5Loading" id="knowledge-graph-stage" class="graph-stage" aria-label="可旋转的三维知识星图" />
        <!-- #endif -->
        <view v-if="selected" class="focus-card">
          <text class="focus-name">{{ selected.name }}</text>
          <text class="focus-summary">{{ selected.summary }}</text>
          <text v-if="relatedNames.length" class="focus-related">相连知识点：{{ relatedNames.join('、') }}</text>
        </view>
        <view class="list-heading">知识点列表</view>
        <view v-for="node in graphData.nodes" :key="node.id" class="node-row" :class="{ chosen: selectedId === node.id }" @tap="selectNode(node.id)">
          <view class="node-light" /><view class="node-copy"><text class="node-name">{{ node.name }}</text><text class="node-summary">{{ node.summary }}</text></view>
        </view>
      </template>
      <view class="footnote">内容经审核后公开展示；完整资料以圈内权限为准</view>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.universe-page { min-height: 100vh; background: #07172b; color: #f7f2df; display: flex; flex-direction: column; }
.universe-nav { height: 92rpx; display: flex; align-items: center; padding-left: 28rpx; padding-right: 28rpx; background: #07172b; }
.back { width: 70rpx; font-size: 58rpx; line-height: 1; color: #e7ce90; }
.nav-name { font-size: 29rpx; color: #dce8e6; }
.universe-body { flex: 1; min-height: 0; }
.universe-intro { padding: 42rpx 42rpx 24rpx; display: flex; flex-direction: column; }
.universe-title { font-family: 'Songti SC', SimSun, serif; font-size: 42rpx; line-height: 1.35; color: #f1dda9; }
.universe-sub { max-width: 610rpx; font-size: 25rpx; line-height: 1.75; color: #b7cdd1; margin-top: 15rpx; }
.graph-stage { width: 100%; height: 600rpx; min-height: 300px; background: radial-gradient(circle at 50% 47%, #24415c, #07172b 70%); }
.focus-card { margin: 12rpx 32rpx 32rpx; padding: 27rpx 30rpx; background: #112d45; border: 1rpx solid #6ab4be66; border-radius: 20rpx; display: flex; flex-direction: column; }
.focus-name { font-family: 'Songti SC', SimSun, serif; font-size: 35rpx; color: #f3d99e; }
.focus-summary { font-size: 26rpx; line-height: 1.7; color: #e0eced; margin-top: 12rpx; }
.focus-related { font-size: 23rpx; line-height: 1.6; color: #9ed2da; margin-top: 14rpx; }
.list-heading { padding: 0 42rpx 18rpx; font-size: 25rpx; color: #a7c6ce; }
.node-row { margin: 0 32rpx 14rpx; padding: 20rpx 24rpx; display: flex; align-items: flex-start; gap: 18rpx; border-radius: 16rpx; background: #0e263d; }
.node-row.chosen { background: #17374e; }
.node-light { flex-shrink: 0; width: 13rpx; height: 13rpx; border-radius: 50%; background: #75d4df; margin-top: 15rpx; box-shadow: 0 0 12rpx #75d4df; }
.node-copy { flex: 1; display: flex; flex-direction: column; }
.node-name { font-size: 28rpx; color: #f1e6c7; }
.node-summary { font-size: 24rpx; line-height: 1.65; color: #bdd0d4; margin-top: 6rpx; }
.state { padding: 150rpx 42rpx; text-align: center; font-size: 27rpx; line-height: 1.7; color: #c4d3d7; }
.retry { display: block; margin-top: 25rpx; color: #f2d895; }
.footnote { padding: 32rpx 42rpx 100rpx; color: #91aeb8; font-size: 22rpx; text-align: center; }
@media (prefers-reduced-motion: reduce) { .node-light { box-shadow: none; } }
</style>
