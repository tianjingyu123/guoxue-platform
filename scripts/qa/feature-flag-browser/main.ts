import { createApp, h } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import '../../../apps/admin/src/styles/tokens.css'
import FeatureFlagList from '../../../apps/admin/src/views/system/FeatureFlagList.vue'
import { state } from './api'
const app = createApp({ render: () => h('main', [
  h('aside', { style: 'padding:16px;background:#fff3cd;color:#17202e' }, [
    h('strong', '隔离浏览器验收：真实页面组件，合成数据；不连接云端'),
    h('p', `已确认写入次数：${state.writes}`),
    h('button', { onClick: () => { state.conflictNext = true } }, '模拟下一次发布冲突'),
    h('span', state.conflictNext ? ' 已设置冲突' : ''),
  ]), h(FeatureFlagList),
]) })
app.use(ElementPlus)
app.directive('permission', {})
app.mount('#app')
