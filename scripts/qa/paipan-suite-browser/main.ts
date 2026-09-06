import { createApp, h } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import '../../../apps/admin/src/styles/tokens.css'
import Page from '../../../apps/admin/src/views/system/NativePaipanPreview.vue'
import { state } from './api'
createApp({ render: () => h('main', [
  h('aside', { style: 'padding:16px;background:#fff3cd' }, [
    h('strong', '本地隔离验收：真实后台组件，内存合成 API，不连接云端'),
    h('p', `已确认写入次数：${state.writes}；模式：${state.mode}`),
    h('button', { onClick: () => { state.conflictNext = true } }, '模拟下次保存冲突'),
  ]), h(Page),
]) }).use(ElementPlus).mount('#app')
