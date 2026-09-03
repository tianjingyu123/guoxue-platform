/** 独立组件验收入口，不在生产路由或构建入口中引用，不连接远端 API。 */
import { createApp, h, ref } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory, RouterView } from 'vue-router'
import { AxiosError, type AxiosResponse } from 'axios'
import { api } from '../../src/api'
import Transaction from '../../src/views/dashboard/TransactionBigscreen.vue'
import Content from '../../src/views/dashboard/ContentBigscreen.vue'
import Ai from '../../src/views/dashboard/AiBigscreen.vue'
import Offline from '../../src/views/dashboard/OfflineBigscreen.vue'
import '../../src/styles/tokens.css'
import '../../src/styles/global.css'
import '../../src/styles/bigscreen.css'

const scenario = ref('丰富数据')
const now = '2026-09-03T12:30:00.000Z'
const orders = Array.from({ length: 20 }, (_, i) => ({ id: `fixture-order-${String(i).padStart(8, '0')}`, type: ['COURSE', 'PRODUCT', 'MEMBER', 'CIRCLE_JOIN'][i % 4], amount: 199 + i * 100, at: new Date(Date.parse(now) - i * 3600000).toISOString() }))
// 此品类仅存在于历史成交，用于验证“今日零成交”的跨日期筛选。
orders[19].type = 'BOT_SERVICE'
const cities = ['深圳', '北京', '上海', '杭州', '成都', '广州', '南京', '武汉', '苏州', '西安', '青岛', '厦门']
const stations = cities.flatMap((city, index) => Array.from({ length: 12 - index }, (_, i) => ({ id: `${city}-${i}`, city, name: `${city}体验驿站 ${i + 1}`, address: `组件模拟地址 ${i + 1} 号，非真实营业场所` })))
const rich: Record<string, object> = {
  '/bigscreen/transactions': { todayOrders: 1482, todayRevenue: 1286430.5, hourOrders: 97, typeBreakdown: [{ type: 'COURSE', amount: 742800, count: 612 }, { type: 'PRODUCT', amount: 318630.5, count: 528 }, { type: 'MEMBER', amount: 180000, count: 300 }, { type: 'CIRCLE_JOIN', amount: 45000, count: 42 }], recentOrders: orders, updatedAt: now },
  '/bigscreen/content-eco': { totalContent: 58290, totalArticles: 28460, totalPosts: 21680, totalCourses: 3850, totalVideos: 4300, monthGrowth: { articles: 2480, posts: 3862 }, topCreators: Array.from({ length: 10 }, (_, i) => ({ userId: `creator-${i}`, nickname: ['模拟创作者青禾', '模拟创作者远山', '模拟创作者林间'][i % 3] + (i + 1), articleCount: 3200 - i * 231 })), updatedAt: now },
  '/bigscreen/ai-capability': { totalApiCalls: 1286430, todayApiCalls: 18420, monthApiCalls: 386430, botConversations: 782600, knowledgeBaseSize: 24860, sceneDistribution: ['命理分析', '内容解读', '课程辅助', '知识问答', '日常咨询', '其他场景'].map((scene, i) => ({ scene, count: [486430, 320000, 210000, 140000, 90000, 40000][i] })), modelDistribution: ['模拟模型 Alpha', '模拟模型 Beta', '模拟模型 Gamma', '未标注模型'].map((model, i) => ({ model, count: [160000, 124000, 82430, 20000][i] })), updatedAt: now },
  '/bigscreen/offline-map': { totalStations: stations.length, totalCourses: 328, totalStudents: 18420, totalOrders: 2864, totalRevenue: 3286430.5, cityDistribution: cities.map((city, i) => ({ city, count: 12 - i })), stations, updatedAt: now },
}
const zero: Record<string, object> = {
  '/bigscreen/transactions': { todayOrders: 0, todayRevenue: 0, hourOrders: 0, typeBreakdown: [], recentOrders: [], updatedAt: now },
  '/bigscreen/content-eco': { totalContent: 0, totalArticles: 0, totalPosts: 0, totalCourses: 0, totalVideos: 0, monthGrowth: { articles: 0, posts: 0 }, topCreators: [], updatedAt: now },
  '/bigscreen/ai-capability': { totalApiCalls: 0, todayApiCalls: 0, monthApiCalls: 0, botConversations: 0, knowledgeBaseSize: 0, sceneDistribution: [], modelDistribution: [], updatedAt: now },
  '/bigscreen/offline-map': { totalStations: 0, totalCourses: 0, totalStudents: 0, totalOrders: 0, totalRevenue: 0, cityDistribution: [], stations: [], updatedAt: now },
}
api.defaults.adapter = async config => {
  if (!(config.url! in rich)) throw new Error('组件验收禁止请求未声明接口')
  if (scenario.value === '模拟断线') throw new AxiosError('仅用于组件验收的断线', 'ERR_NETWORK', config)
  if (scenario.value === '权限失效') throw new AxiosError('仅用于组件验收的权限失效', 'ERR_BAD_REQUEST', config, undefined, { status: 403, data: {}, config } as AxiosResponse)
  const source = structuredClone(scenario.value === '零数据' ? zero[config.url!] : rich[config.url!]) as Record<string, unknown>
  if (scenario.value === '部分缺失') for (const key of ['todayRevenue', 'totalArticles', 'monthApiCalls', 'totalStudents']) delete source[key]
  if (scenario.value === '长名称') {
    if ('stations' in source) (source.stations as { name: string }[])[0].name = '超长模拟驿站名称'.repeat(18)
    if ('topCreators' in source) (source.topCreators as { nickname: string }[])[0].nickname = '超长创作者'.repeat(18)
    if ('modelDistribution' in source) (source.modelDistribution as { model: string }[])[0].model = 'long-model-name-'.repeat(18)
  }
  return { status: 200, statusText: 'OK', headers: {}, config, data: source }
}
const routes = [{ path: '/transactions', component: Transaction }, { path: '/content', component: Content }, { path: '/ai', component: Ai }, { path: '/offline', component: Offline }]
const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', redirect: '/transactions' }, ...routes] })
const app = createApp({ setup: () => () => h('div', [
  h('aside', { style: 'display:flex;align-items:center;flex-wrap:wrap;gap:10px;padding:10px 16px;background:#ffe6ae;color:#172b39;font:12px system-ui;position:relative;z-index:20' }, [
    h('strong', '组件边界验收 · 仅模拟数据'),
    ...routes.map((route, i) => h('button', { onClick: () => router.push(route.path) }, ['交易', '内容', 'AI', '线下'][i])),
    h('select', { 'aria-label': '组件测试场景', value: scenario.value, onChange: (event: Event) => { scenario.value = (event.target as HTMLSelectElement).value } }, ['丰富数据', '零数据', '部分缺失', '长名称', '模拟断线', '权限失效'].map(value => h('option', { value }, value))),
    h('span', '切换场景后点击“刷新数据”，不影响真实 QA。'),
  ]),
  h(RouterView),
]) })
app.use(router)
app.use(createPinia())
void router.isReady().then(() => app.mount('#app'))
